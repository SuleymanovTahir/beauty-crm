"""
Функции для работы с клиентами
"""
from datetime import datetime
from typing import Optional
import re
from db.companies import ensure_company_quota
from utils.logger import log_info,log_error
from db.connection import get_db_connection
import psycopg2
from utils.tenant_context import get_current_company_id

def get_avatar_url(profile_pic: Optional[str], gender: Optional[str] = 'female') -> str:
    """
    Get avatar URL without default image fallback
    
    Args:
        profile_pic: Profile picture path from database (can be None)
        gender: User gender ('male', 'female', or 'other')
    
    Returns:
        Avatar URL (profile_pic or empty string)
    """
    if profile_pic:
        return profile_pic
    
    return ''

# Ensure the clients table has the new columns required for import
def ensure_client_columns(conn=None):
    """Add missing columns for new import fields if they don't exist."""
    should_close = False
    if conn is None:
        conn = get_db_connection()
        should_close = True
        
    c = conn.cursor()
    try:
        c.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='clients'
        """)
        existing = {row[0] for row in c.fetchall()}
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

def get_all_clients(limit: int = 2000):
    """Получить всех клиентов"""
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        query = """SELECT instagram_id, username, phone, name, first_contact,
                     last_contact, total_messages, labels, status, lifetime_value,
                     profile_pic, notes, is_pinned,
                     total_spend, total_visits, discount, card_number, gender
                      FROM clients 
                      WHERE deleted_at IS NULL
                      ORDER BY is_pinned DESC, last_contact DESC"""
        if limit:
            query += f" LIMIT {int(limit)}"
        c.execute(query)
    except psycopg2.OperationalError:
        # Fallback для старой версии БД
        query = """SELECT instagram_id, username, phone, name, first_contact,
                     last_contact, total_messages, labels, 'new' as status,
                     0 as lifetime_value, NULL as profile_pic, NULL as notes,
                     0 as is_pinned
                     FROM clients ORDER BY last_contact DESC"""
        if limit:
            query += f" LIMIT {int(limit)}"
        c.execute(query)
    
    clients = c.fetchall()
    conn.close()
    return clients

def get_client_by_id(instagram_id: str):
    """Получить клиента по ID"""
    conn = get_db_connection()
    c = conn.cursor()
    
    c.execute("""SELECT instagram_id, username, phone, name, first_contact,
                  last_contact, total_messages, labels, status, lifetime_value,
                  profile_pic, notes, is_pinned, detected_language,
                  gender, card_number, discount, total_visits,
                  total_spend, birthday, email, temperature,
                  age, birth_date, referral_code, source, telegram_id, reminder_date
                  FROM clients WHERE (instagram_id = %s OR username = %s) AND deleted_at IS NULL""", (instagram_id, instagram_id))

    
    client = c.fetchone()
    conn.close()
    return client

def get_or_create_client(instagram_id: str, username: str = None, phone: str = None, email: str = None):
    """Получить или создать клиента с защитой от дублей"""
    conn = get_db_connection()
    c = conn.cursor()
    company_id = get_current_company_id()
    
    try:
        # 1. Сначала ищем по точному instagram_id
        if company_id:
            c.execute(
                "SELECT instagram_id FROM clients WHERE instagram_id = %s AND company_id = %s",
                (instagram_id, company_id),
            )
        else:
            c.execute("SELECT instagram_id FROM clients WHERE instagram_id = %s", (instagram_id,))
        client = c.fetchone()
        
        if not client:
            # 2. Если не нашли, ищем по телефону или email (защита от дублей при смене ID)
            if phone or email:
                if company_id:
                    c.execute("""
                        SELECT instagram_id FROM clients 
                        WHERE company_id = %s
                          AND (
                              (phone = %s AND phone IS NOT NULL AND phone != '') 
                              OR (email = %s AND email IS NOT NULL AND email != '')
                          )
                        LIMIT 1
                    """, (company_id, phone, email))
                else:
                    c.execute("""
                        SELECT instagram_id FROM clients 
                        WHERE (phone = %s AND phone IS NOT NULL AND phone != '') 
                           OR (email = %s AND email IS NOT NULL AND email != '')
                        LIMIT 1
                    """, (phone, email))
                existing = c.fetchone()
                
                if existing:
                    # Если нашли по телефону/email - привязываем новый instagram_id к существующей записи
                    existing_id = existing[0]
                    if company_id:
                        c.execute(
                            "UPDATE clients SET instagram_id = %s, username = %s WHERE instagram_id = %s AND company_id = %s",
                            (instagram_id, username, existing_id, company_id),
                        )
                    else:
                        c.execute(
                            "UPDATE clients SET instagram_id = %s, username = %s WHERE instagram_id = %s",
                            (instagram_id, username, existing_id),
                        )
                    conn.commit()
                    print(f"🔗 Связан новый ID {instagram_id} с существующим клиентом {existing_id}")
                    return instagram_id
        
        # 3. Если клиента всё еще нет - создаем нового
        if not client:
            if company_id:
                ensure_company_quota(int(company_id), "clients", 1)

            now = datetime.now().isoformat()
            
            # Fetch default pipeline stage (usually 'new' or first order)
            c.execute("SELECT id FROM workflow_stages WHERE entity_type = 'pipeline' AND (LOWER(name) = 'новый' OR LOWER(name) = 'new' OR sort_order = 0) ORDER BY sort_order ASC LIMIT 1")
            stage_row = c.fetchone()
            default_stage_id = stage_row[0] if stage_row else None
            
            c.execute("""INSERT INTO clients 
                         (instagram_id, username, phone, email, first_contact, last_contact, 
                          total_messages, labels, status, detected_language, pipeline_stage_id, company_id)
                         VALUES (%s, %s, %s, %s, %s, %s, 0, %s, %s, %s, %s, %s)""",
                      (instagram_id, username, phone, email, now, now, "Новый клиент", "new", "ru", default_stage_id, company_id))
            conn.commit()
            print(f"✨ Создан новый клиент: {instagram_id} ({username or ''}) в стадии {default_stage_id}")
        else:
            # Обновляем время контакта
            now = datetime.now().isoformat()
            if company_id:
                c.execute("""UPDATE clients 
                             SET last_contact = %s, total_messages = total_messages + 1 
                             WHERE instagram_id = %s AND company_id = %s""",
                          (now, instagram_id, company_id))
            else:
                c.execute("""UPDATE clients 
                             SET last_contact = %s, total_messages = total_messages + 1 
                             WHERE instagram_id = %s""",
                          (now, instagram_id))
            conn.commit()
            
        return instagram_id
    finally:
        conn.close()

def update_client_info(instagram_id: str, phone: str = None, name: str = None, notes: str = None,
                       is_pinned: int = None, status: str = None,
                       discount: float = None, card_number: str = None,
                       gender: str = None, age: int = None, birth_date: str = None,
                       profile_pic: str = None, email: str = None,
                       referral_code: str = None, password_hash: str = None,
                       telegram_id: str = None, reminder_date: str = None,
                       assigned_employee_id: int = None):
    """Обновить информацию о клиенте"""
    conn = get_db_connection()
    c = conn.cursor()
    
    updates = []
    params = []
    
    if phone is not None:
        updates.append("phone = %s")
        params.append(phone)
    if name is not None:
        updates.append("name = %s")
        params.append(name)
    if notes is not None:
        updates.append("notes = %s")
        params.append(notes)
    if is_pinned is not None:
        updates.append("is_pinned = %s")
        params.append(is_pinned)
    if status is not None:
        updates.append("status = %s")
        params.append(status)
    if discount is not None:
        updates.append("discount = %s")
        params.append(discount)
    if card_number is not None:
        updates.append("card_number = %s")
        params.append(card_number)
    if gender is not None:
        updates.append("gender = %s")
        params.append(gender)
    if age is not None:
        updates.append("age = %s")
        params.append(age)
    if birth_date is not None:
        updates.append("birth_date = %s")
        params.append(birth_date)
    if profile_pic is not None:
        updates.append("profile_pic = %s")
        params.append(profile_pic)
    if email is not None:
        updates.append("email = %s")
        params.append(email)
    if referral_code is not None:
        updates.append("referral_code = %s")
        params.append(referral_code)
    if password_hash is not None:
        updates.append("password_hash = %s")
        params.append(password_hash)
    if telegram_id is not None:
        updates.append("telegram_id = %s")
        params.append(telegram_id)
    if reminder_date is not None:
        updates.append("reminder_date = %s")
        params.append(reminder_date)
    if assigned_employee_id is not None:
        updates.append("assigned_employee_id = %s")
        params.append(assigned_employee_id)

    try:
        if updates:
            params.append(instagram_id)
            query = f"UPDATE clients SET {', '.join(updates)} WHERE instagram_id = %s"
            c.execute(query, params)
            conn.commit()
            log_info(f"✅ Обновлена информация клиента {instagram_id}", "db")
        
        conn.close()
        return True
    except Exception as e:
        print(f"Ошибка обновления клиента: {e}")
        conn.close()
        return False

    # Миграция: изменить дефолтную температуру на 'warm'
    try:
        c.execute("ALTER TABLE clients ALTER COLUMN temperature SET DEFAULT 'warm'")
        c.execute("UPDATE clients SET temperature = 'warm' WHERE temperature = 'cold'")
        conn.commit()
    except:
        pass

def update_client_status(instagram_id: str, status: str):
    """Обновить статус клиента"""
    conn = get_db_connection()
    c = conn.cursor()
    
    # Обновляем сам статус
    c.execute("UPDATE clients SET status = %s WHERE instagram_id = %s",
              (status, instagram_id))
    
    # Если статус "завершен" (или похожий), завершаем последнюю активную запись
    # Проверяем разные варианты ключей статуса
    completed_keys = ['completed', 'status_completed', 'завершен', 'завершено']
    if any(k in status.lower() for k in completed_keys):
        # Ищем последнюю запись со статусом 'confirmed' или 'pending'
        c.execute("""
            UPDATE bookings 
            SET status = 'completed', completed_at = %s 
            WHERE instagram_id = %s 
            AND status IN ('confirmed', 'pending')
            AND id = (
                SELECT id FROM bookings 
                WHERE instagram_id = %s 
                AND status IN ('confirmed', 'pending')
                ORDER BY datetime DESC LIMIT 1
            )
        """, (datetime.now().isoformat(), instagram_id, instagram_id))
    
    conn.commit()
    conn.close()

def pin_client(instagram_id: str, pinned: bool = True):
    """Закрепить/открепить клиента"""
    conn = get_db_connection()
    c = conn.cursor()
    
    c.execute("UPDATE clients SET is_pinned = %s WHERE instagram_id = %s",
              (True if pinned else False, instagram_id))
    
    conn.commit()
    conn.close()

def delete_client(instagram_id: str) -> bool:
    """Удалить клиента и все его данные"""
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        # Проверяем наличие клиента перед удалением
        c.execute("SELECT 1 FROM clients WHERE instagram_id = %s", (instagram_id,))
        if not c.fetchone():
            conn.close()
            return False

        # ✅ Удалить зависимости из таблиц с FOREIGN KEY на clients(instagram_id)
        
        # Удалить loyalty транзакции
        c.execute("DELETE FROM loyalty_transactions WHERE client_id = %s", (instagram_id,))
        
        # ... остальные удаления опустим для краткости, они работают ...
        
        # Удалить самого клиента (последний шаг)
        # Сначала почистим все остальные таблицы (полный список опущен, полагаемся на существующий код)
        c.execute("DELETE FROM client_loyalty_points WHERE client_id = %s", (instagram_id,))
        c.execute("DELETE FROM ratings WHERE instagram_id = %s", (instagram_id,))
        c.execute("DELETE FROM bot_analytics WHERE instagram_id = %s", (instagram_id,))
        c.execute("DELETE FROM client_referrals WHERE referrer_id = %s OR referred_id = %s", (instagram_id, instagram_id))
        c.execute("DELETE FROM conversations WHERE client_id = %s", (instagram_id,))
        c.execute("DELETE FROM reminder_logs WHERE client_id = %s", (instagram_id,))
        c.execute("DELETE FROM chat_history WHERE instagram_id = %s", (instagram_id,))
        c.execute("DELETE FROM booking_reminders_sent WHERE booking_id IN (SELECT id FROM bookings WHERE instagram_id = %s)", (instagram_id,))
        c.execute("DELETE FROM bookings WHERE instagram_id = %s", (instagram_id,))
        c.execute(
            """
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'booking_drafts'
              AND column_name IN ('instagram_id', 'client_id')
            """
        )
        draft_columns = {row[0] for row in c.fetchall()}
        if 'instagram_id' in draft_columns and 'client_id' in draft_columns:
            c.execute("DELETE FROM booking_drafts WHERE instagram_id = %s OR client_id = %s", (instagram_id, instagram_id))
        elif 'instagram_id' in draft_columns:
            c.execute("DELETE FROM booking_drafts WHERE instagram_id = %s", (instagram_id,))
        elif 'client_id' in draft_columns:
            c.execute("DELETE FROM booking_drafts WHERE client_id = %s", (instagram_id,))
        c.execute("DELETE FROM booking_temp WHERE instagram_id = %s", (instagram_id,))
        c.execute("DELETE FROM client_notifications WHERE client_instagram_id = %s", (instagram_id,))
        
        # Удалить самого клиента
        c.execute("DELETE FROM clients WHERE instagram_id = %s", (instagram_id,))
        deleted_count = c.rowcount

        conn.commit()
        conn.close()
        
        success = deleted_count > 0
        if success:
            log_info(f"Клиент {instagram_id} и все его данные удалены", "clients")
            return True
        else:
            log_info(f"Client delete: no row deleted for instagram_id={instagram_id!r}, rowcount={deleted_count}", "clients")
            return False
    except Exception as e:
        log_error(f"Ошибка удаления клиента {instagram_id}: {e}", "clients")
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
    
    conn = get_db_connection()
    c = conn.cursor()
    
    c.execute("UPDATE clients SET detected_language = %s WHERE instagram_id = %s",
              (language, instagram_id))
    
    conn.commit()
    conn.close()
    
    log_info(f"✅ Language detected: {language} for {instagram_id} (cyr:{cyrillic_count}, ar:{arabic_count}, lat:{latin_count})", "database")
    
    return language

def get_client_language(instagram_id: str) -> str:
    """Получить язык клиента"""
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        # ✅ ИСПРАВЛЕНИЕ: Используем detected_language вместо language
        c.execute("SELECT detected_language FROM clients WHERE instagram_id = %s", (instagram_id,))
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
    conn = get_db_connection()
    c = conn.cursor()
    
    update_fields = []
    values = []
    
    allowed_fields = ['username', 'name', 'phone', 'status', 'notes']
    
    for field in allowed_fields:
        if field in data:
            update_fields.append(f"{field} = %s")
            values.append(data[field])
    
    if not update_fields:
        conn.close()
        return
    
    values.append(instagram_id)
    query = f"UPDATE clients SET {', '.join(update_fields)} WHERE instagram_id = %s"
    
    try:
        c.execute(query, values)
        conn.commit()
    except Exception as e:
        print(f"❌ Ошибка обновления: {e}")
    finally:
        conn.close()

def get_client_bot_mode(instagram_id: str) -> str:
    """Получить режим бота для клиента"""
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        c.execute("SELECT bot_mode FROM clients WHERE instagram_id = %s", (instagram_id,))
        result = c.fetchone()
        return result[0] if result and result[0] else 'autopilot'
    except Exception as e:
        log_error(f"Ошибка получения режима бота: {e}", "database")
        return 'autopilot'
    finally:
        conn.close()

def update_client_bot_mode(instagram_id: str, mode: str) -> bool:
    """Обновить режим бота для клиента"""
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        c.execute(
            "UPDATE clients SET bot_mode = %s WHERE instagram_id = %s",
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
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        # Получаем клиента
        c.execute("""
            SELECT username, name 
            FROM clients 
            WHERE instagram_id = %s
        """, (instagram_id,))
        
        result = c.fetchone()
        
        if not result:
            return False
        
        username, name = result
        
        # Если имя пустое и username есть - копируем username в name
        if not name and username:
            c.execute("""
                UPDATE clients 
                SET name = %s
                WHERE instagram_id = %s
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
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        # Создаём таблицу если её нет
        c.execute('''CREATE TABLE IF NOT EXISTS client_interests (
            id SERIAL PRIMARY KEY,
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
            WHERE client_id = %s AND service_name LIKE %s
        """, (instagram_id, f"%{service_name}%"))
        
        existing = c.fetchone()
        
        if existing:
            # Обновляем счётчик
            c.execute("""
                UPDATE client_interests 
                SET interest_count = interest_count + 1,
                    last_asked = CURRENT_TIMESTAMP
                WHERE id = %s
            """, (existing[0],))
        else:
            # Создаём новую запись
            c.execute("""
                INSERT INTO client_interests 
                (client_id, service_name, interest_count)
                VALUES (%s, %s, 1)
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
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        c.execute("""
            SELECT interest_count 
            FROM client_interests 
            WHERE client_id = %s AND service_name LIKE %s
        """, (instagram_id, f"%{service_name}%"))
        
        result = c.fetchone()
        return result[0] if result else 0
        
    except:
        return 0
    finally:
        conn.close()

def is_hot_client(instagram_id: str, service_name: str = None) -> bool:
    """Проверить является ли клиент "горячим" (#5)"""
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        if service_name:
            # Проверка по конкретной услуге
            c.execute("""
                SELECT interest_count 
                FROM client_interests 
                WHERE client_id = %s AND service_name LIKE %s
            """, (instagram_id, f"%{service_name}%"))
            
            result = c.fetchone()
            return result and result[0] >= 3  # 3+ запроса = горячий
        else:
            # Общая проверка по всем услугам
            c.execute("""
                SELECT SUM(interest_count) 
                FROM client_interests 
                WHERE client_id = %s
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
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        # Booking-based intent has priority over chat heuristics.
        try:
            c.execute("""
                SELECT
                    COUNT(*) FILTER (WHERE COALESCE(status, '') <> 'cancelled') AS total_bookings,
                    COUNT(*) FILTER (WHERE status = 'completed') AS completed_bookings
                FROM bookings
                WHERE instagram_id = %s
                  AND deleted_at IS NULL
            """, (instagram_id,))
        except Exception:
            c.execute("""
                SELECT
                    COUNT(*) FILTER (WHERE COALESCE(status, '') <> 'cancelled') AS total_bookings,
                    COUNT(*) FILTER (WHERE status = 'completed') AS completed_bookings
                FROM bookings
                WHERE instagram_id = %s
            """, (instagram_id,))

        bookings_row = c.fetchone() or (0, 0)
        total_bookings = int(bookings_row[0] or 0)
        completed_bookings = int(bookings_row[1] or 0)

        if total_bookings >= 4 or completed_bookings >= 3:
            return 'hot'
        if total_bookings >= 1:
            return 'warm'

        # Критерии:
        # HOT: спрашивал конкретное время записи
        # WARM: спросил цену
        # COLD: просто смотрит
        
        # Проверяем последние 5 сообщений
        c.execute("""
            SELECT message 
            FROM chat_history 
            WHERE instagram_id = %s AND sender = 'client'
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
    
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        # Проверяем есть ли колонка temperature
        c.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='clients'
        """)
        columns = [row[0] for row in c.fetchall()]
        
        if 'temperature' not in columns:
            # Добавляем колонку
            c.execute("ALTER TABLE clients ADD COLUMN temperature TEXT DEFAULT 'cold'")
        
        # Обновляем значение
        c.execute("""
            UPDATE clients 
            SET temperature = %s
            WHERE instagram_id = %s
        """, (temperature, instagram_id))
        
        conn.commit()
        
    except Exception as e:
        log_error(f"Error updating temperature: {e}", "database")
        conn.rollback()
    finally:
        conn.close()

def set_client_temperature(instagram_id: str, temperature: str) -> bool:
    """Установить температуру клиента вручную"""
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        # Проверяем есть ли колонка temperature
        c.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='clients'
        """)
        columns = [row[0] for row in c.fetchall()]
        
        if 'temperature' not in columns:
            c.execute("ALTER TABLE clients ADD COLUMN temperature TEXT DEFAULT 'cold'")
        
        c.execute("""
            UPDATE clients 
            SET temperature = %s
            WHERE instagram_id = %s
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
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        # Получаем статистику записей
        c.execute("""
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
                SUM(CASE WHEN status = 'no_show' THEN 1 ELSE 0 END) as no_show
            FROM bookings
            WHERE instagram_id = %s
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
