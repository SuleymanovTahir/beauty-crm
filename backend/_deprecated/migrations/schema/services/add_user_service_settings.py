"""
Migration: Add User Service Settings
Adds columns to user_services table for per-user service configuration:
- price (REAL)
- duration (INTEGER, minutes)
- is_online_booking_enabled (INTEGER)
- is_calendar_enabled (INTEGER)
"""
import sqlite3
from core.config import DATABASE_NAME
from utils.logger import log_info, log_error

def add_user_service_settings():
    """
    Add configuration columns to user_services table.
    """
    log_info("🔄 Запуск миграции: add_user_service_settings", "migration")
    
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    try:
        c.execute("PRAGMA table_info(user_services)")
        current_columns = [row[1] for row in c.fetchall()]
        
        new_columns = [
            ("price", "REAL"),
            ("duration", "INTEGER"), # in minutes
            ("is_online_booking_enabled", "INTEGER DEFAULT 1"),
            ("is_calendar_enabled", "INTEGER DEFAULT 1"),
            ("price_min", "REAL"), # For ranges like 700-1200
            ("price_max", "REAL")
        ]
        
        for col_name, col_type in new_columns:
            if col_name not in current_columns:
                try:
                    c.execute(f"ALTER TABLE user_services ADD COLUMN {col_name} {col_type}")
                    log_info(f"      ➕ Добавлена колонка: {col_name}", "migration")
                except Exception as e:
                    log_error(f"      ❌ Ошибка добавления {col_name}: {e}", "migration")
        
        conn.commit()
        log_info("✅ Миграция add_user_service_settings завершена", "migration")
        return True
        
    except Exception as e:
        log_error(f"❌ Ошибка миграции: {e}", "migration")
        return False
    finally:
        conn.close()
