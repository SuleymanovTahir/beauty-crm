#!/usr/bin/env python3
"""
Скрипт для проверки услуг без мастеров
Проверяет все активные услуги и выводит те, у которых нет назначенных мастеров
"""

import sys
import os

# Добавляем путь к корневой директории проекта
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from db.services import get_all_services
from db.employees import get_employees_by_service
from db.connection import get_db_connection

def check_services_without_masters():
    """Проверить все услуги и найти те, у которых нет мастеров"""
    
    print("=" * 80)
    print("🔍 ПРОВЕРКА УСЛУГ БЕЗ МАСТЕРОВ")
    print("=" * 80)
    print()
    
    # Получаем все активные услуги
    services = get_all_services(active_only=True)
    
    print(f"📋 Всего активных услуг: {len(services)}")
    print()
    
    services_without_masters = []
    services_with_masters = []
    
    # Проверяем каждую услугу
    for service in services:
        service_id = service[0]
        service_name_en = service[2] if len(service) > 2 else "N/A"
        service_name_ru = service[3] if len(service) > 3 else service_name_en
        service_category = service[9] if len(service) > 9 else "N/A"
        
        # Получаем мастеров для этой услуги
        employees = get_employees_by_service(service_id)
        
        if not employees:
            services_without_masters.append({
                'id': service_id,
                'name_ru': service_name_ru,
                'name_en': service_name_en,
                'category': service_category
            })
        else:
            services_with_masters.append({
                'id': service_id,
                'name_ru': service_name_ru,
                'name_en': service_name_en,
                'category': service_category,
                'masters_count': len(employees)
            })
    
    # Выводим результаты
    print("=" * 80)
    print(f"❌ УСЛУГИ БЕЗ МАСТЕРОВ: {len(services_without_masters)}")
    print("=" * 80)
    print()
    
    if services_without_masters:
        # Группируем по категориям
        by_category = {}
        for service in services_without_masters:
            category = service['category']
            if category not in by_category:
                by_category[category] = []
            by_category[category].append(service)
        
        # Выводим по категориям
        for category in sorted(by_category.keys()):
            print(f"📂 {category}:")
            for service in sorted(by_category[category], key=lambda x: (x['name_ru'] or '') + (x['name_en'] or '')):
                print(f"   • ID: {service['id']:4d} | {service['name_ru'] or 'N/A'} ({service['name_en'] or 'N/A'})")
            print()
        
        # Список для копирования
        print("=" * 80)
        print("📋 СПИСОК ID УСЛУГ БЕЗ МАСТЕРОВ (для копирования):")
        print("=" * 80)
        ids = [str(s['id']) for s in services_without_masters]
        print(", ".join(ids))
        print()
        
        # Детальная информация
        print("=" * 80)
        print("📝 ДЕТАЛЬНАЯ ИНФОРМАЦИЯ:")
        print("=" * 80)
        for service in sorted(services_without_masters, key=lambda x: (x['category'], x['name_ru'])):
            print(f"ID: {service['id']}")
            print(f"  Название (RU): {service['name_ru']}")
            print(f"  Название (EN): {service['name_en']}")
            print(f"  Категория: {service['category']}")
            print()
    else:
        print("✅ Все услуги имеют назначенных мастеров!")
        print()
    
    # Статистика
    print("=" * 80)
    print("📊 СТАТИСТИКА:")
    print("=" * 80)
    print(f"✅ Услуг с мастерами: {len(services_with_masters)}")
    print(f"❌ Услуг без мастеров: {len(services_without_masters)}")
    print(f"📊 Всего услуг: {len(services)}")
    
    if services_without_masters:
        percentage = (len(services_without_masters) / len(services)) * 100
        print(f"⚠️  Процент услуг без мастеров: {percentage:.1f}%")
    
    print()
    
    # Топ категорий с проблемами
    if services_without_masters:
        print("=" * 80)
        print("🔝 КАТЕГОРИИ С НАИБОЛЬШИМ КОЛИЧЕСТВОМ УСЛУГ БЕЗ МАСТЕРОВ:")
        print("=" * 80)
        category_counts = {}
        for service in services_without_masters:
            category = service['category']
            category_counts[category] = category_counts.get(category, 0) + 1
        
        for category, count in sorted(category_counts.items(), key=lambda x: x[1], reverse=True):
            print(f"  {category}: {count} услуг")
        print()

if __name__ == "__main__":
    try:
        check_services_without_masters()
    except Exception as e:
        print(f"❌ Ошибка: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

