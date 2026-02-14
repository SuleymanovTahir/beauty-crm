import os
import sys
import shutil
import psycopg2
from pathlib import Path

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from db.connection import get_db_connection
from utils.logger import log_info, log_error

def fix_employee_photos():
    log_info("🔧 Fixing employee photos...", "fix")
    
    from core.config import UPLOAD_DIR, BASE_DIR
    project_root = os.path.dirname(BASE_DIR)
    
    # Универсальный путь
    source_dir = os.path.join(project_root, "frontend", "public_landing", "styles", "img", "Сотрудники")
            
    if not os.path.exists(source_dir):
        log_error(f"❌ Could not find employee photos source directory: {source_dir}", "fix")
        return

    target_dir = os.path.join(UPLOAD_DIR, "images", "employees")
    os.makedirs(target_dir, exist_ok=True)
    
    photo_mapping = {
        "simo": "Симо.webp",
        "mestan": "Местан.webp",
        "lyazzat": "Ляззат.webp",
        "gulya": "Гуля.webp",
        "jennifer": "Дженнифер.webp",
    }
    
    for username, source_filename in photo_mapping.items():
        source_path = os.path.join(source_dir, source_filename)
        if os.path.exists(source_path):
            # Using original source_filename (Russian) instead of new_filename (English)
            target_path = os.path.join(target_dir, source_filename)
            shutil.copy2(source_path, target_path)
            log_info(f"✅ Restored: {source_filename}", "fix")
        else:
            log_error(f"❌ File not found: {source_filename}", "fix")

def fix_banner_path():
    log_info("🔧 Fixing banner image paths...", "fix")
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        # 1. Update DB paths
        # Update DB: Use RELATIVE paths
        image_names = ["Мароканская баня.webp", "banner2.webp"]
        
        for image_name in image_names:
            db_path = f"/static/uploads/images/faces/{image_name}"
            # Update where the image_url contains the image_name, or where it was previously in /uploads/faces/
            c.execute("UPDATE public_banners SET image_url = %s WHERE image_url LIKE %s OR image_url LIKE %s", 
                      (db_path, f"%{image_name}%", f"%/uploads/faces/{image_name}"))
            if c.rowcount > 0:
                log_info(f"✅ Updated banner path for {image_name}", "fix")

        conn.commit()
        
        # 2. Ensure files exist in faces directory
        from core.config import UPLOAD_DIR, BASE_DIR
        project_root = os.path.dirname(BASE_DIR)
        
        # Source: Красивые лица -> faces
        source_dir = os.path.join(project_root, "frontend", "public_landing", "styles", "img", "Красивые лица")
        target_dir = os.path.join(UPLOAD_DIR, "images", "faces")
        os.makedirs(target_dir, exist_ok=True)
        
        if os.path.exists(source_dir):
            files_to_copy = ["Мароканская баня.webp", "banner2.webp"]
            for filename in files_to_copy:
                src = os.path.join(source_dir, filename)
                dst = os.path.join(target_dir, filename)
                if os.path.exists(src):
                    shutil.copy2(src, dst)
                    log_info(f"✅ Copied banner image: {filename}", "fix")
                else:
                    log_error(f"❌ Banner source file not found: {filename}", "fix")
        else:
            log_error(f"❌ Banner source directory not found: {source_dir}", "fix")

    except Exception as e:
        conn.rollback()
        log_error(f"❌ Error updating banner: {e}", "fix")
    finally:
        conn.close()

if __name__ == "__main__":
    fix_employee_photos()
    fix_banner_path()
