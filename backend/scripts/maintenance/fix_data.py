#!/usr/bin/env python3
"""
Скрипт для проверки и исправления данных в базе
"""

from db.connection import get_db_connection
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
    # Go up 2 levels to backend root (scripts/maintenance -> backend)
    BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.dirname(BASE_DIR)))
    DB_NAME = os.path.join(BACKEND_DIR, "backend", "salon_bot.db")
    
    if not os.path.exists(DB_NAME):
         # Try relative to script if above fails
         DB_NAME = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(BASE_DIR))), "salon_bot.db")
         
    if not os.path.exists(DB_NAME):
        # Hardcode for this environment if needed, or just try to find it
        DB_NAME = "/Users/tahir/Desktop/beauty-crm/backend/salon_bot.db"

def table_exists(cursor, table_name):
    """Проверить существование таблицы"""
    cursor.execute("""
        SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name=%s
    """, (table_name,))
    return cursor.fetchone() is not None

def check_bot_settings():
    """Проверить настройки бота"""
    conn = get_db_connection()
    c = conn.cursor()

    # Проверить существование таблицы
    if not table_exists(c, 'bot_settings'):
        print("⚠️  Таблица bot_settings не существует, пропуск проверки")
        conn.close()
        return

    # Получить все поля
    c.execute("SELECT column_name FROM information_schema.columns WHERE table_name=\'bot_settings\'")
    columns = [row[0] for row in c.fetchall()]

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
        # Проверка на реально пустое значение
        is_empty = (value is None or 
                   (isinstance(value, str) and len(value.strip()) == 0) or
                   (isinstance(value, str) and value.strip() in ['...', '…']))
        
        if is_empty:
            status = "❌"
            length = 0
        else:
            status = "✅"
            length = len(value) if value else 0
            
        print(f"{status} {field}: {length} символов")
        if value and not is_empty and len(value) < 100:
            print(f"   Значение: {value[:100]}")

    conn.close()

def check_users():
    """Проверить пользователей"""
    conn = get_db_connection()
    c = conn.cursor()

    # Проверить существование таблицы
    if not table_exists(c, 'users'):
        print("⚠️  Таблица users не существует, пропуск проверки")
        conn.close()
        return

    c.execute("SELECT column_name FROM information_schema.columns WHERE table_name=\'users\'")
    columns = [row[0] for row in c.fetchall()]

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
    conn = get_db_connection()
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

    c.execute("SELECT column_name FROM information_schema.columns WHERE table_name=\'salon_settings\'")
    columns = [r[0] for r in c.fetchall()]
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
    conn = get_db_connection()
    c = conn.cursor()

    # Проверить существование таблицы
    if not table_exists(c, 'bot_settings'):
        print("⚠️  Таблица bot_settings не существует, пропуск исправления")
        conn.close()
        return

    # Проверить текущее значение
    c.execute("SELECT manager_consultation_prompt FROM bot_settings WHERE id = 1")
    row = c.fetchone()
    if row and row[0] and isinstance(row[0], str) and len(row[0].strip()) > 10:
        print("✅ manager_consultation_prompt уже заполнен, пропуск")
        conn.close()
        return
    
    print("📝 Заполняю manager_consultation_prompt...")

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
'Кстати, для длинных волос 4 часа - это стандарт 💆‍♀️ Зато результат держится 3-4 месяца без коррекции! Многие клиентки специально берут выходной - получается мини-отпуск для себя. Хотите посмотреть расписание на удобное время%s'

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
        SET manager_consultation_prompt = %s, updated_at = %s
        WHERE id = 1
    """, (default_prompt, datetime.now().isoformat()))

    conn.commit()
    conn.close()

    print("✅ manager_consultation_prompt обновлен")

def fix_booking_data_collection():
    """Исправить booking_data_collection"""
    conn = get_db_connection()
    c = conn.cursor()

    # Проверить существование таблицы
    if not table_exists(c, 'bot_settings'):
        print("⚠️  Таблица bot_settings не существует, пропуск исправления")
        conn.close()
        return

    # Проверить текущее значение
    c.execute("SELECT booking_data_collection FROM bot_settings WHERE id = 1")
    row = c.fetchone()
    if row and row[0] and isinstance(row[0], str) and len(row[0].strip()) > 10:
        print("✅ booking_data_collection уже заполнен, пропуск")
        conn.close()
        return
    
    print("📝 Заполняю booking_data_collection...")

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
Как вас зовут и какой номер WhatsApp%s"

❌ НЕПРАВИЛЬНО:
"Для записи нужно имя и WhatsApp" (когда услуга/время не выбраны)
"""

    c.execute("""
        UPDATE bot_settings
        SET booking_data_collection = %s, updated_at = %s
        WHERE id = 1
    """, (value, datetime.now().isoformat()))

    conn.commit()
    conn.close()

    print("✅ booking_data_collection обновлен")

