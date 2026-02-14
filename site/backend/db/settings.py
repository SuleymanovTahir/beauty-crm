"""
Функции для работы с настройками салона и бота
"""

from datetime import datetime
from copy import deepcopy
import json
import os
import psycopg2
from psycopg2 import errors as pg_errors

from db.connection import get_db_connection
from utils.logger import log_error, log_warning, log_info

from core.config import (
    DEFAULT_HOURS_WEEKDAYS,
    DEFAULT_HOURS_WEEKENDS,
    DEFAULT_REPORT_TIME,
    ROLES
)

_DEFAULT_OBJECTION_KEYWORDS = {
    "price": ["дорого", "expensive", "цена", "price", "cost"],
    "think": ["подумаю", "подумать", "think", "thinking"],
    "no_time": ["времени нет", "no time", "busy", "занят"],
    "far": ["далеко", "far", "distance"],
    "pain": ["больно", "pain", "hurts", "painful"],
}

_DEFAULT_SERVICE_SYNONYMS = {
    "кератин": ["hair treatment", "кератиновое выпрямление", "keratin"],
    "ботокс": ["hair treatment", "hair botox"],
    "счастье для волос": ["hair treatment", "happy hair"],
    "укладка": ["blow dry", "styling"],
    "окрашивание": ["hair color", "coloring", "roots"],
    "снятие": ["removal", "gel removal"],
    "дизайн": ["nail art", "design"],
}

_DEFAULT_PROMPT_HEADERS = {
    "SALON_INFO": "[SALON CORE INFORMATION]",
    "SERVICES": "[SALON SERVICES LIST]",
    "MASTERS": "[STAFF & QUALIFICATIONS]",
    "HISTORY": "HISTORY (Recent Messages):",
    "PREFERENCES": "[CLIENT PROFILE & PREFERENCES]",
    "OBJECTIONS": "[HISTORY OF CLIENT CONCERNS]",
    "AVAILABILITY": "[SCHEDULE AVAILABILITY - {service_name}]",
    "UNKNOWN_SERVICE": "[AWAITING SERVICE CLARIFICATION]",
    "NOT_FOUND_SERVICE": "[SERVICE SEARCH CLARIFICATION]",
}

class DateTimeEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, datetime):
            return obj.isoformat()
        return super().default(obj)

def _normalize_timezone_offset(raw_offset):
    """Нормализовать значение timezone_offset к целому смещению UTC"""
    if raw_offset is None:
        return None

    if isinstance(raw_offset, bool):
        return None

    if isinstance(raw_offset, (int, float)):
        if raw_offset != raw_offset:  # NaN guard
            return None
        return int(raw_offset)

    if not isinstance(raw_offset, str):
        return None

    cleaned = raw_offset.strip()
    if len(cleaned) == 0:
        return None

    normalized = cleaned.upper().replace('UTC', '').replace('−', '-').strip()
    if normalized.startswith('+'):
        normalized = normalized[1:]

    if len(normalized) == 0:
        return None

    try:
        return int(float(normalized))
    except (TypeError, ValueError):
        return None


_ALLOWED_BUSINESS_TYPES = {
    "beauty",
    "restaurant",
    "construction",
    "factory",
    "taxi",
    "delivery",
    "other",
}
_ALLOWED_PRODUCT_MODES = {"crm", "site", "both"}
_BUSINESS_CONFIG_SCHEMA_VERSION = 1
_BUSINESS_CONFIG_KEY = "business_profile_config"

_CRM_MODULE_KEYS = [
    "dashboard",
    "bookings",
    "calendar",
    "clients",
    "team",
    "services",
    "tasks",
    "analytics",
    "visitor_analytics",
    "funnel",
    "products",
    "invoices",
    "contracts",
    "telephony",
    "messengers",
    "internal_chat",
    "broadcasts",
    "referrals",
    "loyalty",
    "challenges",
    "promo_codes",
    "service_change_requests",
    "settings",
    "public_content",
    "bot_settings",
    "notifications",
    "plans",
    "payment_integrations",
    "marketplace_integrations",
    "trash",
    "audit_log",
]

_SITE_MODULE_KEYS = [
    "landing",
    "service_catalog",
    "public_booking",
    "account_portal",
    "account_booking",
    "referral_landing",
    "gallery",
    "faq",
    "reviews",
    "terms_privacy",
    "data_deletion",
    "unsubscribe",
    "lead_capture",
]

_BUSINESS_DISABLED_MODULES = {
    "beauty": {"crm": set(), "site": set()},
    "restaurant": {
        "crm": {"service_change_requests"},
        "site": set(),
    },
    "construction": {
        "crm": {"loyalty", "challenges", "promo_codes", "referrals", "service_change_requests"},
        "site": {"public_booking", "account_portal", "account_booking", "gallery", "reviews"},
    },
    "factory": {
        "crm": {"loyalty", "challenges", "promo_codes", "referrals", "funnel", "service_change_requests"},
        "site": {"public_booking", "account_portal", "account_booking", "gallery", "reviews", "faq"},
    },
    "taxi": {
        "crm": {"loyalty", "challenges", "service_change_requests", "plans"},
        "site": {"gallery", "faq", "reviews"},
    },
    "delivery": {
        "crm": {"loyalty", "challenges", "referrals", "service_change_requests"},
        "site": {"gallery", "faq"},
    },
    "other": {"crm": set(), "site": set()},
}

