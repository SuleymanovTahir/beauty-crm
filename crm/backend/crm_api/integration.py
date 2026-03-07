"""
Versioned integration API for external consumers (Site runtime).
"""
from __future__ import annotations

import os
import re
import secrets
from datetime import date, datetime
from functools import lru_cache
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, BackgroundTasks, Header, HTTPException, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel, validator

from db.bookings import save_booking
from db.clients import update_client_info
from db.connection import get_db_connection
from db.services import get_all_services
from utils.cache import cache
from utils.duration_utils import parse_duration_to_minutes
from utils.language_utils import (
    get_dynamic_translation,
    get_localized_name,
    translate_position,
    validate_language,
)
from utils.logger import log_error, log_info
from utils.utils import _add_v, map_image_path, sanitize_url


router = APIRouter(prefix="/integration/v1", tags=["Integration"])

CACHE_TTL_SHORT = 60
CACHE_TTL_MEDIUM = 300

CATEGORY_ALIASES = {
    "брови": "brows",
    "brows": "brows",
    "eyebrows": "brows",
    "комбо": "combo",
    "combo": "combo",
    "косметология": "cosmetology",
    "cosmetology": "cosmetology",
    "уход за волосами": "hair_care",
    "hair care": "hair_care",
    "hair_care": "hair_care",
    "окрашивание волос": "hair_color",
    "hair color": "hair_color",
    "hair_color": "hair_color",
    "стрижка": "hair_cut",
    "hair cut": "hair_cut",
    "haircut": "hair_cut",
    "hair cutting": "hair_cut",
    "hair_cut": "hair_cut",
    "укладка": "hair_styling",
    "hair styling": "hair_styling",
    "hair_styling": "hair_styling",
    "styling": "hair_styling",
    "ресницы": "lashes",
    "lashes": "lashes",
    "eyelashes": "lashes",
    "маникюр": "manicure",
    "manicure": "manicure",
    "массаж": "massage",
    "massage": "massage",
    "ногти": "nails",
    "nails": "nails",
    "педикюр": "pedicure",
    "pedicure": "pedicure",
    "перманентный макияж": "permanent_makeup",
    "permanent makeup": "permanent_makeup",
    "permanent_makeup": "permanent_makeup",
    "спа": "spa",
    "spa": "spa",
    "ваксинг": "waxing",
    "депиляция": "waxing",
    "депиляция воском": "waxing",
    "waxing": "waxing",
}

EXPERIENCE_LABELS = {
    "ru": lambda years: f"{years} {_get_russian_plural(years, 'год', 'года', 'лет')} опыта",
    "en": lambda years: f"{years} years experience",
    "ar": lambda years: f"{years} سنوات خبرة",
    "es": lambda years: f"{years} años de experiencia",
    "de": lambda years: f"{years} Jahre Erfahrung",
    "fr": lambda years: f"{years} ans d'expérience",
    "pt": lambda years: f"{years} anos de experiência",
    "hi": lambda years: f"{years} साल का अनुभव",
    "kk": lambda years: f"{years} жыл тәжірибе",
}


class BookingCreate(BaseModel):
    service_ids: List[int]
    employee_id: Optional[int] = None
    date: str
    time: str
    name: str
    phone: str
    email: Optional[str] = None
    notes: Optional[str] = None
    source: Optional[str] = "website"

    @validator("phone")
    def validate_phone(cls, value: str) -> str:
        digits_only = "".join(ch for ch in str(value or "") if ch.isdigit())
        if len(digits_only) < 11:
            raise ValueError("phone_too_short")
        return value


def _get_russian_plural(number: int, one: str, two: str, five: str) -> str:
    value = abs(int(number)) % 100
    last_digit = value % 10
    if 10 < value < 20:
        return five
    if 1 < last_digit < 5:
        return two
    if last_digit == 1:
        return one
    return five


