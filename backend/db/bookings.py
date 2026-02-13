"""
Функции для работы с записями
"""
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Tuple

from db.connection import get_db_connection
from utils.datetime_utils import get_current_time, get_salon_timezone
import psycopg2

ANY_MASTER_ALIASES = {"any", "any_master", "global", "любой", "не указан", "не указано"}


def _is_any_master(master_value: Optional[str]) -> bool:
    if master_value is None:
        return True

    normalized = str(master_value).strip().lower()
    if not normalized:
        return True

    return normalized in ANY_MASTER_ALIASES


def _column_exists(cursor, table_name: str, column_name: str) -> bool:
    cursor.execute(
        """
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = %s AND column_name = %s
        LIMIT 1
        """,
        (table_name, column_name),
    )
    return bool(cursor.fetchone())


def _resolve_master_identity(cursor, master_identifier: Optional[str]) -> Tuple[Optional[str], Optional[int], List[str]]:
    if _is_any_master(master_identifier):
        return None, None, []

    raw_identifier = str(master_identifier).strip()
    if not raw_identifier:
        return None, None, []

    row = None
    if raw_identifier.isdigit():
        cursor.execute(
            """
            SELECT id, full_name, username, nickname
            FROM users
            WHERE id = %s
              AND is_service_provider = TRUE
              AND deleted_at IS NULL
            LIMIT 1
            """,
            (int(raw_identifier),),
        )
        row = cursor.fetchone()

    if not row:
        cursor.execute(
            """
            SELECT id, full_name, username, nickname
            FROM users
            WHERE is_service_provider = TRUE
              AND deleted_at IS NULL
              AND (
                LOWER(username) = LOWER(%s)
                OR LOWER(full_name) = LOWER(%s)
                OR LOWER(COALESCE(nickname, '')) = LOWER(%s)
              )
            ORDER BY
                CASE
                    WHEN LOWER(username) = LOWER(%s) THEN 0
                    WHEN LOWER(full_name) = LOWER(%s) THEN 1
                    ELSE 2
                END,
                id ASC
            LIMIT 1
            """,
            (raw_identifier, raw_identifier, raw_identifier, raw_identifier, raw_identifier),
        )
        row = cursor.fetchone()

    if not row:
        return raw_identifier, None, [raw_identifier]

    user_id, full_name, username, nickname = row
    aliases: List[str] = []
    for value in (full_name, username, nickname, raw_identifier):
        normalized = str(value or "").strip()
        if not normalized:
            continue
        if normalized in aliases:
            continue
        aliases.append(normalized)

    canonical_name = str(full_name or username or raw_identifier).strip()
    if canonical_name and canonical_name not in aliases:
        aliases.insert(0, canonical_name)

    return canonical_name, int(user_id), aliases


def normalize_master_value(master_identifier: Optional[str]) -> Optional[str]:
    """Возвращает каноническое имя мастера по id/username/full_name/nickname."""
    if _is_any_master(master_identifier):
        return None

    conn = get_db_connection()
    c = conn.cursor()
    try:
        canonical_name, _, _ = _resolve_master_identity(c, master_identifier)
        return canonical_name
    finally:
        conn.close()


def get_all_bookings(limit: int = 1000, offset: int = 0):
    """Получить все записи с лимитом для оптимизации"""
    conn = get_db_connection()
    c = conn.cursor()

    try:
        query = """SELECT id, instagram_id, service_name, datetime, phone,
                     name, status, created_at, revenue, master, user_id, source
                     FROM bookings 
                     WHERE deleted_at IS NULL
                     ORDER BY created_at DESC"""
        if limit:
            query += f" LIMIT {limit}"
        if offset:
            query += f" OFFSET {offset}"
        c.execute(query)
    except psycopg2.OperationalError:
        # Fallback для старой схемы без master/user_id
        try:
            query = """SELECT id, instagram_id, service_name, datetime, phone,
                         name, status, created_at, revenue, master, NULL as user_id, source
                         FROM bookings ORDER BY created_at DESC"""
            if limit:
                query += f" LIMIT {limit}"
            c.execute(query)
        except:
            query = """SELECT id, instagram_id, service_name, datetime, phone,
                         name, status, created_at, 0 as revenue, NULL as master, NULL as user_id
                         FROM bookings ORDER BY created_at DESC"""
            if limit:
                query += f" LIMIT {limit}"
            c.execute(query)

    bookings = c.fetchall()
    conn.close()
    return bookings

def count_all_bookings():
    """Получить общее количество записей"""
    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute("SELECT COUNT(*) FROM bookings WHERE deleted_at IS NULL")
        count = c.fetchone()[0]
    except:
        count = 0
    conn.close()
    return count

