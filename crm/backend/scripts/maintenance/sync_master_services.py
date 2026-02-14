#!/usr/bin/env python3
"""
SSOT-синхронизация услуг мастеров и их online-флагов.

Что делает:
1) Удаляет тестовые услуги и их назначения.
2) Применяет матрицу назначений для сотрудников (по service_key).
3) Держит длительность только в services.duration (user_services.duration = NULL).
4) Проверяет, остались ли активные услуги без назначенного мастера.
"""

import os
import re
import sys
from typing import Any, Dict, List, Optional, Set, Tuple


BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)


from db.connection import get_db_connection
from utils.logger import log_error, log_info, log_warning


TEST_MARKERS = ("test", "тест")

# SSOT матрица по сотрудникам:
# key: username -> value: {service_key: is_online_booking_enabled}
STAFF_SERVICE_ONLINE_MATRIX: Dict[str, Dict[str, bool]] = {
    # Симо (sabri): hair-only matrix with explicit online flags.
    "sabri": {
        "kids_cut": True,
        "blowdry_short": True,
        "blowdry_medium": True,
        "blowdry_long": True,
        "roots_color": True,
        "one_tone_short": True,
        "one_tone_medium": True,
        "one_tone_long": True,
        "complex_color": True,
        "hair_wash": False,
        "hair_trim": False,
        "hair_cut_wash": False,
        "hair_cut_full": False,
        "express_hair_form": False,
        "bangs_cut": False,
        "toning": False,
        "total_blonde": False,
        "styling_short": False,
        "styling_medium": False,
        "styling_long": False,
        "evening_hairstyle": False,
    },
    # Ляззат (lyazat): nails matrix.
    "lyazat": {
        "manicure_combined": True,
        "pedicure_smart": True,
        "manicure_pil_classic": True,
        "pedicure_smart_polish": True,
        "manicure_gel_polish": True,
        "pedicure_gel": True,
        "overlay_biogel": True,
        "remove_classic": True,
        "remove_gel": True,
        "change_gel_pedicure": True,
        "change_classic_pedicure": True,
        "japanese_manicure": True,
        "remove_extensions": True,
        "french_polish": False,
        "repair_extension": False,
        "repair_gel": False,
        "nail_extensions": False,
        "nail_correction": False,
        "nail_shaping": False,
    },
    # Гуля (gulcehre): nails + waxing matrix.
    "gulcehre": {
        "manicure_combined": True,
        "pedicure_smart": True,
        "manicure_pil_classic": True,
        "pedicure_smart_polish": True,
        "manicure_gel_polish": True,
        "pedicure_gel": True,
        "overlay_biogel": True,
        "remove_classic": True,
        "remove_gel": True,
        "change_gel_pedicure": True,
        "change_classic_pedicure": True,
        "japanese_manicure": True,
        "remove_extensions": True,
        "full_legs": True,
        "half_legs": True,
        "full_arms": True,
        "half_arms": True,
        "full_body_wax": True,
        "bikini_line": True,
        "full_face_wax": True,
        "cheeks_wax": True,
        "upper_lip_wax": True,
        "chin_wax": True,
        "french_polish": False,
        "repair_extension": False,
        "repair_gel": False,
        "nail_extensions": False,
        "nail_correction": False,
        "nail_shaping": False,
        "underarms": False,
        "full_bikini": False,
    },
}

# Канонические длительности для спорных услуг из последней бизнес-матрицы.
# SSOT хранения длительности остается в services.duration.
CANONICAL_DURATION_OVERRIDES: Dict[str, int] = {
    "kids_cut": 50,
    "remove_classic": 60,
    "remove_gel": 60,
}


def _parse_duration_to_minutes(raw_duration: Any) -> Optional[int]:
    if raw_duration is None:
        return None

    if isinstance(raw_duration, (int, float)):
        minutes = int(raw_duration)
        return minutes if minutes > 0 else None

    text = str(raw_duration).strip().lower()
    if not text:
        return None

    hours = 0
    minutes = 0

    hours_match = re.search(r"(\d+)\s*(h|hr|hour|ч)", text)
    minutes_match = re.search(r"(\d+)\s*(m|min|minute|м)", text)

    if hours_match:
        hours = int(hours_match.group(1))
    if minutes_match:
        minutes = int(minutes_match.group(1))

    if hours > 0 or minutes > 0:
        return (hours * 60) + minutes

    number_matches = re.findall(r"\d+", text)
    if not number_matches:
        return None

    # For ranges like "30-50m" take the lower bound.
    first_number = int(number_matches[0])
    return first_number if first_number > 0 else None


def _fetch_active_services(cursor) -> List[Dict[str, Any]]:
    cursor.execute(
        """
        SELECT
            id,
            service_key,
            name,
            category,
            price,
            min_price,
            max_price,
            duration
        FROM services
        WHERE is_active = TRUE
        ORDER BY id ASC
        """
    )
    columns = [desc[0] for desc in cursor.description]
    services: List[Dict[str, Any]] = []
    for row in cursor.fetchall():
        item = dict(zip(columns, row))
        item["duration_minutes"] = _parse_duration_to_minutes(item.get("duration"))
        services.append(item)
    return services


