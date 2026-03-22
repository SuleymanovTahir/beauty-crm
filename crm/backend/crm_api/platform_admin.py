"""
Platform admin API for multi-tenant SaaS CRM management.
"""
from __future__ import annotations

import csv
from datetime import datetime, timedelta
from io import StringIO
import json
from typing import Optional

from fastapi import APIRouter, Cookie, Depends, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel, Field

from db.companies import (
    QuotaExceededError,
    archive_company,
    assign_company_subscription,
    clear_company_scheduled_change,
    clone_tariff_plan,
    create_company,
    create_platform_ad,
    create_tariff_plan,
    deactivate_tariff_plan,
    delete_company,
    delete_platform_ad,
    get_company_by_id,
    get_company_subscription,
    get_company_usage,
    get_tariff_plan_by_key,
    list_companies,
    list_platform_audit_log,
    list_company_payments,
    list_platform_call_logs,
    list_platform_chat_history,
    list_platform_ads,
    list_platform_webhooks,
    list_tariff_plans,
    record_company_payment,
    restore_company,
    suspend_company,
    update_company,
    update_company_payment,
    update_platform_ad,
    update_company_subscription_runtime,
    update_tariff_plan,
)
from db.connection import get_db_connection
from utils.email_service import send_email
from utils.logger import log_info
from utils.tenant_context import platform_access
from utils.utils import require_auth

router = APIRouter(tags=["Platform Admin"])


