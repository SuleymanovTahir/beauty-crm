#!/usr/bin/env python3
"""
Миграция: Программа лояльности с баллами и уровнями
"""
import sqlite3
import os
from datetime import datetime

DATABASE_NAME = os.path.join(os.path.dirname(__file__), 'salon_bot.db')

conn = sqlite3.connect(DATABASE_NAME)
c = conn.cursor()

try:
    print("🔧 Creating loyalty program tables...")

    # Таблица баллов клиента
    c.execute("""
        CREATE TABLE IF NOT EXISTS client_loyalty_points (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            client_id TEXT UNIQUE NOT NULL,
            total_points INTEGER DEFAULT 0,
            available_points INTEGER DEFAULT 0,  -- Доступные для использования
            spent_points INTEGER DEFAULT 0,
            loyalty_level TEXT DEFAULT 'bronze',  -- bronze, silver, gold, platinum
            created_at TEXT,
            updated_at TEXT,
            FOREIGN KEY (client_id) REFERENCES clients(instagram_id)
        )
    """)
    print("✅ client_loyalty_points table created")

    # История начисления/списания баллов
    c.execute("""
        CREATE TABLE IF NOT EXISTS loyalty_transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            client_id TEXT NOT NULL,
            transaction_type TEXT NOT NULL,  -- 'earn', 'spend', 'expire'
            points INTEGER NOT NULL,
            reason TEXT,
            booking_id INTEGER,
            created_at TEXT,
            expires_at TEXT,  -- Для истекающих баллов
            FOREIGN KEY (client_id) REFERENCES clients(instagram_id),
            FOREIGN KEY (booking_id) REFERENCES bookings(id)
        )
    """)
    print("✅ loyalty_transactions table created")

    # Таблица уровней лояльности и их преимуществ
    c.execute("""
        CREATE TABLE IF NOT EXISTS loyalty_levels (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            level_name TEXT UNIQUE NOT NULL,  -- bronze, silver, gold, platinum
            min_points INTEGER NOT NULL,      -- Минимум баллов для уровня
            discount_percent REAL DEFAULT 0,  -- Процент скидки
            points_multiplier REAL DEFAULT 1.0,  -- Множитель начисления баллов
            special_perks TEXT,  -- JSON с особыми преимуществами
            created_at TEXT
        )
    """)
    print("✅ loyalty_levels table created")

    # Вставляем стандартные уровни лояльности
    print("🔧 Inserting default loyalty levels...")

    now = datetime.now().isoformat()

    levels = [
        ('bronze', 0, 0, 1.0, '{"perk": "Базовый уровень"}'),
        ('silver', 500, 5, 1.2, '{"perk": "Приоритетная запись"}'),
        ('gold', 1500, 10, 1.5, '{"perk": "Бонусная процедура каждые 5 визитов"}'),
        ('platinum', 3000, 15, 2.0, '{"perk": "Персональный менеджер + бесплатная процедура в день рождения"}')
    ]

    for level in levels:
        c.execute("""
            INSERT OR IGNORE INTO loyalty_levels
            (level_name, min_points, discount_percent, points_multiplier, special_perks, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (*level, now))

    print("✅ Default loyalty levels inserted")

    conn.commit()
    print("\n🎉 Loyalty program migration completed successfully!")

except Exception as e:
    print(f"❌ Error: {e}")
    conn.rollback()
finally:
    conn.close()
