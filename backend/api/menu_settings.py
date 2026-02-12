
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from typing import Optional, List, Any
from pydantic import BaseModel
from db.connection import get_db_connection
from utils.utils import get_current_user
from utils.cache import cache
import json
import logging
import time

router = APIRouter()
logger = logging.getLogger(__name__)

# Simple cache for menu settings (fallback when Redis is unavailable)
_menu_cache = {}
_cache_ttl = 0  # Disabled for CRM - always fetch fresh data

class MenuSettings(BaseModel):
    menu_order: Optional[List[Any]] = None
    hidden_items: Optional[List[str]] = None

class MenuSettingsResponse(BaseModel):
    menu_order: Optional[List[Any]]
    hidden_items: Optional[List[str]]

class AccountMenuSettings(BaseModel):
    hidden_items: Optional[List[str]] = None
    apply_mode: Optional[str] = "all"
    target_client_ids: Optional[List[str]] = None

class AccountMenuSettingsResponse(BaseModel):
    hidden_items: List[str]
    apply_mode: str
    target_client_ids: List[str]

ADMIN_ROLES = {"director", "admin", "manager"}

def _normalize_string_list(values: Optional[List[Any]]) -> List[str]:
    if values is None:
        return []
    normalized: List[str] = []
    for raw_value in values:
        value = str(raw_value).strip()
        if len(value) == 0:
            continue
        normalized.append(value)
    return normalized

def _load_salon_menu_config(cursor) -> dict:
    cursor.execute("SELECT menu_config FROM salon_settings WHERE id = 1")
    row = cursor.fetchone()
    if row is None:
        return {}
    raw_value = row[0]
    if raw_value is None:
        return {}
    if isinstance(raw_value, dict):
        return raw_value
    if isinstance(raw_value, str):
        try:
            loaded = json.loads(raw_value)
            if isinstance(loaded, dict):
                return loaded
        except json.JSONDecodeError:
            logger.warning("Failed to parse salon_settings.menu_config")
            return {}
    return {}

def _save_salon_menu_config(cursor, config: dict) -> None:
    cursor.execute(
        """
            INSERT INTO salon_settings (id, menu_config, updated_at)
            VALUES (1, %s::jsonb, CURRENT_TIMESTAMP)
            ON CONFLICT (id) DO UPDATE SET
                menu_config = EXCLUDED.menu_config,
                updated_at = CURRENT_TIMESTAMP
        """,
        (json.dumps(config, ensure_ascii=False),)
    )

def _resolve_client_id(cursor, current_user: dict) -> Optional[str]:
    user_id = current_user.get("id")
    user_email = current_user.get("email")
    user_phone = current_user.get("phone")
    username = current_user.get("username")

    if user_id is not None:
        cursor.execute(
            "SELECT instagram_id FROM clients WHERE user_id = %s ORDER BY created_at DESC LIMIT 1",
            (user_id,)
        )
        row = cursor.fetchone()
        if row is not None and row[0]:
            return str(row[0])

    if user_email:
        cursor.execute(
            "SELECT instagram_id FROM clients WHERE email = %s ORDER BY created_at DESC LIMIT 1",
            (user_email,)
        )
        row = cursor.fetchone()
        if row is not None and row[0]:
            return str(row[0])

    if user_phone:
        cursor.execute(
            "SELECT instagram_id FROM clients WHERE phone = %s ORDER BY created_at DESC LIMIT 1",
            (user_phone,)
        )
        row = cursor.fetchone()
        if row is not None and row[0]:
            return str(row[0])

    if username:
        cursor.execute(
            "SELECT instagram_id FROM clients WHERE instagram_id = %s LIMIT 1",
            (username,)
        )
        row = cursor.fetchone()
        if row is not None and row[0]:
            return str(row[0])

    return None

