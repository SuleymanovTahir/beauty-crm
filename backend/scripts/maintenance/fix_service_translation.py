#!/usr/bin/env python3
"""
Скрипт для исправления неправильных переводов в БД
Исправляет 'Служба' → 'Услуга' в отзывах
"""

import psycopg2
import os

# Database connection
DB_HOST = os.getenv('DB_HOST', 'localhost')
DB_NAME = os.getenv('DB_NAME', 'beauty_crm')
DB_USER = os.getenv('DB_USER', 'postgres')
DB_PASSWORD = os.getenv('DB_PASSWORD', '')

def fix_service_translation():
    """Исправить перевод 'Служба' на 'Услуга'"""
    
    conn = psycopg2.connect(
        host=DB_HOST,
        database=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD
    )
    cursor = conn.cursor()
    
    try:
        print("🔧 Исправление переводов в public_reviews...")
        
        # 1. Проверяем текущие значения
        cursor.execute("""
            SELECT id, author_name, employee_position, employee_position_ru, employee_position_en 
            FROM public_reviews 
            WHERE employee_position LIKE '%Служба%' 
               OR employee_position_ru LIKE '%Служба%'
               OR employee_position = 'Service'
            ORDER BY id
        """)
        
        rows = cursor.fetchall()
        print(f"\n📋 Найдено {len(rows)} записей для исправления:")
        for row in rows:
            print(f"  ID {row[0]}: {row[1]} - RU: '{row[3]}', EN: '{row[4]}'")
        
        if not rows:
            print("✅ Все переводы уже корректны!")
            return
        
        # 2. Исправляем 'Служба' → 'Услуга' во всех языках
        updates = {
            'ru': 'Услуга',
            'en': 'Service',
            'ar': 'خدمة',
            'es': 'Servicio',
            'de': 'Dienstleistung',
            'fr': 'Service',
            'pt': 'Serviço',
            'hi': 'सेवा',
            'kk': 'Қызмет'
        }
        
        # Обновляем основное поле
        cursor.execute("""
            UPDATE public_reviews 
            SET employee_position = %s
            WHERE employee_position LIKE '%%Служба%%' 
               OR employee_position = 'Service'
               OR employee_position IS NULL
        """, (updates['ru'],))
        
        # Обновляем все языковые поля
        for lang, translation in updates.items():
            field = f'employee_position_{lang}'
            cursor.execute(f"""
                UPDATE public_reviews 
                SET {field} = %s
                WHERE {field} LIKE '%%Служба%%' 
                   OR {field} = 'Service'
                   OR {field} IS NULL
            """, (translation,))
            affected = cursor.rowcount
            if affected > 0:
                print(f"  ✅ {lang.upper()}: обновлено {affected} записей → '{translation}'")
        
        conn.commit()
        
        # 3. Проверяем результат
        cursor.execute("""
            SELECT id, author_name, employee_position_ru, employee_position_en 
            FROM public_reviews 
            WHERE is_active = 1
            ORDER BY id
            LIMIT 10
        """)
        
        rows = cursor.fetchall()
        print(f"\n✨ После исправления (первые 10 записей):")
        for row in rows:
            print(f"  ID {row[0]}: {row[1]} - RU: '{row[2]}', EN: '{row[3]}'")
        
        print("\n✅ Исправление завершено успешно!")
        
    except Exception as e:
        print(f"❌ Ошибка: {e}")
        conn.rollback()
    finally:
        cursor.close()
        conn.close()

if __name__ == '__main__':
    fix_service_translation()
