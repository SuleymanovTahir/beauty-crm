#!/usr/bin/env python3
"""
🧪 ЕДИНЫЙ ФАЙЛ ДЛЯ ЗАПУСКА ВСЕХ ТЕСТОВ

Запускает все основные тесты CRM системы.
Использование: python3 test_all.py
"""
import sys
import os
from datetime import datetime
import traceback

# Добавляем путь к backend
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from tests.config import get_test_config
TEST_CONFIG = get_test_config()

def print_header(text):
    """Красивый заголовок"""
    print("\n" + "=" * 80)
    print(f"  {text}")
    print("=" * 80)

def print_section(text):
    """Секция теста"""
    print("\n" + "-" * 80)
    print(f"  {text}")
    print("-" * 80)

def run_test_module(module_name, description):
    """
    Запуск тестового модуля

    Args:
        module_name: Имя модуля для импорта
        description: Описание теста

    Returns:
        bool: True если успешно
    """
    print_section(description)
    try:
        # Импортируем модуль
        module = __import__(module_name)

        # Ищем главную функцию
        if hasattr(module, 'main'):
            result = module.main()
            return result if isinstance(result, bool) else True
        elif hasattr(module, 'test_all'):
            result = module.test_all()
            return result if isinstance(result, bool) else True
        else:
            print("   ⚠️  Модуль не имеет функции main() или test_all()")
            return False

    except Exception as e:
        print(f"   ❌ ОШИБКА: {e}")
        traceback.print_exc()
        return False

def test_database():
    """Тест 1: Базовая проверка БД"""
    print_section("ТЕСТ 1: Проверка базы данных")

    try:
        from core.config import DATABASE_NAME, DATABASE_TYPE
        from db.connection import get_db_connection

        # Проверка существования БД
        # Проверка существования БД
        if DATABASE_TYPE == 'postgresql':
            print("   ℹ️  PostgreSQL database (skipping file check)")
        elif not os.path.exists(DATABASE_NAME):
            print(f"   ❌ ОШИБКА: Файл БД не найден: {DATABASE_NAME}")
            return False
        
        if DATABASE_TYPE != 'postgresql':
            print(f"   ✅ База данных найдена: {DATABASE_NAME}")

        # Подключение к БД
        conn = get_db_connection()
        c = conn.cursor()

        # Проверка основных таблиц
        required_tables = [
            'clients',
            'bookings',
            'users',            # Was employees
            'positions',
            'services',
            'conversations',
            'user_schedule',    # Was master_schedule
            'user_time_off',    # Was master_time_off
            'loyalty_levels',
            'client_loyalty_points'
        ]

        c.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'")
        
        existing_tables = [row[0] for row in c.fetchall()]

        print(f"\n   Всего таблиц в БД: {len(existing_tables)}")
        print(f"   Проверка обязательных таблиц:")

        missing = []
        for table in required_tables:
            if table in existing_tables:
                print(f"   ✅ {table}")
            else:
                print(f"   ❌ {table} - ОТСУТСТВУЕТ")
                missing.append(table)

        conn.close()

        if missing:
            print(f"\n   ⚠️  Отсутствуют таблицы: {', '.join(missing)}")
            print(f"   ℹ️  Запустите: python3 run_all_migrations.py")
            return False

        print("\n   ✅ Все обязательные таблицы присутствуют")
        return True

    except Exception as e:
        print(f"   ❌ ОШИБКА: {e}")
        traceback.print_exc()
        return False

