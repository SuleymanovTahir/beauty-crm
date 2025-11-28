"""
Миграция: создание таблицы broadcast_history для хранения истории рассылок
"""
import sqlite3
from core.config import DATABASE_NAME

def create_broadcast_history_table():
    """Создать таблицу broadcast_history"""

    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    try:
        # Проверяем, существует ли уже таблица
        c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='broadcast_history'")
        if c.fetchone():
            print("⏭️  Таблица broadcast_history уже существует")
        else:
            print("📨 Создание таблицы broadcast_history...")

            c.execute("""
                CREATE TABLE broadcast_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    sender_id INTEGER NOT NULL,
                    subscription_type TEXT NOT NULL,
                    channels TEXT NOT NULL,
                    subject TEXT NOT NULL,
                    message TEXT NOT NULL,
                    target_role TEXT,
                    total_sent INTEGER DEFAULT 0,
                    results TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
                )
            """)

            # Создаем индекс для быстрого поиска
            c.execute("""
                CREATE INDEX idx_broadcast_history_created_at ON broadcast_history(created_at DESC)
            """)

            c.execute("""
                CREATE INDEX idx_broadcast_history_sender ON broadcast_history(sender_id)
            """)

            conn.commit()
            print("✅ Таблица broadcast_history создана")

    except Exception as e:
        print(f"❌ Ошибка миграции: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    create_broadcast_history_table()
