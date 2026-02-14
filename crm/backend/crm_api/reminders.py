"""
API Endpoints для напоминаний
"""
from fastapi import APIRouter, Query, Cookie, HTTPException, Request
from fastapi.responses import JSONResponse
from typing import Optional, List
from datetime import datetime, timedelta

from core.config import DATABASE_NAME
from db.connection import get_db_connection
from utils.utils import require_auth
from utils.logger import log_error, log_info
from utils.datetime_utils import get_current_time, get_salon_timezone
from zoneinfo import ZoneInfo

router = APIRouter(tags=["Reminders"])

def create_reminders_table():
    """Создать таблицу напоминаний"""
    conn = get_db_connection()
    c = conn.cursor()
    
    c.execute('''CREATE TABLE IF NOT EXISTS reminders (
        id SERIAL PRIMARY KEY,
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

def create_booking_reminder_settings_table():
    """Создать таблицу настроек напоминаний"""
    conn = get_db_connection()
    c = conn.cursor()
    
    # Резервный вариант, если init_database еще не запущен
    c.execute('''CREATE TABLE IF NOT EXISTS booking_reminder_settings (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        days_before INTEGER DEFAULT 0,
        hours_before INTEGER DEFAULT 0,
        notification_type TEXT DEFAULT 'email',
        is_enabled BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )''')
    
    # Добавляем стандартные настройки если их нет
    c.execute("SELECT COUNT(*) FROM booking_reminder_settings")
    if c.fetchone()[0] == 0:
        c.execute("""
            INSERT INTO booking_reminder_settings (name, days_before, hours_before, notification_type)
            VALUES (%s, %s, %s, %s)
        """, ("За 1 день до визита", 1, 0, "email"))
    
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
    
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        if client_id:
            c.execute("""
                SELECT r.id, r.client_id, c.username, c.name, r.title, r.description,
                       r.reminder_date, r.reminder_type, r.is_completed, r.created_by,
                       r.created_at, r.completed_at
                FROM reminders r
                LEFT JOIN clients c ON r.client_id = c.instagram_id
                WHERE r.client_id =%s
                ORDER BY r.reminder_date ASC
            """, (client_id,))
        elif upcoming:
            # Напоминания на ближайшие 7 дней
            end_date = (get_current_time() + timedelta(days=7)).isoformat()
            c.execute("""
                SELECT r.id, r.client_id, c.username, c.name, r.title, r.description,
                       r.reminder_date, r.reminder_type, r.is_completed, r.created_by,
                       r.created_at, r.completed_at
                FROM reminders r
                LEFT JOIN clients c ON r.client_id = c.instagram_id
                WHERE r.reminder_date <=%s AND r.is_completed = FALSE
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
            # Make reminder_dt timezone-aware if it's not
            if reminder_dt.tzinfo is None:
                tz = ZoneInfo(get_salon_timezone())
                reminder_dt = reminder_dt.replace(tzinfo=tz)
            
            if reminder_dt <= get_current_time():
                return JSONResponse({"error": "Reminder date must be in the future"}, 
                                  status_code=400)
        except ValueError:
            return JSONResponse({"error": "Invalid date format"}, status_code=400)
        
        conn = get_db_connection()
        c = conn.cursor()
        
        c.execute("""
            INSERT INTO reminders (client_id, title, description, reminder_date, 
                                 reminder_type, created_by)
            VALUES (%s,%s,%s,%s,%s,%s)
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
        conn = get_db_connection()
        c = conn.cursor()
        
        c.execute("""
            UPDATE reminders 
            SET is_completed = TRUE, completed_at =%s
            WHERE id =%s
        """, (get_current_time().isoformat(), reminder_id))
        
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
        conn = get_db_connection()
        c = conn.cursor()
        
        c.execute("DELETE FROM reminders WHERE id =%s", (reminder_id,))
        
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
    
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        end_date = (get_current_time() + timedelta(days=days)).isoformat()
        c.execute("""
            SELECT r.id, r.client_id, c.username, c.name, r.title, r.description,
                   r.reminder_date, r.reminder_type, r.is_completed
            FROM reminders r
            LEFT JOIN clients c ON r.client_id = c.instagram_id
            WHERE r.reminder_date <=%s AND r.is_completed = FALSE
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

# ============================================================================
# BOOKING REMINDER SETTINGS (Stored in salon_settings.custom_settings)
# ============================================================================

def get_reminder_settings_from_salon():
    """Получить настройки напоминаний из salon_settings"""
    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute("SELECT custom_settings FROM salon_settings WHERE id = 1")
        row = c.fetchone()
        if row and row[0]:
            return row[0].get('booking_reminders', [])
        return []
    finally:
        conn.close()

def save_reminder_settings_to_salon(settings):
    """Сохранить настройки напоминаний в salon_settings"""
    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute("SELECT custom_settings FROM salon_settings WHERE id = 1")
        row = c.fetchone()
        custom_settings = row[0] if row and row[0] else {}
        custom_settings['booking_reminders'] = settings
        
        c.execute("""
            UPDATE salon_settings 
            SET custom_settings = %s, updated_at = CURRENT_TIMESTAMP 
            WHERE id = 1
        """, (custom_settings,))
        conn.commit()
    finally:
        conn.close()

@router.get("/booking-reminder-settings")
async def get_booking_reminder_settings(
    session_token: Optional[str] = Cookie(None)
):
    """Получить настройки напоминаний о записях"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    try:
        settings = get_reminder_settings_from_salon()
        return {"settings": settings}
    except Exception as e:
        log_error(f"Error getting booking reminder settings: {e}", "reminders")
        return JSONResponse({"error": str(e)}, status_code=500)

@router.post("/booking-reminder-settings")
async def create_booking_reminder_setting(
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Создать настройку напоминания о записи"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    try:
        data = await request.json()
        name = data.get("name")
        days_before = data.get("days_before", 0)
        hours_before = data.get("hours_before", 0)
        notification_type = data.get("notification_type", "email")
        is_enabled = data.get("is_enabled", True)

        if not name:
            return JSONResponse({"error": "Name is required"}, status_code=400)

        if days_before == 0 and hours_before == 0:
            return JSONResponse({"error": "At least days_before or hours_before must be > 0"},
                              status_code=400)

        settings = get_reminder_settings_from_salon()
        
        # Generate new ID
        new_id = max([s.get('id', 0) for s in settings], default=0) + 1
        
        new_setting = {
            "id": new_id,
            "name": name,
            "days_before": days_before,
            "hours_before": hours_before,
            "notification_type": notification_type,
            "is_enabled": is_enabled
        }
        
        settings.append(new_setting)
        save_reminder_settings_to_salon(settings)

        log_info(f"Booking reminder setting created: ID={new_id}, name={name}", "reminders")

        return {
            "success": True,
            "setting_id": new_id,
            "message": "Booking reminder setting created successfully"
        }

    except Exception as e:
        log_error(f"Error creating booking reminder setting: {e}", "reminders")
        return JSONResponse({"error": str(e)}, status_code=500)

@router.put("/booking-reminder-settings/{setting_id}")
async def update_booking_reminder_setting(
    setting_id: int,
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Обновить настройку напоминания о записи"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    try:
        data = await request.json()
        settings = get_reminder_settings_from_salon()
        
        # Find setting by ID
        setting_found = False
        for setting in settings:
            if setting.get('id') == setting_id:
                setting_found = True
                # Update fields
                if 'name' in data:
                    setting['name'] = data['name']
                if 'days_before' in data:
                    setting['days_before'] = data['days_before']
                if 'hours_before' in data:
                    setting['hours_before'] = data['hours_before']
                if 'notification_type' in data:
                    setting['notification_type'] = data['notification_type']
                if 'is_enabled' in data:
                    setting['is_enabled'] = data['is_enabled']
                break
        
        if not setting_found:
            return JSONResponse({"error": "Setting not found"}, status_code=404)
        
        save_reminder_settings_to_salon(settings)
        log_info(f"Booking reminder setting updated: ID={setting_id}", "reminders")

        return {
            "success": True,
            "message": "Booking reminder setting updated successfully"
        }

    except Exception as e:
        log_error(f"Error updating booking reminder setting: {e}", "reminders")
        return JSONResponse({"error": str(e)}, status_code=500)

@router.put("/booking-reminder-settings/{setting_id}/toggle")
async def toggle_booking_reminder_setting(
    setting_id: int,
    session_token: Optional[str] = Cookie(None)
):
    """Включить/выключить настройку напоминания"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    try:
        settings = get_reminder_settings_from_salon()
        
        setting_found = False
        new_state = False
        for setting in settings:
            if setting.get('id') == setting_id:
                setting_found = True
                new_state = not setting.get('is_enabled', False)
                setting['is_enabled'] = new_state
                break
        
        if not setting_found:
            return JSONResponse({"error": "Setting not found"}, status_code=404)
        
        save_reminder_settings_to_salon(settings)
        log_info(f"Booking reminder setting toggled: ID={setting_id}, enabled={new_state}", "reminders")

        return {
            "success": True,
            "is_enabled": new_state,
            "message": f"Setting {'enabled' if new_state else 'disabled'}"
        }

    except Exception as e:
        log_error(f"Error toggling booking reminder setting: {e}", "reminders")
        return JSONResponse({"error": str(e)}, status_code=500)

@router.delete("/booking-reminder-settings/{setting_id}")
async def delete_booking_reminder_setting(
    setting_id: int,
    session_token: Optional[str] = Cookie(None)
):
    """Удалить настройку напоминания о записи"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    try:
        settings = get_reminder_settings_from_salon()
        
        # Filter out the setting with matching ID
        new_settings = [s for s in settings if s.get('id') != setting_id]
        
        if len(new_settings) == len(settings):
            return JSONResponse({"error": "Setting not found"}, status_code=404)
        
        save_reminder_settings_to_salon(new_settings)
        log_info(f"Booking reminder setting deleted: ID={setting_id}", "reminders")

        return {
            "success": True,
            "message": "Booking reminder setting deleted successfully"
        }

    except Exception as e:
        log_error(f"Error deleting booking reminder setting: {e}", "reminders")
        return JSONResponse({"error": str(e)}, status_code=500)