_MODULE_PERMISSION_KEYS = {
    "bookings": {
        "bookings_view",
        "bookings_view_own",
        "bookings_create",
        "bookings_edit",
        "bookings_delete",
    },
    "calendar": {"calendar_view_all", "calendar_view_all_readonly", "calendar_view_own"},
    "clients": {
        "clients_view",
        "clients_view_limited",
        "clients_view_own",
        "clients_view_stats_only",
        "clients_create",
        "clients_edit",
        "clients_delete",
        "clients_export",
        "clients_view_phone",
        "clients_view_phones",
    },
    "team": {"users_view", "users_create", "users_edit", "users_delete", "roles_view", "roles_edit"},
    "services": {"services_view", "services_edit", "services_edit_pricing", "services_edit_prices"},
    "tasks": {"tasks_view", "tasks_view_own", "tasks_create", "tasks_edit", "tasks_delete"},
    "analytics": {
        "analytics_view",
        "analytics_view_anonymized",
        "analytics_view_stats_only",
        "analytics_view_financial",
        "analytics_export_full",
        "analytics_export_anonymized",
    },
    "visitor_analytics": {"analytics_view", "analytics_view_anonymized", "analytics_view_stats_only"},
    "funnel": {"analytics_view", "analytics_view_anonymized", "analytics_view_stats_only"},
    "telephony": {"telephony_access"},
    "messengers": {"instagram_chat_view", "instagram_chat_reply"},
    "internal_chat": {"staff_chat_own", "staff_chat_view_all"},
    "broadcasts": {"broadcasts_send", "broadcasts_view"},
    "referrals": {"settings_edit_loyalty"},
    "loyalty": {"settings_edit_loyalty"},
    "challenges": {"settings_edit_loyalty"},
    "promo_codes": {"settings_edit_loyalty"},
    "invoices": {"payroll_manage"},
    "contracts": {"payroll_manage"},
    "settings": {
        "settings_view",
        "settings_edit",
        "settings_edit_branding",
        "settings_edit_finance",
        "settings_edit_integrations",
        "settings_edit_loyalty",
        "settings_edit_schedule",
    },
    "public_content": {"settings_edit_branding"},
    "bot_settings": {"bot_settings_view", "bot_settings_edit"},
    "payment_integrations": {"settings_edit_integrations"},
    "marketplace_integrations": {"settings_edit_integrations"},
    "trash": {"settings_edit"},
    "audit_log": {"roles_view"},
}

_SHARED_DOMAIN_MATRIX = {
    "auth": "shared",
    "bookings": "shared",
    "services": "shared",
    "clients": "shared",
}


def _build_module_matrix_for_business_type(business_type: str) -> dict:
    normalized_business_type = _normalize_business_type(business_type)
    disabled_map = _BUSINESS_DISABLED_MODULES.get(normalized_business_type, _BUSINESS_DISABLED_MODULES["beauty"])

    crm_modules = {module_key: True for module_key in _CRM_MODULE_KEYS}
    site_modules = {module_key: True for module_key in _SITE_MODULE_KEYS}

    for disabled_module in disabled_map.get("crm", set()):
        if disabled_module in crm_modules:
            crm_modules[disabled_module] = False

    for disabled_module in disabled_map.get("site", set()):
        if disabled_module in site_modules:
            site_modules[disabled_module] = False

    return {
        "crm": crm_modules,
        "site": site_modules,
    }


def _collect_disabled_permissions(module_matrix: dict) -> set:
    disabled_permissions: set = set()
    crm_modules = module_matrix.get("crm") if isinstance(module_matrix, dict) else {}

    if not isinstance(crm_modules, dict):
        return disabled_permissions

    for module_key, is_enabled in crm_modules.items():
        if is_enabled is True:
            continue
        permission_keys = _MODULE_PERMISSION_KEYS.get(module_key, set())
        disabled_permissions.update(permission_keys)

    return disabled_permissions


def _build_role_permissions_from_modules(module_matrix: dict) -> dict:
    disabled_permissions = _collect_disabled_permissions(module_matrix)
    role_permissions: dict = {}

    for role_key, role_data in ROLES.items():
        permissions = role_data.get("permissions", [])
        if permissions == "*":
            role_permissions[role_key] = "*"
            continue

        cleaned_permissions: list[str] = []
        if isinstance(permissions, list):
            for permission_key in permissions:
                if not isinstance(permission_key, str):
                    continue
                if permission_key in disabled_permissions:
                    continue
                cleaned_permissions.append(permission_key)

        role_permissions[role_key] = cleaned_permissions

    return role_permissions


def _normalize_module_matrix(raw_modules, default_modules: dict) -> dict:
    normalized_modules = deepcopy(default_modules)
    if not isinstance(raw_modules, dict):
        return normalized_modules

    for suite_key in ("crm", "site"):
        suite_value = raw_modules.get(suite_key)
        if not isinstance(suite_value, dict):
            continue

        for module_key in normalized_modules[suite_key].keys():
            if module_key not in suite_value:
                continue
            normalized_flag = _normalize_bool(suite_value[module_key])
            if normalized_flag is None:
                continue
            normalized_modules[suite_key][module_key] = normalized_flag

    return normalized_modules


def _normalize_role_permissions(raw_permissions, default_permissions: dict, module_matrix: dict) -> dict:
    normalized_permissions = deepcopy(default_permissions)

    if isinstance(raw_permissions, dict):
        for role_key in normalized_permissions.keys():
            default_role_permissions = normalized_permissions[role_key]
            if default_role_permissions == "*":
                continue

            role_override = raw_permissions.get(role_key)
            if not isinstance(role_override, list):
                continue

            cleaned_override: list[str] = []
            for permission_value in role_override:
                if not isinstance(permission_value, str):
                    continue
                if permission_value in cleaned_override:
                    continue
                cleaned_override.append(permission_value)
            normalized_permissions[role_key] = cleaned_override

    disabled_permissions = _collect_disabled_permissions(module_matrix)
    for role_key, role_permission_values in normalized_permissions.items():
        if role_permission_values == "*":
            continue
        normalized_permissions[role_key] = [
            permission_key
            for permission_key in role_permission_values
            if permission_key not in disabled_permissions
        ]

    return normalized_permissions


