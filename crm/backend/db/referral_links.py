"""
DB-функции для рекламного модуля: реферальные ссылки, показы, клики, конверсии
"""
from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any
import hashlib
import random
import re
import string

from db.connection import get_db_connection
from utils.logger import log_error


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _parse_ua(ua_string: str) -> tuple[str, str]:
    """Определяет тип устройства и браузер из User-Agent."""
    if not ua_string:
        return "Desktop", "Other"

    ua = ua_string.lower()
    browser = "Other"
    if "edg/" in ua:
        browser = "Edge"
    elif "chrome" in ua and "edg" not in ua:
        browser = "Chrome"
    elif "safari" in ua and "chrome" not in ua:
        browser = "Safari"
    elif "firefox" in ua:
        browser = "Firefox"
    elif "opera" in ua or "opr/" in ua:
        browser = "Opera"

    device = "Desktop"
    if "mobile" in ua or "android" in ua:
        device = "Mobile"
    elif "tablet" in ua or "ipad" in ua:
        device = "Tablet"

    return device, browser


def _hash_ip(ip: str) -> str:
    return hashlib.sha256(ip.encode()).hexdigest()[:16]


def _make_slug(name: str) -> str:
    slug = re.sub(r"[^a-zA-Z0-9-]", "-", name.lower())
    slug = re.sub(r"-+", "-", slug).strip("-")
    suffix = "".join(random.choices(string.ascii_lowercase + string.digits, k=5))
    return f"{slug[:30]}-{suffix}" if slug else suffix


def _safe_float(value: Any) -> float:
    try:
        return float(value or 0)
    except (TypeError, ValueError):
        return 0.0


def _safe_int(value: Any) -> int:
    try:
        return int(value or 0)
    except (TypeError, ValueError):
        return 0


def _parse_datetime(value: Any) -> datetime | None:
    if isinstance(value, datetime):
        return value
    if not isinstance(value, str):
        return None

    normalized = value.strip().replace("Z", "+00:00")
    if not normalized:
        return None

    try:
        parsed = datetime.fromisoformat(normalized)
    except ValueError:
        try:
            parsed = datetime.strptime(normalized, "%Y-%m-%d")
        except ValueError:
            return None

    return parsed.replace(tzinfo=None) if parsed.tzinfo is not None else parsed


def _build_date_filter(column_name: str, date_from: Any = None, date_to: Any = None) -> tuple[str, list[Any]]:
    clauses: list[str] = []
    params: list[Any] = []

    start_value = _parse_datetime(date_from)
    if start_value is not None:
        clauses.append(f"{column_name} >= %s")
        params.append(start_value)

    end_value = _parse_datetime(date_to)
    if end_value is not None:
        if isinstance(date_to, str) and len(date_to.strip()) == 10:
            clauses.append(f"{column_name} < %s")
            params.append(end_value + timedelta(days=1))
        else:
            clauses.append(f"{column_name} <= %s")
            params.append(end_value)

    if not clauses:
        return "", []

    return f" AND {' AND '.join(clauses)}", params


def _top_breakdown(rows: list[tuple[Any, Any]], fallback_label: str = "Unknown") -> dict[str, int]:
    result: dict[str, int] = {}
    for raw_key, raw_value in rows:
        key = str(raw_key).strip() if raw_key is not None else ""
        normalized_key = key if key else fallback_label
        result[normalized_key] = _safe_int(raw_value)
    return result


def _merge_daily_series(*series_groups: list[dict[str, Any]]) -> list[dict[str, Any]]:
    merged: dict[str, dict[str, Any]] = {}
    for series in series_groups:
        for item in series:
            date_key = str(item.get("date"))
            if date_key not in merged:
                merged[date_key] = {
                    "date": date_key,
                    "impressions": 0,
                    "unique_impressions": 0,
                    "clicks": 0,
                    "unique_clicks": 0,
                    "conversions": 0,
                    "lead_conversions": 0,
                    "revenue": 0.0,
                }
            merged[date_key].update(
                {
                    **merged[date_key],
                    **{
                        key: (_safe_float(value) if key == "revenue" else _safe_int(value))
                        for key, value in item.items()
                        if key != "date"
                    },
                }
            )
    return [merged[key] for key in sorted(merged)]


def _calculate_spend(
    pricing_model: str | None,
    unit_price: float,
    budget_amount: float,
    total_impressions: int,
    total_clicks: int,
    conversions: int,
) -> float:
    pricing_key = (pricing_model or "flat").strip().lower()
    if pricing_key == "cpc":
        return round(total_clicks * unit_price, 2)
    if pricing_key == "cpa":
        return round(conversions * unit_price, 2)
    if pricing_key == "cpm":
        return round((total_impressions / 1000) * unit_price, 2)
    if pricing_key == "fixed":
        return round(unit_price, 2)
    if budget_amount > 0:
        return round(budget_amount, 2)
    return round(unit_price, 2)


