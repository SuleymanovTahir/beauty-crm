"""
Добавление системы гибких напоминаний о записях

Поддерживает:
- Множественные периоды уведомлений (2 дня + 3 часа)
- Уведомления по email с полной информацией
- Отслеживание отправленных уведомлений
"""
import sqlite3
from datetime import datetime

from core.config import DATABASE_NAME

def add_booking_reminders_system():
    """Добавить систему напоминаний о записях"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    try:
        # 1. Таблица глобальных настроек напоминаний
        print("📋 Создаю таблицу booking_reminder_settings...")
        c.execute("""
        CREATE TABLE IF NOT EXISTS booking_reminder_settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            days_before INTEGER DEFAULT 0,
            hours_before INTEGER DEFAULT 0,
            is_enabled INTEGER DEFAULT 1,
            notification_type TEXT DEFAULT 'email',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
        """)

        # 2. Таблица отправленных напоминаний (чтобы не дублировать)
        print("📋 Создаю таблицу booking_reminders_sent...")
        c.execute("""
        CREATE TABLE IF NOT EXISTS booking_reminders_sent (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            booking_id INTEGER NOT NULL,
            reminder_setting_id INTEGER NOT NULL,
            sent_at TEXT DEFAULT CURRENT_TIMESTAMP,
            status TEXT DEFAULT 'sent',
            error_message TEXT,
            FOREIGN KEY (booking_id) REFERENCES bookings(id),
            FOREIGN KEY (reminder_setting_id) REFERENCES booking_reminder_settings(id),
            UNIQUE(booking_id, reminder_setting_id)
        )
        """)

        # 3. Добавляем email клиента в таблицу клиентов, если его еще нет
        print("📋 Проверяю наличие email в таблице clients...")
        c.execute("PRAGMA table_info(clients)")
        columns = [col[1] for col in c.fetchall()]

        if 'email' not in columns:
            print("  ➕ Добавляю колонку email...")
            c.execute("ALTER TABLE clients ADD COLUMN email TEXT")
        else:
            print("  ✓ Колонка email уже существует")

        # 4. Вставляем дефолтные настройки напоминаний
        print("📋 Добавляю дефолтные настройки напоминаний...")

        default_reminders = [
            ('За 2 дня до записи', 2, 0),
            ('За 1 день до записи', 1, 0),
            ('За 6 часов до записи', 0, 6),
            ('За 3 часа до записи', 0, 3),
            ('За 1 час до записи', 0, 1),
        ]

        for name, days, hours in default_reminders:
            try:
                c.execute("""
                    INSERT INTO booking_reminder_settings (name, days_before, hours_before, is_enabled)
                    VALUES (?, ?, ?, 1)
                """, (name, days, hours))
                print(f"  ✅ {name}")
            except sqlite3.IntegrityError:
                print(f"  ✓ {name} (уже существует)")

        # 5. Создаем индексы для оптимизации
        print("📋 Создаю индексы...")
        try:
            c.execute("""
                CREATE INDEX IF NOT EXISTS idx_booking_reminders_sent_booking
                ON booking_reminders_sent(booking_id)
            """)
            c.execute("""
                CREATE INDEX IF NOT EXISTS idx_booking_reminders_sent_status
                ON booking_reminders_sent(status)
            """)
            print("  ✅ Индексы созданы")
        except Exception as e:
            print(f"  ⚠️ Предупреждение при создании индексов: {e}")

        conn.commit()
        print("✅ Миграция завершена успешно!")
        return True

    except Exception as e:
        print(f"❌ Ошибка миграции: {e}")
        conn.rollback()
        return False
    finally:
        conn.close()

if __name__ == "__main__":
    add_booking_reminders_system()
