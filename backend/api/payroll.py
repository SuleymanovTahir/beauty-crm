"""
API endpoints для расчета зарплат (Payroll)
"""
from datetime import date, datetime, timedelta
import json
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from core.auth import get_current_user_or_redirect as get_current_user
from db.connection import get_db_connection
from utils.logger import log_error, log_info
from utils.permissions import RoleHierarchy

router = APIRouter(tags=["Payroll"])


class PayrollCalculateRequest(BaseModel):
    employee_id: int
    start_date: str
    end_date: str


class PayrollRecordRequest(BaseModel):
    employee_id: int
    amount: float
    currency: str
    period_start: str
    period_end: str
    notes: Optional[str] = None


class PayrollStatusUpdateRequest(BaseModel):
    payment_id: int
    status: str  # pending, paid, cancelled


class PayrollSettingsUpdateRequest(BaseModel):
    salary_type: Optional[str] = None
    base_salary: Optional[float] = None
    commission_rate: Optional[float] = None
    hourly_rate: Optional[float] = None
    daily_rate: Optional[float] = None
    per_booking_rate: Optional[float] = None
    per_client_rate: Optional[float] = None
    bonus_fixed: Optional[float] = None
    penalty_fixed: Optional[float] = None
    currency: Optional[str] = None


def _safe_float(value: Any, fallback: float = 0.0) -> float:
    try:
        if value is None:
            return fallback
        return float(value)
    except Exception:
        return fallback


def _normalize_salary_type(value: Any) -> str:
    normalized = str(value or "").strip().lower()
    if normalized == "per_booking":
        return "per_client"
    if normalized in {"fixed", "commission", "hourly", "daily", "per_client", "mixed"}:
        return normalized
    return "commission"


def _require_payroll_role(current_user: Optional[dict]) -> None:
    if not current_user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    current_role = str(current_user.get("role") or "").strip()
    secondary_role = str(current_user.get("secondary_role") or "").strip()
    user_id = current_user.get("id")
    if not RoleHierarchy.has_permission(current_role, "payroll_manage", secondary_role, user_id):
        raise HTTPException(status_code=403, detail="Forbidden")


def _column_exists(c, table_name: str, column_name: str) -> bool:
    c.execute(
        """
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = %s
          AND column_name = %s
        LIMIT 1
        """,
        (table_name, column_name),
    )
    return bool(c.fetchone())


def _parse_date(value: str) -> date:
    try:
        return datetime.strptime(value, "%Y-%m-%d").date()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid date format, expected YYYY-MM-DD")


def _iter_dates(start_date: date, end_date: date):
    current = start_date
    while current <= end_date:
        yield current
        current += timedelta(days=1)


def _parse_time_to_hours(time_value: str) -> float:
    try:
        hours_raw, mins_raw = str(time_value or "00:00").split(":", 1)
        hours = int(hours_raw)
        mins = int(mins_raw)
        return max(0.0, float(hours) + float(mins) / 60.0)
    except Exception:
        return 0.0


def _parse_duration_to_minutes(duration_value: Any) -> int:
    if isinstance(duration_value, (int, float)):
        parsed = int(duration_value)
        return parsed if parsed > 0 else 60

    duration_str = str(duration_value or "").strip().lower()
    if not duration_str:
        return 60

    if duration_str.isdigit():
        parsed = int(duration_str)
        return parsed if parsed > 0 else 60

    if ":" in duration_str:
        chunks = duration_str.split(":")
        if len(chunks) == 2 and chunks[0].isdigit() and chunks[1].isdigit():
            total = int(chunks[0]) * 60 + int(chunks[1])
            return total if total > 0 else 60

    hours = 0
    minutes = 0
    for chunk in duration_str.replace(",", " ").split():
        if "h" in chunk or "ч" in chunk:
            digits = "".join(ch for ch in chunk if ch.isdigit())
            hours = int(digits) if digits else 0
        if "m" in chunk or "мин" in chunk:
            digits = "".join(ch for ch in chunk if ch.isdigit())
            minutes = int(digits) if digits else 0

    total_minutes = hours * 60 + minutes
    return total_minutes if total_minutes > 0 else 60


