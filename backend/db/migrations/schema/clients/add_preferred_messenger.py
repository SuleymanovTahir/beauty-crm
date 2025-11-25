"""
Миграция: Добавление поля preferred_messenger в таблицу clients

Поле позволяет указать предпочтительный мессенджер для отправки уведомлений клиенту
"""
import sqlite3
from core.config import DATABASE_NAME


def add_preferred_messenger_field():
    """Добавить поле preferred_messenger в таблицу clients"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    try:
        # Проверяем, существует ли уже это поле
        c.execute("PRAGMA table_info(clients)")
        columns = [col[1] for col in c.fetchall()]

        if 'preferred_messenger' not in columns:
            # Добавляем поле
            c.execute("""
                ALTER TABLE clients
                ADD COLUMN preferred_messenger TEXT DEFAULT NULL
            """)
            conn.commit()
            print("✅ Поле preferred_messenger добавлено в таблицу clients")
        else:
            print("ℹ️ Поле preferred_messenger уже существует")

    except Exception as e:
        print(f"❌ Ошибка при добавлении поля preferred_messenger: {e}")
        conn.rollback()
    finally:
        conn.close()


if __name__ == '__main__':
    add_preferred_messenger_field()
