"""
Публичные API endpoints (без авторизации)
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timedelta
import sqlite3
from db.settings import get_salon_settings
from db.services import get_all_services
from db.employees import get_all_employees
from core.config import DATABASE_NAME
from services.reviews import reviews_service

router = APIRouter(tags=["Public"])


# ============================================================================
# MODELS
# ============================================================================

class BookingCreate(BaseModel):
    service_id: int
    employee_id: Optional[int] = None
    date: str  # YYYY-MM-DD
    time: str  # HH:MM
    name: str
    phone: str
    email: Optional[str] = None
    notes: Optional[str] = None


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
            "whatsapp": salon.get("whatsapp") or salon.get("phone", ""),
            "booking_url": salon.get("booking_url", ""),
            "google_maps": salon.get("google_maps", ""),
            "hours": salon.get("hours", "10:30 - 21:30"),
            "hours_weekdays": salon.get("hours_weekdays", "10:30 - 21:30"),
            "hours_weekends": salon.get("hours_weekends", "10:30 - 21:30"),
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
            "hours_weekdays": "10:30 - 21:30",
            "hours_weekends": "10:30 - 21:30",
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

    return [
        {
            "id": s[0],  # id
            "name": s[2],  # name (English)
            "name_ru": s[3] if len(s) > 3 else None,
            "name_ar": s[4] if len(s) > 4 else None,
            "name_en": s[20] if len(s) > 20 else None, # Added in migration
            "name_de": s[22] if len(s) > 22 else None,
            "name_es": s[24] if len(s) > 24 else None,
            "name_fr": s[26] if len(s) > 26 else None,
            "name_hi": s[28] if len(s) > 28 else None,
            "name_kk": s[30] if len(s) > 30 else None,
            "name_pt": s[32] if len(s) > 32 else None,
            "price": s[5],  # price
            "currency": s[8],  # currency
            "category": s[9],  # category
            "duration": s[15] or 60,  # duration in minutes
            "description": s[10] or "",  # description
            "description_ru": s[11] if len(s) > 11 else None,
            "description_ar": s[12] if len(s) > 12 else None,
            "description_en": s[21] if len(s) > 21 else None,
            "description_de": s[23] if len(s) > 23 else None,
            "description_es": s[25] if len(s) > 25 else None,
            "description_fr": s[27] if len(s) > 27 else None,
            "description_hi": s[29] if len(s) > 29 else None,
            "description_kk": s[31] if len(s) > 31 else None,
            "description_pt": s[33] if len(s) > 33 else None
        } for s in services
    ]


@router.get("/employees")
async def get_public_employees():
    """Публичный список активных сотрудников"""
    employees = get_all_employees(active_only=True)

    return {
        "employees": [
            {
                "id": e[0],
                "username": e[1],
                "full_name": e[2],
                "role": e[3],
                "specialization": e[5] if len(e) > 5 else None
            } for e in employees
        ]
    }


@router.get("/available-slots")
async def get_available_slots(
    date: str,
    employee_id: Optional[int] = None,
    service_id: Optional[int] = None
):
    """
    Получить доступные слоты для записи на конкретную дату

    Args:
        date: Дата в формате YYYY-MM-DD
        employee_id: ID сотрудника (опционально)
        service_id: ID услуги (опционально)

    Returns:
        Список доступных временных слотов
    """
    # Генерируем слоты с 10:00 до 20:00 с интервалом 30 минут
    slots = []

    start_hour = 10
    end_hour = 20
    interval_minutes = 30

    current_hour = start_hour
    current_minute = 0

    while current_hour < end_hour or (current_hour == end_hour and current_minute == 0):
        time_slot = f"{current_hour:02d}:{current_minute:02d}"

        # Проверяем, занят ли этот слот
        is_available = check_slot_availability(date, time_slot, employee_id)

        if is_available:
            slots.append({
                "time": time_slot,
                "available": True
            })
        else:
            slots.append({
                "time": time_slot,
                "available": False
            })

        # Переход к следующему слоту
        current_minute += interval_minutes
        if current_minute >= 60:
            current_minute = 0
            current_hour += 1

    return {"date": date, "slots": slots}


def check_slot_availability(date: str, time: str, employee_id: Optional[int] = None) -> bool:
    """Проверить доступность слота"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    # Формируем дату-время
    datetime_str = f"{date} {time}"

    # Проверяем, есть ли запись на это время
    if employee_id:
        # Проверяем для конкретного сотрудника
        c.execute("""
            SELECT COUNT(*) FROM bookings
            WHERE datetime = ? AND employee_id = ? AND status NOT IN ('cancelled', 'no_show')
        """, (datetime_str, employee_id))
    else:
        # Проверяем общую занятость
        c.execute("""
            SELECT COUNT(*) FROM bookings
            WHERE datetime = ? AND status NOT IN ('cancelled', 'no_show')
        """, (datetime_str,))

    count = c.fetchone()[0]
    conn.close()

    return count == 0


