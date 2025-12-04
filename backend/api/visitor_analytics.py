"""
API endpoints for visitor analytics
"""
from fastapi import APIRouter, Request, Cookie
from fastapi.responses import JSONResponse
from typing import Optional
from datetime import datetime, timedelta
from db.visitor_tracking import get_visitor_stats, get_location_distribution, get_country_distribution, get_city_distribution, get_distance_distribution, get_visitor_trend, get_landing_sections, get_peak_hours
from utils.utils import require_auth
from utils.logger import log_info, log_error
from fastapi.responses import StreamingResponse
import csv
import io

router = APIRouter(tags=["Analytics"])

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
        writer.writerow(['Город', 'Страна', 'Расстояние (км)', 'Местный', 'Время посещения'])
        
        # Data
        for visitor in visitors:
            writer.writerow([
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
