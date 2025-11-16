#!/usr/bin/env python3
"""
Удаление тестовых клиентов
"""
import sqlite3
import sys
import os

# Используем прямой путь к БД
DATABASE_NAME = os.path.join(os.path.dirname(__file__), '..', '..', '..', 'salon_bot.db')


def delete_test_clients():
    """Удалить тестовых клиентов"""
    print("\n" + "=" * 80)
    print("УДАЛЕНИЕ ТЕСТОВЫХ КЛИЕНТОВ")
    print("=" * 80)

    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    try:
        # Список тестовых клиентов
        test_usernames = ['anna_hot', 'elena_test', 'maria_test']

        for username in test_usernames:
            print(f"\n🔍 Ищу клиента @{username}...")

            # Проверяем существование
            c.execute("SELECT instagram_id, name FROM clients WHERE username = ?", (username,))
            client = c.fetchone()

            if client:
                instagram_id, name = client
                print(f"   Найден: {name} (ID: {instagram_id})")

                # Удаляем связанные данные
                c.execute("DELETE FROM chat_history WHERE instagram_id = ?", (instagram_id,))
                deleted_messages = c.rowcount
                print(f"   ✅ Удалено сообщений из chat_history: {deleted_messages}")

                c.execute("DELETE FROM bookings WHERE client_id = ?", (instagram_id,))
                deleted_bookings = c.rowcount
                print(f"   ✅ Удалено записей из bookings: {deleted_bookings}")

                c.execute("DELETE FROM client_loyalty_points WHERE client_id = ?", (instagram_id,))
                deleted_loyalty = c.rowcount
                print(f"   ✅ Удалено записей из client_loyalty_points: {deleted_loyalty}")

                c.execute("DELETE FROM loyalty_transactions WHERE client_id = ?", (instagram_id,))
                deleted_transactions = c.rowcount
                print(f"   ✅ Удалено транзакций из loyalty_transactions: {deleted_transactions}")

                # Удаляем самого клиента
                c.execute("DELETE FROM clients WHERE instagram_id = ?", (instagram_id,))
                print(f"   ✅ Клиент @{username} удален")

            else:
                print(f"   ℹ️  Клиент @{username} не найден")

        conn.commit()
        print("\n" + "=" * 80)
        print("✅ ТЕСТОВЫЕ КЛИЕНТЫ УДАЛЕНЫ")
        print("=" * 80)

        return True

    except Exception as e:
        print(f"\n❌ ОШИБКА: {e}")
        conn.rollback()
        import traceback
        traceback.print_exc()
        return False

    finally:
        conn.close()


if __name__ == "__main__":
    success = delete_test_clients()
    sys.exit(0 if success else 1)
