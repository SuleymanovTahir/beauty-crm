"""
Утилиты для отправки email
"""
import smtplib
import secrets
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta
from utils.logger import log_info, log_error

def generate_verification_code():
    """Генерация 6-значного кода верификации"""
    return ''.join([str(secrets.randbelow(10)) for _ in range(6)])

def get_code_expiry():
    """Получить время истечения кода (5 минут)"""
    return (datetime.now() + timedelta(minutes=5)).isoformat()

def send_verification_email(to_email: str, code: str, full_name: str) -> bool:
    """
    Отправить email с кодом верификации

    Args:
        to_email: Email получателя
        code: 6-значный код верификации
        full_name: Имя пользователя

    Returns:
        bool: True если отправлено успешно
    """
    try:
        # SMTP настройки из переменных окружения
        smtp_host = os.getenv('SMTP_SERVER') or os.getenv('SMTP_HOST', 'smtp.gmail.com')
        smtp_port = int(os.getenv('SMTP_PORT', '587'))
        smtp_user = os.getenv('SMTP_USERNAME') or os.getenv('SMTP_USER')
        smtp_password = os.getenv('SMTP_PASSWORD')
        smtp_from = os.getenv('FROM_EMAIL') or os.getenv('SMTP_FROM', smtp_user)

        if not smtp_user or not smtp_password:
            log_error("SMTP credentials not configured in .env", "email")
            return False

        # Создаем сообщение
        msg = MIMEMultipart('alternative')
        msg['Subject'] = 'Код подтверждения регистрации'
        msg['From'] = smtp_from
        msg['To'] = to_email

        # HTML версия письма
        html = f"""
        <html>
          <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #000; padding: 20px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">{os.getenv('SALON_NAME', 'Beauty Salon')}</h1>
            </div>
            <div style="padding: 30px; background-color: #f7f7f7;">
              <h2 style="color: #333;">Здравствуйте, {full_name}!</h2>
              <p style="color: #666; font-size: 16px;">Ваш код подтверждения для регистрации:</p>
              <div style="background-color: white; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
                <h1 style="color: #000; font-size: 48px; margin: 0; letter-spacing: 8px;">{code}</h1>
              </div>
              <p style="color: #666; font-size: 14px;">Код действителен в течение 5 минут.</p>
              <p style="color: #999; font-size: 12px; margin-top: 30px;">
                Если вы не регистрировались в системе, проигнорируйте это письмо.
              </p>
            </div>
          </body>
        </html>
        """

        # Текстовая версия письма
        text = f"""
        Здравствуйте, {full_name}!

        Ваш код подтверждения для регистрации: {code}

        Код действителен в течение 5 минут.

        Если вы не регистрировались в системе, проигнорируйте это письмо.
        """

        part1 = MIMEText(text, 'plain')
        part2 = MIMEText(html, 'html')
        msg.attach(part1)
        msg.attach(part2)

        # Отправляем
        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.starttls()
            server.login(smtp_user, smtp_password)
            server.send_message(msg)

        log_info(f"Verification email sent to {to_email}", "email")
        return True

    except Exception as e:
        log_error(f"Failed to send verification email: {e}", "email")
        return False