def _apply_performance_metrics(payload: dict[str, Any]) -> dict[str, Any]:
    total_impressions = _safe_int(payload.get("total_impressions"))
    unique_impressions = _safe_int(payload.get("unique_impressions"))
    total_clicks = _safe_int(payload.get("total_clicks"))
    unique_clicks = _safe_int(payload.get("unique_clicks"))
    conversions = _safe_int(payload.get("conversions"))
    lead_conversions = _safe_int(payload.get("lead_conversions"))
    revenue = round(_safe_float(payload.get("revenue")), 2)
    budget_amount = round(_safe_float(payload.get("budget_amount")), 2)
    unit_price = round(_safe_float(payload.get("unit_price")), 4)
    target_clicks = _safe_int(payload.get("target_clicks"))
    target_conversions = _safe_int(payload.get("target_conversions"))
    pricing_model = str(payload.get("pricing_model") or "flat").strip().lower()
    existing_spend = round(_safe_float(payload.get("spend")), 2)
    spend = existing_spend
    if spend <= 0:
        spend = _calculate_spend(
            pricing_model,
            unit_price,
            budget_amount,
            total_impressions,
            total_clicks,
            conversions,
        )

    payload["total_impressions"] = total_impressions
    payload["unique_impressions"] = unique_impressions
    payload["total_clicks"] = total_clicks
    payload["unique_clicks"] = unique_clicks
    payload["conversions"] = conversions
    payload["lead_conversions"] = lead_conversions
    payload["revenue"] = revenue
    payload["budget_amount"] = budget_amount
    payload["unit_price"] = unit_price
    payload["target_clicks"] = target_clicks
    payload["target_conversions"] = target_conversions
    payload["pricing_model"] = pricing_model
    payload["spend"] = spend
    payload["budget_remaining"] = round(max(budget_amount - spend, 0), 2) if budget_amount > 0 else None
    payload["ctr"] = round((total_clicks / total_impressions) * 100, 2) if total_impressions > 0 else 0.0
    payload["unique_ctr"] = round((unique_clicks / unique_impressions) * 100, 2) if unique_impressions > 0 else 0.0
    payload["conversion_rate"] = round((conversions / total_clicks) * 100, 2) if total_clicks > 0 else 0.0
    payload["impression_conversion_rate"] = round((conversions / total_impressions) * 100, 2) if total_impressions > 0 else 0.0
    payload["lead_rate"] = round((lead_conversions / total_clicks) * 100, 2) if total_clicks > 0 else 0.0
    payload["cpc"] = round(spend / total_clicks, 2) if total_clicks > 0 else 0.0
    payload["cpa"] = round(spend / conversions, 2) if conversions > 0 else 0.0
    payload["cpm"] = round((spend / total_impressions) * 1000, 2) if total_impressions > 0 else 0.0
    payload["roas"] = round(revenue / spend, 2) if spend > 0 else 0.0
    payload["click_goal_progress"] = round((total_clicks / target_clicks) * 100, 2) if target_clicks > 0 else None
    payload["conversion_goal_progress"] = round((conversions / target_conversions) * 100, 2) if target_conversions > 0 else None
    return payload


def _serialize_row(row: dict[str, Any]) -> dict[str, Any]:
    for key, value in list(row.items()):
        if isinstance(value, datetime):
            row[key] = value.isoformat()
    return row


def _fetch_one_summary(
    cursor: Any,
    table_name: str,
    link_id: int,
    date_column: str,
    date_from: Any = None,
    date_to: Any = None,
) -> dict[str, Any]:
    date_filter, date_params = _build_date_filter(date_column, date_from, date_to)
    if table_name == "referral_impressions":
        cursor.execute(
            f"""
            SELECT
                COUNT(*) AS total_impressions,
                COUNT(CASE WHEN is_unique THEN 1 END) AS unique_impressions,
                MAX(viewed_at) AS last_impression_at
            FROM referral_impressions
            WHERE link_id = %s {date_filter}
            """,
            [link_id, *date_params],
        )
        row = cursor.fetchone() or (0, 0, None)
        return {
            "total_impressions": _safe_int(row[0]),
            "unique_impressions": _safe_int(row[1]),
            "last_impression_at": row[2],
        }

    if table_name == "referral_clicks":
        cursor.execute(
            f"""
            SELECT
                COUNT(*) AS total_clicks,
                COUNT(CASE WHEN is_unique THEN 1 END) AS unique_clicks,
                MAX(clicked_at) AS last_click_at
            FROM referral_clicks
            WHERE link_id = %s {date_filter}
            """,
            [link_id, *date_params],
        )
        row = cursor.fetchone() or (0, 0, None)
        return {
            "total_clicks": _safe_int(row[0]),
            "unique_clicks": _safe_int(row[1]),
            "last_click_at": row[2],
        }

    cursor.execute(
        f"""
        SELECT
            COUNT(*) AS conversions,
            COUNT(CASE WHEN conversion_type = 'lead' THEN 1 END) AS lead_conversions,
            COALESCE(SUM(revenue), 0) AS revenue,
            MAX(converted_at) AS last_conversion_at
        FROM referral_conversions
        WHERE link_id = %s {date_filter}
        """,
        [link_id, *date_params],
    )
    row = cursor.fetchone() or (0, 0, 0, None)
    return {
        "conversions": _safe_int(row[0]),
        "lead_conversions": _safe_int(row[1]),
        "revenue": _safe_float(row[2]),
        "last_conversion_at": row[3],
    }


