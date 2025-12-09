#!/usr/bin/env python3
"""
Скрипт для исправления назначений услуг мастерам
Удаляет несоответствующие услуги на основе данных из другой БД
"""

import os
import sys

# Add backend directory to path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from db.connection import get_db_connection
from db.employees import remove_employee_service
from utils.logger import log_info, log_error

def fix_mestan_services():
    """Исправить услуги Местана - убрать лишние"""
    conn = get_db_connection()
    c = conn.cursor()
    
    # Услуги, которые нужно убрать у Местана
    # (Brows: ламинирование, оформление; Permanent Makeup: все; лишние Hair и Promo)
    services_to_remove = [
        37,  # Ламинирование бровей
        39,  # Ламинирование бровей и ресниц
        41,  # Оформление бровей
        1,   # Перманентный макияж губ
        2,   # Перманентный макияж бровей
        3,   # Межресничная стрелка
        4,   # Подводка для глаз
        5,   # Коррекция перманентного макияжа
        18,  # Ровный срез кончиков
        30,  # Наращивание волос за капсулу
        97,  # Promotion overlay manicure
        98,  # Promo mani pedi 250
        99,  # Combo basic 150
    ]
    
    print("=" * 80)
    print("🔧 ИСПРАВЛЕНИЕ УСЛУГ МЕСТАНА (ID: 3)")
    print("=" * 80)
    print()
    
    removed_count = 0
    for service_id in services_to_remove:
        c.execute("SELECT name_ru, name FROM services WHERE id = %s", (service_id,))
        service = c.fetchone()
        if service:
            service_name = service[0] or service[1]
            try:
                success = remove_employee_service(employee_id=3, service_id=service_id)
                if success:
                    print(f"✅ Убрана услуга: {service_name} (ID: {service_id})")
                    removed_count += 1
                else:
                    print(f"⚠️  Услуга не была назначена: {service_name} (ID: {service_id})")
            except Exception as e:
                print(f"❌ Ошибка при удалении {service_name} (ID: {service_id}): {e}")
    
    conn.close()
    print()
    print(f"✅ Убрано услуг у Местана: {removed_count}")
    print()
    return removed_count

def fix_jennifer_services():
    """Исправить услуги Дженифер - убрать лишние"""
    conn = get_db_connection()
    c = conn.cursor()
    
    # Услуги, которые нужно убрать у Дженифер
    # ⚠️ ВАЖНО: Lashes НЕ убираем - Дженифер единственный мастер по наращиванию ресниц!
    services_to_remove = {
        'hair': [18, 19, 20, 22, 23, 24, 25, 26, 27, 28, 54, 55, 56, 58, 59],
        # 'lashes': [31, 32, 33, 34, 35, 38],  # ❌ УБРАНО: Дженифер единственный мастер по ресницам
        'nails': [75, 76, 77, 74, 69, 71, 72],
        'waxing': [8, 6, 16, 14, 13, 80, 82, 81],
    }
    
    print("=" * 80)
    print("🔧 ИСПРАВЛЕНИЕ УСЛУГ ДЖЕНИФЕР (ID: 6)")
    print("=" * 80)
    print()
    
    # ⚠️ Предупреждение про Lashes
    print("⚠️  ВНИМАНИЕ: Услуги Lashes (ID: 31, 32, 33, 34, 35, 38) не имеют других мастеров!")
    print("   Если убрать их у Дженифер, они останутся без мастеров.")
    print()
    
    removed_count = 0
    warnings = []
    
    for category, service_ids in services_to_remove.items():
        print(f"📂 Категория: {category.upper()}")
        for service_id in service_ids:
            c.execute("SELECT name_ru, name FROM services WHERE id = %s", (service_id,))
            service = c.fetchone()
            if service:
                service_name = service[0] or service[1]
                
                # Проверяем, есть ли другие мастера
                c.execute("""
                    SELECT COUNT(*) FROM user_services us
                    JOIN users u ON u.id = us.user_id
                    WHERE us.service_id = %s AND us.user_id != 6
                    AND u.is_active = TRUE 
                    AND u.is_service_provider = TRUE
                    AND u.role NOT IN ('director', 'admin', 'manager')
                """, (service_id,))
                other_masters_count = c.fetchone()[0]
                
                if category == 'lashes' and other_masters_count == 0:
                    warnings.append(f"⚠️  {service_name} (ID: {service_id}) - НЕТ ДРУГИХ МАСТЕРОВ!")
                    print(f"   ⚠️  {service_name} (ID: {service_id}) - НЕТ ДРУГИХ МАСТЕРОВ, но убираем по запросу")
                else:
                    print(f"   ✅ {service_name} (ID: {service_id}) - есть другие мастера: {other_masters_count}")
                
                try:
                    success = remove_employee_service(employee_id=6, service_id=service_id)
                    if success:
                        removed_count += 1
                    else:
                        print(f"      ⚠️  Услуга не была назначена")
                except Exception as e:
                    print(f"      ❌ Ошибка: {e}")
        print()
    
    conn.close()
    print(f"✅ Убрано услуг у Дженифер: {removed_count}")
    if warnings:
        print()
        print("⚠️  ПРЕДУПРЕЖДЕНИЯ:")
        for warning in warnings:
            print(f"   {warning}")
    print()
    return removed_count

def main():
    """Главная функция"""
    print()
    print("=" * 80)
    print("🔧 ИСПРАВЛЕНИЕ НАЗНАЧЕНИЙ УСЛУГ МАСТЕРАМ")
    print("=" * 80)
    print()
    
    try:
        # Исправляем Местана
        mestan_removed = fix_mestan_services()
        
        # Исправляем Дженифер
        jennifer_removed = fix_jennifer_services()
        
        print("=" * 80)
        print("✅ ИСПРАВЛЕНИЕ ЗАВЕРШЕНО")
        print("=" * 80)
        print(f"   Убрано у Местана: {mestan_removed} услуг")
        print(f"   Убрано у Дженифер: {jennifer_removed} услуг")
        print()
        
        # Проверяем услуги без мастеров
        conn = get_db_connection()
        c = conn.cursor()
        c.execute("""
            SELECT COUNT(*) FROM services s
            WHERE s.is_active = TRUE
            AND s.id NOT IN (
                SELECT DISTINCT us.service_id
                FROM user_services us
                JOIN users u ON u.id = us.user_id
                WHERE u.is_active = TRUE 
                AND u.is_service_provider = TRUE
                AND u.role NOT IN ('director', 'admin', 'manager')
            )
        """)
        services_without_masters = c.fetchone()[0]
        conn.close()
        
        if services_without_masters > 0:
            print(f"⚠️  ВНИМАНИЕ: После исправления осталось {services_without_masters} услуг без мастеров!")
            print("   Рекомендуется проверить и назначить мастеров вручную.")
        else:
            print("✅ Все услуги имеют назначенных мастеров")
        print()
        
    except Exception as e:
        log_error(f"Критическая ошибка: {e}", "fix_master_services")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()

