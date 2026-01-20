"""
Публичные API endpoints (без авторизации)
"""
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel, validator
from typing import Optional, List
from datetime import datetime, timedelta

from db.settings import get_salon_settings
from db.services import get_all_services
from db.employees import get_all_employees
from core.config import DATABASE_NAME
from db.connection import get_db_connection
from services.reviews import reviews_service
from utils.utils import sanitize_url

router = APIRouter(tags=["Public"])

# ============================================================================
# MODELS
# ============================================================================

class BookingCreate(BaseModel):
    service_ids: List[int]  # Список ID услуг
    employee_id: Optional[int] = None
    date: str  # YYYY-MM-DD
    time: str  # HH:MM
    name: str
    phone: str
    email: Optional[str] = None
    notes: Optional[str] = None
    source: Optional[str] = 'website'  # Источник: 'public_landing', 'client_cabinet' и т.д.
    
    @validator('phone')
    def validate_phone(cls, v):
        # Удаляем все нецифровые символы для проверки
        digits_only = ''.join(filter(str.isdigit, v))
        if len(digits_only) < 11:
            raise ValueError('phone_too_short')  # Передаем ключ для фронтенда
        return v

class ContactForm(BaseModel):
    name: str
    email: Optional[str] = None
    message: str

@router.get("/salon-settings")
def get_public_salon_settings():
    """Получить публичную информацию о салоне (контакты, адрес)"""
    from utils.logger import log_error
    
    try:
        settings = get_salon_settings()
        if not settings:
            return {
                "phone": None,
                "email": None,
                "address": None,
                "whatsapp": None,
                "instagram": None,
                "google_maps": None,
                "name": None,
                "logo_url": None
            }
        
        return {
            "phone": settings.get("phone"),
            "email": settings.get("email"),
            "address": settings.get("address"),
            "whatsapp": settings.get("whatsapp"),
            "instagram": settings.get("instagram"),
            "google_maps": settings.get("google_maps"),
            "name": settings.get("name"),
            "currency": settings.get("currency", "AED"),
            "logo_url": settings.get("logo_url")
        }
    except Exception as e:
        log_error(f"Error fetching salon settings: {e}", "public_api")
        return {"error": str(e)}

@router.post("/send-message")
def send_contact_message(form: ContactForm, background_tasks: BackgroundTasks):

    """Отправка сообщения с контактной формы"""
    from utils.logger import log_info, log_error
    
    # Логируем
    log_info(f"📩 New message from {form.name}: {form.message}", "public_api")
    
    # Добавляем задачу в фон для отправки уведомлений
    background_tasks.add_task(process_contact_notifications, form)
    
    # Сразу возвращаем успешный ответ
    return {"success": True, "message": "Message sent successfully"}

@router.post("/bookings")
def create_public_booking(data: BookingCreate, background_tasks: BackgroundTasks):
    """
    Создать заявку на запись (публично).
    Статус автоматически устанавливается в 'pending_confirmation'.
    """
    from db.bookings import save_booking
    from utils.logger import log_info, log_error
    
    # 1. Сохраняем в БД со статусом pending_confirmation
    # Формируем datetime string
    datetime_str = f"{data.date} {data.time}"
    
    # Получаем имя мастера если есть ID
    master_name = None
    if data.employee_id:
        from db.employees import get_employee_by_id
        emp = get_employee_by_id(data.employee_id)
        if emp:
            master_name = emp['full_name']

    try:
        # Получаем названия услуг по их ID
        from db.services import get_service_by_id
        service_names = []
        for service_id in data.service_ids:
            service = get_service_by_id(service_id)
            if service:
                service_names.append(service.get('name', f'Service #{service_id}'))
        
        # Формируем строку с услугами
        services_str = ', '.join(service_names) if service_names else 'Не указано'
        
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
        
        # 2. Логирование
        log_info(f"📅 New public booking: {data.name} ({data.phone}) - Services: {services_str}", "public_api")
        
        # 3. Уведомление администратора
        background_tasks.add_task(notify_admin_new_booking, data, booking_id, services_str)
        
        return {"success": True, "booking_id": booking_id, "message": "Booking request received"}
        
    except ValueError as ve:
        log_error(f"Validation error in public booking: {ve}", "public_api")
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        log_error(f"Error creating public booking: {e}", "public_api")
        raise HTTPException(status_code=500, detail="Failed to create booking")

