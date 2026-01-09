"""
🔧 Миграция: Контрольные Точки в Воронке
Добавляет систему контрольных точек для отслеживания прогресса клиентов
"""
from db.connection import get_db_connection
from utils.logger import log_info, log_warning

def migrate():
    """Создать таблицу funnel_checkpoints"""
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        # Таблица контрольных точек воронки
        c.execute('''CREATE TABLE IF NOT EXISTS funnel_checkpoints (
            id SERIAL PRIMARY KEY,
            stage_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            name_ru TEXT,
            name_en TEXT,
            name_ar TEXT,
            description TEXT,
            sort_order INTEGER DEFAULT 0,
            is_required BOOLEAN DEFAULT FALSE,
            auto_complete_conditions JSONB,
            notification_settings JSONB,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (stage_id) REFERENCES funnel_stages(id) ON DELETE CASCADE
        )''')
        
        # Таблица прогресса клиентов по контрольным точкам
        c.execute('''CREATE TABLE IF NOT EXISTS client_checkpoint_progress (
            id SERIAL PRIMARY KEY,
            client_id TEXT NOT NULL,
            checkpoint_id INTEGER NOT NULL,
            status TEXT DEFAULT 'pending',
            completed_at TIMESTAMP,
            completed_by INTEGER,
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (client_id) REFERENCES clients(instagram_id) ON DELETE CASCADE,
            FOREIGN KEY (checkpoint_id) REFERENCES funnel_checkpoints(id) ON DELETE CASCADE,
            FOREIGN KEY (completed_by) REFERENCES users(id),
            UNIQUE(client_id, checkpoint_id)
        )''')
        
        # Индексы
        c.execute('CREATE INDEX IF NOT EXISTS idx_funnel_checkpoints_stage ON funnel_checkpoints(stage_id)')
        c.execute('CREATE INDEX IF NOT EXISTS idx_checkpoint_progress_client ON client_checkpoint_progress(client_id)')
        c.execute('CREATE INDEX IF NOT EXISTS idx_checkpoint_progress_checkpoint ON client_checkpoint_progress(checkpoint_id)')
        c.execute('CREATE INDEX IF NOT EXISTS idx_checkpoint_progress_status ON client_checkpoint_progress(status)')
        
        conn.commit()
        log_info("✅ Таблица funnel_checkpoints создана успешно", "migration")
        
    except Exception as e:
        conn.rollback()
        log_warning(f"❌ Ошибка при создании таблицы funnel_checkpoints: {e}", "migration")
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
