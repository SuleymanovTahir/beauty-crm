"""
API Endpoints для уведомлений
"""
from fastapi import APIRouter, Query, Cookie, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timedelta

import os
import json

from core.config import DEFAULT_REPORT_TIME
from db.connection import get_db_connection
from utils.utils import require_auth
from utils.logger import log_error, log_info
from utils.datetime_utils import get_current_time, get_salon_timezone
from utils.utils import get_total_unread
from .notifications_ws import broadcast_unread_count_update

router = APIRouter(tags=["Notifications"])

# create_notifications_table removed (moved to db/init.py)


@router.get("/notifications")
async def get_notifications(
    unread_only: bool = Query(False),
    limit: int = Query(50),
    session_token: Optional[str] = Cookie(None)
):
    """Получить уведомления пользователя из единого лога"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        query = """
            SELECT id, title, content, trigger_type, is_read, created_at, action_url
            FROM unified_communication_log 
            WHERE user_id = %s AND medium = 'in_app'
        """
        params = [user["id"]]

        if unread_only:
            query += " AND is_read = FALSE"
            
        query += " ORDER BY created_at DESC LIMIT %s"
        params.append(limit)

        c.execute(query, params)
        notifications = c.fetchall()
        
        return {
            "notifications": [
                {
                    "id": n[0],
                    "title": n[1],
                    "message": n[2],
                    "type": n[3],
                    "is_read": bool(n[4]),
                    "created_at": n[5].isoformat() if hasattr(n[5], 'isoformat') else n[5],
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
    
    try:
        conn = get_db_connection()
        c = conn.cursor()
        
        c.execute("""
            UPDATE unified_communication_log 
            SET is_read = TRUE
            WHERE id = %s AND user_id = %s AND medium = 'in_app'
        """, (notification_id, user["id"]))
        
        if c.rowcount == 0:
            conn.close()
            return JSONResponse({"error": "Notification not found"}, status_code=404)
        
        conn.commit()
        conn.close()
        
        # Broadcast unread count update
        try:
            new_count = get_total_unread(user["id"])
            await broadcast_unread_count_update(user["id"], new_count)
        except Exception as ws_err:
            log_error(f"Error broadcasting unread count: {ws_err}", "notifications")
            
        return {"success": True}
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
        # User not found in session
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    
    try:
        conn = get_db_connection()
        c = conn.cursor()
        
        c.execute("""
            UPDATE unified_communication_log 
            SET is_read = TRUE
            WHERE user_id = %s AND is_read = FALSE AND medium = 'in_app'
        """, (user["id"],))
        
        conn.commit()
        conn.close()
        
        # Broadcast unread count update
        try:
            new_count = get_total_unread(user["id"])
            await broadcast_unread_count_update(user["id"], new_count)
        except Exception as ws_err:
            log_error(f"Error broadcasting unread count: {ws_err}", "notifications")
            
        return {"success": True}
    except Exception as e:
        log_error(f"Error marking all read: {e}", "notifications")
        return JSONResponse({"error": str(e)}, status_code=500)


@router.get("/notifications/unread-count")
async def get_unread_count(session_token: Optional[str] = Cookie(None)):
    """Количество непрочитанных"""
    user = require_auth(session_token)
    if not user: return JSONResponse({"error": "Unauthorized"}, status_code=401)
    try:
        conn = get_db_connection()
        c = conn.cursor()
        c.execute("SELECT COUNT(*) FROM unified_communication_log WHERE user_id = %s AND is_read = FALSE AND medium = 'in_app'", (user["id"],))
        count = c.fetchone()[0]
        conn.close()
        return {"unread_count": count}
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

@router.delete("/notifications/clear-all")
async def clear_all_notifications(session_token: Optional[str] = Cookie(None)):
    """Очистить всё"""
    user = require_auth(session_token)
    if not user: return JSONResponse({"error": "Unauthorized"}, status_code=401)
    try:
        conn = get_db_connection()
        c = conn.cursor()
        c.execute("DELETE FROM unified_communication_log WHERE user_id = %s AND medium = 'in_app'", (user["id"],))
        conn.commit()
        conn.close()
        return {"success": True}
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

@router.delete("/notifications/{notification_id}")
async def delete_notification(notification_id: int, session_token: Optional[str] = Cookie(None)):
    """Удалить уведомление"""
    user = require_auth(session_token)
    if not user: return JSONResponse({"error": "Unauthorized"}, status_code=401)
    try:
        conn = get_db_connection()
        c = conn.cursor()
        c.execute("DELETE FROM unified_communication_log WHERE id = %s AND user_id = %s AND medium = 'in_app'", (notification_id, user["id"]))
        conn.commit()
        conn.close()
        return {"success": True}
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

@router.post("/notifications")
async def add_notification_endpoint(request: Request, session_token: Optional[str] = Cookie(None)):
    """Добавить уведомление вручную (через API)"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    
    try:
        data = await request.json()
        success = create_notification(
            user_id=user["id"],
            title=data.get("title", ""),
            message=data.get("content", ""),
            notification_type=data.get("notification_type", "info"),
            action_url=data.get("action_url")
        )
        return {"success": success}
    except Exception as e:
        log_error(f"Error in add_notification_endpoint: {e}", "notifications")
        return JSONResponse({"error": str(e)}, status_code=500)


