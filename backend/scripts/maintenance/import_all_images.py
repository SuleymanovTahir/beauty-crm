"""
Import images from upload folders into public_gallery database.
Categories: portfolio, salon, services, faces
"""
import os
import urllib.parse
from pathlib import Path
from db.connection import get_db_connection
from utils.logger import log_info, log_error

def import_images():
    """Import images from upload folders to public_gallery table."""
    print("🚀 Importing images from upload folders to public_gallery...")

    # Base directory for uploads (server path)
    base_dir = Path("/home/ubuntu/beauty_crm/backend/static/uploads/images")

    # Categories to import (folder name -> category in DB)
    categories = {
        'portfolio': 'portfolio',
        'services': 'services',
        'faces': 'faces',
        # 'salon' is skipped - already has data
    }

    conn = get_db_connection()
    cur = conn.cursor()

    total_added = 0

    for folder, category in categories.items():
        folder_path = base_dir / folder
        if not folder_path.exists():
            print(f"  ⚠️ Folder not found: {folder_path}")
            continue

        print(f"\n📁 Processing {folder} -> category '{category}'...")

        # Get existing URLs in this category to avoid duplicates
        cur.execute("SELECT image_url FROM public_gallery WHERE category = %s", (category,))
        existing_urls = {row[0] for row in cur.fetchall()}

        # Get max display_order for this category
        cur.execute("SELECT COALESCE(MAX(display_order), 0) FROM public_gallery WHERE category = %s", (category,))
        max_order = cur.fetchone()[0]

        for f in folder_path.glob("*.webp"):
            # URL-encode the filename for Russian names
            encoded_name = urllib.parse.quote(f.name)
            url = f"/static/uploads/images/{folder}/{encoded_name}"

            # Skip if already exists
            if url in existing_urls:
                continue

            # Extract title from filename (remove extension, replace _ with space)
            title = f.stem.replace('_', ' ').strip()

            max_order += 1
            cur.execute("""
                INSERT INTO public_gallery (category, image_url, title, is_active, display_order)
                VALUES (%s, %s, %s, TRUE, %s)
            """, (category, url, title, max_order))
            print(f"  ✅ Added: {title}")
            total_added += 1

    conn.commit()
    cur.close()
    conn.close()

    print(f"\n✨ Import completed! Added {total_added} new images.")

if __name__ == "__main__":
    import_images()
