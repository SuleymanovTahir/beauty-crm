import sys
from pathlib import Path
import shutil
import os

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from db.connection import get_db_connection

def fix_gallery_categories():
    print("🔧 Fixing gallery categories...")
    
    # Setup paths
    # backend/scripts/maintenance/fix_gallery_categories.py
    current_file = Path(__file__).resolve()
    # Go up to project root: maintenance -> scripts -> backend -> beauty-crm
    project_root = current_file.parent.parent.parent.parent
    
    # Verify root
    if not (project_root / "frontend").exists():
        # Fallback for dev environment
        project_root = Path("/Users/tahir/Desktop/beauty-crm")
        
    print(f"📂 Project root: {project_root}")
        
    faces_source = project_root / "frontend/public_landing/styles/M le Diamant  портфолио/Красивые лица"
    portfolio_dir = project_root / "backend/static/uploads/portfolio"
    faces_dir = project_root / "backend/static/uploads/faces"
    
    faces_dir.mkdir(parents=True, exist_ok=True)
    
    conn = get_db_connection()
    c = conn.cursor()
    
    processed_count = 0
    
    if not faces_source.exists():
        print(f"❌ Source directory not found: {faces_source}")
        return

    print(f"📂 Scanning {faces_source}...")
    
    for img_file in faces_source.glob("*.*"):
        if img_file.suffix.lower() not in ['.jpg', '.jpeg', '.png', '.webp', '.gif']:
            continue
            
        filename = img_file.name
        old_path = portfolio_dir / filename
        new_path = faces_dir / filename
        
        # 1. Move file if it exists in portfolio
        if old_path.exists():
            shutil.move(str(old_path), str(new_path))
            print(f"  📦 Moved {filename} to faces folder")
        elif not new_path.exists():
            # If not in portfolio but in source, copy to faces
            shutil.copy2(img_file, new_path)
            print(f"  📋 Copied {filename} to faces folder")
        else:
            print(f"  ✅ File {filename} already in faces folder")
            
        # 2. Update Database
        # Check if it exists as portfolio
        old_db_path = f"/static/uploads/portfolio/{filename}"
        new_db_path = f"/static/uploads/faces/{filename}"
        
        c.execute("SELECT id FROM gallery_images WHERE image_path = %s", (old_db_path,))
        row = c.fetchone()
        
        if row:
            # Update existing record
            c.execute("""
                UPDATE gallery_images 
                SET category = 'faces', image_path = %s 
                WHERE id = %s
            """, (new_db_path, row[0]))
            print(f"  🔄 Updated DB record for {filename}")
            processed_count += 1
        else:
            # Check if already in faces
            c.execute("SELECT id FROM gallery_images WHERE image_path = %s", (new_db_path,))
            if not c.fetchone():
                # Insert new record
                c.execute("""
                    INSERT INTO gallery_images (category, image_path, title, sort_order, is_visible)
                    VALUES ('faces', %s, %s, 0, TRUE)
                """, (new_db_path, img_file.stem))
                print(f"  ➕ Inserted new record for {filename}")
                processed_count += 1
                
    conn.commit()
    conn.close()
    print(f"✅ Finished. Processed {processed_count} images.")

if __name__ == "__main__":
    fix_gallery_categories()
