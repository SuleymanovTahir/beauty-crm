"""
API: Лист ожидания (Waitlist)
Клиенты встают в очередь когда нет свободных слотов
"""
from fastapi import APIRouter, Query, Cookie
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date

from db.connection import get_db_connection
from utils.utils import require_auth
from utils.logger import log_error

router = APIRouter(tags=["Waitlist"])


class WaitlistEntry(BaseModel):
    client_instagram_id: Optional[str] = None
    client_name: Optional[str] = None
    client_phone: Optional[str] = None
    service_id: Optional[int] = None
    service_name: Optional[str] = None
    employee_id: Optional[int] = None
    preferred_date: Optional[str] = None
    preferred_time_from: Optional[str] = None
    preferred_time_to: Optional[str] = None
    notes: Optional[str] = None


def _rows(c) -> list:
    cols = [d[0] for d in c.description]
    return [dict(zip(cols, r)) for r in c.fetchall()]


def _serialize(obj: dict) -> dict:
    for k, v in obj.items():
        if isinstance(v, (datetime, date)):
            obj[k] = v.isoformat()
    return obj


@router.get("/waitlist")
async def get_waitlist(
    status: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
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
            SELECT w.*, s.name AS service_title,
                   u.full_name AS employee_name
            FROM waitlist w
            LEFT JOIN services s ON s.id = w.service_id
            LEFT JOIN users u ON u.id = w.employee_id
            WHERE w.company_id = %s
        """
        params = [company_id]
        if status:
            sql += " AND w.status = %s"; params.append(status)
        if date_from:
            sql += " AND w.preferred_date >= %s"; params.append(date_from)
        if date_to:
            sql += " AND w.preferred_date <= %s"; params.append(date_to)
        sql += " ORDER BY w.created_at DESC LIMIT 500"
        c.execute(sql, params)
        rows = [_serialize(r) for r in _rows(c)]
        return JSONResponse({"entries": rows, "total": len(rows)})
    finally:
        conn.close()


@router.post("/waitlist")
async def add_to_waitlist(
    body: WaitlistEntry,
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
            INSERT INTO waitlist (company_id, client_instagram_id, client_name, client_phone,
              service_id, service_name, employee_id, preferred_date,
              preferred_time_from, preferred_time_to, notes)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
            RETURNING id
        """, (company_id, body.client_instagram_id, body.client_name, body.client_phone,
              body.service_id, body.service_name, body.employee_id, body.preferred_date,
              body.preferred_time_from, body.preferred_time_to, body.notes))
        entry_id = c.fetchone()[0]
        conn.commit()
        return JSONResponse({"success": True, "id": entry_id})
    except Exception as e:
        conn.rollback()
        log_error(f"waitlist add error: {e}", "api.waitlist")
        return JSONResponse({"error": str(e)}, status_code=500)
    finally:
        conn.close()


@router.put("/waitlist/{entry_id}/status")
async def update_status(
    entry_id: int,
    status: str = Query(...),
    booking_id: Optional[int] = Query(None),
    session_token: Optional[str] = Cookie(None),
):
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    company_id = user.get("company_id")
    conn = get_db_connection()
    c = conn.cursor()
    try:
        notified = datetime.now() if status == "notified" else None
        c.execute("""
            UPDATE waitlist SET status=%s, booking_id=%s, notified_at=%s, updated_at=NOW()
            WHERE id=%s AND company_id=%s
        """, (status, booking_id, notified, entry_id, company_id))
        conn.commit()
        return JSONResponse({"success": c.rowcount > 0})
    finally:
        conn.close()


@router.delete("/waitlist/{entry_id}")
async def remove_from_waitlist(
    entry_id: int,
    session_token: Optional[str] = Cookie(None),
):
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    company_id = user.get("company_id")
    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute("DELETE FROM waitlist WHERE id=%s AND company_id=%s", (entry_id, company_id))
        conn.commit()
        return JSONResponse({"success": c.rowcount > 0})
    finally:
        conn.close()


@router.get("/waitlist/stats")
async def waitlist_stats(session_token: Optional[str] = Cookie(None)):
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    company_id = user.get("company_id")
    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute("""
            SELECT status, COUNT(*) FROM waitlist WHERE company_id=%s GROUP BY status
        """, (company_id,))
        stats = {r[0]: r[1] for r in c.fetchall()}
        return JSONResponse(stats)
    finally:
        conn.close()
