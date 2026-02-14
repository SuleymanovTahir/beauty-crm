"""
SEO Metadata API
Provides dynamic SEO metadata from database for public landing page
"""
import os
from fastapi import APIRouter
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
        base_url = salon.get('base_url') or os.getenv('SALON_BASE_URL', 'https://mlediamant.com')
        logo_url = salon.get('logo_url') or '/assets/logo.webp'
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

        # Normalize brand name for SEO to avoid legacy/generic labels in snippets.
        raw_salon_name = (salon.get('name') or '').strip()
        generic_name_aliases = {
            'beauty salon',
            'russian beauty salon',
            'русский салон красоты'
        }
        salon_name = raw_salon_name if raw_salon_name and raw_salon_name.lower() not in generic_name_aliases else 'M Le Diamant'

        city = salon.get('city', 'Dubai')
        address = salon.get('address', '') or ''
        address_lc = address.lower()
        if 'jbr' in address_lc or 'jumeirah beach residence' in address_lc:
            location_hint = 'JBR Dubai'
        else:
            location_hint = city

        seo_keywords = ", ".join([
            salon_name.lower(),
            f"beauty salon {location_hint}".lower(),
            f"premium beauty salon {location_hint}".lower(),
            "manicure dubai",
            "pedicure dubai",
            "hair salon dubai",
            "brows and lashes dubai",
            "spa dubai",
            "massage dubai",
            "cosmetology dubai",
            "permanent makeup dubai",
            "keratin treatment dubai",
            "waxing dubai",
            "nail salon dubai marina",
            "salon jbr dubai",
        ])
        
        # Build metadata
        metadata = {
            # Basic Info
            "salon_name": salon_name,
            "phone": salon.get('phone'),
            "email": salon.get('email'),
            "address": salon.get('address'),
            "city": city,
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
            "seo_title": f"{salon_name} - Premium Beauty Salon in {location_hint} | Manicure, Spa, Hair, Brows, Lashes",
            "seo_description": f"{salon_name} is a premium beauty salon in {location_hint} for manicure, pedicure, spa, hair, brows, lashes, massage, cosmetology, and permanent makeup.",
            "seo_keywords": seo_keywords,
            "supported_languages": ['en', 'ru', 'ar', 'es', 'de', 'fr', 'hi', 'kk', 'pt'],
            
            # Schema.org Data
            "schema": {
                "name": salon_name,
                "telephone": salon.get('phone'),
                "address": {
                    "streetAddress": salon.get('address', 'Dubai'),
                    "addressLocality": city,
                    "addressRegion": city,
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
        
        return metadata
        
    except Exception as e:
        # Return minimal defaults on error
        return {
                "error": str(e),
                "salon_name": os.getenv('SALON_NAME', "Beauty Salon"),
                "phone": salon.get('phone', '') if 'salon' in locals() else '',
                "city": "Dubai",
                "base_url": os.getenv('SALON_BASE_URL', "https://mlediamant.com")
            }
