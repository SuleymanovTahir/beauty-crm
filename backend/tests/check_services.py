# Создай файл backend/check_services.py

import sqlite3
import sys
import os

# Добавляем путь к backend
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from core.config import DATABASE_NAME

def check_services():
    """Проверить какие услуги есть в БД"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    print("=" * 60)
    print("🔍 ПРОВЕРКА УСЛУГ В БД")
    print("=" * 60)
    
    # Все услуги
    c.execute("""
        SELECT id, name, name_ru, name_ar, is_active, category 
        FROM services 
        ORDER BY category, name
    """)
    services = c.fetchall()
    
    if not services:
        print("❌ УСЛУГ НЕТ В БД!")
        conn.close()
        return
    
    print(f"\n📊 Всего услуг: {len(services)}")
    print(f"✅ Активных: {sum(1 for s in services if s[4] == 1)}")
    print(f"⏸️  Неактивных: {sum(1 for s in services if s[4] == 0)}")
    
    print("\n" + "=" * 60)
    print("СПИСОК УСЛУГ:")
    print("=" * 60)
    
    current_category = None
    for s in services:
        id, name, name_ru, name_ar, is_active, category = s
        
        if category != current_category:
            print(f"\n📂 {category or 'Без категории'}:")
            current_category = category
        
        status = "✅" if is_active else "⏸️"
        print(f"  {status} ID={id:3d} | EN: {name:20s} | RU: {name_ru or '—':20s}")
    
    print("\n" + "=" * 60)
    print("ПРОВЕРКА КЛЮЧЕВЫХ УСЛУГ:")
    print("=" * 60)
    
    # Проверяем ключевые услуги которые ищет бот
    key_services = ['Manicure', 'Pedicure', 'Hair', 'Massage']
    
    for key in key_services:
        c.execute("""
            SELECT id, name, name_ru, is_active 
            FROM services 
            WHERE name LIKE ? OR name_ru LIKE ?
            LIMIT 1
        """, (f"%{key}%", f"%{key}%"))
        
        result = c.fetchone()
        if result:
            status = "✅" if result[3] else "⏸️ НЕАКТИВНА"
            print(f"{status} {key:15s} найдена: ID={result[0]}, {result[1]}")
        else:
            print(f"❌ {key:15s} НЕ НАЙДЕНА!")
    
    conn.close()
    print("\n" + "=" * 60)

if __name__ == "__main__":
    check_services()