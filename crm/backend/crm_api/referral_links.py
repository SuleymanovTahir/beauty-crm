"""
API для рекламного модуля: реферальные ссылки, клики, отчёты для рекламодателей
"""
from fastapi import APIRouter, Query, Cookie, Request
from fastapi.responses import JSONResponse, StreamingResponse, RedirectResponse
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import csv
import io
import json

from db.connection import get_db_connection
from utils.utils import require_auth
from utils.logger import log_error, log_info
from db.referral_links import (
    create_referral_link,
    get_referral_links,
    get_referral_link_by_slug,
    update_referral_link,
    delete_referral_link,
    track_referral_click,
    record_conversion,
    get_link_stats,
    get_advertiser_report,
)

router = APIRouter(tags=["Referral Links"])
redirect_router = APIRouter(tags=["Referral Redirect"])


# ─── Models ───────────────────────────────────────────────────────────────────

class CreateLinkModel(BaseModel):
    name: str
    destination_url: str
    advertiser_name: Optional[str] = None
    advertiser_email: Optional[str] = None
    campaign: Optional[str] = None
    utm_source: Optional[str] = None
    utm_medium: Optional[str] = None
    utm_campaign: Optional[str] = None
    utm_content: Optional[str] = None
    utm_term: Optional[str] = None
    expires_at: Optional[datetime] = None
    slug: Optional[str] = None


class UpdateLinkModel(BaseModel):
    name: Optional[str] = None
    destination_url: Optional[str] = None
    advertiser_name: Optional[str] = None
    advertiser_email: Optional[str] = None
    campaign: Optional[str] = None
    utm_source: Optional[str] = None
    utm_medium: Optional[str] = None
    utm_campaign: Optional[str] = None
    utm_content: Optional[str] = None
    utm_term: Optional[str] = None
    is_active: Optional[bool] = None
    expires_at: Optional[datetime] = None


class ConversionModel(BaseModel):
    link_id: int
    client_instagram_id: Optional[str] = None
    booking_id: Optional[int] = None
    revenue: float = 0
    click_id: Optional[int] = None


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _get_base_url(request: Request) -> str:
    return str(request.base_url).rstrip("/")


def _serialize(obj):
    if isinstance(obj, datetime):
        return obj.isoformat()
    return str(obj)


# ─── CRUD Endpoints ───────────────────────────────────────────────────────────

@router.get("/referral-links")
async def list_referral_links(
    session_token: Optional[str] = Cookie(None),
):
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    if user.get("role") not in ["admin", "manager", "director", "marketer", "accountant"]:
        return JSONResponse({"error": "Forbidden"}, status_code=403)

    company_id = user.get("company_id")
    links = get_referral_links(company_id)
    # datetime serialization
    for lnk in links:
        for k, v in lnk.items():
            if isinstance(v, datetime):
                lnk[k] = v.isoformat()
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
            utm_source=body.utm_source,
            utm_medium=body.utm_medium,
            utm_campaign=body.utm_campaign,
            utm_content=body.utm_content,
            utm_term=body.utm_term,
            expires_at=body.expires_at,
            created_by=user.get("id"),
            slug=body.slug,
        )
        base = _get_base_url(request)
        short_url = f"{base}/r/{result['slug']}"
        return JSONResponse({"success": True, "id": result["id"], "slug": result["slug"], "short_url": short_url})
    except Exception as e:
        log_error(f"create_link error: {e}", "api.referral_links")
        return JSONResponse({"error": str(e)}, status_code=500)


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
    """Публичный эндпоинт: редирект + трекинг клика"""
    # Получаем все активные ссылки с этим slug
    link = get_referral_link_by_slug(slug)
    if not link or not link.get("is_active"):
        return JSONResponse({"error": "Link not found or inactive"}, status_code=404)

    # Проверяем срок
    expires = link.get("expires_at")
    if expires and datetime.now() > expires:
        return JSONResponse({"error": "Link expired"}, status_code=410)

    # IP и User-Agent
    ip = request.client.host if request.client else "0.0.0.0"
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        ip = forwarded.split(",")[0].strip()
    ua = request.headers.get("user-agent", "")
    referrer = request.headers.get("referer", None)

    # Трекинг
    track_referral_click(
        link_id=link["id"],
        company_id=link["company_id"],
        ip=ip,
        user_agent=ua,
        referrer=referrer,
    )

    # Строим destination URL с UTM-параметрами
    dest = link["destination_url"]
    utms = []
    for key in ("utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"):
        val = link.get(key)
        if val:
            utms.append(f"{key}={val}")
    if utms:
        sep = "&" if "?" in dest else "?"
        dest += sep + "&".join(utms)

    return RedirectResponse(url=dest, status_code=302)


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
    """Записать конверсию вручную (или из booking webhook)"""
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
    )
    return JSONResponse({"success": ok})


# ─── Advertiser Report ────────────────────────────────────────────────────────

