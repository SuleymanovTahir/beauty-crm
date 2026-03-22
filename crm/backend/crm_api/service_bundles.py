"""
API: Пакеты / Абонементы услуг (Service Bundles)
Пакеты из нескольких услуг со скидкой
"""
from fastapi import APIRouter, Query, Cookie
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date, timedelta

from db.connection import get_db_connection
from utils.utils import require_auth
from utils.logger import log_error

router = APIRouter(tags=["Service Bundles"])


class BundleServiceItem(BaseModel):
    service_id: int
    sessions: int = 1


class BundleModel(BaseModel):
    name: str
    description: Optional[str] = None
    price: float
    original_price: Optional[float] = None
    sessions_count: int = 1
    valid_days: int = 365
    image_url: Optional[str] = None
    category: str = "general"
    services: List[BundleServiceItem] = []


class PurchaseModel(BaseModel):
    bundle_id: int
    client_instagram_id: str
    paid_amount: Optional[float] = None
    notes: Optional[str] = None


def _rows(c):
    cols = [d[0] for d in c.description]
    return [dict(zip(cols, r)) for r in c.fetchall()]


def _s(d):
    for k, v in d.items():
        if isinstance(v, (datetime, date)):
            d[k] = v.isoformat()
    return d


@router.get("/service-bundles")
async def list_bundles(
    active_only: bool = Query(True),
    session_token: Optional[str] = Cookie(None),
):
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    company_id = user.get("company_id")
    conn = get_db_connection()
    c = conn.cursor()
    try:
        sql = "SELECT * FROM service_bundles WHERE company_id=%s"
        params = [company_id]
        if active_only:
            sql += " AND is_active=TRUE"
        sql += " ORDER BY name"
        c.execute(sql, params)
        bundles = [_s(r) for r in _rows(c)]

        # Добавляем услуги каждого бандла
        for b in bundles:
            c.execute("""
                SELECT bs.*, s.name AS service_name, s.price AS service_price
                FROM bundle_services bs
                JOIN services s ON s.id=bs.service_id
                WHERE bs.bundle_id=%s
            """, (b["id"],))
            b["services"] = [_s(r) for r in _rows(c)]

        return JSONResponse({"bundles": bundles})
    finally:
        conn.close()


@router.post("/service-bundles")
async def create_bundle(
    body: BundleModel,
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
            INSERT INTO service_bundles
              (company_id,name,description,price,original_price,sessions_count,
               valid_days,image_url,category)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id
        """, (company_id, body.name, body.description, body.price, body.original_price,
              body.sessions_count, body.valid_days, body.image_url, body.category))
        bundle_id = c.fetchone()[0]

        for svc in body.services:
            c.execute("""
                INSERT INTO bundle_services (bundle_id,service_id,sessions)
                VALUES (%s,%s,%s) ON CONFLICT DO NOTHING
            """, (bundle_id, svc.service_id, svc.sessions))

        conn.commit()
        return JSONResponse({"success": True, "id": bundle_id})
    except Exception as e:
        conn.rollback()
        return JSONResponse({"error": str(e)}, status_code=500)
    finally:
        conn.close()


@router.put("/service-bundles/{bundle_id}")
async def update_bundle(
    bundle_id: int,
    body: BundleModel,
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
            UPDATE service_bundles SET name=%s,description=%s,price=%s,original_price=%s,
              sessions_count=%s,valid_days=%s,image_url=%s,category=%s
            WHERE id=%s AND company_id=%s
        """, (body.name, body.description, body.price, body.original_price,
              body.sessions_count, body.valid_days, body.image_url, body.category,
              bundle_id, company_id))

        # Обновляем услуги
        c.execute("DELETE FROM bundle_services WHERE bundle_id=%s", (bundle_id,))
        for svc in body.services:
            c.execute("INSERT INTO bundle_services (bundle_id,service_id,sessions) VALUES (%s,%s,%s)",
                      (bundle_id, svc.service_id, svc.sessions))
        conn.commit()
        return JSONResponse({"success": c.rowcount > 0})
    finally:
        conn.close()


