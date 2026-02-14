from apscheduler.schedulers.asyncio import AsyncIOScheduler

from utils.logger import log_info


def start_crm_runtime_services() -> None:
    """
    Start CRM runtime services (bot + module status) in CRM-enabled runtimes.
    """
    from bot import get_bot
    from modules import print_modules_status

    get_bot()
    print_modules_status()


def start_crm_schedulers() -> bool:
    """
    Start all CRM schedulers.

    Returns:
        bool: True when schedulers are started, False when scheduler module is disabled.
    """
    from modules import is_module_enabled

    if not is_module_enabled("scheduler"):
        return False

    from scheduler import (
        start_birthday_checker,
        start_client_birthday_checker,
        start_booking_reminder_checker,
        start_task_checker,
        start_user_status_checker,
    )

    start_birthday_checker()
    start_client_birthday_checker()
    start_booking_reminder_checker()
    start_task_checker()
    start_user_status_checker()

    cron = AsyncIOScheduler(
        job_defaults={"misfire_grace_time": 3600},
        timezone="Asia/Dubai",
    )

    from services.reminder_service import check_and_send_reminders
    from bot.reminders.abandoned import check_abandoned_bookings
    from bot.reminders.feedback import check_visits_for_feedback
    from bot.reminders.retention import check_client_retention
    from bot.reminders.appointments import check_appointment_reminders
    from scripts.maintenance.housekeeping import run_housekeeping
    from scripts.maintenance.cleanup_sessions import cleanup_expired_sessions

    cron.add_job(check_and_send_reminders, "interval", minutes=30, id="ig_reminders")
    cron.add_job(check_abandoned_bookings, "interval", minutes=10, id="abandoned")
    cron.add_job(check_visits_for_feedback, "interval", minutes=60, id="feedback")
    cron.add_job(check_client_retention, "cron", hour=11, minute=0, id="retention")
    cron.add_job(check_appointment_reminders, "interval", minutes=30, id="appointments")
    cron.add_job(run_housekeeping, "cron", hour=3, minute=0, id="cleaning")
    cron.add_job(cleanup_expired_sessions, "interval", hours=6, id="sessions")

    from scheduler.weekly_report_checker import start_weekly_report_checker

    start_weekly_report_checker(cron)

    from scheduler.database_backup_checker import check_database_backup

    cron.add_job(check_database_backup, "cron", hour=4, minute=0, id="database_backup")
    log_info("📦 Database backup scheduler registered (runs at 04:00 daily)", "boot")

    from scheduler.trash_cleanup import start_trash_cleanup_scheduler

    start_trash_cleanup_scheduler(cron)
    cron.start()
    log_info("✅ Планировщики (Mission-control) активны", "boot")
    return True
