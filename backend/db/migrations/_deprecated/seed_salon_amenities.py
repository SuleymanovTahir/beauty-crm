"""
Migration: Seed Salon Amenities
Заполняет начальные данные об удобствах салона
"""

import sys
import os

DATABASE_NAME = os.getenv('DATABASE_NAME', 'salon_bot.db')


def seed_salon_amenities(db_path=None):
    """
    Заполняет начальные данные об удобствах салона
    """
    if db_path is None:
        db_path = DATABASE_NAME
    
    print("\n" + "="*60)
    print("🔧 DATA MIGRATION: Seed Salon Amenities")
    print("="*60)
    
    try:
        conn = sqlite3.connect(db_path)
        c = conn.cursor()
        
        # Проверяем наличие полей
        c.execute("PRAGMA table_info(salon_settings)")
        columns = [col[1] for col in c.fetchall()]
        
        required_fields = ['payment_methods', 'prepayment_required', 'parking_info', 'wifi_available']
        missing_fields = [f for f in required_fields if f not in columns]
        
        if missing_fields:
            print(f"\n⚠️  Missing fields: {', '.join(missing_fields)}")
            print("   Run schema migration first: add_salon_amenities.py")
            conn.close()
            return False
        
        # Обновляем настройки салона
        print("\n1️⃣ Setting salon amenities...")
        c.execute("""
            UPDATE salon_settings 
            SET 
                payment_methods = COALESCE(payment_methods, 'Наличные, карта'),
                prepayment_required = COALESCE(prepayment_required, 0),
                parking_info = COALESCE(parking_info, 'Бесплатная парковка для клиентов'),
                wifi_available = COALESCE(wifi_available, 1)
            WHERE id = 1
        """)
        
        if c.rowcount > 0:
            print(f"   ✅ Updated salon settings")
        else:
            print("   ℹ️  Salon settings already configured")
        
        # Показываем текущие настройки
        c.execute("""
            SELECT payment_methods, prepayment_required, parking_info, wifi_available 
            FROM salon_settings 
            WHERE id = 1
        """)
        row = c.fetchone()
        if row:
            print("\n📋 Current salon amenities:")
            print(f"   💳 Payment methods: {row[0]}")
            print(f"   💰 Prepayment required: {'Yes' if row[1] else 'No'}")
            print(f"   🚗 Parking info: {row[2]}")
            print(f"   📶 Wi-Fi available: {'Yes' if row[3] else 'No'}")
        
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
        seed_salon_amenities()
    except Exception as e:
        print(f"Migration failed: {e}")
        sys.exit(1)
