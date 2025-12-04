"""
Улучшенный импорт фото из папок в галерею
"""
from db.connection import get_db_connection
import shutil
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent))

def import_gallery_photos():
    """Импортировать фото из папок портфолио, услуг и салона"""
    print("📸 Импорт фото галереи...")
    
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        # Get project root (backend/db/migrations/data/gallery -> 5 levels up to project root)
        # File is at: backend/db/migrations/data/gallery/import_gallery_photos.py
        # We need to go up: gallery(1) -> data(2) -> migrations(3) -> db(4) -> backend(5) -> project_root
        current_file = Path(__file__).resolve()
        project_root = current_file.parent.parent.parent.parent.parent.parent
        
        # Verify project root by checking if 'frontend' exists
        if not (project_root / "frontend").exists():
             # Fallback: try to find based on CWD if script is run from root
             cwd = Path.cwd()
             if (cwd / "frontend").exists():
                 project_root = cwd
             else:
                 # Hardcode for this environment if all else fails
                 project_root = Path("/Users/tahir/Desktop/beauty-crm")
        
        print(f"📂 Project root: {project_root}")
        
        # Создаем папки назначения если их нет
        (project_root / "backend/static/uploads/portfolio").mkdir(parents=True, exist_ok=True)
        (project_root / "backend/static/uploads/salon").mkdir(parents=True, exist_ok=True)
        (project_root / "backend/static/uploads/services").mkdir(parents=True, exist_ok=True)
        
        imported_count = 0
        
        # Источники фото
        sources = [
            {
                'source': project_root / "frontend/public_landing/styles/M le Diamant  портфолио/Портфолио",
                'dest': project_root / "backend/static/uploads/portfolio",
                'category': 'portfolio'
            },
            {
                'source': project_root / "frontend/public_landing/styles/M le Diamant  портфолио/Красивые лица",
                'dest': project_root / "backend/static/uploads/portfolio",
                'category': 'portfolio'
            },
            {
                'source': project_root / "frontend/public_landing/styles/M le Diamant  портфолио/Фото салона",
                'dest': project_root / "backend/static/uploads/salon",
                'category': 'salon'
            },
            {
                'source': project_root / "frontend/public_landing/styles/M le Diamant  портфолио/Услуги",
                'dest': project_root / "backend/static/uploads/services",
                'category': 'services'
            }
        ]
        
        for source_info in sources:
            source_dir = source_info['source']
            dest_dir = source_info['dest']
            category = source_info['category']
            
            if not source_dir.exists():
                print(f"⚠️  Папка не найдена: {source_dir}")
                continue
                
            print(f"\n📂 Импорт из {source_dir}...")
            
            for idx, img_file in enumerate(sorted(source_dir.glob("*.*"))):
                if img_file.suffix.lower() in ['.jpg', '.jpeg', '.png', '.webp', '.gif']:
                    # Копируем файл в папку назначения
                    dest_file = dest_dir / img_file.name
                    if not dest_file.exists():
                        shutil.copy2(img_file, dest_file)
                        print(f"  📋 Скопировано: {img_file.name}")
                    
                    # Добавляем в базу данных
                    image_path = f"/static/uploads/{category}/{img_file.name}"
                    
                    # Проверяем, не импортировано ли уже
                    c.execute("SELECT id FROM gallery_images WHERE image_path = %s", (image_path,))
                    if not c.fetchone():
                        c.execute("""
                            INSERT INTO gallery_images (category, image_path, title, sort_order, is_visible)
                            VALUES (%s, %s, %s, %s, TRUE)
                        """, (category, image_path, img_file.stem, idx))
                        imported_count += 1
                        print(f"  ✅ Импортировано в БД: {img_file.name}")
        
        conn.commit()
        print(f"\n✅ Всего импортировано {imported_count} фото")
        
    except Exception as e:
        conn.rollback()
        print(f"❌ Ошибка импорта фото: {e}")
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    import_gallery_photos()