def _fetch_daily_impressions(cursor: Any, link_id: int, date_from: Any = None, date_to: Any = None) -> list[dict[str, Any]]:
    date_filter, date_params = _build_date_filter("viewed_at", date_from, date_to)
    cursor.execute(
        f"""
        SELECT DATE(viewed_at) AS day,
               COUNT(*) AS impressions,
               COUNT(CASE WHEN is_unique THEN 1 END) AS unique_impressions
        FROM referral_impressions
        WHERE link_id = %s {date_filter}
        GROUP BY day
        ORDER BY day
        """,
        [link_id, *date_params],
    )
    return [
        {"date": str(day), "impressions": _safe_int(impressions), "unique_impressions": _safe_int(unique_impressions)}
        for day, impressions, unique_impressions in cursor.fetchall()
    ]


def _fetch_daily_clicks(cursor: Any, link_id: int, date_from: Any = None, date_to: Any = None) -> list[dict[str, Any]]:
    date_filter, date_params = _build_date_filter("clicked_at", date_from, date_to)
    cursor.execute(
        f"""
        SELECT DATE(clicked_at) AS day,
               COUNT(*) AS clicks,
               COUNT(CASE WHEN is_unique THEN 1 END) AS unique_clicks
        FROM referral_clicks
        WHERE link_id = %s {date_filter}
        GROUP BY day
        ORDER BY day
        """,
        [link_id, *date_params],
    )
    return [
        {"date": str(day), "clicks": _safe_int(clicks), "unique_clicks": _safe_int(unique_clicks)}
        for day, clicks, unique_clicks in cursor.fetchall()
    ]


def _fetch_daily_conversions(cursor: Any, link_id: int, date_from: Any = None, date_to: Any = None) -> list[dict[str, Any]]:
    date_filter, date_params = _build_date_filter("converted_at", date_from, date_to)
    cursor.execute(
        f"""
        SELECT DATE(converted_at) AS day,
               COUNT(*) AS conversions,
               COUNT(CASE WHEN conversion_type = 'lead' THEN 1 END) AS lead_conversions,
               COALESCE(SUM(revenue), 0) AS revenue
        FROM referral_conversions
        WHERE link_id = %s {date_filter}
        GROUP BY day
        ORDER BY day
        """,
        [link_id, *date_params],
    )
    return [
        {
            "date": str(day),
            "conversions": _safe_int(conversions),
            "lead_conversions": _safe_int(lead_conversions),
            "revenue": round(_safe_float(revenue), 2),
        }
        for day, conversions, lead_conversions, revenue in cursor.fetchall()
    ]


def _fetch_company_daily(cursor: Any, company_id: int, date_from: Any = None, date_to: Any = None) -> list[dict[str, Any]]:
    impression_filter, impression_params = _build_date_filter("viewed_at", date_from, date_to)
    click_filter, click_params = _build_date_filter("clicked_at", date_from, date_to)
    conversion_filter, conversion_params = _build_date_filter("converted_at", date_from, date_to)

    cursor.execute(
        f"""
        SELECT DATE(viewed_at) AS day,
               COUNT(*) AS impressions,
               COUNT(CASE WHEN is_unique THEN 1 END) AS unique_impressions
        FROM referral_impressions
        WHERE company_id = %s {impression_filter}
        GROUP BY day
        ORDER BY day
        """,
        [company_id, *impression_params],
    )
    impressions = [
        {"date": str(day), "impressions": _safe_int(total), "unique_impressions": _safe_int(unique_total)}
        for day, total, unique_total in cursor.fetchall()
    ]

    cursor.execute(
        f"""
        SELECT DATE(clicked_at) AS day,
               COUNT(*) AS clicks,
               COUNT(CASE WHEN is_unique THEN 1 END) AS unique_clicks
        FROM referral_clicks
        WHERE company_id = %s {click_filter}
        GROUP BY day
        ORDER BY day
        """,
        [company_id, *click_params],
    )
    clicks = [
        {"date": str(day), "clicks": _safe_int(total), "unique_clicks": _safe_int(unique_total)}
        for day, total, unique_total in cursor.fetchall()
    ]

    cursor.execute(
        f"""
        SELECT DATE(converted_at) AS day,
               COUNT(*) AS conversions,
               COUNT(CASE WHEN conversion_type = 'lead' THEN 1 END) AS lead_conversions,
               COALESCE(SUM(revenue), 0) AS revenue
        FROM referral_conversions
        WHERE company_id = %s {conversion_filter}
        GROUP BY day
        ORDER BY day
        """,
        [company_id, *conversion_params],
    )
    conversions = [
        {
            "date": str(day),
            "conversions": _safe_int(total),
            "lead_conversions": _safe_int(lead_total),
            "revenue": round(_safe_float(total_revenue), 2),
        }
        for day, total, lead_total, total_revenue in cursor.fetchall()
    ]

    return _merge_daily_series(impressions, clicks, conversions)


