"""
Migration: Add Master Info Fields
Добавляет поля experience и bio в таблицу users для мастеров
"""

import sys
import os

DATABASE_NAME = os.getenv('DATABASE_NAME', 'salon_bot.db')


def add_master_info_fields(db_path=None):
    """
    Добавляет поля для информации о мастерах:
    - experience: опыт работы (например, "5+ лет")
    - bio: краткое описание мастера
    """
    if db_path is None:
        db_path = DATABASE_NAME
    
    print("\n" + "="*60)
    print("🔧 MIGRATION: Add Master Info Fields")
    print("="*60)
    
    try:
        conn = sqlite3.connect(db_path)
        c = conn.cursor()
        
        # Проверяем существование полей
        c.execute("PRAGMA table_info(users)")
        columns = [col[1] for col in c.fetchall()]
        
        # Добавляем experience
        if 'experience' not in columns:
            print("\n1️⃣ Adding 'experience' column...")
            c.execute("ALTER TABLE users ADD COLUMN experience TEXT")
            print("   ✅ Added 'experience' column")
        else:
            print("\n1️⃣ Column 'experience' already exists")
        
        # Добавляем bio
        if 'bio' not in columns:
            print("\n2️⃣ Adding 'bio' column...")
            c.execute("ALTER TABLE users ADD COLUMN bio TEXT")
            print("   ✅ Added 'bio' column")
        else:
            print("\n2️⃣ Column 'bio' already exists")
        
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
        add_master_info_fields()
    except Exception as e:
        print(f"Migration failed: {e}")
        sys.exit(1)
