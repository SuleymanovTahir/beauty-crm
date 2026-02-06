#!/usr/bin/env python3
"""
Модуль для управления ожидающими подтверждения регистрациями
"""
from typing import List, Dict, Optional
from datetime import datetime

from db.connection import get_db_connection
from utils.logger import log_info, log_error, log_warning
from utils.email_service import send_registration_approved_email, send_registration_rejected_email


def get_pending_registrations() -> List[Dict]:
    """
    Получить все регистрации, ожидающие одобрения
    
    Returns:
        List of pending registrations with user details
    """
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        c.execute("""
            SELECT
                id, username, full_name, email, phone, role, position,
                created_at, email_verified, is_active
            FROM users
            WHERE email_verified = TRUE AND is_active = FALSE
            ORDER BY created_at DESC
        """)

        pending_users = []
        for row in c.fetchall():
            pending_users.append({
                'id': row[0],
                'username': row[1],
                'full_name': row[2],
                'email': row[3],
                'phone': row[4],
                'role': row[5],
                'position': row[6],
                'created_at': row[7],
                'email_verified': row[8],
                'is_active': row[9]
            })
        
        log_info(f"Retrieved {len(pending_users)} pending registrations", "pending_registrations")
        return pending_users
        
    except Exception as e:
        log_error(f"Failed to get pending registrations: {e}", "pending_registrations")
        return []
    finally:
        conn.close()


def approve_registration(user_id: int, approved_by: int) -> bool:
    """
    Одобрить регистрацию пользователя
    
    Args:
        user_id: ID пользователя для одобрения
        approved_by: ID админа who одобрил
    
    Returns:
        True если успешно одобрено
    """
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        # Получаем данные пользователя для отправки email
        c.execute("SELECT email, full_name FROM users WHERE id = %s", (user_id,))
        user_data = c.fetchone()
        
        if not user_data:
            log_warning(f"User {user_id} not found for approval", "pending_registrations")
            return False
        
        email, full_name = user_data
        
        # Активируем пользователя
        c.execute("""
            UPDATE users 
            SET is_active = TRUE, updated_at = %s
            WHERE id = %s
        """, (datetime.now().isoformat(), user_id))
        
        # Записываем в audit log
        c.execute("""
            INSERT INTO registration_audit (user_id, action, approved_by, created_at)
            VALUES (%s, 'approved', %s, %s)
        """, (user_id, approved_by, datetime.now().isoformat()))
        
        # Логируем в Audit Log (для уведомлений директоров)
        from utils.audit import log_audit
        try:
            # Пытаемся получить данные админа для лога
            c.execute("SELECT id, username, role FROM users WHERE id = %s", (approved_by,))
            admin_data = c.fetchone()
            admin_user = {"id": admin_data[0], "username": admin_data[1], "role": admin_data[2]} if admin_data else {"id": approved_by, "role": "admin", "username": "Admin"}
            
            log_audit(
                user=admin_user,
                action='update',
                entity_type='user',
                entity_id=str(user_id),
                new_value={"is_active": True, "status": "approved"},
                success=True
            )
        except Exception as audit_err:
            log_error(f"Failed to log audit for approval: {audit_err}", "audit")

        conn.commit()

        # Отправляем email уведомление в фоновом режиме
        import threading
        def send_email_async():
            try:
                send_registration_approved_email(email, full_name)
            except Exception as e:
                log_error(f"Failed to send approval email to {email}: {e}", "email")

        threading.Thread(target=send_email_async, daemon=True).start()

        log_info(f"Registration approved for user {user_id} by admin {approved_by}", "pending_registrations")
        return True
        
    except Exception as e:
        conn.rollback()
        log_error(f"Failed to approve registration for user {user_id}: {e}", "pending_registrations")
        return False
    finally:
        conn.close()


