from fastapi import APIRouter, HTTPException, BackgroundTasks, Query
from pydantic import BaseModel, validator
from typing import Optional, List, Dict
import time
from datetime import datetime, timedelta, date

from db.settings import get_salon_settings
from db.services import get_all_services, get_service
from db.connection import get_db_connection
from utils.utils import sanitize_url
from utils.cache import cache
from utils.logger import log_info, log_error

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
        cache_key = f"public:salon_info:{lang_key}"
        cached = cache.get(cache_key)
        if cached:
            return cached

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

        faq_items = get_active_faq(language=lang_key)
        reviews = get_active_reviews(language=lang_key, limit=10)

        # Google Maps Embed logic
        gm_raw = settings.get("google_maps", "")
        gm_embed = ""
        
        # 1. Если уже есть ссылка для вставки (embed), используем её как есть
        if gm_raw and "google.com/maps/embed" in gm_raw:
            gm_embed = gm_raw
        
        # 2. Попытка конвертировать обычную ссылку в embed
        if not gm_embed and gm_raw:
            import re
            # Проверка на google.ru, google.com, google.ae и т.д.
            if re.search(r'google\.[a-z.]+/maps', gm_raw) or "maps.google" in gm_raw:
                # Прямая генерация embed ссылки по адресу через официальный (но иногда платный) API
                # или через проверенный хак с /maps?q={address}&output=embed
                gm_embed = f"https://maps.google.com/maps?q={localized_address or gm_raw}&output=embed"
            elif gm_raw.startswith("http") and ("google" in gm_raw or "maps" in gm_raw):
                gm_embed = f"https://maps.google.com/maps?q={localized_address or gm_raw}&output=embed"
        
        # 3. Резервный вариант по адресу, если ссылка в настройках некорректная
        if not gm_embed:
            gm_embed = f"https://maps.google.com/maps?q={localized_address}&output=embed"

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
            "logo_url": settings.get("logo_url"),
            "google_maps": gm_raw,
            "google_maps_embed_url": gm_embed,
            "map_url": gm_raw,
            "booking_url": settings.get("booking_url"),
            "currency": settings.get("currency", "AED"),
            "faq": faq_items,
            "reviews": reviews,
            "custom_settings": settings.get("custom_settings", {})
        }

        cache.set(cache_key, result, expire=300)  # 5 min cache
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
    from utils.language_utils import validate_language, build_coalesce_query, get_language_field_name
    
    conn = None
    try:
        lang_key = validate_language(language)
        cache_key = f"public:employees:{lang_key}"
        cached = cache.get(cache_key)
        if cached:
            return cached

        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Оптимизированный запрос с COALESCE на все 9 языков через универсальную функцию
        name_coalesce = build_coalesce_query('full_name', lang_key)
        pos_coalesce = build_coalesce_query('position', lang_key)
        bio_coalesce = build_coalesce_query('bio', lang_key, include_base=False)
        spec_coalesce = build_coalesce_query('specialization', lang_key, include_base=False)

        query = f"""
            SELECT
                u.id,
                {name_coalesce} as full_name,
                {pos_coalesce} as position,
                {bio_coalesce} as bio,
                {spec_coalesce} as specialization,
                u.photo,
                u.experience,
                u.years_of_experience,
                u.birthday,
                u.sort_order,
                u.updated_at
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
            
            years = row_dict.get("years_of_experience")
            if years:
                if lang_key == 'ru':
                    plural = get_russian_plural(years, "год", "года", "лет")
                    exp_text = f"{years} {plural} опыта"
                else:
                    exp_text = f"{years} years experience"
            else:
                exp_text = row_dict.get("experience") or ""

            photo_url = sanitize_url(row_dict.get("photo")) or "/static/avatars/default_female.webp"
            ts = int(row_dict["updated_at"].timestamp()) if row_dict["updated_at"] else int(time.time())
            final_photo = f"{photo_url}{'?' if '?' not in photo_url else '&'}v={ts}"

            employees.append({
                "id": emp_id,
                "name": row_dict["full_name"],
                "full_name": row_dict["full_name"],
                "role": row_dict["position"] or "Specialist",
                "position": row_dict["position"] or "Specialist",
                "specialty": row_dict["specialization"] or row_dict["bio"] or "",
                "image": final_photo,
                "photo": final_photo,
                "experience": exp_text.strip(),
                "age": calculate_age(row_dict.get("birthday")),
                "service_ids": services_map.get(emp_id, [])
            })
        
        cache.set(cache_key, employees, CACHE_TTL_MEDIUM)
        return employees
    except Exception as e:
        log_error(f"Error fetching employees: {e}", "public_api")
        return []
    finally:
        if conn:
            conn.close()

# ============================================================================
# SERVICES
# ============================================================================

def get_public_services(language: str = "ru"):
    """Все услуги локализованные (внутренняя функция)"""
    from utils.language_utils import validate_language
    lang_key = validate_language(language)
    services = get_all_services(active_only=True, include_positions=True)
    
    results = []
    for s in services:
        item = {
            "id": s.get("id"),
            "name": s.get("name"),
            "description": s.get("description"),
            "price": s.get("price"),
            "currency": s.get("currency"),
            "category": s.get("category"),
            "duration": s.get("duration"),
            "service_key": s.get("service_key"),
            "positions": s.get("positions", [])
        }
        results.append(item)
    return results

@router.api_route("/services", methods=["GET", "HEAD"])
def get_public_services_endpoint(language: str = "ru"):
    """API endpoint для получения списка услуг"""
    services = get_public_services(language=language)
    return {"success": True, "services": services}

# ============================================================================
# CONTENT (REVIEWS, FAQ, GALLERY)
# ============================================================================

@router.api_route("/reviews", methods=["GET", "HEAD"])
def get_public_reviews_list(language: str = "ru", limit: int = 10):
    """Список отзывов локализованные"""
    from utils.language_utils import validate_language
    lang_key = validate_language(language)
    reviews = get_active_reviews(language=lang_key, limit=limit)
    return {"success": True, "reviews": reviews}

@router.api_route("/faq", methods=["GET", "HEAD"])
def get_public_faq_list(language: str = "ru"):
    """Список FAQ локализованные"""
    from utils.language_utils import validate_language
    lang_key = validate_language(language)
    faqs = get_active_faq(language=lang_key)
    
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
    images = get_active_gallery(language=lang_key, category=category)
    
    # Map for frontend compatibility
    results = []
    for img in images:
        results.append({
            "id": img.get("id"),
            "category": img.get("category"),
            "image_path": sanitize_url(img.get("image_url")),
            "title": img.get("title") or "",
            "description": img.get("description") or ""
        })
    return {"success": True, "images": results}

@router.api_route("/banners", methods=["GET", "HEAD"])
def get_public_banners(language: str = "ru"):
    """Загрузить баннеры для лендинга с локализацией"""
    from utils.language_utils import validate_language, build_coalesce_query
    lang_key = validate_language(language)
    conn = get_db_connection()
    c = conn.cursor()
    try:
        title_expr = build_coalesce_query('title', lang_key, include_base=False)
        subtitle_expr = build_coalesce_query('subtitle', lang_key, include_base=False)
        
        query = f"""
            SELECT 
                id, 
                {title_expr} as title, 
                {subtitle_expr} as subtitle, 
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
            banners.append(banner)
        return {"success": True, "banners": banners}
    except Exception as e:
        log_error(f"Error fetching banners: {e}", "api")
        return {"success": False, "banners": []}
    finally:
        if conn:
            conn.close()

