"""
Миграция: Добавление полей для восстановления пароля в таблицу users
"""
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../..')))

import sqlite3
from core.config import DATABASE_NAME
from utils.logger import log_info, log_warning

def add_password_reset_fields():
    """Добавить поля password_reset_token и password_reset_expires в таблицу users"""
    try:
        conn = sqlite3.connect(DATABASE_NAME)
        c = conn.cursor()

        # Проверяем есть ли уже эти поля
        c.execute("PRAGMA table_info(users)")
        columns = [column[1] for column in c.fetchall()]

        fields_added = []

        # Добавляем password_reset_token если его нет
        if 'password_reset_token' not in columns:
            log_info("Adding password_reset_token field to users table", "migration")
            c.execute("ALTER TABLE users ADD COLUMN password_reset_token TEXT")
            fields_added.append('password_reset_token')

        # Добавляем password_reset_expires если его нет
        if 'password_reset_expires' not in columns:
            log_info("Adding password_reset_expires field to users table", "migration")
            c.execute("ALTER TABLE users ADD COLUMN password_reset_expires TEXT")
            fields_added.append('password_reset_expires')

        conn.commit()
        conn.close()

        if fields_added:
            log_info(f"✅ Added fields to users table: {', '.join(fields_added)}", "migration")
        else:
            log_info("✓ Password reset fields already exist in users table", "migration")

    except Exception as e:
        log_warning(f"⚠️ Error adding password reset fields: {e}", "migration")

if __name__ == "__main__":
    add_password_reset_fields()
