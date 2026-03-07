from fastapi import APIRouter, HTTPException, BackgroundTasks, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel, validator
from typing import Optional, List, Dict
import time
import urllib.parse
from datetime import datetime, timedelta, date

from db.settings import get_salon_settings
from db.services import get_all_services
from db.connection import get_db_connection
from utils.utils import sanitize_url, map_image_path, _add_v
from utils.cache import cache
from utils.logger import log_info, log_error
from core.config import is_localhost
from utils.currency import get_salon_currency

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

CATEGORY_ALIASES = {
    "брови": "brows",
    "brows": "brows",
    "eyebrows": "brows",
    "комбо": "combo",
    "combo": "combo",
    "косметология": "cosmetology",
    "cosmetology": "cosmetology",
    "уход за волосами": "hair_care",
    "hair care": "hair_care",
    "hair_care": "hair_care",
    "окрашивание волос": "hair_color",
    "hair color": "hair_color",
    "hair_color": "hair_color",
    "стрижка": "hair_cut",
    "hair cut": "hair_cut",
    "haircut": "hair_cut",
    "hair cutting": "hair_cut",
    "hair_cut": "hair_cut",
    "укладка": "hair_styling",
    "hair styling": "hair_styling",
    "hair_styling": "hair_styling",
    "styling": "hair_styling",
    "ресницы": "lashes",
    "lashes": "lashes",
    "eyelashes": "lashes",
    "маникюр": "manicure",
    "manicure": "manicure",
    "массаж": "massage",
    "massage": "massage",
    "ногти": "nails",
    "nails": "nails",
    "педикюр": "pedicure",
    "pedicure": "pedicure",
    "перманентный макияж": "permanent_makeup",
    "permanent makeup": "permanent_makeup",
    "permanent_makeup": "permanent_makeup",
    "спа": "spa",
    "spa": "spa",
    "ваксинг": "waxing",
    "депиляция": "waxing",
    "депиляция воском": "waxing",
    "waxing": "waxing",
}


def _canonical_category_key(raw_category: str) -> str:
    """Map noisy DB category values to stable i18n keys."""
    if not raw_category:
        return ""

    normalized = re.sub(r"\s+", " ", str(raw_category).strip().lower())
    alias = CATEGORY_ALIASES.get(normalized)
    if alias:
        return alias

    normalized_ascii = re.sub(r"[^a-z0-9]+", "_", normalized).strip("_")
    return CATEGORY_ALIASES.get(normalized_ascii, normalized_ascii)

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


