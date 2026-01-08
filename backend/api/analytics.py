"""
API Endpoints для аналитики
"""
from fastapi import APIRouter, Query, Cookie, HTTPException
from fastapi.responses import JSONResponse
from typing import Optional

from db import get_stats, get_analytics_data, get_funnel_data
from utils.utils import require_auth, get_total_unread
from utils.logger import log_warning, log_info

router = APIRouter(tags=["Analytics"])

# ===== 3-УРОВНЕВАЯ СИСТЕМА ДОСТУПА К АНАЛИТИКЕ =====

# Уровень 1: Полная аналитика (с именами, контактами, финансами)
FULL_ANALYTICS_ROLES = ["director"]

# Уровень 2: Анонимная аналитика (без имен и контактов клиентов)
ANONYMIZED_ANALYTICS_ROLES = ["admin", "manager"]

# Уровень 3: Только статистика (цифры без деталей)
STATS_ONLY_ROLES = ["sales", "marketer"]

# Все роли с доступом к аналитике
ALL_ANALYTICS_ROLES = FULL_ANALYTICS_ROLES + ANONYMIZED_ANALYTICS_ROLES + STATS_ONLY_ROLES

def get_analytics_access_level(user_role: str) -> str:
    """Определить уровень доступа к аналитике"""
    if user_role in FULL_ANALYTICS_ROLES:
        return "full"
    elif user_role in ANONYMIZED_ANALYTICS_ROLES:
        return "anonymized"
    elif user_role in STATS_ONLY_ROLES:
        return "stats_only"
    else:
        return "none"

def anonymize_analytics_data(data: dict, access_level: str) -> dict:
    """Анонимизировать данные аналитики в зависимости от уровня доступа"""
    if access_level == "full":
        return data  # Полные данные
    
    # Для анонимной и stats_only - скрываем персональные данные
    if isinstance(data, dict):
        anonymized = {}
        for key, value in data.items():
            # Скрываем поля с персональными данными
            if key in ['client_name', 'client_phone', 'client_email', 'client_id', 'instagram_id']:
                if access_level == "stats_only":
                    continue  # Полностью убираем для stats_only
                anonymized[key] = "***"  # Анонимизируем для anonymized
            elif key in ['clients', 'bookings', 'items'] and isinstance(value, list):
                # Рекурсивно обрабатываем списки
                anonymized[key] = [anonymize_analytics_data(item, access_level) for item in value]
            else:
                anonymized[key] = value
        return anonymized
    
    return data

@router.get("/dashboard")
async def get_dashboard(session_token: Optional[str] = Cookie(None)):
    """Получить данные дашборда (3 уровня доступа: full, anonymized, stats_only)"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
        
    # Определяем уровень доступа
    access_level = get_analytics_access_level(user["role"])
    
    if access_level == "none":
        log_warning(f"User {user['username']} ({user['role']}) attempted to access dashboard", "security")
        raise HTTPException(
            status_code=403,
            detail="You don't have permission to view analytics"
        )
    
    log_info(f"📊 User {user['username']} ({user['role']}) accessing dashboard (level: {access_level})", "analytics")
    
    # Получаем данные
    stats = get_stats()
    analytics = get_analytics_data()
    funnel = get_funnel_data()
    
    # Анонимизируем в зависимости от уровня доступа
    response = {
        "stats": anonymize_analytics_data(stats, access_level),
        "analytics": anonymize_analytics_data(analytics, access_level),
        "funnel": anonymize_analytics_data(funnel, access_level),
        "unread_count": get_total_unread() if access_level != "stats_only" else 0,
        "access_level": access_level  # Информируем frontend об уровне доступа
    }
    
    return response

@router.get("/analytics")
async def get_analytics_api(
    period: int = Query(30),
    date_from: str = Query(None),
    date_to: str = Query(None),
    session_token: Optional[str] = Cookie(None)
):
    """Получить аналитику за период (3 уровня доступа)"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    
    access_level = get_analytics_access_level(user["role"])
    
    if access_level == "none":
        log_warning(f"User {user['username']} ({user['role']}) attempted to access analytics", "security")
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Получаем данные
    if date_from and date_to:
        data = get_analytics_data(date_from=date_from, date_to=date_to)
    else:
        data = get_analytics_data(days=period)
    
    # Анонимизируем
    return anonymize_analytics_data(data, access_level)