def fix_missing_bot_fields():
    """Заполнить пустые поля настроек бота значениями по умолчанию"""
    conn = get_db_connection()
    c = conn.cursor()

    # Проверить существование таблицы
    if not table_exists(c, 'bot_settings'):
        print("⚠️  Таблица bot_settings не существует, пропуск исправления")
        conn.close()
        return

    # Значения по умолчанию для пустых полей
    default_values = {
        'price_explanation': """💎 ПРАВИЛА ОТВЕТОВ О ЦЕНЕ

✅ Всегда называй цену ПЕРВЫМ сообщением
✅ Формат: Услуга [Цена] AED
✅ После цены - короткая продажа
✅ Заканчивай призывом к действию

ШАБЛОН:
Manicure Gel от 150 AED 💅
Держится 3 недели
Записаться%s""",

        'objection_handling': """💬 ОБЩИЕ ПРАВИЛА РАБОТЫ С ВОЗРАЖЕНИЯМИ

1. НЕ спорь с клиентом
2. Покажи понимание ("Да, понимаю...")
3. Дай ценность
4. Предложи действие

Используй конкретные ответы из полей objection_*""",

        'negative_handling': """⚠️ РАБОТА С НЕГАТИВОМ

Если клиент недоволен:
1. Извинись от лица салона
2. Предложи связь с менеджером
3. НЕ придумывай компенсацию

Пример:
"Мне очень жаль что так вышло 😔
Давайте я соединю вас с менеджером - она лично разберется.
Укажите удобный способ связи%s"
""",

        'example_dialogues': """💬 ПРИМЕРЫ ИДЕАЛЬНЫХ ДИАЛОГОВ

Пример 1 - Быстрая конверсия:
👤: Сколько стоит маникюр%s
🤖: Manicure Gel от 150 AED 💅
     Держится 3 недели
     Записаться%s
👤: Да
🤖: Отлично! Какой день вам удобен%s

Пример 2 - Работа с возражением:
👤: Дорого
🤖: Да, понимаю 💙
     Наши мастера - топ Dubai, премиум материалы
     Держится 3-4 недели = выгоднее чем дешевый на неделю
     Попробуете один раз%s""",

        'context_memory': """🧠 ПАМЯТЬ КОНТЕКСТА

1. Запоминай предыдущие услуги клиента
2. Учитывай историю записей
3. Персонализируй предложения

Пример:
"Вижу что в прошлый раз вы делали Gel Manicure у Дианы.
Записать к ней снова%s"
""",

        'avoid_repetition': """🔄 ИЗБЕГАЙ ПОВТОРЕНИЙ

❌ НЕ повторяй одинаковые фразы
❌ НЕ используй шаблонные ответы подряд
✅ Варьируй формулировки
✅ Адаптируйся к стилю клиента

Вместо повторения "Записаться%s" используй:
- "Бронирую%s"
- "Оформить запись%s"
- "Подойдет%s"
- "Удобно%s"
""",

        'conversation_flow_rules': """📊 ПРАВИЛА ВЕДЕНИЯ ДИАЛОГА

1. Один вопрос за раз
2. Не больше 3 предложений
3. Всегда призыв к действию
4. Смайлики: 1-2 на сообщение

ЗАПРЕЩЕНО:
❌ Длинные сообщения (>4 строк)
❌ Множество вопросов сразу
❌ Извинения без причины
❌ Слишком много смайликов""",

        'personality_adaptations': """🎭 АДАПТАЦИЯ ЛИЧНОСТИ

Подстраивайся под клиента:

Клиент формальный (Dear, Good day) →
- Пиши формально
- Меньше смайликов
- Полные предложения

Клиент неформальный (Привет, Хай) →
- Пиши проще
- Больше смайликов
- Короче

Клиент на English/Arabic →
- Переключись на его язык
- Сохрани стиль общения""",

        'smart_objection_detection': """🎯 УМНОЕ ОПРЕДЕЛЕНИЕ ВОЗРАЖЕНИЙ

Учись распознавать скрытые возражения:

"Подумаю" = сомнение в цене/качестве
→ Дай социальное доказательство

"Спрошу у мужа" = нужно одобрение
→ Покажи выгоду для партнера

"В следующий раз" = откладывание
→ Создай срочность (ограниченность слотов)

"Далеко" = логистика
→ Покажи ценность (престиж района, удобство)""",

        'booking_time_logic': """⏰ ЛОГИКА ПРЕДЛОЖЕНИЯ ВРЕМЕНИ

✅ ВСЕГДА предлагай КОНКРЕТНОЕ время
✅ Давай 2-3 варианта
✅ Учитывай день недели

ПРАВИЛЬНО:
"Есть окно завтра в 14:00 или послезавтра в 17:00. Что удобнее%s"

НЕПРАВИЛЬНО:
"Когда вам удобно%s" (слишком открыто)
"Есть время" (не конкретно)""",

        'pre_booking_data_collection': """📝 СБОР ДАННЫХ ДО ЗАПИСИ

⚠️ СОБИРАЙ ДАННЫЕ ТОЛЬКО ПОСЛЕ ВЫБОРА ВРЕМЕНИ!

Правильная последовательность:
1. Услуга определена ✅
2. Дата выбрана ✅  
3. Время выбрано ✅
4. ТЕПЕРЬ спрашивай: имя + WhatsApp

✅ ПРАВИЛЬНО:
"Отлично! Записываю на маникюр завтра в 15:00.
Как вас зовут и какой номер WhatsApp%s"

❌ НЕПРАВИЛЬНО:
"Для записи нужно имя и WhatsApp" (когда время не выбрано)"""
,

        'abandoned_cart_message': """Вижу, вы интересовались записью, но не закончили оформление 😔
Может, остались вопросы или не подошло время?
Давайте подберем удобный слот вручную? 👇""",

        'post_visit_feedback_message': """Спасибо, что доверили нам свою красоту! 💖
Как вам результат? Поставьте оценку от 1 до 5, нам очень важно ваше мнение! ✨""",

        'return_client_message': """Давно вас не видели! 🥺
У нас появились новые оттенки и услуги.
Может, освежим маникюр? Для вас найдем лучшее окошко! 💅"""
    }

    # Проверяем какие поля пустые
    c.execute("SELECT * FROM bot_settings WHERE id = 1")
    row = c.fetchone()

    if not row:
        print("❌ Настройки бота не найдены")
        conn.close()
        return

    # Получаем структуру таблицы
    c.execute("SELECT column_name FROM information_schema.columns WHERE table_name=\'bot_settings\'")
    columns = [r[0] for r in c.fetchall()]
    data = dict(zip(columns, row))

    # Обновляем пустые поля
    updated_fields = []
    for field, default_value in default_values.items():
        if field in columns:
            current_value = data.get(field)
            # Проверка на пустоту: None, пустая строка, или строка из пробелов
            is_empty = (current_value is None or 
                       (isinstance(current_value, str) and len(current_value.strip()) == 0))
            
            if is_empty:
                print(f"  📝 Заполняю {field}...")
                c.execute(f"""
                    UPDATE bot_settings
                    SET {field} = %s
                    WHERE id = 1
                """, (default_value,))
                updated_fields.append(field)

    if updated_fields:
        c.execute("""
            UPDATE bot_settings
            SET updated_at = %s
            WHERE id = 1
        """, (datetime.now().isoformat(),))

        conn.commit()
        print(f"✅ Заполнено {len(updated_fields)} пустых полей:")
        for field in updated_fields:
            print(f"   - {field}")
    else:
        print("✅ Все поля уже заполнены")

    conn.close()

