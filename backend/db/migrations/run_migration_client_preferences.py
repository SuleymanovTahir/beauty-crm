#!/usr/bin/env python3
"""
Миграция: Добавление системы предпочтений клиентов
"""
from db.connection import get_db_connection
import os
import sys
from datetime import datetime

# Получаем DATABASE_NAME из конфига (если запускается напрямую)
# или используем переданный из run_all_migrations.py
if 'DATABASE_NAME' not in globals():
    # Добавляем backend в путь для импорта
    backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
    if backend_dir not in sys.path:
        sys.path.insert(0, backend_dir)
    from core.config import DATABASE_NAME

conn = get_db_connection()
c = conn.cursor()

try:
    print("🔧 Creating client preferences tables...")

    # Таблица предпочтений клиента
    c.execute("""
        CREATE TABLE IF NOT EXISTS client_preferences (
            id SERIAL PRIMARY KEY,
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
    print("✅ client_preferences table created")

    # Таблица контекста разговоров
    c.execute("""
        CREATE TABLE IF NOT EXISTS conversation_context (
            id SERIAL PRIMARY KEY,
            client_id TEXT NOT NULL,
            context_type TEXT NOT NULL,
            context_data TEXT,
            created_at TEXT,
            expires_at TEXT,
            FOREIGN KEY (client_id) REFERENCES clients(instagram_id)
        )
    """)
    print("✅ conversation_context table created")

    # Таблица паттернов взаимодействий
    c.execute("""
        CREATE TABLE IF NOT EXISTS client_interaction_patterns (
            id SERIAL PRIMARY KEY,
            client_id TEXT NOT NULL,
            interaction_type TEXT,
            pattern_data TEXT,
            confidence_score REAL,
            last_updated TEXT,
            FOREIGN KEY (client_id) REFERENCES clients(instagram_id)
        )
    """)
    print("✅ client_interaction_patterns table created")

    conn.commit()
    print("\n🎉 Client preferences migration completed successfully!")

except Exception as e:
    print(f"❌ Error: {e}")
    conn.rollback()
    conn.close()
    raise  # Пробрасываем исключение дальше для корректной обработки в run_all_migrations
finally:
    conn.close()
