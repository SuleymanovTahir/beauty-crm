"""
Функции для работы с настройками салона и бота
"""

from datetime import datetime
import json
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

# ===== НАСТРОЙКИ САЛОНА =====

def get_salon_settings() -> dict:
    """Получить настройки салона из БД"""
    conn = get_db_connection()
    c = conn.cursor()

    try:
        c.execute("SELECT * FROM salon_settings LIMIT 1")
        result = c.fetchone()

        if result:
            columns = [description[0] for description in c.description]
            row_dict = dict(zip(columns, result))
            return {
                "id": row_dict.get("id", 1),
                "name": row_dict.get("name"),
                "name_ar": row_dict.get("name_ar"),
                "address": row_dict.get("address", ""),
                "address_ar": row_dict.get("address_ar"),
                "google_maps": row_dict.get("google_maps", ""),
                "google_place_id": row_dict.get("google_place_id", ""),
                "google_api_key": row_dict.get("google_api_key", ""),
                "hours": f"Daily {DEFAULT_HOURS_WEEKDAYS}",  # ✅ Используем константу
                "hours_ru": f"Ежедневно {DEFAULT_HOURS_WEEKDAYS}",  # ✅ Используем константу
                "hours_ar": f"يوميًا {DEFAULT_HOURS_WEEKDAYS}",  # ✅ Используем константу
                "booking_url": row_dict.get("booking_url", ""),
                "phone": row_dict.get("phone", ""),
                "email": row_dict.get("email"),
                "instagram": row_dict.get("instagram"),
                "whatsapp": row_dict.get("whatsapp"),
                "bot_name": row_dict.get("bot_name", "Assistant"),
                "bot_name_en": row_dict.get("bot_name_en", "Assistant"),
                "bot_name_ar": row_dict.get("bot_name_ar", "مساعد"),
                "city": row_dict.get("city", "Dubai"),
                "country": row_dict.get("country", "UAE"),
                "timezone": row_dict.get("timezone", "Asia/Dubai"),
                "timezone_offset": row_dict.get("timezone_offset", "UTC+4"),
                "currency": row_dict.get("currency", "AED"),
                "birthday_discount": row_dict.get("birthday_discount", "15%"),
                "updated_at": row_dict.get("updated_at"),
                "hours_weekdays": row_dict.get("hours_weekdays", DEFAULT_HOURS_WEEKDAYS),  # ✅ Используем константу
                "hours_weekends": row_dict.get("hours_weekends", DEFAULT_HOURS_WEEKENDS),  # ✅ Используем константу
                "promo_end_date": row_dict.get("promo_end_date"),
                "lunch_start": row_dict.get("lunch_start", DEFAULT_LUNCH_START),  # ✅ Используем константу
                "lunch_end": row_dict.get("lunch_end", DEFAULT_LUNCH_END),  # ✅ Используем константу
                # SEO & Analytics fields
                "google_analytics_id": row_dict.get("google_analytics_id"),
                "facebook_pixel_id": row_dict.get("facebook_pixel_id"),
                "latitude": row_dict.get("latitude", 25.2048),  # JBR Dubai default
                "longitude": row_dict.get("longitude", 55.2708),  # JBR Dubai default
                "logo_url": row_dict.get("logo_url", "/assets/logo.webp"),
                "base_url": row_dict.get("base_url", "https://mlediamant.com")
            }
        else:
            log_warning(
                "⚠️ Настройки салона пусты, используются дефолты", "database")
            return _get_default_salon_settings()

    except pg_errors.UndefinedTable as e:
        log_error(f"❌ Таблица salon_settings не существует: {e}", "database")
        return _get_default_salon_settings()
    except psycopg2.OperationalError as e:
        log_error(f"❌ Ошибка подключения к БД: {e}", "database")
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
        "name": "M.Le Diamant Beauty Lounge",  # Fallback only
        "name_ar": None,
        "address": "Shop 13, Amwaj 3 Plaza Level, JBR, Dubai",
        "address_ar": None,
        "google_maps": "https://maps.app.goo.gl/Puh5X1bNEjWPiToz6",
        "hours": "Daily 10:30 - 21:00",
        "hours_ru": "Ежедневно 10:30 - 21:00",
        "hours_ar": "يوميًا 10:30 - 21:00",
        "hours_weekdays": DEFAULT_HOURS_WEEKDAYS,  # ✅ Используем константу
        "hours_weekends": DEFAULT_HOURS_WEEKENDS,  # ✅ Используем константу
        "lunch_start": DEFAULT_LUNCH_START,  # ✅ Используем константу
        "lunch_end": DEFAULT_LUNCH_END,  # ✅ Используем константу
        "booking_url": "https://n1314037.alteg.io",
        "phone": "+971526961100",  # Fallback only
        "email": "mladiamontuae@gmail.com",  # Fallback only
        "instagram": "https://www.instagram.com/mlediamant/",
        "whatsapp": None,
        "bot_name": "M.Le Diamant Assistant",
        "bot_name_en": "M.Le Diamant Assistant",
        "bot_name_ar": "مساعد M.Le Diamant",
        "city": "Dubai",
        "country": "UAE",
        "timezone": "Asia/Dubai",
        "timezone_offset": "UTC+4",
        "currency": "AED",
        "birthday_discount": "15%",
        "updated_at": None,
        "promo_end_date": None,
        # SEO & Analytics fields
        "google_analytics_id": None,
        "facebook_pixel_id": None,
        "latitude": 25.2048,  # JBR Dubai
        "longitude": 55.2708,  # JBR Dubai
        "logo_url": "/assets/logo.webp",
        "base_url": "https://mlediamant.com"
    }

