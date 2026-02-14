"""
API Endpoints для управления расписанием мастеров
"""
from fastapi import APIRouter, Request, Cookie, Query, HTTPException, Depends
from fastapi.responses import JSONResponse
from typing import Optional, List, Dict, Any
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


def _parse_hours_range(hours_value: str, fallback_start: str, fallback_end: str) -> tuple[str, str]:
    if not isinstance(hours_value, str):
        return fallback_start, fallback_end
    parts = [part.strip() for part in hours_value.split('-')]
    if len(parts) != 2:
        return fallback_start, fallback_end
    start_time, end_time = parts[0], parts[1]
    if not start_time or not end_time:
        return fallback_start, fallback_end
    return start_time, end_time


def _build_default_week_schedule() -> list[dict]:
    from db import get_salon_settings

    salon = get_salon_settings() or {}
    weekdays_raw = salon.get('hours_weekdays', DEFAULT_HOURS_WEEKDAYS)
    weekends_raw = salon.get('hours_weekends', DEFAULT_HOURS_WEEKENDS)
    weekday_start, weekday_end = _parse_hours_range(weekdays_raw, DEFAULT_HOURS_START, DEFAULT_HOURS_END)
    weekend_start, weekend_end = _parse_hours_range(weekends_raw, DEFAULT_HOURS_START, DEFAULT_HOURS_END)

    default_schedule = []
    for day in range(7):
        is_working = day < 5  # default 5/2
        start_time = weekday_start if day < 5 else weekend_start
        end_time = weekday_end if day < 5 else weekend_end
        default_schedule.append({
            "day_of_week": day,
            "start_time": start_time,
            "end_time": end_time,
            "is_working": is_working
        })
    return default_schedule


def _time_to_minutes(time_value: str) -> int:
    try:
        hh, mm = str(time_value).split(":")[:2]
        return int(hh) * 60 + int(mm)
    except Exception:
        return 0


def _normalize_slots(slots: List[Any]) -> List[Dict[str, Any]]:
    normalized: Dict[str, Dict[str, Any]] = {}

    for slot in slots:
        if isinstance(slot, dict):
            slot_time = str(slot.get("time", "")).strip()[:5]
            if not slot_time:
                continue
            current = normalized.get(slot_time, {"time": slot_time, "available": True, "isOptimal": False})
            current["isOptimal"] = bool(current["isOptimal"] or slot.get("is_optimal") or slot.get("isOptimal"))
            normalized[slot_time] = current
            continue

        slot_time = str(slot).strip()[:5]
        if not slot_time:
            continue
        if slot_time not in normalized:
            normalized[slot_time] = {"time": slot_time, "available": True, "isOptimal": False}

    result = list(normalized.values())
    result.sort(key=lambda item: _time_to_minutes(item["time"]))
    return result


def _parse_duration_minutes(raw_duration: Any) -> int:
    if raw_duration is None:
        return 60
    if isinstance(raw_duration, (int, float)):
        return max(1, int(raw_duration))

    raw = str(raw_duration).strip()
    digits = "".join(ch for ch in raw if ch.isdigit())
    if not digits:
        return 60

    try:
        return max(1, int(digits))
    except Exception:
        return 60


def _parse_service_ids_param(raw_service_ids: Optional[str]) -> List[int]:
    if raw_service_ids is None:
        return []

    values: List[int] = []
    seen: set[int] = set()
    for chunk in str(raw_service_ids).split(","):
        raw_chunk = chunk.strip()
        if raw_chunk == "" or not raw_chunk.isdigit():
            continue
        service_id = int(raw_chunk)
        if service_id <= 0 or service_id in seen:
            continue
        seen.add(service_id)
        values.append(service_id)
    return values


def _collect_requested_service_ids(service_id: Optional[int], raw_service_ids: Optional[str]) -> List[int]:
    requested_ids = _parse_service_ids_param(raw_service_ids)
    if service_id is not None and service_id > 0 and service_id not in requested_ids:
        requested_ids.append(service_id)
    return requested_ids


def _resolve_total_duration_minutes(
    cursor,
    requested_service_ids: List[int],
    duration_minutes: Optional[int],
) -> int:
    if isinstance(duration_minutes, int) and duration_minutes > 0:
        return duration_minutes

    if len(requested_service_ids) == 0:
        return 60

    cursor.execute(
        "SELECT id, duration FROM services WHERE id = ANY(%s)",
        (requested_service_ids,),
    )
    rows = cursor.fetchall() or []
    duration_by_id = {
        int(row["id"]): _parse_duration_minutes(row.get("duration"))
        for row in rows
        if row.get("id") is not None
    }

    total_duration = 0
    for sid in requested_service_ids:
        total_duration += duration_by_id.get(int(sid), 60)

    return max(1, total_duration)


