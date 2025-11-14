#!/usr/bin/env python3
"""
Обновление существующих пользователей - установка роли 'employee' и должностей
"""
import sqlite3
from datetime import datetime

DB_PATH = "crm_system.db"

# Маппинг сотрудников на должности (можно обновить при необходимости)
EMPLOYEE_POSITIONS = {
    # Если знаете конкретных сотрудников, укажите здесь
    # "username": "Должность",
}

def update_existing_users():
    """Обновить существующих пользователей"""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    print("=" * 80)
    print("🔄 ОБНОВЛЕНИЕ СУЩЕСТВУЮЩИХ ПОЛЬЗОВАТЕЛЕЙ")
    print("=" * 80)

    # Проверяем наличие колонок position и role в users
    c.execute("PRAGMA table_info(users)")
    columns = [row[1] for row in c.fetchall()]

    has_role = 'role' in columns
    has_position = 'position' in columns

    print(f"\n✓ Таблица users:")
    print(f"  - Колонка 'role': {'✓ Есть' if has_role else '✗ Нет'}")
    print(f"  - Колонка 'position': {'✓ Есть' if has_position else '✗ Нет'}")

    # Создаем колонки если их нет
    if not has_role:
        print("\n➕ Добавляем колонку 'role'...")
        c.execute("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'employee'")
        conn.commit()
        print("✓ Колонка 'role' добавлена")

    if not has_position:
        print("\n➕ Добавляем колонку 'position'...")
        c.execute("ALTER TABLE users ADD COLUMN position TEXT")
        conn.commit()
        print("✓ Колонка 'position' добавлена")

    # Получаем всех пользователей
    c.execute("""
        SELECT id, username, full_name, email, role, position
        FROM users
        ORDER BY id
    """)

    users = c.fetchall()

    if not users:
        print("\n❌ Нет пользователей для обновления")
        conn.close()
        return

    print(f"\n📋 Найдено пользователей: {len(users)}")
    print("-" * 80)

    updated_count = 0
    for user in users:
        user_id, username, full_name, email, role, position = user

        # Определяем нужно ли обновление
        needs_update = False
        new_role = role or 'employee'
        new_position = position

        # Если роль не указана, ставим employee
        if not role or role == '':
            new_role = 'employee'
            needs_update = True

        # Если должность не указана, пытаемся определить из маппинга или ставим "Сотрудник"
        if not position or position == '':
            if username in EMPLOYEE_POSITIONS:
                new_position = EMPLOYEE_POSITIONS[username]
            else:
                # Ставим дефолтную должность
                new_position = "Администратор"  # или "Сотрудник", как решите
            needs_update = True

        if needs_update:
            c.execute("""
                UPDATE users
                SET role = ?, position = ?
                WHERE id = ?
            """, (new_role, new_position, user_id))

            print(f"✓ Обновлен: {username:<15} -> роль: {new_role:<10} должность: {new_position}")
            updated_count += 1
        else:
            print(f"  Пропущен: {username:<15} (уже заполнено)")

    conn.commit()

    print("-" * 80)
    print(f"\n✅ Обновлено пользователей: {updated_count}")

    # Показываем итоговое состояние
    print("\n📋 ИТОГОВОЕ СОСТОЯНИЕ:")
    print("-" * 80)
    c.execute("""
        SELECT id, username, full_name, role, position, email_verified, is_active
        FROM users
        ORDER BY id
    """)

    print(f"{'ID':<5} {'Username':<15} {'Имя':<25} {'Роль':<12} {'Должность':<20} {'Email✓':<7} {'Активен'}")
    print("-" * 80)
    for user in c.fetchall():
        user_id, username, name, role, position, email_verified, is_active = user
        print(f"{user_id:<5} {username:<15} {name:<25} {role or 'НЕТ':<12} {position or 'НЕТ':<20} {'Да' if email_verified else 'Нет':<7} {'Да' if is_active else 'Нет'}")

    print("=" * 80)

    conn.close()

if __name__ == "__main__":
    update_existing_users()
