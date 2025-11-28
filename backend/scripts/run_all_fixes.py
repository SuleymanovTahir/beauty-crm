#!/usr/bin/env python3
"""
Unified script to run all database fixes, migrations, and checks.
Usage: python3 backend/scripts/run_all_fixes.py
"""
import sys
import os
import asyncio

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

async def main():
    print("🚀 STARTING UNIFIED FIX & CHECK SCRIPT")
    print(f"Backend Directory: {backend_dir}")
    
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