def _is_test_service(service: Dict[str, Any]) -> bool:
    service_key = str(service.get("service_key") or "").lower()
    service_name = str(service.get("name") or "").lower()
    return any(marker in service_key or marker in service_name for marker in TEST_MARKERS)


def _cleanup_test_services(cursor) -> Tuple[int, int]:
    services = _fetch_active_services(cursor)
    test_service_ids = [int(service["id"]) for service in services if _is_test_service(service)]
    if not test_service_ids:
        log_info("✅ Тестовые услуги не найдены", "sync_master_services")
        return 0, 0

    cursor.execute("DELETE FROM user_services WHERE service_id = ANY(%s)", (test_service_ids,))
    removed_links = cursor.rowcount

    cursor.execute("DELETE FROM services WHERE id = ANY(%s)", (test_service_ids,))
    removed_services = cursor.rowcount

    log_info(
        f"✅ Удалены тестовые услуги: services={removed_services}, user_services_links={removed_links}",
        "sync_master_services",
    )
    return removed_links, removed_services


def _fetch_staff_ids(cursor) -> Dict[str, int]:
    usernames = sorted(STAFF_SERVICE_ONLINE_MATRIX.keys())
    cursor.execute(
        """
        SELECT id, username
        FROM users
        WHERE username = ANY(%s)
          AND is_active = TRUE
          AND is_service_provider = TRUE
        """,
        (usernames,),
    )
    return {row[1]: int(row[0]) for row in cursor.fetchall()}


def _clear_user_service_duration_overrides(cursor) -> int:
    cursor.execute("UPDATE user_services SET duration = NULL WHERE duration IS NOT NULL")
    cleared = cursor.rowcount
    if cleared > 0:
        log_info(
            f"✅ Очищены legacy duration overrides в user_services: {cleared}",
            "sync_master_services",
        )
    return cleared


def _apply_duration_ssot(
    cursor,
    services_by_key: Dict[str, Dict[str, Any]],
) -> int:
    updated = 0
    for service_key, target_duration in CANONICAL_DURATION_OVERRIDES.items():
        service = services_by_key.get(service_key)
        if not service:
            log_warning(f"⚠️ service_key не найден для duration SSOT: {service_key}", "sync_master_services")
            continue

        current_duration = service.get("duration_minutes")
        if current_duration == target_duration:
            continue

        cursor.execute(
            """
            UPDATE services
            SET duration = %s
            WHERE id = %s
            """,
            (str(target_duration), int(service["id"])),
        )
        if cursor.rowcount > 0:
            updated += 1
            service["duration"] = str(target_duration)
            service["duration_minutes"] = target_duration

    if updated > 0:
        log_info(f"✅ Обновлены канонические длительности услуг: {updated}", "sync_master_services")
    return updated


def _build_target_service_map(
    services: List[Dict[str, Any]],
) -> Tuple[Dict[str, Dict[int, bool]], Dict[int, Dict[str, Any]]]:
    services_by_id: Dict[int, Dict[str, Any]] = {}
    services_by_key: Dict[str, Dict[str, Any]] = {}
    for service in services:
        service_id = int(service["id"])
        service_key = str(service.get("service_key") or "").strip()
        services_by_id[service_id] = service
        if service_key:
            services_by_key[service_key] = service

    target_by_username: Dict[str, Dict[int, bool]] = {}
    missing_service_keys: Set[str] = set()

    for username, service_map in STAFF_SERVICE_ONLINE_MATRIX.items():
        target_by_username[username] = {}
        for service_key, is_online_enabled in service_map.items():
            service = services_by_key.get(service_key)
            if not service:
                missing_service_keys.add(service_key)
                continue
            if _is_test_service(service):
                continue
            target_by_username[username][int(service["id"])] = bool(is_online_enabled)

    for missing_key in sorted(missing_service_keys):
        log_warning(f"⚠️ service_key из матрицы не найден в services: {missing_key}", "sync_master_services")

    return target_by_username, services_by_id


