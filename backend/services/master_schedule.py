"""
Управление расписанием мастеров
"""
from datetime import datetime, timedelta, time as dt_time
from zoneinfo import ZoneInfo
from typing import Dict, List, Any, Optional
from core.config import DATABASE_NAME
from db.connection import get_db_connection
from utils.logger import log_info, log_error
from utils.datetime_utils import get_current_time, get_salon_timezone
from core.config import (
    DEFAULT_HOURS_WEEKDAYS,
    DEFAULT_HOURS_WEEKENDS,
    DEFAULT_HOURS_START,
    DEFAULT_HOURS_END,
    DEFAULT_LUNCH_START,
    DEFAULT_LUNCH_END,
    get_default_hours_dict,
    get_default_working_hours_response
)

class MasterScheduleService:
    """Сервис управления расписанием мастеров"""

    def __init__(self):
        pass

    def _get_user_id(self, master_name: str) -> Optional[int]:
        """Получить ID пользователя по имени"""
        conn = get_db_connection()
        c = conn.cursor()
        try:
            c.execute("SELECT id FROM users WHERE full_name = %s AND is_service_provider = TRUE", (master_name,))
            row = c.fetchone()
            return row[0] if row else None
        finally:
            conn.close()

    def set_working_hours(
        self,
        master_name: str,
        day_of_week: int,
        start_time: str,
        end_time: str
    ) -> bool:
        """
        Установить рабочие часы мастера на день недели
        """
        user_id = self._get_user_id(master_name)
        if not user_id:
            log_error(f"User not found: {master_name}", "schedule")
            return False

        conn = get_db_connection()
        c = conn.cursor()

        try:
            # Используем атомарный UPSERT (INSERT ... ON CONFLICT) для предотвращения race conditions
            c.execute("""
                INSERT INTO user_schedule (user_id, day_of_week, start_time, end_time, is_active)
                VALUES (%s, %s, %s, %s, TRUE)
                ON CONFLICT (user_id, day_of_week) DO UPDATE 
                SET start_time = EXCLUDED.start_time,
                    end_time = EXCLUDED.end_time,
                    is_active = TRUE,
                    updated_at = CURRENT_TIMESTAMP
            """, (user_id, day_of_week, start_time, end_time))

            conn.commit()
            log_info(f"Working hours set for {master_name} on day {day_of_week}: {start_time}-{end_time}", "schedule")
            return True

        except Exception as e:
            log_error(f"Error setting working hours: {e}", "schedule")
            conn.rollback()
            return False
        finally:
            conn.close()

    def get_working_hours(self, master_name: str) -> List[Dict]:
        """Получить рабочие часы мастера на всю неделю"""
        user_id = self._get_user_id(master_name)
        if not user_id:
            return []

        conn = get_db_connection()
        c = conn.cursor()

        try:
            c.execute("""
                SELECT day_of_week, start_time, end_time, is_active
                FROM user_schedule
                WHERE user_id = %s
                ORDER BY day_of_week
            """, (user_id,))

            days = ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота", "Воскресенье"]
            
            # Инициализируем пустым расписанием
            schedule_map = {}
            for i in range(7):
                schedule_map[i] = {
                    "day_of_week": i,
                    "day_name": days[i],
                    "start_time": None,
                    "end_time": None,
                    "is_active": False
                }

            for row in c.fetchall():
                day_idx = row[0]
                schedule_map[day_idx] = {
                    "day_of_week": day_idx,
                    "day_name": days[day_idx],
                    "start_time": row[1],
                    "end_time": row[2],
                    "is_active": bool(row[3])
                }

            return list(schedule_map.values())

        except Exception as e:
            log_error(f"Error getting working hours: {e}", "schedule")
            return []
        finally:
            conn.close()

    def add_time_off(
        self,
        master_name: str,
        start_date: str,
        end_date: str,
        time_off_type: str = "vacation",
        reason: Optional[str] = None
    ) -> bool:
        """
        Добавить выходной/отпуск
        """
        user_id = self._get_user_id(master_name)
        if not user_id:
            return False

        conn = get_db_connection()
        c = conn.cursor()

        try:
            # Преобразуем даты в datetime (начало дня и конец дня)
            start_dt = f"{start_date} 00:00:00"
            end_dt = f"{end_date} 23:59:59"

            c.execute("""
                INSERT INTO user_time_off
                (user_id, start_date, end_date, reason)
                VALUES (%s, %s, %s, %s)
            """, (user_id, start_dt, end_dt, reason))

            conn.commit()
            log_info(f"Time off added for {master_name}: {start_date} to {end_date}", "schedule")
            return True

        except Exception as e:
            log_error(f"Error adding time off: {e}", "schedule")
            conn.rollback()
            return False
        finally:
            conn.close()

    def get_time_off(self, master_name: str, start_date: Optional[str] = None, end_date: Optional[str] = None) -> List[Dict]:
        """
        Получить выходные/отпуска мастера
        """
        user_id = self._get_user_id(master_name)
        if not user_id:
            return []

        conn = get_db_connection()
        c = conn.cursor()

        try:
            query = """
                SELECT id, start_date, end_date, reason
                FROM user_time_off
                WHERE user_id = %s
            """
            params = [user_id]

            if start_date:
                query += " AND end_date >= %s"
                params.append(f"{start_date} 00:00:00")
            
            if end_date:
                query += " AND start_date <= %s"
                params.append(f"{end_date} 23:59:59")

            query += " ORDER BY start_date"

            c.execute(query, tuple(params))

            time_offs = []
            for row in c.fetchall():
                # Извлекаем даты из datetime
                start_dt = row[1].split(' ')[0] if row[1] else ''
                end_dt = row[2].split(' ')[0] if row[2] else ''
                
                time_offs.append({
                    "id": row[0],
                    "start_date": start_dt,
                    "end_date": end_dt,
                    "reason": row[3] if len(row) > 3 else None
                })

            return time_offs

        except Exception as e:
            log_error(f"Error getting time off: {e}", "schedule")
            return []
        finally:
            conn.close()

    def remove_time_off(self, time_off_id: int) -> bool:
        """Удалить выходной/отпуск"""
        conn = get_db_connection()
        c = conn.cursor()

        try:
            c.execute("DELETE FROM user_time_off WHERE id = %s", (time_off_id,))
            conn.commit()
            log_info(f"Time off {time_off_id} removed", "schedule")
            return True

        except Exception as e:
            log_error(f"Error removing time off: {e}", "schedule")
            conn.rollback()
            return False
        finally:
            conn.close()

    def is_master_available(self, master_name: str, date: str, time_str: str) -> bool:
        """
        Проверить, доступен ли мастер в указанное время
        """
        user_id = self._get_user_id(master_name)
        if not user_id:
            return False

        conn = get_db_connection()
        c = conn.cursor()

        try:
            # Проверяем день недели
            dt = datetime.strptime(date, '%Y-%m-%d')
            day_of_week = dt.weekday()

            # 1. Проверка праздников салона
            c.execute("""
                SELECT is_closed, master_exceptions 
                FROM salon_holidays 
                WHERE date = %s
            """, (date,))
            holiday = c.fetchone()
            if holiday:
                is_closed, master_exceptions_json = holiday
                if is_closed:
                    import json
                    try:
                        exceptions = json.loads(master_exceptions_json) if master_exceptions_json else []
                    except:
                        exceptions = []
                    
                    if user_id not in exceptions:
                        return False # Салон закрыт и мастер не в исключениях

            # Проверяем рабочие часы
            c.execute("""
                SELECT start_time, end_time
                FROM user_schedule
                WHERE user_id = %s AND day_of_week = %s AND is_active = TRUE
            """, (user_id, day_of_week))

            schedule = c.fetchone()
            if not schedule:
                return False  # Не работает в этот день

            start_time, end_time = schedule

            # Если время не установлено (выходной), мастер недоступен
            if not start_time or not end_time:
                return False

            # Проверяем, попадает ли время в рабочие часы
            if not (start_time <= time_str < end_time):
                return False

            # Проверяем отпуска/выходные
            check_dt = f"{date} {time_str}"
            c.execute("""
                SELECT COUNT(*)
                FROM user_time_off
                WHERE user_id = %s
                AND %s BETWEEN start_date AND end_date
            """, (user_id, check_dt))

            if c.fetchone()[0] > 0:
                return False  # В отпуске/выходной

            # Проверяем, не занято ли время записью
            # NOTE: bookings table uses 'master' (name) not employee_id currently
            # We should eventually migrate bookings to use employee_id
            datetime_str = f"{date} {time_str}"
            c.execute("""
                SELECT COUNT(*)
                FROM bookings
                WHERE master = %s
                AND datetime = %s
                AND status != 'cancelled'
            """, (master_name, datetime_str))

            if c.fetchone()[0] > 0:
                return False  # Уже есть запись

            return True

        except Exception as e:
            log_error(f"Error checking availability: {e}", "schedule")
            return False
        finally:
            conn.close()

    def get_available_slots(
        self,
        master_name: str,
        date: str,
        duration_minutes: int = 60,
        return_metadata: bool = False
    ) -> List[Any]:
        """
        Получить все доступные слоты на день
        """
        user_id = self._get_user_id(master_name)
        if not user_id:
            return []

        conn = get_db_connection()
        c = conn.cursor()

        try:
            # Парсим дату
            dt = datetime.strptime(date, '%Y-%m-%d')
            day_of_week = dt.weekday()

            # 1. Проверка праздников салона
            c.execute("""
                SELECT is_closed, master_exceptions 
                FROM salon_holidays 
                WHERE date = %s
            """, (date,))
            holiday = c.fetchone()
            if holiday:
                is_closed, master_exceptions_json = holiday
                if is_closed:
                    import json
                    try:
                        exceptions = json.loads(master_exceptions_json) if master_exceptions_json else []
                    except:
                        exceptions = []
                    
                    if user_id not in exceptions:
                        log_info(f"Salon is closed on {date} (Holiday). {master_name} is not an exception.", "schedule")
                        return []

            # Получаем рабочие часы на этот день
            c.execute("""
                SELECT start_time, end_time, is_active
                FROM user_schedule
                WHERE user_id = %s AND day_of_week = %s
            """, (user_id, day_of_week))

            schedule_row = c.fetchone()
            
            if not schedule_row:
                # No specific schedule for this day -> Use salon defaults
                from db.settings import get_salon_settings
                settings = get_salon_settings()
                
                # Check if it's weekend (Sat=5, Sun=6)
                if day_of_week >= 5:
                    hours_str = settings.get('hours_weekends', DEFAULT_HOURS_WEEKENDS)
                else:
                    hours_str = settings.get('hours_weekdays', DEFAULT_HOURS_WEEKDAYS)
                
                try:
                    parts = hours_str.split('-')
                    start_time_str = parts[0].strip()
                    end_time_str = parts[1].strip()
                except:
                    start_time_str = DEFAULT_HOURS_START
                    end_time_str = DEFAULT_HOURS_END
            else:
                start_time_str, end_time_str, is_active = schedule_row
                if not is_active or not start_time_str or not end_time_str:
                    return []

            # ✅ Parse hours and minutes for optimization logic (handle HH:MM and HH:MM:SS)
            try:
                if not start_time_str or not end_time_str:
                    # Fallback if somehow empty but reached here
                    from core.config import DEFAULT_HOURS_START, DEFAULT_HOURS_END
                    start_time_str = start_time_str or DEFAULT_HOURS_START
                    end_time_str = end_time_str or DEFAULT_HOURS_END
                
                start_parts = start_time_str.split(':')
                start_hour, start_minute = int(start_parts[0]), int(start_parts[1])
                end_parts = end_time_str.split(':')
                end_hour, end_minute = int(end_parts[0]), int(end_parts[1])
            except (ValueError, AttributeError, IndexError):
                from core.config import DEFAULT_HOURS_START, DEFAULT_HOURS_END
                try:
                    start_parts = DEFAULT_HOURS_START.split(':')
                    start_hour, start_minute = int(start_parts[0]), int(start_parts[1])
                    end_parts = DEFAULT_HOURS_END.split(':')
                    end_hour, end_minute = int(end_parts[0]), int(end_parts[1])
                except:
                    start_hour, start_minute = 10, 30
                    end_hour, end_minute = 21, 0

            # 🛠️ LUNCH BREAK LOGIC (Dynamic from Settings)
            from db.settings import get_salon_settings
            settings = get_salon_settings()
            
            lunch_start = settings.get('lunch_start')
            lunch_end = settings.get('lunch_end')
            
            # Проверяем отпуска (на весь день или часть)
            day_start = f"{date} 00:00:00"
            day_end = f"{date} 23:59:59"
            
            c.execute("""
                SELECT start_date, end_date
                FROM user_time_off
                WHERE user_id = %s
                AND (
                    (start_date BETWEEN %s AND %s) OR
                    (end_date BETWEEN %s AND %s) OR
                    (start_date <= %s AND end_date >= %s)
                )
            """, (user_id, day_start, day_end, day_start, day_end, day_start, day_end))

            unavailability = c.fetchall()
            
            # Добавляем обед только если он корректно заполнен (не пустой и не прочерк)
            if lunch_start and lunch_end and lunch_start not in ['-', ''] and lunch_end not in ['-', '']:
                try:
                    # Простейшая валидация формата (HH:MM)
                    if ':' in lunch_start and ':' in lunch_end:
                        lunch_start_dt = f"{date} {lunch_start[:5]}:00"
                        lunch_end_dt = f"{date} {lunch_end[:5]}:00"
                        unavailability.append((lunch_start_dt, lunch_end_dt))
                except Exception as e:
                    log_warning(f"⚠️ Invalid lunch format: {lunch_start}-{lunch_end}: {e}", "schedule")
            
            # Если есть перекрытие на весь рабочий день - возвращаем пусто
            # Для простоты, если есть любое отсутствие в этот день, нужно проверять слоты детально
            
            # ✅ Initialize variables for optimization logic
            booked_times = set()
            held_times = set()
            
            # Fetch booked times (start times) for simple check
            c.execute("""
                SELECT TO_CHAR(datetime::timestamp, 'HH24:MI') FROM bookings 
                WHERE master = %s AND DATE(datetime::timestamp) = %s AND status != 'cancelled'
            """, (master_name, date))
            booked_times = {r[0] for r in c.fetchall()}
            
            # Fetch held slots (drafts)
            c.execute("""
                SELECT TO_CHAR(datetime::timestamp, 'HH24:MI') FROM booking_drafts 
                WHERE master = %s AND expires_at > NOW()
            """, (master_name,))
            held_times = {r[0] for r in c.fetchall()}

            # Setup time loop variables
            tz = ZoneInfo(get_salon_timezone())
            current_dt = datetime.combine(dt.date(), dt_time(start_hour, start_minute), tzinfo=tz)
            end_working_dt = datetime.combine(dt.date(), dt_time(end_hour, end_minute), tzinfo=tz)
            
            is_today = date == get_current_time().strftime('%Y-%m-%d')
            min_booking_time = get_current_time() + timedelta(minutes=30)

            # ✅ 5. Smart Slot Logic (Optimization)
            # Find gap boundaries (start/end of shift, start/end of bookings)
            boundaries = set()
            
            # Start/End of shift are boundaries
            boundaries.add(start_hour * 60 + start_minute)
            
            # End of shift is a boundary for the END of a slot
            shift_end_minutes = end_hour * 60 + end_minute
            
            # Bookings are boundaries
            for b_time in booked_times:
                # Handle both HH:MM and HH:MM:SS formats
                b_parts = b_time.split(':')
                th, tm = int(b_parts[0]), int(b_parts[1])
                b_minutes = th * 60 + tm
                # Start of a booking is a boundary (slot should END here)
                # End of a booking is a boundary (slot should START here)
                # Wait, booked_times is just START times of bookings.
                # We need duration of bookings to know end times.
                # Assuming generic 60 min or checking DB? 
                # Current logic just checks explicit overlap.
                # Ideally we need end times of bookings.
                # Let's use the explicit query for bookings again or adjust?
                # The existing `booked_times` only has HH:MM strings of starts.
                pass
            
            # Re-query bookings with end times for smart logic?
            # Or simplified: Most bookings are same duration? No.
            # Let's do a more robust fetch of bookings earlier or just add a separate query for boundaries if performance allows
            # Actually, `c.execute` at line 412 only selected `datetime`.
            # Let's fetch duration too.
            
            c.execute("""
                SELECT b.datetime, s.duration
                FROM bookings b
                LEFT JOIN services s ON b.service_name = s.name
                WHERE UPPER(b.master) = UPPER(%s)
                AND DATE(b.datetime::timestamp) = %s
                AND b.status != 'cancelled'
            """, (master_name, date))
            
            booking_boundaries_start = set() # Times adjacent to end of a booking (Slot can start)
            booking_boundaries_end = set()   # Times adjacent to start of a booking (Slot can end)
            
            rows = c.fetchall()
            for row in rows:
                dt_val, b_dur = row
                if not b_dur: b_dur = 60 # Default
                
                if isinstance(dt_val, str):
                    # Parse
                    dt_parsed = datetime.strptime(dt_val, "%Y-%m-%d %H:%M:%S") if ' ' in dt_val else datetime.strptime(dt_val, "%Y-%m-%dT%H:%M:%S")
                else:
                    dt_parsed = dt_val
                
                # Start of booking -> Slot closest to this should END at this time
                b_start_min = dt_parsed.hour * 60 + dt_parsed.minute
                booking_boundaries_end.add(b_start_min)
                
                # End of booking -> Slot closest to this should START at this time
                b_end_dt = dt_parsed + timedelta(minutes=int(b_dur))
                b_end_min = b_end_dt.hour * 60 + b_end_dt.minute
                booking_boundaries_start.add(b_end_min)
            
            # Also add Shift Start and End
            shift_start_minutes = start_hour * 60 + start_minute
            
            # Logic:
            # Slot is optimal if:
            # 1. Slot START matches Shift START
            # 2. Slot START matches any Booking END
            # 3. Slot END matches any Booking START
            # 4. Slot END matches Shift END

            smart_slots = []
            
            while current_dt < end_working_dt:
                time_str = current_dt.strftime('%H:%M')
                slot_end_dt = current_dt + timedelta(minutes=duration_minutes)
                
                # 0. Filter past times
                if is_today and current_dt < min_booking_time:
                    current_dt += timedelta(minutes=30)
                    continue
                
                # 1. Check fitting
                if slot_end_dt > end_working_dt:
                    break
                
                # 2. Booked check
                if time_str in booked_times: # booked_times set might be incomplete if we rely on it, but we kept lines 412 logic conceptually
                    current_dt += timedelta(minutes=30)
                    continue

                # 2.1 Check Holds
                if time_str in held_times:
                    current_dt += timedelta(minutes=30)
                    continue
                    
                # 3. Check Unavailability
                current_dt_str = current_dt.strftime('%Y-%m-%d %H:%M:%S')
                is_unavailable = False
                for u_start, u_end in unavailability:
                    if u_start <= current_dt_str < u_end:
                         is_unavailable = True
                         break
                
                if is_unavailable:
                    current_dt += timedelta(minutes=30)
                    continue

                # 4. Is Optimal?
                current_minutes = current_dt.hour * 60 + current_dt.minute
                slot_end_minutes = slot_end_dt.hour * 60 + slot_end_dt.minute
                
                is_optimal = False
                
                # Matches Shift Start?
                if current_minutes == shift_start_minutes:
                    is_optimal = True
                
                # Matches Shift End?
                if slot_end_minutes == shift_end_minutes:
                    is_optimal = True
                    
                # Matches Booking End? (Slot starts right after a booking)
                if current_minutes in booking_boundaries_start:
                    is_optimal = True
                    
                # Matches Booking Start? (Slot ends right before a booking)
                if slot_end_minutes in booking_boundaries_end:
                    is_optimal = True

                if return_metadata:
                    smart_slots.append({
                        "time": time_str,
                        "is_optimal": is_optimal
                    })
                else:
                    smart_slots.append(time_str)

                current_dt += timedelta(minutes=30)

            return smart_slots

        except Exception as e:
            log_error(f"Error getting available slots: {e}", "schedule")
            return []
        finally:
            conn.close()

    def get_all_masters_availability(self, date: str, duration_minutes: int = 60, return_metadata: bool = False) -> Dict[str, List[Any]]:
        """Получить доступность всех мастеров на день"""
        conn = get_db_connection()
        c = conn.cursor()

        try:
            # Получаем мастеров для бронирования:
            # - is_service_provider = TRUE
            # - role='employee' ИЛИ secondary_role='employee' (если колонка существует)
            # Check if secondary_role column exists
            c.execute("""
                SELECT COUNT(*) FROM information_schema.columns
                WHERE table_name = 'users' AND column_name = 'secondary_role'
            """)
            has_secondary_role = c.fetchone()[0] > 0

            if has_secondary_role:
                c.execute("""
                    SELECT DISTINCT u.full_name
                    FROM users u
                    WHERE u.is_active = TRUE
                      AND u.is_service_provider = TRUE
                      AND (u.role = 'employee' OR u.secondary_role = 'employee')
                """)
            else:
                c.execute("""
                    SELECT DISTINCT u.full_name
                    FROM users u
                    WHERE u.is_active = TRUE
                      AND u.is_service_provider = TRUE
                      AND u.role = 'employee'
                """)

            active_masters = [row[0] for row in c.fetchall()]
            
            print(f"   👥 Found {len(active_masters)} active masters: {[m for m in active_masters[:5]]}...")

            # Для каждого активного мастера получаем слоты
            availability = {}
            for master_name in active_masters:
                slots = self.get_available_slots(master_name, date, duration_minutes=duration_minutes, return_metadata=return_metadata)
                if slots:
                    availability[master_name] = slots
                    print(f"   📅 {master_name}: {len(slots)} slots (first: {slots[0] if slots else 'none'})")
            
            print(f"   ✅ Total masters with availability: {len(availability)}")
            return availability

        except Exception as e:
            log_error(f"Error getting all masters availability: {e}", "schedule")
            import traceback
            print(f"   ❌ Traceback: {traceback.format_exc()}")
            return {}
        finally:
            conn.close()

    def get_available_dates(
        self,
        master_name: Optional[str],
        year: int,
        month: int,
        duration_minutes: int = 60
    ) -> List[str]:
        """
        Получить список дат с доступными слотами в указанном месяце.
        Оптимизированная версия с bulk-запросами.
        Если master_name is None, проверяет глобальную доступность (любой мастер).
        """
        import calendar
        conn = get_db_connection()
        c = conn.cursor()

        try:
            # 1. Определяем диапазон дат
            num_days = calendar.monthrange(year, month)[1]
            start_date_str = f"{year}-{month:02d}-01"
            end_date_str = f"{year}-{month:02d}-{num_days}"
            
            today = get_current_time().date()
            
            available_dates = []

            # 2. Получаем список мастеров для проверки
            masters_to_check = []
            if master_name and master_name.lower() != 'any':
                user_id = self._get_user_id(master_name)
                if user_id:
                    masters_to_check.append({"id": user_id, "name": master_name})
            else:
                # Global Availability: мастера с role='employee' или secondary_role='employee'
                # Check if secondary_role column exists
                c.execute("""
                    SELECT COUNT(*) FROM information_schema.columns
                    WHERE table_name = 'users' AND column_name = 'secondary_role'
                """)
                has_secondary_role = c.fetchone()[0] > 0

                if has_secondary_role:
                    c.execute("""
                        SELECT id, full_name FROM users
                        WHERE is_service_provider = TRUE AND is_active = TRUE
                        AND (role = 'employee' OR secondary_role = 'employee')
                    """)
                else:
                    c.execute("""
                        SELECT id, full_name FROM users
                        WHERE is_service_provider = TRUE AND is_active = TRUE
                        AND role = 'employee'
                    """)
                for row in c.fetchall():
                    masters_to_check.append({"id": row[0], "name": row[1]})

            if not masters_to_check:
                return []
            
            master_ids = [m["id"] for m in masters_to_check]

            # 3. BULK FETCH: Расписания (Schedules)
            # Fetch schedules for all relevant masters
            c.execute(f"""
                SELECT user_id, day_of_week, start_time, end_time, is_active
                FROM user_schedule
                WHERE user_id = ANY(%s)
            """, (master_ids,))
            
            schedules_map = {} # {user_id: {day_of_week: (start, end, is_active)}}
            for row in c.fetchall():
                uid, dow, start, end, active = row
                if uid not in schedules_map:
                    schedules_map[uid] = {}
                schedules_map[uid][dow] = (start, end, active)
                
            # Fallback to default schedule if missing? 
            # Current logic in `get_available_slots` falls back to settings. We should replicate that or fetch settings once.
            from db.settings import get_salon_settings
            settings = get_salon_settings()
            
            # 4. BULK FETCH: Выходные (Time Offs)
            c.execute(f"""
                SELECT user_id, start_date, end_date
                FROM user_time_off
                WHERE user_id = ANY(%s)
                AND (start_date <= %s AND end_date >= %s)
            """, (master_ids, f"{end_date_str} 23:59:59", f"{start_date_str} 00:00:00"))
            
            time_offs_map = {} # {user_id: [(start_dt, end_dt)]}
            for row in c.fetchall():
                uid, start, end = row
                if uid not in time_offs_map:
                    time_offs_map[uid] = []
                start_str = str(start).replace('T', ' ')
                end_str = str(end).replace('T', ' ')
                time_offs_map[uid].append((start_str, end_str))

            # 5. BULK FETCH: Бронирования (Bookings)
            c.execute(f"""
                SELECT master, datetime
                FROM bookings
                WHERE datetime BETWEEN %s AND %s
                AND status != 'cancelled'
            """, (f"{start_date_str} 00:00:00", f"{end_date_str} 23:59:59"))
            
            bookings_map = {} # {master_name_lower: {date_str: [time_str]}}
            for row in c.fetchall():
                m_name, dt_val = row
                if not m_name: continue
                m_key = m_name.strip().lower()
                
                # Parse datetime
                if isinstance(dt_val, str):
                    dt_str = dt_val.replace('T', ' ')
                else:
                    dt_str = dt_val.strftime("%Y-%m-%d %H:%M:%S")
                
                parts = dt_str.split(' ')
                date_part = parts[0]
                time_part = parts[1][:5] if len(parts) > 1 else "00:00"
                
                if m_key not in bookings_map:
                    bookings_map[m_key] = {}
                if date_part not in bookings_map[m_key]:
                    bookings_map[m_key][date_part] = set()
                bookings_map[m_key][date_part].add(time_part)

            # 6. Iterate Days and Check Availability using In-Memory Data
            from datetime import timedelta
            
            for day in range(1, num_days + 1):
                date_obj = datetime(year, month, day).date()
                if date_obj < today:
                    continue
                
                date_str = date_obj.strftime('%Y-%m-%d')
                day_of_week = date_obj.weekday()
                
                day_is_available = False
                
                # Check if ANY master is available on this day
                for master in masters_to_check:
                    uid = master["id"]
                    m_name = master["name"]
                    
                    # A. Check Schedule
                    master_schedule = schedules_map.get(uid, {})
                    if day_of_week in master_schedule:
                        start_time, end_time, is_active = master_schedule[day_of_week]
                        if not is_active:
                            continue
                    else:
                        # Day missing in user schedule -> Use salon defaults
                        if day_of_week >= 5: # Sat, Sun
                            hours_str = settings.get('hours_weekends', DEFAULT_HOURS_WEEKENDS)
                        else:
                            hours_str = settings.get('hours_weekdays', DEFAULT_HOURS_WEEKDAYS)
                            
                        try:
                            parts = hours_str.split('-')
                            start_time = parts[0].strip()
                            end_time = parts[1].strip()
                        except:
                            start_time = DEFAULT_HOURS_START
                            end_time = DEFAULT_HOURS_END

                    if not start_time or not end_time:
                        continue

                    # B. Check Time Off (Full Day or blocking)
                    # Simplified: If any Full Day time off covers this date -> Skip
                    # Detail: If time off is partial, we need slot check.
                    # For optimization, let's assume if "Time Off" covers working hours, skip.
                    
                    is_on_leave = False
                    user_offs = time_offs_map.get(uid, [])
                    
                    # Lunch logic
                    lunch_start = settings.get('lunch_start', DEFAULT_LUNCH_START)
                    lunch_end = settings.get('lunch_end', DEFAULT_LUNCH_END)
                    lunch_start_full = f"{date_str} {lunch_start}:00"
                    lunch_end_full = f"{date_str} {lunch_end}:00"
                    
                    # Prepare unavailability intervals for this day
                    unavailability_intervals = [(lunch_start_full, lunch_end_full)]
                    
                    start_dt_full = f"{date_str} {start_time}:00"
                    end_dt_full = f"{date_str} {end_time}:00"

                    for off_start, off_end in user_offs:
                        # Check if fully covers the day's working hours
                        if off_start <= start_dt_full and off_end >= end_dt_full:
                            is_on_leave = True
                            break
                        # Collect partials
                        unavailability_intervals.append((off_start, off_end))
                    
                    if is_on_leave:
                        continue

                    # C. Check Bookings
                    m_key = m_name.strip().lower()
                    day_bookings = bookings_map.get(m_key, {}).get(date_str, set())
                    
                    # D. Slot Generation (Fast In-Memory)
                    # We only need to find ONE available slot
                    
                    # Parse times (handle both HH:MM and HH:MM:SS formats)
                    s_parts = start_time.split(':')
                    s_h, s_m = int(s_parts[0]), int(s_parts[1])
                    e_parts = end_time.split(':')
                    e_h, e_m = int(e_parts[0]), int(e_parts[1])
                    
                    current_dt = datetime.combine(date_obj, dt_time(s_h, s_m))
                    work_end_dt = datetime.combine(date_obj, dt_time(e_h, e_m))
                    
                    # Same day advance buffer
                    now_with_tz = get_current_time()
                    # Make it naive for comparison if date_obj/current_dt is naive
                    min_booking_time = now_with_tz.replace(tzinfo=None)
                    
                    if date_obj == today:
                         min_booking_time += timedelta(minutes=30)

                    has_slot = False
                    while current_dt + timedelta(minutes=duration_minutes) <= work_end_dt:
                        slot_end_dt = current_dt + timedelta(minutes=duration_minutes)
                        time_str = current_dt.strftime('%H:%M')
                        
                        # 1. Past check
                        if date_obj == today and current_dt < min_booking_time:
                            current_dt += timedelta(minutes=30)
                            continue
                            
                        # 2. Booked check
                        if time_str in day_bookings:
                            current_dt += timedelta(minutes=30)
                            continue
                            
                        # 3. Unavailability interval check
                        current_dt_str = current_dt.strftime('%Y-%m-%d %H:%M:%S')
                        is_unavailable_slot = False
                        for u_start, u_end in unavailability_intervals:
                             if u_start <= current_dt_str < u_end:
                                 is_unavailable_slot = True
                                 break
                        
                        if is_unavailable_slot:
                            current_dt += timedelta(minutes=30)
                            continue
                            
                        # Found one!
                        has_slot = True
                        break
                    
                    if has_slot:
                        day_is_available = True
                        break # Optimization: If any master available, day is available (Global)
                
                # If checking specific master, look at loop result (which ran once)
                # If checking global, loop breaks on first avail master
                if day_is_available:
                    available_dates.append(date_str)
                    
            return available_dates

        except Exception as e:
            log_error(f"Error getting available dates: {e}", "schedule")
            return []
        finally:
            conn.close()

