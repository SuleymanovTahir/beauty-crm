"""
Функции для работы с настройками салона и бота
"""

from datetime import datetime
import json
import os
import psycopg2
from psycopg2 import errors as pg_errors

from db.connection import get_db_connection
from utils.logger import log_error, log_warning, log_info

from core.config import (
    DEFAULT_HOURS_WEEKDAYS,
    DEFAULT_HOURS_WEEKENDS,
    DEFAULT_LUNCH_START,
    DEFAULT_LUNCH_END,
    DEFAULT_REPORT_TIME
)

class DateTimeEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, datetime):
            return obj.isoformat()
        return super().default(obj)

# ===== НАСТРОЙКИ САЛОНА =====

def get_salon_settings() -> dict:
    """Получить настройки салона из БД (Архитектура v2.0)"""
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
                "instagram": row.get("instagram"),
                "whatsapp": row.get("whatsapp"),
                "booking_url": row.get("booking_url", ""),
                "timezone": row.get("timezone", "Asia/Dubai"),
                "currency": row.get("currency", "AED"),
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
    return {
        "id": 1,
        "name": os.getenv('SALON_NAME', 'Beauty Salon'),
        "hours_weekdays": DEFAULT_HOURS_WEEKDAYS,
        "hours_weekends": DEFAULT_HOURS_WEEKENDS,
        "lunch_start": DEFAULT_LUNCH_START,
        "lunch_end": DEFAULT_LUNCH_END,
        "phone": os.getenv('SALON_PHONE', ''),
        "email": os.getenv('SALON_EMAIL', ''),
        "bot_name": os.getenv('BOT_NAME', 'Assistant'),
        "timezone": "Asia/Dubai",
        "currency": get_salon_currency(),
        "gallery_display_count": 6,
        "portfolio_display_count": 6,
        "services_display_count": 6,
        "faces_display_count": 6
    }

def update_salon_settings(data: dict) -> bool:
    """Обновить настройки салона (Архитектура v2.0 - SSOT)"""
    conn = get_db_connection()
    c = conn.cursor()

    try:
        # 1. Fetch current for merging custom_settings
        c.execute("SELECT custom_settings FROM salon_settings WHERE id = 1")
        row = c.fetchone()
        custom = row[0] if row and row[0] else {}
        if isinstance(custom, str):
            try:
                custom = json.loads(custom)
            except:
                custom = {}

        # 2. Map fields
        direct_fields = [
            'name', 'address', 'google_maps', 'hours_weekdays', 'hours_weekends',
            'lunch_start', 'lunch_end', 'phone', 'email', 'instagram', 'whatsapp',
            'booking_url', 'timezone', 'currency', 'city', 'country',
            'latitude', 'longitude', 'logo_url', 'base_url', 'bot_name'
        ]
        
        custom_fields = [
            'gallery_display_count', 'portfolio_display_count', 
            'services_display_count', 'faces_display_count'
        ]

        set_parts = []
        params = []

        # Handle direct fields
        for field in direct_fields:
            if field in data:
                set_parts.append(f"{field} = %s")
                params.append(data[field])

        # Handle custom fields (consolidate into JSONB)
        custom_updated = False
        for field in custom_fields:
            if field in data:
                custom[field] = data[field]
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
        # Теперь читаем из salon_settings
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

        else:
            log_warning("⚠️ Настройки бота в salon_settings пусты, используются дефолты", "database")
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
    from bot.constants import SERVICE_SYNONYMS, OBJECTION_KEYWORDS, PROMPT_HEADERS
    
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
        "service_synonyms": json.dumps(SERVICE_SYNONYMS, ensure_ascii=False),
        "objection_keywords": json.dumps(OBJECTION_KEYWORDS, ensure_ascii=False),
        "prompt_headers": json.dumps(PROMPT_HEADERS, ensure_ascii=False),
    }

def update_bot_settings(data: dict) -> bool:
    """Обновить настройки бота в единой таблице salon_settings"""
    conn = get_db_connection()
    c = conn.cursor()

    try:
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

    if role_key in ['admin', 'manager', 'employee']:
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

    if role_key in ['admin', 'manager', 'employee']:
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
        log_error("❌ Нельзя изменить права роли admin", "database")
        return False

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
