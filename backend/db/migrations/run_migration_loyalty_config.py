#!/usr/bin/env python3
"""
Миграция: Расширение настроек программы лояльности
"""
from db.connection import get_db_connection
import os
import sys

# Получаем DATABASE_NAME из конфига (если запускается напрямую)
if 'DATABASE_NAME' not in globals():
    backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
    if backend_dir not in sys.path:
        sys.path.insert(0, backend_dir)
    from core.config import DATABASE_NAME

def migrate_loyalty_config():
    print("🔧 Migrating loyalty configuration...")
    conn = get_db_connection()
    c = conn.cursor()

    try:
        # 1. Add loyalty_points_conversion_rate to salon_settings
        print("  Checking salon_settings for loyalty_points_conversion_rate...")
        c.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='salon_settings' AND column_name='loyalty_points_conversion_rate'
        """)
        if not c.fetchone():
            print("  ➕ Adding loyalty_points_conversion_rate column...")
            c.execute("ALTER TABLE salon_settings ADD COLUMN loyalty_points_conversion_rate REAL DEFAULT 0.1")
        else:
            print("  ✅ Column exists")

        # 2. Create loyalty_category_rules table
        print("  Checking loyalty_category_rules table...")
        c.execute("""
            CREATE TABLE IF NOT EXISTS loyalty_category_rules (
                category TEXT PRIMARY KEY,
                points_multiplier REAL DEFAULT 1.0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        print("  ✅ Table loyalty_category_rules ensured")

        conn.commit()
        print("\n🎉 Loyalty config migration completed successfully!")
        return True

    except Exception as e:
        print(f"❌ Error: {e}")
        conn.rollback()
        return False
    finally:
        conn.close()

if __name__ == "__main__":
    migrate_loyalty_config()