@lru_cache(maxsize=32)
def _get_table_columns(table_name: str) -> tuple[str, ...]:
    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute(
            """
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = %s
            """,
            (table_name,),
        )
        return tuple(sorted(row[0] for row in (c.fetchall() or []) if row and row[0]))
    finally:
        conn.close()


def _canonical_category_key(raw_category: Optional[str]) -> str:
    if not raw_category:
        return ""
    normalized = re.sub(r"\s+", " ", str(raw_category).strip().lower())
    alias = CATEGORY_ALIASES.get(normalized)
    if alias:
        return alias
    normalized_ascii = re.sub(r"[^a-z0-9]+", "_", normalized).strip("_")
    return CATEGORY_ALIASES.get(normalized_ascii, normalized_ascii)


def _calculate_age(birthday_value: Any) -> Optional[int]:
    if birthday_value is None:
        return None

    birth_date: Optional[date] = None
    if isinstance(birthday_value, datetime):
        birth_date = birthday_value.date()
    elif isinstance(birthday_value, date):
        birth_date = birthday_value
    else:
        raw_value = str(birthday_value).strip()
        for fmt in ("%Y-%m-%d", "%d.%m.%Y", "%d/%m/%Y"):
            try:
                birth_date = datetime.strptime(raw_value, fmt).date()
                break
            except ValueError:
                continue

    if birth_date is None:
        return None

    today = date.today()
    return today.year - birth_date.year - (
        (today.month, today.day) < (birth_date.month, birth_date.day)
    )


def _format_experience(years_value: Any, fallback_value: Any, language: str) -> str:
    try:
        years = int(years_value) if years_value is not None else None
    except Exception:
        years = None

    if years and years > 0:
        formatter = EXPERIENCE_LABELS.get(language, EXPERIENCE_LABELS["en"])
        return formatter(years)

    return str(fallback_value or "").strip()


def _build_user_column_expression(
    available_columns: set[str],
    column_name: str,
    table_alias: str = "u",
) -> str:
    if column_name in available_columns:
        return f"{table_alias}.{column_name}"
    return f"NULL AS {column_name}"


def _build_user_filters(
    available_columns: set[str],
    *,
    include_public_visibility: bool,
    table_alias: str = "u",
) -> List[str]:
    filters: List[str] = []
    if "is_active" in available_columns:
        filters.append(f"{table_alias}.is_active = TRUE")
    if "is_service_provider" in available_columns:
        filters.append(f"{table_alias}.is_service_provider = TRUE")
    if include_public_visibility and "is_public_visible" in available_columns:
        filters.append(f"{table_alias}.is_public_visible = TRUE")
    if "deleted_at" in available_columns:
        filters.append(f"{table_alias}.deleted_at IS NULL")
    if "role" in available_columns:
        filters.append(f"COALESCE({table_alias}.role, '') != 'director'")
    return filters


def _extract_display_name(employee_row: Dict[str, Any]) -> str:
    nickname = str(employee_row.get("nickname") or "").strip()
    if nickname:
        return nickname

    full_name = str(employee_row.get("full_name") or "").strip()
    if full_name:
        parts = re.split(r"[\s()]+", full_name)
        for part in parts:
            normalized = str(part).strip()
            if normalized:
                return normalized

    return str(employee_row.get("username") or "").strip()


def _normalize_employee_key(name: str, employee_id: Any) -> str:
    normalized = "".join(ch for ch in str(name or "").lower() if ch.isalnum())
    if normalized:
        return normalized
    return f"id_{employee_id}"


