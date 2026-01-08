import asyncio
import os
import sys

# Add backend directory to path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)
    
from utils.logger import log_info, log_error

async def main():
    """
    Запускает все скрипты исправлений и обслуживания.
    """
    log_info("🔧 ЗАПУСК ВСЕХ ИСПРАВЛЕНИЙ...", "run_all_fixes")
    
    try:
        # 1. Fix Data (General maintenance)
        log_info("1️⃣  Запуск fix_data.py...", "run_all_fixes")
        from scripts.maintenance.fix_data import run_all_fixes
        # run_all_fixes is likely synchronous, but let's check if we can run it
        # If it's sync, we can run it directly.
        try:
            run_all_fixes() 
            log_info("✅ fix_data.py выполнен успешно", "run_all_fixes")
        except Exception as e:
            log_error(f"❌ Ошибка в fix_data.py: {e}", "run_all_fixes")

        # 2. SEO Optimizer (Optional but good)
        log_info("2️⃣  Запуск seo_optimizer.py...", "run_all_fixes")
        try:
            from scripts.maintenance.seo_optimizer import optimize_seo
            # Check if optimize_seo is async
            if asyncio.iscoroutinefunction(optimize_seo):
                await optimize_seo()
            else:
                optimize_seo()
            log_info("✅ seo_optimizer.py выполнен успешно", "run_all_fixes")
        except Exception as e:
             # It might not be critical
             log_error(f"⚠️ Ошибка в seo_optimizer.py: {e}", "run_all_fixes")

        # 3. Sync Master Services (Unified: Remove incorrect + Auto-assign)
        log_info("3️⃣  Запуск sync_master_services.py...", "run_all_fixes")
        try:
            from scripts.maintenance.sync_master_services import main as sync_master_services_main
            sync_master_services_main()
            log_info("✅ sync_master_services.py выполнен успешно", "run_all_fixes")
        except Exception as e:
            log_error(f"❌ Ошибка в sync_master_services.py: {e}", "run_all_fixes")

        # 4. Housekeeping (Periodic cleanup)
        log_info("4️⃣  Запуск housekeeping.py...", "run_all_fixes")
        try:
            from scripts.maintenance.housekeeping import run_housekeeping
            run_housekeeping()
            log_info("✅ housekeeping.py выполнен успешно", "run_all_fixes")
        except Exception as e:
            log_error(f"❌ Ошибка в housekeeping.py: {e}", "run_all_fixes")

        log_info("🎉 Все исправления завершены!", "run_all_fixes")

    except Exception as e:
        log_error(f"❌ Критическая ошибка в run_all_fixes: {e}", "run_all_fixes")

if __name__ == "__main__":
    asyncio.run(main())
