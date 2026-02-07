"""
Утилиты для Soft Delete
"""
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
import json
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

def delete_client(
    client_id: str,
    deleted_by_user: Dict[str, Any],
    reason: Optional[str] = None
) -> bool:
    """
    Удаление клиента:
    - Hard Delete если клиент зарегистрирован как пользователь (есть в users по phone/email)
    - Soft Delete если клиент добавлен через соцсети/систему (нет в users)
    """
    try:
        conn = get_db_connection()
        c = conn.cursor()

        # Получаем данные клиента
        c.execute("SELECT instagram_id, name, phone, email FROM clients WHERE instagram_id = %s AND deleted_at IS NULL", (client_id,))
        client = c.fetchone()
        if not client:
            conn.close()
            return False

        client_phone = client[2]
        client_email = client[3]

        # Проверяем, есть ли связанный пользователь (по телефону или email)
        is_registered_user = False
        if client_phone or client_email:
            query_parts = []
            params = []
            if client_phone:
                query_parts.append("phone = %s")
                params.append(client_phone)
            if client_email:
                query_parts.append("email = %s")
                params.append(client_email)

            c.execute(f"SELECT id FROM users WHERE ({' OR '.join(query_parts)}) AND deleted_at IS NULL", params)
            is_registered_user = c.fetchone() is not None

        if is_registered_user:
            # Hard Delete - клиент зарегистрирован как пользователь
            c.execute("DELETE FROM clients WHERE instagram_id = %s", (client_id,))
            can_restore = False
            log_info(f"🗑️ Client {client_id} HARD deleted (registered user) by {deleted_by_user.get('username')}", "soft_delete")
        else:
            # Soft Delete - клиент только из соцсетей/системы
            c.execute("UPDATE clients SET deleted_at = CURRENT_TIMESTAMP WHERE instagram_id = %s", (client_id,))
            can_restore = True
            log_info(f"🗑️ Client {client_id} SOFT deleted (social/manual) by {deleted_by_user.get('username')}", "soft_delete")

        # Записываем в лог удалений
        c.execute("""
            INSERT INTO deleted_items
            (entity_type, entity_id, deleted_by, deleted_by_role, reason, can_restore)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, ('client', client_id, deleted_by_user.get("id"), deleted_by_user.get("role"),
              reason or f"Deleted by {deleted_by_user.get('username')}", can_restore))

        conn.commit()
        conn.close()
        return True
    except Exception as e:
        log_error(f"Error deleting client: {e}", "soft_delete")
        return False

def soft_delete_user(
    user_id: int,
    deleted_by_user: Dict[str, Any],
    reason: Optional[str] = None
) -> bool:
    """Мягкое удаление пользователя"""
    try:
        conn = get_db_connection()
        c = conn.cursor()
        
        c.execute("SELECT id FROM users WHERE id = %s AND deleted_at IS NULL", (user_id,))
        if not c.fetchone():
            conn.close()
            return False
        
        # Помечаем пользователя как неактивного и удаленного
        c.execute("UPDATE users SET deleted_at = CURRENT_TIMESTAMP, is_active = FALSE WHERE id = %s", (user_id,))
        
        c.execute("""
            INSERT INTO deleted_items 
            (entity_type, entity_id, deleted_by, deleted_by_role, reason, can_restore)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, ('user', str(user_id), deleted_by_user.get("id"), deleted_by_user.get("role"), 
              reason or f"Deleted by {deleted_by_user.get('username')}", True))
        
        conn.commit()
        conn.close()
        log_info(f"🗑️ User {user_id} soft deleted by {deleted_by_user.get('username')}", "soft_delete")
        return True
    except Exception as e:
        log_error(f"Error soft deleting user: {e}", "soft_delete")
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
                di.created_at as deleted_at,
                u1.username as deleted_by_username,
                u2.username as restored_by_username
            FROM deleted_items di
            LEFT JOIN users u1 ON di.deleted_by = u1.id
            LEFT JOIN users u2 ON di.restored_by = u2.id
            WHERE di.restored_at IS NULL AND di.can_restore = TRUE
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

