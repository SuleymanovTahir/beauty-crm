#!/usr/bin/env python3
"""
🧪 МАСТЕР-ФАЙЛ ДЛЯ ЗАПУСКА ВСЕХ ТЕСТОВ
Запускает все тесты проекта и выводит детальные логи
"""
import sys
import os
from datetime import datetime

# Добавляем путь к backend для импортов
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))


def print_header(text):
    """Красивый заголовок"""
    print("\n" + "=" * 80)
    print(f"  {text}")
    print("=" * 80)


def print_test_file(file_name, description=""):
    """Вывод информации о запускаемом тесте"""
    print(f"\n📄 Запуск: {file_name}")
    if description:
        print(f"   {description}")
    print("-" * 80)


def run_all_tests():
    """Запуск всех тестов проекта"""
    print_header("ЗАПУСК ВСЕХ ТЕСТОВ BEAUTY CRM")
    print(f"Дата: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    results = []

    # ========================================================================
    # 1. test_all.py - Основные тесты системы
    # ========================================================================
    print_test_file(
        "tests/test_all.py",
        "База данных + Новые функции + SmartAssistant + API модули"
    )
    try:
        from tests.test_all import main as test_all_main
        result = test_all_main()
        results.append(("test_all.py - Основные тесты", result))
    except Exception as e:
        print(f"❌ Ошибка: {e}")
        import traceback
        traceback.print_exc()
        results.append(("test_all.py - Основные тесты", False))

    # ========================================================================
    # 2. test_detailed.py - Детальные тесты
    # ========================================================================
    print_test_file(
        "tests/test_detailed.py",
        "Детальное тестирование БД, клиентов, записей, сотрудников"
    )
    try:
        from tests.test_detailed import main as test_detailed_main
        result = test_detailed_main()
        results.append(("test_detailed.py - Детальные тесты", result))
    except Exception as e:
        print(f"❌ Ошибка: {e}")
        import traceback
        traceback.print_exc()
        results.append(("test_detailed.py - Детальные тесты", False))

    # ========================================================================
    # 3. test_new_features.py - Тесты новых функций
    # ========================================================================
    print_test_file(
        "tests/test_new_features.py",
        "Тестирование новых фич системы"
    )
    try:
        from tests.test_new_features import main as test_new_features_main
        result = test_new_features_main()
        results.append(("test_new_features.py - Новые функции", result))
    except Exception as e:
        print(f"❌ Ошибка: {e}")
        import traceback
        traceback.print_exc()
        results.append(("test_new_features.py - Новые функции", False))

    # ========================================================================
    # 4. comprehensive_test.py - Комплексное тестирование
    # ========================================================================
    # print_test_file(
    #     "tests/comprehensive_test.py",
    #     "Полное end-to-end тестирование всей системы"
    # )
    # try:
    #     from tests.comprehensive_test import run_comprehensive_test
    #     result = run_comprehensive_test()
    #     results.append(("comprehensive_test.py - Комплексное тестирование", result))
    # except Exception as e:
    #     print(f"❌ Ошибка: {e}")
    #     import traceback
    #     traceback.print_exc()
    #     results.append(("comprehensive_test.py - Комплексное тестирование", False))

    # # ========================================================================
    # # 5. test_smart_assistant.py - AI ассистент
    # # ========================================================================
    # print_test_file(
    #     "tests/test_smart_assistant.py",
    #     "Тестирование AI SmartAssistant"
    # )
    # try:
    #     # Этот файл нужно запустить как subprocess т.к. у него есть if __name__
    #     import subprocess
    #     result = subprocess.run(
    #         [sys.executable, os.path.join(os.path.dirname(__file__), "test_smart_assistant.py")],
    #         capture_output=True,
    #         text=True
    #     )
    #     print(result.stdout)
    #     if result.stderr:
    #         print(result.stderr)
    #     success = result.returncode == 0
    #     results.append(("test_smart_assistant.py - AI ассистент", success))
    # except Exception as e:
    #     print(f"❌ Ошибка: {e}")
    #     import traceback
    #     traceback.print_exc()
    #     results.append(("test_smart_assistant.py - AI ассистент", False))

    # # ========================================================================
    # # 6. test_immediate_notification.py - Уведомления
    # # ========================================================================
    # print_test_file(
    #     "tests/test_immediate_notification.py",
    #     "Тестирование системы уведомлений"
    # )
    # try:
    #     import subprocess
    #     result = subprocess.run(
    #         [sys.executable, os.path.join(os.path.dirname(__file__), "test_immediate_notification.py")],
    #         capture_output=True,
    #         text=True
    #     )
    #     print(result.stdout)
    #     if result.stderr:
    #         print(result.stderr)
    #     success = result.returncode == 0
    #     results.append(("test_immediate_notification.py - Уведомления", success))
    # except Exception as e:
    #     print(f"❌ Ошибка: {e}")
    #     import traceback
    #     traceback.print_exc()
    #     results.append(("test_immediate_notification.py - Уведомления", False))

    # ========================================================================
    # 7. check_bot.py - Проверка бота
    # ========================================================================
    print_test_file(
        "tests/check_bot.py",
        "Проверка настроек и работы AI бота"
    )
    try:
        import subprocess
        result = subprocess.run(
            [sys.executable, os.path.join(os.path.dirname(__file__), "check_bot.py")],
            capture_output=True,
            text=True,
            timeout=600
        )
        print(result.stdout)
        if result.stderr:
            print(result.stderr)
        success = result.returncode == 0
        results.append(("check_bot.py - Проверка бота", success))
    except Exception as e:
        print(f"❌ Ошибка: {e}")
        import traceback
        traceback.print_exc()
        results.append(("check_bot.py - Проверка бота", False))

    # ========================================================================
    # 8. check_employees.py - Проверка сотрудников
    # ========================================================================
    # print_test_file(
    #     "tests/check_employees.py",
    #     "Проверка данных сотрудников"
    # )
    # try:
    #     import subprocess
    #     result = subprocess.run(
    #         [sys.executable, os.path.join(os.path.dirname(__file__), "check_employees.py")],
    #         capture_output=True,
    #         text=True
    #     )
    #     print(result.stdout)
    #     if result.stderr:
    #         print(result.stderr)
    #     success = result.returncode == 0
    #     results.append(("check_employees.py - Сотрудники", success))
    # except Exception as e:
    #     print(f"❌ Ошибка: {e}")
    #     import traceback
    #     traceback.print_exc()
    #     results.append(("check_employees.py - Сотрудники", False))

    # # ========================================================================
    # # 9. check_services.py - Проверка услуг
    # # ========================================================================
    # print_test_file(
    #     "tests/check_services.py",
    #     "Проверка услуг салона"
    # )
    # try:
    #     import subprocess
    #     result = subprocess.run(
    #         [sys.executable, os.path.join(os.path.dirname(__file__), "check_services.py")],
    #         capture_output=True,
    #         text=True
    #     )
    #     print(result.stdout)
    #     if result.stderr:
    #         print(result.stderr)
    #     success = result.returncode == 0
    #     results.append(("check_services.py - Услуги", success))
    # except Exception as e:
    #     print(f"❌ Ошибка: {e}")
    #     import traceback
    #     traceback.print_exc()
    #     results.append(("check_services.py - Услуги", False))

    # # ========================================================================
    # # 10. check_users.py - Проверка пользователей
    # # ========================================================================
    # print_test_file(
    #     "tests/check_users.py",
    #     "Проверка пользователей CRM"
    # )
    # try:
    #     import subprocess
    #     result = subprocess.run(
    #         [sys.executable, os.path.join(os.path.dirname(__file__), "check_users.py")],
    #         capture_output=True,
    #         text=True
    #     )
    #     print(result.stdout)
    #     if result.stderr:
    #         print(result.stderr)
    #     success = result.returncode == 0
    #     results.append(("check_users.py - Пользователи", success))
    # except Exception as e:
    #     print(f"❌ Ошибка: {e}")
    #     import traceback
    #     traceback.print_exc()
    #     results.append(("check_users.py - Пользователи", False))

    # # ========================================================================
    # # 11. check_migrations.py - Проверка миграций
    # # ========================================================================
    # print_test_file(
    #     "tests/check_migrations.py",
    #     "Проверка примененных миграций"
    # )
    # try:
    #     import subprocess
    #     result = subprocess.run(
    #         [sys.executable, os.path.join(os.path.dirname(__file__), "check_migrations.py")],
    #         capture_output=True,
    #         text=True
    #     )
    #     print(result.stdout)
    #     if result.stderr:
    #         print(result.stderr)
    #     success = result.returncode == 0
    #     results.append(("check_migrations.py - Миграции", success))
    # except Exception as e:
    #     print(f"❌ Ошибка: {e}")
    #     import traceback
    #     traceback.print_exc()
    #     results.append(("check_migrations.py - Миграции", False))

    # ========================================================================
    # 12. API тесты - test_reminders_api.py
    # ========================================================================
    print_test_file(
        "tests/api/test_reminders_api.py",
        "Тестирование API напоминаний о записях"
    )
    try:
        import subprocess
        result = subprocess.run(
            [sys.executable, os.path.join(os.path.dirname(__file__), "api/test_reminders_api.py")],
            capture_output=True,
            text=True
        )
        print(result.stdout)
        if result.stderr:
            print(result.stderr)
        success = result.returncode == 0
        results.append(("api/test_reminders_api.py - API напоминаний", success))
    except Exception as e:
        print(f"❌ Ошибка: {e}")
        import traceback
        traceback.print_exc()
        results.append(("api/test_reminders_api.py - API напоминаний", False))

    # ========================================================================
    # 13. API тесты - test_notifications_api.py
    # ========================================================================
    print_test_file(
        "tests/api/test_notifications_api.py",
        "Тестирование API уведомлений"
    )
    try:
        import subprocess
        result = subprocess.run(
            [sys.executable, os.path.join(os.path.dirname(__file__), "api/test_notifications_api.py")],
            capture_output=True,
            text=True
        )
        print(result.stdout)
        if result.stderr:
            print(result.stderr)
        success = result.returncode == 0
        results.append(("api/test_notifications_api.py - API уведомлений", success))
    except Exception as e:
        print(f"❌ Ошибка: {e}")
        import traceback
        traceback.print_exc()
        results.append(("api/test_notifications_api.py - API уведомлений", False))



    # ========================================================================
    # 14. Schedule API Tests
    # ========================================================================
    print_test_file(
        "tests/test_schedule.py",
        "Тестирование API расписания сотрудников"
    )
    try:
        import subprocess
        result = subprocess.run(
            [sys.executable, os.path.join(os.path.dirname(__file__), "test_schedule.py")],
            capture_output=True,
            text=True
        )
        print(result.stdout)
        if result.stderr:
            print(result.stderr)
        success = result.returncode == 0
        results.append(("test_schedule.py - API расписания", success))
    except Exception as e:
        print(f"❌ Ошибка: {e}")
        import traceback
        traceback.print_exc()
        results.append(("test_schedule.py - API расписания", False))
    # print_test_file(
    #     "tests/test_broadcasts_and_reminders.py",
    #     "Тестирование акционных рассылок и напоминаний Instagram"
    # )
    # try:
    #     import subprocess
    #     result = subprocess.run(
    #         [sys.executable, os.path.join(os.path.dirname(__file__), "test_broadcasts_and_reminders.py")],
    #         capture_output=True,
    #         text=True
    #     )
    #     print(result.stdout)
    #     if result.stderr:
    #         print(result.stderr)
    #     success = result.returncode == 0
    #     results.append(("test_broadcasts_and_reminders.py - Рассылки и напоминания", success))
    # except Exception as e:
    #     print(f"❌ Ошибка: {e}")
    #     import traceback
    #     traceback.print_exc()
    #     results.append(("test_broadcasts_and_reminders.py - Рассылки и напоминания", False))

    # # ========================================================================
    # # 15. Система управления правами
    # # ========================================================================
    # print_test_file(
    #     "tests/test_permissions.py",
    #     "Тестирование системы управления правами и ролями"
    # )
    # try:
    #     import subprocess
    #     result = subprocess.run(
    #         [sys.executable, os.path.join(os.path.dirname(__file__), "test_permissions.py")],
    #         capture_output=True,
    #         text=True
    #     )
    #     print(result.stdout)
    #     if result.stderr:
    #         print(result.stderr)
    #     success = result.returncode == 0
    #     results.append(("test_permissions.py - Управление правами", success))
    # except Exception as e:
    #     print(f"❌ Ошибка: {e}")
    #     import traceback
    #     traceback.print_exc()
    #     results.append(("test_permissions.py - Управление правами", False))

    # # ========================================================================
    # # ИТОГИ
    # # ========================================================================
    # print_header("ИТОГИ ТЕСТИРОВАНИЯ")

    # total = len(results)
    # passed = sum(1 for _, s in results if s)
    # failed = total - passed

    # for name, success in results:
    #     status = "✅ PASS" if success else "❌ FAIL"
    #     print(f"{status} - {name}")

    # print(f"\n  Всего тестов: {total}")
    # print(f"  Пройдено: {passed}")
    # print(f"  Провалено: {failed}")

    # if failed == 0:
    #     print("\n  🎉 ВСЕ ТЕСТЫ ПРОЙДЕНЫ УСПЕШНО!")
    # else:
    #     print("\n  ⚠️  Некоторые тесты провалены")
    #     print("  ℹ️  Проверьте логи выше для деталей")

    # print("=" * 80 + "\n")

    # return passed == total


if __name__ == "__main__":
    try:
        success = run_all_tests()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"\n❌ Критическая ошибка: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