def notify_admin_new_booking(data: BookingCreate, booking_id: int, services_str: str):
    """Уведомить админа о новой заявке"""
    from utils.email import send_email_sync
    from integrations.telegram_bot import send_telegram_alert
    import os
    import asyncio
    
    admin_email = os.getenv('FROM_EMAIL') or os.getenv('SMTP_USERNAME')
    
    # Красивое имя источника
    source_display = "🌐 Веб-сайт"
    if data.source == 'public_landing':
        source_display = "🏠 Лендинг (Главная)"
    elif data.source == 'client_cabinet':
        source_display = "👤 Личный кабинет"
    
    subject = f"📅 Новая заявка на запись: {data.name}"
    message = (
        f"Имя: {data.name}\n"
        f"Телефон: {data.phone}\n"
        f"Услуги: {services_str}\n"
        f"Дата: {data.date} {data.time}\n"
        f"Источник: {source_display}\n"
        f"Статус: Ожидает подтверждения"
    )
    
    # Email
    if admin_email:
        try:
             send_email_sync([admin_email], subject, message)
        except Exception as e:
             print(f"🔧 Error sending email: {e}")
             
    # Telegram
    try:
        # Форматируем список услуг более красиво для Telegram
        formatted_services = "\n".join([f"  • {s.strip()}" for s in services_str.split(',')])
        
        # Красивое имя источника для TG
        source_emoji = "🌐"
        source_text = "Веб-сайт"
        if data.source == 'public_landing':
            source_emoji = "🏠"
            source_text = "Лендинг (Главная)"
        elif data.source == 'client_cabinet':
            source_emoji = "👤"
            source_text = "Личный кабинет"

        tg_msg = (
            f"📅 <b>Новая заявка на запись!</b>\n"
            f"━━━━━━━━━━━━━━━━━━\n"
            f"👤 <b>Имя:</b> {data.name}\n"
            f"📞 <b>Телефон:</b> <code>{data.phone}</code>\n"
            f"🕒 <b>Время:</b> {data.date} в {data.time}\n"
            f"💅 <b>Услуги:</b>\n{formatted_services}\n"
            f"━━━━━━━━━━━━━━━━━━\n"
            f"⚠️ <b>Статус:</b> ⏳ Ожидает подтверждения\n"
            f"{source_emoji} <b>Источник:</b> {source_text}"
        )
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        loop.run_until_complete(send_telegram_alert(tg_msg))
        loop.close()
    except Exception as e:
        print(f"🔧 Error sending telegram: {e}")

def process_contact_notifications(form: ContactForm):
    """Обработка уведомлений в фоновом режиме"""
    from utils.logger import log_info, log_error
    from utils.email import send_email_sync
    from integrations.telegram_bot import send_telegram_alert
    import os
    import asyncio
    
    # 1. Получаем email администратора
    admin_email = os.getenv('FROM_EMAIL') or os.getenv('SMTP_USERNAME')
    
    # 2. Отправляем email администратору
    if admin_email:
        subject = f"📩 Новая заявка с сайта: {form.name}"
        message_text = (
            f"Имя: {form.name}\n"
            f"Email: {form.email or 'Не указан'}\n"
            f"Сообщение:\n{form.message}"
        )
        send_email_sync([admin_email], subject, message_text)
        log_info(f"Admin notification sent to {admin_email}", "public_api")
    
    # 3. Отправляем подтверждение пользователю
    if form.email:
        # Получаем название салона из настроек
        from db.settings import get_salon_settings
        salon_settings = get_salon_settings()
        salon_name = salon_settings.get('name', 'Beauty Salon')
        
        user_subject = f"Ваша заявка принята | {salon_name}"
        user_message = (
            f"Здравствуйте, {form.name}!\n\n"
            f"Спасибо за ваше обращение. Мы получили вашу заявку и свяжемся с вами в ближайшее время.\n\n"
            f"С уважением,\nКоманда {salon_name}"
        )
        send_email_sync([form.email], user_subject, user_message)
    
    # 4. Отправляем уведомление в Telegram
    try:
        telegram_message = (
            f"📩 <b>Новая заявка с сайта!</b>\n\n"
            f"👤 <b>Имя:</b> {form.name}\n"
            f"📧 <b>Email:</b> {form.email or 'Не указан'}\n\n"
            f"📝 <b>Сообщение:</b>\n{form.message}"
        )
        
        # send_telegram_alert is async, so we need to run it in an event loop
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        telegram_result = loop.run_until_complete(send_telegram_alert(telegram_message))
        loop.close()
        
        if telegram_result.get("success"):
            log_info("Telegram notification sent successfully", "public_api")
        else:
            log_error(f"Failed to send Telegram notification: {telegram_result.get('error')}", "public_api")
    except Exception as e:
        log_error(f"Error sending Telegram notification: {e}", "public_api")

