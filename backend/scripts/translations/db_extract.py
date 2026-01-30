#!/usr/bin/env python3
"""
Extract translatable content from database tables.
Outputs to translations_needed.json for translation by db_translate.py
"""

import json
import sys
from pathlib import Path
from typing import Dict, Any, List

# Add backend directory to path
backend_dir = Path(__file__).parent.parent.parent
sys.path.insert(0, str(backend_dir))
sys.path.insert(0, str(Path(__file__).parent))

from dotenv import load_dotenv
load_dotenv(backend_dir / '.env.local')
load_dotenv(backend_dir / '.env')

from db.connection import get_db_connection
from config import (
    LANGUAGES,
    SOURCE_LANGUAGE,
    TRANSLATION_CONFIG,
    EXTRACT_OUTPUT
)


def extract_translations() -> Dict[str, List[Dict]]:
    """
    Extract translatable content from all configured database tables.
    Returns dict with table name as key and list of records as value.
    Each record has 'id' and 'fields' where fields is a dict of field_name -> {lang: value}
    """
    print("📦 Extracting translatable content from database...")

    conn = get_db_connection()
    cursor = conn.cursor()

    result = {}
    total_records = 0
    total_fields = 0

    for table_name, config in TRANSLATION_CONFIG.items():
        id_field = config["id_field"]
        fields = config["fields"]
        where_clause = config.get("where")

        # Check if table exists
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = %s
            )
        """, (table_name,))

        if not cursor.fetchone()[0]:
            print(f"  ⚠️  Table '{table_name}' does not exist, skipping...")
            continue

        # Check which fields exist in the table
        cursor.execute("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = %s
        """, (table_name,))
        existing_columns = {row[0] for row in cursor.fetchall()}

        # Filter fields to only existing columns
        valid_fields = [f for f in fields if f in existing_columns]

        if not valid_fields:
            print(f"  ⚠️  No valid fields found for '{table_name}', skipping...")
            continue

        # Build query
        select_fields = [id_field] + valid_fields
        query = f"SELECT {', '.join(select_fields)} FROM {table_name}"
        if where_clause:
            query += f" WHERE {where_clause}"
        query += f" ORDER BY {id_field}"

        try:
            cursor.execute(query)
            rows = cursor.fetchall()
        except Exception as e:
            print(f"  ❌ Error querying '{table_name}': {e}")
            continue

        if not rows:
            print(f"  ℹ️  No records found in '{table_name}'")
            continue

        table_records = []

        for row in rows:
            record_id = row[0]
            record = {
                "id": record_id,
                "fields": {}
            }

            for i, field_name in enumerate(valid_fields):
                value = row[i + 1]
                if value and str(value).strip():
                    # Initialize with source language value
                    # Translations will be filled in by db_translate.py
                    record["fields"][field_name] = {
                        SOURCE_LANGUAGE: str(value)
                    }
                    total_fields += 1

            if record["fields"]:
                table_records.append(record)
                total_records += 1

        if table_records:
            result[table_name] = table_records
            print(f"  ✅ {table_name}: {len(table_records)} records, {sum(len(r['fields']) for r in table_records)} fields")

    conn.close()

    print(f"\n📊 Total: {total_records} records, {total_fields} fields to translate")
    return result


def load_existing_translations() -> Dict[str, Any]:
    """Load existing completed translations to preserve them"""
    completed_path = Path(backend_dir) / "scripts" / "translations" / "translations_completed.json"
    if completed_path.exists():
        try:
            with open(completed_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            print(f"⚠️  Could not load existing translations: {e}")
    return {}


def merge_with_existing(extracted: Dict, existing: Dict) -> Dict:
    """
    Merge extracted data with existing translations.
    Preserves translations that already exist.
    """
    if not existing:
        return extracted

    print("\n🔄 Merging with existing translations...")
    preserved = 0

    for table_name, records in extracted.items():
        existing_table = existing.get(table_name, [])
        existing_by_id = {r["id"]: r for r in existing_table}

        for record in records:
            record_id = record["id"]
            existing_record = existing_by_id.get(record_id)

            if existing_record:
                for field_name, field_data in record["fields"].items():
                    existing_field = existing_record.get("fields", {}).get(field_name, {})

                    # Copy existing translations for other languages
                    for lang in LANGUAGES:
                        if lang != SOURCE_LANGUAGE and lang in existing_field:
                            field_data[lang] = existing_field[lang]
                            preserved += 1

    if preserved:
        print(f"  ✅ Preserved {preserved} existing translations")

    return extracted


def main():
    print("=" * 60)
    print("📚 Database Translation Extraction")
    print("=" * 60)

    # Extract from database
    extracted = extract_translations()

    if not extracted:
        print("\n❌ No translatable content found!")
        return

    # Load and merge with existing translations
    existing = load_existing_translations()
    merged = merge_with_existing(extracted, existing)

    # Save to output file
    output_path = Path(backend_dir) / EXTRACT_OUTPUT
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(merged, f, ensure_ascii=False, indent=2)

    print(f"\n✅ Saved to {EXTRACT_OUTPUT}")
    print("\n💡 Next steps:")
    print("   1. Run: npm run db:i18n:translate")
    print("   2. Run: npm run db:i18n:sync")


if __name__ == "__main__":
    main()
