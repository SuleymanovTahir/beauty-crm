
import os
from db.connection import get_db_connection
from utils.logger import log_info, log_error

def migration_005_task_stages():
    """
    Migration 005: Create tables for Task Stages and update Tasks table
    """
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        # 1. Create task_stages table
        c.execute("SELECT to_regclass('public.task_stages')")
        if not c.fetchone()[0]:
            log_info("Creating task_stages table...", "migrations")
            c.execute("""
                CREATE TABLE task_stages (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    key VARCHAR(50),
                    order_index INTEGER DEFAULT 0,
                    color VARCHAR(50),
                    is_active BOOLEAN DEFAULT TRUE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """)
            
            # Seed default stages
            default_stages = [
                ('К выполнению', 'todo', 0, 'bg-gray-500'),
                ('В работе', 'in_progress', 1, 'bg-blue-500'),
                ('Готово', 'done', 2, 'bg-green-500')
            ]
            c.executemany("""
                INSERT INTO task_stages (name, key, order_index, color) 
                VALUES (%s, %s, %s, %s)
            """, default_stages)

        # 2. Add stage_id to tasks
        c.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='tasks' AND column_name='stage_id'
        """)
        if not c.fetchone():
            log_info("Adding stage_id to tasks...", "migrations")
            c.execute("""
                ALTER TABLE tasks 
                ADD COLUMN stage_id INTEGER REFERENCES task_stages(id);
            """)
            
            # Backfill stage_id based on status
            log_info("Backfilling stage_id...", "migrations")
            c.execute("""
                UPDATE tasks t
                SET stage_id = s.id
                FROM task_stages s
                WHERE t.status = s.key;
            """)
            
            # Set default for new rows or missed ones (map unknown to 'todo')
            c.execute("""
                UPDATE tasks 
                SET stage_id = (SELECT id FROM task_stages WHERE key = 'todo') 
                WHERE stage_id IS NULL;
            """)

        conn.commit()
        log_info("✅ Migration 005 completed successfully", "migrations")
        return True
        
    except Exception as e:
        conn.rollback()
        log_error(f"❌ Migration 005 failed: {e}", "migrations")
        return False
    finally:
        conn.close()

if __name__ == "__main__":
    migration_005_task_stages()
