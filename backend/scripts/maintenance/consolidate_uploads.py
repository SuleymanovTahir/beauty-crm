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
    
    nest_folders = ["portfolio", "faces", "salon", "services", "other", "avatars", "employees"]
    for folder in nest_folders:
        source = target_dir / folder
        dest = images_dir / folder
        if source.exists() and source.is_dir():
            log_info(f"📁 Nesting folder: {folder} -> images/{folder}", "maintenance")
            if dest.exists():
                # Merge if destination exists
                for item in source.iterdir():
                    dest_item = dest / item.name
                    if not dest_item.exists():
                        shutil.move(str(item), str(dest_item))
                shutil.rmtree(source)
            else:
                shutil.move(str(source), str(dest))
    
    # 2. Update database paths
    log_info("💾 Updating database paths...", "maintenance")
    try:
        conn = get_db_connection()
        c = conn.cursor()
        
        # Update gallery_images
        for folder in ["portfolio", "faces", "salon", "services", "other"]:
            old_prefix = f"/static/uploads/{folder}/"
            new_prefix = f"/static/uploads/images/{folder}/"
            c.execute("UPDATE gallery_images SET image_path = REPLACE(image_path, %s, %s) WHERE image_path LIKE %s", (old_prefix, new_prefix, f"{old_prefix}%"))
            if c.rowcount > 0:
                log_info(f"  ✅ Updated {c.rowcount} gallery_images paths for {folder}", "maintenance")

        # Update users table (photo_url and photo)
        # Assuming photo might be just filename or relative path
        c.execute("UPDATE users SET photo_url = REPLACE(photo_url, '/static/uploads/employees/', '/static/uploads/images/employees/') WHERE photo_url LIKE '/static/uploads/employees/%'")
        if c.rowcount > 0:
            log_info(f"  ✅ Updated {c.rowcount} user photo_urls", "maintenance")
            
        c.execute("UPDATE users SET photo = REPLACE(photo, 'static/uploads/employees/', 'static/uploads/images/employees/') WHERE photo LIKE 'static/uploads/employees/%'")
        
        # Update clients table (profile_pic)
        c.execute("UPDATE clients SET profile_pic = REPLACE(profile_pic, '/static/uploads/avatars/', '/static/uploads/images/avatars/') WHERE profile_pic LIKE '/static/uploads/avatars/%'")
        if c.rowcount > 0:
            log_info(f"  ✅ Updated {c.rowcount} client profile_pics", "maintenance")
        
        conn.commit()
    except Exception as e:
        log_error(f"❌ Database update failed: {e}", "maintenance")
    finally:
        if 'conn' in locals() and conn:
            conn.close()

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

    # Final check: ensure base subdirs exist
    for subdir in ["images", "files", "voice", "portfolio", "faces", "salon", "services"]:
        (target_dir / subdir).mkdir(parents=True, exist_ok=True)
        
    log_info("✨ Consolidation complete!", "maintenance")

if __name__ == "__main__":
    consolidate_uploads()
