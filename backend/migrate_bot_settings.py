"""
Скрипт для первичной инициализации настроек салона и бота в БД
Запустить один раз: python migrate_bot_settings.py
"""

import sqlite3
import os
from logger import log_info, log_error, log_warning

DATABASE_NAME = os.getenv("DATABASE_NAME", "salon_bot.db")

# ============================================
# НАСТРОЙКИ САЛОНА (Начальные значения)
# ============================================
INITIAL_SALON_SETTINGS = {
    # Основная информация
    "name": "M.Le Diamant Beauty Lounge",
    "name_ar": "صالون M.Le Diamant للتجميل",
    
    # Адреса
    "address": "Shop 13, Amwaj 3 Plaza Level, Jumeirah Beach Residence, Dubai",
    "address_ar": "المحل 13، مستوى أمواج 3 بلازا، جميرا بيتش ريزيدنس، دبي",
    "google_maps": "https://maps.app.goo.gl/r84DsemFhptY8RuC7",
    
    # Часы работы
    "hours": "Daily 10:30 - 21:00",
    "hours_ru": "Ежедневно 10:30 - 21:00",
    "hours_ar": "يوميًا 10:30 - 21:00",
    
    # Контакты
    "booking_url": "https://n1314037.alteg.io",
    "phone": "+971 XX XXX XXXX",
    "email": "info@mlediamant.com",
    "instagram": "@mlediamant",
    "whatsapp": "+971 XX XXX XXXX",
    
    # Имя бота
    "bot_name": "Diamant",
    "bot_name_en": "Diamant",
    "bot_name_ar": "الماس",
    
    # Локация
    "city": "Dubai",
    "country": "UAE",
    "timezone": "Asia/Dubai",
    "currency": "AED"
}

# ============================================
# НАСТРОЙКИ БОТА (Начальные значения)
# ============================================
INITIAL_BOT_SETTINGS = {
    # Личность бота
    "bot_name": "M.Le Diamant Assistant",
    "personality_traits": "Обаятельная, уверенная, харизматичная",
    
    # Приветствия
    "greeting_message": "Привет! 😊 Добро пожаловать в M.Le Diamant! Расскажу об услугах или помогу записаться онлайн?",
    "farewell_message": "Спасибо за интерес к M.Le Diamant! До встречи в салоне! ✨",
    
    # Стратегия ценообразования
    "price_explanation": "Мы в премиум-сегменте 💎",
    "price_response_template": "{SERVICE} - {PRICE} {CURRENCY}. Это включает {BENEFITS}!",
    "premium_justification": "Да, мы в премиум-сегменте 💎 Зато используем Olaplex, мастера с международными сертификатами, и клиентки возвращаются годами!",
    
    # Сообщения о записи
    "booking_redirect_message": "Я AI-ассистент и не могу записать вас напрямую, но это легко сделать онлайн! 🎯\n\n📱 Запишитесь за 2 минуты: {BOOKING_URL}\n\nТам вы выберете удобное время, мастера и услугу. Очень просто!",
    
    # Психологические триггеры
    "fomo_messages": "Кстати, на эту неделю уже мало свободных окон...",
    "upsell_techniques": "Многие клиенты берут брови + ресницы со скидкой!",
    
    # Стиль общения
    "communication_style": "Дружелюбный, экспертный, вдохновляющий",
    "max_message_length": 4,  # количество предложений
    "emoji_usage": "Умеренное (2-3 на сообщение)",
    "languages_supported": "ru,en,ar",
    
    # Обработка возражений
    "objection_handling": "\"Дорого\" → Подчеркни качество и долговременность результата",
    "negative_handling": "При жалобе: извинись искренне, предложи решение, переведи на менеджера",
    
    # Правила безопасности
    "safety_guidelines": "Не разглашай личную информацию. При агрессии: оставайся спокойной, не провоцируй.",
    
    # Примеры хороших ответов
    "example_good_responses": """✅ ХОРОШО: "Gelish маникюр - 130 AED 💅 Это японский гель-лак, который держится 3 недели без сколов!"
❌ ПЛОХО: "Маникюр 130 AED" (слишком сухо)""",
    
    # Алгоритм действий
    "algorithm_actions": """ЭТАП 1: Поприветствуй тепло
ЭТАП 2: Узнай потребность
ЭТАП 3: Предложи услугу с преимуществами
ЭТАП 4: Направь на запись""",
    
    # Локация и сезонность
    "location_features": "JBR - престижный район Dubai Marina с видом на пляж",
    "seasonality": "Лето: indoor процедуры популярнее. Зима: сезон свадеб - упор на макияж.",
    
    # Критические ситуации
    "emergency_situations": "При запросе медицинских советов → \"Обратитесь к врачу\"",
    
    # Метрики успеха
    "success_metrics": "✅ Клиент перешел на запись\n✅ Клиент задал уточняющий вопрос\n✅ Клиент поблагодарил"
}


