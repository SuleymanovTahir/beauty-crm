#!/usr/bin/env python3
"""
Fix service descriptions properly:
1. Remove "Услуга: " prefix from descriptions
2. Set proper Russian descriptions for services
3. Leave English names as-is for translation system
"""

import sys
from pathlib import Path

backend_dir = Path(__file__).parent.parent.parent
sys.path.insert(0, str(backend_dir))

from db.connection import get_db_connection

# Proper service descriptions mapping
SERVICE_DESCRIPTIONS = {
    # Nails
    'acrylic extension': 'Наращивание ногтей акрилом',
    'acrylic overlay': 'Покрытие акрилом',
    'change gel': 'Смена гель-лака',
    'french': 'Французский маникюр',
    'gel extension': 'Наращивание ногтей гелем',
    'gel overlay': 'Покрытие гелем',
    'hard gel': 'Твердый гель',
    'nail design': 'Дизайн ногтей',
    'pedicure basic': 'Базовый педикюр',
    'pedicure classic': 'Классический педикюр',
    'pedicure gel': 'Педикюр с гель-лаком',
    'podology': 'Подология',
    'remove classic': 'Снятие обычного лака',
    'remove gel': 'Снятие гель-лака',
    'remove nail extensions': 'Снятие наращенных ногтей',
    'spa pedicure': 'СПА-педикюр',
    
    # Hair
    'hair cut': 'Стрижка волос',
    'hair wash': 'Мытье волос',
    'hair style': 'Укладка волос',
    'hair treatment': 'Уход за волосами',
    'hair extension (only removal)': 'Снятие наращенных волос',
    'hair extensions (1 can)': 'Наращивание волос (1 капсула)',
    'trimming without wash': 'Подравнивание кончиков без мытья',
    
    # Massage
    'anti-cellulite massage': 'Антицеллюлитный массаж',
    'back 30 min': 'Массаж спины 30 мин',
    'back massage (5-10)': 'Массаж спины (курс 5-10)',
    'classic general massage': 'Классический общий массаж',
    'full body 60 min': 'Массаж всего тела 60 мин',
    'head 40 min': 'Массаж головы 40 мин',
    'hotstone': 'Массаж горячими камнями',
    'leg/feet/ hand 40 min': 'Массаж ног/стоп/рук 40 мин',
    'moroccan bath loofa': 'Марокканская баня с люфой',
    'moroccan bathhouse': 'Марокканская баня',
    'neck & shoulder 30 min': 'Массаж шеи и плеч 30 мин',
    'sculpture body massage': 'Скульптурный массаж тела',
    
    # Promo
    'blow dry packages 5': 'Пакет укладок (5 шт)',
    'combo basic 150': 'Комбо базовый',
    'promo 390': 'Акция 390',
    'promo mani pedi 250': 'Акция маникюр+педикюр',
    'promotion overlay manicure': 'Акционный маникюр с покрытием',
    
    # Waxing
    'brazilian': 'Бразильская эпиляция',
    'cheeks': 'Эпиляция щек',
    'full body': 'Эпиляция всего тела',
    'under arms': 'Эпиляция подмышек',
    'upper lip': 'Эпиляция верхней губы',
}

def fix_descriptions():
    """Fix service descriptions properly"""
    
    print("🔧 Fixing service descriptions...")
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # 1. Remove "Услуга: " prefix from all descriptions
        print("\n📝 Removing 'Услуга: ' prefix...")
        
        cursor.execute("""
            UPDATE services
            SET description = REPLACE(description, 'Услуга: ', ''),
                description_ru = REPLACE(description_ru, 'Услуга: ', ''),
                description_en = REPLACE(description_en, 'Услуга: ', ''),
                description_ar = REPLACE(description_ar, 'الخدمة: ', ''),
                description_es = REPLACE(description_es, 'Servicio: ', ''),
                description_de = REPLACE(description_de, 'Service: ', ''),
                description_fr = REPLACE(description_fr, 'Service : ', ''),
                description_pt = REPLACE(description_pt, 'Serviço: ', ''),
                description_hi = REPLACE(description_hi, 'सेवा: ', ''),
                description_kk = REPLACE(description_kk, 'Қызмет: ', '')
            WHERE description LIKE 'Услуга:%' 
               OR description_ru LIKE 'Услуга:%'
               OR description_en LIKE 'Service:%'
        """)
        
        print(f"   ✅ Removed prefixes")
        
        # 2. Set proper Russian descriptions based on English names
        print("\n📝 Setting proper Russian descriptions...")
        
        cursor.execute("SELECT id, name, name_en FROM services WHERE name_en IS NOT NULL")
        services = cursor.fetchall()
        
        fixed_count = 0
        for service_id, name, name_en in services:
            name_lower = (name_en or name or '').lower().strip()
            
            if name_lower in SERVICE_DESCRIPTIONS:
                desc_ru = SERVICE_DESCRIPTIONS[name_lower]
                
                cursor.execute("""
                    UPDATE services
                    SET description = %s,
                        description_ru = %s
                    WHERE id = %s
                """, (desc_ru, desc_ru, service_id))
                
                print(f"   ✅ {name_en}: '{desc_ru}'")
                fixed_count += 1
        
        print(f"\n   Fixed {fixed_count} service descriptions")
        
        conn.commit()
        print(f"\n✅ All fixes applied!")
        
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
    fix_descriptions()