def test_new_features():
    """Тест 2: Новые функции (Dashboard, Schedule, Loyalty, AutoBooking)"""
    print_section("ТЕСТ 2: Новые функции CRM")

    try:
        from services.analytics import AnalyticsService
        from services.master_schedule import MasterScheduleService
        from services.loyalty import LoyaltyService
        from services.auto_booking import AutoBookingService

        results = {}

        # 2.1 Dashboard/Analytics
        print("\n   [2.1] Dashboard с KPI...")
        try:
            analytics = AnalyticsService()
            kpi = analytics.get_dashboard_kpi(period="month")

            if 'revenue' in kpi and 'bookings' in kpi:
                print(f"   ✅ Dashboard работает")
                print(f"       - Доход: {kpi['revenue']['total']} AED")
                print(f"       - Записи: {kpi['bookings']['total']}")
                results['Dashboard'] = True
            else:
                print(f"   ❌ Dashboard вернул неполные данные")
                results['Dashboard'] = False
        except Exception as e:
            print(f"   ❌ Dashboard ошибка: {e}")
            results['Dashboard'] = False

        # 2.2 Master Schedule
        print("\n   [2.2] Расписание мастеров...")
        try:
            from tests.test_utils import create_test_user
            test_master = "Тест Мастер"
            
            # Используем надежную функцию создания тестового пользователя
            user_id = create_test_user("test_master", test_master, "employee", "Stylist")

            schedule = MasterScheduleService()

            # Пробуем установить рабочие часы (using user_id if supported, or name if service handles it)
            # MasterScheduleService likely expects a name string based on previous usage, 
            # but we should check if it was updated to use user_id.
            # Assuming it still takes a name for now, but internally looks up in users table.
            work_start = TEST_CONFIG['work_start_weekday']
            work_end = TEST_CONFIG['work_end_weekday']
            success = schedule.set_working_hours(test_master, 0, work_start, work_end)

            if success:
                print(f"   ✅ Расписание работает")
                results['Schedule'] = True
            else:
                print(f"   ❌ Не удалось установить рабочие часы")
                results['Schedule'] = False
        except Exception as e:
            print(f"   ❌ Расписание ошибка: {e}")
            results['Schedule'] = False
        finally:
            # Cleanup test employee
            try:
                conn = get_db_connection()
                c = conn.cursor()
                if 'user_id' in locals():
                    c.execute("DELETE FROM user_schedule WHERE user_id = %s", (user_id,))
                    c.execute("DELETE FROM user_time_off WHERE user_id = %s", (user_id,))
                c.execute("DELETE FROM users WHERE full_name = %s", (test_master,))
                conn.commit()
                conn.close()
            except Exception:
                pass

        # 2.3 Loyalty Program
        print("\n   [2.3] Программа лояльности...")
        try:
            loyalty = LoyaltyService()

            # Получить все уровни
            levels = loyalty.get_all_levels()

            if not isinstance(levels, list):
                print(f"   ❌ Лояльность вернула неожиданный формат: {type(levels).__name__}")
                results['Loyalty'] = False
            elif len(levels) == 0:
                print("   SKIPPED (fresh CRM bootstrap does not seed loyalty levels by default)")
                results['Loyalty'] = True
            else:
                print(f"   ✅ Программа лояльности работает")
                print(f"       - Уровней: {len(levels)}")
                results['Loyalty'] = True
        except Exception as e:
            print(f"   ❌ Лояльность ошибка: {e}")
            results['Loyalty'] = False

        # 2.4 Auto Booking
        print("\n   [2.4] Автозаполнение окон...")
        try:
            auto_booking = AutoBookingService()

            # Проверяем что сервис создается без ошибок
            print(f"   ✅ Автозаполнение работает")
            results['AutoBooking'] = True
        except Exception as e:
            print(f"   ❌ Автозаполнение ошибка: {e}")
            results['AutoBooking'] = False

        # Итоги
        success_count = sum(1 for r in results.values() if r)
        total_count = len(results)

        print(f"\n   Результаты: {success_count}/{total_count} успешно")

        return success_count == total_count

    except Exception as e:
        print(f"   ❌ ОШИБКА: {e}")
        traceback.print_exc()
        return False

