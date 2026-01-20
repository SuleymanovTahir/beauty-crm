"""
SEO Metadata API
Provides dynamic SEO metadata from database for public landing page
"""
from fastapi import APIRouter
from fastapi.responses import JSONResponse
from db.settings import get_salon_settings
from core.config import (
    DEFAULT_HOURS_WEEKDAYS,
    DEFAULT_HOURS_WEEKENDS,
    DEFAULT_HOURS_START,
    DEFAULT_HOURS_END
)

router = APIRouter()

@router.get("/api/public/seo-metadata")
def get_seo_metadata():
    """
    Get SEO metadata from database
    Returns structured data for meta tags, Schema.org, etc.
    """
    try:
        salon = get_salon_settings()
        
        # Get dynamic values from database
        base_url = salon.get('base_url', 'https://mlediamant.com')
        logo_url = salon.get('logo_url', '/assets/logo.webp')
        # Make logo URL absolute if it's relative
        if logo_url and not logo_url.startswith('http'):
            logo_url = f"{base_url}{logo_url}"
        
        # Parse working hours
        hours_weekdays = salon.get('hours_weekdays', DEFAULT_HOURS_WEEKDAYS)  # ✅ Используем константу
        hours_weekends = salon.get('hours_weekends', DEFAULT_HOURS_WEEKENDS)  # ✅ Используем константу
        
        # Extract opening/closing times (assuming format "HH:MM - HH:MM")
        try:
            opens = hours_weekdays.split(' - ')[0].strip()
            closes = hours_weekdays.split(' - ')[1].strip()
        except:
            opens = DEFAULT_HOURS_START  # ✅ Используем константу
            closes = DEFAULT_HOURS_END   # ✅ Используем константу
        
        # Clean Instagram URL
        instagram_url = salon.get('instagram', '')
        if instagram_url and not instagram_url.startswith('http'):
            instagram_url = f"https://www.instagram.com/{instagram_url.replace('@', '')}"
        
        # Build metadata
        metadata = {
            # Basic Info
            "salon_name": salon.get('name'),
            "phone": salon.get('phone'),
            "email": salon.get('email'),
            "address": salon.get('address'),
            "city": salon.get('city'),
            "country": salon.get('country'),
            
            # Social Media
            "instagram": instagram_url,
            "whatsapp": salon.get('whatsapp', salon.get('phone', '')),
            
            # Working Hours
            "hours_weekdays": hours_weekdays,
            "hours_weekends": hours_weekends,
            "opens": opens,
            "closes": closes,
            
            # SEO & Analytics (NEW - from database)
            "base_url": base_url,
            "logo_url": logo_url,
            "google_analytics_id": salon.get('google_analytics_id'),  # Will be None until set
            "facebook_pixel_id": salon.get('facebook_pixel_id'),      # Will be None until set
            "latitude": salon.get('latitude', 25.2048),
            "longitude": salon.get('longitude', 55.2708),
            
            # SEO Title & Description
            "seo_title": f"{salon.get('name') or 'Beauty Salon'} - Premium Beauty Salon {salon.get('city', 'Dubai')}",
            "seo_description": f"Experience luxury beauty services at {salon.get('name') or 'our salon'}. Expert manicure, spa treatments, and personalized care in a premium atmosphere. Book online today!",
            
            # Schema.org Data
            "schema": {
                "name": salon.get('name') or 'Beauty Salon',
                "telephone": salon.get('phone'),
                "address": {
                    "streetAddress": salon.get('address', 'Dubai'),
                    "addressLocality": salon.get('city', 'Dubai'),
                    "addressRegion": salon.get('city', 'Dubai'),
                    "addressCountry": "AE"
                },
                "geo": {
                    "latitude": salon.get('latitude', 25.2048),
                    "longitude": salon.get('longitude', 55.2708)
                },
                "openingHours": {
                    "opens": opens,
                    "closes": closes
                },
                "sameAs": [instagram_url] if instagram_url else []
            }
        }
        
        return JSONResponse(content=metadata)
        
    except Exception as e:
        # Return minimal defaults on error
        return JSONResponse(
            content={
                "error": str(e),
                "salon_name": "Beauty Salon",
                "phone": salon.get('phone', ''),
                "city": "Dubai",
                "base_url": "https://mlediamant.com"
            },
            status_code=500
        )
