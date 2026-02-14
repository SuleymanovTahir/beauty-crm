import json
import os
import re
import sys
import urllib.parse
from pathlib import Path

BACKEND_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if BACKEND_ROOT not in sys.path:
    sys.path.insert(0, BACKEND_ROOT)

from db.connection import get_db_connection
from utils.logger import log_info, log_error
from utils.utils import map_image_path


IMAGE_EXTENSIONS = {".webp", ".jpg", ".jpeg", ".png", ".avif"}


def _project_root() -> Path:
    return Path(__file__).resolve().parents[3]


def _load_locale_items(relative_path: str):
    file_path = _project_root() / relative_path
    if not file_path.exists():
        log_error(f"❌ Locale seed file not found: {file_path}", "maintenance")
        return []

    try:
        with open(file_path, "r", encoding="utf-8") as file:
            payload = json.load(file)
            items = payload.get("items", [])
            return items if isinstance(items, list) else []
    except Exception as exc:
        log_error(f"❌ Failed to parse locale seed file {file_path}: {exc}", "maintenance")
        return []


def _normalize_text(value: str) -> str:
    raw_value = (value or "").lower().strip()
    if not raw_value:
        return ""
    clean_value = re.sub(r"[^\w\sа-яё]", " ", raw_value, flags=re.IGNORECASE)
    return re.sub(r"\s+", " ", clean_value).strip()


def _iter_image_files(directory: Path):
    if not directory.exists() or not directory.is_dir():
        return []

    files = []
    for file_path in sorted(directory.iterdir(), key=lambda p: p.name.lower()):
        if not file_path.is_file():
            continue
        if file_path.name.startswith("."):
            continue
        if file_path.suffix.lower() not in IMAGE_EXTENSIONS:
            continue
        files.append(file_path)
    return files


def _humanize_filename(file_name: str, fallback: str) -> str:
    stem = Path(file_name).stem.replace("_", " ").replace("-", " ").strip()
    stem = re.sub(r"\s+", " ", stem)
    if not stem:
        return fallback
    if stem.islower():
        return stem.capitalize()
    return stem


def _gallery_dedupe_key(category: str, image_url: str) -> str:
    mapped_url = map_image_path(image_url or "") or (image_url or "")
    decoded_path = urllib.parse.unquote(mapped_url)
    stem = Path(decoded_path).stem.lower()
    stem = stem.replace("_", " ").replace("-", " ")
    stem = re.sub(r"\s+", " ", stem).strip()
    compact_stem = re.sub(r"[^0-9a-zа-яё]", "", stem, flags=re.IGNORECASE)
    if compact_stem:
        return f"{category}:{compact_stem}"
    return f"{category}:{mapped_url.lower().strip()}"


def _collect_gallery_candidates():
    root = _project_root()
    source_config = {
        "salon": [
            (root / "frontend/public_landing/styles/img/salon", "/landing-images/salon"),
        ],
        "portfolio": [
            (root / "frontend/public_landing/styles/img/portfolio", "/landing-images/portfolio"),
        ],
    }

    defaults = {
        "salon": ("Фото салона", "Интерьер салона"),
        "portfolio": ("Портфолио", "Работы салона"),
    }

    seen_keys = set()
    candidates = {category: [] for category in source_config.keys()}

    for category, sources in source_config.items():
        default_title, default_description = defaults[category]
        for directory, url_prefix in sources:
            for file_path in _iter_image_files(directory):
                raw_url = f"{url_prefix}/{file_path.name}"
                key = _gallery_dedupe_key(category, raw_url)
                if key in seen_keys:
                    continue

                seen_keys.add(key)
                public_url = map_image_path(raw_url) or raw_url
                candidates[category].append({
                    "key": key,
                    "category": category,
                    "image_url": public_url,
                    "title": _humanize_filename(file_path.name, default_title),
                    "description": default_description,
                })

    return candidates


