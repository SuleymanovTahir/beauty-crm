"""
API Endpoints для управления расписанием мастеров
"""
from fastapi import APIRouter, Request, Cookie, Query, HTTPException, Depends
from fastapi.responses import JSONResponse
from typing import Optional, List
from pydantic import BaseModel

from psycopg2.extras import RealDictCursor
from core.config import (
    DEFAULT_HOURS_WEEKDAYS,
    DEFAULT_HOURS_WEEKENDS,
    DEFAULT_HOURS_START,
    DEFAULT_HOURS_END,
    DEFAULT_REPORT_TIME,
    get_default_hours_dict,
    get_default_working_hours_response
)
from db.connection import get_db_connection
from utils.utils import require_auth
from utils.logger import log_error, log_info
from services.master_schedule import MasterScheduleService

router = APIRouter(tags=["Schedule"])

# --- Pydantic Models for Admin UI ---
class WorkScheduleItem(BaseModel):
    day_of_week: int
    start_time: str
    end_time: str
    is_working: bool

class WorkScheduleUpdate(BaseModel):
    schedule: List[WorkScheduleItem]

class TimeOffCreate(BaseModel):
    start_datetime: str
    end_datetime: str
    type: str
    reason: Optional[str] = None

# Removed - now using user_id directly instead of employee_id

# --- New Endpoints for Admin UI (User ID based) ---

# ✅ ИСПОЛЬЗОВАТЬ MasterScheduleService для получения расписания
@router.get("/schedule/user/{user_id}", response_model=List[WorkScheduleItem])
async def get_user_schedule(user_id: int):
    """Получить расписание пользователя - использует MasterScheduleService"""
    try:
        # Получаем имя мастера по user_id
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute("SELECT full_name FROM users WHERE id = %s", (user_id,))
        user = cursor.fetchone()
        conn.close()
        
        if not user:
            return JSONResponse({"error": "User not found"}, status_code=404)
        
        master_name = user['full_name']
        
        # ✅ Используем MasterScheduleService
        schedule_service = MasterScheduleService()
        schedule_list = schedule_service.get_working_hours(master_name)  # Возвращает List[Dict]
        
        # ✅ Преобразуем список в словарь для удобства поиска
        schedule_map = {item['day_of_week']: item for item in schedule_list}
        
        # Преобразуем в формат для UI
        result = []
        for day in range(7):
            day_schedule = schedule_map.get(day, {})
            
            # ✅ ИСПРАВЛЕНО: Проверяем на None и используем дефолты
            # get_working_hours() возвращает None для start_time/end_time если расписание не установлено
            start_time = day_schedule.get('start_time') or DEFAULT_HOURS_START
            end_time = day_schedule.get('end_time') or DEFAULT_HOURS_END
            is_working = day_schedule.get('is_active', False)
            
            result.append({
                "day_of_week": day,
                "start_time": start_time,
                "end_time": end_time,
                "is_working": is_working
            })
        
        return result
    except Exception as e:
        log_error(f"Error getting user schedule: {e}", "schedule")
        return JSONResponse({"error": str(e)}, status_code=500)

@router.put("/schedule/user/{user_id}")
async def update_user_schedule(user_id: int, data: WorkScheduleUpdate):
    conn = get_db_connection()
    try:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Добавляем/обновляем расписание атомарно
        for item in data.schedule:
            cursor.execute("""
                INSERT INTO user_schedule (user_id, day_of_week, start_time, end_time, is_active)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (user_id, day_of_week) DO UPDATE
                SET start_time = EXCLUDED.start_time,
                    end_time = EXCLUDED.end_time,
                    is_active = EXCLUDED.is_active,
                    updated_at = CURRENT_TIMESTAMP
            """, (user_id, item.day_of_week, item.start_time, item.end_time, bool(item.is_working)))
            
        conn.commit()
        return {"status": "success"}
    finally:
        conn.close()

