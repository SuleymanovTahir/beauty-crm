#!/usr/bin/env python3
"""
Тест отправки email уведомлений о новой записи
Отправляет тестовое уведомление на тестовый email из конфига
"""
import sys
import os
import asyncio
from datetime import datetime, timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from tests.config import get_test_config
TEST_CONFIG = get_test_config()

from utils.email import send_email_async
from db.settings import get_salon_settings
from modules.notifications.email import format_new_booking_email
from scheduler.booking_reminder_checker import format_booking_reminder_email

async def test_new_booking_notification():
    """Тест уведомления о новой записи"""
    print("=" * 70)
    print("ТЕСТ: УВЕДОМЛЕНИЕ О НОВОЙ ЗАПИСИ")
    print("=" * 70)

    # Тестовые данные записи
    tomorrow = datetime.now() + timedelta(days=1)
    booking_data = {
        'client_name': 'Genrih (TEST)',
        'phone': '+77056054308',
        'service': 'Массаж (ног/стоп/рук) 40 мин',
        'datetime': tomorrow.strftime('%d.%m.%Y в %H:%M'),
        'notes': 'Это тестовая запись для проверки email уведомлений'
    }

    # Получаем данные салона
    salon_data = get_salon_settings()

    # Форматируем email
    plain_text, html_text = format_new_booking_email(booking_data, salon_data)

    print("\n📧 Отправка email...")
    test_email = TEST_CONFIG['test_email']
    print(f"   Кому: {test_email}")
    print(f"   Тема: 🎉 Новая запись онлайн!")
    print(f"   Клиент: {booking_data['client_name']}")
    print(f"   Услуга: {booking_data['service']}")
    print(f"   Дата/Время: {booking_data['datetime']}")

    # Отправляем email
    success = await send_email_async(
        recipients=[test_email],
        subject=f"🎉 Новая запись онлайн! - {salon_data.get('name', 'Салон')}",
        message=plain_text,
        html=html_text
    )

    if success:
        print("\n✅ EMAIL УСПЕШНО ОТПРАВЛЕН!")
        print(f"   Проверьте почту {test_email}")
        return True
    else:
        print("\n❌ ОШИБКА ОТПРАВКИ EMAIL")
        print("   Проверьте настройки SMTP в .env файле:")
        print("   - SMTP_HOST")
        print("   - SMTP_PORT")
        print("   - SMTP_USER (или SMTP_USERNAME)")
        print("   - SMTP_PASSWORD")
        print("   - FROM_EMAIL (или SMTP_FROM)")
        return False

async def test_booking_reminder_notification():
    """Тест напоминания о записи"""
    print("\n" + "=" * 70)
    print("ТЕСТ: НАПОМИНАНИЕ О ЗАПИСИ")
    print("=" * 70)

    # Тестовые данные записи
    tomorrow = datetime.now() + timedelta(days=1)
    booking_data = {
        'id': 999,
        'full_name': 'Genrih',
        'name': 'Genrih',
        'email': TEST_CONFIG['test_email'],
        'phone': '+77056054308',
        'service_name': 'Массаж (ног/стоп/рук) 40 мин',
        'master': 'Анна Иванова',
        'datetime': tomorrow.isoformat(),
        'notes': 'Тестовое напоминание'
    }

    # Получаем данные салона
    salon_settings = get_salon_settings()

    # Форматируем email
    plain_text, html_text = format_booking_reminder_email(booking_data, salon_settings)

    print("\n📧 Отправка напоминания...")
    print(f"   Кому: {booking_data['email']}")
    print(f"   Тема: 💅 Напоминание о записи")
    print(f"   Клиент: {booking_data['full_name']}")
    print(f"   Услуга: {booking_data['service_name']}")
    print(f"   Мастер: {booking_data['master']}")
    print(f"   Дата/Время: {tomorrow.strftime('%d.%m.%Y в %H:%M')}")

    # Отправляем email
    success = await send_email_async(
        recipients=[booking_data['email']],
        subject=f"💅 Напоминание о записи - {salon_settings.get('name', 'Салон')}",
        message=plain_text,
        html=html_text
    )

    if success:
        print("\n✅ НАПОМИНАНИЕ УСПЕШНО ОТПРАВЛЕНО!")
        print(f"   Проверьте почту {booking_data['email']}")
        return True
    else:
        print("\n❌ ОШИБКА ОТПРАВКИ НАПОМИНАНИЯ")
        return False

async def main():
    """Главная функция тестирования"""
    print("\n" + "=" * 70)
    print("🧪 ТЕСТИРОВАНИЕ EMAIL УВЕДОМЛЕНИЙ О ЗАПИСЯХ")
    print("=" * 70)
    print()

    results = []

    # Тест 1: Уведомление о новой записи
    result1 = await test_new_booking_notification()
    results.append(('Уведомление о новой записи', result1))

    # Тест 2: Напоминание о записи
    result2 = await test_booking_reminder_notification()
    results.append(('Напоминание о записи', result2))

    # Итоги
    print("\n" + "=" * 70)
    print("ИТОГИ ТЕСТИРОВАНИЯ")
    print("=" * 70)

    for name, success in results:
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {name}")

    total = len(results)
    passed = sum(1 for _, s in results if s)

    print(f"\nПройдено: {passed}/{total}")

    if passed == total:
        print("\n🎉 ВСЕ ТЕСТЫ ПРОЙДЕНЫ!")
        print(f"   Проверьте почту {TEST_CONFIG['test_email']}")
    else:
        print("\n⚠️  НЕКОТОРЫЕ ТЕСТЫ НЕ ПРОШЛИ")
        print("   Проверьте настройки SMTP в .env файле")

    print("=" * 70)

    return passed == total

if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)
