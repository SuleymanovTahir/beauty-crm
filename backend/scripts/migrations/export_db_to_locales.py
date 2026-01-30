#!/usr/bin/env python3
"""
Export database content to frontend locale files.
Uses translations from translations_completed.json and database content.
Compliant with Rule 15: No language-prefixed columns in the database.
"""

import sys
import json
from pathlib import Path
from typing import Dict, Any

# Add backend to path
backend_dir = Path(__file__).parent.parent.parent
sys.path.insert(0, str(backend_dir))

from dotenv import load_dotenv
load_dotenv(backend_dir / '.env.local')
load_dotenv(backend_dir / '.env')

from db.connection import get_db_connection

# Frontend locales path
FRONTEND_DIR = backend_dir.parent / 'frontend'
LOCALES_DIR = FRONTEND_DIR / 'src' / 'locales'

# Supported languages
LANGUAGES = ["ru", "en", "ar", "es", "de", "fr", "hi", "kk", "pt"]
SOURCE_LANGUAGE = "ru"

# Translations completed file path
TRANSLATIONS_COMPLETED = backend_dir / 'scripts' / 'translations' / 'translations_completed.json'


def load_completed_translations() -> Dict:
    """Load completed translations from file"""
    if TRANSLATIONS_COMPLETED.exists():
        try:
            with open(TRANSLATIONS_COMPLETED, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            print(f"⚠️  Could not load completed translations: {e}")
    return {}


def get_translation(translations: Dict, table: str, record_id: int, field: str, lang: str, fallback: str = "") -> str:
    """Get translation for a specific field, with fallback to source language then to provided fallback"""
    table_data = translations.get(table, [])
    for record in table_data:
        if record.get("id") == record_id:
            field_data = record.get("fields", {}).get(field, {})
            # Try requested language, then source language, then fallback
            return field_data.get(lang) or field_data.get(SOURCE_LANGUAGE) or fallback
    return fallback


def export_services():
    """Export services from database to locale files"""
    print("📦 Exporting services to locale files...")

    translations = load_completed_translations()

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Get all active services with their service_key
        cursor.execute("""
            SELECT id, service_key, name, description, price, duration,
                   min_price, max_price, currency
            FROM services
            WHERE is_active = TRUE AND service_key IS NOT NULL
            ORDER BY display_order, id
        """)
        services = cursor.fetchall()

        if not services:
            print("   ⚠️  No services found with service_key, skipping")
            return

        # Get categories
        cursor.execute("""
            SELECT DISTINCT category FROM services
            WHERE is_active = TRUE AND category IS NOT NULL
        """)
        categories = [row[0] for row in cursor.fetchall() if row[0]]

        # Export for each language
        for lang in LANGUAGES:
            locale_dir = LOCALES_DIR / lang / 'public_landing'
            locale_dir.mkdir(parents=True, exist_ok=True)

            services_file = locale_dir / 'services.json'

            # Load existing file to preserve structure
            existing_data = {}
            if services_file.exists():
                try:
                    with open(services_file, 'r', encoding='utf-8') as f:
                        existing_data = json.load(f)
                except:
                    pass

            # Build items dict
            items = {}
            for row in services:
                svc_id, service_key, name, description, price, duration, min_price, max_price, currency = row

                # Get translated name and description
                translated_name = get_translation(translations, "services", svc_id, "name", lang, name or "")
                translated_desc = get_translation(translations, "services", svc_id, "description", lang, description or "")

                # Get category translation from existing data
                cursor.execute("SELECT category FROM services WHERE id = %s", (svc_id,))
                cat_row = cursor.fetchone()
                category = cat_row[0] if cat_row else ""

                items[service_key] = {
                    "name": translated_name,
                    "description": translated_desc,
                    "price": price or 0,
                    "duration": str(duration) if duration else "60",
                    "min_price": min_price,
                    "max_price": max_price,
                    "currency": currency or "AED",
                    "category": category or ""
                }

            # Build categories dict - preserve existing translations
            categories_dict = existing_data.get("categories", {})

            # Build output
            output = {
                "categories": categories_dict,
                **{k: v for k, v in existing_data.items() if k not in ["categories", "items"]},
                "items": items
            }

            with open(services_file, 'w', encoding='utf-8') as f:
                json.dump(output, f, ensure_ascii=False, indent=2)

        print(f"   ✅ Exported {len(services)} services to {len(LANGUAGES)} locales")

    finally:
        cursor.close()
        conn.close()


def export_faq():
    """Export FAQ from database to locale files"""
    print("\n❓ Exporting FAQ to locale files...")

    translations = load_completed_translations()

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT id, question, answer
            FROM public_faq
            WHERE is_active = TRUE
            ORDER BY display_order, id
        """)
        faqs = cursor.fetchall()

        if not faqs:
            print("   ⚠️  No FAQ items found, skipping")
            return

        for lang in LANGUAGES:
            locale_dir = LOCALES_DIR / lang / 'public_landing'
            locale_dir.mkdir(parents=True, exist_ok=True)

            faq_file = locale_dir / 'faq.json'

            # Load existing file to preserve structure
            existing_data = {}
            if faq_file.exists():
                try:
                    with open(faq_file, 'r', encoding='utf-8') as f:
                        existing_data = json.load(f)
                except:
                    pass

            # Build items list
            items = []
            for row in faqs:
                faq_id, question, answer = row

                translated_q = get_translation(translations, "public_faq", faq_id, "question", lang, question or "")
                translated_a = get_translation(translations, "public_faq", faq_id, "answer", lang, answer or "")

                items.append({
                    "question": translated_q,
                    "answer": translated_a
                })

            # Preserve other keys from existing data
            output = {k: v for k, v in existing_data.items() if k != "items"}
            output["items"] = items

            with open(faq_file, 'w', encoding='utf-8') as f:
                json.dump(output, f, ensure_ascii=False, indent=2)

        print(f"   ✅ Exported {len(faqs)} FAQ items to {len(LANGUAGES)} locales")

    finally:
        cursor.close()
        conn.close()


def export_banners():
    """Export banners from database to locale files"""
    print("\n🖼  Exporting banners to locale files...")

    translations = load_completed_translations()

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT id, title, subtitle, image_url, link_url
            FROM public_banners
            WHERE is_active = TRUE
            ORDER BY display_order, id
        """)
        banners = cursor.fetchall()

        if not banners:
            print("   ⚠️  No banners found, skipping")
            return

        for lang in LANGUAGES:
            locale_dir = LOCALES_DIR / lang / 'public_landing'
            locale_dir.mkdir(parents=True, exist_ok=True)

            banners_file = locale_dir / 'banners.json'

            # Load existing file to preserve structure
            existing_data = {}
            if banners_file.exists():
                try:
                    with open(banners_file, 'r', encoding='utf-8') as f:
                        existing_data = json.load(f)
                except:
                    pass

            # Build items list
            items = []
            for row in banners:
                banner_id, title, subtitle, image_url, link_url = row

                translated_title = get_translation(translations, "public_banners", banner_id, "title", lang, title or "")
                translated_subtitle = get_translation(translations, "public_banners", banner_id, "subtitle", lang, subtitle or "")

                items.append({
                    "title": translated_title,
                    "subtitle": translated_subtitle,
                    "image": image_url or "",
                    "link": link_url or ""
                })

            # Preserve other keys from existing data
            output = {k: v for k, v in existing_data.items() if k != "items"}
            output["items"] = items

            with open(banners_file, 'w', encoding='utf-8') as f:
                json.dump(output, f, ensure_ascii=False, indent=2)

        print(f"   ✅ Exported {len(banners)} banners to {len(LANGUAGES)} locales")

    finally:
        cursor.close()
        conn.close()


