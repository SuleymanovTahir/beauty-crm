"""
Утилиты для Soft Delete
"""
from datetime import datetime
from typing import Optional, Dict, Any
from db.connection import get_db_connection
from utils.logger import log_info, log_error

def soft_delete_booking(
    booking_id: int,
    deleted_by_user: Dict[str, Any],
    reason: Optional[str] = None
) -> bool:
    """
    Мягкое удаление записи (Soft Delete)
    
    Args:
        booking_id: ID записи
        deleted_by_user: Пользователь, удаляющий запись
        reason: Причина удаления
    
    Returns:
        bool: Успешно ли удалено
    """
    try:
        conn = get_db_connection()
        c = conn.cursor()
        
        # Проверяем что запись существует и не удалена
        c.execute("""
            SELECT * FROM bookings 
            WHERE id = %s AND deleted_at IS NULL
        """, (booking_id,))
        
        booking = c.fetchone()
        
        if not booking:
            conn.close()
            return False
        
        # Soft delete
        c.execute("""
            UPDATE bookings 
            SET deleted_at = CURRENT_TIMESTAMP
            WHERE id = %s
        """, (booking_id,))
        
        # Записываем в deleted_items
        c.execute("""
            INSERT INTO deleted_items 
            (entity_type, entity_id, deleted_by, deleted_by_role, reason, can_restore)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (
            'booking',
            str(booking_id),
            deleted_by_user.get("id"),
            deleted_by_user.get("role"),
            reason or f"Deleted by {deleted_by_user.get('username')}",
            True
        ))
        
        conn.commit()
        conn.close()
        
        log_info(f"🗑️ Booking {booking_id} soft deleted by {deleted_by_user.get('username')}", "soft_delete")
        
        return True
        
    except Exception as e:
        log_error(f"Error soft deleting booking: {e}", "soft_delete")
        return False

def restore_booking(
    booking_id: int,
    restored_by_user: Dict[str, Any]
) -> bool:
    """
    Восстановить удаленную запись
    
    Args:
        booking_id: ID записи
        restored_by_user: Пользователь, восстанавливающий запись
    
    Returns:
        bool: Успешно ли восстановлено
    """
    try:
        conn = get_db_connection()
        c = conn.cursor()
        
        # Проверяем что запись удалена
        c.execute("""
            SELECT * FROM bookings 
            WHERE id = %s AND deleted_at IS NOT NULL
        """, (booking_id,))
        
        booking = c.fetchone()
        
        if not booking:
            conn.close()
            return False
        
        # Восстанавливаем
        c.execute("""
            UPDATE bookings 
            SET deleted_at = NULL
            WHERE id = %s
        """, (booking_id,))
        
        # Обновляем deleted_items
        c.execute("""
            UPDATE deleted_items
            SET restored_at = CURRENT_TIMESTAMP, restored_by = %s
            WHERE entity_type = 'booking' AND entity_id = %s AND restored_at IS NULL
        """, (restored_by_user.get("id"), str(booking_id)))
        
        conn.commit()
        conn.close()
        
        log_info(f"♻️ Booking {booking_id} restored by {restored_by_user.get('username')}", "soft_delete")
        
        return True
        
    except Exception as e:
        log_error(f"Error restoring booking: {e}", "soft_delete")
        return False

def get_deleted_items(
    entity_type: Optional[str] = None,
    limit: int = 100
):
    """
    Получить список удаленных элементов (корзина)
    
    Args:
        entity_type: Фильтр по типу ('booking', 'client', 'user')
        limit: Максимальное количество
    
    Returns:
        List[Dict]: Список удаленных элементов
    """
    try:
        conn = get_db_connection()
        c = conn.cursor()
        
        query = """
            SELECT 
                di.*,
                u1.username as deleted_by_username,
                u2.username as restored_by_username
            FROM deleted_items di
            LEFT JOIN users u1 ON di.deleted_by = u1.id
            LEFT JOIN users u2 ON di.restored_by = u2.id
            WHERE di.restored_at IS NULL
        """
        
        params = []
        
        if entity_type:
            query += " AND di.entity_type = %s"
            params.append(entity_type)
        
        query += " ORDER BY di.created_at DESC LIMIT %s"
        params.append(limit)
        
        c.execute(query, params)
        
        columns = [desc[0] for desc in c.description]
        results = []
        
        for row in c.fetchall():
            results.append(dict(zip(columns, row)))
        
        conn.close()
        return results
        
    except Exception as e:
        log_error(f"Error getting deleted items: {e}", "soft_delete")
        return []

def permanent_delete_booking(booking_id: int) -> bool:
    """
    Полное удаление записи (ОПАСНО! Нельзя восстановить)
    
    Args:
        booking_id: ID записи
    
    Returns:
        bool: Успешно ли удалено
    """
    try:
        conn = get_db_connection()
        c = conn.cursor()
        
        # Полное удаление
        c.execute("DELETE FROM bookings WHERE id = %s", (booking_id,))
        
        # Помечаем в deleted_items что нельзя восстановить
        c.execute("""
            UPDATE deleted_items
            SET can_restore = FALSE
            WHERE entity_type = 'booking' AND entity_id = %s
        """, (str(booking_id),))
        
        conn.commit()
        conn.close()
        
        log_info(f"⚠️ Booking {booking_id} permanently deleted", "soft_delete")
        
        return True
        
    except Exception as e:
        log_error(f"Error permanently deleting booking: {e}", "soft_delete")
        return False
