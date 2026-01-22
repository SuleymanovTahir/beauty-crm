"""
Миграция: Создание таблицы user_push_tokens
Дата: 2024-01-22
Описание: Таблица для хранения push токенов устройств пользователей
"""

from db.init import get_db_connection


def run_migration():
    """Создать таблицу user_push_tokens"""
    conn = get_db_connection()
    c = conn.cursor()

    try:
        # Создание таблицы
        c.execute("""
            CREATE TABLE IF NOT EXISTS user_push_tokens (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                token VARCHAR(255) NOT NULL,
                device_type VARCHAR(20) DEFAULT 'unknown',
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW(),

                -- Уникальность токена для пользователя
                CONSTRAINT unique_user_token UNIQUE (user_id, token)
            )
        """)

        # Индексы для быстрого поиска
        c.execute("""
            CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id
            ON user_push_tokens(user_id)
        """)

        c.execute("""
            CREATE INDEX IF NOT EXISTS idx_push_tokens_active
            ON user_push_tokens(is_active)
            WHERE is_active = TRUE
        """)

        conn.commit()
        print("✅ Migration completed: user_push_tokens table created")
        return True

    except Exception as e:
        conn.rollback()
        print(f"❌ Migration failed: {e}")
        return False

    finally:
        conn.close()


def rollback_migration():
    """Откатить миграцию"""
    conn = get_db_connection()
    c = conn.cursor()

    try:
        c.execute("DROP TABLE IF EXISTS user_push_tokens CASCADE")
        conn.commit()
        print("✅ Rollback completed: user_push_tokens table dropped")
        return True

    except Exception as e:
        conn.rollback()
        print(f"❌ Rollback failed: {e}")
        return False

    finally:
        conn.close()


if __name__ == "__main__":
    run_migration()