def _build_default_business_profile_config(business_type: str) -> dict:
    normalized_business_type = _normalize_business_type(business_type)
    module_matrix = _build_module_matrix_for_business_type(normalized_business_type)
    role_permissions = _build_role_permissions_from_modules(module_matrix)

    return {
        "schema_version": _BUSINESS_CONFIG_SCHEMA_VERSION,
        "business_type": normalized_business_type,
        "modules": module_matrix,
        "role_permissions": role_permissions,
        "shared_domains": deepcopy(_SHARED_DOMAIN_MATRIX),
    }


def _normalize_business_profile_config(raw_config, business_type: str) -> dict:
    normalized_business_type = _normalize_business_type(business_type)
    default_config = _build_default_business_profile_config(normalized_business_type)

    if not isinstance(raw_config, dict):
        return default_config

    schema_version = raw_config.get("schema_version")
    if schema_version != _BUSINESS_CONFIG_SCHEMA_VERSION:
        return default_config

    modules = _normalize_module_matrix(raw_config.get("modules"), default_config["modules"])
    role_permissions = _normalize_role_permissions(
        raw_config.get("role_permissions"),
        default_config["role_permissions"],
        modules,
    )

    shared_domains = deepcopy(default_config["shared_domains"])
    raw_shared_domains = raw_config.get("shared_domains")
    if isinstance(raw_shared_domains, dict):
        for domain_key in shared_domains.keys():
            raw_domain_value = raw_shared_domains.get(domain_key)
            if isinstance(raw_domain_value, str) and len(raw_domain_value.strip()) > 0:
                shared_domains[domain_key] = raw_domain_value.strip()

    return {
        "schema_version": _BUSINESS_CONFIG_SCHEMA_VERSION,
        "business_type": normalized_business_type,
        "modules": modules,
        "role_permissions": role_permissions,
        "shared_domains": shared_domains,
    }


def get_business_profile_matrix() -> dict:
    profiles = {}
    for business_type in sorted(_ALLOWED_BUSINESS_TYPES):
        profiles[business_type] = _build_default_business_profile_config(business_type)

    return {
        "schema_version": _BUSINESS_CONFIG_SCHEMA_VERSION,
        "module_catalog": {
            "crm": list(_CRM_MODULE_KEYS),
            "site": list(_SITE_MODULE_KEYS),
        },
        "role_catalog": sorted(list(ROLES.keys())),
        "profiles": profiles,
    }


def get_effective_business_profile_config(business_type: str, custom_settings) -> dict:
    raw_profile_config = None
    if isinstance(custom_settings, dict):
        raw_profile_config = custom_settings.get(_BUSINESS_CONFIG_KEY)

    return _normalize_business_profile_config(raw_profile_config, business_type)


def _normalize_business_type(raw_value) -> str:
    value = str(raw_value or "").strip().lower()
    if value in _ALLOWED_BUSINESS_TYPES:
        return value
    return "beauty"


def _normalize_product_mode(raw_value) -> str:
    value = str(raw_value or "").strip().lower()
    if value in _ALLOWED_PRODUCT_MODES:
        return value
    return "both"


def _normalize_bool(raw_value):
    if isinstance(raw_value, bool):
        return raw_value
    if isinstance(raw_value, (int, float)):
        return bool(raw_value)
    if isinstance(raw_value, str):
        lowered = raw_value.strip().lower()
        if lowered in {"true", "1", "yes", "on"}:
            return True
        if lowered in {"false", "0", "no", "off"}:
            return False
    return None


def _product_mode_to_flags(product_mode: str):
    if product_mode == "crm":
        return True, False
    if product_mode == "site":
        return False, True
    return True, True

# ===== НАСТРОЙКИ САЛОНА =====

def get_salon_settings() -> dict:
    """Получить настройки салона из БД (Архитектура v2.0)"""
    from utils.currency import get_salon_currency
    conn = get_db_connection()
    c = conn.cursor()

    try:
        c.execute("SELECT * FROM salon_settings WHERE id = 1")
        result = c.fetchone()

        if result:
            columns = [description[0] for description in c.description]
            row = dict(zip(columns, result))
            
            # Extract custom_settings
            custom = row.get("custom_settings") or {}
            if isinstance(custom, str):
                try:
                    custom = json.loads(custom)
                except:
                    custom = {}

            normalized_business_type = _normalize_business_type(row.get("business_type"))
            business_profile_config = get_effective_business_profile_config(normalized_business_type, custom)

            return {
                "id": row.get("id", 1),
                "name": row.get("name"),
                "address": row.get("address", ""),
                "google_maps": row.get("google_maps", ""),
                "hours_weekdays": row.get("hours_weekdays", DEFAULT_HOURS_WEEKDAYS),
                "hours_weekends": row.get("hours_weekends", DEFAULT_HOURS_WEEKENDS),
                "lunch_start": row.get("lunch_start"),
                "lunch_end": row.get("lunch_end"),
                "phone": row.get("phone", ""),
                "email": row.get("email"),
                "instagram": row.get("instagram") or os.getenv('SALON_INSTAGRAM', ''),
                "whatsapp": row.get("whatsapp"),
                "booking_url": row.get("booking_url", ""),
                "timezone": row.get("timezone", "Asia/Dubai"),
                "timezone_offset": row.get("timezone_offset", 4),
                "currency": row.get("currency") or get_salon_currency(),
                "business_type": normalized_business_type,
                "product_mode": row.get("product_mode") or "both",
                "crm_enabled": row.get("crm_enabled") if row.get("crm_enabled") is not None else True,
                "site_enabled": row.get("site_enabled") if row.get("site_enabled") is not None else True,
                "city": row.get("city", ""),
                "country": row.get("country", ""),
                "latitude": row.get("latitude"),
                "longitude": row.get("longitude"),
                "logo_url": row.get("logo_url", "/static/uploads/images/salon/logo.webp"),
                "base_url": row.get("base_url", "https://mlediamant.com"),
                "bot_name": row.get("bot_name"),
                # Display settings from custom_settings
                "gallery_display_count": custom.get("gallery_display_count", 6),
                "portfolio_display_count": custom.get("portfolio_display_count", 6),
                "services_display_count": custom.get("services_display_count", 6),
                "faces_display_count": custom.get("faces_display_count", 6),
                "business_profile_config": business_profile_config,
                "updated_at": row.get("updated_at")
            }
        else:
            log_warning("⚠️ Настройки салона пусты, используются дефолты", "database")
            return _get_default_salon_settings()

    except Exception as e:
        log_error(f"❌ Ошибка в get_salon_settings: {e}", "database")
        return _get_default_salon_settings()
    finally:
        conn.close()