def _sync_gallery_from_folders(cursor):
    candidates_by_category = _collect_gallery_candidates()
    categories_to_sync = [cat for cat, items in candidates_by_category.items() if items]
    if not categories_to_sync:
        log_info("   ⚠️ Gallery sync skipped: source folders are empty", "maintenance")
        return 0

    candidate_by_key = {}
    ordered_keys = []
    for category in categories_to_sync:
        for item in candidates_by_category[category]:
            candidate_by_key[item["key"]] = item
            ordered_keys.append(item["key"])

    candidate_keys = set(candidate_by_key.keys())
    cursor.execute(
        """
            SELECT id, image_url, title, description, category, display_order, is_active
            FROM public_gallery
            WHERE category = ANY(%s)
            ORDER BY category ASC, is_active DESC, display_order ASC, id ASC
        """,
        (categories_to_sync,),
    )
    existing_rows = cursor.fetchall()

    keep_by_key = {}
    ids_to_delete = []

    for row in existing_rows:
        row_id, image_url, _, _, category, _, _ = row
        key = _gallery_dedupe_key(category, image_url or "")
        if key not in candidate_keys:
            ids_to_delete.append(row_id)
            continue
        if key in keep_by_key:
            ids_to_delete.append(row_id)
            continue
        keep_by_key[key] = row

    deleted = 0
    if ids_to_delete:
        cursor.execute("DELETE FROM public_gallery WHERE id = ANY(%s)", (ids_to_delete,))
        deleted = len(ids_to_delete)

    display_order_by_category = {category: 0 for category in categories_to_sync}
    inserted = 0
    updated = 0

    for key in ordered_keys:
        item = candidate_by_key[key]
        category = item["category"]
        display_order_by_category[category] += 1
        target_order = display_order_by_category[category]

        existing_row = keep_by_key.get(key)
        if existing_row:
            row_id, image_url, title, description, _, current_order, is_active = existing_row
            if (
                (image_url or "") != item["image_url"]
                or (title or "") != item["title"]
                or (description or "") != item["description"]
                or (current_order or 0) != target_order
                or is_active is not True
            ):
                cursor.execute(
                    """
                        UPDATE public_gallery
                        SET image_url = %s,
                            title = %s,
                            description = %s,
                            display_order = %s,
                            is_active = TRUE
                        WHERE id = %s
                    """,
                    (
                        item["image_url"],
                        item["title"],
                        item["description"],
                        target_order,
                        row_id,
                    ),
                )
                updated += 1
            continue

        cursor.execute(
            """
                INSERT INTO public_gallery (
                    image_url, title, description, category, display_order, is_active
                )
                VALUES (%s, %s, %s, %s, %s, TRUE)
            """,
            (
                item["image_url"],
                item["title"],
                item["description"],
                category,
                target_order,
            ),
        )
        inserted += 1

    if inserted or updated or deleted:
        log_info(
            f"   ✅ Gallery sync: inserted={inserted}, updated={updated}, deleted_duplicates={deleted}",
            "maintenance",
        )
    else:
        log_info("   ✅ Gallery sync: no changes", "maintenance")

    return inserted + updated + deleted


def _collect_banner_candidates():
    root = _project_root()
    banners_dir = root / "frontend/public_landing/styles/img/banners"
    files = _iter_image_files(banners_dir)
    if not files:
        return []

    candidates = []
    seen_urls = set()
    for index, file_path in enumerate(files, start=1):
        image_url = f"/landing-images/banners/{file_path.name}"
        normalized_url = image_url.strip().lower()
        if normalized_url in seen_urls:
            continue
        seen_urls.add(normalized_url)

        candidates.append(
            {
                "image_url": image_url,
                "title": "Салон красоты в Дубае" if index == 1 else _humanize_filename(file_path.name, "Баннер салона"),
                "subtitle": "Искусство преображения" if index == 1 else "",
                "display_order": len(candidates) + 1,
            }
        )
    return candidates


def _sync_banners_from_folder(cursor):
    candidates = _collect_banner_candidates()
    if not candidates:
        log_info("   ⚠️ Banner sync skipped: banners folder is empty", "maintenance")
        return 0

    cursor.execute(
        """
            SELECT id, image_url, title, subtitle, display_order, is_active
            FROM public_banners
            ORDER BY display_order ASC, id ASC
        """
    )
    existing_rows = cursor.fetchall()

    candidate_urls = {(item["image_url"] or "").strip().lower() for item in candidates}
    existing_by_url = {}
    ids_to_delete = []

    for row_id, image_url, title, subtitle, display_order, is_active in existing_rows:
        normalized_url = (image_url or "").strip().lower()
        if not normalized_url or normalized_url not in candidate_urls:
            ids_to_delete.append(row_id)
            continue
        if normalized_url in existing_by_url:
            ids_to_delete.append(row_id)
            continue
        existing_by_url[normalized_url] = (row_id, image_url, title, subtitle, display_order, is_active)

    deleted = 0
    if ids_to_delete:
        cursor.execute("DELETE FROM public_banners WHERE id = ANY(%s)", (ids_to_delete,))
        deleted = len(ids_to_delete)

    inserted = 0
    updated = 0
    for candidate in candidates:
        normalized_url = (candidate["image_url"] or "").strip().lower()
        existing = existing_by_url.get(normalized_url)
        if existing:
            row_id, image_url, title, subtitle, display_order, is_active = existing
            target_title = title if (title or "").strip() else candidate["title"]
            target_subtitle = subtitle if (subtitle or "").strip() else candidate["subtitle"]
            target_order = candidate["display_order"]
            if (
                (image_url or "") != candidate["image_url"]
                or (title or "") != target_title
                or (subtitle or "") != target_subtitle
                or (display_order or 0) != target_order
                or is_active is not True
            ):
                cursor.execute(
                    """
                        UPDATE public_banners
                        SET image_url = %s,
                            title = %s,
                            subtitle = %s,
                            display_order = %s,
                            is_active = TRUE
                        WHERE id = %s
                    """,
                    (candidate["image_url"], target_title, target_subtitle, target_order, row_id),
                )
                updated += 1
            continue

        cursor.execute(
            """
                INSERT INTO public_banners (image_url, title, subtitle, is_active, display_order)
                VALUES (%s, %s, %s, TRUE, %s)
            """,
            (candidate["image_url"], candidate["title"], candidate["subtitle"], candidate["display_order"]),
        )
        inserted += 1

    if inserted or updated or deleted:
        log_info(
            f"   ✅ Banner sync: inserted={inserted}, updated={updated}, deleted={deleted}",
            "maintenance",
        )
    else:
        log_info("   ✅ Banner sync: no changes", "maintenance")

    return inserted + updated + deleted


