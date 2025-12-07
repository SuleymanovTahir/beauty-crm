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

def validate_service_translations(service):
    """Validate service has proper translations to avoid auto-translation errors"""
    warnings = []
    
    # Check Russian translation exists
    if not service.get('name_ru'):
        warnings.append(f"⚠️  {service['name']}: missing name_ru (will auto-translate)")
    
    # Check for suspicious patterns that indicate bad auto-translation
    suspicious_patterns = {
        'под оружием': 'under arms mistranslation',
        'руководитель': 'head mistranslation', 
        'стоун': 'stone mistranslation',
        'бразильский$': 'brazilian without context',
    }
    
    if service.get('name_ru'):
        import re
        for pattern, issue in suspicious_patterns.items():
            if re.search(pattern, service['name_ru'].lower()):
                warnings.append(f"⚠️  {service['name']}: suspicious '{service['name_ru']}' ({issue})")
    
    return warnings

def seed_production_data():
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        log_info("🌱 Seeding production data...", "seeding")
        
        # 1. Seed Services
        log_info("   📦 Seeding Services...", "seeding")
        
        added_services = 0
        validation_warnings = []
        
        for s in SERVICES_DATA:
            # Validate translations
            warnings = validate_service_translations(s)
            validation_warnings.extend(warnings)
            
            # Check if exists
            c.execute("SELECT id FROM services WHERE service_key = %s", (s['key'],))
            if not c.fetchone():
                # Prepare columns
                cols = [
                    'service_key', 'name', 'name_ru', 'name_ar', 'price', 
                    'min_price', 'max_price', 'currency', 'category', 
                    'description', 'description_ru', 'benefits', 'duration'
                ]
                
                vals = [
                    s['key'], s['name'], s.get('name_ru'), s.get('name_ar'), s['price'],
                    s.get('min_price'), s.get('max_price'), s.get('currency', 'AED'), s['category'],
                    s.get('description'), s.get('description_ru'), 
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
        
        log_info(f"   ✅ Added {added_services} new services", "seeding")
        
        # Show validation warnings
        if validation_warnings:
            log_info(f"\n   ⚠️  Translation warnings ({len(validation_warnings)}):", "seeding")
            for warning in validation_warnings[:10]:  # Show first 10
                log_info(f"      {warning}", "seeding")
            if len(validation_warnings) > 10:
                log_info(f"      ... and {len(validation_warnings) - 10} more", "seeding")

        # 2. Seed Banners
        log_info("   🖼 Seeding Banners...", "seeding")
        
        # Check if any active banner exists
        c.execute("SELECT COUNT(*) FROM public_banners WHERE is_active = TRUE")
        count = c.fetchone()[0]
        
        if count == 0:
            # Create default banners
            banners = [
                {
                    'title_ru': 'Красота и Элегантность',
                    'title_en': 'Beauty and Elegance',
                    'title_ar': 'الجمال والأناقة',
                    'subtitle_ru': 'Профессиональные услуги красоты',
                    'subtitle_en': 'Professional Beauty Services',
                    'subtitle_ar': 'خدمات تجميل احترافية',
                    'image_url': '/static/uploads/faces/banner2.webp', # Ensure this file exists or use external URL
                    'link_url': '/services',
                    'display_order': 1,
                    'is_active': True
                },
                {
                    'title_ru': 'Скидки до 50%',
                    'title_en': 'Discounts up to 50%',
                    'title_ar': 'خصومات تصل إلى 50٪',
                    'subtitle_ru': 'На все услуги салона',
                    'subtitle_en': 'On all salon services',
                    'subtitle_ar': 'على جميع خدمات الصالون',
                    'image_url': '/static/uploads/faces/Мароканская баня.webp',
                    'link_url': '/services',
                    'display_order': 2,
                    'is_active': True # Set to False if you don't want it active by default
                }
            ]
            
            for b in banners:
                # Check if image exists locally, if not use placeholder or warn
                # For now, we assume migration put them there or they exist.
                # If local file path, check existence?
                # Let's just insert.
                
                cols = list(b.keys())
                vals = list(b.values())
                placeholders = ', '.join(['%s'] * len(cols))
                columns_str = ', '.join(cols)
                
                c.execute(f"""
                    INSERT INTO public_banners ({columns_str})
                    VALUES ({placeholders})
                """, vals)
            
            log_info("   ✅ Created default banners", "seeding")
        else:
            log_info(f"   ℹ️  {count} active banners already exist", "seeding")

        conn.commit()
        log_info("🎉 Seeding completed successfully!", "seeding")

    except Exception as e:
        conn.rollback()
        log_error(f"❌ Error during seeding: {e}", "seeding")
    finally:
        conn.close()

if __name__ == "__main__":
    seed_production_data()