def send_verification_link_email(to_email: str, verification_token: str, full_name: str) -> bool:
    """
    Отправить email со ссылкой для верификации

    Args:
        to_email: Email получателя
        verification_token: Токен для верификации
        full_name: Имя пользователя

    Returns:
        bool: True если отправлено успешно
    """
    try:
        # SMTP настройки из переменных окружения
        smtp_host = os.getenv('SMTP_SERVER') or os.getenv('SMTP_HOST', 'smtp.gmail.com')
        smtp_port = int(os.getenv('SMTP_PORT', '587'))
        smtp_user = os.getenv('SMTP_USERNAME') or os.getenv('SMTP_USER')
        smtp_password = os.getenv('SMTP_PASSWORD')
        smtp_from = os.getenv('FROM_EMAIL') or os.getenv('SMTP_FROM', smtp_user)

        if not smtp_user or not smtp_password:
            log_error("SMTP credentials not configured in .env", "email")
            return False

        # Формируем ссылку для верификации
        from core.config import PUBLIC_URL
        verification_url = f"{PUBLIC_URL}/verify-email?token={verification_token}"

        # Создаем сообщение
        msg = MIMEMultipart('alternative')
        msg['Subject'] = 'Подтверждение регистрации'
        msg['From'] = smtp_from
        msg['To'] = to_email

        # HTML версия письма
        html = f"""
        <html>
          <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #000; padding: 20px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">{os.getenv('SALON_NAME', 'Beauty Salon')}</h1>
            </div>
            <div style="padding: 30px; background-color: #f7f7f7;">
              <h2 style="color: #333;">Здравствуйте, {full_name}!</h2>
              <p style="color: #666; font-size: 16px;">Добро пожаловать!</p>
              <p style="color: #666; font-size: 16px;">Нажмите на кнопку ниже, чтобы подтвердить ваш email и активировать аккаунт:</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="{verification_url}" style="background-color: #000; color: white; padding: 15px 40px; text-decoration: none; border-radius: 4px; display: inline-block; font-size: 16px;">
                  Подтвердить Email
                </a>
              </div>
              <p style="color: #666; font-size: 14px;">Ссылка действительна в течение 24 часов.</p>
              <p style="color: #999; font-size: 12px; margin-top: 30px;">
                Если вы не регистрировались в системе, проигнорируйте это письмо.
              </p>
              <p style="color: #999; font-size: 11px; margin-top: 20px;">
                Если кнопка не работает, скопируйте эту ссылку в браузер:<br>
                <a href="{verification_url}" style="color: #000; word-break: break-all;">{verification_url}</a>
              </p>
            </div>
          </body>
        </html>
        """

        # Текстовая версия письма
        text = f"""
        Здравствуйте, {full_name}!

        Добро пожаловать!

        Перейдите по этой ссылке, чтобы подтвердить ваш email:
        {verification_url}

        Ссылка действительна в течение 24 часов.

        Если вы не регистрировались в системе, проигнорируйте это письмо.
        """

        part1 = MIMEText(text, 'plain')
        part2 = MIMEText(html, 'html')
        msg.attach(part1)
        msg.attach(part2)

        # Отправляем
        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.starttls()
            server.login(smtp_user, smtp_password)
            server.send_message(msg)

        log_info(f"Verification link email sent to {to_email}", "email")
        return True

    except Exception as e:
        log_error(f"Failed to send verification link email: {e}", "email")
        return False