def _faq_group_key(question: str) -> str:
    normalized_question = _normalize_text(question)
    if not normalized_question:
        return ""

    if "запис" in normalized_question:
        return "booking"

    if "отмен" in normalized_question or "перенес" in normalized_question:
        return "reschedule"

    if "материал" in normalized_question or "бренд" in normalized_question:
        return "materials"

    if "где" in normalized_question and ("наход" in normalized_question or "адрес" in normalized_question):
        return "location"

    return ""


def _contains_hardcoded_brands(question: str, answer: str) -> bool:
    combined = _normalize_text(f"{question} {answer}")
    return "luxio" in combined or "fedua" in combined


def _cleanup_existing_public_reviews(cursor) -> int:
    cursor.execute(
        """
            SELECT id, author_name, text
            FROM public_reviews
            WHERE is_active = TRUE
            ORDER BY display_order ASC, id ASC
        """
    )
    rows = cursor.fetchall()
    if not rows:
        return 0

    ids_to_delete = []
    seen_authors = set()
    seen_texts = set()

    for row_id, author_name, review_text in rows:
        author_key = _normalize_text(author_name)
        text_key = _normalize_text(review_text)

        if text_key and text_key in seen_texts:
            ids_to_delete.append(row_id)
            continue

        if author_key and author_key in seen_authors:
            ids_to_delete.append(row_id)
            continue

        if author_key:
            seen_authors.add(author_key)
        if text_key:
            seen_texts.add(text_key)

    if not ids_to_delete:
        return 0

    cursor.execute("DELETE FROM public_reviews WHERE id = ANY(%s)", (ids_to_delete,))
    return len(ids_to_delete)


def _cleanup_existing_public_faq(cursor) -> int:
    cursor.execute(
        """
            SELECT id, question, answer
            FROM public_faq
            WHERE is_active = TRUE
            ORDER BY display_order ASC, id ASC
        """
    )
    rows = cursor.fetchall()
    if not rows:
        return 0

    ids_to_delete = []
    seen_questions = set()
    seen_groups = set()

    for row_id, question, answer in rows:
        question_key = _normalize_text(question)
        if not question_key:
            ids_to_delete.append(row_id)
            continue

        if _contains_hardcoded_brands(question, answer):
            ids_to_delete.append(row_id)
            continue

        if question_key in seen_questions:
            ids_to_delete.append(row_id)
            continue

        group_key = _faq_group_key(question)
        if group_key and group_key in seen_groups:
            ids_to_delete.append(row_id)
            continue

        seen_questions.add(question_key)
        if group_key:
            seen_groups.add(group_key)

    if not ids_to_delete:
        return 0

    cursor.execute("DELETE FROM public_faq WHERE id = ANY(%s)", (ids_to_delete,))
    return len(ids_to_delete)


def _seed_services_if_empty(cursor) -> int:
    cursor.execute("SELECT COUNT(*) FROM services WHERE is_active = TRUE")
    active_services = cursor.fetchone()[0]
    if active_services > 0:
        log_info(f"   ✅ Services already present: {active_services}", "maintenance")
        return 0

    from scripts.testing.data.seed_test_data import SERVICES_DATA

    inserted = 0
    for service in SERVICES_DATA:
        cursor.execute(
            """
                INSERT INTO services (
                    service_key, name, category, price, min_price, max_price,
                    currency, duration, description, is_active
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, TRUE)
                ON CONFLICT (service_key) DO NOTHING
            """,
            (
                service.get("key"),
                service.get("name"),
                service.get("category"),
                service.get("price"),
                service.get("min_price"),
                service.get("max_price"),
                service.get("currency", "AED"),
                service.get("duration"),
                service.get("description"),
            ),
        )
        if cursor.rowcount > 0:
            inserted += 1

    log_info(f"   ➕ Seeded services catalog: {inserted}", "maintenance")
    return inserted


def _normalize_core_service_names(cursor) -> int:
    """Keep critical service names consistent at source level (DB)."""
    updates = [
        ("repair_extension", "Коррекция 1 наращенного ногтя"),
        ("repair_gel", "Коррекция 1 гелевого ногтя"),
        ("peeling", "Пилинг"),
        ("nail_extensions", "Наращивание ногтей (гель)"),
    ]

    updated = 0
    for service_key, target_name in updates:
        cursor.execute(
            """
                UPDATE services
                SET name = %s
                WHERE service_key = %s
                  AND COALESCE(name, '') <> %s
            """,
            (target_name, service_key, target_name),
        )
        updated += cursor.rowcount

    legacy_renames = [
        ("Ремонт 1 наращивания", "Коррекция 1 наращенного ногтя"),
        ("Repair 1 Extension", "Коррекция 1 наращенного ногтя"),
        ("Ремонт 1 гелевого ногтей", "Коррекция 1 гелевого ногтя"),
        ("Ремонт 1 гелевого ногтя", "Коррекция 1 гелевого ногтя"),
        ("Repair 1 Gel Nail", "Коррекция 1 гелевого ногтя"),
        ("пилинг", "Пилинг"),
        ("Peeling", "Пилинг"),
        ("наращивание ногтей (гель)", "Наращивание ногтей (гель)"),
    ]

    for old_name, new_name in legacy_renames:
        cursor.execute(
            """
                UPDATE services
                SET name = %s
                WHERE name = %s
            """,
            (new_name, old_name),
        )
        updated += cursor.rowcount

    if updated > 0:
        log_info(f"   ✅ Normalized critical service names: {updated}", "maintenance")

    return updated