def _aggregate_named_rows(rows: list[dict[str, Any]], field_name: str) -> list[dict[str, Any]]:
    aggregated: dict[str, dict[str, Any]] = {}
    for row in rows:
        raw_name = str(row.get(field_name) or "").strip()
        name = raw_name if raw_name else "Unassigned"
        bucket = aggregated.setdefault(
            name,
            {
                field_name: name,
                "total_impressions": 0,
                "unique_impressions": 0,
                "total_clicks": 0,
                "unique_clicks": 0,
                "conversions": 0,
                "lead_conversions": 0,
                "revenue": 0.0,
                "spend": 0.0,
            },
        )
        for metric in ("total_impressions", "unique_impressions", "total_clicks", "unique_clicks", "conversions", "lead_conversions"):
            bucket[metric] += _safe_int(row.get(metric))
        bucket["revenue"] = round(bucket["revenue"] + _safe_float(row.get("revenue")), 2)
        bucket["spend"] = round(bucket["spend"] + _safe_float(row.get("spend")), 2)

    result: list[dict[str, Any]] = []
    for item in aggregated.values():
        enriched = _apply_performance_metrics(item)
        result.append(enriched)
    result.sort(key=lambda item: (_safe_int(item.get("total_clicks")), _safe_float(item.get("revenue"))), reverse=True)
    return result


# ─── Referral Links CRUD ─────────────────────────────────────────────────────

def create_referral_link(
    company_id: int,
    name: str,
    destination_url: str,
    advertiser_name: str | None = None,
    advertiser_email: str | None = None,
    campaign: str | None = None,
    placement: str | None = None,
    size_label: str | None = None,
    utm_source: str | None = None,
    utm_medium: str | None = None,
    utm_campaign: str | None = None,
    utm_content: str | None = None,
    utm_term: str | None = None,
    pricing_model: str | None = None,
    currency: str | None = None,
    budget_amount: float | None = None,
    unit_price: float | None = None,
    target_clicks: int | None = None,
    target_conversions: int | None = None,
    notes: str | None = None,
    starts_at: Any = None,
    expires_at: Any = None,
    created_by: int | None = None,
    slug: str | None = None,
) -> dict[str, Any]:
    conn = get_db_connection()
    c = conn.cursor()
    try:
        final_slug = slug or _make_slug(name)
        c.execute("SELECT id FROM referral_links WHERE company_id = %s AND slug = %s", (company_id, final_slug))
        if c.fetchone():
            final_slug = f"{final_slug}-{random.randint(100, 999)}"

        c.execute(
            """
            INSERT INTO referral_links (
                company_id, name, slug, destination_url, advertiser_name, advertiser_email,
                campaign, placement, size_label, utm_source, utm_medium, utm_campaign,
                utm_content, utm_term, pricing_model, currency, budget_amount, unit_price,
                target_clicks, target_conversions, notes, starts_at, expires_at, created_by
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id, slug
            """,
            (
                company_id,
                name,
                final_slug,
                destination_url,
                advertiser_name,
                advertiser_email,
                campaign,
                placement,
                size_label,
                utm_source,
                utm_medium,
                utm_campaign,
                utm_content,
                utm_term,
                (pricing_model or "flat").strip().lower(),
                currency,
                _safe_float(budget_amount),
                _safe_float(unit_price),
                _safe_int(target_clicks),
                _safe_int(target_conversions),
                notes,
                _parse_datetime(starts_at),
                _parse_datetime(expires_at),
                created_by,
            ),
        )
        row = c.fetchone()
        conn.commit()
        return {"id": row[0], "slug": row[1]}
    except Exception as error:
        conn.rollback()
        log_error(f"create_referral_link error: {error}", "db.referral_links")
        raise
    finally:
        conn.close()


