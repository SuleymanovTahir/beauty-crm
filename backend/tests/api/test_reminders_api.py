#!/usr/bin/env python3
"""
Тестовый скрипт для проверки API напоминаний о записях (booking reminders)
"""
import sys
import os
import traceback
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(backend_dir))

from db.connection import get_db_connection
from core.config import DATABASE_NAME

def test_booking_reminder_settings_table():
    """Проверить таблицу booking_reminder_settings"""
    print("=" * 70)
    print("ПРОВЕРКА ТАБЛИЦЫ booking_reminder_settings")
    print("=" * 70)

    try:
        conn = get_db_connection()
        c = conn.cursor()

        # Проверяем существование таблицы
        c.execute("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name='booking_reminder_settings'")
        exists = c.fetchone()

        if not exists:
            print("\n❌ Таблица booking_reminder_settings НЕ СУЩЕСТВУЕТ")
            return False

        # Получаем схему
        c.execute("SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name='booking_reminder_settings'")
        columns = c.fetchall()

        print(f"\n✅ Таблица существует, колонок: {len(columns)}")
        print("\n📋 Схема таблицы:")
        for col in columns:
            print(f"  - {col[0]} ({col[1]}, {col[2]})")

        # Проверяем обязательные колонки
        column_names = [col[0] for col in columns]
        required_columns = ['id', 'name', 'days_before', 'hours_before', 'notification_type', 'is_enabled']

        missing = [col for col in required_columns if col not in column_names]
        if missing:
            print(f"\n⚠️  Отсутствуют колонки: {', '.join(missing)}")
            return False

        # Получаем данные
        c.execute("SELECT * FROM booking_reminder_settings ORDER BY days_before DESC, hours_before DESC")
        rows = c.fetchall()

        print(f"\n📊 Записей в таблице: {len(rows)}")

        if rows:
            print("\n📝 Настройки напоминаний:")
            for row in rows:
                enabled = "✅ Включено" if row[4] else "❌ Выключено"  # is_enabled
                print(f"  {row[0]:2d}. {row[1]:30s} | {row[2]:2d} дн. {row[3]:2d} ч. | {row[5]:6s} | {enabled}")

        conn.close()
        return True

    except Exception as e:
        print(f"\n❌ ОШИБКА при проверке таблицы:")
        print(traceback.format_exc())
        return False

def test_reminders_api_direct():
    """Тестировать API функции напрямую"""
    print("\n" + "=" * 70)
    print("ТЕСТИРОВАНИЕ ФУНКЦИЙ API (прямой вызов)")
    print("=" * 70)

    try:
        from api.reminders import create_booking_reminder_settings_table

        print("\n1️⃣ Создание таблицы booking_reminder_settings...")
        create_booking_reminder_settings_table()
        print("   ✅ Функция создания таблицы выполнена")

        # Проверяем что таблица создалась
        conn = get_db_connection()
        c = conn.cursor()
        c.execute("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name='booking_reminder_settings'")
        exists = c.fetchone()
        conn.close()

        if exists:
            print("   ✅ Таблица успешно создана")
            return True
        else:
            print("   ❌ Таблица не создана")
            return False

    except Exception as e:
        print(f"\n❌ ОШИБКА при тестировании API:")
        print(traceback.format_exc())
        return False

def test_reminders_http():
    """Тестировать через HTTP запросы"""
    print("\n" + "=" * 70)
    print("ТЕСТИРОВАНИЕ HTTP API")
    print("=" * 70)

    try:
        from fastapi.testclient import TestClient
        from main import app

        client = TestClient(app)

        # Нужна авторизация, поэтому проверим только доступность
        print("\n1️⃣ GET /api/booking-reminder-settings (требует авторизации)")
        response = client.get("/api/booking-reminder-settings")

        print(f"   Статус: {response.status_code}")

        if response.status_code == 401:
            print("   ✅ Эндпоинт работает (требует авторизации)")
            return True
        elif response.status_code == 200:
            data = response.json()
            print(f"   ✅ Успешный ответ!")
            print(f"   Настроек: {len(data.get('settings', []))}")
            return True
        else:
            print(f"   ⚠️  Неожиданный статус: {response.status_code}")
            print(f"   Ответ: {response.text[:200]}")
            return False

    except ImportError:
        print("\n⚠️  Модуль fastapi.testclient не установлен, пропускаю HTTP тесты")
        return True
    except Exception as e:
        print(f"\n❌ ОШИБКА при HTTP запросе:")
        print(traceback.format_exc())
        return False

def test_toggle_reminder():
    """Тестировать включение/выключение напоминания"""
    print("\n" + "=" * 70)
    print("ТЕСТИРОВАНИЕ ПЕРЕКЛЮЧЕНИЯ НАПОМИНАНИЙ")
    print("=" * 70)

    try:
        conn = get_db_connection()
        c = conn.cursor()

        # Найдем первую запись
        c.execute("SELECT id, name, is_enabled FROM booking_reminder_settings LIMIT 1")
        row = c.fetchone()

        if not row:
            print("\n⚠️  Нет записей для тестирования")
            conn.close()
            return True

        reminder_id, name, current_state = row
        print(f"\n📝 Тестируем напоминание: '{name}' (ID: {reminder_id})")
        print(f"   Текущее состояние: {'Включено' if current_state else 'Выключено'}")

        # Переключаем состояние
        new_state = 0 if current_state else 1
        c.execute("UPDATE booking_reminder_settings SET is_enabled = %s WHERE id = %s", (new_state, reminder_id))
        conn.commit()

        print(f"   ➡️  Переключено на: {'Включено' if new_state else 'Выключено'}")

        # Проверяем что изменилось
        c.execute("SELECT is_enabled FROM booking_reminder_settings WHERE id = %s", (reminder_id,))
        updated_state = c.fetchone()[0]

        if updated_state == new_state:
            print("   ✅ Состояние успешно обновлено")

            # Возвращаем обратно
            c.execute("UPDATE booking_reminder_settings SET is_enabled = %s WHERE id = %s", (current_state, reminder_id))
            conn.commit()
            print(f"   ↩️  Возвращено в исходное состояние")

            conn.close()
            return True
        else:
            print("   ❌ Состояние не изменилось")
            conn.close()
            return False

    except Exception as e:
        print(f"\n❌ ОШИБКА при тестировании переключения:")
        print(traceback.format_exc())
        return False

if __name__ == "__main__":
    print("\n" + "=" * 70)
    print("ТЕСТИРОВАНИЕ API НАПОМИНАНИЙ О ЗАПИСЯХ")
    print("=" * 70)

    results = []

    # 1. Проверка таблицы
    results.append(("Таблица booking_reminder_settings", test_booking_reminder_settings_table()))

    # 2. Прямой вызов API
    results.append(("Создание таблицы (API)", test_reminders_api_direct()))

    # 3. HTTP тесты
    results.append(("HTTP эндпоинты", test_reminders_http()))

    # 4. Тест переключения
    results.append(("Переключение напоминаний", test_toggle_reminder()))

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
