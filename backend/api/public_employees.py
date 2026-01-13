"""
API endpoints для публичных данных сотрудников
"""
from fastapi import APIRouter, Query
from typing import Optional, List, Dict

from core.config import DATABASE_NAME
from db.connection import get_db_connection
from utils.logger import log_info
from utils.utils import sanitize_url
import time

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
    start_time = time.time()
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Sanitize language
        valid_languages = ['ru', 'en', 'ar', 'es', 'de', 'fr', 'hi', 'kk', 'pt']
        if language not in valid_languages:
            language = 'en'

        # Определяем поля для перевода
        name_field = f'full_name_{language}'
        position_field = f'position_{language}'
        bio_field = f'bio_{language}'
        
        query = f"""
            SELECT
                u.id,
                COALESCE(u.{name_field}, u.full_name) as full_name,
                COALESCE(u.{position_field}, u.position) as position,
                u.bio,
                u.specialization,
                u.photo,
                u.experience,
                u.years_of_experience,
                u.birthday,
                NULL as instagram,
                u.sort_order,
                u.updated_at as updated_timestamp
            FROM users u
            WHERE u.is_service_provider = TRUE
            AND u.is_active = TRUE
            AND u.role != 'director'
            AND u.is_public_visible = TRUE
            AND u.deleted_at IS NULL
            ORDER BY u.sort_order ASC, u.full_name ASC
        """

        cursor.execute(query)
        rows = cursor.fetchall()
        columns = [desc[0] for desc in cursor.description]
        employees = []

        # ... (keep existing code up to loop)

        for row in rows:
            row_dict = dict(zip(columns, row))
            # ... (keep existing code)
            
            # Add cache-busting parameter based on actual update timestamp
            updated_timestamp = row_dict.get("updated_timestamp")
            if updated_timestamp:
                # Convert datetime to timestamp if needed
                ts = int(updated_timestamp.timestamp()) if hasattr(updated_timestamp, 'timestamp') else str(updated_timestamp)
                if final_photo and '?' not in final_photo:
                    final_photo_with_cache = f"{final_photo}?v={ts}"
                else:
                    final_photo_with_cache = final_photo
            else:
                 final_photo_with_cache = final_photo

            log_info(f"🖼️ [Public] Final photo URL for {employee_name}: {final_photo_with_cache}", "api")

            employees.append({
                "id": employee_id,
                "name": employee_name,
                "full_name": employee_name,  # Для совместимости с фронтендом
                "role": row_dict["position"] or "Специалист",
                "position": row_dict["position"] or "Специалист",  # Для совместимости с фронтендом
                "specialty": row_dict["specialization"] or row_dict["bio"] or "",
                "image": final_photo_with_cache,
                "photo": final_photo_with_cache,  # Для совместимости с фронтендом
                "experience": (exp_text or "").strip(),
                "age": age,
                "instagram": row_dict["instagram"] or "",
                "service_ids": service_ids  # Добавляем список ID услуг
            })
        
        duration = time.time() - start_time
        log_info(f"⏱️ get_public_employees took {duration:.4f}s returning {len(employees)} employees", "api")

        log_info(f"Получено {len(employees)} сотрудников на языке {language}", "api")
        
        from fastapi.responses import JSONResponse
        response = JSONResponse(employees)
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
        return response
        
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
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Sanitize language
        valid_languages = ['ru', 'en', 'ar', 'es', 'de', 'fr', 'hi', 'kk', 'pt']
        if language not in valid_languages:
            language = 'ru'

        # Определяем поля для перевода
        name_field = 'name_ar' if language == 'ar' else 'name'
        address_field = 'address_ar' if language == 'ar' else ('address_ru' if language == 'ru' else 'address')
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
                currency,
                logo_url
            FROM salon_settings
            WHERE id = 1
        """
        
        cursor.execute(query)
        row = cursor.fetchone()
        
        if row:
            columns = [desc[0] for desc in cursor.description]
            row_dict = dict(zip(columns, row))
            return {
                "name": row_dict["name"],
                "address": row_dict["address"],
                "main_location": row_dict["main_location"],
                "google_maps_embed_url": row_dict["google_maps"],  # Map to frontend expected key
                "google_maps": row_dict["google_maps"],
                "hours": row_dict["hours"],
                "hours_weekdays": row_dict["hours_weekdays"],
                "hours_weekends": row_dict["hours_weekends"],
                "phone": row_dict["phone"],
                "email": row_dict["email"],
                "instagram": row_dict["instagram"],
                "whatsapp": row_dict["whatsapp"],
                "booking_url": row_dict["booking_url"],
                "city": row_dict["city"],
                "country": row_dict["country"],
                "timezone_offset": row_dict["timezone_offset"],
                "currency": row_dict["currency"],
                "logo_url": row_dict["logo_url"]
            }
        else:
            return {}
        
    except Exception as e:
        log_info(f"Ошибка получения информации о салоне: {e}", "api")
        return {}
    finally:
        conn.close()
