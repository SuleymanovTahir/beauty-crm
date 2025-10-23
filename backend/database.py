import sqlite3
from datetime import datetime, timedelta
from typing import Optional, Dict, List
import hashlib
import secrets
from logger import log_error, log_info, log_warning
from config import DATABASE_NAME, SMTP_SERVER, SMTP_PORT, SMTP_USERNAME, SMTP_PASSWORD, FROM_EMAIL


def init_database():
    """Создать базу данных"""
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

    # Проверяем и добавляем новые колонки если их нет
    try:
        c.execute("ALTER TABLE clients ADD COLUMN profile_pic TEXT")
    except sqlite3.OperationalError:
        pass

    try:
        c.execute("ALTER TABLE clients ADD COLUMN notes TEXT")
    except sqlite3.OperationalError:
        pass

    try:
        c.execute("ALTER TABLE clients ADD COLUMN is_pinned INTEGER DEFAULT 0")
    except sqlite3.OperationalError:
        pass
    
    try:
        c.execute("ALTER TABLE clients ADD COLUMN detected_language TEXT DEFAULT 'ru'")
    except sqlite3.OperationalError:
        pass

    c.execute('''CREATE TABLE IF NOT EXISTS chat_history
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  instagram_id TEXT,
                  message TEXT,
                  sender TEXT,
                  timestamp TEXT,
                  language TEXT,
                  is_read INTEGER DEFAULT 0,
                  message_type TEXT DEFAULT 'text')''')

    try:
        c.execute("ALTER TABLE chat_history ADD COLUMN message_type TEXT DEFAULT 'text'")
    except sqlite3.OperationalError:
        pass

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
    
    try:
        c.execute("ALTER TABLE bookings ADD COLUMN special_package_id INTEGER")
    except sqlite3.OperationalError:
        pass

    c.execute('''CREATE TABLE IF NOT EXISTS booking_temp
                 (instagram_id TEXT PRIMARY KEY,
                  service_name TEXT,
                  date TEXT,
                  time TEXT,
                  phone TEXT,
                  name TEXT,
                  step TEXT)''')

    c.execute('''CREATE TABLE IF NOT EXISTS client_interactions
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  instagram_id TEXT,
                  interaction_type TEXT,
                  timestamp TEXT,
                  metadata TEXT)''')

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

    c.execute('''CREATE TABLE IF NOT EXISTS sessions
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  user_id INTEGER,
                  session_token TEXT UNIQUE,
                  created_at TEXT,
                  expires_at TEXT,
                  FOREIGN KEY (user_id) REFERENCES users(id))''')

    c.execute('''CREATE TABLE IF NOT EXISTS activity_log
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  user_id INTEGER,
                  action TEXT,
                  entity_type TEXT,
                  entity_id TEXT,
                  details TEXT,
                  timestamp TEXT,
                  FOREIGN KEY (user_id) REFERENCES users(id))''')

    c.execute('''CREATE TABLE IF NOT EXISTS custom_statuses
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  status_key TEXT UNIQUE NOT NULL,
                  status_label TEXT NOT NULL,
                  status_color TEXT NOT NULL,
                  status_icon TEXT NOT NULL,
                  created_at TEXT,
                  created_by INTEGER,
                  FOREIGN KEY (created_by) REFERENCES users(id))''')

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

    c.execute('''CREATE TABLE IF NOT EXISTS notification_settings (
      id INTEGER PRIMARY KEY,
      user_id INTEGER NOT NULL,
      email_notifications BOOLEAN DEFAULT 1,
      sms_notifications BOOLEAN DEFAULT 0,
      booking_notifications BOOLEAN DEFAULT 1,
      birthday_reminders BOOLEAN DEFAULT 1,
      birthday_days_advance INTEGER DEFAULT 7,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );''')
    
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
    
    c.execute('''CREATE TABLE IF NOT EXISTS custom_roles
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  role_key TEXT UNIQUE NOT NULL,
                  role_name TEXT NOT NULL,
                  role_description TEXT,
                  created_at TEXT,
                  created_by INTEGER,
                  FOREIGN KEY (created_by) REFERENCES users(id))''')
    
    c.execute('''CREATE TABLE IF NOT EXISTS role_permissions
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  role_key TEXT NOT NULL,
                  permission_key TEXT NOT NULL,
                  can_view INTEGER DEFAULT 0,
                  can_create INTEGER DEFAULT 0,
                  can_edit INTEGER DEFAULT 0,
                  can_delete INTEGER DEFAULT 0,
                  UNIQUE(role_key, permission_key))''')
    
    # ===== СОЗДАТЬ ДЕФОЛТНЫЕ НАСТРОЙКИ САЛОНА =====
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
    
    # ===== СОЗДАТЬ ДЕФОЛТНЫЕ НАСТРОЙКИ БОТА =====
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
    
    # Мигрируем данные из config.py в БД при первом запуске



# ===== ФУНКЦИИ ДЛЯ РАБОТЫ С СПЕЦИАЛЬНЫМИ ПАКЕТАМИ =====

def get_all_special_packages(active_only=True):
    """Получить все специальные пакеты"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    now = datetime.now().isoformat()
    
    if active_only:
        c.execute("""SELECT * FROM special_packages 
                     WHERE is_active = 1 
                     AND valid_from <= ? 
                     AND valid_until >= ?
                     ORDER BY created_at DESC""", (now, now))
    else:
        c.execute("SELECT * FROM special_packages ORDER BY created_at DESC")

    packages = c.fetchall()
    conn.close()
    return packages


def get_special_package_by_id(package_id):
    """Получить пакет по ID"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    c.execute("SELECT * FROM special_packages WHERE id = ?", (package_id,))
    package = c.fetchone()

    conn.close()
    return package