@router.get("/services")
def get_public_services():
    """Публичный список активных услуг"""
    services = get_all_services(active_only=True)
    from utils.utils import sanitize_url

    return [
        {
            "id": s[0],  # id
            "name": s[2],  # name (English)
            "name_ru": s[3] if len(s) > 3 else None,
            "name_ar": s[4] if len(s) > 4 else None,
            "name_en": s[20] if len(s) > 20 else None,
            "name_de": s[21] if len(s) > 21 else None,
            "name_es": s[22] if len(s) > 22 else None,
            "name_fr": s[23] if len(s) > 23 else None,
            "name_hi": s[24] if len(s) > 24 else None,
            "name_kk": s[25] if len(s) > 25 else None,
            "name_pt": s[26] if len(s) > 26 else None,
            "price": s[5],  # price
            "currency": s[8],  # currency
            "category": s[9],  # category
            "duration": s[15],  # duration in minutes
            "duration_ru": s[34] if len(s) > 34 else None,
            "duration_en": s[35] if len(s) > 35 else None,
            "duration_ar": s[36] if len(s) > 36 else None,
            "duration_de": s[37] if len(s) > 37 else None,
            "duration_es": s[38] if len(s) > 38 else None,
            "duration_fr": s[39] if len(s) > 39 else None,
            "duration_hi": s[40] if len(s) > 40 else None,
            "duration_kk": s[41] if len(s) > 41 else None,
            "duration_pt": s[42] if len(s) > 42 else None,
            "description": s[10] or "",  # description
            "description_ru": s[11] if len(s) > 11 else None,
            "description_ar": s[12] if len(s) > 12 else None,
            "description_en": s[27] if len(s) > 27 else None,
            "description_de": s[28] if len(s) > 28 else None,
            "description_es": s[29] if len(s) > 29 else None,
            "description_fr": s[30] if len(s) > 30 else None,
            "description_hi": s[31] if len(s) > 31 else None,
            "description_kk": s[32] if len(s) > 32 else None,
            "description_pt": s[33] if len(s) > 33 else None
        } for s in services
    ]

