"""
Миграция: Добавление таблицы для множественных заметок
"""
import sqlite3
from config import DATABASE_NAME
from logger import log_info, log_error

def migrate():
    """Выполнить миграцию"""
    try:
        conn = sqlite3.connect(DATABASE_NAME)
        c = conn.cursor()
        
        log_info("=" * 60, "migration")
        log_info("🚀 Создание таблицы client_notes", "migration")
        log_info("=" * 60, "migration")
        
        # Создать таблицу для множественных заметок
        c.execute("""
            CREATE TABLE IF NOT EXISTS client_notes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                client_id TEXT NOT NULL,
                note_text TEXT NOT NULL,
                created_by INTEGER,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (client_id) REFERENCES clients(instagram_id) ON DELETE CASCADE,
                FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
            )
        """)
        
        conn.commit()
        log_info("✅ Таблица client_notes создана", "migration")
        
        # Проверяем структуру таблицы
        c.execute("PRAGMA table_info(client_notes)")
        columns = [col[1] for col in c.fetchall()]
        log_info(f"📋 Колонки: {', '.join(columns)}", "migration")
        
        # Создать индекс для быстрого поиска
        c.execute("""
            CREATE INDEX IF NOT EXISTS idx_client_notes_client_id 
            ON client_notes(client_id)
        """)
        conn.commit()
        log_info("✅ Индекс создан", "migration")
        
        conn.close()
        
        log_info("=" * 60, "migration")
        log_info("✅ Миграция завершена успешно!", "migration")
        log_info("=" * 60, "migration")
        
        return True
        
    except Exception as e:
        log_error(f"❌ Критическая ошибка миграции: {e}", "migration")
        import traceback
        log_error(traceback.format_exc(), "migration")
        return False

if __name__ == "__main__":
    migrate()