def _estimate_booking_duration_minutes(service_name: str, service_duration_map: Dict[str, Any]) -> int:
    normalized_name = str(service_name or "").strip().lower()
    if not normalized_name:
        return 60

    if normalized_name in service_duration_map:
        return _parse_duration_to_minutes(service_duration_map[normalized_name])

    if "," not in normalized_name:
        return 60

    total_minutes = 0
    found_any = False
    for chunk in [part.strip() for part in normalized_name.split(",") if part.strip()]:
        if chunk not in service_duration_map:
            continue
        found_any = True
        total_minutes += _parse_duration_to_minutes(service_duration_map[chunk])

    if found_any and total_minutes > 0:
        return total_minutes
    return 60


def _get_salon_currency(c) -> str:
    try:
        c.execute("SELECT currency FROM salon_settings WHERE id = 1")
        row = c.fetchone()
        return str(row[0] or "AED") if row else "AED"
    except Exception:
        return "AED"


def _get_prorated_base_salary(base_salary: float, start_date: date, end_date: date) -> float:
    if base_salary <= 0:
        return 0.0

    total = 0.0
    current = date(start_date.year, start_date.month, 1)

    while current <= end_date:
        if current.month == 12:
            next_month = date(current.year + 1, 1, 1)
        else:
            next_month = date(current.year, current.month + 1, 1)

        month_start = current
        month_end = next_month - timedelta(days=1)

        period_start = max(start_date, month_start)
        period_end = min(end_date, month_end)
        if period_start <= period_end:
            worked_days = (period_end - period_start).days + 1
            month_days = (month_end - month_start).days + 1
            total += base_salary * (worked_days / month_days)

        current = next_month

    return total


def _load_salary_profile(c, employee_id: int, base_salary: float, commission_rate: float) -> Dict[str, Any]:
    currency = _get_salon_currency(c)
    profile = {
        "salary_type": "commission",
        "base_salary": _safe_float(base_salary),
        "commission_rate": _safe_float(commission_rate),
        "hourly_rate": 0.0,
        "daily_rate": 0.0,
        "per_booking_rate": 0.0,
        "per_client_rate": 0.0,
        "bonus_fixed": 0.0,
        "penalty_fixed": 0.0,
        "currency": currency,
    }

    if not _column_exists(c, "salary_settings", "user_id"):
        return profile

    bonus_rate_select = "bonus_rate" if _column_exists(c, "salary_settings", "bonus_rate") else "0 AS bonus_rate"
    currency_select = "currency" if _column_exists(c, "salary_settings", "currency") else f"'{currency}' AS currency"
    kpi_settings_select = "kpi_settings" if _column_exists(c, "salary_settings", "kpi_settings") else "'{}'::jsonb AS kpi_settings"

    c.execute(
        f"""
        SELECT base_salary, commission_rate, {bonus_rate_select}, {currency_select}, {kpi_settings_select}
        FROM salary_settings
        WHERE user_id = %s
          AND ({'is_active = TRUE' if _column_exists(c, 'salary_settings', 'is_active') else '1 = 1'})
        LIMIT 1
        """,
        (employee_id,),
    )
    row = c.fetchone()
    if not row:
        return profile

    profile["base_salary"] = _safe_float(row[0], profile["base_salary"])
    profile["commission_rate"] = _safe_float(row[1], profile["commission_rate"])
    profile["currency"] = str(row[3] or profile["currency"])

    kpi_settings_raw = row[4]
    kpi_settings = {}
    if isinstance(kpi_settings_raw, dict):
        kpi_settings = kpi_settings_raw
    elif isinstance(kpi_settings_raw, str) and kpi_settings_raw.strip():
        try:
            kpi_settings = json.loads(kpi_settings_raw)
        except Exception:
            kpi_settings = {}

    salary_type = _normalize_salary_type(kpi_settings.get("salary_type"))
    if salary_type:
        profile["salary_type"] = salary_type

    profile["hourly_rate"] = _safe_float(kpi_settings.get("hourly_rate"), 0.0)
    profile["daily_rate"] = _safe_float(kpi_settings.get("daily_rate"), 0.0)
    profile["per_booking_rate"] = _safe_float(kpi_settings.get("per_booking_rate"), 0.0)
    profile["per_client_rate"] = _safe_float(kpi_settings.get("per_client_rate"), 0.0)
    profile["bonus_fixed"] = _safe_float(kpi_settings.get("bonus_fixed"), 0.0)
    profile["penalty_fixed"] = _safe_float(kpi_settings.get("penalty_fixed"), 0.0)

    if _safe_float(row[2], 0.0) > 0 and profile["per_client_rate"] <= 0:
        profile["per_client_rate"] = _safe_float(row[2], 0.0)
    if profile["per_client_rate"] <= 0 and profile["per_booking_rate"] > 0:
        profile["per_client_rate"] = profile["per_booking_rate"]
    profile["per_booking_rate"] = 0.0

    return profile


