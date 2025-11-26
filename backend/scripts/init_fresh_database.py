#!/usr/bin/env python3
"""
Скрипт для инициализации свежей базы данных
Запускать ТОЛЬКО когда сервер остановлен!

Usage: python3 scripts/init_fresh_database.py
"""
import sys
import os
import asyncio

# Add backend directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from db import init_database
from utils.logger import log_info

async def init_fresh_db():
    print("=" * 70)
    print("🗄️  ИНИЦИАЛИЗАЦИЯ СВЕЖЕЙ БАЗЫ ДАННЫХ")
    print("=" * 70)
    
    # 1. Базовая инициализация
    log_info("1️⃣ Создание базовой структуры...", "init")
    init_database()
    log_info("✅ Базовая структура создана", "init")
    
    # 2. Миграции
    try:
        from db.migrations.run_all_migrations import run_all_migrations
        log_info("2️⃣ Запуск миграций...", "init")
        run_all_migrations()
        log_info("✅ Миграции выполнены", "init")
    except Exception as e:
        log_info(f"⚠️  Миграции пропущены: {e}", "init")
    
    # 3. Связывание пользователей
    try:
        from db.migrations.data.users.link_users_to_employees import link_users_to_employees
        log_info("3️⃣ Связывание пользователей с сотрудниками...", "init")
        link_users_to_employees()
        log_info("✅ Пользователи связаны", "init")
    except Exception as e:
        log_info(f"⚠️  Связывание пропущено: {e}", "init")
    
    # 4. Создание планов и индексов
    try:
        from db.migrations.schema.plans.create_plans_table import create_plans_table
        from db.migrations.schema.analytics.add_analytics_indexes import add_analytics_indexes
        log_info("4️⃣ Создание таблицы планов и индексов...", "init")
        create_plans_table()
        add_analytics_indexes()
        log_info("✅ Планы и индексы созданы", "init")
    except Exception as e:
        log_info(f"⚠️  Планы/индексы пропущены: {e}", "init")
    
    # 5. Заполнение настроек бота
    try:
        from scripts.populate_bot_settings import populate_bot_settings
        log_info("5️⃣ Заполнение настроек бота...", "init")
        populate_bot_settings()
        log_info("✅ Настройки бота заполнены", "init")
    except Exception as e:
        log_info(f"⚠️  Настройки бота пропущены: {e}", "init")
    
    
    # 6. Запуск всех исправлений (включая назначение услуг мастерам)
    try:
        from scripts.run_all_fixes import main as run_all_fixes_main
        log_info("6️⃣ Запуск всех исправлений...", "init")
        await run_all_fixes_main()
        log_info("✅ Исправления выполнены", "init")
    except Exception as e:
        log_info(f"⚠️  Исправления пропущены: {e}", "init")
    
    # 7. Включение напоминаний по умолчанию
    try:
        from scripts.enable_default_reminders import enable_default_reminders
        log_info("7️⃣ Включение напоминаний по умолчанию...", "init")
        enable_default_reminders()
        log_info("✅ Напоминания включены", "init")
    except Exception as e:
        log_info(f"⚠️  Напоминания пропущены: {e}", "init")
    
    print("\n" + "=" * 70)
    print("✅ ИНИЦИАЛИЗАЦИЯ ЗАВЕРШЕНА")
    print("=" * 70)
    print("\n💡 Теперь можно запустить сервер: python3 -m uvicorn main:app --reload")

if __name__ == "__main__":
    asyncio.run(init_fresh_db())
