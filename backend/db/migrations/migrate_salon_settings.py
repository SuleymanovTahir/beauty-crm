#!/usr/bin/env python3
"""
Миграция настроек салона - заполняет salon_settings из конфига
Запускается один раз для инициализации данных
"""
import sqlite3
from datetime import datetime
import os

from config import DATABASE_NAME

# ===== ДЕФОЛТНЫЕ ДАННЫЕ САЛОНА =====
# После миграции редактируются в /admin/settings
DEFAULT_SALON_DATA = {
    "name": "M.Le Diamant Beauty Lounge",
    "address": "Shop 13, Amwaj 3 Plaza Level, JBR, Dubai",
    "phone": "+971 52 696 1100",
    "booking_url": "https://n1314037.alteg.io",
    "email": "mladiamontuae@gmail.com",
    "instagram": "@mlediamant",
    "bot_name": "M.Le Diamant Assistant",
    "google_maps": "https://maps.app.goo.gl/Puh5X1bNEjWPiToz6",
    "working_hours": "Ежедневно 10:30 - 21:00",
    "working_hours_ru": "Ежедневно 10:30 - 21:00",
    "working_hours_ar": "يوميًا 10:30 - 21:00",
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
    
    # Проверяем существующие настройки
    c.execute("SELECT COUNT(*) FROM salon_settings")
    existing = c.fetchone()[0]
    
    if existing > 0:
        print("⚠️  Настройки салона уже существуют!")
        response = input("   Перезаписать дефолтными значениями? (yes/no): ")
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
            city = ?,
            country = ?,
            timezone = ?,
            currency = ?,
            updated_at = ?
            WHERE id = 1""",
        (
            DEFAULT_SALON_DATA["name"],
            DEFAULT_SALON_DATA["address"],
            DEFAULT_SALON_DATA["google_maps"],
            DEFAULT_SALON_DATA["working_hours"],
            DEFAULT_SALON_DATA["working_hours_ru"],
            DEFAULT_SALON_DATA["working_hours_ar"],
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
        print("✅ salon_settings обновлены")
    else:
        # Создаём новые
        c.execute("""INSERT INTO salon_settings (
            id, name, address, google_maps, hours, hours_ru, hours_ar,
            booking_url, phone, email, instagram, 
            bot_name, bot_name_en, bot_name_ar,
            city, country, timezone, currency, updated_at
        ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            DEFAULT_SALON_DATA["name"],
            DEFAULT_SALON_DATA["address"],
            DEFAULT_SALON_DATA["google_maps"],
            DEFAULT_SALON_DATA["working_hours"],
            DEFAULT_SALON_DATA["working_hours_ru"],
            DEFAULT_SALON_DATA["working_hours_ar"],
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