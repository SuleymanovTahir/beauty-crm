#!/usr/bin/env python3
"""
🧪 МАСТЕР-ФАЙЛ ДЛЯ ЗАПУСКА ВСЕХ ТЕСТОВ
Запускает все тесты проекта и выводит детальные логи
"""
import sys
import os
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

    print("-" * 80)

def cleanup_test_data():
    """
    Очистка тестовых данных после выполнения тестов.
    Удаляет пользователей, созданных во время тестирования.
    """
    try:
        from tests.test_utils import cleanup_all_test_users
        deleted = cleanup_all_test_users()
        print(f"🧹 Cleanup completed: удалено тестовых пользователей {deleted}")
    except Exception as e:
        print(f"⚠️  Cleanup skipped: {e}")

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
            import subprocess
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
        import traceback
        traceback.print_exc()
        return False, duration

def check_services_without_masters():
    """Проверка услуг без назначенных мастеров"""
    try:
        from db.connection import get_db_connection
        conn = get_db_connection()
        c = conn.cursor()
        
        c.execute("""
            SELECT s.id, s.name, s.category
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
            AND s.service_key NOT IN ('underarms', 'hair_wash')
            ORDER BY s.category, s.name
        """)
        
        services_without_masters = c.fetchall()
        conn.close()
        
        if services_without_masters:
            print(f"❌ Найдено {len(services_without_masters)} услуг без мастеров")
            return False
        return True
    except Exception as e:
        print(f"❌ Ошибка в проверке услуг: {e}")
        return False

def run_all_tests():
    """Запуск всех тестов проекта"""
    print_header("ЗАПУСК ВСЕХ ТЕСТОВ BEAUTY CRM")
    print(f"Дата: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    # 0. Подготовка данных
    print_header("ПОДГОТОВКА ДАННЫХ ПЕРЕД ТЕСТАМИ")
    try:
        from scripts.maintenance.fix_data import run_all_fixes
        run_all_fixes()
        print("✅ Данные подготовлены")
    except Exception as e:
        print(f"⚠️  Предупреждение при подготовке данных: {e}")

    results = []

    # 1. Основные тесты (теперь тихие если PASS)
    from tests.test_all import main as test_all_main
    results.append(("test_all.py - Основные тесты", *run_suite("test_all.py", func=test_all_main, description="База данных + Ассистент + API")))

    from tests.test_detailed import main as test_detailed_main
    results.append(("test_detailed.py - Детальные тесты", *run_suite("test_detailed.py", func=test_detailed_main, description="Клиенты, записи, сотрудники")))

    from tests.test_new_features import main as test_new_features_main
    results.append(("test_new_features.py - Новые функции", *run_suite("test_new_features.py", func=test_new_features_main, description="Новые фичи системы")))

    # 2. Модульные тесты через subprocess
    results.append(("api/test_reminders_api.py", *run_suite("api/test_reminders_api.py", subprocess_path="api/test_reminders_api.py")))
    results.append(("api/test_notifications_api.py", *run_suite("api/test_notifications_api.py", subprocess_path="api/test_notifications_api.py")))
    results.append(("test_schedule.py", *run_suite("test_schedule.py", subprocess_path="test_schedule.py")))
    results.append(("test_employee_management.py", *run_suite("test_employee_management.py", subprocess_path="test_employee_management.py")))
    
    # 2.1 Тесты миграций и новых функций
    from db.migrations.run_all_migrations import run_all_migrations
    results.append(("Миграции БД", *run_suite("run_all_migrations.py", func=run_all_migrations, description="Проверка всех миграций")))

    # 3. Дополнительные проверки
    results.append(("Проверка услуг без мастеров", *run_suite("Услуги без мастеров", func=check_services_without_masters)))

    # ИТОГИ
    print_header("ИТОГИ ТЕСТИРОВАНИЯ")
    total = len(results)
    passed = sum(1 for _, s, _ in results if s)
    total_duration = sum(d for _, _, d in results)
    failed = total - passed

    for name, success, duration in results:
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status.ljust(8)} - {name.ljust(40)} ({duration:5.2f}s)")

    print(f"\n📊 Статистика:")
    print(f"   Всего тестов: {total}")
    print(f"   Пройдено:     {passed}")
    print(f"   Провалено:    {failed}")
    print(f"   Общее время:  {total_duration:.2f}s")

    if failed == 0:
        print("\n🎉 ВСЕ ТЕСТЫ ПРОЙДЕНЫ УСПЕШНО!\n")
    else:
        print(f"\n⚠️  ОШИБОК: {failed}\n")

    return passed == total

if __name__ == "__main__":
    success = False
    try:
        success = run_all_tests()
    except Exception as e:
        print(f"\n❌ Критическая ошибка: {e}")
        import traceback
        traceback.print_exc()
    finally:
        cleanup_test_data()
        
    sys.exit(0 if success else 1)