def _seed_gallery_if_empty(cursor) -> int:
    cursor.execute("SELECT COUNT(*) FROM public_gallery WHERE is_active = TRUE")
    active_gallery = cursor.fetchone()[0]
    if active_gallery > 0:
        log_info(f"   ✅ Public gallery already present: {active_gallery}", "maintenance")
        return 0

    gallery_items = [
        # Portfolio
        ("/landing-images/portfolio/Manicure.webp", "Маникюр", "Работа наших мастеров", "portfolio", 1),
        ("/landing-images/portfolio/Hair.webp", "Укладка волос", "Премиальная укладка", "portfolio", 2),
        ("/landing-images/portfolio/SPA3.webp", "SPA уход", "Релакс и восстановление", "portfolio", 3),
        ("/landing-images/portfolio/Permanent_lips.webp", "Перманентный макияж", "Естественный результат", "portfolio", 4),
        # Salon
        ("/landing-images/salon/1.webp", "Интерьер салона", "Комфортная атмосфера", "salon", 1),
        ("/landing-images/salon/2.webp", "Зона ожидания", "Уют и сервис", "salon", 2),
        ("/landing-images/salon/4.webp", "Рабочая зона", "Профессиональное оборудование", "salon", 3),
        ("/landing-images/salon/8.webp", "Пространство салона", "Премиальный дизайн", "salon", 4),
    ]

    inserted = 0
    for image_url, title, description, category, display_order in gallery_items:
        cursor.execute(
            """
                SELECT 1
                FROM public_gallery
                WHERE image_url = %s AND category = %s
                LIMIT 1
            """,
            (image_url, category),
        )
        if cursor.fetchone():
            continue

        cursor.execute(
            """
                INSERT INTO public_gallery (
                    image_url, title, description, category, display_order, is_active
                )
                VALUES (%s, %s, %s, %s, %s, TRUE)
            """,
            (image_url, title, description, category, display_order),
        )
        inserted += 1

    log_info(f"   ➕ Seeded gallery items: {inserted}", "maintenance")
    return inserted


def _seed_faq_if_empty(cursor) -> int:
    cursor.execute("SELECT COUNT(*) FROM public_faq WHERE is_active = TRUE")
    active_faq = cursor.fetchone()[0]
    if active_faq > 0:
        log_info(f"   ✅ FAQ already present: {active_faq}", "maintenance")
        return 0

    faq_items = _load_locale_items("frontend/src/locales/ru/public_landing/faq.json")
    if not faq_items:
        faq_items = [
            {
                "question": "Как записаться на процедуру?",
                "answer": "Вы можете записаться на сайте, по телефону или через WhatsApp.",
            },
            {
                "question": "Можно ли перенести запись?",
                "answer": "Да, запись можно перенести заранее, свяжитесь с администратором.",
            },
            {
                "question": "Какие способы оплаты доступны?",
                "answer": "Мы принимаем наличные и банковские карты.",
            },
        ]

    inserted = 0
    seen_questions = set()
    seen_groups = set()
    for index, item in enumerate(faq_items, start=1):
        question = (item.get("question") or "").strip()
        answer = (item.get("answer") or "").strip()
        if not question or not answer:
            continue

        if _contains_hardcoded_brands(question, answer):
            continue

        question_key = _normalize_text(question)
        if question_key in seen_questions:
            continue

        group_key = _faq_group_key(question)
        if group_key and group_key in seen_groups:
            continue

        cursor.execute(
            """
                INSERT INTO public_faq (
                    question, answer, category, display_order, is_active
                )
                VALUES (%s, %s, 'general', %s, TRUE)
            """,
            (question, answer, index),
        )
        seen_questions.add(question_key)
        if group_key:
            seen_groups.add(group_key)
        inserted += 1

    log_info(f"   ➕ Seeded FAQ items: {inserted}", "maintenance")
    return inserted


