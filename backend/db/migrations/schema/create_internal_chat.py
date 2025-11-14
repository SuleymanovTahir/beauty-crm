"""
Миграция: Создание таблицы internal_chat
Внутренний чат между админом и сотрудниками с email уведомлениями
"""
import sqlite3
from utils.logger import log_info

def create_internal_chat_table():
    """Создать таблицу internal_chat для внутренних сообщений"""
    from core.config import DATABASE_NAME

    conn = sqlite3.connect(DATABASE_NAME)
    cursor = conn.cursor()

    log_info("💬 Создание таблицы internal_chat...", "migration")

    # Создаём таблицу для внутренних сообщений
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS internal_chat (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            from_user_id INTEGER NOT NULL,       -- ID отправителя
            to_user_id INTEGER NOT NULL,         -- ID получателя
            message TEXT NOT NULL,               -- Текст сообщения
            is_read INTEGER DEFAULT 0,           -- Прочитано ли сообщение
            read_at TEXT,                        -- Когда прочитано
            email_sent INTEGER DEFAULT 0,        -- Отправлен ли email
            email_sent_at TEXT,                  -- Когда отправлен email
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now')),
            FOREIGN KEY (from_user_id) REFERENCES users(id),
            FOREIGN KEY (to_user_id) REFERENCES users(id)
        )
    """)

    # Создаём индексы для быстрого поиска
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_internal_chat_from_user
        ON internal_chat(from_user_id)
    """)

    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_internal_chat_to_user
        ON internal_chat(to_user_id)
    """)

    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_internal_chat_is_read
        ON internal_chat(is_read)
    """)

    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_internal_chat_created
        ON internal_chat(created_at DESC)
    """)

    # Составной индекс для эффективного поиска диалогов между двумя пользователями
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_internal_chat_conversation
        ON internal_chat(from_user_id, to_user_id, created_at DESC)
    """)

    conn.commit()
    conn.close()

    log_info("✅ Таблица internal_chat создана", "migration")
