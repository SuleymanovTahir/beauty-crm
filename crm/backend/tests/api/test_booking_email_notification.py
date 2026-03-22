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

from core.config import APP_NAME
from utils.email import send_email_async, _is_fake_email
from db.settings import get_salon_settings
from modules.notifications.email import format_new_booking_email


def _email_test_ready(recipient: str) -> tuple[bool, str]:
    """Check whether email delivery can be tested in this environment."""
    if _is_fake_email(recipient):
        return False, f"recipient '{recipient}' is a fake/test email"

    smtp_user = os.getenv('SMTP_USERNAME') or os.getenv('SMTP_USER')
    smtp_password = os.getenv('SMTP_PASSWORD')
    smtp_from = os.getenv('FROM_EMAIL') or os.getenv('SMTP_FROM') or smtp_user

    if not smtp_user or not smtp_password or not smtp_from:
        return False, "SMTP credentials are not fully configured"

    return True, ""


def format_booking_reminder_email(booking_data: dict, salon_data: dict) -> tuple[str, str]:
    """
    Локальный форматтер напоминания для теста.
    В прод-коде напоминания отправляются через UniversalMessenger.
    """
    client_name = booking_data.get('full_name') or booking_data.get('name') or 'Клиент'
    service_name = booking_data.get('service_name') or 'Услуга'
    master_name = booking_data.get('master') or ''
    booking_dt = booking_data.get('datetime') or ''
    phone = booking_data.get('phone') or ''
    brand_name = (salon_data.get('name') or APP_NAME).strip() or APP_NAME

    plain = f"""
Напоминание о записи

Клиент: {client_name}
Телефон: {phone}
Услуга: {service_name}
Мастер: {master_name}
Дата и время: {booking_dt}

---
{brand_name}
"""

    html = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
</head>
<body>
    <h2>Напоминание о записи</h2>
    <p><b>Клиент:</b> {client_name}</p>
    <p><b>Телефон:</b> {phone}</p>
    <p><b>Услуга:</b> {service_name}</p>
    <p><b>Мастер:</b> {master_name}</p>
    <p><b>Дата и время:</b> {booking_dt}</p>
    <hr/>
    <p>{brand_name}</p>
</body>
</html>
"""

    return plain, html

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

    ready, reason = _email_test_ready(test_email)
    if not ready:
        print(f"\nSKIPPED ({reason})")
        return True

    # Отправляем email
    success = await send_email_async(
        recipients=[test_email],
        subject=f"🎉 Новая запись онлайн! - {(salon_data.get('name') or APP_NAME).strip() or APP_NAME}",
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

    ready, reason = _email_test_ready(booking_data['email'])
    if not ready:
        print(f"\nSKIPPED ({reason})")
        return True

    # Отправляем email
    success = await send_email_async(
        recipients=[booking_data['email']],
        subject=f"💅 Напоминание о записи - {(salon_settings.get('name') or APP_NAME).strip() or APP_NAME}",
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
