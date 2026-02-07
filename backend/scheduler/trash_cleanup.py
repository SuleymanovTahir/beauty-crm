"""
Автоматическая очистка корзины
Удаляет элементы старше 30 дней каждую ночь в 03:00
"""
from datetime import datetime
from core.config import SHOW_SCHEDULER_START
from utils.logger import log_info, log_error
from utils.soft_delete import auto_cleanup_trash


def run_trash_cleanup():
    """Запустить очистку корзины"""
    try:
        log_info("🧹 Starting scheduled trash cleanup...", "scheduler")

        result = auto_cleanup_trash(days=30)

        total = sum(result.values())

        if total > 0:
            log_info(
                f"🧹 Trash cleanup completed: {result['clients']} clients, "
                f"{result['bookings']} bookings, {result['users']} users permanently deleted",
                "scheduler"
            )
        else:
            log_info("🧹 Trash cleanup: no items older than 30 days found", "scheduler")

        return result

    except Exception as e:
        log_error(f"Error in trash cleanup scheduler: {e}", "scheduler")
        return None


def start_trash_cleanup_scheduler(scheduler):
    """
    Регистрация задачи очистки корзины в планировщике
    Запускается каждый день в 03:00
    """
    try:
        scheduler.add_job(
            run_trash_cleanup,
            'cron',
            hour=3,
            minute=0,
            id='trash_cleanup',
            replace_existing=True,
            misfire_grace_time=3600  # Допустимое опоздание 1 час
        )

        if SHOW_SCHEDULER_START:
            log_info("🧹 Trash cleanup scheduler registered (runs at 03:00 daily)", "boot")

    except Exception as e:
        log_error(f"Failed to register trash cleanup scheduler: {e}", "scheduler")
