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

    # ========================================================================
    # СОЗДАНИЕ БАЗЫ ДАННЫХ ЕСЛИ НЕ СУЩЕСТВУЕТ
    # ========================================================================
    print_header("ПРОВЕРКА И СОЗДАНИЕ БАЗЫ ДАННЫХ")
    try:
        from scripts.maintenance.recreate_database import recreate_database
        recreate_database()
        print("✅ База данных проверена/создана")
    except Exception as e:
        print(f"❌ КРИТИЧЕСКАЯ ОШИБКА при создании БД: {e}")
        import traceback
        traceback.print_exc()
        print("\n⚠️  Невозможно продолжить без базы данных!")
        return False

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
        import traceback
        traceback.print_exc()
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
        migrate_bot_analytics_schema,
        migrate_salon_schema,
        migrate_other_schema,
        migrate_gallery_schema,
        migrate_public_schema,
        add_show_on_public_page_to_users,
        add_show_on_public_page_to_users,
        import_gallery_images,
    )
    
    # Import new schemas locally to register them
    # Since they are not in the 'consolidated/__init__.py' exports yet, we might need to modify that file too,
    # OR just import them here directly if the file allows relative imports or if they are in python path.
    # The simplest way is to update 'db/migrations/consolidated/__init__.py' to export them,
    # but for now I will add them here if possible, or assume they are added to __init__.py.
    
    # Let's check if we can import them from their files directly
    from db.migrations.consolidated.schema_newsletter import create_newsletter_table
    from db.migrations.consolidated.schema_cookies import create_cookie_consents_table
    from db.migrations.consolidated.schema_loyalty import migrate_loyalty_schema
    from db.migrations.consolidated.schema_preferences import migrate_preferences
    from db.migrations.consolidated.schema_holidays import migrate_holidays_schema

    results["consolidated/newsletter"] = run_migration_function(
        create_newsletter_table,
        "Таблица newsletter_subscribers"
    )

    results["consolidated/cookies"] = run_migration_function(
        create_cookie_consents_table,
        "Таблица cookie_consents"
    )

    from db.migrations.consolidated.schema_user_enhancements import migrate_user_enhancements
    results["consolidated/user_enhancements"] = run_migration_function(
        migrate_user_enhancements,
        "Расширение таблицы пользователей (avatar, birthday, notifications)"
    )
    
    # New migrations added here
    results["consolidated/preferences"] = run_migration_function(
        migrate_preferences,
        "Все изменения таблиц предпочтений и контекста"
    )
    
    results["consolidated/loyalty"] = run_migration_function(
        migrate_loyalty_schema,
        "Все изменения таблицы лояльности"
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

    results["consolidated/bot_analytics"] = run_migration_function(
        migrate_bot_analytics_schema,
        "Все изменения таблицы bot_analytics"
    )
    
    results["consolidated/salon"] = run_migration_function(
        migrate_salon_schema,
        "Все изменения таблицы salon_settings"
    )
    
    results["consolidated/other"] = run_migration_function(
        migrate_other_schema,
        "Все остальные таблицы"
    )
    
    results["consolidated/gallery"] = run_migration_function(
        migrate_gallery_schema,
        "Все изменения таблицы gallery_images"
    )
    
    results["consolidated/public"] = run_migration_function(
        migrate_public_schema,
        "Все изменения публичных таблиц (banners, reviews, faq, gallery)"
    )
    
    results["consolidated/holidays"] = run_migration_function(
        migrate_holidays_schema,
        "Таблица salon_holidays (праздничные дни)"
    )

    results["consolidated/holidays"] = run_migration_function(
        migrate_holidays_schema,
        "Таблица salon_holidays (праздничные дни)"
    )

    # ========================================================================
    # MIGRATION: CLIENT PREFERENCES & CONVERSATION CONTEXT
    # ========================================================================
    try:
        from db.migrations.run_migration_client_preferences import conn as pref_conn
        # Script executes on import, so we just check connection or define a wrapper if needed.
        # However, the script is designed to run on import/execution. 
        # Better approach: import the file logic or run it safely.
        # Given the script structure (runs on execution), we should probably treat it like the others if possible,
        # but it doesn't expose a single function cleanly. 
        # Let's use run_command style or better: modify the script to be importable, 
        # BUT for now I will use the subprocess approach OR better, import it inside a try/catch.
        
        # Actually, the file `run_migration_client_preferences.py` RUNS code on module level.
        # It creates tables directly.
        pass 
    except Exception as e:
        pass

    # Better: Use subprocess to run it to avoid module-level execution weirdness during import if cached
    import subprocess
    print_header("МИГРАЦИЯ: ПРЕДПОЧТЕНИЯ И КОНТЕКСТ")
    try:
        # Use sys.executable to ensure we use the same python interpreter
        result = subprocess.run(
            [sys.executable, "db/migrations/run_migration_client_preferences.py"],
            cwd=backend_dir,
            capture_output=True,
            text=True
        )
        if result.returncode == 0:
            print("✅ Миграция предпочтений выполнена успешно")
            results["migrations/client_preferences"] = True
        else:
            print(f"❌ Ошибка в миграции предпочтений:\n{result.stderr}")
            results["migrations/client_preferences"] = False
    except Exception as e:
        print(f"❌ Ошибка запуска миграции предпочтений: {e}")
        results["migrations/client_preferences"] = False
    
    # Add show_on_public_page to users (part of gallery feature)
    try:
        add_show_on_public_page_to_users()
    except Exception as e:
        print(f"⚠️  Предупреждение при добавлении show_on_public_page: {e}")
    
    # Import gallery images from disk (copy from frontend source to static/uploads and DB)
    try:
        from db.migrations.data.gallery.import_gallery_photos import import_gallery_photos
        import_gallery_photos()
    except Exception as e:
        print(f"⚠️  Предупреждение при импорте изображений галереи: {e}")

    # ========================================================================
    # SEEDING DATA (SERVICES & BANNERS)
    # ========================================================================
    print_header("ЗАПОЛНЕНИЕ ДАННЫМИ (SERVICES & BANNERS)")
    try:
        from scripts.setup.seed_production_data import seed_production_data
        seed_production_data()
        print("✅ Данные успешно загружены")
    except Exception as e:
        print(f"⚠️  Ошибка при заполнении данными: {e}")

    # ========================================================================
    # CLEAN SERVICE TRANSLATIONS
    # ========================================================================
    print_header("ОЧИСТКА ПЕРЕВОДОВ УСЛУГ")
    try:
        from scripts.maintenance.clean_all_service_translations import clean_all_service_translations
        clean_all_service_translations()
        print("✅ Переводы услуг очищены")
    except Exception as e:
        print(f"⚠️  Ошибка при очистке переводов: {e}")

    # ========================================================================
    # SEEDING PUBLIC CONTENT (FAQ & REVIEWS)
    # ========================================================================
    print_header("ЗАПОЛНЕНИЕ ПУБЛИЧНОГО КОНТЕНТА (FAQ & REVIEWS)")
    try:
        from db.migrations.consolidated.schema_public_content_seed import seed_public_content
        seed_public_content()
        print("✅ Публичный контент успешно загружен")
    except Exception as e:
        print(f"⚠️  Ошибка при заполнении публичного контента: {e}")

    # ========================================================================
    # RUN DATA FIXES (Employee details, profiles, etc.)
    # ========================================================================
    print_header("ЗАПУСК ИСПРАВЛЕНИЯ ДАННЫХ (ФУНКЦИОНАЛЬНОЕ ЗАПОЛНЕНИЕ)")
    try:
        from scripts.maintenance.fix_data import run_all_fixes
        run_all_fixes()
        print("✅ Исправления данных выполнены успешно")
    except Exception as e:
        print(f"⚠️  Ошибка при выполнении исправлений данных: {e}")

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
