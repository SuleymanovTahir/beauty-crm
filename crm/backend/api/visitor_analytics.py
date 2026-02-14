"""
API endpoints for visitor analytics
"""
from fastapi import APIRouter, Request, Cookie
from fastapi.responses import JSONResponse, StreamingResponse
from typing import Optional
from datetime import datetime, timedelta
from db.visitor_tracking import get_visitor_stats, get_location_distribution, get_country_distribution, get_city_distribution, get_distance_distribution, get_visitor_trend, get_landing_sections, get_peak_hours
from db.visitor_bulk_delete import bulk_delete_visitor_records
from utils.utils import require_auth
from utils.logger import log_info, log_error
from utils.cache import cache
import csv
import io
from db.cookies import log_cookie_consent, create_cookie_consents_table, check_cookie_consent
import time

router = APIRouter(tags=["Analytics"])

# Simple in-memory cache for dashboard data (fallback when Redis is unavailable)
_dashboard_cache = {}
_cache_ttl = 0  # Disabled for CRM - always fetch fresh data

@router.get("/cookies/check")
async def check_cookies(request: Request):
    """Проверить статус куки для IP"""
    try:
        ip = request.client.host
        status = check_cookie_consent(ip)
        return {"status": status} # 'accept', 'decline', or None
    except Exception as e:
        log_error(f"Error checking cookies: {e}", "analytics")
        return {"status": None}

@router.post("/cookies/consent")
async def cookie_consent(request: Request, data: dict):
    """Сохранить выбор пользователя по куки"""
    try:
        action = data.get('action') # 'accept' or 'decline'
        if action not in ['accept', 'decline']:
             return JSONResponse({"error": "Invalid action"}, status_code=400)
             
        ip = request.client.host
        user_agent = request.headers.get('user-agent', '')
        
        log_cookie_consent(ip, action, user_agent)
        
        return {"success": True}
    except Exception as e:
        log_error(f"Error logging cookie consent: {e}", "analytics")
        return JSONResponse({"error": str(e)}, status_code=500)

@router.post("/analytics/visitors/track")
async def track_visitor_api(request: Request, data: dict):
    """
    Явный трекинг посетителя (с поддержкой якорей URL)
    Этого метода не хватает для SPA, где смена секций не перезагружает страницу
    """
    try:
        from db.visitor_tracking import track_visitor
        import asyncio
        
        ip = request.client.host
        user_agent = request.headers.get('user-agent', '')
        # Фронтенд должен прислать полный URL через тело запроса
        page_url = data.get('url', str(request.url))
        
        referrer = data.get('referrer', request.headers.get('referer', ''))
        
        # Трекаем в фоне
        asyncio.create_task(asyncio.to_thread(track_visitor, ip, user_agent, page_url, referrer))
        
        return {"success": True}
    except Exception as e:
        log_error(f"Error tracking visitor via API: {e}", "analytics")
        return {"success": False}