def find_special_package_by_keywords(message: str):
    """Найти подходящий спец. пакет по ключевым словам в сообщении"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    now = datetime.now().isoformat()
    message_lower = message.lower()

    c.execute("""SELECT * FROM special_packages 
                 WHERE is_active = 1 
                 AND valid_from <= ? 
                 AND valid_until >= ?""", (now, now))

    packages = c.fetchall()
    conn.close()

    # Ищем совпадения по ключевым словам
    for package in packages:
        # package = (id, name, name_ru, desc, desc_ru, orig_price, special_price, currency,
        #           discount_percent, services_included, promo_code, keywords, valid_from, valid_until, 
        #           is_active, usage_count, max_usage, created_at, updated_at)
        keywords_str = package[11]  # keywords
        if keywords_str:
            keywords = [kw.strip().lower() for kw in keywords_str.split(',')]
            for keyword in keywords:
                if keyword in message_lower:
                    return package
    
    return None


def create_special_package(name, name_ru, original_price, special_price, currency,
                           keywords, valid_from, valid_until, description=None,
                           description_ru=None, services_included=None, promo_code=None,
                           max_usage=None):
    """Создать новый специальный пакет"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    now = datetime.now().isoformat()
    discount_percent = int(((original_price - special_price) / original_price) * 100)
    
    services_str = ','.join(services_included) if services_included else ''
    keywords_str = ','.join(keywords) if isinstance(keywords, list) else keywords

    try:
        c.execute("""INSERT INTO special_packages 
                     (name, name_ru, description, description_ru, original_price, special_price,
                      currency, discount_percent, services_included, promo_code, keywords,
                      valid_from, valid_until, created_at, updated_at, max_usage)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                  (name, name_ru, description, description_ru, original_price, special_price,
                   currency, discount_percent, services_str, promo_code, keywords_str,
                   valid_from, valid_until, now, now, max_usage))
        conn.commit()
        package_id = c.lastrowid
        conn.close()
        return package_id
    except sqlite3.IntegrityError as e:
        conn.close()
        print(f"Ошибка создания пакета: {e}")
        return None


def update_special_package(package_id, **kwargs):
    """Обновить специальный пакет"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    updates = []
    params = []

    for key, value in kwargs.items():
        if key == 'services_included' and isinstance(value, list):
            value = ','.join(value)
        elif key == 'keywords' and isinstance(value, list):
            value = ','.join(value)
        updates.append(f"{key} = ?")
        params.append(value)

    updates.append("updated_at = ?")
    params.append(datetime.now().isoformat())
    params.append(package_id)

    query = f"UPDATE special_packages SET {', '.join(updates)} WHERE id = ?"
    c.execute(query, params)

    conn.commit()
    conn.close()
    return True


def delete_special_package(package_id):
    """Удалить специальный пакет"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    c.execute("DELETE FROM special_packages WHERE id = ?", (package_id,))

    conn.commit()
    conn.close()
    return True


def increment_package_usage(package_id):
    """Увеличить счетчик использования пакета"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    c.execute("UPDATE special_packages SET usage_count = usage_count + 1 WHERE id = ?", 
              (package_id,))

    conn.commit()
    conn.close()


# ===== ЯЗЫКОВЫЕ ФУНКЦИИ =====

def detect_and_save_language(instagram_id: str, message: str):
    """Определить язык сообщения и сохранить для клиента"""
    # Простое определение языка по символам
    import re
    
    # Проверка на кириллицу
    if re.search('[а-яА-ЯёЁ]', message):
        language = 'ru'
    # Проверка на арабский
    elif re.search('[\u0600-\u06FF]', message):
        language = 'ar'
    # По умолчанию английский
    else:
        language = 'en'
    
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    c.execute("UPDATE clients SET detected_language = ? WHERE instagram_id = ?",
              (language, instagram_id))
    
    conn.commit()
    conn.close()
    
    return language


def get_client_language(instagram_id: str) -> str:
    """Получить предпочитаемый язык клиента"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    c.execute("SELECT detected_language FROM clients WHERE instagram_id = ?", (instagram_id,))
    result = c.fetchone()
    
    conn.close()
    
    return result[0] if result and result[0] else 'ru'


# ===== ВСЕ ОСТАЛЬНЫЕ ФУНКЦИИ ИЗ ОРИГИНАЛЬНОГО database.py =====
# (копируем все остальные функции без изменений)

def get_all_users():
    """Получить всех пользователей"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    c.execute("""SELECT id, username, password_hash, full_name, email, role, 
                 created_at, last_login, is_active 
                 FROM users ORDER BY id""")

    users = c.fetchall()
    conn.close()
    return users


def delete_user(user_id: int) -> bool:
    """Удалить пользователя"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    try:
        # Удаляем сессии
        c.execute("DELETE FROM sessions WHERE user_id = ?", (user_id,))
        # Удаляем пользователя
        c.execute("DELETE FROM users WHERE id = ?", (user_id,))
        conn.commit()
        success = c.rowcount > 0
        conn.close()
        return success
    except Exception as e:
        print(f"Ошибка удаления пользователя: {e}")
        conn.close()
        return False


def get_all_services(active_only=True):
    """Получить все услуги из БД"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    if active_only:
        c.execute(
            "SELECT * FROM services WHERE is_active = 1 ORDER BY category, name")
    else:
        c.execute("SELECT * FROM services ORDER BY category, name")

    services = c.fetchall()
    conn.close()
    return services


def get_service_by_key(service_key):
    """Получить услугу по ключу"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    c.execute("SELECT * FROM services WHERE service_key = ?", (service_key,))
    service = c.fetchone()

    conn.close()
    return service


def create_service(service_key, name, name_ru, price, currency, category,
                   description=None, description_ru=None, benefits=None):
    """Создать новую услугу"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    now = datetime.now().isoformat()
    benefits_str = '|'.join(benefits) if benefits else ''

    try:
        c.execute("""INSERT INTO services 
                     (service_key, name, name_ru, price, currency, category,
                      description, description_ru, benefits, created_at, updated_at)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                  (service_key, name, name_ru, price, currency, category,
                   description, description_ru, benefits_str, now, now))
        conn.commit()
        conn.close()
        return True
    except sqlite3.IntegrityError:
        conn.close()
        return False


def update_service(service_id, **kwargs):
    """Обновить услугу"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    updates = []
    params = []

    for key, value in kwargs.items():
        if key == 'benefits' and isinstance(value, list):
            value = '|'.join(value)
        updates.append(f"{key} = ?")
        params.append(value)

    updates.append("updated_at = ?")
    params.append(datetime.now().isoformat())
    params.append(service_id)

    query = f"UPDATE services SET {', '.join(updates)} WHERE id = ?"
    c.execute(query, params)

    conn.commit()
    conn.close()
    return True


def delete_service(service_id):
    """Удалить услугу ПОЛНОСТЬЮ (не мягкое удаление)"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    # Реальное удаление из базы
    c.execute("DELETE FROM services WHERE id = ?", (service_id,))

    conn.commit()
    affected = c.rowcount
    conn.close()
    
    if affected > 0:
        print(f"✅ Услуга {service_id} удалена из БД")
    
    return affected > 0


def create_user(username: str, password: str, full_name: str = None,
                email: str = None, role: str = 'employee'):
    """Создать нового пользователя"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    password_hash = hashlib.sha256(password.encode()).hexdigest()
    now = datetime.now().isoformat()

    try:
        c.execute("""INSERT INTO users 
                     (username, password_hash, full_name, email, role, created_at)
                     VALUES (?, ?, ?, ?, ?, ?)""",
                  (username, password_hash, full_name, email, role, now))
        conn.commit()
        user_id = c.lastrowid
        conn.close()
        return user_id
    except sqlite3.IntegrityError:
        conn.close()
        return None


def verify_user(username: str, password: str) -> Optional[Dict]:
    """Проверить логин и пароль"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    password_hash = hashlib.sha256(password.encode()).hexdigest()
    # ✅ ДОБАВЬ ОТЛАДКУ
    print(f"🔐 Проверка логина: {username}")
    print(f"🔑 Hash: {password_hash[:20]}...")
    c.execute("""SELECT id, username, full_name, email, role 
                 FROM users 
                 WHERE username = ? AND password_hash = ? AND is_active = 1""",
              (username, password_hash))

    user = c.fetchone()
     # ✅ ДОБАВЬ ОТЛАДКУ
    print(f"👤 Найден: {user is not None}")
    conn.close()

    if user:
        return {
            "id": user[0],
            "username": user[1],
            "full_name": user[2],
            "email": user[3],
            "role": user[4]
        }
    return None


