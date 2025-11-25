"""
Telegram уведомления
"""
import httpx
from typing import List, Optional
from modules import get_module_config
from utils.logger import log_info, log_error


def get_telegram_config() -> dict:
    """Получить Telegram конфигурацию"""
    config = get_module_config('notifications')
    return config.get('channels', {}).get('telegram', {})


async def send_telegram_notification(
    recipients: List[str],
    message: str,
    parse_mode: str = "HTML"
) -> bool:
    """
    Отправить Telegram уведомление

    Args:
        recipients: Список chat_id или username
        message: Текст сообщения
        parse_mode: Режим парсинга (HTML, Markdown, None)

    Returns:
        True если успешно отправлено, False иначе
    """
    telegram_config = get_telegram_config()

    if not telegram_config.get('enabled', False):
        log_error("Telegram канал выключен", "notifications.telegram")
        return False

    bot_token = telegram_config.get('bot_token')
    if not bot_token:
        log_error("Не указан bot_token для Telegram", "notifications.telegram")
        return False

    # Если recipients пустой, используем notification_chat_id из конфига
    if not recipients:
        default_chat = telegram_config.get('notification_chat_id')
        if default_chat:
            recipients = [default_chat]
        else:
            log_error("Не указаны получатели и нет notification_chat_id", "notifications.telegram")
            return False

    success = True
    async with httpx.AsyncClient(timeout=10.0) as client:
        for chat_id in recipients:
            try:
                url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
                payload = {
                    "chat_id": chat_id,
                    "text": message,
                    "parse_mode": parse_mode
                }

                response = await client.post(url, json=payload)
                response.raise_for_status()

                log_info(f"✅ Telegram отправлено → {chat_id}", "notifications.telegram")

            except Exception as e:
                log_error(f"Ошибка отправки в Telegram ({chat_id}): {e}", "notifications.telegram")
                success = False

    return success


def format_new_booking_telegram(booking_data: dict, salon_data: dict) -> str:
    """
    Форматировать сообщение для Telegram о новой записи

    Args:
        booking_data: Данные бронирования
        salon_data: Данные салона

    Returns:
        Форматированное сообщение
    """
    client_name = booking_data.get('client_name', 'Клиент')
    service = booking_data.get('service', 'Услуга')
    datetime_str = booking_data.get('datetime', '')
    phone = booking_data.get('phone', '')
    notes = booking_data.get('notes', '')
    employee_name = booking_data.get('employee_name', 'Не указан')

    message = f"""
🎉 <b>Новая запись онлайн!</b>

👤 <b>Клиент:</b> {client_name}
📱 <b>Телефон:</b> {phone}
💅 <b>Услуга:</b> {service}
👨‍💼 <b>Мастер:</b> {employee_name}
📅 <b>Дата и время:</b> {datetime_str}
"""

    if notes:
        message += f"📝 <b>Примечания:</b> {notes}\n"

    message += f"\n---\n{salon_data.get('name', 'Салон красоты')}"

    return message


def format_booking_cancelled_telegram(booking_data: dict, salon_data: dict) -> str:
    """Форматировать сообщение об отмене записи"""
    client_name = booking_data.get('client_name', 'Клиент')
    service = booking_data.get('service', 'Услуга')
    datetime_str = booking_data.get('datetime', '')

    message = f"""
❌ <b>Запись отменена</b>

👤 <b>Клиент:</b> {client_name}
💅 <b>Услуга:</b> {service}
📅 <b>Дата и время:</b> {datetime_str}

---
{salon_data.get('name', 'Салон красоты')}
"""

    return message
