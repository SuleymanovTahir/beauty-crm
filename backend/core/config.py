# backend/config.py
# ✅ Импортируйте get_salon_settings() из database.py когда нужны настройки салона

import os
try:
    from dotenv import load_dotenv
    HAS_DOTENV = True
except ImportError:
    HAS_DOTENV = False
    def load_dotenv(*args, **kwargs):
        pass  # Заглушка если dotenv не установлен
from datetime import datetime

import socket

# Кэш для результата is_localhost (чтобы не вызывать DNS lookup каждый раз)
_IS_LOCALHOST_CACHE = None

def is_localhost() -> bool:
    """
    Проверяет, запущено ли приложение на localhost (с кэшированием)

    ОПТИМИЗАЦИЯ: Убран медленный socket.gethostbyname() - он делает DNS lookup
    который может занимать 5+ секунд! Проверяем только hostname.
    """
    global _IS_LOCALHOST_CACHE

    # Возвращаем кэшированный результат
    if _IS_LOCALHOST_CACHE is not None:
        return _IS_LOCALHOST_CACHE

    try:
        hostname = socket.gethostname()

        # Быстрая проверка по hostname (БЕЗ DNS lookup!)
        # Проверяем только hostname, НЕ делаем gethostbyname (медленно!)
        is_local = (
            hostname in ['localhost', '127.0.0.1', 'runsc'] or  # runsc = Docker/sandbox
            'MacBook' in hostname or
            'local' in hostname.lower() or
            hostname.startswith('192.168.') or
            hostname.startswith('10.')
        )

        print(f"🔍 Hostname: {hostname}")
        print(f"🔍 IP: 127.0.0.1")  # Предполагаем localhost
        print(f"🔍 Is localhost: {is_local}")

        _IS_LOCALHOST_CACHE = is_local
        return is_local
    except Exception as e:
        print(f"⚠️ Ошибка определения localhost: {e}")
        _IS_LOCALHOST_CACHE = True  # По умолчанию считаем localhost (безопаснее)
        return True

# ===== АВТООПРЕДЕЛЕНИЕ ОКРУЖЕНИЯ =====

# ===== АВТООПРЕДЕЛЕНИЕ ОКРУЖЕНИЯ =====

print("=" * 70)
print("🔍 ОПРЕДЕЛЕНИЕ ОКРУЖЕНИЯ")
print("=" * 70)

# 1. Проверяем системные переменные (НЕ из .env файлов!)
system_env = os.getenv("ENVIRONMENT")
print(f"Системная переменная ENVIRONMENT: {system_env or 'не установлена'}")

# 2. Определяем окружение по сети (localhost vs сервер)
localhost_check = is_localhost()

if system_env in ['production', 'development']:
    # Если явно указано в системе - используем его
    environment = system_env
    print(f"✅ Используем системную переменную: {environment}")
elif localhost_check:
    # Если запущено на localhost - всегда development
    environment = "development"
    print("✅ Автоопределение: LOCALHOST → development")
else:
    # Иначе - production
    environment = "production"
    print("✅ Автоопределение: SERVER → production")

print("=" * 70)

# 3. Загружаем единый .env файл
# ENVIRONMENT уже определён автоматически выше (по localhost)
if os.path.exists(".env"):
    load_dotenv(".env", override=True)
    print(f"✅ Загружен: .env")
else:
    print(f"⚠️ Файл .env не найден, используем системные переменные")

# 4. Принудительно устанавливаем автоопределённое ENVIRONMENT
# (игнорируем значение из файла если оно отличается)
os.environ["ENVIRONMENT"] = environment
print(f"✅ ENVIRONMENT = {environment} (автоопределение по hostname)")

# Подавление логов
os.environ['GRPC_VERBOSITY'] = 'ERROR'
os.environ['GLOG_minloglevel'] = '2'
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'

# ===== ВЕРСИЯ ДЛЯ КЭШИРОВАНИЯ =====
CSS_VERSION = datetime.now().strftime('%Y%m%d%H%M%S')

# === SALON CONTACTS (SSOT) ===
SALON_PHONE_DEFAULT = "971526961100"
SALON_EMAIL_DEFAULT = "mladiamontuae@gmail.com"

