"""
Функции для работы с клиентами
"""
import sqlite3
from datetime import datetime
from typing import Optional
import re
from logger import log_info,log_error
from config import DATABASE_NAME


def get_all_clients():
    """Получить всех клиентов"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    try:
        c.execute("""SELECT instagram_id, username, phone, name, first_contact, 
                     last_contact, total_messages, labels, status, lifetime_value,
                     profile_pic, notes, is_pinned 
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
                 profile_pic, notes, is_pinned, detected_language
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


def update_client_info(instagram_id: str, name: str = None, 
                      phone: str = None, notes: str = None,
                      profile_pic: str = None) -> bool: 
    """Обновить информацию о клиенте"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    try:
        updates = []
        params = []
        
        if name is not None:
            updates.append("name = ?")
            params.append(name)
        
        if phone is not None:
            updates.append("phone = ?")
            params.append(phone)
        
        if notes is not None:
            updates.append("notes = ?")
            params.append(notes)

        if profile_pic is not None:  # Проверяем на None, а не на truthiness
            updates.append("profile_pic = ?")
            params.append(profile_pic)
        
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

def detect_and_save_language(instagram_id: str, message: str):
    """Определить язык сообщения и сохранить для клиента"""
    # Простое определение языка по символам
    
    # Проверка на кириллицу
    if re.search('[а-яА-ЯёЁ]', message):
        language = 'ru'
    # Проверка на арабский
    elif re.search('[\u0600-\u06FF]', message):
        language = 'ar'
    # По умолчанию английский
    else:
        language = 'en'
    
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    c.execute("UPDATE clients SET detected_language = ? WHERE instagram_id = ?",
              (language, instagram_id))
    
    conn.commit()
    conn.close()
    
    return language


def get_client_language(instagram_id: str) -> str:
    """Получить предпочитаемый язык клиента"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    c.execute("SELECT detected_language FROM clients WHERE instagram_id = ?", 
             (instagram_id,))
    result = c.fetchone()
    
    conn.close()
    
    return result[0] if result and result[0] else 'ru'


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

def get_client_language(instagram_id: str) -> str:
    """Получить язык клиента"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    try:
        c.execute("SELECT language FROM clients WHERE instagram_id = ?", (instagram_id,))
        result = c.fetchone()
        return result[0] if result and result[0] else 'ru'
    except Exception as e:
        log_error(f"Ошибка получения языка клиента: {e}", "database")
        return 'ru'
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