#!/usr/bin/env python3
"""
🧪 ТЕСТ АКЦИОННЫХ РАССЫЛОК И НАПОМИНАНИЙ

Тестирует:
1. Акционные рассылки на email
2. Напоминания в Instagram для конкретного пользователя
"""
import sys
import os
import sqlite3
from datetime import datetime, timedelta
import asyncio

# Добавляем путь к backend
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from core.config import DATABASE_NAME


def print_header(text):
    """Красивый заголовок"""
    print("\n" + "=" * 80)
    print(f"  {text}")
    print("=" * 80)


def print_section(text):
    """Секция теста"""
    print("\n" + "-" * 80)
    print(f"  {text}")
    print("-" * 80)


def test_broadcast_email_setup():
    """
    ТЕСТ 1: Настройка рассылки на email
    Создаем тестового пользователя с email ii3391609@gmail.com
    """
    print_section("ТЕСТ 1: Настройка акционной рассылки на Email")

    try:
        conn = sqlite3.connect(DATABASE_NAME)
        c = conn.cursor()

        # 1. Проверяем наличие таблицы user_subscriptions
        c.execute("""
            SELECT name FROM sqlite_master
            WHERE type='table' AND name='user_subscriptions'
        """)

        if not c.fetchone():
            print("   ⚠️  Таблица user_subscriptions не существует")
            print("   📝 Создаем таблицу...")

            c.execute("""
                CREATE TABLE IF NOT EXISTS user_subscriptions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    subscription_type TEXT NOT NULL,
                    is_subscribed INTEGER DEFAULT 1,
                    email_enabled INTEGER DEFAULT 1,
                    telegram_enabled INTEGER DEFAULT 0,
                    instagram_enabled INTEGER DEFAULT 0,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    updated_at TEXT,
                    FOREIGN KEY (user_id) REFERENCES users (id),
                    UNIQUE(user_id, subscription_type)
                )
            """)
            conn.commit()
            print("   ✅ Таблица создана")

        # 2. Проверяем наличие тестового пользователя
        test_email = "ii3391609@gmail.com"
        c.execute("SELECT id, username, full_name FROM users WHERE email = ?", (test_email,))
        user = c.fetchone()

        if user:
            user_id, username, full_name = user
            print(f"   ✅ Тестовый пользователь найден: {full_name} ({username})")
        else:
            print(f"   📝 Создаем тестового пользователя с email: {test_email}")

            c.execute("""
                INSERT INTO users (
                    username, email, password_hash, full_name, role,
                    is_active, email_verified, created_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                "test_broadcast_user",
                test_email,
                "test_password_hash",  # В реальной системе - хэш пароля
                "Тестовый Пользователь Рассылки",
                "client",
                1,  # is_active
                1,  # email_verified
                datetime.now().isoformat()
            ))

            user_id = c.lastrowid
            conn.commit()
            print(f"   ✅ Тестовый пользователь создан с ID: {user_id}")

        # 3. Настраиваем подписку на акции (promotions)
        c.execute("""
            SELECT id, is_subscribed, email_enabled
            FROM user_subscriptions
            WHERE user_id = ? AND subscription_type = 'promotions'
        """, (user_id,))

        subscription = c.fetchone()

        if subscription:
            sub_id, is_subscribed, email_enabled = subscription
            print(f"   ℹ️  Подписка найдена (ID: {sub_id})")
            print(f"       Активна: {bool(is_subscribed)}")
            print(f"       Email включен: {bool(email_enabled)}")

            if not is_subscribed or not email_enabled:
                c.execute("""
                    UPDATE user_subscriptions
                    SET is_subscribed = 1, email_enabled = 1, updated_at = ?
                    WHERE id = ?
                """, (datetime.now().isoformat(), sub_id))
                conn.commit()
                print("   ✅ Подписка активирована")
        else:
            print("   📝 Создаем подписку на акции...")

            c.execute("""
                INSERT INTO user_subscriptions (
                    user_id, subscription_type, is_subscribed,
                    email_enabled, telegram_enabled, instagram_enabled,
                    created_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                user_id,
                'promotions',
                1,  # is_subscribed
                1,  # email_enabled
                0,  # telegram_enabled
                0,  # instagram_enabled
                datetime.now().isoformat()
            ))
            conn.commit()
            print("   ✅ Подписка на акции создана")

        # 4. Проверяем таблицу broadcast_history
        c.execute("""
            SELECT name FROM sqlite_master
            WHERE type='table' AND name='broadcast_history'
        """)

        if not c.fetchone():
            print("   📝 Создаем таблицу broadcast_history...")

            c.execute("""
                CREATE TABLE IF NOT EXISTS broadcast_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    sender_id INTEGER,
                    subscription_type TEXT NOT NULL,
                    channels TEXT NOT NULL,
                    subject TEXT NOT NULL,
                    message TEXT NOT NULL,
                    target_role TEXT,
                    total_sent INTEGER DEFAULT 0,
                    results TEXT,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (sender_id) REFERENCES users (id)
                )
            """)
            conn.commit()
            print("   ✅ Таблица broadcast_history создана")

        # 5. Тестовая рассылка
        print_section("Подготовка тестовой рассылки")

        test_broadcast = {
            "subscription_type": "promotions",
            "channels": ["email"],
            "subject": "🎉 Специальное предложение!",
            "message": """
Здравствуйте!

У нас для вас отличная новость!

🎁 Только сегодня - скидка 30% на все услуги!

Успейте записаться по телефону или через Instagram.

С уважением,
Команда Beauty CRM
            """.strip(),
            "target_email": test_email
        }

        print(f"\n   📧 Тема: {test_broadcast['subject']}")
        print(f"   👤 Получатель: {test_email}")
        print(f"   📝 Сообщение:")
        for line in test_broadcast['message'].split('\n'):
            print(f"      {line}")

        print("\n   ℹ️  Для отправки используйте API:")
        print("      POST /api/broadcasts/send")
        print("      {")
        print(f"        \"subscription_type\": \"promotions\",")
        print(f"        \"channels\": [\"email\"],")
        print(f"        \"subject\": \"{test_broadcast['subject']}\",")
        print(f"        \"message\": \"...\"")
        print("      }")

        print("\n   ⚠️  Примечание:")
        print("      Для реальной отправки нужно настроить SMTP в utils/email.py")
        print(f"      Email будет отправлен на: {test_email}")

        conn.close()

        print_section("✅ ТЕСТ 1 ПРОЙДЕН")
        print(f"   Пользователь готов к получению рассылок на {test_email}")

        return True

    except Exception as e:
        print(f"\n   ❌ ОШИБКА: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_instagram_reminders():
    """
    ТЕСТ 2: Напоминания в Instagram для @stz_192
    """
    print_section("ТЕСТ 2: Напоминания в Instagram для @stz_192")

    try:
        conn = sqlite3.connect(DATABASE_NAME)
        c = conn.cursor()

        # 1. Проверяем наличие клиента @stz_192
        test_username = "stz_192"
        c.execute("""
            SELECT instagram_id, username, name, phone
            FROM clients
            WHERE username = ?
        """, (test_username,))

        client = c.fetchone()

        if client:
            instagram_id, username, name, phone = client
            print(f"   ✅ Клиент найден:")
            print(f"      Instagram ID: {instagram_id}")
            print(f"      Username: @{username}")
            print(f"      Имя: {name}")
            print(f"      Телефон: {phone}")
        else:
            print(f"   📝 Создаем тестового клиента @{test_username}...")

            c.execute("""
                INSERT INTO clients (
                    instagram_id, username, name, phone,
                    first_contact, last_contact, total_messages,
                    status, created_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                "test_instagram_" + test_username,
                test_username,
                "Тестовый Клиент Instagram",
                "+79991234567",
                datetime.now().isoformat(),
                datetime.now().isoformat(),
                0,
                "active",
                datetime.now().isoformat()
            ))

            instagram_id = "test_instagram_" + test_username
            conn.commit()
            print(f"   ✅ Тестовый клиент @{test_username} создан")

        # 2. Проверяем таблицу reminders
        c.execute("""
            SELECT name FROM sqlite_master
            WHERE type='table' AND name='reminders'
        """)

        if not c.fetchone():
            print("   📝 Создаем таблицу reminders...")

            c.execute("""
                CREATE TABLE IF NOT EXISTS reminders (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    client_id TEXT NOT NULL,
                    title TEXT NOT NULL,
                    description TEXT,
                    reminder_date TEXT NOT NULL,
                    reminder_type TEXT DEFAULT 'general',
                    is_completed INTEGER DEFAULT 0,
                    created_by TEXT,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    completed_at TEXT,
                    FOREIGN KEY (client_id) REFERENCES clients (instagram_id)
                )
            """)
            conn.commit()
            print("   ✅ Таблица reminders создана")

        # 3. Создаем тестовое напоминание
        reminder_date = (datetime.now() + timedelta(days=1)).isoformat()

        c.execute("""
            INSERT INTO reminders (
                client_id, title, description, reminder_date,
                reminder_type, is_completed, created_by, created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            instagram_id,
            "Напомнить о записи",
            f"Отправить напоминание о предстоящей записи клиенту @{test_username}",
            reminder_date,
            "booking",
            0,
            "system",
            datetime.now().isoformat()
        ))

        reminder_id = c.lastrowid
        conn.commit()

        print_section("Тестовое напоминание создано")
        print(f"   📝 ID напоминания: {reminder_id}")
        print(f"   👤 Клиент: @{test_username}")
        print(f"   📅 Дата напоминания: {reminder_date}")
        print(f"   📌 Тип: booking")
        print(f"   💬 Описание: Напомнить о записи")

        # 4. Получаем все напоминания для клиента
        c.execute("""
            SELECT id, title, description, reminder_date, reminder_type, is_completed
            FROM reminders
            WHERE client_id = ?
            ORDER BY reminder_date ASC
        """, (instagram_id,))

        reminders = c.fetchall()

        print_section(f"Все напоминания для @{test_username}")

        if reminders:
            for r in reminders:
                r_id, title, description, r_date, r_type, is_completed = r
                status = "✅ Выполнено" if is_completed else "⏰ Ожидает"
                print(f"\n   {status} Напоминание #{r_id}")
                print(f"      Заголовок: {title}")
                print(f"      Дата: {r_date}")
                print(f"      Тип: {r_type}")
                if description:
                    print(f"      Описание: {description}")
        else:
            print("   ℹ️  Напоминаний не найдено")

        # 5. Информация о API
        print_section("API для работы с напоминаниями")
        print("\n   Получить напоминания:")
        print("      GET /api/reminders?client_id={instagram_id}")
        print("      GET /api/reminders?upcoming=true")

        print("\n   Создать напоминание:")
        print("      POST /api/reminders")
        print("      {")
        print(f"        \"client_id\": \"{instagram_id}\",")
        print(f"        \"title\": \"Напомнить о записи\",")
        print(f"        \"reminder_date\": \"{reminder_date}\",")
        print(f"        \"reminder_type\": \"booking\"")
        print("      }")

        print("\n   Отметить как выполненное:")
        print("      PUT /api/reminders/{reminder_id}/complete")

        print("\n   ⚠️  Для отправки в Instagram нужно:")
        print("      1. Настроить Instagram API в integrations/instagram.py")
        print(f"      2. Убедиться что у клиента @{test_username} есть активный диалог")
        print("      3. Использовать send_instagram_dm() для отправки")

        conn.close()

        print_section("✅ ТЕСТ 2 ПРОЙДЕН")
        print(f"   Напоминания настроены для @{test_username}")

        return True

    except Exception as e:
        print(f"\n   ❌ ОШИБКА: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """Запуск всех тестов"""
    print_header("ТЕСТИРОВАНИЕ РАССЫЛОК И НАПОМИНАНИЙ")
    print(f"Дата: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    results = {}

    # Тест 1: Акционные рассылки
    results["Акционные рассылки на email"] = test_broadcast_email_setup()

    # Тест 2: Напоминания в Instagram
    results["Напоминания в Instagram"] = test_instagram_reminders()

    # Итоги
    print_header("ИТОГИ ТЕСТИРОВАНИЯ")

    total = len(results)
    passed = sum(1 for r in results.values() if r)
    failed = total - passed

    for test_name, success in results.items():
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"  {status} - {test_name}")

    print(f"\n  Всего тестов: {total}")
    print(f"  Пройдено: {passed}")
    print(f"  Провалено: {failed}")

    if failed == 0:
        print("\n  🎉 ВСЕ ТЕСТЫ ПРОЙДЕНЫ!")
        print("\n  📝 Следующие шаги:")
        print("     1. Настроить SMTP для отправки email (utils/email.py)")
        print("     2. Настроить Instagram API для отправки DM (integrations/instagram.py)")
        print("     3. Использовать API /api/broadcasts/send для рассылки")
        print("     4. Использовать API /api/reminders для управления напоминаниями")
    else:
        print("\n  ⚠️  Некоторые тесты провалены")

    print("=" * 80 + "\n")

    return passed == total


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
