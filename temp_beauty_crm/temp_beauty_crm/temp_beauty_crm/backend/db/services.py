"""
Функции для работы с услугами и специальными пакетами
"""

from datetime import datetime
from typing import Optional

from db.connection import get_db_connection
import psycopg2

# ===== УСЛУГИ =====

def get_all_services(active_only=True, include_positions=False):
    """Получить все услуги из БД

    Returns:
        List of dicts with service data

    Note: Translations are handled dynamically by the frontend/translator,
          not stored as separate columns.
    """
    conn = get_db_connection()
    c = conn.cursor()

    query = """
        SELECT id, service_key, name, category, price, min_price, max_price,
               currency, duration, description, benefits, is_active, position_id
        FROM services
    """
    if active_only:
        query += " WHERE is_active = TRUE"
    query += " ORDER BY category, name"

    c.execute(query)
    services_rows = c.fetchall()

    if not include_positions:
        conn.close()
        return services_rows

    # Добавляем должности для каждой услуги ОПТИМИЗИРОВАННО (один запрос)
    c.execute("""
        SELECT sp.service_id, p.id, p.name
        FROM service_positions sp
        JOIN positions p ON sp.position_id = p.id
        ORDER BY sp.service_id, p.name
    """)
    all_positions = c.fetchall()
    
    # Группируем должности по service_id
    positions_map = {}
    for row in all_positions:
        s_id = row[0]
        if s_id not in positions_map:
            positions_map[s_id] = []
        positions_map[s_id].append({"id": row[1], "name": row[2]})

    result = []
    for row in services_rows:
        s_id = row[0]
        result.append({
            "id": row[0],
            "service_key": row[1],
            "name": row[2],
            "category": row[3],
            "price": row[4],
            "min_price": row[5],
            "max_price": row[6],
            "currency": row[7],
            "duration": row[8],
            "description": row[9],
            "positions": positions_map.get(s_id, [])
        })

    conn.close()
    return result

def get_service_by_key(service_key):
    """Получить услугу по ключу"""
    conn = get_db_connection()
    c = conn.cursor()
    
    c.execute("SELECT * FROM services WHERE service_key = %s", (service_key,))
    service = c.fetchone()
    
    conn.close()
    return service

def get_service(service_id):
    """Получить услугу по ID"""
    conn = get_db_connection()
    c = conn.cursor()
    
    c.execute("SELECT * FROM services WHERE id = %s", (service_id,))
    result = c.fetchone()
    
    if result:
        columns = [description[0] for description in c.description]
        service = dict(zip(columns, result))
        conn.close()
        return service
    
    conn.close()
    return None

