"""
API Endpoints для Dashboard и аналитики
"""
from fastapi import APIRouter, Request, Cookie, Query, Depends, HTTPException
from fastapi.responses import JSONResponse
from typing import Optional
from utils.utils import require_auth
from utils.logger import log_error, log_info
from services.analytics import AnalyticsService
from core.auth import get_current_user_or_redirect as get_current_user
from db.connection import get_db_connection

router = APIRouter(tags=["Dashboard"])

@router.post("/dashboard/migrate-payroll")
async def migrate_payroll_columns(
    current_user: dict = Depends(get_current_user)
):
    """
    Добавить колонки для расчета зарплаты (только для admin/director).
    """
    if not current_user or current_user.get('role') not in ['admin', 'director']:
        raise HTTPException(status_code=403, detail="Forbidden")
    
    conn = None
    try:
        conn = get_db_connection()
        c = conn.cursor()
        
        columns_to_add = [
            ("hourly_rate", "REAL DEFAULT 0"),
            ("daily_rate", "REAL DEFAULT 0"),
            ("per_booking_rate", "REAL DEFAULT 0")
        ]
        
        for col_name, col_type in columns_to_add:
            try:
                c.execute(f"ALTER TABLE users ADD COLUMN IF NOT EXISTS {col_name} {col_type}")
                log_info(f"✅ Added column {col_name}", "migration")
            except Exception as e:
                log_error(f"Column {col_name} error: {e}", "migration")
        
        conn.commit()
        return {"success": True, "message": "Payroll columns added"}
    except Exception as e:
        if conn:
            conn.rollback()
        log_error(f"Migration failed: {e}", "migration")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            conn.close()

@router.get("/dashboard/employee-stats")
async def get_employee_stats(
    current_user: dict = Depends(get_current_user)
):
    """
    Получить статистику для текущего сотрудника (rating, income).
    """
    if not current_user:
        return JSONResponse(status_code=401, content={"error": "Unauthorized"})

    service = AnalyticsService()
    try:
        stats = service.get_employee_dashboard_stats(current_user['id'])
        return stats
    finally:
        del service

@router.get("/dashboard/kpi")
async def get_dashboard_kpi(
    period: str = Query("month", description="Period: today, week, month, year, custom"),
    start_date: Optional[str] = Query(None, description="Start date for custom period (YYYY-MM-DD HH:MM:SS)"),
    end_date: Optional[str] = Query(None, description="End date for custom period (YYYY-MM-DD HH:MM:SS)"),
    master: Optional[str] = Query(None, description="Filter by master name"),
    session_token: Optional[str] = Cookie(None)
):
    """
    Получить все KPI метрики для Dashboard
    """
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
        
    # RBAC: Clients cannot see KPI
    if user["role"] == "client":
        return JSONResponse({"error": "Forbidden"}, status_code=403)

    try:
        analytics = AnalyticsService()
        kpi = analytics.get_dashboard_kpi(
            period=period,
            start_date=start_date,
            end_date=end_date,
            master_filter=master
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

    # RBAC: Clients cannot see master stats
    if user["role"] == "client":
        return JSONResponse({"error": "Forbidden"}, status_code=403)

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
