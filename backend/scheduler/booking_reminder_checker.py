"""
Планировщик отправки напоминаний о записях

Проверяет предстоящие записи и отправляет напоминания согласно настройкам
"""
import sqlite3
from datetime import datetime, timedelta
from typing import List, Dict
import asyncio
import os
import sys

# Добавляем корневую директорию в PYTHONPATH
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.config import DATABASE_NAME
from db.settings import get_salon_settings
from utils.logger import log_info, log_error
from utils.email import send_email_async


def get_active_reminder_settings() -> List[Dict]:
    """Получить активные настройки напоминаний"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    try:
        c.execute("""
            SELECT id, name, days_before, hours_before, notification_type
            FROM booking_reminder_settings
            WHERE is_enabled = 1
            ORDER BY days_before DESC, hours_before DESC
        """)

        settings = []
        for row in c.fetchall():
            settings.append({
                'id': row[0],
                'name': row[1],
                'days_before': row[2],
                'hours_before': row[3],
                'notification_type': row[4]
            })

        return settings

    finally:
        conn.close()


def get_bookings_needing_reminders() -> List[Dict]:
    """Получить записи, которым нужны напоминания"""
    conn = sqlite3.connect(DATABASE_NAME)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()

    try:
        # Получаем все будущие записи
        now = datetime.now()
        two_days_ahead = now + timedelta(days=2, hours=6)  # Смотрим на 2.5 дня вперед

        c.execute("""
            SELECT
                b.id, b.datetime, b.name, b.phone, b.service_name, b.master, b.notes,
                b.instagram_id,
                cl.email, cl.full_name, cl.phone as client_phone
            FROM bookings b
            LEFT JOIN clients cl ON b.instagram_id = cl.instagram_id
            WHERE b.datetime >= ? AND b.datetime <= ?
              AND b.status NOT IN ('cancelled', 'completed')
            ORDER BY b.datetime ASC
        """, (now.isoformat(), two_days_ahead.isoformat()))

        bookings = []
        for row in c.fetchall():
            bookings.append(dict(row))

        return bookings

    finally:
        conn.close()


def check_if_reminder_sent(booking_id: int, reminder_setting_id: int) -> bool:
    """Проверить, было ли уже отправлено напоминание"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    try:
        c.execute("""
            SELECT COUNT(*) FROM booking_reminders_sent
            WHERE booking_id = ? AND reminder_setting_id = ? AND status = 'sent'
        """, (booking_id, reminder_setting_id))

        count = c.fetchone()[0]
        return count > 0

    finally:
        conn.close()


def mark_reminder_sent(booking_id: int, reminder_setting_id: int, status: str = 'sent', error_message: str = None):
    """Отметить напоминание как отправленное"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    try:
        c.execute("""
            INSERT OR REPLACE INTO booking_reminders_sent
            (booking_id, reminder_setting_id, sent_at, status, error_message)
            VALUES (?, ?, ?, ?, ?)
        """, (booking_id, reminder_setting_id, datetime.now().isoformat(), status, error_message))

        conn.commit()

    finally:
        conn.close()


def format_booking_reminder_email(booking: Dict, salon_settings: Dict) -> tuple:
    """Форматировать email-напоминание о записи"""

    client_name = booking.get('full_name') or booking.get('name') or 'Клиент'
    service = booking.get('service_name', 'Услуга')
    master = booking.get('master', 'Мастер')
    booking_datetime = booking.get('datetime', '')

    # Парсим дату
    try:
        dt = datetime.fromisoformat(booking_datetime)
        date_str = dt.strftime('%d.%m.%Y')
        time_str = dt.strftime('%H:%M')
    except:
        date_str = booking_datetime.split('T')[0] if 'T' in booking_datetime else booking_datetime
        time_str = booking_datetime.split('T')[1][:5] if 'T' in booking_datetime else ''

    salon_name = salon_settings.get('name', 'M.Le Diamant Beauty Lounge')
    salon_address = salon_settings.get('address', 'JBR, Dubai')
    salon_phone = salon_settings.get('phone', '+971 52 696 1100')
    google_maps = salon_settings.get('google_maps', 'https://maps.app.goo.gl/Puh5X1bNEjWPiToz6')

    # Plain text версия
    plain = f"""
