"""
API endpoints для публичных данных сотрудников
"""
from fastapi import APIRouter, Query
from typing import Optional, List, Dict
import sqlite3
from core.config import DATABASE_NAME
from utils.logger import log_info

router = APIRouter()


@router.get("/public/employees")
async def get_public_employees(
    language: str = Query('ru', description="Language code (ru, en, ar, es, de, fr, hi, kk, pt)")
) -> List[Dict]:
    """
    Получить активных сотрудников для публичной страницы
    
    - **language**: Код языка (по умолчанию 'ru')
    """
    log_info(f"API: Запрос сотрудников на языке {language}", "api")
    
    conn = sqlite3.connect(DATABASE_NAME)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    try:
        # Определяем поля для перевода
        name_field = f'full_name_{language}' if language != 'ru' else 'full_name'
        position_field = f'position_{language}' if language != 'ru' else 'position'
        bio_field = f'bio_{language}' if language != 'ru' else 'bio'
        
        query = f"""
            SELECT 
                id,
                COALESCE({name_field}, full_name) as full_name,
                COALESCE({position_field}, position) as position,
                COALESCE({bio_field}, bio) as bio,
                photo,
                experience,
                instagram_employee as instagram,
                sort_order
            FROM users
            WHERE is_service_provider = 1 
            AND is_active = 1
            ORDER BY sort_order DESC, full_name ASC
        """
        
        cursor.execute(query)
        employees = []
        
        for row in cursor.fetchall():
            employees.append({
                "id": row["id"],
                "name": row["full_name"],
                "role": row["position"] or "Специалист",
                "specialty": row["bio"] or "",
                "image": row["photo"] or "/static/avatars/default_female.webp",
                "experience": row["experience"] or "",
                "instagram": row["instagram"] or ""
            })
        
        log_info(f"Получено {len(employees)} сотрудников на языке {language}", "api")
        return employees
        
    except Exception as e:
        log_info(f"Ошибка получения сотрудников: {e}", "api")
        return []
    finally:
        conn.close()


@router.get("/public/salon-info")
async def get_salon_info(
    language: str = Query('ru', description="Language code")
) -> Dict:
    """
    Получить информацию о салоне
    
    - **language**: Код языка
    """
    log_info(f"API: Запрос информации о салоне на языке {language}", "api")
    
    conn = sqlite3.connect(DATABASE_NAME)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    try:
        # Определяем поля для перевода
        name_field = 'name_ar' if language == 'ar' else 'name'
        address_field = 'address_ar' if language == 'ar' else 'address'
        hours_field = f'hours_{language}' if language in ['ru', 'ar'] else 'hours'
        location_field = f'main_location_{language}' if language != 'ru' else 'main_location'
        
        query = f"""
            SELECT 
                COALESCE({name_field}, name) as name,
                COALESCE({address_field}, address) as address,
                COALESCE({location_field}, main_location) as main_location,
                google_maps,
                COALESCE({hours_field}, hours) as hours,
                hours_weekdays,
                hours_weekends,
                phone,
                email,
                instagram,
                whatsapp,
                booking_url,
                city,
                country,
                timezone_offset,
                currency
            FROM salon_settings
            WHERE id = 1
        """
        
        cursor.execute(query)
        row = cursor.fetchone()
        
        if row:
            return {
                "name": row["name"],
                "address": row["address"],
                "main_location": row["main_location"],
                "google_maps": row["google_maps"],
                "hours": row["hours"],
                "hours_weekdays": row["hours_weekdays"],
                "hours_weekends": row["hours_weekends"],
                "phone": row["phone"],
                "email": row["email"],
                "instagram": row["instagram"],
                "whatsapp": row["whatsapp"],
                "booking_url": row["booking_url"],
                "city": row["city"],
                "country": row["country"],
                "timezone_offset": row["timezone_offset"],
                "currency": row["currency"]
            }
        else:
            return {}
        
    except Exception as e:
        log_info(f"Ошибка получения информации о салоне: {e}", "api")
        return {}
    finally:
        conn.close()