def get_user_by_email(email: str):
    """Получить пользователя по email"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    c.execute("""SELECT id, username, full_name, email 
                 FROM users 
                 WHERE email = ? AND is_active = 1""", (email,))

    user = c.fetchone()
    conn.close()

    if user:
        return {
            "id": user[0],
            "username": user[1],
            "full_name": user[2],
            "email": user[3]
        }
    return None


def create_password_reset_token(user_id: int) -> str:
    """Создать токен для сброса пароля"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    # Создаем таблицу для токенов если её нет
    c.execute('''CREATE TABLE IF NOT EXISTS password_reset_tokens
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  user_id INTEGER,
                  token TEXT UNIQUE,
                  created_at TEXT,
                  expires_at TEXT,
                  used INTEGER DEFAULT 0,
                  FOREIGN KEY (user_id) REFERENCES users(id))''')

    token = secrets.token_urlsafe(32)
    now = datetime.now()
    expires = (now + timedelta(hours=1)).isoformat()

    c.execute("""INSERT INTO password_reset_tokens (user_id, token, created_at, expires_at)
                 VALUES (?, ?, ?, ?)""",
              (user_id, token, now.isoformat(), expires))

    conn.commit()
    conn.close()

    return token


def verify_reset_token(token: str):
    """Проверить токен сброса пароля"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    now = datetime.now().isoformat()

    c.execute("""SELECT user_id FROM password_reset_tokens
                 WHERE token = ? AND expires_at > ? AND used = 0""",
              (token, now))

    result = c.fetchone()
    conn.close()

    return result[0] if result else None


def mark_reset_token_used(token: str):
    """Отметить токен как использованный"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    c.execute("UPDATE password_reset_tokens SET used = 1 WHERE token = ?", (token,))

    conn.commit()
    conn.close()


def reset_user_password(user_id: int, new_password: str):
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    password_hash = hashlib.sha256(new_password.encode()).hexdigest()

    c.execute("UPDATE users SET password_hash = ? WHERE id = ?",
              (password_hash, user_id))

    conn.commit()
    conn.close()

    return True


def create_session(user_id: int) -> str:
    """Создать сессию для пользователя"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    session_token = secrets.token_urlsafe(32)
    now = datetime.now()
    expires = (now + timedelta(days=7)).isoformat()

    c.execute("""INSERT INTO sessions (user_id, session_token, created_at, expires_at)
                 VALUES (?, ?, ?, ?)""",
              (user_id, session_token, now.isoformat(), expires))

    # Обновить last_login
    c.execute("UPDATE users SET last_login = ? WHERE id = ?",
              (now.isoformat(), user_id))

    conn.commit()
    conn.close()

    return session_token


def get_user_by_session(session_token: str) -> Optional[Dict]:
    """Получить пользователя по токену сессии"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    now = datetime.now().isoformat()

    c.execute("""SELECT u.id, u.username, u.full_name, u.email, u.role
                 FROM users u
                 JOIN sessions s ON u.id = s.user_id
                 WHERE s.session_token = ? AND s.expires_at > ? AND u.is_active = 1""",
              (session_token, now))

    user = c.fetchone()
    conn.close()

    if user:
        return {
            "id": user[0],
            "username": user[1],
            "full_name": user[2],
            "email": user[3],
            "role": user[4]
        }
    return None


def delete_session(session_token: str):
    """Удалить сессию (выход)"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    c.execute("DELETE FROM sessions WHERE session_token = ?", (session_token,))
    conn.commit()
    conn.close()


def log_activity(user_id: int, action: str, entity_type: str,
                 entity_id: str, details: str = None):
    """Залогировать действие пользователя"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    now = datetime.now().isoformat()

    c.execute("""INSERT INTO activity_log 
                 (user_id, action, entity_type, entity_id, details, timestamp)
                 VALUES (?, ?, ?, ?, ?, ?)""",
              (user_id, action, entity_type, entity_id, details, now))

    conn.commit()
    conn.close()


def get_client_by_id(instagram_id: str):
    """Получить клиента по ID"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    c.execute("""SELECT instagram_id, username, phone, name, first_contact, 
                 last_contact, total_messages, labels, status, lifetime_value,
                 profile_pic, notes, is_pinned, detected_language
                 FROM clients WHERE instagram_id = ?""", (instagram_id,))

    client = c.fetchone()
    conn.close()
    return client


def update_client_info(instagram_id: str, name: str = None, phone: str = None, notes: str = None) -> bool:
    """Обновить информацию о клиенте"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    try:
        updates = []
        params = []

        if name is not None:
            updates.append("name = ?")
            params.append(name)

        if phone is not None:
            updates.append("phone = ?")
            params.append(phone)

        if notes is not None:
            updates.append("notes = ?")
            params.append(notes)

        if updates:
            params.append(instagram_id)
            query = f"UPDATE clients SET {', '.join(updates)} WHERE instagram_id = ?"
            c.execute(query, params)
            conn.commit()

        conn.close()
        return True
    except Exception as e:
        print(f"Ошибка обновления клиента: {e}")
        conn.close()
        return False


def update_client_status(instagram_id: str, status: str):
    """Обновить статус клиента"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    c.execute("UPDATE clients SET status = ? WHERE instagram_id = ?",
              (status, instagram_id))

    conn.commit()
    conn.close()


def pin_client(instagram_id: str, pinned: bool = True):
    """Закрепить/открепить клиента"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    c.execute("UPDATE clients SET is_pinned = ? WHERE instagram_id = ?",
              (1 if pinned else 0, instagram_id))

    conn.commit()
    conn.close()


def mark_messages_as_read(instagram_id: str, user_id: int = None):
    """Отметить сообщения как прочитанные"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    c.execute("""UPDATE chat_history 
                 SET is_read = 1 
                 WHERE instagram_id = ? AND sender = 'client' AND is_read = 0""",
              (instagram_id,))

    conn.commit()
    conn.close()


def get_unread_messages_count(instagram_id: str) -> int:
    """Получить количество непрочитанных сообщений"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    c.execute("""SELECT COUNT(*) FROM chat_history 
                 WHERE instagram_id = ? AND sender = 'client' AND is_read = 0""",
              (instagram_id,))

    count = c.fetchone()[0]
    conn.close()

    return count


def get_or_create_client(instagram_id: str, username: str = None):
    """Получить или создать клиента"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    c.execute("SELECT * FROM clients WHERE instagram_id = ?", (instagram_id,))
    client = c.fetchone()

    if not client:
        now = datetime.now().isoformat()
        c.execute("""INSERT INTO clients 
                     (instagram_id, username, first_contact, last_contact, total_messages, labels, status, detected_language)
                     VALUES (?, ?, ?, ?, 0, ?, ?, ?)""",
                  (instagram_id, username, now, now, "Новый клиент", "new", "ru"))
        conn.commit()
        print(f"✨ Новый клиент: {instagram_id}")
    else:
        now = datetime.now().isoformat()
        c.execute("UPDATE clients SET last_contact = ?, total_messages = total_messages + 1 WHERE instagram_id = ?",
                  (now, instagram_id))
        conn.commit()

    conn.close()


