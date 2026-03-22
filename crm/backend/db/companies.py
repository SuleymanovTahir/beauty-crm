"""
SSOT helpers for multi-tenant companies, tariffs, subscriptions, billing and ads.
"""
from __future__ import annotations

from calendar import monthrange
from datetime import datetime, timedelta
import json
import re
from typing import Any, Optional

from db.connection import get_db_connection
from utils.logger import log_error, log_info
from utils.tenant_context import get_current_company_id


_COMPANY_DIRECT_FIELDS = {
    "name",
    "status",
    "address",
    "google_maps",
    "hours_weekdays",
    "hours_weekends",
    "hours",
    "lunch_start",
    "lunch_end",
    "phone",
    "email",
    "whatsapp",
    "instagram",
    "booking_url",
    "timezone",
    "timezone_offset",
    "currency",
    "business_type",
    "product_mode",
    "crm_enabled",
    "site_enabled",
    "city",
    "country",
    "latitude",
    "longitude",
    "logo_url",
    "base_url",
    "main_location",
    "bot_name",
    "employee_limit",
    "owner_user_id",
}

_COMPANY_JSON_FIELDS = {
    "bot_config",
    "messenger_config",
    "menu_config",
    "custom_settings",
    "feature_flags",
    "metadata",
}

_TARIFF_LIMIT_FIELDS = (
    "employee_limit",
    "client_limit",
    "product_limit",
    "monthly_message_limit",
    "storage_limit_mb",
    "ad_slot_limit",
)

_SUBSCRIPTION_OVERRIDE_FIELDS = (
    "employee_limit_override",
    "client_limit_override",
    "product_limit_override",
    "monthly_message_limit_override",
    "storage_limit_mb_override",
    "ad_slot_limit_override",
)

_QUOTA_LIMIT_MAPPING = {
    "employees": "employee_limit",
    "clients": "client_limit",
    "products": "product_limit",
    "messages": "monthly_message_limit",
    "storage_mb": "storage_limit_mb",
    "ads": "ad_slot_limit",
}

_QUOTA_USED_FIELD_MAPPING = {
    "employees": "employees_used",
    "clients": "clients_used",
    "products": "products_used",
    "messages": "messages_used",
    "storage_mb": "storage_used_mb",
    "ads": "ads_used",
}

_QUOTA_LABELS = {
    "employees": "employees",
    "clients": "clients",
    "products": "products",
    "messages": "messages",
    "storage_mb": "storage",
    "ads": "ads",
}


class QuotaExceededError(Exception):
    def __init__(self, detail: dict[str, Any]):
        message = str(detail.get("message") or "quota_exceeded")
        super().__init__(message)
        self.detail = detail


def _slugify_company_name(raw_name: str) -> str:
    normalized = re.sub(r"[^a-z0-9]+", "-", str(raw_name or "").strip().lower()).strip("-")
    if not normalized:
        return "company"
    return normalized[:64]


def _generate_company_code(base_value: str, sequence_hint: int = 0) -> str:
    cleaned = re.sub(r"[^A-Z0-9]+", "", str(base_value or "").upper())
    if not cleaned:
        cleaned = f"COMPANY{sequence_hint or 1}"
    return cleaned[:16]


def _json_load(value: Any, fallback: Any) -> Any:
    if value is None:
        return fallback
    if isinstance(value, (dict, list)):
        return value
    if isinstance(value, (bytes, bytearray)):
        value = value.decode("utf-8", errors="ignore")
    if isinstance(value, str):
        stripped = value.strip()
        if len(stripped) == 0:
            return fallback
        try:
            return json.loads(stripped)
        except Exception:
            return fallback
    return fallback


def _safe_int(value: Any, default: Optional[int] = None) -> Optional[int]:
    if value is None or value == "":
        return default
    if isinstance(value, bool):
        return default
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _safe_float(value: Any, default: Optional[float] = None) -> Optional[float]:
    if value is None or value == "":
        return default
    if isinstance(value, bool):
        return default
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _table_has_column(cursor, table_name: str, column_name: str) -> bool:
    cursor.execute(
        """
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = %s
          AND column_name = %s
        LIMIT 1
        """,
        (table_name, column_name),
    )
    return cursor.fetchone() is not None


def _build_quota_error_detail(
    company_id: int,
    quota_key: str,
    *,
    limit: Optional[int],
    used: int,
    requested: int,
    remaining: int,
    extra: Optional[dict[str, Any]] = None,
) -> dict[str, Any]:
    detail = {
        "error": "quota_exceeded",
        "message": f"{_QUOTA_LABELS.get(quota_key, quota_key)}_limit_reached",
        "company_id": company_id,
        "quota_key": quota_key,
        "limit": limit,
        "used": used,
        "requested": requested,
        "remaining": max(0, remaining),
    }
    if isinstance(extra, dict):
        detail.update(extra)
    return detail


def _ad_is_active_now(status: Any, starts_at: Any, ends_at: Any) -> bool:
    now = datetime.utcnow()
    normalized_status = str(status or "").strip().lower()
    start_value = _parse_datetime(starts_at)
    end_value = _parse_datetime(ends_at)
    if normalized_status != "active":
        return False
    if start_value and start_value > now:
        return False
    if end_value and end_value < now:
        return False
    return True


def _parse_datetime(value: Any) -> Optional[datetime]:
    if value is None or value == "":
        return None
    if isinstance(value, datetime):
        return value
    if not isinstance(value, str):
        return None
    candidate = value.strip()
    if len(candidate) == 0:
        return None
    normalized = candidate.replace("Z", "+00:00")
    try:
        parsed = datetime.fromisoformat(normalized)
        if parsed.tzinfo is not None:
            return parsed.replace(tzinfo=None)
        return parsed
    except ValueError:
        return None


def _datetime_to_iso(value: Any) -> Optional[str]:
    parsed = _parse_datetime(value)
    if not parsed:
        return None
    return parsed.isoformat()


def _add_months(dt: datetime, months: int) -> datetime:
    effective_months = max(1, int(months or 1))
    year = dt.year + (dt.month - 1 + effective_months) // 12
    month = (dt.month - 1 + effective_months) % 12 + 1
    day = min(dt.day, monthrange(year, month)[1])
    return dt.replace(year=year, month=month, day=day)


def _normalize_feature_flags(value: Any) -> dict[str, bool]:
    raw = _json_load(value, value if isinstance(value, dict) else {})
    if isinstance(raw, list):
        return {str(item).strip(): True for item in raw if str(item).strip()}
    if not isinstance(raw, dict):
        return {}
    return {str(key).strip(): bool(flag) for key, flag in raw.items() if str(key).strip()}


def _merge_feature_flags(base_value: Any, override_value: Any) -> dict[str, bool]:
    merged = _normalize_feature_flags(base_value)
    override = _normalize_feature_flags(override_value)
    for key, flag in override.items():
        merged[key] = flag
    return merged


def _normalize_discount_config(value: Any) -> dict[str, Any]:
    raw = _json_load(value, value if isinstance(value, dict) else {})
    if not isinstance(raw, dict):
        raw = {}
    return {
        "percent": max(0.0, _safe_float(raw.get("percent"), 0.0) or 0.0),
        "amount": max(0.0, _safe_float(raw.get("amount"), 0.0) or 0.0),
        "reason": str(raw.get("reason") or "").strip(),
    }


def _normalize_price_override(value: Any) -> dict[str, Any]:
    raw = _json_load(value, value if isinstance(value, dict) else {})
    if not isinstance(raw, dict):
        raw = {}
    amount = _safe_float(raw.get("amount"))
    currency = str(raw.get("currency") or "").strip()
    return {
        "amount": amount,
        "currency": currency,
    }


def _row_to_company_dict(columns: list[str], row: tuple[Any, ...]) -> dict[str, Any]:
    company = dict(zip(columns, row))
    for field_name in _COMPANY_JSON_FIELDS:
        company[field_name] = _json_load(company.get(field_name), {} if field_name != "messenger_config" else [])
    return company


def _row_to_tariff_dict(columns: list[str], row: tuple[Any, ...]) -> dict[str, Any]:
    tariff = dict(zip(columns, row))
    tariff["id"] = _safe_int(tariff.get("id"), 0) or 0
    for field_name in _TARIFF_LIMIT_FIELDS:
        tariff[field_name] = _safe_int(tariff.get(field_name), 0) or 0
    tariff["monthly_price"] = _safe_float(tariff.get("monthly_price"), 0.0) or 0.0
    tariff["yearly_price"] = _safe_float(tariff.get("yearly_price"), 0.0) or 0.0
    tariff["trial_days"] = _safe_int(tariff.get("trial_days"), 0) or 0
    tariff["is_active"] = bool(tariff.get("is_active"))
    tariff["sort_order"] = _safe_int(tariff.get("sort_order"), 0) or 0
    tariff["feature_flags"] = _normalize_feature_flags(tariff.get("feature_flags"))
    return tariff


def _compute_billing_price(tariff: dict[str, Any], billing_cycle_months: int, price_override: dict[str, Any]) -> float:
    override_amount = _safe_float(price_override.get("amount"))
    if override_amount is not None:
        return max(0.0, override_amount)

    effective_months = max(1, int(billing_cycle_months or 1))
    yearly_price = _safe_float(tariff.get("yearly_price"), 0.0) or 0.0
    monthly_price = _safe_float(tariff.get("monthly_price"), 0.0) or 0.0

    if effective_months == 12 and yearly_price > 0:
        return yearly_price

    return monthly_price * effective_months


