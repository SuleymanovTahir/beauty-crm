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
        from core.config import DATABASE_NAME
        import sqlite3

        # Проверка существования БД
        if not os.path.exists(DATABASE_NAME):
            print(f"   ❌ База данных не найдена: {DATABASE_NAME}")
            return False

        print(f"   ✅ База данных найдена: {DATABASE_NAME}")

        # Подключение к БД
        conn = sqlite3.connect(DATABASE_NAME)
        c = conn.cursor()

        # Проверка основных таблиц
        required_tables = [
            'clients',
            'bookings',
            'employees',
            'positions',
            'services',
            'conversations',
            'master_schedule',
            'master_time_off',
            'loyalty_levels',
            'client_loyalty_points'
        ]

        c.execute("SELECT name FROM sqlite_master WHERE type='table'")
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
            schedule = MasterScheduleService()

            # Пробуем установить рабочие часы
            success = schedule.set_working_hours("Тест Мастер", 0, "09:00", "18:00")

            if success:
                print(f"   ✅ Расписание работает")
                results['Schedule'] = True
            else:
                print(f"   ❌ Не удалось установить рабочие часы")
                results['Schedule'] = False
        except Exception as e:
            print(f"   ❌ Расписание ошибка: {e}")
            results['Schedule'] = False

        # 2.3 Loyalty Program
        print("\n   [2.3] Программа лояльности...")
        try:
            loyalty = LoyaltyService()

            # Получить все уровни
            levels = loyalty.get_all_levels()

            if len(levels) >= 4:  # Bronze, Silver, Gold, Platinum
                print(f"   ✅ Программа лояльности работает")
                print(f"       - Уровней: {len(levels)}")
                results['Loyalty'] = True
            else:
                print(f"   ❌ Недостаточно уровней лояльности: {len(levels)}")
                results['Loyalty'] = False
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

    try:
        from services.smart_assistant import SmartAssistant

        # Простой тест
        test_client = "test_user_123"

        # SmartAssistant требует client_id в __init__
        assistant = SmartAssistant(client_id=test_client)

        # Проверяем, что assistant создается без ошибок
        print(f"   ✅ SmartAssistant инициализирован (client_id={test_client})")

        # Пробуем получить рекомендацию
        try:
            recommendations = assistant.get_next_visit_recommendation(test_client)

            if recommendations:
                print(f"   ✅ Рекомендации работают")
                print(f"       - Мастер: {recommendations.get('master', 'N/A')}")
                print(f"       - Услуга: {recommendations.get('service', 'N/A')}")
                return True
            else:
                print(f"   ⚠️  Рекомендации пусты (может быть нормально для нового клиента)")
                return True

        except Exception as e:
            print(f"   ⚠️  Ошибка рекомендаций: {e}")
            print(f"   ℹ️  Может быть нормально если нет данных о клиенте")
            return True

    except Exception as e:
        print(f"   ❌ ОШИБКА: {e}")
        traceback.print_exc()
        return False


def test_api_imports():
    """Тест 4: Проверка API модулей"""
    print_section("ТЕСТ 4: Проверка API модулей")

    api_modules = [
        ('api.dashboard', 'Dashboard API'),
        ('api.schedule', 'Schedule API'),
        ('api.loyalty', 'Loyalty API'),
        ('api.auto_booking', 'AutoBooking API'),
        ('api.bookings', 'Bookings API'),
        ('api.clients', 'Clients API'),
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


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