def export_reviews():
    """Export reviews from database to locale files"""
    print("\n⭐ Exporting reviews to locale files...")

    translations = load_completed_translations()

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT id, text, author_name, employee_name, employee_position, rating
            FROM public_reviews
            WHERE is_active = TRUE
            ORDER BY display_order, id
        """)
        reviews = cursor.fetchall()

        if not reviews:
            print("   ⚠️  No reviews found, skipping")
            return

        for lang in LANGUAGES:
            locale_dir = LOCALES_DIR / lang / 'public_landing'
            locale_dir.mkdir(parents=True, exist_ok=True)

            reviews_file = locale_dir / 'reviews.json'

            # Load existing file to preserve structure
            existing_data = {}
            if reviews_file.exists():
                try:
                    with open(reviews_file, 'r', encoding='utf-8') as f:
                        existing_data = json.load(f)
                except:
                    pass

            # Build items list
            items = []
            for row in reviews:
                review_id, text, author_name, employee_name, employee_position, rating = row

                translated_text = get_translation(translations, "public_reviews", review_id, "text", lang, text or "")
                translated_author = get_translation(translations, "public_reviews", review_id, "author_name", lang, author_name or "")
                translated_emp_name = get_translation(translations, "public_reviews", review_id, "employee_name", lang, employee_name or "")
                translated_emp_pos = get_translation(translations, "public_reviews", review_id, "employee_position", lang, employee_position or "")

                items.append({
                    "text": translated_text,
                    "author_name": translated_author,
                    "employee_name": translated_emp_name,
                    "employee_position": translated_emp_pos,
                    "rating": rating or 5
                })

            # Preserve other keys from existing data
            output = {k: v for k, v in existing_data.items() if k != "items"}
            output["items"] = items

            with open(reviews_file, 'w', encoding='utf-8') as f:
                json.dump(output, f, ensure_ascii=False, indent=2)

        print(f"   ✅ Exported {len(reviews)} reviews to {len(LANGUAGES)} locales")

    finally:
        cursor.close()
        conn.close()


def export_employees():
    """Export employee info from database to locale files"""
    print("\n👥 Exporting employees to locale files...")

    translations = load_completed_translations()

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT id, full_name, position, bio, photo_url
            FROM users
            WHERE is_service_provider = TRUE AND is_active = TRUE
            ORDER BY id
        """)
        employees = cursor.fetchall()

        if not employees:
            print("   ⚠️  No employees found, skipping")
            return

        for lang in LANGUAGES:
            locale_dir = LOCALES_DIR / lang / 'public_landing'
            locale_dir.mkdir(parents=True, exist_ok=True)

            employees_file = locale_dir / 'employees.json'

            # Build items list
            items = []
            for row in employees:
                emp_id, full_name, position, bio, photo_url = row

                translated_name = get_translation(translations, "users", emp_id, "full_name", lang, full_name or "")
                translated_position = get_translation(translations, "users", emp_id, "position", lang, position or "")
                translated_bio = get_translation(translations, "users", emp_id, "bio", lang, bio or "")

                items.append({
                    "id": emp_id,
                    "name": translated_name,
                    "position": translated_position,
                    "bio": translated_bio,
                    "photo": photo_url or ""
                })

            output = {"items": items}

            with open(employees_file, 'w', encoding='utf-8') as f:
                json.dump(output, f, ensure_ascii=False, indent=2)

        print(f"   ✅ Exported {len(employees)} employees to {len(LANGUAGES)} locales")

    finally:
        cursor.close()
        conn.close()


def main():
    print("=" * 60)
    print("📤 Database to Locales Export")
    print("=" * 60)
    print(f"Target: {LOCALES_DIR}")
    print(f"Languages: {', '.join(LANGUAGES)}")
    print()

    export_services()
    export_faq()
    export_banners()
    export_reviews()
    export_employees()

    print("\n" + "=" * 60)
    print("✅ Export complete!")
    print("=" * 60)


if __name__ == "__main__":
    main()
