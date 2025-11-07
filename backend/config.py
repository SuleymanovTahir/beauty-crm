# backend/config.py
# ✅ Импортируйте get_salon_settings() из database.py когда нужны настройки салона

import os
from dotenv import load_dotenv
from datetime import datetime

import socket

def is_localhost() -> bool:
    """Проверяет, запущено ли приложение на localhost"""
    try:
        hostname = socket.gethostname()
        return hostname in ['localhost', '127.0.0.1'] or hostname.startswith('192.168.')
    except:
        return False

# Определяем окружение
if os.getenv("ENVIRONMENT"):
    # Явно указано в переменных окружения
    environment = os.getenv("ENVIRONMENT")
elif os.getenv("DEV_MODE") == "1":
    environment = "development"
elif is_localhost():
    environment = "development"
else:
    environment = "production"

# Выбираем файл конфигурации
if environment == "development":
    env_file = ".env.local"
    print("🔧 Режим: LOCALHOST (development)")
else:
    env_file = ".env.production"
    print("🚀 Режим: PRODUCTION (server)")

# Загружаем правильный .env файл
load_dotenv(env_file)

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
INSTAGRAM_BUSINESS_ID = os.getenv("INSTAGRAM_BUSINESS_ID", "17841448618072548")



BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# Если config.py НЕ в backend/, добавляем /backend
if not BASE_DIR.endswith('backend'):
    DATABASE_NAME = os.path.join(BASE_DIR, "backend", "salon_bot.db")
else:
    DATABASE_NAME = os.path.join(BASE_DIR, "salon_bot.db")


UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "static", "uploads")
BASE_URL = os.getenv("BASE_URL", "http://localhost:8000")

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
required_vars = {
    "PAGE_ACCESS_TOKEN": PAGE_ACCESS_TOKEN,
    "GEMINI_API_KEY": GEMINI_API_KEY,
}

missing_vars = [var_name for var_name, var_value in required_vars.items() if not var_value]

if missing_vars:
    raise ValueError(f"❌ Не установлены обязательные переменные окружения: {', '.join(missing_vars)}")

print("✅ Config загружен успешно!")
print(f"   Database: {DATABASE_NAME}")
print(f"   ℹ️  Для настроек салона используйте: from database import get_salon_settings")