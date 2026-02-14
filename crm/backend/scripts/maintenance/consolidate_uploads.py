import os
import shutil
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from core.config import UPLOAD_DIR, BASE_DIR
from utils.logger import log_info, log_error, log_warning

from db.connection import get_db_connection

def consolidate_uploads():
    log_info("🔧 Starting uploads consolidation and nesting...", "maintenance")
    
    target_dir = Path(UPLOAD_DIR)
    target_dir.mkdir(parents=True, exist_ok=True)
    
    # 1. Nest image-related folders inside 'images'
    images_dir = target_dir / "images"
    images_dir.mkdir(parents=True, exist_ok=True)
    
    # Fix: remove nested images/images if it exists (happened due to bad mapping)
    redundant_images_dir = images_dir / "images"
    emp_dir = images_dir / "employees"
    emp_dir.mkdir(parents=True, exist_ok=True)
    
    # Mapping to unify names
    employee_unification = {
        "simo.webp": "Симо.webp",
        "mestan.webp": "Местан.webp",
        "lyazzat.webp": "Ляззат.webp",
        "gulya.webp": "Гуля.webp",
        "jennifer.webp": "Дженнифер.webp",
    }

    if redundant_images_dir.exists() and redundant_images_dir.is_dir():
        log_warning(f"🧹 Fixing redundant nested folder: {redundant_images_dir}", "maintenance")
        for item in redundant_images_dir.iterdir():
            if item.suffix.lower() == '.webp':
                # Map to Russian name if possible
                target_name = employee_unification.get(item.name, item.name)
                dest_item = emp_dir / target_name
                if not dest_item.exists():
                    shutil.move(str(item), str(dest_item))
                    log_info(f"  🚚 Moved (nested): {item.name} -> employees/{target_name}", "maintenance")
                else:
                    log_warning(f"  ⚠️ {target_name} already in employees, removing nested original {item.name}", "maintenance")
                    item.unlink()
        try:
            shutil.rmtree(redundant_images_dir)
            log_info(f"✅ Removed redundant nested folder: {redundant_images_dir}", "maintenance")
        except Exception as e:
            log_error(f"❌ Failed to remove {redundant_images_dir}: {e}", "maintenance")

    # Root cleanup: if a file in images/ root exists in any subfolder, delete it from root
    log_info("🧹 Cleaning up duplicate files from images/ root...", "maintenance")
    subfolders = ["employees", "faces", "portfolio", "salon", "services", "avatars", "other"]
    
    for item in images_dir.iterdir():
        if item.is_file() and item.suffix.lower() == '.webp':
            # Check if this file exists in any of the subfolders
            found_duplicate = False
            for sub in subfolders:
                sub_path = images_dir / sub / item.name
                if sub_path.exists():
                    log_info(f"  🗑️ Found duplicate in {sub}: {item.name}, deleting root copy", "maintenance")
                    item.unlink()
                    found_duplicate = True
                    break
            
            if not found_duplicate:
                # If it's one of the known staff but not in employees/ yet, move it
                is_staff = any(emp.lower() in item.stem.lower() for emp in ["Гуля", "Дженнифер", "Ляззат", "Местан", "Симо", "gulya", "jennifer", "lyazzat", "mestan", "simo"])
                if is_staff:
                    russian_name = employee_unification.get(item.name, item.name)
                    dest_item = emp_dir / russian_name
                    if not dest_item.exists():
                        shutil.move(str(item), str(dest_item))
                        log_info(f"  ✅ Moved floating staff photo to employees/: {russian_name}", "maintenance")
                    else:
                        item.unlink()
                        log_info(f"  🗑️ Deleted root duplicate for staff: {item.name}", "maintenance")

    nest_folders = ["portfolio", "faces", "salon", "services", "other", "avatars", "employees"]
    for folder in nest_folders:
        source = target_dir / folder
        dest = images_dir / folder
        if source.exists() and source.is_dir() and source.resolve() != images_dir.resolve():
            log_info(f"📁 Nesting folder: {folder} -> images/{folder}", "maintenance")
            if dest.exists() and dest.resolve() != source.resolve():
                # Merge if destination exists
                for item in source.iterdir():
                    dest_path = dest / item.name
                    if not dest_path.exists():
                        shutil.move(str(item), str(dest_path))
                    else:
                        item.unlink() # Cleanup duplicates
                if source.exists():
                    shutil.rmtree(source)
            elif not dest.exists():
                shutil.move(str(source), str(dest))
    
    # --- 2. Update database paths and cleanup domains ---
    log_info("💾 Updating database paths and cleaning domains...", "maintenance")
    try:
        conn = get_db_connection()
        c = conn.cursor()
        
        # Helper to strip domains and ensure relative paths
        def cleanup_sql_paths(table, column, pattern):
            # Strip domains
            c.execute(f"UPDATE {table} SET {column} = REGEXP_REPLACE({column}, '^https?://[^/]+/', '/') WHERE {column} LIKE %s", (f'%{pattern}%',))
            # Ensure leading slash
            c.execute(f"UPDATE {table} SET {column} = '/' || LTRIM({column}, '/') WHERE {column} LIKE %s AND {column} NOT LIKE '/%%'", (f'%{pattern}%',))

        # Cleanup all relevant tables
        for table, col in [("gallery_images", "image_path"), ("users", "photo"), ("clients", "profile_pic"), ("public_banners", "image_url")]:
            cleanup_sql_paths(table, col, "static/uploads")

        # Fix banner specific paths: move any images/banner.webp to images/faces/banner.webp in DB
        c.execute("UPDATE public_banners SET image_url = REPLACE(image_url, '/static/uploads/images/', '/static/uploads/images/faces/') WHERE image_url LIKE '/static/uploads/images/%%.webp'")
        
        # Update users photos if they were pointed to root images/
        for eng, rus in employee_unification.items():
             c.execute("UPDATE users SET photo = %s WHERE photo LIKE %s", (f"/static/uploads/images/employees/{rus}", f'%{eng}%'))

        # Commit DB changes
        conn.commit()
        
        # --- 3. Physical cleanup of misplaced files ---
        log_info("🧹 Moving misplaced root banners to faces/...", "maintenance")
        faces_dir = images_dir / "faces"
        faces_dir.mkdir(parents=True, exist_ok=True)
        
        for item in images_dir.iterdir():
            if item.is_file() and item.name.startswith("banner") and item.suffix.lower() == ".webp":
                dest = faces_dir / item.name
                if not dest.exists():
                    shutil.move(str(item), str(dest))
                    log_info(f"  🚚 Moved banner: {item.name} -> faces/", "maintenance")
                else:
                    item.unlink()
                    log_info(f"  🗑️ Deleted redundant banner: {item.name}", "maintenance")

    except Exception as e:
        if 'conn' in locals(): conn.rollback()
        log_error(f"❌ Database update error: {e}", "maintenance")
    finally:
        if 'conn' in locals(): conn.close()

    # 3. Clean up other redundant directories
    project_root = Path(BASE_DIR).parent
    redundant_paths = [
        project_root / "static" / "uploads",
        project_root / "backend" / "db" / "backend" / "static" / "uploads"
    ]
    
    # Also check for any other variations found by 'find' earlier
    # ./static/uploads -> project_root / "static" / "uploads"
    # ./backend/db/backend/static/uploads -> project_root / "backend" / "db" / "backend" / "static" / "uploads"
    
    for source_dir in redundant_paths:
        if source_dir.exists() and source_dir.resolve() != target_dir.resolve():
            log_info(f"📁 Processing redundant directory: {source_dir}", "maintenance")
            
            # Move all files and subdirectories
            for item in source_dir.rglob("*"):
                if item.is_file():
                    # Calculate relative path to source_dir
                    rel_path = item.relative_to(source_dir)
                    dest_file = target_dir / rel_path
                    
                    # Ensure destination directory exists
                    dest_file.parent.mkdir(parents=True, exist_ok=True)
                    
                    if not dest_file.exists():
                        shutil.move(str(item), str(dest_file))
                        log_info(f"  🚚 Moved: {rel_path}", "maintenance")
                    else:
                        log_warning(f"  ⚠️ Skipping (already exists): {rel_path}", "maintenance")
            
            # Try to remove the old directory if empty or after moving
            try:
                shutil.rmtree(source_dir)
                log_info(f"✅ Removed redundant directory: {source_dir}", "maintenance")
            except Exception as e:
                log_error(f"❌ Failed to remove {source_dir}: {e}", "maintenance")

    # Final check: ensure base subdirs exist in the correct locations
    for subdir in ["files", "voice"]:
        (target_dir / subdir).mkdir(parents=True, exist_ok=True)
    
    for subdir in ["portfolio", "faces", "salon", "services", "employees", "avatars"]:
        (images_dir / subdir).mkdir(parents=True, exist_ok=True)
        
    log_info("✨ Consolidation complete!", "maintenance")

if __name__ == "__main__":
    consolidate_uploads()