def _calculate_scheduled_hours(c, employee_id: int, start_date: date, end_date: date) -> Dict[str, float]:
    if not _column_exists(c, "user_schedule", "user_id"):
        return {"hours": 0.0, "days": 0.0}

    c.execute(
        """
        SELECT day_of_week, start_time, end_time, is_working
        FROM user_schedule
        WHERE user_id = %s
        """,
        (employee_id,),
    )
    schedule_rows = c.fetchall()
    if not schedule_rows:
        return {"hours": 0.0, "days": 0.0}

    schedule_map: Dict[int, Dict[str, Any]] = {}
    for row in schedule_rows:
        day_of_week = int(row[0] or 0)
        schedule_map[day_of_week] = {
            "start": str(row[1] or "00:00"),
            "end": str(row[2] or "00:00"),
            "is_working": bool(row[3]),
        }

    total_hours = 0.0
    total_days = 0.0
    for day_item in _iter_dates(start_date, end_date):
        weekday = day_item.weekday()  # Monday=0
        day_schedule = schedule_map.get(weekday)
        if not day_schedule or not day_schedule["is_working"]:
            continue

        start_hours = _parse_time_to_hours(day_schedule["start"])
        end_hours = _parse_time_to_hours(day_schedule["end"])
        worked_hours = max(0.0, end_hours - start_hours)
        if worked_hours <= 0:
            continue

        total_hours += worked_hours
        total_days += 1.0

    return {"hours": total_hours, "days": total_days}


@router.get("/payroll/settings/{employee_id}")
async def get_payroll_settings(
    employee_id: int,
    current_user: dict = Depends(get_current_user),
):
    _require_payroll_role(current_user)

    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute(
            """
            SELECT base_salary, commission_rate
            FROM users
            WHERE id = %s
            """,
            (employee_id,),
        )
        user_row = c.fetchone()
        if not user_row:
            raise HTTPException(status_code=404, detail="Employee not found")

        profile = _load_salary_profile(
            c,
            employee_id=employee_id,
            base_salary=_safe_float(user_row[0], 0.0),
            commission_rate=_safe_float(user_row[1], 0.0),
        )
        return profile
    except HTTPException:
        raise
    except Exception as e:
        log_error(f"Error loading payroll settings: {e}", "api")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.post("/payroll/settings/{employee_id}")
