#!/usr/bin/env python3
"""
Simplified Migration Runner - Uses Consolidated Migrations Only
"""
import sys
import os
import subprocess
from datetime import datetime

# Add backend to path
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.abspath(os.path.join(current_dir, '../../'))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)


from core.config import DATABASE_TYPE

def print_header(text):
    print("\n" + "="*80)
    print(f"  {text}")
    print("="*80)

def run_migration_function(func, description):
    """Run a migration function and return success status"""
    try:
        print(f"\n📄 Миграция: {description}")
        print("-"*80)
        result = func()
        if result is False: # Explicitly check for False return
             print(f"❌ Миграция вернула False (ошибка). ОСТАНОВКА.")
             sys.exit(1)
        return True
    except Exception as e:
        print(f"❌ Ошибка в миграции: {e}")
        import traceback
        traceback.print_exc()
        print("❌ Критическая ошибка миграции. ОСТАНОВКА.")
        sys.exit(1)

def run_all_migrations():
    """Run all consolidated migrations"""
    import subprocess
    print_header("ЗАПУСК ВСЕХ МИГРАЦИЙ CRM (КОНСОЛИДИРОВАННЫЕ)")
    print(f"Дата: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"База данных: PostgreSQL")

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
        import_gallery_images,
        migrate_account_enhancements,
        migrate_admin_features_schema,
        schema_soft_delete,
        schema_performance_indexes,
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
    from db.migrations.consolidated.schema_preferences import migrate_preferences
    from db.migrations.consolidated.schema_holidays import migrate_holidays_schema
    from db.migrations.consolidated.schema_004_tasks_and_pipelines import migration_004_tasks_and_pipelines
    from db.migrations.consolidated.schema_005_task_stages import migration_005_task_stages
    from db.migrations.consolidated.schema_006_currencies import apply_currencies_schema
    from db.migrations.consolidated.schema_service_assignments import run_migration as migrate_service_assignments
    from db.migrations.consolidated.schema_universal_constants import run_migration as migrate_universal_constants
    from db.migrations.consolidated.schema_challenges import migrate_challenges_schema

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

    results["consolidated/tasks_pipelines"] = run_migration_function(
        migration_004_tasks_and_pipelines,
        "Таблицы задач и воронок (004)"
    )

    results["consolidated/task_stages"] = run_migration_function(
        migration_005_task_stages,
        "Таблицы стадий задач (005)"
    )

    results["consolidated/currencies"] = run_migration_function(
        apply_currencies_schema,
        "Таблица currencies (006)"
    )
    
    results["consolidated/services"] = run_migration_function(
        migrate_services_schema,
        "Все изменения таблицы services"
    )

    results["consolidated/service_assignments"] = run_migration_function(
        migrate_service_assignments,
        "Автоматическое назначение услуг мастерам (по Position)"
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
    
    results["consolidated/universal_constants"] = run_migration_function(
        migrate_universal_constants,
        "Добавление констант бота (synonyms, keywords) в bot_settings"
    )
    
    results["consolidated/salon"] = run_migration_function(
        migrate_salon_schema,
        "Все изменения таблицы salon_settings"
    )
    
    results["consolidated/other"] = run_migration_function(
        migrate_other_schema,
        "Все остальные таблицы"
    )

    # Добавление недостающих колонок в visitor_tracking (referrer, device_type, browser)
    from db.migrations.add_analytics_columns import run_migration as add_analytics_columns
    results["visitor_tracking/analytics_columns"] = run_migration_function(
        add_analytics_columns,
        "Колонки referrer, device_type, browser в visitor_tracking"
    )

    results["consolidated/gallery"] = run_migration_function(
        migrate_gallery_schema,
        "Все изменения таблицы gallery_images"
    )

    results["consolidated/challenges"] = run_migration_function(
        migrate_challenges_schema,
        "Таблица active_challenges (Геймификация)"
    )
    
    results["consolidated/public"] = run_migration_function(
        migrate_public_schema,
        "Все изменения публичных таблиц (banners, reviews, faq, gallery)"
    )
    
    results["consolidated/holidays"] = run_migration_function(
        migrate_holidays_schema,
        "Таблица salon_holidays (праздничные дни)"
    )

    results["consolidated/account_enhancements"] = run_migration_function(
        migrate_account_enhancements,
        "Расширение ЛК (рефералки, галерея, достижения, избранные мастера)"
    )

    results["consolidated/admin_features"] = run_migration_function(
        migrate_admin_features_schema,
        "Админские функции (Лояльность, Уведомления, Настройки)"
    )

    from db.migrations.consolidated.schema_telephony import run_migration as migrate_telephony
    results["consolidated/telephony"] = run_migration_function(
        migrate_telephony,
        "Таблица call_logs (Телефония)"
    )

    from db.migrations.consolidated.schema_recording_folders import run_migration as migrate_recording_folders
    results["consolidated/recording_folders"] = run_migration_function(
        migrate_recording_folders,
        "Таблицы для управления папками записей (recording_folders, chat_recordings)"
    )

    from db.migrations.consolidated.schema_user_status import run_migration as migrate_user_status
    results["consolidated/user_status"] = run_migration_function(
        migrate_user_status,
        "Таблица user_status для отслеживания онлайн статуса пользователей"
    )

    from db.migrations.consolidated.schema_contracts import migrate as migrate_contracts
    results["consolidated/contracts"] = run_migration_function(
        migrate_contracts,
        "Таблица contracts (Договоры)"
    )

    from db.migrations.consolidated.schema_products import migrate as migrate_products
    results["consolidated/products"] = run_migration_function(
        migrate_products,
        "Таблица products (Товары)"
    )

    from db.migrations.consolidated.schema_invoices import migrate as migrate_invoices
    results["consolidated/invoices"] = run_migration_function(
        migrate_invoices,
        "Таблица invoices (Счета)"
    )

    from db.migrations.consolidated.schema_menu_settings import run_migration as migrate_menu_settings
    results["consolidated/menu_settings"] = run_migration_function(
        migrate_menu_settings,
        "Таблица menu_settings (Настройки меню)"
    )

    from db.migrations.consolidated.plan_updates import migrate as migrate_plans
    results["consolidated/plans"] = run_migration_function(
        migrate_plans,
        "Обновление планов (plans) и метрики (plan_metrics)"
    )

    from db.migrations.consolidated.schema_funnel_checkpoints import migrate as migrate_funnel_checkpoints
    results["consolidated/funnel_checkpoints"] = run_migration_function(
        migrate_funnel_checkpoints,
        "Таблица funnel_checkpoints (Контрольные точки воронки)"
    )

    # ========================================================================
    # SECURITY ENHANCEMENTS - SOFT DELETE & AUDIT LOG
    # ========================================================================
    print_header("УЛУЧШЕНИЯ БЕЗОПАСНОСТИ")
    
    results["security/soft_delete"] = run_migration_function(
        schema_soft_delete.run_migration,
        "Soft Delete (deleted_at, deleted_items)"
    )
    
    from db.migrations.create_audit_log import run as migrate_audit_log
    results["security/audit_log"] = run_migration_function(
        migrate_audit_log,
        "Audit Log (audit_log, critical_actions)"
    )

    results["performance/indexes"] = run_migration_function(
        schema_performance_indexes.run_migration,
        "Performance Indexes (bookings, chat, notifications)"
    )

    # ========================================================================
    # MIGRATION: NOTIFICATIONS TABLE
    # ========================================================================
    print_header("МИГРАЦИЯ: ТАБЛИЦА УВЕДОМЛЕНИЙ")
    try:
        result = subprocess.run(
            [sys.executable, "db/migrations/run_migration_notifications.py"],
            cwd=backend_dir,
            capture_output=True,
            text=True
        )
        if result.returncode == 0:
            print("✅ Таблица notifications создана успешно")
            results["migrations/notifications"] = True
        else:
            print(f"❌ Ошибка в миграции notifications:\nSTDOUT: {result.stdout}\nSTDERR: {result.stderr}")
            results["migrations/notifications"] = False
    except Exception as e:
        print(f"❌ Ошибка запуска миграции notifications: {e}")
        results["migrations/notifications"] = False

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
    # ИНТЕГРАЦИИ: ПЛАТЕЖНЫЕ СИСТЕМЫ
    # ========================================================================
    print_header("МИГРАЦИЯ: ПЛАТЕЖНЫЕ СИСТЕМЫ")
    
    from db.migrations.consolidated.schema_payment_integrations import migrate_payment_integrations
    results["integrations/payment_systems"] = run_migration_function(
        migrate_payment_integrations,
        "Интеграция с платежными системами (Stripe, Yookassa, Tinkoff)"
    )

    # ========================================================================
    # ИНТЕГРАЦИИ: МАРКЕТПЛЕЙСЫ
    # ========================================================================
    print_header("МИГРАЦИЯ: МАРКЕТПЛЕЙСЫ")
    
    from db.migrations.consolidated.schema_marketplace_integrations import migrate_marketplace_integrations
    results["integrations/marketplaces"] = run_migration_function(
        migrate_marketplace_integrations,
        "Интеграция с маркетплейсами (Yandex Maps, 2GIS, Google Business, Booksy, YCLIENTS)"
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