def save_message(instagram_id: str, message: str, sender: str, language: str = None, message_type: str = 'text'):
    """Сохранить сообщение"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    now = datetime.now().isoformat()
    is_read = 1 if sender == 'bot' else 0

    c.execute("""INSERT INTO chat_history 
                 (instagram_id, message, sender, timestamp, language, is_read, message_type)
                 VALUES (?, ?, ?, ?, ?, ?, ?)""",
              (instagram_id, message, sender, now, language, is_read, message_type))

    conn.commit()
    conn.close()


def get_chat_history(instagram_id: str, limit: int = 10):
    """Получить историю чата"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    c.execute("""SELECT message, sender, timestamp, message_type FROM chat_history 
                 WHERE instagram_id = ? 
                 ORDER BY timestamp DESC LIMIT ?""",
              (instagram_id, limit))

    history = c.fetchall()
    conn.close()

    return list(reversed(history))


def get_booking_progress(instagram_id: str) -> Optional[Dict]:
    """Получить прогресс записи"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    c.execute("SELECT * FROM booking_temp WHERE instagram_id = ?", (instagram_id,))
    row = c.fetchone()
    conn.close()

    if row:
        return {
            "instagram_id": row[0],
            "service_name": row[1],
            "date": row[2],
            "time": row[3],
            "phone": row[4],
            "name": row[5],
            "step": row[6]
        }
    return None


def update_booking_progress(instagram_id: str, data: Dict):
    """Обновить прогресс записи"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    c.execute("""INSERT OR REPLACE INTO booking_temp 
                 (instagram_id, service_name, date, time, phone, name, step)
                 VALUES (?, ?, ?, ?, ?, ?, ?)""",
              (instagram_id, data.get('service_name'), data.get('date'),
               data.get('time'), data.get('phone'), data.get('name'), data.get('step')))

    conn.commit()
    conn.close()


def clear_booking_progress(instagram_id: str):
    """Очистить прогресс записи"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    c.execute("DELETE FROM booking_temp WHERE instagram_id = ?", (instagram_id,))
    conn.commit()
    conn.close()


def save_booking(instagram_id: str, service: str, datetime_str: str, phone: str, name: str, special_package_id: int = None):
    """Сохранить завершённую запись"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    now = datetime.now().isoformat()
    c.execute("""INSERT INTO bookings 
                 (instagram_id, service_name, datetime, phone, name, status, created_at, special_package_id)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
              (instagram_id, service, datetime_str, phone, name, "pending", now, special_package_id))

    c.execute("UPDATE clients SET status = 'lead', phone = ?, name = ? WHERE instagram_id = ?",
              (phone, name, instagram_id))
    
    # Увеличиваем счетчик использования пакета если это спец. пакет
    if special_package_id:
        increment_package_usage(special_package_id)

    conn.commit()
    conn.close()


def update_booking_status(booking_id: int, status: str) -> bool:
    """Обновить статус записи"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    try:
        if status == 'completed':
            completed_at = datetime.now().isoformat()
            c.execute("""UPDATE bookings 
                        SET status = ?, completed_at = ? 
                        WHERE id = ?""",
                      (status, completed_at, booking_id))
        else:
            c.execute("UPDATE bookings SET status = ? WHERE id = ?",
                      (status, booking_id))

        conn.commit()
        success = c.rowcount > 0
        conn.close()
        return success
    except Exception as e:
        print(f"Ошибка обновления статуса: {e}")
        conn.close()
        return False


def get_all_clients():
    """Получить всех клиентов"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    try:
        c.execute("""SELECT instagram_id, username, phone, name, first_contact, 
                     last_contact, total_messages, labels, status, lifetime_value,
                     profile_pic, notes, is_pinned 
                     FROM clients ORDER BY is_pinned DESC, last_contact DESC""")
    except sqlite3.OperationalError:
        # Fallback для старой версии БД
        c.execute("""SELECT instagram_id, username, phone, name, first_contact, 
                     last_contact, total_messages, labels, 'new' as status, 0 as lifetime_value,
                     NULL as profile_pic, NULL as notes, 0 as is_pinned
                     FROM clients ORDER BY last_contact DESC""")

    clients = c.fetchall()
    conn.close()
    return clients


def get_all_bookings():
    """Получить все записи"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    try:
        c.execute("""SELECT id, instagram_id, service_name, datetime, phone, 
                     name, status, created_at, revenue 
                     FROM bookings ORDER BY created_at DESC""")
    except sqlite3.OperationalError:
        c.execute("""SELECT id, instagram_id, service_name, datetime, phone, 
                     name, status, created_at, 0 as revenue 
                     FROM bookings ORDER BY created_at DESC""")

    bookings = c.fetchall()
    conn.close()
    return bookings


def get_all_messages(limit: int = 100):
    """Получить все сообщения"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    c.execute("""SELECT id, instagram_id, message, sender, timestamp 
                 FROM chat_history ORDER BY timestamp DESC LIMIT ?""", (limit,))

    messages = c.fetchall()
    conn.close()
    return messages


def get_stats():
    """Получить статистику"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    c.execute("SELECT COUNT(*) FROM clients")
    total_clients = c.fetchone()[0]

    c.execute("SELECT COUNT(*) FROM bookings")
    total_bookings = c.fetchone()[0]

    c.execute("SELECT COUNT(*) FROM bookings WHERE status='completed'")
    completed_bookings = c.fetchone()[0]

    c.execute("SELECT COUNT(*) FROM bookings WHERE status='pending'")
    pending_bookings = c.fetchone()[0]

    c.execute("SELECT COUNT(*) FROM chat_history WHERE sender='client'")
    total_client_messages = c.fetchone()[0]

    c.execute("SELECT COUNT(*) FROM chat_history WHERE sender='bot'")
    total_bot_messages = c.fetchone()[0]

    try:
        c.execute("SELECT SUM(revenue) FROM bookings WHERE status='completed'")
        total_revenue = c.fetchone()[0] or 0
    except sqlite3.OperationalError:
        total_revenue = 0

    try:
        c.execute("SELECT COUNT(*) FROM clients WHERE status='new'")
        new_clients = c.fetchone()[0]

        c.execute("SELECT COUNT(*) FROM clients WHERE status='lead'")
        leads = c.fetchone()[0]

        c.execute("SELECT COUNT(*) FROM clients WHERE status='customer'")
        customers = c.fetchone()[0]
    except sqlite3.OperationalError:
        new_clients = total_clients
        leads = 0
        customers = 0

    conn.close()

    conversion_rate = (completed_bookings / total_clients *
                       100) if total_clients > 0 else 0

    return {
        "total_clients": total_clients,
        "total_bookings": total_bookings,
        "completed_bookings": completed_bookings,
        "pending_bookings": pending_bookings,
        "total_client_messages": total_client_messages,
        "total_bot_messages": total_bot_messages,
        "total_revenue": round(total_revenue, 2),
        "new_clients": new_clients,
        "leads": leads,
        "customers": customers,
        "conversion_rate": round(conversion_rate, 2)
    }


