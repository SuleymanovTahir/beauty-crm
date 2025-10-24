"""
API Endpoints для аналитики
"""
from fastapi import APIRouter, Query, Cookie
from fastapi.responses import JSONResponse
from typing import Optional

from db import get_stats, get_analytics_data, get_funnel_data
from utils import require_auth, get_total_unread

router = APIRouter(prefix="/analytics", tags=["Analytics"])


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


@router.get("")
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
async def get_stats_api(session_token: Optional[str] = Cookie(None)):
    """Получить общую статистику"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    
    return get_stats()