@router.get("/analytics/visitors")
async def get_visitors(
    period: str = "week",  # day, week, month
    session_token: Optional[str] = Cookie(None)
):
    """Get visitor statistics with filtering"""
    user = require_auth(session_token)
    if not user or user["role"] not in ["admin", "director"]:
        return JSONResponse({"error": "Forbidden"}, status_code=403)
    
    try:
        # Calculate date range based on period
        end_date = datetime.now()
        if period == "day":
            start_date = end_date - timedelta(days=1)
        elif period == "week":
            start_date = end_date - timedelta(weeks=1)
        elif period == "month":
            start_date = end_date - timedelta(days=30)
        else:
            start_date = end_date - timedelta(weeks=1)  # default to week
        
        visitors = get_visitor_stats(start_date, end_date)
        
        return {
            "success": True,
            "visitors": visitors,
            "period": period,
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat()
        }
        
    except Exception as e:
        log_error(f"Error getting visitor stats: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=500)

@router.get("/analytics/visitors/location-breakdown")
async def get_location_breakdown(
    period: str = "week",
    session_token: Optional[str] = Cookie(None)
):
    """Get local vs non-local visitor breakdown"""
    user = require_auth(session_token)
    if not user or user["role"] not in ["admin", "director"]:
        return JSONResponse({"error": "Forbidden"}, status_code=403)
    
    try:
        # Calculate date range
        end_date = datetime.now()
        if period == "day":
            start_date = end_date - timedelta(days=1)
        elif period == "week":
            start_date = end_date - timedelta(weeks=1)
        elif period == "month":
            start_date = end_date - timedelta(days=30)
        else:
            start_date = end_date - timedelta(weeks=1)
        
        distribution = get_location_distribution(start_date, end_date)
        
        return {
            "success": True,
            "distribution": distribution
        }
        
    except Exception as e:
        log_error(f"Error getting location breakdown: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=500)

@router.get("/analytics/visitors/country-breakdown")
async def get_country_breakdown(
    period: str = "week",
    session_token: Optional[str] = Cookie(None)
):
    """Get visitor distribution by country"""
    user = require_auth(session_token)
    if not user or user["role"] not in ["admin", "director"]:
        return JSONResponse({"error": "Forbidden"}, status_code=403)
    
    try:
        # Calculate date range
        end_date = datetime.now()
        if period == "day":
            start_date = end_date - timedelta(days=1)
        elif period == "week":
            start_date = end_date - timedelta(weeks=1)
        elif period == "month":
            start_date = end_date - timedelta(days=30)
        else:
            start_date = end_date - timedelta(weeks=1)
        
        countries = get_country_distribution(start_date, end_date)
        
        return {
            "success": True,
            "countries": countries
        }
        
    except Exception as e:
        log_error(f"Error getting country breakdown: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=500)

@router.get("/analytics/visitors/city-breakdown")
async def get_city_breakdown(
    period: str = "week",
    session_token: Optional[str] = Cookie(None)
):
    """Get visitor distribution by city"""
    user = require_auth(session_token)
    if not user or user["role"] not in ["admin", "director"]:
        return JSONResponse({"error": "Forbidden"}, status_code=403)
    
    try:
        # Calculate date range
        end_date = datetime.now()
        if period == "day":
            start_date = end_date - timedelta(days=1)
        elif period == "week":
            start_date = end_date - timedelta(weeks=1)
        elif period == "month":
            start_date = end_date - timedelta(days=30)
        else:
            start_date = end_date - timedelta(weeks=1)
        
        cities = get_city_distribution(start_date, end_date)
        
        return {
            "success": True,
            "cities": cities
        }
        
    except Exception as e:
        log_error(f"Error getting city breakdown: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=500)

@router.get("/analytics/visitors/distance-breakdown")
async def get_distance_breakdown(
    period: str = "week",
    max_distance: float = 50,
    session_token: Optional[str] = Cookie(None)
):
    """Get visitor distribution by distance ranges"""
    user = require_auth(session_token)
    if not user or user["role"] not in ["admin", "director"]:
        return JSONResponse({"error": "Forbidden"}, status_code=403)
    
    try:
        # Calculate date range
        end_date = datetime.now()
        if period == "day":
            start_date = end_date - timedelta(days=1)
        elif period == "week":
            start_date = end_date - timedelta(weeks=1)
        elif period == "month":
            start_date = end_date - timedelta(days=30)
        else:
            start_date = end_date - timedelta(weeks=1)
        
        distribution = get_distance_distribution(start_date, end_date, max_distance)
        
        return {
            "success": True,
            "distribution": distribution,
            "max_distance": max_distance
        }
        
    except Exception as e:
        log_error(f"Error getting distance breakdown: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=500)

@router.get("/analytics/visitors/export")
async def export_visitor_analytics(
    period: str = "week",
    session_token: Optional[str] = Cookie(None)
):
    """Export visitor analytics to CSV"""
    user = require_auth(session_token)
    if not user or user["role"] not in ["admin", "director"]:
        return JSONResponse({"error": "Forbidden"}, status_code=403)
    
    try:
        # Calculate date range
        end_date = datetime.now()
        if period == "day":
            start_date = end_date - timedelta(days=1)
        elif period == "week":
            start_date = end_date - timedelta(weeks=1)
        elif period == "month":
            start_date = end_date - timedelta(days=30)
        else:
            start_date = end_date - timedelta(weeks=1)
        
        visitors = get_visitor_stats(start_date, end_date)
        
        # Create CSV
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Header
        writer.writerow(['IP адрес', 'Город', 'Страна', 'Расстояние (км)', 'Местный', 'Время посещения'])
        
        # Data
        for visitor in visitors:
            writer.writerow([
                visitor.get('ip_address', '-'),
                visitor.get('city', '-'),
                visitor.get('country', '-'),
                visitor.get('distance_km', '-'),
                'Да' if visitor.get('is_local') else 'Нет',
                visitor.get('visited_at', '-')
            ])
        
        output.seek(0)
        
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={
                "Content-Disposition": f"attachment; filename=visitor_analytics_{period}.csv"
            }
        )
        
    except Exception as e:
        log_error(f"Error exporting visitor analytics: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=500)

@router.get("/analytics/visitors/trend")
async def get_trend(
    period: str = "week",
    session_token: Optional[str] = Cookie(None)
):
    """Get visitor trend over time"""
    user = require_auth(session_token)
    if not user or user["role"] not in ["admin", "director"]:
        return JSONResponse({"error": "Forbidden"}, status_code=403)
    
    try:
        # Calculate date range
        end_date = datetime.now()
        if period == "day":
            start_date = end_date - timedelta(days=1)
        elif period == "week":
            start_date = end_date - timedelta(weeks=1)
        elif period == "month":
            start_date = end_date - timedelta(days=30)
        else:
            start_date = end_date - timedelta(weeks=1)
        
        trend = get_visitor_trend(start_date, end_date)
        
        return {
            "success": True,
            "trend": trend
        }
        
    except Exception as e:
        log_error(f"Error getting visitor trend: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=500)

@router.get("/analytics/visitors/landing-sections")
async def get_sections(
    period: str = "week",
    session_token: Optional[str] = Cookie(None)
):
    """Get most visited landing sections"""
    user = require_auth(session_token)
    if not user or user["role"] not in ["admin", "director"]:
        return JSONResponse({"error": "Forbidden"}, status_code=403)
    
    try:
        # Calculate date range
        end_date = datetime.now()
        if period == "day":
            start_date = end_date - timedelta(days=1)
        elif period == "week":
            start_date = end_date - timedelta(weeks=1)
        elif period == "month":
            start_date = end_date - timedelta(days=30)
        else:
            start_date = end_date - timedelta(weeks=1)
        
        sections = get_landing_sections(start_date, end_date)
        
        return {
            "success": True,
            "sections": sections
        }
        
    except Exception as e:
        log_error(f"Error getting landing sections: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=500)

@router.get("/analytics/visitors/peak-hours")
async def get_hours(
    period: str = "week",
    session_token: Optional[str] = Cookie(None)
):
    """Get peak hours of visitor activity"""
    user = require_auth(session_token)
    if not user or user["role"] not in ["admin", "director"]:
        return JSONResponse({"error": "Forbidden"}, status_code=403)
    
    try:
        # Calculate date range
        end_date = datetime.now()
        if period == "day":
            start_date = end_date - timedelta(days=1)
        elif period == "week":
            start_date = end_date - timedelta(weeks=1)
        elif period == "month":
            start_date = end_date - timedelta(days=30)
        else:
            start_date = end_date - timedelta(weeks=1)
        
        hours = get_peak_hours(start_date, end_date)
        
        return {
            "success": True,
            "hours": hours
        }
        
    except Exception as e:
        log_error(f"Error getting peak hours: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=500)


@router.get("/analytics/visitors/dashboard")
async def get_visitor_dashboard(
    period: str = "week",
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    max_distance: float = 50,
    session_token: Optional[str] = Cookie(None)
):
    """
    Консолидированный endpoint для получения всех данных аналитики посетителей одним запросом.
    Поддерживает стандартные периоды и произвольные даты.
    Кэширование: 30 секунд.
    """
    user = require_auth(session_token)
    if not user or user["role"] not in ["admin", "director"]:
        return JSONResponse({"error": "Forbidden"}, status_code=403)

    start_time = time.time()
    
    # Generate cache key
    cache_key = f"visitor_dashboard_{period}_{date_from}_{date_to}_{max_distance}"
    
    # Try Redis cache first (if available)
    cache_check_start = time.time()
    if cache.enabled:
        cached_data = cache.get(cache_key)
        if cached_data is not None:
            duration = time.time() - start_time
            log_info(f"⚡ Dashboard Redis cache HIT ({duration:.4f}s) for {period}", "api")
            return cached_data
    
    # Fallback to in-memory cache
    if cache_key in _dashboard_cache:
        cached_data, cached_time = _dashboard_cache[cache_key]
        if time.time() - cached_time < _cache_ttl:
            duration = time.time() - start_time
            log_info(f"⚡ Dashboard memory cache HIT ({duration:.4f}s) for {period}", "api")
            return cached_data
    cache_check_duration = time.time() - cache_check_start
    
    try:
        # Calculate date range
        date_calc_start = time.time()
        end_date = datetime.now()
        if date_from and date_to:
            try:
                start_date = datetime.fromisoformat(date_from)
                # Устанавливаем конец дня для date_to
                end_date = datetime.fromisoformat(date_to).replace(hour=23, minute=59, second=59)
            except ValueError:
                return JSONResponse({"error": "Invalid date format. Use ISO format."}, status_code=400)
        elif period == "day" or period == "1":
            start_date = end_date - timedelta(days=1)
        elif period == "3":
            start_date = end_date - timedelta(days=3)
        elif period == "week" or period == "7":
            start_date = end_date - timedelta(weeks=1)
        elif period == "month" or period == "30":
            start_date = end_date - timedelta(days=30)
        else:
            start_date = end_date - timedelta(weeks=1)
        date_calc_duration = time.time() - date_calc_start

        # Используем одну функцию для получения всех данных
        data_fetch_start = time.time()
        from db.visitor_tracking import get_all_visitor_analytics
        data = get_all_visitor_analytics(start_date, end_date, max_distance)
        data_fetch_duration = time.time() - data_fetch_start

        duration = time.time() - start_time
        log_info(f"⏱️ Dashboard computed in {duration:.4f}s for {period} (cache_check: {cache_check_duration:.3f}s, date_calc: {date_calc_duration:.3f}s, data_fetch: {data_fetch_duration:.3f}s)", "api")

        response = {
            "success": True,
            "period": period,
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "data": data
        }
        
        # Cache in Redis (if available)
        if cache.enabled:
            cache.set(cache_key, response, expire=300)  # 5 minutes
        
        # Cache in memory as fallback
        _dashboard_cache[cache_key] = (response, time.time())
        
        # Clean old cache entries (keep only last 20)
        if len(_dashboard_cache) > 20:
            oldest_key = min(_dashboard_cache.keys(), key=lambda k: _dashboard_cache[k][1])
            del _dashboard_cache[oldest_key]

        return response

    except Exception as e:
        log_error(f"Error getting visitor dashboard: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=500)


@router.delete("/analytics/visitors/bulk-delete")
async def bulk_delete_visitors(
    request: Request,
    session_token: Optional[str] = Cookie(None)
):
    """
    Bulk delete visitor records (Director only)
    Accepts filters: period, date_from, date_to, country, city, device_type
    """
    user = require_auth(session_token)
    if not user or user["role"] != "director":
        return JSONResponse({"error": "Forbidden - Director only"}, status_code=403)
    
    try:
        data = await request.json()
        
        period = data.get('period')
        date_from = data.get('date_from')
        date_to = data.get('date_to')
        country = data.get('country')
        city = data.get('city')
        device_type = data.get('device_type')
        
        # Calculate date range if period specified
        end_date = datetime.now()
        start_date = None
        
        if date_from and date_to:
            start_date = datetime.fromisoformat(date_from)
            end_date = datetime.fromisoformat(date_to).replace(hour=23, minute=59, second=59)
        elif period:
            if period == "day" or period == "1":
                start_date = end_date - timedelta(days=1)
            elif period == "3":
                start_date = end_date - timedelta(days=3)
            elif period == "week" or period == "7":
                start_date = end_date - timedelta(weeks=1)
            elif period == "14":
                start_date = end_date - timedelta(days=14)
            elif period == "month" or period == "30":
                start_date = end_date - timedelta(days=30)
            elif period == "90":
                start_date = end_date - timedelta(days=90)
        
        deleted_count = bulk_delete_visitor_records(
            start_date=start_date,
            end_date=end_date,
            country=country,
            city=city,
            device_type=device_type
        )
        
        log_info(f"🗑️ Director {user['username']} deleted {deleted_count} visitor records", "api")
        
        # Clear cache after deletion
        if cache.enabled:
            cache.delete_pattern("visitor_dashboard_*")
        _dashboard_cache.clear()
        
        return {
            "success": True,
            "deleted_count": deleted_count,
            "message": f"Deleted {deleted_count} visitor records"
        }
        
    except Exception as e:
        log_error(f"Error bulk deleting visitors: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=500)
