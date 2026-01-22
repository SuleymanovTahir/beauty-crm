"""
Фоновая задача для проверки статуса пользователей онлайн
Помечает пользователей как оффлайн если нет активности более 2 минут
"""
import asyncio
from middleware.user_activity import mark_inactive_users
from utils.logger import log_info


async def check_inactive_users():
    """Проверяет и помечает неактивных пользователей как оффлайн"""
    while True:
        try:
            mark_inactive_users()
        except Exception as e:
            from utils.logger import log_error
            log_error(f"Error in user status checker: {e}", "scheduler")

        # Проверяем каждую минуту
        await asyncio.sleep(60)


def start_user_status_checker():
    """Запускает фоновую задачу проверки статуса пользователей"""
    log_info("Starting user status checker (marks inactive users as offline)", "scheduler")
    asyncio.create_task(check_inactive_users())
