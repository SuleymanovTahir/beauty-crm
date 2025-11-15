"""
API Endpoints для уведомлений
"""
from fastapi import APIRouter, Query, Cookie, HTTPException, Request
from fastapi.responses import JSONResponse
from typing import Optional, List
from datetime import datetime, timedelta
import sqlite3

from core.config import DATABASE_NAME
from utils.utils import require_auth
from utils.logger import log_error, log_info

router = APIRouter(tags=["Notifications"])


def create_notifications_table():
    """Создать таблицу уведомлений"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    c.execute('''CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        type TEXT DEFAULT 'info',
        is_read INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        read_at TEXT,
        action_url TEXT,
        FOREIGN KEY (user_id) REFERENCES users (id)
    )''')
    
    conn.commit()
    conn.close()


@router.get("/notifications")
async def get_notifications(
    unread_only: bool = Query(False),
    limit: int = Query(50),
    session_token: Optional[str] = Cookie(None)
):
    """Получить уведомления пользователя"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    
    create_notifications_table()
    
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    try:
        if unread_only:
            c.execute("""
                SELECT id, title, message, type, is_read, created_at, action_url
                FROM notifications 
                WHERE user_id = ? AND is_read = 0
                ORDER BY created_at DESC
                LIMIT ?
            """, (user["id"], limit))
        else:
            c.execute("""
                SELECT id, title, message, type, is_read, created_at, action_url
                FROM notifications 
                WHERE user_id = ?
                ORDER BY created_at DESC
                LIMIT ?
            """, (user["id"], limit))
        
        notifications = c.fetchall()
        
        return {
            "notifications": [
                {
                    "id": n[0],
                    "title": n[1],
                    "message": n[2],
                    "type": n[3],
                    "is_read": bool(n[4]),
                    "created_at": n[5],
                    "action_url": n[6]
                } for n in notifications
            ]
        }
    except Exception as e:
        log_error(f"Error getting notifications: {e}", "notifications")
        return JSONResponse({"error": str(e)}, status_code=500)
    finally:
        conn.close()


@router.post("/notifications/{notification_id}/read")
async def mark_notification_read(
    notification_id: int,
    session_token: Optional[str] = Cookie(None)
):
    """Отметить уведомление как прочитанное"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    
    create_notifications_table()
    
    try:
        conn = sqlite3.connect(DATABASE_NAME)
        c = conn.cursor()
        
        c.execute("""
            UPDATE notifications 
            SET is_read = 1, read_at = ?
            WHERE id = ? AND user_id = ?
        """, (datetime.now().isoformat(), notification_id, user["id"]))
        
        if c.rowcount == 0:
            conn.close()
            return JSONResponse({"error": "Notification not found"}, status_code=404)
        
        conn.commit()
        conn.close()
        
        return {"success": True, "message": "Notification marked as read"}
        
    except Exception as e:
        log_error(f"Error marking notification as read: {e}", "notifications")
        return JSONResponse({"error": str(e)}, status_code=500)


@router.post("/notifications/read-all")
async def mark_all_notifications_read(
    session_token: Optional[str] = Cookie(None)
):
    """Отметить все уведомления как прочитанные"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    
    create_notifications_table()
    
    try:
        conn = sqlite3.connect(DATABASE_NAME)
        c = conn.cursor()
        
        c.execute("""
            UPDATE notifications 
            SET is_read = 1, read_at = ?
            WHERE user_id = ? AND is_read = 0
        """, (datetime.now().isoformat(), user["id"]))
        
        updated_count = c.rowcount
        conn.commit()
        conn.close()
        
        return {
            "success": True, 
            "message": f"Marked {updated_count} notifications as read"
        }
        
    except Exception as e:
        log_error(f"Error marking all notifications as read: {e}", "notifications")
        return JSONResponse({"error": str(e)}, status_code=500)


