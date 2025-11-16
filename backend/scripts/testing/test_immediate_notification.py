#!/usr/bin/env python3
"""
Скрипт для немедленного тестирования уведомлений
Создает запись на время, которое даст напоминание ПРЯМО СЕЙЧАС
"""
import sqlite3
import argparse
from datetime import datetime, timedelta
import sys
import os

# Добавляем корневую директорию в path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from core.config import DATABASE_NAME

def create_immediate_test_booking(email: str = "ii3391609@gmail.com", hours_ahead: float = 0.05):
    """
    Создать тестовую запись, которая даст напоминание прямо сейчас

    Args:
        email: Email для уведомлений
        hours_ahead: Через сколько часов запись (по умолчанию 0.05 = 3 минуты)
    """
    print("=" * 80)
    print("🔔 ТЕСТ НЕМЕДЛЕННЫХ УВЕДОМЛЕНИЙ")
    print("=" * 80)
    print(f"Email: {email}")
    print(f"Создаем запись через: {hours_ahead * 60:.1f} минут")
    print("=" * 80)
    print()

    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    try:
        # 1. Создаем/обновляем тестового клиента
        print("1️⃣ Создание тестового клиента...")
        c.execute("""
            INSERT OR REPLACE INTO clients
            (instagram_id, username, name, phone, email, status, first_contact, last_contact)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            'test_immediate_notification',
            '@test_notification',
            'Test Notification Client',
            '+971501234567',
            email,
            'customer',
            datetime.now().isoformat(),
            datetime.now().isoformat()
        ))
        print(f"   ✅ Клиент создан/обновлен")
        print(f"   Email: {email}")
        print()

        # 2. Создаем запись на нужное время
        # Если напоминание за 2 часа, то запись должна быть через 2 часа + 5 минут (в окне ±10 мин)
        booking_time = datetime.now() + timedelta(hours=2, minutes=5)

        print(f"2️⃣ Создание тестовой записи...")
        c.execute("""
            INSERT INTO bookings
            (datetime, name, phone, service_name, master, status, instagram_id, notes, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            booking_time.isoformat(),
            'Test Notification Client',
            '+971501234567',
            'Тестовая услуга (напоминание)',
            'Тестовый мастер',
            'pending',
            'test_immediate_notification',
            'Создано для теста немедленных уведомлений',
            datetime.now().isoformat()
        ))

        booking_id = c.lastrowid
        print(f"   ✅ Запись создана (ID: {booking_id})")
        print(f"   Дата/время: {booking_time.strftime('%Y-%m-%d %H:%M')}")
        print(f"   Услуга: Тестовая услуга (напоминание)")
        print()

        # 3. Проверяем настройки напоминаний
        print("3️⃣ Проверка настроек напоминаний...")
        c.execute("""
            SELECT id, name, days_before, hours_before
            FROM booking_reminder_settings
            WHERE is_enabled = 1
            ORDER BY days_before DESC, hours_before DESC
        """)

        reminders = c.fetchall()
        if reminders:
            print(f"   ✅ Найдено активных настроек: {len(reminders)}")
            for r in reminders:
                # Вычисляем когда придет напоминание
                reminder_time = booking_time - timedelta(days=r[2], hours=r[3])
                time_to_reminder = (reminder_time - datetime.now()).total_seconds() / 60

                print(f"   - {r[1]}: за {r[2]} дн. {r[3]} ч.")
                print(f"     Напоминание придет: {reminder_time.strftime('%Y-%m-%d %H:%M')}")
                print(f"     Через: {time_to_reminder:.1f} минут")
                if -10 <= time_to_reminder <= 10:
                    print(f"     ✅ В окне ±10 минут - ОТПРАВИТСЯ!")
                else:
                    print(f"     ⏰ Вне окна - не отправится сейчас")
        else:
            print("   ⚠️  Нет активных настроек напоминаний!")
            print("   Создаем настройку 'за 2 часа'...")

            c.execute("""
                INSERT INTO booking_reminder_settings
                (name, days_before, hours_before, notification_type, is_enabled)
                VALUES (?, ?, ?, ?, ?)
            """, ('2 hours before', 0, 2, 'email', 1))
            print("   ✅ Настройка создана")

        print()

        conn.commit()

        print("=" * 80)
        print("✅ ТЕСТОВЫЕ ДАННЫЕ СОЗДАНЫ!")
        print("=" * 80)
        print()
        print("📧 Для получения уведомления:")
        print("   1. Подождите 3-5 минут")
        print("   2. Запустите планировщик:")
        print("      python -m scheduler.booking_reminder_checker")
        print("   3. Проверьте почту:", email)
        print()
        print(f"   ⏰ Текущее время: {datetime.now().strftime('%H:%M:%S')}")
        print(f"   📅 Запись на: {booking_time.strftime('%Y-%m-%d %H:%M')}")
        print()

        return True

    except Exception as e:
        print(f"❌ Ошибка: {e}")
        conn.rollback()
        return False
    finally:
        conn.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Создать запись для немедленного теста уведомлений')
    parser.add_argument('--email', type=str, default='ii3391609@gmail.com',
                        help='Email для уведомлений (по умолчанию: ii3391609@gmail.com)')
    parser.add_argument('--hours', type=float, default=2.083,
                        help='Через сколько часов запись (по умолчанию: 2.083 = 2ч 5мин)')

    args = parser.parse_args()

    create_immediate_test_booking(args.email, args.hours)
