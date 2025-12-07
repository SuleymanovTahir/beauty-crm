#!/usr/bin/env python3
"""
Export Services from Database to Frontend JSON Locales
This ensures that the Public Page (which reads JSON) matches the Admin Panel (which reads DB).
"""

import json
import sys
from pathlib import Path
from typing import Dict, Any

# Add backend directory to path
backend_dir = Path(__file__).parent.parent.parent
sys.path.insert(0, str(backend_dir))

from db.connection import get_db_connection
from scripts.translations.config import LANGUAGES, SOURCE_LANGUAGE

FRONTEND_LOCALES_DIR = backend_dir.parent / "frontend" / "src" / "locales"

def load_json_file(path: Path) -> Dict[str, Any]:
    if path.exists():
        try:
            with open(path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except json.JSONDecodeError:
            print(f"⚠️  Warning: Could not parse {path}, returning empty dict")
            return {}
    return {}

def save_json_file(path: Path, data: Dict[str, Any]):
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def export_services():
    print("🚀 Exporting active services from DB to JSON locales...")
    
    conn = get_db_connection()
    # Enable name-based access
    cursor = conn.cursor()
    
    # Select all services
    # We fetch * to get all language columns
    cursor.execute("SELECT * FROM services WHERE is_active = TRUE ORDER BY category, id")
    
    # Get column names
    columns = [desc[0] for desc in cursor.description]
    rows = cursor.fetchall()
    
    services_list = []
    for row in rows:
        services_list.append(dict(zip(columns, row)))
        
    print(f"✅ Found {len(services_list)} active services")
    
    if not services_list:
        print("⚠️  No services found. Aborting export to prevent clearing files.")
        return

    # Process each language
    for lang in LANGUAGES:
        print(f"\n📋 Processing language: {lang}")
        
        target_file = FRONTEND_LOCALES_DIR / lang / "public_landing" / "services.json"
        
        # Load existing file to preserve 'categories' structure
        existing_data = load_json_file(target_file)
        
        # Determine categories block
        # If file doesn't exist, we might copy categories from source language or default
        if not existing_data and lang != SOURCE_LANGUAGE:
             # Try to load from source language to get categories structure
             source_file = FRONTEND_LOCALES_DIR / SOURCE_LANGUAGE / "public_landing" / "services.json"
             if source_file.exists():
                 source_data = load_json_file(source_file)
                 existing_data["categories"] = source_data.get("categories", {})
        
        # Prepare new data structure
        new_data = {
            "categories": existing_data.get("categories", {}),
            "items": {}
        }
        
        # Populate items
        for service in services_list:
            # Determine key
            key = service.get('service_key') or f"service_{service['id']}"
            
            # Determine translated fields
            # 1. Name
            name_val = service.get(f"name_{lang}")
            if not name_val:
                # Fallback chain: name_en -> name_ru -> name
                name_val = service.get('name_en') or service.get('name_ru') or service.get('name')
            
            # 2. Description
            desc_val = service.get(f"description_{lang}")
            if not desc_val:
                desc_val = service.get('description_en') or service.get('description_ru') or service.get('description') or ""
                
            # 3. Duration
            # DB has 'duration' (string/common) and 'duration_{lang}' columns
            dur_val = service.get(f"duration_{lang}")
            if not dur_val:
                dur_val = service.get('duration') or ""
                
            # Clean up duration (remove 'min' if needed for consistency, but frontend expects "60" or "60 min")
            # User said: "30 min" in UI.
            # DB might contain "30" or "30 min". Let's pass as is from DB.
            
            item_data = {
                "name": name_val,
                "description": desc_val,
                "price": float(service['price']) if service.get('price') is not None else 0,
                "min_price": float(service['min_price']) if service.get('min_price') is not None else None,
                "max_price": float(service['max_price']) if service.get('max_price') is not None else None,
                "currency": service.get('currency') or "AED",
                "duration": dur_val,
                "category": service.get('category') or "other"
            }
            
            new_data["items"][key] = item_data
            
        # Save file
        save_json_file(target_file, new_data)
        print(f"  💾 Saved {len(new_data['items'])} items to {target_file}")

    conn.close()
    print("\n✨ Export complete! Frontend JSONs are now in sync with DB.")

if __name__ == "__main__":
    export_services()
