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

# 3. Выбираем файл конфигурации
if environment == "development":
    env_file = ".env.local"
else:
    env_file = ".env.production"

# 4. Загружаем файл (перезаписывает системные переменные)
if os.path.exists(env_file):
    load_dotenv(env_file, override=True)
    print(f"✅ Загружен: {env_file}")
else:
    print(f"⚠️ Файл {env_file} не найден, используем системные переменные")
    load_dotenv()  # Загрузим .env если есть

# 5. Финальная проверка после загрузки файла
loaded_env = os.getenv("ENVIRONMENT")
if loaded_env and loaded_env != environment:
    print(f"⚠️ ENVIRONMENT в {env_file} ({loaded_env}) отличается от автоопределения ({environment})")
    print(f"✅ Используем автоопределение: {environment}")
    os.environ["ENVIRONMENT"] = environment  # Принудительно ставим правильное значение

# Подавление логов
os.environ['GRPC_VERBOSITY'] = 'ERROR'
os.environ['GLOG_minloglevel'] = '2'
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'

# ===== ВЕРСИЯ ДЛЯ КЭШИРОВАНИЯ =====
CSS_VERSION = datetime.now().strftime('%Y%m%d%H%M%S')

# ===== ТОКЕНЫ И КЛЮЧИ (из .env) =====
VERIFY_TOKEN = os.getenv("VERIFY_TOKEN", "taha")
PAGE_ACCESS_TOKEN = os.getenv("PAGE_ACCESS_TOKEN")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
# GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.0-flash-001")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", 'gemini-2.0-flash-exp')
INSTAGRAM_BUSINESS_ID = os.getenv("INSTAGRAM_BUSINESS_ID", "17841448618072548")

# Flag to control visibility of scheduler start messages
SHOW_SCHEDULER_START = False  # Set to True to show the start log
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")

# Get the backend directory (parent of core/)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# ===== DATABASE CONFIGURATION =====
# Определяем тип БД из переменных окружения или автоматически
DATABASE_TYPE = os.getenv("DATABASE_TYPE")

if not DATABASE_TYPE:
    # Автоопределение: SQLite для разработки, PostgreSQL для продакшена
    if environment == "development":
        DATABASE_TYPE = "postgresql"  # Changed from sqlite to postgresql to avoid legacy DB creation
    else:
        DATABASE_TYPE = "postgresql"
    print(f"✅ Автоопределение типа БД: {DATABASE_TYPE}")
else:
    print(f"✅ Тип БД из переменной окружения: {DATABASE_TYPE}")

# SQLite настройки (для разработки)
if DATABASE_TYPE == "sqlite":
    DATABASE_NAME = os.path.join(BASE_DIR, os.getenv("SQLITE_DB_PATH", "salon_bot.db"))
    print(f"   SQLite Database: {DATABASE_NAME}")
else:
    # PostgreSQL настройки (для продакшена)
    DATABASE_NAME = None  # Не используется для PostgreSQL
    POSTGRES_CONFIG = {
        'host': os.getenv('POSTGRES_HOST', 'localhost'),
        'port': os.getenv('POSTGRES_PORT', '5432'),
        'database': os.getenv('POSTGRES_DB', 'beauty_crm'),
        'user': os.getenv('POSTGRES_USER', 'beauty_crm_user'),
        'password': os.getenv('POSTGRES_PASSWORD', '')
    }
    print(f"   PostgreSQL Database: {POSTGRES_CONFIG['database']} @ {POSTGRES_CONFIG['host']}:{POSTGRES_CONFIG['port']}")

UPLOAD_DIR = os.path.join(BASE_DIR, "static", "uploads")

# ✅ Универсальный BASE_URL с автоопределением окружения
if os.getenv("BASE_URL"):
    BASE_URL = os.getenv("BASE_URL")
elif os.getenv("ENVIRONMENT") == "production":
    BASE_URL = "https://mlediamant.com"
else:
    BASE_URL = "http://localhost:8000"

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
print(f"   Database: {DATABASE_NAME}")
print(f"   ℹ️  Для настроек салона используйте: from database import get_salon_settings")
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
            'clients_view', 'clients_create', 'clients_edit',
            'bookings_view', 'bookings_create', 'bookings_edit',
            'services_view',
            'users_view', 'users_create',
            'analytics_view_anonymized',
            'staff_chat_own',
            'calendar_view_all'
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
            'calendar_view_all_readonly',
            'bot_settings_view'
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
            'staff_chat_own'
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
    'bot_settings_edit': 'Настройки бота',
}

def has_permission(user_role: str, permission: str) -> bool:
    """Проверка наличия права у роли"""
    role_data = ROLES.get(user_role, {})
    permissions = role_data.get('permissions', [])
    
    if permissions == '*':
        return True
    
    return permission in permissions

def can_manage_role(manager_role: str, target_role: str) -> bool:
    """Может ли менеджер управлять целевой ролью"""
    manager_data = ROLES.get(manager_role, {})
    return target_role in manager_data.get('can_manage_roles', [])