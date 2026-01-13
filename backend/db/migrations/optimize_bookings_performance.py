#!/usr/bin/env python3
"""
Оптимизация индексов для таблицы bookings
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from db.connection import get_db_connection

def optimize_bookings_indexes():
    """Добавить индексы для оптимизации запросов к bookings"""
    conn = get_db_connection()
    c = conn.cursor()
    
    indexes = [
        # Для фильтрации по deleted_at (основной WHERE)
        ("idx_bookings_deleted_at", "CREATE INDEX IF NOT EXISTS idx_bookings_deleted_at ON bookings(deleted_at) WHERE deleted_at IS NULL"),
        
        # Для сортировки по datetime
        ("idx_bookings_datetime_desc", "CREATE INDEX IF NOT EXISTS idx_bookings_datetime_desc ON bookings(datetime DESC) WHERE deleted_at IS NULL"),
        
        # Для фильтрации по master
        ("idx_bookings_master_datetime", "CREATE INDEX IF NOT EXISTS idx_bookings_master_datetime ON bookings(master, datetime DESC) WHERE deleted_at IS NULL"),
        
        # Для фильтрации по user_id (RBAC)
        ("idx_bookings_user_datetime", "CREATE INDEX IF NOT EXISTS idx_bookings_user_datetime ON bookings(user_id, datetime DESC) WHERE deleted_at IS NULL"),
        
        # Для поиска по instagram_id
        ("idx_bookings_instagram", "CREATE INDEX IF NOT EXISTS idx_bookings_instagram ON bookings(instagram_id) WHERE deleted_at IS NULL"),
        
        # Для поиска по телефону
        ("idx_bookings_phone", "CREATE INDEX IF NOT EXISTS idx_bookings_phone ON bookings(phone) WHERE deleted_at IS NULL"),
        
        # Для поиска по имени (с LIKE)
        ("idx_bookings_name_trgm", "CREATE INDEX IF NOT EXISTS idx_bookings_name_trgm ON bookings USING gin(name gin_trgm_ops) WHERE deleted_at IS NULL"),
        
        # Для поиска по service_name (с LIKE)
        ("idx_bookings_service_trgm", "CREATE INDEX IF NOT EXISTS idx_bookings_service_trgm ON bookings USING gin(service_name gin_trgm_ops) WHERE deleted_at IS NULL"),
        
        # Composite index для частых запросов
        ("idx_bookings_status_datetime", "CREATE INDEX IF NOT EXISTS idx_bookings_status_datetime ON bookings(status, datetime DESC) WHERE deleted_at IS NULL"),
    ]
    
    print("🔧 Оптимизация индексов для таблицы bookings...")
    
    # Включаем расширение pg_trgm для быстрого LIKE поиска
    try:
        c.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")
        conn.commit()
        print("✅ Расширение pg_trgm включено")
    except Exception as e:
        print(f"⚠️ Не удалось включить pg_trgm: {e}")
        conn.rollback()
    
    for idx_name, idx_sql in indexes:
        try:
            print(f"  Creating {idx_name}...")
            c.execute(idx_sql)
            conn.commit()
            print(f"  ✅ {idx_name}")
        except Exception as e:
            print(f"  ⚠️ {idx_name}: {e}")
            conn.rollback()
    
    # Анализируем таблицу для обновления статистики
    try:
        c.execute("ANALYZE bookings")
        conn.commit()
        print("✅ Статистика таблицы bookings обновлена")
    except Exception as e:
        print(f"⚠️ Ошибка при обновлении статистики: {e}")
    
    conn.close()
    print("\n✅ Оптимизация завершена!")

if __name__ == "__main__":
    optimize_bookings_indexes()
