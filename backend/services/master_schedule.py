"""
Управление расписанием мастеров
"""
from datetime import datetime, timedelta, date as dt_date, time as dt_time
from zoneinfo import ZoneInfo
from typing import Dict, List, Any, Optional, Tuple
import json
import re
from db.connection import get_db_connection
from utils.logger import log_info, log_error
from utils.datetime_utils import get_current_time, get_salon_timezone
from core.config import (
    DEFAULT_HOURS_WEEKDAYS,
    DEFAULT_HOURS_WEEKENDS,
    DEFAULT_HOURS_START,
    DEFAULT_HOURS_END
)

class MasterScheduleService:
    """Сервис управления расписанием мастеров"""

    def __init__(self):
        self._column_cache: Dict[Tuple[str, str], bool] = {}

    def _has_table_column(self, table_name: str, column_name: str) -> bool:
        cache_key = (table_name, column_name)
        if cache_key in self._column_cache:
            return self._column_cache[cache_key]

        conn = get_db_connection()
        c = conn.cursor()
        try:
            c.execute(
                """
                SELECT 1
                FROM information_schema.columns
                WHERE table_name = %s AND column_name = %s
                LIMIT 1
                """,
                (table_name, column_name),
            )
            exists = bool(c.fetchone())
            self._column_cache[cache_key] = exists
            return exists
        finally:
            conn.close()

    def _get_master_aliases(self, user_record: Dict[str, Any], raw_identifier: Optional[str] = None) -> List[str]:
        aliases: List[str] = []
        for value in (
            user_record.get("full_name"),
            user_record.get("username"),
            user_record.get("nickname"),
            user_record.get("id"),
            raw_identifier,
        ):
            normalized = str(value or "").strip()
            if not normalized:
                continue
            if normalized in aliases:
                continue
            aliases.append(normalized)
        return aliases

    def _get_user_record(self, master_identifier: Any) -> Optional[Dict[str, Any]]:
        """Получить пользователя мастера по id/username/full_name/nickname."""
        if master_identifier is None:
            return None

        identifier = str(master_identifier).strip()
        if not identifier:
            return None

        conn = get_db_connection()
        c = conn.cursor()
        try:
            if identifier.isdigit():
                c.execute(
                    """
                    SELECT id, full_name, username, nickname
                    FROM users
                    WHERE id = %s
                      AND is_service_provider = TRUE
                      AND deleted_at IS NULL
                    LIMIT 1
                    """,
                    (int(identifier),),
                )
                row = c.fetchone()
                if row:
                    return {
                        "id": row[0],
                        "full_name": row[1],
                        "username": row[2],
                        "nickname": row[3],
                    }

            c.execute(
                """
                SELECT id, full_name, username, nickname
                FROM users
                WHERE is_service_provider = TRUE
                  AND deleted_at IS NULL
                  AND (
                    LOWER(full_name) = LOWER(%s)
                    OR LOWER(username) = LOWER(%s)
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
                (identifier, identifier, identifier, identifier, identifier),
            )
            row = c.fetchone()
            if not row:
                return None

            return {
                "id": row[0],
                "full_name": row[1],
                "username": row[2],
                "nickname": row[3],
            }
        finally:
            conn.close()

    def _get_user_id(self, master_name: str) -> Optional[int]:
        """Получить ID пользователя по идентификатору мастера."""
        user = self._get_user_record(master_name)
        return int(user["id"]) if user and user.get("id") is not None else None

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

    def _normalize_time_string(self, value: Any) -> Optional[str]:
        if value is None:
            return None

        if isinstance(value, dt_time):
            return value.strftime("%H:%M")

        raw = str(value).strip()
        if not raw:
            return None

        if "T" in raw:
            raw = raw.split("T")[-1]
        if " " in raw:
            raw = raw.split(" ")[-1]

        if ":" not in raw:
            return None

        parts = raw.split(":")
        try:
            hour = int(parts[0])
            minute = int(parts[1])
        except Exception:
            return None

        if hour < 0 or hour > 23 or minute < 0 or minute > 59:
            return None

        return f"{hour:02d}:{minute:02d}"

    def _parse_hours_range(self, hours_value: Any, fallback_start: str, fallback_end: str) -> Tuple[str, str]:
        if not isinstance(hours_value, str):
            return fallback_start, fallback_end

        parts = [part.strip() for part in hours_value.split("-")]
        if len(parts) != 2:
            return fallback_start, fallback_end

        start_time = self._normalize_time_string(parts[0]) or fallback_start
        end_time = self._normalize_time_string(parts[1]) or fallback_end
        return start_time, end_time

    def _safe_duration_minutes(self, raw_duration: Any, fallback: int = 60) -> int:
        fallback_value = max(1, int(fallback))
        if raw_duration is None:
            return fallback_value

        if isinstance(raw_duration, (int, float)):
            return max(1, int(raw_duration))

        digits = "".join(ch for ch in str(raw_duration) if ch.isdigit())
        if not digits:
            return fallback_value

        try:
            return max(1, int(digits))
        except Exception:
            return fallback_value

    def _normalize_service_name(self, service_name: Any) -> str:
        return re.sub(r"\s+", " ", str(service_name or "").strip().lower())

    def _load_service_duration_maps(self, cursor) -> Tuple[Dict[int, int], Dict[str, int]]:
        duration_by_id: Dict[int, int] = {}
        duration_by_name: Dict[str, int] = {}

        cursor.execute("SELECT id, name, duration FROM services")
        for row in cursor.fetchall():
            service_id, service_name, raw_duration = row
            duration = self._safe_duration_minutes(raw_duration, fallback=60)
            try:
                duration_by_id[int(service_id)] = duration
            except Exception:
                pass

            normalized_name = self._normalize_service_name(service_name)
            if normalized_name and normalized_name not in duration_by_name:
                duration_by_name[normalized_name] = duration

        return duration_by_id, duration_by_name

    def _estimate_duration_from_text(self, service_text: Any, duration_by_name: Dict[str, int], fallback: int = 60) -> int:
        fallback_duration = max(1, int(fallback))
        raw_text = str(service_text or "").strip()
        if not raw_text:
            return fallback_duration

        segments = [segment.strip() for segment in raw_text.split(",") if segment and segment.strip()]
        if not segments:
            return fallback_duration

        total_duration = 0
        matched = False

        for segment in segments:
            whole_key = self._normalize_service_name(segment)
            if whole_key in duration_by_name:
                total_duration += duration_by_name[whole_key]
                matched = True
                continue

            sub_segments = [item.strip() for item in re.split(r"\s*\+\s*", segment) if item and item.strip()]
            if not sub_segments:
                sub_segments = [segment]

            for part in sub_segments:
                key = self._normalize_service_name(part)
                if key in duration_by_name:
                    total_duration += duration_by_name[key]
                    matched = True

        if matched and total_duration > 0:
            return total_duration

        return fallback_duration

    def estimate_duration_minutes(self, service_label: Any, fallback: int = 60) -> int:
        """Оценить длительность услуги (или набора услуг) из SSOT таблицы services."""
        conn = get_db_connection()
        cursor = conn.cursor()
        try:
            _, duration_by_name = self._load_service_duration_maps(cursor)
            return self._estimate_duration_from_text(service_label, duration_by_name, fallback=fallback)
        except Exception as e:
            log_error(f"Error estimating duration: {e}", "schedule")
            return max(1, int(fallback))
        finally:
            conn.close()

    def _parse_master_exceptions(self, raw_value: Any) -> List[int]:
        if raw_value is None:
            return []

        values = raw_value
        if isinstance(raw_value, str):
            try:
                values = json.loads(raw_value)
            except Exception:
                values = []

        if not isinstance(values, list):
            return []

        normalized: List[int] = []
        seen = set()
        for item in values:
            try:
                master_id = int(item)
            except Exception:
                continue

            if master_id in seen:
                continue
            seen.add(master_id)
            normalized.append(master_id)

        return normalized

    def _to_tz_datetime(self, value: Any, timezone: ZoneInfo) -> Optional[datetime]:
        if value is None:
            return None

        parsed: Optional[datetime] = None
        if isinstance(value, datetime):
            parsed = value
        else:
            raw = str(value).strip()
            if not raw:
                return None
            raw = raw.replace("T", " ")
            if raw.endswith("Z"):
                raw = raw[:-1] + "+00:00"

            parse_attempts = (
                "%Y-%m-%d %H:%M:%S.%f%z",
                "%Y-%m-%d %H:%M:%S%z",
                "%Y-%m-%d %H:%M:%S.%f",
                "%Y-%m-%d %H:%M:%S",
                "%Y-%m-%d %H:%M",
                "%Y-%m-%d",
            )

            for fmt in parse_attempts:
                try:
                    parsed = datetime.strptime(raw, fmt)
                    break
                except Exception:
                    continue

            if parsed is None:
                try:
                    parsed = datetime.fromisoformat(raw)
                except Exception:
                    return None

        if parsed.tzinfo is None:
            return parsed.replace(tzinfo=timezone)

        return parsed.astimezone(timezone)

    def _combine_date_time(self, date_obj: dt_date, time_value: Any, timezone: ZoneInfo) -> Optional[datetime]:
        normalized_time = self._normalize_time_string(time_value)
        if not normalized_time:
            return None

        hour_str, minute_str = normalized_time.split(":")
        hour = int(hour_str)
        minute = int(minute_str)
        return datetime.combine(date_obj, dt_time(hour, minute), tzinfo=timezone)

    def _minute_key(self, dt_value: datetime) -> int:
        return (dt_value.hour * 60) + dt_value.minute

    def _get_holiday_state(self, cursor, date_str: str, user_id: int) -> Dict[str, Any]:
        cursor.execute(
            """
            SELECT name, is_closed, master_exceptions
            FROM salon_holidays
            WHERE date = %s
            LIMIT 1
            """,
            (date_str,),
        )
        row = cursor.fetchone()
        if not row:
            return {
                "is_holiday": False,
                "holiday_name": None,
                "is_closed": False,
                "has_override": False,
                "is_day_off": False,
            }

        holiday_name, is_closed, raw_exceptions = row
        exceptions = self._parse_master_exceptions(raw_exceptions)
        has_override = user_id in exceptions
        is_day_off = bool(is_closed and not has_override)

        return {
            "is_holiday": True,
            "holiday_name": holiday_name,
            "is_closed": bool(is_closed),
            "has_override": has_override,
            "is_day_off": is_day_off,
        }

    def _get_day_schedule_state(
        self,
        cursor,
        user_id: int,
        date_obj: dt_date,
        salon_settings: Dict[str, Any],
    ) -> Dict[str, Any]:
        day_of_week = int(date_obj.weekday())
        cursor.execute(
            """
            SELECT start_time, end_time, is_active
            FROM user_schedule
            WHERE user_id = %s AND day_of_week = %s
            LIMIT 1
            """,
            (user_id, day_of_week),
        )
        row = cursor.fetchone()
        if row:
            start_time = self._normalize_time_string(row[0])
            end_time = self._normalize_time_string(row[1])
            is_active = bool(row[2])
            is_working = bool(is_active and start_time and end_time and start_time < end_time)
            return {
                "is_working": is_working,
                "start_time": start_time,
                "end_time": end_time,
                "day_of_week": day_of_week,
                "source": "user_schedule",
            }

        range_default = DEFAULT_HOURS_WEEKENDS if day_of_week >= 5 else DEFAULT_HOURS_WEEKDAYS
        default_start, default_end = self._parse_hours_range(range_default, DEFAULT_HOURS_START, DEFAULT_HOURS_END)
        settings_key = "hours_weekends" if day_of_week >= 5 else "hours_weekdays"
        configured_range = salon_settings.get(settings_key, range_default)
        start_time, end_time = self._parse_hours_range(configured_range, default_start, default_end)
        is_working = bool(start_time and end_time and start_time < end_time)

        return {
            "is_working": is_working,
            "start_time": start_time,
            "end_time": end_time,
            "day_of_week": day_of_week,
            "source": "salon_defaults",
        }

    def _fetch_time_off_intervals(
        self,
        cursor,
        user_id: int,
        date_obj: dt_date,
        timezone: ZoneInfo,
    ) -> List[Dict[str, Any]]:
        day_start_key = f"{date_obj.strftime('%Y-%m-%d')} 00:00:00"
        day_end_key = f"{(date_obj + timedelta(days=1)).strftime('%Y-%m-%d')} 00:00:00"

        cursor.execute(
            """
            SELECT start_date, end_date
            FROM user_time_off
            WHERE user_id = %s
              AND start_date < %s
              AND end_date > %s
            """,
            (user_id, day_end_key, day_start_key),
        )

        intervals: List[Dict[str, Any]] = []
        for row in cursor.fetchall():
            start_dt = self._to_tz_datetime(row[0], timezone)
            end_dt = self._to_tz_datetime(row[1], timezone)
            if not start_dt or not end_dt or end_dt <= start_dt:
                continue
            intervals.append({
                "start": start_dt,
                "end": end_dt,
                "source": "time_off",
            })

        return intervals

    def _fetch_lunch_interval(
        self,
        salon_settings: Dict[str, Any],
        date_obj: dt_date,
        timezone: ZoneInfo,
    ) -> Optional[Dict[str, Any]]:
        lunch_start = self._normalize_time_string(salon_settings.get("lunch_start"))
        lunch_end = self._normalize_time_string(salon_settings.get("lunch_end"))
        if not lunch_start or not lunch_end or lunch_start >= lunch_end:
            return None

        lunch_start_dt = self._combine_date_time(date_obj, lunch_start, timezone)
        lunch_end_dt = self._combine_date_time(date_obj, lunch_end, timezone)
        if not lunch_start_dt or not lunch_end_dt or lunch_end_dt <= lunch_start_dt:
            return None

        return {
            "start": lunch_start_dt,
            "end": lunch_end_dt,
            "source": "lunch",
        }

    def _fetch_booking_intervals(
        self,
        cursor,
        user_record: Dict[str, Any],
        date_obj: dt_date,
        timezone: ZoneInfo,
        duration_by_name: Dict[str, int],
    ) -> List[Dict[str, Any]]:
        day_start_key = f"{date_obj.strftime('%Y-%m-%d')} 00:00:00"
        day_end_key = f"{(date_obj + timedelta(days=1)).strftime('%Y-%m-%d')} 00:00:00"
        aliases_upper = [alias.upper() for alias in self._get_master_aliases(user_record)]
        user_id = int(user_record["id"])

        if self._has_table_column("bookings", "master_user_id"):
            cursor.execute(
                """
                SELECT datetime, service_name
                FROM bookings
                WHERE datetime >= %s
                  AND datetime < %s
                  AND status != 'cancelled'
                  AND (
                    master_user_id = %s
                    OR (master_user_id IS NULL AND UPPER(COALESCE(master, '')) = ANY(%s))
                  )
                """,
                (day_start_key, day_end_key, user_id, aliases_upper),
            )
        else:
            cursor.execute(
                """
                SELECT datetime, service_name
                FROM bookings
                WHERE datetime >= %s
                  AND datetime < %s
                  AND status != 'cancelled'
                  AND UPPER(COALESCE(master, '')) = ANY(%s)
                """,
                (day_start_key, day_end_key, aliases_upper),
            )

        intervals: List[Dict[str, Any]] = []
        for row in cursor.fetchall():
            start_dt = self._to_tz_datetime(row[0], timezone)
            if not start_dt:
                continue
            duration = self._estimate_duration_from_text(row[1], duration_by_name, fallback=60)
            end_dt = start_dt + timedelta(minutes=duration)
            intervals.append({
                "start": start_dt,
                "end": end_dt,
                "source": "booking",
            })

        return intervals

    def _fetch_booking_draft_intervals(
        self,
        cursor,
        user_record: Dict[str, Any],
        date_obj: dt_date,
        timezone: ZoneInfo,
        duration_by_id: Dict[int, int],
    ) -> List[Dict[str, Any]]:
        day_start_key = f"{date_obj.strftime('%Y-%m-%d')} 00:00:00"
        day_end_key = f"{(date_obj + timedelta(days=1)).strftime('%Y-%m-%d')} 00:00:00"
        aliases_upper = [alias.upper() for alias in self._get_master_aliases(user_record)]
        user_id = int(user_record["id"])

        if self._has_table_column("booking_drafts", "master_user_id"):
            cursor.execute(
                """
                SELECT datetime, service_id
                FROM booking_drafts
                WHERE datetime >= %s
                  AND datetime < %s
                  AND expires_at > NOW()
                  AND (
                    master_user_id = %s
                    OR (master_user_id IS NULL AND UPPER(COALESCE(master, '')) = ANY(%s))
                  )
                """,
                (day_start_key, day_end_key, user_id, aliases_upper),
            )
        else:
            cursor.execute(
                """
                SELECT datetime, service_id
                FROM booking_drafts
                WHERE datetime >= %s
                  AND datetime < %s
                  AND expires_at > NOW()
                  AND UPPER(COALESCE(master, '')) = ANY(%s)
                """,
                (day_start_key, day_end_key, aliases_upper),
            )

        intervals: List[Dict[str, Any]] = []
        for row in cursor.fetchall():
            start_dt = self._to_tz_datetime(row[0], timezone)
            if not start_dt:
                continue
            service_id = row[1]
            duration = duration_by_id.get(int(service_id), 60) if service_id is not None else 60
            end_dt = start_dt + timedelta(minutes=duration)
            intervals.append({
                "start": start_dt,
                "end": end_dt,
                "source": "draft",
            })

        return intervals

    def _intervals_overlap(self, start_a: datetime, end_a: datetime, start_b: datetime, end_b: datetime) -> bool:
        return start_a < end_b and end_a > start_b

    def _find_overlap(self, intervals: List[Dict[str, Any]], slot_start: datetime, slot_end: datetime) -> Optional[Dict[str, Any]]:
        for interval in intervals:
            if self._intervals_overlap(slot_start, slot_end, interval["start"], interval["end"]):
                return interval
        return None

    def _build_day_context(self, user_record: Dict[str, Any], date_str: str) -> Optional[Dict[str, Any]]:
        try:
            date_obj = datetime.strptime(date_str, "%Y-%m-%d").date()
        except Exception:
            return None

        timezone = ZoneInfo(get_salon_timezone())
        now = get_current_time().astimezone(timezone)

        from db.settings import get_salon_settings
        salon_settings = get_salon_settings() or {}

        user_id = int(user_record["id"])
        master_name = user_record.get("full_name") or user_record.get("username") or str(user_id)

        conn = get_db_connection()
        cursor = conn.cursor()
        try:
            holiday_state = self._get_holiday_state(cursor, date_str, user_id)
            schedule_state = self._get_day_schedule_state(cursor, user_id, date_obj, salon_settings)

            context: Dict[str, Any] = {
                "date": date_str,
                "date_obj": date_obj,
                "timezone": timezone,
                "now": now,
                "user_id": user_id,
                "master_name": master_name,
                "holiday": holiday_state,
                "schedule": schedule_state,
                "work_start": None,
                "work_end": None,
                "blocked_intervals": [],
                "is_working": False,
                "day_off_reason": None,
            }

            if holiday_state.get("is_day_off"):
                context["day_off_reason"] = "holiday"
                return context

            if not schedule_state.get("is_working"):
                context["day_off_reason"] = "schedule_off"
                return context

            work_start = self._combine_date_time(date_obj, schedule_state.get("start_time"), timezone)
            work_end = self._combine_date_time(date_obj, schedule_state.get("end_time"), timezone)
            if not work_start or not work_end or work_end <= work_start:
                context["day_off_reason"] = "schedule_off"
                return context

            blocked_intervals: List[Dict[str, Any]] = []
            blocked_intervals.extend(self._fetch_time_off_intervals(cursor, user_id, date_obj, timezone))

            lunch_interval = self._fetch_lunch_interval(salon_settings, date_obj, timezone)
            if lunch_interval:
                blocked_intervals.append(lunch_interval)

            duration_by_id, duration_by_name = self._load_service_duration_maps(cursor)
            blocked_intervals.extend(
                self._fetch_booking_intervals(cursor, user_record, date_obj, timezone, duration_by_name)
            )
            blocked_intervals.extend(
                self._fetch_booking_draft_intervals(cursor, user_record, date_obj, timezone, duration_by_id)
            )

            blocked_intervals.sort(key=lambda interval: interval["start"])

            context["work_start"] = work_start
            context["work_end"] = work_end
            context["blocked_intervals"] = blocked_intervals
            context["is_working"] = True
            return context
        finally:
            conn.close()

    def _validate_slot_with_context(
        self,
        context: Dict[str, Any],
        time_str: str,
        duration_minutes: int,
    ) -> Dict[str, Any]:
        if not context:
            return {"is_available": False, "reason": "invalid_date"}

        if not context.get("is_working"):
            return {"is_available": False, "reason": context.get("day_off_reason") or "not_working"}

        normalized_time = self._normalize_time_string(time_str)
        if not normalized_time:
            return {"is_available": False, "reason": "invalid_time"}

        duration = max(1, int(duration_minutes))
        slot_start = self._combine_date_time(context["date_obj"], normalized_time, context["timezone"])
        if not slot_start:
            return {"is_available": False, "reason": "invalid_time"}
        slot_end = slot_start + timedelta(minutes=duration)

        work_start = context["work_start"]
        work_end = context["work_end"]
        if slot_start < work_start or slot_end > work_end:
            return {"is_available": False, "reason": "outside_working_hours"}

        now = context["now"]
        if context["date_obj"] == now.date() and slot_start < (now + timedelta(minutes=30)):
            return {"is_available": False, "reason": "past_or_too_soon"}

        overlap = self._find_overlap(context["blocked_intervals"], slot_start, slot_end)
        if overlap:
            source = overlap.get("source")
            reason_map = {
                "booking": "booked",
                "draft": "held",
                "lunch": "lunch_break",
                "time_off": "time_off",
            }
            return {
                "is_available": False,
                "reason": reason_map.get(source, "blocked"),
            }

        return {"is_available": True, "reason": "available"}

    def validate_slot(
        self,
        master_name: str,
        date: str,
        time_str: str,
        duration_minutes: int = 60,
    ) -> Dict[str, Any]:
        user_record = self._get_user_record(master_name)
        if not user_record:
            return {"is_available": False, "reason": "master_not_found"}

        context = self._build_day_context(user_record, date)
        result = self._validate_slot_with_context(context, time_str, duration_minutes)
        result["master"] = user_record.get("full_name") or master_name
        result["date"] = date
        result["time"] = time_str
        return result

    def is_master_available(self, master_name: str, date: str, time_str: str) -> bool:
        """Проверить доступность мастера на старт слота (базовая проверка на 60 минут)."""
        result = self.validate_slot(master_name, date, time_str, duration_minutes=60)
        return bool(result.get("is_available"))

    def _is_optimal_slot(self, context: Dict[str, Any], slot_start: datetime, slot_end: datetime) -> bool:
        if slot_start == context["work_start"] or slot_end == context["work_end"]:
            return True

        slot_start_key = self._minute_key(slot_start)
        slot_end_key = self._minute_key(slot_end)

        for interval in context["blocked_intervals"]:
            start_key = self._minute_key(interval["start"])
            end_key = self._minute_key(interval["end"])
            if slot_start_key == end_key or slot_end_key == start_key:
                return True

        return False

    def _get_available_slots_for_user(
        self,
        user_record: Dict[str, Any],
        date: str,
        duration_minutes: int = 60,
        return_metadata: bool = False,
    ) -> List[Any]:
        context = self._build_day_context(user_record, date)
        if not context or not context.get("is_working"):
            return []

        duration = max(1, int(duration_minutes))
        current_dt = context["work_start"]
        end_working_dt = context["work_end"]

        slots: List[Any] = []
        while current_dt + timedelta(minutes=duration) <= end_working_dt:
            slot_end = current_dt + timedelta(minutes=duration)
            validation = self._validate_slot_with_context(context, current_dt.strftime("%H:%M"), duration)
            if validation.get("is_available"):
                time_str = current_dt.strftime("%H:%M")
                if return_metadata:
                    slots.append({
                        "time": time_str,
                        "is_optimal": self._is_optimal_slot(context, current_dt, slot_end),
                    })
                else:
                    slots.append(time_str)

            current_dt += timedelta(minutes=30)

        return slots

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
        user_record = self._get_user_record(master_name)
        if not user_record:
            return []
        return self._get_available_slots_for_user(
            user_record=user_record,
            date=date,
            duration_minutes=duration_minutes,
            return_metadata=return_metadata,
        )

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
            
            # Для каждого активного мастера получаем слоты
            availability = {}
            for master_name in active_masters:
                slots = self.get_available_slots(master_name, date, duration_minutes=duration_minutes, return_metadata=return_metadata)
                if slots:
                    availability[master_name] = slots
            return availability

        except Exception as e:
            log_error(f"Error getting all masters availability: {e}", "schedule")
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
        SSOT: использует get_available_slots как единый источник вычисления.
        """
        import calendar
        available_dates: List[str] = []

        num_days = calendar.monthrange(year, month)[1]
        today = get_current_time().date()
        duration = max(1, int(duration_minutes))

        masters_to_check: List[Dict[str, Any]] = []
        if master_name and str(master_name).strip().lower() not in {"any", "global"}:
            master_record = self._get_user_record(master_name)
            if master_record:
                masters_to_check = [master_record]
        else:
            conn = get_db_connection()
            cursor = conn.cursor()
            try:
                cursor.execute(
                    """
                    SELECT COUNT(*)
                    FROM information_schema.columns
                    WHERE table_name = 'users' AND column_name = 'secondary_role'
                    """
                )
                has_secondary_role = cursor.fetchone()[0] > 0

                if has_secondary_role:
                    cursor.execute(
                        """
                        SELECT id, full_name, username
                        FROM users
                        WHERE is_service_provider = TRUE
                          AND is_active = TRUE
                          AND (role = 'employee' OR secondary_role = 'employee')
                        """
                    )
                else:
                    cursor.execute(
                        """
                        SELECT id, full_name, username
                        FROM users
                        WHERE is_service_provider = TRUE
                          AND is_active = TRUE
                          AND role = 'employee'
                        """
                    )

                masters_to_check = [
                    {"id": row[0], "full_name": row[1], "username": row[2]}
                    for row in cursor.fetchall()
                ]
            finally:
                conn.close()

        if not masters_to_check:
            return []

        for day in range(1, num_days + 1):
            date_obj = datetime(year, month, day).date()
            if date_obj < today:
                continue

            date_str = date_obj.strftime("%Y-%m-%d")
            day_has_availability = False

            for master_record in masters_to_check:
                slots = self._get_available_slots_for_user(
                    user_record=master_record,
                    date=date_str,
                    duration_minutes=duration,
                    return_metadata=False,
                )
                if slots:
                    day_has_availability = True
                    break

            if day_has_availability:
                available_dates.append(date_str)

        return available_dates
