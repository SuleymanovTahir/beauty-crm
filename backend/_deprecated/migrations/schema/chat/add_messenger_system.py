"""
Миграция: Добавление системы мессенджеров

Создает таблицы для управления мессенджерами и историей сообщений
"""
import sqlite3
from core.config import DATABASE_NAME


def add_messenger_system():
    """Добавить таблицы для системы мессенджеров"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    # Таблица настроек мессенджеров
    c.execute("""
        CREATE TABLE IF NOT EXISTS messenger_settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            messenger_type TEXT NOT NULL UNIQUE,
            is_enabled INTEGER DEFAULT 0,
            display_name TEXT NOT NULL,
            api_token TEXT,
            webhook_url TEXT,
            config_json TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Таблица истории сообщений по мессенджерам
    c.execute("""
        CREATE TABLE IF NOT EXISTS messenger_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            messenger_type TEXT NOT NULL,
            client_id TEXT NOT NULL,
            external_message_id TEXT,
            sender_type TEXT NOT NULL,
            message_text TEXT,
            attachments_json TEXT,
            is_read INTEGER DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (client_id) REFERENCES clients(instagram_id)
        )
    """)

    # Индексы для быстрого поиска
    c.execute("""
        CREATE INDEX IF NOT EXISTS idx_messenger_messages_client
        ON messenger_messages(client_id, messenger_type, created_at DESC)
    """)

    c.execute("""
        CREATE INDEX IF NOT EXISTS idx_messenger_messages_unread
        ON messenger_messages(messenger_type, is_read, created_at DESC)
    """)

    # Вставляем настройки по умолчанию для всех мессенджеров
    messengers = [
        ('instagram', 'Instagram', 1),  # Instagram включен по умолчанию
        ('whatsapp', 'WhatsApp', 0),
        ('telegram', 'Telegram', 0),
        ('tiktok', 'TikTok', 0)
    ]

    for messenger_type, display_name, is_enabled in messengers:
        c.execute("""
            INSERT OR IGNORE INTO messenger_settings (messenger_type, display_name, is_enabled)
            VALUES (?, ?, ?)
        """, (messenger_type, display_name, is_enabled))

    conn.commit()
    conn.close()

    print("✅ Таблицы messenger_settings и messenger_messages созданы")
    print("✅ Настройки мессенджеров по умолчанию добавлены")


if __name__ == '__main__':
    add_messenger_system()
