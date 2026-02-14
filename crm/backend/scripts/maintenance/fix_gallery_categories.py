import os
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

# Load .env
load_dotenv('backend/.env')

def run_fix():
    print("🔧 Starting Gallery Categories Fix...")
    
    conn = psycopg2.connect(
        host=os.getenv('POSTGRES_HOST', 'localhost'),
        port=os.getenv('POSTGRES_PORT', '5432'),
        database=os.getenv('POSTGRES_DB', 'beauty_crm'),
        user=os.getenv('POSTGRES_USER', 'beauty_crm_user'),
        password=os.getenv('POSTGRES_PASSWORD', 'local_password')
    )
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        # 1. Map images to categories based on path and filename
        cursor.execute("SELECT id, image_path, category FROM gallery_images")
        rows = cursor.fetchall()
        
        updates = 0
        for row in rows:
            path = row['image_path'].lower()
            old_category = row['category']
            new_category = old_category
            
            # Rule 1: Salon folder -> salon category
            if '/salon/' in path:
                new_category = 'salon'
            # Rule 2: Services folder -> services category (not shown in portfolio)
            elif '/services/' in path:
                new_category = 'services'
            # Rule 3: Faces folder -> face category
            elif '/faces/' in path:
                new_category = 'face'
            # Rule 4: Portfolio folder -> map to hair, nails, body, face
            elif '/portfolio/' in path:
                if any(x in path for x in ['маник', 'ногт', 'педик', 'nail']):
                    new_category = 'nails'
                elif any(x in path for x in ['волос', 'стриж', 'окраш', 'кератин', 'hair']):
                    new_category = 'hair'
                elif any(x in path for x in ['спа', 'spa', 'массаж', 'body', 'тел', 'воксинг']):
                    new_category = 'body'
                elif any(x in path for x in ['лиц', 'face', 'перманент']):
                    new_category = 'face'
                else:
                    new_category = 'other'

            if new_category != old_category:
                cursor.execute(
                    "UPDATE gallery_images SET category = %s WHERE id = %s",
                    (new_category, row['id'])
                )
                print(f"✅ Updated ID {row['id']}: {old_category} -> {new_category} ({path})")
                updates += 1
        
        conn.commit()
        print(f"✨ Finished. Total updates: {updates}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        conn.rollback()
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    run_fix()