def _get_default_salon_settings() -> dict:
    """Дефолтные настройки салона"""
    from utils.currency import get_salon_currency
    default_business_type = "beauty"
    return {
        "id": 1,
        "name": os.getenv('SALON_NAME', 'Beauty Salon'),
        "hours_weekdays": DEFAULT_HOURS_WEEKDAYS,
        "hours_weekends": DEFAULT_HOURS_WEEKENDS,
        "lunch_start": "",
        "lunch_end": "",
        "phone": os.getenv('SALON_PHONE', ''),
        "email": os.getenv('SALON_EMAIL', ''),
        "instagram": os.getenv('SALON_INSTAGRAM', ''),
        "bot_name": os.getenv('BOT_NAME', 'Assistant'),
        "timezone": "Asia/Dubai",
        "timezone_offset": 4,
        "currency": get_salon_currency(),
        "business_type": default_business_type,
        "product_mode": "both",
        "crm_enabled": True,
        "site_enabled": True,
        "gallery_display_count": 6,
        "portfolio_display_count": 6,
        "services_display_count": 6,
        "faces_display_count": 6,
        "business_profile_config": _build_default_business_profile_config(default_business_type)
    }

def update_salon_settings(data: dict) -> bool:
    """Обновить настройки салона (Архитектура v2.0 - SSOT)"""
    conn = get_db_connection()
    c = conn.cursor()

    try:
        # 1. Fetch current for merging custom_settings and business profile
        c.execute("SELECT custom_settings, business_type FROM salon_settings WHERE id = 1")
        row = c.fetchone()
        custom = row[0] if row and row[0] else {}
        current_business_type = _normalize_business_type(row[1] if row and len(row) > 1 else "beauty")
        if isinstance(custom, str):
            try:
                custom = json.loads(custom)
            except:
                custom = {}

        # 2. Map fields
        direct_fields = [
            'name', 'address', 'google_maps', 'hours_weekdays', 'hours_weekends',
            'lunch_start', 'lunch_end', 'phone', 'email', 'instagram', 'whatsapp',
            'booking_url', 'timezone', 'timezone_offset', 'currency', 'business_type',
            'product_mode', 'crm_enabled', 'site_enabled', 'city', 'country',
            'latitude', 'longitude', 'logo_url', 'base_url', 'bot_name'
        ]
        
        custom_fields = [
            'gallery_display_count', 'portfolio_display_count', 
            'services_display_count', 'faces_display_count'
        ]

        set_parts = []
        params = []
        normalized_product_mode = None
        effective_business_type = current_business_type

        # Handle direct fields
        for field in direct_fields:
            if field in data:
                if field == 'business_type':
                    normalized_business_type = _normalize_business_type(data[field])
                    set_parts.append(f"{field} = %s")
                    params.append(normalized_business_type)
                    effective_business_type = normalized_business_type
                    continue

                if field == 'product_mode':
                    normalized_product_mode = _normalize_product_mode(data[field])
                    set_parts.append(f"{field} = %s")
                    params.append(normalized_product_mode)
                    continue

                if field in {'crm_enabled', 'site_enabled'}:
                    normalized_flag = _normalize_bool(data[field])
                    if normalized_flag is None:
                        log_warning(f"⚠️ Невалидный булев флаг пропущен для {field}: {data[field]}", "database")
                        continue
                    set_parts.append(f"{field} = %s")
                    params.append(normalized_flag)
                    continue

                if field == 'timezone_offset':
                    normalized_offset = _normalize_timezone_offset(data[field])
                    if normalized_offset is None:
                        raw_offset = data[field]
                        if isinstance(raw_offset, str) and len(raw_offset.strip()) == 0:
                            set_parts.append(f"{field} = %s")
                            params.append(None)
                            continue
                        if raw_offset is None:
                            set_parts.append(f"{field} = %s")
                            params.append(None)
                            continue
                        log_warning(f"⚠️ Невалидный timezone_offset пропущен: {raw_offset}", "database")
                        continue

                    set_parts.append(f"{field} = %s")
                    params.append(normalized_offset)
                    continue

                set_parts.append(f"{field} = %s")
                params.append(data[field])

        if normalized_product_mode is not None:
            crm_enabled, site_enabled = _product_mode_to_flags(normalized_product_mode)
            if 'crm_enabled' not in data:
                set_parts.append("crm_enabled = %s")
                params.append(crm_enabled)
            if 'site_enabled' not in data:
                set_parts.append("site_enabled = %s")
                params.append(site_enabled)

        custom_updated = False

        # Handle custom fields (consolidate into JSONB)
        for field in custom_fields:
            if field in data:
                custom[field] = data[field]
                custom_updated = True

        # Versioned business profile config (migration-compatible schema in custom_settings JSONB)
        if _BUSINESS_CONFIG_KEY in data:
            custom[_BUSINESS_CONFIG_KEY] = _normalize_business_profile_config(data[_BUSINESS_CONFIG_KEY], effective_business_type)
            custom_updated = True
        elif 'business_type' in data:
            custom[_BUSINESS_CONFIG_KEY] = _normalize_business_profile_config(custom.get(_BUSINESS_CONFIG_KEY), effective_business_type)
            custom_updated = True
        elif _BUSINESS_CONFIG_KEY not in custom:
            custom[_BUSINESS_CONFIG_KEY] = _build_default_business_profile_config(effective_business_type)
            custom_updated = True
        
        if custom_updated:
            set_parts.append("custom_settings = %s")
            params.append(json.dumps(custom))

        if not set_parts:
            return False

        set_parts.append("updated_at = NOW()")
        params.append(1) # ID = 1

        query = f"UPDATE salon_settings SET {', '.join(set_parts)} WHERE id = %s"
        c.execute(query, params)
        conn.commit()
        log_info(f"✅ Настройки салона обновлены", "database")
        return True
    except Exception as e:
        log_error(f"Ошибка обновления настроек салона: {e}", "database")
        conn.rollback()
        return False
    finally:
        conn.close()

