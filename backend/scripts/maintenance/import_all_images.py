import os
import shutil
from pathlib import Path
import psycopg2
from db.connection import get_db_connection

def import_images():
    print("🚀 Importing all available images to backend and DB...")
    
    frontend_img_dir = Path("/Users/tahir/Desktop/beauty-crm/frontend/public_landing/styles/img")
    backend_img_base = Path("/Users/tahir/Desktop/beauty-crm/backend/static/images")
    portfolio_dir = backend_img_base / "portfolio"
    salon_dir = backend_img_base / "salon"
    
    portfolio_dir.mkdir(parents=True, exist_ok=True)
    salon_dir.mkdir(parents=True, exist_ok=True)
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    # First, clear public_gallery to avoid mess
    cur.execute("DELETE FROM public_gallery")
    
    # 1. Salon Interior
    salon_src = frontend_img_dir / "Фото салона"
    if salon_src.exists():
        for f in salon_src.glob("*.webp"):
            target_name = f.name.lower().replace(' ', '_')
            shutil.copy(f, salon_dir / target_name)
            url = f"/static/images/salon/{target_name}"
            # Extract title from filename
            title = f.stem.replace('_', ' ').capitalize()
            cur.execute("INSERT INTO public_gallery (category, image_url, title, is_active) VALUES ('salon', %s, %s, TRUE)", (url, title))
            print(f"  ✅ Added salon: {title}")

    # 2. Portfolio
    port_src = frontend_img_dir / "Портфолио"
    if port_src.exists():
        for f in port_src.glob("*.webp"):
            # Check if it should be in specific category
            cat = 'portfolio'
            name_lower = f.name.lower()
            if 'nail' in name_lower or 'маникюр' in name_lower or 'ногти' in name_lower or 'pedicure' in name_lower:
                cat = 'nails'
            elif 'hair' in name_lower or 'волосы' in name_lower or 'укладка' in name_lower or 'стрижка' in name_lower or 'color' in name_lower:
                cat = 'hair'
            elif 'spa' in name_lower or 'bath' in name_lower or 'баня' in name_lower:
                cat = 'spa'
            elif 'lash' in name_lower or 'ресницы' in name_lower:
                cat = 'lashes'
            elif 'brow' in name_lower or 'брови' in name_lower:
                cat = 'brows'
                
            target_name = f.name.lower().replace(' ', '_')
            shutil.copy(f, portfolio_dir / target_name)
            url = f"/static/images/portfolio/{target_name}"
            title = f.stem.replace('_', ' ').capitalize()
            cur.execute("INSERT INTO public_gallery (category, image_url, title, is_active) VALUES (%s, %s, %s, TRUE)", (cat, url, title))
            print(f"  ✅ Added {cat}: {title}")

    # 3. "Красивые лица" (Beautiful faces) -> add to portfolio
    faces_src = frontend_img_dir / "Красивые лица"
    if faces_src.exists():
        for f in faces_src.glob("*.webp"):
            target_name = "face_" + f.name.lower().replace(' ', '_')
            shutil.copy(f, portfolio_dir / target_name)
            url = f"/static/images/portfolio/{target_name}"
            title = f.stem.replace('_', ' ').capitalize()
            cur.execute("INSERT INTO public_gallery (category, image_url, title, is_active) VALUES ('portfolio', %s, %s, TRUE)", (url, title))
            print(f"  ✅ Added face: {title}")

    conn.commit()
    cur.close()
    conn.close()
    print("\n✨ All images imported successfully!")

if __name__ == "__main__":
    import_images()