async def update_payroll_settings(
    employee_id: int,
    data: PayrollSettingsUpdateRequest,
    current_user: dict = Depends(get_current_user),
):
    _require_payroll_role(current_user)

    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute("SELECT id FROM users WHERE id = %s", (employee_id,))
        if not c.fetchone():
            raise HTTPException(status_code=404, detail="Employee not found")

        c.execute("SELECT base_salary, commission_rate FROM users WHERE id = %s", (employee_id,))
        user_row = c.fetchone() or (0, 0)

        base_salary = _safe_float(data.base_salary, _safe_float(user_row[0], 0.0))
        commission_rate = _safe_float(data.commission_rate, _safe_float(user_row[1], 0.0))

        current_profile = _load_salary_profile(c, employee_id, base_salary, commission_rate)
        currency = str(data.currency or current_profile["currency"])

        next_salary_type = _normalize_salary_type(data.salary_type or current_profile["salary_type"])
        next_per_client_rate = _safe_float(data.per_client_rate, current_profile["per_client_rate"])
        if next_per_client_rate <= 0 and data.per_booking_rate is not None:
            next_per_client_rate = _safe_float(data.per_booking_rate, current_profile["per_client_rate"])

        kpi_settings = {
            "salary_type": next_salary_type,
            "hourly_rate": _safe_float(data.hourly_rate, current_profile["hourly_rate"]),
            "daily_rate": _safe_float(data.daily_rate, current_profile["daily_rate"]),
            "per_booking_rate": 0.0,
            "per_client_rate": next_per_client_rate,
            "bonus_fixed": _safe_float(data.bonus_fixed, current_profile["bonus_fixed"]),
            "penalty_fixed": _safe_float(data.penalty_fixed, current_profile["penalty_fixed"]),
        }

        if _column_exists(c, "salary_settings", "user_id"):
            has_bonus_rate = _column_exists(c, "salary_settings", "bonus_rate")
            has_currency = _column_exists(c, "salary_settings", "currency")
            has_kpi_settings = _column_exists(c, "salary_settings", "kpi_settings")
            has_is_active = _column_exists(c, "salary_settings", "is_active")
            has_created_at = _column_exists(c, "salary_settings", "created_at")
            has_updated_at = _column_exists(c, "salary_settings", "updated_at")

            insert_columns = ["user_id", "base_salary", "commission_rate"]
            insert_values: List[Any] = [employee_id, base_salary, commission_rate]
            insert_placeholders = ["%s", "%s", "%s"]
            update_set_clauses = [
                "base_salary = EXCLUDED.base_salary",
                "commission_rate = EXCLUDED.commission_rate",
            ]

            if has_bonus_rate:
                insert_columns.append("bonus_rate")
                insert_values.append(_safe_float(kpi_settings["per_booking_rate"], 0.0))
                insert_placeholders.append("%s")
                update_set_clauses.append("bonus_rate = EXCLUDED.bonus_rate")

            if has_currency:
                insert_columns.append("currency")
                insert_values.append(currency)
                insert_placeholders.append("%s")
                update_set_clauses.append("currency = EXCLUDED.currency")

            if has_kpi_settings:
                insert_columns.append("kpi_settings")
                insert_values.append(json.dumps(kpi_settings, ensure_ascii=False))
                insert_placeholders.append("%s")
                update_set_clauses.append("kpi_settings = EXCLUDED.kpi_settings")

            if has_is_active:
                insert_columns.append("is_active")
                insert_values.append(True)
                insert_placeholders.append("%s")
                update_set_clauses.append("is_active = TRUE")

            if has_created_at:
                insert_columns.append("created_at")
                insert_values.append(datetime.utcnow())
                insert_placeholders.append("%s")

            if has_updated_at:
                insert_columns.append("updated_at")
                insert_values.append(datetime.utcnow())
                insert_placeholders.append("%s")
                update_set_clauses.append("updated_at = NOW()")

            c.execute(
                f"""
                INSERT INTO salary_settings ({', '.join(insert_columns)})
                VALUES ({', '.join(insert_placeholders)})
                ON CONFLICT (user_id) DO UPDATE SET
                    {', '.join(update_set_clauses)}
                """,
                tuple(insert_values),
            )

        c.execute(
            """
            UPDATE users
            SET base_salary = %s,
                commission_rate = %s
            WHERE id = %s
            """,
            (base_salary, commission_rate, employee_id),
        )

        conn.commit()
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        log_error(f"Error saving payroll settings: {e}", "api")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.post("/payroll/calculate")
async def calculate_payroll(
    data: PayrollCalculateRequest,
    current_user: dict = Depends(get_current_user),
):
    """Рассчитать зарплату сотрудника за период"""
    _require_payroll_role(current_user)

    start_day = _parse_date(data.start_date)
    end_day = _parse_date(data.end_date)
    if end_day < start_day:
        raise HTTPException(status_code=400, detail="End date must be greater than or equal to start date")

    conn = get_db_connection()
    c = conn.cursor()

    try:
        c.execute(
            """
            SELECT id, full_name, username, base_salary, commission_rate
            FROM users
            WHERE id = %s
            LIMIT 1
            """,
            (data.employee_id,),
        )
        employee_row = c.fetchone()
        if not employee_row:
            raise HTTPException(status_code=404, detail="Employee not found")

        employee_id = int(employee_row[0])
        full_name = str(employee_row[1] or "").strip()
        username = str(employee_row[2] or "").strip()
        base_salary_from_user = _safe_float(employee_row[3], 0.0)
        commission_rate_from_user = _safe_float(employee_row[4], 0.0)

        salary_profile = _load_salary_profile(
            c,
            employee_id=employee_id,
            base_salary=base_salary_from_user,
            commission_rate=commission_rate_from_user,
        )
        currency = str(salary_profile["currency"] or _get_salon_currency(c))

        has_master_user_id = _column_exists(c, "bookings", "master_user_id")
        has_deleted_at = _column_exists(c, "bookings", "deleted_at")

        aliases = sorted(
            {
                alias.strip().lower()
                for alias in [full_name, username]
                if alias and alias.strip()
            }
        )

        query_conditions = [
            "b.datetime >= %s",
            "b.datetime <= %s",
            "COALESCE(b.status, '') = 'completed'",
        ]
        query_params: List[Any] = [
            f"{start_day.isoformat()} 00:00:00",
            f"{end_day.isoformat()} 23:59:59",
        ]

        if has_deleted_at:
            query_conditions.append("b.deleted_at IS NULL")

        if has_master_user_id:
            if aliases:
                query_conditions.append(
                    "(b.master_user_id = %s OR (b.master_user_id IS NULL AND LOWER(COALESCE(b.master, '')) = ANY(%s)))"
                )
                query_params.extend([employee_id, aliases])
            else:
                query_conditions.append("b.master_user_id = %s")
                query_params.append(employee_id)
        else:
            if aliases:
                query_conditions.append("LOWER(COALESCE(b.master, '')) = ANY(%s)")
                query_params.append(aliases)
            else:
                query_conditions.append("1 = 0")

        c.execute(
            f"""
            SELECT
                b.id,
                b.instagram_id,
                b.datetime,
                COALESCE(NULLIF(b.revenue, 0), s.price, s.min_price, s.max_price, 0) AS resolved_revenue,
                b.service_name
            FROM bookings b
            LEFT JOIN LATERAL (
                SELECT price, min_price, max_price
                FROM services s
                WHERE LOWER(TRIM(s.name)) = LOWER(TRIM(b.service_name))
                ORDER BY s.id ASC
                LIMIT 1
            ) s ON TRUE
            WHERE {' AND '.join(query_conditions)}
            """,
            tuple(query_params),
        )
        completed_bookings = c.fetchall()

        c.execute("SELECT LOWER(TRIM(name)), duration FROM services")
        service_duration_rows = c.fetchall()
        service_duration_map = {
            str(row[0] or "").strip().lower(): row[1]
            for row in service_duration_rows
            if row and row[0]
        }

        total_bookings = len(completed_bookings)
        total_revenue = 0.0
        client_revenue_total = 0.0
        worked_hours_from_bookings = 0.0
        unique_clients = set()
        worked_dates = set()

        for booking_row in completed_bookings:
            revenue_value = _safe_float(booking_row[3], 0.0)
            total_revenue += revenue_value

            client_id = str(booking_row[1] or "").strip()
            if client_id:
                unique_clients.add(client_id)
                client_revenue_total += revenue_value

            booking_datetime = booking_row[2]
            if isinstance(booking_datetime, datetime):
                worked_dates.add(booking_datetime.date().isoformat())
            else:
                try:
                    worked_dates.add(datetime.fromisoformat(str(booking_datetime)).date().isoformat())
                except Exception:
                    pass

            booking_duration_minutes = _estimate_booking_duration_minutes(
                service_name=str(booking_row[4] or ""),
                service_duration_map=service_duration_map,
            )
            worked_hours_from_bookings += float(booking_duration_minutes) / 60.0

        schedule_metrics = _calculate_scheduled_hours(c, employee_id, start_day, end_day)
        scheduled_hours = _safe_float(schedule_metrics["hours"], 0.0)
        scheduled_days = _safe_float(schedule_metrics["days"], 0.0)

        worked_days = float(len(worked_dates))
        effective_hours = worked_hours_from_bookings if worked_hours_from_bookings > 0 else scheduled_hours
        effective_days = worked_days if worked_days > 0 else scheduled_days

        base_prorated = _get_prorated_base_salary(_safe_float(salary_profile["base_salary"], 0.0), start_day, end_day)
        commission_amount = total_revenue * _safe_float(salary_profile["commission_rate"], 0.0) / 100.0
        hourly_amount = _safe_float(salary_profile["hourly_rate"], 0.0) * effective_hours
        daily_amount = _safe_float(salary_profile["daily_rate"], 0.0) * effective_days
        per_booking_amount = 0.0
        per_client_amount = client_revenue_total * _safe_float(salary_profile["per_client_rate"], 0.0) / 100.0
        bonus_fixed = _safe_float(salary_profile["bonus_fixed"], 0.0)
        penalty_fixed = _safe_float(salary_profile["penalty_fixed"], 0.0)

        salary_type = _normalize_salary_type(salary_profile["salary_type"] or "commission")
        calculated_salary = 0.0
        if salary_type == "fixed":
            calculated_salary = base_prorated
        elif salary_type == "commission":
            calculated_salary = base_prorated + commission_amount
        elif salary_type == "hourly":
            calculated_salary = hourly_amount
        elif salary_type == "daily":
            calculated_salary = daily_amount
        elif salary_type == "per_client":
            calculated_salary = per_client_amount
        elif salary_type == "mixed":
            calculated_salary = base_prorated + commission_amount + hourly_amount + daily_amount + per_client_amount
        else:
            calculated_salary = base_prorated + commission_amount

        calculated_salary += bonus_fixed
        calculated_salary -= penalty_fixed

        response = {
            "employee_id": employee_id,
            "full_name": full_name,
            "total_bookings": total_bookings,
            "total_revenue": round(total_revenue, 2),
            "unique_clients": len(unique_clients),
            "worked_days": round(effective_days, 2),
            "worked_hours": round(effective_hours, 2),
            "base_salary": round(base_prorated, 2),
            "commission_rate": _safe_float(salary_profile["commission_rate"], 0.0),
            "commission_amount": round(commission_amount, 2),
            "hourly_amount": round(hourly_amount, 2),
            "daily_amount": round(daily_amount, 2),
            "per_booking_amount": round(per_booking_amount, 2),
            "per_client_amount": round(per_client_amount, 2),
            "bonus_fixed": round(bonus_fixed, 2),
            "penalty_fixed": round(penalty_fixed, 2),
            "calculated_salary": round(calculated_salary, 2),
            "currency": currency,
            "salary_type": salary_type,
            "period_start": start_day.isoformat(),
            "period_end": end_day.isoformat(),
        }

        log_info(
            f"Payroll calculated: employee={employee_id}, period={start_day.isoformat()}..{end_day.isoformat()}, salary={response['calculated_salary']}",
            "api",
        )
        return response
    except HTTPException:
        raise
    except Exception as e:
        log_error(f"Error calculating payroll: {e}", "api")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.post("/payroll/record-payment")