# ===== ТОКЕНЫ И КЛЮЧИ (из .env) =====
SALON_LAT = float(os.getenv("SALON_LAT", "25.07398834046777"))
SALON_LON = float(os.getenv("SALON_LON", "55.13161571633984"))
VERIFY_TOKEN = os.getenv("VERIFY_TOKEN", "taha")
PAGE_ACCESS_TOKEN = os.getenv("PAGE_ACCESS_TOKEN")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.0-flash-exp")
INSTAGRAM_BUSINESS_ID = os.getenv("INSTAGRAM_BUSINESS_ID", "17841448618072548")

# Flag to control visibility of scheduler start messages
SHOW_SCHEDULER_START = False  # Set to True to show the start log
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")

# Get the backend directory (parent of core/)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# ===== DATABASE CONFIGURATION (PostgreSQL Only) =====
# Принудительно используем PostgreSQL
DATABASE_TYPE = "postgresql"
DATABASE_NAME = os.getenv('POSTGRES_DB', 'beauty_crm')

POSTGRES_CONFIG = {
    'host': os.getenv('POSTGRES_HOST', 'localhost'),
    'port': os.getenv('POSTGRES_PORT', '5432'),
    'database': os.getenv('POSTGRES_DB', 'beauty_crm'),
    'user': os.getenv('POSTGRES_USER', 'beauty_crm_user'),
    'password': os.getenv('POSTGRES_PASSWORD', '')
}
print(f"✅ Database: PostgreSQL ({POSTGRES_CONFIG['database']} @ {POSTGRES_CONFIG['host']})")

UPLOAD_DIR = os.path.join(BASE_DIR, "static", "uploads")

# ✅ Универсальный BASE_URL с автоопределением окружения
# Приоритет: 
# 1. Переменная окружения BASE_URL (если установлена)
# 2. http://localhost:{PORT} (если мы на локалке)
# 3. PRODUCTION_URL env variable or error (fallback для продакшена)
_env_base_url = os.getenv("BASE_URL")
_env_port = os.getenv("PORT", "8000")

if _env_base_url:
    BASE_URL = _env_base_url
    PUBLIC_URL = os.getenv("PUBLIC_URL") or _env_base_url
elif is_localhost():
    BASE_URL = f"http://localhost:{_env_port}"
    PUBLIC_URL = f"http://localhost:{_env_port}"
else:
    # Production: требуется установить PRODUCTION_URL
    BASE_URL = os.getenv("PRODUCTION_URL", "https://your-domain.com")
    PUBLIC_URL = os.getenv("PUBLIC_URL") or BASE_URL

# ===== СТАТУСЫ КЛИЕНТОВ =====
CLIENT_STATUSES = {
    "new": {"label": "Новый", "color": "#3b82f6", "icon": "user-plus"},
    "contacted": {"label": "Связались", "color": "#8b5cf6", "icon": "phone"},
    "interested": {"label": "Заинтересован", "color": "#f59e0b", "icon": "star"},
    "lead": {"label": "Лид", "color": "#f59e0b", "icon": "user-clock"},
    "booking_started": {"label": "Начал запись", "color": "#10b981", "icon": "calendar-plus"},
    "booked": {"label": "Записан", "color": "#06b6d4", "icon": "calendar-check"},
    "customer": {"label": "Клиент", "color": "#10b981", "icon": "user-check"},
    "vip": {"label": "VIP", "color": "#ec4899", "icon": "crown"},
    "inactive": {"label": "Неактивен", "color": "#6b7280", "icon": "user-minus"},
    "blocked": {"label": "Заблокирован", "color": "#ef4444", "icon": "ban"}
}

# ===== ПРОВЕРКА ОБЯЗАТЕЛЬНЫХ ПЕРЕМЕННЫХ =====
# Пропускаем проверку если запускаются миграции или если dotenv не установлен
import sys
is_running_migrations = 'migrations' in sys.argv[0] or 'run_all_migrations' in sys.argv[0]

if HAS_DOTENV and not is_running_migrations:
    required_vars = {
        "PAGE_ACCESS_TOKEN": PAGE_ACCESS_TOKEN,
        "GEMINI_API_KEY": GEMINI_API_KEY,
    }

    missing_vars = [var_name for var_name, var_value in required_vars.items() if not var_value]

    if missing_vars:
        print(f"⚠️ Не установлены переменные окружения: {', '.join(missing_vars)}")
        # Не бросаем исключение для миграций

