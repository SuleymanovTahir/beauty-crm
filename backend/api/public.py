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


class ContactForm(BaseModel):
    name: str
    email: Optional[str] = None
    message: str


@router.post("/send-message")
async def send_contact_message(form: ContactForm):
    """Отправка сообщения с контактной формы"""
    try:
        from utils.logger import log_info, log_error
        from bot import get_bot
        from utils.email import send_email_async
        from integrations.telegram_bot import send_telegram_alert
        
        # Логируем
        log_info(f"📩 New message from {form.name}: {form.message}", "public_api")
        
        # 1. Получаем email администратора из переменных окружения
        import os
        admin_email = os.getenv('FROM_EMAIL') or os.getenv('SMTP_USERNAME')
        
        # 2. Отправляем уведомление администратору по Email
        if admin_email:
            subject = f"📩 Новая заявка с сайта: {form.name}"
            message_text = (
                f"Имя: {form.name}\n"
                f"Email: {form.email or 'Не указан'}\n"
                f"Сообщение:\n{form.message}"
            )
            
            await send_email_async([admin_email], subject, message_text)
            log_info(f"Admin notification sent to {admin_email}", "public_api")
        else:
            log_info("No admin emails found to send notification", "public_api")

        # 3. Отправляем подтверждение пользователю (если есть email)
        if form.email:
            user_subject = "Ваша заявка принята | M.Le Diamant"
            user_message = (
                f"Здравствуйте, {form.name}!\n\n"
                f"Спасибо за ваше обращение. Мы получили вашу заявку и свяжемся с вами в ближайшее время.\n\n"
                f"С уважением,\nКоманда M.Le Diamant"
            )
            await send_email_async([form.email], user_subject, user_message)

        # 4. Отправляем уведомление в Telegram
        try:
            telegram_message = (
                f"📩 <b>Новая заявка с сайта!</b>\n\n"
                f"👤 <b>Имя:</b> {form.name}\n"
                f"📧 <b>Email:</b> {form.email or 'Не указан'}\n\n"
                f"📝 <b>Сообщение:</b>\n{form.message}"
            )
            
            # Отправляем в Telegram (chat_id берется из salon_settings)
            telegram_result = await send_telegram_alert(telegram_message)
            
            if telegram_result.get("success"):
                log_info("Telegram notification sent successfully", "public_api")
            else:
                log_error(f"Failed to send Telegram notification: {telegram_result.get('error')}", "public_api")
        except Exception as e:
            log_error(f"Error sending Telegram notification: {e}", "public_api")
            
        return {"success": True, "message": "Message sent successfully"}
    except Exception as e:
        from utils.logger import log_error
        log_error(f"Error sending message: {e}", "public_api")
        raise HTTPException(status_code=500, detail=str(e))





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
            "duration": s[15] or 60,  # duration in minutes
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