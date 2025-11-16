"""
Функции для работы с услугами и специальными пакетами
"""
import sqlite3
from datetime import datetime
from typing import Optional

from core.config import DATABASE_NAME


# ===== УСЛУГИ =====

def get_all_services(active_only=True, include_positions=False):
    """Получить все услуги из БД

    Args:
        active_only: Только активные услуги
        include_positions: Включить должности для каждой услуги

    Returns:
        List of services (tuples or dicts if include_positions=True)
    """
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    if active_only:
        c.execute("SELECT * FROM services WHERE is_active = 1 ORDER BY category, name")
    else:
        c.execute("SELECT * FROM services ORDER BY category, name")

    services = c.fetchall()

    if not include_positions:
        conn.close()
        return services

    # Добавляем должности для каждой услуги
    result = []
    for service in services:
        service_id = service[0]

        # Получаем должности для этой услуги
        c.execute("""
            SELECT p.id, p.name
            FROM service_positions sp
            JOIN positions p ON sp.position_id = p.id
            WHERE sp.service_id = ?
            ORDER BY p.name
        """, (service_id,))

        positions = [{"id": pos[0], "name": pos[1]} for pos in c.fetchall()]

        # Конвертируем tuple в dict
        service_dict = {
            "id": service[0],
            "service_key": service[1],
            "name": service[2],
            "name_ru": service[3] if len(service) > 3 else service[2],
            "name_ar": service[4] if len(service) > 4 else None,
            "price": service[5] if len(service) > 5 else 0,
            "min_price": service[6] if len(service) > 6 else None,
            "max_price": service[7] if len(service) > 7 else None,
            "currency": service[8] if len(service) > 8 else "AED",
            "category": service[9] if len(service) > 9 else "other",
            "description": service[10] if len(service) > 10 else "",
            "description_ru": service[11] if len(service) > 11 else "",
            "description_ar": service[12] if len(service) > 12 else "",
            "benefits": service[13].split('|') if len(service) > 13 and service[13] else [],
            "is_active": bool(service[14]) if len(service) > 14 and service[14] is not None else True,
            "duration": service[15] if len(service) > 15 else None,
            "position_id": service[16] if len(service) > 16 else None,
            "positions": positions  # Добавляем список должностей
        }
        result.append(service_dict)

    conn.close()
    return result


def get_service_by_key(service_key):
    """Получить услугу по ключу"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    c.execute("SELECT * FROM services WHERE service_key = ?", (service_key,))
    service = c.fetchone()
    
    conn.close()
    return service


def get_service(service_id):
    """Получить услугу по ID"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    c.execute("SELECT * FROM services WHERE id = ?", (service_id,))
    result = c.fetchone()
    
    if result:
        columns = [description[0] for description in c.description]
        service = dict(zip(columns, result))
        conn.close()
        return service
    
    conn.close()
    return None


def create_service(service_key, name, name_ru, price, currency, category,
                   description=None, description_ru=None, benefits=None, position_id=None):
    """Создать новую услугу"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    now = datetime.now().isoformat()
    benefits_str = '|'.join(benefits) if benefits else ''

    try:
        c.execute("""INSERT INTO services
                     (service_key, name, name_ru, price, currency, category,
                      description, description_ru, benefits, position_id, created_at, updated_at)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                  (service_key, name, name_ru, price, currency, category,
                   description, description_ru, benefits_str, position_id, now, now))
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
        elif key == 'is_active':
            # Преобразуем is_active в число (0 или 1)
            value = 1 if value in [True, 1, '1', 'true', 'True'] else 0
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
    """Удалить услугу ПОЛНОСТЬЮ"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    c.execute("DELETE FROM services WHERE id = ?", (service_id,))
    
    conn.commit()
    affected = c.rowcount
    conn.close()
    
    if affected > 0:
        print(f"✅ Услуга {service_id} удалена из БД")
    
    return affected > 0


# ===== СПЕЦИАЛЬНЫЕ ПАКЕТЫ =====

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
                     (name, name_ru, description, description_ru, original_price, 
                      special_price, currency, discount_percent, services_included, 
                      promo_code, keywords, valid_from, valid_until, created_at, 
                      updated_at, max_usage)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                  (name, name_ru, description, description_ru, original_price, 
                   special_price, currency, discount_percent, services_str, 
                   promo_code, keywords_str, valid_from, valid_until, now, now, 
                   max_usage))
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
    return True


# backend/db/services.py - ПОЛНОСТЬЮ УДАЛИТЕ старую функцию toggle_service_active_status
# И ЗАМЕНИТЕ на эту новую версию:

def toggle_service_active_status(service_id):
    """Переключить статус активности услуги"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    try:
        # Получаем текущий статус
        c.execute("SELECT is_active FROM services WHERE id = ?", (service_id,))
        result = c.fetchone()
        
        if not result:
            conn.close()
            raise ValueError("Service not found")
        
        current_status = result[0]
        new_status = 1 if current_status == 0 else 0
        
        # Логируем
        from logger import log_info
        log_info(f"🔄 DB: Toggling service {service_id}: {current_status} → {new_status}", "database")
        
        # Обновляем статус
        c.execute(
            "UPDATE services SET is_active = ?, updated_at = ? WHERE id = ?", 
            (new_status, datetime.now().isoformat(), service_id)
        )
        
        # Проверяем что обновление прошло
        if c.rowcount == 0:
            conn.close()
            raise ValueError(f"Failed to update service {service_id}")
        
        conn.commit()
        
        # Проверяем результат
        c.execute("SELECT is_active FROM services WHERE id = ?", (service_id,))
        updated = c.fetchone()
        final_status = bool(updated[0]) if updated else None
        
        log_info(f"✅ DB: Service {service_id} updated: is_active = {final_status}", "database")
        
        conn.close()
        return bool(new_status)
        
    except Exception as e:
        conn.rollback()
        conn.close()
        from logger import log_error
        log_error(f"❌ Error toggling service status: {e}", "database")
        raise