def init_salon_settings_table():
    """Создать таблицу salon_settings и заполнить начальными данными"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    log_info("📦 Создание/проверка таблицы salon_settings...", "init")
    
    # Создаем таблицу если её нет
    c.execute('''CREATE TABLE IF NOT EXISTS salon_settings
                 (id INTEGER PRIMARY KEY,
                  name TEXT NOT NULL,
                  name_ar TEXT,
                  address TEXT,
                  address_ar TEXT,
                  google_maps TEXT,
                  hours TEXT,
                  hours_ru TEXT,
                  hours_ar TEXT,
                  booking_url TEXT,
                  phone TEXT,
                  email TEXT,
                  instagram TEXT,
                  whatsapp TEXT,
                  bot_name TEXT,
                  bot_name_en TEXT,
                  bot_name_ar TEXT,
                  city TEXT,
                  country TEXT,
                  timezone TEXT,
                  currency TEXT DEFAULT 'AED',
                  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)''')
    
    # ✅ КРИТИЧЕСКОЕ ИЗМЕНЕНИЕ: Проверяем ДАННЫЕ, а не просто существование таблицы
    c.execute("SELECT COUNT(*) FROM salon_settings")
    count = c.fetchone()[0]
    
    if count == 0:
        log_info("➕ Заполнение начальными значениями salon_settings...", "init")
        
        c.execute("""INSERT INTO salon_settings 
                    (name, name_ar, address, address_ar, google_maps, 
                     hours, hours_ru, hours_ar, booking_url, phone, 
                     email, instagram, whatsapp,
                     bot_name, bot_name_en, bot_name_ar, 
                     city, country, timezone, currency)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                  (INITIAL_SALON_SETTINGS['name'],
                   INITIAL_SALON_SETTINGS['name_ar'],
                   INITIAL_SALON_SETTINGS['address'],
                   INITIAL_SALON_SETTINGS['address_ar'],
                   INITIAL_SALON_SETTINGS['google_maps'],
                   INITIAL_SALON_SETTINGS['hours'],
                   INITIAL_SALON_SETTINGS['hours_ru'],
                   INITIAL_SALON_SETTINGS['hours_ar'],
                   INITIAL_SALON_SETTINGS['booking_url'],
                   INITIAL_SALON_SETTINGS['phone'],
                   INITIAL_SALON_SETTINGS['email'],
                   INITIAL_SALON_SETTINGS['instagram'],
                   INITIAL_SALON_SETTINGS['whatsapp'],
                   INITIAL_SALON_SETTINGS['bot_name'],
                   INITIAL_SALON_SETTINGS['bot_name_en'],
                   INITIAL_SALON_SETTINGS['bot_name_ar'],
                   INITIAL_SALON_SETTINGS['city'],
                   INITIAL_SALON_SETTINGS['country'],
                   INITIAL_SALON_SETTINGS['timezone'],
                   INITIAL_SALON_SETTINGS['currency']))
        
        log_info("✅ salon_settings заполнена начальными данными!", "init")
    else:
        log_info(f"ℹ️ salon_settings уже содержит {count} записей, пропускаю...", "init")
    
    conn.commit()
    conn.close()