def _seed_reviews_if_empty(cursor) -> int:
    cursor.execute("SELECT COUNT(*) FROM public_reviews WHERE is_active = TRUE")
    active_reviews = cursor.fetchone()[0]
    if active_reviews > 0:
        log_info(f"   ✅ Reviews already present: {active_reviews}", "maintenance")
        return 0

    review_items = _load_locale_items("frontend/src/locales/ru/public_landing/reviews.json")
    if not review_items:
        review_items = [
            {
                "author_name": "Анна Петрова",
                "text": "Отличный сервис и внимательные мастера. Результатом довольна.",
                "employee_position": "Маникюр и педикюр",
                "rating": 5,
            },
            {
                "author_name": "Мария Гонсалес",
                "text": "Очень уютная атмосфера и профессиональный подход к каждой процедуре.",
                "employee_position": "Уход за лицом",
                "rating": 5,
            },
        ]

    inserted = 0
    seen_authors = set()
    seen_texts = set()
    for index, item in enumerate(review_items, start=1):
        text = (item.get("text") or "").strip()
        if not text:
            continue

        author_name = (item.get("author_name") or f"Клиент {index}").strip()
        author_key = _normalize_text(author_name)
        text_key = _normalize_text(text)
        if text_key in seen_texts or author_key in seen_authors:
            continue

        employee_name = (item.get("employee_name") or "").strip()
        employee_position = (item.get("employee_position") or "").strip()
        rating_raw = item.get("rating", 5)

        try:
            rating = int(rating_raw)
        except (TypeError, ValueError):
            rating = 5
        if rating < 1 or rating > 5:
            rating = 5

        cursor.execute(
            """
                INSERT INTO public_reviews (
                    author_name, employee_name, employee_position,
                    rating, text, avatar_url, is_active, display_order
                )
                VALUES (%s, %s, %s, %s, %s, NULL, TRUE, %s)
            """,
            (author_name, employee_name, employee_position, rating, text, index),
        )
        seen_authors.add(author_key)
        seen_texts.add(text_key)
        inserted += 1

    log_info(f"   ➕ Seeded reviews: {inserted}", "maintenance")
    return inserted


def seed_public_landing_baseline(cursor):
    log_info("🧩 Verifying public landing baseline content...", "maintenance")

    try:
        _seed_services_if_empty(cursor)
    except Exception as exc:
        log_error(f"❌ Services baseline seed failed: {exc}", "maintenance")

    try:
        _seed_gallery_if_empty(cursor)
    except Exception as exc:
        log_error(f"❌ Gallery baseline seed failed: {exc}", "maintenance")

    try:
        _seed_faq_if_empty(cursor)
    except Exception as exc:
        log_error(f"❌ FAQ baseline seed failed: {exc}", "maintenance")

    try:
        _seed_reviews_if_empty(cursor)
    except Exception as exc:
        log_error(f"❌ Reviews baseline seed failed: {exc}", "maintenance")


def run_all_fixes():
    """Entry point for centralized maintenance runner"""
    return run_fix()

