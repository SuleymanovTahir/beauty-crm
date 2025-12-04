"""
API Endpoints для Dashboard и аналитики
"""
from fastapi import APIRouter, Request, Cookie, Query
from fastapi.responses import JSONResponse
from typing import Optional
from utils.utils import require_auth
from utils.logger import log_error, log_info
from services.analytics import AnalyticsService

router = APIRouter(tags=["Dashboard"])

@router.get("/dashboard/kpi")
async def get_dashboard_kpi(
    period: str = Query("month", description="Period: today, week, month, year, custom"),
    start_date: Optional[str] = Query(None, description="Start date for custom period (YYYY-MM-DD HH:MM:SS)"),
    end_date: Optional[str] = Query(None, description="End date for custom period (YYYY-MM-DD HH:MM:SS)"),
    session_token: Optional[str] = Cookie(None)
):
    """
    Получить все KPI метрики для Dashboard

    Возвращает:
    - Выручка (общая, по дням, средний чек, прогноз)
    - Записи (всего, завершенные, отмененные, conversion rate)
    - Клиенты (новые, возвращающиеся, retention rate, LTV)
    - Мастера (топ-5, загрузка)
    - Услуги (топ-5)
    - Тренды (сравнение с предыдущим периодом)
    """
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    try:
        analytics = AnalyticsService()
        kpi = analytics.get_dashboard_kpi(
            period=period,
            start_date=start_date,
            end_date=end_date
        )

        log_info(f"📊 Dashboard KPI requested by {user['username']} for period: {period}", "dashboard")

        return {
            "success": True,
            "kpi": kpi
        }

    except Exception as e:
        log_error(f"Error getting dashboard KPI: {e}", "dashboard")
        return JSONResponse({"error": str(e)}, status_code=500)

@router.get("/dashboard/master-stats/{master_name}")
async def get_master_stats(
    master_name: str,
    date: str = Query(..., description="Date (YYYY-MM-DD)"),
    session_token: Optional[str] = Cookie(None)
):
    """Получить статистику мастера на день"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    try:
        analytics = AnalyticsService()
        stats = analytics.get_master_schedule_stats(master_name, date)

        return {
            "success": True,
            "stats": stats
        }

    except Exception as e:
        log_error(f"Error getting master stats: {e}", "dashboard")
        return JSONResponse({"error": str(e)}, status_code=500)
