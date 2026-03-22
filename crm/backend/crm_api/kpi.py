"""
API: KPI сотрудников
Цели, факт выполнения, бонусы
"""
from fastapi import APIRouter, Query, Cookie
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date

from db.connection import get_db_connection
from utils.utils import require_auth

router = APIRouter(tags=["KPI"])


class KPITarget(BaseModel):
    employee_id: int
    period_type: str = "month"
    period_start: str
    period_end: str
    target_bookings: int = 0
    target_revenue: float = 0
    target_new_clients: int = 0
    target_avg_check: float = 0
    bonus_threshold: float = 0
    bonus_amount: float = 0


def _rows(c):
    cols = [d[0] for d in c.description]
    return [dict(zip(cols, r)) for r in c.fetchall()]


def _s(d):
    for k, v in d.items():
        if isinstance(v, (datetime, date)):
            d[k] = v.isoformat()
    return d


def _calc_actual(c, company_id: int, employee_id: int, period_start: str, period_end: str) -> dict:
    """Считаем факт по бронированиям"""
    c.execute("""
        SELECT
            COUNT(*) AS bookings,
            COALESCE(SUM(revenue),0) AS revenue,
            COALESCE(AVG(NULLIF(revenue,0)),0) AS avg_check,
            COUNT(DISTINCT b.instagram_id) AS clients
        FROM bookings b
        WHERE b.company_id=%s
          AND b.employee_id=%s
          AND DATE(b.datetime) BETWEEN %s AND %s
          AND b.status='completed'
    """, (company_id, employee_id, period_start, period_end))
    row = c.fetchone()
    return {
        "actual_bookings": row[0] or 0,
        "actual_revenue": float(row[1] or 0),
        "actual_avg_check": float(row[2] or 0),
        "actual_clients": row[3] or 0,
    }


@router.get("/kpi")
async def list_kpi(
    period_start: Optional[str] = Query(None),
    period_end: Optional[str] = Query(None),
    employee_id: Optional[int] = Query(None),
    session_token: Optional[str] = Cookie(None),
):
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    company_id = user.get("company_id")
    conn = get_db_connection()
    c = conn.cursor()
    try:
        sql = """
            SELECT k.*, u.full_name AS employee_name, u.profile_pic
            FROM kpi_targets k
            JOIN users u ON u.id = k.employee_id
            WHERE k.company_id=%s
        """
        params = [company_id]
        if employee_id:
            sql += " AND k.employee_id=%s"; params.append(employee_id)
        if period_start:
            sql += " AND k.period_end >= %s"; params.append(period_start)
        if period_end:
            sql += " AND k.period_start <= %s"; params.append(period_end)
        sql += " ORDER BY k.period_start DESC, u.full_name"
        c.execute(sql, params)
        targets = [_s(r) for r in _rows(c)]

        # Добавляем факт
        for t in targets:
            actual = _calc_actual(c, company_id, t["employee_id"],
                                  t["period_start"], t["period_end"])
            t.update(actual)
            # Процент выполнения
            t["pct_bookings"] = round(t["actual_bookings"] / t["target_bookings"] * 100, 1) if t["target_bookings"] else 0
            t["pct_revenue"] = round(t["actual_revenue"] / t["target_revenue"] * 100, 1) if t["target_revenue"] else 0
            t["bonus_earned"] = t["bonus_amount"] if t["actual_revenue"] >= t["bonus_threshold"] and t["bonus_threshold"] > 0 else 0

        return JSONResponse({"targets": targets})
    finally:
        conn.close()


@router.post("/kpi")
async def create_kpi(
    body: KPITarget,
    session_token: Optional[str] = Cookie(None),
):
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    if user.get("role") not in ["admin", "director", "manager"]:
        return JSONResponse({"error": "Forbidden"}, status_code=403)

    company_id = user.get("company_id")
    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute("""
            INSERT INTO kpi_targets (company_id,employee_id,period_type,period_start,period_end,
              target_bookings,target_revenue,target_new_clients,target_avg_check,
              bonus_threshold,bonus_amount)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
            ON CONFLICT DO NOTHING RETURNING id
        """, (company_id, body.employee_id, body.period_type, body.period_start, body.period_end,
              body.target_bookings, body.target_revenue, body.target_new_clients,
              body.target_avg_check, body.bonus_threshold, body.bonus_amount))
        row = c.fetchone()
        conn.commit()
        return JSONResponse({"success": True, "id": row[0] if row else None})
    except Exception as e:
        conn.rollback()
        return JSONResponse({"error": str(e)}, status_code=500)
    finally:
        conn.close()


@router.put("/kpi/{kpi_id}")
async def update_kpi(
    kpi_id: int,
    body: KPITarget,
    session_token: Optional[str] = Cookie(None),
):
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    if user.get("role") not in ["admin", "director", "manager"]:
        return JSONResponse({"error": "Forbidden"}, status_code=403)

    company_id = user.get("company_id")
    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute("""
            UPDATE kpi_targets SET
              target_bookings=%s,target_revenue=%s,target_new_clients=%s,
              target_avg_check=%s,bonus_threshold=%s,bonus_amount=%s
            WHERE id=%s AND company_id=%s
        """, (body.target_bookings, body.target_revenue, body.target_new_clients,
              body.target_avg_check, body.bonus_threshold, body.bonus_amount,
              kpi_id, company_id))
        conn.commit()
        return JSONResponse({"success": c.rowcount > 0})
    finally:
        conn.close()


@router.delete("/kpi/{kpi_id}")
async def delete_kpi(
    kpi_id: int,
    session_token: Optional[str] = Cookie(None),
):
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    company_id = user.get("company_id")
    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute("DELETE FROM kpi_targets WHERE id=%s AND company_id=%s", (kpi_id, company_id))
        conn.commit()
        return JSONResponse({"success": c.rowcount > 0})
    finally:
        conn.close()


@router.get("/kpi/leaderboard")
async def leaderboard(
    period_start: Optional[str] = Query(None),
    period_end: Optional[str] = Query(None),
    session_token: Optional[str] = Cookie(None),
):
    """Рейтинг сотрудников по выручке и записям"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    company_id = user.get("company_id")
    if not period_start:
        period_start = date.today().replace(day=1).isoformat()
    if not period_end:
        period_end = date.today().isoformat()

    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute("""
            SELECT
                u.id, u.full_name, u.profile_pic,
                COUNT(b.id) AS bookings,
                COALESCE(SUM(b.revenue),0) AS revenue,
                COALESCE(AVG(NULLIF(b.revenue,0)),0) AS avg_check,
                COUNT(DISTINCT b.instagram_id) AS unique_clients
            FROM users u
            LEFT JOIN bookings b ON b.employee_id=u.id
                AND DATE(b.datetime) BETWEEN %s AND %s
                AND b.status='completed'
                AND b.company_id=%s
            WHERE u.company_id=%s AND u.role='employee' AND u.is_active=TRUE
            GROUP BY u.id, u.full_name, u.profile_pic
            ORDER BY revenue DESC
        """, (period_start, period_end, company_id, company_id))
        cols = [d[0] for d in c.description]
        rows = [dict(zip(cols, r)) for r in c.fetchall()]
        for i, r in enumerate(rows):
            r["rank"] = i + 1
            r["revenue"] = float(r["revenue"])
            r["avg_check"] = float(r["avg_check"])
        return JSONResponse({"leaderboard": rows, "period": {"from": period_start, "to": period_end}})
    finally:
        conn.close()