def _sync_staff_services(
    cursor,
    staff_ids: Dict[str, int],
    target_by_username: Dict[str, Dict[int, bool]],
    services_by_id: Dict[int, Dict[str, Any]],
) -> Tuple[int, int, int]:
    added_links = 0
    removed_links = 0
    updated_links = 0

    for username, user_id in staff_ids.items():
        target_by_service_id = target_by_username.get(username, {})
        target_ids = set(target_by_service_id.keys())

        cursor.execute("SELECT service_id FROM user_services WHERE user_id = %s", (user_id,))
        current_ids = {int(row[0]) for row in cursor.fetchall()}

        to_remove = sorted(current_ids - target_ids)
        if to_remove:
            cursor.execute(
                "DELETE FROM user_services WHERE user_id = %s AND service_id = ANY(%s)",
                (user_id, to_remove),
            )
            removed_links += cursor.rowcount

        for service_id in sorted(target_ids):
            service = services_by_id.get(service_id)
            if not service:
                continue

            is_online_enabled = bool(target_by_service_id.get(service_id, False))
            default_price = service.get("price")
            default_min_price = service.get("min_price") if service.get("min_price") is not None else default_price
            default_max_price = service.get("max_price") if service.get("max_price") is not None else default_price

            cursor.execute(
                """
                INSERT INTO user_services (
                    user_id,
                    service_id,
                    price,
                    price_min,
                    price_max,
                    duration,
                    is_online_booking_enabled,
                    is_calendar_enabled
                )
                VALUES (%s, %s, %s, %s, %s, NULL, %s, TRUE)
                ON CONFLICT (user_id, service_id) DO UPDATE SET
                    price = EXCLUDED.price,
                    price_min = EXCLUDED.price_min,
                    price_max = EXCLUDED.price_max,
                    duration = NULL,
                    is_online_booking_enabled = EXCLUDED.is_online_booking_enabled,
                    is_calendar_enabled = TRUE
                """,
                (
                    user_id,
                    service_id,
                    default_price,
                    default_min_price,
                    default_max_price,
                    is_online_enabled,
                ),
            )

            if service_id in current_ids:
                updated_links += 1
            else:
                added_links += 1

        enabled_count = sum(1 for value in target_by_service_id.values() if value)
        disabled_count = len(target_by_service_id) - enabled_count
        log_info(
            (
                f"👤 {username}: target={len(target_by_service_id)}, "
                f"online_on={enabled_count}, online_off={disabled_count}, "
                f"add={len(target_ids - current_ids)}, remove={len(to_remove)}"
            ),
            "sync_master_services",
        )

    return added_links, removed_links, updated_links


def _count_services_without_masters(cursor) -> int:
    cursor.execute(
        """
        SELECT COUNT(*)
        FROM services s
        WHERE s.is_active = TRUE
          AND LOWER(COALESCE(s.service_key, '')) NOT LIKE '%test%'
          AND LOWER(COALESCE(s.name, '')) NOT LIKE '%test%'
          AND LOWER(COALESCE(s.name, '')) NOT LIKE '%тест%'
          AND NOT EXISTS (
              SELECT 1
              FROM user_services us
              JOIN users u ON u.id = us.user_id
              WHERE us.service_id = s.id
                AND u.is_active = TRUE
                AND u.is_service_provider = TRUE
                AND u.role NOT IN ('director', 'admin', 'manager')
          )
        """
    )
    return int(cursor.fetchone()[0] or 0)


def run_sync_master_services() -> bool:
    print()
    print("=" * 80)
    print("🔄 СИНХРОНИЗАЦИЯ НАЗНАЧЕНИЙ УСЛУГ МАСТЕРАМ (SSOT)")
    print("=" * 80)
    print()

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        removed_test_links, removed_test_services = _cleanup_test_services(cursor)
        cleared_duration_overrides = _clear_user_service_duration_overrides(cursor)

        services = _fetch_active_services(cursor)
        services_by_key = {
            str(service.get("service_key") or "").strip(): service
            for service in services
            if str(service.get("service_key") or "").strip()
        }

        duration_updates = _apply_duration_ssot(cursor, services_by_key)

        services = _fetch_active_services(cursor)
        target_by_username, services_by_id = _build_target_service_map(services)

        staff_ids = _fetch_staff_ids(cursor)
        missing_staff = sorted(set(STAFF_SERVICE_ONLINE_MATRIX.keys()) - set(staff_ids.keys()))
        for username in missing_staff:
            log_warning(f"⚠️ Сотрудник не найден или неактивен: {username}", "sync_master_services")

        added_links, removed_links, updated_links = _sync_staff_services(
            cursor=cursor,
            staff_ids=staff_ids,
            target_by_username=target_by_username,
            services_by_id=services_by_id,
        )

        remaining_without_masters = _count_services_without_masters(cursor)
        conn.commit()

        print("=" * 80)
        print("📊 ИТОГОВЫЙ ОТЧЕТ")
        print("=" * 80)
        print(f"   Удалено тестовых услуг: {removed_test_services}")
        print(f"   Удалено тестовых привязок: {removed_test_links}")
        print(f"   Очищено duration overrides в user_services: {cleared_duration_overrides}")
        print(f"   Обновлено длительностей (services.duration): {duration_updates}")
        print(f"   Добавлено привязок: {added_links}")
        print(f"   Удалено лишних привязок: {removed_links}")
        print(f"   Обновлено существующих привязок: {updated_links}")
        print(f"   Услуг без мастеров: {remaining_without_masters}")
        print("=" * 80)
        print()

        if remaining_without_masters > 0:
            log_warning(
                f"⚠️ После синхронизации осталось услуг без мастеров: {remaining_without_masters}",
                "sync_master_services",
            )
        else:
            log_info("✅ Все активные услуги назначены мастерам", "sync_master_services")

        return True

    except Exception as exc:
        conn.rollback()
        log_error(f"❌ Критическая ошибка: {exc}", "sync_master_services")
        raise
    finally:
        conn.close()


def main():
    run_sync_master_services()


if __name__ == "__main__":
    main()
