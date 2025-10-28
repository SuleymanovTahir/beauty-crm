"""
Функции для работы с услугами и специальными пакетами
"""
import sqlite3
from datetime import datetime
from typing import Optional

from config import DATABASE_NAME


# ===== УСЛУГИ =====

def get_all_services(active_only=True):
    """Получить все услуги из БД"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    if active_only:
        c.execute("SELECT * FROM services WHERE is_active = 1 ORDER BY category, name")
    else:
        c.execute("SELECT * FROM services ORDER BY category, name")
    
    services = c.fetchall()
    conn.close()
    return services


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
                   description=None, description_ru=None, benefits=None):
    """Создать новую услугу"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    now = datetime.now().isoformat()
    benefits_str = '|'.join(benefits) if benefits else ''
    
    try:
        c.execute("""INSERT INTO services 
                     (service_key, name, name_ru, price, currency, category,
                      description, description_ru, benefits, created_at, updated_at)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                  (service_key, name, name_ru, price, currency, category,
                   description, description_ru, benefits_str, now, now))
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