@router.get("/available-slots")
def get_available_slots(
    date: str,
    employee_id: Optional[int] = None,
    service_id: Optional[int] = None
):
    """
    Получить доступные слоты для записи на конкретную дату.
    Использует MasterScheduleService для учета расписания мастеров.
    """
    from services.master_schedule import MasterScheduleService
    schedule_service = MasterScheduleService()
    
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        if employee_id:
            # Получаем имя мастера
            c.execute("SELECT full_name FROM users WHERE id = %s", (employee_id,))
            master_row = c.fetchone()
            if not master_row:
                return {"date": date, "slots": []}
            
            master_name = master_row[0]
            # Получаем слоты для конкретного мастера
            slots = schedule_service.get_available_slots(master_name, date, duration_minutes=30, return_metadata=True)
            
            # Преобразуем формат
            return {
                "date": date,
                "slots": [{"time": s["time"], "available": True} for s in slots]
            }
        else:
            # Глобальный поиск: объединяем слоты всех мастеров
            all_slots_with_status = []
            
            # Получаем рабочие часы салона для формирования полного списка времени
            from db.settings import get_salon_settings
            settings = get_salon_settings()
            hours_str = settings.get('hours_weekdays', "10:30 - 21:00")
            
            try:
                parts = hours_str.split('-')
                start_h, start_m = map(int, parts[0].strip().split(':'))
                end_h, end_m = map(int, parts[1].strip().split(':'))
            except:
                start_h, start_m = 10, 30
                end_h, end_m = 21, 0
                
            # Получаем доступность всех мастеров
            availability = schedule_service.get_all_masters_availability(date, duration_minutes=30)
            
            # Собираем все доступные времена в Set
            all_available_times = set()
            for master_slots in availability.values():
                for slot in master_slots:
                    # slots are strings in get_all_masters_availability if return_metadata=False
                    all_available_times.add(slot)
            
            # Генерируем полный список слотов по расписанию салона
            curr_h, curr_m = start_h, start_m
            while curr_h < end_h or (curr_h == end_h and curr_m < end_m):
                time_slot = f"{curr_h:02d}:{curr_m:02d}"
                all_slots_with_status.append({
                    "time": time_slot,
                    "available": time_slot in all_available_times
                })
                
                curr_m += 30
                if curr_m >= 60:
                    curr_m = 0
                    curr_h += 1
                    
            return {"date": date, "slots": all_slots_with_status}
            
    except Exception as e:
        from utils.logger import log_error
        log_error(f"Error in get_available_slots: {e}", "public_api")
        return {"date": date, "slots": [], "error": str(e)}
    finally:
        conn.close()

def check_slot_availability(date: str, time: str, employee_id: Optional[int] = None) -> bool:
    """
    Проверить доступность слота.
    
    Args:
        date: Дата в формате YYYY-MM-DD
        time: Время в формате HH:MM
        employee_id: ID сотрудника (опционально). Если указан, проверяем занятость этого мастера.
                     Если не указан (Date First flow), слот считается доступным если есть хотя бы
                     один свободный мастер.
    
    Returns:
        True если слот доступен, False если занят
    """
    conn = get_db_connection()
    c = conn.cursor()

    datetime_str = f"{date} {time}"

    if employee_id:
        # Получаем имя мастера по ID
        c.execute("SELECT full_name FROM users WHERE id = %s", (employee_id,))
        master_row = c.fetchone()
        
        if master_row:
            master_name = master_row[0]
            # Проверяем, есть ли запись на это время для этого мастера
            c.execute("""
                SELECT COUNT(*) FROM bookings
                WHERE datetime = %s AND master = %s AND status NOT IN ('cancelled', 'no_show')
            """, (datetime_str, master_name))
            count = c.fetchone()[0]
            conn.close()
            return count == 0
        else:
            conn.close()
            return True  # Мастер не найден, слот считаем свободным
    else:
        # Date First flow: проверяем, есть ли хотя бы один свободный мастер
        # Получаем всех активных мастеров (is_service_provider = TRUE)
        c.execute("""
            SELECT full_name FROM users 
            WHERE is_service_provider = TRUE AND is_active = TRUE
        """)
        all_masters = [row[0] for row in c.fetchall()]
        
        if not all_masters:
            conn.close()
            return True  # Нет мастеров — слот свободен (край-кейс)
        
        # Получаем занятых мастеров на это время
        c.execute("""
            SELECT master FROM bookings
            WHERE datetime = %s AND status NOT IN ('cancelled', 'no_show')
        """, (datetime_str,))
        busy_masters = [row[0] for row in c.fetchall() if row[0]]
        
        conn.close()
        
        # Слот доступен, если есть хотя бы один свободный мастер
        free_masters = [m for m in all_masters if m not in busy_masters]
        return len(free_masters) > 0

# ... (existing code)

