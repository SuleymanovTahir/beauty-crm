"""
Проверка пользователей в базе данных
"""
import sys
import os

# Добавляем путь к backend
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from db.connection import get_db_connection

# PostgreSQL doesn't use a file path for check

try:
    conn = get_db_connection()
    c = conn.cursor()

    # Проверяем существует ли таблица users
    c.execute("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name='users'")
    if not c.fetchone():
        print("❌ Таблица users не существует!")
        print("   Запустите backend чтобы создать таблицы: python main.py")
        conn.close()
        exit(1)

    print("=" * 70)
    print("СПИСОК ПОЛЬЗОВАТЕЛЕЙ В БАЗЕ ДАННЫХ")
    print("=" * 70)

    c.execute("""
        SELECT id, username, email, full_name, role, email_verified, is_active, created_at
        FROM users
        ORDER BY id
    """)

    users = c.fetchall()

    if not users:
        print("\n❌ БАЗА ДАННЫХ ПУСТАЯ!")
        print("   Пользователей нет. Нужно зарегистрироваться.")
        print("\n📝 Инструкция:")
        print("   1. Запустите backend: python main.py")
        print("   2. Откройте http://localhost:5173/register")
        print("   3. Зарегистрируйтесь как Директор с вашим email")
    else:
        print(f"\n✅ Найдено пользователей: {len(users)}\n")

        for user in users:
            user_id, username, email, full_name, role, email_verified, is_active, created_at = user

            verified_icon = "✅" if email_verified else "❌"
            active_icon = "✅" if is_active else "❌"

            print(f"👤 ID: {user_id}")
            print(f"   Username: {username}")
            print(f"   Email: {email or 'НЕ УКАЗАН'}")
            print(f"   Имя: {full_name}")
            print(f"   Роль: {role}")
            print(f"   Email подтвержден: {verified_icon}")
            print(f"   Активен: {active_icon}")
            print(f"   Создан: {created_at}")
            print("-" * 70)

    conn.close()

except Exception as e:
    print(f"❌ Ошибка: {e}")