def update_salon_settings(data: dict) -> bool:
    """Обновить настройки салона (поддерживает частичное обновление)"""
    conn = get_db_connection()
    c = conn.cursor()

    try:
        # Список всех возможных полей для обновления
        field_mapping = {
            'name': 'name',
            'name_ar': 'name_ar',
            'address': 'address',
            'address_ar': 'address_ar',
            'google_maps': 'google_maps',
            'hours': 'hours',
            'hours_ru': 'hours_ru',
            'hours_ar': 'hours_ar',
            'hours_weekdays': 'hours_weekdays',
            'hours_weekends': 'hours_weekends',
            'lunch_start': 'lunch_start',
            'lunch_end': 'lunch_end',
            'booking_url': 'booking_url',
            'phone': 'phone',
            'email': 'email',
            'instagram': 'instagram',
            'whatsapp': 'whatsapp',
            'bot_name': 'bot_name',
            'bot_name_en': 'bot_name_en',
            'bot_name_ar': 'bot_name_ar',
            'city': 'city',
            'country': 'country',
            'timezone': 'timezone',
            'timezone_offset': 'timezone_offset',
            'currency': 'currency',
            'birthday_discount': 'birthday_discount',
            'promo_end_date': 'promo_end_date',
            # SEO & Analytics fields
            'google_analytics_id': 'google_analytics_id',
            'facebook_pixel_id': 'facebook_pixel_id',
            'latitude': 'latitude',
            'longitude': 'longitude',
            'logo_url': 'logo_url',
            'base_url': 'base_url'
        }

        # Формируем SET часть запроса только для предоставленных полей
        set_parts = []
        params = []

        for data_key, db_column in field_mapping.items():
            if data_key in data:
                set_parts.append(f"{db_column} = %s")
                params.append(data[data_key])

        if not set_parts:
            log_warning("⚠️ Нет полей для обновления", "database")
            return False

        # Добавляем updated_at
        set_parts.append("updated_at = CURRENT_TIMESTAMP")

        # Формируем и выполняем запрос
        query = f"UPDATE salon_settings SET {', '.join(set_parts)} WHERE id = 1"
        c.execute(query, params)

        conn.commit()
        log_info(f"✅ Настройки салона обновлены ({len(set_parts)-1} полей)", "database")
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
    conn = get_db_connection()
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
                "bot_name": row_dict.get("bot_name"),
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
                "context_memory": row_dict.get("context_memory", ""),
                "avoid_repetition": row_dict.get("avoid_repetition", ""),
                "conversation_flow_rules": row_dict.get("conversation_flow_rules", ""),
                "personality_adaptations": row_dict.get("personality_adaptations", ""),
                "smart_objection_detection": row_dict.get("smart_objection_detection", ""),
                "service_synonyms": row_dict.get("service_synonyms", "{}"),
                "objection_keywords": row_dict.get("objection_keywords", "{}"),
                "prompt_headers": row_dict.get("prompt_headers", "{}"),
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

            # ✅ Заменяем плейсхолдеры перед возвратом
            salon_settings = get_salon_settings()
            result_dict = _replace_bot_placeholders(result_dict, salon_settings)

            return result_dict

        else:
            log_warning(
                "⚠️ Настройки бота пусты, используются дефолты", "database")
            return _get_default_bot_settings()

    except pg_errors.UndefinedTable as e:
        log_error(f"❌ Таблица bot_settings не существует: {e}", "database")
        return _get_default_bot_settings()
    except psycopg2.OperationalError as e:
        log_error(f"❌ Ошибка подключения к БД: {e}", "database")
        return _get_default_bot_settings()
    except Exception as e:
        log_error(
            f"❌ Непредвиденная ошибка в get_bot_settings: {e}", "database")
        import traceback
        log_error(traceback.format_exc(), "database")
        return _get_default_bot_settings()
    finally:
        conn.close()

