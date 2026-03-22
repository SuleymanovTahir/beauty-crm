"""
DB-функции для рекламного модуля: реферальные ссылки, клики, конверсии
"""
from db.connection import get_db_connection
from utils.logger import log_info, log_error
from datetime import datetime
import hashlib
import re
import random
import string


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _parse_ua(ua_string: str):
    """Определяет тип устройства и браузер из User-Agent"""
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


# ─── Referral Links CRUD ─────────────────────────────────────────────────────

def create_referral_link(
    company_id: int,
    name: str,
    destination_url: str,
    advertiser_name: str = None,
    advertiser_email: str = None,
    campaign: str = None,
    utm_source: str = None,
    utm_medium: str = None,
    utm_campaign: str = None,
    utm_content: str = None,
    utm_term: str = None,
    expires_at=None,
    created_by: int = None,
    slug: str = None,
) -> dict:
    conn = get_db_connection()
    c = conn.cursor()
    try:
        final_slug = slug or _make_slug(name)
        # Ensure uniqueness
        c.execute("SELECT id FROM referral_links WHERE company_id=%s AND slug=%s", (company_id, final_slug))
        if c.fetchone():
            final_slug = f"{final_slug}-{random.randint(100,999)}"

        c.execute("""
            INSERT INTO referral_links
              (company_id, name, slug, destination_url, advertiser_name, advertiser_email,
               campaign, utm_source, utm_medium, utm_campaign, utm_content, utm_term,
               expires_at, created_by)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
            RETURNING id, slug
        """, (company_id, name, final_slug, destination_url, advertiser_name, advertiser_email,
              campaign, utm_source, utm_medium, utm_campaign, utm_content, utm_term,
              expires_at, created_by))
        row = c.fetchone()
        conn.commit()
        return {"id": row[0], "slug": row[1]}
    except Exception as e:
        conn.rollback()
        log_error(f"create_referral_link error: {e}", "db.referral_links")
        raise
    finally:
        conn.close()


def get_referral_links(company_id: int) -> list:
    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute("""
            SELECT
                rl.id, rl.name, rl.slug, rl.destination_url,
                rl.advertiser_name, rl.advertiser_email, rl.campaign,
                rl.utm_source, rl.utm_medium, rl.utm_campaign, rl.utm_content, rl.utm_term,
                rl.is_active, rl.created_at, rl.expires_at,
                COUNT(DISTINCT rc.id) AS total_clicks,
                COUNT(DISTINCT CASE WHEN rc.is_unique THEN rc.id END) AS unique_clicks,
                COUNT(DISTINCT conv.id) AS conversions,
                COALESCE(SUM(conv.revenue), 0) AS total_revenue
            FROM referral_links rl
            LEFT JOIN referral_clicks rc ON rc.link_id = rl.id
            LEFT JOIN referral_conversions conv ON conv.link_id = rl.id
            WHERE rl.company_id = %s
            GROUP BY rl.id
            ORDER BY rl.created_at DESC
        """, (company_id,))
        cols = [d[0] for d in c.description]
        return [dict(zip(cols, row)) for row in c.fetchall()]
    finally:
        conn.close()


def get_referral_link_by_slug(slug: str, company_id: int = None) -> dict | None:
    conn = get_db_connection()
    c = conn.cursor()
    try:
        sql = "SELECT * FROM referral_links WHERE slug=%s"
        params = [slug]
        if company_id:
            sql += " AND company_id=%s"
            params.append(company_id)
        c.execute(sql, params)
        row = c.fetchone()
        if not row:
            return None
        cols = [d[0] for d in c.description]
        return dict(zip(cols, row))
    finally:
        conn.close()


