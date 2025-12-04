#!/usr/bin/env python3
"""
Скрипт для массового исправления PostgreSQL ошибок после миграции
"""
import os
import sys
import os
from pathlib import Path

# Add backend to path
backend_dir = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(backend_dir))

from db.connection import get_db_connection

def fix_missing_columns():
    """Добавить отсутствующие колонки в таблицы"""
    print("\n" + "="*70)
    print("🔧 ИСПРАВЛЕНИЕ ОТСУТСТВУЮЩИХ КОЛОНОК")
    print("="*70)
    
    conn = get_db_connection()
    c = conn.cursor()
    
    fixes = []
    
    # 1. Проверить колонку metric_type в plans
    try:
        c.execute("SELECT metric_type FROM plans LIMIT 1")
        print("✓ plans.metric_type существует")
    except Exception as e:
        if "does not exist" in str(e):
            fixes.append(("plans", "metric_type", "ALTER TABLE plans ADD COLUMN IF NOT EXISTS metric_type TEXT DEFAULT 'revenue'"))
            print("❌ plans.metric_type отсутствует - будет добавлена")
    
    # 2. Проверить колонку subscription_type в broadcast_history  
    try:
        c.execute("SELECT subscription_type FROM broadcast_history LIMIT 1")
        print("✓ broadcast_history.subscription_type существует")
    except Exception as e:
        if "does not exist" in str(e):
            fixes.append(("broadcast_history", "subscription_type", "ALTER TABLE broadcast_history ADD COLUMN IF NOT EXISTS subscription_type TEXT"))
            print("❌ broadcast_history.subscription_type отсутствует - будет добавлена")
    
    # 3. Проверить тип is_active в positions
    try:
        c.execute("""
            SELECT data_type 
            FROM information_schema.columns 
            WHERE table_name='positions' AND column_name='is_active'
        """)
        row = c.fetchone()
        if row and row[0] == 'boolean':
            print("✓ positions.is_active имеет тип BOOLEAN")
        else:
            fixes.append(("positions", "is_active type", "ALTER TABLE positions ALTER COLUMN is_active TYPE BOOLEAN USING (is_active::int::boolean)"))
            print(f"❌ positions.is_active имеет неправильный тип: {row[0] if row else 'unknown'}")
    except Exception as e:
        print(f"⚠️  Ошибка проверки positions.is_active: {e}")
    
    # Применяем исправления
    if fixes:
        print(f"\n📝 Применяю {len(fixes)} исправлений...")
        for table, column, sql in fixes:
            try:
                c.execute(sql)
                conn.commit()
                print(f"  ✅ {table}.{column} исправлено")
            except Exception as e:
                print(f"  ❌ Ошибка при исправлении {table}.{column}: {e}")
                conn.rollback()
    else:
        print("\n✅ Все колонки в порядке!")
    
    conn.close()

if __name__ == "__main__":
    try:
        fix_missing_columns()
        print("\n" + "="*70)
        print("✅ ИСПРАВЛЕНИЯ ЗАВЕРШЕНЫ")
        print("="*70)
    except Exception as e:
        print(f"\n❌ Ошибка: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
