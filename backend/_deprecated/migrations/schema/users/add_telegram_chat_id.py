"""
Миграция: Добавление поля telegram_chat_id в таблицу users

Поле позволяет хранить Telegram chat ID для отправки уведомлений мастерам
"""
import sqlite3
from core.config import DATABASE_NAME
from utils.logger import log_info, log_error


def add_telegram_chat_id_field():
    """Добавить поле telegram_chat_id в таблицу users"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    try:
        log_info("🔧 Adding telegram_chat_id field to users...", "migration")

        # Проверяем есть ли уже поле
        c.execute("PRAGMA table_info(users)")
        columns = [row[1] for row in c.fetchall()]

        if 'telegram_chat_id' not in columns:
            c.execute("ALTER TABLE users ADD COLUMN telegram_chat_id TEXT")
            log_info("✅ telegram_chat_id field added to users", "migration")
        else:
            log_info("⏭️ telegram_chat_id field already exists", "migration")

        conn.commit()

    except Exception as e:
        log_error(f"❌ Error adding telegram_chat_id field: {e}", "migration")
        conn.rollback()
    finally:
        conn.close()


if __name__ == "__main__":
    add_telegram_chat_id_field()