def _build_tariff_snapshot(
    tariff: dict[str, Any],
    *,
    billing_cycle_months: int = 1,
    employee_limit_override: Optional[int] = None,
    client_limit_override: Optional[int] = None,
    product_limit_override: Optional[int] = None,
    monthly_message_limit_override: Optional[int] = None,
    storage_limit_mb_override: Optional[int] = None,
    ad_slot_limit_override: Optional[int] = None,
    feature_flags_override: Optional[dict[str, Any]] = None,
    discount_config: Optional[dict[str, Any]] = None,
    price_override: Optional[dict[str, Any]] = None,
    source: str = "tariff",
) -> dict[str, Any]:
    effective_discount = _normalize_discount_config(discount_config)
    effective_price_override = _normalize_price_override(price_override)
    effective_billing_cycle = max(1, int(billing_cycle_months or 1))
    base_price = _compute_billing_price(tariff, effective_billing_cycle, effective_price_override)
    discount_amount = effective_discount["amount"] + (base_price * effective_discount["percent"] / 100.0)
    final_price = max(0.0, base_price - discount_amount)

    snapshot = {
        "tariff_plan_id": tariff.get("id"),
        "tariff_key": tariff.get("key"),
        "tariff_name": tariff.get("name"),
        "description": tariff.get("description"),
        "billing_cycle_months": effective_billing_cycle,
        "base_price": round(base_price, 2),
        "price": round(final_price, 2),
        "discount_amount": round(min(base_price, discount_amount), 2),
        "discount_percent": round(effective_discount["percent"], 2),
        "discount_reason": effective_discount["reason"],
        "currency": effective_price_override.get("currency") or tariff.get("currency"),
        "employee_limit": employee_limit_override if employee_limit_override is not None else (_safe_int(tariff.get("employee_limit"), 0) or 0),
        "client_limit": client_limit_override if client_limit_override is not None else (_safe_int(tariff.get("client_limit"), 0) or 0),
        "product_limit": product_limit_override if product_limit_override is not None else (_safe_int(tariff.get("product_limit"), 0) or 0),
        "monthly_message_limit": monthly_message_limit_override if monthly_message_limit_override is not None else (_safe_int(tariff.get("monthly_message_limit"), 0) or 0),
        "storage_limit_mb": storage_limit_mb_override if storage_limit_mb_override is not None else (_safe_int(tariff.get("storage_limit_mb"), 0) or 0),
        "ad_slot_limit": ad_slot_limit_override if ad_slot_limit_override is not None else (_safe_int(tariff.get("ad_slot_limit"), 0) or 0),
        "feature_flags": _merge_feature_flags(tariff.get("feature_flags"), feature_flags_override),
        "price_override": effective_price_override,
        "snapshot_source": source,
        "generated_at": datetime.utcnow().isoformat(),
    }
    return snapshot


def get_company_by_id(company_id: int) -> Optional[dict[str, Any]]:
    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute("SELECT * FROM companies WHERE id = %s AND deleted_at IS NULL", (company_id,))
        row = c.fetchone()
        if not row:
            return None
        columns = [description[0] for description in c.description]
        return _row_to_company_dict(columns, row)
    finally:
        conn.close()


def get_company_by_access_code(access_code: str) -> Optional[dict[str, Any]]:
    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute(
            "SELECT * FROM companies WHERE UPPER(access_code) = UPPER(%s) AND deleted_at IS NULL",
            (access_code,),
        )
        row = c.fetchone()
        if not row:
            return None
        columns = [description[0] for description in c.description]
        return _row_to_company_dict(columns, row)
    finally:
        conn.close()


def get_current_company() -> Optional[dict[str, Any]]:
    company_id = get_current_company_id()
    if company_id is None:
        return None
    return get_company_by_id(company_id)


def get_tariff_plan_by_id(tariff_plan_id: int) -> Optional[dict[str, Any]]:
    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute("SELECT * FROM tariff_plans WHERE id = %s LIMIT 1", (tariff_plan_id,))
        row = c.fetchone()
        if not row:
            return None
        columns = [description[0] for description in c.description]
        return _row_to_tariff_dict(columns, row)
    finally:
        conn.close()


def get_tariff_plan_by_key(tariff_key: str) -> Optional[dict[str, Any]]:
    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute("SELECT * FROM tariff_plans WHERE key = %s LIMIT 1", (tariff_key,))
        row = c.fetchone()
        if not row:
            return None
        columns = [description[0] for description in c.description]
        return _row_to_tariff_dict(columns, row)
    finally:
        conn.close()


def list_tariff_plans(active_only: bool = False) -> list[dict[str, Any]]:
    conn = get_db_connection()
    c = conn.cursor()
    try:
        query = """
            SELECT
                id, key, name, description, employee_limit, client_limit, product_limit,
                monthly_message_limit, storage_limit_mb, ad_slot_limit, monthly_price, yearly_price,
                currency, trial_days, feature_flags, is_active, sort_order, created_at, updated_at
            FROM tariff_plans
        """
        params: list[Any] = []
        if active_only:
            query += " WHERE is_active = TRUE"
        query += " ORDER BY sort_order ASC, employee_limit ASC, id ASC"
        c.execute(query, params)
        rows = c.fetchall()
        columns = [description[0] for description in c.description]
        return [_row_to_tariff_dict(columns, row) for row in rows]
    finally:
        conn.close()


def create_tariff_plan(data: dict[str, Any]) -> int:
    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute(
            """
            INSERT INTO tariff_plans (
                key, name, description, employee_limit, client_limit, product_limit,
                monthly_message_limit, storage_limit_mb, ad_slot_limit, monthly_price, yearly_price,
                currency, trial_days, feature_flags, is_active, sort_order, updated_at
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP)
            RETURNING id
            """,
            (
                data.get("key"),
                data.get("name"),
                data.get("description"),
                _safe_int(data.get("employee_limit"), 0) or 0,
                _safe_int(data.get("client_limit"), 0) or 0,
                _safe_int(data.get("product_limit"), 0) or 0,
                _safe_int(data.get("monthly_message_limit"), 0) or 0,
                _safe_int(data.get("storage_limit_mb"), 0) or 0,
                _safe_int(data.get("ad_slot_limit"), 0) or 0,
                _safe_float(data.get("monthly_price"), 0.0) or 0.0,
                _safe_float(data.get("yearly_price"), 0.0) or 0.0,
                data.get("currency"),
                _safe_int(data.get("trial_days"), 14) or 14,
                json.dumps(_normalize_feature_flags(data.get("feature_flags")), ensure_ascii=False),
                bool(data.get("is_active", True)),
                _safe_int(data.get("sort_order"), 0) or 0,
            ),
        )
        tariff_id = int(c.fetchone()[0])
        conn.commit()
        return tariff_id
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def update_tariff_plan(tariff_id: int, data: dict[str, Any]) -> bool:
    conn = get_db_connection()
    c = conn.cursor()
    try:
        updates: list[str] = []
        params: list[Any] = []
        mapping = {
            "key": "key",
            "name": "name",
            "description": "description",
            "employee_limit": "employee_limit",
            "client_limit": "client_limit",
            "product_limit": "product_limit",
            "monthly_message_limit": "monthly_message_limit",
            "storage_limit_mb": "storage_limit_mb",
            "ad_slot_limit": "ad_slot_limit",
            "monthly_price": "monthly_price",
            "yearly_price": "yearly_price",
            "currency": "currency",
            "trial_days": "trial_days",
            "is_active": "is_active",
            "sort_order": "sort_order",
        }
        for field_name, column_name in mapping.items():
            if field_name not in data:
                continue
            updates.append(f"{column_name} = %s")
            params.append(data[field_name])
        if "feature_flags" in data:
            updates.append("feature_flags = %s")
            params.append(json.dumps(_normalize_feature_flags(data.get("feature_flags")), ensure_ascii=False))
        if not updates:
            return False
        updates.append("updated_at = CURRENT_TIMESTAMP")
        params.append(tariff_id)
        c.execute(f"UPDATE tariff_plans SET {', '.join(updates)} WHERE id = %s", params)
        conn.commit()
        return c.rowcount > 0
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def deactivate_tariff_plan(tariff_id: int) -> bool:
    return update_tariff_plan(tariff_id, {"is_active": False})


