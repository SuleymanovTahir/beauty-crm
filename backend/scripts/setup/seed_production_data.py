"""
Script to seed production data (Services and Banners) for PostgreSQL.
Uses data from seed_test_data.py for services and creates default banners.
"""
import sys
import os
import psycopg2

# Add backend directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from db.connection import get_db_connection
from utils.logger import log_info, log_error
from scripts.testing.data.seed_test_data import SERVICES_DATA

def seed_production_data():
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        log_info("🌱 Seeding production data...", "seeding")
        
        # 1. Seed Services
        log_info("   📦 Seeding Services...", "seeding")
        
        added_services = 0
        
        # Delete existing to ensure clean seed
        c.execute("DELETE FROM services")
        
        for s in SERVICES_DATA:
            # Prepare columns (Single base field per Rule 15)
            cols = [
                'service_key', 'name', 'price', 
                'min_price', 'max_price', 'currency', 'category', 
                'description', 'benefits', 'duration'
            ]
            
            vals = [
                s['key'], s['name'], s['price'],
                s.get('min_price'), s.get('max_price'), s.get('currency', 'AED'), s['category'],
                s.get('description'), 
                ','.join(s.get('benefits', [])) if s.get('benefits') else None,
                s.get('duration')
            ]

            placeholders = ', '.join(['%s'] * len(cols))
            columns_str = ', '.join(cols)
            
            c.execute(f"""
                INSERT INTO services ({columns_str}, is_active) 
                VALUES ({placeholders}, TRUE)
            """, vals)
            added_services += 1
        
        log_info(f"   ✅ Added {added_services} services", "seeding")
        
        # 2. Banners - now managed via CRM admin panel
        log_info("   🖼 Skipping Banners (CRM is source of truth)", "seeding")
        # NOTE: Banners should be created/managed via CRM Public Content page
        # DO NOT auto-seed or delete existing banners

        # 3. Seed Gallery (only add if empty or missing items)
        log_info("   📸 Seeding Gallery...", "seeding")
        c.execute("SELECT COUNT(*) FROM public_gallery")
        gallery_count = c.fetchone()[0]
        if gallery_count > 0:
            log_info("   ⏭️ Gallery already has data, skipping seed", "seeding")
        else:
            gallery_items = [
                # Portfolio category
                ("/static/uploads/images/portfolio/hair1.webp", "Стильная укладка", "Работа нашего топ-стилиста", "portfolio", 1),
                ("/static/uploads/images/portfolio/nails1.webp", "Классический маникюр", "Чистота и идеальная форма", "portfolio", 2),
                ("/static/uploads/images/portfolio/lips1.webp", "Перманентный макияж губ", "Естественный контур и цвет", "portfolio", 3),
                ("/static/uploads/images/portfolio/spa1.webp", "SPA-процедуры", "Релакс и уход за кожей", "portfolio", 4),
                # Salon category
                ("/static/uploads/images/salon/salon_main.webp", "Интерьер салона", "Уютная атмосфера нашего салона", "salon", 1),
                ("/static/uploads/images/salon/moroccan_bath.webp", "SPA зона", "Зона релаксации и отдыха", "salon", 2),
                ("/static/uploads/images/salon/hair_studio.webp", "Парикмахерский зал", "Профессиональное оборудование", "salon", 3),
                ("/static/uploads/images/salon/nail_salon.webp", "Зона маникюра", "Комфорт и стерильность", "salon", 4),
                ("/static/uploads/images/salon/massage_room.webp", "Кабинет массажа", "Расслабляющая атмосфера", "salon", 5),
                # Services category
                ("/static/uploads/images/services/%D0%9C%D0%B0%D0%BD%D0%B8%D0%BA%D1%8E%D1%80%204.webp", "Маникюр", "Профессиональный маникюр", "services", 1),
                ("/static/uploads/images/services/%D0%9C%D0%B0%D1%81%D1%81%D0%B0%D0%B6%20%D0%BB%D0%B8%D1%86%D0%B0.webp", "Массаж лица", "Омолаживающий массаж", "services", 2),
                ("/static/uploads/images/services/%D0%A1%D0%BF%D0%B0.webp", "SPA", "Релакс процедуры", "services", 3),
                ("/static/uploads/images/services/%D0%A1%D1%82%D1%80%D0%B8%D0%B6%D0%BA%D0%B0%20.webp", "Стрижка", "Профессиональная стрижка", "services", 4),
            ]

            for img, title, desc, cat, order in gallery_items:
                c.execute("""
                    INSERT INTO public_gallery (image_url, title, description, category, display_order, is_active)
                    VALUES (%s, %s, %s, %s, %s, TRUE)
                """, (img, title, desc, cat, order))
            log_info("   ✅ Seeded gallery items", "seeding")

        conn.commit()
        log_info("🎉 Seeding completed successfully!", "seeding")

    except Exception as e:
        conn.rollback()
        log_error(f"❌ Error during seeding: {e}", "seeding")
    finally:
        conn.close()

if __name__ == "__main__":
    seed_production_data()