# ===== НАСТРОЙКИ БОТА =====

def get_bot_settings() -> dict:
    """Получить настройки бота из единой таблицы salon_settings (bot_config)"""
    conn = get_db_connection()
    c = conn.cursor()

    try:
        # Check if bot_config column exists
        c.execute("""
            SELECT COUNT(*) FROM information_schema.columns
            WHERE table_name = 'salon_settings' AND column_name = 'bot_config'
        """)
        has_bot_config = c.fetchone()[0] > 0

        if has_bot_config:
            c.execute("SELECT bot_config FROM salon_settings WHERE id = 1")
            row = c.fetchone()

            if row and row[0]:
                bot_data = row[0]
                if isinstance(bot_data, str):
                    bot_data = json.loads(bot_data)

                log_info("✅ Loaded bot settings from salon_settings.bot_config", "database")

                # Дефолты для отсутствующих полей
                defaults = _get_default_bot_settings()

                # Накладываем данные из БД на дефолты
                result_dict = {**defaults, **bot_data}

                # Заменяем плейсхолдеры
                salon_settings = get_salon_settings()
                result_dict = _replace_bot_placeholders(result_dict, salon_settings)

                return result_dict

        log_warning("⚠️ Настройки бота в salon_settings пусты или колонка отсутствует, используются дефолты", "database")
        return _get_default_bot_settings()

    except Exception as e:
        log_error(f"❌ Ошибка в get_bot_settings: {e}", "database")
        return _get_default_bot_settings()
    finally:
        conn.close()

def _replace_bot_placeholders(bot_settings: dict, salon_settings: dict) -> dict:
    """Заменить плейсхолдеры в настройках бота на реальные значения"""
    replacements = {
        '{SALON_NAME}': str(salon_settings.get('name') or 'Salon'),
        '{CURRENCY}': str(salon_settings.get('currency') or 'AED'),
        '{LOCATION}': f"{salon_settings.get('city') or 'Dubai'}, {salon_settings.get('address') or ''}".strip(', '),
        '{CITY}': str(salon_settings.get('city') or 'Dubai'),
        '{ADDRESS}': str(salon_settings.get('address') or ''),
        '{PHONE}': str(salon_settings.get('phone') or ''),
        '{BOOKING_URL}': str(salon_settings.get('booking_url') or ''),
    }

    # Проходим по всем полям и заменяем плейсхолдеры
    for key, value in bot_settings.items():
        if isinstance(value, str):
            for placeholder, replacement in replacements.items():
                value = value.replace(placeholder, replacement)
            bot_settings[key] = value

    return bot_settings

