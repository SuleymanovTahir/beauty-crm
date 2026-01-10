#!/usr/bin/env python3
"""
Объединенный скрипт для синхронизации назначений услуг мастерам
1. Удаляет несоответствующие услуги
2. Автоматически назначает мастеров на услуги без мастеров
3. Проверяет результат
"""

import os
import sys

# Add backend directory to path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from db.connection import get_db_connection
from db.employees import remove_employee_service, add_employee_service
from utils.logger import log_info, log_error, log_warning

def get_services_without_masters():
    """Получить услуги, у которых нет мастеров"""
    conn = get_db_connection()
    c = conn.cursor()
    
    c.execute("""
        SELECT s.id, s.name_ru, s.name, s.category, s.price, s.duration
        FROM services s
        WHERE s.is_active = TRUE
        AND s.id NOT IN (
            SELECT DISTINCT us.service_id
            FROM user_services us
            JOIN users u ON u.id = us.user_id
            WHERE u.is_active = TRUE 
            AND u.is_service_provider = TRUE
            AND u.role NOT IN ('director', 'admin', 'manager')
            AND (us.is_online_booking_enabled = TRUE OR us.is_online_booking_enabled IS NULL)
        )
        ORDER BY s.category, s.name_ru
    """)
    
    services = c.fetchall()
    conn.close()
    return services

def get_masters_by_category(category):
    """Получить мастеров, которые уже работают с услугами в данной категории"""
    conn = get_db_connection()
    c = conn.cursor()
    
    c.execute("""
        SELECT DISTINCT u.id, u.full_name
        FROM users u
        JOIN user_services us ON u.id = us.user_id
        JOIN services s ON s.id = us.service_id
        WHERE s.category = %s
        AND s.is_active = TRUE
        AND u.is_active = TRUE 
        AND u.is_service_provider = TRUE
        AND u.role NOT IN ('director', 'admin', 'manager')
        AND (us.is_online_booking_enabled = TRUE OR us.is_online_booking_enabled IS NULL)
        ORDER BY u.full_name
    """, (category,))
    
    masters = c.fetchall()
    conn.close()
    return masters

def get_master_categories(master_id):
    """Получить категории услуг, в которых работает мастер"""
    conn = get_db_connection()
    c = conn.cursor()
    
    c.execute("""
        SELECT DISTINCT s.category
        FROM services s
        JOIN user_services us ON s.id = us.service_id
        WHERE us.user_id = %s
        AND s.is_active = TRUE
        AND (us.is_online_booking_enabled = TRUE OR us.is_online_booking_enabled IS NULL)
        ORDER BY s.category
    """, (master_id,))
    
    categories = [row[0] for row in c.fetchall()]
    conn.close()
    return categories

