"""
Функции для работы с настройками салона и бота
"""
import sqlite3
from datetime import datetime

from config import DATABASE_NAME
from logger import log_error, log_warning, log_info


# ===== НАСТРОЙКИ САЛОНА =====

def get_salon_settings() -> dict:
    """Получить настройки салона из БД"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    try:
        c.execute("SELECT * FROM salon_settings LIMIT 1")
        result = c.fetchone()

        if result:
            columns = [description[0] for description in c.description]
            row_dict = dict(zip(columns, result))
            return {
                "id": result[0],
                "name": result[1],
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
                "updated_at": result[21] if len(result) > 21 else None,
                "hours_weekdays": result[22] if len(result) > 22 else "10:30 - 21:00",
                "hours_weekends": result[23] if len(result) > 23 else "10:30 - 21:00"
            }
        else:
            log_warning(
                "⚠️ Настройки салона пусты, используются дефолты", "database")
            return _get_default_salon_settings()

    except sqlite3.OperationalError as e:
        log_error(f"❌ Таблица salon_settings не существует: {e}", "database")
        return _get_default_salon_settings()
    except Exception as e:
        log_error(
            f"❌ Непредвиденная ошибка в get_salon_settings: {e}", "database")
        return _get_default_salon_settings()
    finally:
        conn.close()


def _get_default_salon_settings() -> dict:
    """Дефолтные настройки салона"""
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
        "hours_weekdays": "10:30 - 21:00",
        "hours_weekends": "10:30 - 21:00",
        "booking_url": "https://n1314037.alteg.io",
        "phone": "+971 52 696 1100",
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


def update_salon_settings(data: dict) -> bool:
    """Обновить настройки салона"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    try:
        c.execute("""UPDATE salon_settings SET
                    name = ?, name_ar = ?, address = ?, address_ar = ?,
                    google_maps = ?, hours = ?, hours_ru = ?, hours_ar = ?,
                    hours_weekdays = ?, hours_weekends = ?,
                    booking_url = ?, phone = ?, email = ?, instagram = ?,
                    whatsapp = ?, bot_name = ?, bot_name_en = ?, bot_name_ar = ?,
                    city = ?, country = ?, timezone = ?, currency = ?,
                    updated_at = CURRENT_TIMESTAMP
                    WHERE id = 1""",
                  (data.get('name'),
                   data.get('name_ar'),
                   data.get('address'),
                   data.get('address_ar'),
                   data.get('google_maps'),
                   data.get('hours'),
                   data.get('hours_ru'),
                   data.get('hours_ar'),
                   data.get('hours_weekdays'),
                   data.get('hours_weekends'),
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


# ===== НАСТРОЙКИ БОТА =====

def get_bot_settings() -> dict:
    """Получить настройки бота из БД"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    try:
        c.execute("SELECT * FROM bot_settings LIMIT 1")
        result = c.fetchone()

        if result:
            # ✅ БЕЗОПАСНЫЙ СПОСОБ - используем названия колонок
            columns = [description[0] for description in c.description]
            row_dict = dict(zip(columns, result))

            log_info(
                f"✅ Loaded bot settings with {len(columns)} columns", "database")

            # ✅ Создаём словарь result вместо прямого return
            result_dict = {
                "id": row_dict.get("id"),
                "bot_name": row_dict.get("bot_name", "M.Le Diamant Assistant"),
                "personality_traits": row_dict.get("personality_traits", ""),
                "greeting_message": row_dict.get("greeting_message", ""),
                "farewell_message": row_dict.get("farewell_message", ""),
                "price_explanation": row_dict.get("price_explanation", ""),
                "price_response_template": row_dict.get("price_response_template", ""),
                "premium_justification": row_dict.get("premium_justification", ""),
                "booking_redirect_message": row_dict.get("booking_redirect_message", ""),
                "fomo_messages": row_dict.get("fomo_messages", ""),
                "upsell_techniques": row_dict.get("upsell_techniques", ""),
                "communication_style": row_dict.get("communication_style", ""),
                "max_message_chars": row_dict.get("max_message_chars", 300),
                "max_message_length": row_dict.get("max_message_length", 4),
                "emoji_usage": row_dict.get("emoji_usage", ""),
                "languages_supported": row_dict.get("languages_supported", "ru,en,ar"),
                "objection_handling": row_dict.get("objection_handling", ""),
                "negative_handling": row_dict.get("negative_handling", ""),
                "safety_guidelines": row_dict.get("safety_guidelines", ""),
                "example_good_responses": row_dict.get("example_good_responses", ""),
                "algorithm_actions": row_dict.get("algorithm_actions", ""),
                "location_features": row_dict.get("location_features", ""),
                "seasonality": row_dict.get("seasonality", ""),
                "emergency_situations": row_dict.get("emergency_situations", ""),
                "success_metrics": row_dict.get("success_metrics", ""),
                "objection_expensive": row_dict.get("objection_expensive", ""),
                "objection_think_about_it": row_dict.get("objection_think_about_it", ""),
                "objection_no_time": row_dict.get("objection_no_time", ""),
                "objection_pain": row_dict.get("objection_pain", ""),
                "objection_result_doubt": row_dict.get("objection_result_doubt", ""),
                "objection_cheaper_elsewhere": row_dict.get("objection_cheaper_elsewhere", ""),
                "objection_too_far": row_dict.get("objection_too_far", ""),
                "objection_consult_husband": row_dict.get("objection_consult_husband", ""),
                "objection_first_time": row_dict.get("objection_first_time", ""),
                "objection_not_happy": row_dict.get("objection_not_happy", ""),
                "emotional_triggers": row_dict.get("emotional_triggers", ""),
                "social_proof_phrases": row_dict.get("social_proof_phrases", ""),
                "personalization_rules": row_dict.get("personalization_rules", ""),
                "example_dialogues": row_dict.get("example_dialogues", ""),
                "emotional_responses": row_dict.get("emotional_responses", ""),
                "anti_patterns": row_dict.get("anti_patterns", ""),
                "voice_message_response": row_dict.get("voice_message_response", ""),
                "contextual_rules": row_dict.get("contextual_rules", ""),
                "auto_cancel_discounts": row_dict.get("auto_cancel_discounts", ""),
                "comment_reply_settings": row_dict.get("comment_reply_settings", "{}"),
                "ad_campaign_detection": row_dict.get("ad_campaign_detection", ""),
                "pre_booking_data_collection": row_dict.get("pre_booking_data_collection", ""),
                "manager_consultation_prompt": row_dict.get("manager_consultation_prompt", ""),
                "booking_time_logic": row_dict.get("booking_time_logic", ""),
                "booking_data_collection": row_dict.get("booking_data_collection", ""),
                # ✅ ДОБАВЬ
                "booking_availability_instructions": row_dict.get("booking_availability_instructions", ""),
                "updated_at": row_dict.get("updated_at"),
            }

            # ✅ Дозаполняем критические пустые поля дефолтами
            defaults = _get_default_bot_settings()
            if not result_dict.get('booking_time_logic'):
                result_dict['booking_time_logic'] = defaults['booking_time_logic']
                log_info(
                    "✅ Дозаполнено booking_time_logic из дефолтов", "database")
            if not result_dict.get('booking_data_collection'):
                result_dict['booking_data_collection'] = defaults['booking_data_collection']
                log_info(
                    "✅ Дозаполнено booking_data_collection из дефолтов", "database")

            return result_dict

        else:
            log_warning(
                "⚠️ Настройки бота пусты, используются дефолты", "database")
            return _get_default_bot_settings()

    except sqlite3.OperationalError as e:
        log_error(f"❌ Таблица bot_settings не существует: {e}", "database")
        return _get_default_bot_settings()
    except Exception as e:
        log_error(
            f"❌ Непредвиденная ошибка в get_bot_settings: {e}", "database")
        import traceback
        log_error(traceback.format_exc(), "database")
        return _get_default_bot_settings()
    finally:
        conn.close()


def _get_default_bot_settings() -> dict:
    """Дефолтные настройки бота"""
    try:
        salon = get_salon_settings()
        bot_name = salon.get('bot_name', 'M.Le Diamant Assistant')
    except:
        bot_name = 'M.Le Diamant Assistant'

    return {
        "id": 1,
        "bot_name": bot_name,
        "personality_traits": "Профессионал с международным опытом\nУверенный, харизматичный, НЕ навязчивый",
        "greeting_message": "Привет! 😊 Добро пожаловать в M.Le Diamant!",
        "farewell_message": "Спасибо! До встречи! 💖",
        "price_explanation": "Мы в премиум-сегменте 💎",
        "price_response_template": "{SERVICE} {PRICE} AED 💎\n{DESCRIPTION}\nЗаписаться?",
        "premium_justification": "",
        "booking_redirect_message": "Я AI-ассистент, запись онлайн!\nВыберите время: {BOOKING_URL}",
        "fomo_messages": "",
        "upsell_techniques": "",
        "communication_style": "Короткий, дружелюбный, экспертный",
        "max_message_chars": 300,
        "emoji_usage": "Минимальное (1-2 на сообщение)",
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
        "voice_message_response": "Извините, я AI и не слушаю голосовые 😊\nНапишите текстом!",
        "contextual_rules": "",
        "ad_campaign_detection": "",
        "pre_booking_data_collection": "Для записи нужно имя и WhatsApp — это займет секунду! 😊",
        "manager_consultation_prompt": "",
        "booking_data_collection": """...""",
        "booking_availability_instructions":  """Отлично! Для записи нужно:
- Имя
- WhatsApp номер

Как вас зовут?

После получения имени:
"Спасибо, [Имя]! WhatsApp номер?"

Затем предлагай конкретное время из расписания.""",

        # ✅ ЗАМЕНИ строку:
        "booking_availability_instructions": """...""",  # ❌ УДАЛИ

        # ✅ НА:
        "booking_availability_instructions": """🎯 ЛОГИКА ПОКАЗА МАСТЕРОВ:

1️⃣ ЕСЛИ УСЛУГА НЕ ОПРЕДЕЛЕНА:
Клиент спрашивает про запись, но НЕ указал услугу.

ОБЯЗАТЕЛЬНО СПРОСИ:
"Какая услуга вас интересует?
- Маникюр 💅
- Педикюр 🦶
- Стрижка/Окрашивание волос ✂️
- Массаж 💆
- Другое?"

⚠️ НЕ показывай всех мастеров подряд!
⚠️ НЕ начинай сбор данных!

2️⃣ ЕСЛИ УСЛУГА ОПРЕДЕЛЕНА:
Покажи ТОЛЬКО мастеров этой услуги с КОНКРЕТНЫМ временем.

ПРАВИЛЬНЫЙ ФОРМАТ:
"На [дата] по [услуга] есть:
- [Имя мастера]: 11:00, 14:00, 17:00
- [Имя мастера]: 10:00, 15:00, 18:30

Какое время подходит?"

3️⃣ КРИТИЧЕСКИ ВАЖНО:
❌ НЕ пиши "Для записи нужны имя и WhatsApp" - РАНО!
❌ НЕ показывай мастеров других услуг!
✅ Дождись когда клиент ВЫБЕРЕТ время, ПОТОМ начинай сбор данных!

💡 Имена мастеров показывай на языке клиента (если есть перевод в БД)""",
        "updated_at": None,
        "booking_time_logic": """🎯 ЛОГИКА ВЫБОРА ВРЕМЕНИ:

A) Проверь пожелания клиента:
   - Указал дату? → предлагай эту дату
   - Указал время? → предлагай это время
   - Указал мастера? → смотри когда этот мастер работает

B) Проверь историю клиента:
   - В какое время обычно записывался
   - В какой день недели
   - К какому мастеру ходил

