"""
API Endpoints для расчета зарплаты сотрудников
Универсальная система для любого бизнеса
"""
from fastapi import APIRouter, Request, Cookie, Depends
from fastapi.responses import JSONResponse
from typing import Optional
import sqlite3
from datetime import datetime, timedelta

from core.config import DATABASE_NAME
from utils.utils import require_auth
from utils.logger import log_info, log_error
from core.auth import get_current_user_or_redirect as get_current_user

router = APIRouter(tags=["Salary"])


@router.get("/salary/settings/{user_id}")
async def get_user_salary_settings(user_id: int, current_user: dict = Depends(get_current_user)):
    """Получить настройки зарплаты для конкретного пользователя"""
    try:
        conn = sqlite3.connect(DATABASE_NAME)
        conn.row_factory = sqlite3.Row
        c = conn.cursor()

        c.execute("""
            SELECT uss.*, u.full_name
            FROM user_salary_settings uss
            JOIN users u ON uss.user_id = u.id
            WHERE uss.user_id = ?
        """, (user_id,))
        
        row = c.fetchone()
        if not row:
            return {"success": False, "error": "Настройки зарплаты не найдены"}
        
        columns = [description[0] for description in c.description]
        settings = dict(zip(columns, row))
        
        return {"success": True, "settings": settings}
    except Exception as e:
        log_error(f"Error getting salary settings: {e}", "salary")
        return {"success": False, "error": str(e)}
    finally:
        conn.close()


@router.post("/salary/settings/{user_id}")
async def update_salary_settings(user_id: int, request: Request, current_user: dict = Depends(get_current_user)):
    """Обновить настройки зарплаты пользователя"""
    if current_user["role"] not in ["admin", "director"]:
        return JSONResponse({"error": "Forbidden"}, status_code=403)

    try:
        data = await request.json()
        
        conn = sqlite3.connect(DATABASE_NAME)
        c = conn.cursor()
        
        # Проверяем существование пользователя
        c.execute("SELECT id FROM users WHERE id = ?", (user_id,))
        if not c.fetchone():
            return {"success": False, "error": "Пользователь не найден"}
        
        # Обновляем или создаем настройки
        c.execute("""
            INSERT OR REPLACE INTO user_salary_settings
            (user_id, salary_type, hourly_rate, monthly_rate, commission_rate,
             bonus_rate, currency, is_active, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        """, (
            user_id,
            data.get("salary_type", "hourly"),
            data.get("hourly_rate", 0),
            data.get("monthly_rate", 0),
            data.get("commission_rate", 0),
            data.get("bonus_rate", 0),
            data.get("currency", "AED"),
            1
        ))
        
        conn.commit()
        conn.close()
        
        log_info(f"Salary settings updated for user {user_id}", "salary")
        return {"success": True, "message": "Настройки зарплаты обновлены"}
    except Exception as e:
        log_error(f"Error updating salary settings: {e}", "salary")
        return {"success": False, "error": str(e)}