def _replace_bot_placeholders(bot_settings: dict, salon_settings: dict) -> dict:
    """Заменить плейсхолдеры в настройках бота на реальные значения"""
    replacements = {
        '{SALON_NAME}': salon_settings.get('name') or 'Salon',
        '{CURRENCY}': salon_settings.get('currency', 'AED'),
        '{LOCATION}': f"{salon_settings.get('city', 'Dubai')}, {salon_settings.get('address', '')}".strip(', '),
        '{CITY}': salon_settings.get('city', 'Dubai'),
        '{ADDRESS}': salon_settings.get('address', ''),
        '{PHONE}': salon_settings.get('phone', ''),
        '{BOOKING_URL}': salon_settings.get('booking_url', ''),
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
        "price_response_template": "{SERVICE} {PRICE} AED 💎\n{DESCRIPTION}\nЗаписаться%s",
        "premium_justification": "",
        "booking_redirect_message": "Я AI-ассистент, запись онлайн!\nВыберите время: {BOOKING_URL}",
        "fomo_messages": "🔥 'Осталось всего 2 места на завтра!'\n⏳ 'Этот мастер очень популярен, лучше записаться заранее'",
        "upsell_techniques": "➕ 'Хотите добавить SPA-уход для рук? Это всего +15 минут и +50 AED, но руки будут как шёлк!'\n💅 'Сделаем дизайн на 2 пальчика в подарок?'",
        "communication_style": "Короткий, дружелюбный, экспертный",
        "emoji_usage": "Минимальное (1-2 на сообщение)",
        "languages_supported": "ru,en,ar",
        "objection_handling": "",
        "negative_handling": "😞 'Нам очень жаль, что так вышло. Пожалуйста, напишите управляющему: {PHONE}. Мы обязательно разберемся и компенсируем!'",
        "safety_guidelines": "🛡️ 'Мы используем одноразовые пилки и крафт-пакеты, вскрываем при вас.'",
        "example_good_responses": "✅ 'Отлично! Записала вас на субботу 14:00. Придет SMS с подтверждением.'",
        "algorithm_actions": "",
        "location_features": "🅿️ 'У нас есть бесплатная парковка для клиентов.'\n☕ 'Вкусный кофе и сериалы включены!'",
        "seasonality": "🌞 'Летом рекомендуем педикюр с покрытием Luxio - держится до 4 недель!'",
        "emergency_situations": "🆘 'Если вы опаздываете - предупредите, пожалуйста, мы постараемся сдвинуть запись.'",
        "success_metrics": "",
        "objection_expensive": "💰 'Дорого' - НЕ снижай цену! Подчеркни ценность и качество (премиум материалы, стерильность)",
        "objection_think_about_it": "🤔 'Подумать' - Дай конкретную информацию, предложи свободное окно на выбор",
        "objection_no_time": "⏰ 'Нет времени' - Покажи что процедура быстрая (есть экспресс), предложи вечернее время",
        "objection_pain": "😣 'Больно' - Успокой, расскажи про стерильность и аккуратность мастеров",
        "objection_result_doubt": "🧐 'Сомнения' - Предложи посмотреть портфолио в Instagram, расскажи про гарантию",
        "objection_cheaper_elsewhere": "💸 'Где-то дешевле' - Объясни разницу в качестве материалов (мы не экономим на здоровье)",
        "objection_too_far": "📍 'Далеко' - Подчеркни удобство локации, скажи что результат стоит поездки",
        "objection_consult_husband": "💑 'Посоветоваться' - Скажи 'Конечно!', предложи подарочный сертификат или запиши предварительно",
        "objection_first_time": "👋 'Первый раз' - Расскажи подробно про этапы, успокой, предложи скидку на первый визит",
        "objection_not_happy": "😡 'Был плохой опыт' - Вырази сожаление, предложи исправить и комплимент от салона",
        "emotional_triggers": "✨ 'Почувствуйте себя королевой!'\n💆‍♀️ 'Время для себя любимой'",
        "social_proof_phrases": "⭐ 'У этого мастера рейтинг 5.0 на Google Maps'\n🏆 'Наш топ-мастер, к ней запись за неделю'",
        "personalization_rules": "🎂 'Поздравляем с прошедшим Днем Рождения! Вам скидка 15%!'",
        "example_dialogues": "",
        "emotional_responses": "",
        "anti_patterns": "",
        "voice_message_response": "Извините, я AI и не слушаю голосовые 😊\nНапишите текстом!",
        "contextual_rules": "",
        "ad_campaign_detection": "",
        "pre_booking_data_collection": "Для записи нужно имя и WhatsApp — это займет секунду! 😊",
        "manager_consultation_prompt": "",
        "booking_time_logic": "Предлагай конкретное время (например: 'Есть окно завтра в 14:00 или послезавтра в 17:00')",
        "booking_data_collection": """
        Для записи собери следующие данные:
        - Услуга (если не указана)
        - Мастер (по желанию)
        - Дата и время
        - Телефон (обязательно!)
        """,
        "booking_availability_instructions": """
        ВАЖНЫЕ ПРАВИЛА ПОИСКА СЛОТОВ:
        1. Используй ТОЛЬКО слоты из раздела "ДОСТУПНЫЕ МАСТЕРА".
        2. Если слотов нет - предложи альтернативу или запиши в лист ожидания.
        3. Не придумывай время, которого нет в списке.
        """,
        "service_synonyms": json.dumps(SERVICE_SYNONYMS, ensure_ascii=False),
        "objection_keywords": json.dumps(OBJECTION_KEYWORDS, ensure_ascii=False),
        "prompt_headers": json.dumps(PROMPT_HEADERS, ensure_ascii=False),
    }

