#!/usr/bin/env python3
"""
🧪 МАСТЕР-ФАЙЛ ДЛЯ ЗАПУСКА ТРЕТЬЕЙ ОЧЕРЕДИ ТЕСТОВ (v3)
Запускает тесты, которые не вошли в run_all_tests.py и run_all_test2.py
"""
import sys
import os
import subprocess
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

def run_suite_subprocess(subprocess_path, description=""):
    """
    Запуск теста как подпроцесс с замером времени
    """
    import time
    print_test_file(subprocess_path, description)
    start_time = time.time()
    success = False
    try:
        # Resolve path relative to backend root
        backend_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
        abs_path = os.path.join(backend_root, subprocess_path)
        
        env = os.environ.copy()
        env["PYTHONPATH"] = backend_root
        env["SKIP_REAL_MAIL"] = "true"
        
        result = subprocess.run(
            [sys.executable, abs_path],
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
        print(f"\n{status} - {subprocess_path} ({duration:.2f}s)")
        return success, duration
    except Exception as e:
        duration = time.time() - start_time
        print(f"❌ Критическая ошибка в {subprocess_path}: {e}")
        return False, duration

def run_all_tests3():
    """Запуск третьей очереди тестов проекта"""
    print_header("ЗАПУСК ТЕСТОВ BEAUTY SITE (V3)")
    print(f"Дата: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    results = []

    # 1. Database & Migrations
    results.append(("tests/check_migrations.py", *run_suite_subprocess("tests/check_migrations.py", description="Проверка консистентности БД и миграций")))
    
    # 2. Cleanup Logic (Critical for testing stability)
    results.append(("tests/test_cleanup.py", *run_suite_subprocess("tests/test_cleanup.py", description="Проверка логики очистки тестовых данных")))

    # 3. Registration & Authentication
    results.append(("scripts/testing/test_registration.py", *run_suite_subprocess("scripts/testing/test_registration.py", description="Тесты системы регистрации и подтверждения")))

    # 4. Manual/Special Logic Tests
    results.append(("tests/manual/test_settings_save.py", *run_suite_subprocess("tests/manual/test_settings_save.py", description="Тест сохранения настроек уведомлений")))

    # 5. Startup Extras
    results.append(("tests/startup/startup_tests.py", *run_suite_subprocess("tests/startup/startup_tests.py", description="Дополнительные проверки при старте")))

    # ИТОГИ
    print_header("ИТОГИ ТРЕТЬЕЙ ОЧЕРЕДИ ТЕСТИРОВАНИЯ")
    total = len(results)
    passed = sum(1 for _, s, _ in results if s)
    total_duration = sum(d for _, _, d in results)
    failed = total - passed

    for name, success, duration in results:
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status.ljust(8)} - {name.ljust(40)} ({duration:5.2f}s)")

    print(f"\n📊 Статистика (V3):")
    print(f"   Всего тестов: {total}")
    print(f"   Пройдено:     {passed}")
    print(f"   Провалено:    {failed}")
    print(f"   Общее время:  {total_duration:.2f}s")

    if failed == 0:
        print("\n🎉 ВСЕ ТЕСТЫ V3 ПРОЙДЕНЫ!\n")
    else:
        print(f"\n⚠️  ОБНАРУЖЕНО ОШИБОК: {failed}\n")

    return passed == total

if __name__ == "__main__":
    success = False
    try:
        success = run_all_tests3()
    except Exception as e:
        print(f"\n❌ Критическая ошибка: {e}")
        import traceback
        traceback.print_exc()
        
    sys.exit(0 if success else 1)