@router.get("/schedule/user/{user_id}/time-off")
async def get_user_time_off(user_id: int):
    conn = get_db_connection()
    try:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        cursor.execute("""
            SELECT id, start_date as start_datetime, end_date as end_datetime, reason 
            FROM user_time_off 
            WHERE user_id = %s 
            ORDER BY start_date DESC
        """, (user_id,))
        
        rows = cursor.fetchall()
        return [dict(row) for row in rows]
    finally:
        conn.close()

@router.post("/schedule/user/{user_id}/time-off")
async def add_user_time_off(user_id: int, data: TimeOffCreate):
    conn = get_db_connection()
    try:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        cursor.execute("""
            INSERT INTO user_time_off (user_id, start_date, end_date, reason)
            VALUES (%s, %s, %s, %s) RETURNING id
        """, (user_id, data.start_datetime, data.end_datetime, data.reason))
        
        time_off_id = cursor.fetchone()['id']
        conn.commit()
        return {"status": "success", "id": time_off_id}
    finally:
        conn.close()

@router.delete("/schedule/time-off/{id}")
async def delete_time_off_by_id(id: int):
    conn = get_db_connection()
    try:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute("DELETE FROM user_time_off WHERE id = %s", (id,))
        conn.commit()
        return {"status": "success"}
    finally:
        conn.close()

@router.put("/schedule/time-off/{id}")
async def update_time_off(id: int, data: TimeOffCreate):
    conn = get_db_connection()
    try:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute("""
            UPDATE user_time_off 
            SET start_date = %s, end_date = %s, reason = %s 
            WHERE id = %s
        """, (data.start_datetime, data.end_datetime, data.reason, id))
        conn.commit()
        return {"status": "success"}
    finally:
        conn.close()

# --- Existing Endpoints (Master Name based) ---

