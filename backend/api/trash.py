
from fastapi import APIRouter, Depends, HTTPException, Cookie, Query
from typing import Optional, List, Dict, Any
from fastapi.responses import JSONResponse
from utils.utils import get_current_user
from utils.soft_delete import (
    get_deleted_items, restore_booking, restore_client, restore_user,
    auto_cleanup_trash, export_client_data, delete_client_with_export, bulk_delete_clients
)
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
        try:
            # Use SAVEPOINT for single deletion too
            c.execute("SAVEPOINT single_trash_delete")
            if entity_type == 'booking':
                c.execute("DELETE FROM bookings WHERE id = %s", (entity_id,))
            elif entity_type == 'client':
                c.execute("DELETE FROM clients WHERE instagram_id = %s", (entity_id,))
            elif entity_type == 'user':
                c.execute("DELETE FROM users WHERE id = %s", (entity_id,))
            c.execute("RELEASE SAVEPOINT single_trash_delete")
        except Exception as e:
            c.execute("ROLLBACK TO SAVEPOINT single_trash_delete")
            from utils.logger import log_error
            log_error(f"Cannot hard delete single item {entity_type} {entity_id}: {e}", "trash")
            
        # ALWAYS handle in deleted_items to hide from trash
        c.execute("""
            UPDATE deleted_items 
            SET can_restore = FALSE, reason = COALESCE(reason, '') || ' (Permanently deleted)'
            WHERE entity_type = %s AND entity_id = %s
        """, (entity_type, entity_id))
        
        conn.commit()
        
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
        if conn: conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.delete("/admin/trash/empty")
async def empty_trash(
    current_user: dict = Depends(get_current_user)
):
    """Очистить корзину полностью (только Директор)"""
    if current_user["role"] != "director":
        raise HTTPException(status_code=403, detail="Forbidden: Only Director can empty trash")

    conn = get_db_connection()
    c = conn.cursor()
    try:
        # Get all deleted items that can be restored
        c.execute("SELECT entity_type, entity_id FROM deleted_items WHERE can_restore = TRUE")
        items = c.fetchall()
        
        count = 0
        from utils.logger import log_error
        
        for entity_type, entity_id in items:
            try:
                # Use SAVEPOINT to protect the transaction from FK constraint errors
                c.execute("SAVEPOINT trash_item_delete")
                if entity_type == 'booking':
                    c.execute("DELETE FROM bookings WHERE id = %s", (entity_id,))
                elif entity_type == 'client':
                    c.execute("DELETE FROM clients WHERE instagram_id = %s", (entity_id,))
                elif entity_type == 'user':
                    c.execute("DELETE FROM users WHERE id = %s", (entity_id,))
                
                rows = c.rowcount
                count += rows
                c.execute("RELEASE SAVEPOINT trash_item_delete")
            except Exception as e:
                # Rollback to savepoint so we can continue with other items
                c.execute("ROLLBACK TO SAVEPOINT trash_item_delete")
                log_error(f"Cannot hard delete {entity_type} {entity_id} (soft-purged only): {e}", "trash")

        # Mark all as permanently deleted in deleted_items (hide from trash bin)
        c.execute("UPDATE deleted_items SET can_restore = FALSE, reason = COALESCE(reason, '') || ' (Purged)' WHERE can_restore = TRUE")
        
        conn.commit()
        
        log_audit(
            user=current_user,
            action='delete_all',
            entity_type='trash',
            entity_id='all',
            new_value={"count": count},
            success=True
        )

        return {"success": True, "message": f"Trash emptied. {count} items physically removed, others soft-purged."}
        
    except Exception as e:
        if conn: conn.rollback()
        from utils.logger import log_error
        log_error(f"Error emptying trash: {e}", "trash")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.post("/admin/trash/restore-batch")
async def restore_items_batch(
    request: dict,
    current_user: dict = Depends(get_current_user)
):
    """Массовое восстановление объектов"""
    if current_user["role"] not in ["director", "admin"]:
        raise HTTPException(status_code=403, detail="Forbidden")
        
    items = request.get("items", []) # List of {"type": "booking", "id": "123"}
    if not items:
        return {"success": True, "count": 0}
        
    success_count = 0
    for item in items:
        e_type = item.get("type")
        e_id = item.get("id")
        try:
            success = False
            if e_type == 'booking':
                success = restore_booking(int(e_id), current_user)
            elif e_type == 'client':
                success = restore_client(e_id, current_user)
            elif e_type == 'user':
                success = restore_user(int(e_id), current_user)
            
            if success:
                success_count += 1
                log_audit(user=current_user, action='restore', entity_type=e_type, entity_id=e_id, success=True)
        except:
            continue
            
    return {"success": True, "count": success_count}

