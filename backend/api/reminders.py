"""
API Endpoints для напоминаний
"""
from fastapi import APIRouter, Query, Cookie, HTTPException
from fastapi.responses import JSONResponse
from typing import Optional, List
from datetime import datetime, timedelta
import sqlite3

from core.config import DATABASE_NAME
from utils.utils import require_auth
from utils.logger import log_error, log_info

router = APIRouter(tags=["Reminders"])


def create_reminders_table():
    """Создать таблицу напоминаний"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    c.execute('''CREATE TABLE IF NOT EXISTS reminders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        reminder_date TEXT NOT NULL,
        reminder_type TEXT DEFAULT 'general',
        is_completed INTEGER DEFAULT 0,
        created_by TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        completed_at TEXT,
        FOREIGN KEY (client_id) REFERENCES clients (instagram_id)
    )''')
    
    conn.commit()
    conn.close()


@router.get("/reminders")
async def get_reminders(
    client_id: Optional[str] = Query(None),
    upcoming: bool = Query(False),
    session_token: Optional[str] = Cookie(None)
):
    """Получить напоминания"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    
    create_reminders_table()
    
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    try:
        if client_id:
            c.execute("""
                SELECT r.id, r.client_id, c.username, c.name, r.title, r.description,
                       r.reminder_date, r.reminder_type, r.is_completed, r.created_by,
                       r.created_at, r.completed_at
                FROM reminders r
                LEFT JOIN clients c ON r.client_id = c.instagram_id
                WHERE r.client_id = ?
                ORDER BY r.reminder_date ASC
            """, (client_id,))
        elif upcoming:
            # Напоминания на ближайшие 7 дней
            end_date = (datetime.now() + timedelta(days=7)).isoformat()
            c.execute("""
                SELECT r.id, r.client_id, c.username, c.name, r.title, r.description,
                       r.reminder_date, r.reminder_type, r.is_completed, r.created_by,
                       r.created_at, r.completed_at
                FROM reminders r
                LEFT JOIN clients c ON r.client_id = c.instagram_id
                WHERE r.reminder_date <= ? AND r.is_completed = 0
                ORDER BY r.reminder_date ASC
            """, (end_date,))
        else:
            c.execute("""
                SELECT r.id, r.client_id, c.username, c.name, r.title, r.description,
                       r.reminder_date, r.reminder_type, r.is_completed, r.created_by,
                       r.created_at, r.completed_at
                FROM reminders r
                LEFT JOIN clients c ON r.client_id = c.instagram_id
                ORDER BY r.reminder_date ASC
            """)
        
        reminders = c.fetchall()
        
        return {
            "reminders": [
                {
                    "id": r[0],
                    "client_id": r[1],
                    "username": r[2],
                    "name": r[3],
                    "title": r[4],
                    "description": r[5],
                    "reminder_date": r[6],
                    "type": r[7],
                    "is_completed": bool(r[8]),
                    "created_by": r[9],
                    "created_at": r[10],
                    "completed_at": r[11]
                } for r in reminders
            ]
        }
    except Exception as e:
        log_error(f"Error getting reminders: {e}", "reminders")
        return JSONResponse({"error": str(e)}, status_code=500)
    finally:
        conn.close()


@router.post("/reminders")
async def create_reminder(
    request: dict,
    session_token: Optional[str] = Cookie(None)
):
    """Создать напоминание"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    
    create_reminders_table()
    
    try:
        client_id = request.get("client_id")
        title = request.get("title")
        description = request.get("description", "")
        reminder_date = request.get("reminder_date")
        reminder_type = request.get("type", "general")
        
        if not all([client_id, title, reminder_date]):
            return JSONResponse({"error": "Missing required fields"}, status_code=400)
        
        # Проверяем, что дата в будущем
        try:
            reminder_dt = datetime.fromisoformat(reminder_date)
            if reminder_dt <= datetime.now():
                return JSONResponse({"error": "Reminder date must be in the future"}, 
                                  status_code=400)
        except ValueError:
            return JSONResponse({"error": "Invalid date format"}, status_code=400)
        
        conn = sqlite3.connect(DATABASE_NAME)
        c = conn.cursor()
        
        c.execute("""
            INSERT INTO reminders (client_id, title, description, reminder_date, 
                                 reminder_type, created_by)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (client_id, title, description, reminder_date, reminder_type, user["username"]))
        
        reminder_id = c.lastrowid
        conn.commit()
        conn.close()
        
        log_info(f"Reminder created: ID={reminder_id}, client={client_id}, date={reminder_date}", "reminders")
        
        return {
            "success": True,
            "reminder_id": reminder_id,
            "message": "Reminder created successfully"
        }
        
    except Exception as e:
        log_error(f"Error creating reminder: {e}", "reminders")
        return JSONResponse({"error": str(e)}, status_code=500)


