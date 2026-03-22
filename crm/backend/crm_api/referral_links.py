"""
API для рекламного модуля: реферальные ссылки, показы, клики, конверсии, отчёты
"""
from __future__ import annotations

import csv
import io
from datetime import datetime
from typing import Any, Optional

from fastapi import APIRouter, Cookie, Query, Request
from fastapi.responses import JSONResponse, RedirectResponse, Response, StreamingResponse
from pydantic import BaseModel

from db.referral_links import (
    create_referral_link,
    delete_referral_link,
    get_advertiser_report,
    get_link_stats,
    get_referral_link_by_slug,
    get_referral_links,
    record_conversion,
    track_referral_click,
    track_referral_impression,
    update_referral_link,
)
from utils.logger import log_error
from utils.utils import require_auth

router = APIRouter(tags=["Referral Links"])
redirect_router = APIRouter(tags=["Referral Redirect"])

_TRANSPARENT_GIF = (
    b"GIF89a\x01\x00\x01\x00\x80\x00\x00\x00\x00\x00"
    b"\xff\xff\xff!\xf9\x04\x01\x00\x00\x00\x00,\x00"
    b"\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02D\x01\x00;"
)


# ─── Models ───────────────────────────────────────────────────────────────────

class CreateLinkModel(BaseModel):
    name: str
    destination_url: str
    advertiser_name: Optional[str] = None
    advertiser_email: Optional[str] = None
    campaign: Optional[str] = None
    placement: Optional[str] = None
    size_label: Optional[str] = None
    utm_source: Optional[str] = None
    utm_medium: Optional[str] = None
    utm_campaign: Optional[str] = None
    utm_content: Optional[str] = None
    utm_term: Optional[str] = None
    pricing_model: Optional[str] = None
    currency: Optional[str] = None
    budget_amount: Optional[float] = None
    unit_price: Optional[float] = None
    target_clicks: Optional[int] = None
    target_conversions: Optional[int] = None
    notes: Optional[str] = None
    starts_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    slug: Optional[str] = None


class UpdateLinkModel(BaseModel):
    name: Optional[str] = None
    destination_url: Optional[str] = None
    advertiser_name: Optional[str] = None
    advertiser_email: Optional[str] = None
    campaign: Optional[str] = None
    placement: Optional[str] = None
    size_label: Optional[str] = None
    utm_source: Optional[str] = None
    utm_medium: Optional[str] = None
    utm_campaign: Optional[str] = None
    utm_content: Optional[str] = None
    utm_term: Optional[str] = None
    pricing_model: Optional[str] = None
    currency: Optional[str] = None
    budget_amount: Optional[float] = None
    unit_price: Optional[float] = None
    target_clicks: Optional[int] = None
    target_conversions: Optional[int] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None
    starts_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None


class ConversionModel(BaseModel):
    link_id: int
    client_instagram_id: Optional[str] = None
    booking_id: Optional[int] = None
    revenue: float = 0
    click_id: Optional[int] = None
    conversion_type: Optional[str] = None
    notes: Optional[str] = None
    converted_at: Optional[datetime] = None


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _get_base_url(request: Request) -> str:
    return str(request.base_url).rstrip("/")


def _extract_request_context(request: Request) -> dict[str, Any]:
    ip_address = request.client.host if request.client else "0.0.0.0"
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        ip_address = forwarded_for.split(",")[0].strip()

    return {
        "ip": ip_address,
        "user_agent": request.headers.get("user-agent", ""),
        "referrer": request.headers.get("referer"),
        "placement": request.query_params.get("placement"),
    }


def _decorate_link_payload(link: dict[str, Any], request: Request) -> dict[str, Any]:
    base_url = _get_base_url(request)
    slug = str(link.get("slug") or "")
    if not slug:
        return link

    short_url = f"{base_url}/r/{slug}"
    tracking_pixel_url = f"{base_url}/r/i/{slug}"
    link["short_url"] = short_url
    link["tracking_pixel_url"] = tracking_pixel_url
    link["tracking_pixel_tag"] = f'<img src="{tracking_pixel_url}" alt="" width="1" height="1" />'
    return link


def _link_is_trackable(link: dict[str, Any]) -> bool:
    if not link or link.get("is_active") is not True:
        return False
    starts_at = link.get("starts_at")
    expires_at = link.get("expires_at")
    now = datetime.now()
    if isinstance(starts_at, datetime) and now < starts_at:
        return False
    if isinstance(expires_at, datetime) and now > expires_at:
        return False
    return True


