
import os
from db.connection import get_db_connection
from utils.logger import log_info, log_error

def migration_004_tasks_and_pipelines():
    """
    Migration 004: Create tables for Tasks and Pipeline Stages
    """
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        # 1. Pipeline Stages
        # Check if table exists
        c.execute("SELECT to_regclass('public.pipeline_stages')")
        if not c.fetchone()[0]:
            log_info("Creating pipeline_stages table...", "migrations")
            c.execute("""
                CREATE TABLE pipeline_stages (
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
                ('Неразобранное', 'new', 0, '#94a3b8'),
                ('Первичный контакт', 'contacted', 1, '#3b82f6'),
                ('Переговоры', 'negotiation', 2, '#eab308'),
                ('Принимают решение', 'decision', 3, '#f97316'),
                ('Успешно реализовано', 'won', 4, '#22c55e'),
                ('Закрыто и не реализовано', 'lost', 5, '#ef4444')
            ]
            c.executemany("""
                INSERT INTO pipeline_stages (name, key, order_index, color) 
                VALUES (%s, %s, %s, %s)
            """, default_stages)
        
        # 2. Tasks
        c.execute("SELECT to_regclass('public.tasks')")
        if not c.fetchone()[0]:
            log_info("Creating tasks table...", "migrations")
            c.execute("""
                CREATE TABLE tasks (
                    id SERIAL PRIMARY KEY,
                    title VARCHAR(255) NOT NULL,
                    description TEXT,
                    status VARCHAR(50) DEFAULT 'todo',
                    priority VARCHAR(50) DEFAULT 'medium',
                    due_date TIMESTAMP,
                    assignee_id INTEGER REFERENCES users(id),
                    created_by INTEGER REFERENCES users(id),
                    client_id VARCHAR(255), -- Link to instagram_id
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    start_date TIMESTAMP
                );
            """)
            
        # 3. Add pipeline_stage_id to clients if not exists
        c.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='clients' AND column_name='pipeline_stage_id'
        """)
        if not c.fetchone():
            log_info("Adding pipeline_stage_id to clients...", "migrations")
            c.execute("""
                ALTER TABLE clients 
                ADD COLUMN pipeline_stage_id INTEGER REFERENCES pipeline_stages(id);
            """)

        conn.commit()
        log_info("✅ Migration 004 completed successfully", "migrations")
        return True
        
    except Exception as e:
        conn.rollback()
        log_error(f"❌ Migration 004 failed: {e}", "migrations")
        return False
    finally:
        conn.close()

if __name__ == "__main__":
    migration_004_tasks_and_pipelines()
