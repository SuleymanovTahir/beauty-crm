#!/usr/bin/env python3
"""
Unified script to run all database fixes, migrations, and checks.
Usage: python3 backend/scripts/run_all_fixes.py
"""
import sys
import os
import asyncio
import types

# --- PATCH FOR PYTHON 3.13+ (Missing cgi module) ---
if "cgi" not in sys.modules:
    cgi_mock = types.ModuleType("cgi")
    cgi_mock.escape = lambda s, quote=True: s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;").replace("'", "&#x27;")
    sys.modules["cgi"] = cgi_mock
# ---------------------------------------------------

# Add backend directory to sys.path
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.abspath(os.path.join(current_dir, '..'))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)
    print(f"Added {backend_dir} to sys.path")

from utils.logger import log_info, log_error, log_warning

async def run_fix(name, func, *args, **kwargs):
    """Helper to run a fix function with logging"""
    print(f"\n{'='*60}")
    print(f"🔧 RUNNING: {name}")
    print(f"{'='*60}")
    try:
        if asyncio.iscoroutinefunction(func):
            await func(*args, **kwargs)
        else:
            func(*args, **kwargs)
        print(f"✅ SUCCESS: {name}")
        return True
    except Exception as e:
        print(f"❌ FAILED: {name}")
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        return False

def cleanup_system():
    """Clean up caches and logs"""
    print(f"\n{'='*60}")
    print(f"🧹 CLEANING SYSTEM")
    print(f"{'='*60}")
    
    # 1. Remove __pycache__
    print("🗑️  Removing __pycache__...")
    os.system('find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null')
    
    # 2. Remove translation cache
    cache_dir = os.path.join(backend_dir, "scripts", "translations", ".cache")
    if os.path.exists(cache_dir):
        print(f"🗑️  Removing translation cache: {cache_dir}")
        os.system(f'rm -rf "{cache_dir}"')
        
    # 3. Clear logs (keep files)
    log_dir = os.path.join(backend_dir, "logs")
    if os.path.exists(log_dir):
        print("📝 Clearing logs...")
        for log_file in os.listdir(log_dir):
            if log_file.endswith(".log"):
                file_path = os.path.join(log_dir, log_file)
                try:
                    # Open in write mode to truncate
                    with open(file_path, 'w') as f:
                        pass
                    print(f"   Cleared {log_file}")
                except Exception as e:
                    print(f"   ❌ Failed to clear {log_file}: {e}")
    
    print("✅ System cleanup complete")