def _fetch_public_master_ids(
    cursor,
    requested_service_ids: List[int],
    ordered: bool = False,
) -> List[int]:
    order_clause = " ORDER BY u.sort_order ASC NULLS LAST, u.full_name ASC NULLS LAST" if ordered else ""

    if len(requested_service_ids) > 0:
        cursor.execute(
            f"""
            SELECT u.id
            FROM users u
            INNER JOIN user_services us ON us.user_id = u.id
            WHERE u.is_active = TRUE
              AND u.is_service_provider = TRUE
              AND u.is_public_visible = TRUE
              AND u.deleted_at IS NULL
              AND u.role != 'director'
              AND us.service_id = ANY(%s)
            GROUP BY u.id, u.sort_order, u.full_name
            HAVING COUNT(DISTINCT us.service_id) = %s
            {order_clause}
            """,
            (requested_service_ids, len(requested_service_ids)),
        )
    else:
        cursor.execute(
            f"""
            SELECT u.id
            FROM users u
            WHERE u.is_active = TRUE
              AND u.is_service_provider = TRUE
              AND u.is_public_visible = TRUE
              AND u.deleted_at IS NULL
              AND u.role != 'director'
            {order_clause}
            """
        )

    rows = cursor.fetchall() or []
    return [int(row["id"]) for row in rows if row.get("id") is not None]

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


def _column_exists(cursor, table_name: str, column_name: str) -> bool:
    cursor.execute(
        """
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = %s
          AND column_name = %s
        LIMIT 1
        """,
        (table_name, column_name),
    )
    return bool(cursor.fetchone())

# ✅ ИСПОЛЬЗОВАТЬ MasterScheduleService для получения расписания
@router.get("/schedule/user/{user_id}", response_model=List[WorkScheduleItem])
async def get_user_schedule(user_id: int):
    """Получить расписание пользователя - использует MasterScheduleService"""
    try:
        # Проверяем что пользователь существует
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute("SELECT id FROM users WHERE id = %s", (user_id,))
        user = cursor.fetchone()
        
        if not user:
            conn.close()
            return JSONResponse({"error": "User not found"}, status_code=404)

        cursor.execute("""
            SELECT COUNT(*) AS total_rows
            FROM user_schedule
            WHERE user_id = %s
        """, (user_id,))
        schedule_stats = cursor.fetchone() or {"total_rows": 0}
        if int(schedule_stats.get("total_rows", 0)) == 0:
            default_schedule = _build_default_week_schedule()
            for item in default_schedule:
                cursor.execute("""
                    INSERT INTO user_schedule (user_id, day_of_week, start_time, end_time, is_active)
                    VALUES (%s, %s, %s, %s, %s)
                    ON CONFLICT (user_id, day_of_week) DO UPDATE
                    SET start_time = EXCLUDED.start_time,
                        end_time = EXCLUDED.end_time,
                        is_active = EXCLUDED.is_active,
                        updated_at = CURRENT_TIMESTAMP
                """, (user_id, item["day_of_week"], item["start_time"], item["end_time"], bool(item["is_working"])))
            conn.commit()
            log_info(f"Auto-filled default 5/2 schedule for user_id={user_id}", "schedule")
        
        master_name = str(user_id)
        conn.close()
        
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

        has_type_column = _column_exists(cursor, "user_time_off", "type")
        if has_type_column:
            cursor.execute(
                """
                SELECT id, start_date as start_datetime, end_date as end_datetime, COALESCE(type, 'vacation') AS type, reason
                FROM user_time_off
                WHERE user_id = %s
                ORDER BY start_date DESC
                """,
                (user_id,),
            )
        else:
            cursor.execute(
                """
                SELECT id, start_date as start_datetime, end_date as end_datetime, 'vacation'::TEXT AS type, reason
                FROM user_time_off
                WHERE user_id = %s
                ORDER BY start_date DESC
                """,
                (user_id,),
            )
        
        rows = cursor.fetchall()
        return [dict(row) for row in rows]
    finally:
        conn.close()

