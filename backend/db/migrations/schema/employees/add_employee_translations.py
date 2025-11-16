"""
Миграция: Добавить переводы имён мастеров
"""
import sqlite3
from core.config import DATABASE_NAME

def add_employee_translations():
    """Добавить поля name_ru и name_ar для мастеров"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    # Проверяем существуют ли поля
    c.execute("PRAGMA table_info(employees)")
    columns = [col[1] for col in c.fetchall()]
    
    if 'name_ru' not in columns:
        print("➕ Добавляем поле name_ru")
        c.execute("ALTER TABLE employees ADD COLUMN name_ru TEXT")
    
    if 'name_ar' not in columns:
        print("➕ Добавляем поле name_ar")
        c.execute("ALTER TABLE employees ADD COLUMN name_ar TEXT")
    
    # Заполняем переводы для существующих мастеров
    translations = {
        'SIMO': {
            'ru': 'Симо',
            'ar': 'سيمو'
        },
        'MESTAN': {
            'ru': 'Местан',
            'ar': 'ميستان'
        },
        'LYAZZAT': {
            'ru': 'Ляззат',
            'ar': 'ليازات'
        },
        'GULYA': {
            'ru': 'Гуля',
            'ar': 'جوليا'
        },
        'JENNIFER': {
            'ru': 'Дженнифер',
            'ar': 'جينيفر'
        },
        'KARINA': {
            'ru': 'Карина',
            'ar': 'كارينا'
        }
    }
    
    for name, trans in translations.items():
        c.execute("""
            UPDATE employees 
            SET name_ru = ?, name_ar = ?
            WHERE full_name = ? OR full_name LIKE ?
        """, (trans['ru'], trans['ar'], name, f"{name}%"))
        
        if c.rowcount > 0:
            print(f"   ✅ {name} → {trans['ru']} / {trans['ar']}")
    
    conn.commit()
    
    # Проверяем результат
    c.execute("""
        SELECT full_name, name_ru, name_ar 
        FROM employees 
        WHERE is_active = 1
    """)
    
    print("\n📋 Результат:")
    for name, name_ru, name_ar in c.fetchall():
        print(f"   {name}: ru={name_ru}, ar={name_ar}")
    
    conn.close()
    return True


if __name__ == "__main__":
    print("=" * 70)
    print("🌍 ДОБАВЛЕНИЕ ПЕРЕВОДОВ ИМЁН МАСТЕРОВ")
    print("=" * 70)
    
    success = add_employee_translations()
    
    if success:
        print("\n✅ УСПЕХ! Переводы добавлены")
    else:
        print("\n❌ ОШИБКА!")
    
    print("=" * 70)