def get_filtered_bookings(
    limit: int = 50,
    offset: int = 0,
    search: str = None,
    status: str = None,
    master: str = None,
    date_from: str = None,
    date_to: str = None,
    user_id: int = None,
    sort_by: str = 'datetime',
    order: str = 'desc'
):
    """Получить отфильтрованные записи с пагинацией и сортировкой"""
    conn = get_db_connection()
    c = conn.cursor()
    
    conditions = ["deleted_at IS NULL"]
    params = []
    
    # 1. Search
    if search:
        search_term = f"%{search}%"
        conditions.append("""
            (service_name ILIKE %s OR 
             name ILIKE %s OR 
             phone ILIKE %s OR
             instagram_id ILIKE %s)
        """)
        params.extend([search_term, search_term, search_term, search_term])
        
    # 2. Status
    if status and status != 'all':
        conditions.append("status = %s")
        params.append(status)
        
    # 3. Master
    if master and master != 'all':
        canonical_master, master_user_id, aliases = _resolve_master_identity(c, master)
        aliases_upper = [alias.upper() for alias in aliases if alias]
        if not aliases_upper and canonical_master:
            aliases_upper = [canonical_master.upper()]

        if aliases_upper or master_user_id is not None:
            has_master_user_id = _column_exists(c, 'bookings', 'master_user_id')
            if has_master_user_id and master_user_id is not None:
                conditions.append("(master_user_id = %s OR (master_user_id IS NULL AND UPPER(master) = ANY(%s)))")
                params.extend([master_user_id, aliases_upper])
            else:
                conditions.append("UPPER(master) = ANY(%s)")
                params.append(aliases_upper)
        
    # 4. Dates
    if date_from:
        conditions.append("datetime >= %s")
        params.append(date_from)
    if date_to:
        conditions.append("datetime <= %s")
        params.append(date_to)
        
    # 5. User (RBAC)
    if user_id:
        conditions.append("user_id = %s")
        params.append(user_id)

    where_clause = " AND ".join(conditions)
    
    # Sorting
    sort_column = 'datetime'
    if sort_by == 'revenue':
        sort_column = 'revenue'
    elif sort_by == 'service_name':
        sort_column = 'service_name'
    elif sort_by == 'master':
        sort_column = 'master'
    elif sort_by == 'name':
        sort_column = 'name'
    elif sort_by == 'status':
        sort_column = 'status'
    elif sort_by == 'source':
        sort_column = 'source'
        
    sort_dir = 'DESC' if order.lower() == 'desc' else 'ASC'
    
    # Count Query
    count_query = f"SELECT COUNT(*) FROM bookings WHERE {where_clause}"
    c.execute(count_query, tuple(params))
    total_count = c.fetchone()[0]
    
    # Data Query
    query = f"""
        SELECT id, instagram_id, service_name, datetime, phone,
               name, status, created_at, revenue, master, user_id, source
        FROM bookings
        WHERE {where_clause}
        ORDER BY {sort_column} {sort_dir}
        LIMIT %s OFFSET %s
    """
    params.append(limit)
    params.append(offset)
    
    try:
        c.execute(query, tuple(params))
        bookings = c.fetchall()
    except Exception as e:
        print(f"Error filtering bookings: {e}")
        bookings = []
        
    conn.close()
    return bookings, total_count

def get_booking_stats(
    search: str = None,
    master: str = None,
    date_from: str = None,
    date_to: str = None,
    user_id: int = None
):
    """Получить статистику записей с фильтрацией"""
    conn = get_db_connection()
    c = conn.cursor()
    
    conditions = ["deleted_at IS NULL"]
    params = []
    
    # Reuse filter logic (simplified copy)
    if search:
        search_term = f"%{search}%"
        conditions.append("""
            (service_name ILIKE %s OR 
             name ILIKE %s OR 
             phone ILIKE %s OR
             instagram_id ILIKE %s)
        """)
        params.extend([search_term, search_term, search_term, search_term])
        
    if master and master != 'all':
        canonical_master, master_user_id, aliases = _resolve_master_identity(c, master)
        aliases_upper = [alias.upper() for alias in aliases if alias]
        if not aliases_upper and canonical_master:
            aliases_upper = [canonical_master.upper()]

        if aliases_upper or master_user_id is not None:
            has_master_user_id = _column_exists(c, 'bookings', 'master_user_id')
            if has_master_user_id and master_user_id is not None:
                conditions.append("(master_user_id = %s OR (master_user_id IS NULL AND UPPER(master) = ANY(%s)))")
                params.extend([master_user_id, aliases_upper])
            else:
                conditions.append("UPPER(master) = ANY(%s)")
                params.append(aliases_upper)
        
    if date_from:
        conditions.append("datetime >= %s")
        params.append(date_from)
    if date_to:
        conditions.append("datetime <= %s")
        params.append(date_to)
        
    if user_id:
        conditions.append("user_id = %s")
        params.append(user_id)

    where_clause = " AND ".join(conditions)

    try:
        query = f"""
            SELECT 
                status,
                COUNT(*),
                COALESCE(SUM(revenue), 0)
            FROM bookings
            WHERE {where_clause}
            GROUP BY status
        """
        c.execute(query, tuple(params))
        rows = c.fetchall()
        
        stats = {
            "pending": 0,
            "confirmed": 0,
            "cancelled": 0,
            "completed": 0,
            "no_show": 0,
            "total": 0,
            "revenue": 0
        }
        
        for row in rows:
            status = row[0]
            count = row[1]
            revenue = row[2]
            
            stats[status] = count
            stats["total"] += count
            if status == 'completed':
                stats["revenue"] += revenue
                
    except Exception as e:
        print(f"Error getting booking stats: {e}")
        stats = {}
        
    conn.close()
    return stats


