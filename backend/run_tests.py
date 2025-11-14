#!/usr/bin/env python3
"""
Главный скрипт для запуска всех тестов с подробным отчетом
"""
import subprocess
import sys
import os
from datetime import datetime
import json


def print_header(text):
    """Печать заголовка"""
    print("\n" + "=" * 80)
    print(f"  {text}")
    print("=" * 80)


def print_section(text):
    """Печать секции"""
    print(f"\n{'─' * 80}")
    print(f"  {text}")
    print(f"{'─' * 80}")


def run_pytest(markers=None, verbose=True):
    """Запуск pytest с определенными маркерами"""
    cmd = ["python", "-m", "pytest"]

    if verbose:
        cmd.append("-v")

    if markers:
        cmd.extend(["-m", markers])

    cmd.append("--tb=short")
    cmd.append("--color=yes")

    result = subprocess.run(cmd, capture_output=True, text=True, cwd=os.path.dirname(__file__))

    return {
        "returncode": result.returncode,
        "stdout": result.stdout,
        "stderr": result.stderr
    }


def main():
    """Главная функция"""
    start_time = datetime.now()

    print_header("🧪 ЗАПУСК ПОЛНОГО ТЕСТИРОВАНИЯ BEAUTY CRM")
    print(f"📅 Время запуска: {start_time.strftime('%Y-%m-%d %H:%M:%S')}")

    # Проверка что pytest установлен
    try:
        subprocess.run(["python", "-m", "pytest", "--version"], capture_output=True, check=True)
    except subprocess.CalledProcessError:
        print("\n❌ ОШИБКА: pytest не установлен!")
        print("Установите: pip install pytest")
        sys.exit(1)

    results = {}
    test_categories = [
        ("database", "🗄️  Тесты базы данных"),
        ("employees", "👥 Тесты сотрудников"),
        ("positions", "📋 Тесты должностей"),
        ("integration", "🔗 Интеграционные тесты"),
    ]

    # Запуск тестов по категориям
    for marker, description in test_categories:
        print_section(description)
        result = run_pytest(markers=marker)
        results[marker] = result

        if result['returncode'] == 0:
            print(f"✅ {description}: ПРОЙДЕНЫ")
        else:
            print(f"❌ {description}: ПРОВАЛЕНЫ")

        print(result['stdout'])

        if result['stderr']:
            print(f"⚠️  Предупреждения:")
            print(result['stderr'])

    # Запуск всех тестов вместе
    print_section("🎯 Запуск всех тестов")
    all_tests = run_pytest()
    results['all'] = all_tests

    print(all_tests['stdout'])

    # Итоговый отчет
    end_time = datetime.now()
    duration = (end_time - start_time).total_seconds()

    print_header("📊 ИТОГОВЫЙ ОТЧЕТ")

    passed_categories = sum(1 for r in results.values() if r['returncode'] == 0)
    total_categories = len(results)

    print(f"\n📈 Статистика:")
    print(f"   ├─ Категорий тестов: {len(test_categories)}")
    print(f"   ├─ Пройдено категорий: {passed_categories - 1}/{len(test_categories)}")  # -1 потому что 'all' это отдельно
    print(f"   ├─ Время выполнения: {duration:.2f} секунд")
    print(f"   └─ Статус: {'✅ ВСЕ ТЕСТЫ ПРОЙДЕНЫ' if all_tests['returncode'] == 0 else '❌ ЕСТЬ ПРОВАЛЫ'}")

    print("\n📋 Детальные результаты по категориям:")
    for marker, description in test_categories:
        result = results[marker]
        status = "✅ PASS" if result['returncode'] == 0 else "❌ FAIL"
        print(f"   {status} - {description}")

    # Сохранение отчета в файл
    report_file = f"test_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
    with open(report_file, 'w', encoding='utf-8') as f:
        f.write(f"BEAUTY CRM TEST REPORT\n")
        f.write(f"Время запуска: {start_time}\n")
        f.write(f"Время завершения: {end_time}\n")
        f.write(f"Длительность: {duration:.2f} секунд\n\n")

        for marker, description in test_categories:
            result = results[marker]
            f.write(f"\n{'=' * 80}\n")
            f.write(f"{description}\n")
            f.write(f"{'=' * 80}\n")
            f.write(result['stdout'])
            if result['stderr']:
                f.write(f"\nПредупреждения:\n{result['stderr']}\n")

        f.write(f"\n{'=' * 80}\n")
        f.write("ВСЕ ТЕСТЫ\n")
        f.write(f"{'=' * 80}\n")
        f.write(all_tests['stdout'])

    print(f"\n💾 Полный отчет сохранен: {report_file}")

    print("\n" + "=" * 80)

    return 0 if all_tests['returncode'] == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