def get_public_employees(language: str = "ru") -> List[Dict[str, Any]]:
    lang_key = validate_language(language)
    cache_key = f"integration_public_employees_{lang_key}"
    cached_data = cache.get(cache_key)
    if isinstance(cached_data, list):
        return cached_data

    user_columns = set(_get_table_columns("users"))
    selected_columns = [
        "id",
        "username",
        "full_name",
        "position",
        "bio",
        "specialization",
        "photo",
        "photo_url",
        "experience",
        "years_of_experience",
        "birthday",
        "sort_order",
        "nickname",
    ]
    select_clause = ",\n                ".join(
        _build_user_column_expression(user_columns, column_name)
        for column_name in selected_columns
    )

    filters = _build_user_filters(
        user_columns,
        include_public_visibility=True,
        table_alias="u",
    )
    where_clause = ""
    if filters:
        where_clause = "WHERE " + " AND ".join(filters)

    order_parts: List[str] = []
    if "sort_order" in user_columns:
        order_parts.append("u.sort_order ASC NULLS LAST")
    if "full_name" in user_columns:
        order_parts.append("u.full_name ASC NULLS LAST")
    order_parts.append("u.id ASC")

    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute(
            f"""
            SELECT
                {select_clause}
            FROM users u
            {where_clause}
            ORDER BY {", ".join(order_parts)}
            """
        )
        rows = c.fetchall() or []
        description = c.description or []
        result_columns = [item[0] for item in description]

        service_ids_by_user: Dict[int, List[int]] = {}
        try:
            c.execute(
                """
                SELECT user_id, array_agg(service_id ORDER BY service_id)
                FROM user_services
                GROUP BY user_id
                """
            )
            service_ids_by_user = {
                int(row[0]): [int(service_id) for service_id in (row[1] or [])]
                for row in (c.fetchall() or [])
                if row and row[0] is not None
            }
        except Exception as error:
            log_error(f"Integration employees service map failed: {error}", "integration")
            service_ids_by_user = {}
    finally:
        conn.close()

    unique_employees: Dict[str, Dict[str, Any]] = {}
    for row in rows:
        employee_row = dict(zip(result_columns, row))
        employee_id = employee_row.get("id")
        if employee_id is None:
            continue

        display_name = _extract_display_name(employee_row)
        localized_name = (
            get_localized_name(employee_id, display_name, language=lang_key)
            if display_name
            else ""
        )
        raw_position = str(employee_row.get("position") or "").strip()
        localized_position = translate_position(raw_position, lang_key) if raw_position else ""
        bio = get_dynamic_translation(
            "users",
            employee_id,
            "bio",
            lang_key,
            str(employee_row.get("bio") or ""),
        )
        specialization = get_dynamic_translation(
            "users",
            employee_id,
            "specialization",
            lang_key,
            str(employee_row.get("specialization") or ""),
        )

        raw_photo = str(employee_row.get("photo") or employee_row.get("photo_url") or "").strip()
        normalized_photo = map_image_path(sanitize_url(raw_photo)) if raw_photo else ""
        final_photo = _add_v(normalized_photo) if normalized_photo else ""

        employee_item = {
            "id": int(employee_id),
            "username": employee_row.get("username"),
            "name": localized_name,
            "full_name": localized_name,
            "role": localized_position,
            "position": localized_position,
            "specialty": bio or specialization or "",
            "bio": bio or "",
            "specialization": specialization or "",
            "image": final_photo,
            "photo": final_photo,
            "experience": _format_experience(
                employee_row.get("years_of_experience"),
                employee_row.get("experience"),
                lang_key,
            ),
            "age": _calculate_age(employee_row.get("birthday")),
            "service_ids": service_ids_by_user.get(int(employee_id), []),
            "sort_order": int(employee_row.get("sort_order") or 0),
        }

        dedupe_key = _normalize_employee_key(localized_name, employee_id)
        existing = unique_employees.get(dedupe_key)
        if existing is None:
            unique_employees[dedupe_key] = employee_item
            continue

        employee_score = (
            (10 if employee_item["image"] else 0)
            + (5 if len(employee_item["specialty"]) > 20 else 0)
            + len(employee_item["service_ids"])
        )
        existing_score = (
            (10 if existing["image"] else 0)
            + (5 if len(existing["specialty"]) > 20 else 0)
            + len(existing["service_ids"])
        )
        if employee_score > existing_score:
            employee_item["sort_order"] = min(employee_item["sort_order"], existing["sort_order"])
            unique_employees[dedupe_key] = employee_item
        else:
            existing["sort_order"] = min(existing["sort_order"], employee_item["sort_order"])

    employees = sorted(
        unique_employees.values(),
        key=lambda item: (int(item.get("sort_order") or 0), str(item.get("name") or "").lower()),
    )
    cache.set(cache_key, employees, expire=CACHE_TTL_SHORT)
    return employees


