#!/usr/bin/env python3
"""
FINAL FIX: Clean all service translations
This will be integrated into run_all_migrations()
"""

import sys
from pathlib import Path

backend_dir = Path(__file__).parent.parent.parent
sys.path.insert(0, str(backend_dir))

from db.connection import get_db_connection

def clean_all_service_translations():
    """Clean and fix all service translations"""
    
    print("🧹 Cleaning all service translations...")
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # 1. Remove all bad prefixes and mixed language text
        print("\n📝 Step 1: Removing bad prefixes and mixed text...")
        
        cursor.execute("""
            UPDATE services
            SET 
                -- Remove prefixes from description
                description = REGEXP_REPLACE(description, '^(Услуга|Service|Сервис|Служба)[:：\\s-]+', '', 'gi'),
                
                -- Remove prefixes AND fix mixed language in description_ru
                description_ru = REPLACE(REPLACE(REPLACE(
                    REGEXP_REPLACE(description_ru, '^(Услуга|Service|Сервис|Служба)[:：\\s-]+', '', 'gi'),
                    ' nails', ' ногтей'),
                    'nails ', 'ногтей '),
                    'nails', 'ногтей'
                ),
                
                -- Remove prefixes from description_en
                description_en = REGEXP_REPLACE(description_en, '^(Услуга|Service|Сервис|Служба)[:：\\s-]+', '', 'gi')
                
            WHERE 
                description ~ '(Услуга|Service|Сервис|Служба)[:：\\s-]'
                OR description_ru ~ '(Услуга|Service|Сервис|Служба)[:：\\s-]'
                OR description_ru ~ 'nails'
        """)
        
        rows_updated = cursor.rowcount
        print(f"   ✅ Cleaned {rows_updated} services")
        
        # 2. Clear all non-Russian/non-English descriptions to force re-translation
        print("\n📝 Step 2: Clearing non-Russian/English descriptions...")
        
        cursor.execute("""
            UPDATE services
            SET 
                description_ar = NULL,
                description_de = NULL,
                description_es = NULL,
                description_fr = NULL,
                description_hi = NULL,
                description_kk = NULL,
                description_pt = NULL
        """)
        
        print(f"   ✅ Cleared translations for re-generation")
        
        conn.commit()
        print(f"\n✅ All services cleaned!")
        print("💡 Next: Run 'npm run db:i18n:auto' to regenerate clean translations")
        
    except Exception as e:
        conn.rollback()
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    clean_all_service_translations()
