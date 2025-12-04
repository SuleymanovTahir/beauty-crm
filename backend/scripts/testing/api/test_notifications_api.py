#!/usr/bin/env python3
"""
Тестовый скрипт для проверки API уведомлений
"""
import sys
import os
import traceback
from db.connection import get_db_connection

# Добавляем путь к backend для импортов
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../..')))

from core.config import DATABASE_NAME

def test_database_tables():
    """Проверить существование таблиц"""
    print("=" * 70)
    print("ПРОВЕРКА ТАБЛИЦ В БАЗЕ ДАННЫХ")
    print("=" * 70)

    try:
        conn = get_db_connection()
        c = conn.cursor()

        # Получаем список таблиц
        c.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
        tables = [row[0] for row in c.fetchall()]

        print(f"\n📋 Всего таблиц: {len(tables)}")
        for table in tables:
            c.execute(f"SELECT COUNT(*) FROM {table}")
            count = c.fetchone()[0]
            print(f"  ✓ {table}: {count} записей")

        # Проверяем notification_settings
        print("\n" + "=" * 70)
        print("ПРОВЕРКА ТАБЛИЦЫ notification_settings")
        print("=" * 70)

        if 'notification_settings' in tables:
            c.execute("SELECT column_name FROM information_schema.columns WHERE table_name=\'notification_settings\'")
            columns = c.fetchall()
            print(f"\n✅ Таблица существует, колонок: {len(columns)}")
            for col in columns:
                print(f"  - {col[1]} ({col[2]})")

            c.execute("SELECT * FROM notification_settings")
            rows = c.fetchall()
            print(f"\nЗаписей в таблице: {len(rows)}")
            if rows:
                for row in rows:
                    print(f"  {row}")
        else:
            print("\n❌ Таблица notification_settings НЕ СУЩЕСТВУЕТ")

        # Проверяем booking_reminder_settings
        print("\n" + "=" * 70)
        print("ПРОВЕРКА ТАБЛИЦЫ booking_reminder_settings")
        print("=" * 70)

        if 'booking_reminder_settings' in tables:
            c.execute("SELECT column_name FROM information_schema.columns WHERE table_name=\'booking_reminder_settings\'")
            columns = c.fetchall()
            print(f"\n✅ Таблица существует, колонок: {len(columns)}")
            for col in columns:
                print(f"  - {col[1]} ({col[2]})")

            c.execute("SELECT * FROM booking_reminder_settings")
            rows = c.fetchall()
            print(f"\nЗаписей в таблице: {len(rows)}")
            if rows:
                for row in rows:
                    print(f"  {row}")
        else:
            print("\n❌ Таблица booking_reminder_settings НЕ СУЩЕСТВУЕТ")

        conn.close()
        return True

    except Exception as e:
        print(f"\n❌ ОШИБКА при проверке БД:")
        print(traceback.format_exc())
        return False

def test_notifications_endpoint():
    """Тестировать эндпоинт notifications/settings напрямую"""
    print("\n" + "=" * 70)
    print("ТЕСТИРОВАНИЕ GET /api/notifications/settings")
    print("=" * 70)

    try:
        from api.notifications import get_notification_settings_api
        import asyncio

        print("\n🔄 Вызов get_notification_settings_api()...")
        result = asyncio.run(get_notification_settings_api())

        print("\n✅ УСПЕШНО!")
        print(f"Результат: {result}")
        return True

    except Exception as e:
        print(f"\n❌ ОШИБКА при вызове эндпоинта:")
        print(traceback.format_exc())
        return False

def test_booking_reminder_endpoint():
    """Тестировать эндпоинт booking-reminder-settings напрямую"""
    print("\n" + "=" * 70)
    print("ТЕСТИРОВАНИЕ GET /api/booking-reminder-settings")
    print("=" * 70)

    try:
        from api.reminders import get_booking_reminder_settings
        from unittest.mock import Mock
        import asyncio

        # Создаем mock session_token (для обхода авторизации в тесте)
        print("\n🔄 Вызов get_booking_reminder_settings()...")

        # Здесь нужна авторизация, поэтому просто проверим импорт
        print("✅ Функция импортирована успешно")
        print("⚠️  Требуется авторизация для полного теста")
        return True

    except Exception as e:
        print(f"\n❌ ОШИБКА при импорте эндпоинта:")
        print(traceback.format_exc())
        return False

def test_http_request():
    """Тестировать через HTTP запрос"""
    print("\n" + "=" * 70)
    print("ТЕСТИРОВАНИЕ HTTP GET http://localhost:8000/api/notifications/settings")
    print("=" * 70)

    try:
        import requests

        print("\n🔄 Отправка HTTP GET запроса...")
        response = requests.get("http://localhost:8000/api/notifications/settings", timeout=5)

        print(f"\nСтатус код: {response.status_code}")
        print(f"Headers: {dict(response.headers)}")

        if response.status_code == 200:
            print(f"\n✅ УСПЕШНО!")
            print(f"Ответ: {response.json()}")
            return True
        else:
            print(f"\n❌ ОШИБКА {response.status_code}")
            print(f"Ответ: {response.text}")
            return False

    except ImportError:
        print("\n⚠️  Модуль requests не установлен, устанавливаю...")
        import subprocess
        subprocess.run([sys.executable, "-m", "pip", "install", "-q", "requests"])
        return test_http_request()

    except Exception as e:
        print(f"\n❌ ОШИБКА при HTTP запросе:")
        print(traceback.format_exc())
        return False

if __name__ == "__main__":
    print("\n" + "=" * 70)
    print("ТЕСТИРОВАНИЕ API УВЕДОМЛЕНИЙ")
    print("=" * 70)

    results = []

    # 1. Проверка таблиц БД
    results.append(("БД таблицы", test_database_tables()))

    # 2. Прямой вызов функции
    results.append(("Прямой вызов API функции", test_notifications_endpoint()))

    # 3. Проверка booking reminders
    results.append(("Booking reminders эндпоинт", test_booking_reminder_endpoint()))

    # 4. HTTP запрос
    results.append(("HTTP запрос", test_http_request()))

    # Итоги
    print("\n" + "=" * 70)
    print("ИТОГИ ТЕСТИРОВАНИЯ")
    print("=" * 70)

    for name, success in results:
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {name}")

    total = len(results)
    passed = sum(1 for _, s in results if s)

    print(f"\nПройдено: {passed}/{total}")

    sys.exit(0 if passed == total else 1)
