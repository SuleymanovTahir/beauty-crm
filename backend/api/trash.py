
from fastapi import APIRouter, Depends, HTTPException, Cookie, Query
from typing import Optional, List, Dict, Any
from fastapi.responses import JSONResponse
from utils.utils import get_current_user
from utils.soft_delete import get_deleted_items, restore_booking, restore_client, restore_user
from utils.audit import log_audit
from db.connection import get_db_connection

router = APIRouter()

@router.get("/admin/trash")
async def list_trash(
    entity_type: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    """Получить список удаленных объектов (корзина)"""
    if current_user["role"] not in ["director", "admin"]:
        raise HTTPException(status_code=403, detail="Forbidden: Only Director or Admin can access trash")
    
    items = get_deleted_items(entity_type=entity_type)
    return {"items": items}

@router.post("/admin/trash/restore/{entity_type}/{entity_id}")
async def restore_item(
    entity_type: str,
    entity_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Восстановить объект из корзины"""
    if current_user["role"] not in ["director", "admin"]:
        raise HTTPException(status_code=403, detail="Forbidden: Only Director or Admin can restore items")
    
    success = False
    if entity_type == 'booking':
        success = restore_booking(int(entity_id), current_user)
    elif entity_type == 'client':
        success = restore_client(entity_id, current_user)
    elif entity_type == 'user':
        success = restore_user(int(entity_id), current_user)
    else:
        raise HTTPException(status_code=400, detail="Invalid entity type")
    
    if success:
        # Логируем восстановление
        log_audit(
            user=current_user,
            action='restore',
            entity_type=entity_type,
            entity_id=entity_id,
            success=True
        )
        return {"success": True, "message": f"{entity_type.capitalize()} restored successfully"}
    else:
        raise HTTPException(status_code=400, detail="Failed to restore item")

@router.delete("/admin/trash/permanent/{entity_type}/{entity_id}")
async def permanent_delete_item(
    entity_type: str,
    entity_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Окончательное удаление объекта (только Директор)"""
    if current_user["role"] != "director":
        raise HTTPException(status_code=403, detail="Forbidden: Only Director can permanently delete items")
    
    # В данный момент реализовано только для bookings в утилите, 
    # добавим общую логику если нужно, но пока ограничимся этим.
    
    conn = get_db_connection()
    c = conn.cursor()
    try:
        if entity_type == 'booking':
            c.execute("DELETE FROM bookings WHERE id = %s", (entity_id,))
        elif entity_type == 'client':
            c.execute("DELETE FROM clients WHERE id = %s", (entity_id,))
        elif entity_type == 'user':
            c.execute("DELETE FROM users WHERE id = %s", (entity_id,))
        else:
            conn.close()
            raise HTTPException(status_code=400, detail="Invalid entity type")
            
        # Помечаем в deleted_items
        c.execute("""
            UPDATE deleted_items 
            SET can_restore = FALSE, reason = reason || ' (Permanently deleted)'
            WHERE entity_type = %s AND entity_id = %s
        """, (entity_type, entity_id))
        
        conn.commit()
        conn.close()
        
        log_audit(
            user=current_user,
            action='delete',
            entity_type=entity_type,
            entity_id=entity_id,
            new_value={"permanent": True},
            success=True
        )
        
        return {"success": True, "message": "Item permanently deleted"}
    except Exception as e:
        if conn: conn.close()
        raise HTTPException(status_code=500, detail=str(e))
