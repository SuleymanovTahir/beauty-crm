"""
Миграция: Создание таблицы birthday_notifications
Для отслеживания отправленных уведомлений о днях рождения
"""
import sqlite3
from utils.logger import log_info

def create_birthday_notifications_table():
    """Создать таблицу birthday_notifications"""
    from core.config import DATABASE_NAME

    conn = sqlite3.connect(DATABASE_NAME)
    cursor = conn.cursor()

    log_info("🔧 Создание таблицы birthday_notifications...", "migration")

    # Создаём таблицу для отслеживания отправленных уведомлений о днях рождения
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS birthday_notifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            notification_type TEXT NOT NULL, -- 'week', 'three_days', 'one_day', 'today'
            notification_date TEXT NOT NULL, -- Дата дня рождения в формате YYYY-MM-DD
            is_sent INTEGER DEFAULT 0,       -- Флаг: отправлено ли уведомление
            sent_at TEXT,                    -- Когда отправлено (ISO формат)
            created_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (user_id) REFERENCES users(id),
            UNIQUE(user_id, notification_type, notification_date) -- Избежать дубликатов
        )
    """)

    # Создаём индексы для быстрого поиска
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_birthday_notifications_user
        ON birthday_notifications(user_id)
    """)

    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_birthday_notifications_date
        ON birthday_notifications(notification_date)
    """)

    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_birthday_notifications_sent
        ON birthday_notifications(is_sent)
    """)

    conn.commit()
    conn.close()

    log_info("✅ Таблица birthday_notifications создана", "migration")