print("✅ Config загружен успешно!")
print(f"   Database: {os.getenv('POSTGRES_DB', 'beauty_crm')} ({DATABASE_TYPE})")
# Перед строкой if __name__ == "__main__":

# ===== СИСТЕМА РОЛЕЙ И ПРАВ =====

ROLES = {
    'director': {
        'name': 'Директор',
        'permissions': '*',  # Все права
        'can_manage_roles': ['admin', 'manager', 'sales', 'marketer', 'employee'],
        'hierarchy_level': 100
    },
    'admin': {
        'name': 'Администратор',
        'permissions': [
            'clients_view', 'clients_create', 'clients_edit', 'clients_delete',
            'bookings_view', 'bookings_create', 'bookings_edit', 'bookings_delete',
            'services_view', 'services_edit',
            'users_view', 'users_create', 'users_edit',
            'analytics_view_anonymized',
            'staff_chat_own',
            'calendar_view_all',
            'bot_settings_view',
            'broadcasts_send'
        ],
        'can_manage_roles': ['manager', 'sales', 'marketer', 'employee'],
        'hierarchy_level': 80
    },
    'manager': {
        'name': 'Менеджер',
        'permissions': [
            'clients_view', 'clients_create', 'clients_edit',
            'bookings_view', 'bookings_create', 'bookings_edit',
            'services_view',
            'analytics_view_anonymized',
            'staff_chat_own',
            'calendar_view_all'
        ],
        'can_manage_roles': [],
        'hierarchy_level': 60
    },
    'sales': {
        'name': 'Продажник',
        'permissions': [
            'instagram_chat_view',
            'clients_view_limited',
            'analytics_view_stats_only',
            'staff_chat_own',
            'calendar_view_all',           # Полный доступ к календарю (для просмотра и записи)
            'bot_settings_view',
            'bookings_create',             # Право создавать записи
            'bookings_view',               # Право просматривать записи
            'telephony_access'             # Доступ к телефонии для звонков
        ],
        'can_manage_roles': [],
        'hierarchy_level': 40
    },
    'marketer': {
        'name': 'Таргетолог',
        'permissions': [
            'analytics_view_anonymized',
            'clients_view_stats_only',
            'staff_chat_own'
        ],
        'can_manage_roles': [],
        'hierarchy_level': 30
    },
    'employee': {
        'name': 'Сотрудник (мастер)',
        'permissions': [
            'bookings_view_own',
            'calendar_view_own',
            'clients_view_own',
            'staff_chat_own',
            'tasks_view_own',       # Просмотр своих задач
            'services_view'         # Просмотр каталога услуг (readonly)
        ],
        'can_manage_roles': [],
        'hierarchy_level': 20
    }
}

PERMISSION_DESCRIPTIONS = {
    # Клиенты
    'clients_view': 'Просмотр всех клиентов (с контактами)',
    'clients_view_limited': 'Просмотр клиентов (без персональных данных)',
    'clients_view_own': 'Просмотр только своих клиентов',
    'clients_view_stats_only': 'Просмотр только статистики клиентов',
    'clients_create': 'Создание клиентов',
    'clients_edit': 'Редактирование клиентов',
    'clients_delete': 'Удаление клиентов',
    
    # Записи
    'bookings_view': 'Просмотр всех записей',
    'bookings_view_own': 'Просмотр только своих записей',
    'bookings_create': 'Создание записей',
    'bookings_edit': 'Редактирование записей',
    'bookings_delete': 'Удаление записей',
    
    # Календарь
    'calendar_view_all': 'Просмотр календаря всех сотрудников',
    'calendar_view_all_readonly': 'Просмотр календаря всех (только чтение)',
    'calendar_view_own': 'Просмотр только своего календаря',
    
    # Услуги
    'services_view': 'Просмотр услуг',
    'services_edit': 'Редактирование услуг',
    
    # Пользователи
    'users_view': 'Просмотр пользователей',
    'users_create': 'Создание пользователей',
    'users_edit': 'Редактирование пользователей',
    'users_delete': 'Удаление пользователей',
    
    # Аналитика
    'analytics_view': 'Полный доступ к аналитике',
    'analytics_view_anonymized': 'Аналитика без персональных данных',
    'analytics_view_stats_only': 'Только статистика (количество, статусы)',
    'analytics_export_full': 'Экспорт данных с контактами',
    'analytics_export_anonymized': 'Экспорт анонимных данных',
    
    # Instagram
    'instagram_chat_view': 'Просмотр Instagram чата',
    'instagram_chat_reply': 'Ответы в Instagram',
    
    # Чат сотрудников
    'staff_chat_own': 'Свои диалоги с другими сотрудниками',
    'staff_chat_view_all': 'Просмотр всех чатов сотрудников',
    
    # Настройки
    'settings_view': 'Просмотр настроек',
    'settings_edit': 'Изменение настроек',
    'bot_settings_view': 'Просмотр настроек бота',
    'bot_settings_edit': 'Настройки бота',

    # Телефония
    'telephony_access': 'Доступ к телефонии для звонков клиентам',

    # Задачи
    'tasks_view': 'Просмотр всех задач',
    'tasks_view_own': 'Просмотр только своих задач',
    'tasks_create': 'Создание задач',
    'tasks_edit': 'Редактирование задач',
    'tasks_delete': 'Удаление задач',

    # Рассылки
    'broadcasts_send': 'Отправка рассылок клиентам',
    'broadcasts_view': 'Просмотр рассылок',
}