def remove_services_from_masters():
    """Удалить несоответствующие услуги у мастеров"""
    conn = get_db_connection()
    c = conn.cursor()
    
    total_removed = 0
    
    # === МЕСТАН ===
    c.execute("SELECT id FROM users WHERE username = 'mestan'")
    mestan_row = c.fetchone()
    if mestan_row:
        mestan_id = mestan_row[0]
        services_to_remove_mestan = [
            37, 39, 41,  # Brows
            1, 2, 3, 4, 5,  # Permanent Makeup
            18,  # Hair: Ровный срез кончиков
            30,  # Hair: Наращивание волос за капсулу
            97, 98, 99 # Promo
        ]
        
        print("=" * 80)
        print("🔧 УДАЛЕНИЕ УСЛУГ У МАСТЕРОВ")
        print("=" * 80)
        print()
        print(f"📋 Местан (Username: mestan, ID: {mestan_id})")
        
        mestan_removed = 0
        for service_id in services_to_remove_mestan:
            c.execute("SELECT name_ru, name FROM services WHERE id = %s", (service_id,))
            service = c.fetchone()
            if service:
                service_name = service[0] or service[1]
                try:
                    success = remove_employee_service(employee_id=mestan_id, service_id=service_id)
                    if success:
                        print(f"   ✅ Убрана: {service_name} (ID: {service_id})")
                        mestan_removed += 1
                except Exception as e:
                    print(f"   ❌ Ошибка при удалении {service_name} (ID: {service_id}): {e}")
        
        print(f"   📊 Убрано услуг: {mestan_removed}")
        total_removed += mestan_removed
        print()
    
    # === ДЖЕНИФЕР ===
    c.execute("SELECT id FROM users WHERE username = 'jennifer'")
    jennifer_row = c.fetchone()
    if jennifer_row:
        jennifer_id = jennifer_row[0]
        services_to_remove_jennifer = {
            'hair': [18, 19, 20, 22, 23, 24, 25, 26, 27, 28, 54, 55, 56, 58, 59],
            # Lashes НЕ убираем - Дженифер единственный мастер по ресницам!
            'nails': [75, 76, 77, 74, 69, 71, 72],
            'waxing': [8, 6, 16, 14, 13, 80, 82, 81],
        }
        
        print(f"📋 Дженифер (Username: jennifer, ID: {jennifer_id})")
        
        jennifer_removed = 0
        for category, service_ids in services_to_remove_jennifer.items():
            for service_id in service_ids:
                c.execute("SELECT name_ru, name FROM services WHERE id = %s", (service_id,))
                service = c.fetchone()
                if service:
                    service_name = service[0] or service[1]
                    try:
                        success = remove_employee_service(employee_id=jennifer_id, service_id=service_id)
                        if success:
                            print(f"   ✅ Убрана: {service_name} (ID: {service_id})")
                            jennifer_removed += 1
                    except Exception as e:
                        print(f"   ❌ Ошибка при удалении {service_name} (ID: {service_id}): {e}")
        
        print(f"   📊 Убрано услуг: {jennifer_removed}")
        total_removed += jennifer_removed
        print()
    
    conn.close()
    
    print("=" * 80)
    print(f"✅ УДАЛЕНИЕ ЗАВЕРШЕНО: Убрано {total_removed} услуг")
    print("=" * 80)
    print()
    
    return total_removed

def assign_masters_to_orphaned_services():
    """Автоматически назначить мастеров на услуги без мастеров"""
    print("=" * 80)
    print("🔧 АВТОМАТИЧЕСКОЕ НАЗНАЧЕНИЕ МАСТЕРОВ")
    print("=" * 80)
    print()
    
    # Получаем услуги без мастеров
    services_without = get_services_without_masters()
    
    if not services_without:
        print("✅ Все услуги уже имеют назначенных мастеров!")
        return 0
    
    print(f"📋 Найдено {len(services_without)} услуг без мастеров")
    print()
    
    # Группируем по категориям
    by_category = {}
    for service in services_without:
        category = service[3] if len(service) > 3 else "N/A"
        if category not in by_category:
            by_category[category] = []
        by_category[category].append(service)
    
    total_assigned = 0
    
    for category in sorted(by_category.keys()):
        print(f"📂 Категория: {category}")
        
        # Получаем мастеров для этой категории
        masters = get_masters_by_category(category)
        
        if not masters:
            print(f"   ⚠️  Нет мастеров для категории '{category}' - пропускаем")
            print()
            continue
        
        print(f"   ✅ Найдено мастеров: {len(masters)}")
        
        # Назначаем всех мастеров на все услуги категории
        for service in by_category[category]:
            service_id = service[0]
            service_name = service[1] if service[1] else service[2]
            service_price = service[4] if len(service) > 4 else None
            service_duration = service[5] if len(service) > 5 else None
            
            assigned_count = 0
            for master in masters:
                master_id = master[0]
                master_name = master[1]
                
                # Проверяем, что мастер уже работает в этой категории
                master_categories = get_master_categories(master_id)
                if category not in master_categories:
                    continue
                
                # Проверяем, не назначен ли уже этот мастер
                conn = get_db_connection()
                c = conn.cursor()
                c.execute("""
                    SELECT id FROM user_services 
                    WHERE user_id = %s AND service_id = %s
                """, (master_id, service_id))
                exists = c.fetchone()
                conn.close()
                
                if exists:
                    continue
                
                try:
                    success = add_employee_service(
                        employee_id=master_id,
                        service_id=service_id,
                        price=service_price,
                        duration=service_duration,
                        is_online_booking_enabled=True,
                        is_calendar_enabled=True
                    )
                    
                    if success:
                        assigned_count += 1
                        total_assigned += 1
                except Exception as e:
                    log_error(f"Ошибка назначения услуги {service_id} мастеру {master_id}: {e}", "sync_master_services")
            
            if assigned_count > 0:
                print(f"   ✅ {service_name}: назначено {assigned_count} мастеров")
        
        print()
    
    print("=" * 80)
    print(f"✅ НАЗНАЧЕНИЕ ЗАВЕРШЕНО: Назначено {total_assigned} связей мастер-услуга")
    print("=" * 80)
    print()
    
    return total_assigned

