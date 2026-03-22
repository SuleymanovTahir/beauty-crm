"""
Email уведомления
"""
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import List, Optional
from core.config import APP_NAME
from modules import get_module_config
from utils.logger import log_info, log_error


def _notification_brand_name(salon_data: dict) -> str:
    """Return tenant business name or the neutral product fallback."""
    if not isinstance(salon_data, dict):
        return APP_NAME
    return (salon_data.get('name') or APP_NAME).strip() or APP_NAME

def get_smtp_config() -> dict:
    """Получить SMTP конфигурацию"""
    config = get_module_config('notifications')
    return config.get('channels', {}).get('email', {})

async def send_email_notification(
    recipients: List[str],
    subject: str,
    message: str,
    html: Optional[str] = None
) -> bool:
    """
    Отправить email уведомление

    Args:
        recipients: Список email адресов
        subject: Тема письма
        message: Текст письма (plain text)
        html: HTML версия письма (опционально)

    Returns:
        True если успешно отправлено, False иначе
    """
    smtp_config = get_smtp_config()

    if not smtp_config.get('enabled', False):
        log_error("Email канал выключен", "notifications.email")
        return False

    # Проверка обязательных настроек
    required = ['smtp_host', 'smtp_port', 'smtp_user', 'smtp_password', 'from_email']
    for field in required:
        if not smtp_config.get(field):
            log_error(f"Не указан обязательный параметр: {field}", "notifications.email")
            return False

    try:
        # Создание сообщения
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = f"{smtp_config.get('from_name', '')} <{smtp_config['from_email']}>"
        msg['To'] = ', '.join(recipients)

        # Добавление текстовой части
        part1 = MIMEText(message, 'plain', 'utf-8')
        msg.attach(part1)

        # Добавление HTML части (если есть)
        if html:
            part2 = MIMEText(html, 'html', 'utf-8')
            msg.attach(part2)

        # Подключение к SMTP серверу
        with smtplib.SMTP(smtp_config['smtp_host'], smtp_config['smtp_port']) as server:
            server.starttls()
            server.login(smtp_config['smtp_user'], smtp_config['smtp_password'])
            server.send_message(msg)

        log_info(f"✅ Email отправлен: {subject} → {', '.join(recipients)}", "notifications.email")
        return True

    except Exception as e:
        log_error(f"Ошибка отправки email: {e}", "notifications.email")
        return False

def format_new_booking_email(booking_data: dict, salon_data: dict) -> tuple[str, str]:
    """
    Форматировать email для уведомления о новой записи

    Args:
        booking_data: Данные бронирования
        salon_data: Данные салона

    Returns:
        (plain_text, html_text)
    """
    client_name = booking_data.get('client_name', 'Клиент')
    service = booking_data.get('service', 'Услуга')
    datetime_str = booking_data.get('datetime', '')
    phone = booking_data.get('phone', '')
    notes = booking_data.get('notes', '')
    brand_name = _notification_brand_name(salon_data)

    # Plain text версия
    plain = f"""
Новая запись онлайн!

Клиент: {client_name}
Телефон: {phone}
Услуга: {service}
Дата и время: {datetime_str}
Примечания: {notes if notes else 'Нет'}

---
{brand_name}
"""

    # HTML версия
    html = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px 10px 0 0; }}
        .content {{ background: #f9f9f9; padding: 20px; }}
        .info-row {{ margin: 10px 0; }}
        .label {{ font-weight: bold; color: #333; }}
        .value {{ color: #555; }}
        .footer {{ background: #333; color: #fff; padding: 15px; text-align: center; border-radius: 0 0 10px 10px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>🎉 Новая запись онлайн!</h2>
        </div>
        <div class="content">
            <div class="info-row">
                <span class="label">👤 Клиент:</span>
                <span class="value">{client_name}</span>
            </div>
            <div class="info-row">
                <span class="label">📱 Телефон:</span>
                <span class="value">{phone}</span>
            </div>
            <div class="info-row">
                <span class="label">💅 Услуга:</span>
                <span class="value">{service}</span>
            </div>
            <div class="info-row">
                <span class="label">📅 Дата и время:</span>
                <span class="value">{datetime_str}</span>
            </div>
            {f'<div class="info-row"><span class="label">📝 Примечания:</span><span class="value">{notes}</span></div>' if notes else ''}
        </div>
        <div class="footer">
            {brand_name}
        </div>
    </div>
</body>
</html>
"""

    return plain, html
