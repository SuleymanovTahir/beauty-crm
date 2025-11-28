"""
Миграция: создание таблицы user_subscriptions для управления подписками пользователей
"""
import sqlite3
from core.config import DATABASE_NAME

def add_user_subscriptions():
    """Создать таблицу user_subscriptions для управления подписками на рассылки"""

    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    try:
        # Проверяем, существует ли уже таблица
        c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='user_subscriptions'")
        if c.fetchone():
            print("⏭️  Таблица user_subscriptions уже существует")
        else:
            print("📧 Создание таблицы user_subscriptions...")

            c.execute("""
                CREATE TABLE user_subscriptions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    subscription_type TEXT NOT NULL,
                    is_subscribed INTEGER DEFAULT 1,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                    UNIQUE(user_id, subscription_type)
                )
            """)

            # Создаем индекс для быстрого поиска по user_id
            c.execute("""
                CREATE INDEX idx_user_subscriptions_user_id ON user_subscriptions(user_id)
            """)

            conn.commit()
            print("✅ Таблица user_subscriptions создана")

        # Добавляем поля privacy_accepted и newsletter_subscribed в таблицу users
        c.execute("PRAGMA table_info(users)")
        columns = [col[1] for col in c.fetchall()]

        if 'privacy_accepted' not in columns:
            print("🔒 Добавление поля privacy_accepted в таблицу users...")
            c.execute("ALTER TABLE users ADD COLUMN privacy_accepted INTEGER DEFAULT 0")
            conn.commit()
            print("✅ Поле privacy_accepted добавлено")
        else:
            print("⏭️  Поле privacy_accepted уже существует")

        if 'privacy_accepted_at' not in columns:
            print("📅 Добавление поля privacy_accepted_at в таблицу users...")
            c.execute("ALTER TABLE users ADD COLUMN privacy_accepted_at TIMESTAMP")
            conn.commit()
            print("✅ Поле privacy_accepted_at добавлено")
        else:
            print("⏭️  Поле privacy_accepted_at уже существует")

    except Exception as e:
        print(f"❌ Ошибка миграции: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    add_user_subscriptions()