async def record_payment(
    data: PayrollRecordRequest,
    current_user: dict = Depends(get_current_user),
):
    """Записать факт выплаты зарплаты в историю"""
    _require_payroll_role(current_user)

    conn = get_db_connection()
    c = conn.cursor()
    try:
        employee_column = "employee_id" if _column_exists(c, "payroll_payments", "employee_id") else "user_id"
        has_currency = _column_exists(c, "payroll_payments", "currency")
        has_status = _column_exists(c, "payroll_payments", "status")
        has_notes = _column_exists(c, "payroll_payments", "notes")

        columns = [employee_column, "amount", "period_start", "period_end"]
        values: List[Any] = [data.employee_id, data.amount, data.period_start, data.period_end]
        placeholders = ["%s", "%s", "%s", "%s"]

        if has_currency:
            columns.append("currency")
            values.append(data.currency)
            placeholders.append("%s")
        if has_status:
            columns.append("status")
            values.append("pending")
            placeholders.append("%s")
        if has_notes:
            columns.append("notes")
            values.append(data.notes or "")
            placeholders.append("%s")

        c.execute(
            f"""
            INSERT INTO payroll_payments ({', '.join(columns)})
            VALUES ({', '.join(placeholders)})
            RETURNING id
            """,
            tuple(values),
        )
        payment_id = c.fetchone()[0]
        conn.commit()

        log_info(f"Payment recorded: id={payment_id}, employee={data.employee_id}, amount={data.amount}", "api")
        return {"status": "success", "payment_id": payment_id}
    except Exception as e:
        conn.rollback()
        log_error(f"Error recording payment: {e}", "api")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.get("/payroll/history/{employee_id}")
