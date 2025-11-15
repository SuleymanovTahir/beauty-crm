#!/usr/bin/env python3
"""
Startup тесты - БЕЗ HTTP запросов (для запуска при старте сервера)
Эти тесты выполняются ДО того как сервер начнет слушать порт
"""
import sys
import os
import sqlite3

# Добавляем путь к backend для импортов
backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../..'))
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from core.config import DATABASE_NAME
from utils.logger import log_info, log_error, log_warning


def startup_test_notifications():
    """Быстрая проверка таблиц уведомлений при старте"""
    try:
        log_info("🔔 Проверка таблиц уведомлений...", "startup_test")

        conn = sqlite3.connect(DATABASE_NAME)
        c = conn.cursor()

        # Проверяем notification_settings
        c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='notification_settings'")
        if c.fetchone():
            c.execute("SELECT COUNT(*) FROM notification_settings")
            count = c.fetchone()[0]
            log_info(f"  ✅ notification_settings: {count} записей", "startup_test")
        else:
            log_warning("  ⚠️  Таблица notification_settings не существует", "startup_test")

        # Проверяем booking_reminder_settings
        c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='booking_reminder_settings'")
        if c.fetchone():
            c.execute("SELECT COUNT(*) FROM booking_reminder_settings WHERE is_enabled = 1")
            enabled = c.fetchone()[0]
            c.execute("SELECT COUNT(*) FROM booking_reminder_settings")
            total = c.fetchone()[0]
            log_info(f"  ✅ booking_reminder_settings: {enabled}/{total} активны", "startup_test")
        else:
            log_warning("  ⚠️  Таблица booking_reminder_settings не существует", "startup_test")

        conn.close()
        return True

    except Exception as e:
        log_error(f"  ❌ Ошибка проверки: {e}", "startup_test")
        return False


def startup_test_reminders_api():
    """Проверка API напоминаний (прямой вызов функций)"""
    try:
        log_info("⏰ Проверка API напоминаний...", "startup_test")

        from api.reminders import create_booking_reminder_settings_table

        # Создаем таблицу если её нет
        create_booking_reminder_settings_table()

        # Проверяем результат
        conn = sqlite3.connect(DATABASE_NAME)
        c = conn.cursor()
        c.execute("SELECT COUNT(*) FROM booking_reminder_settings")
        count = c.fetchone()[0]
        conn.close()

        log_info(f"  ✅ Таблица готова, записей: {count}", "startup_test")
        return True

    except Exception as e:
        log_error(f"  ❌ Ошибка API напоминаний: {e}", "startup_test")
        return False


def startup_test_notifications_api():
    """Проверка API уведомлений (прямой вызов функций)"""
    try:
        log_info("🔔 Проверка API уведомлений...", "startup_test")

        from api.notifications import get_notification_settings_api
        import asyncio

        # Вызываем функцию напрямую
        result = asyncio.run(get_notification_settings_api())

        if result and 'emailNotifications' in result:
            log_info("  ✅ API уведомлений работает", "startup_test")
            return True
        else:
            log_warning("  ⚠️  Неожиданный формат ответа", "startup_test")
            return False

    except Exception as e:
        log_error(f"  ❌ Ошибка API уведомлений: {e}", "startup_test")
        import traceback
        log_error(traceback.format_exc(), "startup_test")
        return False


def run_all_startup_tests():
    """Запустить все startup тесты"""
    log_info("=" * 70, "startup_test")
    log_info("🧪 STARTUP ТЕСТЫ (БЕЗ HTTP)", "startup_test")
    log_info("=" * 70, "startup_test")

    results = []

    # 1. Проверка таблиц
    results.append(startup_test_notifications())

    # 2. Проверка API напоминаний
    results.append(startup_test_reminders_api())

    # 3. Проверка API уведомлений
    results.append(startup_test_notifications_api())

    # Итоги
    passed = sum(1 for r in results if r)
    total = len(results)

    log_info("=" * 70, "startup_test")
    if passed == total:
        log_info(f"✅ Все тесты пройдены: {passed}/{total}", "startup_test")
    else:
        log_warning(f"⚠️  Тесты пройдены: {passed}/{total}", "startup_test")
    log_info("=" * 70, "startup_test")

    return passed == total


if __name__ == "__main__":
    # Можно запустить вручную
    import sys
    success = run_all_startup_tests()
    sys.exit(0 if success else 1)