def get_referral_links(company_id: int) -> list[dict[str, Any]]:
    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute(
            """
            SELECT
                rl.id,
                rl.name,
                rl.slug,
                rl.destination_url,
                rl.advertiser_name,
                rl.advertiser_email,
                rl.campaign,
                rl.placement,
                rl.size_label,
                rl.utm_source,
                rl.utm_medium,
                rl.utm_campaign,
                rl.utm_content,
                rl.utm_term,
                rl.pricing_model,
                rl.currency,
                rl.budget_amount,
                rl.unit_price,
                rl.target_clicks,
                rl.target_conversions,
                rl.notes,
                rl.is_active,
                rl.created_at,
                rl.starts_at,
                rl.expires_at,
                COALESCE(ri.total_impressions, 0) AS total_impressions,
                COALESCE(ri.unique_impressions, 0) AS unique_impressions,
                COALESCE(rc.total_clicks, 0) AS total_clicks,
                COALESCE(rc.unique_clicks, 0) AS unique_clicks,
                COALESCE(conv.conversions, 0) AS conversions,
                COALESCE(conv.lead_conversions, 0) AS lead_conversions,
                COALESCE(conv.revenue, 0) AS total_revenue,
                ri.last_impression_at,
                rc.last_click_at,
                conv.last_conversion_at
            FROM referral_links rl
            LEFT JOIN (
                SELECT
                    link_id,
                    COUNT(*) AS total_impressions,
                    COUNT(CASE WHEN is_unique THEN 1 END) AS unique_impressions,
                    MAX(viewed_at) AS last_impression_at
                FROM referral_impressions
                GROUP BY link_id
            ) ri ON ri.link_id = rl.id
            LEFT JOIN (
                SELECT
                    link_id,
                    COUNT(*) AS total_clicks,
                    COUNT(CASE WHEN is_unique THEN 1 END) AS unique_clicks,
                    MAX(clicked_at) AS last_click_at
                FROM referral_clicks
                GROUP BY link_id
            ) rc ON rc.link_id = rl.id
            LEFT JOIN (
                SELECT
                    link_id,
                    COUNT(*) AS conversions,
                    COUNT(CASE WHEN conversion_type = 'lead' THEN 1 END) AS lead_conversions,
                    COALESCE(SUM(revenue), 0) AS revenue,
                    MAX(converted_at) AS last_conversion_at
                FROM referral_conversions
                GROUP BY link_id
            ) conv ON conv.link_id = rl.id
            WHERE rl.company_id = %s
            ORDER BY COALESCE(rl.starts_at, rl.created_at) DESC, rl.id DESC
            """,
            (company_id,),
        )
        columns = [description[0] for description in c.description]
        rows: list[dict[str, Any]] = []
        for raw_row in c.fetchall():
            row = dict(zip(columns, raw_row))
            row["revenue"] = row.get("total_revenue")
            rows.append(_serialize_row(_apply_performance_metrics(row)))
        return rows
    finally:
        conn.close()


def get_referral_link_by_slug(slug: str, company_id: int | None = None) -> dict[str, Any] | None:
    conn = get_db_connection()
    c = conn.cursor()
    try:
        sql = "SELECT * FROM referral_links WHERE slug = %s"
        params: list[Any] = [slug]
        if company_id is not None:
            sql += " AND company_id = %s"
            params.append(company_id)
        c.execute(sql, params)
        row = c.fetchone()
        if not row:
            return None
        columns = [description[0] for description in c.description]
        return dict(zip(columns, row))
    finally:
        conn.close()


def update_referral_link(link_id: int, company_id: int, **kwargs: Any) -> bool:
    allowed = {
        "name",
        "destination_url",
        "advertiser_name",
        "advertiser_email",
        "campaign",
        "placement",
        "size_label",
        "utm_source",
        "utm_medium",
        "utm_campaign",
        "utm_content",
        "utm_term",
        "pricing_model",
        "currency",
        "budget_amount",
        "unit_price",
        "target_clicks",
        "target_conversions",
        "notes",
        "is_active",
        "starts_at",
        "expires_at",
    }
    updates = {key: value for key, value in kwargs.items() if key in allowed}
    if not updates:
        return False

    normalized_updates: dict[str, Any] = {}
    for key, value in updates.items():
        if key in {"budget_amount", "unit_price"}:
            normalized_updates[key] = _safe_float(value)
        elif key in {"target_clicks", "target_conversions"}:
            normalized_updates[key] = _safe_int(value)
        elif key in {"starts_at", "expires_at"}:
            normalized_updates[key] = _parse_datetime(value)
        elif key == "pricing_model":
            normalized_updates[key] = str(value or "flat").strip().lower()
        else:
            normalized_updates[key] = value

    conn = get_db_connection()
    c = conn.cursor()
    try:
        set_clause = ", ".join(f"{key} = %s" for key in normalized_updates)
        params = [*normalized_updates.values(), link_id, company_id]
        c.execute(f"UPDATE referral_links SET {set_clause} WHERE id = %s AND company_id = %s", params)
        conn.commit()
        return c.rowcount > 0
    except Exception as error:
        conn.rollback()
        log_error(f"update_referral_link error: {error}", "db.referral_links")
        return False
    finally:
        conn.close()