def get_analytics_data(days=30, date_from=None, date_to=None):
    """Получить данные для аналитики с периодом"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    if date_from and date_to:
        start_date = date_from
        end_date = date_to
    else:
        start_date = (datetime.now() - timedelta(days=days)).isoformat()
        end_date = datetime.now().isoformat()

    c.execute("""SELECT DATE(created_at) as date, COUNT(*) as count
                 FROM bookings 
                 WHERE created_at >= ? AND created_at <= ?
                 GROUP BY DATE(created_at)
                 ORDER BY date""", (start_date, end_date))
    bookings_by_day = c.fetchall()

    if not bookings_by_day:
        bookings_by_day = [(datetime.now().strftime('%Y-%m-%d'), 0)]

    c.execute("""SELECT service_name, COUNT(*) as count, SUM(revenue) as revenue
                 FROM bookings 
                 WHERE created_at >= ? AND created_at <= ?
                 GROUP BY service_name 
                 ORDER BY count DESC""", (start_date, end_date))
    services_stats = c.fetchall()

    if not services_stats:
        services_stats = [("Нет данных", 0, 0)]

    c.execute("""SELECT status, COUNT(*) as count
                 FROM bookings 
                 WHERE created_at >= ? AND created_at <= ?
                 GROUP BY status""", (start_date, end_date))
    status_stats = c.fetchall()

    if not status_stats:
        status_stats = [("pending", 0)]

    c.execute("""SELECT 
                    AVG((julianday(bot.timestamp) - julianday(client.timestamp)) * 24 * 60) as avg_minutes
                 FROM chat_history client
                 JOIN chat_history bot ON client.instagram_id = bot.instagram_id
                 WHERE client.sender = 'client' 
                 AND bot.sender = 'bot'
                 AND bot.id > client.id
                 AND bot.timestamp >= ? AND bot.timestamp <= ?
                 LIMIT 100""", (start_date, end_date))

    result = c.fetchone()
    avg_response = result[0] if result and result[0] else 2.5

    conn.close()

    return {
        "bookings_by_day": bookings_by_day,
        "services_stats": services_stats,
        "status_stats": status_stats,
        "avg_response_time": round(avg_response, 2) if avg_response else 2.5
    }


def get_funnel_data():
    """Получить данные воронки продаж"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    c.execute("SELECT COUNT(*) FROM clients")
    total_visitors = c.fetchone()[0]

    c.execute("SELECT COUNT(*) FROM clients WHERE total_messages > 0")
    engaged = c.fetchone()[0]

    c.execute("SELECT COUNT(DISTINCT instagram_id) FROM booking_temp")
    started_booking = c.fetchone()[0]

    c.execute("SELECT COUNT(*) FROM bookings WHERE status='pending'")
    booked = c.fetchone()[0]

    c.execute("SELECT COUNT(*) FROM bookings WHERE status='completed'")
    completed = c.fetchone()[0]

    conn.close()

    total_visitors = max(total_visitors, 1)
    engaged = max(engaged, 1)
    started_booking = max(started_booking, 1)
    booked = max(booked, 1)

    return {
        "visitors": total_visitors,
        "engaged": engaged,
        "started_booking": started_booking,
        "booked": booked,
        "completed": completed,
        "conversion_rates": {
            "visitor_to_engaged": round((engaged / total_visitors * 100), 2),
            "engaged_to_booking": round((started_booking / engaged * 100), 2),
            "booking_to_booked": round((booked / started_booking * 100), 2),
            "booked_to_completed": round((completed / booked * 100) if booked > 0 else 0, 2)
        }
    }


def get_custom_statuses():
    """Получить все кастомные статусы"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    c.execute("SELECT * FROM custom_statuses ORDER BY created_at DESC")
    statuses = c.fetchall()

    conn.close()
    return statuses


def create_custom_status(status_key: str, status_label: str, status_color: str,
                         status_icon: str, created_by: int) -> bool:
    """Создать новый кастомный статус"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    try:
        now = datetime.now().isoformat()
        c.execute("""INSERT INTO custom_statuses 
                     (status_key, status_label, status_color, status_icon, created_at, created_by)
                     VALUES (?, ?, ?, ?, ?, ?)""",
                  (status_key, status_label, status_color, status_icon, now, created_by))
        conn.commit()
        conn.close()
        return True
    except sqlite3.IntegrityError:
        conn.close()
        return False


def delete_custom_status(status_key: str) -> bool:
    """Удалить кастомный статус"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    try:
        c.execute("DELETE FROM custom_statuses WHERE status_key = ?",
                  (status_key,))
        conn.commit()
        success = c.rowcount > 0
        conn.close()
        return success
    except Exception as e:
        print(f"Ошибка удаления статуса: {e}")
        conn.close()
        return False


def update_custom_status(status_key: str, status_label: str = None,
                         status_color: str = None, status_icon: str = None) -> bool:
    """Обновить кастомный статус"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    try:
        updates = []
        params = []

        if status_label:
            updates.append("status_label = ?")
            params.append(status_label)

        if status_color:
            updates.append("status_color = ?")
            params.append(status_color)

        if status_icon:
            updates.append("status_icon = ?")
            params.append(status_icon)

        if updates:
            params.append(status_key)
            query = f"UPDATE custom_statuses SET {', '.join(updates)} WHERE status_key = ?"
            c.execute(query, params)
            conn.commit()

        conn.close()
        return True
    except Exception as e:
        print(f"Ошибка обновления статуса: {e}")
        conn.close()
        return False


def get_notification_settings(user_id: int):
    """Получить настройки уведомлений пользователя"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    c.execute("""SELECT email_notifications, sms_notifications, 
                        booking_notifications, birthday_reminders, 
                        birthday_days_advance
                 FROM notification_settings 
                 WHERE user_id = ?""", (user_id,))
    
    result = c.fetchone()
    conn.close()
    
    if result:
        return {
            "email_notifications": bool(result[0]),
            "sms_notifications": bool(result[1]),
            "booking_notifications": bool(result[2]),
            "birthday_reminders": bool(result[3]),
            "birthday_days_advance": result[4]
        }
    
    # Дефолт
    return {
        "email_notifications": True,
        "sms_notifications": False,
        "booking_notifications": True,
        "birthday_reminders": True,
        "birthday_days_advance": 7
    }


def save_notification_settings(user_id: int, settings: dict):
    """Сохранить настройки уведомлений"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    # Проверить есть ли уже
    c.execute("SELECT id FROM notification_settings WHERE user_id = ?", (user_id,))
    exists = c.fetchone()
    
    if exists:
        c.execute("""UPDATE notification_settings SET
                    email_notifications = ?,
                    sms_notifications = ?,
                    booking_notifications = ?,
                    birthday_reminders = ?,
                    birthday_days_advance = ?
                    WHERE user_id = ?""",
                  (settings.get('email_notifications', True),
                   settings.get('sms_notifications', False),
                   settings.get('booking_notifications', True),
                   settings.get('birthday_reminders', True),
                   settings.get('birthday_days_advance', 7),
                   user_id))
    else:
        c.execute("""INSERT INTO notification_settings
                    (user_id, email_notifications, sms_notifications,
                     booking_notifications, birthday_reminders, birthday_days_advance)
                    VALUES (?, ?, ?, ?, ?, ?)""",
                  (user_id,
                   settings.get('email_notifications', True),
                   settings.get('sms_notifications', False),
                   settings.get('booking_notifications', True),
                   settings.get('birthday_reminders', True),
                   settings.get('birthday_days_advance', 7)))
    
    conn.commit()
    conn.close()