@router.get("/available-slots/batch")
def get_batch_available_slots(date: str):
    """
    Get available slots for ALL active masters on a specific date.
    Uses MasterScheduleService for accurate calculations.
    """
    from services.master_schedule import MasterScheduleService
    schedule_service = MasterScheduleService()
    
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        # Получаем доступность всех мастеров
        availability = schedule_service.get_all_masters_availability(date, duration_minutes=30)
        
        # Получаем ID мастеров для возврата по ID
        c.execute("SELECT id, full_name FROM users WHERE is_service_provider = TRUE")
        masters = {row[1]: row[0] for row in c.fetchall()}
        
        result = {}
        for m_name, slots in availability.items():
            if m_name in masters:
                m_id = masters[m_name]
                result[m_id] = slots
                
        return {
            "date": date,
            "availability": result
        }
        
    except Exception as e:
        from utils.logger import log_error
        log_error(f"Error in batch availability: {e}", "public_api")
        return {"error": str(e), "availability": {}}
    finally:
        conn.close()

# ... (rest of the file)


@router.get("/reviews")
def get_public_reviews(limit: int = 20, language: str = "ru"):
    """Получить активные отзывы"""
    from db.public_content import get_active_reviews
    
    reviews = get_active_reviews(language=language, limit=limit)
    return {"reviews": reviews}

@router.get("/news")
def get_salon_news(limit: int = 10, language: str = "ru"):
    """Получить новости салона"""
    conn = get_db_connection()
    c = conn.cursor()

    c.execute("""
        SELECT id, title_ru, title_en, title_ar, content_ru, content_en, content_ar,
               image_url, published_at
        FROM salon_news
        WHERE is_active = TRUE
        ORDER BY published_at DESC
        LIMIT%s
    """, (limit,))

    from utils.utils import sanitize_url

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
            "image_url": sanitize_url(row[7]),
            "published_at": row[8]
        })

    conn.close()
    return {"news": news}

@router.get("/banners")
def get_public_banners():
    """Получить активные баннеры для главной страницы"""
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        c.execute("""
            SELECT * FROM public_banners 
            WHERE is_active = TRUE 
            ORDER BY display_order ASC
        """)
        
        
        from utils.utils import sanitize_url

        banners = []
        rows = c.fetchall()
        columns = [desc[0] for desc in c.description]
        for row in rows:
            banner = dict(zip(columns, row))
            banner['image_url'] = sanitize_url(banner.get('image_url'))
            banners.append(banner)
            
        return {"banners": banners}
    except Exception as e:
        from utils.logger import log_error
        log_error(f"Error fetching banners: {e}", "api")
        return {"banners": []}
    finally:
        conn.close()

@router.get("/gallery")
def get_public_gallery(category: Optional[str] = None):
    """
    Получить изображения галереи (публичный доступ)
    category: 'portfolio' или 'salon' (опционально, если не указан - возвращает все)
    """
    try:
        conn = get_db_connection()
        c = conn.cursor()
        
        if category:
            c.execute("""
                SELECT id, category, image_path, title, description, sort_order 
                FROM gallery_images 
                WHERE category = %s AND is_visible = TRUE
                ORDER BY sort_order ASC, id ASC
            """, (category,))
        else:
            c.execute("""
                SELECT id, category, image_path, title, description, sort_order 
                FROM gallery_images 
                WHERE is_visible = TRUE
                ORDER BY category, sort_order ASC, id ASC
            """)        
        images = []
        for row in c.fetchall():
            images.append({
                "id": row[0],
                "category": row[1],
                "image_path": sanitize_url(row[2]),
                "title": row[3],
                "description": row[4],
                "sort_order": row[5]
            })
        
        conn.close()
        return {"success": True, "images": images}
        
    except Exception as e:
        from utils.logger import log_error
        log_error(f"Error fetching gallery images: {e}", "api")
        return {"success": False, "images": [], "error": str(e)}

