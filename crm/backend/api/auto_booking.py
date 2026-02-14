"""
API Endpoints для автозаполнения окон записи
"""
from fastapi import APIRouter, Request, Cookie, Query
from fastapi.responses import JSONResponse
from typing import Optional
from utils.utils import require_auth
from utils.logger import log_error, log_info
from services.auto_booking import AutoBookingService

router = APIRouter(tags=["AutoBooking"])

@router.get("/auto-booking/suggestions")
async def get_auto_booking_suggestions_api(
    date: str = Query(..., description="Date (YYYY-MM-DD)"),
    master: Optional[str] = Query(None, description="Specific master (optional)"),
    min_days: int = Query(21, description="Minimum days since last visit"),
    max_suggestions: int = Query(10, description="Maximum number of suggestions"),
    session_token: Optional[str] = Cookie(None)
):
    """
    Получить автоматические предложения заполнения свободных окон

    Возвращает список клиентов, которых можно записать на свободные слоты
    на основе их истории, предпочтений и доступности мастеров.
    """
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    try:
        auto_booking_service = AutoBookingService()

        recommendations = auto_booking_service.find_clients_for_slots(
            date=date,
            master_name=master,
            min_days_since_visit=min_days
        )

        # Ограничиваем количество
        recommendations = recommendations[:max_suggestions]

        log_info(f"📋 Auto-booking suggestions for {date}: {len(recommendations)} found", "auto_booking")

        return {
            "success": True,
            "date": date,
            "master": master,
            "recommendations": recommendations,
            "count": len(recommendations)
        }

    except Exception as e:
        log_error(f"Error getting auto-booking suggestions: {e}", "auto_booking")
        return JSONResponse({"error": str(e)}, status_code=500)

@router.get("/auto-booking/underutilized-slots")
async def get_underutilized_slots_api(
    date_start: str = Query(..., description="Start date (YYYY-MM-DD)"),
    date_end: str = Query(..., description="End date (YYYY-MM-DD)"),
    session_token: Optional[str] = Cookie(None)
):
    """
    Найти недогруженные слоты в диапазоне дат

    Показывает, у каких мастеров и в какие дни есть много свободных окон.
    Полезно для планирования маркетинговых активностей.
    """
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    try:
        auto_booking_service = AutoBookingService()

        underutilized = auto_booking_service.get_underutilized_slots(
            date_start=date_start,
            date_end=date_end
        )

        return {
            "success": True,
            "date_start": date_start,
            "date_end": date_end,
            "underutilized": underutilized
        }

    except Exception as e:
        log_error(f"Error getting underutilized slots: {e}", "auto_booking")
        return JSONResponse({"error": str(e)}, status_code=500)

@router.get("/auto-booking/daily-suggestions/{date}")
async def get_daily_auto_suggestions_api(
    date: str,
    max_suggestions: int = Query(10, description="Maximum number of suggestions"),
    session_token: Optional[str] = Cookie(None)
):
    """
    Получить топ рекомендаций для заполнения дня

    Быстрый endpoint для получения лучших предложений на конкретный день.
    """
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    try:
        auto_booking_service = AutoBookingService()

        suggestions = auto_booking_service.auto_suggest_bookings(
            date=date,
            max_suggestions=max_suggestions
        )

        return {
            "success": True,
            "date": date,
            "suggestions": suggestions,
            "count": len(suggestions)
        }

    except Exception as e:
        log_error(f"Error getting daily suggestions: {e}", "auto_booking")
        return JSONResponse({"error": str(e)}, status_code=500)
