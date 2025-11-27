#!/usr/bin/env python3
"""
Миграция настроек салона - заполняет salon_settings из конфига
Запускается один раз для инициализации данных
"""
import sqlite3
from datetime import datetime
import os

from core.config import DATABASE_NAME

# ===== ДЕФОЛТНЫЕ ДАННЫЕ САЛОНА =====
# После миграции редактируются в /admin/settings
DEFAULT_SALON_DATA = {
    "name": "M Le Diamant Beauty Lounge",
    "address": "Shop 13, Amwaj 3 Plaza Level, JBR, Dubai",
    "phone": "971526961100",
    "booking_url": "/public/booking",
    "email": "mladiamontuae@gmail.com",
    "instagram": "www.instagram.com/mlediamant/",
    "bot_name": "M.Le Diamant Assistant",
    "google_maps": "https://maps.app.goo.gl/Puh5X1bNEjWPiToz6",
    "hours": "Ежедневно 10:30 - 21:30",
    "hours_ru": "Ежедневно 10:30 - 21:30",
    "hours_ar": "يوميًا 10:30 - 21:30",
    "hours_weekdays": "10:30 - 21:30",
    "hours_weekends": "10:30 - 21:30",
    "city": "Dubai",
    "country": "UAE",
    "timezone": "Asia/Dubai",
    "currency": "AED"
}


def migrate_salon_settings():
    """Заполнить salon_settings дефолтными данными"""
    
    print("=" * 70)
    print("🏪 МИГРАЦИЯ НАСТРОЕК САЛОНА")
    print("=" * 70)
    
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS salon_settings (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        name TEXT NOT NULL,
        name_ar TEXT,
        address TEXT,
        address_ar TEXT,
        google_maps TEXT,
        hours TEXT,
        hours_ru TEXT,
        hours_ar TEXT,
        hours_weekdays TEXT DEFAULT '10:30 - 21:30',
        hours_weekends TEXT DEFAULT '10:30 - 21:30',
        booking_url TEXT,
        phone TEXT,
        email TEXT,
        instagram TEXT,
        whatsapp TEXT,
        bot_name TEXT NOT NULL,
        bot_name_en TEXT,
        bot_name_ar TEXT,
        city TEXT DEFAULT 'Dubai',
        country TEXT DEFAULT 'UAE',
        timezone TEXT DEFAULT 'Asia/Dubai',
        currency TEXT DEFAULT 'AED',
        updated_at TEXT
    )''')
    conn.commit()
    print("✅ Таблица salon_settings проверена/создана")
    
    # ===== ДОБАВЛЯЕМ КОЛОНКИ ЕСЛИ ИХ НЕТ =====
    try:
        c.execute("PRAGMA table_info(salon_settings)")
        columns = [row[1] for row in c.fetchall()]
        
        if 'hours_weekdays' not in columns:
            c.execute("ALTER TABLE salon_settings ADD COLUMN hours_weekdays TEXT DEFAULT '10:30 - 21:30'")
            print("✅ Добавлена колонка hours_weekdays")
        
        if 'hours_weekends' not in columns:
            c.execute("ALTER TABLE salon_settings ADD COLUMN hours_weekends TEXT DEFAULT '10:30 - 21:30'")
            print("✅ Добавлена колонка hours_weekends")
        
        conn.commit()
    except Exception as e:
        print(f"⚠️  Ошибка при добавлении колонок: {e}")
    # Проверяем существующие настройки
    c.execute("SELECT COUNT(*) FROM salon_settings")
    existing = c.fetchone()[0]
    
    if existing > 0:
        print("⚠️  Настройки салона уже существуют!")
        print("   🔄  Обновляем данные на новые дефолтные значения...")
        
        # Обновляем существующие настройки
        c.execute("""UPDATE salon_settings SET
            phone = ?,
            email = ?,
            instagram = ?,
            updated_at = ?
            WHERE id = 1""",
        (
            DEFAULT_SALON_DATA["phone"],
            DEFAULT_SALON_DATA["email"],
            DEFAULT_SALON_DATA["instagram"],
            datetime.now().isoformat()
        ))
        print("✅ salon_settings обновлены (телефон, email, instagram)")
    else:
        # Создаём новые
        c.execute("""INSERT INTO salon_settings (
            id, name, address, google_maps, hours, hours_ru, hours_ar,
            hours_weekdays, hours_weekends,
            booking_url, phone, email, instagram,
            bot_name, bot_name_en, bot_name_ar,
            city, country, timezone, currency, updated_at
        ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            DEFAULT_SALON_DATA["name"],
            DEFAULT_SALON_DATA["address"],
            DEFAULT_SALON_DATA["google_maps"],
            DEFAULT_SALON_DATA["hours"],
            DEFAULT_SALON_DATA["hours_ru"],
            DEFAULT_SALON_DATA["hours_ar"],
            DEFAULT_SALON_DATA["hours_weekdays"],
            DEFAULT_SALON_DATA["hours_weekends"],
            DEFAULT_SALON_DATA["booking_url"],
            DEFAULT_SALON_DATA["phone"],
            DEFAULT_SALON_DATA["email"],
            DEFAULT_SALON_DATA["instagram"],
            DEFAULT_SALON_DATA["bot_name"],
            DEFAULT_SALON_DATA["bot_name"],
            f"مساعد {DEFAULT_SALON_DATA['name']}",
            DEFAULT_SALON_DATA["city"],
            DEFAULT_SALON_DATA["country"],
            DEFAULT_SALON_DATA["timezone"],
            DEFAULT_SALON_DATA["currency"],
            datetime.now().isoformat()
        ))
        print("✅ salon_settings созданы")
    
    conn.commit()
    conn.close()
    
    print()
    print("=" * 70)
    print("✅ МИГРАЦИЯ ЗАВЕРШЕНА!")
    print()
    print("📝 Данные салона:")
    for key, value in DEFAULT_SALON_DATA.items():
        print(f"   • {key}: {value}")
    print()
    print("📋 Теперь настройки можно редактировать в /admin/settings")
    print("=" * 70)
    return 0

if __name__ == "__main__":
    migrate_salon_settings()