@router.post("/admin/trash/delete-batch")
async def delete_items_batch(
    request: dict,
    current_user: dict = Depends(get_current_user)
):
    """Массовое окончательное удаление"""
    if current_user["role"] != "director":
        raise HTTPException(status_code=403, detail="Forbidden: Only Director can delete items permanently")
        
    items = request.get("items", []) # List of {"type": "booking", "id": "123"}
    if not items:
        return {"success": True, "count": 0}
        
    conn = get_db_connection()
    c = conn.cursor()
    success_count = 0
    try:
        for item in items:
            e_type = item.get("type")
            e_id = item.get("id")
            
            try:
                c.execute(f"SAVEPOINT batch_trash_delete_{success_count}")
                if e_type == 'booking':
                    c.execute("DELETE FROM bookings WHERE id = %s", (e_id,))
                elif e_type == 'client':
                    c.execute("DELETE FROM clients WHERE instagram_id = %s", (e_id,))
                elif e_type == 'user':
                    c.execute("DELETE FROM users WHERE id = %s", (e_id,))
                
                rows = c.rowcount
                c.execute(f"RELEASE SAVEPOINT batch_trash_delete_{success_count}")
            except Exception as e:
                c.execute(f"ROLLBACK TO SAVEPOINT batch_trash_delete_{success_count}")
                from utils.logger import log_error
                log_error(f"Cannot hard delete batch item {e_type} {e_id}: {e}", "trash")
                rows = 0
            
            # ALWAYS handle in deleted_items to hide from trash
            c.execute("""
                UPDATE deleted_items 
                SET can_restore = FALSE, reason = COALESCE(reason, '') || ' (Permanently deleted batch)'
                WHERE entity_type = %s AND entity_id = %s
            """, (e_type, e_id))
            
            success_count += 1
            log_audit(user=current_user, action='delete', entity_type=e_type, entity_id=e_id, new_value={"permanent": True}, success=True)
        
        conn.commit()
        return {"success": True, "count": success_count}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


# ============================================
# Автоочистка корзины
# ============================================

@router.post("/admin/trash/auto-cleanup")
async def run_auto_cleanup(
    days: int = Query(30, ge=1, le=365),
    current_user: dict = Depends(get_current_user)
):
    """
    Автоочистка корзины - удаляет элементы старше N дней
    Только для Директора
    """
    if current_user["role"] != "director":
        raise HTTPException(status_code=403, detail="Forbidden: Only Director can run auto cleanup")

    result = auto_cleanup_trash(days)

    log_audit(
        user=current_user,
        action='auto_cleanup',
        entity_type='trash',
        entity_id='all',
        new_value={"days": days, "deleted": result},
        success=True
    )

    total = sum(result.values())
    return {
        "success": True,
        "message": f"Auto cleanup completed. {total} items older than {days} days deleted.",
        "deleted": result
    }


# ============================================
# Экспорт данных клиента
# ============================================

@router.get("/admin/clients/{client_id}/export")
async def export_client(
    client_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Экспортировать все данные клиента (для GDPR или перед удалением)
    """
    if current_user["role"] not in ["director", "admin"]:
        raise HTTPException(status_code=403, detail="Forbidden: Only Director or Admin can export client data")

    from urllib.parse import unquote
    decoded_id = unquote(client_id)

    export = export_client_data(decoded_id)

    if export is None:
        raise HTTPException(status_code=404, detail="Client not found")

    log_audit(
        user=current_user,
        action='export',
        entity_type='client',
        entity_id=decoded_id,
        success=True
    )

    return {"success": True, "data": export}


@router.delete("/admin/clients/{client_id}/delete-with-export")
async def delete_client_and_export(
    client_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Удалить клиента с предварительным экспортом всех данных
    """
    if current_user["role"] != "director":
        raise HTTPException(status_code=403, detail="Forbidden: Only Director can delete clients")

    from urllib.parse import unquote
    decoded_id = unquote(client_id)

    result = delete_client_with_export(decoded_id, current_user)

    if not result['success']:
        raise HTTPException(status_code=404, detail=result.get('error', 'Delete failed'))

    log_audit(
        user=current_user,
        action='delete_with_export',
        entity_type='client',
        entity_id=decoded_id,
        new_value={"exported": True},
        success=True
    )

    return result


# ============================================
# Массовое удаление клиентов
# ============================================

@router.post("/admin/clients/bulk-delete")
async def bulk_delete_clients_endpoint(
    request: dict,
    current_user: dict = Depends(get_current_user)
):
    """
    Массовое удаление клиентов с фильтрами

    Request body:
    {
        "client_ids": ["id1", "id2"],  // ИЛИ используйте filters
        "filters": {
            "status": "inactive",      // Статус клиента
            "no_bookings": true,       // Без записей
            "no_messages_days": 90,    // Нет сообщений N дней
            "created_before": "2024-01-01",  // Созданы до даты
            "temperature": "cold"      // Температура клиента
        },
        "reason": "Очистка неактивных клиентов",
        "export_before_delete": true   // Сохранить данные перед удалением
    }
    """
    if current_user["role"] != "director":
        raise HTTPException(status_code=403, detail="Forbidden: Only Director can bulk delete clients")

    client_ids = request.get("client_ids")
    filters = request.get("filters")
    reason = request.get("reason", "Bulk delete")
    export_before = request.get("export_before_delete", True)

    if not client_ids and not filters:
        raise HTTPException(status_code=400, detail="Either client_ids or filters must be provided")

    result = bulk_delete_clients(
        deleted_by_user=current_user,
        filters=filters,
        client_ids=client_ids,
        reason=reason,
        export_before_delete=export_before
    )

    log_audit(
        user=current_user,
        action='bulk_delete',
        entity_type='client',
        entity_id='multiple',
        new_value={
            "deleted_count": result.get('deleted_count'),
            "filters": filters,
            "ids_count": len(client_ids) if client_ids else 0
        },
        success=result.get('success', False)
    )

    return result
