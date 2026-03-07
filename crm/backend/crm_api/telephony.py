
from fastapi import APIRouter, Depends, HTTPException, Request, BackgroundTasks, UploadFile, File, Query
from typing import List, Optional, Dict, Any, Set
from pydantic import BaseModel
from db.connection import get_db_connection
from utils.utils import get_current_user
from datetime import datetime, timedelta
import json
import logging
import os
import shutil
import asyncio
import math

router = APIRouter()
logger = logging.getLogger(__name__)

# Директория для хранения записей звонков
RECORDINGS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static", "recordings")
os.makedirs(RECORDINGS_DIR, exist_ok=True)

class CallLogCreate(BaseModel):
    phone: str
    client_id: Optional[str] = None
    booking_id: Optional[int] = None
    direction: str = 'outbound' # inbound, outbound
    status: str = 'completed' # completed, missed, rejected, ongoing
    duration: int = 0
    recording_url: Optional[str] = None
    created_at: Optional[str] = None
    transcription: Optional[str] = None
    notes: Optional[str] = None
    external_id: Optional[str] = None
    manual_client_name: Optional[str] = None
    manual_manager_name: Optional[str] = None
    manual_service_name: Optional[str] = None

class CallLogUpdate(BaseModel):
    client_id: Optional[str] = None
    booking_id: Optional[int] = None
    notes: Optional[str] = None
    status: Optional[str] = None
    phone: Optional[str] = None
    direction: Optional[str] = None
    duration: Optional[int] = None
    manual_client_name: Optional[str] = None
    manual_manager_name: Optional[str] = None
    manual_service_name: Optional[str] = None
    recording_url: Optional[str] = None

class CallLogResponse(BaseModel):
    id: int
    client_name: Optional[str]
    client_id: Optional[str]
    booking_id: Optional[int]
    phone: str
    type: str
    status: str
    duration: int
    recording_url: Optional[str]
    recording_file: Optional[str]
    created_at: Optional[str]
    manager_name: Optional[str]
    transcription: Optional[str]
    notes: Optional[str]
    manual_client_name: Optional[str]
    manual_manager_name: Optional[str]
    manual_service_name: Optional[str]

class TelephonySettings(BaseModel):
    provider: str = 'generic' # binotel, onlinepbx, generic
    api_key: Optional[str] = None
    api_secret: Optional[str] = None
    webhook_token: Optional[str] = None
    is_active: bool = True


ALLOWED_TELEPHONY_ROLES = ["director", "admin", "sales"]


def _has_telephony_access(current_user: dict) -> bool:
    return current_user.get("role") in ALLOWED_TELEPHONY_ROLES


def _get_table_columns(cursor, table_name: str) -> Set[str]:
    cursor.execute("""
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = %s
    """, (table_name,))
    return {row[0] for row in cursor.fetchall()}


def _normalize_employee_name(value: Optional[str]) -> str:
    normalized_value = str(value or "").strip()
    if normalized_value:
        return normalized_value
    return "Unassigned"


def _normalize_custom_settings(raw_value: Any) -> Dict[str, Any]:
    if isinstance(raw_value, dict):
        return raw_value
    if isinstance(raw_value, str):
        try:
            parsed_value = json.loads(raw_value)
            if isinstance(parsed_value, dict):
                return parsed_value
        except (TypeError, ValueError):
            return {}
    return {}


def _get_saved_telephony_settings(cursor) -> Dict[str, Any]:
    cursor.execute("SELECT custom_settings FROM salon_settings WHERE id = 1")
    row = cursor.fetchone()
    custom_settings = _normalize_custom_settings(row[0] if row else {})
    saved_settings = custom_settings.get("telephony_settings", {})
    if isinstance(saved_settings, dict):
        return saved_settings
    return {}


def _save_telephony_settings(cursor, settings_payload: Dict[str, Any]) -> None:
    cursor.execute("SELECT custom_settings FROM salon_settings WHERE id = 1")
    row = cursor.fetchone()
    salon_custom_settings = _normalize_custom_settings(row[0] if row else {})
    salon_custom_settings["telephony_settings"] = settings_payload
    cursor.execute("""
        UPDATE salon_settings
        SET custom_settings = %s, updated_at = CURRENT_TIMESTAMP
        WHERE id = 1
    """, (salon_custom_settings,))


def _parse_weekdays(weekdays_raw: Optional[str]) -> Optional[Set[int]]:
    if not weekdays_raw:
        return None

    parsed_days: Set[int] = set()
    for chunk in str(weekdays_raw).split(","):
        stripped_chunk = chunk.strip()
        if stripped_chunk == "":
            continue
        if not stripped_chunk.isdigit():
            continue
        day_value = int(stripped_chunk)
        if 1 <= day_value <= 7:
            parsed_days.add(day_value)
    return parsed_days if parsed_days else None


def _is_hour_in_range(hour_value: int, start_hour: int, end_hour: int) -> bool:
    if start_hour == end_hour:
        return True
    if start_hour < end_hour:
        return start_hour <= hour_value < end_hour
    return hour_value >= start_hour or hour_value < end_hour


def _is_timestamp_allowed(
    ts_value: datetime,
    workday_start_hour: int,
    workday_end_hour: int,
    break_start_hour: Optional[int],
    break_end_hour: Optional[int],
    weekdays_filter: Optional[Set[int]]
) -> bool:
    if weekdays_filter is not None and ts_value.isoweekday() not in weekdays_filter:
        return False

    if not _is_hour_in_range(ts_value.hour, workday_start_hour, workday_end_hour):
        return False

    if break_start_hour is not None and break_end_hour is not None:
        if _is_hour_in_range(ts_value.hour, break_start_hour, break_end_hour):
            return False

    return True


def _response_summary(values_seconds: List[float]) -> Dict[str, Any]:
    if not values_seconds:
        return {
            "count": 0,
            "avg_seconds": 0.0,
            "min_seconds": 0.0,
            "max_seconds": 0.0,
            "avg_minutes": 0.0,
            "min_minutes": 0.0,
            "max_minutes": 0.0,
        }

    values_count = len(values_seconds)
    values_min = min(values_seconds)
    values_max = max(values_seconds)
    values_avg = sum(values_seconds) / values_count

    return {
        "count": values_count,
        "avg_seconds": round(values_avg, 2),
        "min_seconds": round(values_min, 2),
        "max_seconds": round(values_max, 2),
        "avg_minutes": round(values_avg / 60.0, 2),
        "min_minutes": round(values_min / 60.0, 2),
        "max_minutes": round(values_max / 60.0, 2),
    }


