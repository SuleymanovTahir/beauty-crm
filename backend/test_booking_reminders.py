"""
Тестовый скрипт для проверки системы напоминаний о записях

Создает тестовую запись и отправляет напоминание на ii3391609@gmail.com
"""
import sqlite3
import asyncio
from datetime import datetime, timedelta
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from core.config import DATABASE_NAME
from scheduler.booking_reminder_checker import check_and_send_reminders


def create_test_booking_and_client():
    """Создать тестовую запись и клиента"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    try:
        # 1. Создаем тестового клиента с email
        test_email = "ii3391609@gmail.com"
        test_instagram_id = "test_user_for_reminders"

        # Удаляем старого тестового клиента если есть
        c.execute("DELETE FROM clients WHERE instagram_id = ?", (test_instagram_id,))

        # Создаем нового тестового клиента
        c.execute("""
            INSERT INTO clients (instagram_id, full_name, phone, email, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (
            test_instagram_id,
            "Тестовый Клиент",
            "+971501234567",
            test_email,
            "new",
            datetime.now().isoformat()
        ))

        print(f"✅ Создан тестовый клиент с email: {test_email}")

        # 2. Создаем тестовую запись на завтра в 14:00
        tomorrow_2pm = datetime.now() + timedelta(days=1)
        tomorrow_2pm = tomorrow_2pm.replace(hour=14, minute=0, second=0, microsecond=0)

        # Удаляем старые тестовые записи
        c.execute("DELETE FROM bookings WHERE instagram_id = ?", (test_instagram_id,))

        # Создаем новую тестовую запись
        c.execute("""
            INSERT INTO bookings (instagram_id, service_name, datetime, phone, name, status, master, notes, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            test_instagram_id,
            "Маникюр с покрытием",
            tomorrow_2pm.isoformat(),
            "+971501234567",
            "Тестовый Клиент",
            "confirmed",
            "Диана Иванова",
            "Тестовая запись для проверки уведомлений",
            datetime.now().isoformat()
        ))

        booking_id = c.lastrowid

        print(f"✅ Создана тестовая запись на {tomorrow_2pm.strftime('%d.%m.%Y %H:%M')}")
        print(f"   Booking ID: {booking_id}")

        # 3. Включаем напоминание "За 1 день до записи"
        c.execute("""
            UPDATE booking_reminder_settings
            SET is_enabled = 1
            WHERE name = 'За 1 день до записи'
        """)

        # Проверяем что напоминание включено
        c.execute("""
            SELECT name, days_before, hours_before, is_enabled
            FROM booking_reminder_settings
            WHERE is_enabled = 1
        """)

        enabled_reminders = c.fetchall()
        print(f"\n📋 Включенные напоминания:")
        for reminder in enabled_reminders:
            print(f"   • {reminder[0]} ({reminder[1]} дней, {reminder[2]} часов)")

        conn.commit()

        return booking_id, test_email

    except Exception as e:
        print(f"❌ Ошибка: {e}")
        conn.rollback()
        return None, None

    finally:
        conn.close()


async def run_test():
    """Запустить тест"""
    print("=" * 70)
    print("ТЕСТ СИСТЕМЫ НАПОМИНАНИЙ О ЗАПИСЯХ")
    print("=" * 70)

    # 1. Создаем тестовые данные
    booking_id, test_email = create_test_booking_and_client()

    if not booking_id:
        print("❌ Не удалось создать тестовые данные")
        return

    # 2. Проверяем SMTP настройки
    print("\n📧 Проверка SMTP настроек...")
    smtp_host = os.getenv('SMTP_HOST')
    smtp_user = os.getenv('SMTP_USER') or os.getenv('SMTP_USERNAME')
    smtp_password = os.getenv('SMTP_PASSWORD')

    if not smtp_user or not smtp_password:
        print("❌ SMTP настройки не найдены в .env файле!")
        print("   Добавьте следующие переменные:")
        print("   SMTP_HOST=smtp.gmail.com")
        print("   SMTP_PORT=587")
        print("   SMTP_USER=your_email@gmail.com")
        print("   SMTP_PASSWORD=your_app_password")
        print("   FROM_EMAIL=your_email@gmail.com")
        return

    print(f"✅ SMTP Host: {smtp_host}")
    print(f"✅ SMTP User: {smtp_user}")

    # 3. Запускаем проверку напоминаний
    print("\n🔔 Запуск проверки и отправки напоминаний...")
    print("=" * 70)

    await check_and_send_reminders()

    print("\n=" * 70)
    print("✅ ТЕСТ ЗАВЕРШЕН")
    print("=" * 70)
    print(f"\nПроверьте почту: {test_email}")
    print("Письмо должно содержать:")
    print("  • Дату и время записи")
    print("  • Услугу (Маникюр с покрытием)")
    print("  • Мастера (Диана Иванова)")
    print("  • Адрес салона")
    print("  • Телефон салона")
    print("  • Ссылку на Google Maps")


if __name__ == "__main__":
    asyncio.run(run_test())