def delete_referral_link(link_id: int, company_id: int) -> bool:
    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute("DELETE FROM referral_links WHERE id = %s AND company_id = %s", (link_id, company_id))
        conn.commit()
        return c.rowcount > 0
    finally:
        conn.close()


# ─── Event Tracking ──────────────────────────────────────────────────────────

def track_referral_impression(
    link_id: int,
    company_id: int,
    ip: str,
    user_agent: str = "",
    referrer: str | None = None,
    placement: str | None = None,
    city: str | None = None,
    country: str | None = None,
) -> int | None:
    """Записывает показ. Возвращает impression_id."""
    device, browser = _parse_ua(user_agent)
    ip_hash = _hash_ip(ip) if ip else None

    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute(
            """
            SELECT id
            FROM referral_impressions
            WHERE link_id = %s AND ip_hash = %s AND viewed_at > NOW() - INTERVAL '24 hours'
            LIMIT 1
            """,
            (link_id, ip_hash),
        )
        is_unique = c.fetchone() is None

        c.execute(
            """
            INSERT INTO referral_impressions (
                link_id, company_id, ip_address, ip_hash, user_agent,
                device_type, browser, referrer, placement, city, country, is_unique
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
            """,
            (
                link_id,
                company_id,
                ip,
                ip_hash,
                user_agent,
                device,
                browser,
                referrer,
                placement,
                city,
                country,
                is_unique,
            ),
        )
        impression_id = c.fetchone()[0]
        conn.commit()
        return _safe_int(impression_id)
    except Exception as error:
        conn.rollback()
        log_error(f"track_referral_impression error: {error}", "db.referral_links")
        return None
    finally:
        conn.close()


def track_referral_click(
    link_id: int,
    company_id: int,
    ip: str,
    user_agent: str = "",
    referrer: str | None = None,
    placement: str | None = None,
    city: str | None = None,
    country: str | None = None,
) -> int | None:
    """Записывает клик. Возвращает click_id."""
    device, browser = _parse_ua(user_agent)
    ip_hash = _hash_ip(ip) if ip else None

    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute(
            """
            SELECT id
            FROM referral_clicks
            WHERE link_id = %s AND ip_hash = %s AND clicked_at > NOW() - INTERVAL '24 hours'
            LIMIT 1
            """,
            (link_id, ip_hash),
        )
        is_unique = c.fetchone() is None

        c.execute(
            """
            INSERT INTO referral_clicks (
                link_id, company_id, ip_address, ip_hash, user_agent,
                device_type, browser, referrer, placement, city, country, is_unique
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
            """,
            (
                link_id,
                company_id,
                ip,
                ip_hash,
                user_agent,
                device,
                browser,
                referrer,
                placement,
                city,
                country,
                is_unique,
            ),
        )
        click_id = c.fetchone()[0]
        conn.commit()
        return _safe_int(click_id)
    except Exception as error:
        conn.rollback()
        log_error(f"track_referral_click error: {error}", "db.referral_links")
        return None
    finally:
        conn.close()


def record_conversion(
    link_id: int,
    company_id: int,
    client_instagram_id: str | None = None,
    booking_id: int | None = None,
    revenue: float = 0,
    click_id: int | None = None,
    conversion_type: str | None = None,
    notes: str | None = None,
    converted_at: Any = None,
) -> bool:
    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute(
            """
            INSERT INTO referral_conversions (
                link_id, company_id, click_id, client_instagram_id, booking_id,
                revenue, conversion_type, notes, converted_at
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, COALESCE(%s, CURRENT_TIMESTAMP))
            """,
            (
                link_id,
                company_id,
                click_id,
                client_instagram_id,
                booking_id,
                _safe_float(revenue),
                str(conversion_type or "lead").strip().lower(),
                notes,
                _parse_datetime(converted_at),
            ),
        )
        conn.commit()
        return True
    except Exception as error:
        conn.rollback()
        log_error(f"record_conversion error: {error}", "db.referral_links")
        return False
    finally:
        conn.close()


# ─── Analytics & Reports ─────────────────────────────────────────────────────

