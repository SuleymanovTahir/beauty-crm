"""
Функции для работы с клиентами
"""
import sqlite3
from datetime import datetime
from typing import Optional
import re
from utils.logger import log_info,log_error
from core.config import DATABASE_NAME

# Ensure the clients table has the new columns required for import
def ensure_client_columns(conn=None):
    """Add missing columns for new import fields if they don't exist."""
    should_close = False
    if conn is None:
        conn = sqlite3.connect(DATABASE_NAME)
        should_close = True
        
    c = conn.cursor()
    try:
        c.execute("PRAGMA table_info(clients)")
        existing = {row[1] for row in c.fetchall()}
        new_cols = {
            "total_spend": "REAL DEFAULT 0",
            "total_visits": "INTEGER DEFAULT 0",
            "discount": "REAL DEFAULT 0",
            "card_number": "TEXT",
            "first_contact": "TEXT",
            "last_contact": "TEXT",
            "gender": "TEXT DEFAULT 'female'",
            "age": "INTEGER",
            "birth_date": "TEXT"
        }
        for col, definition in new_cols.items():
            if col not in existing:
                c.execute(f"ALTER TABLE clients ADD COLUMN {col} {definition}")
        
        if should_close:
            conn.commit()
    finally:
        if should_close:
            conn.close()


def get_all_clients():
    """Получить всех клиентов"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    try:
        c.execute("""SELECT instagram_id, username, phone, name, first_contact,
                     last_contact, total_messages, labels, status, lifetime_value,
                     profile_pic, notes, is_pinned,
                     total_spend, total_visits, discount, card_number, gender
                     FROM clients ORDER BY is_pinned DESC, last_contact DESC""")
    except sqlite3.OperationalError:
        # Fallback для старой версии БД
        c.execute("""SELECT instagram_id, username, phone, name, first_contact, 
                     last_contact, total_messages, labels, 'new' as status, 
                     0 as lifetime_value, NULL as profile_pic, NULL as notes, 
                     0 as is_pinned
                     FROM clients ORDER BY last_contact DESC""")
    
    clients = c.fetchall()
    conn.close()
    return clients


def get_client_by_id(instagram_id: str):
    """Получить клиента по ID"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    c.execute("""SELECT instagram_id, username, phone, name, first_contact,
                  last_contact, total_messages, labels, status, lifetime_value,
                  profile_pic, notes, is_pinned, detected_language,
                  total_spend, total_visits, discount, card_number,
                  gender, age, birth_date
                  FROM clients WHERE instagram_id = ?""", (instagram_id,))
    
    client = c.fetchone()
    conn.close()
    return client


def get_or_create_client(instagram_id: str, username: str = None):
    """Получить или создать клиента"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    c.execute("SELECT * FROM clients WHERE instagram_id = ?", (instagram_id,))
    client = c.fetchone()
    
    if not client:
        now = datetime.now().isoformat()
        c.execute("""INSERT INTO clients 
                     (instagram_id, username, first_contact, last_contact, 
                      total_messages, labels, status, detected_language)
                     VALUES (?, ?, ?, ?, 0, ?, ?, ?)""",
                  (instagram_id, username, now, now, "Новый клиент", "new", "ru"))
        conn.commit()
        print(f"✨ Новый клиент: {instagram_id}")
    else:
        now = datetime.now().isoformat()
        c.execute("""UPDATE clients 
                     SET last_contact = ?, total_messages = total_messages + 1 
                     WHERE instagram_id = ?""",
                  (now, instagram_id))
        conn.commit()
    
    conn.close()


def update_client_info(instagram_id: str, phone: str = None, name: str = None, notes: str = None,
                       is_pinned: int = None, status: str = None,
                       discount: float = None, card_number: str = None,
                       gender: str = None, age: int = None, birth_date: str = None,
                       profile_pic: str = None):
    """Обновить информацию о клиенте"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    updates = []
    params = []
    
    if phone is not None:
        updates.append("phone = ?")
        params.append(phone)
    if name is not None:
        updates.append("name = ?")
        params.append(name)
    if notes is not None:
        updates.append("notes = ?")
        params.append(notes)
    if is_pinned is not None:
        updates.append("is_pinned = ?")
        params.append(is_pinned)
    if status is not None:
        updates.append("status = ?")
        params.append(status)
    if discount is not None:
        updates.append("discount = ?")
        params.append(discount)
    if card_number is not None:
        updates.append("card_number = ?")
        params.append(card_number)
    if gender is not None:
        updates.append("gender = ?")
        params.append(gender)
    if age is not None:
        updates.append("age = ?")
        params.append(age)
    if birth_date is not None:
        updates.append("birth_date = ?")
        params.append(birth_date)
    if profile_pic is not None:
        updates.append("profile_pic = ?")
        params.append(profile_pic)
        
    try:
        if updates:
            params.append(instagram_id)
            query = f"UPDATE clients SET {', '.join(updates)} WHERE instagram_id = ?"
            c.execute(query, params)
            conn.commit()
            log_info(f"✅ Обновлена информация клиента {instagram_id}", "db")
        
        conn.close()
        return True
    except Exception as e:
        print(f"Ошибка обновления клиента: {e}")
        conn.close()
        return False


def update_client_status(instagram_id: str, status: str):
    """Обновить статус клиента"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    c.execute("UPDATE clients SET status = ? WHERE instagram_id = ?",
              (status, instagram_id))
    
    conn.commit()
    conn.close()