def get_bookings_by_master(master_name: str):
    """Получить записи по имени мастера"""
    conn = get_db_connection()
    c = conn.cursor()

    try:
        canonical_master, master_user_id, aliases = _resolve_master_identity(c, master_name)
        aliases_upper = [alias.upper() for alias in aliases if alias]
        if not aliases_upper and canonical_master:
            aliases_upper = [canonical_master.upper()]

        if _column_exists(c, 'bookings', 'master_user_id') and master_user_id is not None:
            c.execute(
                """
                SELECT id, instagram_id, service_name, datetime, phone,
                       name, status, created_at, revenue, master
                FROM bookings
                WHERE (
                    master_user_id = %s
                    OR (master_user_id IS NULL AND UPPER(master) = ANY(%s))
                )
                  AND deleted_at IS NULL
                ORDER BY datetime DESC
                """,
                (master_user_id, aliases_upper),
            )
        else:
            c.execute(
                """
                SELECT id, instagram_id, service_name, datetime, phone,
                       name, status, created_at, revenue, master
                FROM bookings
                WHERE UPPER(master) = ANY(%s)
                  AND deleted_at IS NULL
                ORDER BY datetime DESC
                """,
                (aliases_upper,),
            )
    except psycopg2.OperationalError:
        # Fallback для старой схемы без master
        c.execute("""
            SELECT id, instagram_id, service_name, datetime, phone,
                   name, status, created_at, revenue, NULL as master
            FROM bookings
            WHERE 1=0
        """)

    bookings = c.fetchall()
    conn.close()
    return bookings

def get_bookings_by_client(instagram_id: str = None, phone: str = None, user_id: int = None):
    """
    Получить записи клиента по Instagram ID, телефону или user_id.
    Приоритет: ищем по всем непустым полям (OR).
    """
    conn = get_db_connection()
    c = conn.cursor()

    try:
        # Пробуем современный запрос
        query = """
            SELECT id, instagram_id, service_name, datetime, phone,
                   name, status, created_at, revenue, master, user_id
            FROM bookings
            WHERE 1=1
        """
        conditions = []
        params = []

        if instagram_id:
            conditions.append("instagram_id = %s")
            params.append(instagram_id)
        
        if phone:
            conditions.append("phone = %s")
            params.append(phone)
            
        if user_id:
            conditions.append("user_id = %s")
            params.append(user_id)
        
        if conditions:
            query += " AND (" + " OR ".join(conditions) + ")"
        
        query += " AND deleted_at IS NULL"
        query += " ORDER BY datetime DESC"

        c.execute(query, tuple(params))
    except psycopg2.OperationalError:
         # Fallback (без master)
        query = """
            SELECT id, instagram_id, service_name, datetime, phone,
                   name, status, created_at, revenue, NULL as master
            FROM bookings
            WHERE instagram_id = %s
        """
        params = [instagram_id]

        if phone:
            query += " OR phone = %s"
            params.append(phone)

        query += " ORDER BY created_at DESC"

        c.execute(query, tuple(params))

    bookings = c.fetchall()
    conn.close()
    
    # Удаляем дубликаты по ID (если нашлись и по ID и по телефону)
    seen_ids = set()
    unique_bookings = []
    for b in bookings:
        if b[0] not in seen_ids:
            seen_ids.add(b[0])
            unique_bookings.append(b)
            
    return unique_bookings

def get_bookings_by_phone(phone: str):
    """Получить записи клиента по номеру телефона"""
    return get_bookings_by_client(instagram_id=None, phone=phone)

