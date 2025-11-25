"""
Миграция: Добавление системы предпочтений клиентов

Позволяет запомнить предпочтения клиента для персонализированного опыта
"""
import sqlite3
from core.config import DATABASE_NAME
from utils.logger import log_info, log_error


def create_client_preferences_tables():
    """Создать таблицы для предпочтений клиентов"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    try:
        log_info("🔧 Creating client preferences tables...", "migration")

        # Таблица предпочтений клиента
        c.execute("""
            CREATE TABLE IF NOT EXISTS client_preferences (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                client_id TEXT UNIQUE NOT NULL,
                preferred_master TEXT,
                preferred_service TEXT,
                preferred_day_of_week INTEGER,  -- 0=Пн, 6=Вс
                preferred_time_of_day TEXT,  -- 'morning', 'afternoon', 'evening'
                allergies TEXT,
                special_notes TEXT,
                auto_book_enabled INTEGER DEFAULT 0,
                auto_book_interval_weeks INTEGER DEFAULT 4,
                created_at TEXT,
                updated_at TEXT,
                FOREIGN KEY (client_id) REFERENCES clients(instagram_id)
            )
        """)
        log_info("✅ client_preferences table created", "migration")

        # Таблица контекста разговоров (для multi-step диалогов)
        c.execute("""
            CREATE TABLE IF NOT EXISTS conversation_context (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                client_id TEXT NOT NULL,
                context_type TEXT NOT NULL,  -- 'booking_in_progress', 'preferences_setup', etc.
                context_data TEXT,  -- JSON с данными
                created_at TEXT,
                expires_at TEXT,
                FOREIGN KEY (client_id) REFERENCES clients(instagram_id)
            )
        """)
        log_info("✅ conversation_context table created", "migration")

        # Таблица истории взаимодействий для ML
        c.execute("""
            CREATE TABLE IF NOT EXISTS client_interaction_patterns (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                client_id TEXT NOT NULL,
                interaction_type TEXT,  -- 'booking_time', 'service_choice', 'response_time'
                pattern_data TEXT,  -- JSON с паттернами
                confidence_score REAL,  -- 0.0 to 1.0
                last_updated TEXT,
                FOREIGN KEY (client_id) REFERENCES clients(instagram_id)
            )
        """)
        log_info("✅ client_interaction_patterns table created", "migration")

        conn.commit()
        log_info("🎉 Client preferences migration completed successfully!", "migration")

    except Exception as e:
        log_error(f"❌ Error creating client preferences tables: {e}", "migration")
        conn.rollback()
    finally:
        conn.close()


if __name__ == "__main__":
    create_client_preferences_tables()
