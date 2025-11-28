"""
Migration: Add Salon Amenities
Добавляет поля удобств в таблицу salon_settings
"""

import sqlite3
import sys
import os

DATABASE_NAME = os.getenv('DATABASE_NAME', 'salon_bot.db')


def add_salon_amenities(db_path=None):
    """
    Добавляет поля для удобств салона:
    - payment_methods: способы оплаты
    - prepayment_required: требуется ли предоплата (0/1)
    - parking_info: информация о парковке
    - wifi_available: наличие Wi-Fi (0/1)
    """
    if db_path is None:
        db_path = DATABASE_NAME
    
    print("\n" + "="*60)
    print("🔧 MIGRATION: Add Salon Amenities")
    print("="*60)
    
    try:
        conn = sqlite3.connect(db_path)
        c = conn.cursor()
        
        # Проверяем существование полей
        c.execute("PRAGMA table_info(salon_settings)")
        columns = [col[1] for col in c.fetchall()]
        
        # Добавляем payment_methods
        if 'payment_methods' not in columns:
            print("\n1️⃣ Adding 'payment_methods' column...")
            c.execute("ALTER TABLE salon_settings ADD COLUMN payment_methods TEXT DEFAULT 'Наличные, карта'")
            print("   ✅ Added 'payment_methods' column")
        else:
            print("\n1️⃣ Column 'payment_methods' already exists")
        
        # Добавляем prepayment_required
        if 'prepayment_required' not in columns:
            print("\n2️⃣ Adding 'prepayment_required' column...")
            c.execute("ALTER TABLE salon_settings ADD COLUMN prepayment_required INTEGER DEFAULT 0")
            print("   ✅ Added 'prepayment_required' column")
        else:
            print("\n2️⃣ Column 'prepayment_required' already exists")
        
        # Добавляем parking_info
        if 'parking_info' not in columns:
            print("\n3️⃣ Adding 'parking_info' column...")
            c.execute("ALTER TABLE salon_settings ADD COLUMN parking_info TEXT")
            print("   ✅ Added 'parking_info' column")
        else:
            print("\n3️⃣ Column 'parking_info' already exists")
        
        # Добавляем wifi_available
        if 'wifi_available' not in columns:
            print("\n4️⃣ Adding 'wifi_available' column...")
            c.execute("ALTER TABLE salon_settings ADD COLUMN wifi_available INTEGER DEFAULT 1")
            print("   ✅ Added 'wifi_available' column")
        else:
            print("\n4️⃣ Column 'wifi_available' already exists")
        
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
        add_salon_amenities()
    except Exception as e:
        print(f"Migration failed: {e}")
        sys.exit(1)
