#!/usr/bin/env python3
"""
Тестовый скрипт для проверки отправки email уведомлений
"""
import sys
import os

# Добавляем путь к backend для импортов
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

# Импортируем config, чтобы загрузить .env
import core.config  # Это загрузит .env.local

from utils.email import send_email_async
import asyncio
from datetime import datetime

async def test_send_email():
    """Тестовая отправка email"""
    print("=" * 70)
    print("ТЕСТ ОТПРАВКИ EMAIL УВЕДОМЛЕНИЯ")
    print("=" * 70)

    to_email = "ii3391609@gmail.com"
    subject = "🔔 Тестовое уведомление от Beauty CRM"

    message = f"""
Привет!

Это тестовое уведомление от Beauty CRM.

Дата и время отправки: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

Если вы получили это письмо, значит система уведомлений работает корректно!

С уважением,
Beauty CRM Team
    """

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

    print(f"\n📧 Отправка тестового email на: {to_email}")
    print(f"📌 Тема: {subject}")
    print("\n🔄 Отправка...")

    result = await send_email_async([to_email], subject, message, html)

    if result:
        print("\n✅ EMAIL УСПЕШНО ОТПРАВЛЕН!")
        print(f"📬 Проверьте почту {to_email}")
        print("\n💡 Если письмо не пришло, проверьте:")
        print("   1. Папку 'Спам'")
        print("   2. Настройки SMTP в .env.local")
        print("   3. App Password для Gmail (если используется Gmail)")
    else:
        print("\n❌ ОШИБКА ОТПРАВКИ!")
        print("Проверьте логи и настройки SMTP.")

    return result

if __name__ == "__main__":
    print("\n🚀 Запуск теста отправки email...\n")
    result = asyncio.run(test_send_email())
    sys.exit(0 if result else 1)
