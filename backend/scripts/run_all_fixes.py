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
        from scripts.maintenance.fix_data import fix_all_data
        # fix_all_data is likely synchronous, but let's check if we can run it
        # If it's sync, we can run it directly.
        try:
            fix_all_data() 
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

        # 3. Fix Master Services (Remove incorrect service assignments)
        log_info("3️⃣  Запуск fix_master_services.py...", "run_all_fixes")
        try:
            from scripts.maintenance.fix_master_services import main as fix_master_services_main
            fix_master_services_main()
            log_info("✅ fix_master_services.py выполнен успешно", "run_all_fixes")
        except Exception as e:
            log_error(f"❌ Ошибка в fix_master_services.py: {e}", "run_all_fixes")

        # 3.5. Assign Lashes to Jennifer (Ensure Jennifer has all lash services)
        log_info("3.5️⃣  Запуск assign_lashes_to_jennifer.py...", "run_all_fixes")
        try:
            from scripts.maintenance.assign_lashes_to_jennifer import assign_lashes_to_jennifer
            assigned = assign_lashes_to_jennifer()
            if assigned > 0:
                log_info(f"✅ assign_lashes_to_jennifer.py выполнен: назначено {assigned} услуг", "run_all_fixes")
            else:
                log_info("✅ assign_lashes_to_jennifer.py: все услуги уже назначены", "run_all_fixes")
        except Exception as e:
            log_error(f"❌ Ошибка в assign_lashes_to_jennifer.py: {e}", "run_all_fixes")

        # 4. Assign Masters to Services (Auto-assign masters to services without masters)
        log_info("4️⃣  Запуск assign_masters_to_services.py...", "run_all_fixes")
        try:
            from scripts.maintenance.assign_masters_to_services import assign_masters_auto
            # assign_masters_auto is synchronous
            result = assign_masters_auto(auto_assign=False)  # False = запрашивает подтверждение
            if result:
                log_info("✅ assign_masters_to_services.py выполнен успешно", "run_all_fixes")
            else:
                log_info("⚠️ assign_masters_to_services.py отменен пользователем", "run_all_fixes")
        except Exception as e:
            log_error(f"❌ Ошибка в assign_masters_to_services.py: {e}", "run_all_fixes")

        log_info("🎉 Все исправления завершены!", "run_all_fixes")

    except Exception as e:
        log_error(f"❌ Критическая ошибка в run_all_fixes: {e}", "run_all_fixes")

if __name__ == "__main__":
    asyncio.run(main())
