"""
API Endpoints для аналитики
"""
from fastapi import APIRouter, Query, Cookie
from fastapi.responses import JSONResponse
from typing import Optional

from db import get_stats, get_analytics_data, get_funnel_data
from utils.utils import require_auth, get_total_unread

router = APIRouter(tags=["Analytics"])

@router.get("/dashboard")
async def get_dashboard(session_token: Optional[str] = Cookie(None)):
    """Получить данные дашборда"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    
    stats = get_stats()
    analytics = get_analytics_data()
    funnel = get_funnel_data()
    
    return {
        "stats": stats,
        "analytics": analytics,
        "funnel": funnel,
        "unread_count": get_total_unread()
    }

@router.get("/analytics")
async def get_analytics_api(
    period: int = Query(30),
    date_from: str = Query(None),
    date_to: str = Query(None),
    session_token: Optional[str] = Cookie(None)
):
    """Получить аналитику за период"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    
    if date_from and date_to:
        return get_analytics_data(date_from=date_from, date_to=date_to)
    else:
        return get_analytics_data(days=period)

@router.get("/funnel")
async def get_funnel_api(session_token: Optional[str] = Cookie(None)):
    """Получить данные воронки продаж"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    
    return get_funnel_data()

@router.get("/stats")
async def get_stats_api(
    comparison_period: str = Query("7days"),
    session_token: Optional[str] = Cookie(None)
):
    """Получить общую статистику с индикаторами роста"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    
    return get_stats(comparison_period=comparison_period)

@router.get("/advanced-analytics")
async def get_advanced_analytics(
    period: int = Query(30),
    date_from: str = Query(None),
    date_to: str = Query(None),
    session_token: Optional[str] = Cookie(None)
):
    """Получить расширенную аналитику"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    
    from db.analytics import get_advanced_analytics_data
    return get_advanced_analytics_data(period, date_from, date_to)

@router.get("/client-insights")
async def get_client_insights(
    client_id: str = Query(...),
    session_token: Optional[str] = Cookie(None)
):
    """Получить инсайты по клиенту"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    
    from db.analytics import get_client_insights_data
    return get_client_insights_data(client_id)

@router.get("/performance-metrics")
async def get_performance_metrics(
    period: int = Query(30),
    session_token: Optional[str] = Cookie(None)
):
    """Получить метрики производительности"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    
    from db.analytics import get_performance_metrics_data
    return get_performance_metrics_data(period)

@router.get("/bot-analytics")
async def get_bot_analytics(
    days: int = Query(30),
    session_token: Optional[str] = Cookie(None)
):
    """Получить аналитику эффективности бота"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    
    from db.bot_analytics import get_bot_analytics_summary
    return get_bot_analytics_summary(days)