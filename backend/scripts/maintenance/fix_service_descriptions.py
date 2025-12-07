#!/usr/bin/env python3
"""
Fix service descriptions in database:
1. Replace "Imported from CSV" with proper descriptions
2. Fix "Починка 1 ноготь" to "Коррекция 1 ногтя"
"""

import sys
from pathlib import Path

# Add backend to path
backend_dir = Path(__file__).parent.parent.parent
sys.path.insert(0, str(backend_dir))

from db.connection import get_db_connection

def generate_description(service_name: str, lang: str = 'ru') -> str:
    """Generate a proper description based on service name"""
    
    # Common patterns for descriptions
    descriptions = {
        'ru': {
            'маникюр': 'Профессиональный маникюр',
            'педикюр': 'Профессиональный педикюр',
            'массаж': 'Расслабляющий массаж',
            'эпиляция': 'Качественная эпиляция',
            'окрашивание': 'Окрашивание волос',
            'стрижка': 'Стрижка волос',
            'укладка': 'Укладка волос',
            'наращивание': 'Наращивание',
            'ламинирование': 'Ламинирование',
        },
        'en': {
            'manicure': 'Professional manicure',
            'pedicure': 'Professional pedicure',
            'massage': 'Relaxing massage',
            'waxing': 'Quality waxing',
            'hair': 'Hair service',
            'nail': 'Nail service',
            'extension': 'Extension service',
            'gel': 'Gel service',
        }
    }
    
    service_lower = service_name.lower()
    
    # Try to match patterns
    for pattern, desc in descriptions[lang].items():
        if pattern in service_lower:
            return desc
    
    # Default description
    if lang == 'ru':
        return f'Услуга: {service_name}'
    else:
        return f'{service_name} service'

def fix_services():
    """Fix service descriptions in database"""
    
    print("🔧 Fixing service descriptions in database...")
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # 1. Fix "Imported from CSV" descriptions
        print("\n📝 Fixing 'Imported from CSV' descriptions...")
        
        cursor.execute("""
            SELECT id, name, name_ru, name_en, description
            FROM services
            WHERE description = 'Imported from CSV' 
               OR description LIKE '%Imported from CSV%'
        """)
        
        services_to_fix = cursor.fetchall()
        print(f"   Found {len(services_to_fix)} services with 'Imported from CSV'")
        
        for service_id, name, name_ru, name_en, desc in services_to_fix:
            # Use name_ru if available, otherwise name, otherwise name_en
            service_name = name_ru or name or name_en or 'Service'
            service_name_en = name_en or name or 'Service'
            
            # Generate proper descriptions
            new_desc_ru = generate_description(service_name, 'ru')
            new_desc_en = generate_description(service_name_en, 'en')
            
            # Update all description fields
            cursor.execute("""
                UPDATE services
                SET description = %s,
                    description_ru = %s,
                    description_en = %s,
                    description_ar = %s,
                    description_de = %s,
                    description_es = %s,
                    description_fr = %s,
                    description_hi = %s,
                    description_kk = %s,
                    description_pt = %s
                WHERE id = %s
            """, (new_desc_ru, new_desc_ru, new_desc_en, new_desc_en, 
                  new_desc_en, new_desc_en, new_desc_en, new_desc_en, 
                  new_desc_ru, new_desc_en, service_id))
            
            print(f"   ✅ {service_name}: 'Imported from CSV' → '{new_desc_ru}'")
        
        # 2. Fix "Починка 1 ноготь" to "Коррекция 1 ногтя"
        print("\n🔧 Fixing 'Починка 1 ноготь'...")
        
        cursor.execute("""
            SELECT id, name, name_ru, name_en
            FROM services
            WHERE name LIKE '%починка%' OR name LIKE '%Починка%'
               OR name_ru LIKE '%починка%' OR name_ru LIKE '%Починка%'
        """)
        
        repair_services = cursor.fetchall()
        print(f"   Found {len(repair_services)} services with 'починка'")
        
        for service_id, name, name_ru, name_en in repair_services:
            # Fix Russian name
            if name and 'починка' in name.lower():
                new_name = name.replace('Починка', 'Коррекция').replace('починка', 'коррекция')
            elif name_ru and 'починка' in name_ru.lower():
                new_name = name_ru.replace('Починка', 'Коррекция').replace('починка', 'коррекция')
            else:
                new_name = name or name_ru
            
            new_name_en = 'Nail correction' if 'ноготь' in (name or name_ru or '').lower() else (name_en or 'Nail service')
            new_desc_ru = 'Коррекция одного ногтя' if 'ноготь' in (name or name_ru or '').lower() else generate_description(new_name, 'ru')
            new_desc_en = 'Correction of one nail' if 'ноготь' in (name or name_ru or '').lower() else generate_description(new_name_en, 'en')
            
            cursor.execute("""
                UPDATE services
                SET name = %s,
                    name_ru = %s,
                    name_en = %s,
                    description = %s,
                    description_ru = %s,
                    description_en = %s
                WHERE id = %s
            """, (new_name, new_name, new_name_en, new_desc_ru, new_desc_ru, new_desc_en, service_id))
            
            print(f"   ✅ '{name or name_ru}' → '{new_name}'")
        
        # Commit changes
        conn.commit()
        
        total_fixed = len(services_to_fix) + len(repair_services)
        print(f"\n✅ Fixed {total_fixed} services in database!")
        
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
    fix_services()
