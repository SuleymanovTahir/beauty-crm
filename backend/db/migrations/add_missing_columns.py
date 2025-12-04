#!/usr/bin/env python3
"""
Миграция: Добавление отсутствующих колонок
"""
from pathlib import Path
import sys

backend_dir = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(backend_dir))

from db.connection import get_db_connection

def add_missing_columns():
    """Добавить отсутствующие колонки в таблицы"""
    print("\n" + "="*70)
    print("🔧 ДОБАВЛЕНИЕ ОТСУТСТВУЮЩИХ КОЛОНОК")
    print("="*70)
    
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        # 1. broadcast_history - добавить subscription_type, channels, subject
        print("\n📋 broadcast_history:")
        c.execute("""
            ALTER TABLE broadcast_history 
            ADD COLUMN IF NOT EXISTS subscription_type TEXT,
            ADD COLUMN IF NOT EXISTS channels TEXT,
            ADD COLUMN IF NOT EXISTS subject TEXT
        """)
        print("  ✅ Добавлены: subscription_type, channels, subject")
        
        # 2. positions - добавить is_active
        print("\n📋 positions:")
        c.execute("""
            ALTER TABLE positions 
            ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE
        """)
        print("  ✅ Добавлена: is_active")
        
        # 3. plans - добавить metric_type, target_value, period_type
        print("\n📋 plans:")
        c.execute("""
            ALTER TABLE plans 
            ADD COLUMN IF NOT EXISTS metric_type TEXT DEFAULT 'revenue',
            ADD COLUMN IF NOT EXISTS target_value REAL,
            ADD COLUMN IF NOT EXISTS period_type TEXT DEFAULT 'monthly'
        """)
        print("  ✅ Добавлены: metric_type, target_value, period_type")
        
        conn.commit()
        print("\n" + "="*70)
        print("✅ ВСЕ КОЛОНКИ УСПЕШНО ДОБАВЛЕНЫ")
        print("="*70)
        
    except Exception as e:
        conn.rollback()
        print(f"\n❌ Ошибка: {e}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    add_missing_columns()
