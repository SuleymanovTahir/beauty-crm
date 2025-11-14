#!/usr/bin/env python3
"""
Скрипт для проверки и исправления данных в базе
"""

import sqlite3
import json
import os
from datetime import datetime

# Получаем путь к базе данных из конфига или используем дефолтное значение
try:
    from core.config import DATABASE_NAME
    DB_NAME = DATABASE_NAME
except ImportError:
    # Если запускается как standalone скрипт
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    DB_NAME = os.path.join(BASE_DIR, "salon_bot.db")

def table_exists(cursor, table_name):
    """Проверить существование таблицы"""
    cursor.execute("""
        SELECT name FROM sqlite_master
        WHERE type='table' AND name=?
    """, (table_name,))
    return cursor.fetchone() is not None

def check_bot_settings():
    """Проверить настройки бота"""
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()

    # Проверить существование таблицы
    if not table_exists(c, 'bot_settings'):
        print("⚠️  Таблица bot_settings не существует, пропуск проверки")
        conn.close()
        return

    # Получить все поля
    c.execute("PRAGMA table_info(bot_settings)")
    columns = [row[1] for row in c.fetchall()]

    # Получить данные
    c.execute("SELECT * FROM bot_settings WHERE id = 1")
    row = c.fetchone()

    if not row:
        print("❌ Настройки бота отсутствуют!")
        conn.close()
        return

    print("=== Настройки бота ===")
    print(f"Всего полей: {len(columns)}")

    # Создаем словарь поле: значение
    data = dict(zip(columns, row))

    empty_fields = []
    dotdot_fields = []

    for field, value in data.items():
        if field in ['id', 'updated_at']:
            continue

        if value is None or value == '':
            empty_fields.append(field)
        elif isinstance(value, str) and value.strip() in ['...', '…']:
            dotdot_fields.append(field)

    if empty_fields:
        print(f"\n⚠️  Пустые поля ({len(empty_fields)}):")
        for field in empty_fields[:10]:  # Первые 10
            print(f"   - {field}")
        if len(empty_fields) > 10:
            print(f"   ... и еще {len(empty_fields) - 10}")

    if dotdot_fields:
        print(f"\n⚠️  Поля с троеточиями ({len(dotdot_fields)}):")
        for field in dotdot_fields:
            print(f"   - {field}")

    # Проверка конкретных полей
    important_fields = [
        'booking_data_collection',
        'booking_time_logic',
        'manager_consultation_prompt',
        'pre_booking_data_collection'
    ]

    print(f"\n=== Важные поля ===")
    for field in important_fields:
        value = data.get(field, '')
        length = len(value) if value else 0
        status = "✅" if length > 10 else "❌"
        print(f"{status} {field}: {length} символов")
        if value and len(value) < 100:
            print(f"   Значение: {value[:100]}")

    conn.close()


def check_users():
    """Проверить пользователей"""
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()

    # Проверить существование таблицы
    if not table_exists(c, 'users'):
        print("⚠️  Таблица users не существует, пропуск проверки")
        conn.close()
        return

    c.execute("PRAGMA table_info(users)")
    columns = [row[1] for row in c.fetchall()]

    print("\n=== Таблица users ===")
    print(f"Колонки: {', '.join(columns)}")

    c.execute("SELECT id, username, full_name, role, position FROM users")
    rows = c.fetchall()

    print(f"\nВсего пользователей: {len(rows)}")
    print("\nДанные:")
    print(f"{'ID':<5} {'Username':<20} {'Full Name':<25} {'Role':<15} {'Position':<15}")
    print("-" * 85)

    for row in rows:
        id_, username, full_name, role, position = row
        print(f"{id_:<5} {username:<20} {full_name:<25} {role:<15} {position or 'NULL':<15}")

    # Проверка пустых должностей
    c.execute("SELECT COUNT(*) FROM users WHERE position IS NULL OR position = ''")
    empty_positions = c.fetchone()[0]

    if empty_positions > 0:
        print(f"\n⚠️  Пользователей без должности: {empty_positions}")

    conn.close()


def check_salon_settings():
    """Проверить настройки салона"""
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()

    # Проверить существование таблицы
    if not table_exists(c, 'salon_settings'):
        print("⚠️  Таблица salon_settings не существует, пропуск проверки")
        conn.close()
        return

    c.execute("SELECT * FROM salon_settings WHERE id = 1")
    row = c.fetchone()

    if not row:
        print("\n❌ Настройки салона отсутствуют!")
        conn.close()
        return

    c.execute("PRAGMA table_info(salon_settings)")
    columns = [r[1] for r in c.fetchall()]
    data = dict(zip(columns, row))

    print("\n=== Настройки салона ===")
    important = ['name', 'address', 'phone', 'city', 'currency', 'hours']

    for field in important:
        value = data.get(field, '')
        status = "✅" if value else "❌"
        print(f"{status} {field}: {value}")

    # Проверка weekdays_hours
    if 'weekdays_hours' in columns:
        weekdays = data.get('weekdays_hours', '')
        print(f"\nweekdays_hours: {weekdays}")
        print(f"Тип данных: {type(weekdays)}")

    conn.close()


