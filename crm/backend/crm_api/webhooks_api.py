"""
API: Webhooks
Исходящие вебхуки для интеграции с внешними системами
"""
from fastapi import APIRouter, Query, Cookie
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import httpx
import hmac
import hashlib
import json

from db.connection import get_db_connection
from utils.utils import require_auth
from utils.logger import log_error, log_info

router = APIRouter(tags=["Webhooks"])

AVAILABLE_EVENTS = [
    "booking.created", "booking.confirmed", "booking.cancelled", "booking.completed",
    "client.created", "client.updated",
    "payment.received", "invoice.created",
    "employee.checkin", "employee.checkout",
]


class WebhookModel(BaseModel):
    name: str
    url: str
    secret: Optional[str] = None
    events: List[str] = []


def _rows(c):
    cols = [d[0] for d in c.description]
    return [dict(zip(cols, r)) for r in c.fetchall()]


def _s(d):
    for k, v in d.items():
        if isinstance(v, datetime):
            d[k] = v.isoformat()
    return d


@router.get("/webhooks")
async def list_webhooks(session_token: Optional[str] = Cookie(None)):
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    if user.get("role") not in ["admin", "director"]:
        return JSONResponse({"error": "Forbidden"}, status_code=403)

    company_id = user.get("company_id")
    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute("SELECT * FROM webhooks WHERE company_id=%s ORDER BY created_at DESC", (company_id,))
        rows = [_s(r) for r in _rows(c)]
        return JSONResponse({"webhooks": rows, "available_events": AVAILABLE_EVENTS})
    finally:
        conn.close()


@router.post("/webhooks")
async def create_webhook(
    body: WebhookModel,
    session_token: Optional[str] = Cookie(None),
):
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    if user.get("role") not in ["admin", "director"]:
        return JSONResponse({"error": "Forbidden"}, status_code=403)

    company_id = user.get("company_id")
    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute("""
            INSERT INTO webhooks (company_id, name, url, secret, events)
            VALUES (%s,%s,%s,%s,%s) RETURNING id
        """, (company_id, body.name, body.url, body.secret, body.events))
        wh_id = c.fetchone()[0]
        conn.commit()
        return JSONResponse({"success": True, "id": wh_id})
    except Exception as e:
        conn.rollback()
        return JSONResponse({"error": str(e)}, status_code=500)
    finally:
        conn.close()


@router.put("/webhooks/{wh_id}")
async def update_webhook(
    wh_id: int,
    body: WebhookModel,
    session_token: Optional[str] = Cookie(None),
):
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    if user.get("role") not in ["admin", "director"]:
        return JSONResponse({"error": "Forbidden"}, status_code=403)

    company_id = user.get("company_id")
    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute("""
            UPDATE webhooks SET name=%s,url=%s,secret=%s,events=%s
            WHERE id=%s AND company_id=%s
        """, (body.name, body.url, body.secret, body.events, wh_id, company_id))
        conn.commit()
        return JSONResponse({"success": c.rowcount > 0})
    finally:
        conn.close()


@router.delete("/webhooks/{wh_id}")
async def delete_webhook(
    wh_id: int,
    session_token: Optional[str] = Cookie(None),
):
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    if user.get("role") not in ["admin", "director"]:
        return JSONResponse({"error": "Forbidden"}, status_code=403)

    company_id = user.get("company_id")
    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute("DELETE FROM webhooks WHERE id=%s AND company_id=%s", (wh_id, company_id))
        conn.commit()
        return JSONResponse({"success": c.rowcount > 0})
    finally:
        conn.close()