def send_approval_notification(to_email: str, full_name: str, approved: bool) -> bool:
    """
    Отправить уведомление об одобрении/отклонении регистрации

    Args:
        to_email: Email получателя
        full_name: Имя пользователя
        approved: True если одобрено, False если отклонено

    Returns:
        bool: True если отправлено успешно
    """
    try:
        smtp_host = os.getenv('SMTP_SERVER') or os.getenv('SMTP_HOST', 'smtp.gmail.com')
        smtp_port = int(os.getenv('SMTP_PORT', '587'))
        smtp_user = os.getenv('SMTP_USERNAME') or os.getenv('SMTP_USER')
        smtp_password = os.getenv('SMTP_PASSWORD')
        smtp_from = os.getenv('FROM_EMAIL') or os.getenv('SMTP_FROM', smtp_user)

        if not smtp_user or not smtp_password:
            log_error("SMTP credentials not configured in .env", "email")
            return False

        msg = MIMEMultipart('alternative')
        msg['From'] = smtp_from
        msg['To'] = to_email

        if approved:
            msg['Subject'] = 'Ваша регистрация одобрена'
            html = f"""
            <html>
              <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: #000; padding: 20px; text-align: center;">
                  <h1 style="color: white; margin: 0; font-size: 24px;">{os.getenv('SALON_NAME', 'Beauty Salon')}</h1>
                </div>
                <div style="padding: 30px; background-color: #f7f7f7;">
                  <h2 style="color: #333;">Поздравляем, {full_name}!</h2>
                  <p style="color: #666; font-size: 16px;">Ваша регистрация была одобрена администратором.</p>
                  <p style="color: #666; font-size: 16px;">Теперь вы можете войти в систему используя свои учетные данные.</p>
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="#" style="background-color: #000; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">
                      Войти в систему
                    </a>
                  </div>
                </div>
              </body>
            </html>
            """
            text = f"Поздравляем, {full_name}!\n\nВаша регистрация была одобрена администратором.\nТеперь вы можете войти в систему используя свои учетные данные."
        else:
            msg['Subject'] = 'Ваша регистрация отклонена'
            html = f"""
            <html>
              <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: #000; padding: 20px; text-align: center;">
                  <h1 style="color: white; margin: 0; font-size: 24px;">{os.getenv('SALON_NAME', 'Beauty Salon')}</h1>
                </div>
                <div style="padding: 30px; background-color: #f7f7f7;">
                  <h2 style="color: #333;">{full_name},</h2>
                  <p style="color: #666; font-size: 16px;">К сожалению, ваша регистрация была отклонена администратором.</p>
                  <p style="color: #666; font-size: 16px;">Если у вас есть вопросы, пожалуйста, свяжитесь с администрацией.</p>
                </div>
              </body>
            </html>
            """
            text = f"{full_name},\n\nК сожалению, ваша регистрация была отклонена администратором.\nЕсли у вас есть вопросы, пожалуйста, свяжитесь с администрацией."

        part1 = MIMEText(text, 'plain')
        part2 = MIMEText(html, 'html')
        msg.attach(part1)
        msg.attach(part2)

        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.starttls()
            server.login(smtp_user, smtp_password)
            server.send_message(msg)

        log_info(f"Approval notification sent to {to_email} (approved={approved})", "email")
        return True

    except Exception as e:
        log_error(f"Failed to send approval notification: {e}", "email")
        return False

def send_password_reset_email(to_email: str, reset_token: str, full_name: str) -> bool:
    """
    Отправить email со ссылкой для сброса пароля

    Args:
        to_email: Email получателя
        reset_token: Токен для сброса пароля
        full_name: Имя пользователя

    Returns:
        bool: True если отправлено успешно
    """
    try:
        # SMTP настройки из переменных окружения
        smtp_host = os.getenv('SMTP_SERVER') or os.getenv('SMTP_HOST', 'smtp.gmail.com')
        smtp_port = int(os.getenv('SMTP_PORT', '587'))
        smtp_user = os.getenv('SMTP_USERNAME') or os.getenv('SMTP_USER')
        smtp_password = os.getenv('SMTP_PASSWORD')
        smtp_from = os.getenv('FROM_EMAIL') or os.getenv('SMTP_FROM', smtp_user)

        if not smtp_user or not smtp_password:
            log_error("SMTP credentials not configured in .env", "email")
            return False

        # Формируем ссылку для сброса пароля
        from core.config import PUBLIC_URL
        reset_url = f"{PUBLIC_URL}/reset-password?token={reset_token}"

        # Создаем сообщение
        msg = MIMEMultipart('alternative')
        msg['Subject'] = 'Сброс пароля'
        msg['From'] = smtp_from
        msg['To'] = to_email

        # HTML версия письма
        html = f"""
        <html>
          <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #000; padding: 20px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">{os.getenv('SALON_NAME', 'Beauty Salon')}</h1>
            </div>
            <div style="padding: 30px; background-color: #f7f7f7;">
              <h2 style="color: #333;">Здравствуйте, {full_name}!</h2>
              <p style="color: #666; font-size: 16px;">Вы запросили сброс пароля для вашего аккаунта.</p>
              <p style="color: #666; font-size: 16px;">Нажмите на кнопку ниже, чтобы создать новый пароль:</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="{reset_url}" style="background-color: #000; color: white; padding: 15px 40px; text-decoration: none; border-radius: 4px; display: inline-block; font-size: 16px;">
                  Сбросить пароль
                </a>
              </div>
              <p style="color: #666; font-size: 14px;">Ссылка действительна в течение 1 часа.</p>
              <p style="color: #999; font-size: 12px; margin-top: 30px;">
                Если вы не запрашивали сброс пароля, проигнорируйте это письмо. Ваш пароль останется без изменений.
              </p>
              <p style="color: #999; font-size: 11px; margin-top: 20px;">
                Если кнопка не работает, скопируйте эту ссылку в браузер:<br>
                <a href="{reset_url}" style="color: #000; word-break: break-all;">{reset_url}</a>
              </p>
            </div>
          </body>
        </html>
        """

        # Текстовая версия письма
        text = f"""
        Здравствуйте, {full_name}!

        Вы запросили сброс пароля для вашего аккаунта.

        Перейдите по этой ссылке, чтобы создать новый пароль:
        {reset_url}

        Ссылка действительна в течение 1 часа.

        Если вы не запрашивали сброс пароля, проигнорируйте это письмо.
        """

        part1 = MIMEText(text, 'plain')
        part2 = MIMEText(html, 'html')
        msg.attach(part1)
        msg.attach(part2)

        # Отправляем
        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.starttls()
            server.login(smtp_user, smtp_password)
            server.send_message(msg)

        log_info(f"Password reset email sent to {to_email}", "email")
        return True

    except Exception as e:
        log_error(f"Failed to send password reset email: {e}", "email")
        return False

