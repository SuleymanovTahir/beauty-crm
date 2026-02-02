"""
API endpoints для расчета зарплат (Payroll)
"""
from fastapi import APIRouter, Depends, Query, HTTPException
from typing import Optional, List, Dict
from datetime import datetime
from db.connection import get_db_connection
from core.auth import get_current_user_or_redirect as get_current_user
from utils.logger import log_info, log_error
from pydantic import BaseModel

router = APIRouter(tags=["Payroll"])

class PayrollCalculateRequest(BaseModel):
    employee_id: int
    start_date: str
    end_date: str

@router.post("/payroll/calculate")
async def calculate_payroll(
    data: PayrollCalculateRequest,
    current_user: dict = Depends(get_current_user)
):
    """Рассчитать зарплату сотрудника за период"""
    if not current_user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    if current_user.get("role") not in ["admin", "director"]:
        raise HTTPException(status_code=403, detail="Forbidden")

    conn = get_db_connection()
    c = conn.cursor()

    try:
        # 1. Получаем настройки сотрудника (оклад и % комиссии)
        c.execute("SELECT full_name, base_salary, commission_rate FROM users WHERE id = %s", (data.employee_id,))
        emp_row = c.fetchone()
        if not emp_row:
            raise HTTPException(status_code=404, detail="Employee not found")
        
        full_name, base_salary, commission_rate = emp_row
        
        # Get currency from salon settings
        c.execute("SELECT currency FROM salon_settings WHERE id = 1")
        salon_row = c.fetchone()
        default_currency = salon_row[0] if salon_row else "AED"
        
        # 2. Получаем все завершенные записи этого мастера за период
        # Примечание: предполагается, что в bookings.datetime хранится "YYYY-MM-DD HH:MM"
        # Нам нужно сравнивать только дату или весь стринг
        c.execute("""
            SELECT id, revenue, service_name, datetime, status 
            FROM bookings 
            WHERE master = %s 
            AND status = 'completed'
            AND datetime >= %s 
            AND datetime <= %s
        """, (full_name, data.start_date + " 00:00", data.end_date + " 23:59"))
        
        bookings = c.fetchall()
        
        total_revenue = sum(row[1] for row in bookings if row[1])
        total_bookings = len(bookings)
        
        # 3. Расчет
        # Комиссия считается от выручки
        commission_amount = (total_revenue * (commission_rate or 0)) / 100
        
        # Итоговая зарплата за период (упрощенно: оклад + комиссия)
        # В идеале оклад должен делиться на количество дней в месяце, 
        # но для начала возьмем фиксированный оклад + бонусы.
        calculated_salary = (base_salary or 0) + commission_amount

        return {
            "employee_id": data.employee_id,
            "full_name": full_name,
            "total_bookings": total_bookings,
            "total_revenue": round(total_revenue, 2),
            "base_salary": base_salary,
            "commission_rate": commission_rate,
            "commission_amount": round(commission_amount, 2),
            "calculated_salary": round(calculated_salary, 2),
            "currency": default_currency or "AED",
            "period_start": data.start_date,
            "period_end": data.end_date
        }

    except Exception as e:
        log_error(f"Error calculating payroll: {e}", "api")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

class PayrollRecordRequest(BaseModel):
    employee_id: int
    amount: float
    currency: str
    period_start: str
    period_end: str

@router.post("/payroll/record-payment")
async def record_payment(
    data: PayrollRecordRequest,
    current_user: dict = Depends(get_current_user)
):
    """Записать факт выплаты зарплаты в историю"""
    if not current_user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    if current_user.get("role") not in ["admin", "director"]:
        raise HTTPException(status_code=403, detail="Forbidden")

    conn = get_db_connection()
    c = conn.cursor()

    try:
        c.execute("""
            INSERT INTO payroll_payments (employee_id, amount, currency, period_start, period_end)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id
        """, (data.employee_id, data.amount, data.currency, data.period_start, data.period_end))
        
        payment_id = c.fetchone()[0]
        conn.commit()
        
        log_info(f"Payment recorded: ID={payment_id}, Emp={data.employee_id}, Amount={data.amount}", "api")
        return {"status": "success", "payment_id": payment_id}

    except Exception as e:
        log_error(f"Error recording payment: {e}", "api")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.get("/payroll/history/{employee_id}")
async def get_payroll_history(
    employee_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Получить историю реальных выплат сотруднику"""
    if not current_user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    if current_user.get("role") not in ["admin", "director"] and current_user.get("id") != employee_id:
        raise HTTPException(status_code=403, detail="Forbidden")
    
    conn = get_db_connection()
    c = conn.cursor()

    try:
        c.execute("""
            SELECT id, period_start, period_end, amount, currency, created_at, status
            FROM payroll_payments
            WHERE employee_id = %s
            ORDER BY created_at DESC
        """, (employee_id,))
        
        rows = c.fetchall()
        history = []
        for row in rows:
            history.append({
                "id": row[0],
                "period_start": row[1],
                "period_end": row[2],
                "total_amount": row[3],
                "currency": row[4],
                "created_at": row[5],
                "status": row[6]
            })
            
        return history

    except Exception as e:
        log_error(f"Error fetching payroll history: {e}", "api")
        return []
    finally:
        conn.close()

class PayrollStatusUpdateRequest(BaseModel):
    payment_id: int
    status: str  # pending, paid, cancelled

@router.post("/payroll/update-status")
async def update_payment_status(
    data: PayrollStatusUpdateRequest,
    current_user: dict = Depends(get_current_user)
):
    """Обновить статус выплаты"""
    if not current_user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    if current_user.get("role") not in ["admin", "director"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    
    valid_statuses = ["pending", "paid", "cancelled"]
    if data.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
    
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        c.execute("UPDATE payroll_payments SET status = %s WHERE id = %s", (data.status, data.payment_id))
        conn.commit()
        return {"success": True, "message": f"Status updated to {data.status}"}
    except Exception as e:
        log_error(f"Error updating payment status: {e}", "api")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()