def get_public_services(language: str = "ru") -> List[Dict[str, Any]]:
    lang_key = validate_language(language)
    cache_key = f"integration_public_services_{lang_key}"
    cached_data = cache.get(cache_key)
    if isinstance(cached_data, list):
        return cached_data

    services = get_all_services(active_only=True, include_positions=True)
    results: List[Dict[str, Any]] = []
    for service_item in services:
        service_id = service_item.get("id")
        localized_name = get_dynamic_translation(
            "services",
            service_id,
            "name",
            lang_key,
            str(service_item.get("name") or ""),
        )
        localized_description = get_dynamic_translation(
            "services",
            service_id,
            "description",
            lang_key,
            str(service_item.get("description") or ""),
        )

        raw_category = str(service_item.get("category") or "").strip()
        localized_category = ""
        canonical_category_key = _canonical_category_key(raw_category)
        if canonical_category_key:
            localized_category = get_dynamic_translation(
                "categories",
                canonical_category_key,
                "",
                lang_key,
                "",
            )
            if not localized_category and "_" in canonical_category_key:
                localized_category = get_dynamic_translation(
                    "categories",
                    canonical_category_key.replace("_", "-"),
                    "",
                    lang_key,
                    "",
                )
        if not localized_category and raw_category:
            localized_category = get_dynamic_translation(
                "categories",
                raw_category,
                "",
                lang_key,
                raw_category,
            )

        results.append(
            {
                "id": service_id,
                "name": localized_name,
                "description": localized_description,
                "price": service_item.get("price"),
                "currency": service_item.get("currency"),
                "category": localized_category or raw_category,
                "duration": service_item.get("duration"),
                "service_key": service_item.get("service_key"),
                "positions": service_item.get("positions") if isinstance(service_item.get("positions"), list) else [],
            }
        )

    cache.set(cache_key, results, expire=CACHE_TTL_MEDIUM)
    return results


def _normalize_service_ids(service_ids: List[Any]) -> List[int]:
    normalized_ids: List[int] = []
    seen_ids: set[int] = set()
    for raw_value in service_ids:
        try:
            service_id = int(raw_value)
        except Exception:
            continue
        if service_id <= 0 or service_id in seen_ids:
            continue
        seen_ids.add(service_id)
        normalized_ids.append(service_id)
    return normalized_ids


