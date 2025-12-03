"""
Migration: Fix Service Durations
Исправляет неправильную длительность услуг в базе данных
"""

import sys
import os

# Получаем путь к БД из переменной окружения
# или используем переданный из run_all_migrations.py
DATABASE_NAME = os.getenv('DATABASE_NAME', 'salon_bot.db')


def fix_service_durations(db_path=None):
    """
    Исправляет длительность услуг:
    1. Hair Cut Kids: 1h → 30min
    2. Manicure Gel: 2h → 1h
    3. Package of 5 Massages: 1h → 2h
    4. Keratin Treatment: 240 min → 3h
    5. Удаляет дубликаты "Уход за волосами"
    """
    if db_path is None:
        db_path = DATABASE_NAME
    
    print("\n" + "="*60)
    print("🔧 MIGRATION: Fix Service Durations")
    print("="*60)
    
    try:
        conn = sqlite3.connect(db_path)
        c = conn.cursor()
        
        # 1. Детская стрижка: 1h → 30min
        print("\n1️⃣ Fixing Hair Cut Kids duration...")
        c.execute("""
            UPDATE services 
            SET duration = '30min' 
            WHERE name = 'Hair Cut Kids' AND duration != '30min'
        """)
        if c.rowcount > 0:
            print(f"   ✅ Updated {c.rowcount} record(s)")
        else:
            print("   ℹ️  Already correct")
        
        # 2. Маникюр гель-лак: 2h → 1h
        print("\n2️⃣ Fixing Manicure Gel duration...")
        c.execute("""
            UPDATE services 
            SET duration = '1h' 
            WHERE name = 'Manicure Gel' AND duration != '1h'
        """)
        if c.rowcount > 0:
            print(f"   ✅ Updated {c.rowcount} record(s)")
        else:
            print("   ℹ️  Already correct")
        
        # 3. Пакет из 5 массажей: 1h → 2h
        print("\n3️⃣ Fixing Package of 5 Massages duration...")
        c.execute("""
            UPDATE services 
            SET duration = '2h' 
            WHERE name = 'Package of 5 Massages' AND duration != '2h'
        """)
        if c.rowcount > 0:
            print(f"   ✅ Updated {c.rowcount} record(s)")
        else:
            print("   ℹ️  Already correct")
        
        # 4. Кератиновое выпрямление: 240 → 3h
        print("\n4️⃣ Fixing Keratin Treatment duration...")
        c.execute("""
            UPDATE services 
            SET duration = '3h' 
            WHERE name = 'Keratin Treatment' AND (duration = '240' OR duration = 240)
        """)
        if c.rowcount > 0:
            print(f"   ✅ Updated {c.rowcount} record(s)")
        else:
            print("   ℹ️  Already correct")
        
        # 5. Удаляем дубликаты "Уход за волосами"
        print("\n5️⃣ Removing duplicate 'Hair Care' services...")
        
        # Сначала проверяем есть ли дубликаты
        c.execute("""
            SELECT id, name, name_ru, duration 
            FROM services 
            WHERE (name = 'Hair Care' OR name = 'Hair Treatment') 
            AND name_ru = 'Уход за волосами'
        """)
        duplicates = c.fetchall()
        
        if len(duplicates) > 1:
            print(f"   Found {len(duplicates)} duplicate services:")
            for dup in duplicates:
                print(f"   - ID {dup[0]}: {dup[1]} ({dup[2]}) - {dup[3]}")
            
            # Удаляем дубликаты, оставляем только "Кератиновое выпрямление"
            c.execute("""
                DELETE FROM services 
                WHERE (name = 'Hair Care' OR name = 'Hair Treatment') 
                AND name_ru = 'Уход за волосами'
            """)
            print(f"   ✅ Deleted {c.rowcount} duplicate record(s)")
            print("   ℹ️  Keeping only 'Hair Treatment' (3h)")
        else:
            print("   ℹ️  No duplicates found")
        
        conn.commit()
        print("\n" + "="*60)
        print("✅ Migration completed successfully!")
        print("="*60)
        
        conn.close()
        return True
        
    except Exception as e:
        print(f"\n❌ Error during migration: {e}")
        import traceback
        traceback.print_exc()
        raise


if __name__ == "__main__":
    try:
        fix_service_durations()
    except Exception as e:
        print(f"Migration failed: {e}")
        sys.exit(1)
