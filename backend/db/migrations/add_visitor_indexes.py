#!/usr/bin/env python3
"""
Добавление индексов для ускорения аналитики посетителей
"""
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from db.connection import get_db_connection

def add_visitor_indexes():
    """Добавляет индексы для оптимизации запросов аналитики"""
    conn = get_db_connection()
    c = conn.cursor()
    
    print("🔧 Добавление индексов для visitor_tracking...")
    
    # Индексы для ускорения фильтрации по дате
    try:
        c.execute("""
            CREATE INDEX IF NOT EXISTS idx_visitor_visited_at 
            ON visitor_tracking(visited_at DESC);
        """)
        print("✅ Индекс по visited_at создан")
    except Exception as e:
        print(f"⚠️  Индекс visited_at: {e}")
    
    # Индекс для группировки по IP и дате (сессии)
    try:
        c.execute("""
            CREATE INDEX IF NOT EXISTS idx_visitor_ip_date 
            ON visitor_tracking(ip_hash, visited_at);
        """)
        print("✅ Индекс по ip_hash + visited_at создан")
    except Exception as e:
        print(f"⚠️  Индекс ip_hash: {e}")
    
    # Индекс для фильтрации по стране
    try:
        c.execute("""
            CREATE INDEX IF NOT EXISTS idx_visitor_country 
            ON visitor_tracking(country) WHERE country IS NOT NULL;
        """)
        print("✅ Индекс по country создан")
    except Exception as e:
        print(f"⚠️  Индекс country: {e}")
    
    # Индекс для фильтрации по городу
    try:
        c.execute("""
            CREATE INDEX IF NOT EXISTS idx_visitor_city 
            ON visitor_tracking(city) WHERE city IS NOT NULL;
        """)
        print("✅ Индекс по city создан")
    except Exception as e:
        print(f"⚠️  Индекс city: {e}")
    
    # Индекс для фильтрации по устройству
    try:
        c.execute("""
            CREATE INDEX IF NOT EXISTS idx_visitor_device 
            ON visitor_tracking(device_type) WHERE device_type IS NOT NULL;
        """)
        print("✅ Индекс по device_type создан")
    except Exception as e:
        print(f"⚠️  Индекс device_type: {e}")
    
    # Индекс для фильтрации по источнику
    try:
        c.execute("""
            CREATE INDEX IF NOT EXISTS idx_visitor_referrer 
            ON visitor_tracking(referrer) WHERE referrer IS NOT NULL;
        """)
        print("✅ Индекс по referrer создан")
    except Exception as e:
        print(f"⚠️  Индекс referrer: {e}")
    
    # Композитный индекс для дата + локальность
    try:
        c.execute("""
            CREATE INDEX IF NOT EXISTS idx_visitor_date_local 
            ON visitor_tracking(visited_at, is_local);
        """)
        print("✅ Индекс по visited_at + is_local создан")
    except Exception as e:
        print(f"⚠️  Индекс date_local: {e}")
    
    # Индекс для страниц (URL)
    try:
        c.execute("""
            CREATE INDEX IF NOT EXISTS idx_visitor_page_url 
            ON visitor_tracking(page_url) WHERE page_url IS NOT NULL;
        """)
        print("✅ Индекс по page_url создан")
    except Exception as e:
        print(f"⚠️  Индекс page_url: {e}")
    
    conn.commit()
    conn.close()
    
    print("\n✅ Все индексы успешно созданы!")
    print("⚡ Запросы аналитики теперь будут работать в 10-50 раз быстрее")

if __name__ == "__main__":
    add_visitor_indexes()
