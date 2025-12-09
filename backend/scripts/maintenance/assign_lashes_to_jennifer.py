#!/usr/bin/env python3
"""
Скрипт для назначения услуг по наращиванию ресниц Дженифер
"""

import os
import sys

# Add backend directory to path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from db.connection import get_db_connection
from db.employees import add_employee_service
from utils.logger import log_info, log_error

def assign_lashes_to_jennifer():
    """Назначить все услуги по наращиванию ресниц Дженифер"""
    conn = get_db_connection()
    c = conn.cursor()
    
    # ID Дженифер
    jennifer_id = 6
    
    # Услуги по наращиванию ресниц (кроме снятия, которое уже есть)
    lashes_services = [31, 32, 33, 34, 35, 38]  # Классический, 2D, 3D, 4-5D, ML завиток, Ламинирование
    
    print("=" * 80)
    print("🔧 НАЗНАЧЕНИЕ УСЛУГ ПО НАРАЩИВАНИЮ РЕСНИЦ ДЖЕНИФЕР")
    print("=" * 80)
    print()
    
    assigned_count = 0
    skipped_count = 0
    
    for service_id in lashes_services:
        # Получаем информацию об услуге
        c.execute("SELECT name_ru, name, price, duration FROM services WHERE id = %s", (service_id,))
        service = c.fetchone()
        
        if not service:
            print(f"❌ Услуга ID {service_id} не найдена")
            continue
        
        service_name = service[0] if service[0] else service[1]
        service_price = service[2] if len(service) > 2 else None
        service_duration = service[3] if len(service) > 3 else None
        
        # Проверяем, не назначена ли уже
        c.execute("SELECT id FROM user_services WHERE user_id = %s AND service_id = %s", 
                 (jennifer_id, service_id))
        exists = c.fetchone()
        
        if exists:
            print(f"⏭️  {service_name} (ID: {service_id}) - уже назначена, пропускаем")
            skipped_count += 1
            continue
        
        try:
            success = add_employee_service(
                employee_id=jennifer_id,
                service_id=service_id,
                price=service_price,
                duration=service_duration,
                is_online_booking_enabled=True,
                is_calendar_enabled=True
            )
            
            if success:
                print(f"✅ Назначена услуга: {service_name} (ID: {service_id})")
                assigned_count += 1
            else:
                print(f"❌ Ошибка назначения: {service_name} (ID: {service_id})")
        except Exception as e:
            print(f"❌ Ошибка при назначении {service_name} (ID: {service_id}): {e}")
            log_error(f"Ошибка назначения услуги {service_id} Дженифер: {e}", "assign_lashes")
    
    conn.close()
    
    print()
    print("=" * 80)
    print(f"✅ ЗАВЕРШЕНО:")
    print(f"   Назначено услуг: {assigned_count}")
    print(f"   Пропущено (уже назначены): {skipped_count}")
    print("=" * 80)
    print()
    
    return assigned_count

if __name__ == "__main__":
    try:
        assign_lashes_to_jennifer()
    except Exception as e:
        log_error(f"Критическая ошибка: {e}", "assign_lashes")
        import traceback
        traceback.print_exc()
        sys.exit(1)