def fix_manager_consultation_prompt():
    """Исправить manager_consultation_prompt"""
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()

    # Проверить существование таблицы
    if not table_exists(c, 'bot_settings'):
        print("⚠️  Таблица bot_settings не существует, пропуск исправления")
        conn.close()
        return

    default_prompt = """Ты — эксперт-консультант по продажам салона красоты M.Le Diamant в Dubai.
Менеджер обратился к тебе за советом. Ты помогаешь МЕНЕДЖЕРУ, а не общаешься с клиентом напрямую.

⚠️ КРИТИЧЕСКИ ВАЖНО:
1. Обращайся к менеджеру на "ты"
2. НЕ пиши текст для клиента напрямую
3. Дай СОВЕТ менеджеру что делать

СТРУКТУРА ОТВЕТА (ОБЯЗАТЕЛЬНА):
1️⃣ Краткий анализ ситуации (1-2 предложения)
 "Я вижу что клиент..."

2️⃣ Твоя рекомендация (что написать клиенту)
 "Я бы на твоем месте написал примерно так:
 '[готовый текст для клиента в кавычках]'"

3️⃣ Почему это работает (психология/стратегия)
 "Это сработает потому что..."

ПРИМЕР ПРАВИЛЬНОГО ОТВЕТА:
"Вижу что клиент молчит после твоего ответа о длительности процедуры. Это типично - человек обдумывает временные затраты.

Я бы на твоем месте через 30-60 минут написал:
'Кстати, для длинных волос 4 часа - это стандарт 💆‍♀️ Зато результат держится 3-4 месяца без коррекции! Многие клиентки специально берут выходной - получается мини-отпуск для себя. Хотите посмотреть расписание на удобное время?'

Почему это работает: ты нормализуешь длительность (4 часа = стандарт), показываешь выгоду (3-4 месяца результат), создаешь позитивный фрейм (отпуск вместо траты времени) и даешь мягкий призыв к действию."

❌ НЕ НАЧИНАЙ С ФРАЗ:
"Супер! Давайте оформим запись!"
"Для записи мне нужно..."
Любой текст обращенный к клиенту напрямую

✅ НАЧИНАЙ С ФРАЗ:
"Я вижу что..."
"Я бы на твоем месте..."
"Рекомендую написать клиенту..."
"""

    # Обновить
    c.execute("""
        UPDATE bot_settings
        SET manager_consultation_prompt = ?, updated_at = ?
        WHERE id = 1
    """, (default_prompt, datetime.now().isoformat()))

    conn.commit()
    conn.close()

    print("\n✅ manager_consultation_prompt обновлен")


def fix_booking_data_collection():
    """Исправить booking_data_collection"""
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()

    # Проверить существование таблицы
    if not table_exists(c, 'bot_settings'):
        print("⚠️  Таблица bot_settings не существует, пропуск исправления")
        conn.close()
        return

    value = """📋 Сбор данных для записи

⚠️ СОБИРАЙ ДАННЫЕ ТОЛЬКО ПОСЛЕ ВЫБОРА ВРЕМЕНИ!

Правильная последовательность:
1. Услуга определена ✅
2. Дата выбрана ✅
3. Время выбрано ✅
4. ТЕПЕРЬ спрашивай данные

❌ НЕ спрашивай данные если:
- Услуга не определена
- Дата не выбрана
- Время не выбрано

✅ ПРАВИЛЬНО:
"Отлично! Записываю вас на маникюр завтра в 15:00 к Диане.
Как вас зовут и какой номер WhatsApp?"

❌ НЕПРАВИЛЬНО:
"Для записи нужно имя и WhatsApp" (когда услуга/время не выбраны)
"""

    c.execute("""
        UPDATE bot_settings
        SET booking_data_collection = ?, updated_at = ?
        WHERE id = 1
    """, (value, datetime.now().isoformat()))

    conn.commit()
    conn.close()

    print("✅ booking_data_collection обновлен")


if __name__ == "__main__":
    print("=== Проверка данных в БД ===\n")

    try:
        check_salon_settings()
        check_bot_settings()
        check_users()

        print("\n" + "="*50)
        print("Исправляем пустые поля...")
        print("="*50)

        fix_manager_consultation_prompt()
        fix_booking_data_collection()

        print("\n✅ Проверка завершена!")

    except Exception as e:
        print(f"\n❌ Ошибка: {e}")
        import traceback
        traceback.print_exc()