def _write_advertiser_csv(report: dict[str, Any], date_from: Optional[str], date_to: Optional[str]) -> str:
    output = io.StringIO()
    writer = csv.writer(output)
    totals = report.get("totals", {})
    rows = report.get("rows", [])

    writer.writerow(["Отчёт по рекламным кампаниям"])
    writer.writerow(["Период", f"{date_from or 'начало'} — {date_to or 'текущий момент'}"])
    writer.writerow([])
    writer.writerow(["Сводка"])
    writer.writerow(["Показы", totals.get("total_impressions", 0)])
    writer.writerow(["Уникальные показы", totals.get("unique_impressions", 0)])
    writer.writerow(["Клики", totals.get("total_clicks", 0)])
    writer.writerow(["Уникальные клики", totals.get("unique_clicks", 0)])
    writer.writerow(["CTR %", totals.get("ctr", 0)])
    writer.writerow(["Конверсии", totals.get("conversions", 0)])
    writer.writerow(["Лиды", totals.get("lead_conversions", 0)])
    writer.writerow(["CR %", totals.get("conversion_rate", 0)])
    writer.writerow(["Расход", totals.get("spend", 0)])
    writer.writerow(["Выручка", totals.get("revenue", 0)])
    writer.writerow(["ROAS", totals.get("roas", 0)])
    writer.writerow([])

    writer.writerow(["Кампании"])
    writer.writerow(
        [
            "Название",
            "Кампания",
            "Рекламодатель",
            "Размещение",
            "Размер",
            "Модель оплаты",
            "Валюта",
            "Показы",
            "Уникальные показы",
            "Клики",
            "Уникальные клики",
            "CTR %",
            "Конверсии",
            "Лиды",
            "CR %",
            "Расход",
            "CPC",
            "CPA",
            "CPM",
            "Выручка",
            "ROAS",
            "Бюджет",
            "Остаток бюджета",
            "Прогресс по кликам %",
            "Прогресс по конверсиям %",
            "Создана",
            "Начало",
            "Окончание",
        ]
    )
    for row in rows:
        writer.writerow(
            [
                row.get("name", ""),
                row.get("campaign", ""),
                row.get("advertiser_name", ""),
                row.get("placement", ""),
                row.get("size_label", ""),
                row.get("pricing_model", ""),
                row.get("currency", ""),
                row.get("total_impressions", 0),
                row.get("unique_impressions", 0),
                row.get("total_clicks", 0),
                row.get("unique_clicks", 0),
                row.get("ctr", 0),
                row.get("conversions", 0),
                row.get("lead_conversions", 0),
                row.get("conversion_rate", 0),
                row.get("spend", 0),
                row.get("cpc", 0),
                row.get("cpa", 0),
                row.get("cpm", 0),
                row.get("revenue", 0),
                row.get("roas", 0),
                row.get("budget_amount", 0),
                row.get("budget_remaining", ""),
                row.get("click_goal_progress", ""),
                row.get("conversion_goal_progress", ""),
                row.get("created_at", ""),
                row.get("starts_at", ""),
                row.get("expires_at", ""),
            ]
        )

    writer.writerow([])
    writer.writerow(["По дням"])
    writer.writerow(["Дата", "Показы", "Уникальные показы", "Клики", "Уникальные клики", "Конверсии", "Лиды", "Выручка"])
    for row in report.get("daily", []):
        writer.writerow(
            [
                row.get("date", ""),
                row.get("impressions", 0),
                row.get("unique_impressions", 0),
                row.get("clicks", 0),
                row.get("unique_clicks", 0),
                row.get("conversions", 0),
                row.get("lead_conversions", 0),
                row.get("revenue", 0),
            ]
        )

    writer.writerow([])
    writer.writerow(["Сводка по рекламодателям"])
    writer.writerow(["Рекламодатель", "Показы", "Клики", "CTR %", "Конверсии", "Расход", "Выручка", "ROAS"])
    for row in report.get("advertisers", []):
        writer.writerow(
            [
                row.get("advertiser_name", ""),
                row.get("total_impressions", 0),
                row.get("total_clicks", 0),
                row.get("ctr", 0),
                row.get("conversions", 0),
                row.get("spend", 0),
                row.get("revenue", 0),
                row.get("roas", 0),
            ]
        )

    return output.getvalue()