def get_link_stats(link_id: int, company_id: int, date_from: Any = None, date_to: Any = None) -> dict[str, Any]:
    """Полная статистика по одной ссылке."""
    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute(
            """
            SELECT
                id, company_id, name, slug, campaign, advertiser_name, advertiser_email,
                placement, size_label, pricing_model, currency, budget_amount, unit_price,
                target_clicks, target_conversions, starts_at, expires_at, created_at
            FROM referral_links
            WHERE id = %s AND company_id = %s
            """,
            (link_id, company_id),
        )
        link_row = c.fetchone()
        if not link_row:
            return {
                "total_impressions": 0,
                "unique_impressions": 0,
                "total_clicks": 0,
                "unique_clicks": 0,
                "conversions": 0,
                "lead_conversions": 0,
                "revenue": 0.0,
                "spend": 0.0,
                "ctr": 0.0,
                "conversion_rate": 0.0,
                "daily": [],
                "devices": {},
                "browsers": {},
                "countries": {},
                "referrers": {},
                "placements": {},
                "conversion_types": {},
            }

        link_columns = [description[0] for description in c.description]
        link_meta = dict(zip(link_columns, link_row))

        impression_summary = _fetch_one_summary(c, "referral_impressions", link_id, "viewed_at", date_from, date_to)
        click_summary = _fetch_one_summary(c, "referral_clicks", link_id, "clicked_at", date_from, date_to)
        conversion_summary = _fetch_one_summary(c, "referral_conversions", link_id, "converted_at", date_from, date_to)

        stats = _apply_performance_metrics(
            {
                **link_meta,
                **impression_summary,
                **click_summary,
                **conversion_summary,
            }
        )

        daily = _merge_daily_series(
            _fetch_daily_impressions(c, link_id, date_from, date_to),
            _fetch_daily_clicks(c, link_id, date_from, date_to),
            _fetch_daily_conversions(c, link_id, date_from, date_to),
        )

        click_date_filter, click_date_params = _build_date_filter("clicked_at", date_from, date_to)
        impression_date_filter, impression_date_params = _build_date_filter("viewed_at", date_from, date_to)
        conversion_date_filter, conversion_date_params = _build_date_filter("converted_at", date_from, date_to)

        c.execute(
            f"""
            SELECT device_type, COUNT(*)
            FROM referral_clicks
            WHERE link_id = %s {click_date_filter}
            GROUP BY device_type
            ORDER BY COUNT(*) DESC
            """,
            [link_id, *click_date_params],
        )
        devices = _top_breakdown(c.fetchall(), "Desktop")

        c.execute(
            f"""
            SELECT browser, COUNT(*)
            FROM referral_clicks
            WHERE link_id = %s {click_date_filter}
            GROUP BY browser
            ORDER BY COUNT(*) DESC
            """,
            [link_id, *click_date_params],
        )
        browsers = _top_breakdown(c.fetchall(), "Other")

        c.execute(
            f"""
            SELECT country, COUNT(*)
            FROM referral_clicks
            WHERE link_id = %s {click_date_filter}
            GROUP BY country
            ORDER BY COUNT(*) DESC
            LIMIT 15
            """,
            [link_id, *click_date_params],
        )
        countries = _top_breakdown(c.fetchall(), "Unknown")

        c.execute(
            f"""
            SELECT referrer, COUNT(*)
            FROM referral_clicks
            WHERE link_id = %s {click_date_filter}
            GROUP BY referrer
            ORDER BY COUNT(*) DESC
            LIMIT 15
            """,
            [link_id, *click_date_params],
        )
        referrers = _top_breakdown(c.fetchall(), "Direct / Unknown")

        c.execute(
            f"""
            SELECT placement, COUNT(*)
            FROM (
                SELECT placement FROM referral_impressions WHERE link_id = %s {impression_date_filter}
                UNION ALL
                SELECT placement FROM referral_clicks WHERE link_id = %s {click_date_filter}
            ) AS placement_events
            GROUP BY placement
            ORDER BY COUNT(*) DESC
            """,
            [link_id, *impression_date_params, link_id, *click_date_params],
        )
        placements = _top_breakdown(c.fetchall(), "Unspecified")

        c.execute(
            f"""
            SELECT conversion_type, COUNT(*)
            FROM referral_conversions
            WHERE link_id = %s {conversion_date_filter}
            GROUP BY conversion_type
            ORDER BY COUNT(*) DESC
            """,
            [link_id, *conversion_date_params],
        )
        conversion_types = _top_breakdown(c.fetchall(), "lead")

        stats["daily"] = daily
        stats["devices"] = devices
        stats["browsers"] = browsers
        stats["countries"] = countries
        stats["referrers"] = referrers
        stats["placements"] = placements
        stats["conversion_types"] = conversion_types
        stats["link"] = _serialize_row(link_meta)
        return _serialize_row(stats)
    finally:
        conn.close()


