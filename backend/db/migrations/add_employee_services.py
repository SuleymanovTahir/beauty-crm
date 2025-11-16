"""
Migration: Add employee_services table
Purpose: Link employees with services they can perform
"""
import sqlite3
from core.config import DATABASE_NAME
from utils.logger import log_info, log_warning


def migrate():
    """Create employee_services junction table"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    try:
        # Create employee_services table
        c.execute("""
            CREATE TABLE IF NOT EXISTS employee_services (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                employee_id INTEGER NOT NULL,
                service_id INTEGER NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
                FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
                UNIQUE(employee_id, service_id)
            )
        """)

        log_info("✅ Created employee_services table", "migration")

        conn.commit()
        log_info("✅ Migration completed successfully", "migration")

    except Exception as e:
        conn.rollback()
        log_warning(f"❌ Migration failed: {str(e)}", "migration")
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    migrate()