@router.patch("/webhooks/{wh_id}/toggle")
async def toggle_webhook(
    wh_id: int,
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
            UPDATE webhooks SET is_active = NOT is_active
            WHERE id=%s AND company_id=%s RETURNING is_active
        """, (wh_id, company_id))
        row = c.fetchone()
        conn.commit()
        return JSONResponse({"success": True, "is_active": row[0] if row else False})
    finally:
        conn.close()


@router.post("/webhooks/{wh_id}/test")
async def test_webhook(
    wh_id: int,
    session_token: Optional[str] = Cookie(None),
):
    """Отправить тестовый запрос на вебхук"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    company_id = user.get("company_id")
    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute("SELECT * FROM webhooks WHERE id=%s AND company_id=%s", (wh_id, company_id))
        row = c.fetchone()
        if not row:
            return JSONResponse({"error": "Webhook not found"}, status_code=404)
        cols = [d[0] for d in c.description]
        wh = dict(zip(cols, row))

        payload = {
            "event": "test",
            "timestamp": datetime.now().isoformat(),
            "data": {"message": "Test webhook from CRM", "webhook_id": wh_id}
        }
        payload_str = json.dumps(payload)

        headers = {"Content-Type": "application/json", "X-CRM-Event": "test"}
        if wh.get("secret"):
            sig = hmac.new(wh["secret"].encode(), payload_str.encode(), hashlib.sha256).hexdigest()
            headers["X-CRM-Signature"] = f"sha256={sig}"

        import asyncio
        start = datetime.now()
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.post(wh["url"], content=payload_str, headers=headers)
            duration = int((datetime.now() - start).total_seconds() * 1000)
            status_code = resp.status_code
            response_text = resp.text[:500]
        except Exception as e:
            duration = int((datetime.now() - start).total_seconds() * 1000)
            status_code = 0
            response_text = str(e)

        # Лог
        c.execute("""
            INSERT INTO webhook_logs (webhook_id, event, payload, status_code, response, duration_ms)
            VALUES (%s,%s,%s,%s,%s,%s)
        """, (wh_id, "test", json.dumps(payload), status_code, response_text, duration))
        c.execute("UPDATE webhooks SET last_triggered_at=NOW(), last_status_code=%s WHERE id=%s",
                  (status_code, wh_id))
        conn.commit()

        return JSONResponse({
            "success": 200 <= status_code < 300,
            "status_code": status_code,
            "duration_ms": duration,
            "response": response_text,
        })
    finally:
        conn.close()


@router.get("/webhooks/{wh_id}/logs")
async def webhook_logs(
    wh_id: int,
    limit: int = Query(50),
    session_token: Optional[str] = Cookie(None),
):
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    company_id = user.get("company_id")
    conn = get_db_connection()
    c = conn.cursor()
    try:
        # Проверка принадлежности
        c.execute("SELECT id FROM webhooks WHERE id=%s AND company_id=%s", (wh_id, company_id))
        if not c.fetchone():
            return JSONResponse({"error": "Not found"}, status_code=404)

        c.execute("""
            SELECT id, event, status_code, duration_ms, created_at,
                   LEFT(response, 200) AS response
            FROM webhook_logs WHERE webhook_id=%s
            ORDER BY created_at DESC LIMIT %s
        """, (wh_id, limit))
        rows = [_s(r) for r in _rows(c)]
        return JSONResponse({"logs": rows})
    finally:
        conn.close()


# ─── Внутренняя функция отправки ──────────────────────────────────────────────

async def fire_webhook(company_id: int, event: str, data: dict):
    """Вызывается из других модулей при событиях"""
    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute("""
            SELECT id, url, secret FROM webhooks
            WHERE company_id=%s AND is_active=TRUE AND %s = ANY(events)
        """, (company_id, event))
        webhooks = c.fetchall()
        conn.close()

        if not webhooks:
            return

        payload = {"event": event, "timestamp": datetime.now().isoformat(), "data": data}
        payload_str = json.dumps(payload, default=str)

        async with httpx.AsyncClient(timeout=5) as client:
            for wh_id, url, secret in webhooks:
                headers = {"Content-Type": "application/json", "X-CRM-Event": event}
                if secret:
                    sig = hmac.new(secret.encode(), payload_str.encode(), hashlib.sha256).hexdigest()
                    headers["X-CRM-Signature"] = f"sha256={sig}"
                try:
                    start = datetime.now()
                    resp = await client.post(url, content=payload_str, headers=headers)
                    duration = int((datetime.now() - start).total_seconds() * 1000)
                    # Записываем лог (в фоне)
                    _log_webhook(wh_id, event, payload, resp.status_code, resp.text[:500], duration)
                except Exception as e:
                    log_error(f"Webhook {wh_id} fire error: {e}", "webhooks")
    except Exception as e:
        log_error(f"fire_webhook error: {e}", "webhooks")


def _log_webhook(wh_id: int, event: str, payload: dict, status: int, response: str, duration: int):
    try:
        conn = get_db_connection()
        c = conn.cursor()
        c.execute("""
            INSERT INTO webhook_logs (webhook_id, event, payload, status_code, response, duration_ms)
            VALUES (%s,%s,%s,%s,%s,%s)
        """, (wh_id, event, json.dumps(payload, default=str), status, response, duration))
        ok = 200 <= status < 300
        c.execute("""
            UPDATE webhooks SET last_triggered_at=NOW(), last_status_code=%s,
              fail_count = CASE WHEN %s THEN 0 ELSE fail_count+1 END
            WHERE id=%s
        """, (status, ok, wh_id))
        conn.commit()
        conn.close()
    except:
        pass
