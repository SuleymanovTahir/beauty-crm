#!/usr/bin/env python3
"""
Review all translations in the database
Shows all translated content for manual verification
"""
import sqlite3
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from core.config import DATABASE_NAME
from utils.logger import log_info

# Languages to check
LANGUAGES = ['ru', 'en', 'ar', 'es', 'de', 'fr', 'hi', 'kk', 'pt']

def review_service_translations():
    """Review all service name translations"""
    conn = sqlite3.connect(DATABASE_NAME)
    cursor = conn.cursor()
    
    print("\n" + "="*80)
    print("📋 REVIEWING SERVICE TRANSLATIONS")
    print("="*80)
    
    # Get all services
    cursor.execute("""
        SELECT id, name, name_ru, name_en, name_ar, name_es, name_de, name_fr, name_hi, name_kk, name_pt
        FROM services
        WHERE is_active = 1
        ORDER BY category, name
    """)
    
    services = cursor.fetchall()
    
    for service in services:
        service_id = service[0]
        name_en = service[1]
        
        print(f"\n{'─'*80}")
        print(f"ID: {service_id} | English: {name_en}")
        print(f"{'─'*80}")
        
        for i, lang in enumerate(LANGUAGES):
            translation = service[i + 1]  # +1 because first column is id
            if translation:
                print(f"  {lang.upper():3} | {translation}")
            else:
                print(f"  {lang.upper():3} | ⚠️  MISSING")
    
    conn.close()
    print("\n" + "="*80)
    print("✅ Review complete!")
    print("="*80)


def review_banner_translations():
    """Review all banner translations"""
    conn = sqlite3.connect(DATABASE_NAME)
    cursor = conn.cursor()
    
    print("\n" + "="*80)
    print("🎨 REVIEWING BANNER TRANSLATIONS")
    print("="*80)
    
    cursor.execute("""
        SELECT id, title_ru, title_en, title_ar, subtitle_ru, subtitle_en, subtitle_ar
        FROM public_banners
        WHERE is_active = 1
    """)
    
    banners = cursor.fetchall()
    
    for banner in banners:
        banner_id = banner[0]
        print(f"\n{'─'*80}")
        print(f"Banner ID: {banner_id}")
        print(f"{'─'*80}")
        print(f"  Title RU:  {banner[1]}")
        print(f"  Title EN:  {banner[2]}")
        print(f"  Title AR:  {banner[3]}")
        print(f"  Subtitle RU: {banner[4]}")
        print(f"  Subtitle EN: {banner[5]}")
        print(f"  Subtitle AR: {banner[6]}")
    
    conn.close()
    print("\n" + "="*80)
    print("✅ Review complete!")
    print("="*80)


def export_translations_to_csv():
    """Export all translations to CSV for easy review in Excel"""
    import csv
    
    conn = sqlite3.connect(DATABASE_NAME)
    cursor = conn.cursor()
    
    output_file = "translations_review.csv"
    
    with open(output_file, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        
        # Write header
        writer.writerow(['ID', 'Type', 'English'] + [lang.upper() for lang in LANGUAGES])
        
        # Export services
        cursor.execute("""
            SELECT id, name, name_ru, name_en, name_ar, name_es, name_de, name_fr, name_hi, name_kk, name_pt
            FROM services
            WHERE is_active = 1
            ORDER BY name
        """)
        
        for row in cursor.fetchall():
            writer.writerow([row[0], 'Service', row[1]] + list(row[2:]))
    
    conn.close()
    print(f"\n✅ Exported translations to: {output_file}")
    print(f"   Open this file in Excel/Google Sheets to review all translations")


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Review translations in database')
    parser.add_argument('--export', action='store_true', help='Export to CSV file')
    parser.add_argument('--services', action='store_true', help='Review service translations')
    parser.add_argument('--banners', action='store_true', help='Review banner translations')
    
    args = parser.parse_args()
    
    if args.export:
        export_translations_to_csv()
    elif args.services:
        review_service_translations()
    elif args.banners:
        review_banner_translations()
    else:
        # Show all by default
        review_service_translations()
        review_banner_translations()
        print("\n💡 Tip: Use --export to create a CSV file for easier review")
