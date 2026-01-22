"""
Migration: Add task_assignees table for multiple assignees per task
"""

from db.connection import get_db_connection
from utils.logger import log_info, log_error

def migrate():
    """Create task_assignees table for many-to-many relationship"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        log_info("🔧 Creating task_assignees table...", "migration")
        
        # Create task_assignees junction table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS task_assignees (
                id SERIAL PRIMARY KEY,
                task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(task_id, user_id)
            )
        """)
        
        # Create indexes
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_task_assignees_task 
            ON task_assignees(task_id)
        """)
        
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_task_assignees_user 
            ON task_assignees(user_id)
        """)
        
        # Migrate existing assignee_id data to task_assignees
        log_info("📦 Migrating existing assignees...", "migration")
        cursor.execute("""
            INSERT INTO task_assignees (task_id, user_id)
            SELECT id, assignee_id 
            FROM tasks 
            WHERE assignee_id IS NOT NULL
            ON CONFLICT (task_id, user_id) DO NOTHING
        """)
        
        migrated = cursor.rowcount
        log_info(f"✅ Migrated {migrated} existing assignees", "migration")
        
        conn.commit()
        log_info("✅ task_assignees table created successfully", "migration")
        return True
        
    except Exception as e:
        log_error(f"❌ Error creating task_assignees table: {e}", "migration")
        conn.rollback()
        return False
    finally:
        conn.close()

if __name__ == '__main__':
    migrate()
