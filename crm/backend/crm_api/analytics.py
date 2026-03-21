"""
API Endpoints для аналитики
"""
from fastapi import APIRouter, Query, Cookie, HTTPException, Request
from fastapi.responses import JSONResponse, StreamingResponse
from typing import Optional
from datetime import datetime

from db import get_stats, get_analytics_data, get_funnel_data
from utils.utils import require_auth, get_total_unread
from utils.utils import require_auth, get_total_unread
from utils.logger import log_warning, log_info, log_error
from utils.cache import cache
from utils.optional_dependencies import OptionalDependencyError

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
            
            # Скрываем финансовые данные для stats_only
            elif access_level == "stats_only" and key in ['total_revenue', 'avg_booking_value', 'revenue', 'total_spend', 'lifetime_value', 'avg_revenue_per_client']:
                anonymized[key] = 0
            
            # Обработка списков (рекурсивно)
            elif isinstance(value, list) and key in ['clients', 'bookings', 'items']:
                anonymized[key] = [anonymize_analytics_data(item, access_level) for item in value]

            # Обработка вложенных словарей (рекурсивно)
            elif isinstance(value, dict) and key in ['growth']:
                anonymized[key] = anonymize_analytics_data(value, access_level)

            # Обработка services_stats (список кортежей: name, count, revenue)
            elif key == 'services_stats' and access_level == "stats_only" and isinstance(value, list):
                 # Заменяем выручку на 0
                 anonymized[key] = [(item[0], item[1], 0) for item in value]
            
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
    
    # Try cache
    cache_key = f"dashboard_{access_level}"
    cached_data = cache.get(cache_key)
    if cached_data:
        # Update unread count as it's real-time
        if "unread_count" in cached_data and access_level != "stats_only":
             cached_data["unread_count"] = get_total_unread()
        return cached_data

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
    
    # Cache for 5 minutes
    cache.set(cache_key, response, expire=300)

    return response

@router.get("/analytics")
async def get_analytics_api(
    period: int = Query(30),
    date_from: str = Query(None),
    date_to: str = Query(None),
    service_name: str = Query(None),
    product_name: str = Query(None),
    forecast_horizon_days: int = Query(14),
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
        data = get_analytics_data(
            date_from=date_from,
            date_to=date_to,
            service_name=service_name,
            product_name=product_name,
            forecast_horizon_days=forecast_horizon_days,
        )
    else:
        data = get_analytics_data(
            days=period,
            service_name=service_name,
            product_name=product_name,
            forecast_horizon_days=forecast_horizon_days,
        )
    
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
    
    cache_key = f"funnel_{access_level}"
    cached_data = cache.get(cache_key)
    if cached_data:
        return cached_data

    import time
    start_time = time.time()
    data = get_funnel_data()
    duration = time.time() - start_time
    log_info(f"⏱️ get_funnel_data took {duration:.4f}s", "perf")

    result = anonymize_analytics_data(data, access_level)
    
    cache.set(cache_key, result, expire=300)
    return result

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

    if user["role"] not in ALL_ANALYTICS_ROLES:
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
    
    if user["role"] not in ALL_ANALYTICS_ROLES:
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
    
    if user["role"] not in ALL_ANALYTICS_ROLES:
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
    
    if user["role"] not in ALL_ANALYTICS_ROLES:
        log_warning(f"User {user['username']} ({user['role']}) attempted to access bot analytics", "security")
        raise HTTPException(
            status_code=403,
            detail="Only admin, director, and manager can view analytics"
        )
    
    from db.bot_analytics import get_bot_analytics_summary
    return get_bot_analytics_summary(days)

@router.post("/export-report")
async def export_report_api(
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """Экспорт отчета (CSV, PDF, Excel) для Dashboard"""
    user = require_auth(session_token)
    if not user or user["role"] not in ["admin", "director"]:
        raise HTTPException(status_code=403, detail="Forbidden")

    try:
        data = await request.json()
        format = data.get("format", "csv")
        start_date = data.get("start_date")
        end_date = data.get("end_date")
        lang = data.get("lang", "en")

        from crm_api.export import export_dashboard_report_csv, export_dashboard_report_pdf, export_dashboard_report_excel
        from db import get_all_bookings, get_stats
        from db.bot_analytics import get_bot_analytics_summary
        
        # Получаем данные
        bookings = get_all_bookings()
        
        # Фильтруем по дате если нужно
        if start_date and end_date:
            filtered = []
            try:
                # Пытаемся распарсить ISO форматы от фронтенда
                s_dt = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
                e_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
                
                for b in bookings:
                    try:
                        b_dt = datetime.fromisoformat(b[3])
                        if s_dt <= b_dt <= e_dt:
                            filtered.append(b)
                    except: continue
                bookings = filtered
            except Exception as e:
                log_warning(f"Export date filtering failed: {e}", "export")

        # Получаем данные (KPI и Бот)
        stats = get_stats() 
        bot_analytics = get_bot_analytics_summary(30) # За 30 дней по умолчанию

        if format == "csv":
            content = export_dashboard_report_csv(stats, bot_analytics, bookings, lang=lang)
            media_type = "text/csv"
            filename = f"dashboard_report_{datetime.now().strftime('%Y%m%d')}.csv"
        elif format == "pdf":
            content = export_dashboard_report_pdf(stats, bot_analytics, bookings, lang=lang)
            media_type = "application/pdf"
            filename = f"dashboard_report_{datetime.now().strftime('%Y%m%d')}.pdf"
        elif format == "excel":
            content = export_dashboard_report_excel(stats, bot_analytics, bookings, lang=lang)
            media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            filename = f"dashboard_report_{datetime.now().strftime('%Y%m%d')}.xlsx"
        else:
            raise HTTPException(status_code=400, detail="Invalid format")

        return StreamingResponse(
            iter([content]),
            media_type=media_type,
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except OptionalDependencyError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    except Exception as e:
        log_error(f"Error in export-report: {e}", "export")
        raise HTTPException(status_code=500, detail=str(e))
