"""
Миграция: Добавление настроек уведомлений для мастеров

Позволяет мастерам выбирать, куда получать уведомления (Telegram, Email, WhatsApp)
"""
import sqlite3
from core.config import DATABASE_NAME
from utils.logger import log_info, log_error


def add_notification_preferences_fields():
    """Добавить поля настроек уведомлений в таблицу users"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    try:
        log_info("🔧 Adding notification preference fields to users...", "migration")

        # Проверяем какие поля уже существуют
        c.execute("PRAGMA table_info(users)")
        columns = [row[1] for row in c.fetchall()]

        fields_to_add = [
            ('notify_telegram', 'INTEGER DEFAULT 1'),
            ('notify_email', 'INTEGER DEFAULT 1'),
            ('notify_whatsapp', 'INTEGER DEFAULT 0'),
            ('notify_on_new_booking', 'INTEGER DEFAULT 1'),
            ('notify_on_booking_change', 'INTEGER DEFAULT 1'),
            ('notify_on_booking_cancel', 'INTEGER DEFAULT 1'),
        ]

        for field_name, field_type in fields_to_add:
            if field_name not in columns:
                c.execute(f"ALTER TABLE users ADD COLUMN {field_name} {field_type}")
                log_info(f"✅ {field_name} field added to users", "migration")
            else:
                log_info(f"⏭️ {field_name} field already exists", "migration")

        conn.commit()

    except Exception as e:
        log_error(f"❌ Error adding notification preference fields: {e}", "migration")
        conn.rollback()
    finally:
        conn.close()


if __name__ == "__main__":
    add_notification_preferences_fields()