def create_public_booking(data: BookingCreate, background_tasks: BackgroundTasks):
    from services.master_schedule import MasterScheduleService
    from .bookings import process_booking_background_tasks

    requested_service_ids = _normalize_service_ids(data.service_ids)
    if len(requested_service_ids) == 0:
        raise HTTPException(status_code=400, detail="No valid service IDs provided")

    datetime_str = f"{data.date} {data.time}"
    services_str = ""
    total_duration_minutes = 60
    selected_master_id: Optional[int] = None
    user_columns = set(_get_table_columns("users"))

    try:
        conn = get_db_connection()
        c = conn.cursor()
        try:
            c.execute(
                """
                SELECT id, name, duration
                FROM services
                WHERE id = ANY(%s)
                  AND is_active = TRUE
                """,
                (requested_service_ids,),
            )
            service_rows = c.fetchall() or []
            services_by_id = {
                int(row[0]): row
                for row in service_rows
                if row and row[0] is not None
            }

            service_names: List[str] = []
            total_duration_minutes = 0
            for service_id in requested_service_ids:
                service_row = services_by_id.get(service_id)
                if service_row is None:
                    continue
                service_names.append(str(service_row[1]))
                parsed_duration = parse_duration_to_minutes(service_row[2])
                total_duration_minutes += parsed_duration if parsed_duration and parsed_duration > 0 else 60

            if len(service_names) == 0:
                raise HTTPException(status_code=400, detail="No active services found for booking")

            services_str = ", ".join(service_names)
            total_duration_minutes = max(1, total_duration_minutes)

            candidate_master_ids: List[int] = []
            if data.employee_id is not None:
                master_filters = _build_user_filters(
                    user_columns,
                    include_public_visibility=False,
                    table_alias="u",
                )
                master_filters.append("u.id = %s")
                c.execute(
                    f"""
                    SELECT u.id
                    FROM users u
                    WHERE {" AND ".join(master_filters)}
                    LIMIT 1
                    """,
                    (data.employee_id,),
                )
                employee_row = c.fetchone()
                if not employee_row:
                    raise ValueError("slot_unavailable:master_not_found")

                c.execute(
                    """
                    SELECT user_id
                    FROM user_services
                    WHERE user_id = %s
                      AND service_id = ANY(%s)
                    GROUP BY user_id
                    HAVING COUNT(DISTINCT service_id) = %s
                    """,
                    (int(employee_row[0]), requested_service_ids, len(requested_service_ids)),
                )
                if not c.fetchone():
                    raise ValueError("slot_unavailable:master_services_mismatch")

                candidate_master_ids = [int(employee_row[0])]
            else:
                provider_filters = _build_user_filters(
                    user_columns,
                    include_public_visibility=True,
                    table_alias="u",
                )
                if len(provider_filters) == 0:
                    provider_filters = ["TRUE"]
                c.execute(
                    f"""
                    SELECT u.id
                    FROM users u
                    INNER JOIN user_services us ON us.user_id = u.id
                    WHERE {" AND ".join(provider_filters)}
                      AND us.service_id = ANY(%s)
                    GROUP BY u.id{", u.sort_order" if "sort_order" in user_columns else ""}{", u.full_name" if "full_name" in user_columns else ""}
                    HAVING COUNT(DISTINCT us.service_id) = %s
                    ORDER BY
                        {"u.sort_order ASC NULLS LAST," if "sort_order" in user_columns else ""}
                        {"u.full_name ASC NULLS LAST," if "full_name" in user_columns else ""}
                        u.id ASC
                    """,
                    (requested_service_ids, len(requested_service_ids)),
                )
                candidate_master_ids = [
                    int(row[0])
                    for row in (c.fetchall() or [])
                    if row and row[0] is not None
                ]
                if len(candidate_master_ids) == 0:
                    raise ValueError("slot_unavailable:no_master_for_services")

            schedule_service = MasterScheduleService()
            last_reason = "unavailable"
            for master_id in candidate_master_ids:
                availability = schedule_service.validate_slot(
                    master_name=str(master_id),
                    date=data.date,
                    time_str=data.time,
                    duration_minutes=total_duration_minutes,
                )
                if availability.get("is_available"):
                    selected_master_id = master_id
                    break
                reason = availability.get("reason")
                if isinstance(reason, str) and reason.strip():
                    last_reason = reason.strip()

            if selected_master_id is None:
                if data.employee_id is not None:
                    raise ValueError(f"slot_unavailable:{last_reason}")
                raise ValueError("slot_unavailable:no_master_available")
        finally:
            conn.close()

        source_value = str(data.source or "website").strip() or "website"
        instagram_id = str(data.phone).strip()
        booking_id = save_booking(
            instagram_id=instagram_id,
            service=services_str,
            datetime_str=datetime_str,
            phone=data.phone,
            name=data.name,
            master=str(selected_master_id),
            status="pending_confirmation",
            source=source_value,
            duration_minutes=total_duration_minutes,
        )

        try:
            update_client_info(instagram_id, phone=data.phone, name=data.name)
        except Exception as error:
            log_error(f"Integration booking client update failed: {error}", "integration")

        background_payload = {
            "instagram_id": instagram_id,
            "service": services_str,
            "date": data.date,
            "time": data.time,
            "phone": data.phone,
            "name": data.name,
            "master": str(selected_master_id),
            "source": source_value,
        }
        if data.email:
            background_payload["email"] = data.email
        if data.notes:
            background_payload["notes"] = data.notes

        background_tasks.add_task(
            process_booking_background_tasks,
            booking_id,
            background_payload,
            "integration",
        )

        cache.clear_by_pattern("dashboard_*")
        cache.clear_by_pattern("funnel_*")
        cache.clear_by_pattern("integration_public_*")

        log_info(
            f"📅 New integration booking: {data.name} ({data.phone}) - Services: {services_str}",
            "integration",
        )
        return {
            "success": True,
            "booking_id": booking_id,
            "message": "Booking request received",
        }
    except ValueError as error:
        message = str(error)
        if message.startswith("slot_unavailable:"):
            reason = message.split(":", 1)[1] or "unavailable"
            return JSONResponse(
                {
                    "error": "slot_unavailable",
                    "reason": reason,
                },
                status_code=409,
            )
        raise HTTPException(status_code=400, detail=message)
    except HTTPException:
        raise
    except Exception as error:
        log_error(f"Integration booking creation failed: {error}", "integration")
        raise HTTPException(status_code=500, detail=str(error))


