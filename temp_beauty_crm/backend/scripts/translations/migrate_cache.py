#!/usr/bin/env python3
"""
Migrate old individual cache files to new consolidated cache format
This script consolidates thousands of small JSON files into one file
"""

import json
import shutil
from pathlib import Path
from config import CACHE_DIR

def migrate_cache():
    """
    Migrate from individual cache files to consolidated cache
    """
    cache_dir = Path(CACHE_DIR)
    
    if not cache_dir.exists():
        print("✅ No cache directory found, nothing to migrate")
        return
    
    # New consolidated cache file
    cache_file = cache_dir / "translations_cache.json"
    consolidated_cache = {}
    
    # Find all old cache files
    old_cache_files = list(cache_dir.glob("*.json"))
    
    # Exclude the new cache file if it exists
    old_cache_files = [f for f in old_cache_files if f.name != "translations_cache.json"]
    
    if not old_cache_files:
        print("✅ No old cache files found, nothing to migrate")
        return
    
    print(f"🔄 Found {len(old_cache_files)} old cache files to migrate...")
    
    # Load existing consolidated cache if it exists
    if cache_file.exists():
        try:
            with open(cache_file, 'r', encoding='utf-8') as f:
                consolidated_cache = json.load(f)
            print(f"   Loaded {len(consolidated_cache)} existing translations")
        except:
            pass
    
    # Migrate each old file
    migrated = 0
    for old_file in old_cache_files:
        try:
            with open(old_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            # Extract cache key from filename (it's the MD5 hash)
            cache_key = old_file.stem
            
            # Store translation
            if 'translation' in data:
                consolidated_cache[cache_key] = data['translation']
                migrated += 1
        except Exception as e:
            print(f"⚠️  Could not migrate {old_file.name}: {e}")
    
    # Save consolidated cache
    if migrated > 0:
        with open(cache_file, 'w', encoding='utf-8') as f:
            json.dump(consolidated_cache, f, ensure_ascii=False, indent=2)
        print(f"✅ Migrated {migrated} translations to {cache_file.name}")
    
    # Ask user to confirm deletion
    print(f"\n📁 Old cache files are still present ({len(old_cache_files)} files)")
    print(f"   You can safely delete them now:")
    print(f"   rm -rf {cache_dir}/*.json && mv {cache_file} {cache_dir}/")
    print(f"\n   Or use the cleanup script:")
    print(f"   python3 scripts/translations/cleanup_cache.py")

if __name__ == "__main__":
    migrate_cache()
