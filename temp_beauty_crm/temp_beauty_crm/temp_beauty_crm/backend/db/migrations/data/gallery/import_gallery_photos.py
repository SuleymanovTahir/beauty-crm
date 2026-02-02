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
    
    from core.config import UPLOAD_DIR
    # Пытаемся найти корень проекта, где есть backend и frontend
    current_file = Path(os.path.abspath(__file__))
    project_root = None
    
    # Идем вверх до тех пор, пока не найдем директорию с backend и frontend
    for parent in current_file.parents:
        if (parent / "backend").exists() and (parent / "frontend").exists():
            project_root = parent
            break
            
    if not project_root:
        # Fallback if structure is slightly different
        project_root = current_file.parents[5]
    
    try:
        print(f"📂 Project root: {project_root}")
        
        # Базовая папка с картинками
        base_img_dir = project_root / "frontend/public_landing/styles/img"
        if not base_img_dir.exists():
            print(f"❌ Папка не найдена: {base_img_dir}")
            return

        # Маппинг папок в категории БД
        category_mapping = {
            "Портфолио": "portfolio",
            "Красивые лица": "faces",
            "Фото салона": "salon",
            "Услуги": "services",
            "Сотрудники": "employees"
        }
        
        imported_count = 0
        
        # Сканируем все подпапки в img
        for source_dir in base_img_dir.iterdir():
            if not source_dir.is_dir():
                continue
                
            folder_name = source_dir.name
            category = category_mapping.get(folder_name, folder_name.lower())
            
            # Целевая папка в backend/static/uploads/images/
            dest_dir = Path(UPLOAD_DIR) / "images" / category
            dest_dir.mkdir(parents=True, exist_ok=True)
            
            print(f"\n📂 Обработка папки: {folder_name} (Категория: {category})")
            
            # Сканируем картинки в папке
            for idx, img_file in enumerate(sorted(source_dir.glob("*.*"))):
                # Пропускаем logo.png и не-картинки
                if img_file.name.lower() == "logo.png":
                    continue
                if img_file.suffix.lower() not in ['.jpg', '.jpeg', '.png', '.webp', '.gif']:
                    continue
                    
                # Копируем файл (всегда перезаписываем, чтобы обновить если изменился)
                shutil.copy2(img_file, dest_file)
                print(f"  📋 Скопировано/Обновлено: {img_file.name}")
                
                # Добавляем в базу данных (для галереи используем gallery_images)
                # Только если это не "images" (сотрудники), так как они в таблице users
                if category != "images":
                    image_path = f"/static/uploads/images/{category}/{img_file.name}"
                    
                    c.execute("SELECT id FROM gallery_images WHERE image_path = %s", (image_path,))
                    if not c.fetchone():
                        c.execute("""
                            INSERT INTO gallery_images (category, image_path, title, sort_order, is_visible)
                            VALUES (%s, %s, %s, %s, TRUE)
                        """, (category, image_path, img_file.stem, idx))
                        imported_count += 1
                        print(f"  ✅ Импортировано в БД: {img_file.name}")
        
        # Сканируем картинки в корне img (категория: other)
        print(f"\n📂 Проверка файлов в корне: {base_img_dir}")
        for img_file in base_img_dir.glob("*.*"):
            if img_file.is_dir():
                continue
            if img_file.name.lower() == "logo.png":
                continue
            if img_file.suffix.lower() not in ['.jpg', '.jpeg', '.png', '.webp', '.gif']:
                continue
                
            category = "other"
            dest_dir = Path(UPLOAD_DIR) / "images" / category
            dest_dir.mkdir(parents=True, exist_ok=True)
            
            dest_file = dest_dir / img_file.name
            shutil.copy2(img_file, dest_file)
            print(f"  📋 Скопировано (root): {img_file.name}")
                
            image_path = f"/static/uploads/images/{category}/{img_file.name}"
            c.execute("SELECT id FROM gallery_images WHERE image_path = %s", (image_path,))
            if not c.fetchone():
                c.execute("""
                    INSERT INTO gallery_images (category, image_path, title, sort_order, is_visible)
                    VALUES (%s, %s, %s, 999, TRUE)
                """, (category, image_path, img_file.stem))
                imported_count += 1
                print(f"  ✅ Импортировано в БД (root): {img_file.name}")
        
        conn.commit()
        print(f"\n✅ Всего импортировано в галерею: {imported_count} фото")
        
    except Exception as e:
        conn.rollback()
        print(f"❌ Ошибка импорта фото: {e}")
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    import_gallery_photos()
