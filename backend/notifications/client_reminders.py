"""
Модуль для отправки напоминаний клиентам о записях
"""
import sqlite3
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
import asyncio
from core.config import DATABASE_NAME, PAGE_ACCESS_TOKEN, TELEGRAM_BOT_TOKEN, INSTAGRAM_BUSINESS_ID
from utils.logger import log_info, log_error


async def send_instagram_reminder(client_id: str, message: str) -> bool:
    """Отправить напоминание в Instagram"""
    if not PAGE_ACCESS_TOKEN:
        log_error("Instagram access token not configured", "reminders")
        return False

    try:
        import aiohttp

        url = f"https://graph.facebook.com/v21.0/{INSTAGRAM_BUSINESS_ID}/messages"

        payload = {
            "recipient": {"id": client_id},
            "message": {"text": message}
        }

        headers = {
            "Authorization": f"Bearer {PAGE_ACCESS_TOKEN}",
            "Content-Type": "application/json"
        }

        async with aiohttp.ClientSession() as session:
            async with session.post(url, json=payload, headers=headers) as resp:
                if resp.status == 200:
                    log_info(f"Instagram reminder sent to {client_id}", "reminders")
                    return True
                else:
                    error_text = await resp.text()
                    log_error(f"Instagram API error: {error_text}", "reminders")
                    return False

    except Exception as e:
        log_error(f"Error sending Instagram reminder: {e}", "reminders")
        return False


async def send_telegram_reminder(client_id: str, message: str) -> bool:
    """Отправить напоминание в Telegram"""
    if not TELEGRAM_BOT_TOKEN:
        log_error("Telegram bot token not configured", "reminders")
        return False

    try:
        import aiohttp

        # Получаем telegram_chat_id клиента
        conn = sqlite3.connect(DATABASE_NAME)
        c = conn.cursor()

        c.execute("""
            SELECT telegram_chat_id FROM messenger_messages
            WHERE client_id = ? AND messenger_type = 'telegram'
            ORDER BY created_at DESC LIMIT 1
        """, (client_id,))

        result = c.fetchone()
        conn.close()

        if not result or not result[0]:
            log_error(f"Telegram chat_id not found for client {client_id}", "reminders")
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
                    log_info(f"Telegram reminder sent to {client_id}", "reminders")
                    return True
                else:
                    error_text = await resp.text()
                    log_error(f"Telegram API error: {error_text}", "reminders")
                    return False

    except Exception as e:
        log_error(f"Error sending Telegram reminder: {e}", "reminders")
        return False


async def send_whatsapp_reminder(client_id: str, message: str) -> bool:
    """Отправить напоминание в WhatsApp"""
    # TODO: Реализовать отправку через WhatsApp Business API
    log_error("WhatsApp reminders not implemented yet", "reminders")
    return False


def get_client_preferred_messenger(client_id: str) -> Optional[str]:
    """Получить предпочтительный мессенджер клиента"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    # Пытаемся получить из таблицы clients (если она существует)
    try:
        c.execute("SELECT preferred_messenger FROM clients WHERE instagram_id = ?", (client_id,))
        result = c.fetchone()
        conn.close()

        if result and result[0]:
            return result[0]

    except sqlite3.OperationalError:
        # Таблица clients не существует или нет поля preferred_messenger
        pass
    finally:
        try:
            conn.close()
        except:
            pass

    # Если preferred_messenger не указан, определяем автоматически
    # по последним сообщениям
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    # Проверяем Instagram
    c.execute("SELECT COUNT(*) FROM chat_history WHERE instagram_id = ?", (client_id,))
    if c.fetchone()[0] > 0:
        conn.close()
        return 'instagram'

    # Проверяем другие мессенджеры
    c.execute("""
        SELECT messenger_type, MAX(created_at) as last_message
        FROM messenger_messages
        WHERE client_id = ?
        GROUP BY messenger_type
        ORDER BY last_message DESC
        LIMIT 1
    """, (client_id,))

    result = c.fetchone()
    conn.close()

    if result:
        return result[0]

    return 'instagram'  # По умолчанию


async def send_reminder_via_preferred_messenger(
    client_id: str,
    client_name: str,
    service: str,
    datetime_str: str,
    master: str = "",
    preferred_messenger: str = None
) -> Dict[str, Any]:
    """
    Отправить напоминание клиенту через предпочтительный мессенджер

    Returns:
        Dict с результатом отправки
    """
    # Определяем предпочтительный мессенджер
    if not preferred_messenger:
        preferred_messenger = get_client_preferred_messenger(client_id)

    # Форматируем дату и время
    try:
        dt = datetime.fromisoformat(datetime_str.replace(' ', 'T'))
        formatted_datetime = dt.strftime('%d.%m.%Y в %H:%M')
        formatted_date = dt.strftime('%d.%m.%Y')
        formatted_time = dt.strftime('%H:%M')
    except:
        formatted_datetime = datetime_str
        formatted_date = datetime_str
        formatted_time = ""

    # Формируем сообщение
    message = f"""
