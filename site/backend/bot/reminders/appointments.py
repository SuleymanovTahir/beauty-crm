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
            SELECT b.id, b.instagram_id, b.datetime, c.language,
                   b.service_name,
                   b.master as master_name
            FROM bookings b
            LEFT JOIN clients c ON b.instagram_id = c.instagram_id
            WHERE b.datetime::text LIKE %s
              AND b.status IN ('confirmed', 'pending')
              AND b.instagram_id IS NOT NULL
              AND (b.reminder_sent_24h IS FALSE OR b.reminder_sent_24h IS NULL)
        """, (f"{tomorrow}%",))
        
        tomorrow_bookings = c.fetchall()
        
        for booking_id, instagram_id, booking_datetime, lang, service, master in tomorrow_bookings:
            lang = lang or 'ru'
            service = service or 'Услуга'
            master = master or 'Мастер'
            
            # Extract time from datetime string
            try:
                # Assuming format "YYYY-MM-DD HH:MM" or similar
                booking_time = booking_datetime.split(' ')[1][:5]
            except:
                booking_time = booking_datetime
            
            try:
                # AI генерирует напоминание
                text = await generate_ai_response(
                    'booking_reminder_1d', 
                    lang,
                    service=service,
                    time=booking_time,
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
        # We want reminders for bookings happening in the window of [now+2h, now+2.5h]
        # Since datetime is TEXT, we can compare strings if format is ISO-like (YYYY-MM-DD HH:MM)
        start_range = two_hours_later.strftime('%Y-%m-%d %H:%M')
        end_range = (two_hours_later + timedelta(minutes=30)).strftime('%Y-%m-%d %H:%M')
        
        c.execute("""
            SELECT b.id, b.instagram_id, b.datetime, c.language,
                   b.service_name
            FROM bookings b
            LEFT JOIN clients c ON b.instagram_id = c.instagram_id
            WHERE b.datetime >= %s AND b.datetime <= %s
              AND b.status IN ('confirmed', 'pending')
              AND b.instagram_id IS NOT NULL
              AND (b.reminder_sent_2h IS FALSE OR b.reminder_sent_2h IS NULL)
        """, (start_range, end_range))
        
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
