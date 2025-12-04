"""
Сервис для отправки автоматических напоминаний
"""

from datetime import datetime, timedelta
from core.config import DATABASE_NAME
from db.connection import get_db_connection
import logging

logger = logging.getLogger('crm')

def get_db_connection():
    conn = get_db_connection()
    return conn

async def check_and_send_reminders():
    """Проверяет и отправляет напоминания (24ч и 2ч)"""
    logger.info("🔔 Checking for reminders...")
    
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        now = datetime.now()
        
        # 1. Напоминание за 24 часа
        tomorrow_start = now + timedelta(hours=23, minutes=30)
        tomorrow_end = now + timedelta(hours=24, minutes=30)
        
        c.execute("""
            SELECT b.id, b.instagram_id, b.service_name, b.datetime, b.phone
            FROM bookings b
            LEFT JOIN reminder_logs r ON b.id = r.booking_id AND r.reminder_type = '24h'
            WHERE b.datetime BETWEEN %s AND %s
            AND b.status = 'confirmed'
            AND r.id IS NULL
        """, (tomorrow_start.isoformat(), tomorrow_end.isoformat()))
        
        bookings_24h = c.fetchall()
        
        for booking in bookings_24h:
            await send_reminder(booking, '24h')
            
        # 2. Напоминание за 2 часа
        two_hours_start = now + timedelta(hours=1, minutes=30)
        two_hours_end = now + timedelta(hours=2, minutes=30)
        
        c.execute("""
            SELECT b.id, b.instagram_id, b.service_name, b.datetime, b.phone
            FROM bookings b
            LEFT JOIN reminder_logs r ON b.id = r.booking_id AND r.reminder_type = '2h'
            WHERE b.datetime BETWEEN %s AND %s
            AND b.status = 'confirmed'
            AND r.id IS NULL
        """, (two_hours_start.isoformat(), two_hours_end.isoformat()))
        
        bookings_2h = c.fetchall()
        
        for booking in bookings_2h:
            await send_reminder(booking, '2h')
            
    except Exception as e:
        logger.error(f"❌ Error checking reminders: {e}")
    finally:
        conn.close()

async def send_reminder(booking, reminder_type):
    """Отправляет напоминание через Instagram"""
    booking_id, instagram_id, service, dt_str, phone = booking
    
    try:
        from integrations.instagram import send_message
        
        dt = datetime.fromisoformat(dt_str.replace('T', ' '))
        date_str = dt.strftime("%d.%m")
        time_str = dt.strftime("%H:%M")
        
        # Формируем сообщение в зависимости от типа
        if reminder_type == '24h':
            message = f"💎 Напоминаем о вашей записи завтра ({date_str}) в {time_str} на {service}!\n\nБудем рады вас видеть! ✨"
        elif reminder_type == '2h':
            message = f"⏰ Ждем вас через 2 часа ({time_str}) на {service}!\n\nДо встречи! 💅"
        else:
            message = f"💎 Напоминание о записи {date_str} в {time_str} на {service}"
            
        # Отправляем реальное сообщение в Instagram
        result = await send_message(instagram_id, message)
        
        status = 'sent' if 'error' not in result else 'failed'
        error_msg = result.get('error') if 'error' in result else None
        
        if status == 'sent':
            logger.info(f"✅ Reminder sent ({reminder_type}) to {instagram_id}: {message[:50]}...")
        else:
            logger.error(f"❌ Failed to send reminder to {instagram_id}: {error_msg}")
        
        # Логируем отправку
        conn = get_db_connection()
        c = conn.cursor()
        c.execute("""
            INSERT INTO reminder_logs (booking_id, client_id, reminder_type, sent_at, status)
            VALUES (%s, %s, %s, %s, %s)
        """, (booking_id, instagram_id, reminder_type, datetime.now().isoformat(), status))
        conn.commit()
        conn.close()
        
    except Exception as e:
        logger.error(f"❌ Failed to send reminder: {e}")
        # Логируем ошибку
        try:
            conn = get_db_connection()
            c = conn.cursor()
            c.execute("""
                INSERT INTO reminder_logs (booking_id, client_id, reminder_type, sent_at, status)
                VALUES (%s, %s, %s, %s, 'error')
            """, (booking_id, instagram_id, reminder_type, datetime.now().isoformat()))
            conn.commit()
            conn.close()
        except:
            pass