@router.get("/analytics/funnel")
async def get_funnel_api(session_token: Optional[str] = Cookie(None)):
    """Получить данные воронки продаж (3 уровня доступа)"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    access_level = get_analytics_access_level(user["role"])
    
    if access_level == "none":
        log_warning(f"User {user['username']} ({user['role']}) attempted to access funnel", "security")
        raise HTTPException(status_code=403, detail="Access denied")
    
    data = get_funnel_data()
    return anonymize_analytics_data(data, access_level)

@router.get("/stats")
async def get_stats_api(
    comparison_period: str = Query("7days"),
    session_token: Optional[str] = Cookie(None)
):
    """Получить общую статистику с индикаторами роста (3 уровня доступа)"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    access_level = get_analytics_access_level(user["role"])
    
    if access_level == "none":
        log_warning(f"User {user['username']} ({user['role']}) attempted to access stats", "security")
        raise HTTPException(status_code=403, detail="Access denied")
    
    data = get_stats(comparison_period=comparison_period)
    return anonymize_analytics_data(data, access_level)

@router.get("/advanced-analytics")
async def get_advanced_analytics(
    period: int = Query(30),
    date_from: str = Query(None),
    date_to: str = Query(None),
    session_token: Optional[str] = Cookie(None)
):
    """Получить расширенную аналитику (только admin, director, manager)"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    
    if user["role"] not in ANALYTICS_ROLES:
        log_warning(f"User {user['username']} ({user['role']}) attempted to access advanced analytics", "security")
        raise HTTPException(
            status_code=403,
            detail="Only admin, director, and manager can view analytics"
        )
    
    from db.analytics import get_advanced_analytics_data
    return get_advanced_analytics_data(period, date_from, date_to)

@router.get("/client-insights")
async def get_client_insights(
    client_id: str = Query(...),
    session_token: Optional[str] = Cookie(None)
):
    """Получить инсайты по клиенту (только admin, director, manager)"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    
    if user["role"] not in ANALYTICS_ROLES:
        log_warning(f"User {user['username']} ({user['role']}) attempted to access client insights", "security")
        raise HTTPException(
            status_code=403,
            detail="Only admin, director, and manager can view analytics"
        )
    
    from db.analytics import get_client_insights_data
    return get_client_insights_data(client_id)

@router.get("/performance-metrics")
async def get_performance_metrics(
    period: int = Query(30),
    session_token: Optional[str] = Cookie(None)
):
    """Получить метрики производительности (только admin, director, manager)"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    
    if user["role"] not in ANALYTICS_ROLES:
        log_warning(f"User {user['username']} ({user['role']}) attempted to access performance metrics", "security")
        raise HTTPException(
            status_code=403,
            detail="Only admin, director, and manager can view analytics"
        )
    
    from db.analytics import get_performance_metrics_data
    return get_performance_metrics_data(period)

@router.get("/bot-analytics")
async def get_bot_analytics(
    days: int = Query(30),
    session_token: Optional[str] = Cookie(None)
):
    """Получить аналитику эффективности бота (только admin, director, manager)"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    
    if user["role"] not in ANALYTICS_ROLES:
        log_warning(f"User {user['username']} ({user['role']}) attempted to access bot analytics", "security")
        raise HTTPException(
            status_code=403,
            detail="Only admin, director, and manager can view analytics"
        )
    
    from db.bot_analytics import get_bot_analytics_summary
    return get_bot_analytics_summary(days)