def fix_employee_genders():
    """Исправить пол сотрудников"""
    conn = get_db_connection()
    c = conn.cursor()

    if not table_exists(c, 'users'):
        conn.close()
        return

    # Карта имен и пола
    gender_map = {
        'Simo': 'male',
        'Gulya': 'female',
        'Jennifer': 'female',
        'Lyazzat': 'female',
        'Mestan': 'female',
        'Турсунай': 'female'
    }

    print("📝 Исправляем пол сотрудников...")
    
    for name, gender in gender_map.items():
        # Используем LIKE для поиска по части имени
        c.execute("SELECT id, full_name, gender FROM users WHERE full_name LIKE %s", (f"%{name}%",))
        rows = c.fetchall()
        
        for row in rows:
            user_id, full_name, current_gender = row
            if current_gender != gender:
                c.execute("UPDATE users SET gender = %s WHERE id = %s", (gender, user_id))
                print(f"   ✅ {full_name}: {current_gender} -> {gender}")
            else:
                # print(f"   ✓ {full_name} уже {gender}")
                pass

    conn.commit()
    conn.close()

def fix_services_english_translations():
    """Исправить английские переводы услуг - скопировать из поля name в name_en"""
    conn = get_db_connection()
    c = conn.cursor()

    if not table_exists(c, 'services'):
        print("⚠️  Таблица services не существует")
        conn.close()
        return

    print("\n📝 Исправляем английские переводы услуг...")
    
    # Получаем услуги где name_en пустое, но name заполнено
    c.execute("""
        SELECT id, name, name_ru, name_en, description, description_en 
        FROM services 
        WHERE name IS NOT NULL AND (name_en IS NULL OR name_en = '')
    """)
    services = c.fetchall()
    
    if not services:
        print("✅ Все услуги уже имеют английские переводы")
        conn.close()
        return
    
    print(f"Найдено {len(services)} услуг без английского перевода")
    
    for service_id, name, name_ru, name_en, description, description_en in services:
        updates = []
        params = []
        
        # Копируем name в name_en (name уже на английском)
        if name:
            updates.append("name_en = %s")
            params.append(name)
            print(f"  ✅ ID {service_id}: {name_ru} -> {name}")
        
        # Копируем description в description_en если есть
        if description and (not description_en or description_en == ''):
            updates.append("description_en = %s")
            params.append(description)
        
        if updates:
            params.append(service_id)
            sql = f"UPDATE services SET {', '.join(updates)} WHERE id = %s"
            c.execute(sql, params)
    
    conn.commit()
    conn.close()
    print(f"✅ Обновлено {len(services)} услуг")

