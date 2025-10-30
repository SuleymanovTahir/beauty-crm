"""
Публичные API endpoints (без авторизации)
"""
from fastapi import APIRouter
from db.settings import get_salon_settings
from db.services import get_all_services

router = APIRouter(tags=["Public"])


@router.get("/salon-info")
async def get_salon_info():
    """Публичная информация о салоне (из БД)"""
    try:
        salon = get_salon_settings()
        
        return {
            "name": salon.get("name", "Beauty Salon"),
            "address": salon.get("address", ""),
            "phone": salon.get("phone", ""),
            "email": salon.get("email"),
            "instagram": salon.get("instagram"),
            "booking_url": salon.get("booking_url", ""),
            "google_maps": salon.get("google_maps", ""),
            "working_hours": {
                "weekdays": salon.get("hours_ru", salon.get("hours", "")),
                "weekends": salon.get("hours_ru", salon.get("hours", ""))
            },
            "about": salon.get("about", "Премиальный салон красоты"),
            "bot_name": salon.get("bot_name", "Assistant"),
            "city": salon.get("city", "Dubai"),
            "country": salon.get("country", "UAE"),
            "currency": salon.get("currency", "AED")
        }
    except Exception as e:
        # Если БД недоступна, возвращаем минимальный набор
        return {
            "name": "Beauty Salon",
            "address": "",
            "phone": "",
            "email": None,
            "instagram": None,
            "booking_url": "",
            "google_maps": "",
            "working_hours": {
                "weekdays": "10:00 - 21:00",
                "weekends": "10:00 - 21:00"
            },
            "about": "Премиальный салон красоты",
            "bot_name": "Assistant",
            "city": "Dubai",
            "country": "UAE",
            "currency": "AED"
        }


@router.get("/services")
async def get_public_services():
    """Публичный список активных услуг"""
    services = get_all_services(active_only=True)
    
    return {
        "services": [
            {
                "id": s[0],
                "name": s[2],  # name_ru
                "price": s[3],
                "currency": s[4],
                "category": s[5],
                "description": s[7] or ""  # description_ru
            } for s in services
        ]
    }