def restore_client(
    client_id: str,
    restored_by_user: Dict[str, Any]
) -> bool:
    """Восстановить soft-deleted клиента"""
    try:
        conn = get_db_connection()
        c = conn.cursor()

        c.execute("UPDATE clients SET deleted_at = NULL WHERE instagram_id = %s AND deleted_at IS NOT NULL", (client_id,))

        if c.rowcount == 0:
            conn.close()
            return False

        c.execute("""
            UPDATE deleted_items
            SET restored_at = CURRENT_TIMESTAMP, restored_by = %s
            WHERE entity_type = 'client' AND entity_id = %s AND restored_at IS NULL
        """, (restored_by_user.get("id"), client_id))

        conn.commit()
        conn.close()
        log_info(f"♻️ Client {client_id} restored by {restored_by_user.get('username')}", "soft_delete")
        return True
    except Exception as e:
        log_error(f"Error restoring client: {e}", "soft_delete")
        return False


def permanent_delete_client(client_id: str) -> bool:
    """
    Полное удаление клиента из корзины (очистка корзины)
    Удаляет soft-deleted клиента навсегда
    """
    try:
        conn = get_db_connection()
        c = conn.cursor()

        # Удаляем только если клиент был soft-deleted
        c.execute("DELETE FROM clients WHERE instagram_id = %s AND deleted_at IS NOT NULL", (client_id,))

        if c.rowcount == 0:
            conn.close()
            return False

        # Помечаем в deleted_items что нельзя восстановить
        c.execute("""
            UPDATE deleted_items
            SET can_restore = FALSE
            WHERE entity_type = 'client' AND entity_id = %s
        """, (client_id,))

        conn.commit()
        conn.close()
        log_info(f"⚠️ Client {client_id} permanently deleted from trash", "soft_delete")
        return True
    except Exception as e:
        log_error(f"Error permanently deleting client: {e}", "soft_delete")
        return False


def empty_trash(entity_type: Optional[str] = None) -> int:
    """
    Очистить корзину - удалить все soft-deleted элементы навсегда

    Args:
        entity_type: Тип сущности ('client', 'booking', 'user') или None для всех

    Returns:
        int: Количество удаленных элементов
    """
    try:
        conn = get_db_connection()
        c = conn.cursor()
        deleted_count = 0

        if entity_type is None or entity_type == 'client':
            c.execute("DELETE FROM clients WHERE deleted_at IS NOT NULL")
            deleted_count += c.rowcount

        if entity_type is None or entity_type == 'booking':
            c.execute("DELETE FROM bookings WHERE deleted_at IS NOT NULL")
            deleted_count += c.rowcount

        if entity_type is None or entity_type == 'user':
            c.execute("DELETE FROM users WHERE deleted_at IS NOT NULL")
            deleted_count += c.rowcount

        # Помечаем все элементы в deleted_items как невосстанавливаемые
        if entity_type:
            c.execute("UPDATE deleted_items SET can_restore = FALSE WHERE entity_type = %s AND can_restore = TRUE", (entity_type,))
        else:
            c.execute("UPDATE deleted_items SET can_restore = FALSE WHERE can_restore = TRUE")

        conn.commit()
        conn.close()
        log_info(f"🗑️ Trash emptied: {deleted_count} items permanently deleted", "soft_delete")
        return deleted_count
    except Exception as e:
        log_error(f"Error emptying trash: {e}", "soft_delete")
        return 0

def restore_user(
    user_id: int,
    restored_by_user: Dict[str, Any]
) -> bool:
    """Восстановить удаленного пользователя"""
    try:
        conn = get_db_connection()
        c = conn.cursor()
        
        # Восстанавливаем и активируем обратно
        c.execute("UPDATE users SET deleted_at = NULL, is_active = TRUE WHERE id = %s", (user_id,))
        
        c.execute("""
            UPDATE deleted_items
            SET restored_at = CURRENT_TIMESTAMP, restored_by = %s
            WHERE entity_type = 'user' AND entity_id = %s AND restored_at IS NULL
        """, (restored_by_user.get("id"), str(user_id)))
        
        conn.commit()
        conn.close()
        log_info(f"♻️ User {user_id} restored by {restored_by_user.get('username')}", "soft_delete")
        return True
    except Exception as e:
        log_error(f"Error restoring user: {e}", "soft_delete")
        return False

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


# ============================================
# Автоочистка корзины (элементы старше 30 дней)
# ============================================

