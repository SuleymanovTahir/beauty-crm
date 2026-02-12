"""
API для управления промокодами
"""
from fastapi import APIRouter, Cookie
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from db.connection import get_db_connection
from utils.utils import require_auth
from utils.logger import log_error
from db.promo_codes import validate_promo_code

router = APIRouter(tags=["Promo Codes"])

class PromoCodeModel(BaseModel):
    code: str
    discount_type: str
    value: float
    min_amount: float = 0
    valid_from: Optional[datetime] = None
    valid_until: Optional[datetime] = None
    max_uses: Optional[int] = None
    is_active: bool = True
    category: str = 'general'
    description: Optional[str] = None


def _validate_promo_payload(promo: PromoCodeModel) -> Optional[str]:
    if promo.code.strip() == "":
        return "Code is required"

    if promo.discount_type not in {"percent", "fixed"}:
        return "Invalid discount_type"

    if promo.value <= 0:
        return "Promo value must be greater than zero"

    if promo.discount_type == "percent" and promo.value > 100:
        return "Percent discount cannot exceed 100"

    if promo.min_amount < 0:
        return "min_amount cannot be negative"

    if promo.max_uses is not None and promo.max_uses < 1:
        return "max_uses must be greater than zero"

    if promo.valid_from and promo.valid_until and promo.valid_until < promo.valid_from:
        return "valid_until must be after valid_from"

    return None

@router.get("/promo-codes")
async def list_promo_codes(session_token: Optional[str] = Cookie(None)):
    """Получить список всех промокодов (только админ)"""
    user = require_auth(session_token)
    if not user or user["role"] not in ["admin", "director"]:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
        
    try:
        conn = get_db_connection()
        c = conn.cursor()
        c.execute("""
            SELECT id, code, discount_type, value, min_amount, valid_from, valid_until, 
                   max_uses, current_uses, is_active, category, description, created_at
            FROM promo_codes
            ORDER BY created_at DESC
        """)
        
        promos = []
        for row in c.fetchall():
            promos.append({
                "id": row[0],
                "code": row[1],
                "discount_type": row[2],
                "value": row[3],
                "min_amount": row[4],
                "valid_from": row[5],
                "valid_until": row[6],
                "max_uses": row[7],
                "current_uses": row[8],
                "is_active": row[9],
                "category": row[10],
                "description": row[11],
                "created_at": row[12]
            })
        conn.close()
        return {"promo_codes": promos}
    except Exception as e:
        log_error(f"Error listing promo codes: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=500)

@router.post("/promo-codes")
async def create_new_promo(promo: PromoCodeModel, session_token: Optional[str] = Cookie(None)):
    """Создать новый промокод"""
    user = require_auth(session_token)
    if not user or user["role"] not in ["admin", "director"]:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    validation_error = _validate_promo_payload(promo)
    if validation_error:
        return JSONResponse({"error": validation_error}, status_code=400)

    try:
        normalized_code = promo.code.upper().strip()
        normalized_category = promo.category.strip()
        if normalized_category == "":
            normalized_category = "general"

        conn = get_db_connection()
        c = conn.cursor()
        c.execute("""
            INSERT INTO promo_codes 
            (code, discount_type, value, min_amount, valid_from, valid_until, max_uses, category, description, is_active)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (
            normalized_code, promo.discount_type, promo.value, promo.min_amount,
            promo.valid_from, promo.valid_until, promo.max_uses, normalized_category, promo.description, promo.is_active
        ))
        new_id = c.fetchone()[0]
        conn.commit()
        conn.close()
        return {"success": True, "id": new_id}
    except Exception as e:
        log_error(f"Error creating promo code: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=400)

@router.post("/promo-codes/validate")
async def api_validate_promo(code: str, amount: float = 0):
    """Проверка промокода (публично или при записи)"""
    normalized_code = code.strip()
    if normalized_code == "":
        return {"valid": False, "error": "Промокод не указан"}

    normalized_amount = amount if amount >= 0 else 0
    result = validate_promo_code(normalized_code, normalized_amount)
    return result

@router.post("/promo-codes/{promo_id}/toggle")
async def toggle_promo(promo_id: int, session_token: Optional[str] = Cookie(None)):
    """Вкл/Выкл промокод"""
    user = require_auth(session_token)
    if not user or user["role"] not in ["admin", "director"]:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
        
    try:
        conn = get_db_connection()
        c = conn.cursor()
        c.execute("UPDATE promo_codes SET is_active = NOT is_active WHERE id = %s RETURNING is_active", (promo_id,))
        new_status = c.fetchone()[0]
        conn.commit()
        conn.close()
        return {"success": True, "is_active": new_status}
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

@router.delete("/promo-codes/{promo_id}")
async def delete_promo(promo_id: int, session_token: Optional[str] = Cookie(None)):
    """Удалить промокод"""
    user = require_auth(session_token)
    if not user or user["role"] not in ["admin", "director"]:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
        
    try:
        conn = get_db_connection()
        c = conn.cursor()
        c.execute("DELETE FROM promo_codes WHERE id = %s", (promo_id,))
        conn.commit()
        conn.close()
        return {"success": True}
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)
