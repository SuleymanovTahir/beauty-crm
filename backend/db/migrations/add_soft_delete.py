"""
Миграция: Добавление Soft Delete
Дата: 2026-01-09
"""
from db.connection import get_db_connection
from utils.logger import log_info, log_error

def run():
    """Добавить поддержку Soft Delete для критичных таблиц"""
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        log_info("🔧 Начало миграции: Добавление Soft Delete", "migration")
        
        # 1. Добавляем deleted_at к bookings
        log_info("📋 Добавление deleted_at к bookings...", "migration")
        c.execute("""
            ALTER TABLE bookings 
            ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL
        """)
        
        # 2. Добавляем deleted_at к clients
        log_info("👥 Добавление deleted_at к clients...", "migration")
        c.execute("""
            ALTER TABLE clients 
            ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL
        """)
        
        # 3. Добавляем deleted_at к users
        log_info("👤 Добавление deleted_at к users...", "migration")
        c.execute("""
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL
        """)
        
        # 4. Создаем индексы для быстрого поиска
        log_info("📊 Создание индексов...", "migration")
        c.execute("""
            CREATE INDEX IF NOT EXISTS idx_bookings_deleted 
            ON bookings(deleted_at) WHERE deleted_at IS NULL
        """)
        
        c.execute("""
            CREATE INDEX IF NOT EXISTS idx_clients_deleted 
            ON clients(deleted_at) WHERE deleted_at IS NULL
        """)
        
        c.execute("""
            CREATE INDEX IF NOT EXISTS idx_users_deleted 
            ON users(deleted_at) WHERE deleted_at IS NULL
        """)
        
        # 5. Создаем таблицу для хранения удаленных данных (корзина)
        log_info("🗑️ Создание таблицы deleted_items...", "migration")
        c.execute("""
            CREATE TABLE IF NOT EXISTS deleted_items (
                id SERIAL PRIMARY KEY,
                entity_type VARCHAR(50) NOT NULL,  -- 'booking', 'client', 'user'
                entity_id VARCHAR(255) NOT NULL,
                deleted_by INTEGER REFERENCES users(id),
                deleted_by_role VARCHAR(50),
                reason TEXT,
                can_restore BOOLEAN DEFAULT TRUE,
                restored_at TIMESTAMP NULL,
                restored_by INTEGER REFERENCES users(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        c.execute("""
            CREATE INDEX IF NOT EXISTS idx_deleted_items_entity 
            ON deleted_items(entity_type, entity_id)
        """)
        
        c.execute("""
            CREATE INDEX IF NOT EXISTS idx_deleted_items_created 
            ON deleted_items(created_at)
        """)
        
        conn.commit()
        log_info("✅ Миграция Soft Delete завершена успешно", "migration")
        
    except Exception as e:
        conn.rollback()
        log_error(f"❌ Ошибка миграции Soft Delete: {e}", "migration")
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    run()