def create_notification(user_id: int, title: str, message: str, notification_type: str = "info", action_url: str = None):
    """Создать уведомление (системное)"""
    try:
        conn = get_db_connection()
        c = conn.cursor()
        c.execute("""
            INSERT INTO unified_communication_log (user_id, title, content, trigger_type, medium, action_url)
            VALUES (%s, %s, %s, %s, 'in_app', %s)
        """, (user_id, title, message, notification_type, action_url))
        conn.commit()
        conn.close()
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
        
        last_dt = datetime.fromisoformat(last_date)
        if last_dt.tzinfo is None:
            tz = ZoneInfo(get_salon_timezone())
            last_dt = last_dt.replace(tzinfo=tz)

        days_since = (get_current_time() - last_dt).days
        
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

@router.get("/notifications/settings")
async def get_notification_settings_api(
    session_token: Optional[str] = Cookie(None)
):
    """
    Получить настройки уведомлений
    """
    try:
        from utils.utils import require_auth
        user = require_auth(session_token)
        if not user:
             raise HTTPException(status_code=401, detail="Unauthorized")
        user_id = user['id']

        conn = get_db_connection()
        c = conn.cursor()

        # Создаем таблицу если её нет
        c.execute(f"""
            CREATE TABLE IF NOT EXISTS notification_settings (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                email_notifications INTEGER DEFAULT 1,
                sms_notifications INTEGER DEFAULT 1,
                booking_notifications INTEGER DEFAULT 1,
                chat_notifications INTEGER DEFAULT 1,
                daily_report INTEGER DEFAULT 1,
                report_time TEXT DEFAULT '{DEFAULT_REPORT_TIME}',
                birthday_reminders INTEGER DEFAULT 1,
                birthday_days_advance INTEGER DEFAULT 7,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id)
            )
        """)
        conn.commit()

        c.execute("""
            SELECT * FROM notification_settings
            WHERE user_id = %s
        """, (user_id,))

        row = c.fetchone()
        
        # Получаем имена колонок
        column_names = [description[0] for description in c.description]
        
        conn.close()

        if row:
            # Создаем словарь из строки и имен колонок
            row_dict = dict(zip(column_names, row))
            
            return {
                "emailNotifications": bool(row_dict.get('email_notifications', 1)),
                "smsNotifications": bool(row_dict.get('sms_notifications', 0)),
                "bookingNotifications": bool(row_dict.get('booking_notifications', 1)),
                "chatNotifications": bool(row_dict.get('chat_notifications', 1)),
                "dailyReport": bool(row_dict.get('daily_report', 1)),
                "reportTime": row_dict.get('report_time', DEFAULT_REPORT_TIME),  # ✅ Используем константу
                "birthdayReminders": bool(row_dict.get('birthday_reminders', 1)),
                "birthdayDaysAdvance": row_dict.get('birthday_days_advance', 7)
            }
        else:
            # Default values
            return {
                "emailNotifications": True,
                "smsNotifications": False,
                "bookingNotifications": True,
                "chatNotifications": True,
                "dailyReport": True,
                "reportTime": DEFAULT_REPORT_TIME,  # ✅ Используем константу
                "birthdayReminders": True,
                "birthdayDaysAdvance": 7
            }
    except HTTPException as he:
        raise he
    except Exception as e:
        log_error(f"Error loading notification settings: {e}", "notifications")
        import traceback
        log_error(f"Traceback: {traceback.format_exc()}", "notifications")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/notifications/settings")