def get_advertiser_report(company_id: int, date_from: Any = None, date_to: Any = None) -> dict[str, Any]:
    """Сводный отчёт по рекламным кампаниям для рекламодателя."""
    conn = get_db_connection()
    c = conn.cursor()
    try:
        impression_filter, impression_params = _build_date_filter("viewed_at", date_from, date_to)
        click_filter, click_params = _build_date_filter("clicked_at", date_from, date_to)
        conversion_filter, conversion_params = _build_date_filter("converted_at", date_from, date_to)

        c.execute(
            f"""
            SELECT
                rl.id,
                rl.name,
                rl.slug,
                rl.campaign,
                rl.advertiser_name,
                rl.advertiser_email,
                rl.placement,
                rl.size_label,
                rl.utm_source,
                rl.utm_medium,
                rl.utm_campaign,
                rl.pricing_model,
                rl.currency,
                rl.budget_amount,
                rl.unit_price,
                rl.target_clicks,
                rl.target_conversions,
                rl.starts_at,
                rl.expires_at,
                rl.created_at,
                COALESCE(ri.total_impressions, 0) AS total_impressions,
                COALESCE(ri.unique_impressions, 0) AS unique_impressions,
                COALESCE(rc.total_clicks, 0) AS total_clicks,
                COALESCE(rc.unique_clicks, 0) AS unique_clicks,
                COALESCE(conv.conversions, 0) AS conversions,
                COALESCE(conv.lead_conversions, 0) AS lead_conversions,
                COALESCE(conv.revenue, 0) AS revenue,
                ri.last_impression_at,
                rc.last_click_at,
                conv.last_conversion_at
            FROM referral_links rl
            LEFT JOIN (
                SELECT
                    link_id,
                    COUNT(*) AS total_impressions,
                    COUNT(CASE WHEN is_unique THEN 1 END) AS unique_impressions,
                    MAX(viewed_at) AS last_impression_at
                FROM referral_impressions
                WHERE company_id = %s {impression_filter}
                GROUP BY link_id
            ) ri ON ri.link_id = rl.id
            LEFT JOIN (
                SELECT
                    link_id,
                    COUNT(*) AS total_clicks,
                    COUNT(CASE WHEN is_unique THEN 1 END) AS unique_clicks,
                    MAX(clicked_at) AS last_click_at
                FROM referral_clicks
                WHERE company_id = %s {click_filter}
                GROUP BY link_id
            ) rc ON rc.link_id = rl.id
            LEFT JOIN (
                SELECT
                    link_id,
                    COUNT(*) AS conversions,
                    COUNT(CASE WHEN conversion_type = 'lead' THEN 1 END) AS lead_conversions,
                    COALESCE(SUM(revenue), 0) AS revenue,
                    MAX(converted_at) AS last_conversion_at
                FROM referral_conversions
                WHERE company_id = %s {conversion_filter}
                GROUP BY link_id
            ) conv ON conv.link_id = rl.id
            WHERE rl.company_id = %s
            ORDER BY COALESCE(rc.total_clicks, 0) DESC, rl.created_at DESC
            """,
            [
                company_id,
                *impression_params,
                company_id,
                *click_params,
                company_id,
                *conversion_params,
                company_id,
            ],
        )
        columns = [description[0] for description in c.description]
        rows: list[dict[str, Any]] = []
        for raw_row in c.fetchall():
            row = dict(zip(columns, raw_row))
            rows.append(_serialize_row(_apply_performance_metrics(row)))

        totals = _apply_performance_metrics(
            {
                "total_impressions": sum(_safe_int(item.get("total_impressions")) for item in rows),
                "unique_impressions": sum(_safe_int(item.get("unique_impressions")) for item in rows),
                "total_clicks": sum(_safe_int(item.get("total_clicks")) for item in rows),
                "unique_clicks": sum(_safe_int(item.get("unique_clicks")) for item in rows),
                "conversions": sum(_safe_int(item.get("conversions")) for item in rows),
                "lead_conversions": sum(_safe_int(item.get("lead_conversions")) for item in rows),
                "revenue": round(sum(_safe_float(item.get("revenue")) for item in rows), 2),
                "spend": round(sum(_safe_float(item.get("spend")) for item in rows), 2),
                "budget_amount": round(sum(_safe_float(item.get("budget_amount")) for item in rows), 2),
                "pricing_model": "mixed",
                "unit_price": 0,
                "target_clicks": sum(_safe_int(item.get("target_clicks")) for item in rows),
                "target_conversions": sum(_safe_int(item.get("target_conversions")) for item in rows),
            }
        )
        totals["spend"] = round(sum(_safe_float(item.get("spend")) for item in rows), 2)
        totals["budget_remaining"] = (
            round(max(_safe_float(totals.get("budget_amount")) - _safe_float(totals.get("spend")), 0), 2)
            if _safe_float(totals.get("budget_amount")) > 0
            else None
        )

        return {
            "rows": rows,
            "totals": totals,
            "daily": _fetch_company_daily(c, company_id, date_from, date_to),
            "campaigns": _aggregate_named_rows(rows, "campaign"),
            "advertisers": _aggregate_named_rows(rows, "advertiser_name"),
        }
    finally:
        conn.close()
