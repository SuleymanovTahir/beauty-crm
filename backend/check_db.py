#!/usr/bin/env python3
"""
Скрипт для проверки данных в базе после миграций
"""
import sqlite3
import os

DB_PATH = '/home/user/beauty-crm/backend/salon_bot.db'

def check_database():
    """Проверить данные в базе"""

    if not os.path.exists(DB_PATH):
        print("❌ База данных не найдена")
        return

    if os.path.getsize(DB_PATH) == 0:
        print("⚠️  База данных пустая (0 байт)")
        return

    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    print("=" * 80)
    print("🔍 ПРОВЕРКА БАЗЫ ДАННЫХ")
    print("=" * 80)

    # 1. Проверка пользователей
    print("\n📋 ПОЛЬЗОВАТЕЛИ:")
    print("-" * 80)
    c.execute("""
        SELECT id, username, full_name, role, position, employee_id
        FROM users
        ORDER BY id
    """)
    users = c.fetchall()

    if users:
        print(f"{'ID':<5} {'Username':<15} {'Full Name':<20} {'Role':<10} {'Position':<25} {'Emp ID':<8}")
        print("-" * 80)

        users_without_position = 0
        for user_id, username, full_name, role, position, emp_id in users:
            print(f"{user_id:<5} {username:<15} {full_name:<20} {role:<10} {position or '❌ NULL':<25} {emp_id or '-':<8}")
            if not position:
                users_without_position += 1

        print("-" * 80)
        print(f"Всего пользователей: {len(users)}")
        if users_without_position > 0:
            print(f"⚠️  Пользователей БЕЗ должности: {users_without_position}")
        else:
            print("✅ Все пользователи имеют должности")
    else:
        print("❌ Пользователи не найдены")

    # 2. Проверка сотрудников
    print("\n\n👥 СОТРУДНИКИ:")
    print("-" * 80)
    c.execute("""
        SELECT id, full_name, position, phone, email
        FROM employees
        ORDER BY id
    """)
    employees = c.fetchall()

    if employees:
        print(f"{'ID':<5} {'Full Name':<20} {'Position':<25} {'Phone':<20}")
        print("-" * 80)

        for emp_id, full_name, position, phone, email in employees:
            print(f"{emp_id:<5} {full_name:<20} {position:<25} {phone or '-':<20}")

        print("-" * 80)
        print(f"✅ Всего сотрудников: {len(employees)}")
    else:
        print("❌ Сотрудники не найдены")

    # 3. Проверка должностей
    print("\n\n📑 СПРАВОЧНИК ДОЛЖНОСТЕЙ:")
    print("-" * 80)
    c.execute("""
        SELECT id, name, name_en, is_active
        FROM positions
        WHERE is_active = 1
        ORDER BY sort_order
    """)
    positions = c.fetchall()

    if positions:
        print(f"{'ID':<5} {'Name':<30} {'Name EN':<30}")
        print("-" * 80)

        for pos_id, name, name_en, is_active in positions:
            print(f"{pos_id:<5} {name:<30} {name_en or '-':<30}")

        print("-" * 80)
        print(f"✅ Активных должностей: {len(positions)}")
    else:
        print("❌ Должности не найдены")

    # 4. Проверка настроек салона
    print("\n\n🏪 НАСТРОЙКИ САЛОНА:")
    print("-" * 80)
    c.execute("""
        SELECT name, address, phone, booking_url, google_maps
        FROM salon_settings
        WHERE id = 1
    """)
    salon = c.fetchone()

    if salon:
        name, address, phone, booking_url, google_maps = salon
        print(f"Название: {name}")
        print(f"Адрес: {address}")
        print(f"Телефон: {phone}")
        print(f"Booking URL: {booking_url}")
        print(f"Google Maps: {google_maps}")

        if booking_url == "/public/booking":
            print("✅ Booking URL установлен правильно")
        else:
            print(f"⚠️  Booking URL: {booking_url}")
    else:
        print("❌ Настройки салона не найдены")

    conn.close()
    print("\n" + "=" * 80)

if __name__ == "__main__":
    check_database()
