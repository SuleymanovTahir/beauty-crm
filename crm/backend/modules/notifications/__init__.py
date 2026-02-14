"""
Модуль уведомлений

Поддерживает:
- Email уведомления
- Telegram уведомления
- Настройка каналов доставки для каждого события
"""
from typing import List, Dict, Any, Optional
from utils.logger import log_info, log_warning, log_error
from modules import get_module_config, is_module_enabled

def is_notifications_enabled() -> bool:
    """Проверить, включен ли модуль уведомлений"""
    return is_module_enabled('notifications')

def get_notification_channels(event: str) -> Dict[str, bool]:
    """
    Получить активные каналы для события

    Args:
        event: Тип события (new_booking, booking_cancelled, etc.)

    Returns:
        {'email': True, 'telegram': False}
    """
    if not is_notifications_enabled():
        return {'email': False, 'telegram': False}

    config = get_module_config('notifications')
    events = config.get('events', {})
    event_config = events.get(event, {})

    if not event_config.get('enabled', False):
        return {'email': False, 'telegram': False}

    channels = config.get('channels', {})

    return {
        'email': event_config.get('email', False) and channels.get('email', {}).get('enabled', False),
        'telegram': event_config.get('telegram', False) and channels.get('telegram', {}).get('enabled', False)
    }

async def send_notification(
    event: str,
    recipients: List[str],
    subject: str,
    message: str,
    **kwargs
) -> Dict[str, Any]:
    """
    Отправить уведомление через доступные каналы

    Args:
        event: Тип события (new_booking, booking_cancelled, etc.)
        recipients: Список получателей (email или telegram username)
        subject: Тема уведомления
        message: Текст уведомления
        **kwargs: Дополнительные параметры для конкретных каналов

    Returns:
        {'email': bool, 'telegram': bool, 'errors': []}
    """
    if not is_notifications_enabled():
        log_warning("Модуль уведомлений выключен", "notifications")
        return {'email': False, 'telegram': False, 'errors': ['Module disabled']}

    channels = get_notification_channels(event)
    results = {'email': False, 'telegram': False, 'errors': []}

    # Email
    if channels['email']:
        try:
            from .email import send_email_notification
            results['email'] = await send_email_notification(recipients, subject, message, **kwargs)
        except Exception as e:
            log_error(f"Ошибка отправки email: {e}", "notifications")
            results['errors'].append(f"Email: {str(e)}")

    # Telegram
    if channels['telegram']:
        try:
            from .telegram import send_telegram_notification
            results['telegram'] = await send_telegram_notification(recipients, message, **kwargs)
        except Exception as e:
            log_error(f"Ошибка отправки Telegram: {e}", "notifications")
            results['errors'].append(f"Telegram: {str(e)}")

    return results

__all__ = [
    'is_notifications_enabled',
    'get_notification_channels',
    'send_notification'
]