Напоминание о записи 💅

Здравствуйте, {client_name}!

Напоминаем о вашей записи:

📅 Дата: {date_str}
🕐 Время: {time_str}
💅 Услуга: {service}
👤 Мастер: {master}

📍 Адрес: {salon_address}
📞 Телефон: {salon_phone}
🗺️ Google Maps: {google_maps}

До встречи! 💎
{salon_name}
"""

    # HTML версия
    html = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {{
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 0;
            background-color: #f5f5f5;
        }}
        .container {{
            max-width: 600px;
            margin: 20px auto;
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }}
        .header {{
            background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%);
            color: white;
            padding: 30px 20px;
            text-align: center;
        }}
        .header h1 {{
            margin: 0;
            font-size: 28px;
            font-weight: 600;
        }}
        .content {{
            padding: 30px 20px;
        }}
        .greeting {{
            font-size: 18px;
            color: #333;
            margin-bottom: 20px;
        }}
        .info-box {{
            background: linear-gradient(135deg, #fce7f3 0%, #ede9fe 100%);
            border-left: 4px solid #ec4899;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
        }}
        .info-row {{
            margin: 12px 0;
            display: flex;
            align-items: flex-start;
        }}
        .icon {{
            font-size: 20px;
            margin-right: 12px;
            min-width: 25px;
        }}
        .label {{
            font-weight: 600;
            color: #333;
            margin-right: 8px;
        }}
        .value {{
            color: #555;
        }}
        .location-section {{
            background: #f9fafb;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
        }}
        .location-title {{
            font-weight: 600;
            font-size: 16px;
            color: #333;
            margin-bottom: 12px;
        }}
        .map-button {{
            display: inline-block;
            background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%);
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 600;
            margin-top: 12px;
            transition: transform 0.2s;
        }}
        .map-button:hover {{
            transform: scale(1.05);
        }}
        .footer {{
            background: #1f2937;
            color: #fff;
            padding: 20px;
            text-align: center;
        }}
        .footer-text {{
            margin: 5px 0;
            font-size: 14px;
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>💅 Напоминание о записи</h1>
        </div>
        <div class="content">
            <div class="greeting">
                Здравствуйте, <strong>{client_name}</strong>!
            </div>
            <p>Напоминаем о вашей предстоящей записи:</p>

            <div class="info-box">
                <div class="info-row">
                    <span class="icon">📅</span>
                    <div>
                        <span class="label">Дата:</span>
                        <span class="value">{date_str}</span>
                    </div>
                </div>
                <div class="info-row">
                    <span class="icon">🕐</span>
                    <div>
                        <span class="label">Время:</span>
                        <span class="value">{time_str}</span>
                    </div>
                </div>
                <div class="info-row">
                    <span class="icon">💅</span>
                    <div>
                        <span class="label">Услуга:</span>
                        <span class="value">{service}</span>
                    </div>
                </div>
                <div class="info-row">
                    <span class="icon">👤</span>
                    <div>
                        <span class="label">Мастер:</span>
                        <span class="value">{master}</span>
                    </div>
                </div>
            </div>

            <div class="location-section">
                <div class="location-title">📍 Как нас найти</div>
                <div class="info-row">
                    <span class="icon">🏢</span>
                    <div>
                        <span class="value">{salon_address}</span>
                    </div>
                </div>
                <div class="info-row">
                    <span class="icon">📞</span>
                    <div>
                        <span class="value">{salon_phone}</span>
                    </div>
                </div>
                <a href="{google_maps}" class="map-button">🗺️ Открыть на карте</a>
            </div>

            <p style="color: #666; font-size: 14px; margin-top: 20px;">
                Если вам нужно перенести или отменить запись, пожалуйста, свяжитесь с нами заранее.
            </p>
        </div>
        <div class="footer">
            <div class="footer-text"><strong>{salon_name}</strong></div>
            <div class="footer-text">{salon_address}</div>
            <div class="footer-text">{salon_phone}</div>
        </div>
    </div>
</body>
</html>
"""

    return plain, html


