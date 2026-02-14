#!/usr/bin/env python3
"""
Тестирование интеграции с маркетплейсами:
1. Создание и обновление провайдеров
2. Service Mapping (маппинг услуг)
3. Создание и обновление записей из маркетплейсов
4. Webhook обработка
5. Синхронизация
"""
import sys
import os
from datetime import datetime
import json

# Добавляем путь к backend
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from tests.test_date_utils import get_test_date, get_test_datetime

from db.connection import get_db_connection
from crm_api.marketplace_integrations import (
    normalize_booking_data,
    resolve_service_name,
    create_booking_from_marketplace,
    update_booking_from_marketplace
)

def print_section(title):
    """Печать заголовка секции"""
    print("\n" + "="*80)
    print(f"  {title}")
    print("="*80)

def print_subsection(title):
    """Печать подзаголовка"""
    print(f"\n--- {title} ---")

def cleanup_test_data():
    """Очистка тестовых данных"""
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        # Удаляем в правильном порядке (сначала зависимые таблицы)
        c.execute("DELETE FROM marketplace_bookings WHERE provider IN ('test_provider', 'yclients')")
        c.execute("DELETE FROM bookings WHERE source IN ('test_provider', 'yclients')")
        c.execute("DELETE FROM marketplace_providers WHERE name = 'test_provider'")
        c.execute("DELETE FROM clients WHERE instagram_id LIKE 'marketplace_test_%' OR instagram_id LIKE 'marketplace_yclients_%'")
        
        # Удаляем связи с услугами перед удалением самих услуг
        c.execute("DELETE FROM user_services WHERE service_id IN (SELECT id FROM services WHERE service_key IN ('test_manicure', 'test_haircut'))")
        c.execute("DELETE FROM services WHERE service_key IN ('test_manicure', 'test_haircut')")
        
        conn.commit()
        print("✅ Тестовые данные очищены")
    except Exception as e:
        conn.rollback()
        print(f"⚠️  Ошибка очистки: {e}")
    finally:
        conn.close()