def pin_client(instagram_id: str, pinned: bool = True):
    """Закрепить/открепить клиента"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    c.execute("UPDATE clients SET is_pinned = ? WHERE instagram_id = ?",
              (1 if pinned else 0, instagram_id))
    
    conn.commit()
    conn.close()


def delete_client(instagram_id: str) -> bool:
    """Удалить клиента и все его данные"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    try:
        # Удалить все сообщения клиента
        c.execute("DELETE FROM chat_history WHERE instagram_id = ?", (instagram_id,))
        
        # Удалить все записи клиента
        c.execute("DELETE FROM bookings WHERE instagram_id = ?", (instagram_id,))
        
        # Удалить прогресс записи если есть
        c.execute("DELETE FROM booking_temp WHERE instagram_id = ?", (instagram_id,))
        
        # Удалить взаимодействия клиента
        c.execute("DELETE FROM client_interactions WHERE instagram_id = ?", 
                 (instagram_id,))
        
        # Удалить самого клиента
        c.execute("DELETE FROM clients WHERE instagram_id = ?", (instagram_id,))
        
        conn.commit()
        success = c.rowcount > 0
        conn.close()
        
        if success:
            print(f"✅ Клиент {instagram_id} и все его данные удалены")
        
        return success
    except Exception as e:
        print(f"❌ Ошибка удаления клиента: {e}")
        conn.close()
        return False


# ===== ЯЗЫКОВЫЕ ФУНКЦИИ =====

def detect_and_save_language(instagram_id: str, message: str) -> str:
    """Определить язык сообщения и сохранить для клиента"""
    
    # Убираем смайлики и спецсимволы для чистого анализа
    clean_message = re.sub(r'[^\w\s]', '', message)
    
    # Проверка на кириллицу (русский)
    cyrillic_count = len(re.findall('[а-яА-ЯёЁ]', clean_message))
    
    # Проверка на арабский
    arabic_count = len(re.findall('[\u0600-\u06FF]', clean_message))
    
    # Проверка на латиницу (английский)
    latin_count = len(re.findall('[a-zA-Z]', clean_message))
    
    # Определяем язык по наибольшему количеству символов
    if cyrillic_count > arabic_count and cyrillic_count > latin_count:
        language = 'ru'
    elif arabic_count > cyrillic_count and arabic_count > latin_count:
        language = 'ar'
    elif latin_count > 0:  # Если есть хоть одна латинская буква
        language = 'en'
    else:
        language = 'ru'  # По умолчанию русский
    
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    c.execute("UPDATE clients SET detected_language = ? WHERE instagram_id = ?",
              (language, instagram_id))
    
    conn.commit()
    conn.close()
    
    log_info(f"✅ Language detected: {language} for {instagram_id} (cyr:{cyrillic_count}, ar:{arabic_count}, lat:{latin_count})", "database")
    
    return language


def get_client_language(instagram_id: str) -> str:
    """Получить язык клиента"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    try:
        # ✅ ИСПРАВЛЕНИЕ: Используем detected_language вместо language
        c.execute("SELECT detected_language FROM clients WHERE instagram_id = ?", (instagram_id,))
        result = c.fetchone()
        return result[0] if result and result[0] else 'ru'
    except Exception as e:
        log_error(f"Ошибка получения языка клиента: {e}", "database")
        return 'ru'
    finally:
        conn.close()


# В конец файла backend/db/clients.py
def update_client(instagram_id: str, data: dict):
    """Обновить данные клиента"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    update_fields = []
    values = []
    
    allowed_fields = ['username', 'name', 'phone', 'status', 'notes']
    
    for field in allowed_fields:
        if field in data:
            update_fields.append(f"{field} = ?")
            values.append(data[field])
    
    if not update_fields:
        conn.close()
        return
    
    values.append(instagram_id)
    query = f"UPDATE clients SET {', '.join(update_fields)} WHERE instagram_id = ?"
    
    try:
        c.execute(query, values)
        conn.commit()
    except Exception as e:
        print(f"❌ Ошибка обновления: {e}")
    finally:
        conn.close()