def reject_registration(user_id: int, rejected_by: int, reason: str = "") -> bool:
    """
    Отклонить регистрацию пользователя
    
    Args:
        user_id: ID пользователя для отклонения
        rejected_by: ID админа who отклонил
        reason: Причина отклонения
    
    Returns:
        True если успешно отклонено
    """
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        # Получаем данные пользователя для отправки email
        c.execute("SELECT email, full_name FROM users WHERE id = %s", (user_id,))
        user_data = c.fetchone()
        
        if not user_data:
            log_warning(f"User {user_id} not found for rejection", "pending_registrations")
            return False
        
        email, full_name = user_data
        
        # Записываем в audit log ПЕРЕД отменой
        c.execute("""
            INSERT INTO registration_audit (user_id, action, approved_by, reason, created_at)
            VALUES (%s, 'rejected', %s, %s, %s)
        """, (user_id, rejected_by, reason, datetime.now().isoformat()))
        
        # Логируем в Audit Log
        from utils.audit import log_audit
        try:
            c.execute("SELECT id, username, role FROM users WHERE id = %s", (rejected_by,))
            admin_data = c.fetchone()
            admin_user = {"id": admin_data[0], "username": admin_data[1], "role": admin_data[2]} if admin_data else {"id": rejected_by, "role": "admin", "username": "Admin"}

            log_audit(
                user=admin_user,
                action='update',
                entity_type='user',
                entity_id=str(user_id),
                new_value={"is_active": False, "status": "rejected", "reason": reason},
                success=True
            )
        except Exception as audit_err:
            log_error(f"Failed to log audit for rejection: {audit_err}", "audit")

        
        # Помечаем пользователя как неактивного (не удаляем для истории)
        c.execute("""
            UPDATE users 
            SET is_active = FALSE, updated_at = %s
            WHERE id = %s
        """, (datetime.now().isoformat(), user_id))
        
        conn.commit()

        # Отправляем email уведомление в фоновом режиме
        import threading
        def send_email_async():
            try:
                send_registration_rejected_email(email, full_name, reason)
            except Exception as e:
                log_error(f"Failed to send rejection email to {email}: {e}", "email")

        threading.Thread(target=send_email_async, daemon=True).start()

        log_info(f"Registration rejected for user {user_id} by admin {rejected_by}. Reason: {reason}", "pending_registrations")
        return True
        
    except Exception as e:
        conn.rollback()
        log_error(f"Failed to reject registration for user {user_id}: {e}", "pending_registrations")
        return False
    finally:
        conn.close()


def delete_pending_registration(user_id: int, deleted_by: int) -> bool:
    """
    Удалить ожидающую регистрацию полностью из системы
    
    Args:
        user_id: ID пользователя для удаления
        deleted_by: ID админа  who удалил
    
    Returns:
        True если успешно удалено
    """
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        # Проверяем что пользователь не активен
        c.execute("SELECT is_active FROM users WHERE id = %s", (user_id,))
        result = c.fetchone()
        
        if not result:
            log_warning(f"User {user_id} not found for deletion", "pending_registrations")
            return False
        
        if result[0]:  # is_active = True
            log_warning(f"Cannot delete active user {user_id}", "pending_registrations")
            return False
        
        # Записываем в audit log ПЕРЕД удалением
        c.execute("""
            INSERT INTO registration_audit (user_id, action, approved_by, created_at)
            VALUES (%s, 'deleted', %s, %s)
        """, (user_id, deleted_by, datetime.now().isoformat()))
        
        # Удаляем пользователя (CASCADE удалит связанные записи)
        c.execute("DELETE FROM users WHERE id = %s", (user_id,))
        
        conn.commit()
        
        log_info(f"Pending registration deleted for user {user_id} by admin {deleted_by}", "pending_registrations")
        return True
        
    except Exception as e:
        conn.rollback()
        log_error(f"Failed to delete pending registration for user {user_id}: {e}", "pending_registrations")
        return False
    finally:
        conn.close()


def get_registration_audit_log(user_id: Optional[int] = None, limit: int = 100) -> List[Dict]:
    """
    Получить историю действий с регистрациями
    
    Args:
        user_id: Фильтр по ID пользователя (опционально)
        limit: Максимальное количество записей
    
    Returns:
        List of audit log entries
    """
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        if user_id:
            query = """
                SELECT 
                    ra.id, ra.user_id, ra.action, ra.approved_by, ra.reason, ra.created_at,
                    u.username, u.full_name, u.email,
                    admin.username as admin_username, admin.full_name as admin_full_name
                FROM registration_audit ra
                LEFT JOIN users u ON ra.user_id = u.id
                LEFT JOIN users admin ON ra.approved_by = admin.id
                WHERE ra.user_id = %s
                ORDER BY ra.created_at DESC
                LIMIT %s
            """
            c.execute(query, (user_id, limit))
        else:
            query = """
                SELECT 
                    ra.id, ra.user_id, ra.action, ra.approved_by, ra.reason, ra.created_at,
                    u.username, u.full_name, u.email,
                    admin.username as admin_username, admin.full_name as admin_full_name
                FROM registration_audit ra
                LEFT JOIN users u ON ra.user_id = u.id
                LEFT JOIN users admin ON ra.approved_by = admin.id
                ORDER BY ra.created_at DESC
                LIMIT %s
            """
            c.execute(query, (limit,))
        
        audit_log = []
        for row in c.fetchall():
            audit_log.append({
                'id': row[0],
                'user_id': row[1],
                'action': row[2],
                'approved_by': row[3],
                'reason': row[4],
                'created_at': row[5],
                'username': row[6],
                'full_name': row[7],
                'email': row[8],
                'admin_username': row[9],
                'admin_full_name': row[10]
            })
        
        return audit_log
        
    except Exception as e:
        log_error(f"Failed to get registration audit log: {e}", "pending_registrations")
        return []
    finally:
        conn.close()