async def get_payroll_history(
    employee_id: int,
    current_user: dict = Depends(get_current_user),
):
    """Получить историю реальных выплат сотруднику"""
    _require_payroll_role(current_user)

    conn = get_db_connection()
    c = conn.cursor()
    try:
        employee_column = "employee_id" if _column_exists(c, "payroll_payments", "employee_id") else "user_id"
        has_currency = _column_exists(c, "payroll_payments", "currency")
        has_status = _column_exists(c, "payroll_payments", "status")
        has_created_at = _column_exists(c, "payroll_payments", "created_at")
        has_payment_date = _column_exists(c, "payroll_payments", "payment_date")

        currency_select = "currency" if has_currency else "NULL AS currency"
        status_select = "status" if has_status else "'paid' AS status"
        created_at_select = "created_at" if has_created_at else ("payment_date" if has_payment_date else "CURRENT_TIMESTAMP")

        c.execute(
            f"""
            SELECT id, period_start, period_end, amount, {currency_select}, {created_at_select}, {status_select}
            FROM payroll_payments
            WHERE {employee_column} = %s
            ORDER BY {created_at_select} DESC
            """,
            (employee_id,),
        )
        rows = c.fetchall()
        fallback_currency = _get_salon_currency(c)

        history = []
        for row in rows:
            history.append(
                {
                    "id": row[0],
                    "period_start": row[1],
                    "period_end": row[2],
                    "total_amount": _safe_float(row[3], 0.0),
                    "currency": row[4] if row[4] else fallback_currency,
                    "created_at": row[5],
                    "status": row[6] if row[6] else "paid",
                }
            )

        return history
    except Exception as e:
        log_error(f"Error fetching payroll history: {e}", "api")
        return []
    finally:
        conn.close()


@router.post("/payroll/update-status")
async def update_payment_status(
    data: PayrollStatusUpdateRequest,
    current_user: dict = Depends(get_current_user),
):
    """Обновить статус выплаты"""
    _require_payroll_role(current_user)

    valid_statuses = ["pending", "paid", "cancelled"]
    if data.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")

    conn = get_db_connection()
    c = conn.cursor()
    try:
        if not _column_exists(c, "payroll_payments", "status"):
            return {"success": True, "message": "Status column is not available in payroll_payments"}

        c.execute("UPDATE payroll_payments SET status = %s WHERE id = %s", (data.status, data.payment_id))
        conn.commit()
        return {"success": True, "message": f"Status updated to {data.status}"}
    except Exception as e:
        conn.rollback()
        log_error(f"Error updating payment status: {e}", "api")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()
