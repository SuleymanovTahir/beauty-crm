"""
API для управления промокодами
"""
from fastapi import APIRouter, Cookie
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import Optional, Set
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
    target_scope: str = "all"
    target_categories: list[str] = Field(default_factory=list)
    target_service_ids: list[int] = Field(default_factory=list)
    target_client_ids: list[str] = Field(default_factory=list)


def _split_csv(value: Optional[str]) -> list[str]:
    if value is None:
        return []
    return [item.strip() for item in value.split(",") if item.strip()]


def _to_csv(values: list[str]) -> Optional[str]:
    if len(values) == 0:
        return None
    return ",".join(values)


def _normalize_scope(scope: str) -> str:
    normalized = scope.strip().lower()
    return normalized if normalized in {"all", "categories", "services", "clients"} else ""


def _normalize_string_list(values: list[str]) -> list[str]:
    normalized: list[str] = []
    for value in values:
        cleaned = value.strip()
        if cleaned and cleaned not in normalized:
            normalized.append(cleaned)
    return normalized


def _normalize_int_list(values: list[int]) -> list[int]:
    normalized: list[int] = []
    for value in values:
        if isinstance(value, int) and value > 0 and value not in normalized:
            normalized.append(value)
    return normalized


def _parse_int_csv(values: Optional[str]) -> list[int]:
    parsed: list[int] = []
    for value in _split_csv(values):
        if value.isdigit():
            numeric = int(value)
            if numeric > 0:
                parsed.append(numeric)
    return parsed


def _resolve_client_identifiers(user: dict, cursor) -> Set[str]:
    candidates: Set[str] = set()

    for source_value in [
        user.get("instagram_id"),
        user.get("username"),
        str(user.get("id") or "").strip(),
    ]:
        if source_value:
            candidates.add(str(source_value).strip())

    user_email = user.get("email")
    if user_email:
        cursor.execute("SELECT instagram_id FROM clients WHERE email = %s LIMIT 1", (user_email,))
        row = cursor.fetchone()
        if row and row[0]:
            candidates.add(str(row[0]).strip())

    user_phone = user.get("phone")
    if user_phone:
        cursor.execute("SELECT instagram_id FROM clients WHERE phone = %s LIMIT 1", (user_phone,))
        row = cursor.fetchone()
        if row and row[0]:
            candidates.add(str(row[0]).strip())

    return {value for value in candidates if value}


def _get_promo_code_columns(cursor) -> Set[str]:
    cursor.execute("""
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'promo_codes'
    """)
    return {row[0] for row in cursor.fetchall()}


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

    normalized_scope = _normalize_scope(promo.target_scope)
    if normalized_scope == "":
        return "Invalid target_scope"

    if normalized_scope == "categories" and len(_normalize_string_list(promo.target_categories)) == 0:
        return "At least one target category is required"

    if normalized_scope == "services" and len(_normalize_int_list(promo.target_service_ids)) == 0:
        return "At least one target service is required"

    if normalized_scope == "clients" and len(_normalize_string_list(promo.target_client_ids)) == 0:
        return "At least one target client is required"

    return None