@router.get("/notifications/unread-count")
async def get_unread_count(
    session_token: Optional[str] = Cookie(None)
):
    """Получить количество непрочитанных уведомлений"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    
    create_notifications_table()
    
    try:
        conn = sqlite3.connect(DATABASE_NAME)
        c = conn.cursor()
        
        c.execute("""
            SELECT COUNT(*) 
            FROM notifications 
            WHERE user_id = ? AND is_read = 0
        """, (user["id"],))
        
        count = c.fetchone()[0]
        conn.close()
        
        return {"unread_count": count}
        
    except Exception as e:
        log_error(f"Error getting unread count: {e}", "notifications")
        return JSONResponse({"error": str(e)}, status_code=500)


def create_notification(user_id: str, title: str, message: str, 
                       notification_type: str = "info", action_url: str = None):
    """Создать уведомление"""
    create_notifications_table()
    
    try:
        conn = sqlite3.connect(DATABASE_NAME)
        c = conn.cursor()
        
        c.execute("""
            INSERT INTO notifications (user_id, title, message, type, action_url)
            VALUES (?, ?, ?, ?, ?)
        """, (user_id, title, message, notification_type, action_url))
        
        conn.commit()
        conn.close()
        
        log_info(f"Notification created for user {user_id}: {title}", "notifications")
        return True
        
    except Exception as e:
        log_error(f"Error creating notification: {e}", "notifications")
        return False


# ===== #16 - АВТОПРЕДЛОЖЕНИЕ ПОВТОРНОЙ ЗАПИСИ =====

async def send_rebooking_notification(client_id: str, service_name: str, last_date: str):
    """Отправить уведомление о повторной записи"""
    try:
        from integrations import send_message
        from db.clients import get_client_by_id
        
        client = get_client_by_id(client_id)
        if not client:
            return False
        
        days_since = (datetime.now() - datetime.fromisoformat(last_date)).days
        
        message = f"""Привет! {service_name} уже {days_since} дней, пора обновить? 💅
        
Записать к тому же мастеру как в прошлый раз?"""
        
        await send_message(client_id, message)
        log_info(f"✅ Rebooking notification sent to {client_id}", "notifications")
        return True
        
    except Exception as e:
        log_error(f"Error sending rebooking notification: {e}", "notifications")
        return False


# ===== #17 - УВЕДОМЛЕНИЕ ИЗ ЛИСТА ОЖИДАНИЯ =====

async def notify_waitlist_slot_available(client_id: str, service: str, date: str, time: str):
    """Уведомить клиента что слот освободился"""
    try:
        from integrations import send_message
        
        message = f"""Отличная новость! Освободилось {date} в {time} 💎