def _get_default_bot_settings() -> dict:
    """Дефолтные настройки бота"""

    salon_name_env = os.getenv('SALON_NAME', 'Beauty Salon')
    bot_name_env = os.getenv('BOT_NAME', 'Assistant')
    
    try:
        salon = get_salon_settings()
        bot_name = salon.get('bot_name') or bot_name_env
        salon_name = salon.get('name') or salon_name_env
    except:
        bot_name = bot_name_env
        salon_name = salon_name_env

    return {
        "id": 1,
        "bot_name": bot_name,
        "personality_traits": "Professional expert with international experience. Confident, charismatic, and knowledgeable. Not intrusive, focusing on high-quality service and attention to detail.",
        "greeting_message": f"Greetings! Welcome to {salon_name}. How may I assist you today with your beauty and care needs?",
        "farewell_message": "Thank you for contacting us. We look forward to seeing you soon!",
        "price_explanation": "Our pricing reflects the use of premium products, high standards of sterilization, and the expertise of our masters.",
        "price_response_template": "{SERVICE}: {PRICE} {CURRENCY}\n{DESCRIPTION}\nTo book an appointment, please choose a convenient time.",
        "premium_justification": "We prioritize your health and beauty, using only the finest international brands and maintaining strict medical-grade hygiene protocols.",
        "booking_redirect_message": "As your AI assistant, I can help you book instantly. Please select your time: {BOOKING_URL}",
        "fomo_messages": "Our slots fill up quickly - we recommend booking in advance to ensure your preferred time.",
        "upsell_techniques": "Would you like to complement your treatment with a SPA enhancement? It adds only a short time to your visit but offers a truly elevated experience.",
        "communication_style": "Concise, friendly, and expert-driven.",
        "emoji_usage": "Minimal and professional (e.g., # or > symbols, or 1 subtle emoji).",
        "languages_supported": "ru,en,ar",
        "objection_handling": "Always acknowledge the client's concern and offer value-based solutions.",
        "negative_handling": "We sincerely regret any inconvenience. Please share your contact details or contact our manager directly at {PHONE} so we can resolve this immediately.",
        "safety_guidelines": "We use single-use files and craft-packets, opened in your presence for maximum safety.",
        "example_good_responses": "Excellent choice! I have reserved your slot for Saturday at 14:00. You will receive a confirmation shortly.",
        "algorithm_actions": "",
        "location_features": "Complimentary valet parking and premium beverages are provided for all our guests.",
        "seasonality": "We provide seasonal treatments tailored to your needs year-round.",
        "emergency_situations": "If you are running late, please notify us as soon as possible, and we will do our best to accommodate you.",
        "success_metrics": "",
        "objection_expensive": "Focus on the quality of premium materials and absolute safety protocols. We do not compromise on your health.",
        "objection_think_about_it": "Provide additional details and offer a few available time slots to help make the decision easier.",
        "objection_no_time": "Highlight our express treatments or suggest evening/weekend availability.",
        "objection_pain": "Assure the client of our masters' extreme gentleness and the use of the latest safe techniques.",
        "objection_result_doubt": "Suggest viewing our portfolio or testimonials to see the consistent quality of our results.",
        "objection_cheaper_elsewhere": "Explain the difference in product quality and hygiene standards compared to standard salons.",
        "objection_too_far": "Emphasize our convenient location and that the premium result is worth the journey.",
        "objection_consult_husband": "Offer a digital gift certificate or make a tentative reservation for them.",
        "objection_first_time": "Walk through the steps clearly, ensuring total comfort and providing a special welcome offer.",
        "objection_not_happy": "Express immediate regret and offer a senior specialist to review and compensate.",
        "emotional_triggers": "Rediscover your radiance. Experience the luxury you deserve.",
        "social_proof_phrases": "Our top specialists are highly rated for their precision and artistry.",
        "personalization_rules": "Always address returning guests by name and remember their preferences.",
        "example_dialogues": "",
        "emotional_responses": "",
        "anti_patterns": "Avoid over-promising or being overly familiar. Keep a professional distance while being warm.",
        "voice_message_response": "I apologize, but I am currently unable to process voice messages. Could you please send your request as text? 😊",
        "contextual_rules": "",
        "ad_campaign_detection": "",
        "pre_booking_data_collection": "To finalize your reservation, I just need your name and contact number. This will only take a moment! 😊",
        "manager_consultation_prompt": "",
        "booking_time_logic": "Always suggest 2-3 specific time slots rather than asking open-ended questions.",
        "booking_data_collection": """
        For every booking, please ensure we have:
        - Service requested
        - Preferred Master (optional)
        - Date and Time
        - Contact Phone (mandatory)
        """,
        "booking_availability_instructions": """
        AVAILABILITY GUIDELINES:
        1. ONLY use slots listed in the "AVAILABLE MASTERS" section.
        2. Never invent time slots that are not present in the database.
        3. If no slots are available, offer a waitlist or the next closest date.
        """,
        "service_synonyms": json.dumps(_DEFAULT_SERVICE_SYNONYMS, ensure_ascii=False),
        "objection_keywords": json.dumps(_DEFAULT_OBJECTION_KEYWORDS, ensure_ascii=False),
        "prompt_headers": json.dumps(_DEFAULT_PROMPT_HEADERS, ensure_ascii=False),
    }

def update_bot_settings(data: dict) -> bool:
    """Обновить настройки бота в единой таблице salon_settings"""
    conn = get_db_connection()
    c = conn.cursor()

    try:
        # Check if bot_config column exists
        c.execute("""
            SELECT COUNT(*) FROM information_schema.columns
            WHERE table_name = 'salon_settings' AND column_name = 'bot_config'
        """)
        has_bot_config = c.fetchone()[0] > 0

        if not has_bot_config:
            # Add bot_config column if it doesn't exist
            c.execute("ALTER TABLE salon_settings ADD COLUMN IF NOT EXISTS bot_config JSONB DEFAULT '{}'")
            conn.commit()

        # 1. Получаем текущий конфиг
        c.execute("SELECT bot_config FROM salon_settings WHERE id = 1")
        row = c.fetchone()
        current_config = row[0] if row and row[0] else {}

        if isinstance(current_config, str):
            current_config = json.loads(current_config)

        # 2. Сливаем данные
        updated_config = {**current_config, **data}

        # 3. Сохраняем обратно
        c.execute("""
            UPDATE salon_settings
            SET bot_config = %s, updated_at = CURRENT_TIMESTAMP
            WHERE id = 1
        """, (json.dumps(updated_config, cls=DateTimeEncoder),))

        conn.commit()
        log_info(f"✅ Настройки бота обновлены в salon_settings.bot_config", "database")
        return True

    except Exception as e:
        log_error(f"❌ Ошибка обновления настроек бота: {e}", "database")
        conn.rollback()
        return False
    finally:
        conn.close()

# ===== КАСТОМНЫЕ СТАТУСЫ =====

def get_custom_statuses() -> list:
    """Получить все кастомные статусы"""
    conn = get_db_connection()
    c = conn.cursor()

    try:
        c.execute("SELECT * FROM custom_statuses ORDER BY created_at DESC")
        return c.fetchall()
    except (pg_errors.UndefinedTable, psycopg2.OperationalError):
        log_warning("⚠️ Таблица custom_statuses не существует", "database")
        return []
    finally:
        conn.close()