def has_permission(user_role: str, permission: str) -> bool:
    """Проверка наличия права у роли"""
    role_data = ROLES.get(user_role, {})
    permissions = role_data.get('permissions', [])
    
    if permissions == '*':
        return True
    
    return permission in permissions

def can_manage_role(manager_role: str, target_role: str) -> bool:
    """
    Может ли менеджер управлять целевой ролью
    
    Правила:
    - Директор может управлять всеми ролями (включая других директоров)
    - Админ может управлять только ролями из своего списка (НЕ director)
    - Другие роли не могут управлять никем
    """
    # Директор может управлять всеми (включая других директоров)
    if manager_role == 'director':
        return True
    
    # Получаем список ролей, которыми может управлять manager
    manager_data = ROLES.get(manager_role, {})
    can_manage_list = manager_data.get('can_manage_roles', [])
    
    return target_role in can_manage_list

# ===== КОНСТАНТЫ САЛОНА (ДЕФОЛТНЫЕ ЗНАЧЕНИЯ) =====
# Единый источник истины для всех дефолтных значений настроек салона

# === РАБОЧИЕ ЧАСЫ САЛОНА ===
DEFAULT_HOURS_WEEKDAYS = os.getenv("DEFAULT_HOURS_WEEKDAYS", "10:30 - 21:00")
DEFAULT_HOURS_WEEKENDS = os.getenv("DEFAULT_HOURS_WEEKENDS", "10:30 - 21:00")
DEFAULT_HOURS_START = os.getenv("DEFAULT_HOURS_START", "10:30")
DEFAULT_HOURS_END = os.getenv("DEFAULT_HOURS_END", "21:00")
DEFAULT_HOURS_START_HOUR = int(os.getenv("DEFAULT_HOURS_START_HOUR", "10"))
DEFAULT_HOURS_END_HOUR = int(os.getenv("DEFAULT_HOURS_END_HOUR", "21"))

# === ОБЕДЕННОЕ ВРЕМЯ ===
DEFAULT_LUNCH_START = os.getenv("DEFAULT_LUNCH_START", "13:00")
DEFAULT_LUNCH_END = os.getenv("DEFAULT_LUNCH_END", "14:00")

# === ВРЕМЯ ОТЧЕТОВ ===
DEFAULT_REPORT_TIME = os.getenv("DEFAULT_REPORT_TIME", "09:00")

# === ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ===
def get_default_hours_dict():
    """Получить словарь с дефолтными часами работы"""
    return {
        "start": DEFAULT_HOURS_START,
        "end": DEFAULT_HOURS_END,
        "start_hour": DEFAULT_HOURS_START_HOUR,
        "end_hour": DEFAULT_HOURS_END_HOUR
    }

def get_default_working_hours_response():
    """Получить полный ответ с дефолтными рабочими часами (для fallback)"""
    return {
        "weekdays": get_default_hours_dict(),
        "weekends": get_default_hours_dict(),
        "lunch": {
            "start": DEFAULT_LUNCH_START,
            "end": DEFAULT_LUNCH_END
        }
    }