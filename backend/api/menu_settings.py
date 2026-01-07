
from fastapi import APIRouter, Depends, HTTPException
from typing import Optional, List
from pydantic import BaseModel
from db.connection import get_db_connection
from utils.utils import get_current_user
import json
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

class MenuSettings(BaseModel):
    menu_order: Optional[List[str]] = None
    hidden_items: Optional[List[str]] = None

class MenuSettingsResponse(BaseModel):
    menu_order: Optional[List[str]]
    hidden_items: Optional[List[str]]

@router.get("/menu-settings", response_model=MenuSettingsResponse)
async def get_menu_settings(current_user: dict = Depends(get_current_user)):
    """Get menu settings for current user or their role"""
    conn = get_db_connection()
    c = conn.cursor()
    try:
        # First try to get user-specific settings
        c.execute("""
            SELECT menu_order, hidden_items 
            FROM menu_settings 
            WHERE user_id = %s
        """, (current_user['id'],))
        
        row = c.fetchone()
        
        # If no user-specific settings, try role-based settings
        if not row:
            c.execute("""
                SELECT menu_order, hidden_items 
                FROM menu_settings 
                WHERE role = %s
            """, (current_user['role'],))
            row = c.fetchone()
        
        if row:
            return {
                "menu_order": row[0] if row[0] else None,
                "hidden_items": row[1] if row[1] else None
            }
        
        # Return defaults if no settings found
        return {
            "menu_order": None,
            "hidden_items": None
        }
    except Exception as e:
        logger.error(f"Error fetching menu settings: {e}")
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
        return {"success": True, "message": "Menu settings reset to default"}
    except Exception as e:
        conn.rollback()
        logger.error(f"Error resetting menu settings: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()
