"""
Миграция: Назначение услуг без мастеров

Назначения:
- Waxing (6, 14, 79) → GULYA (ID: 5) - уже делает Waxing
- Nails (51, 67-77) → GULYA, JENNIFER, LYAZZAT (ID: 5, 6, 4)
- Promo (96-99) → GULYA, JENNIFER, LYAZZAT  
- Facial (42-45) → JENNIFER (ID: 6) - делает Massage, Facial близко по тематике
"""

import sys
import os
# Go up 3 levels: consolidated -> migrations -> db -> backend
backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
sys.path.insert(0, backend_dir)

from db.connection import get_db_connection
from datetime import datetime

def run_migration():
    print("🔧 Запуск миграции: Назначение услуг без мастеров")
    
    conn = get_db_connection()
    c = conn.cursor()
    
    # Мастера
    GULYA = 5
    JENNIFER = 6
    LYAZZAT = 4
    
    # Услуги по категориям
    waxing_services = [6, 14, 79]  # Full Bikini, Underarms, Under arms
    
    nails_services = [
        51,  # Baby Manicure
        67,  # French
        68,  # Hard gel
        69,  # Nail design
        70,  # Починка 1 ноготь
        71,  # Накладные ногти
        72,  # Podology
        74,  # Gel overlay
        75,  # Gel extension
        76,  # Acrylic overlay
        77,  # Acrylic extension
    ]
    
    promo_services = [96, 97, 98, 99]  # Promo 390, Promotion overlay, Promo mani pedi, Combo basic
    
    facial_services = [42, 43, 44, 45]  # Deep Cleaning, Medical, Massage, Peeling
    
    assigned_count = 0
    
    # 1. Waxing → GULYA
    print("\n📌 Waxing → GULYA")
    for service_id in waxing_services:
        c.execute("""
            INSERT INTO user_services (user_id, service_id, created_at)
            VALUES (%s, %s, %s)
            ON CONFLICT (user_id, service_id) DO NOTHING
        """, (GULYA, service_id, datetime.now()))
        if c.rowcount > 0:
            assigned_count += 1
            print(f"   ➕ Услуга {service_id} → GULYA")
    
    # 2. Nails → GULYA, JENNIFER, LYAZZAT
    print("\n📌 Nails → GULYA, JENNIFER, LYAZZAT")
    for master_id in [GULYA, JENNIFER, LYAZZAT]:
        for service_id in nails_services:
            c.execute("""
                INSERT INTO user_services (user_id, service_id, created_at)
                VALUES (%s, %s, %s)
                ON CONFLICT (user_id, service_id) DO NOTHING
            """, (master_id, service_id, datetime.now()))
            if c.rowcount > 0:
                assigned_count += 1
                master_name = {GULYA: "GULYA", JENNIFER: "JENNIFER", LYAZZAT: "LYAZZAT"}[master_id]
                print(f"   ➕ Услуга {service_id} → {master_name}")
    
    # 3. Promo → GULYA, JENNIFER, LYAZZAT
    print("\n📌 Promo → GULYA, JENNIFER, LYAZZAT")
    for master_id in [GULYA, JENNIFER, LYAZZAT]:
        for service_id in promo_services:
            c.execute("""
                INSERT INTO user_services (user_id, service_id, created_at)
                VALUES (%s, %s, %s)
                ON CONFLICT (user_id, service_id) DO NOTHING
            """, (master_id, service_id, datetime.now()))
            if c.rowcount > 0:
                assigned_count += 1
                master_name = {GULYA: "GULYA", JENNIFER: "JENNIFER", LYAZZAT: "LYAZZAT"}[master_id]
                print(f"   ➕ Услуга {service_id} → {master_name}")
    
    # 4. Facial → JENNIFER (массажист)
    print("\n📌 Facial → JENNIFER")
    for service_id in facial_services:
        c.execute("""
            INSERT INTO user_services (user_id, service_id, created_at)
            VALUES (%s, %s, %s)
            ON CONFLICT (user_id, service_id) DO NOTHING
        """, (JENNIFER, service_id, datetime.now()))
        if c.rowcount > 0:
            assigned_count += 1
            print(f"   ➕ Услуга {service_id} → JENNIFER")
    
    conn.commit()
    conn.close()
    
    print(f"\n✅ Миграция завершена! Назначено {assigned_count} услуг.")
    
    # Проверка
    print("\n📊 Проверка - услуги без мастеров после миграции:")
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("""
        SELECT s.id, s.name, s.category
        FROM services s
        LEFT JOIN user_services us ON s.id = us.service_id
        WHERE s.is_active = TRUE AND us.id IS NULL
        ORDER BY s.category, s.id
    """)
    orphans = c.fetchall()
    if orphans:
        for row in orphans:
            print(f"   ⚠️  ID: {row[0]} | {row[1]} | {row[2]}")
    else:
        print("   🎉 Все активные услуги имеют мастеров!")
    conn.close()

if __name__ == "__main__":
    run_migration()
