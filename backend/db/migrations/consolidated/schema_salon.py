"""
Consolidated Salon Settings Schema Migration
All schema changes for salon_settings table in one place
"""
from db.connection import get_db_connection

def migrate_salon_schema(db_path="salon_bot.db"):
    """
    Apply all salon_settings table schema changes
    """
    print("\n" + "="*60)
    print("🔧 SALON SETTINGS SCHEMA MIGRATION")
    print("="*60)
    
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        # Get existing columns
        c.execute("SELECT column_name FROM information_schema.columns WHERE table_name=\'salon_settings\'")
        existing_columns = {col[0] for col in c.fetchall()}
        
        # Define all columns that should exist
        columns_to_add = {
            'hours_weekdays': 'TEXT',
            'hours_weekends': 'TEXT',
            'payment_methods': "TEXT DEFAULT \'Наличные, карта\'",
            'prepayment_required': 'BOOLEAN DEFAULT FALSE',
            'parking_info': 'TEXT',
            'wifi_available': 'BOOLEAN DEFAULT TRUE',
            'google_place_id': 'TEXT',  # ✅ From add_google_fields.py
            'google_api_key': 'TEXT',   # ✅ From add_google_fields.py
            
            # SEO & Analytics fields
            'google_analytics_id': 'TEXT',  # GA4 Measurement ID (e.g., G-XXXXXXXXXX)
            'facebook_pixel_id': 'TEXT',    # Facebook Pixel ID
            'latitude': 'REAL',             # Geo coordinates for Schema.org
            'longitude': 'REAL',            # Geo coordinates for Schema.org
            'logo_url': 'TEXT',             # Logo URL for Schema.org and meta tags
            'base_url': "TEXT DEFAULT \'https://mlediamant.com\'",  # Base site URL
            
            # Translation columns for main_location (all 9 languages)
            'main_location_ru': 'TEXT',
            'main_location_en': 'TEXT',
            'main_location_ar': 'TEXT',
            'main_location_es': 'TEXT',
            'main_location_de': 'TEXT',
            'main_location_fr': 'TEXT',
            'main_location_hi': 'TEXT',
            'main_location_kk': 'TEXT',
            'main_location_pt': 'TEXT',
            
            # Address translations (all 9 languages)
            'address_ru': 'TEXT',
            'address_en': 'TEXT',
            'address_ar': 'TEXT',
            'address_es': 'TEXT',
            'address_de': 'TEXT',
            'address_fr': 'TEXT',
            'address_hi': 'TEXT',
            'address_kk': 'TEXT',
            'address_pt': 'TEXT',
            
            # Email translations (all 9 languages)
            'email_ru': 'TEXT',
            'email_en': 'TEXT',
            'email_ar': 'TEXT',
            'email_es': 'TEXT',
            'email_de': 'TEXT',
            'email_fr': 'TEXT',
            'email_hi': 'TEXT',
            'email_kk': 'TEXT',
            'email_pt': 'TEXT',
            
            # City translations (all 9 languages)
            'city_ru': 'TEXT',
            'city_en': 'TEXT',
            'city_ar': 'TEXT',
            'city_es': 'TEXT',
            'city_de': 'TEXT',
            'city_fr': 'TEXT',
            'city_hi': 'TEXT',
            'city_kk': 'TEXT',
            'city_pt': 'TEXT',
            
            # Country translations (all 9 languages)
            'country_ru': 'TEXT',
            'country_en': 'TEXT',
            'country_ar': 'TEXT',
            'country_es': 'TEXT',
            'country_de': 'TEXT',
            'country_fr': 'TEXT',
            'country_hi': 'TEXT',
            'country_kk': 'TEXT',
            'country_pt': 'TEXT',
            
            # Hours translations
            'hours_ru': 'TEXT',
            'hours_ar': 'TEXT',
        }
        
        # Add missing columns
        added_count = 0
        for column_name, column_type in columns_to_add.items():
            if column_name not in existing_columns:
                print(f"  ➕ Adding column: {column_name}")
                c.execute(f"ALTER TABLE salon_settings ADD COLUMN {column_name} {column_type}")
                added_count += 1
        
        if added_count > 0:
            print(f"\n✅ Added {added_count} columns to salon_settings table")
        else:
            print("\n✅ All columns already exist")
        
        # Проверяем колонку promo_end_date
        c.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='salon_settings'
        """)
        columns = [row[0] for row in c.fetchall()]
        
        if 'promo_end_date' not in columns:
            c.execute("ALTER TABLE salon_settings ADD COLUMN promo_end_date TEXT")
            # Assuming log_info is defined elsewhere or will be added
            # log_info("✅ Added promo_end_date column to salon_settings", "migration")
            print("  ➕ Adding column: promo_end_date") # Added print for consistency
            
        conn.commit()
        # Assuming log_info is defined elsewhere or will be added
        # log_info("✅ Salon settings schema migration completed", "migration")
        print("\n✅ Salon settings schema migration completed") # Added print for consistency
        return True
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    migrate_salon_schema()
