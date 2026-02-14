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

# Email translations for multi-language support
EMAIL_TRANSLATIONS = {
    'ru': {
        'registration_approved_subject': 'Регистрация одобрена',
        'registration_approved_title': 'Регистрация одобрена!',
        'registration_approved_greeting': 'Здравствуйте',
        'registration_approved_body': 'Ваша регистрация в {salon_name} была одобрена администратором.',
        'registration_approved_login_prompt': 'Теперь вы можете войти в систему используя свои учетные данные:',
        'registration_approved_button': 'Войти в систему',
        'registration_approved_welcome': 'Добро пожаловать в {salon_name}!',
        'registration_rejected_subject': 'Регистрация отклонена',
        'registration_rejected_title': 'Регистрация отклонена',
        'registration_rejected_greeting': 'Здравствуйте',
        'registration_rejected_body': 'К сожалению, ваша регистрация в {salon_name} была отклонена администратором.',
        'registration_rejected_reason': 'Причина',
        'registration_rejected_contact': 'Если у вас есть вопросы, пожалуйста, свяжитесь с администратором.',
    },
    'en': {
        'registration_approved_subject': 'Registration Approved',
        'registration_approved_title': 'Registration Approved!',
        'registration_approved_greeting': 'Hello',
        'registration_approved_body': 'Your registration at {salon_name} has been approved by the administrator.',
        'registration_approved_login_prompt': 'You can now log in using your credentials:',
        'registration_approved_button': 'Log In',
        'registration_approved_welcome': 'Welcome to {salon_name}!',
        'registration_rejected_subject': 'Registration Rejected',
        'registration_rejected_title': 'Registration Rejected',
        'registration_rejected_greeting': 'Hello',
        'registration_rejected_body': 'Unfortunately, your registration at {salon_name} has been rejected by the administrator.',
        'registration_rejected_reason': 'Reason',
        'registration_rejected_contact': 'If you have any questions, please contact the administrator.',
    },
    'ar': {
        'registration_approved_subject': 'تمت الموافقة على التسجيل',
        'registration_approved_title': 'تمت الموافقة على التسجيل!',
        'registration_approved_greeting': 'مرحباً',
        'registration_approved_body': 'تمت الموافقة على تسجيلك في {salon_name} من قبل المسؤول.',
        'registration_approved_login_prompt': 'يمكنك الآن تسجيل الدخول باستخدام بياناتك:',
        'registration_approved_button': 'تسجيل الدخول',
        'registration_approved_welcome': 'أهلاً بك في {salon_name}!',
        'registration_rejected_subject': 'تم رفض التسجيل',
        'registration_rejected_title': 'تم رفض التسجيل',
        'registration_rejected_greeting': 'مرحباً',
        'registration_rejected_body': 'للأسف، تم رفض تسجيلك في {salon_name} من قبل المسؤول.',
        'registration_rejected_reason': 'السبب',
        'registration_rejected_contact': 'إذا كانت لديك أي أسئلة، يرجى الاتصال بالمسؤول.',
    },
    'es': {
        'registration_approved_subject': 'Registro aprobado',
        'registration_approved_title': '¡Registro aprobado!',
        'registration_approved_greeting': 'Hola',
        'registration_approved_body': 'Tu registro en {salon_name} ha sido aprobado por el administrador.',
        'registration_approved_login_prompt': 'Ahora puedes iniciar sesión con tus credenciales:',
        'registration_approved_button': 'Iniciar sesión',
        'registration_approved_welcome': '¡Bienvenido a {salon_name}!',
        'registration_rejected_subject': 'Registro rechazado',
        'registration_rejected_title': 'Registro rechazado',
        'registration_rejected_greeting': 'Hola',
        'registration_rejected_body': 'Lamentablemente, tu registro en {salon_name} ha sido rechazado por el administrador.',
        'registration_rejected_reason': 'Razón',
        'registration_rejected_contact': 'Si tienes alguna pregunta, por favor contacta al administrador.',
    },
    'de': {
        'registration_approved_subject': 'Registrierung genehmigt',
        'registration_approved_title': 'Registrierung genehmigt!',
        'registration_approved_greeting': 'Hallo',
        'registration_approved_body': 'Ihre Registrierung bei {salon_name} wurde vom Administrator genehmigt.',
        'registration_approved_login_prompt': 'Sie können sich jetzt mit Ihren Zugangsdaten anmelden:',
        'registration_approved_button': 'Anmelden',
        'registration_approved_welcome': 'Willkommen bei {salon_name}!',
        'registration_rejected_subject': 'Registrierung abgelehnt',
        'registration_rejected_title': 'Registrierung abgelehnt',
        'registration_rejected_greeting': 'Hallo',
        'registration_rejected_body': 'Leider wurde Ihre Registrierung bei {salon_name} vom Administrator abgelehnt.',
        'registration_rejected_reason': 'Grund',
        'registration_rejected_contact': 'Bei Fragen wenden Sie sich bitte an den Administrator.',
    },
    'fr': {
        'registration_approved_subject': 'Inscription approuvée',
        'registration_approved_title': 'Inscription approuvée !',
        'registration_approved_greeting': 'Bonjour',
        'registration_approved_body': 'Votre inscription chez {salon_name} a été approuvée par l\'administrateur.',
        'registration_approved_login_prompt': 'Vous pouvez maintenant vous connecter avec vos identifiants :',
        'registration_approved_button': 'Se connecter',
        'registration_approved_welcome': 'Bienvenue chez {salon_name} !',
        'registration_rejected_subject': 'Inscription refusée',
        'registration_rejected_title': 'Inscription refusée',
        'registration_rejected_greeting': 'Bonjour',
        'registration_rejected_body': 'Malheureusement, votre inscription chez {salon_name} a été refusée par l\'administrateur.',
        'registration_rejected_reason': 'Raison',
        'registration_rejected_contact': 'Si vous avez des questions, veuillez contacter l\'administrateur.',
    },
    'pt': {
        'registration_approved_subject': 'Registro aprovado',
        'registration_approved_title': 'Registro aprovado!',
        'registration_approved_greeting': 'Olá',
        'registration_approved_body': 'Seu registro em {salon_name} foi aprovado pelo administrador.',
        'registration_approved_login_prompt': 'Agora você pode fazer login com suas credenciais:',
        'registration_approved_button': 'Entrar',
        'registration_approved_welcome': 'Bem-vindo ao {salon_name}!',
        'registration_rejected_subject': 'Registro rejeitado',
        'registration_rejected_title': 'Registro rejeitado',
        'registration_rejected_greeting': 'Olá',
        'registration_rejected_body': 'Infelizmente, seu registro em {salon_name} foi rejeitado pelo administrador.',
        'registration_rejected_reason': 'Motivo',
        'registration_rejected_contact': 'Se você tiver alguma dúvida, entre em contato com o administrador.',
    },
}

