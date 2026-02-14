"""
Email templates for system notifications.
"""

def get_booking_notification_email(
    date_str: str,
    time_str: str,
    service_name: str,
    master_name: str,
    client_name: str,
    client_phone: str,
    is_bot_booking: bool = True
) -> dict:
    """
    Generates subject and body for booking notification email.
    """
    subject = f"НОВАЯ ЗАПИСЬ: {date_str} {time_str} - {service_name}"
    
    source_text = "(Получено через AI-ассистента)" if is_bot_booking else "(Запись через админку/сайт)"
    
    body = f"""
    Новая запись подтверждена!
    
    Дата: {date_str}
    Время: {time_str}
    Услуга: {service_name}
    Мастер: {master_name}
    
    Клиент: {client_name}
    Телефон: {client_phone}
    {source_text}
    """
    
    return {
        "subject": subject,
        "body": body
    }