def check_services_without_masters():
    """Проверить услуги без мастеров и вывести отчет"""
    conn = get_db_connection()
    c = conn.cursor()
    
    c.execute("""
        SELECT s.id, s.name_ru, s.name, s.category
        FROM services s
        WHERE s.is_active = TRUE
        AND s.id NOT IN (
            SELECT DISTINCT us.service_id
            FROM user_services us
            JOIN users u ON u.id = us.user_id
            WHERE u.is_active = TRUE 
            AND u.is_service_provider = TRUE
            AND u.role NOT IN ('director', 'admin', 'manager')
            AND (us.is_online_booking_enabled = TRUE OR us.is_online_booking_enabled IS NULL)
        )
        ORDER BY s.category, s.name_ru
    """)
    
    services_without = c.fetchall()
    conn.close()
    
    if services_without:
        print("=" * 80)
        print(f"⚠️  ПРОВЕРКА: Найдено {len(services_without)} услуг без мастеров")
        print("=" * 80)
        print()
        
        # Группируем по категориям
        by_category = {}
        for service in services_without:
            category = service[3] if len(service) > 3 else "N/A"
            if category not in by_category:
                by_category[category] = []
            by_category[category].append(service)
        
        for category in sorted(by_category.keys()):
            print(f"📂 {category}:")
            for service in sorted(by_category[category], key=lambda x: x[1] or x[2]):
                service_id = service[0]
                service_name_ru = service[1] if service[1] else None
                service_name_en = service[2] if service[2] else None
                service_name = service_name_ru or service_name_en or f'ID: {service_id}'
                print(f"   • {service_name} (ID: {service_id})")
            print()
        
        # Проверяем Lashes отдельно
        lashes_services = [s for s in services_without if s[3] == 'Lashes']
        if lashes_services:
            print("⚠️  ВНИМАНИЕ: Услуги Lashes без мастеров:")
            for service in lashes_services:
                service_name = service[1] if service[1] else service[2]
                print(f"   • {service_name} (ID: {service[0]})")
            print("   Рекомендуется назначить мастера вручную.")
            print()
    else:
        print("=" * 80)
        print("✅ ПРОВЕРКА: Все услуги имеют назначенных мастеров!")
        print("=" * 80)
        print()
    
    return len(services_without)

def main():
    """Главная функция"""
    print()
    print("=" * 80)
    print("🔄 СИНХРОНИЗАЦИЯ НАЗНАЧЕНИЙ УСЛУГ МАСТЕРАМ")
    print("=" * 80)
    print()
    
    try:
        # ШАГ 1: Удаление несоответствующих услуг
        removed_count = remove_services_from_masters()
        
        # ШАГ 2: Автоматическое назначение мастеров
        assigned_count = assign_masters_to_orphaned_services()
        
        # ШАГ 3: Финальная проверка
        remaining_count = check_services_without_masters()
        
        # Итоговый отчет
        print("=" * 80)
        print("📊 ИТОГОВЫЙ ОТЧЕТ")
        print("=" * 80)
        print(f"   Убрано услуг: {removed_count}")
        print(f"   Назначено связей: {assigned_count}")
        print(f"   Осталось без мастеров: {remaining_count}")
        print("=" * 80)
        print()
        
        if remaining_count > 0:
            log_warning(f"После синхронизации осталось {remaining_count} услуг без мастеров", "sync_master_services")
        else:
            log_info("✅ Все услуги имеют назначенных мастеров", "sync_master_services")
        
    except Exception as e:
        log_error(f"Критическая ошибка: {e}", "sync_master_services")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()