def cleanup_reviews_translations():
    """Очистить неправильные переводы отзывов (русский текст в других языках)"""
    conn = get_db_connection()
    c = conn.cursor()

    if not table_exists(c, 'public_reviews'):
        print("⚠️  Таблица public_reviews не существует")
        conn.close()
        return

    print("\n🧹 Очищаем неправильные переводы отзывов...")
    
    # Получаем все отзывы
    c.execute("SELECT id, text_ru, text_en, text_ar, text_de, text_es, text_fr, text_hi, text_kk, text_pt FROM public_reviews")
    reviews = c.fetchall()
    
    cleaned_count = 0
    for review in reviews:
        review_id = review[0]
        text_ru = review[1]
        
        # Проверяем каждый язык (кроме русского и английского)
        updates = []
        params = []
        
        for i, lang in enumerate(['ar', 'de', 'es', 'fr', 'hi', 'kk', 'pt'], start=3):
            text_lang = review[i]
            
            # Если текст на другом языке совпадает с русским - очищаем
            if text_lang and text_lang == text_ru:
                updates.append(f"text_{lang} = NULL")
                cleaned_count += 1
                print(f"  🧹 ID {review_id}: Очищен {lang} (был дубликат русского)")
        
        if updates:
            sql = f"UPDATE public_reviews SET {', '.join(updates)} WHERE id = %s"
            c.execute(sql, [review_id])
    
    conn.commit()
    conn.close()
    
    if cleaned_count > 0:
        print(f"✅ Очищено {cleaned_count} неправильных переводов")
    else:
        print("✅ Неправильных переводов не найдено")

