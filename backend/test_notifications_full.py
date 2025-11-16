#!/usr/bin/env python3
"""
Полный тест системы уведомлений (Email + Instagram)
Запуск: python test_notifications_full.py
"""
import sys
import os
import asyncio
from datetime import datetime

# Добавляем путь к backend для импортов
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

# Импортируем config для загрузки .env
try:
    import core.config
    print("✅ Конфигурация загружена")
except Exception as e:
    print(f"❌ Ошибка загрузки конфигурации: {e}")
    print("\n💡 Убедитесь, что:")
    print("   1. Файл .env.local существует")
    print("   2. Установлены все зависимости (pip install -r requirements.txt)")
    sys.exit(1)

from utils.email import send_email_async
from integrations import send_message

# ==============================================================================
# НАСТРОЙКИ ТЕСТИРОВАНИЯ
# ==============================================================================

# ⚠️ ВАЖНО: Это тестовые контакты только для проверки работы системы!
# В реальной работе уведомления отправляются на контакты конкретного клиента:
#   - Email клиента (из поля clients.email)
#   - Instagram клиента (из поля clients.instagram_id)
#   - Другие мессенджеры (Telegram, WhatsApp и т.д.)
# Система сама выбирает куда отправить на основе настроек клиента.

# Email для тестирования (тестовая почта для разработки)
TEST_EMAIL = "ii3391609@gmail.com"

# Instagram ID для тестирования (пользователь Genrih @stz_192)
# Этот ID взят из базы данных для тестирования отправки в Instagram
TEST_INSTAGRAM_ID = "1533224231180483"  # Genrih (@stz_192)

# ==============================================================================
# ТЕСТ EMAIL
# ==============================================================================

async def test_email_notification():
    """Тест отправки email уведомления"""
    print("\n" + "=" * 70)
    print("ТЕСТ #1: Email уведомление")
    print("=" * 70)

    subject = "🔔 Тестовое уведомление от Beauty CRM"

    message = f"""
Привет!

Это тестовое уведомление от Beauty CRM.

Дата и время отправки: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

Если вы получили это письмо, значит email уведомления работают корректно! ✅

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
            Если вы получили это письмо, значит email уведомления работают корректно! ✅
          </p>
          <p style="color: #999; font-size: 12px; margin-top: 30px;">
            С уважением,<br>
            Beauty CRM Team
          </p>
        </div>
      </body>
    </html>
    """

    print(f"\n📧 Получатель: {TEST_EMAIL}")
    print(f"📌 Тема: {subject}")
    print("\n🔄 Отправка email...")

    try:
        result = await send_email_async([TEST_EMAIL], subject, message, html)

        if result:
            print("\n✅ EMAIL УСПЕШНО ОТПРАВЛЕН!")
            print(f"\n📬 Проверьте почту {TEST_EMAIL}")
            print("💡 Если письмо не пришло, проверьте папку 'Спам'")
            return True
        else:
            print("\n❌ ОШИБКА ОТПРАВКИ EMAIL!")
            print("\nВозможные причины:")
            print("   1. Неверные SMTP настройки в .env.local")
            print("   2. Неверный App Password для Gmail")
            print("   3. Не включена двухфакторная аутентификация")
            return False

    except Exception as e:
        print(f"\n❌ ОШИБКА: {e}")
        import traceback
        traceback.print_exc()
        return False

# ==============================================================================
# ТЕСТ INSTAGRAM
# ==============================================================================

async def test_instagram_notification():
    """Тест отправки Instagram уведомления"""
    print("\n" + "=" * 70)
    print("ТЕСТ #2: Instagram уведомление")
    print("=" * 70)

    test_message = f"""
🔔 Тестовое уведомление

Привет! Это тестовое уведомление от Beauty CRM.

Дата и время: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

Если вы получили это сообщение, значит Instagram уведомления работают! ✅
    """.strip()

    print(f"\n📱 Получатель ID: {TEST_INSTAGRAM_ID}")
    print(f"💬 Сообщение: {test_message[:50]}...")
    print("\n🔄 Отправка в Instagram...")

    try:
        result = await send_message(TEST_INSTAGRAM_ID, test_message)

        if "error" in result:
            print(f"\n❌ ОШИБКА ОТПРАВКИ: {result['error']}")
            print("\nВозможные причины:")
            print("   1. Неверный PAGE_ACCESS_TOKEN в .env.local")
            print("   2. Неверный Instagram ID получателя")
            print("   3. Токен не имеет прав для отправки сообщений")
            return False
        else:
            print("\n✅ INSTAGRAM СООБЩЕНИЕ УСПЕШНО ОТПРАВЛЕНО!")
            print(f"\n📱 Проверьте Instagram direct messages")
            print(f"📋 Ответ API: {result}")
            return True

    except Exception as e:
        print(f"\n❌ ОШИБКА: {e}")
        import traceback
        traceback.print_exc()
        return False

# ==============================================================================
# ГЛАВНАЯ ФУНКЦИЯ
# ==============================================================================

async def main():
    """Запуск всех тестов"""
    print("\n" + "=" * 70)
    print("🚀 ТЕСТИРОВАНИЕ СИСТЕМЫ УВЕДОМЛЕНИЙ")
    print("=" * 70)
    print("\n📅 Дата и время:", datetime.now().strftime('%Y-%m-%d %H:%M:%S'))

    results = []

    # Тест Email
    email_result = await test_email_notification()
    results.append(("Email уведомление", email_result))

    # Небольшая пауза между тестами
    await asyncio.sleep(2)

    # Тест Instagram
    instagram_result = await test_instagram_notification()
    results.append(("Instagram уведомление", instagram_result))

    # Итоги
    print("\n" + "=" * 70)
    print("📊 ИТОГИ ТЕСТИРОВАНИЯ")
    print("=" * 70)

    for name, result in results:
        if result is True:
            status = "✅ PASS"
        elif result is False:
            status = "❌ FAIL"
        else:
            status = "⚠️  SKIP"
        print(f"{status} - {name}")

    passed = sum(1 for _, r in results if r is True)
    failed = sum(1 for _, r in results if r is False)
    skipped = sum(1 for _, r in results if r is None)
    total = len(results)

    print(f"\nПройдено: {passed}/{total - skipped}")
    if failed > 0:
        print(f"Провалено: {failed}")
    if skipped > 0:
        print(f"Пропущено: {skipped}")

    print("\n" + "=" * 70)

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\n⚠️  Тестирование прервано пользователем")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n❌ Неожиданная ошибка: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
