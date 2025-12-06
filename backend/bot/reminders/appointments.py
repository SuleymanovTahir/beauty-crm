"""
Appointment Reminder via Messenger - AI Generated Responses
Напоминания о записи за день и за 2 часа через Instagram/Telegram
"""
from datetime import datetime, timedelta, time
from db.connection import get_db_connection
from db.settings import get_bot_settings, get_salon_settings
from bot.ai_responses import generate_ai_response
from services.universal_messenger import send_universal_message
from db.messages import save_message
from utils.logger import log_info, log_error

def _is_night_hours() -> bool:
    """Проверка ночного времени (23:00 - 08:00)"""
    now = datetime.now().time()
    return now >= time(23, 0) or now < time(8, 0)

async def check_appointment_reminders():
    """
    Проверка и отправка напоминаний о записи:
    - За 1 день до визита
    - За 2 часа до визита
    """
    
    # ✅ Не отправляем ночью
    if _is_night_hours():
        return
    
    settings = get_bot_settings()
    salon = get_salon_settings()
    
    if not settings.get('appointment_reminder_enabled', True):
        return
    
    now = datetime.now()
    
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        # === НАПОМИНАНИЕ ЗА ДЕНЬ ===
        tomorrow = (now + timedelta(days=1)).strftime('%Y-%m-%d')
        
        c.execute("""
            SELECT b.id, b.instagram_id, b.time, b.language,
                   s.name as service_name,
                   u.full_name as master_name
            FROM bookings b
            LEFT JOIN services s ON b.service_id = s.id
            LEFT JOIN users u ON b.employee_id = u.id
            WHERE b.date = %s
              AND b.status IN ('confirmed', 'pending')
              AND b.instagram_id IS NOT NULL
              AND (b.reminder_sent_24h IS FALSE OR b.reminder_sent_24h IS NULL)
        """, (tomorrow,))
        
        tomorrow_bookings = c.fetchall()
        
        for booking_id, instagram_id, time, lang, service, master in tomorrow_bookings:
            lang = lang or 'ru'
            service = service or 'Услуга'
            master = master or 'Мастер'
            
            try:
                # AI генерирует напоминание
                text = await generate_ai_response(
                    'booking_reminder_1d', 
                    lang,
                    service=service,
                    time=time,
                    master=master
                )
                
                await send_universal_message(instagram_id, text)
                save_message(instagram_id, text, 'bot')
                
                # Помечаем что напоминание отправлено
                c.execute("UPDATE bookings SET reminder_sent_24h = TRUE WHERE id = %s", (booking_id,))
                conn.commit()
                
                log_info(f"📅 Reminder 1d sent for booking {booking_id}", "reminders")
                
            except Exception as e:
                log_error(f"Failed to send 1d reminder for {booking_id}: {e}", "reminders")
        
        # === НАПОМИНАНИЕ ЗА 2 ЧАСА ===
        two_hours_later = now + timedelta(hours=2)
        target_date = two_hours_later.strftime('%Y-%m-%d')
        target_time_start = two_hours_later.strftime('%H:%M')
        target_time_end = (two_hours_later + timedelta(minutes=30)).strftime('%H:%M')
        
        c.execute("""
            SELECT b.id, b.instagram_id, b.time, b.language,
                   s.name as service_name
            FROM bookings b
            LEFT JOIN services s ON b.service_id = s.id
            WHERE b.date = %s
              AND b.time >= %s AND b.time <= %s
              AND b.status IN ('confirmed', 'pending')
              AND b.instagram_id IS NOT NULL
              AND (b.reminder_sent_2h IS FALSE OR b.reminder_sent_2h IS NULL)
        """, (target_date, target_time_start, target_time_end))
        
        soon_bookings = c.fetchall()
        
        salon_address = salon.get('address', '')
        
        for booking_id, instagram_id, time, lang, service in soon_bookings:
            lang = lang or 'ru'
            service = service or 'Услуга'
            
            try:
                # AI генерирует напоминание
                text = await generate_ai_response(
                    'booking_reminder_2h', 
                    lang,
                    service=service,
                    address=salon_address
                )
                
                await send_universal_message(instagram_id, text)
                save_message(instagram_id, text, 'bot')
                
                # Помечаем что напоминание отправлено
                c.execute("UPDATE bookings SET reminder_sent_2h = TRUE WHERE id = %s", (booking_id,))
                conn.commit()
                
                log_info(f"⏰ Reminder 2h sent for booking {booking_id}", "reminders")
                
            except Exception as e:
                log_error(f"Failed to send 2h reminder for {booking_id}: {e}", "reminders")
                
    except Exception as e:
        log_error(f"❌ Error in check_appointment_reminders: {e}", "reminders")
    finally:
        conn.close()