def create_service(service_key, name, price, currency, category,
                   description=None, benefits=None, position_id=None):
    """Создать новую услугу"""
    conn = get_db_connection()
    c = conn.cursor()

    now = datetime.now().isoformat()
    benefits_str = '|'.join(benefits) if benefits else ''

    try:
        c.execute("""INSERT INTO services
                     (service_key, name, price, currency, category,
                      description, benefits, position_id, created_at, updated_at)
                     VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
                  (service_key, name, price, currency, category,
                   description, benefits_str, position_id, now, now))
        conn.commit()
        conn.close()
        return True
    except psycopg2.IntegrityError:
        conn.close()
        return False

def update_service(service_id, **kwargs):
    """Обновить услугу"""
    conn = get_db_connection()
    c = conn.cursor()
    
    updates = []
    params = []
    
    for key, value in kwargs.items():
        if key == 'benefits' and isinstance(value, list):
            value = '|'.join(value)
        elif key == 'is_active':
            # Преобразуем is_active в число (0 или 1)
            value = True if value in [True, 1, '1', 'true', 'True'] else False
        elif key == 'duration' and value:
            # ✅ НОРМАЛИЗАЦИЯ: Автоматически конвертируем любой формат в минуты
            from utils.duration_utils import parse_duration_to_minutes
            
            # Если уже число - оставляем как есть, иначе парсим
            if not str(value).strip().isdigit():
                minutes = parse_duration_to_minutes(value)
                if minutes:
                    value = str(minutes)
                    from utils.logger import log_info
                    log_info(f"🔄 DB: Normalized duration '{kwargs['duration']}' → {value} minutes", "database")
        
        updates.append(f"{key} = %s")
        params.append(value)
    
    updates.append("updated_at = %s")
    params.append(datetime.now().isoformat())
    params.append(service_id)
    
    query = f"UPDATE services SET {', '.join(updates)} WHERE id = %s"
    c.execute(query, params)
    
    # --- SYNC UPDATES TO EMPLOYEES ---
    # If price or duration changed, update all assigned employees
    sync_updates = []
    sync_params = []
    
    if 'price' in kwargs:
        sync_updates.append("price = %s")
        sync_params.append(kwargs['price'])
        
    if 'duration' in kwargs:
        sync_updates.append("duration = %s")
        sync_params.append(kwargs['duration'])
        
    if sync_updates:
        sync_query = f"UPDATE user_services SET {', '.join(sync_updates)} WHERE service_id = %s"
        sync_params.append(service_id)
        c.execute(sync_query, sync_params)
        from utils.logger import log_info
        log_info(f"🔄 DB: Synced service {service_id} updates to employees: {kwargs}", "database")
    # ---------------------------------
    
    conn.commit()
    conn.close()
    return True

def delete_service(service_id):
    """Удалить услугу ПОЛНОСТЬЮ"""
    conn = get_db_connection()
    c = conn.cursor()
    
    c.execute("DELETE FROM services WHERE id = %s", (service_id,))
    
    conn.commit()
    affected = c.rowcount
    conn.close()
    
    if affected > 0:
        print(f"✅ Услуга {service_id} удалена из БД")
    
    return affected > 0

# ===== СПЕЦИАЛЬНЫЕ ПАКЕТЫ =====

def get_all_special_packages(active_only=True):
    """Получить все специальные пакеты"""
    conn = get_db_connection()
    c = conn.cursor()
    
    now = datetime.now().isoformat()
    
    if active_only:
        c.execute("""SELECT * FROM special_packages 
                     WHERE is_active = TRUE 
                     AND valid_from <= %s 
                     AND valid_until >= %s
                     ORDER BY created_at DESC""", (now, now))
    else:
        c.execute("SELECT * FROM special_packages ORDER BY created_at DESC")
    
    packages = c.fetchall()
    conn.close()
    return packages

def get_special_package_by_id(package_id):
    """Получить пакет по ID"""
    conn = get_db_connection()
    c = conn.cursor()
    
    c.execute("SELECT * FROM special_packages WHERE id = %s", (package_id,))
    package = c.fetchone()
    
    conn.close()
    return package

def find_special_package_by_keywords(message: str):
    """Найти подходящий спец. пакет по ключевым словам в сообщении"""
    conn = get_db_connection()
    c = conn.cursor()
    
    now = datetime.now().isoformat()
    message_lower = message.lower()
    
    c.execute("""SELECT * FROM special_packages 
                 WHERE is_active = TRUE 
                 AND valid_from <= %s 
                 AND valid_until >= %s""", (now, now))
    
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

def create_special_package(name, original_price, special_price, currency,
                           keywords, valid_from, valid_until, description=None,
                           services_included=None, promo_code=None,
                           max_usage=None, scheduled=False, schedule_date=None,
                           schedule_time=None, auto_activate=False, auto_deactivate=False):
    """Создать новый специальный пакет"""
    conn = get_db_connection()
    c = conn.cursor()

    now = datetime.now().isoformat()
    discount_percent = int(((original_price - special_price) / original_price) * 100)

    services_str = ','.join(services_included) if services_included else ''
    keywords_str = ','.join(keywords) if isinstance(keywords, list) else keywords

    try:
        c.execute("""INSERT INTO special_packages
                     (name, description, original_price,
                      special_price, currency, discount_percent, services_included,
                      promo_code, keywords, valid_from, valid_until, created_at,
                      updated_at, max_usage, scheduled, schedule_date, schedule_time,
                      auto_activate, auto_deactivate)
                     VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                             %s, %s)""",
                  (name, description, original_price,
                   special_price, currency, discount_percent, services_str,
                   promo_code, keywords_str, valid_from, valid_until, now, now,
                   max_usage, scheduled, schedule_date, schedule_time,
                   auto_activate, auto_deactivate))
        conn.commit()
        package_id = c.lastrowid
        conn.close()
        return package_id
    except psycopg2.IntegrityError as e:
        conn.close()
        print(f"Ошибка создания пакета: {e}")
        return None

def update_special_package(package_id, **kwargs):
    """Обновить специальный пакет"""
    conn = get_db_connection()
    c = conn.cursor()
    
    updates = []
    params = []
    
    for key, value in kwargs.items():
        if key == 'services_included' and isinstance(value, list):
            value = ','.join(value)
        elif key == 'keywords' and isinstance(value, list):
            value = ','.join(value)
        updates.append(f"{key} = %s")
        params.append(value)
    
    updates.append("updated_at = %s")
    params.append(datetime.now().isoformat())
    params.append(package_id)
    
    query = f"UPDATE special_packages SET {', '.join(updates)} WHERE id = %s"
    c.execute(query, params)
    
    conn.commit()
    conn.close()
    return True

def delete_special_package(package_id):
    """Удалить специальный пакет"""
    conn = get_db_connection()
    c = conn.cursor()
    
    c.execute("DELETE FROM special_packages WHERE id = %s", (package_id,))
    
    conn.commit()
    conn.close()
    return True

def increment_package_usage(package_id):
    """Увеличить счетчик использования пакета"""
    conn = get_db_connection()
    c = conn.cursor()
    
    c.execute("UPDATE special_packages SET usage_count = usage_count + 1 WHERE id = %s", 
              (package_id,))
    
    conn.commit()
    conn.close()
    return True

# backend/db/services.py - ПОЛНОСТЬЮ УДАЛИТЕ старую функцию toggle_service_active_status
# И ЗАМЕНИТЕ на эту новую версию:

def toggle_service_active_status(service_id):
    """Переключить статус активности услуги"""
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        # Получаем текущий статус
        c.execute("SELECT is_active FROM services WHERE id = %s", (service_id,))
        result = c.fetchone()
        
        if not result:
            conn.close()
            raise ValueError("Service not found")
        
        current_status = result[0]
        new_status = True if current_status == 0 else False
        
        # Логируем
        from utils.logger import log_info
        log_info(f"🔄 DB: Toggling service {service_id}: {current_status} → {new_status}", "database")
        
        # Обновляем статус
        c.execute(
            "UPDATE services SET is_active = %s, updated_at = %s WHERE id = %s", 
            (new_status, datetime.now().isoformat(), service_id)
        )
        
        # Проверяем что обновление прошло
        if c.rowcount == 0:
            conn.close()
            raise ValueError(f"Failed to update service {service_id}")
        
        conn.commit()
        
        # Проверяем результат
        c.execute("SELECT is_active FROM services WHERE id = %s", (service_id,))
        updated = c.fetchone()
        final_status = bool(updated[0]) if updated else None
        
        log_info(f"✅ DB: Service {service_id} updated: is_active = {final_status}", "database")
        
        conn.close()
        return bool(new_status)
        
    except Exception as e:
        conn.rollback()
        conn.close()
        from utils.logger import log_error
        log_error(f"❌ Error toggling service status: {e}", "database")
        raise

def format_service_price_for_bot(service) -> str:
    """
    Форматировать цену услуги для бота (правильный порядок)
    """
    from utils.currency import get_salon_currency
    
    price = service[4] if len(service) > 4 else 0
    min_price = service[5] if len(service) > 5 and service[5] else None
    max_price = service[6] if len(service) > 6 and service[6] else None
    currency = service[7] if len(service) > 7 else get_salon_currency()

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
    conn = get_db_connection()
    c = conn.cursor()

    c.execute("""
        SELECT p.id, p.name
        FROM service_positions sp
        JOIN positions p ON sp.position_id = p.id
        WHERE sp.service_id = %s
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
    conn = get_db_connection()
    c = conn.cursor()

    try:
        # 1. Удаляем все существующие связи для этой услуги
        c.execute("DELETE FROM service_positions WHERE service_id = %s", (service_id,))

        # 2. Добавляем новые связи
        if position_ids:
            for position_id in position_ids:
                c.execute("""
                    INSERT INTO service_positions (service_id, position_id)
                    VALUES (%s, %s)
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
    conn = get_db_connection()
    c = conn.cursor()

    try:
        c.execute("""
            INSERT INTO service_positions (service_id, position_id)
            VALUES (%s, %s)
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
    conn = get_db_connection()
    c = conn.cursor()

    try:
        c.execute("""
            DELETE FROM service_positions
            WHERE service_id = %s AND position_id = %s
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