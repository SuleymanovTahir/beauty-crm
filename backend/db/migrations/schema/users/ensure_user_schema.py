"""
Migration: Ensure User Schema and Tables
This migration ensures that the users table has all necessary columns and that 
related tables (user_services, user_schedule, etc.) exist.
It acts as a safety net for previous migrations.
"""
import sqlite3
from core.config import DATABASE_NAME
from utils.logger import log_info, log_error

def ensure_user_schema():
    """
    Ensure users table has all columns and related tables exist.
    """
    log_info("🔄 Запуск миграции: ensure_user_schema", "migration")
    
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    try:
        # 1. Ensure users table columns
        log_info("   📋 Проверка колонок таблицы users", "migration")
        c.execute("PRAGMA table_info(users)")
        current_columns = [row[1] for row in c.fetchall()]
        
        required_columns = [
            ("photo", "TEXT"),
            ("bio", "TEXT"),
            ("instagram_employee", "TEXT"),
            ("experience", "TEXT"),
            ("specialization", "TEXT"),
            ("years_of_experience", "INTEGER"),
            ("certificates", "TEXT"),
            ("is_service_provider", "INTEGER DEFAULT 0"),
            ("sort_order", "INTEGER DEFAULT 0"),
            ("name_ru", "TEXT"),
            ("name_ar", "TEXT"),
            ("position_ru", "TEXT"),
            ("position_ar", "TEXT"),
        ]
        
        for col_name, col_type in required_columns:
            if col_name not in current_columns:
                try:
                    c.execute(f"ALTER TABLE users ADD COLUMN {col_name} {col_type}")
                    log_info(f"      ➕ Добавлена колонка: {col_name}", "migration")
                except Exception as e:
                    log_error(f"      ❌ Ошибка добавления {col_name}: {e}", "migration")
        
        # 2. Ensure related tables exist
        log_info("   📋 Проверка связанных таблиц", "migration")
        
        tables = [
            ("user_services", """
                CREATE TABLE IF NOT EXISTS user_services (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    service_id INTEGER NOT NULL,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                    FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
                    UNIQUE(user_id, service_id)
                )
            """),
            ("user_schedule", """
                CREATE TABLE IF NOT EXISTS user_schedule (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    day_of_week INTEGER NOT NULL,
                    start_time TEXT,
                    end_time TEXT,
                    is_active INTEGER DEFAULT 1,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                )
            """),
            ("user_salary_settings", """
                CREATE TABLE IF NOT EXISTS user_salary_settings (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    salary_type TEXT DEFAULT 'percentage',
                    base_salary REAL DEFAULT 0,
                    percentage REAL DEFAULT 0,
                    created_at TEXT,
                    updated_at TEXT,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                )
            """),
            ("user_time_off", """
                CREATE TABLE IF NOT EXISTS user_time_off (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    date_from TEXT NOT NULL,
                    date_to TEXT NOT NULL,
                    reason TEXT,
                    type TEXT DEFAULT 'vacation',
                    created_at TEXT,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                )
            """),
            ("user_certificates", """
                CREATE TABLE IF NOT EXISTS user_certificates (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    name TEXT NOT NULL,
                    issued_date TEXT,
                    expiry_date TEXT,
                    file_path TEXT,
                    created_at TEXT,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                )
            """)
        ]
        
        for table_name, create_sql in tables:
            c.execute(f"SELECT name FROM sqlite_master WHERE type='table' AND name='{table_name}'")
            if not c.fetchone():
                c.execute(create_sql)
                log_info(f"      ➕ Создана таблица: {table_name}", "migration")
                
                # Create indexes for user_services if newly created
                if table_name == "user_services":
                    c.execute("CREATE INDEX IF NOT EXISTS idx_user_services_user ON user_services(user_id)")
                    c.execute("CREATE INDEX IF NOT EXISTS idx_user_services_service ON user_services(service_id)")

        conn.commit()
        log_info("✅ Миграция ensure_user_schema завершена", "migration")
        return True
        
    except Exception as e:
        log_error(f"❌ Ошибка миграции: {e}", "migration")
        return False
    finally:
        conn.close()