def format_service_price_for_bot(service) -> str:
    """
    Форматировать цену услуги для бота (правильный порядок)
    """
    price = service[5] if len(service) > 5 else 0
    min_price = service[6] if len(service) > 6 and service[6] else None
    max_price = service[7] if len(service) > 7 and service[7] else None
    currency = service[8] if len(service) > 8 else "AED"

    # Убираем .0 у целых чисел
    def format_number(num):
        if num is None:
            return None
        return int(num) if num == int(num) else num

    # ✅ НОВАЯ ЛОГИКА: Показываем ценность, а не пугаем диапазоном
    if min_price and max_price and min_price != max_price:
        # Проверяем правильный порядок (min всегда меньше max)
        if min_price > max_price:
            min_price, max_price = max_price, min_price  # Меняем местами
        # Показываем максимальную цену как ценность
        max_clean = format_number(max_price)
        return f"всего лишь {max_clean} дирхам"
    else:
        price_clean = format_number(price)
        return f"{price_clean} {currency}"


# ===== SERVICE POSITIONS (Должности для услуг) =====

def get_service_positions(service_id):
    """
    Получить список должностей, которые могут выполнять услугу

    Args:
        service_id: ID услуги

    Returns:
        List[dict]: Список должностей с id и name
    """
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    c.execute("""
        SELECT p.id, p.name
        FROM service_positions sp
        JOIN positions p ON sp.position_id = p.id
        WHERE sp.service_id = ?
        ORDER BY p.name
    """, (service_id,))

    positions = [{"id": pos[0], "name": pos[1]} for pos in c.fetchall()]

    conn.close()
    return positions


def update_service_positions(service_id, position_ids):
    """
    Обновить список должностей для услуги

    Args:
        service_id: ID услуги
        position_ids: List[int] - список ID должностей

    Returns:
        bool: True если успешно
    """
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    try:
        # 1. Удаляем все существующие связи для этой услуги
        c.execute("DELETE FROM service_positions WHERE service_id = ?", (service_id,))

        # 2. Добавляем новые связи
        if position_ids:
            for position_id in position_ids:
                c.execute("""
                    INSERT INTO service_positions (service_id, position_id)
                    VALUES (?, ?)
                """, (service_id, position_id))

        conn.commit()
        conn.close()

        from utils.logger import log_info
        log_info(f"Updated positions for service {service_id}: {position_ids}", "database")

        return True

    except Exception as e:
        conn.rollback()
        conn.close()

        from utils.logger import log_error
        log_error(f"Error updating service positions: {e}", "database")
        return False


def add_service_position(service_id, position_id):
    """
    Добавить должность к услуге

    Args:
        service_id: ID услуги
        position_id: ID должности

    Returns:
        bool: True если успешно
    """
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    try:
        c.execute("""
            INSERT OR IGNORE INTO service_positions (service_id, position_id)
            VALUES (?, ?)
        """, (service_id, position_id))

        conn.commit()
        success = c.rowcount > 0
        conn.close()

        return success

    except Exception as e:
        conn.close()
        from utils.logger import log_error
        log_error(f"Error adding service position: {e}", "database")
        return False


def remove_service_position(service_id, position_id):
    """
    Удалить должность из услуги

    Args:
        service_id: ID услуги
        position_id: ID должности

    Returns:
        bool: True если успешно
    """
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    try:
        c.execute("""
            DELETE FROM service_positions
            WHERE service_id = ? AND position_id = ?
        """, (service_id, position_id))

        conn.commit()
        success = c.rowcount > 0
        conn.close()

        return success

    except Exception as e:
        conn.close()
        from utils.logger import log_error
        log_error(f"Error removing service position: {e}", "database")
        return False