🔔 Напоминание о записи

Привет, {client_name}!

Напоминаем, что у вас запись:
💆 Услуга: {service}
📅 Дата: {formatted_date}
🕐 Время: {formatted_time}
"""

    if master:
        message += f"👤 Мастер: {master}\n"

    message += """
Ждём вас! 😊

Если не сможете прийти, пожалуйста, предупредите заранее.
"""

    # Отправляем через выбранный мессенджер
    success = False
    error_message = None

    try:
        if preferred_messenger == 'instagram':
            success = await send_instagram_reminder(client_id, message)
        elif preferred_messenger == 'telegram':
            success = await send_telegram_reminder(client_id, message)
        elif preferred_messenger == 'whatsapp':
            success = await send_whatsapp_reminder(client_id, message)
        else:
            # Fallback на Instagram
            success = await send_instagram_reminder(client_id, message)
            preferred_messenger = 'instagram'

        if not success:
            error_message = f"Failed to send via {preferred_messenger}"

    except Exception as e:
        error_message = str(e)
        log_error(f"Error sending reminder: {e}", "reminders")

    return {
        "success": success,
        "messenger": preferred_messenger,
        "client_id": client_id,
        "error": error_message
    }


async def send_reminders_for_upcoming_bookings(hours_before: int = 24) -> List[Dict[str, Any]]:
    """
    Отправить напоминания для всех предстоящих записей

    Args:
        hours_before: За сколько часов до записи отправлять напоминание

    Returns:
        Список результатов отправки
    """
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    # Вычисляем временной интервал
    now = datetime.now()
    reminder_time = now + timedelta(hours=hours_before)

    # Находим записи, для которых нужно отправить напоминания
    c.execute("""
        SELECT id, instagram_id, name, service_name, datetime, master
        FROM bookings
        WHERE status = 'pending'
        AND datetime BETWEEN ? AND ?
        AND datetime > ?
    """, (
        now.isoformat(),
        reminder_time.isoformat(),
        now.isoformat()
    ))

    bookings = c.fetchall()
    conn.close()

    results = []

    # Отправляем напоминания
    for booking in bookings:
        booking_id, client_id, name, service, datetime_str, master = booking

        try:
            result = await send_reminder_via_preferred_messenger(
                client_id=client_id,
                client_name=name or "Клиент",
                service=service,
                datetime_str=datetime_str,
                master=master or ""
            )

            result["booking_id"] = booking_id
            results.append(result)

            # Логируем отправку
            log_info(
                f"Reminder sent for booking #{booking_id}: {result['messenger']} - {'✅' if result['success'] else '❌'}",
                "reminders"
            )

        except Exception as e:
            log_error(f"Error sending reminder for booking #{booking_id}: {e}", "reminders")
            results.append({
                "success": False,
                "booking_id": booking_id,
                "client_id": client_id,
                "error": str(e)
            })

    return results


def save_reminder_log(
    booking_id: int,
    client_id: str,
    messenger_type: str,
    status: str,
    error_message: str = None
):
    """Сохранить лог напоминания"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    try:
        # Создаем таблицу для логов напоминаний, если её нет
        c.execute("""
            CREATE TABLE IF NOT EXISTS reminder_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                booking_id INTEGER,
                client_id TEXT,
                messenger_type TEXT,
                status TEXT,
                error_message TEXT,
                created_at TEXT,
                FOREIGN KEY (booking_id) REFERENCES bookings(id)
            )
        """)

        # Сохраняем лог
        c.execute("""
            INSERT INTO reminder_logs
            (booking_id, client_id, messenger_type, status, error_message, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (booking_id, client_id, messenger_type, status, error_message,
              datetime.now().isoformat()))

        conn.commit()

    except Exception as e:
        log_error(f"Error saving reminder log: {e}", "reminders")
        conn.rollback()
    finally:
        conn.close()