def _build_subscription_from_row(row: tuple[Any, ...], columns: list[str]) -> dict[str, Any]:
    payload = dict(zip(columns, row))

    tariff = {
        "id": _safe_int(payload.get("tariff_id")),
        "key": payload.get("tariff_key"),
        "name": payload.get("tariff_name"),
        "description": payload.get("tariff_description"),
        "employee_limit": _safe_int(payload.get("tariff_employee_limit"), 0) or 0,
        "client_limit": _safe_int(payload.get("tariff_client_limit"), 0) or 0,
        "product_limit": _safe_int(payload.get("tariff_product_limit"), 0) or 0,
        "monthly_message_limit": _safe_int(payload.get("tariff_monthly_message_limit"), 0) or 0,
        "storage_limit_mb": _safe_int(payload.get("tariff_storage_limit_mb"), 0) or 0,
        "ad_slot_limit": _safe_int(payload.get("tariff_ad_slot_limit"), 0) or 0,
        "monthly_price": _safe_float(payload.get("tariff_monthly_price"), 0.0) or 0.0,
        "yearly_price": _safe_float(payload.get("tariff_yearly_price"), 0.0) or 0.0,
        "currency": payload.get("tariff_currency"),
        "trial_days": _safe_int(payload.get("tariff_trial_days"), 0) or 0,
        "feature_flags": _normalize_feature_flags(payload.get("tariff_feature_flags")),
    }

    discount_config = _normalize_discount_config(payload.get("discount_config"))
    price_override = _normalize_price_override(payload.get("price_override"))
    current_snapshot = _json_load(payload.get("current_snapshot"), {})
    if not isinstance(current_snapshot, dict) or not current_snapshot:
        current_snapshot = _build_tariff_snapshot(
            tariff,
            billing_cycle_months=_safe_int(payload.get("billing_cycle_months"), 1) or 1,
            employee_limit_override=_safe_int(payload.get("employee_limit_override")),
            client_limit_override=_safe_int(payload.get("client_limit_override")),
            product_limit_override=_safe_int(payload.get("product_limit_override")),
            monthly_message_limit_override=_safe_int(payload.get("monthly_message_limit_override")),
            storage_limit_mb_override=_safe_int(payload.get("storage_limit_mb_override")),
            ad_slot_limit_override=_safe_int(payload.get("ad_slot_limit_override")),
            discount_config=discount_config,
            price_override=price_override,
            source="derived",
        )
    else:
        current_snapshot["feature_flags"] = _normalize_feature_flags(current_snapshot.get("feature_flags"))
        current_snapshot["price_override"] = _normalize_price_override(current_snapshot.get("price_override"))

    scheduled_change = _json_load(payload.get("scheduled_change"), {})
    if not isinstance(scheduled_change, dict):
        scheduled_change = {}
    scheduled_change["snapshot"] = _json_load(scheduled_change.get("snapshot"), scheduled_change.get("snapshot") if isinstance(scheduled_change.get("snapshot"), dict) else {})

    return {
        "id": _safe_int(payload.get("subscription_id")),
        "company_id": _safe_int(payload.get("company_id")),
        "tariff_plan_id": _safe_int(payload.get("tariff_plan_id")),
        "status": payload.get("status"),
        "is_trial": bool(payload.get("is_trial")),
        "employee_limit_override": _safe_int(payload.get("employee_limit_override")),
        "client_limit_override": _safe_int(payload.get("client_limit_override")),
        "product_limit_override": _safe_int(payload.get("product_limit_override")),
        "monthly_message_limit_override": _safe_int(payload.get("monthly_message_limit_override")),
        "storage_limit_mb_override": _safe_int(payload.get("storage_limit_mb_override")),
        "ad_slot_limit_override": _safe_int(payload.get("ad_slot_limit_override")),
        "billing_cycle_months": _safe_int(payload.get("billing_cycle_months"), 1) or 1,
        "started_at": payload.get("started_at"),
        "current_period_started_at": payload.get("current_period_started_at"),
        "current_period_ends_at": payload.get("current_period_ends_at"),
        "trial_ends_at": payload.get("trial_ends_at"),
        "ends_at": payload.get("ends_at"),
        "current_snapshot": current_snapshot,
        "scheduled_change": scheduled_change,
        "discount_config": discount_config,
        "price_override": price_override,
        "auto_renew": bool(payload.get("auto_renew")) if payload.get("auto_renew") is not None else True,
        "last_payment_at": payload.get("last_payment_at"),
        "next_payment_due_at": payload.get("next_payment_due_at"),
        "assigned_by_user_id": _safe_int(payload.get("assigned_by_user_id")),
        "notes": payload.get("notes"),
        "created_at": payload.get("created_at"),
        "updated_at": payload.get("updated_at"),
        "tariff": tariff,
        "current_price": _safe_float(current_snapshot.get("price"), 0.0) or 0.0,
        "currency": current_snapshot.get("currency") or tariff.get("currency"),
    }


def get_company_subscription(company_id: int) -> Optional[dict[str, Any]]:
    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute(
            """
            SELECT
                cs.id AS subscription_id,
                cs.company_id,
                cs.tariff_plan_id,
                cs.status,
                cs.is_trial,
                cs.employee_limit_override,
                cs.client_limit_override,
                cs.product_limit_override,
                cs.monthly_message_limit_override,
                cs.storage_limit_mb_override,
                cs.ad_slot_limit_override,
                cs.billing_cycle_months,
                cs.started_at,
                cs.current_period_started_at,
                cs.current_period_ends_at,
                cs.trial_ends_at,
                cs.ends_at,
                cs.current_snapshot,
                cs.scheduled_change,
                cs.discount_config,
                cs.price_override,
                cs.auto_renew,
                cs.last_payment_at,
                cs.next_payment_due_at,
                cs.assigned_by_user_id,
                cs.notes,
                cs.created_at,
                cs.updated_at,
                tp.id AS tariff_id,
                tp.key AS tariff_key,
                tp.name AS tariff_name,
                tp.description AS tariff_description,
                tp.employee_limit AS tariff_employee_limit,
                tp.client_limit AS tariff_client_limit,
                tp.product_limit AS tariff_product_limit,
                tp.monthly_message_limit AS tariff_monthly_message_limit,
                tp.storage_limit_mb AS tariff_storage_limit_mb,
                tp.ad_slot_limit AS tariff_ad_slot_limit,
                tp.monthly_price AS tariff_monthly_price,
                tp.yearly_price AS tariff_yearly_price,
                tp.currency AS tariff_currency,
                tp.trial_days AS tariff_trial_days,
                tp.feature_flags AS tariff_feature_flags
            FROM company_subscriptions cs
            LEFT JOIN tariff_plans tp ON tp.id = cs.tariff_plan_id
            WHERE cs.company_id = %s
            LIMIT 1
            """,
            (company_id,),
        )
        row = c.fetchone()
        if not row:
            return None
        columns = [description[0] for description in c.description]
        return _build_subscription_from_row(row, columns)
    finally:
        conn.close()


def _prepare_subscription_configs(
    current_subscription: Optional[dict[str, Any]],
    *,
    billing_cycle_months: Optional[int],
    employee_limit_override: Optional[int],
    client_limit_override: Optional[int],
    product_limit_override: Optional[int],
    monthly_message_limit_override: Optional[int],
    storage_limit_mb_override: Optional[int],
    ad_slot_limit_override: Optional[int],
    feature_flags_override: Optional[dict[str, Any]],
    price_override_amount: Optional[float],
    currency_override: Optional[str],
    discount_percent: Optional[float],
    discount_amount: Optional[float],
    discount_reason: Optional[str],
) -> dict[str, Any]:
    existing_discount = _normalize_discount_config(current_subscription.get("discount_config") if current_subscription else {})
    existing_price_override = _normalize_price_override(current_subscription.get("price_override") if current_subscription else {})
    existing_overrides = {
        "employee_limit_override": current_subscription.get("employee_limit_override") if current_subscription else None,
        "client_limit_override": current_subscription.get("client_limit_override") if current_subscription else None,
        "product_limit_override": current_subscription.get("product_limit_override") if current_subscription else None,
        "monthly_message_limit_override": current_subscription.get("monthly_message_limit_override") if current_subscription else None,
        "storage_limit_mb_override": current_subscription.get("storage_limit_mb_override") if current_subscription else None,
        "ad_slot_limit_override": current_subscription.get("ad_slot_limit_override") if current_subscription else None,
    }
    existing_flags = current_subscription.get("current_snapshot", {}).get("feature_flags") if current_subscription else {}

    normalized_discount = {
        "percent": existing_discount["percent"] if discount_percent is None else max(0.0, float(discount_percent)),
        "amount": existing_discount["amount"] if discount_amount is None else max(0.0, float(discount_amount)),
        "reason": existing_discount["reason"] if discount_reason is None else str(discount_reason or "").strip(),
    }
    normalized_price_override = {
        "amount": existing_price_override.get("amount") if price_override_amount is None else float(price_override_amount),
        "currency": existing_price_override.get("currency") if currency_override is None else str(currency_override or "").strip(),
    }
    normalized_overrides = {
        "employee_limit_override": existing_overrides["employee_limit_override"] if employee_limit_override is None else employee_limit_override,
        "client_limit_override": existing_overrides["client_limit_override"] if client_limit_override is None else client_limit_override,
        "product_limit_override": existing_overrides["product_limit_override"] if product_limit_override is None else product_limit_override,
        "monthly_message_limit_override": existing_overrides["monthly_message_limit_override"] if monthly_message_limit_override is None else monthly_message_limit_override,
        "storage_limit_mb_override": existing_overrides["storage_limit_mb_override"] if storage_limit_mb_override is None else storage_limit_mb_override,
        "ad_slot_limit_override": existing_overrides["ad_slot_limit_override"] if ad_slot_limit_override is None else ad_slot_limit_override,
    }

    return {
        "billing_cycle_months": max(1, int(billing_cycle_months or current_subscription.get("billing_cycle_months") if current_subscription else 1 or 1)),
        "discount_config": normalized_discount,
        "price_override": normalized_price_override,
        "feature_flags_override": _merge_feature_flags(existing_flags, feature_flags_override),
        **normalized_overrides,
    }