def _percentile(sorted_values: List[float], percentile: float) -> float:
    if not sorted_values:
        return 0.0
    if len(sorted_values) == 1:
        return sorted_values[0]

    position = (len(sorted_values) - 1) * percentile
    lower_index = int(math.floor(position))
    upper_index = int(math.ceil(position))
    if lower_index == upper_index:
        return sorted_values[lower_index]

    lower_value = sorted_values[lower_index]
    upper_value = sorted_values[upper_index]
    fraction = position - lower_index
    return lower_value + (upper_value - lower_value) * fraction


def _build_histogram_kde(values_seconds: List[float]) -> Dict[str, Any]:
    if not values_seconds:
        return {
            "sample_size": 0,
            "histogram": [],
            "kde": [],
            "min_minutes": 0.0,
            "max_minutes": 0.0,
        }

    minutes_values = [max(0.0, value / 60.0) for value in values_seconds]
    minutes_values.sort()

    sample_size = len(minutes_values)
    min_value = minutes_values[0]
    max_value = minutes_values[-1]

    if math.isclose(max_value, min_value):
        max_value = min_value + 1.0

    bin_count = max(6, min(24, int(math.sqrt(sample_size)) + 1))
    bin_width = (max_value - min_value) / float(bin_count)
    if bin_width <= 0:
        bin_width = 1.0

    bins = [0] * bin_count
    for value in minutes_values:
        relative_position = (value - min_value) / bin_width
        bin_index = int(relative_position)
        if bin_index >= bin_count:
            bin_index = bin_count - 1
        if bin_index < 0:
            bin_index = 0
        bins[bin_index] += 1

    histogram = []
    for bin_index, bin_value in enumerate(bins):
        bin_start = min_value + (bin_index * bin_width)
        bin_end = bin_start + bin_width
        bin_center = bin_start + (bin_width / 2.0)
        histogram.append({
            "bin_start_minutes": round(bin_start, 2),
            "bin_end_minutes": round(bin_end, 2),
            "x_minutes": round(bin_center, 2),
            "count": int(bin_value),
        })

    p25 = _percentile(minutes_values, 0.25)
    p75 = _percentile(minutes_values, 0.75)
    iqr = p75 - p25
    std_guess = max((iqr / 1.349) if iqr > 0 else 0.0, bin_width)
    bandwidth = 1.06 * std_guess * (sample_size ** (-1.0 / 5.0))
    if bandwidth <= 0:
        bandwidth = max(bin_width, 1.0)

    gaussian_scale = 1.0 / (bandwidth * math.sqrt(2.0 * math.pi))
    kde_points: List[Dict[str, float]] = []
    total_points = 80
    for point_index in range(total_points):
        point_x = min_value + ((max_value - min_value) * point_index / float(total_points - 1))
        kernel_sum = 0.0
        for value in minutes_values:
            z_value = (point_x - value) / bandwidth
            kernel_sum += math.exp(-0.5 * (z_value ** 2))
        density = (kernel_sum / float(sample_size)) * gaussian_scale
        scaled_density = density * sample_size * bin_width
        kde_points.append({
            "x_minutes": round(point_x, 2),
            "y": round(scaled_density, 4),
        })

    return {
        "sample_size": sample_size,
        "histogram": histogram,
        "kde": kde_points,
        "min_minutes": round(min_value, 2),
        "max_minutes": round(max_value, 2),
    }


def _to_iso_date(ts_value: datetime) -> str:
    return ts_value.date().isoformat()

@router.get("/telephony/settings")
async def get_telephony_settings(current_user: dict = Depends(get_current_user)):
    # 🔒 Только director, admin, sales могут видеть настройки телефонии
    if not _has_telephony_access(current_user):
        raise HTTPException(status_code=403, detail="Access denied")
    
    conn = get_db_connection()
    c = conn.cursor()
    try:
        return _get_saved_telephony_settings(c)
    except HTTPException:
        raise
    except Exception as e:
        logger.warning(f"Could not fetch telephony settings from custom_settings: {e}")
        return {}
    finally:
        conn.close()

@router.post("/telephony/settings")
async def save_telephony_settings(settings: TelephonySettings, current_user: dict = Depends(get_current_user)):
    if not _has_telephony_access(current_user):
        raise HTTPException(status_code=403, detail="Access denied")

    conn = get_db_connection()
    c = conn.cursor()
    try:
        _save_telephony_settings(c, settings.model_dump())
        conn.commit()
        return {"success": True}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.post("/telephony/test-integration")
async def test_telephony_integration(settings: TelephonySettings, current_user: dict = Depends(get_current_user)):
    if not _has_telephony_access(current_user):
        raise HTTPException(status_code=403, detail="Access denied")

    # Simple validation logic for now
    if settings.provider == 'binotel':
        if not settings.api_key or not settings.api_secret:
            return {"success": False, "error": "API Key и Secret обязательны для Binotel"}
    elif settings.provider == 'onlinepbx':
        if not settings.api_key:
            return {"success": False, "error": "API Key обязателен для OnlinePBX"}
    elif settings.provider == 'twilio':
        if not settings.api_key or not settings.api_secret:
            return {"success": False, "error": "Account SID и Auth Token обязательны для Twilio"}
    
    # In real world, we would call the provider's API here
    # Mocking a successful validation for non-empty keys
    await asyncio.sleep(1) # Simulate network delay
    
    return {"success": True, "message": f"Соединение с {settings.provider} успешно проверено"}

