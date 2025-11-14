#!/usr/bin/env python3
"""
Скрипт для заполнения тестовых данных: дни рождения и телефоны
"""
import sqlite3
from datetime import datetime, timedelta

# Use default database name
DATABASE_NAME = "salon_bot.db"

def populate_birthday_data():
    """Заполнить тестовые данные о днях рождения и телефонах"""

    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    print("=" * 80)
    print("🎂 ЗАПОЛНЕНИЕ ТЕСТОВЫХ ДАННЫХ: ДНИ РОЖДЕНИЯ И ТЕЛЕФОНЫ")
    print("=" * 80)

    # Завтрашняя дата для тестирования уведомлений
    tomorrow = (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d')

    # Данные для пользователей и сотрудников
    test_data = [
        # username, birthday, phone
        ('admin', tomorrow, '+971501234567'),  # Завтра - для теста уведомлений
        ('simo', '1990-05-15', '+971501234568'),
        ('mestan', '1988-08-22', '+971501234569'),
        ('lyazzat', '1992-03-10', '+971501234570'),
        ('gulya', '1995-11-30', '+971501234571'),
        ('jennifer', '1993-07-18', '+971501234572'),
        ('tursunay', '1985-12-05', '+971501234573'),
    ]

    try:
        updated_users = 0
        updated_employees = 0

        for username, birthday, phone in test_data:
            # Обновить users
            c.execute("""
                UPDATE users
                SET birthday = ?, phone = ?
                WHERE username = ?
            """, (birthday, phone, username))

            if c.rowcount > 0:
                updated_users += 1
                if birthday == tomorrow:
                    print(f"✅ {username:12} | 🎉 ЗАВТРА (тест) | {phone}")
                else:
                    print(f"✅ {username:12} | {birthday}    | {phone}")

            # Обновить employees через связь с users
            c.execute("""
                UPDATE employees
                SET birthday = ?, phone = ?
                WHERE id IN (
                    SELECT employee_id FROM users WHERE username = ? AND employee_id IS NOT NULL
                )
            """, (birthday, phone, username))

            if c.rowcount > 0:
                updated_employees += 1

        conn.commit()

        print("\n" + "=" * 80)
        print(f"✅ Обновлено пользователей: {updated_users}")
        print(f"✅ Обновлено сотрудников: {updated_employees}")
        print(f"🎂 Дней рождения ЗАВТРА (для теста): 1 (admin)")
        print("=" * 80)

        # Показать предстоящие дни рождения
        print("\n📅 Предстоящие дни рождения:")
        c.execute("""
            SELECT username, full_name, birthday, phone
            FROM users
            WHERE birthday IS NOT NULL
            ORDER BY
                CASE
                    WHEN strftime('%m-%d', birthday) >= strftime('%m-%d', 'now')
                    THEN strftime('%m-%d', birthday)
                    ELSE strftime('13-%d', birthday)
                END
            LIMIT 5
        """)

        for row in c.fetchall():
            username, full_name, bday, phone = row
            bday_date = datetime.strptime(bday, '%Y-%m-%d')
            days_until = (bday_date - datetime.now()).days % 365

            if days_until == 0:
                status = "🎉 СЕГОДНЯ!"
            elif days_until == 1:
                status = "🎂 ЗАВТРА!"
            else:
                status = f"через {days_until} дней"

            print(f"  {full_name:20} | {bday} | {status}")

    except Exception as e:
        print(f"\n❌ Ошибка: {e}")
        import traceback
        traceback.print_exc()
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    populate_birthday_data()
