"""
Публичные API endpoints (без авторизации)
"""
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timedelta

from db.settings import get_salon_settings
from db.services import get_all_services
from db.employees import get_all_employees
from core.config import DATABASE_NAME
from db.connection import get_db_connection
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

class ContactForm(BaseModel):
    name: str
    email: Optional[str] = None
    message: str

@router.post("/send-message")
async def send_contact_message(form: ContactForm, background_tasks: BackgroundTasks):
    """Отправка сообщения с контактной формы"""
    from utils.logger import log_info, log_error
    
    # Логируем
    log_info(f"📩 New message from {form.name}: {form.message}", "public_api")
    
    # Добавляем задачу в фон для отправки уведомлений
    background_tasks.add_task(process_contact_notifications, form)
    
    # Сразу возвращаем успешный ответ
    return {"success": True, "message": "Message sent successfully"}

@router.post("/bookings")
async def create_public_booking(data: BookingCreate, background_tasks: BackgroundTasks):
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
        booking_id = save_booking(
            instagram_id=data.phone, # Используем телефон как ID для публичных
            service=str(data.service_id), # Пока передаем ID, возможно нужно имя
            datetime_str=datetime_str,
            phone=data.phone,
            name=data.name,
            master=master_name,
            status='pending_confirmation',
            source='website'
        )
        
        # 2. Логирование
        log_info(f"📅 New public booking: {data.name} ({data.phone})", "public_api")
        
        # 3. Уведомление администратора
        background_tasks.add_task(notify_admin_new_booking, data, booking_id)
        
        return {"success": True, "booking_id": booking_id, "message": "Booking request received"}
        
    except Exception as e:
        log_error(f"Error creating public booking: {e}", "public_api")
        return JSONResponse({"error": "Failed to create booking", "detail": str(e)}, status_code=500)

def notify_admin_new_booking(data: BookingCreate, booking_id: int):
    """Уведомить админа о новой заявке"""
    from utils.email import send_email_sync
    from integrations.telegram_bot import send_telegram_alert
    import os
    import asyncio
    
    admin_email = os.getenv('FROM_EMAIL') or os.getenv('SMTP_USERNAME')
    
    subject = f"📅 Новая заявка на запись: {data.name}"
    message = (
        f"Имя: {data.name}\n"
        f"Телефон: {data.phone}\n"
        f"Дата: {data.date} {data.time}\n"
        f"Источник: Сайт\n"
        f"Статус: Ожидает подтверждения"
    )
    
    # Email
    if admin_email:
        try:
             send_email_sync([admin_email], subject, message)
        except Exception as e:
             print(f"Error sending email: {e}")
             
    # Telegram
    try:
        tg_msg = (
            f"📅 <b>Новая заявка на запись!</b>\n\n"
            f"👤 <b>Имя:</b> {data.name}\n"
            f"📞 <b>Телефон:</b> {data.phone}\n"
            f"🕒 <b>Время:</b> {data.date} {data.time}\n"
            f"⚠️ <b>Статус:</b> Ожидает подтверждения"
        )
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        loop.run_until_complete(send_telegram_alert(tg_msg))
        loop.close()
    except Exception as e:
        print(f"Error sending telegram: {e}")

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
        user_subject = "Ваша заявка принята | M.Le Diamant"
        user_message = (
            f"Здравствуйте, {form.name}!\n\n"
            f"Спасибо за ваше обращение. Мы получили вашу заявку и свяжемся с вами в ближайшее время.\n\n"
            f"С уважением,\nКоманда M.Le Diamant"
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
async def get_public_services():
    """Публичный список активных услуг"""
    services = get_all_services(active_only=True)
    from core.config import BASE_URL

    def sanitize_url(url):
        if not url: return None
        if url.startswith('/static/'):
            return f"{BASE_URL.rstrip('/')}{url}"
        if "localhost:8000" in url and "localhost" not in BASE_URL:
            return url.replace("http://localhost:8000", BASE_URL).replace("http://127.0.0.1:8000", BASE_URL)
        return url

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

# ... (create_booking is unchanged) ...


@router.get("/reviews")
async def get_public_reviews(limit: int = 20, language: str = "ru"):
    """Получить активные отзывы"""
    from db.public_content import get_active_reviews
    
    reviews = get_active_reviews(language=language, limit=limit)
    return {"reviews": reviews}

@router.get("/news")
async def get_salon_news(limit: int = 10, language: str = "ru"):
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

    from core.config import BASE_URL
    
    def sanitize_url(url):
        if not url: return None
        if url.startswith('/static/'):
            return f"{BASE_URL.rstrip('/')}{url}"
        if "localhost:8000" in url and "localhost" not in BASE_URL:
            return url.replace("http://localhost:8000", BASE_URL).replace("http://127.0.0.1:8000", BASE_URL)
        return url

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
async def get_public_banners():
    """Получить активные баннеры для главной страницы"""
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        c.execute("""
            SELECT * FROM public_banners 
            WHERE is_active = TRUE 
            ORDER BY display_order ASC
        """)
        
        
        from core.config import BASE_URL
        
        def sanitize_url(url):
            if not url: return None
            if url.startswith('/static/'):
                # Prepend BASE_URL to relative paths
                return f"{BASE_URL.rstrip('/')}{url}"
            if "localhost:8000" in url and "localhost" not in BASE_URL:
                return url.replace("http://localhost:8000", BASE_URL).replace("http://127.0.0.1:8000", BASE_URL)
            return url

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
async def get_public_gallery(category: Optional[str] = None):
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
                "image_path": row[2],
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
async def get_public_faq(language: str = "ru"):
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
async def create_booking_hold(data: BookingHoldRequest):
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
    
    if success:
        return {"success": True}
    else:
        # 409 Conflict - Slot already held/taken
        return JSONResponse(
            status_code=409, 
            content={"success": False, "error": "Slot already held by another user"}
        )