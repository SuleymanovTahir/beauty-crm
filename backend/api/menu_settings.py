
from fastapi import APIRouter, Depends, HTTPException
from typing import Optional, List
from pydantic import BaseModel
from db.connection import get_db_connection
from utils.utils import get_current_user
from utils.cache import cache
from utils.logger import log_error
import json
import logging
import time

router = APIRouter()
logger = logging.getLogger(__name__)

# Simple cache for menu settings (fallback when Redis is unavailable)
_menu_cache = {}
_cache_ttl = 300  # seconds - increased from 60 to reduce DB queries

class MenuSettings(BaseModel):
    menu_order: Optional[List[str]] = None
    hidden_items: Optional[List[str]] = None

class MenuSettingsResponse(BaseModel):
    menu_order: Optional[List[str]]
    hidden_items: Optional[List[str]]

@router.get("/menu-settings", response_model=MenuSettingsResponse)
async def get_menu_settings(current_user: dict = Depends(get_current_user)):
    """Get menu settings for current user or their role"""
    
    cache_key = f"menu_settings_{current_user['id']}_{current_user['role']}"
    
    # Try Redis cache first (if available)
    if cache.enabled:
        cached_data = cache.get(cache_key)
        if cached_data is not None:
            return cached_data
    
    # Fallback to in-memory cache
    if cache_key in _menu_cache:
        cached_data, cached_time = _menu_cache[cache_key]
        if time.time() - cached_time < _cache_ttl:
            return cached_data
    
    conn = get_db_connection()
    c = conn.cursor()
    try:
        # Optimized: Single query using UNION with LIMIT to prioritize user-specific settings
        c.execute("""
            SELECT menu_order, hidden_items 
            FROM (
                SELECT menu_order, hidden_items, 1 as priority
                FROM menu_settings 
                WHERE user_id = %s
                UNION ALL
                SELECT menu_order, hidden_items, 2 as priority
                FROM menu_settings 
                WHERE role = %s
            ) combined
            ORDER BY priority
            LIMIT 1
        """, (current_user['id'], current_user['role']))
        
        row = c.fetchone()
        
        result = {
            "menu_order": row[0] if row and row[0] else None,
            "hidden_items": row[1] if row and row[1] else None
        }
        
        # Cache in Redis (if available)
        if cache.enabled:
            cache.set(cache_key, result, expire=300)  # 5 minutes
        
        # Cache in memory as fallback
        _menu_cache[cache_key] = (result, time.time())
        
        # Clean old cache entries (keep only last 50)
        if len(_menu_cache) > 50:
            # Remove oldest entries
            sorted_items = sorted(_menu_cache.items(), key=lambda x: x[1][1])
            for key, _ in sorted_items[:len(_menu_cache) - 50]:
                del _menu_cache[key]
        
        return result
    except Exception as e:
        log_error(f"Error fetching menu settings: {e}", "menu_settings")
        # Return cached value if available, otherwise defaults
        if cache_key in _menu_cache:
            cached_data, _ = _menu_cache[cache_key]
            return cached_data
        return {"menu_order": None, "hidden_items": None}
    finally:
        conn.close()

@router.post("/menu-settings")
async def save_menu_settings(
    settings: MenuSettings,
    save_for_role: bool = False,
    current_user: dict = Depends(get_current_user)
):
    """Save menu settings for user or role"""
    conn = get_db_connection()
    c = conn.cursor()
    try:
        # Only directors and admins can save role-based settings
        if save_for_role and current_user['role'] not in ['director', 'admin']:
            raise HTTPException(status_code=403, detail="Only directors and admins can set role-based menu")
        
        menu_order_json = json.dumps(settings.menu_order) if settings.menu_order else None
        hidden_items_json = json.dumps(settings.hidden_items) if settings.hidden_items else None
        
        if save_for_role:
            # Save for entire role
            c.execute("""
                INSERT INTO menu_settings (role, menu_order, hidden_items, updated_at)
                VALUES (%s, %s::jsonb, %s::jsonb, CURRENT_TIMESTAMP)
                ON CONFLICT (role) 
                DO UPDATE SET 
                    menu_order = EXCLUDED.menu_order,
                    hidden_items = EXCLUDED.hidden_items,
                    updated_at = CURRENT_TIMESTAMP
            """, (current_user['role'], menu_order_json, hidden_items_json))
            
            # Invalidate cache for all users with this role
            keys_to_delete = [k for k in _menu_cache.keys() if k.endswith(f"_{current_user['role']}")]
            for k in keys_to_delete:
                del _menu_cache[k]
            
            # Invalidate Redis cache for this role
            if cache.enabled:
                # Note: Redis pattern deletion would require scan, so we'll let TTL handle it
                # For immediate invalidation, we'd need to track keys, but TTL is acceptable
                pass
        else:
            # Save for specific user
            c.execute("""
                INSERT INTO menu_settings (user_id, menu_order, hidden_items, updated_at)
                VALUES (%s, %s::jsonb, %s::jsonb, CURRENT_TIMESTAMP)
                ON CONFLICT (user_id) 
                DO UPDATE SET 
                    menu_order = EXCLUDED.menu_order,
                    hidden_items = EXCLUDED.hidden_items,
                    updated_at = CURRENT_TIMESTAMP
            """, (current_user['id'], menu_order_json, hidden_items_json))
            
            # Invalidate cache for this user
            cache_key = f"menu_settings_{current_user['id']}_{current_user['role']}"
            if cache_key in _menu_cache:
                del _menu_cache[cache_key]
            
            # Invalidate Redis cache
            if cache.enabled:
                cache.delete(cache_key)
        
        conn.commit()
        return {"success": True, "message": "Menu settings saved"}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        logger.error(f"Error saving menu settings: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.delete("/menu-settings")
async def reset_menu_settings(current_user: dict = Depends(get_current_user)):
    """Reset menu settings to default"""
    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute("DELETE FROM menu_settings WHERE user_id = %s", (current_user['id'],))
        conn.commit()
        
        # Invalidate cache
        cache_key = f"menu_settings_{current_user['id']}_{current_user['role']}"
        if cache_key in _menu_cache:
            del _menu_cache[cache_key]
        
        # Invalidate Redis cache
        if cache.enabled:
            cache.delete(cache_key)
        
        return {"success": True, "message": "Menu settings reset to default"}
    except Exception as e:
        conn.rollback()
        logger.error(f"Error resetting menu settings: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()
