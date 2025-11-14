"""
Миграция: Создание таблицы positions для справочника должностей
Позволяет настраивать список доступных должностей в админке
"""
import sys
import os
# Добавляем путь к backend в sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../..')))

import sqlite3
from core.config import DATABASE_NAME
from utils.logger import log_info, log_error

def create_positions_table():
    """Создать таблицу positions и добавить дефолтные должности"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    try:
        log_info("🔧 Creating positions table...", "migration")

        # Создаем таблицу должностей
        c.execute('''CREATE TABLE IF NOT EXISTS positions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            name_en TEXT,
            name_ar TEXT,
            description TEXT,
            is_active INTEGER DEFAULT 1,
            sort_order INTEGER DEFAULT 0,
            created_at TEXT,
            updated_at TEXT
        )''')

        # Проверяем есть ли уже данные
        c.execute("SELECT COUNT(*) FROM positions")
        count = c.fetchone()[0]

        if count == 0:
            from datetime import datetime
            now = datetime.now().isoformat()

            # Добавляем дефолтные должности
            default_positions = [
                # Мастера
                ("Мастер маникюра", "Manicure Master", "خبير مانيكير", "Специалист по маникюру", 1),
                ("Мастер педикюра", "Pedicure Master", "خبير باديكير", "Специалист по педикюру", 2),
                ("Мастер бровист", "Brow Master", "خبير الحواجب", "Специалист по оформлению бровей", 3),
                ("Косметолог", "Cosmetologist", "خبير التجميل", "Специалист по косметологии", 4),
                ("Визажист", "Makeup Artist", "فنان مكياج", "Специалист по макияжу", 5),
                ("Парикмахер", "Hairdresser", "مصفف شعر", "Специалист по прическам", 6),

                # Продажи и маркетинг
                ("Менеджер по продажам", "Sales Manager", "مدير المبيعات", "Ответственный за продажи услуг", 7),
                ("Таргетолог", "Targeting Specialist", "أخصائي الاستهداف", "Специалист по таргетированной рекламе", 8),
                ("SMM-менеджер", "SMM Manager", "مدير وسائل التواصل", "Менеджер социальных сетей", 9),

                # Администрация
                ("Администратор", "Administrator", "مسؤول", "Администратор салона", 10),
                ("Старший администратор", "Senior Administrator", "مسؤول أول", "Старший администратор", 11),
                ("Директор", "Director", "مدير", "Директор салона", 12),
            ]

            for position in default_positions:
                c.execute("""INSERT INTO positions
                             (name, name_en, name_ar, description, sort_order, is_active, created_at, updated_at)
                             VALUES (?, ?, ?, ?, ?, 1, ?, ?)""",
                          (position[0], position[1], position[2], position[3], position[4], now, now))

            log_info(f"✅ Added {len(default_positions)} default positions", "migration")
        else:
            log_info("⏭️ Positions already exist, skipping defaults", "migration")

        conn.commit()
        log_info("✅ Positions table created successfully", "migration")

    except Exception as e:
        log_error(f"❌ Error creating positions table: {e}", "migration")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    print("=" * 70)
    print("🔧 МИГРАЦИЯ: Создание таблицы должностей")
    print("=" * 70)
    create_positions_table()
    print("=" * 70)