def create_custom_status(status_key: str, status_label: str, status_color: str,
                         status_icon: str, created_by: int) -> bool:
    """Создать кастомный статус"""
    conn = get_db_connection()
    c = conn.cursor()

    try:
        now = datetime.now().isoformat()
        c.execute("""INSERT INTO custom_statuses 
                     (status_key, status_label, status_color, status_icon, created_at, created_by)
                     VALUES (%s, %s, %s, %s, %s, %s)""",
                  (status_key, status_label, status_color, status_icon, now, created_by))
        conn.commit()
        log_info(f"✅ Статус '{status_key}' создан", "database")
        return True
    except psycopg2.IntegrityError:
        log_error(f"❌ Статус '{status_key}' уже существует", "database")
        return False
    except Exception as e:
        log_error(f"Ошибка создания статуса: {e}", "database")
        conn.rollback()
        return False
    finally:
        conn.close()

def update_custom_status(status_key: str, status_label: str = None,
                         status_color: str = None, status_icon: str = None) -> bool:
    """Обновить кастомный статус"""
    conn = get_db_connection()
    c = conn.cursor()

    try:
        updates = []
        params = []

        if status_label:
            updates.append("status_label = %s")
            params.append(status_label)

        if status_color:
            updates.append("status_color = %s")
            params.append(status_color)

        if status_icon:
            updates.append("status_icon = %s")
            params.append(status_icon)

        if updates:
            params.append(status_key)
            query = f"UPDATE custom_statuses SET {', '.join(updates)} WHERE status_key = %s"
            c.execute(query, params)
            conn.commit()
            log_info(f"✅ Статус '{status_key}' обновлен", "database")

        return True
    except Exception as e:
        log_error(f"Ошибка обновления статуса: {e}", "database")
        conn.rollback()
        return False
    finally:
        conn.close()

def delete_custom_status(status_key: str) -> bool:
    """Удалить кастомный статус"""
    conn = get_db_connection()
    c = conn.cursor()

    try:
        c.execute("DELETE FROM custom_statuses WHERE status_key = %s",
                  (status_key,))
        conn.commit()
        log_info(f"✅ Статус '{status_key}' удален", "database")
        return True
    except Exception as e:
        log_error(f"Ошибка удаления статуса: {e}", "database")
        conn.rollback()
        return False
    finally:
        conn.close()

# ===== РОЛИ И ПРАВА ДОСТУПА =====

AVAILABLE_PERMISSIONS = {
    'clients_view': 'Просмотр клиентов',
    'clients_create': 'Создание клиентов',
    'clients_edit': 'Редактирование клиентов',
    'clients_delete': 'Удаление клиентов',
    'bookings_view': 'Просмотр записей',
    'bookings_create': 'Создание записей',
    'bookings_edit': 'Редактирование записей',
    'bookings_delete': 'Удаление записей',
    'services_view': 'Просмотр услуг',
    'services_edit': 'Редактирование услуг',
    'analytics_view': 'Просмотр аналитики',
    'users_view': 'Просмотр пользователей',
    'users_manage': 'Управление пользователями',
    'settings_view': 'Просмотр настроек',
    'settings_edit': 'Редактирование настроек',
    'bot_settings_edit': 'Редактирование настроек бота',
}

def get_all_roles() -> list:
    """Получить все роли (встроенные + кастомные)"""
    builtin_roles = [
        {
            'role_key': 'director',
            'role_name': 'Директор',
            'role_description': 'Полный доступ ко всем функциям, управление всеми ролями',
            'is_builtin': True
        },
        {
            'role_key': 'admin',
            'role_name': 'Администратор',
            'role_description': 'Полный доступ ко всем функциям системы',
            'is_builtin': True
        },
        {
            'role_key': 'accountant',
            'role_name': 'Бухгалтер',
            'role_description': 'Доступ к расчету и учету зарплаты',
            'is_builtin': True
        },
        {
            'role_key': 'manager',
            'role_name': 'Менеджер',
            'role_description': 'Управление клиентами, записями и аналитикой',
            'is_builtin': True
        },
        {
            'role_key': 'sales',
            'role_name': 'Продажник',
            'role_description': 'Работа с клиентами и продажами',
            'is_builtin': True
        },
        {
            'role_key': 'marketer',
            'role_name': 'Таргетолог',
            'role_description': 'Аналитика и маркетинг',
            'is_builtin': True
        },
        {
            'role_key': 'employee',
            'role_name': 'Сотрудник',
            'role_description': 'Базовый доступ к клиентам и записям',
            'is_builtin': True
        }
    ]

    conn = get_db_connection()
    c = conn.cursor()

    try:
        c.execute("SELECT role_key, role_name, role_description FROM custom_roles")
        custom_roles = c.fetchall()

        for role in custom_roles:
            builtin_roles.append({
                'role_key': role[0],
                'role_name': role[1],
                'role_description': role[2],
                'is_builtin': False
            })
    except (pg_errors.UndefinedTable, psycopg2.OperationalError):
        log_warning("⚠️ Таблица custom_roles не существует", "database")
    finally:
        conn.close()

    return builtin_roles

def create_custom_role(role_key: str, role_name: str, role_description: str = None, created_by: int = None) -> bool:
    """Создать кастомную роль"""
    conn = get_db_connection()
    c = conn.cursor()

    if role_key in ['director', 'admin', 'accountant', 'manager', 'sales', 'marketer', 'employee']:
        log_error(
            f"❌ Нельзя создать роль с ключом '{role_key}' - это встроенная роль", "database")
        return False

    try:
        now = datetime.now().isoformat()
        c.execute("""INSERT INTO custom_roles (role_key, role_name, role_description, created_at, created_by)
                    VALUES (%s, %s, %s, %s, %s)""",
                  (role_key, role_name, role_description, now, created_by))

        conn.commit()
        log_info(f"✅ Кастомная роль '{role_key}' создана", "database")
        return True
    except psycopg2.IntegrityError:
        log_error(f"❌ Роль '{role_key}' уже существует", "database")
        return False
    except Exception as e:
        log_error(f"Ошибка создания роли: {e}", "database")
        conn.rollback()
        return False
    finally:
        conn.close()