Записать вас на {service}?"""
        
        await send_message(client_id, message)
        
        # Отмечаем что уведомили
        from db.bookings import mark_waitlist_notified
        mark_waitlist_notified(client_id, service, date, time)
        
        log_info(f"✅ Waitlist notification sent to {client_id}", "notifications")
        return True
        
    except Exception as e:
        log_error(f"Error sending waitlist notification: {e}", "notifications")
        return False


# ===== #30 - УВЕДОМЛЕНИЕ О СРОЧНОЙ ЗАПИСИ =====

async def notify_manager_urgent_booking(client_id: str, reason: str):
    """Уведомить менеджера о срочной записи"""
    try:
        from db.users import get_all_users
        from db.clients import get_client_by_id
        
        client = get_client_by_id(client_id)
        client_name = client[3] or client[1] or client_id[:8]
        
        # Получаем всех менеджеров
        users = get_all_users()
        managers = [u for u in users if u[4] in ['admin', 'manager']]
        
        for manager in managers:
            create_notification(
                user_id=str(manager[0]),
                title="🚨 СРОЧНАЯ ЗАПИСЬ",
                message=f"Клиент {client_name}: {reason}\nТребуется немедленная помощь!",
                notification_type="urgent",
                action_url=f"/admin/chat?client_id={client_id}"
            )
        
        log_info(f"✅ Urgent booking notification sent to managers", "notifications")
        return True

    except Exception as e:
        log_error(f"Error sending urgent notification: {e}", "notifications")
        return False


# ===== НАСТРОЙКИ УВЕДОМЛЕНИЙ =====

@router.post("/notifications/settings")
async def save_notification_settings(request: Request):
    """
    Сохранить настройки уведомлений
    """
    try:
        data = await request.json()
        log_info(f"Saving notification settings: {data}", "notifications")

        # TODO: Получить user_id из сессии когда будет авторизация
        user_id = 1  # По умолчанию для первого пользователя

        conn = sqlite3.connect(DATABASE_NAME)
        c = conn.cursor()

        # Проверяем есть ли уже настройки
        c.execute("""
            SELECT id FROM notification_settings
            WHERE user_id = ?
        """, (user_id,))
        existing = c.fetchone()

        if existing:
            # Обновляем существующие настройки
            c.execute("""
                UPDATE notification_settings
                SET
                    email_notifications = ?,
                    sms_notifications = ?,
                    booking_notifications = ?,
                    chat_notifications = ?,
                    daily_report = ?,
                    report_time = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE user_id = ?
            """, (
                1 if data.get('emailNotifications', True) else 0,
                1 if data.get('smsNotifications', False) else 0,
                1 if data.get('bookingNotifications', True) else 0,
                1 if data.get('chatNotifications', True) else 0,
                1 if data.get('dailyReport', True) else 0,
                data.get('reportTime', '09:00'),
                user_id
            ))
            log_info(f"Notification settings updated for user {user_id}", "notifications")
        else:
            # Создаем новые настройки
            c.execute("""
                INSERT INTO notification_settings (
                    user_id,
                    email_notifications,
                    sms_notifications,
                    booking_notifications,
                    chat_notifications,
                    daily_report,
                    report_time
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                user_id,
                1 if data.get('emailNotifications', True) else 0,
                1 if data.get('smsNotifications', False) else 0,
                1 if data.get('bookingNotifications', True) else 0,
                1 if data.get('chatNotifications', True) else 0,
                1 if data.get('dailyReport', True) else 0,
                data.get('reportTime', '09:00')
            ))
            log_info(f"Notification settings created for user {user_id}", "notifications")

        conn.commit()
        conn.close()

        return {
            "success": True,
            "message": "Настройки сохранены"
        }

    except sqlite3.OperationalError as e:
        # Таблица не существует - создадим её
        if "no such table" in str(e).lower():
            log_info("Creating notification_settings table", "notifications")
            try:
                conn = sqlite3.connect(DATABASE_NAME)
                c = conn.cursor()
                c.execute("""
                    CREATE TABLE IF NOT EXISTS notification_settings (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        user_id INTEGER NOT NULL,
                        email_notifications INTEGER DEFAULT 1,
                        sms_notifications INTEGER DEFAULT 0,
                        booking_notifications INTEGER DEFAULT 1,
                        chat_notifications INTEGER DEFAULT 1,
                        daily_report INTEGER DEFAULT 1,
                        report_time TEXT DEFAULT '09:00',
                        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                        UNIQUE(user_id)
                    )
                """)

                # Вставляем настройки после создания таблицы
                c.execute("""
                    INSERT INTO notification_settings (
                        user_id,
                        email_notifications,
                        sms_notifications,
                        booking_notifications,
                        chat_notifications,
                        daily_report,
                        report_time
                    ) VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (
                    1,
                    1 if data.get('emailNotifications', True) else 0,
                    1 if data.get('smsNotifications', False) else 0,
                    1 if data.get('bookingNotifications', True) else 0,
                    1 if data.get('chatNotifications', True) else 0,
                    1 if data.get('dailyReport', True) else 0,
                    data.get('reportTime', '09:00')
                ))

                conn.commit()
                conn.close()

                log_info("notification_settings table created and settings saved", "notifications")
                return {
                    "success": True,
                    "message": "Настройки сохранены"
                }
            except Exception as create_error:
                log_error(f"Error creating notification_settings table: {create_error}", "notifications")
                raise HTTPException(status_code=500, detail=str(create_error))
        else:
            log_error(f"Database error: {e}", "notifications")
            raise HTTPException(status_code=500, detail=str(e))

    except Exception as e:
        log_error(f"Error saving notification settings: {e}", "notifications")
        import traceback
        log_error(traceback.format_exc(), "notifications")
        raise HTTPException(status_code=500, detail=str(e))