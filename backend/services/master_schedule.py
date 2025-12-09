"""
Управление расписанием мастеров
"""
from datetime import datetime, timedelta, time as dt_time
from typing import Dict, List, Any, Optional
from core.config import DATABASE_NAME
from db.connection import get_db_connection
from utils.logger import log_info, log_error
from utils.datetime_utils import get_current_time
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
            # Проверяем, есть ли уже запись
            c.execute("""
                SELECT id FROM user_schedule
                WHERE user_id = %s AND day_of_week = %s
            """, (user_id, day_of_week))

            existing = c.fetchone()

            if existing:
                # Обновляем
                c.execute("""
                    UPDATE user_schedule
                    SET start_time = %s, end_time = %s, is_active = TRUE
                    WHERE user_id = %s AND day_of_week = %s
                """, (start_time, end_time, user_id, day_of_week))
            else:
                # Создаем новую
                c.execute("""
                    INSERT INTO user_schedule
                    (user_id, day_of_week, start_time, end_time, is_active)
                    VALUES (%s, %s, %s, %s, TRUE)
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
        duration_minutes: int = 60
    ) -> List[str]:
        """
        Получить все доступные слоты на день
        """
        user_id = self._get_user_id(master_name)
        if not user_id:
            return []

        conn = get_db_connection()
        c = conn.cursor()

        try:
            # Получаем рабочие часы на этот день
            dt = datetime.strptime(date, '%Y-%m-%d')
            day_of_week = dt.weekday()

            c.execute("""
                SELECT start_time, end_time
                FROM user_schedule
                WHERE user_id = %s AND day_of_week = %s AND is_active = TRUE
            """, (user_id, day_of_week))

            schedule = c.fetchone()
            
            # ✅ DYNAMIC SCHEDULE LOGIC
            # If no schedule found in DB, use salon defaults from settings
            if not schedule:
                from db.settings import get_salon_settings
                settings = get_salon_settings()
                
                # Try to get specific weekday/weekend hours first, then fall back to generic
                # TODO: Implement weekend specific check if needed
                hours_str = settings.get('hours_weekdays', DEFAULT_HOURS_WEEKDAYS)  # ✅ Используем константу
                
                # Parse "10:30 - 21:30"
                try:
                    parts = hours_str.split('-')
                    start_time_str = parts[0].strip()
                    end_time_str = parts[1].strip()
                except:
                    # Fallback if parsing fails (should rarely happen with defaults)
                    start_time_str = DEFAULT_HOURS_START
                    end_time_str = DEFAULT_HOURS_END
            else:
                start_time_str, end_time_str = schedule
                # Если время не установлено (выходной), слотов нет
                if not start_time_str or not end_time_str:
                    return []

            # 🛠️ LUNCH BREAK LOGIC (Dynamic from Settings)
            from db.settings import get_salon_settings
            settings = get_salon_settings()
            
            lunch_start = settings.get('lunch_start', DEFAULT_LUNCH_START)  # ✅ Используем константу
            lunch_end = settings.get('lunch_end', DEFAULT_LUNCH_END)  # ✅ Используем константу
            
            # Проверяем отпуска (на весь день или часть)
            day_start = f"{date} 00:00:00"
            day_end = f"{date} 23:59:59"
            
            # Добавляем обед как "недоступное время" на этот день
            lunch_start_dt = f"{date} {lunch_start}:00"
            lunch_end_dt = f"{date} {lunch_end}:00"
            
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
            
            # Add lunch to unavailable intervals
            unavailability.append((lunch_start_dt, lunch_end_dt))
            
            # Если есть перекрытие на весь рабочий день - возвращаем пусто
            # Для простоты, если есть любое отсутствие в этот день, нужно проверять слоты детально
            
            # Получаем все занятые слоты из bookings
            # ✅ Case-insensitive поиск по имени мастера
            c.execute("""
                SELECT datetime
                FROM bookings
                WHERE UPPER(master) = UPPER(%s)
                AND DATE(datetime) = %s
                AND status != 'cancelled'
            """, (master_name, date))

            booked_times = set()
            for row in c.fetchall():
                datetime_str = row[0]
                if 'T' in datetime_str:
                    time_part = datetime_str.split('T')[1]
                else:
                    time_part = datetime_str.split(' ')[1]
                booked_times.add(time_part[:5])  # Только HH:MM

            # Генерируем все возможные слоты
            start_hour, start_minute = map(int, start_time_str.split(':'))
            end_hour, end_minute = map(int, end_time_str.split(':'))

            start_dt = datetime.combine(dt.date(), dt_time(start_hour, start_minute))
            end_dt = datetime.combine(dt.date(), dt_time(end_hour, end_minute))

            available_slots = []
            current_dt = start_dt
            
            # Get current time for filtering past slots (convert to naive for comparison)
            now = get_current_time().replace(tzinfo=None)
            is_today = dt.date() == now.date()
            
            # Minimum advance booking time for same-day appointments (2 hours)
            # This gives clients enough time to prepare and travel to the salon
            min_advance_hours = 2
            min_booking_time = now + timedelta(hours=min_advance_hours) if is_today else now

            while current_dt < end_dt:
                time_str = current_dt.strftime('%H:%M')
                slot_end_dt = current_dt + timedelta(minutes=duration_minutes)
                
                # 0. Filter past times and slots too close for same-day booking
                if is_today and current_dt < min_booking_time:
                    current_dt += timedelta(minutes=30)  # Increment by 30 minutes
                    continue
                
                # 1. Check if procedure can finish before closing time
                if slot_end_dt > end_dt:
                    break  # No more slots can fit
                
                # 2. Проверка на занятость записью
                if time_str in booked_times:
                    current_dt += timedelta(minutes=30)  # Increment by 30 minutes
                    continue
                    
                # 3. Проверка на unavailability
                is_unavailable = False
                current_dt_str = current_dt.strftime('%Y-%m-%d %H:%M:%S')
                
                for un_start, un_end in unavailability:
                    if un_start <= current_dt_str < un_end:
                        is_unavailable = True
                        break
                
                if not is_unavailable:
                    available_slots.append(time_str)

                current_dt += timedelta(minutes=30)  # Increment by 30 minutes

            return available_slots

        except Exception as e:
            log_error(f"Error getting available slots: {e}", "schedule")
            return []
        finally:
            conn.close()

    def get_all_masters_availability(self, date: str) -> Dict[str, List[str]]:
        """Получить доступность всех мастеров на день"""
        conn = get_db_connection()
        c = conn.cursor()

        try:
            # ✅ ИСПРАВЛЕНО: Используем ту же логику что и get_available_time_slots
            # Получаем всех активных мастеров-провайдеров (исключая директоров)
            c.execute("""
                SELECT DISTINCT u.full_name
                FROM users u
                WHERE u.is_active = TRUE 
                  AND u.is_service_provider = TRUE
                  AND u.role NOT IN ('director', 'admin', 'manager')
            """)

            masters = [row[0] for row in c.fetchall()]
            
            print(f"   👥 Found {len(masters)} active masters: {[m for m in masters[:5]]}...")

            availability = {}
            for master in masters:
                slots = self.get_available_slots(master, date)
                if slots:  # ✅ Только добавляем если есть слоты
                    availability[master] = slots
                    print(f"   📅 {master}: {len(slots)} slots (first: {slots[0] if slots else 'none'})")

            print(f"   ✅ Total masters with availability: {len(availability)}")
            return availability

        except Exception as e:
            log_error(f"Error getting all masters availability: {e}", "schedule")
            import traceback
            print(f"   ❌ Traceback: {traceback.format_exc()}")
            return {}
        finally:
            conn.close()
