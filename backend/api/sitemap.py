"""
XML Sitemap Generator
Generates dynamic sitemap.xml for SEO
"""
from fastapi import APIRouter
from fastapi.responses import Response
from datetime import datetime

router = APIRouter()

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

@router.get("/sitemap.xml")
async def generate_sitemap():
    """Generate XML sitemap for search engines"""
    
    from db.settings import get_salon_settings
    from db.services import get_all_services
    from urllib.parse import quote
    salon_settings = get_salon_settings()
    base_url = (salon_settings.get('base_url') or 'https://your-domain.com').rstrip('/')
    today = datetime.now().strftime("%Y-%m-%d")

    # Build a list of public, indexable URLs.
    # IMPORTANT: avoid fragment URLs (/#services) — crawlers don't treat them as separate pages.
    urls: list[dict[str, str]] = [
        {"loc": f"{base_url}/", "changefreq": "daily", "priority": "1.0"},
        {"loc": f"{base_url}/terms", "changefreq": "yearly", "priority": "0.2"},
        {"loc": f"{base_url}/privacy-policy", "changefreq": "yearly", "priority": "0.2"},
        {"loc": f"{base_url}/data-deletion", "changefreq": "yearly", "priority": "0.2"},
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
                    "loc": f"{base_url}/service/{cat_slug}",
                    "changefreq": "weekly",
                    "priority": "0.7",
                }
            )

        # Add procedure pages: /service/<category>/<id>-<slug>
        # Use EN name if present; fallback to RU; fallback to "service-<id>".
        for s in services:
            try:
                service_id = s[0]
                category = str(s[9]).strip() if len(s) > 9 and s[9] else "other"
                name_en = s[20] if len(s) > 20 and s[20] else None
                name_ru = s[3] if len(s) > 3 and s[3] else None
                name_base = s[2] if len(s) > 2 and s[2] else None
                name_for_slug = name_en or name_base or name_ru or ""
                slug = _slugify(name_for_slug)
                if not slug:
                    slug = f"service-{service_id}"

                cat_slug = quote(category.lower(), safe="/-._~")
                urls.append(
                    {
                        "loc": f"{base_url}/service/{cat_slug}/{service_id}-{quote(slug, safe='-')}",
                        "changefreq": "monthly",
                        "priority": "0.6",
                    }
                )
            except Exception:
                continue
    except Exception:
        # Never fail sitemap generation if DB is temporarily unavailable.
        pass

    url_entries = "\n".join(
        f"""    <url>
        <loc>{u["loc"]}</loc>
        <lastmod>{today}</lastmod>
        <changefreq>{u["changefreq"]}</changefreq>
        <priority>{u["priority"]}</priority>
    </url>"""
        for u in urls
    )

    sitemap = f"""<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
{url_entries}
</urlset>"""
    
    return Response(content=sitemap, media_type="application/xml")