def init_bot_settings_table():
    """Создать таблицу bot_settings и заполнить начальными данными"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    log_info("📦 Создание/проверка таблицы bot_settings...", "init")
    
    # Создаем таблицу если её нет
    c.execute('''CREATE TABLE IF NOT EXISTS bot_settings
                 (id INTEGER PRIMARY KEY,
                  bot_name TEXT,
                  personality_traits TEXT,
                  greeting_message TEXT,
                  farewell_message TEXT,
                  price_explanation TEXT,
                  price_response_template TEXT,
                  premium_justification TEXT,
                  booking_redirect_message TEXT,
                  fomo_messages TEXT,
                  upsell_techniques TEXT,
                  communication_style TEXT,
                  max_message_length INTEGER,
                  emoji_usage TEXT,
                  languages_supported TEXT,
                  objection_handling TEXT,
                  negative_handling TEXT,
                  safety_guidelines TEXT,
                  example_good_responses TEXT,
                  algorithm_actions TEXT,
                  location_features TEXT,
                  seasonality TEXT,
                  emergency_situations TEXT,
                  success_metrics TEXT,
                  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)''')
    
    # ✅ КРИТИЧЕСКОЕ ИЗМЕНЕНИЕ: Проверяем ДАННЫЕ
    c.execute("SELECT COUNT(*) FROM bot_settings")
    count = c.fetchone()[0]
    
    if count == 0:
        log_info("➕ Заполнение начальными значениями bot_settings...", "init")
        
        c.execute("""INSERT INTO bot_settings
                    (bot_name, personality_traits, greeting_message, farewell_message,
                     price_explanation, price_response_template, premium_justification,
                     booking_redirect_message, fomo_messages, upsell_techniques,
                     communication_style, max_message_length, emoji_usage, languages_supported,
                     objection_handling, negative_handling, safety_guidelines,
                     example_good_responses, algorithm_actions, location_features,
                     seasonality, emergency_situations, success_metrics)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                  (INITIAL_BOT_SETTINGS['bot_name'],
                   INITIAL_BOT_SETTINGS['personality_traits'],
                   INITIAL_BOT_SETTINGS['greeting_message'],
                   INITIAL_BOT_SETTINGS['farewell_message'],
                   INITIAL_BOT_SETTINGS['price_explanation'],
                   INITIAL_BOT_SETTINGS['price_response_template'],
                   INITIAL_BOT_SETTINGS['premium_justification'],
                   INITIAL_BOT_SETTINGS['booking_redirect_message'],
                   INITIAL_BOT_SETTINGS['fomo_messages'],
                   INITIAL_BOT_SETTINGS['upsell_techniques'],
                   INITIAL_BOT_SETTINGS['communication_style'],
                   INITIAL_BOT_SETTINGS['max_message_length'],
                   INITIAL_BOT_SETTINGS['emoji_usage'],
                   INITIAL_BOT_SETTINGS['languages_supported'],
                   INITIAL_BOT_SETTINGS['objection_handling'],
                   INITIAL_BOT_SETTINGS['negative_handling'],
                   INITIAL_BOT_SETTINGS['safety_guidelines'],
                   INITIAL_BOT_SETTINGS['example_good_responses'],
                   INITIAL_BOT_SETTINGS['algorithm_actions'],
                   INITIAL_BOT_SETTINGS['location_features'],
                   INITIAL_BOT_SETTINGS['seasonality'],
                   INITIAL_BOT_SETTINGS['emergency_situations'],
                   INITIAL_BOT_SETTINGS['success_metrics']))
        
        log_info("✅ bot_settings заполнена начальными данными!", "init")
    else:
        log_info(f"ℹ️ bot_settings уже содержит {count} записей, пропускаю...", "init")
    
    conn.commit()
    conn.close()


def verify_data():
    """Проверить что данные действительно есть"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    log_info("🔍 Проверка наличия данных...", "verify")
    
    # Проверка salon_settings
    c.execute("SELECT COUNT(*), name FROM salon_settings")
    salon_result = c.fetchone()
    if salon_result[0] > 0:
        log_info(f"✅ salon_settings: {salon_result[0]} записей. Название салона: {salon_result[1]}", "verify")
    else:
        log_error("❌ salon_settings ПУСТАЯ!", "verify")
    
    # Проверка bot_settings
    c.execute("SELECT COUNT(*), bot_name FROM bot_settings")
    bot_result = c.fetchone()
    if bot_result[0] > 0:
        log_info(f"✅ bot_settings: {bot_result[0]} записей. Имя бота: {bot_result[1]}", "verify")
    else:
        log_error("❌ bot_settings ПУСТАЯ!", "verify")
    
    conn.close()


def main():
    """Главная функция инициализации"""
    print("=" * 70)
    print("🚀 ИНИЦИАЛИЗАЦИЯ НАСТРОЕК САЛОНА И БОТА")
    print("=" * 70)
    
    try:
        # Создаем и заполняем таблицы
        init_salon_settings_table()
        init_bot_settings_table()
        
        # Проверяем что данные действительно записались
        verify_data()
        
        print("\n" + "=" * 70)
        print("✅ ВСЕ НАСТРОЙКИ УСПЕШНО ИНИЦИАЛИЗИРОВАНЫ!")
        print("=" * 70)
        print("\n📋 Следующие шаги:")
        print("1. Запустите основное приложение: uvicorn main:app --reload")
        print("2. Перейдите в админку → Настройки для редактирования")
        print("3. Все изменения будут храниться в БД")
        print("\n⚠️ ВАЖНО: Этот скрипт можно запускать повторно безопасно")
        print("=" * 70 + "\n")
        
    except Exception as e:
        log_error(f"❌ Ошибка инициализации: {e}", "init", exc_info=True)
        print("\n❌ ОШИБКА! Смотрите логи выше.")
        return 1
    
    return 0


if __name__ == "__main__":
    exit(main())