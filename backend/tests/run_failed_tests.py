#!/usr/bin/env python3
"""
Запуск только тех тестов, которые провалились в прошлый раз
"""
import subprocess
import sys
import os
from datetime import datetime

# Список тестов, которые провалились
FAILED_TESTS = [
    {
        "file": "test_all.py",
        "description": "Основные тесты",
        "skip": False
    },
    {
        "file": "test_detailed.py",
        "description": "Детальные тесты",
        "skip": False
    },
    {
        "file": "test_new_features.py",
        "description": "Новые функции",
        "skip": False
    },
    {
        "file": "test_smart_assistant.py",
        "description": "AI ассистент",
        "skip": False
    },
    {
        "file": "test_immediate_notification.py",
        "description": "Уведомления",
        "skip": False
    },
    {
        "file": "check_bot.py",
        "description": "Проверка бота",
        "skip": True,  # Пропускаем - зависает из-за asyncio и AI API
        "skip_reason": "Требует AI API и может долго выполняться"
    },
    {
        "file": "check_employees.py",
        "description": "Сотрудники",
        "skip": False
    },
    {
        "file": "check_services.py",
        "description": "Услуги",
        "skip": False
    },
    {
        "file": "check_users.py",
        "description": "Пользователи",
        "skip": False
    },
    {
        "file": "api/test_reminders_api.py",
        "description": "API напоминаний",
        "skip": False
    },
    {
        "file": "api/test_notifications_api.py",
        "description": "API уведомлений",
        "skip": False
    }
]

def print_header(text):
    """Красивый заголовок"""
    print("\n" + "=" * 80)
    print(f"  {text}")
    print("=" * 80)

def print_section(text):
    """Секция"""
    print("\n" + "-" * 80)
    print(f"  {text}")
    print("-" * 80)

def run_test(test_file, description, timeout=30):
    """
    Запустить тест

    Returns:
        bool: True если успешно
    """
    test_path = os.path.join(os.path.dirname(__file__), test_file)

    if not os.path.exists(test_path):
        print(f"   ⚠️  Файл не найден: {test_file}")
        return False

    print_section(f"{description} ({test_file})")

    try:
        result = subprocess.run(
            [sys.executable, test_path],
            capture_output=True,
            text=True,
            timeout=timeout
        )

        # Выводим вывод теста
        if result.stdout:
            print(result.stdout)
        if result.stderr:
            print("STDERR:", result.stderr)

        # Проверяем код возврата
        if result.returncode == 0:
            print(f"   ✅ PASS - {description}")
            return True
        else:
            print(f"   ❌ FAIL - {description} (код: {result.returncode})")
            return False

    except subprocess.TimeoutExpired:
        print(f"   ❌ FAIL - {description} (превышено время ожидания {timeout}с)")
        return False
    except Exception as e:
        print(f"   ❌ FAIL - {description}")
        print(f"   Ошибка: {e}")
        return False

def main():
    """Главная функция"""
    print_header("ЗАПУСК ПРОВАЛИВАВШИХСЯ ТЕСТОВ")
    print(f"Дата: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    results = []
    skipped = []

    for test in FAILED_TESTS:
        file = test["file"]
        description = test["description"]
        skip = test.get("skip", False)

        if skip:
            skip_reason = test.get("skip_reason", "Не указана причина")
            print_section(f"⏭️  ПРОПУСКАЕМ: {description} ({file})")
            print(f"   Причина: {skip_reason}")
            skipped.append((description, file, skip_reason))
            continue

        success = run_test(file, description)
        results.append((description, file, success))

    # Итоги
    print_header("ИТОГИ ТЕСТИРОВАНИЯ")

    if skipped:
        print("\n⏭️  Пропущенные тесты:")
        for desc, file, reason in skipped:
            print(f"   ⏭️  {desc} ({file})")
            print(f"      Причина: {reason}")

    print("\n📊 Результаты:")
    for desc, file, success in results:
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"   {status} - {desc} ({file})")

    total = len(results)
    passed = sum(1 for _, _, s in results if s)
    failed = total - passed

    print(f"\n   Всего тестов: {total}")
    print(f"   Пройдено: {passed}")
    print(f"   Провалено: {failed}")
    if skipped:
        print(f"   Пропущено: {len(skipped)}")

    if failed == 0:
        print("\n" + "=" * 80)
        print("  🎉 ВСЕ ТЕСТЫ ПРОЙДЕНЫ!")
        print("=" * 80)
        return 0
    else:
        print("\n" + "=" * 80)
        print(f"  ⚠️  {failed} тест(ов) провалено")
        print("=" * 80)
        return 1

if __name__ == "__main__":
    sys.exit(main())
