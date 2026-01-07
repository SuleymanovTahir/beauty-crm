"""
Инициализация базы данных
"""
from db.connection import get_db_connection
from datetime import datetime
import hashlib

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


from utils.logger import log_info, log_warning

def init_database():
    """Создать базу данных и все таблицы"""
    conn = get_db_connection()
    c = conn.cursor()
    
    # PostgreSQL не использует PRAGMA, foreign keys включены по умолчанию
    
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
              is_pinned BOOLEAN DEFAULT FALSE,
              detected_language TEXT DEFAULT 'ru',
              gender TEXT,
              card_number TEXT,
              discount REAL DEFAULT 0,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              total_visits BOOLEAN DEFAULT FALSE,
              additional_phone TEXT,
              newsletter_agreed BOOLEAN DEFAULT FALSE,
              personal_data_agreed BOOLEAN DEFAULT FALSE,
              total_spend REAL DEFAULT 0,
              paid_amount REAL DEFAULT 0,
              birthday TEXT,
              email TEXT,
              password_hash TEXT,
              last_login TEXT,
              is_verified BOOLEAN DEFAULT FALSE,
              preferred_messenger TEXT,
              language TEXT DEFAULT 'ru',
              bot_mode TEXT DEFAULT 'assistant',
              temperature TEXT DEFAULT 'warm')''')

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
        response_style TEXT DEFAULT 'adaptive',
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
        auto_cancel_discounts TEXT DEFAULT 'Не предлагай скидки и специальные предложения автоматически. Предлагай их только если клиент явно интересуется скидками.',
        comment_reply_settings TEXT DEFAULT '{}',
        manager_consultation_enabled BOOLEAN DEFAULT TRUE,
        manager_consultation_prompt TEXT,
        booking_data_collection TEXT,
        booking_time_logic TEXT,
        pre_booking_data_collection TEXT,
        bot_mode TEXT DEFAULT 'sales',
        temperature REAL DEFAULT 0.7,
        updated_at TEXT
    )''')

    # Миграция: добавить отсутствующие колонки в bot_settings
    try:
        c.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='bot_settings'
        """)
        bot_columns = [row[0] for row in c.fetchall()]
    except:
        bot_columns = []

    # Список колонок которые могут отсутствовать в старой схеме
    migrations_needed = {
        'max_message_length': 'INTEGER DEFAULT 4',
        'voice_message_response': 'TEXT',
        'contextual_rules': 'TEXT',
        'auto_cancel_discounts': "TEXT DEFAULT 'Не предлагай скидки и специальные предложения автоматически. Предлагай их только если клиент явно интересуется скидками.'",
        'comment_reply_settings': "TEXT DEFAULT '{}'",
        'manager_consultation_enabled': 'INTEGER DEFAULT 1',
        'manager_consultation_prompt': 'TEXT',
        'booking_data_collection': 'TEXT',
        'booking_time_logic': 'TEXT',
        'pre_booking_data_collection': 'TEXT',
        'bot_mode': "TEXT DEFAULT 'sales'",
        'temperature': 'REAL DEFAULT 0.7',
        'response_style': "TEXT DEFAULT 'adaptive'"
    }

    for column_name, column_type in migrations_needed.items():
        if column_name not in bot_columns:
            c.execute(f"ALTER TABLE bot_settings ADD COLUMN {column_name} {column_type}")

    # Таблица настроек салона
    c.execute('''CREATE TABLE IF NOT EXISTS salon_settings (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        name TEXT NOT NULL,
        name_ar TEXT,
        address TEXT,
        address_ar TEXT,
        google_maps TEXT,
        google_place_id TEXT,
        google_api_key TEXT,
        hours TEXT,
        hours_ru TEXT,
        hours_ar TEXT,
        hours_weekdays TEXT DEFAULT '10:30 - 21:00',
        hours_weekends TEXT DEFAULT '10:30 - 21:00',
        lunch_start TEXT DEFAULT '13:00',
        lunch_end TEXT DEFAULT '14:00',
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
        timezone_offset TEXT DEFAULT 'UTC+4',
        currency TEXT DEFAULT 'AED',
        birthday_discount TEXT DEFAULT '15%',
        payment_methods TEXT DEFAULT 'Наличные, карта',
        prepayment_required BOOLEAN DEFAULT FALSE,
        parking_info TEXT,
        wifi_available BOOLEAN DEFAULT TRUE,
        latitude REAL,
        longitude REAL,
        logo_url TEXT,
        base_url TEXT,
        google_analytics_id TEXT,
        facebook_pixel_id TEXT,
        promo_end_date TEXT,
        updated_at TEXT,
        main_location TEXT,
        main_location_ru TEXT,
        main_location_en TEXT,
        main_location_ar TEXT,
        points_expiration_days INTEGER DEFAULT 365,
        feature_flags TEXT DEFAULT '{}'
    )''')

    # Миграция: добавить bot_name_en и bot_name_ar если их нет
    try:

        c.execute("""

            SELECT column_name 

            FROM information_schema.columns 

            WHERE table_name='salon_settings'

        """)

        columns = [row[0] for row in c.fetchall()]

    except:

        columns = []
    if 'bot_name_en' not in columns:
        c.execute("ALTER TABLE salon_settings ADD COLUMN bot_name_en TEXT")
    if 'bot_name_ar' not in columns:
        c.execute("ALTER TABLE salon_settings ADD COLUMN bot_name_ar TEXT")
    
    # Миграция: добавить универсальные настройки
    if 'timezone_offset' not in columns:
        c.execute("ALTER TABLE salon_settings ADD COLUMN timezone_offset TEXT DEFAULT 'UTC+4'")
    if 'birthday_discount' not in columns:
        c.execute("ALTER TABLE salon_settings ADD COLUMN birthday_discount TEXT DEFAULT '15%'")
        c.execute("ALTER TABLE salon_settings ADD COLUMN hours_weekdays TEXT DEFAULT '10:30 - 21:00'")
    if 'hours_weekends' not in columns:
        c.execute("ALTER TABLE salon_settings ADD COLUMN hours_weekends TEXT DEFAULT '10:30 - 21:00'")
    
    # Миграция: добавить main_location
    location_migrations = {
        'main_location': 'TEXT',
        'main_location_ru': 'TEXT',
        'main_location_en': 'TEXT',
        'main_location_ar': 'TEXT'
    }
    for col, col_type in location_migrations.items():
        if col not in columns:
            c.execute(f"ALTER TABLE salon_settings ADD COLUMN {col} {col_type}")

    # Миграция: Feature Management & Cashback
    feature_migrations = {
        'points_expiration_days': 'INTEGER DEFAULT 365',
        'feature_flags': "TEXT DEFAULT '{}'"
    }
    for col, col_type in feature_migrations.items():
        if col not in columns:
            c.execute(f"ALTER TABLE salon_settings ADD COLUMN {col} {col_type}")

    # Таблица истории чата
    c.execute('''CREATE TABLE IF NOT EXISTS chat_history
                 (id SERIAL PRIMARY KEY,
                  instagram_id TEXT,
                  message TEXT,
                  sender TEXT,
                  timestamp TEXT,
                  language TEXT,
                  is_read BOOLEAN DEFAULT FALSE,
                  message_type TEXT DEFAULT 'text')''')

    # Таблица записей
    c.execute('''CREATE TABLE IF NOT EXISTS bookings
                 (id SERIAL PRIMARY KEY,
                  instagram_id TEXT,
                  service_name TEXT,
                  master TEXT,
                  datetime TEXT,
                  phone TEXT,
                  name TEXT,
                  status TEXT,
                  created_at TEXT,
                  completed_at TEXT,
                  revenue REAL DEFAULT 0,
                  notes TEXT,
                  special_package_id INTEGER,
                  source TEXT DEFAULT 'manual')''')

    # Таблица настроек напоминаний о записях
    c.execute('''CREATE TABLE IF NOT EXISTS booking_reminder_settings
                 (id SERIAL PRIMARY KEY,
                  name TEXT NOT NULL,
                  days_before INTEGER DEFAULT 0,
                  hours_before INTEGER DEFAULT 0,
                  notification_type TEXT DEFAULT 'email',
                  is_enabled BOOLEAN DEFAULT TRUE,
                  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)''')
    
    # Таблица отправленных напоминаний
    c.execute('''CREATE TABLE IF NOT EXISTS booking_reminders_sent
                 (id SERIAL PRIMARY KEY,
                  booking_id INTEGER NOT NULL,
                  reminder_setting_id INTEGER NOT NULL,
                  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                  status TEXT DEFAULT 'sent',
                  error_message TEXT,
                  UNIQUE(booking_id, reminder_setting_id),
                  FOREIGN KEY (booking_id) REFERENCES bookings(id),
                  FOREIGN KEY (reminder_setting_id) REFERENCES booking_reminder_settings(id))''')
    
    # Заполняем дефолтные настройки напоминаний если пусто
    c.execute("SELECT COUNT(*) FROM booking_reminder_settings")
    if c.fetchone()[0] == 0:
        default_reminders = [
            {
                'name': 'Напоминание за 1 день',
                'days_before': 1,
                'hours_before': 0,
                'notification_type': 'whatsapp',
                'is_enabled': True
            },
            {
                'name': 'Напоминание за 3 часа',
                'days_before': 0,
                'hours_before': 3,
                'notification_type': 'whatsapp',
                'is_enabled': True
            },
            {
                'name': 'Напоминание за 1 час',
                'days_before': 0,
                'hours_before': 1,
                'notification_type': 'whatsapp',
                'is_enabled': True
            }
        ]
        
        for reminder in default_reminders:
            c.execute("""
                INSERT INTO booking_reminder_settings (name, days_before, hours_before, notification_type, is_enabled)
                VALUES (%s, %s, %s, %s, %s)
            """, (reminder['name'], reminder['days_before'], reminder['hours_before'], 
                  reminder['notification_type'], reminder['is_enabled']))
        
        log_info(f"✅ Создано {len(default_reminders)} дефолтных настроек напоминаний", "db")

    # Миграция: добавить master в bookings
    try:
        c.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='bookings'
        """)
        booking_columns = [row[0] for row in c.fetchall()]
    except:
        booking_columns = []
    if 'master' not in booking_columns:
        c.execute("ALTER TABLE bookings ADD COLUMN master TEXT")

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
                 (id SERIAL PRIMARY KEY,
                  instagram_id TEXT,
                  interaction_type TEXT,
                  timestamp TEXT,
                  metadata TEXT)''')

    # ✅ Таблица аналитики бота (трекинг эффективности)
    c.execute('''CREATE TABLE IF NOT EXISTS bot_analytics
                 (id SERIAL PRIMARY KEY,
                  instagram_id TEXT NOT NULL,
                  session_started TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                  session_ended TIMESTAMP,
                  messages_count INTEGER DEFAULT 0,
                  outcome TEXT DEFAULT 'in_progress',
                  escalated_to_manager BOOLEAN DEFAULT FALSE,
                  booking_created BOOLEAN DEFAULT FALSE,
                  booking_id INTEGER,
                  cancellation_requested BOOLEAN DEFAULT FALSE,
                  language_detected TEXT,
                  FOREIGN KEY (instagram_id) REFERENCES clients(instagram_id))''')

    # ✅ Таблица рефералов (кто кого привёл)
    c.execute('''CREATE TABLE IF NOT EXISTS client_referrals
                 (id SERIAL PRIMARY KEY,
                  referrer_id TEXT NOT NULL,
                  referred_id TEXT NOT NULL,
                  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                  bonus_given BOOLEAN DEFAULT FALSE,
                  FOREIGN KEY (referrer_id) REFERENCES clients(instagram_id),
                  FOREIGN KEY (referred_id) REFERENCES clients(instagram_id))''')

    # Таблица истории переписки
    c.execute('''CREATE TABLE IF NOT EXISTS conversations
                 (id SERIAL PRIMARY KEY,
                  client_id TEXT,
                  role TEXT,
                  content TEXT,
                  timestamp TEXT,
                  FOREIGN KEY (client_id) REFERENCES clients(instagram_id))''')

    # Таблица должностей (Positions)
    c.execute('''CREATE TABLE IF NOT EXISTS positions
                 (id SERIAL PRIMARY KEY,
                  name TEXT NOT NULL,
                  name_en TEXT,
                  name_ru TEXT,
                  name_ar TEXT,
                  name_fr TEXT,
                  name_de TEXT,
                  name_es TEXT,
                  name_hi TEXT,
                  name_zh TEXT,
                  name_pt TEXT,
                  description TEXT,
                  sort_order INTEGER DEFAULT 0,
                  is_active BOOLEAN DEFAULT TRUE,
                  created_at TEXT,
                  updated_at TEXT)''')
    
    # Миграция: добавить отсутствующие колонки в positions
    try:
        c.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='positions'
        """)
        position_columns = [row[0] for row in c.fetchall()]
    except:
        position_columns = []
    pos_migrations = {
        'name_en': 'TEXT',
        'name_ru': 'TEXT',
        'name_ar': 'TEXT',
        'name_fr': 'TEXT',
        'name_de': 'TEXT',
        'name_es': 'TEXT',
        'name_hi': 'TEXT',
        'name_zh': 'TEXT',
        'name_pt': 'TEXT',
        'sort_order': 'INTEGER DEFAULT 0',
        'is_active': 'INTEGER DEFAULT 1',
        'updated_at': 'TEXT'
    }
    for col, col_type in pos_migrations.items():
        if col not in position_columns:
            c.execute(f"ALTER TABLE positions ADD COLUMN {col} {col_type}")

    # Таблица пользователей
    c.execute('''CREATE TABLE IF NOT EXISTS users
                 (id SERIAL PRIMARY KEY,
                  username TEXT UNIQUE NOT NULL,
                  password_hash TEXT NOT NULL,
                  full_name TEXT,
                  email TEXT,
                  role TEXT DEFAULT 'employee',
                  created_at TEXT,
                  last_login TEXT,
                  is_active BOOLEAN DEFAULT TRUE,
                  position TEXT,
                  photo TEXT,
                  photo_url TEXT,
                  bio TEXT,
                  experience TEXT,
                  specialization TEXT,
                  years_of_experience INTEGER,
                  certificates TEXT,
                  is_service_provider BOOLEAN DEFAULT FALSE,
                  base_salary REAL DEFAULT 0,
                  commission_rate REAL DEFAULT 0)''')

    # Миграция: добавить отсутствующие колонки в users
    try:
        c.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='users'
        """)
        user_columns = [row[0] for row in c.fetchall()]
    except:
        user_columns = []

    # Список колонок которые могут отсутствовать в старой схеме
    user_migrations = {
        'position': 'TEXT',
        'position_ru': 'TEXT',
        'position_ar': 'TEXT',
        'position_en': 'TEXT',
        'employee_id': 'INTEGER',
        'birthday': 'TEXT',
        'phone': 'TEXT',
        'full_name_ru': 'TEXT',
        'full_name_en': 'TEXT',
        'full_name_ar': 'TEXT',
        'base_salary': 'REAL DEFAULT 0',
        'commission_rate': 'REAL DEFAULT 0'
    }

    for column_name, column_type in user_migrations.items():
        if column_name not in user_columns:
            try:
                c.execute(f"ALTER TABLE users ADD COLUMN {column_name} {column_type}")
            except Exception as e:
                log_warning(f"⚠️ Could not add column {column_name} to users: {e}", "db")

    # Таблица сессий
    c.execute('''CREATE TABLE IF NOT EXISTS sessions
                 (id SERIAL PRIMARY KEY,
                  user_id INTEGER,
                  session_token TEXT UNIQUE,
                  created_at TEXT,
                  expires_at TEXT,
                  FOREIGN KEY (user_id) REFERENCES users(id))''')

    # Таблица логов активности
    c.execute('''CREATE TABLE IF NOT EXISTS activity_log
                 (id SERIAL PRIMARY KEY,
                  user_id INTEGER,
                  action TEXT,
                  entity_type TEXT,
                  entity_id TEXT,
                  details TEXT,
                  timestamp TEXT,
                  FOREIGN KEY (user_id) REFERENCES users(id))''')

    # Таблица кастомных статусов
    c.execute('''CREATE TABLE IF NOT EXISTS custom_statuses
                 (id SERIAL PRIMARY KEY,
                  status_key TEXT UNIQUE NOT NULL,
                  status_label TEXT NOT NULL,
                  status_color TEXT NOT NULL,
                  status_icon TEXT NOT NULL,
                  created_at TEXT,
                  created_by INTEGER,
                  FOREIGN KEY (created_by) REFERENCES users(id))''')

    # Таблица услуг
    c.execute('''CREATE TABLE IF NOT EXISTS services
                 (id SERIAL PRIMARY KEY,
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
                  is_active BOOLEAN DEFAULT TRUE,
                  duration TEXT,
                  created_at TEXT,
                  updated_at TEXT)''')
    
    # Таблица связи пользователей с услугами
    c.execute('''CREATE TABLE IF NOT EXISTS user_services (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        service_id INTEGER NOT NULL,
        price REAL,
        price_min REAL,
        price_max REAL,
        duration TEXT,
        is_online_booking_enabled BOOLEAN DEFAULT TRUE,
        is_calendar_enabled BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, service_id),
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (service_id) REFERENCES services(id)
    )''')
    
    # DEPRECATED: employees table consolidated into users with is_service_provider flag
    # c.execute('''CREATE TABLE IF NOT EXISTS employees
    #              (id SERIAL PRIMARY KEY,
    #               full_name TEXT NOT NULL,
    #               position TEXT,
    #               experience TEXT,
    #               photo TEXT,
    #               bio TEXT,
    #               phone TEXT,
    #               email TEXT,
    #               instagram TEXT,
    #               is_active BOOLEAN DEFAULT TRUE,
    #               sort_order BOOLEAN DEFAULT FALSE,
    #               created_at TEXT,
    #               updated_at TEXT)''')

    # Таблица уведомлений
    c.execute('''CREATE TABLE IF NOT EXISTS notification_settings (
        id INTEGER PRIMARY KEY,
        user_id INTEGER NOT NULL,
        email_notifications BOOLEAN DEFAULT TRUE,
        sms_notifications BOOLEAN DEFAULT FALSE,
        booking_notifications BOOLEAN DEFAULT TRUE,
        birthday_reminders BOOLEAN DEFAULT TRUE,
        birthday_days_advance INTEGER DEFAULT 7,
        UNIQUE(user_id),
        FOREIGN KEY (user_id) REFERENCES users(id)
    )''')
    
    # Миграция: добавить отсутствующие колонки в notification_settings
    try:

        c.execute("""

            SELECT column_name 

            FROM information_schema.columns 

            WHERE table_name='notification_settings'

        """)

        notif_columns = [row[0] for row in c.fetchall()]

    except:

        notif_columns = []
    notif_migrations = {
        'birthday_reminders': 'BOOLEAN DEFAULT TRUE',
        'birthday_days_advance': 'INTEGER DEFAULT 7',
        'chat_notifications': 'INTEGER DEFAULT 1',
        'daily_report': 'INTEGER DEFAULT 1',
        'report_time': "TEXT DEFAULT '09:00'",
        'telegram_notifications': 'BOOLEAN DEFAULT FALSE',
        'updated_at': 'TEXT DEFAULT CURRENT_TIMESTAMP'
    }
    for col, col_type in notif_migrations.items():
        if col not in notif_columns:
            try:
                c.execute(f"ALTER TABLE notification_settings ADD COLUMN {col} {col_type}")
            except Exception as e:
                log_warning(f"⚠️ Could not add column {col} to notification_settings: {e}", "db")
            
    # Таблица выплат (Payroll History)
    c.execute('''CREATE TABLE IF NOT EXISTS payroll_payments (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER NOT NULL,
        amount REAL NOT NULL,
        currency TEXT DEFAULT 'AED',
        period_start TEXT NOT NULL,
        period_end TEXT NOT NULL,
        status TEXT DEFAULT 'paid',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (employee_id) REFERENCES users(id)
    )''')            
    # ✅ Таблица уведомлений (сарих уведомлений)
    c.execute('''CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        type TEXT DEFAULT 'info',
        is_read BOOLEAN DEFAULT FALSE,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        read_at TEXT,
        action_url TEXT,
        FOREIGN KEY (user_id) REFERENCES users (id)
    )''')
    
    # Миграция: убедиться что таблица notifications правильная
    try:
        c.execute("SELECT data_type FROM information_schema.columns WHERE table_name='notifications' AND column_name='user_id'")
        row = c.fetchone()
        if row and row[0].lower() == 'text':
             # Если user_id TEXT (старая версия), нужно конвертировать или дропнуть (дропнуть проще так как это просто уведомления)
             log_warning("⚠️ Таблица notifications имеет неправильный тип user_id (TEXT). Пересоздание...", "db")
             c.execute("DROP TABLE notifications")
             c.execute('''CREATE TABLE notifications (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                title TEXT NOT NULL,
                message TEXT NOT NULL,
                type TEXT DEFAULT 'info',
                is_read BOOLEAN DEFAULT FALSE,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                read_at TEXT,
                action_url TEXT,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )''')
    except Exception as e:
        log_warning(f"Ошибка проверки notifications: {e}", "db")

    # Миграция: добавить отсутствующие колонки в bot_analytics
    try:
        c.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='bot_analytics'
        """)
        analytics_columns = [row[0] for row in c.fetchall()]
    except:
        analytics_columns = []
        
    ba_migrations = {
        'context': 'TEXT',
        'reminder_sent': 'BOOLEAN DEFAULT FALSE',
        'last_message_at': 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP'
    }
    
    for col, col_type in ba_migrations.items():
        if col not in analytics_columns:
            c.execute(f"ALTER TABLE bot_analytics ADD COLUMN {col} {col_type}")
    
    # Таблица расписания сотрудников
    c.execute('''CREATE TABLE IF NOT EXISTS user_schedule (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        day_of_week INTEGER NOT NULL,
        start_time TEXT,
        end_time TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        UNIQUE(user_id, day_of_week)
    )''')
    
    # Таблица индивидуальных прав пользователей
    c.execute('''CREATE TABLE IF NOT EXISTS user_permissions
                 (id SERIAL PRIMARY KEY,
                  user_id INTEGER NOT NULL,
                  permission_key TEXT NOT NULL,
                  granted BOOLEAN DEFAULT TRUE,
                  granted_by INTEGER,
                  granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                  FOREIGN KEY (user_id) REFERENCES users(id),
                  FOREIGN KEY (granted_by) REFERENCES users(id),
                  UNIQUE(user_id, permission_key))''')

    # Таблица выходных дней сотрудников
    c.execute('''CREATE TABLE IF NOT EXISTS user_time_off (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        reason TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )''')
    
    # Таблица праздников салона
    c.execute('''CREATE TABLE IF NOT EXISTS salon_holidays (
        id SERIAL PRIMARY KEY,
        date DATE UNIQUE NOT NULL,
        name TEXT NOT NULL,
        is_closed BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )''')
    
    # Таблица уровней лояльности
    c.execute('''CREATE TABLE IF NOT EXISTS loyalty_levels (
        id SERIAL PRIMARY KEY,
        level_name TEXT NOT NULL,
        min_points INTEGER NOT NULL,
        discount_percent REAL DEFAULT 0,
        points_multiplier REAL DEFAULT 1.0,
        benefits TEXT,
        icon TEXT,
        color TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )''')
    
    # Заполняем уровни лояльности если пусто
    c.execute("SELECT COUNT(*) FROM loyalty_levels")
    if c.fetchone()[0] == 0:
        loyalty_levels_data = [
            {"name": "bronze", "min_points": 0, "discount_percentage": 0, "points_multiplier": 1.0, "perks": "Базовый уровень", "icon": "🥉", "color": "#CD7F32"},
            {"name": "silver", "min_points": 1000, "discount_percentage": 5, "points_multiplier": 1.1, "perks": "Скидка 5% на услуги", "icon": "🥈", "color": "#C0C0C0"},
            {"name": "gold", "min_points": 5000, "discount_percentage": 10, "points_multiplier": 1.2, "perks": "Скидка 10% на услуги, приоритетная запись", "icon": "🥇", "color": "#FFD700"},
            {"name": "platinum", "min_points": 10000, "discount_percentage": 15, "points_multiplier": 1.5, "perks": "Скидка 15%, личный менеджер, такси", "icon": "💎", "color": "#E5E4E2"}
        ]
        for level in loyalty_levels_data:
            c.execute("""
                INSERT INTO loyalty_levels (level_name, min_points, discount_percent, points_multiplier, benefits, icon, color, is_active, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, TRUE, NOW())
            """, (level["name"], level["min_points"], level["discount_percentage"], level["points_multiplier"], level["perks"], level["icon"], level["color"]))
        log_info(f"✅ Создано {len(loyalty_levels_data)} уровней лояльности", "db")
    
    # Таблица баллов лояльности клиентов
    c.execute('''CREATE TABLE IF NOT EXISTS client_loyalty_points (
        id SERIAL PRIMARY KEY,
        client_id TEXT NOT NULL,
        total_points INTEGER DEFAULT 0,
        available_points INTEGER DEFAULT 0,
        spent_points INTEGER DEFAULT 0,
        loyalty_level TEXT DEFAULT 'bronze',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(client_id)
    )''')

    # Таблица транзакций баллов лояльности
    c.execute('''CREATE TABLE IF NOT EXISTS loyalty_transactions (
        id SERIAL PRIMARY KEY,
        client_id TEXT NOT NULL,
        transaction_type TEXT NOT NULL,
        points INTEGER NOT NULL,
        reason TEXT,
        booking_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TEXT,
        FOREIGN KEY (client_id) REFERENCES clients(instagram_id),
        FOREIGN KEY (booking_id) REFERENCES bookings(id)
    )''')

    # Таблица шаблонов сообщений
    c.execute('''CREATE TABLE IF NOT EXISTS message_templates
                 (id SERIAL PRIMARY KEY,
                  name TEXT NOT NULL,
                  content TEXT NOT NULL,
                  category TEXT DEFAULT 'general',
                  user_id INTEGER,
                  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                  FOREIGN KEY (user_id) REFERENCES users(id))''')

    # Таблица заметок клиентов
    c.execute('''CREATE TABLE IF NOT EXISTS client_notes
                 (id SERIAL PRIMARY KEY,
                  client_id TEXT NOT NULL,
                  note_text TEXT NOT NULL,
                  created_by INTEGER,
                  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                  FOREIGN KEY (client_id) REFERENCES clients(instagram_id) ON DELETE CASCADE,
                  FOREIGN KEY (created_by) REFERENCES users(id))''')

    # Таблица специальных пакетов
    c.execute('''CREATE TABLE IF NOT EXISTS special_packages
                 (id SERIAL PRIMARY KEY,
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
                  is_active BOOLEAN DEFAULT TRUE,
                  usage_count BOOLEAN DEFAULT FALSE,
                  max_usage INTEGER,
                  created_at TEXT,
                  updated_at TEXT)''')
    
    # Таблица кастомных ролей
    c.execute('''CREATE TABLE IF NOT EXISTS custom_roles
                 (id SERIAL PRIMARY KEY,
                  role_key TEXT UNIQUE NOT NULL,
                  role_name TEXT NOT NULL,
                  role_description TEXT,
                  created_at TEXT,
                  created_by INTEGER,
                  FOREIGN KEY (created_by) REFERENCES users(id))''')
    
    # Таблица прав доступа
    c.execute('''CREATE TABLE IF NOT EXISTS role_permissions
                 (id SERIAL PRIMARY KEY,
                  role_key TEXT NOT NULL,
                  permission_key TEXT NOT NULL,
                  can_view BOOLEAN DEFAULT FALSE,
                  can_create BOOLEAN DEFAULT FALSE,
                  can_edit BOOLEAN DEFAULT FALSE,
                  can_delete BOOLEAN DEFAULT FALSE,
                  UNIQUE(role_key, permission_key))''')
    
    # Создать дефолтного администратора если его нет
    c.execute("SELECT COUNT(*) FROM users WHERE username = 'admin'")
    if c.fetchone()[0] == 0:
        import hashlib
        password_hash = hashlib.sha256('admin123'.encode()).hexdigest()
        c.execute("""
            INSERT INTO users (username, password_hash, full_name, role, position, is_active, created_at)
            VALUES ('admin', %s, 'Tahir', 'director', 'Director', TRUE, NOW())
        """, (password_hash,))
        log_info("✅ Создан администратор (логин: admin, пароль: admin123)", "db")
    
    # Создать дефолтные настройки салона
    c.execute("SELECT COUNT(*) FROM salon_settings")
    if c.fetchone()[0] == 0:
        log_info("📝 Создание дефолтных настроек салона...", "database")
        now = datetime.now().isoformat()
        c.execute("""INSERT INTO salon_settings 
                     (id, name, address, google_maps, hours, hours_ru, hours_ar,
                      booking_url, phone, email, instagram, whatsapp, bot_name, bot_name_en, bot_name_ar,
                      city, country, timezone, currency, 
                      latitude, longitude, logo_url, base_url, updated_at)
                     VALUES (1, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
                  ("M Le Diamant",
                   "Shop 13, Amwaj 3 Plaza Level, JBR, Dubai",
                   "https://maps.app.goo.gl/Puh5X1bNEjWPiToz6",
                   "Daily 10:30 - 21:00",
                   "Ежедневно 10:30 - 21:00",
                   "يوميًا 10:30 - 21:00",
                   "https://n1314037.alteg.io",
                   "+971526961100",
                   "mladiamontuae@gmail.com",  # email
                   "www.instagram.com/mlediamant/",  # instagram
                   "+971526961100",  # whatsapp
                   "M Le Diamant Assistant",
                   "M Le Diamant Assistant",
                   "مساعد M Le Diamant",
                   "Dubai",
                   "UAE",
                   "Asia/Dubai",
                   "AED",
                   25.2048,  # latitude (JBR Dubai)
                   55.2708,  # longitude (JBR Dubai)
                   "/assets/logo.webp",  # logo_url
                   "https://mlediamant.com",  # base_url
                   now))
        log_info("✅ Дефолтные настройки салона созданы (включая SEO поля)", "database")
    
    # Создать дефолтные настройки бота
    c.execute("SELECT COUNT(*) FROM bot_settings")
    if c.fetchone()[0] == 0:
        log_info("📝 Создание дефолтных настроек бота...", "database")
        now = datetime.now().isoformat()
        
        # Полный контент настроек
        bot_settings_data = {
            'id': 1,
            'bot_name': "{salon_name} Assistant",
            'personality_traits': "Обаятельная, уверенная, харизматичная, экспертная",
            'greeting_message': 'Добро пожаловать в {SALON_NAME}!',
            'farewell_message': "Спасибо за визит! 💖",
            'price_explanation': '''Наши цены отражают премиальное качество услуг, опыт мастеров и расположение в самом сердце JBR.
Мы используем только профессиональные материалы от ведущих брендов.
Все цены указаны без НДС (добавляется 5% при оплате).''',
            'price_response_template': '''Наши цены отражают качество и профессионализм:
- {service_name}: от {price_min} до {price_max} AED
- Точная стоимость зависит от сложности работы и мастера
- У нас работают опытные специалисты с международными сертификатами''',
            'premium_justification': '''Мы предлагаем премиум-качество потому что:
✨ Используем только профессиональную косметику (Olaplex, Kerastase, OPI)
👩‍🎨 Наши мастера регулярно проходят обучение в Европе
🏆 Более 500 довольных клиентов
💎 Индивидуальный подход к каждому
🎁 Бонусная программа лояльности''',
            'booking_redirect_message': "Я AI-ассистент, запись онлайн за 2 минуты!\nВыбирайте мастера и время здесь: {BOOKING_URL}",
            'fomo_messages': '''⏰ Сегодня осталось всего 2 свободных окна!
🔥 На эту неделю уже почти все забронировано
💫 Этот мастер очень популярен, советую записаться заранее
⭐ Специальное предложение действует только до конца месяца''',
            'upsell_techniques': '''Деликатно предлагай дополнительные услуги:
- После маникюра: Хотите добавить парафинотерапию для рук?
- После стрижки: Рекомендую добавить уход Olaplex
- Перед праздниками: Может быть интересен вечерний макияж?
НО: не навязывай, только если клиент заинтересован''',
            'communication_style': "Дружелюбный, экспертный, вдохновляющий",
            'max_message_length': 4,
            'emoji_usage': """ТОЛЬКО эмоции и РЕДКО сердечки:
✅ Разрешены: 😊 😔 😉 🎉 и редко ❤️ 💖
❌ ЗАПРЕЩЕНЫ: 💎 💅 ✨ 🌟 (декоративные смайлики - это спам!)

Правило: 1-2 смайлика на сообщение МАКСИМУМ
Используй только для передачи эмоций, НЕ для украшения!""",
            'languages_supported': "ru,en,ar",
            'objection_handling': '''При возражениях:
1. Выслушай полностью
2. Покажи понимание
3. Предложи решение
4. Не спорь и не дави
5. Используй социальное доказательство
6. Предложи альтернативу''',
            'negative_handling': '''Если клиент недоволен:
1. Извинись искренне
2. Выясни детали проблемы
3. Предложи решение (переделать, скидка, бонус)
4. Обязательно передай менеджеру
5. Не обещай то, что не можешь выполнить''',
            'safety_guidelines': '''🚨 НЕ ПРИДУМЫВАЙ:
- Скидки, акции, специальные цены (только если ЕСТЬ в БД!)
- Даты и время записи (только реальные слоты!)
- Информацию которой нет в базе
- Цены (только из БД!)
→ Если в БД нет активных спецпакетов = акций НЕТ!

⚠️ НДС 5%:
- Все цены БЕЗ НДС
- Упоминай ТОЛЬКО если клиент спрашивает итоговую сумму
- Формула: "1000 AED + 5% НДС = 1050 AED итого"

🔒 ТАРГЕТИРОВАННАЯ РЕКЛАМА:
- Если клиент спрашивает "откуда у вас мой номер" или "как вы меня нашли"
- Ответ: "Мы используем таргетированную рекламу в Instagram/Facebook для продвижения наших услуг в {main_location}. Если не хотите получать наши сообщения - дайте знать, удалим из базы"
- НЕ извиняйся, это нормальная практика

🎭 ТЫ НЕ МАСТЕР - ТЫ АССИСТЕНТ:
- НИКОГДА не говори от первого лица о работе мастера
- ❌ "Конечно, делаю!" / "Я делаю маникюр"
- ✅ "Да, Местан делает маникюр" / "Наши мастера делают"
- Ты помогаешь записаться, НЕ выполняешь процедуры
- Говори о мастерах в ТРЕТЬЕМ лице

🚫 НЕ ПРЕДЛАГАЙ скидки автоматически!
Только если клиент САМ спрашивает про акции!

📞 МЕНЕДЖЕР:
Предлагай связь с менеджером если:
- Клиент агрессивен/недоволен
- Сложный кейс (группа >5 человек, корпоратив)
- Жалоба на качество
- Ты не можешь решить вопрос''',
            'example_good_responses': '''Примеры хороших ответов:
Плохо: Да, есть время
Хорошо: Отлично! У нас свободно завтра в 14:00 и 16:30. Какое время вам удобнее?

Плохо: Дорого
Хорошо: Понимаю ваши сомнения! Наша цена включает работу мастера с 10-летним опытом и премиум-материалы.''',
            'algorithm_actions': '''Алгоритм действий:
1. Поприветствуй тепло
2. Выясни потребность
3. Предложи услугу
4. Ответь на вопросы
5. Предложи время
6. Подтверди запись
7. Напомни за день
8. Попрощайся''',
            'location_features': '''О нашем салоне:
📍 Удобное расположение в центре
🅿️ Бесплатная парковка для клиентов
☕ Кофе и чай в зоне ожидания
📶 Быстрый WiFi
🛋️ Комфортная зона отдыха''',
            'seasonality': '''Сезонные предложения:
🌸 Весна: уход за кожей после зимы
☀️ Лето: защита волос от солнца, депиляция
🍂 Осень: восстановление после лета
❄️ Зима: увлажнение, SPA-процедуры
🎄 Праздники: вечерние образы, подарочные сертификаты''',
            'emergency_situations': '''В экстренных случаях:
- Клиент заболел: Выздоравливайте! Перенесем запись без штрафа
- Мастер заболел: К сожалению, мастер заболел. Можем предложить другого специалиста
- Форс-мажор: сразу связывай с менеджером
- Жалоба: выслушай, извинись, передай менеджеру''',
            'success_metrics': '''Показатели успеха:
✅ Конверсия в запись > 60%
✅ Средний чек > 300 AED
✅ Повторные визиты > 70%
✅ Время ответа < 2 минуты
✅ Оценка клиентов > 4.5/5''',
            'objection_expensive': '''Понимаю ваши сомнения по поводу цены. Наша стоимость включает:
- Работу сертифицированного мастера с опытом 10+ лет
- Премиум-материалы (Olaplex, OPI, Kerastase)
- Индивидуальный подход
- Многие клиенты говорят, что результат того стоит! Могу предложить более доступный вариант?''',
            'objection_think_about_it': '''Конечно, понимаю! Пока думаете, могу рассказать:
- У нас действует бонусная программа
- Первое посещение со скидкой 10%
- Можем забронировать удобное время без предоплаты
Когда будете готовы - напишите, буду рада помочь!''',
            'objection_no_time': '''Понимаю, что график плотный! У нас есть:
- Ранние слоты с 10:00
- Вечерние до 21:00
- Выходные дни
- Экспресс-услуги (быстрее на 30%)
Какое время вам обычно удобно?''',
            'objection_pain': '''Понимаю ваши опасения! У нас:
- Используем современные безболезненные техники
- Есть обезболивающие средства
- Мастера работают очень деликатно
- Можем сделать тест на небольшом участке
Ваш комфорт - наш приоритет!''',
            'objection_result_doubt': '''Понимаю ваши сомнения! Мы гарантируем:
- Бесплатную коррекцию в течение 2 недель
- Работу только с проверенными материалами
- Портфолио работ наших мастеров в Instagram
- Более 500 довольных клиентов
Могу показать примеры работ?''',
            'objection_cheaper_elsewhere': '''Да, возможно где-то дешевле. Но у нас:
- Гарантия качества и безопасности
- Стерильные инструменты
- Сертифицированные мастера
- Премиум-материалы
Дешевле может обойтись дороже, если придется переделывать. Мы ценим ваше здоровье!''',
            'objection_too_far': '''Понимаю! Но многие клиенты говорят, что дорога того стоит:
- Бесплатная парковка
- Удобное расположение (5 мин от метро)
- Можем совместить несколько услуг за один визит
- Комфортная зона ожидания с кофе
Попробуйте один раз?''',
            'objection_consult_husband': '''Конечно, посоветуйтесь! Пока можем:
- Забронировать удобное время (без предоплаты)
- Отправить прайс и примеры работ
- Ответить на все вопросы
Напишите, когда решите!''',
            'objection_first_time': '''Отлично, что выбрали нас для первого раза! Мы:
- Подробно расскажем о процедуре
- Ответим на все вопросы
- Сделаем всё максимально комфортно
- Дадим рекомендации по уходу
Для новых клиентов скидка 10%!''',
            'objection_not_happy': '''Мне очень жаль, что вы недовольны! Давайте исправим:
- Бесплатная коррекция
- Или полный возврат средств
- Или другая услуга в подарок
Сейчас свяжу вас с менеджером, мы обязательно решим эту ситуацию!''',
            'emotional_triggers': '''Эмоциональные триггеры:
💝 Забота о себе
✨ Преображение
👑 Статус
🎁 Подарок себе
⏰ Срочность
👥 Социальное доказательство''',
            'social_proof_phrases': '''Социальные доказательства:
Более 500 довольных клиентов
Средняя оценка 4.9/5
Наши мастера - призеры международных конкурсов
Работаем с 2018 года
Посмотрите отзывы в Instagram
Многие клиенты приходят к нам годами''',
            'personalization_rules': '''Персонализация:
- Обращайся по имени (если известно)
- Помни предыдущие визиты
- Учитывай предпочтения мастера
- Запоминай любимые услуги
- Поздравляй с днем рождения
- Предлагай то, что подходит именно этому клиенту''',
            'example_dialogues': '''Пример диалога:
Клиент: Привет, хочу маникюр
Бот: Здравствуйте! Буду рада помочь с записью на маникюр!
Клиент: Классический с покрытием
Бот: Отлично! Классический маникюр с покрытием гель-лаком - 150 AED. Когда вам удобно прийти?''',
            'emotional_responses': '''Эмоциональные ответы:
Радость: Как здорово!
Сочувствие: Понимаю вас
Поддержка: Мы обязательно поможем!
Восхищение: Замечательный выбор!
Благодарность: Спасибо за доверие!''',
            'anti_patterns': '''ИЗБЕГАЙ:
❌ Слишком длинных сообщений (>300 символов)
❌ Много эмодзи подряд (максимум 2-3)
❌ Формальности
❌ Сленга и жаргона
❌ Давления на клиента
❌ Обещаний, которые не можешь выполнить
❌ Игнорирования вопросов''',
            'voice_message_response': '''На голосовые сообщения:
Спасибо за голосовое! Я прослушала и поняла, что вам нужно [краткое резюме]. Правильно?
Если не понял: Извините, не смогла разобрать голосовое. Не могли бы вы написать текстом?''',
            'contextual_rules': '''Контекстные правила:
Утро (6-12): Доброе утро!
День (12-18): Добрый день!
Вечер (18-22): Добрый вечер!
Ночь (22-6): Здравствуйте! Мы работаем {hours_weekdays}

Первое сообщение: более развернутое приветствие
Повторное обращение: Рада видеть вас снова!''',
            'manager_consultation_prompt': '''Ты - опытный консультант для менеджеров салона красоты. Твоя задача - п��могать менеджерам вести диалог с клиентами эффективно.

ТВОЯ РОЛЬ:
- Анализируй контекст диалога
- Предлагай конкретные фразы для ответа клиенту
- Объясняй психологию и логику своих рекомендаций
- Помогай закрывать возражения
- Подсказывай как довести до записи

ФОРМАТ ОТВЕТА:
1. Анализ ситуации (1-2 предложения)
2. Рекомендуемый ответ клиенту (готовый текст)
3. Почему это сработает (краткое объяснение)

ПРИМЕР:
"Вижу что клиент молчит после информации о цене. Это типичное возражение по стоимости.

Я бы на твоем месте написал:
'Кстати, эта процедура включает премиум-материалы и держится 3-4 недели без коррекции 💅 Многие клиентки говорят что это выгоднее чем делать обычный маникюр каждую неделю. Хотите посмотреть расписание на удобное время?'

Почему это работает: ты показываешь ценность (премиум + долговечность), создаешь социальное доказательство (другие клиентки) и даешь мягкий призыв к действию."

НЕ НАЧИНАЙ С ФРАЗ:
❌ "Супер! Давайте оформим запись!"
❌ "Для записи мне нужно..."
❌ Любой текст обращенный к клиенту напрямую

НАЧИНАЙ С ФРАЗ:
✅ "Я вижу что..."
✅ "Я бы на твоем месте..."
✅ "Рекомендую написать клиенту..."''',
            'booking_data_collection': '''СБОР ДАННЫХ ДЛЯ ЗАПИСИ:

ОБЯЗАТЕЛЬНЫЕ ДАННЫЕ:
1. Имя клиента
2. Номер WhatsApp
3. Выбранная услуга
4. Желаемая дата и время
5. Предпочитаемый мастер (опционально)

ПОСЛЕДОВАТЕЛЬНОСТЬ СБОРА:
1. Сначала услуга (что хочет клиент)
2. Потом дата и время (когда удобно)
3. Затем мастер (если есть предпочтения)
4. В конце имя и WhatsApp

ПРАВИЛА:
- Собирай данные естественно в ходе диалога
- Не запрашивай все данные сразу
- Если клиент дал несколько данных сразу - отлично, используй их
- Подтверждай каждое полученное данное
- Перед финальным подтверждением повтори все детали записи

ПРИМЕРЫ:
❌ "Для записи нужно: имя, телефон, дата, время, услуга"
✅ "Отлично! Маникюр с покрытием - 150 AED. Когда вам удобно прийти?"

❌ "Напишите ваше имя"
✅ "Замечательно! Как вас зовут и какой номер WhatsApp для подтверждения?"''',
            'booking_time_logic': '''ЛОГИКА ВЫБОРА ВРЕМЕНИ:

ПРОВЕРКИ:
1. Время в рабочих часах салона ({hours_weekdays})
2. Мастер доступен в это время
3. Достаточно времени для процедуры
4. Не конфликтует с другими записями

РЕКОМЕНДАЦИИ:
- Предлагай 2-3 ближайших свободных слота
- Учитывай длительность процедуры
- Оставляй 15 минут между записями
- Предупреждай если время на грани закрытия

ПРИМЕРЫ:
"Свободное время завтра:
• 11:00 - утренний слот
• 14:30 - после обеда  
• 18:00 - вечернее время

Какое удобнее?"

ЕСЛИ ВРЕМЯ ЗАНЯТО:
"Это время уже занято 😊 Ближайшие свободные слоты:
• Сегодня в 16:00
• Завтра в 11:00
• Послезавтра в 14:00

Что подойдет?"''',
            'pre_booking_data_collection': '''ДАННЫЕ ДО НАЧАЛА ЗАПИСИ:

МИНИМУМ ДЛЯ СТАРТА ЗАПИСИ:
1. Услуга (что хочет клиент)
2. Примерная дата (сегодня/завтра/на неделе)

МОЖНО НАЧАТЬ ЗАПИСЬ ЕСЛИ:
✅ Клиент написал "Хочу маникюр завтра"
✅ Клиент выбрал услугу из меню
✅ Клиент спросил "Когда можно записаться на педикюр?"

НЕЛЬЗЯ НАЧАТЬ ЗАПИСЬ ЕСЛИ:
❌ Клиент только поздоровался
❌ Клиент задает общие вопросы
❌ Клиент уточняет цены без намерения записаться

ПЕРЕХОД К ЗАПИСИ:
"Отлично! [Услуга] - [Цена]. Когда вам удобно прийти?"

ЕСЛИ ДАННЫХ НЕДОСТАТОЧНО:
"С удовольствием помогу с записью! Какая процедура вас интересует?"''',
            'updated_at': now
        }

        # Build query dynamically
        columns = ', '.join(bot_settings_data.keys())
        placeholders = ', '.join(['%s'] * len(bot_settings_data))
        values = list(bot_settings_data.values())

        c.execute(f"INSERT INTO bot_settings ({columns}) VALUES ({placeholders})", values)
        log_info("✅ Дефолтные настройки бота созданы (расширенная версия)", "database")
    
    
    # Таблица отзывов и рейтингов
    c.execute('''CREATE TABLE IF NOT EXISTS ratings (
        id SERIAL PRIMARY KEY,
        booking_id INTEGER,
        instagram_id TEXT,
        rating INTEGER,
        comment TEXT,
        created_at TEXT,
        FOREIGN KEY (booking_id) REFERENCES bookings(id)
    )''')
    
    # Таблица логов напоминаний
    c.execute('''CREATE TABLE IF NOT EXISTS reminder_logs (
        id SERIAL PRIMARY KEY,
        booking_id INTEGER,
        client_id TEXT,
        reminder_type TEXT,
        sent_at TEXT,
        status TEXT,
        error_message TEXT,
        FOREIGN KEY (booking_id) REFERENCES bookings(id)
    )''')

    # Таблица публичных отзывов
    c.execute('''CREATE TABLE IF NOT EXISTS public_reviews (
        id SERIAL PRIMARY KEY,
        author_name TEXT NOT NULL,
        rating INTEGER NOT NULL,
        text_ru TEXT,
        text_en TEXT,
        text_ar TEXT,
        text_de TEXT,
        text_es TEXT,
        text_fr TEXT,
        text_hi TEXT,
        text_kk TEXT,
        text_pt TEXT,
        avatar_url TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        display_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        employee_name TEXT,
        employee_name_ru TEXT,
        employee_name_en TEXT,
        employee_name_ar TEXT,
        employee_position TEXT,
        employee_position_ru TEXT,
        employee_position_en TEXT,
        employee_position_ar TEXT
    )''')
    
    # Миграция: добавить поля сотрудников в public_reviews если их нет
    try:

        c.execute("""

            SELECT column_name 

            FROM information_schema.columns 

            WHERE table_name='public_reviews'

        """)

        review_columns = [row[0] for row in c.fetchall()]

    except:

        review_columns = []
    review_migrations = {
        'employee_name': 'TEXT',
        'employee_name_ru': 'TEXT',
        'employee_name_en': 'TEXT',
        'employee_name_ar': 'TEXT',
        'employee_position': 'TEXT',
        'employee_position_ru': 'TEXT',
        'employee_position_en': 'TEXT',
        'employee_position_ar': 'TEXT'
    }
    for col, col_type in review_migrations.items():
        if col not in review_columns:
            c.execute(f"ALTER TABLE public_reviews ADD COLUMN {col} {col_type}")

    # Таблица публичных FAQ
    c.execute('''CREATE TABLE IF NOT EXISTS public_faq (
        id SERIAL PRIMARY KEY,
        question_ru TEXT,
        question_en TEXT,
        question_ar TEXT,
        question_de TEXT,
        question_es TEXT,
        question_fr TEXT,
        question_hi TEXT,
        question_kk TEXT,
        question_pt TEXT,
        answer_ru TEXT,
        answer_en TEXT,
        answer_ar TEXT,
        answer_de TEXT,
        answer_es TEXT,
        answer_fr TEXT,
        answer_hi TEXT,
        answer_kk TEXT,
        answer_pt TEXT,
        category TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        display_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )''')

    # Таблица предпочтений клиентов
    c.execute('''CREATE TABLE IF NOT EXISTS client_preferences (
        id SERIAL PRIMARY KEY,
        client_id TEXT NOT NULL,
        preferred_master INTEGER,
        preferred_service INTEGER,
        preferred_day_of_week INTEGER,
        preferred_time_of_day TEXT,
        allergies TEXT,
        special_notes TEXT,
        auto_book_enabled BOOLEAN DEFAULT TRUE,
        auto_book_interval_weeks INTEGER DEFAULT 3,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (client_id) REFERENCES clients(instagram_id),
        FOREIGN KEY (preferred_master) REFERENCES users(id),
        FOREIGN KEY (preferred_service) REFERENCES services(id),
        UNIQUE(client_id)
    )''')

    # Таблица подписок пользователей
    c.execute('''CREATE TABLE IF NOT EXISTS user_subscriptions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        subscription_type TEXT NOT NULL,
        is_subscribed BOOLEAN DEFAULT TRUE,
        email_enabled BOOLEAN DEFAULT TRUE,
        telegram_enabled BOOLEAN DEFAULT TRUE,
        instagram_enabled BOOLEAN DEFAULT TRUE,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        UNIQUE(user_id, subscription_type)
    )''')

    # Таблица настроек мессенджеров
    c.execute('''CREATE TABLE IF NOT EXISTS messenger_settings (
        id SERIAL PRIMARY KEY,
        messenger_type TEXT UNIQUE NOT NULL,
        display_name TEXT NOT NULL,
        is_enabled BOOLEAN DEFAULT FALSE,
        api_token TEXT,
        webhook_url TEXT,
        config_json TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )''')
    
    # Инициализация дефолтных настроек мессенджеров
    messenger_defaults = [
        ('instagram', 'Instagram', True),
        ('whatsapp', 'WhatsApp', False),
        ('telegram', 'Telegram', False),
        ('tiktok', 'TikTok', False)
    ]
    for messenger_type, display_name, is_enabled in messenger_defaults:
        c.execute("""
            INSERT INTO messenger_settings (messenger_type, display_name, is_enabled)
            VALUES (%s, %s, %s)
            ON CONFLICT (messenger_type) DO NOTHING
        """, (messenger_type, display_name, is_enabled))

    # Миграция: добавить position_ru в users если нет
    try:

        c.execute("""

            SELECT column_name 

            FROM information_schema.columns 

            WHERE table_name='users'

        """)

        user_columns = [row[0] for row in c.fetchall()]

    except:

        user_columns = []
    if 'position_ru' not in user_columns:
        c.execute("ALTER TABLE users ADD COLUMN position_ru TEXT")
    
    # Миграция: добавить telegram_manager_chat_id в salon_settings
    try:

        c.execute("""

            SELECT column_name 

            FROM information_schema.columns 

            WHERE table_name='salon_settings'

        """)

        salon_columns = [row[0] for row in c.fetchall()]

    except:

        salon_columns = []
    if 'telegram_manager_chat_id' not in salon_columns:
        c.execute("ALTER TABLE salon_settings ADD COLUMN telegram_manager_chat_id TEXT")
    
    # Миграция: добавить недостающие колонки в loyalty_levels
    try:

        c.execute("""

            SELECT column_name 

            FROM information_schema.columns 

            WHERE table_name='loyalty_levels'

        """)

        loyalty_columns = [row[0] for row in c.fetchall()]

    except:

        loyalty_columns = []
    if 'points_multiplier' not in loyalty_columns:
        c.execute("ALTER TABLE loyalty_levels ADD COLUMN points_multiplier REAL DEFAULT 1.0")
    
    # Миграция: добавить недостающие колонки в client_loyalty_points
    try:

        c.execute("""

            SELECT column_name 

            FROM information_schema.columns 

            WHERE table_name='client_loyalty_points'

        """)

        client_loyalty_columns = [row[0] for row in c.fetchall()]

    except:

        client_loyalty_columns = []
    if 'total_points' not in client_loyalty_columns:
        c.execute("ALTER TABLE client_loyalty_points ADD COLUMN total_points INTEGER DEFAULT 0")
    
    # Миграция: добавить name в booking_reminder_settings если есть таблица
    c.execute("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name='booking_reminder_settings'")
    if c.fetchone():
        try:

            c.execute("""

                SELECT column_name 

                FROM information_schema.columns 

                WHERE table_name='booking_reminder_settings'

            """)

            reminder_columns = [row[0] for row in c.fetchall()]

        except:

            reminder_columns = []
        if 'name' not in reminder_columns:
            c.execute("ALTER TABLE booking_reminder_settings ADD COLUMN name TEXT DEFAULT 'Default Reminder'")
    
    # Ensure client columns exist
    from db.clients import ensure_client_columns
    ensure_client_columns(conn)
    
    
    # Создать начальных сотрудников с фото
    
    # Функция для восстановления фото
    def ensure_employee_photos():
        import shutil
        import os
        
        # Determine project root and potential paths
        # __file__ = backend/db/init.py
        # dirname = backend/db
        # dirname = backend
        # dirname = project_root
        backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        project_root = os.path.dirname(backend_dir)
        
        # Универсальный путь, который работает везде, где сохранена структура проекта
        source_dir = os.path.join(project_root, "frontend", "public_landing", "styles", "img", "Сотрудники")
        
        target_dir = os.path.join(backend_dir, "static", "uploads", "images")
        
        if not os.path.exists(source_dir):
            log_warning(f"⚠️ Папка с фото не найдена: {source_dir}", "db")
            return {}

        if not os.path.exists(target_dir):
            os.makedirs(target_dir, exist_ok=True)
            
        photo_mapping = {
            "simo": "Симо.webp",
            "mestan": "Местан.webp",
            "lyazzat": "Ляззат.webp",
            "gulya": "Гуля.webp",
            "jennifer": "Дженнифер.webp",
        }
        
        restored_photos = {}
        
        for username, source_filename in photo_mapping.items():
            source_path = os.path.join(source_dir, source_filename)
            
            if os.path.exists(source_path):
                ext = os.path.splitext(source_filename)[1].lower()
                new_filename = f"{username}{ext}"
                target_path = os.path.join(target_dir, new_filename)
                
                shutil.copy2(source_path, target_path)
                restored_photos[username] = f"/static/uploads/images/{new_filename}"
                log_info(f"📸 Фото восстановлено: {username} -> {new_filename}", "db")
            else:
                log_info(f"⚠️ Фото не найдено: {source_path}", "db")
                
        return restored_photos

    # Восстанавливаем фото перед созданием сотрудников
    restored_photos = ensure_employee_photos()

    employees_data = [
        {
            "username": "simo",
            "full_name": "SIMO",
            "position": "Hair Stylist",
            "role": "employee",
            "photo": restored_photos.get("simo", "/static/uploads/images/simo.webp")
        },
        {
            "username": "mestan",
            "full_name": "MESTAN",
            "position": "Hair Stylist",
            "role": "employee",
            "photo": restored_photos.get("mestan", "/static/uploads/images/mestan.webp")
        },
        {
            "username": "lyazzat",
            "full_name": "LYAZZAT",
            "position": "Nail Master",
            "role": "employee",
            "photo": restored_photos.get("lyazzat", "/static/uploads/images/lyazzat.webp")
        },
        {
            "username": "gulya",
            "full_name": "GULYA",
            "position": "Nail/Waxing",
            "role": "employee",
            "photo": restored_photos.get("gulya", "/static/uploads/images/gulya.webp")
        },
        {
            "username": "jennifer",
            "full_name": "JENNIFER",
            "position": "Nail Master/Massages",
            "role": "employee",
            "photo": restored_photos.get("jennifer", "/static/uploads/images/jennifer.webp")
        },
        {
            "username": "tursunai",
            "full_name": "Турсунай",
            "position": "Director",
            "role": "director",
            "photo": None
        }
    ]
    
    for emp in employees_data:
        c.execute("SELECT COUNT(*) FROM users WHERE username = %s", (emp["username"],))
        if c.fetchone()[0] == 0:
            password_hash = hashlib.sha256((emp["username"][:4] + "123").encode()).hexdigest()
            c.execute("""
                INSERT INTO users (username, password_hash, full_name, role, position, photo, is_active, is_service_provider, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, TRUE, TRUE, NOW())
                RETURNING id
            """, (emp["username"], password_hash, emp["full_name"], emp["role"], emp["position"], emp["photo"]))
            
            user_id = c.fetchone()[0]
            log_info(f"✅ Создан сотрудник: {emp['full_name']} (логин: {emp['username']}, пароль: {emp['username'][:4]}123)", "db")
            
            # Назначаем все услуги сотруднику
            c.execute("SELECT id, price, duration FROM services")
            services = c.fetchall()
            for svc in services:
                c.execute("""
                    INSERT INTO user_services (user_id, service_id, price, duration, is_online_booking_enabled, is_calendar_enabled)
                    VALUES (%s, %s, %s, %s, TRUE, TRUE)
                    ON CONFLICT DO NOTHING
                """, (user_id, svc[0], svc[1], svc[2]))
        else:
            # Если сотрудник уже есть, тоже проверим и добавим услуги если их нет
            c.execute("SELECT id FROM users WHERE username = %s", (emp["username"],))
            user_id = c.fetchone()[0]
            
            c.execute("SELECT id, price, duration FROM services")
            services = c.fetchall()
            for svc in services:
                c.execute("""
                    INSERT INTO user_services (user_id, service_id, price, duration, is_online_booking_enabled, is_calendar_enabled)
                    VALUES (%s, %s, %s, %s, TRUE, TRUE)
                    ON CONFLICT DO NOTHING
                """, (user_id, svc[0], svc[1], svc[2]))
    
    conn.commit()
    conn.close()
    
    # Run public content schema migration
    try:
        from db.migrations.consolidated.schema_public import migrate_public_schema
        migrate_public_schema(DATABASE_NAME)
        log_info("✅ Public content tables migrated", "db")
    except Exception as e:
        log_warning(f"⚠️ Public content migration warning: {e}", "db")
    
    # Run telephony schema migration
    try:
        from db.migrations.consolidated.schema_telephony import run_migration as migrate_telephony
        migrate_telephony()
        log_info("✅ Telephony tables migrated", "db")
    except Exception as e:
        log_warning(f"⚠️ Telephony migration warning: {e}", "db")

    # Run menu settings schema migration
    try:
         from db.migrations.consolidated.schema_menu_settings import run_migration as migrate_menu
         migrate_menu()
         log_info("✅ Menu settings tables migrated", "db")
    except Exception as e:
        log_warning(f"⚠️ Menu settings migration warning: {e}", "db")

    log_info("✅ База данных инициализирована", "db")

if __name__ == "__main__":
    init_database()