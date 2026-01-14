#!/usr/bin/env python3
"""
Универсальный Email сервис для отправки различных типов писем
Поддерживает verification codes, admin notifications, password resets
"""
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
import random
import string
from datetime import datetime, timedelta

from utils.logger import log_info, log_error, log_warning


def get_salon_name() -> str:
    """
    Получить название салона из базы данных
    Returns: Название салона или 'Beauty Salon' по умолчанию
    """
    try:
        from db import get_salon_settings
        salon_settings = get_salon_settings()
        return salon_settings.get('salon_name', 'Beauty Salon')
    except Exception as e:
        log_warning(f"Could not get salon name: {e}", "email")
        return 'Beauty Salon'



def configure_smtp() -> dict:
    """
    Конфигурация SMTP из переменных окружения
    Returns: dict с настройками SMTP или None если не настроено
    """
    smtp_config = {
        'host': os.getenv('SMTP_HOST', 'smtp.gmail.com'),
        'port': int(os.getenv('SMTP_PORT', 587)),
        'user': os.getenv('SMTP_USER', ''),
        'password': os.getenv('SMTP_PASSWORD', ''),
        'from_email': os.getenv('SMTP_FROM_EMAIL', os.getenv('SMTP_USER', '')),
        'from_name': os.getenv('SMTP_FROM_NAME', get_salon_name())
    }
    
    if not smtp_config['user'] or not smtp_config['password']:
        log_warning("SMTP credentials not configured in environment variables", "email")
        return None
    
    return smtp_config


def generate_verification_code(length: int = 6) -> str:
    """
    Генерирует случайный цифровой код верификации
    Args:
        length: Длина кода (по умолчанию 6)
    Returns: Строка с кодом
    """
    return ''.join(random.choices(string.digits, k=length))


def get_code_expiry(minutes: int = 15) -> str:
    """
    Получить время истечения кода верификации
    Args:
        minutes: Количество минут до истечения
    Returns: ISO formatted datetime string
    """
    expiry = datetime.now() + timedelta(minutes=minutes)
    return expiry.isoformat()


def send_email(
    to_email: str,
    subject: str,
    html_body: str,
    text_body: Optional[str] = None
) -> bool:
    """
    Универсальная функция отправки email
    
    Args:
        to_email: Email получателя
        subject: Тема письма
        html_body: HTML содержимое письма
        text_body: Текстовое содержимое (fallback)
    
    Returns: True если отправлено успешно
    """
    smtp_config = configure_smtp()
    
    if not smtp_config:
        log_warning(f"Cannot send email to {to_email}: SMTP not configured", "email")
        return False
    
    try:
        # Создаем сообщение
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = f"{smtp_config['from_name']} <{smtp_config['from_email']}>"
        msg['To'] = to_email
        
        # Добавляем текстовую версию
        if text_body:
            part1 = MIMEText(text_body, 'plain', 'utf-8')
            msg.attach(part1)
        
        # Добавляем HTML версию
        part2 = MIMEText(html_body, 'html', 'utf-8')
        msg.attach(part2)
        
        # Отправляем
        with smtplib.SMTP(smtp_config['host'], smtp_config['port']) as server:
            server.starttls()
            server.login(smtp_config['user'], smtp_config['password'])
            server.send_message(msg)
        
        log_info(f"Email sent successfully to {to_email}", "email")
        return True
        
    except Exception as e:
        log_error(f"Failed to send email to {to_email}: {e}", "email")
        return False