def cleanup_faq_translations():
    """Очистить неправильные переводы FAQ (русский текст в других языках)"""
    conn = get_db_connection()
    c = conn.cursor()

    if not table_exists(c, 'public_faq'):
        print("⚠️  Таблица public_faq не существует")
        conn.close()
        return

    print("\n🧹 Очищаем неправильные переводы FAQ...")
    
    # Получаем все FAQ
    c.execute("""
        SELECT id, question_ru, answer_ru, 
               question_en, answer_en,
               question_ar, answer_ar,
               question_de, answer_de,
               question_es, answer_es,
               question_fr, answer_fr,
               question_hi, answer_hi,
               question_kk, answer_kk,
               question_pt, answer_pt
        FROM public_faq
    """)
    faqs = c.fetchall()
    
    cleaned_count = 0
    for faq in faqs:
        faq_id = faq[0]
        question_ru = faq[1]
        answer_ru = faq[2]
        
        updates = []
        
        # Проверяем каждый язык (кроме русского и английского)
        langs = ['ar', 'de', 'es', 'fr', 'hi', 'kk', 'pt']
        for i, lang in enumerate(langs):
            # Индексы: en=3,4  ar=5,6  de=7,8  es=9,10  fr=11,12  hi=13,14  kk=15,16  pt=17,18
            q_idx = 5 + (i * 2)
            a_idx = 6 + (i * 2)
            
            question_lang = faq[q_idx] if q_idx < len(faq) else None
            answer_lang = faq[a_idx] if a_idx < len(faq) else None
            
            # Если вопрос совпадает с русским - очищаем
            if question_lang and question_lang == question_ru:
                updates.append(f"question_{lang} = NULL")
                cleaned_count += 1
                print(f"  🧹 FAQ {faq_id}: Очищен question_{lang}")
            
            # Если ответ совпадает с русским - очищаем
            if answer_lang and answer_lang == answer_ru:
                updates.append(f"answer_{lang} = NULL")
                cleaned_count += 1
                print(f"  🧹 FAQ {faq_id}: Очищен answer_{lang}")
        
        if updates:
            sql = f"UPDATE public_faq SET {', '.join(updates)} WHERE id = %s"
            c.execute(sql, [faq_id])
    
    conn.commit()
    conn.close()
    
    if cleaned_count > 0:
        print(f"✅ Очищено {cleaned_count} неправильных переводов")
    else:
        print("✅ Неправильных переводов не найдено")

def fix_all_data():
    """Запустить все исправления данных"""
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
        fix_missing_bot_fields()
        fix_employee_genders()
        
        print("\n" + "="*50)
        print("Исправляем переводы...")
        print("="*50)
        
        fix_services_english_translations()
        cleanup_reviews_translations()
        fix_services_english_translations()
        cleanup_reviews_translations()
        cleanup_faq_translations()

        print("\n" + "="*50)
        print("Синхронизация услуг мастеров...")
        print("="*50)
        try:
            from scripts.maintenance.fix_master_data import fix_master_data
            fix_master_data()
        except ImportError:
            print("⚠️ Скрипт scripts.maintenance.fix_master_data не найден")
        except Exception as e:
            print(f"⚠️ Ошибка при синхронизации услуг мастеров: {e}")

        print("\n✅ Проверка завершена!")

    except Exception as e:
        print(f"\n❌ Ошибка: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    fix_all_data()