async def send_booking_reminder(booking: Dict, reminder_setting: Dict, salon_settings: Dict):
    """Отправить напоминание о записи"""
    try:
        # Проверяем наличие email
        client_email = booking.get('email')
        if not client_email:
            log_error(f"У клиента booking_id={booking['id']} нет email адреса", "booking_reminders")
            mark_reminder_sent(booking['id'], reminder_setting['id'], status='failed', error_message='No email')
            return False

        # Форматируем письмо
        plain_text, html_text = format_booking_reminder_email(booking, salon_settings)

        # Отправляем email
        subject = f"💅 Напоминание о записи - {salon_settings.get('name', 'Салон')}"

        success = await send_email_async(
            recipients=[client_email],
            subject=subject,
            message=plain_text,
            html=html_text
        )

        if success:
            mark_reminder_sent(booking['id'], reminder_setting['id'], status='sent')
            log_info(f"✅ Напоминание отправлено: booking_id={booking['id']}, email={client_email}", "booking_reminders")
        else:
            mark_reminder_sent(booking['id'], reminder_setting['id'], status='failed', error_message='Email send failed')
            log_error(f"❌ Не удалось отправить напоминание: booking_id={booking['id']}", "booking_reminders")

        return success

    except Exception as e:
        log_error(f"Ошибка отправки напоминания: {e}", "booking_reminders")
        mark_reminder_sent(booking['id'], reminder_setting['id'], status='failed', error_message=str(e))
        return False


async def check_and_send_reminders():
    """Главная функция проверки и отправки напоминаний"""
    log_info("🔔 Начинаю проверку напоминаний о записях...", "booking_reminders")

    try:
        # Получаем активные настройки напоминаний
        reminder_settings = get_active_reminder_settings()
        if not reminder_settings:
            log_info("⚠️ Нет активных настроек напоминаний", "booking_reminders")
            return

        log_info(f"📋 Найдено активных настроек: {len(reminder_settings)}", "booking_reminders")

        # Получаем будущие записи
        bookings = get_bookings_needing_reminders()
        if not bookings:
            log_info("✓ Нет предстоящих записей для напоминаний", "booking_reminders")
            return

        log_info(f"📅 Найдено предстоящих записей: {len(bookings)}", "booking_reminders")

        # Получаем настройки салона
        salon_settings = get_salon_settings()

        # Проверяем каждую запись с каждой настройкой
        now = datetime.now()
        sent_count = 0

        for booking in bookings:
            try:
                booking_dt = datetime.fromisoformat(booking['datetime'])
            except:
                log_error(f"Неверный формат даты для booking_id={booking['id']}", "booking_reminders")
                continue

            for reminder_setting in reminder_settings:
                # Проверяем, не отправляли ли уже это напоминание
                if check_if_reminder_sent(booking['id'], reminder_setting['id']):
                    continue

                # Вычисляем время отправки напоминания
                reminder_time = booking_dt - timedelta(
                    days=reminder_setting['days_before'],
                    hours=reminder_setting['hours_before']
                )

                # Проверяем, пора ли отправлять (с окном в 10 минут)
                time_diff = (reminder_time - now).total_seconds() / 60  # в минутах

                if -10 <= time_diff <= 10:  # Окно ±10 минут
                    log_info(
                        f"📨 Отправляю напоминание: {reminder_setting['name']} для booking_id={booking['id']}",
                        "booking_reminders"
                    )
                    await send_booking_reminder(booking, reminder_setting, salon_settings)
                    sent_count += 1

        log_info(f"✅ Проверка завершена. Отправлено напоминаний: {sent_count}", "booking_reminders")

    except Exception as e:
        log_error(f"Ошибка в check_and_send_reminders: {e}", "booking_reminders")


if __name__ == "__main__":
    # Для ручного запуска
    asyncio.run(check_and_send_reminders())