def delete_custom_role(role_key: str) -> bool:
    """Удалить кастомную роль"""
    conn = get_db_connection()
    c = conn.cursor()

    if role_key in ['director', 'admin', 'accountant', 'manager', 'sales', 'marketer', 'employee']:
        log_error(f"❌ Нельзя удалить встроенную роль '{role_key}'", "database")
        return False

    try:
        c.execute("DELETE FROM custom_roles WHERE role_key = %s", (role_key,))
        c.execute("DELETE FROM role_permissions WHERE role_key = %s", (role_key,))

        conn.commit()
        log_info(f"✅ Роль '{role_key}' удалена", "database")
        return True
    except Exception as e:
        log_error(f"Ошибка удаления роли: {e}", "database")
        conn.rollback()
        return False
    finally:
        conn.close()

def get_role_permissions(role_key: str) -> dict:
    """Получить права роли"""
    conn = get_db_connection()
    c = conn.cursor()

    if role_key == 'admin':
        permissions = {}
        for perm_key in AVAILABLE_PERMISSIONS.keys():
            permissions[perm_key] = {
                'can_view': True,
                'can_create': True,
                'can_edit': True,
                'can_delete': True
            }
        conn.close()
        return permissions

    try:
        c.execute("""SELECT permission_key, can_view, can_create, can_edit, can_delete
                    FROM role_permissions WHERE role_key = %s""", (role_key,))

        permissions = {}
        for row in c.fetchall():
            permissions[row[0]] = {
                'can_view': bool(row[1]),
                'can_create': bool(row[2]),
                'can_edit': bool(row[3]),
                'can_delete': bool(row[4])
            }

        return permissions
    except (pg_errors.UndefinedTable, psycopg2.OperationalError):
        log_warning("⚠️ Таблица role_permissions не существует", "database")
        return {}
    finally:
        conn.close()

def update_role_permissions(role_key: str, permissions: dict) -> bool:
    """Обновить права роли"""
    conn = get_db_connection()
    c = conn.cursor()

    if role_key == 'admin':
        # Admin always has full access by design.
        # Keep request successful to avoid client-side 400 errors.
        log_warning("⚠️ Изменение прав роли admin проигнорировано: у admin всегда полный доступ", "database")
        conn.close()
        return True

    try:
        c.execute("DELETE FROM role_permissions WHERE role_key = %s", (role_key,))

        for perm_key, perms in permissions.items():
            c.execute("""INSERT INTO role_permissions 
                        (role_key, permission_key, can_view, can_create, can_edit, can_delete)
                        VALUES (%s, %s, %s, %s, %s, %s)""",
                      (role_key, perm_key,
                       True if perms.get('can_view') else False,
                       True if perms.get('can_create') else False,
                       True if perms.get('can_edit') else False,
                       True if perms.get('can_delete') else False))

        conn.commit()
        log_info(f"✅ Права роли '{role_key}' обновлены", "database")
        return True
    except Exception as e:
        log_error(f"Ошибка обновления прав: {e}", "database")
        conn.rollback()
        return False
    finally:
        conn.close()

def check_user_permission(user_id: int, permission_key: str, action: str = 'view') -> bool:
    """
    Проверить есть ли у пользователя право на действие

    Args:
        user_id: ID пользователя
        permission_key: ключ права (например 'clients_view')
        action: действие ('view', 'create', 'edit', 'delete')

    Returns:
        bool: True если право есть
    """
    conn = get_db_connection()
    c = conn.cursor()

    try:
        c.execute("SELECT role FROM users WHERE id = %s", (user_id,))
        result = c.fetchone()

        if not result:
            return False

        role_key = result[0]

        if role_key == 'admin':
            return True

        column = f"can_{action}"
        c.execute(f"""SELECT {column} FROM role_permissions 
                     WHERE role_key = %s AND permission_key = %s""",
                  (role_key, permission_key))

        result = c.fetchone()
        return bool(result[0]) if result else False

    except Exception as e:
        log_error(f"Ошибка проверки прав: {e}", "database")
        return False
    finally:
        conn.close()

def update_bot_globally_enabled(enabled: bool):
    """Включить/выключить бота глобально (через bot_config)"""
    conn = get_db_connection()
    c = conn.cursor()

    try:
        # Check if bot_config column exists
        c.execute("""
            SELECT COUNT(*) FROM information_schema.columns
            WHERE table_name = 'salon_settings' AND column_name = 'bot_config'
        """)
        has_bot_config = c.fetchone()[0] > 0

        if not has_bot_config:
            # Add bot_config column if it doesn't exist
            c.execute("ALTER TABLE salon_settings ADD COLUMN IF NOT EXISTS bot_config JSONB DEFAULT '{}'")
            conn.commit()

        # 1. Get current config
        c.execute("SELECT bot_config FROM salon_settings WHERE id = 1")
        row = c.fetchone()
        current_config = {}
        if row and row[0]:
            if isinstance(row[0], str):
                current_config = json.loads(row[0])
            else:
                current_config = row[0]

        # 2. Update field
        current_config['enabled'] = enabled

        # 3. Save back
        c.execute("""
            UPDATE salon_settings
            SET bot_config = %s, updated_at = CURRENT_TIMESTAMP
            WHERE id = 1
        """, (json.dumps(current_config, cls=DateTimeEncoder),))

        conn.commit()
        log_info(f"✅ Bot globally {'enabled' if enabled else 'disabled'}", "database")
    except Exception as e:
        log_error(f"Error updating bot global status: {e}", "database")
        conn.rollback()
    finally:
        conn.close()
