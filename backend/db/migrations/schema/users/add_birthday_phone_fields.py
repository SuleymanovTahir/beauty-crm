"""
Migration: Add birthday and phone fields to users and employees
"""
import sqlite3
from utils.logger import log_info
from core.config import DATABASE_NAME

def add_birthday_phone_fields():
    """Add birthday and phone fields to users and employees tables"""
    conn = sqlite3.connect(DATABASE_NAME)
    cursor = conn.cursor()

    log_info("🔧 Adding birthday and phone fields...", "migration")

    # Add fields to users table
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN birthday DATE")
        log_info("  ✅ Added birthday field to users", "migration")
    except sqlite3.OperationalError:
        log_info("  ℹ️  birthday field already exists in users", "migration")

    try:
        cursor.execute("ALTER TABLE users ADD COLUMN phone VARCHAR(20)")
        log_info("  ✅ Added phone field to users", "migration")
    except sqlite3.OperationalError:
        log_info("  ℹ️  phone field already exists in users", "migration")

    # Add fields to employees table
    try:
        cursor.execute("ALTER TABLE employees ADD COLUMN birthday DATE")
        log_info("  ✅ Added birthday field to employees", "migration")
    except sqlite3.OperationalError:
        log_info("  ℹ️  birthday field already exists in employees", "migration")

    # Phone field already exists in employees from init.py (line 225), so skip it

    conn.commit()
    conn.close()
    log_info("✅ Birthday and phone fields migration completed", "migration")


if __name__ == "__main__":
    add_birthday_phone_fields()
