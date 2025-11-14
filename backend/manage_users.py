"""
Скрипт для управления пользователями в базе данных
"""
import sqlite3
import os
import sys

db_path = 'crm.db'

if not os.path.exists(db_path):
    print("❌ База данных не существует!")
    print("   Запустите backend: python main.py")
    exit(1)

def show_users():
    """Показать всех пользователей"""
    conn = sqlite3.connect(db_path)
    c = conn.cursor()

    c.execute("""
        SELECT id, username, email, full_name, role, email_verified, is_active
        FROM users
        ORDER BY id
    """)

    users = c.fetchall()
    conn.close()

    if not users:
        print("❌ Пользователей нет в БД")
        return []

    print("\n" + "=" * 90)
    print("ПОЛЬЗОВАТЕЛИ В БАЗЕ ДАННЫХ")
    print("=" * 90)

    for user in users:
        user_id, username, email, full_name, role, email_verified, is_active = user

        verified = "✅" if email_verified else "❌"
        active = "✅" if is_active else "❌"

        print(f"\n[{user_id}] {username} ({full_name})")
        print(f"    Email: {email or 'НЕ УКАЗАН'}")
        print(f"    Роль: {role}")
        print(f"    Email подтвержден: {verified}")
        print(f"    Активен: {active}")

    print("=" * 90)
    return users

def delete_all_users():
    """Удалить всех пользователей"""
    conn = sqlite3.connect(db_path)
    c = conn.cursor()

    # Удаляем из всех связанных таблиц
    c.execute("DELETE FROM users")
    c.execute("DELETE FROM employees")
    c.execute("DELETE FROM sessions")

    conn.commit()
    conn.close()

    print("\n✅ Все пользователи удалены!")
    print("   Теперь можете зарегистрироваться как первый директор")

def activate_user(user_id):
    """Активировать пользователя"""
    conn = sqlite3.connect(db_path)
    c = conn.cursor()

    c.execute("""
        UPDATE users
        SET is_active = 1, email_verified = 1
        WHERE id = ?
    """, (user_id,))

    conn.commit()
    conn.close()

    print(f"\n✅ Пользователь ID={user_id} активирован!")

def delete_user(user_id):
    """Удалить конкретного пользователя"""
    conn = sqlite3.connect(db_path)
    c = conn.cursor()

    # Находим связанного employee
    c.execute("SELECT assigned_employee_id FROM users WHERE id = ?", (user_id,))
    result = c.fetchone()
    employee_id = result[0] if result and result[0] else None

    # Удаляем пользователя
    c.execute("DELETE FROM users WHERE id = ?", (user_id,))

    # Удаляем связанного employee
    if employee_id:
        c.execute("DELETE FROM employees WHERE id = ?", (employee_id,))

    # Удаляем сессии
    c.execute("DELETE FROM sessions WHERE user_id = ?", (user_id,))

    conn.commit()
    conn.close()

    print(f"\n✅ Пользователь ID={user_id} удален!")

# Главное меню
print("\n" + "=" * 90)
print("УПРАВЛЕНИЕ ПОЛЬЗОВАТЕЛЯМИ")
print("=" * 90)

users = show_users()

if not users:
    exit(0)

print("\n📝 Что вы хотите сделать?")
print("1. Удалить ВСЕХ пользователей (начать с чистого листа)")
print("2. Активировать конкретного пользователя")
print("3. Удалить конкретного пользователя")
print("4. Выход")

choice = input("\nВыберите действие (1-4): ").strip()

if choice == "1":
    confirm = input("\n⚠️  Вы уверены? Это удалит ВСЕ данные пользователей! (yes/no): ").strip().lower()
    if confirm == "yes":
        delete_all_users()
    else:
        print("Отменено")

elif choice == "2":
    user_id = input("Введите ID пользователя для активации: ").strip()
    try:
        activate_user(int(user_id))
    except ValueError:
        print("❌ Неверный ID")

elif choice == "3":
    user_id = input("Введите ID пользователя для удаления: ").strip()
    try:
        delete_user(int(user_id))
    except ValueError:
        print("❌ Неверный ID")

elif choice == "4":
    print("Выход")
    exit(0)

else:
    print("❌ Неверный выбор")