def save_booking(instagram_id: str, service: str, datetime_str: str, 
                phone: str, name: str, special_package_id: int = None, master: str = None,
                status: str = 'confirmed', source: str = 'manual', user_id: int = None,
                revenue: float = 0, promo_code: str = None, duration_minutes: Optional[int] = None):
    """Сохранить завершённую запись"""
    conn = get_db_connection()
    c = conn.cursor()
    
    # ✅ КРИТИЧНО: Убедимся что клиент существует в БД
    from db import get_or_create_client
    get_or_create_client(instagram_id, phone=phone)
    
    # ✅ Попытка определить user_id если не передан
    if user_id is None:
        # Ищем пользователя по username = instagram_id
        c.execute("SELECT id FROM users WHERE username = %s", (instagram_id,))
        user_row = c.fetchone()
        if user_row:
            user_id = user_row[0]
    
    canonical_master, master_user_id, _ = _resolve_master_identity(c, master)
    master_to_store = canonical_master
    if not master_to_store and not _is_any_master(master):
        master_to_store = str(master).strip()
    if _is_any_master(master):
        master_to_store = None
        master_user_id = None

    # Единая проверка доступности слота для будущих записей
    if master_to_store:
        try:
            from services.master_schedule import MasterScheduleService
            from zoneinfo import ZoneInfo

            schedule_service = MasterScheduleService()
            timezone = ZoneInfo(get_salon_timezone())

            raw_dt = str(datetime_str).strip().replace('T', ' ')
            if len(raw_dt) == 16:
                raw_dt = f"{raw_dt}:00"

            booking_start = datetime.fromisoformat(raw_dt)
            if booking_start.tzinfo is None:
                booking_start = booking_start.replace(tzinfo=timezone)
            else:
                booking_start = booking_start.astimezone(timezone)

            now_dt = get_current_time().astimezone(timezone)
            # Прошлые записи оставляем без жёсткой проверки (история, ручной импорт)
            if booking_start >= (now_dt - timedelta(minutes=1)):
                resolved_duration_minutes = (
                    int(duration_minutes)
                    if isinstance(duration_minutes, (int, float)) and int(duration_minutes) > 0
                    else schedule_service.estimate_duration_minutes(service, fallback=60)
                )
                slot_check = schedule_service.validate_slot(
                    master_name=master_to_store,
                    date=booking_start.strftime("%Y-%m-%d"),
                    time_str=booking_start.strftime("%H:%M"),
                    duration_minutes=resolved_duration_minutes,
                )
                if not slot_check.get("is_available"):
                    reason = slot_check.get("reason", "unavailable")
                    raise ValueError(f"slot_unavailable:{reason}")
        except ValueError:
            raise
        except Exception as e:
            print(f"Booking availability validation warning: {e}")

    now = get_current_time().isoformat()
    # Ensure datetime_str is in ISO format (T separator)
    if ' ' in datetime_str and 'T' not in datetime_str:
        datetime_str = datetime_str.replace(' ', 'T')

    has_master_user_id = _column_exists(c, "bookings", "master_user_id")
    if has_master_user_id:
        c.execute(
            """INSERT INTO bookings
                 (instagram_id, service_name, datetime, phone, name, status,
                  created_at, special_package_id, master, master_user_id, source, user_id, revenue, promo_code)
                 VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                 RETURNING id""",
            (
                instagram_id,
                service,
                datetime_str,
                phone,
                name,
                status,
                now,
                special_package_id,
                master_to_store,
                master_user_id,
                source,
                user_id,
                revenue,
                promo_code,
            ),
        )
    else:
        c.execute(
            """INSERT INTO bookings
                 (instagram_id, service_name, datetime, phone, name, status,
                  created_at, special_package_id, master, source, user_id, revenue, promo_code)
                 VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                 RETURNING id""",
            (
                instagram_id,
                service,
                datetime_str,
                phone,
                name,
                status,
                now,
                special_package_id,
                master_to_store,
                source,
                user_id,
                revenue,
                promo_code,
            ),
        )
    
    booking_id = c.fetchone()[0]  # ✅ ПОЛУЧАЕМ ID СОЗДАННОЙ ЗАПИСИ
    
    # ✅ ЛОГИРУЕМ ИСПОЛЬЗОВАНИЕ ПРОМОКОДА
    if promo_code:
        try:
            from db.promo_codes import validate_promo_code, log_promo_usage
            promo_res = validate_promo_code(promo_code, revenue)
            if promo_res.get('valid'):
                log_promo_usage(promo_res['id'], client_id=instagram_id, user_id=user_id, booking_id=booking_id)
        except Exception as e:
            print(f"Error logging promo usage: {e}")

    # ✅ ЗАЩИТА ОТ ПЕРЕЗАПИСИ ПРОФИЛЯ ("Запись для друга")
    # Проверяем текущие данные клиента
    c.execute("SELECT name, phone FROM clients WHERE instagram_id = %s", (instagram_id,))
    current_client = c.fetchone()
    
    # Обновляем профиль ТОЛЬКО если он пустой или неполный
    # Если у клиента уже есть и имя и телефон - не трогаем профиль (это может быть запись для друга)
    should_update_profile = True
    if current_client and current_client[0] and current_client[1]:
        should_update_profile = False
        
    if should_update_profile:
        c.execute("""UPDATE clients 
                     SET status = 'lead', phone = %s, name = %s 
                     WHERE instagram_id = %s""",
                  (phone, name, instagram_id))
    
    # Увеличиваем счетчик использования пакета если это спец. пакет
    if special_package_id:
        from .services import increment_package_usage
        increment_package_usage(special_package_id)
    
    conn.commit()
    conn.close()
    
    return booking_id

