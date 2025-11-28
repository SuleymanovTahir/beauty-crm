#!/usr/bin/env python3
"""
Simplified Migration Runner - Uses Consolidated Migrations Only
"""
import sys
import os
from datetime import datetime

# Add backend to path
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.abspath(os.path.join(current_dir, '../../'))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from core.config import DATABASE_NAME


def print_header(text):
    print("\n" + "="*80)
    print(f"  {text}")
    print("="*80)


def run_migration_function(func, description):
    """Run a migration function and return success status"""
    try:
        print(f"\n📄 Миграция: {description}")
        print("-"*80)
        result = func(DATABASE_NAME)
        return result if result is not None else True
    except Exception as e:
        print(f"❌ Ошибка: {e}")
        import traceback
        traceback.print_exc()
        return False


def run_all_migrations():
    """Run all consolidated migrations"""
    print_header("ЗАПУСК ВСЕХ МИГРАЦИЙ CRM (КОНСОЛИДИРОВАННЫЕ)")
    print(f"Дата: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"База данных: {DATABASE_NAME}")

    results = {}

    # ========================================================================
    # ИНИЦИАЛИЗАЦИЯ БАЗОВЫХ ТАБЛИЦ
    # ========================================================================
    print_header("ИНИЦИАЛИЗАЦИЯ БАЗОВЫХ ТАБЛИЦ")
    try:
        from db.init import init_database
        init_database()
        print("✅ Базовые таблицы инициализированы")
    except Exception as e:
        print(f"❌ Ошибка инициализации: {e}")
        return False

    # ========================================================================
    # SCHEMA МИГРАЦИИ - КОНСОЛИДИРОВАННЫЕ
    # ========================================================================
    print_header("SCHEMA МИГРАЦИИ (КОНСОЛИДИРОВАННЫЕ)")
    
    from db.migrations.consolidated import (
        migrate_users_schema,
        migrate_bookings_schema,
        migrate_services_schema,
        migrate_clients_schema,
        migrate_bot_schema,
        migrate_salon_schema,
        migrate_other_schema,
    )
    
    results["consolidated/users"] = run_migration_function(
        migrate_users_schema,
        "Все изменения таблицы users"
    )
    
    results["consolidated/bookings"] = run_migration_function(
        migrate_bookings_schema,
        "Все изменения таблицы bookings"
    )
    
    results["consolidated/services"] = run_migration_function(
        migrate_services_schema,
        "Все изменения таблицы services"
    )
    
    results["consolidated/clients"] = run_migration_function(
        migrate_clients_schema,
        "Все изменения таблицы clients"
    )
    
    results["consolidated/bot"] = run_migration_function(
        migrate_bot_schema,
        "Все изменения таблицы bot_settings"
    )
    
    results["consolidated/salon"] = run_migration_function(
        migrate_salon_schema,
        "Все изменения таблицы salon_settings"
    )
    
    results["consolidated/other"] = run_migration_function(
        migrate_other_schema,
        "Все остальные таблицы"
    )

    # ========================================================================
    # ИТОГИ
    # ========================================================================
    print_header("ИТОГИ МИГРАЦИЙ")

    total = len(results)
    successful = sum(1 for r in results.values() if r)
    failed = total - successful

    print(f"\n📊 SCHEMA миграций:")
    for name, success in results.items():
        status = "✅" if success else "❌"
        print(f"  {status} {name}")

    print(f"\n  Всего миграций: {total}")
    print(f"  Успешно: {successful}")
    print(f"  Ошибок: {failed}")

    if failed == 0:
        print("\n  🎉 ВСЕ МИГРАЦИИ ВЫПОЛНЕНЫ УСПЕШНО!")
    else:
        print("\n  ⚠️  Некоторые миграции завершились с ошибками")

    print("="*80 + "\n")

    return failed == 0


if __name__ == "__main__":
    try:
        success = run_all_migrations()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"\n❌ Критическая ошибка: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
