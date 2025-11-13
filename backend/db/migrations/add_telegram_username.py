"""
Миграция: добавление поля telegram_username в таблицу users
Для уведомлений мастеров о новых записях
"""
import sqlite3
from core.config import DATABASE_NAME
from utils.logger import log_info, log_error


def add_telegram_username_field():
    """Добавить поле telegram_username в таблицу users"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    try:
        # Проверяем, есть ли уже поле telegram_username
        c.execute("PRAGMA table_info(users)")
        columns = [row[1] for row in c.fetchall()]

        if 'telegram_username' not in columns:
            log_info("Добавление поля telegram_username в users...", "migration")

            # Добавляем поле telegram_username
            c.execute("""
                ALTER TABLE users
                ADD COLUMN telegram_username TEXT
            """)

            conn.commit()
            log_info("✅ Поле telegram_username добавлено в users", "migration")
        else:
            log_info("✅ Поле telegram_username уже существует в users", "migration")

    except Exception as e:
        log_error(f"Ошибка при добавлении telegram_username: {e}", "migration")
        conn.rollback()
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    add_telegram_username_field()