def run_fix():
    print("🚀 Running system data maintenance...")

    conn = get_db_connection()
    c = conn.cursor()

    # Advisory lock to prevent multiple workers from running maintenance simultaneously
    c.execute("SELECT pg_try_advisory_lock(12346)")  # Different lock ID from init_database (12345)
    got_lock = c.fetchone()[0]
    if not got_lock:
        log_info("⏳ Another process is running maintenance, skipping...", "maintenance")
        conn.close()
        return True  # Return success - maintenance is being done by another worker

    try:
        # ONE-TIME CLEANUP: Remove duplicate reviews and clear bad banner/employee data
        log_info("🧹 Running data cleanup and synchronization...", "maintenance")

        # 1. Delete duplicate/weak public content
        deleted_reviews = _cleanup_existing_public_reviews(c)
        if deleted_reviews > 0:
            log_info(f"   ✅ Removed {deleted_reviews} duplicate reviews", "maintenance")

        deleted_faq = _cleanup_existing_public_faq(c)
        if deleted_faq > 0:
            log_info(f"   ✅ Removed {deleted_faq} duplicate/brand-hardcoded FAQ entries", "maintenance")

        # 2. Sync banners from a single SSOT source folder
        _sync_banners_from_folder(c)

        # 3. Clear employee photos that don't exist (404 paths)
        c.execute("""
            UPDATE users SET photo = NULL
            WHERE photo IS NOT NULL
              AND photo LIKE '%/employees/%'
              AND is_service_provider = TRUE
        """)
        if c.rowcount > 0:
            log_info(f"   ✅ Cleared {c.rowcount} missing employee photos", "maintenance")

        # 3.1 Ensure salon branding defaults that must be prefilled via maintenance/migrations
        salon_instagram = os.getenv('SALON_INSTAGRAM', 'mlediamant').strip()
        if len(salon_instagram) == 0:
            salon_instagram = 'mlediamant'

        timezone_offset_raw = os.getenv('SALON_TIMEZONE_OFFSET', '4').strip()
        try:
            timezone_offset_value = int(float(timezone_offset_raw))
        except ValueError:
            timezone_offset_value = 4

        c.execute("""
            UPDATE salon_settings
            SET
                instagram = COALESCE(NULLIF(TRIM(instagram), ''), %s),
                timezone_offset = COALESCE(timezone_offset, %s),
                timezone = COALESCE(NULLIF(TRIM(timezone), ''), 'Asia/Dubai')
            WHERE id = 1
        """, (salon_instagram, timezone_offset_value))
        if c.rowcount > 0:
            log_info("   ✅ Ensured salon Instagram and timezone defaults in salon_settings", "maintenance")

        # 4. Sync salon/portfolio gallery from source folders and remove duplicates
        _sync_gallery_from_folders(c)
        c.execute(
            """
                DELETE FROM public_gallery
                WHERE category IS NULL
                   OR category NOT IN ('salon', 'portfolio')
            """
        )
        if c.rowcount > 0:
            log_info(f"   ✅ Removed {c.rowcount} non-landing gallery items", "maintenance")

        # 4.1 Seed landing content baseline if public tables are empty
        seed_public_landing_baseline(c)

        # 5. Sync Employee Photos & Detailed Info
        log_info("👨‍💼 Updating employee photos, bios and status...", "maintenance")
        employee_data = {
            'gulcehre': {
                'full_name': 'Касымова Гульчехре',
                'photo': '/landing-images/staff/Gulya.webp',
                'nickname': 'Gulya',
                'email': 'gulcehraautova@gmail.com',
                'phone': '+971525814262',
                'bio': 'Гуля — признанный эксперт в области маникюра, депиляции и профессионального ухода за лицом с 8-летним опытом. Благодаря совершенному владению техниками эстетического преображения и вниманию к деталям, она создает безупречные образы, обеспечивая каждому клиенту высочайший уровень заботы и профессиональный подход.',
                'specialization': 'Ногтевой сервис, Депиляция, Косметология, Массаж',
                'years_of_experience': 8
            },
            'mestan': {
                'full_name': 'Amandurdyyeva Mestan',
                'photo': '/landing-images/staff/Mestan.webp',
                'nickname': 'Mestan',
                'email': 'amandurdyyeva80@gmail.com',
                'phone': '+971501800346',
                'bio': 'Местан — уникальный мастер, сочетающий в себе талант топ-стилиста и эксперта по перманентному макияжу. Ее глубокие знания позволяют создавать законченные и безупречные образы, подчеркивающие вашу индивидуальность.',
                'specialization': 'Стилист по волосам, Перманентный макияж',
                'years_of_experience': 18
            },
            'sabri': {
                'full_name': 'Мохаммед Сабри',
                'photo': '/landing-images/staff/Simo.webp',
                'nickname': 'Simo',
                'email': 'sabrisimo363@gmail.com',
                'phone': '+971503477993',
                'bio': 'Симо является ведущим экспертом нашего салона в области премиального ухода и сложного колорирования. Его многолетний международный опыт и авторские методики гарантируют результат высочайшего класса.',
                'specialization': 'Топ-стилист, Колорист',
                'years_of_experience': 10
            },
            'jennifer': {
                'full_name': 'Перадилья Дженнифер',
                'photo': '/landing-images/staff/Jennifer.webp',
                'nickname': 'Jennifer',
                'email': 'peradillajennifer47@gmail.com',
                'phone': '+971564208308',
                'bio': 'Дженнифер воплощает в себе талант многопрофильного специалиста. Она виртуозно выполняет как базовые, так и сложные бьюти-процедуры, обеспечивая комплексный и гармоничный подход к вашему преображению.',
                'specialization': 'Универсальный мастер красоты',
                'years_of_experience': 12
            },
            'lyazat': {
                'full_name': 'Kozhabay Lyazat',
                'photo': '/landing-images/staff/Lyazzat.webp',
                'nickname': 'Lyazat',
                'email': 'lazzat.kozhabaeva@mail.ru',
                'phone': '+971505303871',
                'bio': 'Лязат — истинный перфекционист в индустрии ногтевого сервиса. Обладая безупречным вкусом и вниманием к деталям, она создает идеальный маникюр и педикюр, заботясь об эстетике и здоровье ваших рук.',
                'specialization': 'Ногтевой сервис',
                'years_of_experience': 5
            }
        }
        
        for username, data in employee_data.items():
            c.execute("""
                UPDATE users SET 
                    full_name = %s,
                    photo = %s, 
                    nickname = %s,
                    email = %s,
                    phone = %s,
                    bio = %s,
                    specialization = %s,
                    years_of_experience = %s,
                    is_active = TRUE, 
                    is_service_provider = TRUE, 
                    is_public_visible = TRUE 
                WHERE username = %s OR full_name = %s
            """, (
                data['full_name'], data['photo'], data['nickname'], 
                data.get('email'), data.get('phone'),
                data['bio'], data['specialization'], data['years_of_experience'],
                username, data['full_name']
            ))
        log_info("   ✅ Synchronized all employee detailed info", "maintenance")

        # 8. Merge duplicate employees (DEEP CLEANUP & DELETION)
        log_info("👥 Merging duplicate employees (Final Cleanup)...", "maintenance")
        
        staff_targets = [
            {'username': 'gulcehre', 'alternates': ['kasymova_gulcehre', 'gulya', 'gulcehre_archived'], 'names': ['Kasymova Gulcehre', 'Гульчехра', 'Гуля', 'Касымова Гульчере']},
            {'username': 'jennifer', 'alternates': ['peradilla_jennifer', 'jennifer_archived'], 'names': ['Peradilla Jennifer', 'Перадилья Дженнифер', 'Дженнифер']},
            {'username': 'mestan', 'alternates': ['amandurdyyeva_mestan', 'mestan_archived'], 'names': ['Amandurdyyeva Mestan', 'Амандурдыева Местан', 'Местан']},
            {'username': 'sabri', 'alternates': ['mohamed_sabri', 'sabri_archived', 'simo'], 'names': ['Mohamed Sabri', 'Мохамед Сабри', 'Мохаммед Сабри', 'Симо']},
            {'username': 'lyazat', 'alternates': ['kozhabay_lyazat', 'lyazat_archived'], 'names': ['Kozhabay Lyazat', 'Кожабай Лязат', 'Лязат']}
        ]

        for target in staff_targets:
            # Try to find the record that SHOULD be the master (Active one)
            c.execute("SELECT id FROM users WHERE username = %s AND is_active = TRUE LIMIT 1", (target['username'],))
            res = c.fetchone()
            if not res:
                # Find by any of the names and is_active
                c.execute("SELECT id FROM users WHERE full_name = ANY(%s) AND is_active = TRUE ORDER BY id DESC LIMIT 1", (target['names'],))
                res = c.fetchone()
                if not res: continue
                master_id = res[0]
            else:
                master_id = res[0]

            # Find ALL other users who might be duplicates
            c.execute("""
                SELECT id FROM users 
                WHERE (username IN %s OR username ILIKE ANY(%s) OR full_name = ANY(%s) OR full_name ILIKE ANY(%s)) 
                  AND id != %s
                  AND role NOT IN ('client', 'guest')
            """, (tuple(target['alternates'] + [target['username']]), 
                  [f"%{a}%" for a in target['alternates']], 
                  target['names'],
                  [f"%{n}%" for n in target['names']], 
                  master_id))
            
            duplicate_ids = [r[0] for r in c.fetchall()]

            for source_id in duplicate_ids:
                # Transfer data
                c.execute("""
                    UPDATE users t
                    SET 
                        bio = COALESCE(t.bio, s.bio),
                        specialization = COALESCE(t.specialization, s.specialization),
                        experience = COALESCE(t.experience, s.experience),
                        years_of_experience = COALESCE(t.years_of_experience, s.years_of_experience),
                        photo = COALESCE(t.photo, s.photo),
                        gender = COALESCE(t.gender, s.gender)
                    FROM users s
                    WHERE t.id = %s AND s.id = %s
                """, (master_id, source_id))
                
                # Re-assign related records
                tables_to_fix = [
                    ('bookings', 'employee_id'),
                    ('user_services', 'user_id'),
                    ('user_schedule', 'user_id'),
                    ('messages', 'sender_id'),
                    ('client_images', 'employee_id'),
                    ('payroll_transactions', 'employee_id'),
                    ('employee_documents', 'employee_id'),
                    ('notification_settings', 'user_id'),
                    ('attendance', 'employee_id'),
                    ('work_sessions', 'employee_id'),
                    ('salary_payments', 'employee_id'),
                    ('inventory_logs', 'user_id'),
                    ('broadcast_receivers', 'user_id'),
                    ('user_permissions', 'user_id')
                ]
                
                for table, col in tables_to_fix:
                    # Check if both table and column exist in public schema
                    c.execute("""
                        SELECT EXISTS (
                            SELECT 1 FROM information_schema.columns 
                            WHERE table_schema = 'public' 
                              AND table_name = %s 
                              AND column_name = %s
                        )
                    """, (table, col))
                    if c.fetchone()[0]:
                         c.execute(f"UPDATE {table} SET {col} = %s WHERE {col} = %s", (master_id, source_id))
                         if c.rowcount > 0:
                             log_info(f"      🔗 Reassigned {c.rowcount} records from {table}", "maintenance")
                
                # DELETE DUPLICATE
                c.execute("DELETE FROM users WHERE id = %s", (source_id,))
                log_info(f"   🗑️ Deleted duplicate ID: {source_id}", "maintenance")

        log_info("   ✅ Finished deep cleanup and deletion of staff duplicates", "maintenance")
        
        # 9. Ensure only providers are public
        c.execute("""
            UPDATE users SET is_public_visible = FALSE
            WHERE is_service_provider = FALSE AND is_public_visible = TRUE
        """)
        
        # 10. Fix service names capitalization
        log_info("✏️  Fixing service names capitalization...", "maintenance")
        c.execute("""
            UPDATE services SET name = INITCAP(name) WHERE name ~ '^[а-яa-z]';
        """)
        _normalize_core_service_names(c)

        # 12. Fix Usernames and Full Names for Active Staff
        log_info("👤 Synchronizing staff with credentials...", "maintenance")
        from utils.utils import hash_password, verify_password

        staff_fixes = [
            ('gulcehre', 'Касымова Гульчехре'),
            ('jennifer', 'Перадилья Дженнифер'),
            ('mestan', 'Amandurdyyeva Mestan'),
            ('sabri', 'Мохаммед Сабри'),
            ('lyazat', 'Kozhabay Lyazat')
        ]
        
        credentials_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "staff_credentials.txt")
        passwords = {}
        if os.path.exists(credentials_path):
            try:
                with open(credentials_path, "r", encoding="utf-8") as f:
                    curr_u = None
                    for line in f:
                        line = line.strip()
                        if line.startswith("Username: "): curr_u = line.replace("Username: ", "")
                        elif line.startswith("Password: ") and curr_u:
                            passwords[curr_u] = line.replace("Password: ", "")
                            curr_u = None
            except: pass

        for pref_u, pref_f in staff_fixes:
            c.execute("SELECT id, password_hash FROM users WHERE full_name = %s OR username = %s LIMIT 1", (pref_f, pref_u))
            u_data = c.fetchone()
            if u_data:
                u_id = u_data[0]
                c.execute("UPDATE users SET username = %s, full_name = %s, is_active = TRUE WHERE id = %s", (pref_u, pref_f, u_id))
                if pref_u in passwords:
                    if not u_data[1] or not verify_password(passwords[pref_u], u_data[1]):
                        c.execute("UPDATE users SET password_hash = %s WHERE id = %s", (hash_password(passwords[pref_u]), u_id))

        # Sync admin
        c.execute("SELECT id, password_hash FROM users WHERE username = 'admin'")
        admin_data = c.fetchone()
        if admin_data and 'admin' in passwords:
            if not admin_data[1] or not verify_password(passwords['admin'], admin_data[1]):
                c.execute("UPDATE users SET password_hash = %s WHERE username = 'admin'", (hash_password(passwords['admin']),))

        seed_notification_templates(c)

        conn.commit()
        log_info("🏆 Data maintenance completed successfully!", "maintenance")
        return True

    except Exception as e:
        log_error(f"❌ Maintenance failed: {e}", "maintenance")
        try: conn.rollback()
        except: pass
        return False
    finally:
        try: c.execute("SELECT pg_advisory_unlock(12346)")
        except: pass
        try: conn.close()
        except: pass

