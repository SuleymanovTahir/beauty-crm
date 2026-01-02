"""
API endpoints для публичных данных сотрудников
"""
from fastapi import APIRouter, Query
from typing import Optional, List, Dict

from core.config import DATABASE_NAME
from db.connection import get_db_connection
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
                u.public_page_order as sort_order
            FROM users u
            WHERE u.is_service_provider = TRUE
            AND u.is_active = TRUE
            AND u.role != 'director'
            ORDER BY u.public_page_order DESC, u.full_name ASC
        """

        cursor.execute(query)
        rows = cursor.fetchall()
        columns = [desc[0] for desc in cursor.description]
        employees = []

        # Получить service_ids для каждого мастера (используем user_services, не employee_services)
        cursor.execute("""
            SELECT user_id, array_agg(service_id) as service_ids
            FROM user_services
            GROUP BY user_id
        """)
        employee_services_map = {row[0]: row[1] for row in cursor.fetchall()}
        
        from datetime import date, datetime

        def calculate_age(birthday_str):
            if not birthday_str:
                return None
            try:
                # Try common formats
                for fmt in ('%Y-%m-%d', '%d.%m.%Y', '%d/%m/%Y'):
                    try:
                        birth_date = datetime.strptime(birthday_str, fmt).date()
                        today = date.today()
                        return today.year - birth_date.year - ((today.month, today.day) < (birth_date.month, birth_date.day))
                    except ValueError:
                        continue
                return None
            except:
                return None

        def get_russian_plural(number, one, two, five):
            n = abs(number) % 100
            n1 = n % 10
            if n > 10 and n < 20: return five
            if n1 > 1 and n1 < 5: return two
            if n1 == 1: return one
            return five

        for row in rows:
            row_dict = dict(zip(columns, row))
            
            # Handle experience fallback
            exp_text = row_dict.get("experience")
            years = row_dict.get("years_of_experience")
            
            if (not exp_text or not str(exp_text).strip()) and years:
                # Basic localization for experience
                if language == 'ru':
                    plural = get_russian_plural(years, "год", "года", "лет")
                    exp_text = f"{years} {plural} опыта"
                elif language == 'ar':
                    exp_text = f"{years} سنوات خبرة"
                else:
                    exp_text = f"{years} years experience"
            elif exp_text and years and language == 'ru':
                # Even if exp_text exists, we might want to re-format it if it's just a number
                # but for now let's stick to the plan: fallback only if empty or specifically requested.
                # The user asked for pluralization, so let's make sure it's correct for Mestan too.
                plural = get_russian_plural(years, "год", "года", "лет")
                exp_text = f"{years} {plural} опыта"

            # Calculate age
            age = calculate_age(row_dict.get("birthday"))

            employee_id = row_dict["id"]
            service_ids = employee_services_map.get(employee_id, [])

            employees.append({
                "id": employee_id,
                "name": row_dict["full_name"],
                "full_name": row_dict["full_name"],  # Для совместимости с фронтендом
                "role": row_dict["position"] or "Специалист",
                "position": row_dict["position"] or "Специалист",  # Для совместимости с фронтендом
                "specialty": row_dict["specialization"] or row_dict["bio"] or "",
                "image": row_dict["photo"] or "/static/avatars/default_female.webp",
                "photo": row_dict["photo"] or "/static/avatars/default_female.webp",  # Для совместимости с фронтендом
                "experience": (exp_text or "").strip(),
                "age": age,
                "instagram": row_dict["instagram"] or "",
                "service_ids": service_ids  # Добавляем список ID услуг
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
