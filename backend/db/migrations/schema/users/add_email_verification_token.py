"""
Миграция: Добавление поля email_verification_token в таблицу users
"""
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../..')))

import sqlite3
from core.config import DATABASE_NAME
from utils.logger import log_info, log_warning

def add_email_verification_token():
    """Добавить поле email_verification_token в таблицу users"""
    try:
        conn = sqlite3.connect(DATABASE_NAME)
        c = conn.cursor()

        # Проверяем есть ли уже это поле
        c.execute("PRAGMA table_info(users)")
        columns = [column[1] for column in c.fetchall()]

        # Добавляем email_verification_token если его нет
        if 'email_verification_token' not in columns:
            log_info("Adding email_verification_token field to users table", "migration")
            c.execute("ALTER TABLE users ADD COLUMN email_verification_token TEXT")
            conn.commit()
            log_info("✅ Added email_verification_token field to users table", "migration")
        else:
            log_info("✓ email_verification_token field already exists in users table", "migration")

        conn.close()

    except Exception as e:
        log_warning(f"⚠️ Error adding email_verification_token field: {e}", "migration")

if __name__ == "__main__":
    add_email_verification_token()
