"""
API Endpoints для управления расписанием мастеров
"""
from fastapi import APIRouter, Request, Cookie, Query
from fastapi.responses import JSONResponse
from typing import Optional
from utils.utils import require_auth
from utils.logger import log_error, log_info
from services.master_schedule import MasterScheduleService

router = APIRouter(tags=["Schedule"])


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
        "start_time": "09:00",
        "end_time": "18:00"
    }
    """
    user = require_auth(session_token)
    if not user or user["role"] not in ["admin", "manager"]:
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
        "start_date": "2025-11-20",
        "end_date": "2025-11-25",
        "type": "vacation",  // vacation, sick_leave, day_off
        "reason": "Отпуск"
    }
    """
    user = require_auth(session_token)
    if not user or user["role"] not in ["admin", "manager"]:
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
    if not user or user["role"] not in ["admin", "manager"]:
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
