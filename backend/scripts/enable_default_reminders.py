#!/usr/bin/env python3
"""
Скрипт для включения напоминаний о записях по умолчанию
"""
import sys
import os
import sqlite3

# Add backend directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.config import DATABASE_NAME

def enable_default_reminders():
    print("📧 Включение напоминаний по умолчанию...")
    
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    try:
        # Check if table exists
        c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='booking_reminder_settings'")
        if not c.fetchone():
            print("⚠️  Таблица booking_reminder_settings не существует")
            return
        
        # Update all reminders to enabled
        c.execute("UPDATE booking_reminder_settings SET is_enabled = 1")
        updated = c.rowcount
        
        conn.commit()
        print(f"✅ Включено {updated} напоминаний")
        
        # Show current state
        c.execute("""
            SELECT name, days_before, hours_before, notification_type, is_enabled 
            FROM booking_reminder_settings 
            ORDER BY days_before DESC, hours_before DESC
        """)
        
        print("\n📝 Текущие настройки:")
        for row in c.fetchall():
            name, days, hours, notif_type, enabled = row
            status = "✅ Включено" if enabled else "❌ Выключено"
            print(f"   {name:35} | {days:2} дн. {hours:2} ч. | {notif_type:6} | {status}")
        
    except Exception as e:
        print(f"❌ Ошибка: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    enable_default_reminders()