def update_bot_settings(data: dict) -> bool:
    """Обновить настройки бота"""
    conn = get_db_connection()
    c = conn.cursor()

    try:
        # Получаем список всех колонок
        c.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='bot_settings'
        """)
        columns = [row[0] for row in c.fetchall()]

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
            'booking_data_collection': 'booking_data_collection',
            'booking_availability_instructions': 'booking_availability_instructions',
            'service_synonyms': 'service_synonyms',
            'objection_keywords': 'objection_keywords',
            'prompt_headers': 'prompt_headers',
            # Reminder Settings
            'abandoned_cart_enabled': 'abandoned_cart_enabled',
            'abandoned_cart_delay': 'abandoned_cart_delay',
            'abandoned_cart_message': 'abandoned_cart_message',
            'post_visit_feedback_enabled': 'post_visit_feedback_enabled',
            'post_visit_delay': 'post_visit_delay',
            'post_visit_feedback_message': 'post_visit_feedback_message',
            'return_client_reminder_enabled': 'return_client_reminder_enabled',
            'return_client_delay': 'return_client_delay',
            'return_client_message': 'return_client_message',
        }

        for data_key, db_column in field_mapping.items():
            if db_column in columns and data_key in data:
                set_parts.append(f"{db_column} = %s")
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
    """Включить/выключить бота глобально"""
    conn = get_db_connection()
    c = conn.cursor()

    c.execute("""
        UPDATE salon_settings 
        SET bot_globally_enabled = %s
        WHERE id = 1
    """, (True if enabled else False,))

    conn.commit()
    conn.close()