# ============================================================================
# INITIAL LOAD
# ============================================================================

@router.api_route("/initial-load", methods=["GET", "HEAD"])
def get_initial_load(language: str = "ru"):
    """Объединенный endpoint для быстрой загрузки лендинга"""
    from api.seo_metadata import get_seo_metadata
    from utils.language_utils import validate_language, get_language_field_name
    
    lang_key = validate_language(language)
    settings = get_salon_settings()
    
    # Banners
    banners_data = get_public_banners(language=lang_key)
    banners = banners_data.get("banners", [])
    
    # Services
    services = get_public_services(language=lang_key)
    
    # FAQ & Reviews
    faqs = get_active_faq(language=lang_key)
    reviews = get_active_reviews(language=lang_key, limit=10)
    
    # SEO
    try:
        from api.seo_metadata import get_seo_metadata
        seo = get_seo_metadata()
    except:
        seo = {}
        
    localized_name = settings.get(get_language_field_name("name", lang_key)) or settings.get("name")
    localized_address = settings.get(get_language_field_name("address", lang_key)) or settings.get("address")
    
    # Локализованные часы из БД
    hours_field = get_language_field_name("hours", lang_key)
    localized_hours = settings.get(hours_field)
    if not localized_hours:
        hw = settings.get('hours_weekdays')
        he = settings.get('hours_weekends')
        localized_hours = f"{hw} / {he}" if hw != he else hw

    return {
        "salon": {
            "name": localized_name,
            "phone": settings.get("phone"),
            "email": settings.get("email"),
            "address": localized_address,
            "instagram": settings.get("instagram"),
            "whatsapp": settings.get("whatsapp"),
            "logo_url": settings.get("logo_url"),
            "currency": settings.get("currency", "AED"),
            "google_maps": settings.get("google_maps"),
            "map_url": settings.get("google_maps"),
            "google_maps_embed_url": settings.get("google_maps"),
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