def delete_client(instagram_id: str) -> bool:
    """Удалить клиента и все его данные"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    try:
        # Удалить все сообщения клиента
        c.execute("""DELETE FROM chat_history 
                     WHERE instagram_id = ?""", (instagram_id,))
        
        # Удалить все записи клиента
        c.execute("""DELETE FROM bookings 
                     WHERE instagram_id = ?""", (instagram_id,))
        
        # Удалить прогресс записи если есть
        c.execute("""DELETE FROM booking_temp 
                     WHERE instagram_id = ?""", (instagram_id,))
        
        # Удалить взаимодействия клиента
        c.execute("""DELETE FROM client_interactions 
                     WHERE instagram_id = ?""", (instagram_id,))
        
        # Удалить самого клиента
        c.execute("""DELETE FROM clients 
                     WHERE instagram_id = ?""", (instagram_id,))
        
        conn.commit()
        success = c.rowcount > 0
        conn.close()
        
        if success:
            print(f"✅ Клиент {instagram_id} и все его данные удалены")
        
        return success
    except Exception as e:
        print(f"❌ Ошибка удаления клиента: {e}")
        conn.close()
        return False
    
def init_roles_table():
    """Создать таблицы для ролей и прав"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
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
    
    conn.commit()
    conn.close()


def get_all_roles():
    """Получить все роли (встроенные + кастомные)"""
    builtin_roles = [
        {
            'key': 'admin',
            'name': 'Администратор',
            'description': 'Полный доступ ко всем функциям',
            'is_custom': False
        },
        {
            'key': 'manager',
            'name': 'Менеджер',
            'description': 'Работа с клиентами и аналитикой',
            'is_custom': False
        },
        {
            'key': 'employee',
            'name': 'Сотрудник',
            'description': 'Базовые права - свои записи',
            'is_custom': False
        }
    ]
    
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    c.execute("SELECT role_key, role_name, role_description FROM custom_roles")
    custom_roles = c.fetchall()
    
    conn.close()
    
    for role in custom_roles:
        builtin_roles.append({
            'key': role[0],
            'name': role[1],
            'description': role[2],
            'is_custom': True
        })
    
    return builtin_roles


def create_custom_role(role_key: str, role_name: str, role_description: str, created_by: int) -> bool:
    """Создать кастомную роль"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    try:
        now = datetime.now().isoformat()
        c.execute("""INSERT INTO custom_roles 
                     (role_key, role_name, role_description, created_at, created_by)
                     VALUES (?, ?, ?, ?, ?)""",
                  (role_key, role_name, role_description, now, created_by))
        conn.commit()
        conn.close()
        return True
    except sqlite3.IntegrityError:
        conn.close()
        return False


def delete_custom_role(role_key: str) -> bool:
    """Удалить кастомную роль"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    # Проверить что это кастомная роль
    if role_key in ['admin', 'manager', 'employee']:
        conn.close()
        return False
    
    try:
        c.execute("DELETE FROM custom_roles WHERE role_key = ?", (role_key,))
        c.execute("DELETE FROM role_permissions WHERE role_key = ?", (role_key,))
        conn.commit()
        success = c.rowcount > 0
        conn.close()
        return success
    except Exception as e:
        print(f"Ошибка удаления роли: {e}")
        conn.close()
        return False


def get_role_permissions(role_key: str):
    """Получить права роли"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    c.execute("""SELECT permission_key, can_view, can_create, can_edit, can_delete
                 FROM role_permissions WHERE role_key = ?""", (role_key,))
    
    permissions = {}
    for row in c.fetchall():
        permissions[row[0]] = {
            'can_view': bool(row[1]),
            'can_create': bool(row[2]),
            'can_edit': bool(row[3]),
            'can_delete': bool(row[4])
        }
    
    conn.close()
    return permissions


def update_role_permissions(role_key: str, permissions: dict) -> bool:
    """Обновить права роли"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    try:
        # Удалить старые права
        c.execute("DELETE FROM role_permissions WHERE role_key = ?", (role_key,))
        
        # Добавить новые
        for perm_key, perms in permissions.items():
            c.execute("""INSERT INTO role_permissions 
                        (role_key, permission_key, can_view, can_create, can_edit, can_delete)
                        VALUES (?, ?, ?, ?, ?, ?)""",
                      (role_key, perm_key,
                       1 if perms.get('can_view') else 0,
                       1 if perms.get('can_create') else 0,
                       1 if perms.get('can_edit') else 0,
                       1 if perms.get('can_delete') else 0))
        
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print(f"Ошибка обновления прав: {e}")
        conn.rollback()
        conn.close()
        return False


def check_user_permission(user_id: int, permission_key: str, action: str) -> bool:
    """Проверить есть ли у пользователя право на действие
    
    Args:
        user_id: ID пользователя
        permission_key: ключ ресурса (clients, bookings, services и т.д.)
        action: действие (view, create, edit, delete)
    """
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    # Получить роль пользователя
    c.execute("SELECT role FROM users WHERE id = ?", (user_id,))
    result = c.fetchone()
    
    if not result:
        conn.close()
        return False
    
    role = result[0]
    
    # Админ имеет все права
    if role == 'admin':
        conn.close()
        return True
    
    # Проверить права роли
    column = f"can_{action}"
    c.execute(f"""SELECT {column} FROM role_permissions 
                  WHERE role_key = ? AND permission_key = ?""",
              (role, permission_key))
    
    result = c.fetchone()
    conn.close()
    
    return bool(result[0]) if result else False


# Список доступных прав (ресурсов)
AVAILABLE_PERMISSIONS = {
    'clients': 'Клиенты',
    'bookings': 'Записи',
    'services': 'Услуги',
    'analytics': 'Аналитика',
    'users': 'Пользователи',
    'settings': 'Настройки',
    'bot_settings': 'Настройки бота',
    'messages': 'Сообщения',
    'calendar': 'Календарь'
}


# ========================================
# НАСТРОЙКИ САЛОНА (ЕДИНЫЙ ИСТОЧНИК)
# ========================================