C) Анализируй текущее время:
   - Клиент пишет утром → НЕ предлагай через час
   - Предлагай через 3-4 часа минимум ИЛИ на другие дни

D) Предлагай КОНКРЕТНОЕ время:
   ✅ "Есть завтра в 15:00 у Дианы или послезавтра в 11:00. Что подходит?"

G) 🧠 ВКЛЮЧАЙ СМЕКАЛКУ - НЕ СДАВАЙСЯ!
   → Дата важна? → предложи другого мастера
   → Мастер важен? → предложи другую дату""",
        "booking_data_collection": """Отлично! Для записи нужно:
- Имя
- WhatsApp номер

Как вас зовут?

После получения имени:
"Спасибо, [Имя]! WhatsApp номер?"

Затем предлагай конкретное время из расписания.""",
        "updated_at": None
    }


def update_bot_settings(data: dict) -> bool:
    """Обновить настройки бота"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    try:
        # Получаем список всех колонок
        c.execute("PRAGMA table_info(bot_settings)")
        columns = [row[1] for row in c.fetchall()]

        # Формируем SET часть запроса только для существующих колонок
        set_parts = []
        params = []

        field_mapping = {
            'bot_name': 'bot_name',
            'personality_traits': 'personality_traits',
            'greeting_message': 'greeting_message',
            'farewell_message': 'farewell_message',
            'price_explanation': 'price_explanation',
            'price_response_template': 'price_response_template',
            'premium_justification': 'premium_justification',
            'booking_redirect_message': 'booking_redirect_message',
            'fomo_messages': 'fomo_messages',
            'upsell_techniques': 'upsell_techniques',
            'communication_style': 'communication_style',
            'max_message_chars': 'max_message_chars',
            'emoji_usage': 'emoji_usage',
            'languages_supported': 'languages_supported',
            'objection_handling': 'objection_handling',
            'negative_handling': 'negative_handling',
            'safety_guidelines': 'safety_guidelines',
            'example_good_responses': 'example_good_responses',
            'algorithm_actions': 'algorithm_actions',
            'location_features': 'location_features',
            'seasonality': 'seasonality',
            'emergency_situations': 'emergency_situations',
            'success_metrics': 'success_metrics',
            'objection_expensive': 'objection_expensive',
            'objection_think_about_it': 'objection_think_about_it',
            'objection_no_time': 'objection_no_time',
            'objection_pain': 'objection_pain',
            'objection_result_doubt': 'objection_result_doubt',
            'objection_cheaper_elsewhere': 'objection_cheaper_elsewhere',
            'objection_too_far': 'objection_too_far',
            'objection_consult_husband': 'objection_consult_husband',
            'objection_first_time': 'objection_first_time',
            'objection_not_happy': 'objection_not_happy',
            'emotional_triggers': 'emotional_triggers',
            'social_proof_phrases': 'social_proof_phrases',
            'personalization_rules': 'personalization_rules',
            'example_dialogues': 'example_dialogues',
            'emotional_responses': 'emotional_responses',
            'anti_patterns': 'anti_patterns',
            'voice_message_response': 'voice_message_response',
            'contextual_rules': 'contextual_rules',
            'ad_campaign_detection': 'ad_campaign_detection',
            'pre_booking_data_collection': 'pre_booking_data_collection',
            'manager_consultation_prompt': 'manager_consultation_prompt',
            'booking_time_logic': 'booking_time_logic',
            'booking_data_collection': 'booking_data_collection',
            'booking_availability_instructions': 'booking_availability_instructions',
        }

        for data_key, db_column in field_mapping.items():
            if db_column in columns and data_key in data:
                set_parts.append(f"{db_column} = ?")
                params.append(data[data_key])

        if set_parts:
            set_parts.append("updated_at = CURRENT_TIMESTAMP")
            query = f"UPDATE bot_settings SET {', '.join(set_parts)} WHERE id = 1"
            c.execute(query, params)
            conn.commit()
            log_info(
                f"✅ Настройки бота обновлены ({len(set_parts)-1} полей)", "database")
            return True
        else:
            log_warning("⚠️ Нет полей для обновления", "database")
            return False

    except Exception as e:
        log_error(f"Ошибка обновления настроек бота: {e}", "database")
        import traceback
        log_error(traceback.format_exc(), "database")
        conn.rollback()
        return False
    finally:
        conn.close()


