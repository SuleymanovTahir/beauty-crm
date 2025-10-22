import os
from dotenv import load_dotenv
from datetime import datetime

# ===== ЗАГРУЗКА ПЕРЕМЕННЫХ ИЗ .env =====
load_dotenv()

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

# ===== ИНФОРМАЦИЯ О САЛОНЕ (из .env) =====
SALON_INFO = {
    "name": os.getenv("SALON_NAME", "M.Le Diamant Beauty Lounge"),
    "name_ar": "صالون M.Le Diamant للتجميل",
    "address": os.getenv("SALON_ADDRESS", "Shop 13, Amwaj 3 Plaza Level, Jumeirah Beach Residence, Dubai"),
    "address_ar": "المحل 13، مستوى أمواج 3 بلازا، جميرا بيتش ريزيدنس، دبي",
    "google_maps": "https://maps.app.goo.gl/r84DsemFhptY8RuC7",
    "hours": "Daily 10:30 - 21:00",
    "hours_ru": "Ежедневно 10:30 - 21:00",
    "hours_ar": "يوميًا 10:30 - 21:00",
    "booking_url": os.getenv("SALON_BOOKING_URL", "https://n1314037.alteg.io"),
    "phone": os.getenv("SALON_PHONE", "+971 XX XXX XXXX"),
    "bot_name": "Diamant",
    "bot_name_en": "Diamant",
    "bot_name_ar": "الماس"
}

# ===== EMAIL CONFIG (из .env) =====
SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USERNAME = os.getenv("SMTP_USERNAME")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
FROM_EMAIL = os.getenv("FROM_EMAIL", os.getenv("SMTP_USERNAME"))

# ===== DATABASE =====
DATABASE_NAME = os.getenv("DATABASE_NAME", "salon_bot.db")

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

# ===== ПОЛНЫЙ ПРАЙС-ЛИСТ УСЛУГ =====
SERVICES = {
    # Permanent Makeup
    "permanent_lips": {
        "name": "Permanent Lips",
        "name_ru": "Перманентный макияж губ",
        "name_ar": "شفاه دائمة",
        "price": 800,
        "currency": "AED",
        "category": "Permanent Makeup",
        "description": "Long-lasting lip color enhancement",
        "description_ru": "Долговременное окрашивание губ с естественным эффектом",
        "benefits": ["Стойкий результат до 2 лет", "Естественный цвет", "Коррекция формы губ"]
    },
    "permanent_brows": {
        "name": "Permanent Brows",
        "name_ru": "Перманентный макияж бровей",
        "name_ar": "حواجب دائمة",
        "price": 700,
        "currency": "AED",
        "category": "Permanent Makeup",
        "description": "Perfect eyebrows that last",
        "description_ru": "Идеальные брови навсегда - микроблейдинг или пудровое напыление",
        "benefits": ["Стойкость до 2 лет", "Естественная форма", "Без ежедневного макияжа"]
    },
    "lashliner": {
        "name": "Lashliner",
        "name_ru": "Межресничная стрелка",
        "price": 500,
        "currency": "AED",
        "category": "Permanent Makeup",
        "description": "Natural lash enhancement",
        "description_ru": "Деликатная прорисовка межресничного пространства",
        "benefits": ["Визуальная густота ресниц", "Естественный эффект", "Стойкость до 1.5 лет"]
    },
    # ... (остальные услуги - скопируйте из вашего полного списка)
    "manicure_gelish": {
        "name": "Gelish manicure",
        "name_ru": "Маникюр гель-лак",
        "price": 130,
        "currency": "AED",
        "category": "Nails",
        "description": "Long-lasting gel manicure",
        "description_ru": "Стойкий маникюр гель-лаком до 3 недель",
        "benefits": ["Стойкость до 3 недель", "Глянцевый блеск", "Быстрая сушка"]
    },
    # Добавьте остальные услуги...
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
print(f"   Салон: {SALON_INFO['name']}")
print(f"   Database: {DATABASE_NAME}")