def get_salon_settings() -> dict:
    """
    Получить настройки салона из БД
    Возвращает дефолты если таблица не существует или пуста
    """
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    try:
        c.execute("SELECT * FROM salon_settings LIMIT 1")
        result = c.fetchone()
        
        if not result:
            log_warning("⚠️ Настройки салона пусты, используются дефолты", "database")
            return {
                "id": 1,
                "name": "M.Le Diamant Beauty Lounge",
                "name_ar": None,
                "address": "Shop 13, Amwaj 3 Plaza Level, JBR, Dubai",
                "address_ar": None,
                "google_maps": "https://maps.app.goo.gl/Puh5X1bNEjWPiToz6",
                "hours": "Daily 10:30 - 21:00",
                "hours_ru": "Ежедневно 10:30 - 21:00",
                "hours_ar": "يوميًا 10:30 - 21:00",
                "booking_url": "https://n1234567.yclients.com",
                "phone": "+971 XX XXX XXXX",
                "email": None,
                "instagram": None,
                "whatsapp": None,
                "bot_name": "M.Le Diamant Assistant",
                "bot_name_en": "M.Le Diamant Assistant",
                "bot_name_ar": "مساعد M.Le Diamant",
                "city": "Dubai",
                "country": "UAE",
                "timezone": "Asia/Dubai",
                "currency": "AED",
                "updated_at": None
            }
        
        # Парсинг результата
        return {
            "id": result[0] if len(result) > 0 else 1,
            "name": result[1] if len(result) > 1 else "M.Le Diamant",
            "name_ar": result[2] if len(result) > 2 else None,
            "address": result[3] if len(result) > 3 else "",
            "address_ar": result[4] if len(result) > 4 else None,
            "google_maps": result[5] if len(result) > 5 else "",
            "hours": result[6] if len(result) > 6 else "",
            "hours_ru": result[7] if len(result) > 7 else "",
            "hours_ar": result[8] if len(result) > 8 else "",
            "booking_url": result[9] if len(result) > 9 else "",
            "phone": result[10] if len(result) > 10 else "",
            "email": result[11] if len(result) > 11 else None,
            "instagram": result[12] if len(result) > 12 else None,
            "whatsapp": result[13] if len(result) > 13 else None,
            "bot_name": result[14] if len(result) > 14 else "Assistant",
            "bot_name_en": result[15] if len(result) > 15 else "Assistant",
            "bot_name_ar": result[16] if len(result) > 16 else "مساعد",
            "city": result[17] if len(result) > 17 else "Dubai",
            "country": result[18] if len(result) > 18 else "UAE",
            "timezone": result[19] if len(result) > 19 else "Asia/Dubai",
            "currency": result[20] if len(result) > 20 else "AED",
            "updated_at": result[21] if len(result) > 21 else None
        }
        
    except sqlite3.OperationalError as e:
        log_error(f"❌ Таблица salon_settings не существует: {e}", "database")
        log_warning("⚠️ Используются дефолтные настройки. Запустите: python backend/bot/migrate_bot_settings.py для полной конфигурации", "database")
        
        return {
            "id": 1,
            "name": "M.Le Diamant Beauty Lounge",
            "name_ar": None,
            "address": "Shop 13, Amwaj 3 Plaza Level, JBR, Dubai",
            "address_ar": None,
            "google_maps": "https://maps.app.goo.gl/Puh5X1bNEjWPiToz6",
            "hours": "Daily 10:30 - 21:00",
            "hours_ru": "Ежедневно 10:30 - 21:00",
            "hours_ar": "يوميًا 10:30 - 21:00",
            "booking_url": "https://n1234567.yclients.com",
            "phone": "+971 XX XXX XXXX",
            "email": None,
            "instagram": None,
            "whatsapp": None,
            "bot_name": "M.Le Diamant Assistant",
            "bot_name_en": "M.Le Diamant Assistant",
            "bot_name_ar": "مساعد M.Le Diamant",
            "city": "Dubai",
            "country": "UAE",
            "timezone": "Asia/Dubai",
            "currency": "AED",
            "updated_at": None
        }
    except Exception as e:
        log_error(f"❌ Непредвиденная ошибка: {e}", "database")
        raise
    finally:
        conn.close()