def _env_flag(name: str, default: bool = False) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def _is_integration_enabled() -> bool:
    return _env_flag("CRM_INTEGRATION_ENABLED", default=True)


def _get_integration_token() -> Optional[str]:
    token = str(os.getenv("CRM_INTEGRATION_TOKEN", "")).strip()
    return token or None


def _require_integration_access(x_integration_token: Optional[str]) -> None:
    if not _is_integration_enabled():
        raise HTTPException(
            status_code=503,
            detail="crm_integration_disabled",
        )

    expected_token = _get_integration_token()
    if expected_token is None:
        raise HTTPException(
            status_code=503,
            detail="crm_integration_token_not_configured",
        )

    provided_token = str(x_integration_token or "").strip()
    if not provided_token or not secrets.compare_digest(provided_token, expected_token):
        raise HTTPException(
            status_code=401,
            detail="invalid_integration_token",
        )


@router.get("/health")
def integration_health(
    x_integration_token: Optional[str] = Header(default=None, alias="X-Integration-Token"),
):
    _require_integration_access(x_integration_token)
    return {
        "success": True,
        "service": "crm-integration",
        "version": "v1",
        "timestamp": datetime.utcnow().isoformat() + "Z",
    }


@router.get("/services")
def integration_services(
    language: str = Query("ru"),
    x_integration_token: Optional[str] = Header(default=None, alias="X-Integration-Token"),
):
    _require_integration_access(x_integration_token)

    services = get_public_services(language=language)
    return {
        "success": True,
        "services": services,
        "source": "crm",
        "version": "v1",
    }


@router.get("/employees")
def integration_employees(
    language: str = Query("ru"),
    x_integration_token: Optional[str] = Header(default=None, alias="X-Integration-Token"),
):
    _require_integration_access(x_integration_token)

    employees = get_public_employees(language=language)
    return {
        "success": True,
        "employees": employees,
        "source": "crm",
        "version": "v1",
    }


@router.post("/bookings")
def integration_bookings(
    data: BookingCreate,
    background_tasks: BackgroundTasks,
    x_integration_token: Optional[str] = Header(default=None, alias="X-Integration-Token"),
):
    _require_integration_access(x_integration_token)

    result = create_public_booking(data, background_tasks)

    if isinstance(result, JSONResponse):
        return result

    if isinstance(result, dict):
        enriched = dict(result)
        enriched.setdefault("source", "crm")
        enriched.setdefault("version", "v1")
        return enriched

    return {
        "success": True,
        "source": "crm",
        "version": "v1",
    }
