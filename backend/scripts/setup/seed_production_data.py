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
        
        # 2. Seed Banners
        log_info("   🖼 Seeding Banners...", "seeding")
        
        c.execute("DELETE FROM public_banners")
        
        # Create default banners (Only base fields per Rule 15)
        banners = [
            ("Luxury Hair Styling", "Premium hair care and transformations", "/static/images/banners/banner_main.webp", "/booking", 1),
            ("Elegant Nail Art", "Perfect manicure and pedicure services", "/static/images/banners/banner_premium.webp", "/booking", 2)
        ]
        
        for title, subtitle, img, link, order in banners:
            c.execute("""
                INSERT INTO public_banners (title, subtitle, image_url, link_url, display_order, is_active)
                VALUES (%s, %s, %s, %s, %s, TRUE)
            """, (title, subtitle, img, link, order))
        log_info("   ✅ Created default banners", "seeding")

        # 3. Seed Gallery
        log_info("   📸 Seeding Gallery...", "seeding")
        c.execute("DELETE FROM public_gallery")
        
        gallery_items = [
            ("/static/images/portfolio/hair1.jpg", "Стильная укладка", "Работа нашего топ-стилиста", "hair", 1),
            ("/static/images/portfolio/волосы.webp", "Окрашивание блонд", "Идеальный платиновый блонд", "hair", 2),
            ("/static/images/portfolio/маникюр.webp", "Классический маникюр", "Чистота и идеальная форма", "nails", 3),
            ("/static/images/portfolio/ногти2.webp", "Дизайн ногтей", "Аккуратное покрытие и стильный дизайн", "nails", 4),
            ("/static/images/portfolio/спа2.webp", "SPA-процедуры", "Релакс и уход за кожей", "spa", 5),
            ("/static/images/portfolio/спа3.webp", "Марокканская баня", "Традиционный восточный уход", "spa", 6)
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