def _write_detailed_csv(link: dict[str, Any], stats: dict[str, Any], date_from: Optional[str], date_to: Optional[str]) -> str:
    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow(["Отчёт по рекламной ссылке"])
    writer.writerow(["Название", link.get("name", "")])
    writer.writerow(["Кампания", link.get("campaign", "")])
    writer.writerow(["Рекламодатель", link.get("advertiser_name", "")])
    writer.writerow(["Размещение", link.get("placement", "")])
    writer.writerow(["Размер", link.get("size_label", "")])
    writer.writerow(["Модель оплаты", link.get("pricing_model", "")])
    writer.writerow(["Валюта", link.get("currency", "")])
    writer.writerow(["Период", f"{date_from or 'начало'} — {date_to or 'текущий момент'}"])
    writer.writerow([])
    writer.writerow(["Показы", stats.get("total_impressions", 0)])
    writer.writerow(["Уникальные показы", stats.get("unique_impressions", 0)])
    writer.writerow(["Клики", stats.get("total_clicks", 0)])
    writer.writerow(["Уникальные клики", stats.get("unique_clicks", 0)])
    writer.writerow(["CTR %", stats.get("ctr", 0)])
    writer.writerow(["Конверсии", stats.get("conversions", 0)])
    writer.writerow(["Лиды", stats.get("lead_conversions", 0)])
    writer.writerow(["CR %", stats.get("conversion_rate", 0)])
    writer.writerow(["Расход", stats.get("spend", 0)])
    writer.writerow(["CPC", stats.get("cpc", 0)])
    writer.writerow(["CPA", stats.get("cpa", 0)])
    writer.writerow(["CPM", stats.get("cpm", 0)])
    writer.writerow(["Выручка", stats.get("revenue", 0)])
    writer.writerow(["ROAS", stats.get("roas", 0)])
    writer.writerow([])

    writer.writerow(["По дням"])
    writer.writerow(["Дата", "Показы", "Уникальные показы", "Клики", "Уникальные клики", "Конверсии", "Лиды", "Выручка"])
    for row in stats.get("daily", []):
        writer.writerow(
            [
                row.get("date", ""),
                row.get("impressions", 0),
                row.get("unique_impressions", 0),
                row.get("clicks", 0),
                row.get("unique_clicks", 0),
                row.get("conversions", 0),
                row.get("lead_conversions", 0),
                row.get("revenue", 0),
            ]
        )

    for title, key in (
        ("Устройства", "devices"),
        ("Браузеры", "browsers"),
        ("Страны", "countries"),
        ("Источники переходов", "referrers"),
        ("Размещения", "placements"),
        ("Типы конверсий", "conversion_types"),
    ):
        writer.writerow([])
        writer.writerow([title])
        writer.writerow(["Название", "Количество"])
        for item_key, item_value in (stats.get(key) or {}).items():
            writer.writerow([item_key, item_value])

    return output.getvalue()


# ─── CRUD Endpoints ───────────────────────────────────────────────────────────

@router.get("/referral-links")
async def list_referral_links(
    request: Request,
    session_token: Optional[str] = Cookie(None),
):
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    if user.get("role") not in ["admin", "manager", "director", "marketer", "accountant"]:
        return JSONResponse({"error": "Forbidden"}, status_code=403)

    company_id = user.get("company_id")
    links = [_decorate_link_payload(link, request) for link in get_referral_links(company_id)]
    return JSONResponse({"links": links})


@router.post("/referral-links")
async def create_link(
    body: CreateLinkModel,
    request: Request,
    session_token: Optional[str] = Cookie(None),
):
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    if user.get("role") not in ["admin", "manager", "director", "marketer"]:
        return JSONResponse({"error": "Forbidden"}, status_code=403)

    company_id = user.get("company_id")
    try:
        result = create_referral_link(
            company_id=company_id,
            name=body.name,
            destination_url=body.destination_url,
            advertiser_name=body.advertiser_name,
            advertiser_email=body.advertiser_email,
            campaign=body.campaign,
            placement=body.placement,
            size_label=body.size_label,
            utm_source=body.utm_source,
            utm_medium=body.utm_medium,
            utm_campaign=body.utm_campaign,
            utm_content=body.utm_content,
            utm_term=body.utm_term,
            pricing_model=body.pricing_model,
            currency=body.currency,
            budget_amount=body.budget_amount,
            unit_price=body.unit_price,
            target_clicks=body.target_clicks,
            target_conversions=body.target_conversions,
            notes=body.notes,
            starts_at=body.starts_at,
            expires_at=body.expires_at,
            created_by=user.get("id"),
            slug=body.slug,
        )
        payload = _decorate_link_payload(
            {
                "id": result["id"],
                "slug": result["slug"],
            },
            request,
        )
        return JSONResponse({"success": True, **payload})
    except Exception as error:
        log_error(f"create_link error: {error}", "api.referral_links")
        return JSONResponse({"error": str(error)}, status_code=500)


@router.put("/referral-links/{link_id}")
async def update_link(
    link_id: int,
    body: UpdateLinkModel,
    session_token: Optional[str] = Cookie(None),
):
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    if user.get("role") not in ["admin", "manager", "director", "marketer"]:
        return JSONResponse({"error": "Forbidden"}, status_code=403)

    company_id = user.get("company_id")
    updates = body.dict(exclude_none=True)
    ok = update_referral_link(link_id, company_id, **updates)
    return JSONResponse({"success": ok})