@router.get("/faq")
def get_public_faq(language: str = "ru"):
    """Получить список FAQ"""
    try:
        conn = get_db_connection()
        c = conn.cursor()
        
        # Select active FAQs ordered by display_order
        c.execute("""
            SELECT id, question_ru, question_en, question_ar, 
                   answer_ru, answer_en, answer_ar, category 
            FROM public_faq 
            ORDER BY display_order ASC, id ASC
        """)
        
        faqs = []
        rows = c.fetchall()
        
        for row in rows:
            # Select language specific content
            if language == "ar":
                question = row[3] or row[2] or row[1]
                answer = row[6] or row[5] or row[4]
            elif language == "en":
                question = row[2] or row[1]
                answer = row[5] or row[4]
            else: # Default or ru
                question = row[1]
                answer = row[4]
                
            faqs.append({
                "id": row[0],
                "question": question,
                "answer": answer,
                "category": row[7]
            })
            
        return {"faqItems": faqs}
    except Exception as e:
        from utils.logger import log_error
        log_error(f"Error fetching FAQ: {e}", "api")
        return {"faqItems": []}
    finally:
        if 'conn' in locals():
            conn.close()

@router.get("/initial-load")
def get_initial_load_data(language: str = "ru"):
    """
    Unified endpoint for initial page load to reduce round-trips.
    Combines salon info, banners, seo-metadata and services.
    """
    from db.settings import get_salon_settings
    from api.seo_metadata import get_seo_metadata
    from db.services import get_all_services
    from utils.utils import sanitize_url
    
    # 1. Get Salon Settings
    settings = get_salon_settings()
    
    # 2. Get Banners
    conn = get_db_connection()
    c = conn.cursor()
    banners = []
    try:
        c.execute("SELECT * FROM public_banners WHERE is_active = TRUE ORDER BY display_order ASC")
        columns = [desc[0] for desc in c.description]
        for row in c.fetchall():
            banner = dict(zip(columns, row))
            banner['image_url'] = sanitize_url(banner.get('image_url'))
            banners.append(banner)
    except Exception:
        pass
    finally:
        conn.close()
        
    # 3. Get SEO Metadata
    try:
        seo = get_seo_metadata()
    except Exception:
        seo = {}

    # 4. Get Services (Active only)
    try:
        raw_services = get_all_services(active_only=True)
        services = []
        for s in raw_services:
            # Map index-based result from get_all_services to dict
            service_dict = {
                "id": s[0],
                "name": s[2],
                "name_ru": s[3] if len(s) > 3 else None,
                "name_en": s[20] if len(s) > 20 else None,
                "price": s[5],
                "currency": s[8],
                "category": s[9],
                "duration": s[15],
            }
            # Add other language names if they exist and are not too many
            # Focusing on RU and EN for initial load
            services.append(service_dict)
    except Exception:
        services = []
        
    return {
        "salon": {
            "name": settings.get("name"),
            "phone": settings.get("phone"),
            "email": settings.get("email"),
            "address": settings.get("address"),
            "instagram": settings.get("instagram"),
            "whatsapp": settings.get("whatsapp"),
            "logo_url": settings.get("logo_url"),
            "currency": settings.get("currency", "AED"),
            "google_maps_embed_url": settings.get("google_maps"),
            "google_maps": settings.get("google_maps"),
            "map_url": settings.get("google_maps"),
            "hours": settings.get("hours"),
        },
        "banners": banners,
        "seo": seo,
        "services": services,
        "language": language
    }


# ============================================================================
# BOOKING HOLD
# ============================================================================

class BookingHoldRequest(BaseModel):
    service_id: int
    master_name: str
    date: str
    time: str
    client_id: str

@router.post("/bookings/hold")
def create_booking_hold(data: BookingHoldRequest):
    """
    Create a temporary hold on a slot.
    Returns success: True if hold created, False if slot taken.
    """
    from services.booking_hold import BookingHoldService
    
    service = BookingHoldService()
    success = service.create_hold(
        service_id=data.service_id,
        master_name=data.master_name,
        date=data.date,
        time=data.time,
        client_id=data.client_id
    )
    
    from fastapi.responses import JSONResponse
    if success:
        return {"success": True}
    else:
        # 409 Conflict - Slot already held/taken
        return JSONResponse(
            status_code=409, 
            content={"success": False, "error": "Slot already held by another user"}
        )