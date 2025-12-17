"""
================================================================================
CONSOLIDATED SERVICE ASSIGNMENTS MIGRATION
================================================================================

ЕДИНЫЙ ИСТОЧНИК ИСТИНЫ для назначения услуг мастерам.

Мастера:
- ID 2: SIMO (Hair Stylist) - Hair
- ID 3: MESTAN (Hair Stylist) - Hair  
- ID 4: LYAZZAT (Nail Master) - Nails, Lashes, Brows, Permanent Makeup, Promo
- ID 5: GULYA (Nail/Waxing) - Nails, Waxing, Lashes, Brows, Permanent Makeup, Promo
- ID 6: JENNIFER (Nail Master/Massages) - Nails, Massage, Facial, Promo

Категории услуг и их мастера:
- Hair → SIMO, MESTAN
- Nails → GULYA, JENNIFER, LYAZZAT  
- Waxing → GULYA
- Massage → JENNIFER
- Facial → JENNIFER
- Lashes → GULYA, LYAZZAT
- Brows → GULYA, LYAZZAT
- Permanent Makeup → GULYA, LYAZZAT
- Promo → GULYA, JENNIFER, LYAZZAT
================================================================================
"""

import sys
import os

# Go up to backend directory
backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
sys.path.insert(0, backend_dir)

from db.connection import get_db_connection
from datetime import datetime

# ============================================================================
# MASTER IDs
# ============================================================================
SIMO = 2
MESTAN = 3
LYAZZAT = 4
GULYA = 5
JENNIFER = 6

# ============================================================================
# CATEGORY → MASTERS MAPPING
# ============================================================================
CATEGORY_MASTERS = {
    'Hair': [SIMO, MESTAN],
    'Nails': [GULYA, JENNIFER, LYAZZAT],
    'Waxing': [GULYA],
    'Massage': [JENNIFER],
    'Facial': [JENNIFER],
    'Lashes': [GULYA, LYAZZAT],
    'Brows': [GULYA, LYAZZAT],
    'Permanent Makeup': [GULYA, LYAZZAT],
    'Promo': [GULYA, JENNIFER, LYAZZAT],
}

def run_migration():
    """
    Назначить ВСЕ услуги соответствующим мастерам на основе категории.
    Идемпотентно - можно запускать многократно.
    """
    print("=" * 80)
    print("🔧 CONSOLIDATED SERVICE ASSIGNMENTS MIGRATION")
    print("=" * 80)
    print()
    
    conn = get_db_connection()
    c = conn.cursor()
    
    # Получаем все активные услуги
    c.execute("""
        SELECT id, name, name_ru, category
        FROM services
        WHERE is_active = TRUE
        ORDER BY category, id
    """)
    services = c.fetchall()
    
    print(f"📊 Всего активных услуг: {len(services)}")
    print()
    
    assigned_total = 0
    category_stats = {}
    
    for service in services:
        service_id, name, name_ru, category = service
        service_name = name_ru or name
        
        if category not in CATEGORY_MASTERS:
            print(f"⚠️  Неизвестная категория '{category}' для услуги: {service_name} (ID: {service_id})")
            continue
        
        masters = CATEGORY_MASTERS[category]
        
        if category not in category_stats:
            category_stats[category] = {'services': 0, 'assignments': 0}
        category_stats[category]['services'] += 1
        
        for master_id in masters:
            c.execute("""
                INSERT INTO user_services (user_id, service_id, created_at)
                VALUES (%s, %s, %s)
                ON CONFLICT (user_id, service_id) DO NOTHING
            """, (master_id, service_id, datetime.now()))
            
            if c.rowcount > 0:
                assigned_total += 1
                category_stats[category]['assignments'] += 1
    
    conn.commit()
    conn.close()
    
    # Статистика
    print("\n📊 СТАТИСТИКА ПО КАТЕГОРИЯМ:")
    print("-" * 60)
    for cat, stats in sorted(category_stats.items()):
        masters_str = ", ".join([
            {SIMO: "SIMO", MESTAN: "MESTAN", LYAZZAT: "LYAZZAT", GULYA: "GULYA", JENNIFER: "JENNIFER"}[m]
            for m in CATEGORY_MASTERS.get(cat, [])
        ])
        print(f"  {cat:20} | {stats['services']:3} услуг | +{stats['assignments']:3} новых | Мастера: {masters_str}")
    
    print()
    print("=" * 80)
    print(f"✅ Миграция завершена! Новых назначений: {assigned_total}")
    print("=" * 80)
    
    # Проверка на orphans
    print("\n📊 Проверка услуг без мастеров:")
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
    conn.close()
    
    if orphans:
        print(f"   ⚠️  Осталось {len(orphans)} услуг без мастеров:")
        for row in orphans:
            print(f"      ID: {row[0]} | {row[1]} | {row[2]}")
    else:
        print("   🎉 Все активные услуги имеют мастеров!")

if __name__ == "__main__":
    run_migration()