class PlatformCompanyCreateRequest(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    business_type: str = "other"
    product_mode: str = "crm"
    currency: Optional[str] = None
    timezone: str = "UTC"
    timezone_offset: int = 0
    employee_limit: Optional[int] = None
    tariff_key: str = "trial"


class PlatformCompanyUpdateRequest(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    status: Optional[str] = None
    business_type: Optional[str] = None
    product_mode: Optional[str] = None
    currency: Optional[str] = None
    timezone: Optional[str] = None
    timezone_offset: Optional[int] = None
    employee_limit: Optional[int] = None
    company_name: Optional[str] = None
    metadata: Optional[dict] = None


class PlatformTariffRequest(BaseModel):
    key: str
    name: str
    description: Optional[str] = None
    employee_limit: int = 0
    client_limit: int = 0
    product_limit: int = 0
    monthly_message_limit: int = 0
    storage_limit_mb: int = 0
    ad_slot_limit: int = 0
    monthly_price: float = 0
    yearly_price: float = 0
    currency: str = "USD"
    trial_days: int = 14
    feature_flags: dict = Field(default_factory=dict)
    is_active: bool = True
    sort_order: int = 0


class PlatformSubscriptionRequest(BaseModel):
    tariff_plan_id: Optional[int] = None
    tariff_key: Optional[str] = None
    status: str = "active"
    is_trial: bool = False
    employee_limit_override: Optional[int] = None
    client_limit_override: Optional[int] = None
    product_limit_override: Optional[int] = None
    monthly_message_limit_override: Optional[int] = None
    storage_limit_mb_override: Optional[int] = None
    ad_slot_limit_override: Optional[int] = None
    billing_cycle_months: int = 1
    price_override_amount: Optional[float] = None
    currency_override: Optional[str] = None
    discount_percent: Optional[float] = None
    discount_amount: Optional[float] = None
    discount_reason: Optional[str] = None
    feature_flags_override: dict = Field(default_factory=dict)
    trial_days: Optional[int] = None
    notes: Optional[str] = None
    apply_mode: str = "immediate"
    effective_at: Optional[str] = None


class PlatformPaymentRequest(BaseModel):
    amount: Optional[float] = None
    base_amount: Optional[float] = None
    currency: Optional[str] = None
    period_months: int = 1
    due_at: Optional[str] = None
    paid_at: Optional[str] = None
    status: str = "paid"
    notes: Optional[str] = None
    invoice_number: Optional[str] = None
    metadata: dict = Field(default_factory=dict)
    apply_scheduled_change: bool = True


class PlatformPaymentUpdateRequest(BaseModel):
    status: Optional[str] = None
    due_at: Optional[str] = None
    paid_at: Optional[str] = None
    invoice_number: Optional[str] = None
    notes: Optional[str] = None
    metadata: Optional[dict] = None


class PlatformSubscriptionRuntimeRequest(BaseModel):
    auto_renew: Optional[bool] = None
    trial_ends_at: Optional[str] = None
    next_payment_due_at: Optional[str] = None
    notes: Optional[str] = None


class PlatformAdRequest(BaseModel):
    company_id: Optional[int] = None
    title: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    link_url: Optional[str] = None
    placement: str
    size_label: Optional[str] = None
    width_px: Optional[int] = None
    height_px: Optional[int] = None
    status: str = "draft"
    starts_at: Optional[str] = None
    ends_at: Optional[str] = None
    notes: Optional[str] = None


class PlatformTariffCloneRequest(BaseModel):
    key: Optional[str] = None
    name: Optional[str] = None


class PlatformBroadcastRequest(BaseModel):
    title: str
    message: str
    delivery_channel: str = "email"
    company_ids: list[int] = Field(default_factory=list)
    company_statuses: list[str] = Field(default_factory=list)
    tariff_keys: list[str] = Field(default_factory=list)
    send_now: bool = True


def _require_super_admin(session_token: Optional[str] = Cookie(None)):
    user = require_auth(session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    if not (user.get("role") == "super_admin" or user.get("is_super_admin") is True):
        raise HTTPException(status_code=403, detail="Forbidden")
    return user


def _resolve_tariff_plan_id(tariff_plan_id: Optional[int], tariff_key: Optional[str]) -> int:
    if tariff_plan_id is not None:
        return int(tariff_plan_id)

    if not tariff_key:
        raise HTTPException(status_code=400, detail="tariff_plan_id_or_tariff_key_required")

    tariff = get_tariff_plan_by_key(tariff_key)
    if not tariff:
        raise HTTPException(status_code=404, detail="tariff_not_found")
    return int(tariff["id"])


def _raise_quota_http_error(error: QuotaExceededError) -> None:
    raise HTTPException(status_code=409, detail=error.detail)


def _parse_optional_bool(value: Optional[str]) -> Optional[bool]:
    if value is None:
        return None
    normalized = str(value).strip().lower()
    if normalized in {"1", "true", "yes", "on"}:
        return True
    if normalized in {"0", "false", "no", "off"}:
        return False
    return None


def _parse_datetime_value(value: object) -> Optional[datetime]:
    if isinstance(value, datetime):
        return value
    if not isinstance(value, str):
        return None
    normalized_value = value.strip().replace("Z", "+00:00")
    if not normalized_value:
        return None
    try:
        parsed = datetime.fromisoformat(normalized_value)
    except ValueError:
        return None
    return parsed.replace(tzinfo=None) if parsed.tzinfo is not None else parsed


def _load_platform_broadcasts() -> list[dict]:
    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute(
            """
            SELECT id, title, message, delivery_channel, target_filter, sent_companies_count,
                   status, created_by_user_id, created_at, sent_at
            FROM platform_broadcasts
            ORDER BY created_at DESC, id DESC
            """
        )
        rows = c.fetchall()
        result = []
        for row in rows:
            result.append(
                {
                    "id": int(row[0]),
                    "title": row[1],
                    "message": row[2],
                    "delivery_channel": row[3],
                    "target_filter": row[4] if isinstance(row[4], dict) else json.loads(row[4] or "{}"),
                    "sent_companies_count": int(row[5] or 0),
                    "status": row[6],
                    "created_by_user_id": int(row[7]) if row[7] is not None else None,
                    "created_at": row[8],
                    "sent_at": row[9],
                }
            )
        return result
    finally:
        conn.close()


def _csv_response(filename: str, rows: list[list[object]]) -> Response:
    buffer = StringIO()
    writer = csv.writer(buffer)
    for row in rows:
        writer.writerow(row)
    return Response(
        content=buffer.getvalue(),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


def _select_target_companies(payload: PlatformBroadcastRequest) -> list[dict]:
    conn = get_db_connection()
    c = conn.cursor()
    try:
        where_parts = ["c.deleted_at IS NULL"]
        params: list[object] = []

        if payload.company_ids:
            where_parts.append("c.id = ANY(%s)")
            params.append(payload.company_ids)

        if payload.company_statuses:
            where_parts.append("c.status = ANY(%s)")
            params.append(payload.company_statuses)

        if payload.tariff_keys:
            where_parts.append("tp.key = ANY(%s)")
            params.append(payload.tariff_keys)

        c.execute(
            f"""
            SELECT DISTINCT c.id, c.name, c.email, c.status, tp.key
            FROM companies c
            LEFT JOIN company_subscriptions cs ON cs.company_id = c.id
            LEFT JOIN tariff_plans tp ON tp.id = cs.tariff_plan_id
            WHERE {' AND '.join(where_parts)}
            ORDER BY c.name ASC, c.id ASC
            """,
            params,
        )
        return [
            {
                "id": int(row[0]),
                "name": row[1],
                "email": row[2],
                "status": row[3],
                "tariff_key": row[4],
            }
            for row in c.fetchall()
        ]
    finally:
        conn.close()


def _company_payload_with_usage(company: dict) -> dict:
    payload = dict(company)
    payload["usage"] = get_company_usage(int(company["id"]))
    return payload


@router.get("/platform-admin/overview")
async def get_platform_overview(current_user: dict = Depends(_require_super_admin)):
    del current_user
    with platform_access():
        companies = list_companies()
        tariffs = list_tariff_plans()
        payments = list_company_payments(limit=500)
        ads = list_platform_ads(status="active")

    total_revenue = sum(float(payment.get("amount") or 0) for payment in payments if payment.get("status") == "paid")
    expected_mrr = 0.0
    clients_total = 0
    products_total = 0
    messages_this_month = 0
    storage_total_mb = 0
    payments_overdue = 0
    payments_due_7_days = 0
    now = datetime.utcnow()
    due_soon_deadline = now + timedelta(days=7)

    for company in companies:
        usage = get_company_usage(int(company["id"]))
        clients_total += int(usage.get("clients_used") or 0)
        products_total += int(usage.get("products_used") or 0)
        messages_this_month += int(usage.get("messages_used") or 0)
        storage_total_mb += int(usage.get("storage_used_mb") or 0)
        subscription = company.get("subscription") or {}
        current_price = float(subscription.get("current_price") or 0)
        billing_cycle = max(1, int(subscription.get("billing_cycle_months") or 1))
        expected_mrr += current_price / billing_cycle if current_price > 0 else 0.0
        next_due_at = _parse_datetime_value(subscription.get("next_payment_due_at"))
        if next_due_at is not None:
            if next_due_at < now:
                payments_overdue += 1
            elif next_due_at <= due_soon_deadline:
                payments_due_7_days += 1

    return {
        "companies_total": len(companies),
        "companies_active": sum(1 for company in companies if company.get("status") == "active"),
        "companies_trial": sum(1 for company in companies if company.get("subscription", {}).get("is_trial") is True),
        "companies_suspended": sum(1 for company in companies if company.get("status") == "suspended"),
        "tariffs_total": len(tariffs),
        "ads_active": len(ads),
        "payments_total_amount": round(total_revenue, 2),
        "expected_mrr": round(expected_mrr, 2),
        "clients_total": clients_total,
        "products_total": products_total,
        "messages_this_month": messages_this_month,
        "storage_total_mb": storage_total_mb,
        "payments_overdue": payments_overdue,
        "payments_due_7_days": payments_due_7_days,
    }


@router.get("/platform-admin/companies")
async def get_platform_companies(
    search: Optional[str] = None,
    status: Optional[str] = None,
    segment: Optional[str] = None,
    account_manager: Optional[str] = None,
    include_usage: bool = True,
    include_deleted: bool = False,
    current_user: dict = Depends(_require_super_admin),
):
    del current_user
    with platform_access():
        companies = list_companies(
            search=search,
            status=status,
            include_deleted=include_deleted,
            segment=segment,
            account_manager=account_manager,
        )
        if include_usage:
            companies = [_company_payload_with_usage(company) for company in companies]
    return {"companies": companies}


@router.get("/platform-admin/companies/{company_id}/usage")
async def get_platform_company_usage(
    company_id: int,
    current_user: dict = Depends(_require_super_admin),
):
    del current_user
    with platform_access():
        company = get_company_by_id(company_id)
        if not company:
            raise HTTPException(status_code=404, detail="company_not_found")
        usage = get_company_usage(company_id)
    return {"company": company, "usage": usage}


@router.post("/platform-admin/companies")
async def create_platform_company(
    payload: PlatformCompanyCreateRequest,
    current_user: dict = Depends(_require_super_admin),
):
    with platform_access():
        company = create_company(
            name=payload.name,
            email=payload.email,
            phone=payload.phone,
            business_type=payload.business_type,
            product_mode=payload.product_mode,
            currency=payload.currency,
            timezone=payload.timezone,
            timezone_offset=payload.timezone_offset,
            employee_limit=payload.employee_limit,
            created_by_user_id=current_user.get("id"),
            tariff_key=payload.tariff_key,
        )
    return {"success": True, "company": company}


@router.put("/platform-admin/companies/{company_id}")
async def update_platform_company(
    company_id: int,
    payload: PlatformCompanyUpdateRequest,
    current_user: dict = Depends(_require_super_admin),
):
    del current_user
    update_payload = payload.model_dump(exclude_none=True)
    if "company_name" in update_payload and "name" not in update_payload:
        update_payload["name"] = update_payload.pop("company_name")

    with platform_access():
        success = update_company(company_id, update_payload)
        company = get_company_by_id(company_id)
    return {"success": success, "company": company}


@router.get("/platform-admin/companies/{company_id}/subscription")
async def get_platform_company_subscription(
    company_id: int,
    current_user: dict = Depends(_require_super_admin),
):
    del current_user
    with platform_access():
        subscription = get_company_subscription(company_id)
        usage = get_company_usage(company_id)
    return {"subscription": subscription, "usage": usage}


@router.post("/platform-admin/companies/{company_id}/subscription")
async def assign_platform_company_subscription(
    company_id: int,
    payload: PlatformSubscriptionRequest,
    current_user: dict = Depends(_require_super_admin),
):
    tariff_plan_id = _resolve_tariff_plan_id(payload.tariff_plan_id, payload.tariff_key)
    with platform_access():
        success = assign_company_subscription(
            company_id,
            tariff_plan_id,
            status=payload.status,
            is_trial=payload.is_trial,
            employee_limit_override=payload.employee_limit_override,
            client_limit_override=payload.client_limit_override,
            product_limit_override=payload.product_limit_override,
            monthly_message_limit_override=payload.monthly_message_limit_override,
            storage_limit_mb_override=payload.storage_limit_mb_override,
            ad_slot_limit_override=payload.ad_slot_limit_override,
            billing_cycle_months=payload.billing_cycle_months,
            price_override_amount=payload.price_override_amount,
            currency_override=payload.currency_override,
            discount_percent=payload.discount_percent,
            discount_amount=payload.discount_amount,
            discount_reason=payload.discount_reason,
            feature_flags_override=payload.feature_flags_override,
            trial_days=payload.trial_days,
            assigned_by_user_id=current_user.get("id"),
            notes=payload.notes,
            apply_mode=payload.apply_mode,
            effective_at=payload.effective_at,
        )
        subscription = get_company_subscription(company_id)
        usage = get_company_usage(company_id)
    return {"success": success, "subscription": subscription, "usage": usage}


@router.put("/platform-admin/companies/{company_id}/subscription/runtime")
async def update_platform_company_subscription_runtime(
    company_id: int,
    payload: PlatformSubscriptionRuntimeRequest,
    current_user: dict = Depends(_require_super_admin),
):
    del current_user
    with platform_access():
        subscription = update_company_subscription_runtime(
            company_id,
            auto_renew=payload.auto_renew,
            trial_ends_at=payload.trial_ends_at,
            next_payment_due_at=payload.next_payment_due_at,
            notes=payload.notes,
        )
        usage = get_company_usage(company_id)
    return {"success": subscription is not None, "subscription": subscription, "usage": usage}


@router.post("/platform-admin/companies/{company_id}/payments")
async def create_platform_company_payment(
    company_id: int,
    payload: PlatformPaymentRequest,
    current_user: dict = Depends(_require_super_admin),
):
    with platform_access():
        payment = record_company_payment(
            company_id,
            amount=payload.amount,
            base_amount=payload.base_amount,
            currency=payload.currency,
            period_months=payload.period_months,
            due_at=payload.due_at,
            paid_at=payload.paid_at,
            status=payload.status,
            notes=payload.notes,
            invoice_number=payload.invoice_number,
            metadata=payload.metadata,
            created_by_user_id=current_user.get("id"),
            apply_scheduled_change=payload.apply_scheduled_change,
        )
        subscription = get_company_subscription(company_id)
    return {"success": True, "payment": payment, "subscription": subscription}


@router.get("/platform-admin/payments")
async def get_platform_payments(
    company_id: Optional[int] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    only_overdue: bool = False,
    limit: int = 100,
    current_user: dict = Depends(_require_super_admin),
):
    del current_user
    with platform_access():
        payments = list_company_payments(
            company_id=company_id,
            status=status,
            limit=limit,
            search=search,
            only_overdue=only_overdue,
        )
    return {"payments": payments}


@router.put("/platform-admin/payments/{payment_id}")
async def update_platform_company_payment(
    payment_id: int,
    payload: PlatformPaymentUpdateRequest,
    current_user: dict = Depends(_require_super_admin),
):
    del current_user
    with platform_access():
        payment = update_company_payment(
            payment_id,
            status=payload.status,
            due_at=payload.due_at,
            paid_at=payload.paid_at,
            invoice_number=payload.invoice_number,
            notes=payload.notes,
            metadata=payload.metadata,
        )
        if not payment:
            raise HTTPException(status_code=404, detail="payment_not_found")
    return {"success": True, "payment": payment}


@router.get("/platform-admin/companies/export.csv")
async def export_platform_companies_csv(
    search: Optional[str] = None,
    status: Optional[str] = None,
    segment: Optional[str] = None,
    account_manager: Optional[str] = None,
    include_deleted: bool = False,
    current_user: dict = Depends(_require_super_admin),
):
    del current_user
    with platform_access():
        companies = list_companies(
            search=search,
            status=status,
            include_deleted=include_deleted,
            segment=segment,
            account_manager=account_manager,
        )
    rows: list[list[object]] = [[
        "id",
        "name",
        "status",
        "access_code",
        "email",
        "phone",
        "business_type",
        "segment",
        "tags",
        "account_manager",
        "billing_contact_name",
        "billing_contact_email",
        "tariff_key",
        "tariff_name",
        "active_staff_count",
        "employee_limit",
        "current_price",
        "currency",
        "auto_renew",
        "trial_ends_at",
        "next_payment_due_at",
        "created_at",
    ]]
    for company in companies:
        subscription = company.get("subscription") or {}
        tariff = subscription.get("tariff") or {}
        metadata = company.get("metadata") or {}
        rows.append([
            company.get("id"),
            company.get("name"),
            company.get("status"),
            company.get("access_code"),
            company.get("email"),
            company.get("phone"),
            company.get("business_type"),
            metadata.get("segment"),
            ", ".join(metadata.get("tags") or []),
            metadata.get("account_manager"),
            metadata.get("billing_contact_name"),
            metadata.get("billing_contact_email"),
            tariff.get("key"),
            tariff.get("name"),
            company.get("active_staff_count"),
            subscription.get("effective_employee_limit"),
            subscription.get("current_price"),
            subscription.get("currency") or company.get("currency"),
            subscription.get("auto_renew"),
            subscription.get("trial_ends_at"),
            subscription.get("next_payment_due_at"),
            company.get("created_at"),
        ])
    return _csv_response("platform_companies.csv", rows)


@router.get("/platform-admin/payments/export.csv")
async def export_platform_payments_csv(
    company_id: Optional[int] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    only_overdue: bool = False,
    current_user: dict = Depends(_require_super_admin),
):
    del current_user
    with platform_access():
        payments = list_company_payments(
            company_id=company_id,
            status=status,
            limit=5000,
            search=search,
            only_overdue=only_overdue,
        )
    rows: list[list[object]] = [[
        "id",
        "company_id",
        "company_name",
        "tariff_key",
        "tariff_name",
        "status",
        "amount",
        "base_amount",
        "discount_amount",
        "discount_percent",
        "currency",
        "period_months",
        "period_started_at",
        "period_ends_at",
        "due_at",
        "paid_at",
        "invoice_number",
        "notes",
        "created_at",
    ]]
    for payment in payments:
        rows.append([
            payment.get("id"),
            payment.get("company_id"),
            payment.get("company_name"),
            payment.get("tariff_key"),
            payment.get("tariff_name"),
            payment.get("status"),
            payment.get("amount"),
            payment.get("base_amount"),
            payment.get("discount_amount"),
            payment.get("discount_percent"),
            payment.get("currency"),
            payment.get("period_months"),
            payment.get("period_started_at"),
            payment.get("period_ends_at"),
            payment.get("due_at"),
            payment.get("paid_at"),
            payment.get("invoice_number"),
            payment.get("notes"),
            payment.get("created_at"),
        ])
    return _csv_response("platform_payments.csv", rows)


@router.get("/platform-admin/audit-log")
async def get_platform_audit_log(
    company_id: Optional[int] = None,
    action: Optional[str] = None,
    entity_type: Optional[str] = None,
    user_id: Optional[int] = None,
    search: Optional[str] = None,
    limit: int = 100,
    current_user: dict = Depends(_require_super_admin),
):
    del current_user
    with platform_access():
        entries = list_platform_audit_log(
            company_id=company_id,
            action=action,
            entity_type=entity_type,
            user_id=user_id,
            search=search,
            limit=limit,
        )
    return {"entries": entries}


@router.get("/platform-admin/webhooks")
async def get_platform_webhooks(
    company_id: Optional[int] = None,
    is_active: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 100,
    current_user: dict = Depends(_require_super_admin),
):
    del current_user
    with platform_access():
        webhooks = list_platform_webhooks(
            company_id=company_id,
            is_active=_parse_optional_bool(is_active),
            search=search,
            limit=limit,
        )
    return {"webhooks": webhooks}


@router.get("/platform-admin/chat-history")
async def get_platform_chat_history(
    company_id: Optional[int] = None,
    sender: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 100,
    current_user: dict = Depends(_require_super_admin),
):
    del current_user
    with platform_access():
        entries = list_platform_chat_history(
            company_id=company_id,
            sender=sender,
            search=search,
            limit=limit,
        )
    return {"entries": entries}


@router.get("/platform-admin/call-logs")
async def get_platform_call_logs(
    company_id: Optional[int] = None,
    status: Optional[str] = None,
    direction: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 100,
    current_user: dict = Depends(_require_super_admin),
):
    del current_user
    with platform_access():
        calls = list_platform_call_logs(
            company_id=company_id,
            status=status,
            direction=direction,
            search=search,
            limit=limit,
        )
    return {"calls": calls}


@router.post("/platform-admin/companies/{company_id}/suspend")
async def suspend_platform_company(
    company_id: int,
    current_user: dict = Depends(_require_super_admin),
):
    del current_user
    with platform_access():
        success = suspend_company(company_id)
    return {"success": success}


@router.post("/platform-admin/companies/{company_id}/archive")
async def archive_platform_company(
    company_id: int,
    current_user: dict = Depends(_require_super_admin),
):
    del current_user
    with platform_access():
        success = archive_company(company_id)
    return {"success": success}


@router.post("/platform-admin/companies/{company_id}/restore")
async def restore_platform_company(
    company_id: int,
    current_user: dict = Depends(_require_super_admin),
):
    del current_user
    with platform_access():
        success = restore_company(company_id)
        company = get_company_by_id(company_id)
    return {"success": success, "company": company}


@router.delete("/platform-admin/companies/{company_id}")
async def delete_platform_company(
    company_id: int,
    current_user: dict = Depends(_require_super_admin),
):
    del current_user
    with platform_access():
        success = delete_company(company_id)
    return {"success": success}


@router.post("/platform-admin/companies/{company_id}/subscription/cancel-scheduled")
async def cancel_platform_company_scheduled_change(
    company_id: int,
    current_user: dict = Depends(_require_super_admin),
):
    del current_user
    with platform_access():
        success = clear_company_scheduled_change(company_id)
        subscription = get_company_subscription(company_id)
    return {"success": success, "subscription": subscription}


@router.get("/platform-admin/tariffs")
async def get_platform_tariffs(current_user: dict = Depends(_require_super_admin)):
    del current_user
    with platform_access():
        return {"tariffs": list_tariff_plans()}


@router.post("/platform-admin/tariffs")
async def create_platform_tariff(
    payload: PlatformTariffRequest,
    current_user: dict = Depends(_require_super_admin),
):
    del current_user
    with platform_access():
        tariff_id = create_tariff_plan(payload.model_dump())
        tariffs = list_tariff_plans()
    return {"success": True, "tariff_id": tariff_id, "tariffs": tariffs}


@router.put("/platform-admin/tariffs/{tariff_id}")
async def update_platform_tariff(
    tariff_id: int,
    payload: PlatformTariffRequest,
    current_user: dict = Depends(_require_super_admin),
):
    del current_user
    with platform_access():
        success = update_tariff_plan(tariff_id, payload.model_dump())
        tariffs = list_tariff_plans()
    return {"success": success, "tariffs": tariffs}


@router.delete("/platform-admin/tariffs/{tariff_id}")
async def deactivate_platform_tariff(
    tariff_id: int,
    current_user: dict = Depends(_require_super_admin),
):
    del current_user
    with platform_access():
        success = deactivate_tariff_plan(tariff_id)
        tariffs = list_tariff_plans()
    return {"success": success, "tariffs": tariffs}


@router.post("/platform-admin/tariffs/{tariff_id}/clone")
async def clone_platform_tariff(
    tariff_id: int,
    payload: PlatformTariffCloneRequest,
    current_user: dict = Depends(_require_super_admin),
):
    del current_user
    with platform_access():
        cloned_tariff_id = clone_tariff_plan(tariff_id, key=payload.key, name=payload.name)
        tariffs = list_tariff_plans()
    return {"success": True, "tariff_id": cloned_tariff_id, "tariffs": tariffs}


@router.get("/platform-admin/ads")
async def get_platform_ads(
    company_id: Optional[int] = None,
    status: Optional[str] = None,
    placement: Optional[str] = None,
    current_user: dict = Depends(_require_super_admin),
):
    del current_user
    with platform_access():
        ads = list_platform_ads(company_id=company_id, status=status, placement=placement)
    return {"ads": ads}


@router.post("/platform-admin/ads")
async def create_platform_ad_api(
    payload: PlatformAdRequest,
    current_user: dict = Depends(_require_super_admin),
):
    with platform_access():
        try:
            ad_id = create_platform_ad({**payload.model_dump(), "created_by_user_id": current_user.get("id")})
        except QuotaExceededError as quota_error:
            _raise_quota_http_error(quota_error)
        ads = list_platform_ads()
    return {"success": True, "ad_id": ad_id, "ads": ads}


@router.put("/platform-admin/ads/{ad_id}")
async def update_platform_ad_api(
    ad_id: int,
    payload: PlatformAdRequest,
    current_user: dict = Depends(_require_super_admin),
):
    del current_user
    with platform_access():
        try:
            success = update_platform_ad(ad_id, payload.model_dump())
        except QuotaExceededError as quota_error:
            _raise_quota_http_error(quota_error)
        ads = list_platform_ads()
    return {"success": success, "ads": ads}


@router.delete("/platform-admin/ads/{ad_id}")
async def delete_platform_ad_api(
    ad_id: int,
    current_user: dict = Depends(_require_super_admin),
):
    del current_user
    with platform_access():
        success = delete_platform_ad(ad_id)
        ads = list_platform_ads()
    return {"success": success, "ads": ads}


@router.get("/platform-admin/broadcasts")
async def get_platform_broadcasts(current_user: dict = Depends(_require_super_admin)):
    del current_user
    with platform_access():
        broadcasts = _load_platform_broadcasts()
    return {"broadcasts": broadcasts}


@router.post("/platform-admin/broadcasts")
async def create_platform_broadcast(
    payload: PlatformBroadcastRequest,
    current_user: dict = Depends(_require_super_admin),
):
    with platform_access():
        target_companies = _select_target_companies(payload)

        conn = get_db_connection()
        c = conn.cursor()
        try:
            target_filter = {
                "company_ids": payload.company_ids,
                "company_statuses": payload.company_statuses,
                "tariff_keys": payload.tariff_keys,
            }
            c.execute(
                """
                INSERT INTO platform_broadcasts (
                    title, message, delivery_channel, target_filter, sent_companies_count,
                    status, created_by_user_id, created_at, sent_at
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP, %s)
                RETURNING id
                """,
                (
                    payload.title,
                    payload.message,
                    payload.delivery_channel,
                    json.dumps(target_filter, ensure_ascii=False),
                    0,
                    "draft" if not payload.send_now else "processing",
                    current_user.get("id"),
                    None,
                ),
            )
            broadcast_id = int(c.fetchone()[0])

            sent_count = 0
            failed_count = 0

            if payload.send_now:
                for company in target_companies:
                    if payload.delivery_channel != "email":
                        failed_count += 1
                        continue
                    email = str(company.get("email") or "").strip()
                    if not email:
                        failed_count += 1
                        continue
                    success = send_email(
                        email,
                        payload.title,
                        f"<p>{payload.message}</p>",
                        payload.message,
                    )
                    if success:
                        sent_count += 1
                    else:
                        failed_count += 1

                c.execute(
                    """
                    UPDATE platform_broadcasts
                    SET sent_companies_count = %s,
                        status = %s,
                        sent_at = %s
                    WHERE id = %s
                    """,
                    (
                        sent_count,
                        "sent" if failed_count == 0 else "partial",
                        datetime.utcnow(),
                        broadcast_id,
                    ),
                )

            conn.commit()
        finally:
            conn.close()

        log_info(
            f"Platform broadcast {payload.title!r} prepared for {len(target_companies)} companies",
            "platform_admin",
        )

    return {
        "success": True,
        "broadcast_id": broadcast_id,
        "target_companies_count": len(target_companies),
    }


# ===== APPLY DUE SCHEDULED TARIFF CHANGES =====

@router.post("/platform-admin/process-scheduled-changes")
async def process_scheduled_tariff_changes(
    current_user: dict = Depends(_require_super_admin),
):
    """
    Применить все просроченные запланированные изменения тарифов.
    Вызывается вручную из панели администратора.
    Обработка: если у подписки есть scheduled_change И effective_at <= NOW() — применяем.
    """
    from db.companies import assign_company_subscription, list_companies, get_company_subscription
    import json

    now = datetime.utcnow()
    processed = []
    skipped = []
    errors = []

    with platform_access():
        conn = get_db_connection()
        c = conn.cursor()
        try:
            # Выбираем все подписки с непустым scheduled_change и effective_at в прошлом
            c.execute("""
                SELECT cs.company_id, cs.scheduled_change
                FROM company_subscriptions cs
                WHERE cs.scheduled_change IS NOT NULL
                  AND cs.scheduled_change != '{}'::jsonb
                  AND cs.scheduled_change->>'effective_at' IS NOT NULL
                  AND (cs.scheduled_change->>'effective_at')::timestamp <= %s
            """, (now,))
            rows = c.fetchall()
        finally:
            conn.close()

    for row in rows:
        company_id, scheduled_change_raw = row
        try:
            if isinstance(scheduled_change_raw, str):
                scheduled_change = json.loads(scheduled_change_raw)
            else:
                scheduled_change = scheduled_change_raw or {}

            if not scheduled_change:
                skipped.append(company_id)
                continue
            tariff_plan_id = scheduled_change.get("tariff_plan_id")
            if tariff_plan_id is None:
                tariff_plan_id = _resolve_tariff_plan_id(None, scheduled_change.get("tariff_key"))

            # Применяем изменение немедленно
            with platform_access():
                assign_company_subscription(
                    company_id,
                    tariff_plan_id,
                    status=scheduled_change.get("status") or "active",
                    is_trial=bool(scheduled_change.get("is_trial")),
                    employee_limit_override=scheduled_change.get("employee_limit_override"),
                    client_limit_override=scheduled_change.get("client_limit_override"),
                    product_limit_override=scheduled_change.get("product_limit_override"),
                    monthly_message_limit_override=scheduled_change.get("monthly_message_limit_override"),
                    storage_limit_mb_override=scheduled_change.get("storage_limit_mb_override"),
                    ad_slot_limit_override=scheduled_change.get("ad_slot_limit_override"),
                    billing_cycle_months=scheduled_change.get("billing_cycle_months", 1),
                    price_override_amount=scheduled_change.get("price_override", {}).get("amount"),
                    currency_override=scheduled_change.get("price_override", {}).get("currency"),
                    discount_percent=scheduled_change.get("discount_config", {}).get("percent"),
                    discount_amount=scheduled_change.get("discount_config", {}).get("amount"),
                    discount_reason=scheduled_change.get("discount_config", {}).get("reason"),
                    feature_flags_override=scheduled_change.get("feature_flags_override"),
                    trial_days=scheduled_change.get("trial_days"),
                    notes=scheduled_change.get("notes"),
                    apply_mode="immediate",
                    assigned_by_user_id=current_user.get("id"),
                )
            processed.append(company_id)
        except Exception as e:
            errors.append({"company_id": company_id, "error": str(e)})

    log_info(
        f"process-scheduled-changes: processed={len(processed)}, skipped={len(skipped)}, errors={len(errors)}",
        "platform_admin",
    )

    return {
        "success": True,
        "processed_count": len(processed),
        "processed_company_ids": processed,
        "skipped_count": len(skipped),
        "error_count": len(errors),
        "errors": errors,
    }