def send_email_sync(recipients: list, subject: str, message: str, html: str = None) -> bool:
    """
    Синхронная функция отправки email (для использования в background tasks)

    Args:
        recipients: Список email адресов получателей
        subject: Тема письма
        message: Текст письма (plain text)
        html: HTML версия письма (опционально)

    Returns:
        bool: True если отправлено успешно
    """
    try:
        # SMTP настройки из переменных окружения
        smtp_host = os.getenv('SMTP_SERVER') or os.getenv('SMTP_HOST', 'smtp.gmail.com')
        smtp_port = int(os.getenv('SMTP_PORT', '587'))
        smtp_user = os.getenv('SMTP_USERNAME') or os.getenv('SMTP_USER')
        smtp_password = os.getenv('SMTP_PASSWORD')
        smtp_from = os.getenv('FROM_EMAIL') or os.getenv('SMTP_FROM', smtp_user)

        if not smtp_user or not smtp_password:
            log_error("SMTP credentials not configured in .env", "email")
            return False

        # Создаем сообщение
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = smtp_from
        msg['To'] = ', '.join(recipients)

        # Добавляем текстовую часть
        part1 = MIMEText(message, 'plain')
        msg.attach(part1)

        # Добавляем HTML часть (если есть)
        if html:
            part2 = MIMEText(html, 'html')
            msg.attach(part2)

        # Отправляем
        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.starttls()
            server.login(smtp_user, smtp_password)
            server.send_message(msg)

        log_info(f"Email sent to {', '.join(recipients)}: {subject}", "email")
        return True

    except Exception as e:
        log_error(f"Failed to send email: {e}", "email")
        return False

async def send_email_async(recipients: list, subject: str, message: str, html: str = None) -> bool:
    """
    Универсальная асинхронная функция отправки email

    Args:
        recipients: Список email адресов получателей
        subject: Тема письма
        message: Текст письма (plain text)
        html: HTML версия письма (опционально)

    Returns:
        bool: True если отправлено успешно
    """
    import asyncio

    # Запускаем синхронную функцию в отдельном потоке
    return await asyncio.to_thread(send_email_sync, recipients, subject, message, html)