def update_booking_status(booking_id: int, status: str) -> bool:
    """Обновить статус записи"""
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        if status == 'completed':
            completed_at = get_current_time().isoformat()
            c.execute("""UPDATE bookings 
                        SET status = %s, completed_at = %s 
                        WHERE id = %s""",
                      (status, completed_at, booking_id))
        else:
            c.execute("UPDATE bookings SET status = %s WHERE id = %s",
                      (status, booking_id))
        
        conn.commit()
        success = c.rowcount > 0
        conn.close()
        return success
    except Exception as e:
        print(f"Ошибка обновления статуса: {e}")
        conn.close()
        return False

# ===== ВРЕМЕННЫЕ ДАННЫЕ ЗАПИСИ =====

def search_bookings(query: str, limit: int = 50):
    """Поиск записей по тексту"""
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        c.execute("""
            SELECT b.id, b.instagram_id, c.username, c.name, b.service_name, 
                   b.datetime, b.phone, b.status, b.created_at, b.revenue
            FROM bookings b
            LEFT JOIN clients c ON b.instagram_id = c.instagram_id
            WHERE (b.service_name LIKE %s OR b.name LIKE %s OR c.username LIKE %s 
                  OR c.name LIKE %s OR b.phone LIKE %s)
                  AND b.deleted_at IS NULL
            ORDER BY b.created_at DESC

            LIMIT %s
        """, (query, query, query, query, query, limit))
        
        bookings = c.fetchall()
        
        return [
            {
                "id": b[0],
                "instagram_id": b[1],
                "username": b[2],
                "name": b[3],
                "service": b[4],
                "datetime": b[5],
                "phone": b[6],
                "status": b[7],
                "created_at": b[8],
                "revenue": b[9]
            } for b in bookings
        ]
    except Exception as e:
        print(f"❌ Ошибка поиска записей: {e}")
        return []
    finally:
        conn.close()

# ===== #4 - ПРОДОЛЖИТЬ ПРЕРВАННУЮ ЗАПИСЬ =====

def get_incomplete_booking(instagram_id: str):
    """Получить незавершённую запись (старая версия)"""
    # ... (legacy code)
    pass

def get_booking_progress(instagram_id: str) -> Optional[Dict]:
    """Получить текущий прогресс бронирования"""
    conn = get_db_connection()
    c = conn.cursor()
    try:
        key_column = "instagram_id" if _column_exists(c, "booking_drafts", "instagram_id") else "client_id"
        has_data_column = _column_exists(c, "booking_drafts", "data")

        if has_data_column:
            c.execute(f"SELECT data FROM booking_drafts WHERE {key_column} = %s", (instagram_id,))
            row = c.fetchone()
            if row and row[0]:
                import json
                return json.loads(row[0])
        else:
            c.execute(
                f"""
                SELECT service_id, datetime, master
                FROM booking_drafts
                WHERE {key_column} = %s
                LIMIT 1
                """,
                (instagram_id,),
            )
            row = c.fetchone()
            if row:
                return {
                    "service_id": row[0],
                    "datetime": row[1],
                    "master": row[2],
                }
        return None
    except Exception as e:
        print(f"Error getting booking progress: {e}")
        return None
    finally:
        conn.close()