def seed_notification_templates(c):
    """Синхронизация базовых системных шаблонов уведомлений"""
    log_info("🎭 Synchronizing notification templates...", "maintenance")
    
    templates = [
        {
            "name": "booking_confirmation",
            "category": "transactional",
            "subject": "Подтверждение записи к мастеру",
            "body": "Здравствуйте, {name}! \n\nВы успешно записаны в {salon_name}.\n\n🗓 {date}\n⏰ {time}\n💆 {service}\n👤 {master}\n\nБудем рады видеть вас! Если ваши планы изменятся, пожалуйста, сообщите нам заранее.",
            "variables": '["name", "service", "master", "date", "time", "salon_name"]'
        },
        {
            "name": "booking_reminder",
            "category": "transactional",
            "subject": "Напоминание о записи - {salon_name}",
            "body": "Напоминаем, что вы записаны сегодня ({date}) в {time} на {service}. Будем рады вас видеть!",
            "variables": '["name", "service", "date", "time", "salon_name"]'
        },
        {
            "name": "birthday_greeting",
            "category": "marketing",
            "subject": "{name}, с днем рождения! 🎁",
            "body": "Здравствуйте, {name}! \n\nПоздравляем вас с Днем Рождения! 🎉\n\nВ честь вашего праздника мы подготовили для вас особенный подарок от {salon_name} — скидку 15% на любую услугу!\n\nВоспользоваться предложением можно в течение 7 дней.\n\nБудьте прекрасны и сияйте каждый день! ✨",
            "variables": '["name", "salon_name"]'
        },
        {
            "name": "birthday_reminder_7d",
            "category": "marketing",
            "subject": "{name}, ваш день рождения уже через неделю! ✨",
            "body": "Здравствуйте, {name}! \n\nМы знаем, что ваш особенный день — через неделю! 🎉\n\nСамое время подготовиться, чтобы сиять и быть на высоте. Мы подготовили для вас подарок: промокод на скидку 15% на любые услуги нашего салона!\n\n🎁 Промокод: {promo_code}\n\nЗапишитесь заранее, чтобы забронировать удобное время! Ждем вас! 💖",
            "variables": '["name", "promo_code", "salon_name"]'
        },
        {
            "name": "master_new_booking",
            "category": "transactional",
            "subject": "🔔 Новая запись! - {datetime}",
            "body": "🔔 Новая запись!\n\n👤 Клиент: {client_name}\n💆 Услуга: {service}\n📅 Дата и время: {datetime}\n📞 Телефон: {phone}\n📋 ID: #{booking_id}",
            "variables": '["client_name", "service", "datetime", "phone", "booking_id"]'
        },
        {
            "name": "master_booking_change",
            "category": "transactional",
            "subject": "✏️ Запись изменена! - {datetime}",
            "body": "✏️ Запись изменена!\n\n👤 Клиент: {client_name}\n💆 Услуга: {service}\n📅 Новое время: {datetime}\n📞 Телефон: {phone}\n📋 ID: #{booking_id}",
            "variables": '["client_name", "service", "datetime", "phone", "booking_id"]'
        },
        {
            "name": "master_booking_cancel",
            "category": "transactional",
            "subject": "❌ Запись отменена! - {datetime}",
            "body": "❌ Запись отменена!\n\n👤 Клиент: {client_name}\n💆 Услуга: {service}\n📅 Была на: {datetime}\n📋 ID: #{booking_id}",
            "variables": '["client_name", "service", "datetime", "booking_id"]'
        }
    ]

    for t in templates:
        c.execute("""
            INSERT INTO notification_templates 
            (name, category, subject, body, variables, is_system)
            VALUES (%s, %s, %s, %s, %s, TRUE)
            ON CONFLICT (name) DO UPDATE SET
                category = EXCLUDED.category,
                subject = EXCLUDED.subject,
                body = EXCLUDED.body,
                variables = EXCLUDED.variables,
                updated_at = CURRENT_TIMESTAMP
        """, (
            t['name'], t['category'], t['subject'], t['body'], t['variables']
        ))
    
    log_info(f"   ✅ Synchronized {len(templates)} system templates", "maintenance")

if __name__ == "__main__":
    run_fix()
