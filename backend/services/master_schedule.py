"""
Управление расписанием мастеров
"""
import sqlite3
from datetime import datetime, timedelta, time as dt_time
from typing import Dict, List, Any, Optional
from core.config import DATABASE_NAME
from utils.logger import log_info, log_error
from utils.datetime_utils import get_current_time


class MasterScheduleService:
    """Сервис управления расписанием мастеров"""

    def __init__(self):
        pass

    def _get_user_id(self, master_name: str) -> Optional[int]:
        """Получить ID пользователя по имени"""
        conn = sqlite3.connect(DATABASE_NAME)
        c = conn.cursor()
        try:
            c.execute("SELECT id FROM users WHERE full_name = ? AND is_service_provider = 1", (master_name,))
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

        conn = sqlite3.connect(DATABASE_NAME)
        c = conn.cursor()

        try:
            # Проверяем, есть ли уже запись
            c.execute("""
                SELECT id FROM user_schedule
                WHERE user_id = ? AND day_of_week = ?
            """, (user_id, day_of_week))

            existing = c.fetchone()

            if existing:
                # Обновляем
                c.execute("""
                    UPDATE user_schedule
                    SET start_time = ?, end_time = ?, is_active = 1
                    WHERE user_id = ? AND day_of_week = ?
                """, (start_time, end_time, user_id, day_of_week))
            else:
                # Создаем новую
                c.execute("""
                    INSERT INTO user_schedule
                    (user_id, day_of_week, start_time, end_time, is_active)
                    VALUES (?, ?, ?, ?, 1)
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

        conn = sqlite3.connect(DATABASE_NAME)
        c = conn.cursor()

        try:
            c.execute("""
                SELECT day_of_week, start_time, end_time, is_active
                FROM user_schedule
                WHERE user_id = ?
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

        conn = sqlite3.connect(DATABASE_NAME)
        c = conn.cursor()

        try:
            # Преобразуем даты в datetime (начало дня и конец дня)
            start_dt = f"{start_date} 00:00:00"
            end_dt = f"{end_date} 23:59:59"

            c.execute("""
                INSERT INTO user_time_off
                (user_id, start_date, end_date, reason)
                VALUES (?, ?, ?, ?)
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

        conn = sqlite3.connect(DATABASE_NAME)
        c = conn.cursor()

        try:
            query = """
                SELECT id, start_date, end_date, reason
                FROM user_time_off
                WHERE user_id = ?
            """
            params = [user_id]

            if start_date:
                query += " AND end_date >= ?"
                params.append(f"{start_date} 00:00:00")
            
            if end_date:
                query += " AND start_date <= ?"
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
        conn = sqlite3.connect(DATABASE_NAME)
        c = conn.cursor()

        try:
            c.execute("DELETE FROM user_time_off WHERE id = ?", (time_off_id,))
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

        conn = sqlite3.connect(DATABASE_NAME)
        c = conn.cursor()

        try:
            # Проверяем день недели
            dt = datetime.strptime(date, '%Y-%m-%d')
            day_of_week = dt.weekday()

            # Проверяем рабочие часы
            c.execute("""
                SELECT start_time, end_time
                FROM user_schedule
                WHERE user_id = ? AND day_of_week = ? AND is_active = 1
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
                WHERE user_id = ?
                AND ? BETWEEN start_date AND end_date
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
                WHERE master = ?
                AND datetime = ?
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

        conn = sqlite3.connect(DATABASE_NAME)
        c = conn.cursor()

        try:
            # Получаем рабочие часы на этот день
            dt = datetime.strptime(date, '%Y-%m-%d')
            day_of_week = dt.weekday()

            c.execute("""
                SELECT start_time, end_time
                FROM user_schedule
                WHERE user_id = ? AND day_of_week = ? AND is_active = 1
            """, (user_id, day_of_week))

            schedule = c.fetchone()
            if not schedule:
                return []

            start_time_str, end_time_str = schedule

            # Если время не установлено (выходной), слотов нет
            if not start_time_str or not end_time_str:
                return []

            # Проверяем отпуска (на весь день или часть)
            day_start = f"{date} 00:00:00"
            day_end = f"{date} 23:59:59"
            
            c.execute("""
                SELECT start_date, end_date
                FROM user_time_off
                WHERE user_id = ?
                AND (
                    (start_date BETWEEN ? AND ?) OR
                    (end_date BETWEEN ? AND ?) OR
                    (start_date <= ? AND end_date >= ?)
                )
            """, (user_id, day_start, day_end, day_start, day_end, day_start, day_end))

            unavailability = c.fetchall()
            
            # Если есть перекрытие на весь рабочий день - возвращаем пусто
            # Для простоты, если есть любое отсутствие в этот день, нужно проверять слоты детально
            
            # Получаем все занятые слоты из bookings
            # ✅ Case-insensitive поиск по имени мастера
            c.execute("""
                SELECT datetime
                FROM bookings
                WHERE UPPER(master) = UPPER(?)
                AND DATE(datetime) = ?
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
        conn = sqlite3.connect(DATABASE_NAME)
        c = conn.cursor()

        try:
            # Получаем всех мастеров из расписания
            c.execute("""
                SELECT DISTINCT u.full_name
                FROM user_schedule us
                JOIN users u ON us.user_id = u.id
                WHERE us.is_active = 1 AND u.is_service_provider = 1
            """)

            masters = [row[0] for row in c.fetchall()]

            availability = {}
            for master in masters:
                slots = self.get_available_slots(master, date)
                availability[master] = slots

            return availability

        except Exception as e:
            log_error(f"Error getting all masters availability: {e}", "schedule")
            return {}
        finally:
            conn.close()