@router.patch("/service-bundles/{bundle_id}/toggle")
async def toggle_bundle(
    bundle_id: int,
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
            UPDATE service_bundles SET is_active=NOT is_active
            WHERE id=%s AND company_id=%s RETURNING is_active
        """, (bundle_id, company_id))
        row = c.fetchone()
        conn.commit()
        return JSONResponse({"success": True, "is_active": row[0] if row else False})
    finally:
        conn.close()


# ─── Клиентские абонементы ────────────────────────────────────────────────────

@router.post("/service-bundles/purchase")
async def purchase_bundle(
    body: PurchaseModel,
    session_token: Optional[str] = Cookie(None),
):
    """Выдать/продать абонемент клиенту"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    company_id = user.get("company_id")
    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute("""
            SELECT id, sessions_count, valid_days, price FROM service_bundles
            WHERE id=%s AND company_id=%s AND is_active=TRUE
        """, (body.bundle_id, company_id))
        bundle = c.fetchone()
        if not bundle:
            return JSONResponse({"error": "Пакет не найден"}, status_code=404)
        _, sessions, valid_days, price = bundle
        expires = date.today() + timedelta(days=valid_days)

        c.execute("""
            INSERT INTO client_bundles
              (company_id,bundle_id,client_instagram_id,sessions_total,
               expires_at,paid_amount,notes)
            VALUES (%s,%s,%s,%s,%s,%s,%s) RETURNING id
        """, (company_id, body.bundle_id, body.client_instagram_id,
              sessions, expires, body.paid_amount or price, body.notes))
        cb_id = c.fetchone()[0]
        conn.commit()
        return JSONResponse({"success": True, "id": cb_id, "expires_at": expires.isoformat()})
    except Exception as e:
        conn.rollback()
        return JSONResponse({"error": str(e)}, status_code=500)
    finally:
        conn.close()


@router.get("/service-bundles/client/{client_id}")
async def client_bundles(
    client_id: str,
    session_token: Optional[str] = Cookie(None),
):
    """Абонементы конкретного клиента"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    company_id = user.get("company_id")
    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute("""
            SELECT cb.*, sb.name AS bundle_name, sb.price AS bundle_price
            FROM client_bundles cb
            JOIN service_bundles sb ON sb.id=cb.bundle_id
            WHERE cb.company_id=%s AND cb.client_instagram_id=%s
            ORDER BY cb.purchased_at DESC
        """, (company_id, client_id))
        rows = [_s(r) for r in _rows(c)]
        return JSONResponse({"bundles": rows})
    finally:
        conn.close()


@router.post("/service-bundles/use-session")
async def use_session(
    client_bundle_id: int = Query(...),
    booking_id: Optional[int] = Query(None),
    session_token: Optional[str] = Cookie(None),
):
    """Списать сеанс из абонемента"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    company_id = user.get("company_id")
    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute("""
            SELECT id, sessions_total, sessions_used, expires_at, is_active
            FROM client_bundles WHERE id=%s AND company_id=%s FOR UPDATE
        """, (client_bundle_id, company_id))
        row = c.fetchone()
        if not row:
            return JSONResponse({"error": "Абонемент не найден"}, status_code=404)
        cb_id, total, used, expires, active = row
        if not active:
            return JSONResponse({"error": "Абонемент деактивирован"}, status_code=400)
        if expires and expires < date.today():
            return JSONResponse({"error": "Срок действия истёк"}, status_code=400)
        if used >= total:
            return JSONResponse({"error": "Все сеансы использованы"}, status_code=400)

        new_used = used + 1
        c.execute("""
            UPDATE client_bundles SET sessions_used=%s, is_active=%s WHERE id=%s
        """, (new_used, new_used < total, cb_id))
        conn.commit()
        return JSONResponse({
            "success": True,
            "sessions_used": new_used,
            "sessions_remaining": total - new_used,
        })
    except Exception as e:
        conn.rollback()
        return JSONResponse({"error": str(e)}, status_code=500)
    finally:
        conn.close()