def _localize_public_reviews(reviews: List[Dict], lang_key: str) -> None:
    from utils.language_utils import get_dynamic_translation

    for item in reviews:
        translated_position = get_dynamic_translation(
            'public_reviews',
            item['id'],
            'employee_position',
            lang_key,
            item.get('employee_position', ''),
        )
        item['text'] = get_dynamic_translation('public_reviews', item['id'], 'text', lang_key, item['text'])
        item['employee_position'] = translated_position
        item['position'] = translated_position

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
        _localize_public_reviews(reviews, lang_key)

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
            "currency": settings.get("currency", get_salon_currency()),
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
    from utils.language_utils import (
        validate_language,
        get_localized_name,
        translate_position,
        get_dynamic_translation,
        normalize_position_label,
    )
    
    conn = None
    try:
        lang_key = validate_language(language)
        
        cache_key = f"public_employees_{lang_key}"
        cached_data = cache.get(cache_key)
        if cached_data:
            return cached_data

        # Optional CRM integration: if available, use CRM as source of truth.
        from services.crm_integration import fetch_employees

        integrated_employees = fetch_employees(language=lang_key)
        if isinstance(integrated_employees, list):
            normalized_employees = []
            for employee in integrated_employees:
                if not isinstance(employee, dict):
                    continue

                employee_copy = dict(employee)
                raw_position = employee_copy.get("role") or employee_copy.get("position") or ""
                final_position = normalize_position_label(str(raw_position), lang_key)
                employee_copy["role"] = final_position
                employee_copy["position"] = final_position
                normalized_employees.append(employee_copy)

            cache.set(cache_key, normalized_employees, expire=CACHE_TTL_SHORT)
            return normalized_employees

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
            translated_position = get_dynamic_translation(
                'users',
                emp_id,
                'position',
                lang_key,
                translate_position(raw_position, lang_key),
            )
            final_position = normalize_position_label(translated_position, lang_key)

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
                "specialty": bio or specialization or "", # Prefer Bio (rich description) over tags (scanty)
                "bio": bio or "",
                "specialization": specialization or "",
                "image": final_photo,
                "photo": final_photo,
                "experience": exp_text.strip(),
                "age": calculate_age(row_dict.get("birthday")),
                "service_ids": services_map.get(emp_id, []),
                "sort_order": row_dict.get("sort_order") or 0
            })
            
        # De-duplicate by normalized name to handle cases where multiple records 
        # exist for same person with slightly different spellings or languages.
        unique_employees = {}
        
        def _get_norm_name(name):
            if not name: return ""
            # Simple normalization: lower case, only alphanumeric
            # Simple normalization: lower case, only alphanumeric (supports all languages)
            return "".join(c for c in name.lower() if c.isalnum())

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
                
                # Preserve lowest sort_order between duplicates
                min_sort_order = min(emp.get('sort_order', 0), existing.get('sort_order', 0))

                if score > ext_score:
                    # Merge data: take services from both
                    all_services = list(set(emp.get('service_ids', []) + existing.get('service_ids', [])))
                    emp['service_ids'] = all_services
                    emp['sort_order'] = min_sort_order
                    unique_employees[norm] = emp
                else:
                    # Merge data back to existing
                    all_services = list(set(emp.get('service_ids', []) + existing.get('service_ids', [])))
                    existing['service_ids'] = all_services
                    existing['sort_order'] = min_sort_order
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

    # Optional CRM integration: if available, use CRM as source of truth.
    from services.crm_integration import fetch_services

    integrated_services = fetch_services(language=lang_key)
    if isinstance(integrated_services, list):
        cache.set(cache_key, integrated_services, expire=CACHE_TTL_SHORT)
        return integrated_services
    
    services = get_all_services(active_only=True, include_positions=True)
    
    results = []
    for s in services:
        s_id = s.get("id")
        # Dynamic translation
        name = get_dynamic_translation('services', s_id, 'name', lang_key, s.get("name"))
        cat = s.get("category") or ""
        localized_cat = ""
        canonical_cat_key = _canonical_category_key(cat)
        if canonical_cat_key:
            localized_cat = get_dynamic_translation('categories', canonical_cat_key, '', lang_key, "")
            if (not localized_cat or localized_cat == canonical_cat_key) and "_" in canonical_cat_key:
                localized_cat = get_dynamic_translation('categories', canonical_cat_key.replace('_', '-'), '', lang_key, "")
        if not localized_cat:
            localized_cat = get_dynamic_translation('categories', cat, '', lang_key, "")
        if not localized_cat:
            localized_cat = cat
        
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
    from utils.language_utils import validate_language
    lang_key = validate_language(language)
    reviews = get_active_reviews(language=lang_key, limit=limit)

    _localize_public_reviews(reviews, lang_key)
         
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
    seen_image_paths = set()
    for img in images:
        raw_url = sanitize_url(img.get("image_url"))
        mapped_url = map_image_path(raw_url)
        dedupe_key = (mapped_url or "").strip().lower()
        if dedupe_key and dedupe_key in seen_image_paths:
            continue
        if dedupe_key:
            seen_image_paths.add(dedupe_key)
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
            banner['image_url'] = map_image_path(sanitize_url(banner.get('image_url')))
            
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
    from site_api.seo_metadata import get_seo_metadata
    from services.crm_integration import get_integration_status
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
    _localize_public_reviews(reviews, lang_key)
    
    # SEO
    try:
        from site_api.seo_metadata import get_seo_metadata
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
            "currency": settings.get("currency", get_salon_currency()),
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
        "language": language,
        "integration": get_integration_status(),
    }
    
    cache.set(cache_key, res, CACHE_TTL_MEDIUM)
    return res