def send_verification_code_email(email: str, code: str, name: str, user_type: str = "user") -> bool:
    """
    Отправить код верификации на email
    
    Args:
        email: Email получателя
        code: Код верификации
        name: Имя пользователя
        user_type: Тип пользователя ('user' или 'client')
    
    Returns: True если отправлено успешно
    """
    salon_name = get_salon_name()
    subject = f"Подтверждение email - {salon_name}"
    
    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                       color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
            .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
            .code-box {{ background: white; border: 2px dashed #667eea; padding: 20px; 
                         text-align: center; font-size: 32px; font-weight: bold; 
                         color: #667eea; margin: 20px 0; border-radius: 8px; 
                         letter-spacing: 8px; }}
            .footer {{ text-align: center; margin-top: 20px; color: #666; font-size: 12px; }}
            .button {{ display: inline-block; padding: 12px 30px; background: #667eea; 
                      color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>💎 {salon_name}</h1>
                <p>Подтверждение регистрации</p>
            </div>
            <div class="content">
                <h2>Здравствуйте, {name}!</h2>
                <p>Спасибо за регистрацию в нашей системе. Для завершения регистрации введите код подтверждения:</p>
                
                <div class="code-box">{code}</div>
                
                <p><strong>Код действителен в течение 15 минут.</strong></p>
                
                <p>Если вы не регистрировались в {salon_name}, просто проигнорируйте это письмо.</p>
                
                <div class="footer">
                    <p>С уважением,<br>Команда {salon_name}</p>
                    <p>Это автоматическое письмо, пожалуйста, не отвечайте на него.</p>
                </div>
            </div>
        </div>
    </body>
    </html>
    """
    
    text_body = f"""
    {salon_name} - Подтверждение email
    
    Здравствуйте, {name}!
    
    Спасибо за регистрацию в нашей системе.
    Для завершения регистрации введите код подтверждения:
    
    {code}
    
    Код действителен в течение 15 минут.
    
    Если вы не регистрировались в {salon_name}, просто проигнорируйте это письмо.
    
    С уважением,
    Команда {salon_name}
    """
    
    return send_email(email, subject, html_body, text_body)


def send_admin_notification_email(admin_email: str, user_data: dict) -> bool:
    """
    Уведомить админа о новой регистрации
    
    Args:
        admin_email: Email администратора
        user_data: Данные пользователя (username, email, full_name, role)
    
    Returns: True если отправлено успешно
    """
    salon_name = get_salon_name()
    subject = f"Новая регистрация: {user_data.get('full_name', 'Unknown')}"
    
    admin_panel_url = os.getenv('ADMIN_PANEL_URL', 'http://localhost:5173/admin/registrations')
    
    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: #f59e0b; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }}
            .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
            .info-box {{ background: white; padding: 15px; margin: 15px 0; border-left: 4px solid #f59e0b; }}
            .button {{ display: inline-block; padding: 12px 30px; background: #f59e0b; 
                      color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>⭐ Новая регистрация!</h1>
            </div>
            <div class="content">
                <p>Новый пользователь зарегистрировался в системе и ожидает одобрения:</p>
                
                <div class="info-box">
                    <strong>Имя:</strong> {user_data.get('full_name', 'Не указано')}<br>
                    <strong>Email:</strong> {user_data.get('email', 'Не указан')}<br>
                    <strong>Логин:</strong> {user_data.get('username', 'Не указан')}<br>
                    <strong>Роль:</strong> {user_data.get('role', 'employee')}<br>
                    <strong>Должность:</strong> {user_data.get('position', 'Не указана')}<br>
                    <strong>Дата регистрации:</strong> {datetime.now().strftime('%d.%m.%Y %H:%M')}
                </div>
                
                <p>Пожалуйста, перейдите в админ-панель для одобрения или отклонения регистрации:</p>
                
                <a href="{admin_panel_url}" class="button">Перейти в админ-панель</a>
            </div>
        </div>
    </body>
    </html>
    """
    
    text_body = f"""
    Новая регистрация в {salon_name}
    
    Новый пользователь зарегистрировался в системе и ожидает одобрения:
    
    Имя: {user_data.get('full_name', 'Не указано')}
    Email: {user_data.get('email', 'Не указан')}
    Логин: {user_data.get('username', 'Не указан')}
    Роль: {user_data.get('role', 'employee')}
    Должность: {user_data.get('position', 'Не указана')}
    Дата регистрации: {datetime.now().strftime('%d.%m.%Y %H:%M')}
    
    Перейдите в админ-панель для одобрения или отклонения регистрации:
    {admin_panel_url}
    """
    
    return send_email(admin_email, subject, html_body, text_body)


def send_registration_approved_email(email: str, name: str) -> bool:
    """
    Уведомить пользователя что его регистрация одобрена
    
    Args:
        email: Email пользователя
        name: Имя пользователя
    
    Returns: True если отправлено успешно
    """
    salon_name = get_salon_name()
    subject = f"Регистрация одобрена - {salon_name}"
    
    login_url = os.getenv('APP_URL', 'http://localhost:5173') + '/login'
    
    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #10b981 0%, #059669 100%); 
                       color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
            .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
            .button {{ display: inline-block; padding: 12px 30px; background: #10b981; 
                      color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>✅ Регистрация одобрена!</h1>
            </div>
            <div class="content">
                <h2>Здравствуйте, {name}!</h2>
                <p>Ваша регистрация в {salon_name} была одобрена администратором.</p>
                <p>Теперь вы можете войти в систему используя свои учетные данные:</p>
                
                <a href="{login_url}" class="button">Войти в систему</a>
                
                <p>Добро пожаловать в {salon_name}!</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    text_body = f"""
    {salon_name} - Регистрация одобрена
    
    Здравствуйте, {name}!
    
    Ваша регистрация в {salon_name} была одобрена администратором.
    Теперь вы можете войти в систему используя свои учетные данные:
    
    {login_url}
    
    Добро пожаловать в {salon_name}!
    """
    
    return send_email(email, subject, html_body, text_body)


def send_registration_rejected_email(email: str, name: str, reason: str = "") -> bool:
    """
    Уведомить пользователя что его регистрация отклонена
    
    Args:
        email: Email пользователя
        name: Имя пользователя
        reason: Причина отклонения (опционально)
    
    Returns: True если отправлено успешно
    """
    salon_name = get_salon_name()
    subject = f"Регистрация отклонена - {salon_name}"
    
    reason_text = f"<p><strong>Причина:</strong> {reason}</p>" if reason else ""
    reason_plain = f"\nПричина: {reason}\n" if reason else ""
    
    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: #ef4444; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
            .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>❌ Регистрация отклонена</h1>
            </div>
            <div class="content">
                <h2>Здравствуйте, {name}!</h2>
                <p>К сожалению, ваша регистрация в {salon_name} была отклонена администратором.</p>
                {reason_text}
                <p>Если у вас есть вопросы, пожалуйста, свяжитесь с администратором.</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    text_body = f"""
    {salon_name} - Регистрация отклонена
    
    Здравствуйте, {name}!
    
    К сожалению, ваша регистрация в {salon_name} была отклонена администратором.
    {reason_plain}
    Если у вас есть вопросы, пожалуйста, свяжитесь с администратором.
    """
    
    return send_email(email, subject, html_body, text_body)


def send_newsletter_welcome_email(email: str) -> bool:
    """
    Отправить приветственное письмо подписчику рассылки
    """
    salon_name = get_salon_name()
    subject = f"Welcome to {salon_name} Newsletter!"
    
    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: #db2777; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
            .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Welcome to {salon_name}!</h1>
            </div>
            <div class="content">
                <p>Thank you for subscribing to {salon_name} newsletter.</p>
                <p>You will now receive updates about our latest features, beauty trends, and special offers.</p>
                <p>Stay tuned!</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    text_body = """
    Welcome to {salon_name}!
    
    Thank you for subscribing to our newsletter.
    You will now receive updates about our latest features, beauty trends, and special offers.
    """
    
    return send_email(email, subject, html_body, text_body)