# ===== КАСТОМНЫЕ СТАТУСЫ =====

def get_custom_statuses() -> list:
    """Получить все кастомные статусы"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    try:
        c.execute("SELECT * FROM custom_statuses ORDER BY created_at DESC")
        return c.fetchall()
    except sqlite3.OperationalError:
        log_warning("⚠️ Таблица custom_statuses не существует", "database")
        return []
    finally:
        conn.close()


def create_custom_status(status_key: str, status_label: str, status_color: str,
                         status_icon: str, created_by: int) -> bool:
    """Создать кастомный статус"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    try:
        now = datetime.now().isoformat()
        c.execute("""INSERT INTO custom_statuses 
                     (status_key, status_label, status_color, status_icon, created_at, created_by)
                     VALUES (?, ?, ?, ?, ?, ?)""",
                  (status_key, status_label, status_color, status_icon, now, created_by))
        conn.commit()
        log_info(f"✅ Статус '{status_key}' создан", "database")
        return True
    except sqlite3.IntegrityError:
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
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    try:
        c.execute("DELETE FROM custom_statuses WHERE status_key = ?",
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
            'role_key': 'employee',
            'role_name': 'Сотрудник',
            'role_description': 'Базовый доступ к клиентам и записям',
            'is_builtin': True
        }
    ]

    conn = sqlite3.connect(DATABASE_NAME)
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
    except sqlite3.OperationalError:
        log_warning("⚠️ Таблица custom_roles не существует", "database")
    finally:
        conn.close()

    return builtin_roles


