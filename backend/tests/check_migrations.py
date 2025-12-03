#!/usr/bin/env python3
"""
Скрипт проверки статуса всех миграций
Запуск: python check_migrations.py
"""

from db.connection import get_db_connection
import os
import sys
from datetime import datetime

DATABASE_NAME = "salon_bot.db"

def check_database():
    """Проверить состояние БД"""
    if not os.path.exists(DATABASE_NAME):
        print(f"❌ БД не найдена: {DATABASE_NAME}")
        return False
    
    try:
        conn = get_db_connection()
        c = conn.cursor()
        
        print("=" * 70)
        print("🔍 ПРОВЕРКА СОСТОЯНИЯ БД")
        print("=" * 70)
        print()
        
        # 1. Проверяем таблицы
        c.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
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
        
        # 2. Проверяем BOT_SETTINGS
        print("📝 BOT_SETTINGS:")
        c.execute("SELECT column_name FROM information_schema.columns WHERE table_name=\'bot_settings\'")
        cols = [row[0] for row in c.fetchall()]
        print(f"   Колонок: {len(cols)}")
        
        c.execute("SELECT COUNT(*) FROM bot_settings")
        count = c.fetchone()[0]
        print(f"   Записей: {count}")
        
        if count > 0:
            critical_fields = [
                'bot_name', 'max_message_chars', 'personality_traits',
                'greeting_message', 'emoji_usage', 'objection_expensive',
                'emotional_triggers', 'fomo_messages', 'upsell_techniques'
            ]
            
            for field in critical_fields:
                if field in cols:
                    c.execute(f"SELECT {field} FROM bot_settings LIMIT 1")
                    value = c.fetchone()[0]
                    
                    if value:
                        preview = str(value)[:40] + "..." if len(str(value)) > 40 else str(value)
                        print(f"   ✅ {field:25s}: {preview}")
                    else:
                        print(f"   ⚠️  {field:25s}: ПУСТО!")
                else:
                    print(f"   ❌ {field:25s}: ОТСУТСТВУЕТ!")
        
        print()
        
        # 3. Проверяем EMPLOYEES
        print("👥 EMPLOYEES:")
        if 'employees' in tables:
            c.execute("SELECT COUNT(*) FROM employees")
            count = c.fetchone()[0]
            print(f"   Записей: {count}")
            
            if count > 0:
                c.execute("SELECT full_name, position FROM employees ORDER BY sort_order LIMIT 10")
                for i, (name, pos) in enumerate(c.fetchall(), 1):
                    print(f"   {i}. {name:20s} - {pos}")
            else:
                print("   ⚠️  ТАБЛИЦА ПУСТА! Нужна миграция seed_employees")
        else:
            print("   ❌ ТАБЛИЦА НЕ СУЩЕСТВУЕТ!")
        
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