def assign_company_subscription(
    company_id: int,
    tariff_plan_id: int,
    *,
    status: str = "active",
    is_trial: bool = False,
    employee_limit_override: int | None = None,
    client_limit_override: int | None = None,
    product_limit_override: int | None = None,
    monthly_message_limit_override: int | None = None,
    storage_limit_mb_override: int | None = None,
    ad_slot_limit_override: int | None = None,
    billing_cycle_months: int | None = None,
    price_override_amount: float | None = None,
    currency_override: str | None = None,
    discount_percent: float | None = None,
    discount_amount: float | None = None,
    discount_reason: str | None = None,
    trial_days: int | None = None,
    assigned_by_user_id: int | None = None,
    notes: str | None = None,
    feature_flags_override: dict[str, Any] | None = None,
    apply_mode: str = "immediate",
    effective_at: str | datetime | None = None,
) -> bool:
    tariff = get_tariff_plan_by_id(tariff_plan_id)
    if not tariff:
        raise ValueError(f"Tariff plan {tariff_plan_id} not found")

    current_subscription = get_company_subscription(company_id)
    prepared = _prepare_subscription_configs(
        current_subscription,
        billing_cycle_months=billing_cycle_months,
        employee_limit_override=employee_limit_override,
        client_limit_override=client_limit_override,
        product_limit_override=product_limit_override,
        monthly_message_limit_override=monthly_message_limit_override,
        storage_limit_mb_override=storage_limit_mb_override,
        ad_slot_limit_override=ad_slot_limit_override,
        feature_flags_override=feature_flags_override,
        price_override_amount=price_override_amount,
        currency_override=currency_override,
        discount_percent=discount_percent,
        discount_amount=discount_amount,
        discount_reason=discount_reason,
    )

    now = datetime.utcnow()
    current_period_end = _parse_datetime(current_subscription.get("current_period_ends_at") if current_subscription else None)
    requested_effective_at = _parse_datetime(effective_at)
    effective_change_at = requested_effective_at or current_period_end or now

    snapshot = _build_tariff_snapshot(
        tariff,
        billing_cycle_months=prepared["billing_cycle_months"],
        employee_limit_override=prepared["employee_limit_override"],
        client_limit_override=prepared["client_limit_override"],
        product_limit_override=prepared["product_limit_override"],
        monthly_message_limit_override=prepared["monthly_message_limit_override"],
        storage_limit_mb_override=prepared["storage_limit_mb_override"],
        ad_slot_limit_override=prepared["ad_slot_limit_override"],
        feature_flags_override=prepared["feature_flags_override"],
        discount_config=prepared["discount_config"],
        price_override=prepared["price_override"],
        source="scheduled" if apply_mode == "next_cycle" else "assigned",
    )

    conn = get_db_connection()
    c = conn.cursor()
    try:
        if apply_mode == "next_cycle" and current_subscription:
            scheduled_payload = {
                "tariff_plan_id": tariff_plan_id,
                "status": status,
                "is_trial": is_trial,
                "trial_days": _safe_int(trial_days),
                "billing_cycle_months": prepared["billing_cycle_months"],
                "employee_limit_override": prepared["employee_limit_override"],
                "client_limit_override": prepared["client_limit_override"],
                "product_limit_override": prepared["product_limit_override"],
                "monthly_message_limit_override": prepared["monthly_message_limit_override"],
                "storage_limit_mb_override": prepared["storage_limit_mb_override"],
                "ad_slot_limit_override": prepared["ad_slot_limit_override"],
                "discount_config": prepared["discount_config"],
                "price_override": prepared["price_override"],
                "feature_flags_override": prepared["feature_flags_override"],
                "snapshot": snapshot,
                "effective_at": effective_change_at.isoformat(),
                "notes": notes or current_subscription.get("notes"),
            }
            c.execute(
                """
                UPDATE company_subscriptions
                SET scheduled_change = %s,
                    assigned_by_user_id = %s,
                    notes = %s,
                    updated_at = CURRENT_TIMESTAMP
                WHERE company_id = %s
                """,
                (
                    json.dumps(scheduled_payload, ensure_ascii=False),
                    assigned_by_user_id,
                    notes,
                    company_id,
                ),
            )
            conn.commit()
            return c.rowcount > 0

        trial_ends_at = None
        current_period_end = _add_months(now, prepared["billing_cycle_months"])
        if is_trial:
            effective_trial_days = int(trial_days or tariff.get("trial_days") or 14)
            trial_ends_at = now + timedelta(days=effective_trial_days)
            current_period_end = trial_ends_at

        c.execute(
            """
            INSERT INTO company_subscriptions (
                company_id, tariff_plan_id, status, is_trial,
                employee_limit_override, client_limit_override, product_limit_override,
                monthly_message_limit_override, storage_limit_mb_override, ad_slot_limit_override,
                billing_cycle_months, started_at, current_period_started_at, current_period_ends_at,
                trial_ends_at, ends_at, current_snapshot, scheduled_change, discount_config,
                price_override, auto_renew, next_payment_due_at, assigned_by_user_id, notes, updated_at
            )
            VALUES (
                %s, %s, %s, %s,
                %s, %s, %s,
                %s, %s, %s,
                %s, CURRENT_TIMESTAMP, %s, %s,
                %s, %s, %s, '{}'::jsonb, %s,
                %s, TRUE, %s, %s, %s, CURRENT_TIMESTAMP
            )
            ON CONFLICT (company_id) DO UPDATE SET
                tariff_plan_id = EXCLUDED.tariff_plan_id,
                status = EXCLUDED.status,
                is_trial = EXCLUDED.is_trial,
                employee_limit_override = EXCLUDED.employee_limit_override,
                client_limit_override = EXCLUDED.client_limit_override,
                product_limit_override = EXCLUDED.product_limit_override,
                monthly_message_limit_override = EXCLUDED.monthly_message_limit_override,
                storage_limit_mb_override = EXCLUDED.storage_limit_mb_override,
                ad_slot_limit_override = EXCLUDED.ad_slot_limit_override,
                billing_cycle_months = EXCLUDED.billing_cycle_months,
                started_at = CURRENT_TIMESTAMP,
                current_period_started_at = EXCLUDED.current_period_started_at,
                current_period_ends_at = EXCLUDED.current_period_ends_at,
                trial_ends_at = EXCLUDED.trial_ends_at,
                ends_at = EXCLUDED.ends_at,
                current_snapshot = EXCLUDED.current_snapshot,
                scheduled_change = '{}'::jsonb,
                discount_config = EXCLUDED.discount_config,
                price_override = EXCLUDED.price_override,
                auto_renew = EXCLUDED.auto_renew,
                next_payment_due_at = EXCLUDED.next_payment_due_at,
                assigned_by_user_id = EXCLUDED.assigned_by_user_id,
                notes = EXCLUDED.notes,
                updated_at = CURRENT_TIMESTAMP
            """,
            (
                company_id,
                tariff_plan_id,
                status,
                is_trial,
                prepared["employee_limit_override"],
                prepared["client_limit_override"],
                prepared["product_limit_override"],
                prepared["monthly_message_limit_override"],
                prepared["storage_limit_mb_override"],
                prepared["ad_slot_limit_override"],
                prepared["billing_cycle_months"],
                now,
                current_period_end,
                trial_ends_at,
                current_period_end,
                json.dumps(snapshot, ensure_ascii=False),
                json.dumps(prepared["discount_config"], ensure_ascii=False),
                json.dumps(prepared["price_override"], ensure_ascii=False),
                current_period_end,
                assigned_by_user_id,
                notes,
            ),
        )
        conn.commit()
        return True
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def count_active_company_staff(company_id: int) -> int:
    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute(
            """
            SELECT COUNT(*)
            FROM users
            WHERE company_id = %s
              AND is_active = TRUE
              AND deleted_at IS NULL
              AND role NOT IN ('client', 'super_admin')
            """,
            (company_id,),
        )
        row = c.fetchone()
        return int(row[0] or 0)
    finally:
        conn.close()


def get_effective_employee_limit(company_id: int) -> Optional[int]:
    subscription = get_company_subscription(company_id)
    if subscription:
        current_snapshot = subscription.get("current_snapshot") or {}
        if "employee_limit" in current_snapshot:
            return _safe_int(current_snapshot.get("employee_limit"))

    company = get_company_by_id(company_id)
    if not company:
        return None
    return _safe_int(company.get("employee_limit"))


def can_add_company_employee(company_id: int) -> bool:
    limit_value = get_effective_employee_limit(company_id)
    if limit_value is None or limit_value <= 0:
        return True
    return count_active_company_staff(company_id) < limit_value


def _load_company_quota_limits(company_id: int) -> dict[str, Optional[int]]:
    subscription = get_company_subscription(company_id)
    if subscription:
        snapshot = subscription.get("current_snapshot") or {}
        return {quota_key: _safe_int(snapshot.get(limit_field)) for quota_key, limit_field in _QUOTA_LIMIT_MAPPING.items()}
    company = get_company_by_id(company_id) or {}
    return {
        "employees": _safe_int(company.get("employee_limit")),
        "clients": None,
        "products": None,
        "messages": None,
        "storage_mb": None,
        "ads": None,
    }


def get_company_usage(company_id: int) -> dict[str, Any]:
    limits = _load_company_quota_limits(company_id)
    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute(
            """
            SELECT COUNT(*)
            FROM users
            WHERE company_id = %s
              AND is_active = TRUE
              AND deleted_at IS NULL
              AND role NOT IN ('client', 'super_admin')
            """,
            (company_id,),
        )
        employees_used = _safe_int(c.fetchone()[0], 0) or 0

        c.execute(
            """
            SELECT COUNT(*)
            FROM clients
            WHERE company_id = %s
              AND deleted_at IS NULL
            """,
            (company_id,),
        )
        clients_used = _safe_int(c.fetchone()[0], 0) or 0

        c.execute(
            """
            SELECT COUNT(*)
            FROM products
            WHERE company_id = %s
              AND COALESCE(is_active, TRUE) = TRUE
            """,
            (company_id,),
        )
        products_used = _safe_int(c.fetchone()[0], 0) or 0

        c.execute(
            """
            SELECT
                COALESCE((
                    SELECT COUNT(*)
                    FROM unified_communication_log
                    WHERE company_id = %s
                      AND status = 'sent'
                      AND created_at >= date_trunc('month', CURRENT_TIMESTAMP)
                ), 0)
                +
                COALESCE((
                    SELECT COUNT(*)
                    FROM messenger_messages
                    WHERE company_id = %s
                      AND sender_type = 'admin'
                      AND created_at >= date_trunc('month', CURRENT_TIMESTAMP)
                ), 0)
            """,
            (company_id, company_id),
        )
        messages_used = _safe_int(c.fetchone()[0], 0) or 0

        storage_bytes = 0

        c.execute(
            """
            SELECT COALESCE(SUM(COALESCE(file_size, 0)), 0)
            FROM chat_recordings
            WHERE company_id = %s
            """,
            (company_id,),
        )
        storage_bytes += _safe_int(c.fetchone()[0], 0) or 0

        c.execute(
            """
            SELECT COALESCE(SUM(
                CASE
                    WHEN COALESCE(metadata->>'size_bytes', '') ~ '^[0-9]+$'
                        THEN (metadata->>'size_bytes')::BIGINT
                    ELSE 0
                END
            ), 0)
            FROM media_library
            WHERE company_id = %s
            """,
            (company_id,),
        )
        storage_bytes += _safe_int(c.fetchone()[0], 0) or 0

        if _table_has_column(c, "call_logs", "file_size"):
            c.execute(
                """
                SELECT COALESCE(SUM(COALESCE(file_size, 0)), 0)
                FROM call_logs
                WHERE company_id = %s
                """,
                (company_id,),
            )
            storage_bytes += _safe_int(c.fetchone()[0], 0) or 0

        storage_used_mb = int((storage_bytes + 1024 * 1024 - 1) / (1024 * 1024)) if storage_bytes > 0 else 0

        c.execute(
            """
            SELECT COUNT(*)
            FROM platform_ads
            WHERE company_id = %s
              AND status = 'active'
              AND (starts_at IS NULL OR starts_at <= CURRENT_TIMESTAMP)
              AND (ends_at IS NULL OR ends_at >= CURRENT_TIMESTAMP)
            """,
            (company_id,),
        )
        ads_used = _safe_int(c.fetchone()[0], 0) or 0

        c.execute(
            """
            SELECT COUNT(*)
            FROM call_logs
            WHERE company_id = %s
            """,
            (company_id,),
        )
        calls_used = _safe_int(c.fetchone()[0], 0) or 0

        c.execute(
            """
            SELECT COUNT(*)
            FROM internal_chat
            WHERE company_id = %s
            """,
            (company_id,),
        )
        internal_messages_used = _safe_int(c.fetchone()[0], 0) or 0
    finally:
        conn.close()

    return {
        "employees_used": employees_used,
        "clients_used": clients_used,
        "products_used": products_used,
        "messages_used": messages_used,
        "storage_used_mb": storage_used_mb,
        "storage_used_bytes": storage_bytes,
        "ads_used": ads_used,
        "calls_used": calls_used,
        "internal_messages_used": internal_messages_used,
        "employee_limit": limits["employees"],
        "client_limit": limits["clients"],
        "product_limit": limits["products"],
        "monthly_message_limit": limits["messages"],
        "ad_slot_limit": limits["ads"],
        "employees_limit": limits["employees"],
        "clients_limit": limits["clients"],
        "products_limit": limits["products"],
        "messages_limit": limits["messages"],
        "storage_limit_mb": limits["storage_mb"],
        "ads_limit": limits["ads"],
    }


