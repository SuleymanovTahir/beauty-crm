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

from utils.logger import log_info, log_error

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

    # 1. Database Schema Fixes
    try:
        from scripts.maintenance.fix_db_notifications import fix_database
        results['fix_db_notifications'] = await run_fix("Fix DB Notifications", fix_database)
    except ImportError:
        print("⚠️  Skipping fix_db_notifications (module not found)")

    try:
        from scripts.maintenance.fix_db_positions import fix_positions_table
        results['fix_positions_table'] = await run_fix("Fix Positions Table", fix_positions_table)
    except ImportError:
        print("⚠️  Skipping fix_positions_table (module not found)")

    # 2. Data Linking
    try:
        from db.migrations.data.users.link_users_to_employees import link_users_to_employees
        results['link_users_to_employees'] = await run_fix("Link Users to Employees", link_users_to_employees)
    except ImportError:
        print("⚠️  Skipping link_users_to_employees (module not found)")

    # 3. Data Integrity Checks (fix_data.py)
    try:
        from scripts.maintenance.fix_data import (
            check_bot_settings, check_users, check_salon_settings, 
            fix_manager_consultation_prompt, fix_booking_data_collection, 
            fix_missing_bot_fields
        )
        results['check_bot_settings'] = await run_fix("Check Bot Settings", check_bot_settings)
        results['check_users'] = await run_fix("Check Users", check_users)
        results['check_salon_settings'] = await run_fix("Check Salon Settings", check_salon_settings)
        results['fix_manager_consultation_prompt'] = await run_fix("Fix Manager Consultation Prompt", fix_manager_consultation_prompt)
        results['fix_booking_data_collection'] = await run_fix("Fix Booking Data Collection", fix_booking_data_collection)
        results['fix_missing_bot_fields'] = await run_fix("Fix Missing Bot Fields", fix_missing_bot_fields)
    except ImportError:
        print("⚠️  Skipping fix_data checks (module not found)")

    # 3.5 Data Seeding
    try:
        from scripts.data.seed_full_data import main as seed_full_data
        results['seed_full_data'] = await run_fix("Seed Full Data", seed_full_data)
    except ImportError:
        print("⚠️  Skipping seed_full_data (module not found)")

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