@router.get("/referral-links/report/advertiser")
async def advertiser_report(
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    format: str = Query("json"),  # json | csv
    session_token: Optional[str] = Cookie(None),
):
    """
    Отчёт для рекламодателя:
    - общие клики / уникальные клики
    - конверсии и выручка
    - CTR / CR
    - разбивка по кампаниям
    """
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)
    if user.get("role") not in ["admin", "manager", "director", "marketer", "accountant"]:
        return JSONResponse({"error": "Forbidden"}, status_code=403)

    company_id = user.get("company_id")
    rows = get_advertiser_report(company_id, date_from, date_to)

    # Итоговые суммы
    totals = {
        "total_clicks": sum(r.get("total_clicks") or 0 for r in rows),
        "unique_clicks": sum(r.get("unique_clicks") or 0 for r in rows),
        "conversions": sum(r.get("conversions") or 0 for r in rows),
        "revenue": sum(float(r.get("revenue") or 0) for r in rows),
    }
    tc = totals["total_clicks"]
    totals["conversion_rate"] = round(totals["conversions"] / tc * 100, 2) if tc > 0 else 0.0

    # Сериализация дат
    for r in rows:
        for k, v in r.items():
            if isinstance(v, datetime):
                r[k] = v.isoformat()

    if format == "csv":
        output = io.StringIO()
        writer = csv.writer(output)
        headers = [
            "Название", "Кампания", "UTM Source", "UTM Medium",
            "Рекламодатель", "Создана",
            "Всего кликов", "Уникальных кликов", "Конверсий", "Выручка", "CR %"
        ]
        writer.writerow(headers)
        for r in rows:
            writer.writerow([
                r.get("name", ""), r.get("campaign", ""),
                r.get("utm_source", ""), r.get("utm_medium", ""),
                r.get("advertiser_name", ""), r.get("created_at", ""),
                r.get("total_clicks", 0), r.get("unique_clicks", 0),
                r.get("conversions", 0), r.get("revenue", 0),
                r.get("conversion_rate", 0),
            ])
        # Итоговая строка
        writer.writerow([])
        writer.writerow(["ИТОГО", "", "", "", "", "",
                         totals["total_clicks"], totals["unique_clicks"],
                         totals["conversions"], totals["revenue"], totals["conversion_rate"]])

        output.seek(0)
        period = f"{date_from or 'all'}_{date_to or 'now'}"
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=ad_report_{period}.csv"}
        )

    return JSONResponse({
        "rows": rows,
        "totals": totals,
        "period": {"from": date_from, "to": date_to},
        "generated_at": datetime.now().isoformat(),
    })


@router.get("/referral-links/report/detailed/{link_id}")
async def detailed_link_report(
    link_id: int,
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    format: str = Query("json"),
    session_token: Optional[str] = Cookie(None),
):
    """Детальный отчёт по конкретной ссылке (для отправки рекламодателю)"""
    user = require_auth(session_token)
    if not user:
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    company_id = user.get("company_id")
    stats = get_link_stats(link_id, company_id, date_from, date_to)

    # Получаем мета-данные ссылки
    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute("SELECT * FROM referral_links WHERE id=%s AND company_id=%s", (link_id, company_id))
        row = c.fetchone()
        if not row:
            return JSONResponse({"error": "Link not found"}, status_code=404)
        cols = [d[0] for d in c.description]
        link_meta = dict(zip(cols, row))
        for k, v in link_meta.items():
            if isinstance(v, datetime):
                link_meta[k] = v.isoformat()
    finally:
        conn.close()

    report = {
        "link": link_meta,
        "stats": stats,
        "period": {"from": date_from, "to": date_to},
        "generated_at": datetime.now().isoformat(),
    }

    if format == "csv":
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["Отчёт по рекламной ссылке"])
        writer.writerow(["Название", link_meta.get("name")])
        writer.writerow(["Кампания", link_meta.get("campaign")])
        writer.writerow(["Рекламодатель", link_meta.get("advertiser_name")])
        writer.writerow(["Период", f"{date_from or 'начало'} — {date_to or 'сейчас'}"])
        writer.writerow([])
        writer.writerow(["Всего кликов", stats["total_clicks"]])
        writer.writerow(["Уникальных кликов", stats["unique_clicks"]])
        writer.writerow(["Конверсий", stats["conversions"]])
        writer.writerow(["Выручка", stats["revenue"]])
        writer.writerow(["Конверсия %", stats["conversion_rate"]])
        writer.writerow([])
        writer.writerow(["=== По дням ==="])
        writer.writerow(["Дата", "Клики", "Уникальные"])
        for d in stats.get("daily", []):
            writer.writerow([d["date"], d["clicks"], d["unique"]])
        writer.writerow([])
        writer.writerow(["=== Устройства ==="])
        for k, v in (stats.get("devices") or {}).items():
            writer.writerow([k, v])
        writer.writerow([])
        writer.writerow(["=== Браузеры ==="])
        for k, v in (stats.get("browsers") or {}).items():
            writer.writerow([k, v])
        writer.writerow([])
        writer.writerow(["=== Страны ==="])
        for k, v in (stats.get("countries") or {}).items():
            writer.writerow([k, v])

        output.seek(0)
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=link_{link_id}_report.csv"}
        )

    return JSONResponse(report)