@router.post("/salary/calculate")
async def calculate_salary(
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Рассчитать зарплату за период"""
    if current_user["role"] not in ["admin", "director"]:
        return JSONResponse({"error": "Forbidden"}, status_code=403)

    data = await request.json()
    user_id = data.get("user_id")
    period_start = data.get("period_start")
    period_end = data.get("period_end")

    if not all([user_id, period_start, period_end]):
        return JSONResponse({"error": "Missing required fields"}, status_code=400)

    try:
        conn = sqlite3.connect(DATABASE_NAME)
        conn.row_factory = sqlite3.Row
        c = conn.cursor()

        # Получить настройки зарплаты
        c.execute("""
            SELECT * FROM user_salary_settings
            WHERE user_id = ? AND is_active = 1
        """, (user_id,))
        settings = c.fetchone()

        if not settings:
            return JSONResponse({"error": "Salary settings not found"}, status_code=404)

        # Получить выполненные услуги за период
        c.execute("""
            SELECT COUNT(*) as count, SUM(b.price) as revenue
            FROM bookings b
            WHERE b.master = (SELECT name FROM employees WHERE id = ?)
            AND b.status = 'completed'
            AND b.datetime BETWEEN ? AND ?
        """, (user_id, period_start, period_end))
        services = c.fetchone()

        services_completed = services["count"] or 0
        services_revenue = services["revenue"] or 0

        # Расчет зарплаты
        base_salary = 0
        commission_amount = 0

        if settings["salary_type"] == "hourly":
            # Предполагаем 8 часов в день
            days = (datetime.fromisoformat(period_end) - datetime.fromisoformat(period_start)).days
            hours_worked = days * 8
            base_salary = hours_worked * settings["hourly_rate"]
        elif settings["salary_type"] == "monthly":
            base_salary = settings["monthly_rate"]
        elif settings["salary_type"] == "commission":
            base_salary = 0
            commission_amount = services_revenue * (settings["commission_rate"] / 100)
        elif settings["salary_type"] == "mixed":
            base_salary = settings["monthly_rate"]
            commission_amount = services_revenue * (settings["commission_rate"] / 100)

        total_salary = base_salary + commission_amount

        # Сохранить расчет
        c.execute("""
            INSERT INTO salary_calculations
            (employee_id, period_start, period_end, services_completed, services_revenue,
             base_salary, commission_amount, total_salary, status, calculated_at, calculated_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', datetime('now'), ?)
        """, (
            employee_id, period_start, period_end, services_completed, services_revenue,
            base_salary, commission_amount, total_salary, current_user["id"]
        ))

        calculation_id = c.lastrowid
        conn.commit()
        conn.close()

        log_info(f"Salary calculated for employee {employee_id}: {total_salary}", "salary")

        return {
            "success": True,
            "calculation_id": calculation_id,
            "employee_id": employee_id,
            "period_start": period_start,
            "period_end": period_end,
            "services_completed": services_completed,
            "services_revenue": services_revenue,
            "base_salary": base_salary,
            "commission_amount": commission_amount,
            "total_salary": total_salary
        }

    except Exception as e:
        log_error(f"Error calculating salary: {e}", "salary")
        return JSONResponse({"error": str(e)}, status_code=500)


@router.get("/salary/calculations")
async def get_salary_calculations(current_user: dict = Depends(get_current_user)):
    """Получить все расчеты зарплаты"""
    try:
        conn = sqlite3.connect(DATABASE_NAME)
        conn.row_factory = sqlite3.Row
        c = conn.cursor()

        c.execute("""
            SELECT
                sc.*,
                e.name as employee_name,
                u.full_name as calculated_by_name
            FROM salary_calculations sc
            JOIN employees e ON sc.employee_id = e.id
            LEFT JOIN users u ON sc.calculated_by = u.id
            ORDER BY sc.calculated_at DESC
            LIMIT 100
        """)

        calculations = [dict(row) for row in c.fetchall()]
        conn.close()

        return {"calculations": calculations}

    except Exception as e:
        log_error(f"Error fetching salary calculations: {e}", "salary")
        return JSONResponse({"error": str(e)}, status_code=500)


@router.post("/salary/{calculation_id}/approve")
async def approve_salary(
    calculation_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Утвердить расчет зарплаты"""
    if current_user["role"] not in ["admin", "director"]:
        return JSONResponse({"error": "Forbidden"}, status_code=403)

    try:
        conn = sqlite3.connect(DATABASE_NAME)
        c = conn.cursor()

        c.execute("""
            UPDATE salary_calculations
            SET status = 'approved',
                approved_at = datetime('now'),
                approved_by = ?
            WHERE id = ?
        """, (current_user["id"], calculation_id))

        conn.commit()
        conn.close()

        log_info(f"Salary calculation {calculation_id} approved", "salary")
        return {"success": True, "message": "Расчет утвержден"}

    except Exception as e:
        log_error(f"Error approving salary: {e}", "salary")
        return JSONResponse({"error": str(e)}, status_code=500)


@router.post("/salary/{calculation_id}/pay")
async def mark_salary_paid(
    calculation_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Отметить зарплату как выплаченную"""
    if current_user["role"] not in ["admin", "director"]:
        return JSONResponse({"error": "Forbidden"}, status_code=403)

    try:
        conn = sqlite3.connect(DATABASE_NAME)
        c = conn.cursor()

        c.execute("""
            UPDATE salary_calculations
            SET status = 'paid',
                paid_at = datetime('now')
            WHERE id = ?
        """, (calculation_id,))

        conn.commit()
        conn.close()

        log_info(f"Salary calculation {calculation_id} marked as paid", "salary")
        return {"success": True, "message": "Зарплата выплачена"}

    except Exception as e:
        log_error(f"Error marking salary as paid: {e}", "salary")
        return JSONResponse({"error": str(e)}, status_code=500)
