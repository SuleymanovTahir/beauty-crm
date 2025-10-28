"""
API Endpoints для уведомлений
"""
from fastapi import APIRouter, Query, Cookie, HTTPException
from fastapi.responses import JSONResponse
from typing import Optional, List
from datetime import datetime, timedelta
import sqlite3

from config import DATABASE_NAME
from utils import require_auth
from logger import log_error, log_info

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
