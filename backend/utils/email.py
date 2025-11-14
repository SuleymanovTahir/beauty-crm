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
    """Получить время истечения кода (15 минут)"""
    return (datetime.now() + timedelta(minutes=15)).isoformat()

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
        smtp_host = os.getenv('SMTP_HOST', 'smtp.gmail.com')
        smtp_port = int(os.getenv('SMTP_PORT', '587'))
        smtp_user = os.getenv('SMTP_USER')
        smtp_password = os.getenv('SMTP_PASSWORD')
        smtp_from = os.getenv('SMTP_FROM', smtp_user)

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
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0;">💎 Beauty CRM</h1>
            </div>
            <div style="padding: 30px; background-color: #f7f7f7;">
              <h2 style="color: #333;">Здравствуйте, {full_name}!</h2>
              <p style="color: #666; font-size: 16px;">Ваш код подтверждения для регистрации:</p>
              <div style="background-color: white; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
                <h1 style="color: #667eea; font-size: 48px; margin: 0; letter-spacing: 8px;">{code}</h1>
              </div>
              <p style="color: #666; font-size: 14px;">Код действителен в течение 15 минут.</p>
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

        Код действителен в течение 15 минут.

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
        smtp_host = os.getenv('SMTP_HOST', 'smtp.gmail.com')
        smtp_port = int(os.getenv('SMTP_PORT', '587'))
        smtp_user = os.getenv('SMTP_USER')
        smtp_password = os.getenv('SMTP_PASSWORD')
        smtp_from = os.getenv('SMTP_FROM', smtp_user)

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
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
                  <h1 style="color: white; margin: 0;">💎 Beauty CRM</h1>
                </div>
                <div style="padding: 30px; background-color: #f7f7f7;">
                  <h2 style="color: #333;">Поздравляем, {full_name}!</h2>
                  <p style="color: #666; font-size: 16px;">Ваша регистрация была одобрена администратором.</p>
                  <p style="color: #666; font-size: 16px;">Теперь вы можете войти в систему используя свои учетные данные.</p>
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="#" style="background-color: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">
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
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
                  <h1 style="color: white; margin: 0;">💎 Beauty CRM</h1>
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
