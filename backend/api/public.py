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
            "booking_url": salon.get("booking_url", ""),
            "google_maps": salon.get("google_maps", ""),
            "hours_weekdays": salon.get("hours_weekdays", "10:30 - 21:00"),
            "hours_weekends": salon.get("hours_weekends", "10:30 - 21:00"),
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
            "hours_weekdays": "10:30 - 21:00",
            "hours_weekends": "10:30 - 21:00",
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

    return {
        "services": [
            {
                "id": s[0],
                "name": s[2],  # name_ru
                "price": s[3],
                "currency": s[4],
                "category": s[5],
                "description": s[7] or ""  # description_ru
            } for s in services
        ]
    }


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


@router.post("/book")
async def create_booking(booking: BookingCreate):
    """Создать новую запись онлайн"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    try:
        # Проверяем доступность слота
        datetime_str = f"{booking.date} {booking.time}"

        if not check_slot_availability(booking.date, booking.time, booking.employee_id):
            raise HTTPException(status_code=400, detail="Этот слот уже занят")

        # Получаем информацию об услуге
        c.execute("SELECT name_ru, price FROM services WHERE id = ?", (booking.service_id,))
        service_data = c.fetchone()

        if not service_data:
            raise HTTPException(status_code=404, detail="Услуга не найдена")

        service_name, service_price = service_data

        # Создаем или получаем клиента
        instagram_id = f"web_{booking.email or booking.phone}"

        c.execute("SELECT instagram_id FROM clients WHERE email = ? OR phone = ?",
                  (booking.email, booking.phone))

        existing_client = c.fetchone()

        if existing_client:
            instagram_id = existing_client[0]
        else:
            # Создаем нового клиента
            now = datetime.now().isoformat()
            c.execute("""
                INSERT INTO clients
                (instagram_id, name, phone, email, first_contact, last_contact, status, labels)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                instagram_id,
                booking.name,
                booking.phone,
                booking.email,
                now,
                now,
                'new',
                'Онлайн-запись'
            ))

        # Создаем запись
        c.execute("""
            INSERT INTO bookings
            (instagram_id, service_name, datetime, phone, name, status, created_at,
             revenue, notes, employee_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            instagram_id,
            service_name,
            datetime_str,
            booking.phone,
            booking.name,
            'confirmed',
            datetime.now().isoformat(),
            service_price,
            booking.notes,
            booking.employee_id
        ))

        booking_id = c.lastrowid
        conn.commit()

        return {
            "success": True,
            "booking_id": booking_id,
            "message": "Запись успешно создана"
        }

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Ошибка создания записи: {str(e)}")
    finally:
        conn.close()


@router.get("/news")
async def get_salon_news(limit: int = 10, lang: str = "ru"):
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
        if lang == "ar":
            title = row[3] or row[1]
            content = row[6] or row[4]
        elif lang == "en":
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