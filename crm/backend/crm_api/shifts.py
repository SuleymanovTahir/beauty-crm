"""
API: Смены и Табель рабочего времени
"""
from fastapi import APIRouter, Query, Cookie
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date, timedelta
import csv, io

from db.connection import get_db_connection
from utils.utils import require_auth

router = APIRouter(tags=["Shifts"])


class ShiftModel(BaseModel):
    employee_id: int
    shift_date: str
    planned_start: Optional[str] = None
    planned_end: Optional[str] = None
    notes: Optional[str] = None


class CheckinModel(BaseModel):
    employee_id: Optional[int] = None  # для менеджера; для сотрудника берётся из токена


def _rows(c):
    cols = [d[0] for d in c.description]
    return [dict(zip(cols, r)) for r in c.fetchall()]


def _s(d):
    for k, v in d.items():
        if isinstance(v, (datetime, date)):
            d[k] = v.isoformat()
    return d


@router.get("/shifts")
async def list_shifts(
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    employee_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    format: str = Query("json"),
    session_token: Optional[str] = Cookie(None),
):
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    company_id = user.get("company_id")
    if not date_from:
        date_from = (date.today() - timedelta(days=30)).isoformat()
    if not date_to:
        date_to = date.today().isoformat()

    conn = get_db_connection()
    c = conn.cursor()
    try:
        sql = """
            SELECT s.*, u.full_name AS employee_name, u.profile_pic,
                   EXTRACT(EPOCH FROM (s.actual_end - s.actual_start))/3600 AS hours_worked
            FROM shifts s
            JOIN users u ON u.id = s.employee_id
            WHERE s.company_id=%s AND s.shift_date BETWEEN %s AND %s
        """
        params = [company_id, date_from, date_to]
        if employee_id:
            sql += " AND s.employee_id=%s"; params.append(employee_id)
        if status:
            sql += " AND s.status=%s"; params.append(status)
        sql += " ORDER BY s.shift_date DESC, u.full_name"
        c.execute(sql, params)
        rows = [_s(r) for r in _rows(c)]

        if format == "csv":
            output = io.StringIO()
            writer = csv.writer(output)
            writer.writerow(["Сотрудник", "Дата", "План начало", "План конец",
                              "Факт приход", "Факт уход", "Часов", "Статус"])
            for r in rows:
                writer.writerow([
                    r.get("employee_name"), r.get("shift_date"),
                    r.get("planned_start"), r.get("planned_end"),
                    r.get("actual_start"), r.get("actual_end"),
                    round(r.get("hours_worked") or 0, 2), r.get("status"),
                ])
            output.seek(0)
            return StreamingResponse(
                iter([output.getvalue()]), media_type="text/csv",
                headers={"Content-Disposition": "attachment; filename=shifts.csv"}
            )

        # Итоги
        total_hours = sum(float(r.get("hours_worked") or 0) for r in rows)
        return JSONResponse({
            "shifts": rows,
            "total_hours": round(total_hours, 2),
            "count": len(rows),
        })
    finally:
        conn.close()


@router.post("/shifts")
async def create_shift(
    body: ShiftModel,
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
            INSERT INTO shifts (company_id,employee_id,shift_date,planned_start,planned_end,notes)
            VALUES (%s,%s,%s,%s,%s,%s)
            ON CONFLICT DO NOTHING RETURNING id
        """, (company_id, body.employee_id, body.shift_date,
              body.planned_start, body.planned_end, body.notes))
        row = c.fetchone()
        conn.commit()
        return JSONResponse({"success": True, "id": row[0] if row else None})
    except Exception as e:
        conn.rollback()
        return JSONResponse({"error": str(e)}, status_code=500)
    finally:
        conn.close()


@router.post("/shifts/checkin")
async def checkin(
    body: CheckinModel,
    session_token: Optional[str] = Cookie(None),
):
    """Сотрудник отмечает начало смены"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    company_id = user.get("company_id")
    employee_id = body.employee_id if (body.employee_id and user.get("role") in ["admin","director","manager"]) else user.get("id")
    today = date.today()
    now = datetime.now()

    conn = get_db_connection()
    c = conn.cursor()
    try:
        # Ищем смену на сегодня
        c.execute("""
            SELECT id, actual_start FROM shifts
            WHERE company_id=%s AND employee_id=%s AND shift_date=%s
        """, (company_id, employee_id, today))
        row = c.fetchone()
        if row:
            shift_id, started = row
            if started:
                return JSONResponse({"error": "Смена уже начата"}, status_code=400)
            c.execute("UPDATE shifts SET actual_start=%s, status='active' WHERE id=%s",
                      (now, shift_id))
        else:
            # Создаём если нет запланированной
            c.execute("""
                INSERT INTO shifts (company_id,employee_id,shift_date,actual_start,status)
                VALUES (%s,%s,%s,%s,'active') RETURNING id
            """, (company_id, employee_id, today, now))
            shift_id = c.fetchone()[0]
        conn.commit()
        return JSONResponse({"success": True, "checked_in_at": now.isoformat(), "shift_id": shift_id})
    finally:
        conn.close()


@router.post("/shifts/checkout")
async def checkout(
    body: CheckinModel,
    session_token: Optional[str] = Cookie(None),
):
    """Сотрудник отмечает конец смены"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    company_id = user.get("company_id")
    employee_id = body.employee_id if (body.employee_id and user.get("role") in ["admin","director","manager"]) else user.get("id")
    today = date.today()
    now = datetime.now()

    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute("""
            SELECT id FROM shifts
            WHERE company_id=%s AND employee_id=%s AND shift_date=%s AND status='active'
        """, (company_id, employee_id, today))
        row = c.fetchone()
        if not row:
            return JSONResponse({"error": "Активная смена не найдена"}, status_code=404)
        shift_id = row[0]
        c.execute("UPDATE shifts SET actual_end=%s, status='completed' WHERE id=%s",
                  (now, shift_id))
        conn.commit()
        return JSONResponse({"success": True, "checked_out_at": now.isoformat()})
    finally:
        conn.close()


@router.get("/shifts/summary")
async def shifts_summary(
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    session_token: Optional[str] = Cookie(None),
):
    """Сводка по сотрудникам: часы за период"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    company_id = user.get("company_id")
    if not date_from:
        date_from = date.today().replace(day=1).isoformat()
    if not date_to:
        date_to = date.today().isoformat()

    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute("""
            SELECT u.id, u.full_name,
                   COUNT(s.id) AS total_shifts,
                   COALESCE(SUM(EXTRACT(EPOCH FROM (s.actual_end - s.actual_start))/3600), 0) AS total_hours,
                   COUNT(CASE WHEN s.status='missed' THEN 1 END) AS missed_shifts,
                   COUNT(CASE WHEN s.status='completed' THEN 1 END) AS completed_shifts
            FROM users u
            LEFT JOIN shifts s ON s.employee_id=u.id
                AND s.shift_date BETWEEN %s AND %s
                AND s.company_id=%s
            WHERE u.company_id=%s AND u.role='employee' AND u.is_active=TRUE
            GROUP BY u.id, u.full_name
            ORDER BY total_hours DESC
        """, (date_from, date_to, company_id, company_id))
        cols = [d[0] for d in c.description]
        rows = [dict(zip(cols, r)) for r in c.fetchall()]
        for r in rows:
            r["total_hours"] = round(float(r["total_hours"]), 2)
        return JSONResponse({"summary": rows, "period": {"from": date_from, "to": date_to}})
    finally:
        conn.close()
