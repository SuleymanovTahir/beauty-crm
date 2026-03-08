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


def _quote_sql_identifier(identifier: str) -> str:
    escaped_identifier = identifier.replace('"', '""')
    return f'"{escaped_identifier}"'


def _get_notification_template_columns(cursor) -> set[str]:
    cursor.execute("""
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'notification_templates'
    """)
    return {row[0] for row in cursor.fetchall()}


def _get_template_value_expression(template_columns: set[str], base_column: str) -> str:
    if base_column in template_columns:
        return _quote_sql_identifier(base_column)

    prefixed_columns = sorted([
        column_name
        for column_name in template_columns
        if column_name.startswith(f"{base_column}_")
    ])
    if len(prefixed_columns) == 0:
        return "''::text"

    prefixed_sql = ", ".join([
        f"NULLIF({_quote_sql_identifier(column_name)}, '')"
        for column_name in prefixed_columns
    ])
    return f"COALESCE({prefixed_sql}, '')"


def _get_template_storage_columns(template_columns: set[str], base_column: str) -> List[str]:
    if base_column in template_columns:
        return [base_column]
    return sorted([
        column_name
        for column_name in template_columns
        if column_name.startswith(f"{base_column}_")
    ])


@router.get("/notifications")
def get_notifications(
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
def get_unread_count(session_token: Optional[str] = Cookie(None)):
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
