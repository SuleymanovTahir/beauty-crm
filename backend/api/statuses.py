"""
API для управления статусами
"""
from fastapi import APIRouter, Request, Cookie
from fastapi.responses import JSONResponse
from typing import Optional
import sqlite3

from core.config import DATABASE_NAME
from db.connection import get_db_connection
from utils.utils import require_auth
from utils.logger import log_info, log_error

router = APIRouter(tags=["Statuses"])


@router.get("/statuses/client")
async def get_client_statuses(session_token: Optional[str] = Cookie(None)):
    """Получить все статусы клиентов"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    
    try:
        conn = get_db_connection()
        c = conn.cursor()
        
        # Создаём таблицу если не существует
        c.execute("""
            CREATE TABLE IF NOT EXISTS client_statuses (
                status_key TEXT PRIMARY KEY,
                status_label TEXT NOT NULL,
                status_color TEXT NOT NULL,
                is_system BOOLEAN DEFAULT FALSE,
                created_at TEXT NOT NULL
            )
        """)
        
        # Добавляем системные статусы если таблица пустая
        c.execute("SELECT COUNT(*) FROM client_statuses")
        if c.fetchone()[0] == 0:
            from datetime import datetime
            now = datetime.now().isoformat()
            
            system_statuses = [
                ('new', 'Новый', 'bg-green-100 text-green-800', True),
                ('contacted', 'Связались', 'bg-blue-100 text-blue-800', True),
                ('interested', 'Заинтересован', 'bg-yellow-100 text-yellow-800', True),
                ('lead', 'Лид', 'bg-orange-100 text-orange-800', True),
                ('customer', 'Клиент', 'bg-purple-100 text-purple-800', True),
                ('vip', 'VIP', 'bg-pink-100 text-pink-800', True),
                ('inactive', 'Неактивен', 'bg-gray-100 text-gray-800', True),
                ('blocked', 'Заблокирован', 'bg-red-100 text-red-800', True),
            ]
            
            for status_key, label, color, is_system in system_statuses:
                c.execute("""
                    INSERT INTO client_statuses (status_key, status_label, status_color, is_system, created_at)
                    VALUES (%s, %s, %s, %s, %s)
                """, (status_key, label, color, is_system, now))
            
            conn.commit()
        
        c.execute("SELECT status_key, status_label, status_color, is_system FROM client_statuses ORDER BY is_system DESC, status_label")
        rows = c.fetchall()
        
        statuses = {}
        for row in rows:
            statuses[row[0]] = {
                "label": row[1],
                "color": row[2],
                "is_system": bool(row[3])
            }
        
        conn.close()
        return {"statuses": statuses}
        
    except Exception as e:
        log_error(f"Error getting statuses: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=500)


@router.post("/statuses/client")
async def create_client_status(
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Создать новый статус клиента"""
    user = require_auth(session_token)
    if not user or user["role"] not in ["admin", "manager", "director"]:
        return JSONResponse({"error": "Forbidden"}, status_code=403)
    
    try:
        data = await request.json()
        status_key = data.get('status_key')
        status_label = data.get('status_label')
        status_color = data.get('status_color', 'bg-gray-100 text-gray-800')
        
        if not status_key or not status_label:
            return JSONResponse({"error": "Missing required fields"}, status_code=400)
        
        from datetime import datetime
        
        conn = get_db_connection()
        c = conn.cursor()
        
        # Проверяем существование
        c.execute("SELECT status_key FROM client_statuses WHERE status_key = %s", (status_key,))
        if c.fetchone():
            conn.close()
            return JSONResponse({"error": "Status already exists"}, status_code=400)
        
        c.execute("""
            INSERT INTO client_statuses (status_key, status_label, status_color, is_system, created_at)
            VALUES (%s, %s, %s, FALSE, %s)
        """, (status_key, status_label, status_color, datetime.now().isoformat()))
        
        conn.commit()
        conn.close()
        
        log_info(f"Created new client status: {status_key}", "api")
        return {"success": True, "message": "Status created"}
        
    except Exception as e:
        log_error(f"Error creating status: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=500)


@router.delete("/statuses/client/{status_key}")
async def delete_client_status(
    status_key: str,
    session_token: Optional[str] = Cookie(None)
):
    """Удалить статус клиента (только не системные)"""
    user = require_auth(session_token)
    if not user or user["role"] != "admin":
        return JSONResponse({"error": "Forbidden"}, status_code=403)
    
    try:
        conn = get_db_connection()
        c = conn.cursor()
        
        # Проверяем что это не системный статус
        c.execute("SELECT is_system FROM client_statuses WHERE status_key = %s", (status_key,))
        result = c.fetchone()
        
        if not result:
            conn.close()
            return JSONResponse({"error": "Status not found"}, status_code=404)
        
        if result[0]:
            conn.close()
            return JSONResponse({"error": "Cannot delete system status"}, status_code=400)
        
        c.execute("DELETE FROM client_statuses WHERE status_key = %s", (status_key,))
        conn.commit()
        conn.close()
        
        log_info(f"Deleted client status: {status_key}", "api")
        return {"success": True, "message": "Status deleted"}
        
    except Exception as e:
        log_error(f"Error deleting status: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=500)


@router.get("/statuses/booking")
async def get_booking_statuses(session_token: Optional[str] = Cookie(None)):
    """Получить все статусы записей"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    
    try:
        conn = get_db_connection()
        c = conn.cursor()
        
        c.execute("""
            CREATE TABLE IF NOT EXISTS booking_statuses (
                status_key TEXT PRIMARY KEY,
                status_label TEXT NOT NULL,
                status_color TEXT NOT NULL,
                is_system BOOLEAN DEFAULT FALSE,
                created_at TEXT NOT NULL
            )
        """)
        
        c.execute("SELECT COUNT(*) FROM booking_statuses")
        if c.fetchone()[0] == 0:
            from datetime import datetime
            now = datetime.now().isoformat()
            
            system_statuses = [
                ('pending', 'Ожидает', 'bg-yellow-100 text-yellow-800', True),
                ('confirmed', 'Подтверждена', 'bg-green-100 text-green-800', True),
                ('completed', 'Завершена', 'bg-blue-100 text-blue-800', True),
                ('cancelled', 'Отменена', 'bg-red-100 text-red-800', True),
                ('new', 'Новая', 'bg-purple-100 text-purple-800', True),
            ]
            
            for status_key, label, color, is_system in system_statuses:
                c.execute("""
                    INSERT INTO booking_statuses (status_key, status_label, status_color, is_system, created_at)
                    VALUES (%s, %s, %s, %s, %s)
                """, (status_key, label, color, is_system, now))
            
            conn.commit()
        
        c.execute("SELECT status_key, status_label, status_color, is_system FROM booking_statuses ORDER BY is_system DESC, status_label")
        rows = c.fetchall()
        
        statuses = {}
        for row in rows:
            statuses[row[0]] = {
                "label": row[1],
                "color": row[2],
                "is_system": bool(row[3])
            }
        
        conn.close()
        return {"statuses": statuses}
        
    except Exception as e:
        log_error(f"Error getting booking statuses: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=500)


@router.post("/statuses/booking")
async def create_booking_status(
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Создать новый статус записи"""
    user = require_auth(session_token)
    if not user or user["role"] not in ["admin", "manager", "director"]:
        return JSONResponse({"error": "Forbidden"}, status_code=403)
    
    try:
        data = await request.json()
        status_key = data.get('status_key')
        status_label = data.get('status_label')
        status_color = data.get('status_color', 'bg-gray-100 text-gray-800')
        
        if not status_key or not status_label:
            return JSONResponse({"error": "Missing required fields"}, status_code=400)
        
        from datetime import datetime
        
        conn = get_db_connection()
        c = conn.cursor()
        
        c.execute("SELECT status_key FROM booking_statuses WHERE status_key = %s", (status_key,))
        if c.fetchone():
            conn.close()
            return JSONResponse({"error": "Status already exists"}, status_code=400)
        
        c.execute("""
            INSERT INTO booking_statuses (status_key, status_label, status_color, is_system, created_at)
            VALUES (%s, %s, %s, FALSE, %s)
        """, (status_key, status_label, status_color, datetime.now().isoformat()))
        
        conn.commit()
        conn.close()
        
        log_info(f"Created new booking status: {status_key}", "api")
        return {"success": True, "message": "Status created"}
        
    except Exception as e:
        log_error(f"Error creating booking status: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=500)