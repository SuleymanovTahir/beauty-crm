#!/usr/bin/env python3
"""
Скрипт для удаления тестовых пользователей

Удаляет всех пользователей с email заканчивающимся на @test.com
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from db.connection import get_db_connection

def delete_test_users():
    """Удалить всех тестовых пользователей"""
    conn = get_db_connection()
    cursor = conn.cursor()

    print("🔍 Поиск тестовых пользователей...")

    # Найти всех тестовых пользователей
    cursor.execute("""
        SELECT id, username, full_name, email, role
        FROM users
        WHERE email LIKE '%@test.com'
        ORDER BY role, username
    """)

    test_users = cursor.fetchall()

    if not test_users:
        print("✅ Тестовые пользователи не найдены")
        cursor.close()
        conn.close()
        return

    print(f"\n📋 Найдено тестовых пользователей: {len(test_users)}\n")

    for user in test_users:
        user_id, username, full_name, email, role = user
        print(f"  • {username:12} | {full_name:25} | {role:10} | {email}")

    print("\n" + "=" * 80)
    confirmation = input("⚠️  Вы уверены, что хотите удалить всех тестовых пользователей? (yes/no): ")

    if confirmation.lower() != 'yes':
        print("❌ Удаление отменено")
        cursor.close()
        conn.close()
        return

    print("\n🗑️  Удаление тестовых пользователей...")

    # Удаляем тестовых пользователей
    cursor.execute("DELETE FROM users WHERE email LIKE '%@test.com'")
    deleted_count = cursor.rowcount

    conn.commit()

    print(f"\n✅ Удалено пользователей: {deleted_count}")
    print("✅ Все тестовые пользователи успешно удалены!\n")

    cursor.close()
    conn.close()

if __name__ == "__main__":
    try:
        delete_test_users()
    except Exception as e:
        print(f"❌ Ошибка: {e}")
        import traceback
        traceback.print_exc()