def get_client_bot_mode(instagram_id: str) -> str:
    """Получить режим бота для клиента"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    try:
        c.execute("SELECT bot_mode FROM clients WHERE instagram_id = ?", (instagram_id,))
        result = c.fetchone()
        return result[0] if result and result[0] else 'autopilot'
    except Exception as e:
        log_error(f"Ошибка получения режима бота: {e}", "database")
        return 'autopilot'
    finally:
        conn.close()


def update_client_bot_mode(instagram_id: str, mode: str) -> bool:
    """Обновить режим бота для клиента"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    try:
        c.execute(
            "UPDATE clients SET bot_mode = ? WHERE instagram_id = ?",
            (mode, instagram_id)
        )
        conn.commit()
        log_info(f"✅ Режим бота обновлен: {instagram_id} -> {mode}", "database")
        return True
    except Exception as e:
        log_error(f"Ошибка обновления режима бота: {e}", "database")
        conn.rollback()
        return False
    finally:
        conn.close()

def auto_fill_name_from_username(instagram_id: str):
    """
    Автоматически заполнить имя клиента из username если имя пустое
    """
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    try:
        # Получаем клиента
        c.execute("""
            SELECT username, name 
            FROM clients 
            WHERE instagram_id = ?
        """, (instagram_id,))
        
        result = c.fetchone()
        
        if not result:
            return False
        
        username, name = result
        
        # Если имя пустое и username есть - копируем username в name
        if not name and username:
            c.execute("""
                UPDATE clients 
                SET name = ?
                WHERE instagram_id = ?
            """, (username, instagram_id))
            
            conn.commit()
            log_info(f"✅ Auto-filled name from username: {username}", "database")
            return True
        
        return False
        
    except Exception as e:
        log_error(f"❌ Error auto-filling name: {e}", "database")
        return False
    finally:
        conn.close()

# ===== #5 - ОТСЛЕЖИВАНИЕ "ГОРЯЧИХ" КЛИЕНТОВ =====

def track_client_interest(instagram_id: str, service_name: str):
    """Отслеживать интерес клиента к услуге"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    try:
        # Создаём таблицу если её нет
        c.execute('''CREATE TABLE IF NOT EXISTS client_interests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            client_id TEXT NOT NULL,
            service_name TEXT NOT NULL,
            interest_count INTEGER DEFAULT 1,
            last_asked TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (client_id) REFERENCES clients(instagram_id)
        )''')
        
        # Проверяем есть ли уже запись
        c.execute("""
            SELECT id, interest_count 
            FROM client_interests 
            WHERE client_id = ? AND service_name LIKE ?
        """, (instagram_id, f"%{service_name}%"))
        
        existing = c.fetchone()
        
        if existing:
            # Обновляем счётчик
            c.execute("""
                UPDATE client_interests 
                SET interest_count = interest_count + 1,
                    last_asked = CURRENT_TIMESTAMP
                WHERE id = ?
            """, (existing[0],))
        else:
            # Создаём новую запись
            c.execute("""
                INSERT INTO client_interests 
                (client_id, service_name, interest_count)
                VALUES (?, ?, 1)
            """, (instagram_id, service_name))
        
        conn.commit()
        log_info(f"✅ Tracked interest: {instagram_id} -> {service_name}", "database")
        
    except Exception as e:
        log_error(f"Error tracking interest: {e}", "database")
        conn.rollback()
    finally:
        conn.close()


def get_client_interest_count(instagram_id: str, service_name: str) -> int:
    """Получить количество запросов по услуге"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    try:
        c.execute("""
            SELECT interest_count 
            FROM client_interests 
            WHERE client_id = ? AND service_name LIKE ?
        """, (instagram_id, f"%{service_name}%"))
        
        result = c.fetchone()
        return result[0] if result else 0
        
    except:
        return 0
    finally:
        conn.close()