def update_booking_progress(instagram_id: str, data: Dict):
    """Обновить прогресс бронирования"""
    conn = get_db_connection()
    c = conn.cursor()
    try:
        import json
        # Merge with existing data
        current = get_booking_progress(instagram_id) or {}
        current.update(data)
        
        # Extract fields for database columns
        # Drafts expire in 30 minutes
        expires_at = get_current_time() + timedelta(minutes=30)
        
        # We need to handle time and date carefully
        # If both are present, we can form a datetime string
        dt_str = None
        if current.get('date') and current.get('time'):
            dt_str = f"{current['date']} {current['time']}"

        key_column = "instagram_id" if _column_exists(c, "booking_drafts", "instagram_id") else "client_id"
        has_master_user_id = _column_exists(c, "booking_drafts", "master_user_id")
        has_updated_at = _column_exists(c, "booking_drafts", "updated_at")
        has_data_column = _column_exists(c, "booking_drafts", "data")
        has_service_id = _column_exists(c, "booking_drafts", "service_id")

        canonical_master, master_user_id, _ = _resolve_master_identity(c, current.get("master"))
        master_to_store = canonical_master
        if not master_to_store and not _is_any_master(current.get("master")):
            master_to_store = str(current.get("master")).strip()
        if _is_any_master(current.get("master")):
            master_to_store = None
            master_user_id = None
        current["master"] = master_to_store

        service_id_value = current.get("service_id")
        if service_id_value is not None:
            try:
                service_id_value = int(service_id_value)
            except Exception:
                service_id_value = None

        insert_columns = [key_column, "datetime", "master", "expires_at"]
        insert_values = [instagram_id, dt_str, master_to_store, expires_at]

        if has_data_column:
            insert_columns.append("data")
            insert_values.append(json.dumps(current))

        if has_service_id:
            insert_columns.append("service_id")
            insert_values.append(service_id_value)

        if has_master_user_id:
            insert_columns.append("master_user_id")
            insert_values.append(master_user_id)

        if has_updated_at:
            insert_columns.append("updated_at")
            insert_values.append(get_current_time())

        c.execute(f"DELETE FROM booking_drafts WHERE {key_column} = %s", (instagram_id,))
        c.execute(
            f"""
            INSERT INTO booking_drafts ({', '.join(insert_columns)})
            VALUES ({', '.join(['%s'] * len(insert_columns))})
            """,
            tuple(insert_values),
        )
        conn.commit()
    except Exception as e:
        print(f"Error updating booking progress: {e}")
    finally:
        conn.close()

def clear_booking_progress(instagram_id: str):
    """Очистить прогресс бронирования"""
    conn = get_db_connection()
    c = conn.cursor()
    try:
        key_column = "instagram_id" if _column_exists(c, "booking_drafts", "instagram_id") else "client_id"
        c.execute(f"DELETE FROM booking_drafts WHERE {key_column} = %s", (instagram_id,))
        conn.commit()
    except Exception as e:
        print(f"Error clearing booking progress: {e}")
    finally:
        conn.close()

def mark_booking_incomplete(instagram_id: str, progress: Dict):
    """Отметить запись как незавершённую"""
    update_booking_progress(instagram_id, progress)

# ===== #7 - БЫСТРАЯ ЗАПИСЬ ДЛЯ ПОСТОЯННЫХ =====

def get_client_usual_booking_pattern(instagram_id: str) -> Optional[Dict]:
    """Получить обычный паттерн записи клиента"""
    conn = get_db_connection()
    c = conn.cursor()
    
    # Берём последние 3 записи
    # Берём последние 5 записей для анализа паттерна
    c.execute("""
        SELECT service_name, master, datetime
        FROM bookings
        WHERE instagram_id = %s AND status = 'completed'
        ORDER BY datetime DESC
        LIMIT 5
    """, (instagram_id,))
    
    bookings = c.fetchall()
    conn.close()
    
    if len(bookings) < 2:
        return None
    
    # Анализ паттерна
    services = {}
    masters = {}
    weekdays = {}
    hours = {}
    
    for service, master, dt_str in bookings:
        services[service] = services.get(service, 0) + 1
        if master:
            masters[master] = masters.get(master, 0) + 1
            
        try:
            # Parse datetime in Python
            if 'T' in dt_str:
                dt = datetime.fromisoformat(dt_str)
            else:
                dt = datetime.strptime(dt_str, "%Y-%m-%d %H:%M")
                
            # weekday() is 0=Monday, 6=Sunday
            # But the original code likely used strftime %w (0=Sunday, 6=Saturday)
            # Let's standardize on 0=Monday (Python ISO) -> 0=Sunday (SQL expectation if needed)
            # Actually, let's stick to Python weekday integers 0-6 (Mon-Sun) and map them later
            weekday = str(dt.weekday()) 
            hour = str(dt.hour)
            
            weekdays[weekday] = weekdays.get(weekday, 0) + 1
            hours[hour] = hours.get(hour, 0) + 1
        except Exception as e:
            print(f"Error parsing datetime {dt_str}: {e}")
            continue
    
    # Находим самые частые
    fav_service = max(services.items(), key=lambda x: x[1])[0] if services else None
    fav_master = max(masters.items(), key=lambda x: x[1])[0] if masters else None
    fav_weekday = max(weekdays.items(), key=lambda x: x[1])[0] if weekdays else None
    fav_hour = max(hours.items(), key=lambda x: x[1])[0] if hours else None
    
    # Если паттерн не выражен (всё разное) - возвращаем None
    if services.get(fav_service, 0) < 2:
        return None
    
    weekday_names = {
        '0': 'понедельник',
        '1': 'вторник',
        '2': 'среда',
        '3': 'четверг',
        '4': 'пятница',
        '5': 'суббота',
        '6': 'воскресенье'
    }
    
    return {
        'service': fav_service,
        'master': fav_master,
        'weekday': fav_weekday,
        'weekday_name': weekday_names.get(str(fav_weekday), '') if fav_weekday is not None else '',
        'hour': int(fav_hour) if fav_hour is not None else None
    }

