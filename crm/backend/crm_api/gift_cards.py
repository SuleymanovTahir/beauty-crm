"""
API: Подарочные сертификаты (Gift Cards)
"""
from fastapi import APIRouter, Query, Cookie
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date
import random, string

from db.connection import get_db_connection
from utils.utils import require_auth
from utils.logger import log_error

router = APIRouter(tags=["Gift Cards"])


def _gen_code() -> str:
    parts = [''.join(random.choices(string.ascii_uppercase + string.digits, k=4)) for _ in range(4)]
    return '-'.join(parts)


class GiftCardModel(BaseModel):
    amount: float
    issued_to: Optional[str] = None
    purchased_by_client: Optional[str] = None
    purchase_amount: Optional[float] = None
    valid_until: Optional[str] = None
    notes: Optional[str] = None
    code: Optional[str] = None


class RedeemModel(BaseModel):
    code: str
    amount: float
    booking_id: Optional[int] = None
    note: Optional[str] = None


def _rows(c):
    cols = [d[0] for d in c.description]
    return [dict(zip(cols, r)) for r in c.fetchall()]


def _s(d):
    for k, v in d.items():
        if isinstance(v, (datetime, date)):
            d[k] = v.isoformat()
    return d


@router.get("/gift-cards")
async def list_gift_cards(
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
        sql = "SELECT * FROM gift_cards WHERE company_id=%s"
        params = [company_id]
        if active_only:
            sql += " AND is_active=TRUE"
        sql += " ORDER BY created_at DESC"
        c.execute(sql, params)
        cards = [_s(r) for r in _rows(c)]
        return JSONResponse({"cards": cards, "total": len(cards)})
    finally:
        conn.close()


@router.post("/gift-cards")
async def create_gift_card(
    body: GiftCardModel,
    session_token: Optional[str] = Cookie(None),
):
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    if user.get("role") not in ["admin", "director", "manager"]:
        return JSONResponse({"error": "Forbidden"}, status_code=403)

    company_id = user.get("company_id")
    code = body.code or _gen_code()
    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute("""
            INSERT INTO gift_cards
              (company_id,code,amount,balance,issued_to,issued_by,valid_until,
               purchased_by_client,purchase_amount,notes)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id
        """, (company_id, code.upper(), body.amount, body.amount,
              body.issued_to, user.get("id"), body.valid_until,
              body.purchased_by_client, body.purchase_amount or body.amount, body.notes))
        card_id = c.fetchone()[0]
        conn.commit()
        return JSONResponse({"success": True, "id": card_id, "code": code.upper()})
    except Exception as e:
        conn.rollback()
        return JSONResponse({"error": str(e)}, status_code=500)
    finally:
        conn.close()


@router.post("/gift-cards/validate")
async def validate_card(
    code: str = Query(...),
    session_token: Optional[str] = Cookie(None),
):
    """Проверить сертификат (без списания)"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    company_id = user.get("company_id")
    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute("""
            SELECT * FROM gift_cards
            WHERE company_id=%s AND code=%s
        """, (company_id, code.upper()))
        row = c.fetchone()
        if not row:
            return JSONResponse({"valid": False, "error": "Сертификат не найден"})
        cols = [d[0] for d in c.description]
        card = _s(dict(zip(cols, row)))
        if not card["is_active"]:
            return JSONResponse({"valid": False, "error": "Сертификат деактивирован"})
        if card["balance"] <= 0:
            return JSONResponse({"valid": False, "error": "Баланс сертификата исчерпан"})
        valid_until = card.get("valid_until")
        if valid_until and valid_until < date.today().isoformat():
            return JSONResponse({"valid": False, "error": "Срок действия истёк"})
        return JSONResponse({"valid": True, "card": card})
    finally:
        conn.close()


@router.post("/gift-cards/redeem")
async def redeem_card(
    body: RedeemModel,
    session_token: Optional[str] = Cookie(None),
):
    """Списать сумму с сертификата"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    company_id = user.get("company_id")
    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute("""
            SELECT id, balance, is_active, valid_until FROM gift_cards
            WHERE company_id=%s AND code=%s FOR UPDATE
        """, (company_id, body.code.upper()))
        row = c.fetchone()
        if not row:
            return JSONResponse({"error": "Сертификат не найден"}, status_code=404)
        card_id, balance, is_active, valid_until = row

        if not is_active:
            return JSONResponse({"error": "Сертификат деактивирован"}, status_code=400)
        if valid_until and valid_until < date.today():
            return JSONResponse({"error": "Срок действия истёк"}, status_code=400)
        if body.amount > float(balance):
            return JSONResponse({"error": f"Недостаточно баланса ({balance})"}, status_code=400)

        new_balance = float(balance) - body.amount
        c.execute("""
            UPDATE gift_cards SET balance=%s, is_active=%s WHERE id=%s
        """, (new_balance, new_balance > 0, card_id))

        c.execute("""
            INSERT INTO gift_card_transactions (card_id,amount,type,booking_id,note)
            VALUES (%s,%s,'redeem',%s,%s)
        """, (card_id, body.amount, body.booking_id, body.note))
        conn.commit()
        return JSONResponse({"success": True, "amount_used": body.amount, "remaining_balance": new_balance})
    except Exception as e:
        conn.rollback()
        return JSONResponse({"error": str(e)}, status_code=500)
    finally:
        conn.close()


@router.patch("/gift-cards/{card_id}/deactivate")
async def deactivate_card(
    card_id: int,
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
        c.execute("UPDATE gift_cards SET is_active=FALSE WHERE id=%s AND company_id=%s",
                  (card_id, company_id))
        conn.commit()
        return JSONResponse({"success": c.rowcount > 0})
    finally:
        conn.close()


@router.get("/gift-cards/{card_id}/transactions")
async def card_transactions(
    card_id: int,
    session_token: Optional[str] = Cookie(None),
):
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    company_id = user.get("company_id")
    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute("SELECT id FROM gift_cards WHERE id=%s AND company_id=%s", (card_id, company_id))
        if not c.fetchone():
            return JSONResponse({"error": "Not found"}, status_code=404)
        c.execute("""
            SELECT * FROM gift_card_transactions WHERE card_id=%s ORDER BY created_at DESC
        """, (card_id,))
        rows = [_s(r) for r in _rows(c)]
        return JSONResponse({"transactions": rows})
    finally:
        conn.close()