def update_salon_settings(data: dict) -> bool:
    """Обновить настройки салона"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    try:
        c.execute("""UPDATE salon_settings SET
                    name = ?, name_ar = ?, address = ?, address_ar = ?,
                    google_maps = ?, hours = ?, hours_ru = ?, hours_ar = ?,
                    booking_url = ?, phone = ?, email = ?, instagram = ?,
                    whatsapp = ?, bot_name = ?, bot_name_en = ?, bot_name_ar = ?,
                    city = ?, country = ?, timezone = ?, currency = ?,
                    updated_at = ?
                    WHERE id = 1""",
                  (data.get('name'),
                   data.get('name_ar'),
                   data.get('address'),
                   data.get('address_ar'),
                   data.get('google_maps'),
                   data.get('hours'),
                   data.get('hours_ru'),
                   data.get('hours_ar'),
                   data.get('booking_url'),
                   data.get('phone'),
                   data.get('email'),
                   data.get('instagram'),
                   data.get('whatsapp'),
                   data.get('bot_name'),
                   data.get('bot_name_en'),
                   data.get('bot_name_ar'),
                   data.get('city'),
                   data.get('country'),
                   data.get('timezone'),
                   data.get('currency')))
        
        conn.commit()
        log_info("✅ Настройки салона обновлены", "database")
        return True
    except Exception as e:
        log_error(f"Ошибка обновления настроек салона: {e}", "database")
        conn.rollback()
        return False
    finally:
        conn.close()


# ========================================
# НАСТРОЙКИ БОТА (ЕДИНЫЙ ИСТОЧНИК)
# ========================================

def get_bot_settings() -> dict:
    """
    Получить настройки бота из БД
    Возвращает дефолты если таблица не существует или пуста
    """
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    try:
        c.execute("SELECT * FROM bot_settings LIMIT 1")
        result = c.fetchone()
        
        if result:
            return {
                "id": result[0],
                "bot_name": result[1],
                "personality_traits": result[2],
                "greeting_message": result[3],
                "farewell_message": result[4],
                "price_explanation": result[5],
                "price_response_template": result[6],
                "premium_justification": result[7],
                "booking_redirect_message": result[8],
                "fomo_messages": result[9],
                "upsell_techniques": result[10],
                "communication_style": result[11],
                "max_message_length": result[12],
                "emoji_usage": result[13],
                "languages_supported": result[14],
                "objection_handling": result[15],
                "negative_handling": result[16],
                "safety_guidelines": result[17],
                "example_good_responses": result[18],
                "algorithm_actions": result[19],
                "location_features": result[20],
                "seasonality": result[21],
                "emergency_situations": result[22],
                "success_metrics": result[23],
                "objection_expensive": result[24] if len(result) > 24 else "",
                "objection_think_about_it": result[25] if len(result) > 25 else "",
                "objection_no_time": result[26] if len(result) > 26 else "",
                "objection_pain": result[27] if len(result) > 27 else "",
                "objection_result_doubt": result[28] if len(result) > 28 else "",
                "objection_cheaper_elsewhere": result[29] if len(result) > 29 else "",
                "objection_too_far": result[30] if len(result) > 30 else "",
                "objection_consult_husband": result[31] if len(result) > 31 else "",
                "objection_first_time": result[32] if len(result) > 32 else "",
                "objection_not_happy": result[33] if len(result) > 33 else "",
                "emotional_triggers": result[34] if len(result) > 34 else "",
                "social_proof_phrases": result[35] if len(result) > 35 else "",
                "personalization_rules": result[36] if len(result) > 36 else "",
                "example_dialogues": result[37] if len(result) > 37 else "",
                "emotional_responses": result[38] if len(result) > 38 else "",
                "anti_patterns": result[39] if len(result) > 39 else "",
                "voice_message_response": result[40] if len(result) > 40 else "",
                "contextual_rules": result[41] if len(result) > 41 else "",
                "updated_at": result[42] if len(result) > 42 else None
            }
        else:
            log_warning("⚠️ Настройки бота пусты, используются дефолты", "database")
            return _get_default_bot_settings()
            
    except sqlite3.OperationalError as e:
        log_error(f"❌ Таблица bot_settings не существует: {e}", "database")
        log_warning("⚠️ Используются дефолтные настройки бота. Запустите: python backend/bot/migrate_bot_settings.py для полной конфигурации", "database")
        return _get_default_bot_settings()
    except Exception as e:
        log_error(f"❌ Непредвиденная ошибка: {e}", "database")
        raise
    finally:
        conn.close()


def _get_default_bot_settings() -> dict:
    """Дефолтные настройки бота"""
    return {
        "id": 1,
        "bot_name": "M.Le Diamant Assistant",
        "personality_traits": "Обаятельная, уверенная, харизматичная, экспертная",
        "greeting_message": "Привет! 😊 Добро пожаловать в M.Le Diamant!",
        "farewell_message": "Спасибо за визит! 💖",
        "price_explanation": "Мы в премиум-сегменте 💎",
        "price_response_template": "{SERVICE} - {PRICE} {CURRENCY} 💎",
        "premium_justification": "",
        "booking_redirect_message": "Я AI-ассистент, запись онлайн за 2 минуты!\nВыбирайте мастера и время здесь: {BOOKING_URL}",
        "fomo_messages": "",
        "upsell_techniques": "",
        "communication_style": "Дружелюбный, экспертный, вдохновляющий",
        "max_message_length": 4,
        "emoji_usage": "Умеренное (2-3 на сообщение)",
        "languages_supported": "ru,en,ar",
        "objection_handling": "",
        "negative_handling": "",
        "safety_guidelines": "",
        "example_good_responses": "",
        "algorithm_actions": "",
        "location_features": "",
        "seasonality": "",
        "emergency_situations": "",
        "success_metrics": "",
        "objection_expensive": "",
        "objection_think_about_it": "",
        "objection_no_time": "",
        "objection_pain": "",
        "objection_result_doubt": "",
        "objection_cheaper_elsewhere": "",
        "objection_too_far": "",
        "objection_consult_husband": "",
        "objection_first_time": "",
        "objection_not_happy": "",
        "emotional_triggers": "",
        "social_proof_phrases": "",
        "personalization_rules": "",
        "example_dialogues": "",
        "emotional_responses": "",
        "anti_patterns": "",
        "voice_message_response": "Извините, я AI-помощник и не могу прослушивать голосовые 😊\nПожалуйста, напишите текстом!",
        "contextual_rules": "",
        "updated_at": None
    }

# ========================================
# ПАТЧ ДЛЯ backend/database.py
# ========================================
# Замените функцию update_bot_settings() на эту версию

def update_bot_settings(data: dict) -> bool:
    """
    Обновить настройки бота
    ✅ ИСПРАВЛЕНО: теперь корректно обрабатывает все поля
    ✅ ИСПРАВЛЕНО: мержит новые данные с текущими
    """
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    try:
        # ✅ Получаем текущие настройки чтобы заполнить пропущенные поля
        c.execute("SELECT * FROM bot_settings LIMIT 1")
        result = c.fetchone()
        
        if not result:
            log_error("❌ Настройки бота не найдены! Запустите: python migrate_bot_settings.py", "database")
            conn.close()
            return False
        
        # Парсим текущие настройки
        current = {
            "bot_name": result[1],
            "personality_traits": result[2],
            "greeting_message": result[3],
            "farewell_message": result[4],
            "price_explanation": result[5],
            "price_response_template": result[6],
            "premium_justification": result[7],
            "booking_redirect_message": result[8],
            "fomo_messages": result[9],
            "upsell_techniques": result[10],
            "communication_style": result[11],
            "max_message_length": result[12],
            "emoji_usage": result[13],
            "languages_supported": result[14],
            "objection_handling": result[15],
            "negative_handling": result[16],
            "safety_guidelines": result[17],
            "example_good_responses": result[18],
            "algorithm_actions": result[19],
            "location_features": result[20],
            "seasonality": result[21],
            "emergency_situations": result[22],
            "success_metrics": result[23],
        }
        
        # ✅ Мержим: новые данные поверх текущих
        merged = {**current, **data}
        
        c.execute("""UPDATE bot_settings SET
            bot_name = ?,
            personality_traits = ?,
            greeting_message = ?,
            farewell_message = ?,
            price_explanation = ?,
            price_response_template = ?,
            premium_justification = ?,
            booking_redirect_message = ?,
            fomo_messages = ?,
            upsell_techniques = ?,
            communication_style = ?,
            max_message_length = ?,
            emoji_usage = ?,
            languages_supported = ?,
            objection_handling = ?,
            negative_handling = ?,
            safety_guidelines = ?,
            example_good_responses = ?,
            algorithm_actions = ?,
            location_features = ?,
            seasonality = ?,
            emergency_situations = ?,
            success_metrics = ?,
            objection_expensive = ?,
            objection_think_about_it = ?,
            objection_no_time = ?,
            objection_pain = ?,
            objection_result_doubt = ?,
            objection_cheaper_elsewhere = ?,
            objection_too_far = ?,
            objection_consult_husband = ?,
            objection_first_time = ?,
            objection_not_happy = ?,
            emotional_triggers = ?,
            social_proof_phrases = ?,
            personalization_rules = ?,
            example_dialogues = ?,
            emotional_responses = ?,
            anti_patterns = ?,
            voice_message_response = ?,
            contextual_rules = ?,
            updated_at = CURRENT_TIMESTAMP
            WHERE id = 1""",
          (merged.get('bot_name'),
           merged.get('personality_traits'),
           merged.get('greeting_message'),
           merged.get('farewell_message'),
           merged.get('price_explanation'),
           merged.get('price_response_template'),
           merged.get('premium_justification'),
           merged.get('booking_redirect_message'),
           merged.get('fomo_messages'),
           merged.get('upsell_techniques'),
           merged.get('communication_style'),
           merged.get('max_message_length', 4),
           merged.get('emoji_usage'),
           merged.get('languages_supported'),
           merged.get('objection_handling'),
           merged.get('negative_handling'),
           merged.get('safety_guidelines'),
           merged.get('example_good_responses'),
           merged.get('algorithm_actions'),
           merged.get('location_features'),
           merged.get('seasonality'),
           merged.get('emergency_situations'),
           merged.get('success_metrics'),
           merged.get('objection_expensive', ''),
           merged.get('objection_think_about_it', ''),
           merged.get('objection_no_time', ''),
           merged.get('objection_pain', ''),
           merged.get('objection_result_doubt', ''),
           merged.get('objection_cheaper_elsewhere', ''),
           merged.get('objection_too_far', ''),
           merged.get('objection_consult_husband', ''),
           merged.get('objection_first_time', ''),
           merged.get('objection_not_happy', ''),
           merged.get('emotional_triggers', ''),
           merged.get('social_proof_phrases', ''),
           merged.get('personalization_rules', ''),
           merged.get('example_dialogues', ''),
           merged.get('emotional_responses', ''),
           merged.get('anti_patterns', ''),
           merged.get('voice_message_response', ''),
           merged.get('contextual_rules', '')))
        
        conn.commit()
        
        if c.rowcount > 0:
            log_info(f"✅ Настройки бота обновлены ({c.rowcount} записей)", "database")
            return True
        else:
            log_error("⚠️ Не удалось обновить настройки бота (0 записей)", "database")
            return False
            
    except Exception as e:
        log_error(f"❌ Ошибка обновления настроек бота: {e}", "database")
        import traceback
        log_error(traceback.format_exc(), "database")
        conn.rollback()
        return False
    finally:
        conn.close()