#!/usr/bin/env python3
"""
Мастер-файл для запуска всех тестов проекта
"""
import sys
import os

# Добавляем путь к backend для импортов
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

def run_all_tests():
    """Запуск всех тестов проекта"""
    print("\n" + "=" * 70)
    print("ЗАПУСК ВСЕХ ТЕСТОВ BEAUTY CRM")
    print("=" * 70)

    results = []

    # 1. Тесты базы данных
    print("\n🔧 1. Тесты базы данных...")
    try:
        from tests.test_database import run_all_database_tests
        result = run_all_database_tests()
        results.append(("База данных", result))
    except Exception as e:
        print(f"❌ Ошибка: {e}")
        results.append(("База данных", False))

    # 2. Тесты сотрудников и должностей
    print("\n👥 2. Тесты сотрудников и должностей...")
    try:
        from tests.test_employees_positions import run_all_employee_tests
        result = run_all_employee_tests()
        results.append(("Сотрудники и должности", result))
    except Exception as e:
        print(f"❌ Ошибка: {e}")
        results.append(("Сотрудники и должности", False))

    # 3. Тесты функциональности
    print("\n⚙️  3. Тесты функциональности...")
    try:
        from tests.test_30_features import run_all_feature_tests
        result = run_all_feature_tests()
        results.append(("Функциональность", result))
    except Exception as e:
        print(f"❌ Ошибка: {e}")
        results.append(("Функциональность", False))

    # 4. Тесты API напоминаний
    print("\n🔔 4. Тесты API напоминаний...")
    try:
        from tests.api.test_reminders_api import run_all_reminder_tests
        result = run_all_reminder_tests()
        results.append(("API напоминаний", result))
    except Exception as e:
        print(f"❌ Ошибка: {e}")
        results.append(("API напоминаний", False))

    # 5. Тесты уведомлений
    print("\n📬 5. Тесты уведомлений...")
    try:
        from tests.api.test_notifications_api import run_all_notification_tests
        result = run_all_notification_tests()
        results.append(("Уведомления", result))
    except Exception as e:
        print(f"❌ Ошибка: {e}")
        results.append(("Уведомления", False))

    # Итоги
    print("\n" + "=" * 70)
    print("ИТОГИ ТЕСТИРОВАНИЯ")
    print("=" * 70)

    for name, success in results:
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {name}")

    total = len(results)
    passed = sum(1 for _, s in results if s)

    print(f"\nПройдено: {passed}/{total}")
    print("=" * 70)

    return passed == total


if __name__ == "__main__":
    try:
        success = run_all_tests()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"\n❌ Критическая ошибка: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