@router.get("/promo-codes")
async def list_promo_codes(session_token: Optional[str] = Cookie(None)):
    """Получить список промокодов"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
        
    try:
        conn = get_db_connection()
        c = conn.cursor()
        is_admin = user.get("role") in ["admin", "director"]
        promo_columns = _get_promo_code_columns(c)
        has_target_scope = "target_scope" in promo_columns
        has_target_categories = "target_category_names" in promo_columns
        has_target_services = "target_service_ids" in promo_columns
        has_target_clients = "target_client_ids" in promo_columns

        scope_sql = "COALESCE(target_scope, 'all')" if has_target_scope else "'all'"
        categories_sql = "target_category_names" if has_target_categories else "NULL"
        services_sql = "target_service_ids" if has_target_services else "NULL"
        clients_sql = "target_client_ids" if has_target_clients else "NULL"

        query = """
            SELECT id, code, discount_type, value, min_amount, valid_from, valid_until, 
                   max_uses, current_uses, is_active, category, description,
                   {scope_sql}, {categories_sql}, {services_sql}, {clients_sql}, created_at
            FROM promo_codes
        """.format(
            scope_sql=scope_sql,
            categories_sql=categories_sql,
            services_sql=services_sql,
            clients_sql=clients_sql,
        )
        query_params: list[str] = []
        filters: list[str] = []

        if not is_admin:
            filters.extend([
                "is_active = TRUE",
                "(valid_from IS NULL OR valid_from <= NOW())",
                "(valid_until IS NULL OR valid_until >= NOW())",
            ])

            if has_target_scope and has_target_clients:
                client_ids = sorted(_resolve_client_identifiers(user, c))
                client_scope_filters = ["COALESCE(target_scope, 'all') <> 'clients'"]
                for client_id in client_ids:
                    client_scope_filters.append("%s = ANY(string_to_array(COALESCE(target_client_ids, ''), ','))")
                    query_params.append(client_id)
                filters.append(f"({' OR '.join(client_scope_filters)})")

        if len(filters) > 0:
            query += " WHERE " + " AND ".join(filters)

        query += " ORDER BY created_at DESC"
        c.execute(query, tuple(query_params))
        
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
                "target_scope": row[12] or "all",
                "target_categories": _split_csv(row[13]),
                "target_service_ids": [int(item) for item in _split_csv(row[14]) if item.isdigit()],
                "target_client_ids": _split_csv(row[15]),
                "created_at": row[16]
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
        normalized_scope = _normalize_scope(promo.target_scope)
        normalized_target_categories = _normalize_string_list(promo.target_categories)
        normalized_target_services = [str(value) for value in _normalize_int_list(promo.target_service_ids)]
        normalized_target_clients = _normalize_string_list(promo.target_client_ids)

        conn = get_db_connection()
        c = conn.cursor()
        promo_columns = _get_promo_code_columns(c)
        supports_targeting = all(
            column_name in promo_columns
            for column_name in ["target_scope", "target_category_names", "target_service_ids", "target_client_ids"]
        )

        if supports_targeting:
            c.execute("""
                INSERT INTO promo_codes 
                (
                    code, discount_type, value, min_amount, valid_from, valid_until, max_uses,
                    category, description, is_active, target_scope, target_category_names,
                    target_service_ids, target_client_ids
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
            """, (
                normalized_code, promo.discount_type, promo.value, promo.min_amount,
                promo.valid_from, promo.valid_until, promo.max_uses, normalized_category, promo.description,
                promo.is_active, normalized_scope, _to_csv(normalized_target_categories),
                _to_csv(normalized_target_services), _to_csv(normalized_target_clients)
            ))
        else:
            if normalized_scope != "all":
                conn.close()
                return JSONResponse({"error": "Promo targeting columns are missing in database"}, status_code=400)
            c.execute("""
                INSERT INTO promo_codes 
                (code, discount_type, value, min_amount, valid_from, valid_until, max_uses, category, description, is_active)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
            """, (
                normalized_code,
                promo.discount_type,
                promo.value,
                promo.min_amount,
                promo.valid_from,
                promo.valid_until,
                promo.max_uses,
                normalized_category,
                promo.description,
                promo.is_active,
            ))
        new_id = c.fetchone()[0]
        conn.commit()
        conn.close()
        return {"success": True, "id": new_id}
    except Exception as e:
        log_error(f"Error creating promo code: {e}", "api")
        return JSONResponse({"error": str(e)}, status_code=400)

@router.post("/promo-codes/validate")
async def api_validate_promo(
    code: str,
    amount: float = 0,
    service_ids: Optional[str] = None,
    service_categories: Optional[str] = None,
    client_id: Optional[str] = None,
):
    """Проверка промокода (публично или при записи)"""
    normalized_code = code.strip()
    if normalized_code == "":
        return {"valid": False, "error": "Промокод не указан"}

    normalized_amount = amount if amount >= 0 else 0
    normalized_client_id = client_id.strip() if client_id else None
    parsed_service_ids = _parse_int_csv(service_ids)
    parsed_service_categories = _split_csv(service_categories)
    result = validate_promo_code(
        normalized_code,
        normalized_amount,
        service_ids=parsed_service_ids,
        service_categories=parsed_service_categories,
        client_id=normalized_client_id if normalized_client_id else None,
    )
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
