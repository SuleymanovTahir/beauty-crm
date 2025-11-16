#!/usr/bin/env python3
"""
Простой тест отправки email без зависимостей
"""
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime

# SMTP настройки напрямую из .env.local
SMTP_HOST = "smtp.gmail.com"
SMTP_PORT = 587
SMTP_USER = "ii3391609@gmail.com"
SMTP_PASSWORD = "hkfw qruh hxur ghta"
FROM_EMAIL = "ii3391609@gmail.com"
TO_EMAIL = "ii3391609@gmail.com"

def send_test_email():
    """Отправка тестового email"""
    print("=" * 70)
    print("ТЕСТ ОТПРАВКИ EMAIL (без dotenv)")
    print("=" * 70)

    try:
        # Создаем сообщение
        msg = MIMEMultipart('alternative')
        msg['Subject'] = '🔔 Тестовое уведомление от Beauty CRM'
        msg['From'] = FROM_EMAIL
        msg['To'] = TO_EMAIL

        # Текстовая версия
        text = f"""
Привет!

Это тестовое уведомление от Beauty CRM.

Дата и время отправки: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

Если вы получили это письмо, значит система уведомлений работает корректно!

С уважением,
Beauty CRM Team
        """

        # HTML версия
        html = f"""
        <html>
          <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0;">💎 Beauty CRM</h1>
            </div>
            <div style="padding: 30px; background-color: #f7f7f7;">
              <h2 style="color: #333;">🔔 Тестовое уведомление</h2>
              <p style="color: #666; font-size: 16px;">Привет!</p>
              <p style="color: #666; font-size: 16px;">Это тестовое уведомление от Beauty CRM.</p>
              <div style="background-color: white; padding: 20px; border-left: 4px solid #667eea; margin: 20px 0;">
                <p style="margin: 0; color: #333;"><strong>Дата и время отправки:</strong></p>
                <p style="margin: 5px 0 0 0; color: #667eea; font-size: 18px;">{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
              </div>
              <p style="color: #666; font-size: 16px;">
                Если вы получили это письмо, значит система уведомлений работает корректно! ✅
              </p>
              <p style="color: #999; font-size: 12px; margin-top: 30px;">
                С уважением,<br>
                Beauty CRM Team
              </p>
            </div>
          </body>
        </html>
        """

        part1 = MIMEText(text, 'plain')
        part2 = MIMEText(html, 'html')
        msg.attach(part1)
        msg.attach(part2)

        print(f"\n📧 Отправка на: {TO_EMAIL}")
        print(f"📤 От: {FROM_EMAIL}")
        print(f"🖥  SMTP: {SMTP_HOST}:{SMTP_PORT}")
        print(f"👤 Пользователь: {SMTP_USER}")
        print("\n🔄 Подключение к SMTP серверу...")

        # Отправляем
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            print("🔐 Установка TLS...")
            server.starttls()

            print("🔑 Авторизация...")
            server.login(SMTP_USER, SMTP_PASSWORD)

            print("📨 Отправка сообщения...")
            server.send_message(msg)

        print("\n" + "=" * 70)
        print("✅ EMAIL УСПЕШНО ОТПРАВЛЕН!")
        print("=" * 70)
        print(f"\n📬 Проверьте почту {TO_EMAIL}")
        print("\n💡 Если письмо не пришло, проверьте папку 'Спам'")
        return True

    except Exception as e:
        print("\n" + "=" * 70)
        print("❌ ОШИБКА ОТПРАВКИ!")
        print("=" * 70)
        print(f"\nОшибка: {e}")
        print("\n💡 Возможные причины:")
        print("   1. Неверный App Password для Gmail")
        print("   2. Не включена двухфакторная аутентификация в Gmail")
        print("   3. Проблемы с подключением к SMTP серверу")
        import traceback
        print("\nПодробности:")
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("\n🚀 Запуск теста отправки email...\n")
    result = send_test_email()
    exit(0 if result else 1)
