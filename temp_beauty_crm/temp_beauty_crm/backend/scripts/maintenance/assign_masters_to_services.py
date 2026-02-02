#!/usr/bin/env python3
"""
Скрипт для автоматического назначения мастеров на услуги без мастеров
Анализирует услуги и назначает мастеров по категориям на основе существующих назначений
"""

import os
import sys

# Add backend directory to path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from db.connection import get_db_connection
from db.services import get_all_services
from db.employees import get_employees_by_service, add_employee_service
from utils.logger import log_info, log_error

def get_services_with_masters():
    """Получить услуги, у которых есть мастера"""
    conn = get_db_connection()
    c = conn.cursor()
    
    c.execute("""
        SELECT DISTINCT s.id, s.name, s.name, s.category
        FROM services s
        JOIN user_services us ON s.id = us.service_id
        JOIN users u ON u.id = us.user_id
        WHERE s.is_active = TRUE
        AND u.is_active = TRUE 
        AND u.is_service_provider = TRUE
        AND u.role NOT IN ('director', 'admin', 'manager')
        AND (us.is_online_booking_enabled = TRUE OR us.is_online_booking_enabled IS NULL)
        ORDER BY s.category, s.name
    """)
    
    services = c.fetchall()
    conn.close()
    return services

def get_services_without_masters():
    """Получить услуги, у которых нет мастеров"""
    conn = get_db_connection()
    c = conn.cursor()
    
    c.execute("""
        SELECT s.id, s.name, s.name, s.category, s.price, s.duration
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
        ORDER BY s.category, s.name
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

def print_services_report():
    """Вывести отчет об услугах с мастерами и без"""
    print("=" * 80)
    print("📊 ОТЧЕТ: УСЛУГИ С МАСТЕРАМИ И БЕЗ МАСТЕРОВ")
    print("=" * 80)
    print()
    
    # Услуги с мастерами
    services_with = get_services_with_masters()
    print(f"✅ УСЛУГИ С МАСТЕРАМИ: {len(services_with)}")
    print("-" * 80)
    
    # Группируем по категориям
    by_category_with = {}
    for service in services_with:
        category = service[3] if len(service) > 3 else "N/A"
        if category not in by_category_with:
            by_category_with[category] = []
        by_category_with[category].append(service)
    
    for category in sorted(by_category_with.keys()):
        print(f"\n📂 {category}: {len(by_category_with[category])} услуг")
        for service in sorted(by_category_with[category], key=lambda x: x[1]):
            name = service[1] 
            print(f"   • ID: {service[0]:4d} | {name}")
    
    print()
    print("=" * 80)
    
    # Услуги без мастеров
    services_without = get_services_without_masters()
    print(f"❌ УСЛУГИ БЕЗ МАСТЕРОВ: {len(services_without)}")
    print("-" * 80)
    
    # Группируем по категориям
    by_category_without = {}
    for service in services_without:
        category = service[3] if len(service) > 3 else "N/A"
        if category not in by_category_without:
            by_category_without[category] = []
        by_category_without[category].append(service)
    
    for category in sorted(by_category_without.keys()):
        print(f"\n📂 {category}: {len(by_category_without[category])} услуг")
        for service in sorted(by_category_without[category], key=lambda x: x[1]):
            name = service[1]
            print(f"   • ID: {service[0]:4d} | {name}")
    
    print()
    print("=" * 80)
    print(f"📊 ИТОГО:")
    print(f"   Всего активных услуг: {len(services_with) + len(services_without)}")
    print(f"   ✅ С мастерами: {len(services_with)}")
    print(f"   ❌ Без мастеров: {len(services_without)}")
    print("=" * 80)
    print()
    
    return services_without, by_category_without

def assign_masters_to_services(dry_run=True):
    """
    Назначить мастеров на услуги без мастеров по категориям
    
    Args:
        dry_run: Если True, только показывает что будет сделано, не изменяет БД
    """
    print("=" * 80)
    print("🔧 АВТОМАТИЧЕСКОЕ НАЗНАЧЕНИЕ МАСТЕРОВ НА УСЛУГИ")
    print("=" * 80)
    print()
    
    if dry_run:
        print("⚠️  РЕЖИМ ПРЕДПРОСМОТРА (dry_run=True) - изменения не будут сохранены")
        print()
    
    # Получаем услуги без мастеров
    services_without = get_services_without_masters()
    
    if not services_without:
        print("✅ Все услуги уже имеют назначенных мастеров!")
        return
    
    # Группируем по категориям
    by_category = {}
    for service in services_without:
        category = service[3] if len(service) > 3 else "N/A"
        if category not in by_category:
            by_category[category] = []
        by_category[category].append(service)
    
    total_assigned = 0
    total_skipped = 0
    
    for category in sorted(by_category.keys()):
        print(f"📂 Категория: {category}")
        print("-" * 80)
        
        # Получаем мастеров для этой категории
        masters = get_masters_by_category(category)
        
        if not masters:
            print(f"   ⚠️  Нет мастеров для категории '{category}' - пропускаем")
            total_skipped += len(by_category[category])
            print()
            continue
        
        print(f"   ✅ Найдено мастеров: {len(masters)}")
        for master in masters:
            print(f"      • {master[1]} (ID: {master[0]})")
        print()
        
        # Назначаем всех мастеров на все услуги категории
        for service in by_category[category]:
            service_id = service[0]
            service_name = service[1]
            service_price = service[4] if len(service) > 4 else None
            service_duration = service[5] if len(service) > 5 else None
            
            print(f"   📋 Услуга: {service_name} (ID: {service_id})")
            
            assigned_count = 0
            for master in masters:
                master_id = master[0]
                master_name = master[1]
                
                # ✅ ПРОВЕРКА: Мастер должен уже работать в этой категории
                # Это гарантирует, что мы не назначим услуги мастеру, который не специализируется в этой категории
                master_categories = get_master_categories(master_id)
                if category not in master_categories:
                    print(f"      ⏭️  {master_name} не работает в категории '{category}' - пропускаем (безопасность)")
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
                    print(f"      ⏭️  {master_name} уже назначен - пропускаем")
                    continue
                
                if not dry_run:
                    try:
                        # Назначаем услугу мастеру
                        success = add_employee_service(
                            employee_id=master_id,
                            service_id=service_id,
                            price=service_price,
                            duration=service_duration,
                            is_online_booking_enabled=True,
                            is_calendar_enabled=True
                        )
                        
                        if success:
                            print(f"      ✅ Назначен мастер: {master_name}")
                            assigned_count += 1
                            total_assigned += 1
                        else:
                            print(f"      ❌ Ошибка назначения: {master_name}")
                    except Exception as e:
                        print(f"      ❌ Ошибка при назначении {master_name}: {e}")
                        log_error(f"Ошибка назначения услуги {service_id} мастеру {master_id}: {e}", "assign_masters")
                else:
                    print(f"      [DRY RUN] Будет назначен: {master_name}")
                    assigned_count += 1
                    total_assigned += 1
            
            if assigned_count > 0:
                print(f"      ✅ Назначено мастеров: {assigned_count}")
            print()
    
    print("=" * 80)
    if dry_run:
        print(f"📊 ПРЕДПРОСМОТР: Будет назначено {total_assigned} связей мастер-услуга")
    else:
        print(f"✅ ЗАВЕРШЕНО: Назначено {total_assigned} связей мастер-услуга")
    if total_skipped > 0:
        print(f"⚠️  Пропущено услуг (нет мастеров в категории): {total_skipped}")
    print("=" * 80)
    print()

def assign_masters_auto(auto_assign=False):
    """
    Автоматическое назначение мастеров (для вызова из run_all_fixes)
    
    Args:
        auto_assign: Если True, автоматически выполняет назначения без запроса подтверждения
    """
    log_info("🔧 Запуск assign_masters_to_services.py...", "assign_masters")
    
    try:
        # 1. Выводим отчет (без лишнего вывода в неинтерактивном режиме)
        if not auto_assign:
            services_without, by_category = print_services_report()
        else:
            # В автоматическом режиме просто получаем данные
            services_without = get_services_without_masters()
            by_category = {}
            for service in services_without:
                category = service[3] if len(service) > 3 else "N/A"
                if category not in by_category:
                    by_category[category] = []
                by_category[category].append(service)
        
        if not services_without:
            log_info("✅ Все услуги имеют назначенных мастеров", "assign_masters")
            return True
        
        log_info(f"📋 Найдено {len(services_without)} услуг без мастеров", "assign_masters")
        
        # 2. Предпросмотр назначений (только в интерактивном режиме)
        if not auto_assign:
            assign_masters_to_services(dry_run=True)
        
        # 3. Выполняем назначения
        if auto_assign:
            log_info("🤖 Автоматическое выполнение назначений...", "assign_masters")
            assign_masters_to_services(dry_run=False)
            log_info("✅ Назначения выполнены!", "assign_masters")
            return True
        else:
            # В интерактивном режиме запрашиваем подтверждение
            try:
                response = input("Выполнить назначения? (yes/no): ").strip().lower()
                if response in ['yes', 'y', 'да', 'д']:
                    assign_masters_to_services(dry_run=False)
                    log_info("✅ Назначения выполнены!", "assign_masters")
                    return True
                else:
                    log_info("❌ Назначения отменены пользователем", "assign_masters")
                    return False
            except (EOFError, KeyboardInterrupt):
                # Если нет интерактивного ввода (например, при запуске из run_all_fixes)
                log_info("⚠️  Интерактивный ввод недоступен, пропускаем назначения", "assign_masters")
                return False
                
    except Exception as e:
        log_error(f"❌ Ошибка в assign_masters_to_services: {e}", "assign_masters")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Главная функция для интерактивного запуска"""
    print()
    print("=" * 80)
    print("🔍 АНАЛИЗ И НАЗНАЧЕНИЕ МАСТЕРОВ НА УСЛУГИ")
    print("=" * 80)
    print()
    
    # 1. Выводим отчет
    print("ШАГ 1: Анализ услуг")
    print("-" * 80)
    services_without, by_category = print_services_report()
    
    if not services_without:
        print("✅ Все услуги имеют назначенных мастеров. Ничего делать не нужно.")
        return
    
    # 2. Предпросмотр назначений
    print()
    print("ШАГ 2: Предпросмотр назначений (dry run)")
    print("-" * 80)
    assign_masters_to_services(dry_run=True)
    
    # 3. Выполняем назначения
    print()
    print("ШАГ 3: Выполнение назначений")
    print("-" * 80)
    response = input("Выполнить назначения? (yes/no): ").strip().lower()
    
    if response in ['yes', 'y', 'да', 'д']:
        assign_masters_to_services(dry_run=False)
        print()
        print("✅ Назначения выполнены!")
        print()
        print("ШАГ 4: Финальная проверка")
        print("-" * 80)
        print_services_report()
    else:
        print("❌ Назначения отменены пользователем")

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        log_error(f"Критическая ошибка: {e}", "assign_masters")
        import traceback
        traceback.print_exc()
        sys.exit(1)