def get_company_quota_status(company_id: int, quota_key: str, amount: int = 1) -> dict[str, Any]:
    limit_field = _QUOTA_LIMIT_MAPPING.get(quota_key)
    if not limit_field:
        return {
            "allowed": True,
            "company_id": company_id,
            "quota_key": quota_key,
            "limit": None,
            "used": 0,
            "requested": max(1, int(amount or 1)),
            "remaining": None,
        }

    usage = get_company_usage(company_id)
    requested = max(1, int(amount or 1))
    limit_value = _safe_int(usage.get(limit_field))
    used_value = _safe_int(usage.get(_QUOTA_USED_FIELD_MAPPING[quota_key]), 0) or 0

    if limit_value is None or limit_value <= 0:
        return {
            "allowed": True,
            "company_id": company_id,
            "quota_key": quota_key,
            "limit": None,
            "used": used_value,
            "requested": requested,
            "remaining": None,
        }

    remaining = max(0, limit_value - used_value)
    return {
        "allowed": used_value + requested <= limit_value,
        "company_id": company_id,
        "quota_key": quota_key,
        "limit": limit_value,
        "used": used_value,
        "requested": requested,
        "remaining": remaining,
    }


def get_company_storage_status(company_id: int, additional_bytes: int = 0) -> dict[str, Any]:
    usage = get_company_usage(company_id)
    limit_mb = _safe_int(usage.get("storage_limit_mb"))
    used_bytes = _safe_int(usage.get("storage_used_bytes"), 0) or 0
    requested_bytes = max(0, int(additional_bytes or 0))

    if limit_mb is None or limit_mb <= 0:
        return {
            "allowed": True,
            "company_id": company_id,
            "quota_key": "storage_mb",
            "limit_mb": None,
            "limit_bytes": None,
            "used_bytes": used_bytes,
            "used_mb": _safe_int(usage.get("storage_used_mb"), 0) or 0,
            "requested_bytes": requested_bytes,
            "remaining_bytes": None,
            "remaining_mb": None,
        }

    limit_bytes = int(limit_mb) * 1024 * 1024
    remaining_bytes = max(0, limit_bytes - used_bytes)
    total_bytes = used_bytes + requested_bytes
    used_mb = int((used_bytes + 1024 * 1024 - 1) / (1024 * 1024)) if used_bytes > 0 else 0
    remaining_mb = int(remaining_bytes / (1024 * 1024))
    return {
        "allowed": total_bytes <= limit_bytes,
        "company_id": company_id,
        "quota_key": "storage_mb",
        "limit_mb": int(limit_mb),
        "limit_bytes": limit_bytes,
        "used_bytes": used_bytes,
        "used_mb": used_mb,
        "requested_bytes": requested_bytes,
        "remaining_bytes": remaining_bytes,
        "remaining_mb": remaining_mb,
    }


def can_use_company_quota(company_id: int, quota_key: str, amount: int = 1) -> bool:
    if quota_key == "storage_mb":
        return bool(get_company_storage_status(company_id, amount).get("allowed"))
    return bool(get_company_quota_status(company_id, quota_key, amount).get("allowed"))


def ensure_company_quota(company_id: int, quota_key: str, amount: int = 1) -> dict[str, Any]:
    status = get_company_quota_status(company_id, quota_key, amount)
    if status["allowed"]:
        return status

    raise QuotaExceededError(
        _build_quota_error_detail(
            company_id,
            quota_key,
            limit=status["limit"],
            used=status["used"],
            requested=status["requested"],
            remaining=status["remaining"],
        )
    )


def ensure_company_storage(company_id: int, additional_bytes: int = 0) -> dict[str, Any]:
    status = get_company_storage_status(company_id, additional_bytes)
    if status["allowed"]:
        return status

    raise QuotaExceededError(
        _build_quota_error_detail(
            company_id,
            "storage_mb",
            limit=status["limit_mb"],
            used=status["used_mb"],
            requested=status["requested_bytes"],
            remaining=status["remaining_mb"] or 0,
            extra={
                "limit_mb": status["limit_mb"],
                "limit_bytes": status["limit_bytes"],
                "used_bytes": status["used_bytes"],
                "requested_bytes": status["requested_bytes"],
                "remaining_bytes": status["remaining_bytes"],
            },
        )
    )


def create_company(
    *,
    name: str,
    email: str | None = None,
    phone: str | None = None,
    business_type: str = "other",
    product_mode: str = "crm",
    currency: str | None = None,
    timezone: str = "UTC",
    timezone_offset: int = 0,
    employee_limit: int | None = None,
    created_by_user_id: int | None = None,
    tariff_key: str = "trial",
) -> dict[str, Any]:
    conn = get_db_connection()
    c = conn.cursor()
    try:
        base_slug = _slugify_company_name(name)
        candidate_slug = base_slug
        suffix = 1
        while True:
            c.execute("SELECT 1 FROM companies WHERE slug = %s", (candidate_slug,))
            if not c.fetchone():
                break
            suffix += 1
            candidate_slug = f"{base_slug}-{suffix}"

        base_code = _generate_company_code(name)
        candidate_code = base_code
        code_suffix = 1
        while True:
            c.execute("SELECT 1 FROM companies WHERE access_code = %s", (candidate_code,))
            if not c.fetchone():
                break
            code_suffix += 1
            candidate_code = _generate_company_code(f"{base_code}{code_suffix}")

        requested_employee_limit = int(employee_limit or 0)
        c.execute(
            """
            INSERT INTO companies (
                slug, access_code, name, email, phone, business_type, product_mode,
                currency, timezone, timezone_offset, crm_enabled, site_enabled,
                employee_limit, owner_user_id, updated_at
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, TRUE, FALSE, %s, %s, CURRENT_TIMESTAMP)
            RETURNING id
            """,
            (
                candidate_slug,
                candidate_code,
                name.strip(),
                email,
                phone,
                business_type,
                product_mode,
                currency,
                timezone,
                timezone_offset,
                requested_employee_limit or 5,
                created_by_user_id,
            ),
        )
        company_id = int(c.fetchone()[0])

        tariff = get_tariff_plan_by_key(tariff_key)
        if tariff:
            billing_cycle_months = 1
            is_trial = tariff_key == "trial"
            status = "trial" if is_trial else "active"
            now = datetime.utcnow()
            trial_ends_at = now + timedelta(days=int(tariff.get("trial_days") or 14)) if is_trial else None
            period_end = trial_ends_at or _add_months(now, billing_cycle_months)
            employee_override = requested_employee_limit or None
            snapshot = _build_tariff_snapshot(
                tariff,
                billing_cycle_months=billing_cycle_months,
                employee_limit_override=employee_override,
                source="create_company",
            )
            c.execute(
                """
                INSERT INTO company_subscriptions (
                    company_id, tariff_plan_id, status, is_trial,
                    employee_limit_override, billing_cycle_months,
                    started_at, current_period_started_at, current_period_ends_at,
                    trial_ends_at, ends_at, current_snapshot, discount_config, price_override,
                    auto_renew, next_payment_due_at, assigned_by_user_id, updated_at
                )
                VALUES (
                    %s, %s, %s, %s,
                    %s, %s,
                    CURRENT_TIMESTAMP, %s, %s,
                    %s, %s, %s, '{}'::jsonb, '{}'::jsonb,
                    TRUE, %s, %s, CURRENT_TIMESTAMP
                )
                """,
                (
                    company_id,
                    tariff["id"],
                    status,
                    is_trial,
                    employee_override,
                    billing_cycle_months,
                    now,
                    period_end,
                    trial_ends_at,
                    period_end,
                    json.dumps(snapshot, ensure_ascii=False),
                    period_end,
                    created_by_user_id,
                ),
            )

        conn.commit()
        company = get_company_by_id(company_id)
        if not company:
            raise RuntimeError("Company created but could not be reloaded")
        log_info(f"✅ Company created: {company_id} ({company.get('name')})", "companies")
        return company
    except Exception as e:
        conn.rollback()
        log_error(f"Error creating company: {e}", "companies")
        raise
    finally:
        conn.close()


