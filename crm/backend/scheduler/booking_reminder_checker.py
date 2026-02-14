"""
Планировщик отправки напоминаний о записях
Использует UniversalMessenger для мультиканальной отправки.
"""
import os
import sys
import asyncio
from datetime import datetime, timedelta
from typing import List, Dict

# Добавляем корневую директорию в PYTHONPATH
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from db.connection import get_db_connection
from db.settings import get_salon_settings
from utils.logger import log_info, log_error
from services.universal_messenger import send_universal_message

def get_active_reminder_settings() -> List[Dict]:
    """Получить активные настройки напоминаний из базы"""
    try:
        settings = get_salon_settings()
        custom_settings = settings.get('custom_settings', {})
        reminder_settings = custom_settings.get('booking_reminders', [])
        
        # Дефолтные настройки если ничего не задано
        if not reminder_settings:
            reminder_settings = [
                {'id': 1, 'name': '24 hours before', 'days_before': 1, 'hours_before': 0, 'is_enabled': True},
                {'id': 2, 'name': '2 hours before', 'days_before': 0, 'hours_before': 2, 'is_enabled': True}
            ]
        
        return [s for s in reminder_settings if s.get('is_enabled', True)]

    except Exception as e:
        log_error(f"Error fetching reminder settings: {e}", "booking_reminders")
        return []

def get_bookings_needing_reminders() -> List[Dict]:
    """Получить записи на ближайшие 2 дня"""
    conn = get_db_connection()
    c = conn.cursor()
    try:
        now = datetime.now()
        horizon = now + timedelta(days=2, hours=6)

        c.execute("""
            SELECT
                b.id, b.datetime, cl.name as client_name, b.service_name, b.master, 
                b.instagram_id, cl.email, cl.telegram_id, b.user_id
            FROM bookings b
            LEFT JOIN clients cl ON b.instagram_id = cl.instagram_id
            WHERE b.datetime >= %s AND b.datetime <= %s
              AND b.status NOT IN ('cancelled', 'completed')
            ORDER BY b.datetime ASC
        """, (now.isoformat(), horizon.isoformat()))

        columns = ['id', 'datetime', 'client_name', 'service_name', 'master', 
                   'instagram_id', 'email', 'telegram_id', 'user_id']
        return [dict(zip(columns, row)) for row in c.fetchall()]
    finally:
        conn.close()

def check_if_reminder_sent(booking_id: int, reminder_id: int) -> bool:
    """Проверка отправки через единый лог"""
    conn = get_db_connection()
    c = conn.cursor()
    try:
        trigger = f"booking_reminder_{reminder_id}"
        c.execute("SELECT COUNT(*) FROM unified_communication_log WHERE booking_id = %s AND trigger_type = %s AND status = 'sent'", (booking_id, trigger))
        return c.fetchone()[0] > 0
    finally:
        conn.close()

async def send_booking_reminder(booking: Dict, reminder_setting: Dict):
    """Отправка напоминания через UniversalMessenger"""
    try:
        booking_id = booking['id']
        client_id = booking['instagram_id'] or str(booking['client_id'])
        
        # Контекст для шаблона
        context = {
            "name": booking['client_name'] or "Клиент",
            "service": booking['service_name'],
            "datetime": booking['datetime'].strftime('%d.%m в %H:%M') if isinstance(booking['datetime'], datetime) else str(booking['datetime']),
            "master": booking['master'] or ""
        }

        # Определяем платформу (Messenger сам выберет лучшую если 'auto')
        platform = 'auto'
        
        # Отправляем
        res = await send_universal_message(
            recipient_id=client_id,
            template_name="booking_reminder",
            context=context,
            booking_id=booking_id,
            platform=platform
        )

        if res.get("success"):
            # Помечаем в логе специфичный триггер (чтобы не спамить одной и той же настройкой)
            conn = get_db_connection()
            c = conn.cursor()
            c.execute("""
                UPDATE unified_communication_log 
                SET trigger_type = %s 
                WHERE id = %s
            """, (f"booking_reminder_{reminder_setting['id']}", res.get("log_id")))
            conn.commit()
            conn.close()
            return True
        return False

    except Exception as e:
        log_error(f"Error sending booking reminder: {e}", "booking_reminders")
        return False

async def check_and_send_reminders():
    """Проход по записям и отправка по расписанию"""
    log_info("⏰ Checking booking reminders...", "booking_reminders")
    
    settings = get_active_reminder_settings()
    bookings = get_bookings_needing_reminders()
    now = datetime.now()
    
    for booking in bookings:
        b_dt = booking['datetime']
        if isinstance(b_dt, str): b_dt = datetime.fromisoformat(b_dt)
        
        for setting in settings:
            if check_if_reminder_sent(booking['id'], setting['id']):
                continue
                
            reminder_time = b_dt - timedelta(days=setting['days_before'], hours=setting['hours_before'])
            time_diff = (reminder_time - now).total_seconds() / 60
            
            if -15 <= time_diff <= 15: # Окно 30 минут
                await send_booking_reminder(booking, setting)

async def booking_reminder_loop():
    log_info("🚀 Booking reminder service started", "booking_reminders")
    while True:
        try:
            await check_and_send_reminders()
            await asyncio.sleep(600) # Раз в 10 минут
        except Exception as e:
            log_error(f"Error in booking_reminder_loop: {e}", "booking_reminders")
            await asyncio.sleep(60)

def start_booking_reminder_checker():
    asyncio.create_task(booking_reminder_loop())

if __name__ == "__main__":
    asyncio.run(check_and_send_reminders())