def auto_cleanup_trash(days: int = 30) -> Dict[str, int]:
    """
    Автоматическая очистка корзины - удаляет элементы старше указанного количества дней

    Args:
        days: Количество дней (по умолчанию 30)

    Returns:
        Dict с количеством удаленных элементов по типам
    """
    try:
        conn = get_db_connection()
        c = conn.cursor()

        cutoff_date = datetime.now() - timedelta(days=days)
        deleted_counts = {'clients': 0, 'bookings': 0, 'users': 0}

        # Получаем старые записи из deleted_items
        c.execute("""
            SELECT entity_type, entity_id
            FROM deleted_items
            WHERE can_restore = TRUE
            AND created_at < %s
        """, (cutoff_date,))

        old_items = c.fetchall()

        for entity_type, entity_id in old_items:
            try:
                c.execute("SAVEPOINT auto_cleanup")

                if entity_type == 'client':
                    c.execute("DELETE FROM clients WHERE instagram_id = %s AND deleted_at IS NOT NULL", (entity_id,))
                    deleted_counts['clients'] += c.rowcount
                elif entity_type == 'booking':
                    c.execute("DELETE FROM bookings WHERE id = %s AND deleted_at IS NOT NULL", (int(entity_id),))
                    deleted_counts['bookings'] += c.rowcount
                elif entity_type == 'user':
                    c.execute("DELETE FROM users WHERE id = %s AND deleted_at IS NOT NULL", (int(entity_id),))
                    deleted_counts['users'] += c.rowcount

                c.execute("RELEASE SAVEPOINT auto_cleanup")
            except Exception as e:
                c.execute("ROLLBACK TO SAVEPOINT auto_cleanup")
                log_error(f"Auto cleanup failed for {entity_type} {entity_id}: {e}", "soft_delete")

        # Помечаем старые записи как невосстанавливаемые
        c.execute("""
            UPDATE deleted_items
            SET can_restore = FALSE, reason = COALESCE(reason, '') || ' (Auto-purged after 30 days)'
            WHERE can_restore = TRUE AND created_at < %s
        """, (cutoff_date,))

        conn.commit()
        conn.close()

        total = sum(deleted_counts.values())
        log_info(f"🧹 Auto cleanup: {total} items older than {days} days permanently deleted", "soft_delete")

        return deleted_counts

    except Exception as e:
        log_error(f"Error in auto cleanup: {e}", "soft_delete")
        return {'clients': 0, 'bookings': 0, 'users': 0}


# ============================================
# Экспорт данных клиента перед удалением
# ============================================

def export_client_data(client_id: str) -> Optional[Dict[str, Any]]:
    """
    Экспортировать все данные клиента перед удалением

    Args:
        client_id: ID клиента (instagram_id)

    Returns:
        Dict со всеми данными клиента или None если не найден
    """
    try:
        conn = get_db_connection()
        c = conn.cursor()

        # Основные данные клиента
        c.execute("""
            SELECT * FROM clients WHERE instagram_id = %s
        """, (client_id,))

        client_row = c.fetchone()
        if not client_row:
            conn.close()
            return None

        columns = [desc[0] for desc in c.description]
        client_data = dict(zip(columns, client_row))

        # История записей (bookings)
        c.execute("""
            SELECT id, service, master, date, time, status, revenue, notes, created_at
            FROM bookings
            WHERE instagram_id = %s
            ORDER BY date DESC
        """, (client_id,))

        bookings_columns = [desc[0] for desc in c.description]
        bookings = [dict(zip(bookings_columns, row)) for row in c.fetchall()]

        # История сообщений
        c.execute("""
            SELECT message_text, sender, timestamp, is_read
            FROM chat_history
            WHERE instagram_id = %s
            ORDER BY timestamp DESC
            LIMIT 500
        """, (client_id,))

        messages_columns = [desc[0] for desc in c.description]
        messages = [dict(zip(messages_columns, row)) for row in c.fetchall()]

        conn.close()

        # Формируем экспорт
        export = {
            'exported_at': datetime.now().isoformat(),
            'client': client_data,
            'bookings': bookings,
            'bookings_count': len(bookings),
            'messages': messages,
            'messages_count': len(messages),
            'total_spend': sum(b.get('revenue', 0) or 0 for b in bookings if b.get('status') == 'completed')
        }

        # Конвертируем datetime объекты в строки для JSON
        def convert_dates(obj):
            if isinstance(obj, dict):
                return {k: convert_dates(v) for k, v in obj.items()}
            elif isinstance(obj, list):
                return [convert_dates(i) for i in obj]
            elif isinstance(obj, datetime):
                return obj.isoformat()
            return obj

        export = convert_dates(export)

        log_info(f"📦 Client {client_id} data exported ({len(bookings)} bookings, {len(messages)} messages)", "soft_delete")

        return export

    except Exception as e:
        log_error(f"Error exporting client data: {e}", "soft_delete")
        return None