def send_broadcast_email(to_email: str, subject: str, message: str, full_name: str, unsubscribe_link: str, salon_settings: dict = None, attachment_urls: list = None) -> bool:
    """
    Отправить broadcast email с новым дизайном (v2)

    Args:
        to_email: Email получателя
        subject: Тема письма
        message: Текст письма
        full_name: Имя пользователя
        unsubscribe_link: Ссылка для отписки
        salon_settings: Настройки салона (адрес, телефон и т.д.)
        attachment_urls: Список URL или путей к вложениям

    Returns:
        bool: True если отправлено успешно
    """
    try:
        # SMTP настройки из переменных окружения
        smtp_host = os.getenv('SMTP_SERVER') or os.getenv('SMTP_HOST', 'smtp.gmail.com')
        smtp_port = int(os.getenv('SMTP_PORT', '587'))
        smtp_user = os.getenv('SMTP_USERNAME') or os.getenv('SMTP_USER')
        smtp_password = os.getenv('SMTP_PASSWORD')
        smtp_from = os.getenv('FROM_EMAIL') or os.getenv('SMTP_FROM', smtp_user)

        # Настройки салона
        if not salon_settings:
            salon_settings = {}
        
        salon_name = salon_settings.get('name', os.getenv('SALON_BOT_NAME', 'M.Le Diamant')).replace(' Bot', '')
        salon_address = salon_settings.get('address')
        salon_phone = salon_settings.get('phone')
        salon_email = salon_settings.get('email', smtp_user) # Fallback to sending email
        salon_website = salon_settings.get('website', os.getenv('BASE_URL', 'https://mlediamant.com'))
        
        # Clean website URL for display
        display_website = salon_website.replace('https://', '').replace('http://', '').strip('/')

        base_url = os.getenv('BASE_URL', 'https://mlediamant.com')
        
        # Подготовка HTML блоков для контактов (показываем только если есть данные)
        address_html = f'<div style="margin-bottom: 5px; color: #666666;">{salon_address}</div>' if salon_address else ""
        phone_html = f'<div style="margin-bottom: 5px;"><a href="tel:{salon_phone.replace(" ", "")}" style="text-decoration: none; color: #666666;">{salon_phone}</a></div>' if salon_phone else ""
        email_html = f'<div style="margin-bottom: 5px;"><a href="mailto:{salon_email}" style="text-decoration: none; color: #666666;">{salon_email}</a></div>' if salon_email else ""
        website_html = f'<div style="margin-bottom: 5px;"><a href="{salon_website}" style="text-decoration: none; color: #666666;">{display_website}</a></div>' if salon_website else ""
        
        # Подготовка текстовых блоков
        address_text = f"{salon_address}" if salon_address else ""
        phone_text = f"{salon_phone}" if salon_phone else ""
        email_text = f"{salon_email}" if salon_email else ""
        website_text = f"{display_website}" if salon_website else ""
        
        # Определяем URL для отписки
        from core.config import PUBLIC_URL
        unsubscribe_url = f"{PUBLIC_URL}{unsubscribe_link}"

        if not smtp_user or not smtp_password:
            log_error("SMTP credentials not configured in .env", "email")
            return False

        # Создаем сообщение
        msg = MIMEMultipart('mixed') # Changed to mixed to support attachments
        msg['Subject'] = subject
        msg['From'] = f"{salon_name} <{smtp_from}>"
        msg['To'] = to_email

        # Create alternative part for text/html
        msg_alternative = MIMEMultipart('alternative')
        msg.attach(msg_alternative)

        # HTML версия письма - Premium Brand Design
        html = f"""
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body {{
                margin: 0;
                padding: 0;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                background-color: #fdf2f8; /* Light pink background */
                color: #000000;
              }}
              a {{ color: #db2777; text-decoration: none; }} /* Brand Pink Links */
            </style>
          </head>
          <body>
            <table role="presentation" style="width: 100%; border-collapse: collapse;">
              <tr>
                <td align="center" style="padding: 40px 20px;">
                  <!-- Main Container -->
                  <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); border-radius: 8px; overflow: hidden;">
                    
                    <!-- Top Accent Line -->
                    <tr>
                        <td style="height: 6px; background-color: #db2777;"></td>
                    </tr>

                    <!-- Header -->
                    <tr>
                      <td style="padding: 40px 40px 20px 40px; text-align: center;">
                        <h1 style="margin: 0; font-size: 28px; font-weight: 800; color: #111827; letter-spacing: -0.5px;">
                          {salon_name}
                        </h1>
                         <div style="width: 40px; height: 3px; background-color: #db2777; margin: 15px auto 0;"></div>
                      </td>
                    </tr>

                    <!-- Body Content -->
                    <tr>
                      <td style="padding: 20px 40px 40px 40px;">
                        <p style="margin: 0 0 20px 0; font-size: 18px; font-weight: 600; color: #1f2937;">
                          Здравствуйте, {full_name}!
                        </p>
                        <div style="font-size: 16px; line-height: 1.6; color: #374151; white-space: pre-wrap;">
                          {message}
                        </div>
                      </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                      <td style="background-color: #000000; padding: 40px; font-size: 14px; color: #e5e7eb; line-height: 1.8;">
                        <table role="presentation" style="width: 100%; border-collapse: collapse;">
                          <tr>
                            <td style="padding-bottom: 24px; text-align: center;">
                              <div style="font-weight: 700; color: #ffffff; font-size: 16px; margin-bottom: 12px; letter-spacing: 0.5px;">{salon_name}</div>
                              {address_html.replace('color: #666666', 'color: #9ca3af').replace('margin-bottom: 5px', 'margin-bottom: 5px')}
                              {phone_html.replace('#666666', '#db2777')}
                              {email_html.replace('#666666', '#db2777')}
                              {website_html.replace('#666666', '#db2777')}
                            </td>
                          </tr>
                          <tr>
                            <td style="padding-top: 24px; border-top: 1px solid #374151; text-align: center;">
                                <a href="{unsubscribe_url}" style="color: #6b7280; text-decoration: underline; font-size: 12px;">
                                  Отписаться от рассылки
                                </a>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
        """

        # Текстовая версия письма
        text = f"""
        {salon_name}

        Здравствуйте, {full_name}!

        {message}

        ---
        {salon_name}
        {address_text}
        {phone_text}
        {email_text}
        {website_text}

        Отписаться: {unsubscribe_url}
        """

        part1 = MIMEText(text, 'plain', 'utf-8')
        part2 = MIMEText(html, 'html', 'utf-8')
        msg_alternative.attach(part1)
        msg_alternative.attach(part2)

        # Обработка вложений
        if attachment_urls:
             from email.mime.base import MIMEBase
             from email import encoders
             import mimetypes
             import requests

             for url in attachment_urls:
                 try:
                     # Check if it's a local file path (upload returns relative path usually)
                     # Assuming uploads are in 'uploads/' directory relative to root or similar
                     # If the URL starts with http, download it. If it starts with /uploads, read from disk
                     
                     filename = os.path.basename(url)
                     file_data = None
                     
                     if url.startswith('http'):
                         response = requests.get(url)
                         if response.status_code == 200:
                             file_data = response.content
                     else:
                         # Try to find local file
                         # Adjust path resolution as needed based on project structure
                         # Assuming backend is running in 'backend' dir and uploads are in 'uploads'?
                         # Or maybe 'frontend/public/uploads'? 
                         # Let's try to resolve relative to backend root or absolute
                         possible_paths = [
                             url.lstrip('/'),
                             os.path.join('..', url.lstrip('/')),
                             os.path.join('uploads', os.path.basename(url))
                         ]
                         
                         for path in possible_paths:
                             if os.path.exists(path):
                                 with open(path, 'rb') as f:
                                     file_data = f.read()
                                 break
                     
                     if file_data:
                         ctype, encoding = mimetypes.guess_type(filename)
                         if ctype is None or encoding is not None:
                             # No guess could be made, or the file is encoded (compressed), so
                             # use a generic bag-of-bits type.
                             ctype = 'application/octet-stream'
                         
                         maintype, subtype = ctype.split('/', 1)
                         
                         attachment = MIMEBase(maintype, subtype)
                         attachment.set_payload(file_data)
                         encoders.encode_base64(attachment)
                         attachment.add_header(
                             'Content-Disposition',
                             'attachment',
                             filename=filename
                         )
                         msg.attach(attachment)
                     else:
                         log_warning(f"Could not find attachment: {url}", "email")

                 except Exception as e:
                     log_error(f"Failed to attach file {url}: {e}", "email")

        # Отправляем
        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.starttls()
            server.login(smtp_user, smtp_password)
            server.send_message(msg)

        log_info(f"Broadcast email sent to {to_email}: {subject}", "email")
        return True

    except Exception as e:
        log_error(f"Failed to send broadcast email to {to_email}: {e}", "email")
        return False