@router.get("/telephony/calls", response_model=List[CallLogResponse])
async def get_calls(
    limit: int = 50,
    offset: int = 0,
    search: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    booking_id: Optional[int] = None,
    sort_by: Optional[str] = 'created_at',
    order: Optional[str] = 'desc',
    status: Optional[str] = None,
    direction: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    # 🔒 Только director, admin, sales могут видеть звонки
    if not _has_telephony_access(current_user):
        raise HTTPException(status_code=403, detail="Access denied")
    conn = get_db_connection()
    c = conn.cursor()
    try:
        query = """
            SELECT 
                cl.id,
                COALESCE(cl.manual_client_name, c.name, c.username, 'Неизвестный') as client_name,
                cl.client_id,
                cl.booking_id,
                cl.phone,
                cl.direction as type,
                cl.status,
                COALESCE(cl.duration, 0) as duration,
                cl.recording_url,
                cl.recording_file,
                cl.created_at,
                cl.transcription,
                cl.notes,
                COALESCE(cl.manual_manager_name, b.master) as manager_name,
                cl.manual_client_name,
                cl.manual_manager_name,
                cl.manual_service_name
            FROM call_logs cl
            LEFT JOIN clients c ON c.instagram_id = cl.client_id
            LEFT JOIN bookings b ON b.id = cl.booking_id
            WHERE 1=1
        """
        params = []
        
        if search:
            query += """
                AND (
                    cl.phone ILIKE %s OR
                    c.name ILIKE %s OR
                    c.username ILIKE %s OR
                    cl.manual_client_name ILIKE %s OR
                    cl.manual_manager_name ILIKE %s
                )
            """
            params.extend([f"%{search}%"] * 5)

        if start_date:
            query += " AND cl.created_at >= %s"
            params.append(start_date)
            
        if end_date:
             query += " AND cl.created_at <= %s"
             if len(end_date) == 10: 
                 end_date += " 23:59:59"
             params.append(end_date)

        if booking_id:
            query += " AND cl.booking_id = %s"
            params.append(booking_id)

        if status and status != 'all':
            query += " AND cl.status = %s"
            params.append(status)

        if direction and direction != 'all':
            query += " AND cl.direction = %s"
            params.append(direction)
            
        # Sorting
        allowed_sort_fields = {
            'created_at': 'cl.created_at',
            'duration': 'cl.duration',
            'client_name': 'client_name',
            'status': 'cl.status',
            'type': 'cl.direction',
            'manager_name': 'b.master'
        }
        sort_column = allowed_sort_fields.get(sort_by, 'cl.created_at')
        sort_direction = 'DESC' if order == 'desc' else 'ASC'
        
        query += f" ORDER BY {sort_column} {sort_direction} LIMIT %s OFFSET %s"
        params.extend([limit, offset])
        
        c.execute(query, params)
        rows = c.fetchall()
        
        return [
            {
                "id": row[0],
                "client_name": row[1],
                "client_id": row[2],
                "booking_id": row[3],
                "phone": row[4],
                "type": row[5],
                "status": row[6],
                "duration": row[7] or 0,
                "recording_url": row[8],
                "recording_file": row[9],
                "created_at": row[10].isoformat() if row[10] else None,
                "transcription": row[11],
                "notes": row[12],
                "manager_name": row[13],
                "manual_client_name": row[14],
                "manual_manager_name": row[15],
                "manual_service_name": row[16]
            }
            for row in rows
        ]
    except Exception as e:
        logger.error(f"Error fetching calls: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.get("/telephony/stats")
async def get_telephony_stats(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    # 🔒 Только director, admin, sales
    if not _has_telephony_access(current_user):
        raise HTTPException(status_code=403, detail="Access denied")
    conn = get_db_connection()
    c = conn.cursor()
    try:
        query = """
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN direction = 'inbound' THEN 1 ELSE 0 END) as inbound,
                SUM(CASE WHEN direction = 'outbound' THEN 1 ELSE 0 END) as outbound,
                SUM(CASE WHEN status = 'missed' THEN 1 ELSE 0 END) as missed
            FROM call_logs
            WHERE 1=1
        """
        params = []
        if start_date:
            query += " AND created_at >= %s"
            params.append(start_date)
        if end_date:
            query += " AND created_at <= %s"
            if len(end_date) == 10:
                 end_date += " 23:59:59"
            params.append(end_date)

        c.execute(query, params)
        row = c.fetchone()
        return {
            "total_calls": row[0] or 0,
            "inbound": row[1] or 0,
            "outbound": row[2] or 0,
            "missed": row[3] or 0
        }
    except Exception as e:
        logger.error(f"Error fetching telephony stats: {e}")
        return {"total_calls": 0, "inbound": 0, "outbound": 0, "missed": 0}
    finally:
        conn.close()

@router.get("/telephony/analytics")
async def get_telephony_analytics(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    manager_name: Optional[str] = None,
    status: Optional[str] = None,
    direction: Optional[str] = None,
    min_duration: Optional[int] = None,
    max_duration: Optional[int] = None,
    current_user: dict = Depends(get_current_user)
):
    # 🔒 Только director, admin, sales
    if not _has_telephony_access(current_user):
        raise HTTPException(status_code=403, detail="Access denied")

    conn = get_db_connection()
    c = conn.cursor()
    try:
        query = """
            SELECT 
                DATE(cl.created_at) as date,
                SUM(CASE WHEN cl.direction = 'inbound' THEN 1 ELSE 0 END) as inbound,
                SUM(CASE WHEN cl.direction = 'outbound' THEN 1 ELSE 0 END) as outbound,
                SUM(CASE WHEN cl.status = 'missed' THEN 1 ELSE 0 END) as missed,
                AVG(cl.duration) as avg_duration
            FROM call_logs cl
            LEFT JOIN bookings b ON b.id = cl.booking_id
            WHERE 1=1
        """
        params = []
        if start_date:
            query += " AND cl.created_at >= %s"
            params.append(start_date)
        if end_date:
            query += " AND cl.created_at <= %s"
            if len(end_date) == 10:
                end_date += " 23:59:59"
            params.append(end_date)
            
        if manager_name:
            query += " AND (b.master = %s OR cl.manual_manager_name = %s)"
            params.extend([manager_name, manager_name])

        if status and status != 'all':
            query += " AND cl.status = %s"
            params.append(status)

        if direction and direction != 'all':
            query += " AND cl.direction = %s"
            params.append(direction)
            
        if min_duration is not None:
            query += " AND cl.duration >= %s"
            params.append(min_duration)

        if max_duration is not None:
            query += " AND cl.duration <= %s"
            params.append(max_duration)

        query += " GROUP BY DATE(cl.created_at) ORDER BY date"
        
        c.execute(query, params)
        rows = c.fetchall()
        
        return [
            {
                "date": row[0].isoformat() if row[0] else None,
                "inbound": row[1],
                "outbound": row[2],
                "missed": row[3],
                "avg_duration": round(row[4] or 0, 2)
            }
            for row in rows
        ]
    except Exception as e:
        logger.error(f"Error fetching analytics: {e}")
        return []
    finally:
        conn.close()


@router.get("/telephony/performance")
async def get_telephony_performance(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    status: Optional[str] = None,
    direction: Optional[str] = None,
    min_duration: Optional[int] = None,
    max_duration: Optional[int] = None,
    employee_name: Optional[str] = None,
    workday_start_hour: int = Query(0, ge=0, le=23),
    workday_end_hour: int = Query(24, ge=1, le=24),
    break_start_hour: Optional[int] = Query(None, ge=0, le=23),
    break_end_hour: Optional[int] = Query(None, ge=1, le=24),
    weekdays: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    if not _has_telephony_access(current_user):
        raise HTTPException(status_code=403, detail="Access denied")

    if (break_start_hour is None) != (break_end_hour is None):
        raise HTTPException(status_code=400, detail="break_start_hour and break_end_hour must be provided together")

    selected_employee_name: Optional[str] = None
    if employee_name:
        selected_employee_name = _normalize_employee_name(employee_name)

    weekdays_filter = _parse_weekdays(weekdays)

    normalized_end_date = end_date
    if normalized_end_date and len(normalized_end_date) == 10:
        normalized_end_date = f"{normalized_end_date} 23:59:59"

    conn = get_db_connection()
    c = conn.cursor()
    try:
        call_stats_query = """
            SELECT
                cl.id,
                cl.client_id,
                cl.phone,
                COALESCE(NULLIF(TRIM(cl.manual_client_name), ''), NULLIF(TRIM(cl.phone), ''), 'Unknown') as caller_name,
                cl.direction,
                cl.status,
                COALESCE(cl.duration, 0) as duration,
                cl.created_at,
                COALESCE(
                    NULLIF(TRIM(cl.manual_manager_name), ''),
                    NULLIF(TRIM(b.master), ''),
                    'Unassigned'
                ) as manager_name
            FROM call_logs cl
            LEFT JOIN bookings b ON b.id = cl.booking_id
            WHERE 1=1
        """
        call_stats_params: List[Any] = []
        if start_date:
            call_stats_query += " AND cl.created_at >= %s"
            call_stats_params.append(start_date)
        if normalized_end_date:
            call_stats_query += " AND cl.created_at <= %s"
            call_stats_params.append(normalized_end_date)
        if status and status != "all":
            call_stats_query += " AND cl.status = %s"
            call_stats_params.append(status)
        if direction and direction != "all":
            call_stats_query += " AND cl.direction = %s"
            call_stats_params.append(direction)
        if min_duration is not None:
            call_stats_query += " AND cl.duration >= %s"
            call_stats_params.append(min_duration)
        if max_duration is not None:
            call_stats_query += " AND cl.duration <= %s"
            call_stats_params.append(max_duration)
        call_stats_query += " ORDER BY cl.created_at ASC"

        c.execute(call_stats_query, call_stats_params)
        call_stats_rows = c.fetchall()

        response_calls_query = """
            SELECT
                cl.id,
                cl.client_id,
                cl.phone,
                cl.direction,
                cl.status,
                cl.created_at,
                COALESCE(
                    NULLIF(TRIM(cl.manual_manager_name), ''),
                    NULLIF(TRIM(b.master), ''),
                    'Unassigned'
                ) as manager_name
            FROM call_logs cl
            LEFT JOIN bookings b ON b.id = cl.booking_id
            WHERE 1=1
        """
        response_calls_params: List[Any] = []
        if start_date:
            response_calls_query += " AND cl.created_at >= %s"
            response_calls_params.append(start_date)
        if normalized_end_date:
            response_calls_query += " AND cl.created_at <= %s"
            response_calls_params.append(normalized_end_date)
        response_calls_query += " ORDER BY cl.created_at ASC"

        c.execute(response_calls_query, response_calls_params)
        response_calls_rows = c.fetchall()

        chat_history_where_clauses = ["ch.instagram_id IS NOT NULL"]
        chat_history_params: List[Any] = []
        if start_date:
            chat_history_where_clauses.append("ch.timestamp >= %s")
            chat_history_params.append(start_date)
        if normalized_end_date:
            chat_history_where_clauses.append("ch.timestamp <= %s")
            chat_history_params.append(normalized_end_date)

        messenger_where_clauses = ["mm.client_id IS NOT NULL"]
        messenger_params: List[Any] = []
        if start_date:
            messenger_where_clauses.append("mm.created_at >= %s")
            messenger_params.append(start_date)
        if normalized_end_date:
            messenger_where_clauses.append("mm.created_at <= %s")
            messenger_params.append(normalized_end_date)

        chat_messages_query = f"""
            SELECT
                ch.instagram_id as client_id,
                ch.timestamp as created_at,
                CASE WHEN ch.sender = 'client' THEN 'client' ELSE 'staff' END as actor,
                COALESCE(
                    NULLIF(TRIM(u.full_name), ''),
                    NULLIF(TRIM(u.username), ''),
                    'Unassigned'
                ) as manager_name
            FROM chat_history ch
            LEFT JOIN clients cc ON cc.instagram_id = ch.instagram_id
            LEFT JOIN users u ON u.id = cc.assigned_employee_id
            WHERE {" AND ".join(chat_history_where_clauses)}

            UNION ALL

            SELECT
                mm.client_id as client_id,
                mm.created_at as created_at,
                CASE WHEN mm.sender_type = 'client' THEN 'client' ELSE 'staff' END as actor,
                COALESCE(
                    NULLIF(TRIM(u2.full_name), ''),
                    NULLIF(TRIM(u2.username), ''),
                    'Unassigned'
                ) as manager_name
            FROM messenger_messages mm
            LEFT JOIN clients cc2 ON cc2.instagram_id = mm.client_id
            LEFT JOIN users u2 ON u2.id = cc2.assigned_employee_id
            WHERE {" AND ".join(messenger_where_clauses)}
            ORDER BY client_id, created_at
        """
        c.execute(chat_messages_query, chat_history_params + messenger_params)
        chat_rows = c.fetchall()

    except Exception as e:
        logger.error(f"Error fetching telephony performance data: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

    call_stats_events: List[Dict[str, Any]] = []
    for row in call_stats_rows:
        event_time = row[7]
        if not event_time:
            continue
        if not _is_timestamp_allowed(
            event_time,
            workday_start_hour,
            workday_end_hour,
            break_start_hour,
            break_end_hour,
            weekdays_filter
        ):
            continue
        call_stats_events.append({
            "id": row[0],
            "client_id": row[1],
            "phone": row[2],
            "caller_name": row[3],
            "direction": row[4],
            "status": row[5],
            "duration": int(row[6] or 0),
            "created_at": event_time,
            "manager_name": _normalize_employee_name(row[8]),
        })

    response_call_events: List[Dict[str, Any]] = []
    for row in response_calls_rows:
        event_time = row[5]
        if not event_time:
            continue
        response_call_events.append({
            "id": row[0],
            "client_id": row[1],
            "phone": row[2],
            "direction": row[3],
            "status": row[4],
            "created_at": event_time,
            "manager_name": _normalize_employee_name(row[6]),
        })

    call_events_by_contact: Dict[str, List[Dict[str, Any]]] = {}
    for call_event in response_call_events:
        contact_key = str(call_event.get("client_id") or "").strip()
        if contact_key == "":
            contact_key = str(call_event.get("phone") or "").strip()
        if contact_key == "":
            contact_key = f"call_id:{call_event['id']}"
        if contact_key not in call_events_by_contact:
            call_events_by_contact[contact_key] = []
        call_events_by_contact[contact_key].append(call_event)

    call_response_records: List[Dict[str, Any]] = []
    for contact_events in call_events_by_contact.values():
        contact_events.sort(key=lambda item: item["created_at"])
        for event_index, start_event in enumerate(contact_events):
            # Response time should be measured only from inbound calls.
            is_incoming_call = start_event["direction"] == "inbound"
            if not is_incoming_call:
                continue
            if not _is_timestamp_allowed(
                start_event["created_at"],
                workday_start_hour,
                workday_end_hour,
                break_start_hour,
                break_end_hour,
                weekdays_filter
            ):
                continue

            response_event: Optional[Dict[str, Any]] = None
            for next_event in contact_events[event_index + 1:]:
                if next_event["direction"] == "outbound":
                    response_event = next_event
                    break

            if response_event is None:
                continue

            response_seconds = (response_event["created_at"] - start_event["created_at"]).total_seconds()
            if response_seconds < 0:
                continue

            call_response_records.append({
                "date": _to_iso_date(start_event["created_at"]),
                "seconds": float(response_seconds),
                "manager_name": _normalize_employee_name(response_event["manager_name"]),
            })

    chat_messages_by_client: Dict[str, List[Dict[str, Any]]] = {}
    for row in chat_rows:
        client_key = str(row[0] or "").strip()
        if client_key == "":
            continue
        created_at_value = row[1]
        if not created_at_value:
            continue

        if client_key not in chat_messages_by_client:
            chat_messages_by_client[client_key] = []
        chat_messages_by_client[client_key].append({
            "created_at": created_at_value,
            "actor": "client" if row[2] == "client" else "staff",
            "manager_name": _normalize_employee_name(row[3]),
        })

    chat_client_message_counts: Dict[str, int] = {}
    chat_response_records: List[Dict[str, Any]] = []
    total_chat_client_messages = 0

    for client_messages in chat_messages_by_client.values():
        client_messages.sort(key=lambda item: item["created_at"])
        for message_index, client_message in enumerate(client_messages):
            if client_message["actor"] != "client":
                continue

            client_message_time = client_message["created_at"]
            if not _is_timestamp_allowed(
                client_message_time,
                workday_start_hour,
                workday_end_hour,
                break_start_hour,
                break_end_hour,
                weekdays_filter
            ):
                continue

            message_manager = _normalize_employee_name(client_message["manager_name"])
            chat_client_message_counts[message_manager] = chat_client_message_counts.get(message_manager, 0) + 1
            total_chat_client_messages += 1

            response_message: Optional[Dict[str, Any]] = None
            for next_message in client_messages[message_index + 1:]:
                if next_message["actor"] == "staff":
                    response_message = next_message
                    break

            if response_message is None:
                continue

            response_seconds = (response_message["created_at"] - client_message_time).total_seconds()
            if response_seconds < 0:
                continue

            chat_response_records.append({
                "date": _to_iso_date(client_message_time),
                "seconds": float(response_seconds),
                "manager_name": _normalize_employee_name(response_message["manager_name"]),
            })

    employee_calls_stats: Dict[str, Dict[str, int]] = {}
    for call_event in call_stats_events:
        manager_name_value = _normalize_employee_name(call_event["manager_name"])
        if manager_name_value not in employee_calls_stats:
            employee_calls_stats[manager_name_value] = {
                "calls_total": 0,
                "calls_inbound": 0,
                "calls_outbound": 0,
                "calls_missed": 0,
            }

        employee_calls_stats[manager_name_value]["calls_total"] += 1
        if call_event["direction"] == "inbound":
            employee_calls_stats[manager_name_value]["calls_inbound"] += 1
        if call_event["direction"] == "outbound":
            employee_calls_stats[manager_name_value]["calls_outbound"] += 1
        if call_event["status"] == "missed":
            employee_calls_stats[manager_name_value]["calls_missed"] += 1

    call_response_by_manager: Dict[str, List[float]] = {}
    for response_record in call_response_records:
        manager_key = _normalize_employee_name(response_record["manager_name"])
        if manager_key not in call_response_by_manager:
            call_response_by_manager[manager_key] = []
        call_response_by_manager[manager_key].append(response_record["seconds"])

    chat_response_by_manager: Dict[str, List[float]] = {}
    for response_record in chat_response_records:
        manager_key = _normalize_employee_name(response_record["manager_name"])
        if manager_key not in chat_response_by_manager:
            chat_response_by_manager[manager_key] = []
        chat_response_by_manager[manager_key].append(response_record["seconds"])

    manager_names_set: Set[str] = set()
    manager_names_set.update(employee_calls_stats.keys())
    manager_names_set.update(chat_client_message_counts.keys())
    manager_names_set.update(call_response_by_manager.keys())
    manager_names_set.update(chat_response_by_manager.keys())
    if selected_employee_name:
        manager_names_set.add(selected_employee_name)

    employees_data: List[Dict[str, Any]] = []
    for manager_name_value in manager_names_set:
        call_stats = employee_calls_stats.get(manager_name_value, {
            "calls_total": 0,
            "calls_inbound": 0,
            "calls_outbound": 0,
            "calls_missed": 0,
        })
        call_values = call_response_by_manager.get(manager_name_value, [])
        chat_values = chat_response_by_manager.get(manager_name_value, [])
        combined_values = call_values + chat_values

        employees_data.append({
            "employee_name": manager_name_value,
            "calls_total": call_stats["calls_total"],
            "calls_inbound": call_stats["calls_inbound"],
            "calls_outbound": call_stats["calls_outbound"],
            "calls_missed": call_stats["calls_missed"],
            "chat_client_messages": chat_client_message_counts.get(manager_name_value, 0),
            "call_response": _response_summary(call_values),
            "chat_response": _response_summary(chat_values),
            "combined_response": _response_summary(combined_values),
        })

    employees_data.sort(
        key=lambda item: (
            item["calls_total"] + item["chat_client_messages"],
            item["combined_response"]["count"]
        ),
        reverse=True
    )

    filtered_call_stats_events = call_stats_events
    filtered_call_response_records = call_response_records
    filtered_chat_response_records = chat_response_records
    filtered_chat_client_messages_total = total_chat_client_messages

    if selected_employee_name:
        filtered_call_stats_events = [
            event_item for event_item in call_stats_events
            if _normalize_employee_name(event_item.get("manager_name")) == selected_employee_name
        ]
        filtered_call_response_records = [
            record_item for record_item in call_response_records
            if _normalize_employee_name(record_item.get("manager_name")) == selected_employee_name
        ]
        filtered_chat_response_records = [
            record_item for record_item in chat_response_records
            if _normalize_employee_name(record_item.get("manager_name")) == selected_employee_name
        ]
        filtered_chat_client_messages_total = chat_client_message_counts.get(selected_employee_name, 0)

    filtered_top_callers_map: Dict[str, int] = {}
    for call_event in filtered_call_stats_events:
        caller_name_value = str(call_event.get("caller_name") or "").strip()
        if caller_name_value == "":
            caller_name_value = str(call_event.get("phone") or "").strip() or "Unknown"
        filtered_top_callers_map[caller_name_value] = filtered_top_callers_map.get(caller_name_value, 0) + 1

    top_callers = sorted(filtered_top_callers_map.items(), key=lambda item: item[1], reverse=True)
    top_callers_data = [
        {"caller_name": caller_name, "calls_total": int(calls_total)}
        for caller_name, calls_total in top_callers[:20]
    ]

    daily_response_map: Dict[str, Dict[str, List[float]]] = {}
    for call_record in filtered_call_response_records:
        date_key = call_record["date"]
        if date_key not in daily_response_map:
            daily_response_map[date_key] = {"calls": [], "chat": []}
        daily_response_map[date_key]["calls"].append(call_record["seconds"])

    for chat_record in filtered_chat_response_records:
        date_key = chat_record["date"]
        if date_key not in daily_response_map:
            daily_response_map[date_key] = {"calls": [], "chat": []}
        daily_response_map[date_key]["chat"].append(chat_record["seconds"])

    daily_response_data: List[Dict[str, Any]] = []
    for date_key in sorted(daily_response_map.keys()):
        call_values = daily_response_map[date_key]["calls"]
        chat_values = daily_response_map[date_key]["chat"]
        call_summary = _response_summary(call_values)
        chat_summary = _response_summary(chat_values)
        daily_response_data.append({
            "date": date_key,
            "calls_count": call_summary["count"],
            "calls_avg_seconds": call_summary["avg_seconds"],
            "calls_min_seconds": call_summary["min_seconds"],
            "calls_max_seconds": call_summary["max_seconds"],
            "chat_count": chat_summary["count"],
            "chat_avg_seconds": chat_summary["avg_seconds"],
            "chat_min_seconds": chat_summary["min_seconds"],
            "chat_max_seconds": chat_summary["max_seconds"],
        })

    team_call_values = [record["seconds"] for record in filtered_call_response_records]
    team_chat_values = [record["seconds"] for record in filtered_chat_response_records]
    team_combined_values = team_call_values + team_chat_values

    selected_call_values: List[float] = []
    selected_chat_values: List[float] = []
    if selected_employee_name:
        selected_call_values = call_response_by_manager.get(selected_employee_name, [])
        selected_chat_values = chat_response_by_manager.get(selected_employee_name, [])

    return {
        "summary": {
            "total_calls": len(filtered_call_stats_events),
            "total_chat_client_messages": filtered_chat_client_messages_total,
            "call_response": _response_summary(team_call_values),
            "chat_response": _response_summary(team_chat_values),
            "combined_response": _response_summary(team_combined_values),
        },
        "time_window": {
            "workday_start_hour": workday_start_hour,
            "workday_end_hour": workday_end_hour,
            "break_start_hour": break_start_hour,
            "break_end_hour": break_end_hour,
            "weekdays": sorted(list(weekdays_filter)) if weekdays_filter else [],
            "start_date": start_date,
            "end_date": normalized_end_date,
        },
        "selected_employee_name": selected_employee_name,
        "employees": employees_data,
        "top_callers": top_callers_data,
        "daily_response": daily_response_data,
        "distributions": {
            "calls_team": _build_histogram_kde(team_call_values),
            "chat_team": _build_histogram_kde(team_chat_values),
            "calls_selected_employee": _build_histogram_kde(selected_call_values) if selected_employee_name else None,
            "chat_selected_employee": _build_histogram_kde(selected_chat_values) if selected_employee_name else None,
        },
    }


@router.post("/telephony/calls")
async def create_call(call: CallLogCreate, current_user: dict = Depends(get_current_user)):
    if not _has_telephony_access(current_user):
        raise HTTPException(status_code=403, detail="Access denied")

    conn = get_db_connection()
    c = conn.cursor()
    try:
        call_logs_columns = _get_table_columns(c, "call_logs")
        has_folder_id = "folder_id" in call_logs_columns
        has_custom_name = "custom_name" in call_logs_columns
        allowed_directions = {"inbound", "outbound"}
        allowed_statuses = {"completed", "missed", "rejected", "ongoing"}
        resolved_direction = call.direction if call.direction in allowed_directions else "outbound"
        resolved_status = call.status if call.status in allowed_statuses else "completed"
        resolved_duration = int(call.duration) if call.duration and call.duration > 0 else 0

        # Auto-link client if not provided
        if not call.client_id and call.phone:
            clean_phone = ''.join(filter(str.isdigit, call.phone))
            if len(clean_phone) > 6:
                c.execute("SELECT instagram_id FROM clients WHERE phone LIKE %s LIMIT 1", (f"%{clean_phone}%",))
                row = c.fetchone()
                if row:
                    call.client_id = row[0]

        # Auto-link booking if not provided but client_id is available
        if not call.booking_id and call.client_id:
            created_at = call.created_at if call.created_at else datetime.now().isoformat()
            call_time = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
            
            # Search for bookings within ±2 hours of call time
            time_window_start = (call_time - timedelta(hours=2)).isoformat()
            time_window_end = (call_time + timedelta(hours=2)).isoformat()
            
            c.execute("""
                SELECT id FROM bookings 
                WHERE instagram_id = %s
                AND datetime BETWEEN %s AND %s
                ORDER BY ABS(EXTRACT(EPOCH FROM (datetime - %s::timestamp)))
                LIMIT 1
            """, (call.client_id, time_window_start, time_window_end, created_at))
            
            booking_row = c.fetchone()
            if booking_row:
                call.booking_id = booking_row[0]

        created_at = call.created_at if call.created_at else datetime.now().isoformat()

        # Получить ID папки "Телефония" для автоматического назначения
        folder_id = None
        try:
            c.execute("SELECT id FROM recording_folders WHERE name = 'Телефония' AND parent_id IS NULL AND is_deleted = FALSE LIMIT 1")
            folder_row = c.fetchone()
            if folder_row:
                folder_id = folder_row[0]
        except Exception:
            pass  # Если таблица еще не создана

        # Генерируем автоматическое имя для записи если есть запись
        custom_name = None
        if call.recording_url:
            # Формат: {client_name} - {manager_name} - DD.MM.YYYY HH:MM
            client_name = call.manual_client_name if call.manual_client_name else "Клиент"
            manager_name = call.manual_manager_name if call.manual_manager_name else "Менеджер"
            call_datetime = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
            date_str = call_datetime.strftime('%d.%m.%Y %H:%M')
            custom_name = f"{client_name} - {manager_name} - {date_str}"

        insert_fields = [
            "phone", "client_id", "booking_id", "direction", "status", "duration", "recording_url",
            "created_at", "transcription", "notes", "external_id",
            "manual_client_name", "manual_manager_name", "manual_service_name",
        ]
        insert_values = [
            call.phone, call.client_id, call.booking_id, resolved_direction, resolved_status, resolved_duration,
            call.recording_url, created_at, call.transcription, call.notes, call.external_id,
            call.manual_client_name, call.manual_manager_name, call.manual_service_name,
        ]

        if has_folder_id:
            insert_fields.append("folder_id")
            insert_values.append(folder_id)
        if has_custom_name:
            insert_fields.append("custom_name")
            insert_values.append(custom_name)

        placeholders = ", ".join(["%s"] * len(insert_fields))
        c.execute(f"""
            INSERT INTO call_logs ({", ".join(insert_fields)})
            VALUES ({placeholders})
            RETURNING id
        """, insert_values)
        call_id = c.fetchone()[0]
        conn.commit()
        return {"id": call_id, "success": True}
    except Exception as e:
        conn.rollback()
        logger.error(f"Error creating call: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.post("/telephony/upload-recording/{call_id}")
async def upload_recording(
    call_id: int,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Upload audio recording file for a call"""
    if not _has_telephony_access(current_user):
        raise HTTPException(status_code=403, detail="Access denied")

    try:
        # Validate file type
        allowed_extensions = ['.mp3', '.wav', '.ogg', '.m4a', '.webm']
        filename = file.filename if isinstance(file.filename, str) else ""
        file_ext = os.path.splitext(filename)[1].lower()
        if file_ext not in allowed_extensions:
            raise HTTPException(status_code=400, detail=f"Invalid file type. Allowed: {', '.join(allowed_extensions)}")
        
        # Generate unique filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"call_{call_id}_{timestamp}{file_ext}"
        file_path = os.path.join(RECORDINGS_DIR, filename)
        
        # Save file
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Get file size
        file_size = os.path.getsize(file_path)

        # Update database
        conn = get_db_connection()
        c = conn.cursor()
        try:
            call_logs_columns = _get_table_columns(c, "call_logs")
            update_parts = ["recording_file = %s"]
            update_params = [filename]

            if "file_size" in call_logs_columns:
                update_parts.append("file_size = %s")
                update_params.append(file_size)
            if "file_format" in call_logs_columns:
                update_parts.append("file_format = %s")
                update_params.append(file_ext.lstrip('.'))

            update_params.append(call_id)
            c.execute(f"""
                UPDATE call_logs
                SET {", ".join(update_parts)}
                WHERE id = %s
            """, update_params)
            conn.commit()
        finally:
            conn.close()

        return {
            "success": True,
            "filename": filename,
            "url": f"/static/recordings/{filename}",
            "file_size": file_size,
            "file_format": file_ext.lstrip('.')
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading recording: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/telephony/calls/{call_id}")
async def update_call(call_id: int, update: CallLogUpdate, current_user: dict = Depends(get_current_user)):
    if not _has_telephony_access(current_user):
        raise HTTPException(status_code=403, detail="Access denied")

    conn = get_db_connection()
    c = conn.cursor()
    try:
        fields = []
        params = []
        if update.notes is not None:
            fields.append("notes = %s")
            params.append(update.notes)
        if update.client_id is not None:
            fields.append("client_id = %s")
            params.append(update.client_id)
        if update.booking_id is not None:
            fields.append("booking_id = %s")
            params.append(update.booking_id)
        if update.status is not None:
             allowed_statuses = {"completed", "missed", "rejected", "ongoing"}
             resolved_status = update.status if update.status in allowed_statuses else "completed"
             fields.append("status = %s")
             params.append(resolved_status)
        if update.phone is not None:
             fields.append("phone = %s")
             params.append(update.phone)
        if update.direction is not None:
             allowed_directions = {"inbound", "outbound"}
             resolved_direction = update.direction if update.direction in allowed_directions else "outbound"
             fields.append("direction = %s")
             params.append(resolved_direction)
        if update.duration is not None:
             resolved_duration = int(update.duration) if update.duration > 0 else 0
             fields.append("duration = %s")
             params.append(resolved_duration)
        if update.manual_client_name is not None:
             fields.append("manual_client_name = %s")
             params.append(update.manual_client_name)
        if update.manual_manager_name is not None:
             fields.append("manual_manager_name = %s")
             params.append(update.manual_manager_name)
        if update.manual_service_name is not None:
             fields.append("manual_service_name = %s")
             params.append(update.manual_service_name)
        if update.recording_url is not None:
             fields.append("recording_url = %s")
             params.append(update.recording_url)
        
        if not fields:
             return {"success": True}

        params.append(call_id)
        query = f"UPDATE call_logs SET {', '.join(fields)} WHERE id = %s"
        c.execute(query, params)
        conn.commit()
        return {"success": True}
    except Exception as e:
        conn.rollback()
        logger.error(f"Error updating call: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.delete("/telephony/calls/{call_id}")
async def delete_call(call_id: int, current_user: dict = Depends(get_current_user)):
    if not _has_telephony_access(current_user):
        raise HTTPException(status_code=403, detail="Access denied")

    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute("DELETE FROM call_logs WHERE id = %s", (call_id,))
        conn.commit()
        return {"success": True}
    except Exception as e:
        conn.rollback()
        logger.error(f"Error deleting call: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

# --- WEBHOOKS FOR PROVIDERS ---

@router.post("/telephony/webhook/{provider}")
async def telephony_webhook(provider: str, request: Request, background_tasks: BackgroundTasks):
    """
    Universal webhook for telephony providers.
    Supports: binotel, onlinepbx, twilio, generic (json)
    """
    try:
        data = {}
        if request.headers.get('content-type') == 'application/json':
            data = await request.json()
        else:
            form = await request.form()
            data = dict(form)
            
        logger.info(f"Received webhook from {provider}: {data}")

        # Normalize data based on provider
        call_data = normalize_webhook_data(provider, data)
        if not call_data:
            return {"status": "ignored", "reason": "unknown format or event"}

        # Save to DB asynchronously
        background_tasks.add_task(save_webhook_call, call_data)

        return {"status": "ok"}
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        # Return 200 OK anyway to prevent provider from retrying endlessly
        return {"status": "error", "message": str(e)}

def normalize_webhook_data(provider: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    # 1. Binotel
    if provider == 'binotel':
        # Binotel sends specific fields
        # Example: requestType, callID, generalCallID, externalNumber, internalNumber, duration, recording, disposition
        if data.get('requestType') == 'completed':
            disposition = data.get('disposition')
            normalized_status = 'completed'
            if disposition in ['busy', 'noanswer']:
                normalized_status = 'missed'
            elif disposition in ['rejected', 'cancelled']:
                normalized_status = 'rejected'

            return {
                'external_id': data.get('generalCallID'),
                'phone': data.get('externalNumber'),
                'direction': 'inbound' if data.get('direction') == 'incoming' else 'outbound',
                'status': normalized_status,
                'duration': int(data.get('duration', 0)),
                'recording_url': data.get('recording'),
                'created_at': datetime.fromtimestamp(int(data.get('startTime'))).isoformat() if data.get('startTime') else datetime.now().isoformat()
            }
    
    # 2. OnlinePBX
    elif provider == 'onlinepbx':
         # Example: event=call_end, uuid, caller, callee, duration, recording_url
         if data.get('event') == 'call_end':
             return {
                 'external_id': data.get('uuid'),
                 'phone': data.get('from') if len(data.get('from', '')) > 5 else data.get('to'), # Heuristic
                 'direction': 'inbound', # Simplification, need logic
                 'status': 'completed',
                 'duration': int(data.get('duration', 0)),
                 'recording_url': data.get('recording_url'),
                 'created_at': datetime.now().isoformat()
             }
    
    # 3. Twilio
    elif provider == 'twilio':
        # Twilio sends Form Data: CallSid, From, To, CallStatus, CallDuration, RecordingUrl
        return {
            'external_id': data.get('CallSid'),
            'phone': data.get('From'),
            'direction': 'inbound' if data.get('Direction', '').startswith('inbound') else 'outbound',
            'status': 'completed' if data.get('CallStatus') == 'completed' else data.get('CallStatus'),
            'duration': int(data.get('CallDuration', 0)),
            'recording_url': data.get('RecordingUrl'),
            'created_at': datetime.now().isoformat()
        }

    # 3. Generic (our own format)
    elif provider == 'generic':
        return {
            'external_id': data.get('id'),
            'phone': data.get('phone'),
            'direction': data.get('direction', 'inbound'),
            'status': data.get('status', 'completed'),
            'duration': int(data.get('duration', 0)),
            'recording_url': data.get('recording_url'),
            'created_at': data.get('created_at', datetime.now().isoformat()),
            'notes': data.get('notes')
        }

    return None

def save_webhook_call(call_data: Dict[str, Any]):
    conn = get_db_connection()
    c = conn.cursor()
    try:
        external_id = call_data.get('external_id')
        
        # Check if client exists by phone
        client_id = None
        if call_data.get('phone'):
             clean_phone = ''.join(filter(str.isdigit, call_data['phone']))
             if len(clean_phone) > 6:
                 c.execute("SELECT instagram_id FROM clients WHERE phone LIKE %s LIMIT 1", (f"%{clean_phone}%",))
                 row = c.fetchone()
                 if row:
                     client_id = row[0]

        # Check if call already exists by external_id
        if external_id:
            c.execute("SELECT id FROM call_logs WHERE external_id = %s", (external_id,))
            id_row = c.fetchone()
            if id_row:
                call_id = id_row[0]
                # Update existing call
                fields = []
                params = []
                # Fields we allow to update from webhook
                updateable = ['status', 'duration', 'recording_url', 'transcription', 'notes', 'recording_file']
                for field in updateable:
                    if field in call_data and call_data[field] is not None:
                        fields.append(f"{field} = %s")
                        params.append(call_data[field])
                
                if fields:
                    params.append(call_id)
                    query = f"UPDATE call_logs SET {', '.join(fields)} WHERE id = %s"
                    c.execute(query, params)
                    conn.commit()
                    logger.info(f"Updated existing call {call_id} (external_id: {external_id})")
                    return

        # Insert new call if not found or no external_id
        c.execute("""
            INSERT INTO call_logs (
                phone, client_id, direction, status, duration, recording_url, 
                created_at, external_id, notes, transcription
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            call_data.get('phone'), client_id, call_data.get('direction'), 
            call_data.get('status'), call_data.get('duration'), call_data.get('recording_url'),
            call_data.get('created_at'), call_data.get('external_id'), 
            call_data.get('notes'), call_data.get('transcription')
        ))
        conn.commit()
        logger.info(f"Inserted new call from webhook")
    except Exception as e:
        logger.error(f"Error saving webhook call: {e}")
    finally:
        conn.close()