@router.post("/schedule/{master_name}/working-hours")
async def set_working_hours_api(
    master_name: str,
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """
    Установить рабочие часы мастера

    Body:
    {
        "day_of_week": 0,  // 0=Пн, 6=Вс
        "start_time": "10:30",  // Пример (используется DEFAULT_HOURS_START)
        "end_time": "21:00"    // Пример (используется DEFAULT_HOURS_END)
    }
    """
    user = require_auth(session_token)
    if not user or user["role"] not in ["admin", "manager", "director"]:
        return JSONResponse({"error": "Forbidden"}, status_code=403)

    try:
        data = await request.json()
        day_of_week = data.get('day_of_week')
        start_time = data.get('start_time')
        end_time = data.get('end_time')

        if day_of_week is None or not start_time or not end_time:
            return JSONResponse({"error": "Missing required fields"}, status_code=400)

        schedule_service = MasterScheduleService()
        success = schedule_service.set_working_hours(
            master_name=master_name,
            day_of_week=day_of_week,
            start_time=start_time,
            end_time=end_time
        )

        if success:
            return {
                "success": True,
                "message": "Working hours set successfully"
            }
        else:
            return JSONResponse({"error": "Failed to set working hours"}, status_code=500)

    except Exception as e:
        log_error(f"Error setting working hours: {e}", "schedule")
        return JSONResponse({"error": str(e)}, status_code=500)

@router.get("/schedule/{master_name}/working-hours")
async def get_working_hours_api(
    master_name: str,
    session_token: Optional[str] = Cookie(None)
):
    """Получить рабочие часы мастера на всю неделю"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    try:
        schedule_service = MasterScheduleService()
        schedule = schedule_service.get_working_hours(master_name)

        return {
            "success": True,
            "master": master_name,
            "schedule": schedule
        }

    except Exception as e:
        log_error(f"Error getting working hours: {e}", "schedule")
        return JSONResponse({"error": str(e)}, status_code=500)

@router.post("/schedule/{master_name}/time-off")
async def add_time_off_api(
    master_name: str,
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """
    Добавить выходной/отпуск

    Body:
    {
        "start_date": (datetime.now() + timedelta(days=2)).strftime("%Y-%m-%d"),
        "end_date": (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d"),
        "type": "vacation",  // vacation, sick_leave, day_off
        "reason": "Отпуск"
    }
    """
    user = require_auth(session_token)
    if not user or user["role"] not in ["admin", "manager", "director"]:
        return JSONResponse({"error": "Forbidden"}, status_code=403)

    try:
        data = await request.json()
        start_date = data.get('start_date')
        end_date = data.get('end_date')
        time_off_type = data.get('type', 'vacation')
        reason = data.get('reason')

        if not start_date or not end_date:
            return JSONResponse({"error": "Missing required fields"}, status_code=400)

        schedule_service = MasterScheduleService()
        success = schedule_service.add_time_off(
            master_name=master_name,
            start_date=start_date,
            end_date=end_date,
            time_off_type=time_off_type,
            reason=reason
        )

        if success:
            return {
                "success": True,
                "message": "Time off added successfully"
            }
        else:
            return JSONResponse({"error": "Failed to add time off"}, status_code=500)

    except Exception as e:
        log_error(f"Error adding time off: {e}", "schedule")
        return JSONResponse({"error": str(e)}, status_code=500)

@router.get("/schedule/{master_name}/time-off")
async def get_time_off_api(
    master_name: str,
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    session_token: Optional[str] = Cookie(None)
):
    """Получить выходные/отпуска мастера"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    try:
        schedule_service = MasterScheduleService()
        time_offs = schedule_service.get_time_off(
            master_name=master_name,
            start_date=start_date,
            end_date=end_date
        )

        return {
            "success": True,
            "master": master_name,
            "time_offs": time_offs
        }

    except Exception as e:
        log_error(f"Error getting time off: {e}", "schedule")
        return JSONResponse({"error": str(e)}, status_code=500)

@router.delete("/schedule/time-off/{time_off_id}")
async def remove_time_off_api(
    time_off_id: int,
    session_token: Optional[str] = Cookie(None)
):
    """Удалить выходной/отпуск"""
    user = require_auth(session_token)
    if not user or user["role"] not in ["admin", "manager", "director"]:
        return JSONResponse({"error": "Forbidden"}, status_code=403)

    try:
        schedule_service = MasterScheduleService()
        success = schedule_service.remove_time_off(time_off_id)

        if success:
            return {
                "success": True,
                "message": "Time off removed successfully"
            }
        else:
            return JSONResponse({"error": "Failed to remove time off"}, status_code=500)

    except Exception as e:
        log_error(f"Error removing time off: {e}", "schedule")
        return JSONResponse({"error": str(e)}, status_code=500)

@router.get("/schedule/{master_name}/available-slots")
async def get_available_slots_api(
    master_name: str,
    date: str = Query(..., description="Date (YYYY-MM-DD)"),
    duration: int = Query(60, description="Slot duration in minutes"),
    session_token: Optional[str] = Cookie(None)
):
    """Получить доступные слоты мастера на день"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    try:
        schedule_service = MasterScheduleService()
        slots = schedule_service.get_available_slots(
            master_name=master_name,
            date=date,
            duration_minutes=duration
        )

        return {
            "success": True,
            "master": master_name,
            "date": date,
            "available_slots": slots,
            "count": len(slots)
        }

    except Exception as e:
        log_error(f"Error getting available slots: {e}", "schedule")
        return JSONResponse({"error": str(e)}, status_code=500)

@router.get("/schedule/available-slots")
async def get_all_masters_availability_api(
    date: str = Query(..., description="Date (YYYY-MM-DD)"),
    session_token: Optional[str] = Cookie(None)
):
    """Получить доступность всех мастеров на день"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    try:
        schedule_service = MasterScheduleService()
        availability = schedule_service.get_all_masters_availability(date)

        return {
            "success": True,
            "date": date,
            "availability": availability
        }

    except Exception as e:
        log_error(f"Error getting all masters availability: {e}", "schedule")
        return JSONResponse({"error": str(e)}, status_code=500)

@router.get("/schedule/{master_name}/check-availability")
async def check_availability_api(
    master_name: str,
    date: str = Query(..., description="Date (YYYY-MM-DD)"),
    time: str = Query(..., description="Time (HH:MM)"),
    session_token: Optional[str] = Cookie(None)
):
    """Проверить доступность мастера в конкретное время"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    try:
        schedule_service = MasterScheduleService()
        is_available = schedule_service.is_master_available(
            master_name=master_name,
            date=date,
            time_str=time
        )

        return {
            "success": True,
            "master": master_name,
            "date": date,
            "time": time,
            "is_available": is_available
        }

    except Exception as e:
        log_error(f"Error checking availability: {e}", "schedule")
        return JSONResponse({"error": str(e)}, status_code=500)

@router.get("/salon-settings/working-hours")
async def get_salon_working_hours():
    """Получить рабочие часы салона из настроек"""
    try:
        from db import get_salon_settings
        salon = get_salon_settings()
        
        # Парсим часы работы
        hours_weekdays = salon.get('hours_weekdays', DEFAULT_HOURS_WEEKDAYS)  # ✅ Используем константу
        hours_weekends = salon.get('hours_weekends', DEFAULT_HOURS_WEEKENDS)  # ✅ Используем константу
        lunch_start_raw = salon.get('lunch_start')
        lunch_end_raw = salon.get('lunch_end')
        lunch_start = lunch_start_raw[:5] if isinstance(lunch_start_raw, str) and ':' in lunch_start_raw else ''
        lunch_end = lunch_end_raw[:5] if isinstance(lunch_end_raw, str) and ':' in lunch_end_raw else ''
        
        # Парсим время начала и конца
        def parse_hours(hours_str):
            parts = hours_str.split('-')
            if len(parts) == 2:
                start = parts[0].strip()
                end = parts[1].strip()
                return {
                    "start": start,
                    "end": end,
                    "start_hour": int(start.split(':')[0]),
                    "end_hour": int(end.split(':')[0])
                }
            return get_default_hours_dict()  # ✅ Используем функцию
        
        return {
            "weekdays": parse_hours(hours_weekdays),
            "weekends": parse_hours(hours_weekends),
            "lunch": {
                "start": lunch_start,
                "end": lunch_end
            }
        }
    except Exception as e:
        log_error(f"Error getting salon working hours: {e}", "settings")
        # Fallback
        return get_default_working_hours_response()  # ✅ Используем функцию

@router.get("/public/schedule/{master_name}/available-dates")
async def get_public_available_dates_api(
    master_name: str,
    year: int = Query(..., description="Year"),
    month: int = Query(..., description="Month (1-12)"),
    duration: int = Query(60, description="Slot duration in minutes")
):
    """
    Публичный эндпоинт: Получить доступные даты для мастера в указанном месяце.
    pass 'any' or 'global' as master_name to check availability across all masters.
    """
    try:
        schedule_service = MasterScheduleService()
        dates = schedule_service.get_available_dates(
            master_name=master_name,
            year=year,
            month=month,
            duration_minutes=duration
        )

        return {
            "success": True,
            "master": master_name,
            "year": year,
            "month": month,
            "available_dates": dates
        }

    except Exception as e:
        log_error(f"Error getting available dates: {e}", "schedule")
        return JSONResponse({"error": str(e)}, status_code=500)

@router.get("/schedule/{master_name}/available-dates")
async def get_available_dates_api(
    master_name: str,
    year: int = Query(..., description="Year"),
    month: int = Query(..., description="Month (1-12)"),
    duration: int = Query(60, description="Slot duration in minutes"),
    session_token: Optional[str] = Cookie(None)
):
    """
    Получить доступные даты для мастера в указанном месяце.
    pass 'any' or 'global' as master_name to check availability across all masters.
    """
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    try:
        schedule_service = MasterScheduleService()
        dates = schedule_service.get_available_dates(
            master_name=master_name,
            year=year,
            month=month,
            duration_minutes=duration
        )

        return {
            "success": True,
            "master": master_name,
            "year": year,
            "month": month,
            "available_dates": dates
        }

    except Exception as e:
        log_error(f"Error getting available dates: {e}", "schedule")
        return JSONResponse({"error": str(e)}, status_code=500)
