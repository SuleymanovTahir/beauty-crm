#!/usr/bin/env python
"""
Скрипт для настройки тестовых уведомлений

Создает тестовые данные для проверки уведомлений:
- Клиенты с днями рождения
- Сотрудники с днями рождения
- Тестовые записи на ближайшие дни
"""
import sqlite3
from datetime import datetime, timedelta
import argparse

DATABASE_NAME = "salon_bot.db"


def setup_test_notifications(email: str, days_ahead: int = 1):
    """
    Создать тестовые данные для проверки уведомлений

    Args:
        email: Email для тестовых уведомлений
        days_ahead: Через сколько дней создать тестовые события (по умолчанию 1 = завтра)
    """
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    print("=" * 80)
    print("📧 НАСТРОЙКА ТЕСТОВЫХ УВЕДОМЛЕНИЙ")
    print("=" * 80)
    print(f"Email для уведомлений: {email}")
    print(f"Тестовые события через: {days_ahead} дн.")
    print("=" * 80)

    # Дата для тестовых событий
    test_date = datetime.now() + timedelta(days=days_ahead)
    test_date_str = test_date.strftime('%Y-%m-%d')

    # Дата и время для записи
    test_datetime = test_date.replace(hour=14, minute=0, second=0).isoformat()

    # 1. Создаем/обновляем тестового клиента
    print("\n1️⃣ Создание тестового клиента...")

    test_client_id = "test_client_notifications"

    c.execute("""
        INSERT OR REPLACE INTO clients
        (instagram_id, username, name, email, phone, first_contact, last_contact,
         birthday, total_messages, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        test_client_id,
        "test_user_notify",
        "Тестовый Клиент (Уведомления)",
        email,
        "+971501234567",
        datetime.now().isoformat(),
        datetime.now().isoformat(),
        test_date_str,  # День рождения
        5,
        "active"
    ))

    print(f"✅ Клиент создан: {test_client_id}")
    print(f"   Email: {email}")
    print(f"   День рождения: {test_date_str}")

    # 2. Проверяем/создаем тестового сотрудника
    print("\n2️⃣ Проверка тестового сотрудника...")

    c.execute("SELECT id FROM users WHERE username = ?", ("test_employee",))
    user = c.fetchone()

    if user:
        user_id = user[0]
        c.execute("""
            UPDATE users
            SET email = ?, phone = ?, birthday = ?
            WHERE id = ?
        """, (email, "+971501234568", test_date_str, user_id))
        print(f"✅ Сотрудник обновлен: test_employee (ID: {user_id})")
    else:
        import hashlib
        password_hash = hashlib.sha256("test123".encode()).hexdigest()

        c.execute("""
            INSERT INTO users
            (username, password_hash, full_name, email, phone, birthday, role, created_at, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            "test_employee",
            password_hash,
            "Тестовый Сотрудник (Уведомления)",
            email,
            "+971501234568",
            test_date_str,
            "employee",
            datetime.now().isoformat(),
            1
        ))
        user_id = c.lastrowid
        print(f"✅ Сотрудник создан: test_employee / test123 (ID: {user_id})")

    print(f"   Email: {email}")
    print(f"   День рождения: {test_date_str}")

    # 3. Создаем тестовые записи
    print("\n3️⃣ Создание тестовых записей...")

    # Удаляем старые тестовые записи
    c.execute("DELETE FROM bookings WHERE notes LIKE '%Тестовая запись для уведомлений%'")

    # Запись на тестовую дату
    c.execute("""
        INSERT INTO bookings
        (instagram_id, service_name, datetime, phone, name, status, created_at, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        test_client_id,
        "Маникюр + Педикюр",
        test_datetime,
        "+971501234567",
        "Тестовый Клиент (Уведомления)",
        "confirmed",
        datetime.now().isoformat(),
        "Тестовая запись для уведомлений - основная"
    ))

    booking_id = c.lastrowid
    print(f"✅ Запись создана (ID: {booking_id})")
    print(f"   Дата/время: {test_datetime}")
    print(f"   Услуга: Маникюр + Педикюр")

    # Дополнительная запись через 2 дня
    test_date_2 = datetime.now() + timedelta(days=days_ahead + 1)
    test_datetime_2 = test_date_2.replace(hour=15, minute=30, second=0).isoformat()

    c.execute("""
        INSERT INTO bookings
        (instagram_id, service_name, datetime, phone, name, status, created_at, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        test_client_id,
        "SPA-процедуры",
        test_datetime_2,
        "+971501234567",
        "Тестовый Клиент (Уведомления)",
        "confirmed",
        datetime.now().isoformat(),
        f"Тестовая запись для уведомлений - через {days_ahead + 1} дня"
    ))

    booking_id_2 = c.lastrowid
    print(f"✅ Запись создана (ID: {booking_id_2})")
    print(f"   Дата/время: {test_datetime_2}")
    print(f"   Услуга: SPA-процедуры")

    # 4. Настройки напоминаний о записях
    print("\n4️⃣ Проверка настроек напоминаний...")

    c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='booking_reminder_settings'")
    if not c.fetchone():
        print("⚠️  Создаю таблицу booking_reminder_settings...")
        c.execute("""
            CREATE TABLE booking_reminder_settings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                days_before INTEGER DEFAULT 0,
                hours_before INTEGER DEFAULT 0,
                notification_type TEXT DEFAULT 'email',
                is_enabled INTEGER DEFAULT 1,
                created_at TEXT,
                updated_at TEXT
            )
        """)

    # Добавляем настройки напоминаний
    c.execute("DELETE FROM booking_reminder_settings")

    reminders = [
        ("24 hours before", 1, 0, "email"),
        ("2 hours before", 0, 2, "email"),
    ]

    for name, days, hours, ntype in reminders:
        c.execute("""
            INSERT INTO booking_reminder_settings
            (name, days_before, hours_before, notification_type, is_enabled, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (name, days, hours, ntype, 1, datetime.now().isoformat()))

    print(f"✅ Создано настроек напоминаний: {len(reminders)}")
    for name, days, hours, _ in reminders:
        if days > 0:
            print(f"   - {name}: за {days} дн.")
        else:
            print(f"   - {name}: за {hours} ч.")

    # Таблица для отслеживания отправленных напоминаний
    c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='booking_reminders_sent'")
    if not c.fetchone():
        print("⚠️  Создаю таблицу booking_reminders_sent...")
        c.execute("""
            CREATE TABLE booking_reminders_sent (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                booking_id INTEGER NOT NULL,
                reminder_setting_id INTEGER NOT NULL,
                sent_at TEXT,
                status TEXT DEFAULT 'sent',
                error_message TEXT,
                UNIQUE(booking_id, reminder_setting_id)
            )
        """)
    else:
        # Очищаем старые записи для тестовых записей
        c.execute("""
            DELETE FROM booking_reminders_sent
            WHERE booking_id IN (
                SELECT id FROM bookings
                WHERE notes LIKE '%Тестовая запись для уведомлений%'
            )
        """)

    conn.commit()
    conn.close()

    print("\n" + "=" * 80)
    print("🎉 Тестовые данные созданы успешно!")
    print("=" * 80)
    print(f"\n📧 Для проверки уведомлений:")
    print(f"   1. Проверьте почту {email}")
    print(f"   2. Запустите планировщик уведомлений о днях рождения:")
    print(f"      python -m scheduler.birthday_checker")
    print(f"   3. Запустите планировщик напоминаний о записях:")
    print(f"      python -m scheduler.booking_reminder_checker")
    print("\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Настройка тестовых уведомлений')
    parser.add_argument('--email', '-e', required=True, help='Email для тестовых уведомлений')
    parser.add_argument('--days', '-d', type=int, default=1,
                       help='Через сколько дней создать тестовые события (по умолчанию 1 = завтра)')

    args = parser.parse_args()

    setup_test_notifications(args.email, args.days)
