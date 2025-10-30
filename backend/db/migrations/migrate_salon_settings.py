#!/usr/bin/env python3
"""
Миграция настроек салона - заполняет salon_settings из конфига
Запускается один раз для инициализации данных
"""
import sqlite3
from datetime import datetime
from config import (
    DATABASE_NAME, SALON_NAME, SALON_ADDRESS, SALON_PHONE,
    SALON_BOOKING_URL, SALON_EMAIL, SALON_INSTAGRAM,
    SALON_WORKING_HOURS_WEEKDAYS, SALON_WORKING_HOURS_WEEKENDS,
    SALON_BOT_NAME, SALON_LOCATION
)


def migrate_salon_settings():
    """Заполнить salon_settings из конфига"""
    
    print("=" * 70)
    print("🏪 МИГРАЦИЯ НАСТРОЕК САЛОНА")
    print("=" * 70)
    
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    # Проверяем существующие настройки
    c.execute("SELECT COUNT(*) FROM salon_settings")
    existing = c.fetchone()[0]
    
    if existing > 0:
        print("⚠️  Настройки салона уже существуют!")
        response = input("   Перезаписать из config.py? (yes/no): ")
        if response.lower() not in ['yes', 'y']:
            conn.close()
            print("❌ Миграция отменена")
            return 0
        
        # Обновляем
        c.execute("""UPDATE salon_settings SET
            name = ?,
            address = ?,
            google_maps = ?,
            hours = ?,
            hours_ru = ?,
            hours_ar = ?,
            booking_url = ?,
            phone = ?,
            email = ?,
            instagram = ?,
            bot_name = ?,
            bot_name_en = ?,
            bot_name_ar = ?,
            updated_at = ?
            WHERE id = 1""",
        (
            SALON_NAME,
            SALON_ADDRESS,
            SALON_LOCATION,
            f"{SALON_WORKING_HOURS_WEEKDAYS}",
            SALON_WORKING_HOURS_WEEKDAYS,
            "يوميًا 10:30 - 21:00",  # дефолт AR
            SALON_BOOKING_URL,
            SALON_PHONE,
            SALON_EMAIL if SALON_EMAIL else None,
            SALON_INSTAGRAM if SALON_INSTAGRAM else None,
            SALON_BOT_NAME,
            SALON_BOT_NAME,
            f"مساعد {SALON_NAME}",  # дефолт AR имя
            datetime.now().isoformat()
        ))
        print("✅ salon_settings обновлены из config.py")
    else:
        # Создаём новые
        c.execute("""INSERT INTO salon_settings (
            id, name, address, google_maps, hours, hours_ru, hours_ar,
            booking_url, phone, email, instagram, 
            bot_name, bot_name_en, bot_name_ar,
            city, country, timezone, currency, updated_at
        ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Dubai', 'UAE', 'Asia/Dubai', 'AED', ?)""",
        (
            SALON_NAME,
            SALON_ADDRESS,
            SALON_LOCATION,
            f"{SALON_WORKING_HOURS_WEEKDAYS}",
            SALON_WORKING_HOURS_WEEKDAYS,
            "يوميًا 10:30 - 21:00",
            SALON_BOOKING_URL,
            SALON_PHONE,
            SALON_EMAIL if SALON_EMAIL else None,
            SALON_INSTAGRAM if SALON_INSTAGRAM else None,
            SALON_BOT_NAME,
            SALON_BOT_NAME,
            f"мساعد {SALON_NAME}",
            datetime.now().isoformat()
        ))
        print("✅ salon_settings созданы из config.py")
    
    conn.commit()
    conn.close()
    
    print()
    print("=" * 70)
    print("✅ МИГРАЦИЯ ЗАВЕРШЕНА!")
    print("📋 Теперь настройки салона можно редактировать в /admin/settings")
    print("=" * 70)
    return 0


if __name__ == "__main__":
    migrate_salon_settings()