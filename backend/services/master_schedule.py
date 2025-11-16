"""
Управление расписанием мастеров

Работа с графиком работы, отпусками, доступными слотами
"""
import sqlite3
from datetime import datetime, timedelta, time as dt_time
from typing import Dict, List, Any, Optional
from core.config import DATABASE_NAME
from utils.logger import log_info, log_error


class MasterScheduleService:
    """Сервис управления расписанием мастеров"""

    def __init__(self):
        pass

    def set_working_hours(
        self,
        master_name: str,
        day_of_week: int,
        start_time: str,
        end_time: str
    ) -> bool:
        """
        Установить рабочие часы мастера на день недели

        Args:
            master_name: Имя мастера
            day_of_week: День недели (0=Пн, 6=Вс)
            start_time: Начало работы (HH:MM)
            end_time: Конец работы (HH:MM)

        Returns:
            bool: Успешность операции
        """
        conn = sqlite3.connect(DATABASE_NAME)
        c = conn.cursor()

        try:
            now = datetime.now().isoformat()

            # Проверяем, есть ли уже запись
            c.execute("""
                SELECT id FROM master_schedule
                WHERE master_name = ? AND day_of_week = ?
            """, (master_name, day_of_week))

            existing = c.fetchone()

            if existing:
                # Обновляем
                c.execute("""
                    UPDATE master_schedule
                    SET start_time = ?, end_time = ?, is_active = 1, updated_at = ?
                    WHERE master_name = ? AND day_of_week = ?
                """, (start_time, end_time, now, master_name, day_of_week))
            else:
                # Создаем новую
                c.execute("""
                    INSERT INTO master_schedule
                    (master_name, day_of_week, start_time, end_time, is_active, created_at, updated_at)
                    VALUES (?, ?, ?, ?, 1, ?, ?)
                """, (master_name, day_of_week, start_time, end_time, now, now))

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
        conn = sqlite3.connect(DATABASE_NAME)
        c = conn.cursor()

        try:
            c.execute("""
                SELECT day_of_week, start_time, end_time, is_active
                FROM master_schedule
                WHERE master_name = ?
                ORDER BY day_of_week
            """, (master_name,))

            days = ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота", "Воскресенье"]

            schedule = []
            for row in c.fetchall():
                schedule.append({
                    "day_of_week": row[0],
                    "day_name": days[row[0]],
                    "start_time": row[1],
                    "end_time": row[2],
                    "is_active": bool(row[3])
                })

            return schedule

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

        Args:
            master_name: Имя мастера
            start_date: Начало (YYYY-MM-DD)
            end_date: Конец (YYYY-MM-DD)
            time_off_type: Тип ('vacation', 'sick_leave', 'day_off')
            reason: Причина (опционально)

        Returns:
            bool: Успешность операции
        """
        conn = sqlite3.connect(DATABASE_NAME)
        c = conn.cursor()

        try:
            now = datetime.now().isoformat()

            c.execute("""
                INSERT INTO master_time_off
                (master_name, start_date, end_date, type, reason, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (master_name, start_date, end_date, time_off_type, reason, now, now))

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

        Args:
            master_name: Имя мастера
            start_date: Фильтр по начальной дате (опционально)
            end_date: Фильтр по конечной дате (опционально)
        """
        conn = sqlite3.connect(DATABASE_NAME)
        c = conn.cursor()

        try:
            if start_date and end_date:
                c.execute("""
                    SELECT id, start_date, end_date, type, reason
                    FROM master_time_off
                    WHERE master_name = ?
                    AND end_date >= ?
                    AND start_date <= ?
                    ORDER BY start_date
                """, (master_name, start_date, end_date))
            else:
                c.execute("""
                    SELECT id, start_date, end_date, type, reason
                    FROM master_time_off
                    WHERE master_name = ?
                    ORDER BY start_date
                """, (master_name,))

            time_offs = []
            for row in c.fetchall():
                time_offs.append({
                    "id": row[0],
                    "start_date": row[1],
                    "end_date": row[2],
                    "type": row[3],
                    "reason": row[4]
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
            c.execute("DELETE FROM master_time_off WHERE id = ?", (time_off_id,))
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

        Args:
            master_name: Имя мастера
            date: Дата (YYYY-MM-DD)
            time_str: Время (HH:MM)

        Returns:
            bool: True если доступен
        """
        conn = sqlite3.connect(DATABASE_NAME)
        c = conn.cursor()

        try:
            # Проверяем день недели
            dt = datetime.strptime(date, '%Y-%m-%d')
            day_of_week = dt.weekday()

            # Проверяем рабочие часы
            c.execute("""
                SELECT start_time, end_time
                FROM master_schedule
                WHERE master_name = ? AND day_of_week = ? AND is_active = 1
            """, (master_name, day_of_week))

            schedule = c.fetchone()
            if not schedule:
                return False  # Не работает в этот день

            start_time, end_time = schedule

            # Проверяем, попадает ли время в рабочие часы
            if not (start_time <= time_str < end_time):
                return False

            # Проверяем отпуска/выходные
            c.execute("""
                SELECT COUNT(*)
                FROM master_time_off
                WHERE master_name = ?
                AND ? BETWEEN start_date AND end_date
            """, (master_name, date))

            if c.fetchone()[0] > 0:
                return False  # В отпуске/выходной

            # Проверяем, не занято ли время записью
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

        Args:
            master_name: Имя мастера
            date: Дата (YYYY-MM-DD)
            duration_minutes: Длительность слота в минутах

        Returns:
            List[str]: Список доступных времен (HH:MM)
        """
        conn = sqlite3.connect(DATABASE_NAME)
        c = conn.cursor()

        try:
            # Получаем рабочие часы на этот день
            dt = datetime.strptime(date, '%Y-%m-%d')
            day_of_week = dt.weekday()

            c.execute("""
                SELECT start_time, end_time
                FROM master_schedule
                WHERE master_name = ? AND day_of_week = ? AND is_active = 1
            """, (master_name, day_of_week))

            schedule = c.fetchone()
            if not schedule:
                return []

            start_time_str, end_time_str = schedule

            # Проверяем отпуска
            c.execute("""
                SELECT COUNT(*)
                FROM master_time_off
                WHERE master_name = ?
                AND ? BETWEEN start_date AND end_date
            """, (master_name, date))

            if c.fetchone()[0] > 0:
                return []  # В отпуске

            # Получаем все занятые слоты
            c.execute("""
                SELECT datetime
                FROM bookings
                WHERE master = ?
                AND DATE(datetime) = ?
                AND status != 'cancelled'
            """, (master_name, date))

            booked_times = set()
            for row in c.fetchall():
                datetime_str = row[0]
                time_part = datetime_str.split(' ')[1]  # Получаем HH:MM:SS
                booked_times.add(time_part[:5])  # Только HH:MM

            # Генерируем все возможные слоты
            start_hour, start_minute = map(int, start_time_str.split(':'))
            end_hour, end_minute = map(int, end_time_str.split(':'))

            start_dt = datetime.combine(dt.date(), dt_time(start_hour, start_minute))
            end_dt = datetime.combine(dt.date(), dt_time(end_hour, end_minute))

            available_slots = []
            current_dt = start_dt

            while current_dt < end_dt:
                time_str = current_dt.strftime('%H:%M')

                if time_str not in booked_times:
                    available_slots.append(time_str)

                current_dt += timedelta(minutes=duration_minutes)

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
                SELECT DISTINCT master_name
                FROM master_schedule
                WHERE is_active = 1
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
