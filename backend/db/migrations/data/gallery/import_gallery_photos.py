"""
Импорт фото из папок в галерею
"""
import sqlite3
import os
from pathlib import Path
from core.config import DATABASE_NAME
from utils.logger import log_info, log_error


def import_gallery_photos():
    """Импортировать фото из папок портфолио и салона"""
    log_info("📸 Импорт фото галереи...", "migration")
    
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    try:
        # Пути к папкам с фото
        portfolio_dir = Path("backend/static/uploads/portfolio")
        salon_dir = Path("backend/static/uploads/salon")
        
        imported_count = 0
        
        # Импорт портфолио
        if portfolio_dir.exists():
            log_info(f"📂 Импорт из {portfolio_dir}...", "migration")
            for idx, img_file in enumerate(sorted(portfolio_dir.glob("*.*"))):
                if img_file.suffix.lower() in ['.jpg', '.jpeg', '.png', '.webp', '.gif']:
                    image_path = f"/static/uploads/portfolio/{img_file.name}"
                    
                    # Проверяем, не импортировано ли уже
                    c.execute("SELECT id FROM gallery_images WHERE image_path = ?", (image_path,))
                    if not c.fetchone():
                        c.execute("""
                            INSERT INTO gallery_images (category, image_path, title, sort_order, is_visible)
                            VALUES (?, ?, ?, ?, 1)
                        """, ('portfolio', image_path, img_file.stem, idx))
                        imported_count += 1
                        log_info(f"  ✅ Импортировано: {img_file.name}", "migration")
        
        
        # Импорт фото салона из папки "Фото салона"
        salon_source_dir = Path("frontend/public_landing/styles/M le Diamant  портфолио/Фото салона")
        if salon_source_dir.exists():
            log_info(f"📂 Импорт из {salon_source_dir}...", "migration")
            for idx, img_file in enumerate(sorted(salon_source_dir.glob("*.*"))):
                if img_file.suffix.lower() in ['.jpg', '.jpeg', '.png', '.webp', '.gif']:
                    image_path = f"/static/uploads/salon/{img_file.name}"
                    
                    # Проверяем, не импортировано ли уже
                    c.execute("SELECT id FROM gallery_images WHERE image_path = ?", (image_path,))
                    if not c.fetchone():
                        c.execute("""
                            INSERT INTO gallery_images (category, image_path, title, sort_order, is_visible)
                            VALUES (?, ?, ?, ?, 1)
                        """, ('salon', image_path, img_file.stem, idx))
                        imported_count += 1
                        log_info(f"  ✅ Импортировано: {img_file.name}", "migration")
        
        
        conn.commit()
        log_info(f"✅ Импортировано {imported_count} фото", "migration")
        
    except Exception as e:
        conn.rollback()
        log_error(f"❌ Ошибка импорта фото: {e}", "migration")
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    import_gallery_photos()
