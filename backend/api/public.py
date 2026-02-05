from fastapi import APIRouter, HTTPException, BackgroundTasks, Query
from pydantic import BaseModel, validator
from typing import Optional, List, Dict
import time
import urllib.parse
from datetime import datetime, timedelta, date

from db.settings import get_salon_settings
from db.services import get_all_services, get_service
from db.connection import get_db_connection
from utils.utils import sanitize_url, map_image_path, _add_v
from utils.cache import cache
from utils.logger import log_info, log_error
from core.config import is_localhost

# Helper moved to utils.utils


import re

def _get_google_maps_embed_url(address: str, raw_url: str = None) -> str:
    """Генерация надежного URL для вставки карты (iFrame)"""
    import urllib.parse
    
    # Самый надежный способ показать ПИН с названием без API ключа - 
    # это использовать полное имя бизнеса, которое Google уже знает.
    business_name = "M Le Diamant - Best Beauty Salon in Jumeirah Beach Dubai"
    
    # Если адрес содержит JBR или Diamant, используем полное имя для точности пина и заголовка
    query = business_name
    
    # Если передан специфический адрес, но в нем нет названия, добавляем его
    if address and "Diamant" not in address:
        query = f"M Le Diamant Beauty Salon {address}"
    elif not address and not query:
        query = business_name

    encoded_q = urllib.parse.quote(query)
    # iwloc=A заставляет гугл открыть инфо-окно с названием
    return f"https://maps.google.com/maps?q={encoded_q}&t=&z=17&ie=UTF8&iwloc=A&output=embed"

# Import DB functions for public content
from db.public_content import (
    get_active_reviews,
    get_active_faq,
    get_active_gallery
)

router = APIRouter(tags=["Public"])

# Cache TTLs
CACHE_TTL_LONG = 3600    # 1 hour
CACHE_TTL_MEDIUM = 300   # 5 minutes
CACHE_TTL_SHORT = 60     # 1 minute

def calculate_age(birthday_str):
    if not birthday_str:
        return None
    try:
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

# ============================================================================
# MODELS
# ============================================================================

class BookingCreate(BaseModel):
    service_ids: List[int]
    employee_id: Optional[int] = None
    date: str
    time: str
    name: str
    phone: str
    email: Optional[str] = None
    notes: Optional[str] = None
    source: Optional[str] = 'website'
    
    @validator('phone')
    def validate_phone(cls, v):
        digits_only = ''.join(filter(str.isdigit, v))
        if len(digits_only) < 11:
            raise ValueError('phone_too_short')
        return v

class ContactForm(BaseModel):
    name: str
    email: Optional[str] = None
    message: str

# ============================================================================
# SALON INFO & SETTINGS
# ============================================================================

@router.api_route("/salon-settings", methods=["GET", "HEAD"])
@router.api_route("/salon-info", methods=["GET", "HEAD"])
def get_public_salon_settings(language: str = "ru"):
    """Получить публичную информацию о салоне"""
    from utils.language_utils import validate_language
    
    try:
        lang_key = validate_language(language)
        
        # Enable caching for performance
        cache_key = f"public_salon_settings_{lang_key}"
        cached_data = cache.get(cache_key)
        if cached_data:
            return cached_data
        
        settings = get_salon_settings()
        if not settings:
            raise HTTPException(status_code=404, detail="Settings not found")

        # Базовые поля (теперь без суффиксов в БД)
        localized_name = settings.get("name")
        localized_address = settings.get("address")
        localized_hours = settings.get("hours")
        
        if not localized_hours:
            # Fallback на конструкцию из будней/выходных
            hw = settings.get("hours_weekdays")
            he = settings.get("hours_weekends")
            localized_hours = f"{hw} / {he}" if hw != he else hw

        from utils.language_utils import get_dynamic_translation

        faq_items = get_active_faq(language=lang_key)
        # Enrich FAQ with dynamic translations
        for item in faq_items:
             item['question'] = get_dynamic_translation('public_faq', item['id'], 'question', lang_key, item['question'])
             item['answer'] = get_dynamic_translation('public_faq', item['id'], 'answer', lang_key, item['answer'])

        reviews = get_active_reviews(language=lang_key, limit=10)
        # Enrich Reviews with dynamic translations
        for item in reviews:
             item['text'] = get_dynamic_translation('public_reviews', item['id'], 'text', lang_key, item['text'])
             item['position'] = get_dynamic_translation('public_reviews', item['id'], 'employee_position', lang_key, item.get('position', ''))

        # Google Maps Embed logic
        gm_raw = settings.get("google_maps", "")
        gm_embed = _get_google_maps_embed_url(localized_address, gm_raw)


        result = {
            "name": localized_name,
            "phone": settings.get("phone"),
            "email": settings.get("email"),
            "address": localized_address,
            "hours": localized_hours,
            "hours_weekdays": settings.get("hours_weekdays"),
            "hours_weekends": settings.get("hours_weekends"),
            "instagram": settings.get("instagram"),
            "whatsapp": settings.get("whatsapp"),
            "logo_url": _add_v(settings.get("logo_url")),
            "google_maps": gm_raw,
            "google_maps_embed_url": gm_embed,
            "map_url": gm_raw,
            "booking_url": settings.get("booking_url"),
            "currency": settings.get("currency", "AED"),
            "faq": faq_items,
            "reviews": reviews,
            "custom_settings": settings.get("custom_settings", {})
        }
        
        cache.set(cache_key, result, expire=CACHE_TTL_LONG)
        return result
    except Exception as e:
        log_error(f"Error in get_public_salon_settings: {e}", "public_api")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# EMPLOYEES