def update_company(company_id: int, data: dict[str, Any]) -> bool:
    conn = get_db_connection()
    c = conn.cursor()
    try:
        updates: list[str] = []
        params: list[Any] = []

        for field_name in _COMPANY_DIRECT_FIELDS:
            if field_name not in data:
                continue
            updates.append(f"{field_name} = %s")
            params.append(data[field_name])

        for field_name in _COMPANY_JSON_FIELDS:
            if field_name not in data:
                continue
            updates.append(f"{field_name} = %s")
            params.append(json.dumps(data.get(field_name) or ({} if field_name != "messenger_config" else []), ensure_ascii=False))

        if not updates:
            return False

        updates.append("updated_at = CURRENT_TIMESTAMP")
        params.append(company_id)
        c.execute(f"UPDATE companies SET {', '.join(updates)} WHERE id = %s AND deleted_at IS NULL", params)
        conn.commit()
        return c.rowcount > 0
    except Exception as e:
        conn.rollback()
        log_error(f"Error updating company {company_id}: {e}", "companies")
        raise
    finally:
        conn.close()


def list_companies(search: str | None = None, status: str | None = None) -> list[dict[str, Any]]:
    conn = get_db_connection()
    c = conn.cursor()
    try:
        where_parts = ["c.deleted_at IS NULL"]
        params: list[Any] = []
        if search:
            where_parts.append("(LOWER(COALESCE(c.name, '')) LIKE LOWER(%s) OR LOWER(c.access_code) LIKE LOWER(%s) OR LOWER(COALESCE(c.email, '')) LIKE LOWER(%s))")
            search_term = f"%{search.strip()}%"
            params.extend([search_term, search_term, search_term])
        if status:
            where_parts.append("c.status = %s")
            params.append(status)

        c.execute(
            f"""
            SELECT
                c.id, c.slug, c.access_code, c.name, c.status, c.email, c.phone,
                c.business_type, c.product_mode, c.currency, c.timezone,
                c.employee_limit, c.owner_user_id, c.created_at, c.updated_at,
                COUNT(u.id) FILTER (WHERE u.deleted_at IS NULL AND u.is_active = TRUE AND u.role NOT IN ('client', 'super_admin')) AS active_staff_count,
                cs.id AS subscription_id,
                cs.tariff_plan_id,
                cs.status AS subscription_status,
                cs.is_trial,
                cs.billing_cycle_months,
                cs.employee_limit_override,
                cs.client_limit_override,
                cs.product_limit_override,
                cs.monthly_message_limit_override,
                cs.storage_limit_mb_override,
                cs.ad_slot_limit_override,
                cs.current_period_started_at,
                cs.current_period_ends_at,
                cs.trial_ends_at,
                cs.ends_at,
                cs.current_snapshot,
                cs.scheduled_change,
                cs.discount_config,
                cs.price_override,
                cs.last_payment_at,
                cs.next_payment_due_at,
                tp.id AS tariff_id,
                tp.key AS tariff_key,
                tp.name AS tariff_name,
                tp.description AS tariff_description,
                tp.employee_limit AS tariff_employee_limit,
                tp.client_limit AS tariff_client_limit,
                tp.product_limit AS tariff_product_limit,
                tp.monthly_message_limit AS tariff_monthly_message_limit,
                tp.storage_limit_mb AS tariff_storage_limit_mb,
                tp.ad_slot_limit AS tariff_ad_slot_limit,
                tp.monthly_price AS tariff_monthly_price,
                tp.yearly_price AS tariff_yearly_price,
                tp.currency AS tariff_currency,
                tp.trial_days AS tariff_trial_days,
                tp.feature_flags AS tariff_feature_flags
            FROM companies c
            LEFT JOIN users u ON u.company_id = c.id
            LEFT JOIN company_subscriptions cs ON cs.company_id = c.id
            LEFT JOIN tariff_plans tp ON tp.id = cs.tariff_plan_id
            WHERE {' AND '.join(where_parts)}
            GROUP BY
                c.id, c.slug, c.access_code, c.name, c.status, c.email, c.phone,
                c.business_type, c.product_mode, c.currency, c.timezone,
                c.employee_limit, c.owner_user_id, c.created_at, c.updated_at,
                cs.id, cs.tariff_plan_id, cs.status, cs.is_trial, cs.billing_cycle_months,
                cs.employee_limit_override, cs.client_limit_override, cs.product_limit_override,
                cs.monthly_message_limit_override, cs.storage_limit_mb_override, cs.ad_slot_limit_override,
                cs.current_period_started_at, cs.current_period_ends_at, cs.trial_ends_at, cs.ends_at,
                cs.current_snapshot, cs.scheduled_change, cs.discount_config, cs.price_override,
                cs.last_payment_at, cs.next_payment_due_at,
                tp.id, tp.key, tp.name, tp.description, tp.employee_limit, tp.client_limit,
                tp.product_limit, tp.monthly_message_limit, tp.storage_limit_mb, tp.ad_slot_limit,
                tp.monthly_price, tp.yearly_price, tp.currency, tp.trial_days, tp.feature_flags
            ORDER BY c.created_at DESC, c.id DESC
            """,
            params,
        )
        columns = [description[0] for description in c.description]
        result = []
        for row in c.fetchall():
            payload = dict(zip(columns, row))
            current_snapshot = _json_load(payload.get("current_snapshot"), {})
            if not isinstance(current_snapshot, dict) or not current_snapshot:
                current_snapshot = _build_tariff_snapshot(
                    {
                        "id": _safe_int(payload.get("tariff_id")),
                        "key": payload.get("tariff_key"),
                        "name": payload.get("tariff_name"),
                        "description": payload.get("tariff_description"),
                        "employee_limit": _safe_int(payload.get("tariff_employee_limit"), 0) or 0,
                        "client_limit": _safe_int(payload.get("tariff_client_limit"), 0) or 0,
                        "product_limit": _safe_int(payload.get("tariff_product_limit"), 0) or 0,
                        "monthly_message_limit": _safe_int(payload.get("tariff_monthly_message_limit"), 0) or 0,
                        "storage_limit_mb": _safe_int(payload.get("tariff_storage_limit_mb"), 0) or 0,
                        "ad_slot_limit": _safe_int(payload.get("tariff_ad_slot_limit"), 0) or 0,
                        "monthly_price": _safe_float(payload.get("tariff_monthly_price"), 0.0) or 0.0,
                        "yearly_price": _safe_float(payload.get("tariff_yearly_price"), 0.0) or 0.0,
                        "currency": payload.get("tariff_currency"),
                        "trial_days": _safe_int(payload.get("tariff_trial_days"), 0) or 0,
                        "feature_flags": _normalize_feature_flags(payload.get("tariff_feature_flags")),
                    },
                    billing_cycle_months=_safe_int(payload.get("billing_cycle_months"), 1) or 1,
                    employee_limit_override=_safe_int(payload.get("employee_limit_override")),
                    client_limit_override=_safe_int(payload.get("client_limit_override")),
                    product_limit_override=_safe_int(payload.get("product_limit_override")),
                    monthly_message_limit_override=_safe_int(payload.get("monthly_message_limit_override")),
                    storage_limit_mb_override=_safe_int(payload.get("storage_limit_mb_override")),
                    ad_slot_limit_override=_safe_int(payload.get("ad_slot_limit_override")),
                    discount_config=_normalize_discount_config(payload.get("discount_config")),
                    price_override=_normalize_price_override(payload.get("price_override")),
                    source="derived",
                )

            result.append(
                {
                    "id": int(payload["id"]),
                    "slug": payload["slug"],
                    "access_code": payload["access_code"],
                    "name": payload["name"],
                    "status": payload["status"],
                    "email": payload["email"],
                    "phone": payload["phone"],
                    "business_type": payload["business_type"],
                    "product_mode": payload["product_mode"],
                    "currency": payload["currency"],
                    "timezone": payload["timezone"],
                    "employee_limit": _safe_int(payload["employee_limit"], 0) or 0,
                    "owner_user_id": _safe_int(payload["owner_user_id"]),
                    "created_at": payload["created_at"],
                    "updated_at": payload["updated_at"],
                    "active_staff_count": _safe_int(payload["active_staff_count"], 0) or 0,
                    "subscription": {
                        "id": _safe_int(payload.get("subscription_id")),
                        "status": payload.get("subscription_status"),
                        "is_trial": bool(payload.get("is_trial")) if payload.get("is_trial") is not None else False,
                        "billing_cycle_months": _safe_int(payload.get("billing_cycle_months"), 1) or 1,
                        "current_period_started_at": payload.get("current_period_started_at"),
                        "current_period_ends_at": payload.get("current_period_ends_at"),
                        "trial_ends_at": payload.get("trial_ends_at"),
                        "ends_at": payload.get("ends_at"),
                        "current_snapshot": current_snapshot,
                        "scheduled_change": _json_load(payload.get("scheduled_change"), {}),
                        "discount_config": _normalize_discount_config(payload.get("discount_config")),
                        "price_override": _normalize_price_override(payload.get("price_override")),
                        "last_payment_at": payload.get("last_payment_at"),
                        "next_payment_due_at": payload.get("next_payment_due_at"),
                        "effective_employee_limit": _safe_int(current_snapshot.get("employee_limit"), 0) or 0,
                        "effective_client_limit": _safe_int(current_snapshot.get("client_limit"), 0) or 0,
                        "effective_product_limit": _safe_int(current_snapshot.get("product_limit"), 0) or 0,
                        "effective_monthly_message_limit": _safe_int(current_snapshot.get("monthly_message_limit"), 0) or 0,
                        "effective_storage_limit_mb": _safe_int(current_snapshot.get("storage_limit_mb"), 0) or 0,
                        "effective_ad_slot_limit": _safe_int(current_snapshot.get("ad_slot_limit"), 0) or 0,
                        "current_price": _safe_float(current_snapshot.get("price"), 0.0) or 0.0,
                        "currency": current_snapshot.get("currency") or payload.get("tariff_currency"),
                        "tariff": {
                            "id": _safe_int(payload.get("tariff_id")),
                            "key": payload.get("tariff_key"),
                            "name": payload.get("tariff_name"),
                            "description": payload.get("tariff_description"),
                            "employee_limit": _safe_int(payload.get("tariff_employee_limit"), 0) or 0,
                            "client_limit": _safe_int(payload.get("tariff_client_limit"), 0) or 0,
                            "product_limit": _safe_int(payload.get("tariff_product_limit"), 0) or 0,
                            "monthly_message_limit": _safe_int(payload.get("tariff_monthly_message_limit"), 0) or 0,
                            "storage_limit_mb": _safe_int(payload.get("tariff_storage_limit_mb"), 0) or 0,
                            "ad_slot_limit": _safe_int(payload.get("tariff_ad_slot_limit"), 0) or 0,
                            "monthly_price": _safe_float(payload.get("tariff_monthly_price"), 0.0) or 0.0,
                            "yearly_price": _safe_float(payload.get("tariff_yearly_price"), 0.0) or 0.0,
                            "currency": payload.get("tariff_currency"),
                            "trial_days": _safe_int(payload.get("tariff_trial_days"), 0) or 0,
                            "feature_flags": _normalize_feature_flags(payload.get("tariff_feature_flags")),
                        },
                    },
                }
            )
        return result
    finally:
        conn.close()