def create_custom_role(role_key: str, role_name: str, role_description: str = None, created_by: int = None) -> bool:
    """Создать кастомную роль"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    if role_key in ['admin', 'manager', 'employee']:
        log_error(
            f"❌ Нельзя создать роль с ключом '{role_key}' - это встроенная роль", "database")
        return False

    try:
        now = datetime.now().isoformat()
        c.execute("""INSERT INTO custom_roles (role_key, role_name, role_description, created_at, created_by)
                    VALUES (?, ?, ?, ?, ?)""",
                  (role_key, role_name, role_description, now, created_by))

        conn.commit()
        log_info(f"✅ Кастомная роль '{role_key}' создана", "database")
        return True
    except sqlite3.IntegrityError:
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
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    if role_key in ['admin', 'manager', 'employee']:
        log_error(f"❌ Нельзя удалить встроенную роль '{role_key}'", "database")
        return False

    try:
        c.execute("DELETE FROM custom_roles WHERE role_key = ?", (role_key,))
        c.execute("DELETE FROM role_permissions WHERE role_key = ?", (role_key,))

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
    conn = sqlite3.connect(DATABASE_NAME)
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
                    FROM role_permissions WHERE role_key = ?""", (role_key,))

        permissions = {}
        for row in c.fetchall():
            permissions[row[0]] = {
                'can_view': bool(row[1]),
                'can_create': bool(row[2]),
                'can_edit': bool(row[3]),
                'can_delete': bool(row[4])
            }

        return permissions
    except sqlite3.OperationalError:
        log_warning("⚠️ Таблица role_permissions не существует", "database")
        return {}
    finally:
        conn.close()


def update_role_permissions(role_key: str, permissions: dict) -> bool:
    """Обновить права роли"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    if role_key == 'admin':
        log_error("❌ Нельзя изменить права роли admin", "database")
        return False

    try:
        c.execute("DELETE FROM role_permissions WHERE role_key = ?", (role_key,))

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
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    try:
        c.execute("SELECT role FROM users WHERE id = ?", (user_id,))
        result = c.fetchone()

        if not result:
            return False

        role_key = result[0]

        if role_key == 'admin':
            return True

        column = f"can_{action}"
        c.execute(f"""SELECT {column} FROM role_permissions 
                     WHERE role_key = ? AND permission_key = ?""",
                  (role_key, permission_key))

        result = c.fetchone()
        return bool(result[0]) if result else False

    except Exception as e:
        log_error(f"Ошибка проверки прав: {e}", "database")
        return False
    finally:
        conn.close()


def update_bot_globally_enabled(enabled: bool):
    """Включить/выключить бота глобально"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    c.execute("""
        UPDATE salon_settings 
        SET bot_globally_enabled = ?
        WHERE id = 1
    """, (1 if enabled else 0,))

    conn.commit()
    conn.close()