async def main():
    print("🚀 STARTING UNIFIED FIX & CHECK SCRIPT")
    print(f"Backend Directory: {backend_dir}")
    
    # 0. Cleanup first
    cleanup_system()
    
    results = {}

    # 1. Database Initialization & Schema (Source of Truth: db/init.py)
    try:
        from db.init import init_database
        log_info("🏗️ Инициализация базы данных (db/init.py)...", "fix")
        # init_database is synchronous
        init_database()
        print("✅ SUCCESS: Database Initialization")
    except ImportError:
        log_error("⚠️  Skipping init_database (module not found)", "fix")
    except Exception as e:
        log_error(f"❌ Ошибка при инициализации БД: {e}", "fix")

    # 1.5 Public Content Schema Migration
    try:
        from db.migrations.consolidated.schema_public import migrate_public_schema
        from core.config import DATABASE_NAME
        log_info("🌐 Миграция публичного контента (banners, reviews, faq, gallery)...", "fix")
        migrate_public_schema(DATABASE_NAME)
        print("✅ SUCCESS: Public Content Schema Migration")
    except ImportError:
        log_error("⚠️  Skipping migrate_public_schema (module not found)", "fix")
    except Exception as e:
        log_error(f"❌ Ошибка при миграции публичного контента: {e}", "fix")

    # 1.6 Fix localhost URLs in database
    try:
        from scripts.maintenance.fix_localhost_urls import fix_localhost_urls
        log_info("🔗 Исправление localhost URL в изображениях...", "fix")
        fixed_count = fix_localhost_urls()
        print(f"✅ SUCCESS: Fixed {fixed_count} localhost URLs")
    except ImportError:
        log_warning("⚠️  Скрипт fix_localhost_urls не найден", "fix")
    except Exception as e:
        log_error(f"❌ Ошибка при исправлении URL: {e}", "fix")

    # 1.7 Optimize Images (Backend & Frontend) - Convert ALL to WebP
    try:
        from scripts.maintenance.optimize_images import optimize_images
        
        # 1. Optimize Backend Static (Standard)
        backend_static = os.path.join(backend_dir, "static")
        if os.path.exists(backend_static):
            log_info("🖼️ Конвертация и оптимизация изображений (Backend)...", "fix")
            optimize_images(backend_static, max_size_kb=500, max_width=1920)
        
        # 2. Optimize Frontend Public Landing Assets (Aggressive)
        frontend_dir = os.path.join(os.path.dirname(backend_dir), "frontend")
        frontend_public_landing = os.path.join(frontend_dir, "public_landing")
        if os.path.exists(frontend_public_landing):
            log_info("🖼️ Конвертация и оптимизация изображений (Frontend Public Landing)...", "fix")
            optimize_images(frontend_public_landing, max_size_kb=100, max_width=800)
        
        # 3. Optimize Frontend Src Pages Public (Aggressive for Logo etc)
        frontend_src_public = os.path.join(frontend_dir, "src", "pages", "public")
        if os.path.exists(frontend_src_public):
            log_info("🖼️ Конвертация и оптимизация изображений (Frontend Src Public)...", "fix")
            optimize_images(frontend_src_public, max_size_kb=100, max_width=500)
            
    except ImportError:
        log_warning("⚠️  Скрипт optimize_images не найден", "fix")
    except Exception as e:
        log_error(f"❌ Ошибка при оптимизации изображений: {e}", "fix")

    # 1.8 SEO Optimization (Image WebP conversion + Alt attribute check)
    try:
        from scripts.maintenance.seo_optimizer import main as seo_optimizer
        log_info("🔍 Запуск SEO оптимизации...", "fix")
        seo_optimizer()
        print("✅ SUCCESS: SEO Optimization")
    except ImportError:
        log_warning("⚠️  Скрипт seo_optimizer не найден", "fix")
    except Exception as e:
        log_error(f"❌ Ошибка при SEO оптимизации: {e}", "fix")


    # 2. Data Integrity Checks (fix_data.py) - FIXED IMPORT PATH
    try:
        from scripts.maintenance.fix_data import (
            check_bot_settings, check_users, check_salon_settings, 
            fix_manager_consultation_prompt, fix_booking_data_collection, 
            fix_missing_bot_fields
        )
        # 1. FIXES FIRST
        results['fix_manager_consultation_prompt'] = await run_fix("Fix Manager Consultation Prompt", fix_manager_consultation_prompt)
        results['fix_booking_data_collection'] = await run_fix("Fix Booking Data Collection", fix_booking_data_collection)
        results['fix_missing_bot_fields'] = await run_fix("Fix Missing Bot Fields", fix_missing_bot_fields)
        
        # 2. CHECKS AFTER FIXES
        results['check_bot_settings'] = await run_fix("Check Bot Settings", check_bot_settings)
        results['check_users'] = await run_fix("Check Users", check_users)
        results['check_salon_settings'] = await run_fix("Check Salon Settings", check_salon_settings)
    except ImportError as e:
        print(f"❌ ERROR importing fix_data: {e}")
        import traceback
        traceback.print_exc()

    # 3.5.4 Import employee photos
    try:
        from scripts.import_employee_photos import import_photos
        # Use run_fix to handle synchronous function correctly
        await run_fix("Import Employee Photos", import_photos)
    except ImportError:
        log_warning("⚠️ Скрипт import_employee_photos не найден", "fix")
    except Exception as e:
        log_error(f"❌ Ошибка при импорте фото: {e}", "fix")

    # 3.5.5 Seed test data (includes services and assignments)
    try:
        from scripts.testing.data.seed_test_data import seed_data
        log_info("🌱 Заполнение тестовыми данными (услуги и привязки)...", "fix")
        seed_data()
    except ImportError as e:
        log_warning(f"⚠️ Скрипт seed_test_data не найден: {e}", "fix")
    except Exception as e:
        log_error(f"❌ Ошибка при заполнении данными: {e}", "fix")

    # 3.5.6 Populate public content (FAQ, Salon Info)
    try:
        from scripts.populate_public_content import populate_all
        log_info("🌐 Заполнение публичного контента...", "fix")
        await populate_all()
    except ImportError:
        log_warning("⚠️ Скрипт populate_public_content не найден", "fix")
    except Exception as e:
        log_error(f"❌ Ошибка при заполнении публичного контента: {e}", "fix")

    # 4. Tests & Verifications
    # Skip API tests in production to avoid rate limits
    environment = os.getenv("ENVIRONMENT", "development")
    
    if environment == "development":
        try:
            from tests.manual.test_bot_persona import test_persona
            results['test_persona'] = await run_fix("Test Bot Persona", test_persona)
        except ImportError:
            print("⚠️  Skipping test_bot_persona (module not found)")
    else:
        print("⚠️  Skipping test_bot_persona (production mode - avoiding API rate limits)")

    try:
        from tests.manual.test_positions_and_notifications import test_changes
        results['test_positions_and_notifications'] = await run_fix("Test Positions & Notifications", test_changes)
    except ImportError:
        print("⚠️  Skipping test_positions_and_notifications (module not found)")

    try:
        from tests.manual.test_settings_save import test_save_settings
        results['test_save_settings'] = await run_fix("Test Settings Save", test_save_settings)
    except ImportError:
        print("⚠️  Skipping test_settings_save (module not found)")

    try:
        from tests.startup.startup_tests import run_all_startup_tests
        results['startup_tests'] = await run_fix("Startup Tests", run_all_startup_tests)
    except ImportError:
        print("⚠️  Skipping startup_tests (module not found)")

    # Summary
    print(f"\n{'='*60}")
    print("📊 EXECUTION SUMMARY")
    print(f"{'='*60}")
    success_count = sum(1 for r in results.values() if r)
    total_count = len(results)
    
    for name, success in results.items():
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {name}")
    
    print(f"\nTotal: {success_count}/{total_count} successful")
    print(f"{'='*60}")

if __name__ == "__main__":
    asyncio.run(main())