def record_company_payment(
    company_id: int,
    *,
    amount: float | None = None,
    base_amount: float | None = None,
    currency: str | None = None,
    period_months: int | None = None,
    due_at: str | datetime | None = None,
    paid_at: str | datetime | None = None,
    status: str = "paid",
    notes: str | None = None,
    invoice_number: str | None = None,
    metadata: dict[str, Any] | None = None,
    created_by_user_id: int | None = None,
    apply_scheduled_change: bool = True,
) -> dict[str, Any]:
    subscription = get_company_subscription(company_id)
    if not subscription:
        raise ValueError(f"Subscription for company {company_id} not found")

    current_paid_at = _parse_datetime(paid_at) or datetime.utcnow()
    current_period_end = _parse_datetime(subscription.get("current_period_ends_at"))
    next_cycle_start = current_period_end if current_period_end and current_period_end > current_paid_at else current_paid_at
    scheduled_change = subscription.get("scheduled_change") or {}
    scheduled_effective_at = _parse_datetime(scheduled_change.get("effective_at")) if isinstance(scheduled_change, dict) else None
    should_apply_scheduled = (
        apply_scheduled_change
        and isinstance(scheduled_change, dict)
        and bool(scheduled_change)
        and (scheduled_effective_at is None or next_cycle_start >= scheduled_effective_at)
    )

    if should_apply_scheduled:
        snapshot = _json_load(scheduled_change.get("snapshot"), {})
        active_tariff_plan_id = _safe_int(scheduled_change.get("tariff_plan_id")) or subscription.get("tariff_plan_id")
        billing_cycle_months = _safe_int(scheduled_change.get("billing_cycle_months"), subscription.get("billing_cycle_months")) or 1
        employee_limit_override = _safe_int(scheduled_change.get("employee_limit_override"))
        client_limit_override = _safe_int(scheduled_change.get("client_limit_override"))
        product_limit_override = _safe_int(scheduled_change.get("product_limit_override"))
        monthly_message_limit_override = _safe_int(scheduled_change.get("monthly_message_limit_override"))
        storage_limit_mb_override = _safe_int(scheduled_change.get("storage_limit_mb_override"))
        ad_slot_limit_override = _safe_int(scheduled_change.get("ad_slot_limit_override"))
        discount_config = _normalize_discount_config(scheduled_change.get("discount_config"))
        price_override = _normalize_price_override(scheduled_change.get("price_override"))
        feature_flags_override = _normalize_feature_flags(scheduled_change.get("feature_flags_override"))
        next_status = scheduled_change.get("status") or "active"
        next_is_trial = bool(scheduled_change.get("is_trial"))
        next_notes = scheduled_change.get("notes") or subscription.get("notes")
        if not snapshot:
            target_tariff = get_tariff_plan_by_id(active_tariff_plan_id)
            if not target_tariff:
                raise ValueError(f"Scheduled tariff plan {active_tariff_plan_id} not found")
            snapshot = _build_tariff_snapshot(
                target_tariff,
                billing_cycle_months=billing_cycle_months,
                employee_limit_override=employee_limit_override,
                client_limit_override=client_limit_override,
                product_limit_override=product_limit_override,
                monthly_message_limit_override=monthly_message_limit_override,
                storage_limit_mb_override=storage_limit_mb_override,
                ad_slot_limit_override=ad_slot_limit_override,
                feature_flags_override=feature_flags_override,
                discount_config=discount_config,
                price_override=price_override,
                source="renewal_scheduled",
            )
    else:
        active_tariff_plan_id = subscription.get("tariff_plan_id")
        target_tariff = get_tariff_plan_by_id(active_tariff_plan_id)
        if not target_tariff:
            raise ValueError(f"Tariff plan {active_tariff_plan_id} not found")
        billing_cycle_months = _safe_int(period_months, subscription.get("billing_cycle_months")) or 1
        employee_limit_override = subscription.get("employee_limit_override")
        client_limit_override = subscription.get("client_limit_override")
        product_limit_override = subscription.get("product_limit_override")
        monthly_message_limit_override = subscription.get("monthly_message_limit_override")
        storage_limit_mb_override = subscription.get("storage_limit_mb_override")
        ad_slot_limit_override = subscription.get("ad_slot_limit_override")
        discount_config = _normalize_discount_config(subscription.get("discount_config"))
        price_override = _normalize_price_override(subscription.get("price_override"))
        feature_flags_override = _normalize_feature_flags(subscription.get("current_snapshot", {}).get("feature_flags"))
        snapshot = _build_tariff_snapshot(
            target_tariff,
            billing_cycle_months=billing_cycle_months,
            employee_limit_override=employee_limit_override,
            client_limit_override=client_limit_override,
            product_limit_override=product_limit_override,
            monthly_message_limit_override=monthly_message_limit_override,
            storage_limit_mb_override=storage_limit_mb_override,
            ad_slot_limit_override=ad_slot_limit_override,
            feature_flags_override=feature_flags_override,
            discount_config=discount_config,
            price_override=price_override,
            source="renewal",
        )
        next_status = "active"
        next_is_trial = False
        next_notes = subscription.get("notes")

    effective_period_months = max(1, int(period_months or billing_cycle_months or 1))
    next_cycle_end = _add_months(next_cycle_start, effective_period_months)
    payment_snapshot = dict(snapshot)
    payment_snapshot["billing_cycle_months"] = effective_period_months
    if base_amount is not None:
        payment_snapshot["base_price"] = round(max(0.0, float(base_amount)), 2)
    if amount is not None:
        payment_snapshot["price"] = round(max(0.0, float(amount)), 2)
    if currency:
        payment_snapshot["currency"] = currency

    payment_base_amount = _safe_float(payment_snapshot.get("base_price"), 0.0) or 0.0
    payment_amount = _safe_float(payment_snapshot.get("price"), 0.0) or 0.0
    payment_discount_amount = max(0.0, round(payment_base_amount - payment_amount, 2))
    payment_currency = payment_snapshot.get("currency")
    payment_due_at = _parse_datetime(due_at)

    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute(
            """
            INSERT INTO company_payments (
                company_id, subscription_id, tariff_plan_id, status, amount, base_amount,
                discount_amount, discount_percent, currency, period_months, period_started_at,
                period_ends_at, due_at, paid_at, invoice_number, notes, metadata, created_by_user_id
            )
            VALUES (
                %s, %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s, %s, %s
            )
            RETURNING id
            """,
            (
                company_id,
                subscription.get("id"),
                active_tariff_plan_id,
                status,
                payment_amount,
                payment_base_amount,
                payment_discount_amount,
                _safe_float(payment_snapshot.get("discount_percent"), 0.0) or 0.0,
                payment_currency,
                effective_period_months,
                next_cycle_start,
                next_cycle_end,
                payment_due_at,
                current_paid_at,
                invoice_number,
                notes,
                json.dumps(metadata or {}, ensure_ascii=False),
                created_by_user_id,
            ),
        )
        payment_id = int(c.fetchone()[0])

        c.execute(
            """
            UPDATE company_subscriptions
            SET tariff_plan_id = %s,
                status = %s,
                is_trial = %s,
                employee_limit_override = %s,
                client_limit_override = %s,
                product_limit_override = %s,
                monthly_message_limit_override = %s,
                storage_limit_mb_override = %s,
                ad_slot_limit_override = %s,
                billing_cycle_months = %s,
                current_period_started_at = %s,
                current_period_ends_at = %s,
                trial_ends_at = NULL,
                ends_at = %s,
                current_snapshot = %s,
                scheduled_change = %s,
                discount_config = %s,
                price_override = %s,
                last_payment_at = %s,
                next_payment_due_at = %s,
                notes = %s,
                updated_at = CURRENT_TIMESTAMP
            WHERE company_id = %s
            """,
            (
                active_tariff_plan_id,
                next_status,
                next_is_trial,
                employee_limit_override,
                client_limit_override,
                product_limit_override,
                monthly_message_limit_override,
                storage_limit_mb_override,
                ad_slot_limit_override,
                effective_period_months,
                next_cycle_start,
                next_cycle_end,
                next_cycle_end,
                json.dumps(payment_snapshot, ensure_ascii=False),
                '{}' if should_apply_scheduled else json.dumps(subscription.get("scheduled_change") or {}, ensure_ascii=False),
                json.dumps(discount_config, ensure_ascii=False),
                json.dumps(price_override, ensure_ascii=False),
                current_paid_at,
                next_cycle_end,
                next_notes,
                company_id,
            ),
        )
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

    return {
        "id": payment_id,
        "company_id": company_id,
        "subscription_id": subscription.get("id"),
        "tariff_plan_id": active_tariff_plan_id,
        "status": status,
        "amount": payment_amount,
        "base_amount": payment_base_amount,
        "discount_amount": payment_discount_amount,
        "discount_percent": _safe_float(payment_snapshot.get("discount_percent"), 0.0) or 0.0,
        "currency": payment_currency,
        "period_months": effective_period_months,
        "period_started_at": next_cycle_start,
        "period_ends_at": next_cycle_end,
        "due_at": payment_due_at,
        "paid_at": current_paid_at,
        "invoice_number": invoice_number,
        "notes": notes,
        "metadata": metadata or {},
        "snapshot": payment_snapshot,
    }