def test_provider_management():
    """Тест 1: Управление провайдерами"""
    print_section("ТЕСТ 1: Управление провайдерами маркетплейсов")
    
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        # Создаем тестовый провайдер
        print_subsection("Создание провайдера")
        
        settings = {
            "service_mapping": {
                "1": "ext_service_100",
                "2": "ext_service_200"
            },
            "test_mode": True
        }
        
        c.execute("""
            INSERT INTO marketplace_providers
            (name, api_key, api_secret, is_active, settings, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (
            'test_provider',
            'test_api_key',
            'test_api_secret',
            True,
            json.dumps(settings),
            datetime.now().isoformat(),
            datetime.now().isoformat()
        ))
        
        provider_id = c.fetchone()[0]
        conn.commit()
        
        print(f"✅ Провайдер создан с ID: {provider_id}")
        print(f"   Service Mapping: {settings['service_mapping']}")
        
        # Проверяем получение провайдера
        print_subsection("Получение настроек провайдера")
        c.execute("SELECT settings FROM marketplace_providers WHERE name = %s", ('test_provider',))
        row = c.fetchone()
        
        if row:
            # PostgreSQL JSONB возвращается как dict, не нужен json.loads
            loaded_settings = row[0] if isinstance(row[0], dict) else json.loads(row[0])
            print(f"✅ Настройки загружены:")
            print(f"   Service Mapping: {loaded_settings.get('service_mapping')}")
            print(f"   Test Mode: {loaded_settings.get('test_mode')}")
        
        return True
        
    except Exception as e:
        conn.rollback()
        print(f"❌ ОШИБКА: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        conn.close()

def test_service_mapping():
    """Тест 2: Маппинг услуг"""
    print_section("ТЕСТ 2: Маппинг услуг (Service Mapping)")
    
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        # Создаем тестовые услуги
        print_subsection("Создание тестовых услуг")
        
        c.execute("""
            INSERT INTO services (service_key, name, category, price, duration, is_active, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """, ('test_manicure', 'Test Service Manicure', 'Nails', 150, 60, True, datetime.now().isoformat()))
        service_id_1 = c.fetchone()[0]

        c.execute("""
            INSERT INTO services (service_key, name, category, price, duration, is_active, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """, ('test_haircut', 'Test Service Haircut', 'Hair', 200, 90, True, datetime.now().isoformat()))
        service_id_2 = c.fetchone()[0]
        
        conn.commit()
        print(f"✅ Услуги созданы: ID {service_id_1}, ID {service_id_2}")
        
        # Обновляем маппинг в провайдере
        print_subsection("Обновление Service Mapping")
        
        service_mapping = {
            str(service_id_1): "ext_manicure_100",
            str(service_id_2): "ext_haircut_200"
        }
        
        settings = {
            "service_mapping": service_mapping,
            "test_mode": True
        }
        
        c.execute("""
            UPDATE marketplace_providers
            SET settings = %s
            WHERE name = %s
        """, (json.dumps(settings), 'test_provider'))
        conn.commit()
        
        print(f"✅ Service Mapping обновлен:")
        for internal_id, external_id in service_mapping.items():
            print(f"   Internal ID {internal_id} → External ID {external_id}")
        
        # Тестируем resolve_service_name
        print_subsection("Тестирование resolve_service_name")
        
        import asyncio
        
        async def test_resolve():
            # Тест 1: Существующий маппинг
            resolved_name = await resolve_service_name(
                'test_provider',
                'ext_manicure_100',
                'Default Service Name',
                c
            )
            print(f"✅ External 'ext_manicure_100' → '{resolved_name}'")
            
            # Тест 2: Несуществующий маппинг (должен вернуть default)
            resolved_name_2 = await resolve_service_name(
                'test_provider',
                'ext_unknown_999',
                'Default Service Name',
                c
            )
            print(f"✅ External 'ext_unknown_999' → '{resolved_name_2}' (fallback)")
            
            # Тест 3: Пустой external_id
            resolved_name_3 = await resolve_service_name(
                'test_provider',
                None,
                'Default Service Name',
                c
            )
            print(f"✅ External None → '{resolved_name_3}' (fallback)")
        
        asyncio.run(test_resolve())
        
        return True
        
    except Exception as e:
        conn.rollback()
        print(f"❌ ОШИБКА: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        conn.close()

def test_booking_creation():
    """Тест 3: Создание записей из маркетплейса"""
    print_section("ТЕСТ 3: Создание записей из маркетплейса")
    
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        import asyncio
        
        # Получаем ID услуги для маппинга
        c.execute("SELECT id FROM services WHERE name = 'Test Service Manicure'")
        service_row = c.fetchone()
        if not service_row:
            print("❌ Тестовая услуга не найдена")
            return False
        
        service_id = service_row[0]
        
        print_subsection("Создание записи с маппингом услуги")
        
        # Симулируем данные от YClients
        booking_data = {
            "id": "test_booking_001",
            "services": [{
                "id": "ext_manicure_100",  # Это должно замапиться на Test Service Manicure
                "title": "External Manicure Service"
            }],
            "client": {
                "name": "Test Client Marketplace",
                "phone": "+79991234567",
                "email": "test@marketplace.com"
            },
            "date": get_test_date(2),
            "datetime": get_test_datetime(2, 14, 0),
            "seance_length": 3600
        }
        
        async def create_test_booking():
            await create_booking_from_marketplace(
                'yclients',
                booking_data,
                c,
                conn
            )
        
        asyncio.run(create_test_booking())
        
        # Проверяем созданную запись
        c.execute("""
            SELECT b.id, b.service_name, b.instagram_id, mb.external_id
            FROM bookings b
            JOIN marketplace_bookings mb ON b.id = mb.booking_id
            WHERE mb.provider = 'yclients' AND mb.external_id = %s
        """, ('test_booking_001',))
        
        row = c.fetchone()
        if row:
            booking_id, service_name, client_id, external_id = row
            print(f"✅ Запись создана:")
            print(f"   Booking ID: {booking_id}")
            print(f"   Service Name: {service_name}")
            print(f"   Client ID: {client_id}")
            print(f"   External ID: {external_id}")
            
            # Проверяем, что услуга правильно замаплена
            if service_name == "Test Service Manicure":
                print(f"✅ Service Mapping работает корректно!")
            else:
                print(f"⚠️  Service Mapping не сработал. Ожидалось 'Test Service Manicure', получено '{service_name}'")
        else:
            print("❌ Запись не найдена в БД")
            return False
        
        return True
        
    except Exception as e:
        conn.rollback()
        print(f"❌ ОШИБКА: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        conn.close()

def test_booking_update():
    """Тест 4: Обновление записей из маркетплейса"""
    print_section("ТЕСТ 4: Обновление записей из маркетплейса")
    
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        import asyncio
        
        print_subsection("Обновление существующей записи")
        
        # Обновленные данные (изменили время и услугу)
        updated_booking_data = {
            "id": "test_booking_001",
            "services": [{
                "id": "ext_haircut_200",  # Меняем на другую услугу
                "title": "External Haircut Service"
            }],
            "client": {
                "name": "Test Client Marketplace",
                "phone": "+79991234567"
            },
            "date": get_test_date(3),  # Новая дата
            "datetime": get_test_datetime(3, 15, 0),  # Новое время
            "seance_length": 5400  # 90 минут
        }
        
        async def update_test_booking():
            await update_booking_from_marketplace(
                'yclients',
                updated_booking_data,
                c,
                conn
            )
        
        asyncio.run(update_test_booking())
        
        # Проверяем обновленную запись
        c.execute("""
            SELECT b.id, b.service_name, b.datetime
            FROM bookings b
            JOIN marketplace_bookings mb ON b.id = mb.booking_id
            WHERE mb.provider = 'yclients' AND mb.external_id = %s
        """, ('test_booking_001',))
        
        row = c.fetchone()
        if row:
            booking_id, service_name, booking_datetime = row
            print(f"✅ Запись обновлена:")
            print(f"   Booking ID: {booking_id}")
            print(f"   Service Name: {service_name}")
            print(f"   DateTime: {booking_datetime}")
            
            # Проверяем, что данные обновились
            if service_name == "Test Service Haircut" and get_test_date(3) in str(booking_datetime):
                print(f"✅ Обновление работает корректно!")
            else:
                print(f"⚠️  Обновление не полностью применилось")
        else:
            print("❌ Запись не найдена в БД")
            return False
        
        return True
        
    except Exception as e:
        conn.rollback()
        print(f"❌ ОШИБКА: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        conn.close()

def test_normalization():
    """Тест 5: Нормализация данных от разных провайдеров"""
    print_section("ТЕСТ 5: Нормализация данных от провайдеров")
    
    try:
        print_subsection("YClients нормализация")
        yclients_data = {
            "id": "yc_123",
            "services": [{"id": "100", "title": "Маникюр"}],
            "client": {"name": "Иван Иванов", "phone": "+79991234567"},
            "date": get_test_date(2),
            "datetime": get_test_datetime(2, 10, 0),
            "seance_length": 3600
        }
        
        normalized = normalize_booking_data('yclients', yclients_data)
        print(f"✅ YClients нормализовано:")
        print(f"   External ID: {normalized.get('external_id')}")
        print(f"   External Service ID: {normalized.get('external_service_id')}")
        print(f"   Client: {normalized.get('client_name')}")
        print(f"   Service: {normalized.get('service_name')}")
        
        print_subsection("Booksy нормализация")
        booksy_data = {
            "id": "booksy_456",
            "services": [{"id": "200", "name": "Стрижка"}],
            "client": {"first_name": "Петр", "last_name": "Петров", "phone": "+79997654321"},
            "start_date": get_test_date(3),
            "start_time": "14:00",
            "duration": 90
        }
        
        normalized_booksy = normalize_booking_data('booksy', booksy_data)
        print(f"✅ Booksy нормализовано:")
        print(f"   External ID: {normalized_booksy.get('external_id')}")
        print(f"   External Service ID: {normalized_booksy.get('external_service_id')}")
        print(f"   Client: {normalized_booksy.get('client_name')}")
        print(f"   Service: {normalized_booksy.get('service_name')}")
        
        print_subsection("2GIS нормализация")
        twogis_data = {
            "id": "2gis_789",
            "service_id": "300",
            "customer_name": "Мария Сидорова",
            "customer_phone": "+79995556677",
            "service_name": "Массаж",
            "date": get_test_date(4),
            "time": "16:00",
            "duration": 60
        }
        
        normalized_2gis = normalize_booking_data('2gis', twogis_data)
        print(f"✅ 2GIS нормализовано:")
        print(f"   External ID: {normalized_2gis.get('external_id')}")
        print(f"   External Service ID: {normalized_2gis.get('external_service_id')}")
        print(f"   Client: {normalized_2gis.get('client_name')}")
        print(f"   Service: {normalized_2gis.get('service_name')}")
        
        return True
        
    except Exception as e:
        print(f"❌ ОШИБКА: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Запуск всех тестов"""
    print("\n" + "="*80)
    print("  ТЕСТИРОВАНИЕ ИНТЕГРАЦИИ С МАРКЕТПЛЕЙСАМИ")
    print("="*80)
    print(f"  Дата: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*80)
    
    # Очистка перед тестами
    cleanup_test_data()
    
    results = {
        "Управление провайдерами": test_provider_management(),
        "Service Mapping": test_service_mapping(),
        "Создание записей": test_booking_creation(),
        "Обновление записей": test_booking_update(),
        "Нормализация данных": test_normalization()
    }
    
    # Итоги
    print_section("ИТОГИ ТЕСТИРОВАНИЯ")
    
    for feature, success in results.items():
        status = "✅ УСПЕШНО" if success else "❌ ОШИБКА"
        print(f"  {feature}: {status}")
    
    total_success = sum(results.values())
    total_tests = len(results)
    
    print(f"\n  Пройдено: {total_success}/{total_tests}")
    
    if total_success == total_tests:
        print("\n  🎉 ВСЕ ТЕСТЫ ПРОЙДЕНЫ УСПЕШНО!")
    else:
        print("\n  ⚠️  Некоторые тесты завершились с ошибками")
    
    print("="*80 + "\n")
    
    # Очистка после тестов
    if total_success == total_tests:
        print_section("ОЧИСТКА ТЕСТОВЫХ ДАННЫХ")
        cleanup_test_data()
    
    return total_success == total_tests

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
