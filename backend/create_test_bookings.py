#!/usr/bin/env python3
"""
Скрипт для создания тестовых записей с email уведомлениями
"""
import sqlite3
from datetime import datetime, timedelta
import random

DATABASE_NAME = "salon_bot.db"
TEST_EMAIL = "ii3391609@gmail.com"

def create_test_bookings():
    """Создать тестовые записи на завтра с email уведомлениями"""

    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    print("=" * 80)
    print("📅 СОЗДАНИЕ ТЕСТОВЫХ ЗАПИСЕЙ С EMAIL УВЕДОМЛЕНИЯМИ")
    print("=" * 80)

    # Завтра
    tomorrow = datetime.now() + timedelta(days=1)
    tomorrow_date = tomorrow.strftime('%Y-%m-%d')

    # Получить список сотрудников
    c.execute("SELECT id, full_name FROM employees WHERE is_active = 1 LIMIT 3")
    employees = c.fetchall()

    if not employees:
        print("❌ Нет активных сотрудников в системе!")
        conn.close()
        return

    # Получить список услуг
    c.execute("SELECT id, name, duration, price FROM services WHERE is_active = 1 LIMIT 10")
    services = c.fetchall()

    if not services:
        print("❌ Нет услуг в системе!")
        conn.close()
        return

    # Временные слоты
    time_slots = ["10:00", "12:00", "14:00", "16:00", "18:00"]

    # Тестовые клиенты
    test_clients = [
        {"name": "Test Client 1", "phone": "+971501111111"},
        {"name": "Test Client 2", "phone": "+971502222222"},
        {"name": "Test Client 3", "phone": "+971503333333"},
        {"name": "Test Client 4", "phone": "+971504444444"},
        {"name": "Test Client 5", "phone": "+971505555555"},
    ]

    try:
        created_count = 0
        bookings_info = []

        for i, client in enumerate(test_clients):
            # Выбрать случайного мастера и услугу
            employee_id, employee_name = random.choice(employees)
            service_id, service_name, duration, price = random.choice(services)
            time_slot = time_slots[i % len(time_slots)]

            # Проверить существует ли клиент
            c.execute("SELECT instagram_id FROM clients WHERE phone = ?", (client["phone"],))
            result = c.fetchone()

            if result:
                # Клиент существует - обновить email и имя
                client_id = result[0]
                c.execute("""
                    UPDATE clients
                    SET email = ?, name = ?
                    WHERE phone = ?
                """, (TEST_EMAIL, client["name"], client["phone"]))
            else:
                # Создать нового клиента
                # Используем phone как instagram_id поскольку это primary key
                c.execute("""
                    INSERT INTO clients (instagram_id, phone, name, email, created_at)
                    VALUES (?, ?, ?, ?, datetime('now'))
                """, (client["phone"], client["phone"], client["name"], TEST_EMAIL))
                client_id = client["phone"]

            # Создать запись
            datetime_str = f"{tomorrow_date} {time_slot}"

            c.execute("""
                INSERT INTO bookings (
                    instagram_id,
                    service_name,
                    datetime,
                    phone,
                    name,
                    master,
                    status,
                    notes,
                    created_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
            """, (
                client_id,  # может быть None
                service_name,
                datetime_str,
                client["phone"],
                client["name"],
                employee_name,
                'confirmed',
                f'Тестовая запись #{i+1}. Email: {TEST_EMAIL}. Для проверки email уведомлений'
            ))

            created_count += 1

            bookings_info.append({
                'client': client["name"],
                'service': service_name,
                'employee': employee_name,
                'date': tomorrow_date,
                'time': time_slot,
                'price': price or 0
            })

            print(f"✅ Запись #{created_count}:")
            print(f"   👤 Клиент: {client['name']}")
            print(f"   📧 Email: {TEST_EMAIL}")
            print(f"   💈 Услуга: {service_name}")
            print(f"   👨‍💼 Мастер: {employee_name}")
            print(f"   📅 Дата: {tomorrow_date} в {time_slot}")
            print(f"   💰 Цена: {price or 0} AED")
            print()

        conn.commit()

        print("=" * 80)
        print(f"✅ Создано записей: {created_count}")
        print(f"📧 Email для всех записей: {TEST_EMAIL}")
        print(f"📅 Дата всех записей: {tomorrow_date} (ЗАВТРА)")
        print("=" * 80)

        # Инструкции по тестированию
        print("\n📋 ДЛЯ ТЕСТИРОВАНИЯ EMAIL УВЕДОМЛЕНИЙ:")
        print("   1. Убедитесь что настроены SMTP параметры в .env файле")
        print("   2. Запустите backend сервер: uvicorn main:app --reload")
        print("   3. Email уведомления должны отправиться автоматически при:")
        print("      • Создании записи (уже отправлено)")
        print("      • Напоминании за 24 часа (запустится завтра)")
        print("      • Напоминании за 2 часа (запустится завтра)")
        print(f"   4. Проверьте почту {TEST_EMAIL}")
        print()
        print("📊 СТАТИСТИКА ЗАПИСЕЙ:")
        c.execute("""
            SELECT
                DATE(datetime) as date,
                COUNT(*) as count,
                SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed
            FROM bookings
            WHERE DATE(datetime) >= date('now')
            GROUP BY DATE(datetime)
            ORDER BY datetime
            LIMIT 7
        """)

        upcoming = c.fetchall()
        if upcoming:
            print("\n   Предстоящие записи:")
            for date, count, confirmed in upcoming:
                print(f"     {date}: {count} записей ({confirmed} подтверждено)")

    except Exception as e:
        print(f"\n❌ Ошибка: {e}")
        import traceback
        traceback.print_exc()
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    create_test_bookings()
