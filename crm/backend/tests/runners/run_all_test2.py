#!/usr/bin/env python3
"""
🧪 МАСТЕР-ФАЙЛ ДЛЯ ЗАПУСКА ДОПОЛНИТЕЛЬНЫХ ТЕСТОВ (v2)
Запускает тесты, которые не вошли в основной набор run_all_tests.py
"""
import sys
import os
import subprocess
from datetime import datetime

# Добавляем путь к backend для импортов
BACKEND_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
TESTS_ROOT = os.path.join(BACKEND_ROOT, "tests")
if BACKEND_ROOT not in sys.path:
    sys.path.insert(0, BACKEND_ROOT)

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

def run_suite(suite_name, func=None, subprocess_path=None, description=""):
    """
    Универсальный запуск тестового набора с замером времени
    """
    import time
    print_test_file(suite_name, description)
    start_time = time.time()
    success = False
    try:
        if func:
            # Запуск функции напрямую
            success = func()
        elif subprocess_path:
            # Запуск как подпроцесс
            env = os.environ.copy()
            env["SKIP_REAL_MAIL"] = "true"
            env["PYTHONPATH"] = BACKEND_ROOT
            result = subprocess.run(
                [sys.executable, os.path.join(TESTS_ROOT, subprocess_path)],
                capture_output=True,
                text=True,
                timeout=300,
                env=env
            )
            if result.stdout:
                # Ограничиваем вывод если слишком длинный
                lines = result.stdout.splitlines()
                if len(lines) > 50:
                    print("\n".join(lines[:25]))
                    print(f"\n... [{len(lines)-50} lines truncated] ...\n")
                    print("\n".join(lines[-25:]))
                else:
                    print(result.stdout)
            
            if result.stderr:
                print(f"⚠️  STDERR:\n{result.stderr}")
            
            success = result.returncode == 0
        
        duration = time.time() - start_time
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"\n{status} - {suite_name} ({duration:.2f}s)")
        return success, duration
    except Exception as e:
        duration = time.time() - start_time
        print(f"❌ Критическая ошибка в {suite_name}: {e}")
        return False, duration

def run_all_tests2():
    """Запуск всех дополнительных тестов проекта"""
    print_header("ЗАПУСК ДОПОЛНИТЕЛЬНЫХ ТЕСТОВ BEAUTY CRM (V2)")
    print(f"Дата: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    results = []

    # 1. Comprehensive Test (Detailed Audit)
    results.append(("comprehensive_test.py", *run_suite("comprehensive_test.py", subprocess_path="comprehensive_test.py", description="Максимально подробная проверка всей системы")))

    # 2. Integration & Marketplace
    results.append(("test_marketplace_integration.py", *run_suite("test_marketplace_integration.py", subprocess_path="test_marketplace_integration.py", description="Интеграция с YClients, Booksy и др.")))

    # 3. Security & Logic
    results.append(("test_permissions.py", *run_suite("test_permissions.py", subprocess_path="test_permissions.py", description="Права доступа и роли")))

    # 4. Special Tests
    results.append(("test_employee_services_full.py", *run_suite("test_employee_services_full.py", subprocess_path="test_employee_services_full.py", description="Полный цикл услуг сотрудников")))
    results.append(("test_feedback_logic.py", *run_suite("test_feedback_logic.py", subprocess_path="test_feedback_logic.py", description="Логика сбора отзывов")))
    results.append(("test_gender_avatars.py", *run_suite("test_gender_avatars.py", subprocess_path="test_gender_avatars.py", description="Генерация аватарок по полу")))

    # 5. UI & Utils
    results.append(("test_ui_logic.py", *run_suite("test_ui_logic.py", subprocess_path="test_ui_logic.py", description="Логика интерфейса")))

    # 6. API Extensions
    results.append(("api/test_booking_email_notification.py", *run_suite("api/test_booking_email_notification.py", subprocess_path="api/test_booking_email_notification.py", description="Email уведомления о записях")))
    results.append(("api/test_save_notifications.py", *run_suite("api/test_save_notifications.py", subprocess_path="api/test_save_notifications.py", description="Сохранение уведомлений в БД")))

    # 7. System Checks
    results.append(("startup/startup_tests.py", *run_suite("startup/startup_tests.py", subprocess_path="startup/startup_tests.py", description="Тесты при запуске системы")))
    results.append(("check_employees.py", *run_suite("check_employees.py", subprocess_path="check_employees.py", description="Валидация списка сотрудников")))
    results.append(("check_services.py", *run_suite("check_services.py", subprocess_path="check_services.py", description="Валидация списка услуг")))
    results.append(("check_users.py", *run_suite("check_users.py", subprocess_path="check_users.py", description="Валидация пользователей системы")))

    # ИТОГИ
    print_header("ИТОГИ ДОПОЛНИТЕЛЬНОГО ТЕСТИРОВАНИЯ")
    total = len(results)
    passed = sum(1 for _, s, _ in results if s)
    total_duration = sum(d for _, _, d in results)
    failed = total - passed

    for name, success, duration in results:
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status.ljust(8)} - {name.ljust(40)} ({duration:5.2f}s)")

    print(f"\n📊 Статистика (V2):")
    print(f"   Всего тестов: {total}")
    print(f"   Пройдено:     {passed}")
    print(f"   Провалено:    {failed}")
    print(f"   Общее время:  {total_duration:.2f}s")

    if failed == 0:
        print("\n🎉 ВСЕ ДОПОЛНИТЕЛЬНЫЕ ТЕСТЫ ПРОЙДЕНЫ!\n")
    else:
        print(f"\n⚠️  ОБНАРУЖЕНО ОШИБОК: {failed}\n")

    return passed == total

if __name__ == "__main__":
    success = False
    try:
        success = run_all_tests2()
    except Exception as e:
        print(f"\n❌ Критическая ошибка: {e}")
        import traceback
        traceback.print_exc()
        
    sys.exit(0 if success else 1)