@router.post("/schedule/user/{user_id}/time-off")
async def add_user_time_off(user_id: int, data: TimeOffCreate):
    conn = get_db_connection()
    try:
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        has_type_column = _column_exists(cursor, "user_time_off", "type")
        if has_type_column:
            cursor.execute(
                """
                INSERT INTO user_time_off (user_id, start_date, end_date, type, reason)
                VALUES (%s, %s, %s, %s, %s) RETURNING id
                """,
                (user_id, data.start_datetime, data.end_datetime, data.type, data.reason),
            )
        else:
            cursor.execute(
                """
                INSERT INTO user_time_off (user_id, start_date, end_date, reason)
                VALUES (%s, %s, %s, %s) RETURNING id
                """,
                (user_id, data.start_datetime, data.end_datetime, data.reason),
            )
        
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
        has_type_column = _column_exists(cursor, "user_time_off", "type")
        if has_type_column:
            cursor.execute(
                """
                UPDATE user_time_off
                SET start_date = %s, end_date = %s, type = %s, reason = %s
                WHERE id = %s
                """,
                (data.start_datetime, data.end_datetime, data.type, data.reason, id),
            )
        else:
            cursor.execute(
                """
                UPDATE user_time_off
                SET start_date = %s, end_date = %s, reason = %s
                WHERE id = %s
                """,
                (data.start_datetime, data.end_datetime, data.reason, id),
            )
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


@router.get("/public/available-slots")
async def get_public_available_slots_api(
    date: str = Query(..., description="Date (YYYY-MM-DD)"),
    employee_id: Optional[int] = Query(None, description="Employee ID"),
    service_id: Optional[int] = Query(None, description="Service ID"),
    service_ids: Optional[str] = Query(None, description="Comma-separated service IDs"),
    duration_minutes: Optional[int] = Query(None, description="Total duration in minutes"),
):
    """Публичный эндпоинт: свободные слоты на день для мастера или по салону."""
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        schedule_service = MasterScheduleService()
        requested_service_ids = _collect_requested_service_ids(service_id, service_ids)
        resolved_duration_minutes = _resolve_total_duration_minutes(
            cursor=cursor,
            requested_service_ids=requested_service_ids,
            duration_minutes=duration_minutes,
        )

        if employee_id:
            cursor.execute(
                """
                SELECT id
                FROM users
                WHERE id = %s
                  AND is_active = TRUE
                  AND is_service_provider = TRUE
                  AND deleted_at IS NULL
                LIMIT 1
                """,
                (employee_id,),
            )
            master_row = cursor.fetchone()
            if not master_row:
                return {"date": date, "slots": []}

            if len(requested_service_ids) > 0:
                cursor.execute(
                    """
                    SELECT user_id
                    FROM user_services
                    WHERE user_id = %s
                      AND service_id = ANY(%s)
                    GROUP BY user_id
                    HAVING COUNT(DISTINCT service_id) = %s
                    """,
                    (employee_id, requested_service_ids, len(requested_service_ids)),
                )
                if not cursor.fetchone():
                    return {"date": date, "slots": []}

            slot_rows = schedule_service.get_available_slots(
                master_name=str(employee_id),
                date=date,
                duration_minutes=resolved_duration_minutes,
                return_metadata=True
            )
            return {"date": date, "slots": _normalize_slots(slot_rows)}

        allowed_master_ids = _fetch_public_master_ids(
            cursor=cursor,
            requested_service_ids=requested_service_ids,
            ordered=False,
        )
        if not allowed_master_ids:
            return {"date": date, "slots": []}

        merged_slots: List[Any] = []
        for allowed_master_id in allowed_master_ids:
            slots = schedule_service.get_available_slots(
                master_name=str(allowed_master_id),
                date=date,
                duration_minutes=resolved_duration_minutes,
                return_metadata=True
            )
            if isinstance(slots, list):
                merged_slots.extend(slots)

        return {"date": date, "slots": _normalize_slots(merged_slots)}
    except Exception as e:
        log_error(f"Error getting public available slots: {e}", "schedule")
        return JSONResponse({"error": str(e)}, status_code=500)
    finally:
        if conn:
            conn.close()