def update_referral_link(link_id: int, company_id: int, **kwargs) -> bool:
    allowed = {"name", "destination_url", "advertiser_name", "advertiser_email",
               "campaign", "utm_source", "utm_medium", "utm_campaign",
               "utm_content", "utm_term", "is_active", "expires_at"}
    updates = {k: v for k, v in kwargs.items() if k in allowed}
    if not updates:
        return False
    conn = get_db_connection()
    c = conn.cursor()
    try:
        set_clause = ", ".join(f"{k}=%s" for k in updates)
        values = list(updates.values()) + [link_id, company_id]
        c.execute(f"UPDATE referral_links SET {set_clause} WHERE id=%s AND company_id=%s", values)
        conn.commit()
        return c.rowcount > 0
    except Exception as e:
        conn.rollback()
        log_error(f"update_referral_link error: {e}", "db.referral_links")
        return False
    finally:
        conn.close()


def delete_referral_link(link_id: int, company_id: int) -> bool:
    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute("DELETE FROM referral_links WHERE id=%s AND company_id=%s", (link_id, company_id))
        conn.commit()
        return c.rowcount > 0
    finally:
        conn.close()


# ─── Click Tracking ───────────────────────────────────────────────────────────

def track_referral_click(
    link_id: int,
    company_id: int,
    ip: str,
    user_agent: str = "",
    referrer: str = None,
    city: str = None,
    country: str = None,
) -> int | None:
    """Записывает клик. Возвращает click_id."""
    device, browser = _parse_ua(user_agent)
    ip_hash = _hash_ip(ip) if ip else None

    conn = get_db_connection()
    c = conn.cursor()
    try:
        # Уникальный клик — один IP в сутки на ссылку
        c.execute("""
            SELECT id FROM referral_clicks
            WHERE link_id=%s AND ip_hash=%s AND clicked_at > NOW() - INTERVAL '24 hours'
            LIMIT 1
        """, (link_id, ip_hash))
        is_unique = c.fetchone() is None

        c.execute("""
            INSERT INTO referral_clicks
              (link_id, company_id, ip_address, ip_hash, user_agent,
               device_type, browser, referrer, city, country, is_unique)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
            RETURNING id
        """, (link_id, company_id, ip, ip_hash, user_agent,
              device, browser, referrer, city, country, is_unique))
        click_id = c.fetchone()[0]
        conn.commit()
        return click_id
    except Exception as e:
        conn.rollback()
        log_error(f"track_referral_click error: {e}", "db.referral_links")
        return None
    finally:
        conn.close()


# ─── Conversions ─────────────────────────────────────────────────────────────

def record_conversion(
    link_id: int,
    company_id: int,
    client_instagram_id: str = None,
    booking_id: int = None,
    revenue: float = 0,
    click_id: int = None,
) -> bool:
    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute("""
            INSERT INTO referral_conversions
              (link_id, company_id, click_id, client_instagram_id, booking_id, revenue)
            VALUES (%s,%s,%s,%s,%s,%s)
        """, (link_id, company_id, click_id, client_instagram_id, booking_id, revenue))
        conn.commit()
        return True
    except Exception as e:
        conn.rollback()
        log_error(f"record_conversion error: {e}", "db.referral_links")
        return False
    finally:
        conn.close()


# ─── Analytics & Reports ──────────────────────────────────────────────────────

