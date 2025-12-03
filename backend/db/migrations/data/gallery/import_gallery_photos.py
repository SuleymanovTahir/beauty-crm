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
        # Get project root (3 levels up from this file: data/gallery/ -> migrations/ -> db/ -> backend/ -> project_root)
        project_root = Path(__file__).parent.parent.parent.parent
        
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
                            VALUES (%s, %s, %s, %s, 1)
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