@router.get("/reviews")
async def get_reviews(language: str = "en"):
    """
    Get active 5-star reviews in the specified language from database
    """
    conn = sqlite3.connect(DATABASE_NAME)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    
    try:
        # Получаем активные отзывы
        c.execute("""
            SELECT * FROM public_reviews 
            WHERE is_active = 1 AND rating = 5
            ORDER BY display_order ASC, created_at DESC
        """)
        
        reviews = []
        for row in c.fetchall():
            row_dict = dict(row)
            
            # Выбираем текст на нужном языке
            text_key = f"text_{language}"
            # Fallback to English or Russian if specific language is missing
            text = row_dict.get(text_key) or row_dict.get('text_en') or row_dict.get('text_ru', '')
            
            reviews.append({
                "id": row_dict.get("id"),
                "name": row_dict.get("author_name"),
                "rating": row_dict.get("rating"),
                "text": text,
                "avatar": row_dict.get("avatar_url") or row_dict.get("author_name", "?")[0].upper()
            })
        
        return {"reviews": reviews}
    except Exception as e:
        # logger.error(f"Error fetching reviews: {e}")
        return {"reviews": []}
    finally:
        conn.close()

# ... (create_booking is unchanged) ...

@router.get("/news")
async def get_salon_news(limit: int = 10, language: str = "ru"):
    """Получить новости салона"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    c.execute("""
        SELECT id, title_ru, title_en, title_ar, content_ru, content_en, content_ar,
               image_url, published_at
        FROM salon_news
        WHERE is_active = 1
        ORDER BY published_at DESC
        LIMIT ?
    """, (limit,))

    news = []
    for row in c.fetchall():
        # Выбираем нужный язык
        if language == "ar":
            title = row[3] or row[1]
            content = row[6] or row[4]
        elif language == "en":
            title = row[2] or row[1]
            content = row[5] or row[4]
        else:
            title = row[1]
            content = row[4]

        news.append({
            "id": row[0],
            "title": title,
            "content": content,
            "image_url": row[7],
            "published_at": row[8]
        })

    conn.close()
    return {"news": news}


@router.get("/faq")
async def get_public_faq(language: str = "ru"):
    """Получить список FAQ"""
    conn = sqlite3.connect(DATABASE_NAME)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    
    try:
        c.execute("SELECT * FROM public_faq ORDER BY category, display_order ASC")
        
        faq_list = []
        for row in c.fetchall():
            row_dict = dict(row)
            
            # Выбираем текст на нужном языке
            q_key = f"question_{language}"
            a_key = f"answer_{language}"
            
            question = row_dict.get(q_key) or row_dict.get('question_en') or row_dict.get('question_ru', '')
            answer = row_dict.get(a_key) or row_dict.get('answer_en') or row_dict.get('answer_ru', '')
            
            faq_list.append({
                "id": row_dict.get("id"),
                "question": question,
                "answer": answer,
                "category": row_dict.get("category")
            })
            
        return {"faq": faq_list}
    except Exception as e:
        return {"faq": []}
    finally:
        conn.close()


@router.get("/gallery")
async def get_public_gallery(category: Optional[str] = None):
    """Получить публичную галерею"""
    conn = sqlite3.connect(DATABASE_NAME)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    
    try:
        # Get display limits from settings
        c.execute("SELECT gallery_display_count, portfolio_display_count FROM salon_settings LIMIT 1")
        settings = c.fetchone()
        limit = 6 # Default
        
        if settings:
            if category == 'salon':
                limit = settings['gallery_display_count'] or 6
            elif category == 'portfolio':
                limit = settings['portfolio_display_count'] or 6
        
        query = "SELECT * FROM gallery_images WHERE is_visible = 1"
        params = []
        
        if category:
            query += " AND category = ?"
            params.append(category)
            
        query += " ORDER BY sort_order ASC, created_at DESC LIMIT ?"
        params.append(limit)
        
        c.execute(query, params)
        
        images = []
        for row in c.fetchall():
            images.append(dict(row))
            
        return {"images": images}
    except Exception as e:
        # If columns don't exist yet, fallback to no limit or default
        try:
            query = "SELECT * FROM gallery_images WHERE is_visible = 1"
            params = []
            if category:
                query += " AND category = ?"
                params.append(category)
            query += " ORDER BY sort_order ASC, created_at DESC LIMIT 6"
            c.execute(query, params)
            images = [dict(row) for row in c.fetchall()]
            return {"images": images}
        except:
            return {"images": []}
    finally:
        conn.close()


@router.get("/banners")
async def get_public_banners():
    """Получить активные баннеры для главной страницы"""
    conn = sqlite3.connect(DATABASE_NAME)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    
    try:
        c.execute("""
            SELECT * FROM public_banners 
            WHERE is_active = 1 
            ORDER BY display_order ASC
        """)
        
        banners = [dict(row) for row in c.fetchall()]
        return {"banners": banners}
    except Exception as e:
        from utils.logger import log_error
        log_error(f"Error fetching banners: {e}", "api")
        return {"banners": []}
    finally:
        conn.close()