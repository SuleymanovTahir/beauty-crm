"""
Migration: Create plans table for tracking goals and targets
"""
import sqlite3
from core.config import DATABASE_NAME
from utils.logger import log_info, log_error


def create_plans_table():
    """Create plans table for goal tracking"""
    try:
        conn = sqlite3.connect(DATABASE_NAME)
        c = conn.cursor()
        
        # Create plans table
        c.execute("""
            CREATE TABLE IF NOT EXISTS plans (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                metric_type TEXT NOT NULL,
                target_value REAL NOT NULL,
                period_type TEXT NOT NULL,
                start_date TEXT NOT NULL,
                end_date TEXT NOT NULL,
                created_by INTEGER,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                is_active INTEGER DEFAULT 1,
                FOREIGN KEY (created_by) REFERENCES users(id)
            )
        """)
        
        # Create index for faster lookups
        c.execute("""
            CREATE INDEX IF NOT EXISTS idx_plans_metric_active 
            ON plans(metric_type, is_active, start_date, end_date)
        """)
        
        conn.commit()
        conn.close()
        
        log_info("✅ Plans table created successfully", "migration")
        return {"success": True}
        
    except Exception as e:
        log_error(f"❌ Error creating plans table: {e}", "migration")
        return {"success": False, "error": str(e)}


if __name__ == "__main__":
    create_plans_table()
