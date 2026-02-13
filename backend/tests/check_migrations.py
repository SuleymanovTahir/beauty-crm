#!/usr/bin/env python3
"""
Скрипт проверки статуса всех миграций
Запуск: python check_migrations.py
"""

from db.connection import get_db_connection
import json
import sys


def check_database():
    """Проверить состояние БД"""
    try:
        conn = get_db_connection()
        c = conn.cursor()
        
        print("=" * 70)
        print("🔍 ПРОВЕРКА СОСТОЯНИЯ БД")
        print("=" * 70)
        print()
        
        # 1. Проверяем таблицы
        c.execute("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")
        tables = [row[0] for row in c.fetchall()]
        
        print(f"📋 ТАБЛИЦЫ ({len(tables)} шт):")
        for table in tables:
            c.execute(f"SELECT COUNT(*) FROM {table}")
            count = c.fetchone()[0]
            print(f"   ✓ {table:30s} - {count:5d} записей")
        
        print()
        print("=" * 70)
        print("🤖 ДЕТАЛЬНАЯ ПРОВЕРКА КЛЮЧЕВЫХ ТАБЛИЦ")
        print("=" * 70)
        print()
        
        # 2. Проверяем SALON_SETTINGS и BOT_CONFIG
        print("🏪 SALON_SETTINGS & BOT_CONFIG:")
        c.execute("SELECT column_name FROM information_schema.columns WHERE table_name='salon_settings'")
        cols = [row[0] for row in c.fetchall()]
        print(f"   Колонок в salon_settings: {len(cols)}")
        has_bot_config = 'bot_config' in cols

        c.execute("SELECT COUNT(*) FROM salon_settings")
        count = c.fetchone()[0]
        print(f"   Записей: {count}")

        if count > 0:
            if has_bot_config:
                c.execute("SELECT name, bot_config FROM salon_settings LIMIT 1")
                row = c.fetchone()
                name, bot_config = row
            else:
                c.execute("SELECT name FROM salon_settings LIMIT 1")
                row = c.fetchone()
                name = row[0]
                bot_config = None
                print("   ⚠️  bot_config колонка отсутствует")
            print(f"   ✅ Салон: {name}")

            if bot_config:
                if isinstance(bot_config, str):
                    bot_data = json.loads(bot_config)
                else:
                    bot_data = bot_config
                print(f"   ✅ Bot Config: {len(bot_data)} полей")
                print(f"   ✅ Bot Name: {bot_data.get('bot_name', 'N/A')}")
            else:
                print("   ⚠️  Bot Config: ПУСТО!")
        
        print()
        
        # 3. Проверяем USERS (как сотрудников)
        print("👥 EMPLOYEES (Staff in users table):")
        c.execute("SELECT COUNT(*) FROM users WHERE role IN ('employee', 'master', 'director', 'admin')")
        count = c.fetchone()[0]
        print(f"   Записей: {count}")
        
        if count > 0:
            c.execute("SELECT full_name, position FROM users WHERE role IN ('employee', 'master', 'director', 'admin') ORDER BY sort_order LIMIT 10")
            for i, (name, pos) in enumerate(c.fetchall(), 1):
                print(f"   {i}. {name:20s} - {pos}")
        else:
            print("   ⚠️  СОТРУДНИКИ НЕ НАЙДЕНЫ!")
        
        print()
        
        # 4. Проверяем SALON_SETTINGS
        print("🏪 SALON_SETTINGS:")
        c.execute("SELECT COUNT(*) FROM salon_settings")
        count = c.fetchone()[0]
        print(f"   Записей: {count}")
        
        if count > 0:
            c.execute("SELECT name, phone, booking_url FROM salon_settings LIMIT 1")
            name, phone, booking_url = c.fetchone()
            print(f"   ✅ Салон: {name}")
            print(f"   ✅ Телефон: {phone}")
            print(f"   ✅ Booking URL: {booking_url}")
        
        print()
        
        # 5. Проверяем SERVICES
        print("💎 SERVICES:")
        c.execute("SELECT COUNT(*) FROM services")
        count = c.fetchone()[0]
        print(f"   Записей: {count}")
        
        if count > 0:
            c.execute("SELECT category, COUNT(*) FROM services GROUP BY category")
            for cat, cnt in c.fetchall():
                print(f"   ✓ {cat:20s} - {cnt} услуг")
        else:
            print("   ⚠️  ТАБЛИЦА ПУСТА! Нужна миграция migrate_services")
        
        print()
        print("=" * 70)
        print("✅ ПРОВЕРКА ЗАВЕРШЕНА")
        print("=" * 70)
        
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ ОШИБКА: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    if not check_database():
        sys.exit(1)
