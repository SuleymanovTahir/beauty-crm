"""
Инициализация базы данных
"""
import sqlite3
from datetime import datetime
import hashlib

from config import DATABASE_NAME
from logger import log_info, log_warning




def init_database():
    """Создать базу данных и все таблицы"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    # Таблица клиентов
    c.execute('''CREATE TABLE IF NOT EXISTS clients
             (instagram_id TEXT PRIMARY KEY,
              username TEXT,
              phone TEXT,
              name TEXT,
              first_contact TEXT,
              last_contact TEXT,
              total_messages INTEGER DEFAULT 0,
              labels TEXT,
              status TEXT DEFAULT 'new',
              lifetime_value REAL DEFAULT 0,
              profile_pic TEXT,
              notes TEXT,
              is_pinned INTEGER DEFAULT 0,
              detected_language TEXT DEFAULT 'ru')''')

    # Таблица настроек бота
    c.execute('''CREATE TABLE IF NOT EXISTS bot_settings (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        bot_name TEXT NOT NULL,
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
        max_message_length INTEGER DEFAULT 4,
        emoji_usage TEXT,
        languages_supported TEXT DEFAULT 'ru,en,ar',
        objection_handling TEXT,
        negative_handling TEXT,
        safety_guidelines TEXT,
        example_good_responses TEXT,
        algorithm_actions TEXT,
        location_features TEXT,
        seasonality TEXT,
        emergency_situations TEXT,
        success_metrics TEXT,
        objection_expensive TEXT,
        objection_think_about_it TEXT,
        objection_no_time TEXT,
        objection_pain TEXT,
        objection_result_doubt TEXT,
        objection_cheaper_elsewhere TEXT,
        objection_too_far TEXT,
        objection_consult_husband TEXT,
        objection_first_time TEXT,
        objection_not_happy TEXT,
        emotional_triggers TEXT,
        social_proof_phrases TEXT,
        personalization_rules TEXT,
        example_dialogues TEXT,
        emotional_responses TEXT,
        anti_patterns TEXT,
        voice_message_response TEXT,
        contextual_rules TEXT,
        updated_at TEXT
    )''')

    # Таблица настроек салона
    c.execute('''CREATE TABLE IF NOT EXISTS salon_settings (
        id INTEGER PRIMARY KEY CHECK (id = 1),
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
        updated_at TEXT
    )''')

    # Таблица истории чата
    c.execute('''CREATE TABLE IF NOT EXISTS chat_history
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  instagram_id TEXT,
                  message TEXT,
                  sender TEXT,
                  timestamp TEXT,
                  language TEXT,
                  is_read INTEGER DEFAULT 0,
                  message_type TEXT DEFAULT 'text')''')

    # Таблица записей
    c.execute('''CREATE TABLE IF NOT EXISTS bookings
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  instagram_id TEXT,
                  service_name TEXT,
                  datetime TEXT,
                  phone TEXT,
                  name TEXT,
                  status TEXT,
                  created_at TEXT,
                  completed_at TEXT,
                  revenue REAL DEFAULT 0,
                  notes TEXT,
                  special_package_id INTEGER)''')

    # Таблица временных данных записи
    c.execute('''CREATE TABLE IF NOT EXISTS booking_temp
                 (instagram_id TEXT PRIMARY KEY,
                  service_name TEXT,
                  date TEXT,
                  time TEXT,
                  phone TEXT,
                  name TEXT,
                  step TEXT)''')

    # Таблица взаимодействий
    c.execute('''CREATE TABLE IF NOT EXISTS client_interactions
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  instagram_id TEXT,
                  interaction_type TEXT,
                  timestamp TEXT,
                  metadata TEXT)''')

    # Таблица пользователей
    c.execute('''CREATE TABLE IF NOT EXISTS users
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  username TEXT UNIQUE NOT NULL,
                  password_hash TEXT NOT NULL,
                  full_name TEXT,
                  email TEXT,
                  role TEXT DEFAULT 'employee',
                  created_at TEXT,
                  last_login TEXT,
                  is_active INTEGER DEFAULT 1)''')

    # Таблица сессий
    c.execute('''CREATE TABLE IF NOT EXISTS sessions
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  user_id INTEGER,
                  session_token TEXT UNIQUE,
                  created_at TEXT,
                  expires_at TEXT,
                  FOREIGN KEY (user_id) REFERENCES users(id))''')

    # Таблица логов активности
    c.execute('''CREATE TABLE IF NOT EXISTS activity_log
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  user_id INTEGER,
                  action TEXT,
                  entity_type TEXT,
                  entity_id TEXT,
                  details TEXT,
                  timestamp TEXT,
                  FOREIGN KEY (user_id) REFERENCES users(id))''')

    # Таблица кастомных статусов
    c.execute('''CREATE TABLE IF NOT EXISTS custom_statuses
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  status_key TEXT UNIQUE NOT NULL,
                  status_label TEXT NOT NULL,
                  status_color TEXT NOT NULL,
                  status_icon TEXT NOT NULL,
                  created_at TEXT,
                  created_by INTEGER,
                  FOREIGN KEY (created_by) REFERENCES users(id))''')

    # Таблица услуг
    c.execute('''CREATE TABLE IF NOT EXISTS services
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  service_key TEXT UNIQUE NOT NULL,
                  name TEXT NOT NULL,
                  name_ru TEXT,
                  name_ar TEXT,
                  price REAL NOT NULL,
                  min_price REAL,
                  max_price REAL,
                  currency TEXT DEFAULT 'AED',
                  category TEXT NOT NULL,
                  description TEXT,
                  description_ru TEXT,
                  description_ar TEXT,
                  benefits TEXT,
                  is_active INTEGER DEFAULT 1,
                  duration TEXT,
                  created_at TEXT,
                  updated_at TEXT)''')

    # Таблица уведомлений
    c.execute('''CREATE TABLE IF NOT EXISTS notification_settings (
        id INTEGER PRIMARY KEY,
        user_id INTEGER NOT NULL,
        email_notifications BOOLEAN DEFAULT 1,
        sms_notifications BOOLEAN DEFAULT 0,
        booking_notifications BOOLEAN DEFAULT 1,
        birthday_reminders BOOLEAN DEFAULT 1,
        birthday_days_advance INTEGER DEFAULT 7,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )''')
    
    # Таблица специальных пакетов
    c.execute('''CREATE TABLE IF NOT EXISTS special_packages
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  name TEXT NOT NULL,
                  name_ru TEXT NOT NULL,
                  description TEXT,
                  description_ru TEXT,
                  original_price REAL NOT NULL,
                  special_price REAL NOT NULL,
                  currency TEXT DEFAULT 'AED',
                  discount_percent INTEGER,
                  services_included TEXT,
                  promo_code TEXT UNIQUE,
                  keywords TEXT NOT NULL,
                  valid_from TEXT NOT NULL,
                  valid_until TEXT NOT NULL,
                  is_active INTEGER DEFAULT 1,
                  usage_count INTEGER DEFAULT 0,
                  max_usage INTEGER,
                  created_at TEXT,
                  updated_at TEXT)''')
    
    # Таблица кастомных ролей
    c.execute('''CREATE TABLE IF NOT EXISTS custom_roles
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  role_key TEXT UNIQUE NOT NULL,
                  role_name TEXT NOT NULL,
                  role_description TEXT,
                  created_at TEXT,
                  created_by INTEGER,
                  FOREIGN KEY (created_by) REFERENCES users(id))''')
    
    # Таблица прав доступа
    c.execute('''CREATE TABLE IF NOT EXISTS role_permissions
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  role_key TEXT NOT NULL,
                  permission_key TEXT NOT NULL,
                  can_view INTEGER DEFAULT 0,
                  can_create INTEGER DEFAULT 0,
                  can_edit INTEGER DEFAULT 0,
                  can_delete INTEGER DEFAULT 0,
                  UNIQUE(role_key, permission_key))''')
    
    # Создать дефолтного администратора если его нет
    c.execute("SELECT COUNT(*) FROM users WHERE username = 'admin'")
    if c.fetchone()[0] == 0:
        password_hash = hashlib.sha256('admin123'.encode()).hexdigest()
        now = datetime.now().isoformat()
        c.execute("""INSERT INTO users 
                     (username, password_hash, full_name, role, created_at)
                     VALUES (?, ?, ?, ?, ?)""",
                  ('admin', password_hash, 'Администратор', 'admin', now))
        print("✅ Создан дефолтный пользователь: admin / admin123")
    
    # Создать дефолтные настройки салона
    c.execute("SELECT COUNT(*) FROM salon_settings")
    if c.fetchone()[0] == 0:
        log_info("📝 Создание дефолтных настроек салона...", "database")
        now = datetime.now().isoformat()
        c.execute("""INSERT INTO salon_settings 
                     (id, name, address, google_maps, hours, hours_ru, hours_ar,
                      booking_url, phone, bot_name, bot_name_en, bot_name_ar,
                      city, country, timezone, currency, updated_at)
                     VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                  ("M.Le Diamant Beauty Lounge",
                   "Shop 13, Amwaj 3 Plaza Level, JBR, Dubai",
                   "https://maps.app.goo.gl/Puh5X1bNEjWPiToz6",
                   "Daily 10:30 - 21:00",
                   "Ежедневно 10:30 - 21:00",
                   "يوميًا 10:30 - 21:00",
                   "https://n1234567.yclients.com",
                   "+971 XX XXX XXXX",
                   "M.Le Diamant Assistant",
                   "M.Le Diamant Assistant",
                   "مساعد M.Le Diamant",
                   "Dubai",
                   "UAE",
                   "Asia/Dubai",
                   "AED",
                   now))
        log_info("✅ Дефолтные настройки салона созданы", "database")
    
    # Создать дефолтные настройки бота
    c.execute("SELECT COUNT(*) FROM bot_settings")
    if c.fetchone()[0] == 0:
        log_info("📝 Создание дефолтных настроек бота...", "database")
        now = datetime.now().isoformat()
        c.execute("""INSERT INTO bot_settings 
                     (id, bot_name, personality_traits, greeting_message, farewell_message,
                      price_explanation, communication_style, max_message_length, 
                      emoji_usage, languages_supported, booking_redirect_message,
                      voice_message_response, updated_at)
                     VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                  ("M.Le Diamant Assistant",
                   "Обаятельная, уверенная, харизматичная, экспертная",
                   "Привет! 😊 Добро пожаловать в M.Le Diamant!",
                   "Спасибо за визит! 💖",
                   "Мы в премиум-сегменте 💎",
                   "Дружелюбный, экспертный, вдохновляющий",
                   4,
                   "Умеренное (2-3 на сообщение)",
                   "ru,en,ar",
                   "Я AI-ассистент, запись онлайн за 2 минуты!\nВыбирайте мастера и время здесь: {BOOKING_URL}",
                   "Извините, я AI-помощник и не могу прослушивать голосовые 😊\nПожалуйста, напишите текстом!",
                   now))
        log_info("✅ Дефолтные настройки бота созданы", "database")
    
    conn.commit()
    conn.close()
    print("✅ База данных инициализирована")