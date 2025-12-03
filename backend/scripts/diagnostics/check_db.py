#!/usr/bin/env python3
"""
Проверка структуры базы данных
"""
from db.connection import get_db_connection
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from core.config import DATABASE_NAME


def check_database():
    """Проверить данные в базе"""

    if not os.path.exists(DATABASE_NAME):
        print(f"❌ База данных {DATABASE_NAME} не найдена")
        return False

    if os.path.getsize(DATABASE_NAME) == 0:
        print(f"⚠️  База данных {DATABASE_NAME} пустая (0 байт)")
        return False

    conn = get_db_connection()
    c = conn.cursor()

    print("=" * 80)
    print("🔍 ПРОВЕРКА БАЗЫ ДАННЫХ")
    print("=" * 80)

    # 1. Проверка пользователей
    print("\n📋 ПОЛЬЗОВАТЕЛИ:")
    print("-" * 80)

    try:
        c.execute("""
            SELECT id, username, full_name, role, email, birthday, phone
            FROM users
            ORDER BY id
        """)
        users = c.fetchall()

        if users:
            print(f"{'ID':<5} {'Username':<15} {'Full Name':<20} {'Role':<10} {'Email':<25}")
            print("-" * 80)

            users_without_email = 0
            users_with_birthday = 0

            for user_id, username, full_name, role, email, birthday, phone in users:
                print(f"{user_id:<5} {username:<15} {full_name or '-':<20} {role:<10} {email or '❌ NULL':<25}")
                if not email:
                    users_without_email += 1
                if birthday:
                    users_with_birthday += 1

            print("-" * 80)
            print(f"Всего пользователей: {len(users)}")
            print(f"С датой рождения: {users_with_birthday}")
            if users_without_email > 0:
                print(f"⚠️  Пользователей БЕЗ email: {users_without_email}")
            else:
                print("✅ Все пользователи имеют email")
        else:
            print("❌ Пользователи не найдены")
    except sqlite3.OperationalError as e:
        print(f"⚠️  Ошибка при проверке пользователей: {e}")

    # 2. Проверка сотрудников
    print("\n\n👥 СОТРУДНИКИ:")
    print("-" * 80)

    try:
        c.execute("""
            SELECT id, full_name, phone, email, birthday
            FROM employees
            WHERE is_active = 1
            ORDER BY id
        """)
        employees = c.fetchall()

        if employees:
            print(f"{'ID':<5} {'Full Name':<25} {'Phone':<20} {'Email':<30}")
            print("-" * 80)

            employees_with_birthday = 0
            for emp_id, full_name, phone, email, birthday in employees:
                print(f"{emp_id:<5} {full_name:<25} {phone or '-':<20} {email or '-':<30}")
                if birthday:
                    employees_with_birthday += 1

            print("-" * 80)
            print(f"✅ Всего активных сотрудников: {len(employees)}")
            print(f"С датой рождения: {employees_with_birthday}")
        else:
            print("⚠️  Активные сотрудники не найдены")
    except sqlite3.OperationalError as e:
        print(f"⚠️  Ошибка при проверке сотрудников: {e}")

    # 3. Проверка настроек бота
    print("\n\n🤖 НАСТРОЙКИ БОТА:")
    print("-" * 80)

    critical_fields = [
        'price_explanation',
        'objection_handling',
        'negative_handling',
        'example_dialogues',
        'context_memory',
        'avoid_repetition',
        'conversation_flow_rules',
        'personality_adaptations',
        'smart_objection_detection'
    ]

    try:
        empty_fields = []
        filled_fields = []

        for field in critical_fields:
            c.execute(f"SELECT {field} FROM bot_settings WHERE id = 1")
            result = c.fetchone()

            if result and result[0] and result[0].strip():
                filled_fields.append(field)
                print(f"✅ {field}: {len(result[0])} символов")
            else:
                empty_fields.append(field)
                print(f"❌ {field}: ПУСТО")

        print("-" * 80)
        print(f"Заполнено: {len(filled_fields)}/{len(critical_fields)}")

        if empty_fields:
            print(f"\n⚠️  Пустые поля ({len(empty_fields)}):")
            for field in empty_fields:
                print(f"   - {field}")
            print("\nДля заполнения выполните: python fill_bot_settings.py")
        else:
            print("✅ Все критические поля заполнены")

    except sqlite3.OperationalError as e:
        print(f"⚠️  Ошибка при проверке настроек бота: {e}")

    # 4. Проверка таблиц миграций
    print("\n\n📊 ТАБЛИЦЫ:")
    print("-" * 80)

    critical_tables = [
        'users', 'employees', 'clients', 'bookings',
        'bot_settings', 'salon_settings', 'services',
        'internal_chat', 'booking_reminder_settings',
        'birthday_notifications'
    ]

    existing_tables = []
    missing_tables = []

    for table in critical_tables:
        c.execute(f"SELECT name FROM sqlite_master WHERE type='table' AND name='{table}'")
        if c.fetchone():
            # Получаем количество записей
            c.execute(f"SELECT COUNT(*) FROM {table}")
            count = c.fetchone()[0]
            existing_tables.append(table)
            print(f"✅ {table:<30} ({count} записей)")
        else:
            missing_tables.append(table)
            print(f"❌ {table:<30} НЕ НАЙДЕНА")

    print("-" * 80)
    print(f"Найдено таблиц: {len(existing_tables)}/{len(critical_tables)}")

    if missing_tables:
        print(f"\n⚠️  Отсутствующие таблицы ({len(missing_tables)}):")
        for table in missing_tables:
            print(f"   - {table}")
        print("\nДля создания выполните миграции: python -m db.migrations.run_all_migrations")

    conn.close()

    print("\n" + "=" * 80)
    print("✅ Проверка завершена")
    print("=" * 80 + "\n")

    return True


if __name__ == "__main__":
    try:
        success = check_database()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"\n❌ Ошибка: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