def get_email_translation(key: str, language: str = 'en') -> str:
    """Get email translation for a key in the specified language"""
    translations = EMAIL_TRANSLATIONS.get(language, EMAIL_TRANSLATIONS['en'])
    return translations.get(key, EMAIL_TRANSLATIONS['en'].get(key, key))


def get_salon_name() -> str:
    """
    Получить название салона из базы данных
    Returns: Название салона или 'Beauty Salon' из окружения или по умолчанию
    """
    try:
        from db import get_salon_settings
        salon_settings = get_salon_settings()
        # Corrected key from 'salon_name' to 'name'
        return salon_settings.get('name') or os.getenv('SALON_NAME') or 'Beauty Salon'
    except Exception as e:
        log_warning(f"Could not get salon name: {e}", "email")
        return os.getenv('SALON_NAME') or 'Beauty Salon'


def get_logo_url() -> str:
    """
    Получить полный URL логотипа салона
    Returns: URL логотипа или пустая строка
    """
    try:
        from db import get_salon_settings
        from core.config import PUBLIC_URL, BASE_DIR
        salon_settings = get_salon_settings()
        logo_url = salon_settings.get('logo_url') or '/logo.webp'
        base_url = salon_settings.get('base_url', PUBLIC_URL)

        # Если logo_url уже полный URL, возвращаем как есть
        if str(logo_url).startswith('http'):
            return logo_url

        # Формируем полный URL
        return f"{base_url.rstrip('/')}/{str(logo_url).lstrip('/')}"
    except Exception as e:
        log_warning(f"Could not get logo URL: {e}", "email")
        return ""



