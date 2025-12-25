"""
Миграция для таблицы галереи (портфолио и фото салона)
"""
from db.connection import get_db_connection
from db.connection import get_db_connection
from pathlib import Path
from core.config import DATABASE_NAME
from utils.logger import log_info, log_error

def migrate_gallery_schema(db_path=DATABASE_NAME):
    """Создать/обновить таблицу gallery_images"""
    log_info("🔧 Миграция схемы gallery_images...", "migration")
    
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        # Проверяем существование таблицы
        c.execute("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name='gallery_images'")
        table_exists = c.fetchone() is not None
        
        if not table_exists:
            log_info("📦 Создание таблицы gallery_images...", "migration")
            c.execute("""
                CREATE TABLE gallery_images (
                    id SERIAL PRIMARY KEY,
                    category TEXT NOT NULL,  -- 'portfolio' или 'salon'
                    image_path TEXT NOT NULL,
                    title TEXT,
                    description TEXT,
                    sort_order INTEGER DEFAULT 0,
                    is_visible BOOLEAN DEFAULT TRUE,
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
            c.execute("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name='gallery_images'
            """)
            existing_columns = {row[0] for row in c.fetchall()}
            
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
                    c.execute("ALTER TABLE gallery_images ADD COLUMN is_visible BOOLEAN DEFAULT TRUE")
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
    
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        # Проверяем наличие колонки
        c.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='users'
        """)
        existing_columns = {row[0] for row in c.fetchall()}
        
        if 'show_on_public_page' not in existing_columns:
            c.execute("ALTER TABLE users ADD COLUMN show_on_public_page BOOLEAN DEFAULT TRUE")
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

def import_gallery_images(db_path=DATABASE_NAME):
    """Импортировать изображения из папок в базу данных"""
    log_info("📸 Импорт изображений галереи...", "migration")
    
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        # Проверяем, есть ли уже изображения
        c.execute("SELECT COUNT(*) FROM gallery_images")
        existing_count = c.fetchone()[0]
        
        if existing_count > 0:
            log_info(f"✅ В базе уже есть {existing_count} изображений, пропускаем импорт", "migration")
            return
        
        log_info("📦 Импортируем изображения из папок...", "migration")
        
        # Импортируем portfolio
        portfolio_dir = Path('static/uploads/images/portfolio')
        if portfolio_dir.exists():
            portfolio_images = sorted(portfolio_dir.glob('*.webp'))
            for idx, img_file in enumerate(portfolio_images, 1):
                image_path = f'/static/uploads/images/portfolio/{img_file.name}'
                title = img_file.stem
                c.execute('''
                    INSERT INTO gallery_images (category, image_path, title, sort_order, is_visible)
                    VALUES (%s, %s, %s, %s, TRUE)
                ''', ('portfolio', image_path, title, idx))
            log_info(f"✅ Импортировано {len(portfolio_images)} portfolio изображений", "migration")
        
        # Импортируем salon
        salon_dir = Path('static/uploads/images/salon')
        if salon_dir.exists():
            salon_images = sorted(salon_dir.glob('*.webp'))
            for idx, img_file in enumerate(salon_images, 1):
                image_path = f'/static/uploads/images/salon/{img_file.name}'
                title = img_file.stem
                c.execute('''
                    INSERT INTO gallery_images (category, image_path, title, sort_order, is_visible)
                    VALUES (%s, %s, %s, %s, TRUE)
                ''', ('salon', image_path, title, idx))
            log_info(f"✅ Импортировано {len(salon_images)} salon изображений", "migration")
        
        # Импортируем services
        services_dir = Path('static/uploads/images/services')
        if services_dir.exists():
            services_images = sorted(services_dir.glob('*.webp'))
            for idx, img_file in enumerate(services_images, 1):
                image_path = f'/static/uploads/images/services/{img_file.name}'
                title = img_file.stem
                c.execute('''
                    INSERT INTO gallery_images (category, image_path, title, sort_order, is_visible)
                    VALUES (%s, %s, %s, %s, TRUE)
                ''', ('services', image_path, title, idx))
            log_info(f"✅ Импортировано {len(services_images)} services изображений", "migration")
        
        conn.commit()
        
        # Показываем итоги
        c.execute('SELECT category, COUNT(*) FROM gallery_images GROUP BY category')
        log_info("📊 Итого импортировано:", "migration")
        for row in c.fetchall():
            log_info(f"  {row[0]}: {row[0]} изображений", "migration")
        
    except Exception as e:
        conn.rollback()
        log_error(f"❌ Ошибка импорта изображений: {e}", "migration")
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    migrate_gallery_schema()
    add_show_on_public_page_to_users()
    import_gallery_images()
