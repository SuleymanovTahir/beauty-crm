"""
Модуль для отправки уведомлений мастерам о новых записях
"""
from datetime import datetime
from typing import Optional, Dict, Any
import asyncio
from db.connection import get_db_connection
from core.config import TELEGRAM_BOT_TOKEN
from utils.logger import log_info, log_error


async def send_telegram_notification(telegram_username: str, message: str, user_id: int = None) -> bool:
    """Отправить уведомление в Telegram"""
    if not TELEGRAM_BOT_TOKEN:
        log_error("Telegram bot token not configured", "notifications")
        return False

    try:
        import aiohttp

        # Получаем chat_id пользователя
        conn = get_db_connection()
        c = conn.cursor()

        # Проверяем, есть ли у нас сохраненный telegram_chat_id
        if user_id:
            c.execute("SELECT telegram_chat_id FROM users WHERE id = ?", (user_id,))
        else:
            c.execute("""
                SELECT telegram_chat_id FROM users
                WHERE telegram_username = ?
            """, (telegram_username.replace('@', ''),))

        result = c.fetchone()
        conn.close()

        if not result or not result[0]:
            log_error(f"Telegram chat_id not found for user {user_id or telegram_username}", "notifications")
            return False

        chat_id = result[0]

        # Отправляем сообщение
        url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
        data = {
            "chat_id": chat_id,
            "text": message,
            "parse_mode": "HTML"
        }

        async with aiohttp.ClientSession() as session:
            async with session.post(url, json=data) as resp:
                if resp.status == 200:
                    log_info(f"Telegram notification sent to @{telegram_username}", "notifications")
                    return True
                else:
                    error_text = await resp.text()
                    log_error(f"Telegram API error: {error_text}", "notifications")
                    return False

    except Exception as e:
        log_error(f"Error sending Telegram notification: {e}", "notifications")
        return False


async def send_email_notification(email: str, subject: str, message: str) -> bool:
    """Отправить уведомление на email"""
    try:
        import smtplib
        from email.mime.text import MIMEText
        from email.mime.multipart import MIMEMultipart
        import os

        # Получаем настройки SMTP из переменных окружения
        smtp_host = os.getenv("SMTP_HOST")
        smtp_port = int(os.getenv("SMTP_PORT", "587"))
        smtp_user = os.getenv("SMTP_USER")
        smtp_password = os.getenv("SMTP_PASSWORD")
        smtp_from = os.getenv("SMTP_FROM", smtp_user)

        if not all([smtp_host, smtp_user, smtp_password]):
            log_error("SMTP settings not configured", "notifications")
            return False

        # Создаем сообщение
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = smtp_from
        msg['To'] = email

        # HTML версия письма
        html = f"""
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6;">
                {message.replace(chr(10), '<br>')}
            </body>
        </html>
        """

        msg.attach(MIMEText(message, 'plain'))
        msg.attach(MIMEText(html, 'html'))

        # Отправляем
        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.starttls()
            server.login(smtp_user, smtp_password)
            server.send_message(msg)

        log_info(f"Email notification sent to {email}", "notifications")
        return True

    except Exception as e:
        log_error(f"Error sending email notification: {e}", "notifications")
        return False


def get_master_info(master_name: str) -> Optional[Dict[str, Any]]:
    """Получить информацию о мастере по имени"""
    conn = get_db_connection()
    c = conn.cursor()

    # Ищем мастера по full_name или username
    c.execute("""
        SELECT id, username, full_name, email, phone, telegram_username, telegram_chat_id, role,
               notify_telegram, notify_email, notify_whatsapp,
               notify_on_new_booking, notify_on_booking_change, notify_on_booking_cancel
        FROM users
        WHERE (LOWER(full_name) = LOWER(?) OR LOWER(username) = LOWER(?))
        AND role IN ('employee', 'admin', 'manager')
        AND is_active = 1
    """, (master_name, master_name))

    result = c.fetchone()
    conn.close()

    if not result:
        return None

    return {
        "id": result[0],
        "username": result[1],
        "full_name": result[2],
        "email": result[3],
        "phone": result[4],
        "telegram_username": result[5],
        "telegram_chat_id": result[6],
        "role": result[7],
        "notify_telegram": bool(result[8]) if len(result) > 8 and result[8] is not None else True,
        "notify_email": bool(result[9]) if len(result) > 9 and result[9] is not None else True,
        "notify_whatsapp": bool(result[10]) if len(result) > 10 and result[10] is not None else False,
        "notify_on_new_booking": bool(result[11]) if len(result) > 11 and result[11] is not None else True,
        "notify_on_booking_change": bool(result[12]) if len(result) > 12 and result[12] is not None else True,
        "notify_on_booking_cancel": bool(result[13]) if len(result) > 13 and result[13] is not None else True,
    }