def is_hot_client(instagram_id: str, service_name: str = None) -> bool:
    """Проверить является ли клиент "горячим" (#5)"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    try:
        if service_name:
            # Проверка по конкретной услуге
            c.execute("""
                SELECT interest_count 
                FROM client_interests 
                WHERE client_id = ? AND service_name LIKE ?
            """, (instagram_id, f"%{service_name}%"))
            
            result = c.fetchone()
            return result and result[0] >= 3  # 3+ запроса = горячий
        else:
            # Общая проверка по всем услугам
            c.execute("""
                SELECT SUM(interest_count) 
                FROM client_interests 
                WHERE client_id = ?
            """, (instagram_id,))
            
            result = c.fetchone()
            return result and result[0] >= 5  # 5+ запросов = очень горячий
            
    except:
        return False
    finally:
        conn.close()


# ===== #21 - СЕГМЕНТАЦИЯ ПО "ТЕМПЕРАТУРЕ" =====

def calculate_client_temperature(instagram_id: str) -> str:
    """Рассчитать температуру клиента: hot, warm, cold"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    try:
        # Критерии:
        # HOT: спрашивал конкретное время записи
        # WARM: спросил цену
        # COLD: просто смотрит
        
        # Проверяем последние 5 сообщений
        c.execute("""
            SELECT message 
            FROM chat_history 
            WHERE instagram_id = ? AND sender = 'client'
            ORDER BY timestamp DESC
            LIMIT 5
        """, (instagram_id,))
        
        messages = [row[0].lower() for row in c.fetchall()]
        
        # HOT: упоминание времени/даты
        hot_keywords = ['завтра', 'сегодня', 'записаться', 'запись', 'записать', 
                       'свободно', 'можно', 'время', 'утром', 'вечером', 'часов']
        
        # WARM: упоминание цены
        warm_keywords = ['сколько', 'цена', 'стоимость', 'price', 'cost']
        
        # Подсчёт совпадений
        hot_score = sum(1 for msg in messages for keyword in hot_keywords if keyword in msg)
        warm_score = sum(1 for msg in messages for keyword in warm_keywords if keyword in msg)
        
        if hot_score >= 2:
            return 'hot'
        elif warm_score >= 1:
            return 'warm'
        else:
            return 'cold'
            
    except Exception as e:
        log_error(f"Error calculating temperature: {e}", "database")
        return 'cold'
    finally:
        conn.close()


def update_client_temperature(instagram_id: str):
    """Обновить температуру клиента в БД"""
    temperature = calculate_client_temperature(instagram_id)
    
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    try:
        # Проверяем есть ли колонка temperature
        c.execute("PRAGMA table_info(clients)")
        columns = [row[1] for row in c.fetchall()]
        
        if 'temperature' not in columns:
            # Добавляем колонку
            c.execute("ALTER TABLE clients ADD COLUMN temperature TEXT DEFAULT 'cold'")
        
        # Обновляем значение
        c.execute("""
            UPDATE clients 
            SET temperature = ?
            WHERE instagram_id = ?
        """, (temperature, instagram_id))
        
        conn.commit()
        
    except Exception as e:
        log_error(f"Error updating temperature: {e}", "database")
        conn.rollback()
    finally:
        conn.close()

def set_client_temperature(instagram_id: str, temperature: str) -> bool:
    """Установить температуру клиента вручную"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    try:
        # Проверяем есть ли колонка temperature
        c.execute("PRAGMA table_info(clients)")
        columns = [row[1] for row in c.fetchall()]
        
        if 'temperature' not in columns:
            c.execute("ALTER TABLE clients ADD COLUMN temperature TEXT DEFAULT 'cold'")
        
        c.execute("""
            UPDATE clients 
            SET temperature = ?
            WHERE instagram_id = ?
        """, (temperature, instagram_id))
        
        conn.commit()
        log_info(f"✅ Temperature manually set: {instagram_id} -> {temperature}", "database")
        return True
        
    except Exception as e:
        log_error(f"Error setting temperature: {e}", "database")
        conn.rollback()
        return False
    finally:
        conn.close()

def calculate_no_show_risk(instagram_id: str) -> float:
    """Рассчитать риск no-show клиента (#19)"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    try:
        # Получаем статистику записей
        c.execute("""
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
                SUM(CASE WHEN status = 'no_show' THEN 1 ELSE 0 END) as no_show
            FROM bookings
            WHERE instagram_id = ?
        """, (instagram_id,))
        
        result = c.fetchone()
        
        if not result or result[0] == 0:
            return 0.0  # Новый клиент - риск низкий
        
        total, cancelled, no_show = result
        
        # Формула риска: (отмены + no_show*2) / всего записей
        risk = (cancelled + no_show * 2) / total
        
        return min(risk, 1.0)  # Максимум 1.0
        
    except Exception as e:
        log_error(f"Error calculating no-show risk: {e}", "database")
        return 0.0
    finally:
        conn.close()