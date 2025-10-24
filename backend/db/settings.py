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
                "updated_at": result[21] if len(result) > 21 else None
            }
        else:
            log_warning("⚠️ Настройки салона пусты, используются дефолты", "database")
            return _get_default_salon_settings()
            
    except sqlite3.OperationalError as e:
        log_error(f"❌ Таблица salon_settings не существует: {e}", "database")
        return _get_default_salon_settings()
    except Exception as e:
        log_error(f"❌ Непредвиденная ошибка в get_salon_settings: {e}", "database")
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
        return _get_default_bot_settings()
    except Exception as e:
        log_error(f"❌ Непредвиденная ошибка в get_bot_settings: {e}", "database")
        return _get_default_bot_settings()
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


def update_bot_settings(data: dict) -> bool:
    """Обновить настройки бота"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    try:
        # Получаем текущие настройки
        c.execute("SELECT * FROM bot_settings LIMIT 1")
        result = c.fetchone()
        
        if not result:
            log_error("❌ Настройки бота не найдены!", "database")
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
        
        # Мержим новые данные
        merged = {**current, **data}
        
        c.execute("""UPDATE bot_settings SET
            bot_name = ?, personality_traits = ?, greeting_message = ?,
            farewell_message = ?, price_explanation = ?, price_response_template = ?,
            premium_justification = ?, booking_redirect_message = ?,
            fomo_messages = ?, upsell_techniques = ?, communication_style = ?,
            max_message_length = ?, emoji_usage = ?, languages_supported = ?,
            objection_handling = ?, negative_handling = ?, safety_guidelines = ?,
            example_good_responses = ?, algorithm_actions = ?, location_features = ?,
            seasonality = ?, emergency_situations = ?, success_metrics = ?,
            objection_expensive = ?, objection_think_about_it = ?,
            objection_no_time = ?, objection_pain = ?, objection_result_doubt = ?,
            objection_cheaper_elsewhere = ?, objection_too_far = ?,
            objection_consult_husband = ?, objection_first_time = ?,
            objection_not_happy = ?, emotional_triggers = ?,
            social_proof_phrases = ?, personalization_rules = ?,
            example_dialogues = ?, emotional_responses = ?, anti_patterns = ?,
            voice_message_response = ?, contextual_rules = ?,
            updated_at = CURRENT_TIMESTAMP
            WHERE id = 1""",
          (merged.get('bot_name'), merged.get('personality_traits'),
           merged.get('greeting_message'), merged.get('farewell_message'),
           merged.get('price_explanation'), merged.get('price_response_template'),
           merged.get('premium_justification'), merged.get('booking_redirect_message'),
           merged.get('fomo_messages'), merged.get('upsell_techniques'),
           merged.get('communication_style'), merged.get('max_message_length', 4),
           merged.get('emoji_usage'), merged.get('languages_supported'),
           merged.get('objection_handling'), merged.get('negative_handling'),
           merged.get('safety_guidelines'), merged.get('example_good_responses'),
           merged.get('algorithm_actions'), merged.get('location_features'),
           merged.get('seasonality'), merged.get('emergency_situations'),
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
           merged.get('voice_message_response', 'Извините, я AI-помощник и не могу прослушивать голосовые 😊'),
           merged.get('contextual_rules', '')))
        
        conn.commit()
        log_info("✅ Настройки бота обновлены", "database")
        return True
    except Exception as e:
        log_error(f"Ошибка обновления настроек бота: {e}", "database")
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
        c.execute("DELETE FROM custom_statuses WHERE status_key = ?", (status_key,))
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

# Доступные права в системе
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
    # Встроенные роли
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
    
    # Кастомные роли из БД
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
    
    # Проверка что это не встроенная роль
    if role_key in ['admin', 'manager', 'employee']:
        log_error(f"❌ Нельзя создать роль с ключом '{role_key}' - это встроенная роль", "database")
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
    
    # Нельзя удалить встроенные роли
    if role_key in ['admin', 'manager', 'employee']:
        log_error(f"❌ Нельзя удалить встроенную роль '{role_key}'", "database")
        return False
    
    try:
        # Удаляем роль
        c.execute("DELETE FROM custom_roles WHERE role_key = ?", (role_key,))
        
        # Удаляем права этой роли
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
    
    # Админ имеет все права
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
    
    # Нельзя изменить права админа
    if role_key == 'admin':
        log_error("❌ Нельзя изменить права роли admin", "database")
        return False
    
    try:
        # Удаляем старые права
        c.execute("DELETE FROM role_permissions WHERE role_key = ?", (role_key,))
        
        # Добавляем новые
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
        # Получаем роль пользователя
        c.execute("SELECT role FROM users WHERE id = ?", (user_id,))
        result = c.fetchone()
        
        if not result:
            return False
        
        role_key = result[0]
        
        # Админ имеет все права
        if role_key == 'admin':
            return True
        
        # Проверяем право
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