# ===== #11 - КУРСОВЫЕ ПРОЦЕДУРЫ =====

def get_client_course_progress(instagram_id: str, service_name: str) -> Optional[Dict]:
    """Получить прогресс по курсовой процедуре"""
    conn = get_db_connection()
    c = conn.cursor()
    
    # Проверяем есть ли курс для этой услуги
    c.execute("""
        SELECT total_sessions, discount_percent
        FROM service_courses
        WHERE service_name LIKE %s
    """, (f"%{service_name}%",))
    
    course = c.fetchone()
    
    if not course:
        conn.close()
        return None
    
    total_sessions, discount = course
    
    # Считаем сколько уже было сеансов
    c.execute("""
        SELECT COUNT(*) 
        FROM bookings
        WHERE instagram_id = %s 
        AND service_name LIKE %s
        AND status = 'completed'
        AND datetime >= %s
    """, (instagram_id, f"%{service_name}%", (get_current_time() - timedelta(days=90)).strftime('%Y-%m-%d %H:%M')))
    
    completed_count = c.fetchone()[0]
    conn.close()
    
    return {
        'service': service_name,
        'total': total_sessions,
        'completed': completed_count,
        'remaining': max(0, total_sessions - completed_count),
        'discount': discount
    }

# ===== #17 - УМНАЯ ОЧЕРЕДЬ ОЖИДАНИЯ =====

def add_to_waitlist(instagram_id: str, service: str, preferred_date: str, preferred_time: str):
    """Добавить клиента в лист ожидания"""
    conn = get_db_connection()
    c = conn.cursor()
    
    # Создаём таблицу если её нет
    c.execute('''CREATE TABLE IF NOT EXISTS booking_waitlist (
        id SERIAL PRIMARY KEY,
        client_id TEXT NOT NULL,
        service TEXT NOT NULL,
        preferred_date DATE NOT NULL,
        preferred_time TIME NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        notified INTEGER DEFAULT 0,
        FOREIGN KEY (client_id) REFERENCES clients(instagram_id)
    )''')
    
    c.execute("""
        INSERT INTO booking_waitlist 
        (client_id, service, preferred_date, preferred_time)
        VALUES (%s, %s, %s, %s)
    """, (instagram_id, service, preferred_date, preferred_time))
    
    conn.commit()
    conn.close()

def get_waitlist_for_slot(service: str, date: str, time: str) -> List[str]:
    """Получить список ожидающих для конкретного слота"""
    conn = get_db_connection()
    c = conn.cursor()
    
    c.execute("""
        SELECT client_id 
        FROM booking_waitlist
        WHERE service LIKE %s 
        AND preferred_date = %s
        AND preferred_time = %s
        AND notified = 0
        ORDER BY created_at ASC
    """, (f"%{service}%", date, time))
    
    results = [row[0] for row in c.fetchall()]
    conn.close()
    
    return results

def mark_waitlist_notified(instagram_id: str, service: str, date: str, time: str):
    """Отметить что клиента уведомили"""
    conn = get_db_connection()
    c = conn.cursor()
    
    c.execute("""
        UPDATE booking_waitlist
        SET notified = 1
        WHERE client_id = %s
        AND service LIKE %s
        AND preferred_date = %s
        AND preferred_time = %s
    """, (instagram_id, f"%{service}%", date, time))
    
    conn.commit()
    conn.close()

# ===== #18 - ДЕТЕКТОР "СКОРО УЕЗЖАЕТ" =====

def check_if_urgent_booking(message: str) -> bool:
    """Проверить есть ли в сообщении признаки срочности"""
    urgent_keywords = [
        'уезжа', 'уеду', 'улетаю', 'leaving', 'срочно', 'urgent',
        'завтра уеж', 'послезавтра уеж', 'скоро уеж'
    ]
    
    message_lower = message.lower()
    return any(keyword in message_lower for keyword in urgent_keywords)

# ===== #19 - ПРЕДСКАЗАНИЕ NO-SHOW =====

def get_clients_for_rebooking(service_name: str, days_since: int) -> List[Tuple[str, str, str]]:
    """Получить клиентов для повторной записи (#16)"""
    conn = get_db_connection()
    c = conn.cursor()
    
    cutoff_date = (get_current_time() - timedelta(days=days_since)).strftime('%Y-%m-%d %H:%M')
    
    c.execute("""
        SELECT DISTINCT b.instagram_id, c.name, c.username
        FROM bookings b
        JOIN bookings b2 ON b.instagram_id = b2.instagram_id
        JOIN clients c ON b.instagram_id = c.instagram_id
        WHERE b.service_name LIKE %s
        AND b.status = 'completed'
        AND b.datetime <= %s
        AND b.instagram_id NOT IN (
            SELECT instagram_id 
            FROM bookings 
            WHERE status IN ('pending', 'confirmed')
        )
        ORDER BY b.datetime DESC
    """, (f"%{service_name}%", cutoff_date))
    
    results = c.fetchall()
    conn.close()
    
    return results