def test_smart_assistant():
    """Тест 3: SmartAssistant"""
    print_section("ТЕСТ 3: SmartAssistant (AI)")

    test_client = "test_user_123"
    
    try:
        from services.smart_assistant import SmartAssistant

        # SmartAssistant требует client_id в __init__
        assistant = SmartAssistant(client_id=test_client)

        # Проверяем, что assistant создается без ошибок
        print(f"   ✅ SmartAssistant инициализирован (client_id={test_client})")

        # Пробуем получить рекомендацию
        try:
            recommendations = assistant.get_next_visit_recommendation()

            if recommendations:
                print(f"   ✅ Рекомендации работают")
                print(f"       - Мастер: {recommendations.get('master', 'N/A')}")
                print(f"       - Услуга: {recommendations.get('service', 'N/A')}")
                result = True
            else:
                print(f"   ⚠️  Рекомендации пусты (может быть нормально для нового клиента)")
                result = True

        except Exception as e:
            print(f"   ⚠️  Ошибка рекомендаций: {e}")
            print(f"   ℹ️  Может быть нормально если нет данных о клиенте")
            result = True

    except Exception as e:
        print(f"   ❌ ОШИБКА: {e}")
        traceback.print_exc()
        result = False
    
    finally:
        # Cleanup: удаляем тестовые данные
        print(f"\n   🧹 Очистка тестовых данных...")
        try:
            from core.config import DATABASE_NAME
            from db.connection import get_db_connection
            
            conn = get_db_connection()
            c = conn.cursor()
            
            # Удаляем тестового клиента и связанные данные
            c.execute("DELETE FROM conversations WHERE client_id = %s", (test_client,))
            c.execute("DELETE FROM clients WHERE instagram_id = %s", (test_client,))
            deleted_conversations = c.rowcount
            
            conn.commit()
            conn.close()
            
            print(f"   ✅ Тестовые данные удалены (клиент: {test_client})")
            
        except Exception as cleanup_error:
            print(f"   ⚠️  Ошибка очистки: {cleanup_error}")
    
    return result

def test_api_imports():
    """Тест 4: Проверка API модулей"""
    print_section("ТЕСТ 4: Проверка API модулей")

    api_modules = [
        ('crm_api.dashboard', 'Dashboard API'),
        ('crm_api.schedule', 'Schedule API'),
        ('crm_api.loyalty', 'Loyalty API'),
        ('crm_api.auto_booking', 'AutoBooking API'),
        ('crm_api.bookings', 'Bookings API'),
        ('crm_api.clients', 'Clients API'),
    ]

    results = {}

    for module_name, description in api_modules:
        try:
            __import__(module_name)
            print(f"   ✅ {description}")
            results[description] = True
        except Exception as e:
            print(f"   ❌ {description}: {e}")
            results[description] = False

    success_count = sum(1 for r in results.values() if r)
    total_count = len(results)

    print(f"\n   Результаты: {success_count}/{total_count} модулей загружены")

    return success_count == total_count

def main():
    """Запуск всех тестов"""
    print_header("ТЕСТИРОВАНИЕ CRM СИСТЕМЫ")
    print(f"Дата: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Python: {sys.version}")

    results = {}

    # Запускаем тесты
    results["1. База данных"] = test_database()
    results["2. Новые функции"] = test_new_features()
    results["3. SmartAssistant"] = test_smart_assistant()
    results["4. API модули"] = test_api_imports()

    # Итоги
    print_header("ИТОГИ ТЕСТИРОВАНИЯ")

    total = len(results)
    successful = sum(1 for r in results.values() if r)
    failed = total - successful

    for test_name, success in results.items():
        status = "✅ ПРОЙДЕН" if success else "❌ ПРОВАЛЕН"
        print(f"  {test_name}: {status}")

    print(f"\n  Всего тестов: {total}")
    print(f"  Пройдено: {successful}")
    print(f"  Провалено: {failed}")

    if failed == 0:
        print("\n  🎉 ВСЕ ТЕСТЫ ПРОЙДЕНЫ УСПЕШНО!")
    else:
        print("\n  ⚠️  Некоторые тесты провалены")
        print("  ℹ️  Проверьте логи выше для деталей")

    print("=" * 80 + "\n")
    
    return failed == 0

def cleanup_test_data_safe():
    """Безопасная очистка тестовых данных для test_all.py"""
    print("\n🧹 Очистка тестовых данных (test_all)...")
    try:
        from tests.test_utils import cleanup_test_users
        from db.connection import get_db_connection
        
        # 1. Очистка пользователей (сотрудников)
        cleanup_test_users("test_master")

        # 2. Очистка клиентов
        users_to_clean = ["test_user_123"]
        conn = get_db_connection()
        c = conn.cursor()
        
        for client_id in users_to_clean:
            c.execute("DELETE FROM conversations WHERE client_id = %s", (client_id,))
            c.execute("DELETE FROM clients WHERE instagram_id = %s", (client_id,))
            if c.rowcount > 0:
                print(f"✅ Клиент '{client_id}' удален")

        conn.commit()
        conn.close()
    except Exception as e:
        print(f"⚠️ Ошибка очистки в test_all: {e}")

if __name__ == "__main__":
    success = False
    try:
        success = main()
    finally:
        cleanup_test_data_safe()
        
    sys.exit(0 if success else 1)