def configure_smtp() -> dict:
    """
    Конфигурация SMTP из переменных окружения
    Returns: dict с настройками SMTP или None если не настроено
    """
    smtp_user = os.getenv('SMTP_USERNAME') or os.getenv('SMTP_USER', '')
    smtp_config = {
        'host': os.getenv('SMTP_SERVER') or os.getenv('SMTP_HOST', 'smtp.gmail.com'),
        'port': int(os.getenv('SMTP_PORT', 587)),
        'user': smtp_user,
        'password': os.getenv('SMTP_PASSWORD', ''),
        'from_email': os.getenv('SMTP_FROM_EMAIL') or os.getenv('FROM_EMAIL') or smtp_user,
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


def is_fake_email(email: str) -> bool:
    """
    Проверяет, является ли email тестовым/фейковым
    """
    if not email:
        return True

    fake_domains = ['example.com', 'example.org', 'example.net', 'test.com', 'localhost']
    email_lower = email.lower()

    for domain in fake_domains:
        if email_lower.endswith(f'@{domain}'):
            return True

    return False


def send_email(
    to_email: str,
    subject: str,
    html_body: str,
    text_body: Optional[str] = None,
    unsubscribe_link: Optional[str] = None
) -> bool:
    """
    Универсальная функция отправки email

    Args:
        to_email: Email получателя
        subject: Тема письма
        html_body: HTML содержимое письма
        text_body: Текстовое содержимое (fallback)
        unsubscribe_link: Ссылка для отписки (для футера)

    Returns: True если отправлено успешно
    """
    # Проверка на тестовые/фейковые email
    if is_fake_email(to_email):
        log_warning(f"Skipping email to fake/test address: {to_email}", "email")
        return False

    smtp_config = configure_smtp()

    if not smtp_config:
        log_warning(f"Cannot send email to {to_email}: SMTP not configured", "email")
        return False
    
    # Если html_body не содержит тегов <html> или <!DOCTYPE, оборачиваем его в стандартный лейаут
    if not (html_body.lower().startswith('<!doctype') or '<html' in html_body.lower()):
        html_body = wrap_email_html(subject, html_body, unsubscribe_link=unsubscribe_link)
    
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


def get_premium_icon(name: str, color: str = "db2777", size: int = 20) -> str:
    """Возвращает высококачественную PNG иконку (Icons8) для максимальной совместимости в Email"""
    # Очищаем цвет от # для URL
    clean_color = color.replace("#", "")
    
    # Маппинг на стабильные PNG иконки
    icon_urls = {
        'calendar': f'https://img.icons8.com/ios-filled/50/{clean_color}/calendar.png',
        'clock': f'https://img.icons8.com/ios-filled/50/{clean_color}/clock.png',
        'user': f'https://img.icons8.com/ios-filled/50/{clean_color}/user.png',
        'gift': f'https://img.icons8.com/ios-filled/50/{clean_color}/gift.png',
        'sparkles': f'https://img.icons8.com/ios-filled/50/{clean_color}/sparkling.png',
        'service': f'https://img.icons8.com/ios-filled/50/{clean_color}/spa.png',
        'phone': f'https://img.icons8.com/ios-filled/50/{clean_color}/phone.png',
        'mail': f'https://img.icons8.com/ios-filled/50/{clean_color}/mail.png',
        'map-pin': f'https://img.icons8.com/ios-filled/50/{clean_color}/marker.png',
        'check': f'https://img.icons8.com/ios-filled/50/{clean_color}/checked.png',
        'star': f'https://img.icons8.com/ios-filled/50/{clean_color}/star.png',
        'bell': f'https://img.icons8.com/ios-filled/50/{clean_color}/bell.png',
        'clipboard': f'https://img.icons8.com/ios-filled/50/{clean_color}/clipboard.png'
    }
    
    url = icon_urls.get(name)
    if not url: return ""
    
    return f'<img src="{url}" width="{size}" height="{size}" style="vertical-align: middle; display: inline-block; margin-right: 8px; margin-bottom: 2px;" alt="{name}" />'

def wrap_email_html(title: str, content: str, unsubscribe_link: Optional[str] = None) -> str:
    """Оборачивает контент письма в премиальный лейаут (Weekly Report Style)"""
    from datetime import datetime
    salon_name = get_salon_name()
    logo_url = get_logo_url()
    brand_color = "#db2777" # Weekly Report Brand Accent
    bg_color = "#fdf2f8"    # Weekly Report Background
    year = datetime.now().year
    
    # 1. Расширенная автозамена эмодзи (с учетом вариаций)
    emoji_map = {
        '🗓': get_premium_icon('calendar', brand_color),
        '⏰': get_premium_icon('clock', brand_color),
        '👤': get_premium_icon('user', brand_color),
        '🎁': get_premium_icon('gift', brand_color),
        '🎉': get_premium_icon('sparkles', brand_color),
        '✨': get_premium_icon('sparkles', brand_color),
        '💆': get_premium_icon('service', brand_color),
        '💆‍♂️': get_premium_icon('service', brand_color),
        '💆‍♀️': get_premium_icon('service', brand_color),
        '💆♀️': get_premium_icon('service', brand_color),
        '💆♂️': get_premium_icon('service', brand_color),
        '📱': get_premium_icon('phone', brand_color),
        '📞': get_premium_icon('phone', brand_color),
        '📬': get_premium_icon('mail', brand_color),
        '✉️': get_premium_icon('mail', brand_color),
        '📍': get_premium_icon('map-pin', brand_color),
        '✅': get_premium_icon('check', brand_color),
        '⭐': get_premium_icon('star', brand_color),
        '🏆': get_premium_icon('star', brand_color),
        '💅': get_premium_icon('sparkles', brand_color),
        '💎': get_premium_icon('sparkles', brand_color),
        '🔔': get_premium_icon('bell', brand_color),
        '📅': get_premium_icon('calendar', brand_color),
        '📋': get_premium_icon('clipboard', brand_color)
    }
    
    for emoji, icon_svg in emoji_map.items():
        content = content.replace(emoji, icon_svg)
    
    # 2. Форматирование контента (Weekly Report Style Spacing)
    if '<p' not in content.lower():
        # Сплитим по двойному переносу для параграфов
        paragraphs = content.split('\n\n')
        formatted_content = ""
        for p in paragraphs:
            if p.strip():
                # Внутри параграфа заменяем \n на <br>
                text = p.strip().replace('\n', '<br>')
                formatted_content += f'<p style="margin: 0 0 30px 0; color: #333333; font-size: 18px; line-height: 1.7;">{text}</p>'
        content = formatted_content

    # Weekly Report Logo / Title
    # Force usage of PNG for emails as it renders better in most clients
    logo_src = logo_url.replace('.webp', '.png') if logo_url and logo_url.endswith('.webp') else logo_url
    logo_html = f'<img src="{logo_src}" alt="{salon_name}" style="max-height: 80px; width: auto; height: auto; border: 0; display: block; margin: 0 auto 20px auto;" />' if logo_url else f'<h1 style="margin: 0; font-size: 26px; letter-spacing: 1px; color: #ffffff;">{salon_name}</h1>'
    
    # Unsubscribe link logic
    from core.config import PUBLIC_URL
    final_unsubscribe = unsubscribe_link or f"{PUBLIC_URL.rstrip('/')}/crm/settings"
    
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap');
            body {{ font-family: 'Segoe UI', Inter, Arial, sans-serif; -webkit-font-smoothing: antialiased; }}
        </style>
    </head>
    <body style="margin: 0; padding: 0; background-color: {bg_color}; padding: 40px 20px;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%">
            <tr>
                <td align="center">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
                        <!-- Weekly Report Style Header -->
                        <tr>
                            <td align="center" style="background: #000000; color: #ffffff; padding: 40px 30px; text-align: center;">
                                {logo_html}
                                <div style="width: 40px; height: 3px; background-color: {brand_color}; margin: 20px auto 0;"></div>
                                <p style="margin: 15px 0 0; opacity: 0.8; font-size: 14px; text-transform: uppercase; letter-spacing: 2px;">{title}</p>
                            </td>
                        </tr>
                        
                        <!-- Content -->
                        <tr>
                            <td style="padding: 50px 40px; background-color: #ffffff;">
                                {content}
                            </td>
                        </tr>
                        
                        <!-- Footer -->
                        <tr>
                            <td style="background: #f9f9f9; padding: 30px; text-align: center; color: #999999; font-size: 12px; border-top: 1px solid #eeeeee;">
                                <p style="margin: 0 0 10px 0; color: #666666; font-weight: bold;">{salon_name}</p>
                                <p style="margin: 0 0 20px 0;">Professional Beauty Management System</p>
                                
                                {"<div style='margin-bottom: 20px;'><a href='" + final_unsubscribe + "' style='color: " + brand_color + "; text-decoration: none;'>Отписаться от рассылки</a></div>"}
                                
                                <p style="margin: 0; opacity: 0.7;">
                                    Это автоматическое уведомление. Пожалуйста, не отвечайте на него.<br>
                                    © {year} {salon_name}. Все права защищены.
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """
    return html


def send_verification_code_email(email: str, code: str, name: str, user_type: str = "user") -> bool:
    """
    Отправить код верификации на email
    """
    salon_name = get_salon_name()
    subject = f"Подтверждение email - {salon_name}"

    content = f"""
    <div style="text-align: center;">
        <h2>Здравствуйте, {name}!</h2>
        <p>Спасибо за регистрацию в нашей системе. Для завершения верификации введите код подтверждения:</p>
        
        <div style="background: white; border: 2px dashed #FF6B6B; padding: 20px;
                    text-align: center; font-size: 32px; font-weight: bold;
                    color: #FF6B6B; margin: 20px 0; border-radius: 8px;
                    letter-spacing: 8px;">{code}</div>

        <p><strong>Код действителен в течение 15 минут.</strong></p>
        <p>Если вы не регистрировались в {salon_name}, просто проигнорируйте это письмо.</p>
    </div>
    """
    
    text_body = f"Здравствуйте, {name}! Ваш код подтверждения: {code}. Код действителен 15 минут."
    
    return send_email(email, subject, content, text_body)


def send_admin_notification_email(admin_email: str, user_data: dict) -> bool:
    """
    Уведомить админа о новой регистрации

    Args:
        admin_email: Email администратора
        user_data: Данные пользователя (username, email, full_name, role)

    Returns: True если отправлено успешно
    """
    salon_name = get_salon_name()
    logo_url = get_logo_url()
    
    # Force usage of PNG for emails
    if logo_url and logo_url.endswith('.webp'):
        logo_url = logo_url.replace('.webp', '.png')
        
    logo_html = f'<img src="{logo_url}" alt="{salon_name}" style="max-height: 80px; width: auto; height: auto; border: 0; display: block; margin: 0 auto 10px auto;" /><br/>' if logo_url else ""
    subject = f"Новая регистрация: {user_data.get('full_name', 'Unknown')}"

    from core.config import PUBLIC_URL
    admin_panel_url = os.getenv('ADMIN_PANEL_URL', f'{PUBLIC_URL}/admin/registrations')

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
                {logo_html}
                <h1>Новая регистрация!</h1>
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


def send_registration_approved_email(email: str, name: str, language: str = 'en') -> bool:
    """
    Уведомить пользователя что его регистрация одобрена

    Args:
        email: Email пользователя
        name: Имя пользователя
        language: Язык пользователя (по умолчанию 'en')

    Returns: True если отправлено успешно
    """
    salon_name = get_salon_name()
    logo_url = get_logo_url()
    
    # Force usage of PNG for emails
    if logo_url and logo_url.endswith('.webp'):
        logo_url = logo_url.replace('.webp', '.png')
        
    logo_html = f'<img src="{logo_url}" alt="{salon_name}" style="max-height: 80px; width: auto; height: auto; border: 0; display: block; margin: 0 auto 10px auto;" /><br/>' if logo_url else ""

    # Get translations
    t = lambda key: get_email_translation(key, language)
    subject = f"{t('registration_approved_subject')} - {salon_name}"

    from core.config import PUBLIC_URL
    login_url = os.getenv('APP_URL', PUBLIC_URL) + '/login'

    # Text direction for RTL languages
    rtl_style = 'dir="rtl"' if language == 'ar' else ''
    text_align = 'text-align: right;' if language == 'ar' else ''

    html_body = f"""
    <!DOCTYPE html>
    <html {rtl_style}>
    <head>
        <meta charset="utf-8">
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; {text_align} }}
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
                {logo_html}
                <h1>{t('registration_approved_title')}</h1>
            </div>
            <div class="content">
                <h2>{t('registration_approved_greeting')}, {name}!</h2>
                <p>{t('registration_approved_body').format(salon_name=salon_name)}</p>
                <p>{t('registration_approved_login_prompt')}</p>

                <a href="{login_url}" class="button">{t('registration_approved_button')}</a>

                <p>{t('registration_approved_welcome').format(salon_name=salon_name)}</p>
            </div>
        </div>
    </body>
    </html>
    """

    text_body = f"""
    {salon_name} - {t('registration_approved_subject')}

    {t('registration_approved_greeting')}, {name}!

    {t('registration_approved_body').format(salon_name=salon_name)}
    {t('registration_approved_login_prompt')}

    {login_url}

    {t('registration_approved_welcome').format(salon_name=salon_name)}
    """

    return send_email(email, subject, html_body, text_body)


def send_registration_rejected_email(email: str, name: str, reason: str = "", language: str = 'en') -> bool:
    """
    Уведомить пользователя что его регистрация отклонена

    Args:
        email: Email пользователя
        name: Имя пользователя
        reason: Причина отклонения (опционально)
        language: Язык пользователя (по умолчанию 'en')

    Returns: True если отправлено успешно
    """
    salon_name = get_salon_name()
    logo_url = get_logo_url()
    
    # Force usage of PNG for emails
    if logo_url and logo_url.endswith('.webp'):
        logo_url = logo_url.replace('.webp', '.png')
        
    logo_html = f'<img src="{logo_url}" alt="{salon_name}" style="max-height: 80px; width: auto; height: auto; border: 0; display: block; margin: 0 auto 10px auto;" /><br/>' if logo_url else ""

    # Get translations
    t = lambda key: get_email_translation(key, language)
    subject = f"{t('registration_rejected_subject')} - {salon_name}"

    reason_text = f"<p><strong>{t('registration_rejected_reason')}:</strong> {reason}</p>" if reason else ""
    reason_plain = f"\n{t('registration_rejected_reason')}: {reason}\n" if reason else ""

    # Text direction for RTL languages
    rtl_style = 'dir="rtl"' if language == 'ar' else ''
    text_align = 'text-align: right;' if language == 'ar' else ''

    html_body = f"""
    <!DOCTYPE html>
    <html {rtl_style}>
    <head>
        <meta charset="utf-8">
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; {text_align} }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: #ef4444; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
            .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                {logo_html}
                <h1>{t('registration_rejected_title')}</h1>
            </div>
            <div class="content">
                <h2>{t('registration_rejected_greeting')}, {name}!</h2>
                <p>{t('registration_rejected_body').format(salon_name=salon_name)}</p>
                {reason_text}
                <p>{t('registration_rejected_contact')}</p>
            </div>
        </div>
    </body>
    </html>
    """

    text_body = f"""
    {salon_name} - {t('registration_rejected_subject')}

    {t('registration_rejected_greeting')}, {name}!

    {t('registration_rejected_body').format(salon_name=salon_name)}
    {reason_plain}
    {t('registration_rejected_contact')}
    """

    return send_email(email, subject, html_body, text_body)


def send_newsletter_welcome_email(email: str) -> bool:
    """
    Отправить приветственное письмо подписчику рассылки
    """
    salon_name = get_salon_name()
    logo_url = get_logo_url()
    
    # Force usage of PNG for emails
    if logo_url and logo_url.endswith('.webp'):
        logo_url = logo_url.replace('.webp', '.png')
        
    logo_html = f'<img src="{logo_url}" alt="{salon_name}" style="max-height: 80px; width: auto; height: auto; border: 0; display: block; margin: 0 auto 10px auto;" /><br/>' if logo_url else ""
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
                {logo_html}
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