async def save_notification_settings(
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """
    Сохранить настройки уведомлений
    """
    try:
        data = await request.json()
        log_info(f"Saving notification settings: {data}", "notifications")

        from utils.utils import require_auth
        user = require_auth(session_token)
        if not user:
             raise HTTPException(status_code=401, detail="Unauthorized")
        user_id = user['id']

        conn = get_db_connection()
        c = conn.cursor()

        # Проверяем есть ли уже настройки
        c.execute("""
            SELECT id FROM notification_settings
            WHERE user_id =%s
        """, (user_id,))
        existing = c.fetchone()

        if existing:
            # Обновляем существующие настройки
            # Используем динамическое обновление чтобы не ломаться если колонок нет
            
            # Сначала проверим какие колонки есть
            if os.getenv('DATABASE_TYPE') == 'postgresql':
                c.execute("SELECT column_name FROM information_schema.columns WHERE table_name='notification_settings'")
                columns = [row[0] for row in c.fetchall()]
            else:
                c.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='notification_settings'")
                columns = [row[1] for row in c.fetchall()]
            
            update_fields = []
            params = []
            
            if 'email_notifications' in columns:
                update_fields.append("email_notifications =%s")
                params.append(True if data.get('emailNotifications', True) else False)
                
            if 'sms_notifications' in columns:
                update_fields.append("sms_notifications =%s")
                params.append(True if data.get('smsNotifications', False) else False)
                
            if 'booking_notifications' in columns:
                update_fields.append("booking_notifications =%s")
                params.append(True if data.get('bookingNotifications', True) else False)
                
            if 'chat_notifications' in columns:
                update_fields.append("chat_notifications = %s")
                params.append(1 if data.get('chatNotifications', True) else 0)
                
            if 'daily_report' in columns:
                update_fields.append("daily_report = %s")
                params.append(1 if data.get('dailyReport', True) else 0)
                
            if 'report_time' in columns:
                update_fields.append("report_time = %s")
                params.append(data.get('reportTime', DEFAULT_REPORT_TIME))  # ✅ Используем константу
                
            if 'birthday_reminders' in columns:
                update_fields.append("birthday_reminders = %s")
                params.append(True if data.get('birthdayReminders', True) else False)
                
            if 'birthday_days_advance' in columns:
                update_fields.append("birthday_days_advance =%s")
                params.append(int(data.get('birthdayDaysAdvance', 7)))
                
            update_fields.append("updated_at = CURRENT_TIMESTAMP")
            params.append(user_id)
            
            sql = f"""
                UPDATE notification_settings
                SET {', '.join(update_fields)}
                WHERE user_id =%s
            """
            
            c.execute(sql, params)
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
                    report_time,
                    birthday_reminders,
                    birthday_days_advance
                ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)
            """, (
                user_id,
                True if data.get('emailNotifications', True) else False,
                True if data.get('smsNotifications', False) else False,
                True if data.get('bookingNotifications', True) else False,
                1 if data.get('chatNotifications', True) else 0,
                1 if data.get('dailyReport', True) else 0,
                data.get('reportTime', DEFAULT_REPORT_TIME),  # ✅ Используем константу
                True if data.get('birthdayReminders', True) else False,
                int(data.get('birthdayDaysAdvance', 7))
            ))
            log_info(f"Notification settings created for user {user_id}", "notifications")

        conn.commit()
        conn.close()

        return {
            "success": True,
            "message": "Настройки сохранены"
        }

    except HTTPException as he:
        raise he
    except Exception as e:
        log_error(f"Error saving notification settings: {e}", "notifications")
        import traceback
        log_error(traceback.format_exc(), "notifications")
        raise HTTPException(status_code=500, detail=str(e))

# ===== НАПОМИНАНИЯ И РАССЫЛКИ =====

@router.post("/notifications/reminders/send")
async def send_manual_reminder(
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Отправить напоминание клиенту вручную"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    data = await request.json()

    try:
        from notifications import send_reminder_via_preferred_messenger, save_reminder_log

        client_id = data.get('client_id')
        booking_id = data.get('booking_id')
        preferred_messenger = data.get('messenger')  # Опционально

        if not client_id:
            return JSONResponse({"error": "client_id required"}, status_code=400)

        # Получаем информацию о записи
        conn = get_db_connection()
        c = conn.cursor()

        if booking_id:
            c.execute("""
                SELECT name, service_name, datetime, master
                FROM bookings
                WHERE id =%s AND instagram_id =%s
            """, (booking_id, client_id))
        else:
            # Берем ближайшую будущую запись
            current_time_str = get_current_time().strftime('%Y-%m-%d %H:%M')
            c.execute("""
                SELECT name, service_name, datetime, master
                FROM bookings
                WHERE instagram_id =%s AND datetime >%s
                ORDER BY datetime ASC LIMIT 1
            """, (client_id, current_time_str))

        booking = c.fetchone()
        conn.close()

        if not booking:
            return JSONResponse({"error": "Booking not found"}, status_code=404)

        name, service, datetime_str, master = booking

        # Отправляем напоминание
        result = await send_reminder_via_preferred_messenger(
            client_id=client_id,
            client_name=name or "Клиент",
            service=service,
            datetime_str=datetime_str,
            master=master or "",
            preferred_messenger=preferred_messenger
        )

        # Сохраняем лог
        if booking_id:
            save_reminder_log(
                booking_id=booking_id,
                client_id=client_id,
                messenger_type=result['messenger'],
                status='sent' if result['success'] else 'failed',
                error_message=result.get('error')
            )

        return {
            "success": result['success'],
            "messenger": result['messenger'],
            "error": result.get('error')
        }

    except Exception as e:
        log_error(f"Error sending manual reminder: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=500)

@router.post("/notifications/reminders/send-batch")
async def send_batch_reminders(
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Отправить напоминания для всех предстоящих записей"""
    user = require_auth(session_token)
    if not user or user["role"] not in ["admin", "director"]:
        return JSONResponse({"error": "Forbidden"}, status_code=403)

    data = await request.json()

    try:
        from notifications import send_reminders_for_upcoming_bookings, save_reminder_log

        hours_before = data.get('hours_before', 24)  # По умолчанию за 24 часа

        # Отправляем напоминания
        results = await send_reminders_for_upcoming_bookings(hours_before=hours_before)

        # Сохраняем логи
        for result in results:
            if 'booking_id' in result:
                save_reminder_log(
                    booking_id=result['booking_id'],
                    client_id=result['client_id'],
                    messenger_type=result.get('messenger', 'unknown'),
                    status='sent' if result['success'] else 'failed',
                    error_message=result.get('error')
                )

        success_count = sum(1 for r in results if r['success'])
        failed_count = len(results) - success_count

        log_info(f"Batch reminders sent: {success_count} success, {failed_count} failed", "api")

        return {
            "success": True,
            "total": len(results),
            "sent": success_count,
            "failed": failed_count,
            "results": results
        }

    except Exception as e:
        log_error(f"Error sending batch reminders: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=500)

# ===== ШАБЛОНЫ УВЕДОМЛЕНИЙ =====

class TemplateModel(BaseModel):
    name: str
    category: Optional[str] = "transactional"
    subject_ru: Optional[str] = ""
    subject_en: Optional[str] = ""
    subject_ar: Optional[str] = ""
    body_ru: str
    body_en: Optional[str] = ""
    body_ar: Optional[str] = ""
    variables: Optional[List[str]] = []

@router.get("/notifications/templates")
async def get_templates(session_token: Optional[str] = Cookie(None)):
    """Получить все шаблоны"""
    user = require_auth(session_token)
    if not user: return JSONResponse({"error": "Unauthorized"}, status_code=401)
    
    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute("SELECT * FROM notification_templates ORDER BY name ASC")
        rows = c.fetchall()
        column_names = [desc[0] for desc in c.description]
        templates = [dict(zip(column_names, row)) for row in rows]
        return {"templates": templates}
    finally:
        conn.close()

@router.post("/notifications/templates")
async def save_template(template: TemplateModel, session_token: Optional[str] = Cookie(None)):
    """Создать или обновить шаблон"""
    user = require_auth(session_token)
    if not user or user.get('role') not in ['admin', 'director']:
        return JSONResponse({"error": "Forbidden"}, status_code=403)
    
    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute("""
            INSERT INTO notification_templates 
            (name, category, subject_ru, subject_en, subject_ar, body_ru, body_en, body_ar, variables)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (name) DO UPDATE SET
                category = EXCLUDED.category,
                subject_ru = EXCLUDED.subject_ru,
                subject_en = EXCLUDED.subject_en,
                subject_ar = EXCLUDED.subject_ar,
                body_ru = EXCLUDED.body_ru,
                body_en = EXCLUDED.body_en,
                body_ar = EXCLUDED.body_ar,
                variables = EXCLUDED.variables,
                updated_at = CURRENT_TIMESTAMP
        """, (
            template.name, template.category, 
            template.subject_ru, template.subject_en, template.subject_ar,
            template.body_ru, template.body_en, template.body_ar,
            json.dumps(template.variables)
        ))
        conn.commit()
        return {"success": True}
    except Exception as e:
        log_error(f"Error saving template: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=500)
    finally:
        conn.close()

@router.delete("/notifications/templates/{name}")
async def delete_template(name: str, session_token: Optional[str] = Cookie(None)):
    """Удалить шаблон"""
    user = require_auth(session_token)
    if not user or user.get('role') not in ['admin', 'director']:
        return JSONResponse({"error": "Forbidden"}, status_code=403)
    
    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute("DELETE FROM notification_templates WHERE name = %s AND is_system = FALSE", (name,))
        conn.commit()
        return {"success": True}
    finally:
        conn.close()

@router.post("/notifications/broadcast")
async def send_broadcast_message(
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Отправить рекламное сообщение всем клиентам через UniversalMessenger"""
    user = require_auth(session_token)
    if not user or user["role"] not in ["admin", "director"]:
        return JSONResponse({"error": "Forbidden"}, status_code=403)

    data = await request.json()

    try:
        from services.universal_messenger import send_universal_message
        
        message = data.get('message')
        target_messenger = data.get('messenger', 'all')
        client_filter = data.get('filter', 'all')
        template_name = data.get('template_name')

        if not message and not template_name:
            return JSONResponse({"error": "message or template_name required"}, status_code=400)

        # Получаем список клиентов
        conn = get_db_connection()
        c = conn.cursor()

        query = "SELECT instagram_id, name FROM clients"
        params = []
        
        if client_filter == 'active':
            cutoff_date = (get_current_time() - timedelta(days=30)).strftime('%Y-%m-%d')
            query = "SELECT DISTINCT c.instagram_id, c.name FROM clients c JOIN bookings b ON c.instagram_id = b.client_id WHERE b.datetime > %s"
            params = [cutoff_date]
        elif client_filter == 'vip':
            query = "SELECT instagram_id, name FROM clients WHERE instagram_id IN (SELECT client_id FROM bookings GROUP BY client_id HAVING COUNT(*) >= 5)"

        c.execute(query, params)
        clients = c.fetchall()
        conn.close()

        # Отправляем через UniversalMessenger
        results = []
        for client in clients:
            client_id, name = client[0], client[1]
            platform_pref = target_messenger if target_messenger != 'all' else 'auto'
            
            res = await send_universal_message(
                recipient_id=client_id,
                text=message,
                platform=platform_pref,
                template_name=template_name,
                context={"name": name or "Клиент"}
            )
            
            results.append({
                "client_id": client_id, 
                "client_name": name,
                "messenger": res.get("platform"),
                "success": res.get("success"),
                "error": res.get("error")
            })

        success_count = sum(1 for r in results if r['success'])
        return {
            "success": True,
            "total": len(results),
            "sent": success_count,
            "failed": len(results) - success_count,
            "results": results
        }

    except Exception as e:
        log_error(f"Error in client broadcast: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=500)

@router.get("/notifications/stats")
async def get_notification_stats(
    days: int = Query(30),
    session_token: Optional[str] = Cookie(None)
):
    """Статистика уведомлений и рассылок"""
    user = require_auth(session_token)
    if not user or user.get('role') not in ['admin', 'director']:
        raise HTTPException(status_code=403, detail="Доступ запрещен")

    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        # 1. Общая статистика по каналам
        c.execute("""
            SELECT medium, status, COUNT(*) 
            FROM unified_communication_log 
            WHERE created_at >= NOW() - INTERVAL '%s days'
            GROUP BY medium, status
        """, (days,))
        
        raw_stats = c.fetchall()
        by_channel = {}
        for medium, status, count in raw_stats:
            if medium not in by_channel:
                by_channel[medium] = {"sent": 0, "failed": 0, "scheduled": 0}
            
            if status == 'sent': by_channel[medium]["sent"] += count
            elif status == 'failed': by_channel[medium]["failed"] += count
            elif status == 'scheduled': by_channel[medium]["scheduled"] += count

        # 2. Популярные ошибки
        c.execute("""
            SELECT error_message, COUNT(*) 
            FROM unified_communication_log 
            WHERE status = 'failed' AND created_at >= NOW() - INTERVAL '%s days'
            AND error_message IS NOT NULL
            GROUP BY error_message 
            ORDER BY count DESC LIMIT 5
        """, (days,))
        errors = [{"message": r[0], "count": r[1]} for r in c.fetchall()]

        # 3. Эффективность шаблонов
        c.execute("""
            SELECT template_name, COUNT(*) as total, 
                   SUM(CASE WHEN sent_at IS NOT NULL THEN 1 ELSE 0 END) as delivered
            FROM unified_communication_log 
            WHERE template_name IS NOT NULL AND created_at >= NOW() - INTERVAL '%s days'
            GROUP BY template_name
            ORDER BY total DESC
        """, (days,))
        templates = [{"name": r[0], "total": r[1], "delivered": r[2]} for r in c.fetchall()]

        return {
            "period_days": days,
            "by_channel": by_channel,
            "top_errors": errors,
            "template_performance": templates
        }

    except Exception as e:
        log_error(f"Error getting notification stats: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=500)
    finally:
        conn.close()