@router.get("/public/available-slots/batch")
async def get_public_batch_available_slots_api(
    date: str = Query(..., description="Date (YYYY-MM-DD)"),
    service_id: Optional[int] = Query(None, description="Service ID"),
    service_ids: Optional[str] = Query(None, description="Comma-separated service IDs"),
    duration_minutes: Optional[int] = Query(None, description="Total duration in minutes"),
):
    """Публичный эндпоинт: доступность по всем мастерам (id -> массив времени)."""
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        schedule_service = MasterScheduleService()
        requested_service_ids = _collect_requested_service_ids(service_id, service_ids)
        resolved_duration_minutes = _resolve_total_duration_minutes(
            cursor=cursor,
            requested_service_ids=requested_service_ids,
            duration_minutes=duration_minutes,
        )
        master_ids = _fetch_public_master_ids(
            cursor=cursor,
            requested_service_ids=requested_service_ids,
            ordered=True,
        )

        availability: Dict[int, List[str]] = {}
        for employee_id in master_ids:

            raw_slots = schedule_service.get_available_slots(
                master_name=str(employee_id),
                date=date,
                duration_minutes=resolved_duration_minutes
            )
            normalized_slots = _normalize_slots(raw_slots)
            availability[employee_id] = [slot["time"] for slot in normalized_slots]

        return {"date": date, "availability": availability}
    except Exception as e:
        log_error(f"Error getting public batch availability: {e}", "schedule")
        return JSONResponse({"error": str(e)}, status_code=500)
    finally:
        if conn:
            conn.close()

@router.get("/public/schedule/{master_name}/available-dates")
async def get_public_available_dates_api(
    master_name: str,
    year: int = Query(..., description="Year"),
    month: int = Query(..., description="Month (1-12)"),
    duration: int = Query(60, description="Slot duration in minutes"),
    service_ids: Optional[str] = Query(None, description="Comma-separated service IDs"),
):
    """
    Публичный эндпоинт: Получить доступные даты для мастера в указанном месяце.
    pass 'any' or 'global' as master_name to check availability across all masters.
    """
    try:
        schedule_service = MasterScheduleService()
        requested_service_ids = _parse_service_ids_param(service_ids)
        resolved_duration = max(1, int(duration))

        if len(requested_service_ids) > 0:
            conn = get_db_connection()
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            try:
                resolved_duration = _resolve_total_duration_minutes(
                    cursor=cursor,
                    requested_service_ids=requested_service_ids,
                    duration_minutes=duration,
                )

                if str(master_name).strip().lower() in {"any", "global"}:
                    master_ids = _fetch_public_master_ids(
                        cursor=cursor,
                        requested_service_ids=requested_service_ids,
                        ordered=False,
                    )
                    merged_dates: set[str] = set()
                    for master_id in master_ids:
                        master_dates = schedule_service.get_available_dates(
                            master_name=str(master_id),
                            year=year,
                            month=month,
                            duration_minutes=resolved_duration,
                        )
                        for item in master_dates:
                            merged_dates.add(item)

                    dates = sorted(merged_dates)
                    return {
                        "success": True,
                        "master": master_name,
                        "year": year,
                        "month": month,
                        "available_dates": dates
                    }

                resolved_master_id: Optional[int] = None
                normalized_master_name = str(master_name).strip()
                if normalized_master_name.isdigit():
                    resolved_master_id = int(normalized_master_name)
                else:
                    cursor.execute(
                        """
                        SELECT id
                        FROM users
                        WHERE is_service_provider = TRUE
                          AND deleted_at IS NULL
                          AND (
                            LOWER(username) = LOWER(%s)
                            OR LOWER(full_name) = LOWER(%s)
                            OR LOWER(COALESCE(nickname, '')) = LOWER(%s)
                          )
                        ORDER BY id ASC
                        LIMIT 1
                        """,
                        (normalized_master_name, normalized_master_name, normalized_master_name),
                    )
                    resolved_row = cursor.fetchone()
                    if resolved_row and resolved_row.get("id") is not None:
                        resolved_master_id = int(resolved_row["id"])

                if resolved_master_id is None:
                    return {
                        "success": True,
                        "master": master_name,
                        "year": year,
                        "month": month,
                        "available_dates": []
                    }

                cursor.execute(
                    """
                    SELECT user_id
                    FROM user_services
                    WHERE user_id = %s
                      AND service_id = ANY(%s)
                    GROUP BY user_id
                    HAVING COUNT(DISTINCT service_id) = %s
                    """,
                    (resolved_master_id, requested_service_ids, len(requested_service_ids)),
                )
                if not cursor.fetchone():
                    return {
                        "success": True,
                        "master": master_name,
                        "year": year,
                        "month": month,
                        "available_dates": []
                    }

                dates = schedule_service.get_available_dates(
                    master_name=str(resolved_master_id),
                    year=year,
                    month=month,
                    duration_minutes=resolved_duration,
                )

                return {
                    "success": True,
                    "master": master_name,
                    "year": year,
                    "month": month,
                    "available_dates": dates
                }
            finally:
                conn.close()

        dates = schedule_service.get_available_dates(
            master_name=master_name,
            year=year,
            month=month,
            duration_minutes=resolved_duration
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
