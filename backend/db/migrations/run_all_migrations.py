#!/usr/bin/env python3
"""
🔧 ЕДИНЫЙ ФАЙЛ ДЛЯ ЗАПУСКА ВСЕХ МИГРАЦИЙ

Запускает все миграции в правильном порядке.
Использование: python3 run_all_migrations.py
"""
import sys
import os
import sqlite3
from datetime import datetime

# Убеждаемся что мы в правильной директории
os.chdir(os.path.dirname(__file__))

# Импортируем все миграции
from db.migrations.schema.employees.link_employees_positions import link_employees_positions

def print_header(text):
    """Красивый заголовок"""
    print("\n" + "=" * 80)
    print(f"  {text}")
    print("=" * 80)


def print_step(number, text):
    """Шаг миграции"""
    print(f"\n[{number}] {text}")


def run_simple_migration(file_path, description):
    """
    Запуск простой миграции из файла

    Args:
        file_path: Путь к файлу миграции
        description: Описание миграции

    Returns:
        bool: True если успешно
    """
    try:
        # Читаем и выполняем файл миграции
        with open(file_path, 'r', encoding='utf-8') as f:
            code = f.read()

        # Создаем изолированное пространство имен
        namespace = {
            '__file__': file_path,
            '__name__': '__main__'
        }

        # Выполняем код миграции
        exec(code, namespace)

        return True
    except Exception as e:
        print(f"   ❌ Ошибка: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """Запуск всех миграций"""
    print_header("ЗАПУСК ВСЕХ МИГРАЦИЙ CRM")
    print(f"Дата: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    results = {}

    # ===================================================================
    # МИГРАЦИЯ 1: Link employees and positions
    # ===================================================================
    print_step(1, "Связывание employees и positions (position_id)")
    print("   Описание: Добавляет поле position_id в таблицу employees")
    try:
        result = link_employees_positions()
        results["1. Link employees positions"] = result
        if result:
            print("   ✅ Успешно")
        else:
            print("   ⚠️  Завершено с предупреждениями")
    except Exception as e:
        print(f"   ❌ Ошибка: {e}")
        results["1. Link employees positions"] = False

    # ===================================================================
    # МИГРАЦИЯ 2: Preferred messenger
    # ===================================================================
    print_step(2, "Добавление preferred_messenger в clients")
    print("   Описание: Позволяет клиентам выбрать предпочитаемый мессенджер")
    result = run_simple_migration(
        "run_migration_preferred_messenger.py",
        "Preferred messenger"
    )
    results["2. Preferred messenger"] = result

    # ===================================================================
    # МИГРАЦИЯ 3: Telegram chat_id
    # ===================================================================
    print_step(3, "Добавление telegram_chat_id в clients")
    print("   Описание: Хранит Telegram chat ID для отправки уведомлений")
    result = run_simple_migration(
        "run_migration_telegram_chat_id.py",
        "Telegram chat_id"
    )
    results["3. Telegram chat_id"] = result

    # ===================================================================
    # МИГРАЦИЯ 4: Notification preferences
    # ===================================================================
    print_step(4, "Настройки уведомлений")
    print("   Описание: Таблица для хранения настроек уведомлений мастеров")
    result = run_simple_migration(
        "run_migration_notification_preferences.py",
        "Notification preferences"
    )
    results["4. Notification preferences"] = result

    # ===================================================================
    # МИГРАЦИЯ 5: Client preferences
    # ===================================================================
    print_step(5, "Предпочтения клиентов")
    print("   Описание: Хранит предпочтения клиентов (время, мастер, услуги)")
    result = run_simple_migration(
        "run_migration_client_preferences.py",
        "Client preferences"
    )
    results["5. Client preferences"] = result

    # ===================================================================
    # МИГРАЦИЯ 6: Master schedule
    # ===================================================================
    print_step(6, "Расписание мастеров")
    print("   Описание: Рабочие часы, выходные, доступные слоты")
    result = run_simple_migration(
        "run_migration_master_schedule.py",
        "Master schedule"
    )
    results["6. Master schedule"] = result

    # ===================================================================
    # МИГРАЦИЯ 6.1: Fix master schedule (nullable times)
    # ===================================================================
    print_step("6.1", "Исправление расписания (разрешить NULL)")
    print("   Описание: Позволяет хранить выходные дни (NULL для start/end time)")
    result = run_simple_migration(
        "migration_fix_master_schedule_nullable.py",
        "Fix master schedule nullable"
    )
    results["6.1. Fix master schedule"] = result

    # ===================================================================
    # МИГРАЦИЯ 7: Loyalty program
    # ===================================================================
    print_step(7, "Программа лояльности")
    print("   Описание: Баллы, транзакции, уровни (Bronze/Silver/Gold/Platinum)")
    result = run_simple_migration(
        "run_migration_loyalty_program.py",
        "Loyalty program"
    )
    results["7. Loyalty program"] = result

    # ===================================================================
    # ИТОГИ
    # ===================================================================
    print_header("ИТОГИ МИГРАЦИЙ")

    total = len(results)
    successful = sum(1 for r in results.values() if r)
    failed = total - successful

    for migration, success in results.items():
        status = "✅ УСПЕШНО" if success else "❌ ОШИБКА"
        print(f"  {migration}: {status}")

    print(f"\n  Всего миграций: {total}")
    print(f"  Успешно: {successful}")
    print(f"  Ошибок: {failed}")

    if failed == 0:
        print("\n  🎉 ВСЕ МИГРАЦИИ ПРИМЕНЕНЫ УСПЕШНО!")
        print("\n  ℹ️  База данных готова к работе")
    else:
        print("\n  ⚠️  Некоторые миграции завершились с ошибками")
        print("  ℹ️  Проверьте логи выше для деталей")

    print("=" * 80 + "\n")

    return failed == 0


def run_all_migrations():
    """
    Алиас для main() - для импорта в других модулях
    """
    return main()


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
