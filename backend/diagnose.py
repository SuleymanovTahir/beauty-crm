#!/usr/bin/env python3
"""
Диагностика базы данных и миграций
"""
import sqlite3
import os
from config import DATABASE_NAME

def diagnose():
    print("=" * 70)
    print("🔍 ДИАГНОСТИКА БАЗЫ ДАННЫХ")
    print("=" * 70)
    
    if not os.path.exists(DATABASE_NAME):
        print(f"❌ БД не существует: {DATABASE_NAME}")
        return
    
    print(f"✅ БД найдена: {DATABASE_NAME}")
    print()
    
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    # Проверяем таблицы
    print("📋 ТАБЛИЦЫ В БД:")
    c.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
    tables = [row[0] for row in c.fetchall()]
    for table in tables:
        print(f"   ✓ {table}")
    print()
    
    # Проверяем bot_settings
    if 'bot_settings' in tables:
        print("🤖 BOT_SETTINGS:")
        c.execute("PRAGMA table_info(bot_settings)")
        columns = c.fetchall()
        print(f"   Колонок: {len(columns)}")
        
        c.execute("SELECT COUNT(*) FROM bot_settings")
        count = c.fetchone()[0]
        print(f"   Записей: {count}")
        
        if count > 0:
            c.execute("SELECT bot_name, max_message_chars, personality_traits FROM bot_settings LIMIT 1")
            row = c.fetchone()
            print(f"   bot_name: {row[0]}")
            print(f"   max_message_chars: {row[1]}")
            print(f"   personality_traits: {row[2][:50] if row[2] else 'ПУСТО'}...")
        print()
    else:
        print("❌ Таблица bot_settings отсутствует!")
        print()
    
    # Проверяем employees
    if 'employees' in tables:
        print("👥 EMPLOYEES:")
        c.execute("SELECT COUNT(*) FROM employees")
        count = c.fetchone()[0]
        print(f"   Записей: {count}")
        
        if count > 0:
            c.execute("SELECT full_name, position FROM employees ORDER BY sort_order")
            for row in c.fetchall():
                print(f"   - {row[0]} ({row[1]})")
        print()
    else:
        print("❌ Таблица employees отсутствует!")
        print()
    
    # Проверяем salon_settings
    if 'salon_settings' in tables:
        print("🏢 SALON_SETTINGS:")
        c.execute("SELECT COUNT(*) FROM salon_settings")
        count = c.fetchone()[0]
        print(f"   Записей: {count}")
        
        if count > 0:
            c.execute("SELECT name, phone FROM salon_settings LIMIT 1")
            row = c.fetchone()
            print(f"   name: {row[0]}")
            print(f"   phone: {row[1]}")
        print()
    
    conn.close()
    
    print("=" * 70)
    print("✅ ДИАГНОСТИКА ЗАВЕРШЕНА")
    print("=" * 70)

if __name__ == "__main__":
    diagnose()