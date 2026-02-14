"""
XML Sitemap Generator
Generates dynamic sitemap.xml for SEO
"""
from datetime import datetime
from html import escape
from urllib.parse import quote

from fastapi import APIRouter
from fastapi.responses import Response

router = APIRouter()

SUPPORTED_LANGUAGES = ("en", "ru", "ar", "es", "de", "fr", "hi", "kk", "pt")
DEFAULT_LANGUAGE = "en"


def _slugify(text: str) -> str:
    """
    Simple ASCII slugify (safe for URLs). For non-latin scripts this may return empty;
    caller should provide a fallback.
    """
    import re

    text = (text or "").lower()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    text = re.sub(r"-{2,}", "-", text).strip("-")
    return text


def _localized_url(base_url: str, path: str, language: str) -> str:
    clean_base = (base_url or "").rstrip("/")
    clean_path = path if path.startswith("/") else f"/{path}"
    if language == DEFAULT_LANGUAGE:
        return f"{clean_base}{clean_path}"
    return f"{clean_base}{clean_path}?lang={quote(language, safe='')}"


def _build_hreflang_links(base_url: str, path: str) -> str:
    links: list[str] = []
    for lang in SUPPORTED_LANGUAGES:
        href = escape(_localized_url(base_url, path, lang))
        links.append(
            f'        <xhtml:link rel="alternate" hreflang="{lang}" href="{href}" />'
        )

    x_default_href = escape(_localized_url(base_url, path, DEFAULT_LANGUAGE))
    links.append(
        f'        <xhtml:link rel="alternate" hreflang="x-default" href="{x_default_href}" />'
    )
    return "\n".join(links)


@router.get("/sitemap.xml")
async def generate_sitemap():
    """Generate XML sitemap for search engines"""

    from db.services import get_all_services
    from db.settings import get_salon_settings

    salon_settings = get_salon_settings()
    base_url = (salon_settings.get("base_url") or "https://your-domain.com").rstrip("/")
    today = datetime.now().strftime("%Y-%m-%d")

    # Build a list of public, indexable URLs.
    # IMPORTANT: avoid fragment URLs (/#services) — crawlers don't treat them as separate pages.
    urls: list[dict[str, str]] = [
        {"path": "/", "changefreq": "daily", "priority": "1.0"},
        {"path": "/terms", "changefreq": "yearly", "priority": "0.2"},
        {"path": "/privacy-policy", "changefreq": "yearly", "priority": "0.2"},
        {"path": "/data-deletion", "changefreq": "yearly", "priority": "0.2"},
        {"path": "/new-booking", "changefreq": "weekly", "priority": "0.8"},
        {"path": "/login", "changefreq": "monthly", "priority": "0.4"},
    ]

    # Add category pages: /service/<category>
    try:
        services = get_all_services(active_only=True)
        categories = sorted({str(s[9]).strip() for s in services if len(s) > 9 and s[9]})
        for cat in categories:
            # Make URL-safe; keep slashes if category is nested.
            cat_slug = quote(cat.lower(), safe="/-._~")
            urls.append(
                {
                    "path": f"/service/{cat_slug}",
                    "changefreq": "weekly",
                    "priority": "0.7",
                }
            )

        # Add procedure pages: /service/<category>/<id>-<slug>
        # Use service name for slug; fallback to "service-<id>".
        for s in services:
            try:
                service_id = s[0]
                category = str(s[3]).strip() if len(s) > 3 and s[3] else "other"
                name = s[2] if len(s) > 2 and s[2] else None
                name_for_slug = name or ""
                slug = _slugify(name_for_slug)
                if not slug:
                    slug = f"service-{service_id}"

                cat_slug = quote(category.lower(), safe="/-._~")
                urls.append(
                    {
                        "path": f"/service/{cat_slug}/{service_id}-{quote(slug, safe='-')}",
                        "changefreq": "monthly",
                        "priority": "0.6",
                    }
                )
            except Exception:
                continue
    except Exception:
        # Never fail sitemap generation if DB is temporarily unavailable.
        pass

    url_entries_list: list[str] = []
    for u in urls:
        path = u["path"]
        loc = escape(_localized_url(base_url, path, DEFAULT_LANGUAGE))
        hreflang_links = _build_hreflang_links(base_url, path)
        url_entries_list.append(
            f"""    <url>
        <loc>{loc}</loc>
{hreflang_links}
        <lastmod>{today}</lastmod>
        <changefreq>{u["changefreq"]}</changefreq>
        <priority>{u["priority"]}</priority>
    </url>"""
        )

    url_entries = "\n".join(url_entries_list)

    sitemap = f"""<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
{url_entries}
</urlset>"""

    return Response(content=sitemap, media_type="application/xml")
