"""
Consolidated Salon Settings Schema Migration
All schema changes for salon_settings table in one place
"""
import sqlite3


def migrate_salon_schema(db_path="salon_bot.db"):
    """
    Apply all salon_settings table schema changes
    """
    print("\n" + "="*60)
    print("🔧 SALON SETTINGS SCHEMA MIGRATION")
    print("="*60)
    
    conn = sqlite3.connect(db_path)
    c = conn.cursor()
    
    try:
        # Get existing columns
        c.execute("PRAGMA table_info(salon_settings)")
        existing_columns = {col[1] for col in c.fetchall()}
        
        # Define all columns that should exist
        columns_to_add = {
            'hours_weekdays': 'TEXT',
            'hours_weekends': 'TEXT',
            'payment_methods': 'TEXT DEFAULT "Наличные, карта"',
            'prepayment_required': 'INTEGER DEFAULT 0',
            'parking_info': 'TEXT',
            'wifi_available': 'INTEGER DEFAULT 1',
            'google_place_id': 'TEXT',  # ✅ From add_google_fields.py
            'google_api_key': 'TEXT',   # ✅ From add_google_fields.py
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
        c.execute("PRAGMA table_info(salon_settings)")
        columns = [row[1] for row in c.fetchall()]
        
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