@router.put("/reminders/{reminder_id}/complete")
async def complete_reminder(
    reminder_id: int,
    session_token: Optional[str] = Cookie(None)
):
    """Отметить напоминание как выполненное"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    
    create_reminders_table()
    
    try:
        conn = sqlite3.connect(DATABASE_NAME)
        c = conn.cursor()
        
        c.execute("""
            UPDATE reminders 
            SET is_completed = 1, completed_at = ?
            WHERE id = ?
        """, (datetime.now().isoformat(), reminder_id))
        
        if c.rowcount == 0:
            conn.close()
            return JSONResponse({"error": "Reminder not found"}, status_code=404)
        
        conn.commit()
        conn.close()
        
        log_info(f"Reminder completed: ID={reminder_id}", "reminders")
        
        return {
            "success": True,
            "message": "Reminder marked as completed"
        }
        
    except Exception as e:
        log_error(f"Error completing reminder: {e}", "reminders")
        return JSONResponse({"error": str(e)}, status_code=500)


@router.delete("/reminders/{reminder_id}")
async def delete_reminder(
    reminder_id: int,
    session_token: Optional[str] = Cookie(None)
):
    """Удалить напоминание"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    
    create_reminders_table()
    
    try:
        conn = sqlite3.connect(DATABASE_NAME)
        c = conn.cursor()
        
        c.execute("DELETE FROM reminders WHERE id = ?", (reminder_id,))
        
        if c.rowcount == 0:
            conn.close()
            return JSONResponse({"error": "Reminder not found"}, status_code=404)
        
        conn.commit()
        conn.close()
        
        log_info(f"Reminder deleted: ID={reminder_id}", "reminders")
        
        return {
            "success": True,
            "message": "Reminder deleted successfully"
        }
        
    except Exception as e:
        log_error(f"Error deleting reminder: {e}", "reminders")
        return JSONResponse({"error": str(e)}, status_code=500)


@router.get("/reminders/upcoming")
async def get_upcoming_reminders(
    days: int = Query(7),
    session_token: Optional[str] = Cookie(None)
):
    """Получить предстоящие напоминания"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    
    create_reminders_table()
    
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    try:
        end_date = (datetime.now() + timedelta(days=days)).isoformat()
        c.execute("""
            SELECT r.id, r.client_id, c.username, c.name, r.title, r.description,
                   r.reminder_date, r.reminder_type, r.is_completed
            FROM reminders r
            LEFT JOIN clients c ON r.client_id = c.instagram_id
            WHERE r.reminder_date <= ? AND r.is_completed = 0
            ORDER BY r.reminder_date ASC
        """, (end_date,))
        
        reminders = c.fetchall()
        
        return {
            "upcoming_reminders": [
                {
                    "id": r[0],
                    "client_id": r[1],
                    "username": r[2],
                    "name": r[3],
                    "title": r[4],
                    "description": r[5],
                    "reminder_date": r[6],
                    "type": r[7],
                    "is_completed": bool(r[8])
                } for r in reminders
            ],
            "count": len(reminders)
        }
    except Exception as e:
        log_error(f"Error getting upcoming reminders: {e}", "reminders")
        return JSONResponse({"error": str(e)}, status_code=500)
    finally:
        conn.close()