def list_company_payments(company_id: int | None = None, status: str | None = None, limit: int = 100) -> list[dict[str, Any]]:
    conn = get_db_connection()
    c = conn.cursor()
    try:
        where_parts = ["1=1"]
        params: list[Any] = []
        if company_id is not None:
            where_parts.append("cp.company_id = %s")
            params.append(company_id)
        if status:
            where_parts.append("cp.status = %s")
            params.append(status)
        params.append(max(1, int(limit or 100)))

        c.execute(
            f"""
            SELECT
                cp.id, cp.company_id, c.name AS company_name, cp.subscription_id, cp.tariff_plan_id,
                tp.key AS tariff_key, tp.name AS tariff_name, cp.status, cp.amount, cp.base_amount,
                cp.discount_amount, cp.discount_percent, cp.currency, cp.period_months,
                cp.period_started_at, cp.period_ends_at, cp.due_at, cp.paid_at, cp.invoice_number,
                cp.notes, cp.metadata, cp.created_by_user_id, cp.created_at
            FROM company_payments cp
            LEFT JOIN companies c ON c.id = cp.company_id
            LEFT JOIN tariff_plans tp ON tp.id = cp.tariff_plan_id
            WHERE {' AND '.join(where_parts)}
            ORDER BY COALESCE(cp.paid_at, cp.created_at) DESC, cp.id DESC
            LIMIT %s
            """,
            params,
        )
        rows = []
        for row in c.fetchall():
            rows.append(
                {
                    "id": int(row[0]),
                    "company_id": _safe_int(row[1]),
                    "company_name": row[2],
                    "subscription_id": _safe_int(row[3]),
                    "tariff_plan_id": _safe_int(row[4]),
                    "tariff_key": row[5],
                    "tariff_name": row[6],
                    "status": row[7],
                    "amount": _safe_float(row[8], 0.0) or 0.0,
                    "base_amount": _safe_float(row[9], 0.0) or 0.0,
                    "discount_amount": _safe_float(row[10], 0.0) or 0.0,
                    "discount_percent": _safe_float(row[11], 0.0) or 0.0,
                    "currency": row[12],
                    "period_months": _safe_int(row[13], 1) or 1,
                    "period_started_at": row[14],
                    "period_ends_at": row[15],
                    "due_at": row[16],
                    "paid_at": row[17],
                    "invoice_number": row[18],
                    "notes": row[19],
                    "metadata": _json_load(row[20], {}),
                    "created_by_user_id": _safe_int(row[21]),
                    "created_at": row[22],
                }
            )
        return rows
    finally:
        conn.close()


def list_platform_ads(company_id: int | None = None, status: str | None = None) -> list[dict[str, Any]]:
    conn = get_db_connection()
    c = conn.cursor()
    try:
        where_parts = ["1=1"]
        params: list[Any] = []
        if company_id is not None:
            where_parts.append("pa.company_id = %s")
            params.append(company_id)
        if status:
            where_parts.append("pa.status = %s")
            params.append(status)
        c.execute(
            f"""
            SELECT
                pa.id, pa.company_id, c.name AS company_name, pa.title, pa.description,
                pa.image_url, pa.link_url, pa.placement, pa.size_label, pa.width_px,
                pa.height_px, pa.status, pa.starts_at, pa.ends_at, pa.notes,
                pa.created_by_user_id, pa.created_at, pa.updated_at
            FROM platform_ads pa
            LEFT JOIN companies c ON c.id = pa.company_id
            WHERE {' AND '.join(where_parts)}
            ORDER BY COALESCE(pa.starts_at, pa.created_at) DESC, pa.id DESC
            """,
            params,
        )
        result = []
        for row in c.fetchall():
            result.append(
                {
                    "id": int(row[0]),
                    "company_id": _safe_int(row[1]),
                    "company_name": row[2],
                    "title": row[3],
                    "description": row[4],
                    "image_url": row[5],
                    "link_url": row[6],
                    "placement": row[7],
                    "size_label": row[8],
                    "width_px": _safe_int(row[9]),
                    "height_px": _safe_int(row[10]),
                    "status": row[11],
                    "starts_at": row[12],
                    "ends_at": row[13],
                    "notes": row[14],
                    "created_by_user_id": _safe_int(row[15]),
                    "created_at": row[16],
                    "updated_at": row[17],
                }
            )
        return result
    finally:
        conn.close()


def create_platform_ad(data: dict[str, Any]) -> int:
    company_id = _safe_int(data.get("company_id"))
    status = data.get("status") or "draft"
    starts_at = _parse_datetime(data.get("starts_at"))
    ends_at = _parse_datetime(data.get("ends_at"))
    if company_id and _ad_is_active_now(status, starts_at, ends_at):
        ensure_company_quota(company_id, "ads", 1)

    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute(
            """
            INSERT INTO platform_ads (
                company_id, title, description, image_url, link_url, placement,
                size_label, width_px, height_px, status, starts_at, ends_at,
                notes, created_by_user_id, updated_at
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP)
            RETURNING id
            """,
            (
                company_id,
                data.get("title"),
                data.get("description"),
                data.get("image_url"),
                data.get("link_url"),
                data.get("placement"),
                data.get("size_label"),
                _safe_int(data.get("width_px")),
                _safe_int(data.get("height_px")),
                status,
                starts_at,
                ends_at,
                data.get("notes"),
                data.get("created_by_user_id"),
            ),
        )
        ad_id = int(c.fetchone()[0])
        conn.commit()
        return ad_id
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def update_platform_ad(ad_id: int, data: dict[str, Any]) -> bool:
    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute(
            """
            SELECT company_id, status, starts_at, ends_at
            FROM platform_ads
            WHERE id = %s
            """,
            (ad_id,),
        )
        existing_row = c.fetchone()
        if not existing_row:
            return False

        existing_company_id = _safe_int(existing_row[0])
        existing_status = existing_row[1]
        existing_starts_at = existing_row[2]
        existing_ends_at = existing_row[3]

        if "company_id" in data and data.get("company_id") is None:
            final_company_id = None
        else:
            final_company_id = _safe_int(data.get("company_id"), existing_company_id)
        final_status = data.get("status", existing_status)
        final_starts_at = _parse_datetime(data.get("starts_at")) if "starts_at" in data else _parse_datetime(existing_starts_at)
        final_ends_at = _parse_datetime(data.get("ends_at")) if "ends_at" in data else _parse_datetime(existing_ends_at)
        was_active_now = bool(existing_company_id and _ad_is_active_now(existing_status, existing_starts_at, existing_ends_at))
        will_be_active_now = bool(final_company_id and _ad_is_active_now(final_status, final_starts_at, final_ends_at))

        if final_company_id and will_be_active_now:
            requires_additional_slot = not (was_active_now and existing_company_id == final_company_id)
            if requires_additional_slot:
                ensure_company_quota(final_company_id, "ads", 1)

        updates: list[str] = []
        params: list[Any] = []
        mapping = {
            "company_id": "company_id",
            "title": "title",
            "description": "description",
            "image_url": "image_url",
            "link_url": "link_url",
            "placement": "placement",
            "size_label": "size_label",
            "width_px": "width_px",
            "height_px": "height_px",
            "status": "status",
            "starts_at": "starts_at",
            "ends_at": "ends_at",
            "notes": "notes",
        }
        for field_name, column_name in mapping.items():
            if field_name not in data:
                continue
            updates.append(f"{column_name} = %s")
            if field_name in {"starts_at", "ends_at"}:
                params.append(_parse_datetime(data[field_name]))
            else:
                params.append(data[field_name])
        if not updates:
            return False
        updates.append("updated_at = CURRENT_TIMESTAMP")
        params.append(ad_id)
        c.execute(f"UPDATE platform_ads SET {', '.join(updates)} WHERE id = %s", params)
        conn.commit()
        return c.rowcount > 0
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def delete_platform_ad(ad_id: int) -> bool:
    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute("DELETE FROM platform_ads WHERE id = %s", (ad_id,))
        conn.commit()
        return c.rowcount > 0
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def archive_company(company_id: int) -> bool:
    return update_company(company_id, {"status": "archived"})


def suspend_company(company_id: int) -> bool:
    return update_company(company_id, {"status": "suspended"})


def delete_company(company_id: int) -> bool:
    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute(
            """
            UPDATE companies
            SET status = 'deleted',
                deleted_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = %s AND deleted_at IS NULL
            """,
            (company_id,),
        )
        company_updated = c.rowcount > 0
        c.execute(
            """
            UPDATE users
            SET is_active = FALSE,
                updated_at = CURRENT_TIMESTAMP
            WHERE company_id = %s
              AND role <> 'super_admin'
            """,
            (company_id,),
        )
        conn.commit()
        return company_updated
    except Exception as e:
        conn.rollback()
        log_error(f"Error deleting company {company_id}: {e}", "companies")
        raise
    finally:
        conn.close()