@router.delete("/referral-links/{link_id}")
async def delete_link(
    link_id: int,
    session_token: Optional[str] = Cookie(None),
):
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    if user.get("role") not in ["admin", "director"]:
        return JSONResponse({"error": "Forbidden"}, status_code=403)

    company_id = user.get("company_id")
    ok = delete_referral_link(link_id, company_id)
    return JSONResponse({"success": ok})


# ─── Redirect & Track ─────────────────────────────────────────────────────────

@redirect_router.get("/r/{slug}")
async def redirect_referral(
    slug: str,
    request: Request,
):
    """Публичный эндпоинт: редирект + трекинг клика."""
    link = get_referral_link_by_slug(slug)
    if not link:
        return JSONResponse({"error": "Link not found"}, status_code=404)
    if not _link_is_trackable(link):
        return JSONResponse({"error": "Link inactive or unavailable"}, status_code=410)

    context = _extract_request_context(request)
    track_referral_click(
        link_id=link["id"],
        company_id=link["company_id"],
        ip=context["ip"],
        user_agent=context["user_agent"],
        referrer=context["referrer"],
        placement=context["placement"] or link.get("placement"),
    )

    destination_url = str(link.get("destination_url") or "")
    utm_pairs: list[str] = []
    for key in ("utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"):
        value = link.get(key)
        if value:
            utm_pairs.append(f"{key}={value}")
    if utm_pairs:
        separator = "&" if "?" in destination_url else "?"
        destination_url += separator + "&".join(utm_pairs)

    return RedirectResponse(url=destination_url, status_code=302)


@redirect_router.get("/r/i/{slug}")
async def track_impression_pixel(
    slug: str,
    request: Request,
):
    """Публичный пиксель для учёта показов рекламной ссылки."""
    link = get_referral_link_by_slug(slug)
    if link and _link_is_trackable(link):
        context = _extract_request_context(request)
        track_referral_impression(
            link_id=link["id"],
            company_id=link["company_id"],
            ip=context["ip"],
            user_agent=context["user_agent"],
            referrer=context["referrer"],
            placement=context["placement"] or link.get("placement"),
        )

    return Response(content=_TRANSPARENT_GIF, media_type="image/gif")


# ─── Stats & Reports ─────────────────────────────────────────────────────────

@router.get("/referral-links/{link_id}/stats")
async def get_stats(
    link_id: int,
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    session_token: Optional[str] = Cookie(None),
):
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    company_id = user.get("company_id")
    stats = get_link_stats(link_id, company_id, date_from, date_to)
    return JSONResponse(stats)


@router.post("/referral-links/conversion")
async def log_conversion(
    body: ConversionModel,
    session_token: Optional[str] = Cookie(None),
):
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    company_id = user.get("company_id")
    ok = record_conversion(
        link_id=body.link_id,
        company_id=company_id,
        client_instagram_id=body.client_instagram_id,
        booking_id=body.booking_id,
        revenue=body.revenue,
        click_id=body.click_id,
        conversion_type=body.conversion_type,
        notes=body.notes,
        converted_at=body.converted_at,
    )
    return JSONResponse({"success": ok})


# ─── Advertiser Reports ──────────────────────────────────────────────────────

@router.get("/referral-links/report/advertiser")
async def advertiser_report(
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    format: str = Query("json"),
    session_token: Optional[str] = Cookie(None),
):
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    if user.get("role") not in ["admin", "manager", "director", "marketer", "accountant"]:
        return JSONResponse({"error": "Forbidden"}, status_code=403)

    company_id = user.get("company_id")
    report = get_advertiser_report(company_id, date_from, date_to)

    if format == "csv":
        csv_payload = _write_advertiser_csv(report, date_from, date_to)
        period = f"{date_from or 'all'}_{date_to or 'now'}"
        return StreamingResponse(
            iter([csv_payload]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=ad_report_{period}.csv"},
        )

    return JSONResponse(
        {
            **report,
            "period": {"from": date_from, "to": date_to},
            "generated_at": datetime.now().isoformat(),
        }
    )


@router.get("/referral-links/report/detailed/{link_id}")
async def detailed_link_report(
    link_id: int,
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    format: str = Query("json"),
    session_token: Optional[str] = Cookie(None),
):
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    company_id = user.get("company_id")
    stats = get_link_stats(link_id, company_id, date_from, date_to)
    link_meta = stats.get("link")
    if not isinstance(link_meta, dict) or not link_meta:
        return JSONResponse({"error": "Link not found"}, status_code=404)

    report = {
        "link": link_meta,
        "stats": stats,
        "period": {"from": date_from, "to": date_to},
        "generated_at": datetime.now().isoformat(),
    }

    if format == "csv":
        csv_payload = _write_detailed_csv(link_meta, stats, date_from, date_to)
        return StreamingResponse(
            iter([csv_payload]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=link_{link_id}_report.csv"},
        )

    return JSONResponse(report)