# ============================================================================

@router.api_route("/employees", methods=["GET", "HEAD"])
@router.api_route("/masters", methods=["GET", "HEAD"])
def get_public_employees(
    language: str = Query('ru', description="Language code")
) -> List[Dict]:
    """Список активных сотрудников для лендинга"""
    from utils.language_utils import validate_language, get_localized_name, translate_position, get_dynamic_translation
    
    conn = None
    try:
        lang_key = validate_language(language)
        
        cache_key = f"public_employees_{lang_key}"
        cached_data = cache.get(cache_key)
        if cached_data:
            return cached_data

        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Базовые поля
        query = """
            SELECT
                u.id,
                u.username,
                u.full_name,
                u.position,
                u.bio,
                u.specialization,
                u.photo,
                u.experience,
                u.years_of_experience,
                u.birthday,
                u.sort_order,
                u.updated_at,
                u.nickname
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

        cursor.execute("SELECT user_id, array_agg(service_id) FROM user_services GROUP BY user_id")
        services_map = {row[0]: row[1] for row in cursor.fetchall()}
        
        for row in rows:
            row_dict = dict(zip(columns, row))
            emp_id = row_dict["id"]
            
            # Experience labels by language
            EXPERIENCE_LABELS = {
                'ru': lambda y: f"{y} {get_russian_plural(y, 'год', 'года', 'лет')} опыта",
                'en': lambda y: f"{y} years experience",
                'ar': lambda y: f"{y} سنوات خبرة",
                'es': lambda y: f"{y} años de experiencia",
                'de': lambda y: f"{y} Jahre Erfahrung",
                'fr': lambda y: f"{y} ans d'expérience",
                'pt': lambda y: f"{y} anos de experiência",
                'hi': lambda y: f"{y} साल का अनुभव",
                'kk': lambda y: f"{y} жыл тәжірибе"
            }
            
            years = row_dict.get("years_of_experience")
            if years:
                exp_formatter = EXPERIENCE_LABELS.get(lang_key, EXPERIENCE_LABELS['en'])
                exp_text = exp_formatter(years)
            else:
                exp_text = row_dict.get("experience") or ""

            photo_url = sanitize_url(row_dict.get("photo")) or "/landing-images/Сотрудники/default_female.webp"
            # Map old paths to new frontend paths
            photo_url = map_image_path(photo_url)
            final_photo = _add_v(photo_url)

            # Name Logic (as per Rule): Nickname > First Name (Capitalized)
            nickname = row_dict.get("nickname")
            full_name = row_dict.get("full_name") or ""
            
            if nickname:
                display_name = nickname
            else:
                # Split by space or parenthesis and take first part
                import re
                parts = re.split(r'[\s\(\)]+', full_name.strip())
                display_name = parts[0] if parts else full_name

            # Ensure proper capitalization
            if display_name:
                display_name = display_name[0].upper() + display_name[1:].lower()

            # Transliterate name based on language
            final_name = get_localized_name(emp_id, display_name, language=lang_key)
            
            # Translate position
            raw_position = row_dict["position"] or "Specialist"
            final_position = translate_position(raw_position, lang_key)

            # Translate bio/specialty
            bio = get_dynamic_translation('users', emp_id, 'bio', lang_key, row_dict["bio"])
            specialization = get_dynamic_translation('users', emp_id, 'specialization', lang_key, row_dict["specialization"])

            employees.append({
                "id": emp_id,
                "username": row_dict.get("username"),
                "name": final_name,
                "full_name": final_name,
                "role": final_position,
                "position": final_position,
                "specialty": specialization or bio or "",
                "image": final_photo,
                "photo": final_photo,
                "experience": exp_text.strip(),
                "age": calculate_age(row_dict.get("birthday")),
                "service_ids": services_map.get(emp_id, [])
            })
            
        # De-duplicate by normalized name to handle cases where multiple records 
        # exist for same person with slightly different spellings or languages.
        unique_employees = {}
        
        def _get_norm_name(name):
            if not name: return ""
            # Simple normalization: lower case, only alphanumeric
            import re
            return re.sub(r'[^a-zA-Z\u0400-\u04FF]', '', name.lower())

        for emp in employees:
            norm = _get_norm_name(emp['name'])
            if not norm: continue
            
            existing = unique_employees.get(norm)
            if not existing:
                unique_employees[norm] = emp
            else:
                # Merge strategy: prefer record with more information
                # 1. Prefer record with photo (not default)
                has_photo = emp['image'] and 'default' not in emp['image'] and 'ui-avatars' not in emp['image']
                ext_has_photo = existing['image'] and 'default' not in existing['image'] and 'ui-avatars' not in existing['image']
                
                # 2. Prefer record with bio/specialty
                emp_has_bio = len(emp.get('specialty', '')) > 20
                ext_has_bio = len(existing.get('specialty', '')) > 20
                
                # 3. Prefer record with more services
                emp_services = len(emp.get('service_ids', []))
                ext_services = len(existing.get('service_ids', []))

                score = 0
                if has_photo: score += 10
                if emp_has_bio: score += 5
                score += emp_services * 0.1
                
                ext_score = 0
                if ext_has_photo: ext_score += 10
                if ext_has_bio: ext_score += 5
                ext_score += ext_services * 0.1
                
                if score > ext_score:
                    # Merge data: take services from both
                    all_services = list(set(emp.get('service_ids', []) + existing.get('service_ids', [])))
                    emp['service_ids'] = all_services
                    unique_employees[norm] = emp
                else:
                    # Merge data back to existing
                    all_services = list(set(emp.get('service_ids', []) + existing.get('service_ids', [])))
                    existing['service_ids'] = all_services
                    # Take bio/photo from emp if existing is missing it
                    if not ext_has_photo and has_photo:
                        existing['image'] = emp['image']
                        existing['photo'] = emp['photo']
                    if not ext_has_bio and emp_has_bio:
                        existing['specialty'] = emp['specialty']
        
        final_employees = list(unique_employees.values())
        # Restore original order
        final_employees.sort(key=lambda x: (x.get('sort_order', 0), x['name']))
        
        cache.set(cache_key, final_employees, expire=CACHE_TTL_MEDIUM)
        return final_employees
    except Exception as e:
        log_error(f"Error fetching employees: {e}", "public_api")
        return []
    finally:
        if conn:
            conn.close()

# ============================================================================
# SERVICES
# ============================================================================

@router.api_route("/services", methods=["GET", "HEAD"])
def get_public_services_endpoint(language: str = "ru"):
    """API endpoint для получения списка услуг"""
    services = get_public_services(language=language)
    return {"success": True, "services": services}

def get_public_services(language: str = "ru"):
    """Все услуги локализованные (внутренняя функция)"""
    from utils.language_utils import validate_language, get_dynamic_translation
    lang_key = validate_language(language)
    
    cache_key = f"public_services_{lang_key}"
    cached_data = cache.get(cache_key)
    if cached_data:
        return cached_data
    
    services = get_all_services(active_only=True, include_positions=True)
    
    results = []
    for s in services:
        s_id = s.get("id")
        # Dynamic translation
        name = get_dynamic_translation('services', s_id, 'name', lang_key, s.get("name"))
        cat = s.get("category")
        localized_cat = get_dynamic_translation('categories', cat, '', lang_key, cat)
        
        item = {
            "id": s_id,
            "name": name,
            "description": s.get("description"),
            "price": s.get("price"),
            "currency": s.get("currency"),
            "category": localized_cat,
            "duration": s.get("duration"),
            "service_key": s.get("service_key"),
            "positions": s.get("positions", [])
        }
        results.append(item)
        
    cache.set(cache_key, results, expire=CACHE_TTL_MEDIUM)
    return results



# ============================================================================
# CONTENT (REVIEWS, FAQ, GALLERY)
# ============================================================================

@router.api_route("/reviews", methods=["GET", "HEAD"])
def get_public_reviews_list(language: str = "ru", limit: int = 10):
    """Список отзывов локализованные"""
    from utils.language_utils import validate_language, get_dynamic_translation
    lang_key = validate_language(language)
    reviews = get_active_reviews(language=lang_key, limit=limit)
    
    # Enrich with translations
    for item in reviews:
         item['text'] = get_dynamic_translation('public_reviews', item['id'], 'text', lang_key, item['text'])
         item['position'] = get_dynamic_translation('public_reviews', item['id'], 'employee_position', lang_key, item.get('position', ''))
         
    return {"success": True, "reviews": reviews}

@router.api_route("/faq", methods=["GET", "HEAD"])
def get_public_faq_list(language: str = "ru"):
    """Список FAQ локализованные"""
    from utils.language_utils import validate_language, get_dynamic_translation
    lang_key = validate_language(language)
    faqs = get_active_faq(language=lang_key)
    
    # Enrich with translations
    for item in faqs:
         item['question'] = get_dynamic_translation('public_faq', item['id'], 'question', lang_key, item['question'])
         item['answer'] = get_dynamic_translation('public_faq', item['id'], 'answer', lang_key, item['answer'])
    
    try:
        from services.loyalty import LoyaltyService
        from db.settings import get_salon_settings
        
        loyalty_service = LoyaltyService()
        salon_settings = get_salon_settings()
        levels = loyalty_service.get_all_levels()
        
        # Enriched FAQ logic (compacted)
        # We can add dynamic answers here based on salon settings
        for item in faqs:
            q = item.get('question', '').lower()
            # Dynamic logic for loyalty, payment, etc.
            # (Keeping it simple for now, but following the enriched pattern if needed)
            pass
            
    except Exception as e:
        log_error(f"Error enriching FAQ: {e}", "public_api")

    return {"success": True, "faq": faqs}

@router.api_route("/gallery", methods=["GET", "HEAD"])
def get_public_gallery(category: Optional[str] = None, language: str = "ru"):
    """Получить изображения галереи"""
    from utils.language_utils import validate_language
    lang_key = validate_language(language)
    
    # Special case: 'portfolio' on frontend means EVERYTHING except 'salon' interior
    # 'salon' means ONLY interior
    
    db_category = category
    if category == 'portfolio':
        db_category = None # Fetch all, then filter below
        
    images = get_active_gallery(language=lang_key, category=db_category)
    
    # Кеш отключен для мгновенного обновления
    
    # Filter manually if category was portfolio
    if category == 'portfolio':
        # Portfolio means everything except explicit 'salon' interior photos
        images = [img for img in images if img.get('category') != 'salon']
    elif category == 'salon':
        # Salon means ONLY explicit 'salon' interior photos
        images = [img for img in images if img.get('category') == 'salon']
    
    # Map for frontend compatibility
    results = []
    for img in images:
        raw_url = sanitize_url(img.get("image_url"))
        mapped_url = map_image_path(raw_url)
        results.append({
            "id": img.get("id"),
            "category": img.get("category"),
            "image_path": _add_v(mapped_url),
            "title": img.get("title") or "",
            "description": img.get("description") or ""
        })
    
    return {"success": True, "images": results}

@router.api_route("/banners", methods=["GET", "HEAD"])
def get_public_banners(language: str = "ru"):
    """Загрузить баннеры для лендинга с локализацией"""
    from utils.language_utils import validate_language, build_coalesce_query, get_dynamic_translation
    lang_key = validate_language(language)

    # Кеширование
    cache_key = f"public_banners_{lang_key}"
    cached_data = cache.get(cache_key)
    if cached_data:
        return cached_data

    conn = get_db_connection()
    c = conn.cursor()
    try:
        query = """
            SELECT 
                id, title, subtitle, 
                image_url, link_url,
                bg_pos_desktop_x, bg_pos_desktop_y,
                bg_pos_mobile_x, bg_pos_mobile_y,
                is_flipped_horizontal, is_flipped_vertical,
                display_order
            FROM public_banners 
            WHERE is_active = TRUE 
            ORDER BY display_order ASC
        """
        c.execute(query)
        columns = [desc[0] for desc in c.description]
        banners = []
        for row in c.fetchall():
            banner = dict(zip(columns, row))
            banner['image_url'] = sanitize_url(banner.get('image_url'))
            
            # Dynamic translation from JSON
            b_id = banner['id']
            banner['title'] = get_dynamic_translation('public_banners', b_id, 'title', lang_key, banner['title'])
            banner['subtitle'] = get_dynamic_translation('public_banners', b_id, 'subtitle', lang_key, banner['subtitle'])
            
            banners.append(banner)
            
    except Exception as e:
        log_error(f"Error fetching public banners: {e}")
        # Return empty list on error instead of failing
        banners = []
    finally:
        if conn:
            conn.close()
            
    res = {"success": True, "banners": banners}
    cache.set(cache_key, res, CACHE_TTL_MEDIUM)
    return res

# ============================================================================
# INITIAL LOAD
# ============================================================================

@router.api_route("/initial-load", methods=["GET", "HEAD"])
def get_initial_load(language: str = "ru"):
    """Объединенный endpoint для быстрой загрузки лендинга"""
    from api.seo_metadata import get_seo_metadata
    from utils.language_utils import validate_language
    
    lang_key = validate_language(language)
    
    # Кеширование на 5 минут
    cache_key = f"initial_load_{lang_key}"
    cached_data = cache.get(cache_key)
    if cached_data:
        # Добавляем версию для обхода кэша даже в кешированном ответе
        # (хотя лучше если это делает клиент, но мы поможем)
        return cached_data

    settings = get_salon_settings()
    
    # Banners
    banners_data = get_public_banners(language=lang_key)
    banners = banners_data.get("banners", [])
    for b in banners:
        b['image_url'] = map_image_path(b['image_url'])
        b['image_url'] = _add_v(b['image_url'])
    
    # Services
    services = get_public_services(language=lang_key)
    
    # FAQ & Reviews
    from utils.language_utils import get_dynamic_translation
    
    faqs = get_active_faq(language=lang_key)
    for item in faqs:
         item['question'] = get_dynamic_translation('public_faq', item['id'], 'question', lang_key, item['question'])
         item['answer'] = get_dynamic_translation('public_faq', item['id'], 'answer', lang_key, item['answer'])

    reviews = get_active_reviews(language=lang_key, limit=10)
    for item in reviews:
         item['text'] = get_dynamic_translation('public_reviews', item['id'], 'text', lang_key, item['text'])
         item['position'] = get_dynamic_translation('public_reviews', item['id'], 'employee_position', lang_key, item.get('position', ''))
    
    # SEO
    try:
        from api.seo_metadata import get_seo_metadata
        seo = get_seo_metadata()
    except:
        seo = {}
        
    localized_name = settings.get("name")
    localized_address = settings.get("address")
    
    # Результирующие часы из БД (теперь только базовое поле)
    localized_hours = settings.get("hours")
    if not localized_hours:
        hw = settings.get('hours_weekdays')
        he = settings.get('hours_weekends')
        localized_hours = f"{hw} / {he}" if hw != he else hw

    res = {
        "salon": {
            "name": localized_name,
            "phone": settings.get("phone"),
            "email": settings.get("email"),
            "address": localized_address,
            "instagram": settings.get("instagram"),
            "whatsapp": settings.get("whatsapp"),
            "logo_url": _add_v(settings.get("logo_url")),
            "currency": settings.get("currency", "AED"),
            "google_maps": settings.get("google_maps"),
            "map_url": settings.get("google_maps"),
            "google_maps_embed_url": _get_google_maps_embed_url(localized_address, settings.get("google_maps")),
            "hours": localized_hours,
            "custom_settings": settings.get("custom_settings", {})
        },
        "banners": banners,
        "seo": seo,
        "services": services,
        "faq": faqs,
        "reviews": reviews,
        "language": language
    }
    
    cache.set(cache_key, res, CACHE_TTL_MEDIUM)
    return res

# ============================================================================
# ACTIONS (BOOKING, CONTACT)
# ============================================================================

@router.post("/send-message")
def send_contact_message(form: ContactForm, background_tasks: BackgroundTasks):
    """Отправка сообщения с контактной формы"""
    log_info(f"📩 New message from {form.name}: {form.message}", "public_api")
    background_tasks.add_task(process_contact_notifications, form)
    return {"success": True, "message": "Message sent successfully"}

@router.post("/bookings")
def create_public_booking(data: BookingCreate, background_tasks: BackgroundTasks):
    from db.bookings import save_booking
    
    datetime_str = f"{data.date} {data.time}"
    master_name = None
    if data.employee_id:
        from db.employees import get_employee_by_id
        emp = get_employee_by_id(data.employee_id)
        if emp: master_name = emp['full_name']

    service_names = []
    for service_id in data.service_ids:
        service = get_service(service_id)
        if service: service_names.append(service.get('name', f'Service {service_id}'))
    
    services_str = ', '.join(service_names)
    
    try:
        booking_id = save_booking(
            instagram_id=data.phone,
            service=services_str,
            datetime_str=datetime_str,
            phone=data.phone,
            name=data.name,
            master=master_name,
            status='pending_confirmation',
            source=data.source or 'website'
        )
        
        log_info(f"📅 New public booking: {data.name} ({data.phone}) - Services: {services_str}", "public_api")
        background_tasks.add_task(notify_admin_new_booking, data, booking_id, services_str)
        return {"success": True, "booking_id": booking_id, "message": "Booking request received"}
    except Exception as e:
        log_error(f"Error creating booking: {e}", "public_api")
        raise HTTPException(status_code=500, detail=str(e))

def notify_admin_new_booking(data: BookingCreate, booking_id: int, services_str: str):
    """Уведомить админа о новой заявке"""
    from utils.email import send_email_sync
    from integrations.telegram_bot import send_telegram_alert
    import os
    import asyncio
    
    admin_email = os.getenv('FROM_EMAIL') or os.getenv('SMTP_USERNAME')
    source_display = "Landing Page" if data.source == 'public_landing' else "Website"
    
    subject = f"📅 Новая заявка на запись: {data.name}"
    message = (
        f"Имя: {data.name}\n"
        f"Телефон: {data.phone}\n"
        f"Услуги: {services_str}\n"
        f"Дата: {data.date} {data.time}\n"
        f"Источник: {source_display}\n"
    )
    
    if admin_email:
        try:
             send_email_sync([admin_email], subject, message)
        except: pass
             
    try:
        tg_msg = (
            f"📅 <b>NEW BOOKING REQUEST</b>\n"
            f"━━━━━━━━━━━━━━━━━━\n"
            f"👤 <b>Client:</b> {data.name}\n"
            f"📞 <b>Phone:</b> <code>{data.phone}</code>\n"
            f"🕒 <b>Time:</b> {data.date} at {data.time}\n"
            f"💅 <b>Services:</b>\n{services_str}\n"
            f"━━━━━━━━━━━━━━━━━━\n"
            f"Source: {source_display}"
        )
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        loop.run_until_complete(send_telegram_alert(tg_msg))
        loop.close()
    except: pass

def process_contact_notifications(form: ContactForm):
    """Обработка уведомлений о сообщении"""
    from utils.email import send_email_sync
    from integrations.telegram_bot import send_telegram_alert
    import os
    import asyncio
    
    admin_email = os.getenv('FROM_EMAIL') or os.getenv('SMTP_USERNAME')
    
    if admin_email:
        subject = f"📩 Новое сообщение с сайта: {form.name}"
        msg = f"Имя: {form.name}\nEmail: {form.email}\nСообщение:\n{form.message}"
        try:
            send_email_sync([admin_email], subject, msg)
        except: pass
    
    try:
        tg_msg = f"📩 <b>New Message</b>\n\n<b>From:</b> {form.name}\n<b>Email:</b> {form.email}\n\n<b>Message:</b>\n{form.message}"
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        loop.run_until_complete(send_telegram_alert(tg_msg))
        loop.close()
    except: pass