def get_upcoming_bookings(hours: int = 24) -> List[Tuple]:
    """Получить предстоящие записи для напоминаний (#15)"""
    conn = get_db_connection()
    c = conn.cursor()
    
    start_time = get_current_time().strftime('%Y-%m-%d %H:%M')
    end_time = (get_current_time() + timedelta(hours=hours)).strftime('%Y-%m-%d %H:%M')
    
    c.execute("""
        SELECT b.id, b.instagram_id, b.service_name, b.datetime, 
               b.master, c.name, c.username
        FROM bookings b
        JOIN clients c ON b.instagram_id = c.instagram_id
        WHERE b.status IN ('pending', 'confirmed')
        AND b.datetime BETWEEN %s AND %s
        AND b.deleted_at IS NULL

    """, (start_time, end_time))
    
    results = c.fetchall()
    conn.close()
    
    return results

# ===== #20 - УПРАВЛЕНИЕ ЗАПИСЯМИ (ОТМЕНА/ИЗМЕНЕНИЕ) =====

def cancel_booking(booking_id: int) -> bool:
    """Отменить запись (статус cancelled)"""
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        c.execute("UPDATE bookings SET status = 'cancelled' WHERE id = %s", (booking_id,))
        conn.commit()
        success = c.rowcount > 0
        conn.close()
        return success
    except Exception as e:
        print(f"❌ Ошибка отмены записи: {e}")
        conn.close()
        return False

def delete_booking(booking_id: int) -> bool:
    """Удалить запись из БД (полное удаление)"""
    conn = get_db_connection()
    c = conn.cursor()
    
    try:
        c.execute("DELETE FROM bookings WHERE id = %s", (booking_id,))
        conn.commit()
        success = c.rowcount > 0
        conn.close()
        return success
    except Exception as e:
        print(f"❌ Ошибка удаления записи: {e}")
        conn.close()
        return False

def find_active_booking(instagram_id: str) -> Optional[Dict]:
    """
    Найти активную (предстоящую) запись клиента.
    Возвращает словарь с данными записи или None.
    """
    conn = get_db_connection()
    c = conn.cursor()
    
    now = get_current_time().strftime('%Y-%m-%d %H:%M')
    
    # Ищем подтвержденную запись в будущем
    c.execute("""
        SELECT id, service_name, datetime, master, phone
        FROM bookings
        WHERE instagram_id = %s 
        AND status IN ('confirmed', 'pending')
        AND datetime >= %s
        AND deleted_at IS NULL
        ORDER BY datetime ASC

        LIMIT 1
    """, (instagram_id, now))
    
    row = c.fetchone()
    conn.close()
    
    if row:
        return {
            "id": row[0],
            "service": row[1],
            "datetime": row[2],
            "master": row[3],
            "phone": row[4]
        }
    return None

def update_booking_details(booking_id: int, data: Dict) -> bool:
    """Обновить детали записи (дата, время, услуга, мастер, стоимость, заметки)"""
    conn = get_db_connection()
    c = conn.cursor()
    
    fields = []
    params = []
    has_master_user_id = _column_exists(c, "bookings", "master_user_id")
    
    if 'date' in data and 'time' in data:
        datetime_str = f"{data['date']} {data['time']}"
        # Convert to ISO format if needed
        if ' ' in datetime_str and 'T' not in datetime_str:
            datetime_str = datetime_str.replace(' ', 'T')
        fields.append("datetime = %s")
        params.append(datetime_str)
    
    if 'service' in data:
        fields.append("service_name = %s")
        params.append(data['service'])
        
    if 'master' in data:
        canonical_master, master_user_id, _ = _resolve_master_identity(c, data.get('master'))
        master_to_store = canonical_master
        if not master_to_store and not _is_any_master(data.get('master')):
            master_to_store = str(data.get('master')).strip()
        if _is_any_master(data.get('master')):
            master_to_store = None
            master_user_id = None

        fields.append("master = %s")
        params.append(master_to_store)
        if has_master_user_id:
            fields.append("master_user_id = %s")
            params.append(master_user_id)
        
    if 'revenue' in data:
        fields.append("revenue = %s")
        params.append(data['revenue'])
        
    if 'notes' in data:
        fields.append("notes = %s")
        params.append(data['notes'])

    if not fields:
        conn.close()
        return False
        
    query = f"UPDATE bookings SET {', '.join(fields)} WHERE id = %s"
    params.append(booking_id)
    
    try:
        c.execute(query, tuple(params))
        conn.commit()
        success = c.rowcount > 0
        conn.close()
        return success
    except Exception as e:
        print(f"❌ Ошибка обновления деталей записи: {e}")
        conn.close()
        return False
