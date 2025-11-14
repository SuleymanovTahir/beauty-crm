"""
Migration: Add birthday and phone fields to users and employees
"""
import sqlite3
from utils.logger import log_info

def add_birthday_phone_fields(conn: sqlite3.Connection):
    """Add birthday and phone fields to users and employees tables"""
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

    try:
        cursor.execute("ALTER TABLE employees ADD COLUMN phone VARCHAR(20)")
        log_info("  ✅ Added phone field to employees", "migration")
    except sqlite3.OperationalError:
        log_info("  ℹ️  phone field already exists in employees", "migration")

    conn.commit()
    log_info("✅ Birthday and phone fields migration completed", "migration")