async def notify_master_about_booking(
    master_name: str,
    client_name: str,
    service: str,
    datetime_str: str,
    phone: str = "",
    booking_id: int = None,
    notification_type: str = "new_booking"  # new_booking, booking_change, booking_cancel
) -> Dict[str, bool]:
    """
    Отправить уведомление мастеру о записи

    Args:
        notification_type: тип уведомления (new_booking, booking_change, booking_cancel)

    Returns:
        Dict с результатами отправки по каждому каналу
    """
    results = {
        "telegram": False,
        "email": False,
        "sms": False  # Пока не реализовано
    }

    if not master_name:
        log_error("Master name not provided", "notifications")
        return results

    # Получаем информацию о мастере
    master = get_master_info(master_name)
    if not master:
        log_error(f"Master not found: {master_name}", "notifications")
        return results

    # Проверяем, хочет ли мастер получать этот тип уведомлений
    if notification_type == "new_booking" and not master.get("notify_on_new_booking", True):
        log_info(f"Master {master_name} disabled new booking notifications", "notifications")
        return results
    elif notification_type == "booking_change" and not master.get("notify_on_booking_change", True):
        log_info(f"Master {master_name} disabled booking change notifications", "notifications")
        return results
    elif notification_type == "booking_cancel" and not master.get("notify_on_booking_cancel", True):
        log_info(f"Master {master_name} disabled booking cancel notifications", "notifications")
        return results

    # Форматируем дату и время
    try:
        dt = datetime.fromisoformat(datetime_str.replace(' ', 'T'))
        formatted_datetime = dt.strftime('%d.%m.%Y в %H:%M')
    except:
        formatted_datetime = datetime_str

    # Формируем сообщение в зависимости от типа
    if notification_type == "new_booking":
        icon = "🔔"
        title = "Новая запись!"
    elif notification_type == "booking_change":
        icon = "✏️"
        title = "Запись изменена!"
    elif notification_type == "booking_cancel":
        icon = "❌"
        title = "Запись отменена!"
    else:
        icon = "📋"
        title = "Уведомление о записи"

    message = f"""
{icon} {title}

👤 Клиент: {client_name}
💆 Услуга: {service}
📅 Дата и время: {formatted_datetime}
"""

    if phone:
        message += f"📞 Телефон: {phone}\n"

    if booking_id:
        message += f"\n📋 ID записи: #{booking_id}"

    # Отправляем уведомления согласно настройкам мастера
    tasks = []

    # Telegram
    if master.get("notify_telegram", True) and master.get("telegram_chat_id"):
        tasks.append(send_telegram_notification(
            master.get("telegram_username", ""),
            message,
            user_id=master["id"]
        ))

    # Email
    if master.get("notify_email", True) and master.get("email"):
        subject = f"{title} на {formatted_datetime}"
        tasks.append(send_email_notification(master["email"], subject, message))

    # Выполняем все задачи параллельно
    if tasks:
        task_results = await asyncio.gather(*tasks, return_exceptions=True)

        # Обрабатываем результаты
        if master.get("telegram_username") and len(task_results) > 0:
            results["telegram"] = task_results[0] if not isinstance(task_results[0], Exception) else False

        if master.get("email"):
            email_idx = 1 if master.get("telegram_username") else 0
            if len(task_results) > email_idx:
                results["email"] = task_results[email_idx] if not isinstance(task_results[email_idx], Exception) else False

    log_info(f"Notification sent to master {master_name}: {results}", "notifications")
    return results


def save_notification_log(
    master_id: int,
    booking_id: int,
    notification_type: str,
    status: str,
    error_message: str = None
):
    """Сохранить лог уведомления"""
    conn = get_db_connection()
    c = conn.cursor()

    try:
        # Создаем таблицу для логов уведомлений, если её нет
        c.execute("""
            CREATE TABLE IF NOT EXISTS notification_logs (
                id SERIAL PRIMARY KEY,
                master_id INTEGER,
                booking_id INTEGER,
                notification_type TEXT,
                status TEXT,
                error_message TEXT,
                created_at TEXT,
                FOREIGN KEY (master_id) REFERENCES users(id),
                FOREIGN KEY (booking_id) REFERENCES bookings(id)
            )
        """)

        # Сохраняем лог
        c.execute("""
            INSERT INTO notification_logs
            (master_id, booking_id, notification_type, status, error_message, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (master_id, booking_id, notification_type, status, error_message,
              datetime.now().isoformat()))

        conn.commit()

    except Exception as e:
        log_error(f"Error saving notification log: {e}", "notifications")
        conn.rollback()
    finally:
        conn.close()
