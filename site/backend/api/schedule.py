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
