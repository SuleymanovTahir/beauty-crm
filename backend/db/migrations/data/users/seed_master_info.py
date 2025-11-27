"""
Migration: Seed Master Info
Заполняет начальные данные для мастеров (experience, bio)
"""

import sqlite3
import sys
import os

DATABASE_NAME = os.getenv('DATABASE_NAME', 'salon_bot.db')


def seed_master_info(db_path=None):
    """
    Заполняет начальные данные для мастеров
    """
    if db_path is None:
        db_path = DATABASE_NAME
    
    print("\n" + "="*60)
    print("🔧 DATA MIGRATION: Seed Master Info")
    print("="*60)
    
    try:
        conn = sqlite3.connect(db_path)
        c = conn.cursor()
        
        # Проверяем наличие полей
        c.execute("PRAGMA table_info(users)")
        columns = [col[1] for col in c.fetchall()]
        
        if 'experience' not in columns or 'bio' not in columns:
            print("\n⚠️  Fields 'experience' or 'bio' not found in users table")
            print("   Run schema migration first: add_master_info_fields.py")
            conn.close()
            return False
        
        # Обновляем мастеров с пустыми полями
        print("\n1️⃣ Setting default experience and bio for masters...")
        c.execute("""
            UPDATE users 
            SET 
                experience = COALESCE(experience, '5+ лет'),
                bio = COALESCE(bio, 'Профессиональный мастер с большим опытом')
            WHERE role IN ('master', 'employee') 
            AND is_service_provider = 1
        """)
        
        if c.rowcount > 0:
            print(f"   ✅ Updated {c.rowcount} master(s)")
        else:
            print("   ℹ️  No masters found or already have info")
        
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
        seed_master_info()
    except Exception as e:
        print(f"Migration failed: {e}")
        sys.exit(1)
