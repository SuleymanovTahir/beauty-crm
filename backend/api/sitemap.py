"""
XML Sitemap Generator
Generates dynamic sitemap.xml for SEO
"""
from fastapi import APIRouter
from fastapi.responses import Response
from datetime import datetime

router = APIRouter()

@router.get("/sitemap.xml")
async def generate_sitemap():
    """Generate XML sitemap for search engines"""
    
    base_url = "https://mlediamant.com"
    today = datetime.now().strftime("%Y-%m-%d")
    
    sitemap = f"""<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url>
        <loc>{base_url}/</loc>
        <lastmod>{today}</lastmod>
        <changefreq>daily</changefreq>
        <priority>1.0</priority>
    </url>
    <url>
        <loc>{base_url}/#services</loc>
        <lastmod>{today}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.8</priority>
    </url>
    <url>
        <loc>{base_url}/#masters</loc>
        <lastmod>{today}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.8</priority>
    </url>
    <url>
        <loc>{base_url}/#reviews</loc>
        <lastmod>{today}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.7</priority>
    </url>
    <url>
        <loc>{base_url}/#contact</loc>
        <lastmod>{today}</lastmod>
        <changefreq>monthly</changefreq>
        <priority>0.6</priority>
    </url>
    <url>
        <loc>{base_url}/#faq</loc>
        <lastmod>{today}</lastmod>
        <changefreq>monthly</changefreq>
        <priority>0.5</priority>
    </url>
</urlset>"""
    
    return Response(content=sitemap, media_type="application/xml")