@router.get("/menu-settings", response_model=MenuSettingsResponse)
async def get_menu_settings(current_user: dict = Depends(get_current_user)):
    """Get menu settings for current user or their role"""
    logger.info(f"Fetching menu settings for user {current_user.get('id')} with role {current_user.get('role')}")
    
    cache_key = f"menu_settings_{current_user.get('id')}_{current_user.get('role')}"
    
    # Try Redis cache first (if available)
    if cache.enabled:
        try:
            cached_data = cache.get(cache_key)
            if cached_data is not None:
                return cached_data
        except Exception as ce:
            logger.error(f"Redis cache error: {ce}")
    
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
        """, (current_user.get('id'), current_user.get('role')))
        
        row = c.fetchone()
        
        result = {
            "menu_order": row[0] if row and row[0] else None,
            "hidden_items": row[1] if row and row[1] else None
        }
        
        # Cache in Redis (if available)
        if cache.enabled:
            try:
                cache.set(cache_key, result, expire=300)  # 5 minutes
            except Exception as ce:
                logger.error(f"Redis cache set error: {ce}")
        
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
        logger.error(f"Error fetching menu settings: {e}")
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

@router.get("/account-menu-settings", response_model=AccountMenuSettingsResponse)
async def get_account_menu_settings(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") not in ADMIN_ROLES:
        raise HTTPException(status_code=403, detail="Forbidden")

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        config = _load_salon_menu_config(cursor)
        account_config = config.get("account")
        if not isinstance(account_config, dict):
            account_config = {}

        hidden_items = _normalize_string_list(account_config.get("hidden_items"))
        apply_mode_raw = str(account_config.get("apply_mode") or "all").lower()
        apply_mode = "selected" if apply_mode_raw == "selected" else "all"
        target_client_ids = _normalize_string_list(account_config.get("target_client_ids"))

        return {
            "hidden_items": hidden_items,
            "apply_mode": apply_mode,
            "target_client_ids": target_client_ids,
        }
    except Exception as exc:
        logger.error("Error loading account menu settings: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to load account menu settings")
    finally:
        conn.close()

@router.post("/account-menu-settings")
async def save_account_menu_settings(
    payload: AccountMenuSettings,
    current_user: dict = Depends(get_current_user)
):
    if current_user.get("role") not in ADMIN_ROLES:
        raise HTTPException(status_code=403, detail="Forbidden")

    hidden_items = _normalize_string_list(payload.hidden_items)
    apply_mode = "selected" if payload.apply_mode == "selected" else "all"
    target_client_ids = _normalize_string_list(payload.target_client_ids)

    if apply_mode == "all":
        target_client_ids = []

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        config = _load_salon_menu_config(cursor)
        config["account"] = {
            "hidden_items": hidden_items,
            "apply_mode": apply_mode,
            "target_client_ids": target_client_ids,
            "updated_at": datetime.utcnow().isoformat(),
            "updated_by": current_user.get("id"),
        }
        _save_salon_menu_config(cursor, config)
        conn.commit()
        return {"success": True}
    except Exception as exc:
        conn.rollback()
        logger.error("Error saving account menu settings: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to save account menu settings")
    finally:
        conn.close()

@router.get("/client/account-menu-settings")
async def get_client_account_menu_settings(current_user: dict = Depends(get_current_user)):
    current_role = str(current_user.get("role") or "")
    if current_role != "client" and current_role not in ADMIN_ROLES:
        raise HTTPException(status_code=403, detail="Forbidden")

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        config = _load_salon_menu_config(cursor)
        account_config = config.get("account")
        if not isinstance(account_config, dict):
            return {"hidden_items": [], "apply_mode": "all", "is_targeted": True}

        hidden_items = _normalize_string_list(account_config.get("hidden_items"))
        apply_mode_raw = str(account_config.get("apply_mode") or "all").lower()
        apply_mode = "selected" if apply_mode_raw == "selected" else "all"
        target_client_ids = set(_normalize_string_list(account_config.get("target_client_ids")))

        if current_role in ADMIN_ROLES:
            return {"hidden_items": hidden_items, "apply_mode": apply_mode, "is_targeted": True}

        if apply_mode == "all":
            return {"hidden_items": hidden_items, "apply_mode": apply_mode, "is_targeted": True}

        current_client_id = _resolve_client_id(cursor, current_user)
        is_targeted = current_client_id in target_client_ids if current_client_id else False

        return {
            "hidden_items": hidden_items if is_targeted else [],
            "apply_mode": apply_mode,
            "is_targeted": is_targeted,
        }
    except Exception as exc:
        logger.error("Error loading client account menu settings: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to load client account menu settings")
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
