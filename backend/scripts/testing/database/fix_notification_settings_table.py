#!/usr/bin/env python3
"""
Исправление схемы таблицы notification_settings
"""
import sys
import os
import sqlite3

# Добавляем путь к backend для импортов
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../..')))

from core.config import DATABASE_NAME

def fix_notification_settings_table():
    """Пересоздать таблицу notification_settings с правильной схемой"""

    print("=" * 70)
    print("ИСПРАВЛЕНИЕ ТАБЛИЦЫ notification_settings")
    print("=" * 70)

    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    # 1. Проверяем текущую схему
    print("\n📋 Текущая схема:")
    c.execute("PRAGMA table_info(notification_settings)")
    current_columns = c.fetchall()
    for col in current_columns:
        print(f"  - {col[1]} ({col[2]})")

    # 2. Сохраняем данные если есть
    print("\n💾 Сохранение данных...")
    c.execute("SELECT * FROM notification_settings")
    old_data = c.fetchall()
    print(f"  Найдено записей: {len(old_data)}")

    # 3. Удаляем старую таблицу
    print("\n🗑️  Удаление старой таблицы...")
    c.execute("DROP TABLE IF EXISTS notification_settings")

    # 4. Создаем новую таблицу с правильной схемой
    print("\n✨ Создание новой таблицы с правильной схемой...")
    c.execute("""
        CREATE TABLE notification_settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            email_notifications INTEGER DEFAULT 1,
            sms_notifications INTEGER DEFAULT 0,
            booking_notifications INTEGER DEFAULT 1,
            chat_notifications INTEGER DEFAULT 1,
            daily_report INTEGER DEFAULT 1,
            report_time TEXT DEFAULT '09:00',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id)
        )
    """)

    print("\n📋 Новая схема:")
    c.execute("PRAGMA table_info(notification_settings)")
    new_columns = c.fetchall()
    for col in new_columns:
        print(f"  - {col[1]} ({col[2]})")

    # 5. Мигрируем данные если были
    if old_data:
        print(f"\n📥 Миграция {len(old_data)} записей...")
        for row in old_data:
            # Старая схема: id, user_id, email, sms, booking, birthday_reminders, birthday_days_advance
            # Новая схема: id, user_id, email, sms, booking, chat, daily_report, report_time
            c.execute("""
                INSERT INTO notification_settings
                (user_id, email_notifications, sms_notifications, booking_notifications,
                 chat_notifications, daily_report, report_time)
                VALUES (?, ?, ?, ?, 1, 1, '09:00')
            """, (row[1], row[2], row[3], row[4]))
        print("  ✅ Данные мигрированы")

    conn.commit()
    conn.close()

    print("\n" + "=" * 70)
    print("✅ ТАБЛИЦА ИСПРАВЛЕНА!")
    print("=" * 70)

if __name__ == "__main__":
    fix_notification_settings_table()