def get_link_stats(link_id: int, company_id: int, date_from=None, date_to=None) -> dict:
    """Полная статистика по одной ссылке"""
    conn = get_db_connection()
    c = conn.cursor()
    try:
        date_filter = ""
        params_clicks = [link_id]
        params_conv = [link_id]
        if date_from:
            date_filter += " AND clicked_at >= %s"
            params_clicks.append(date_from)
        if date_to:
            date_filter += " AND clicked_at <= %s"
            params_clicks.append(date_to)

        c.execute(f"""
            SELECT
                COUNT(*) AS total_clicks,
                COUNT(CASE WHEN is_unique THEN 1 END) AS unique_clicks,
                COUNT(DISTINCT device_type) AS device_types_count,
                COUNT(DISTINCT country) AS countries_count
            FROM referral_clicks
            WHERE link_id=%s {date_filter}
        """, params_clicks)
        clicks_row = dict(zip([d[0] for d in c.description], c.fetchone() or [0,0,0,0]))

        # Клики по дням
        c.execute(f"""
            SELECT DATE(clicked_at) AS day,
                   COUNT(*) AS clicks,
                   COUNT(CASE WHEN is_unique THEN 1 END) AS unique_clicks
            FROM referral_clicks WHERE link_id=%s {date_filter}
            GROUP BY day ORDER BY day
        """, params_clicks)
        daily = [{"date": str(r[0]), "clicks": r[1], "unique": r[2]} for r in c.fetchall()]

        # Устройства
        c.execute(f"""
            SELECT device_type, COUNT(*) FROM referral_clicks
            WHERE link_id=%s {date_filter} GROUP BY device_type
        """, params_clicks)
        devices = {r[0]: r[1] for r in c.fetchall()}

        # Браузеры
        c.execute(f"""
            SELECT browser, COUNT(*) FROM referral_clicks
            WHERE link_id=%s {date_filter} GROUP BY browser ORDER BY 2 DESC
        """, params_clicks)
        browsers = {r[0]: r[1] for r in c.fetchall()}

        # Страны
        c.execute(f"""
            SELECT country, COUNT(*) FROM referral_clicks
            WHERE link_id=%s {date_filter} AND country IS NOT NULL GROUP BY country ORDER BY 2 DESC LIMIT 10
        """, params_clicks)
        countries = {r[0]: r[1] for r in c.fetchall()}

        # Конверсии
        conv_date_filter = ""
        if date_from:
            conv_date_filter += " AND converted_at >= %s"
            params_conv.append(date_from)
        if date_to:
            conv_date_filter += " AND converted_at <= %s"
            params_conv.append(date_to)

        c.execute(f"""
            SELECT COUNT(*), COALESCE(SUM(revenue),0)
            FROM referral_conversions WHERE link_id=%s {conv_date_filter}
        """, params_conv)
        conv_row = c.fetchone()
        conversions = conv_row[0] if conv_row else 0
        revenue = float(conv_row[1]) if conv_row else 0.0

        total_clicks = clicks_row.get("total_clicks", 0) or 0
        cr = round(conversions / total_clicks * 100, 2) if total_clicks > 0 else 0.0

        return {
            "total_clicks": total_clicks,
            "unique_clicks": clicks_row.get("unique_clicks", 0) or 0,
            "conversions": conversions,
            "revenue": revenue,
            "conversion_rate": cr,
            "daily": daily,
            "devices": devices,
            "browsers": browsers,
            "countries": countries,
        }
    finally:
        conn.close()


def get_advertiser_report(company_id: int, date_from=None, date_to=None) -> list:
    """Сводный отчёт по всем ссылкам для рекламодателя"""
    conn = get_db_connection()
    c = conn.cursor()
    try:
        date_filter = ""
        params = [company_id]
        if date_from:
            date_filter += " AND rc.clicked_at >= %s"
            params.append(date_from)
        if date_to:
            date_filter += " AND rc.clicked_at <= %s"
            params.append(date_to)

        c.execute(f"""
            SELECT
                rl.id,
                rl.name,
                rl.slug,
                rl.campaign,
                rl.utm_source,
                rl.utm_medium,
                rl.advertiser_name,
                rl.created_at,
                COUNT(DISTINCT rc.id) AS total_clicks,
                COUNT(DISTINCT CASE WHEN rc.is_unique THEN rc.id END) AS unique_clicks,
                COUNT(DISTINCT conv.id) AS conversions,
                COALESCE(SUM(conv.revenue), 0) AS revenue
            FROM referral_links rl
            LEFT JOIN referral_clicks rc ON rc.link_id = rl.id {date_filter}
            LEFT JOIN referral_conversions conv ON conv.link_id = rl.id
            WHERE rl.company_id = %s
            GROUP BY rl.id
            ORDER BY total_clicks DESC
        """, params)
        cols = [d[0] for d in c.description]
        rows = []
        for row in c.fetchall():
            d = dict(zip(cols, row))
            tc = d.get("total_clicks") or 0
            cv = d.get("conversions") or 0
            d["conversion_rate"] = round(cv / tc * 100, 2) if tc > 0 else 0.0
            d["ctr"] = d["conversion_rate"]
            rows.append(d)
        return rows
    finally:
        conn.close()
