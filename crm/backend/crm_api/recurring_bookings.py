"""
API: Повторяющиеся записи (Recurring Bookings)
Автоматическое создание записей по расписанию
"""
from fastapi import APIRouter, Query, Cookie
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date, timedelta

from db.connection import get_db_connection
from utils.utils import require_auth
from utils.logger import log_error

router = APIRouter(tags=["Recurring Bookings"])

FREQUENCY_OPTIONS = ["weekly", "biweekly", "monthly", "custom"]


class RecurringModel(BaseModel):
    client_instagram_id: str
    service_id: Optional[int] = None
    employee_id: Optional[int] = None
    frequency: str = "weekly"
    day_of_week: Optional[int] = None     # 0=Mon ... 6=Sun
    day_of_month: Optional[int] = None
    time_of_day: Optional[str] = None
    duration_minutes: int = 60
    advance_days: int = 3
    auto_confirm: bool = False
    notes: Optional[str] = None


def _rows(c):
    cols = [d[0] for d in c.description]
    return [dict(zip(cols, r)) for r in c.fetchall()]


def _s(d):
    for k, v in d.items():
        if isinstance(v, (datetime, date)):
            d[k] = v.isoformat()
    return d


def _next_date(frequency: str, day_of_week: int = None,
               day_of_month: int = None, from_date: date = None) -> date:
    """Вычисляем следующую дату по правилу повторения"""
    today = from_date or date.today()
    if frequency == "weekly" and day_of_week is not None:
        days_ahead = (day_of_week - today.weekday()) % 7
        if days_ahead == 0:
            days_ahead = 7
        return today + timedelta(days=days_ahead)
    elif frequency == "biweekly" and day_of_week is not None:
        days_ahead = (day_of_week - today.weekday()) % 7
        if days_ahead == 0:
            days_ahead = 14
        elif days_ahead < 7:
            days_ahead += 7
        return today + timedelta(days=days_ahead)
    elif frequency == "monthly" and day_of_month is not None:
        month = today.month
        year = today.year
        try:
            next_d = date(year, month, day_of_month)
        except ValueError:
            next_d = date(year, month, 28)
        if next_d <= today:
            month = month + 1 if month < 12 else 1
            year = year + 1 if month == 1 else year
            try:
                next_d = date(year, month, day_of_month)
            except ValueError:
                next_d = date(year, month, 28)
        return next_d
    else:
        return today + timedelta(days=7)


@router.get("/recurring-bookings")
async def list_recurring(
    session_token: Optional[str] = Cookie(None),
):
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    company_id = user.get("company_id")
    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute("""
            SELECT r.*, s.name AS service_name, u.full_name AS employee_name,
                   cl.name AS client_name, cl.phone AS client_phone
            FROM recurring_bookings r
            LEFT JOIN services s ON s.id = r.service_id
            LEFT JOIN users u ON u.id = r.employee_id
            LEFT JOIN clients cl ON cl.instagram_id = r.client_instagram_id
            WHERE r.company_id=%s
            ORDER BY r.created_at DESC
        """, (company_id,))
        rows = [_s(r) for r in _rows(c)]
        return JSONResponse({"rules": rows})
    finally:
        conn.close()


@router.post("/recurring-bookings")
async def create_recurring(
    body: RecurringModel,
    session_token: Optional[str] = Cookie(None),
):
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    company_id = user.get("company_id")
    next_date = _next_date(body.frequency, body.day_of_week, body.day_of_month)

    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute("""
            INSERT INTO recurring_bookings
              (company_id,client_instagram_id,service_id,employee_id,frequency,
               day_of_week,day_of_month,time_of_day,duration_minutes,
               advance_days,auto_confirm,notes,next_booking_date)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id
        """, (company_id, body.client_instagram_id, body.service_id, body.employee_id,
              body.frequency, body.day_of_week, body.day_of_month, body.time_of_day,
              body.duration_minutes, body.advance_days, body.auto_confirm,
              body.notes, next_date))
        rec_id = c.fetchone()[0]
        conn.commit()
        return JSONResponse({"success": True, "id": rec_id, "next_date": next_date.isoformat()})
    except Exception as e:
        conn.rollback()
        return JSONResponse({"error": str(e)}, status_code=500)
    finally:
        conn.close()


@router.patch("/recurring-bookings/{rec_id}/toggle")
async def toggle_recurring(
    rec_id: int,
    session_token: Optional[str] = Cookie(None),
):
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    company_id = user.get("company_id")
    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute("""
            UPDATE recurring_bookings SET is_active = NOT is_active
            WHERE id=%s AND company_id=%s RETURNING is_active
        """, (rec_id, company_id))
        row = c.fetchone()
        conn.commit()
        return JSONResponse({"success": True, "is_active": row[0] if row else False})
    finally:
        conn.close()


@router.delete("/recurring-bookings/{rec_id}")
async def delete_recurring(
    rec_id: int,
    session_token: Optional[str] = Cookie(None),
):
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    company_id = user.get("company_id")
    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute("DELETE FROM recurring_bookings WHERE id=%s AND company_id=%s", (rec_id, company_id))
        conn.commit()
        return JSONResponse({"success": c.rowcount > 0})
    finally:
        conn.close()


@router.post("/recurring-bookings/process")
async def process_recurring(session_token: Optional[str] = Cookie(None)):
    """
    Создаёт записи для всех активных правил с next_booking_date <= today + advance_days.
    Вызывается планировщиком или вручную.
    """
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    if user.get("role") not in ["admin", "director"]:
        return JSONResponse({"error": "Forbidden"}, status_code=403)

    company_id = user.get("company_id")
    today = date.today()
    created_count = 0

    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute("""
            SELECT * FROM recurring_bookings
            WHERE company_id=%s AND is_active=TRUE
              AND next_booking_date <= %s + advance_days * INTERVAL '1 day'
        """, (company_id, today))
        rules_cols = [d[0] for d in c.description]
        rules = [dict(zip(rules_cols, r)) for r in c.fetchall()]

        for rule in rules:
            nd = rule["next_booking_date"]
            dt_str = f"{nd} {rule['time_of_day'] or '09:00'}"
            status = "confirmed" if rule["auto_confirm"] else "pending"

            c.execute("""
                INSERT INTO bookings (company_id, instagram_id, service_id, employee_id,
                  datetime, duration_minutes, status, notes)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s)
                ON CONFLICT DO NOTHING
            """, (company_id, rule["client_instagram_id"], rule["service_id"], rule["employee_id"],
                  dt_str, rule["duration_minutes"], status,
                  f"[Авто] {rule.get('notes','') or ''}"))
            created_count += 1

            # Обновляем next_booking_date
            next_d = _next_date(rule["frequency"], rule.get("day_of_week"),
                                 rule.get("day_of_month"), nd)
            c.execute("UPDATE recurring_bookings SET next_booking_date=%s WHERE id=%s",
                      (next_d, rule["id"]))

        conn.commit()
        return JSONResponse({"success": True, "created": created_count})
    except Exception as e:
        conn.rollback()
        return JSONResponse({"error": str(e)}, status_code=500)
    finally:
        conn.close()