def delete_client_with_export(
    client_id: str,
    deleted_by_user: Dict[str, Any],
    reason: Optional[str] = None
) -> Dict[str, Any]:
    """
    Удаление клиента с предварительным экспортом данных

    Returns:
        Dict с результатом и экспортированными данными
    """
    # Сначала экспортируем данные
    export_data = export_client_data(client_id)

    if export_data is None:
        return {'success': False, 'error': 'Client not found', 'export': None}

    # Затем удаляем
    success = delete_client(client_id, deleted_by_user, reason)

    return {
        'success': success,
        'export': export_data if success else None,
        'message': 'Client deleted with data export' if success else 'Delete failed'
    }


# ============================================
# Массовое удаление клиентов с фильтрами
# ============================================

def bulk_delete_clients(
    deleted_by_user: Dict[str, Any],
    filters: Optional[Dict[str, Any]] = None,
    client_ids: Optional[List[str]] = None,
    reason: Optional[str] = None,
    export_before_delete: bool = True
) -> Dict[str, Any]:
    """
    Массовое удаление клиентов с фильтрами

    Args:
        deleted_by_user: Пользователь, выполняющий удаление
        filters: Фильтры для выбора клиентов:
            - status: статус клиента ('new', 'active', 'inactive', etc.)
            - no_bookings: True - клиенты без записей
            - no_messages_days: int - нет сообщений N дней
            - created_before: дата - созданы до указанной даты
            - temperature: температура клиента ('cold', 'warm', 'hot')
        client_ids: Конкретный список ID для удаления (игнорирует filters)
        reason: Причина удаления
        export_before_delete: Экспортировать данные перед удалением

    Returns:
        Dict с результатами операции
    """
    try:
        conn = get_db_connection()
        c = conn.cursor()

        # Если переданы конкретные ID
        if client_ids:
            target_ids = client_ids
        else:
            # Строим запрос на основе фильтров
            query = "SELECT instagram_id FROM clients WHERE deleted_at IS NULL"
            params = []

            if filters:
                if filters.get('status'):
                    query += " AND status = %s"
                    params.append(filters['status'])

                if filters.get('no_bookings'):
                    query += " AND instagram_id NOT IN (SELECT DISTINCT instagram_id FROM bookings)"

                if filters.get('no_messages_days'):
                    days = filters['no_messages_days']
                    cutoff = datetime.now() - timedelta(days=days)
                    query += " AND (last_contact IS NULL OR last_contact < %s)"
                    params.append(cutoff.isoformat())

                if filters.get('created_before'):
                    query += " AND created_at < %s"
                    params.append(filters['created_before'])

                if filters.get('temperature'):
                    query += " AND temperature = %s"
                    params.append(filters['temperature'])

            c.execute(query, params)
            target_ids = [row[0] for row in c.fetchall()]

        conn.close()

        if not target_ids:
            return {
                'success': True,
                'deleted_count': 0,
                'exports': [],
                'message': 'No clients match the criteria'
            }

        # Удаляем клиентов
        deleted_count = 0
        exports = []
        errors = []

        for client_id in target_ids:
            try:
                if export_before_delete:
                    result = delete_client_with_export(client_id, deleted_by_user, reason)
                    if result['success']:
                        deleted_count += 1
                        exports.append(result['export'])
                    else:
                        errors.append({'id': client_id, 'error': result.get('error')})
                else:
                    if delete_client(client_id, deleted_by_user, reason):
                        deleted_count += 1
                    else:
                        errors.append({'id': client_id, 'error': 'Delete failed'})
            except Exception as e:
                errors.append({'id': client_id, 'error': str(e)})

        log_info(f"🗑️ Bulk delete: {deleted_count}/{len(target_ids)} clients deleted by {deleted_by_user.get('username')}", "soft_delete")

        return {
            'success': True,
            'deleted_count': deleted_count,
            'total_targeted': len(target_ids),
            'exports': exports if export_before_delete else [],
            'errors': errors,
            'message': f'Deleted {deleted_count} of {len(target_ids)} clients'
        }

    except Exception as e:
        log_error(f"Error in bulk delete: {e}", "soft_delete")
        return {
            'success': False,
            'deleted_count': 0,
            'error': str(e)
        }