@router.api_route("/integration-status", methods=["GET", "HEAD"])
def get_public_integration_status():
    from services.crm_integration import get_integration_status

    status = get_integration_status()
    return {"success": True, "integration": status}

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
    from services.master_schedule import MasterScheduleService
    from services.crm_integration import (
        create_booking as create_crm_integration_booking,
        get_integration_status,
        is_crm_integration_enabled,
        is_crm_integration_strict,
    )
    from utils.duration_utils import parse_duration_to_minutes

    # Optional CRM integration: try remote CRM booking first.
    booking_payload = data.model_dump() if hasattr(data, "model_dump") else data.dict()
    integration_status_code, integration_payload = create_crm_integration_booking(booking_payload)
    if integration_status_code is not None and isinstance(integration_payload, dict):
        if 200 <= integration_status_code < 300:
            return integration_payload

        if integration_status_code == 409:
            return JSONResponse(integration_payload, status_code=409)

        if integration_status_code in {400, 422}:
            if "detail" in integration_payload:
                raise HTTPException(status_code=integration_status_code, detail=integration_payload["detail"])
            raise HTTPException(status_code=integration_status_code, detail="Invalid booking payload")

        log_info(
            f"CRM integration booking returned status {integration_status_code}, fallback to local booking flow",
            "public_api",
        )

        if is_crm_integration_enabled() and is_crm_integration_strict():
            return JSONResponse(
                {
                    "error": "integration_unavailable",
                    "message": "CRM integration is unavailable",
                    "integration": get_integration_status(),
                },
                status_code=503,
            )

    if (
        integration_status_code is None
        and is_crm_integration_enabled()
        and is_crm_integration_strict()
    ):
        return JSONResponse(
            {
                "error": "integration_unavailable",
                "message": "CRM integration is unavailable",
                "integration": get_integration_status(),
            },
            status_code=503,
        )

    datetime_str = f"{data.date} {data.time}"
    requested_service_ids = list(dict.fromkeys([int(sid) for sid in data.service_ids if isinstance(sid, int) and sid > 0]))
    if len(requested_service_ids) == 0:
        raise HTTPException(status_code=400, detail="No valid service IDs provided")

    services_str = ""
    total_duration_minutes = 60
    selected_master_id: Optional[int] = None
    try:
        conn = get_db_connection()
        c = conn.cursor()
        try:
            c.execute(
                """
                SELECT id, name, duration
                FROM services
                WHERE id = ANY(%s)
                  AND is_active = TRUE
                """,
                (requested_service_ids,),
            )
            service_rows = c.fetchall() or []
            service_by_id = {int(row[0]): row for row in service_rows if row and row[0] is not None}

            service_names: List[str] = []
            total_duration_minutes = 0
            for service_id in requested_service_ids:
                service_row = service_by_id.get(service_id)
                if service_row is None:
                    continue
                service_names.append(str(service_row[1]))
                parsed_duration = parse_duration_to_minutes(service_row[2])
                total_duration_minutes += parsed_duration if parsed_duration and parsed_duration > 0 else 60

            if len(service_names) == 0:
                raise HTTPException(status_code=400, detail="No active services found for booking")

            services_str = ", ".join(service_names)
            total_duration_minutes = max(1, total_duration_minutes)

            candidate_master_ids: List[int] = []
            if data.employee_id is not None:
                c.execute(
                    """
                    SELECT id
                    FROM users
                    WHERE id = %s
                      AND is_active = TRUE
                      AND is_service_provider = TRUE
                      AND deleted_at IS NULL
                    LIMIT 1
                    """,
                    (data.employee_id,),
                )
                employee_row = c.fetchone()
                if not employee_row:
                    raise ValueError("slot_unavailable:master_not_found")

                c.execute(
                    """
                    SELECT user_id
                    FROM user_services
                    WHERE user_id = %s
                      AND service_id = ANY(%s)
                    GROUP BY user_id
                    HAVING COUNT(DISTINCT service_id) = %s
                    """,
                    (int(employee_row[0]), requested_service_ids, len(requested_service_ids)),
                )
                if not c.fetchone():
                    raise ValueError("slot_unavailable:master_services_mismatch")

                candidate_master_ids = [int(employee_row[0])]
            else:
                c.execute(
                    """
                    SELECT u.id
                    FROM users u
                    INNER JOIN user_services us ON us.user_id = u.id
                    WHERE u.is_active = TRUE
                      AND u.is_service_provider = TRUE
                      AND u.is_public_visible = TRUE
                      AND u.deleted_at IS NULL
                      AND u.role != 'director'
                      AND us.service_id = ANY(%s)
                    GROUP BY u.id, u.sort_order, u.full_name
                    HAVING COUNT(DISTINCT us.service_id) = %s
                    ORDER BY u.sort_order ASC NULLS LAST, u.full_name ASC NULLS LAST
                    """,
                    (requested_service_ids, len(requested_service_ids)),
                )
                candidate_master_ids = [int(row[0]) for row in (c.fetchall() or []) if row and row[0] is not None]
                if len(candidate_master_ids) == 0:
                    raise ValueError("slot_unavailable:no_master_for_services")

            schedule_service = MasterScheduleService()
            last_reason = "unavailable"

            for master_id in candidate_master_ids:
                availability = schedule_service.validate_slot(
                    master_name=str(master_id),
                    date=data.date,
                    time_str=data.time,
                    duration_minutes=total_duration_minutes,
                )
                if availability.get("is_available"):
                    selected_master_id = master_id
                    break
                reason = availability.get("reason")
                if isinstance(reason, str) and reason.strip():
                    last_reason = reason.strip()

            if selected_master_id is None:
                if data.employee_id is not None:
                    raise ValueError(f"slot_unavailable:{last_reason}")
                raise ValueError("slot_unavailable:no_master_available")
        finally:
            conn.close()

        booking_id = save_booking(
            instagram_id=data.phone,
            service=services_str,
            datetime_str=datetime_str,
            phone=data.phone,
            name=data.name,
            master=str(selected_master_id),
            status='pending_confirmation',
            source=data.source or 'website',
            duration_minutes=total_duration_minutes,
        )
        
        log_info(f"📅 New public booking: {data.name} ({data.phone}) - Services: {services_str}", "public_api")
        background_tasks.add_task(notify_admin_new_booking, data, booking_id, services_str)
        return {"success": True, "booking_id": booking_id, "message": "Booking request received"}
    except ValueError as e:
        message = str(e)
        if message.startswith("slot_unavailable:"):
            reason = message.split(":", 1)[1] or "unavailable"
            return JSONResponse(
                {
                    "error": "slot_unavailable",
                    "reason": reason
                },
                status_code=409,
            )
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        log_error(f"Error creating booking: {e}", "public_api")
        raise HTTPException(status_code=500, detail=str(e))

def notify_admin_new_booking(data: BookingCreate, booking_id: int, services_str: str):
    """Уведомить админа о новой заявке"""
    from utils.email import send_email_sync
    import os
    
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
        except Exception as e:
            log_error(f"Booking notification email failed: {e}", "public")

def process_contact_notifications(form: ContactForm):
    """Обработка уведомлений о сообщении"""
    from utils.email import send_email_sync
    import os
    
    admin_email = os.getenv('FROM_EMAIL') or os.getenv('SMTP_USERNAME')
    
    if admin_email:
        subject = f"📩 Новое сообщение с сайта: {form.name}"
        msg = f"Имя: {form.name}\nEmail: {form.email}\nСообщение:\n{form.message}"
        try:
            send_email_sync([admin_email], subject, msg)
        except Exception as e:
            log_error(f"Contact form notification email failed: {e}", "public")
