"""
Миграция для таблицы галереи (портфолио и фото салона)
"""
import sqlite3
from core.config import DATABASE_NAME
from utils.logger import log_info, log_error


def migrate_gallery_schema():
    """Создать/обновить таблицу gallery_images"""
    log_info("🔧 Миграция схемы gallery_images...", "migration")
    
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    try:
        # Проверяем существование таблицы
        c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='gallery_images'")
        table_exists = c.fetchone() is not None
        
        if not table_exists:
            log_info("📦 Создание таблицы gallery_images...", "migration")
            c.execute("""
                CREATE TABLE gallery_images (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    category TEXT NOT NULL,  -- 'portfolio' или 'salon'
                    image_path TEXT NOT NULL,
                    title TEXT,
                    description TEXT,
                    sort_order INTEGER DEFAULT 0,
                    is_visible INTEGER DEFAULT 1,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Индексы для быстрого поиска
            c.execute("CREATE INDEX idx_gallery_category ON gallery_images(category)")
            c.execute("CREATE INDEX idx_gallery_visible ON gallery_images(is_visible)")
            c.execute("CREATE INDEX idx_gallery_sort ON gallery_images(sort_order)")
            
            log_info("✅ Таблица gallery_images создана", "migration")
        else:
            log_info("✅ Таблица gallery_images уже существует", "migration")
            
            # Проверяем наличие всех колонок
            c.execute("PRAGMA table_info(gallery_images)")
            existing_columns = {row[1] for row in c.fetchall()}
            
            required_columns = {
                'id', 'category', 'image_path', 'title', 'description',
                'sort_order', 'is_visible', 'created_at', 'updated_at'
            }
            
            missing_columns = required_columns - existing_columns
            
            if missing_columns:
                log_info(f"➕ Добавление недостающих колонок: {missing_columns}", "migration")
                
                if 'title' in missing_columns:
                    c.execute("ALTER TABLE gallery_images ADD COLUMN title TEXT")
                if 'description' in missing_columns:
                    c.execute("ALTER TABLE gallery_images ADD COLUMN description TEXT")
                if 'sort_order' in missing_columns:
                    c.execute("ALTER TABLE gallery_images ADD COLUMN sort_order INTEGER DEFAULT 0")
                if 'is_visible' in missing_columns:
                    c.execute("ALTER TABLE gallery_images ADD COLUMN is_visible INTEGER DEFAULT 1")
                if 'created_at' in missing_columns:
                    c.execute("ALTER TABLE gallery_images ADD COLUMN created_at TEXT DEFAULT CURRENT_TIMESTAMP")
                if 'updated_at' in missing_columns:
                    c.execute("ALTER TABLE gallery_images ADD COLUMN updated_at TEXT DEFAULT CURRENT_TIMESTAMP")
                
                log_info("✅ Колонки добавлены", "migration")
        
        conn.commit()
        log_info("✅ Миграция gallery_images завершена", "migration")
        
    except Exception as e:
        conn.rollback()
        log_error(f"❌ Ошибка миграции gallery_images: {e}", "migration")
        raise
    finally:
        conn.close()


def add_show_on_public_page_to_users():
    """Добавить поле show_on_public_page в таблицу users"""
    log_info("🔧 Добавление поля show_on_public_page в users...", "migration")
    
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    try:
        # Проверяем наличие колонки
        c.execute("PRAGMA table_info(users)")
        existing_columns = {row[1] for row in c.fetchall()}
        
        if 'show_on_public_page' not in existing_columns:
            c.execute("ALTER TABLE users ADD COLUMN show_on_public_page INTEGER DEFAULT 1")
            log_info("✅ Колонка show_on_public_page добавлена", "migration")
        else:
            log_info("✅ Колонка show_on_public_page уже существует", "migration")
        
        if 'public_page_order' not in existing_columns:
            c.execute("ALTER TABLE users ADD COLUMN public_page_order INTEGER DEFAULT 0")
            log_info("✅ Колонка public_page_order добавлена", "migration")
        else:
            log_info("✅ Колонка public_page_order уже существует", "migration")
        
        conn.commit()
        log_info("✅ Миграция users завершена", "migration")
        
    except Exception as e:
        conn.rollback()
        log_error(f"❌ Ошибка миграции users: {e}", "migration")
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    migrate_gallery_schema()
    add_show_on_public_page_to_users()
