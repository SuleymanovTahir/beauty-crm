"""
================================================================================
UNIVERSAL SERVICE ASSIGNMENTS MIGRATION
================================================================================

Универсальная миграция для назначения услуг мастерам.
Читает специализации мастеров из БД (position) и автоматически назначает услуги.

SSOT: Специализации хранятся в поле `position` таблицы `users`.
- "Hair Stylist" → Hair
- "Nail Master" → Nails
- "Nail/Waxing" → Nails, Waxing
- "Nail Master/Massages" → Nails, Massage, Facial
- etc.

Правила назначения:
1. Мастер получает все услуги из категорий, соответствующих его position
2. Promo назначается всем, кроме Hair Stylists
3. Постоянный макияж (Permanent Makeup) → мастерам с Brows/Lashes
================================================================================
"""

import sys
import os
import re

# Go up to backend directory
backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
sys.path.insert(0, backend_dir)

from db.connection import get_db_connection
from datetime import datetime

# ============================================================================
# POSITION → CATEGORIES MAPPING (универсальное)
# ============================================================================
POSITION_CATEGORY_MAP = {
    # Hair
    'hair stylist': ['Hair'],
    'hair': ['Hair'],
    'hairdresser': ['Hair'],
    'парикмахер': ['Hair'],
    'стилист': ['Hair'],
    
    # Nails
    'nail master': ['Nails'],
    'nail': ['Nails'],
    'nails': ['Nails'],
    'маникюр': ['Nails'],
    'мастер маникюра': ['Nails'],
    
    # Waxing
    'waxing': ['Waxing'],
    'депиляция': ['Waxing'],
    'эпиляция': ['Waxing'],
    
    # Massage
    'massage': ['Massage', 'Facial'],
    'massages': ['Massage', 'Facial'],
    'массаж': ['Massage', 'Facial'],
    'массажист': ['Massage', 'Facial'],
    
    # Lashes
    'lash': ['Lashes'],
    'lashes': ['Lashes'],
    'ресницы': ['Lashes'],
    'лэш': ['Lashes'],
    
    # Brows
    'brow': ['Brows'],
    'brows': ['Brows'],
    'брови': ['Brows'],
    
    # Permanent Makeup
    'permanent': ['Permanent Makeup'],
    'permanent makeup': ['Permanent Makeup'],
    'pmu': ['Permanent Makeup'],
    'татуаж': ['Permanent Makeup'],
    
    # Facial
    'facial': ['Facial'],
    'косметолог': ['Facial'],
    'косметология': ['Facial'],
}

# Дополнительные правила
EXTRA_RULES = {
    # Мастера Lashes/Brows также делают Permanent Makeup
    'Lashes': ['Permanent Makeup'],
    'Brows': ['Permanent Makeup'],
}


def get_categories_from_position(position: str) -> set:
    """
    Извлечь категории услуг из позиции мастера.
    Поддерживает комбинации типа "Nail/Waxing" или "Nail Master/Massages".
    """
    if not position:
        return set()
    
    categories = set()
    position_lower = position.lower()
    
    # Разбиваем по разделителям / , ;
    parts = re.split(r'[/,;]', position_lower)
    
    for part in parts:
        part = part.strip()
        
        # Ищем совпадения в маппинге
        for keyword, cats in POSITION_CATEGORY_MAP.items():
            if keyword in part:
                categories.update(cats)
    
    # Применяем дополнительные правила
    categories_copy = categories.copy()
    for cat in categories_copy:
        if cat in EXTRA_RULES:
            categories.update(EXTRA_RULES[cat])
    
    return categories


def run_migration():
    """
    Назначить услуги мастерам на основе их позиции.
    Идемпотентно - можно запускать многократно.
    """
    print("=" * 80)
    print("🔧 UNIVERSAL SERVICE ASSIGNMENTS MIGRATION")
    print("=" * 80)
    print()
    
    conn = get_db_connection()
    c = conn.cursor()
    
    # 1. Получаем активных мастеров
    c.execute("""
        SELECT id, full_name, position
        FROM users
        WHERE is_service_provider = TRUE 
          AND is_active = TRUE
          AND role NOT IN ('director', 'admin', 'manager')
        ORDER BY id
    """)
    masters = c.fetchall()
    
    print(f"📋 Найдено мастеров: {len(masters)}")
    print()
    
    # 2. Получаем все активные услуги с категориями
    c.execute("""
        SELECT id, name, category
        FROM services
        WHERE is_active = TRUE
        ORDER BY category, id
    """)
    services = c.fetchall()
    
    # Группируем услуги по категориям
    services_by_category = {}
    for s_id, s_name, s_category in services:
        if s_category not in services_by_category:
            services_by_category[s_category] = []
        services_by_category[s_category].append((s_id, s_name))
    
    print(f"📊 Категории услуг: {list(services_by_category.keys())}")
    print()
    
    assigned_total = 0
    
    # 3. Для каждого мастера определяем категории и назначаем услуги
    for master_id, master_name, position in masters:
        categories = get_categories_from_position(position)
        
        # Добавляем Promo для всех не-парикмахеров
        if 'Hair' not in categories and categories:
            categories.add('Promo')
        
        print(f"👤 {master_name} ({position})")
        print(f"   → Категории: {sorted(categories) if categories else '⚠️ НЕ ОПРЕДЕЛЕНЫ'}")
        
        master_assigned = 0
        
        for category in categories:
            if category in services_by_category:
                for service_id, service_name in services_by_category[category]:
                    c.execute("""
                        INSERT INTO user_services (user_id, service_id, created_at)
                        VALUES (%s, %s, %s)
                        ON CONFLICT (user_id, service_id) DO NOTHING
                    """, (master_id, service_id, datetime.now()))
                    
                    if c.rowcount > 0:
                        assigned_total += 1
                        master_assigned += 1
        
        if master_assigned > 0:
            print(f"   ✅ Назначено новых услуг: {master_assigned}")
        print()
    
    conn.commit()
    conn.close()
    
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
        print()
        print("   💡 Совет: Обновите поле 'position' у соответствующих мастеров")
    else:
        print("   🎉 Все активные услуги имеют мастеров!")


if __name__ == "__main__":
    run_migration()
