"""
Публичные API endpoints (без авторизации)
"""
from fastapi import APIRouter
from db.settings import get_salon_settings
from db.services import get_all_services
from config import (
    SALON_NAME, SALON_ADDRESS, SALON_PHONE, SALON_EMAIL,
    SALON_INSTAGRAM, SALON_BOOKING_URL, SALON_ABOUT,
    SALON_WORKING_HOURS_WEEKDAYS, SALON_WORKING_HOURS_WEEKENDS,
    SALON_BOT_NAME
)

router = APIRouter(tags=["Public"])


@router.get("/salon-info")
async def get_salon_info():
    """Публичная информация о салоне (из БД или config)"""
    try:
        # Пытаемся получить из БД
        salon = get_salon_settings()
        return {
            "name": salon.get("name", SALON_NAME),
            "address": salon.get("address", SALON_ADDRESS),
            "phone": salon.get("phone", SALON_PHONE),
            "email": salon.get("email", SALON_EMAIL),
            "instagram": salon.get("instagram", SALON_INSTAGRAM),
            "booking_url": salon.get("booking_url", SALON_BOOKING_URL),
            "working_hours": salon.get("working_hours", {
                "weekdays": SALON_WORKING_HOURS_WEEKDAYS,
                "weekends": SALON_WORKING_HOURS_WEEKENDS
            }),
            "about": salon.get("about", SALON_ABOUT),
            "bot_name": salon.get("bot_name", SALON_BOT_NAME)
        }
    except Exception:
        # Если БД недоступна, используем config.py
        return {
            "name": SALON_NAME,
            "address": SALON_ADDRESS,
            "phone": SALON_PHONE,
            "email": SALON_EMAIL,
            "instagram": SALON_INSTAGRAM,
            "booking_url": SALON_BOOKING_URL,
            "working_hours": {
                "weekdays": SALON_WORKING_HOURS_WEEKDAYS,
                "weekends": SALON_WORKING_HOURS_WEEKENDS
            },
            "about": SALON_ABOUT,
            "bot_name": SALON_BOT_NAME
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