"""
Schema для отслеживания онлайн статуса пользователей
"""
import logging
from db.connection import get_db_connection


def run_migration():
    """
    Создание таблицы user_status для отслеживания онлайн статуса
    """
    conn = get_db_connection()
    c = conn.cursor()

    try:
        logging.info("Creating user_status table...")

        # Создаем таблицу для статуса пользователей
        c.execute("""
            CREATE TABLE IF NOT EXISTS user_status (
                user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
                is_online BOOLEAN DEFAULT FALSE,
                last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)

        # Индексы для быстрого поиска
        c.execute("CREATE INDEX IF NOT EXISTS idx_user_status_online ON user_status(is_online);")
        c.execute("CREATE INDEX IF NOT EXISTS idx_user_status_last_seen ON user_status(last_seen);")

        conn.commit()
        logging.info("✅ user_status table created successfully")
        return True, "user_status table created"

    except Exception as e:
        conn.rollback()
        logging.error(f"❌ Error creating user_status schema: {e}")
        return False, str(e)
    finally:
        conn.close()


if __name__ == "__main__":
    success, message = run_migration()
    print(f"Migration result: {message}")
