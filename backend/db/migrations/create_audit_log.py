"""
Миграция: Создание Audit Log
Дата: 2026-01-09
"""
from db.connection import get_db_connection
from utils.logger import log_info, log_error

def run():
    """Создать таблицу audit_log для истории изменений"""
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        log_info("🔧 Начало миграции: Создание Audit Log", "migration")
        
        # 1. Создаем таблицу audit_log
        log_info("📊 Создание таблицы audit_log...", "migration")
        c.execute("""
            CREATE TABLE IF NOT EXISTS audit_log (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id),
                user_role VARCHAR(50),
                username VARCHAR(255),
                action VARCHAR(100) NOT NULL,  -- 'create', 'update', 'delete', 'restore', 'login', 'logout'
                entity_type VARCHAR(50),  -- 'client', 'booking', 'user', 'settings'
                entity_id VARCHAR(255),
                old_value TEXT,  -- JSON
                new_value TEXT,  -- JSON
                ip_address VARCHAR(45),
                user_agent TEXT,
                success BOOLEAN DEFAULT TRUE,
                error_message TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # 2. Создаем индексы для быстрого поиска
        log_info("📊 Создание индексов для audit_log...", "migration")
        
        c.execute("""
            CREATE INDEX IF NOT EXISTS idx_audit_user 
            ON audit_log(user_id)
        """)
        
        c.execute("""
            CREATE INDEX IF NOT EXISTS idx_audit_entity 
            ON audit_log(entity_type, entity_id)
        """)
        
        c.execute("""
            CREATE INDEX IF NOT EXISTS idx_audit_created 
            ON audit_log(created_at DESC)
        """)
        
        c.execute("""
            CREATE INDEX IF NOT EXISTS idx_audit_action 
            ON audit_log(action)
        """)
        
        # 3. Создаем таблицу для критичных действий (требующих уведомлений)
        log_info("🚨 Создание таблицы critical_actions...", "migration")
        c.execute("""
            CREATE TABLE IF NOT EXISTS critical_actions (
                id SERIAL PRIMARY KEY,
                audit_log_id INTEGER REFERENCES audit_log(id),
                notified BOOLEAN DEFAULT FALSE,
                notification_sent_at TIMESTAMP NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        c.execute("""
            CREATE INDEX IF NOT EXISTS idx_critical_notified 
            ON critical_actions(notified, created_at)
        """)
        
        conn.commit()
        log_info("✅ Миграция Audit Log завершена успешно", "migration")
        
    except Exception as e:
        conn.rollback()
        log_error(f"❌ Ошибка миграции Audit Log: {e}", "migration")
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    run()
