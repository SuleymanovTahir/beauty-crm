#!/usr/bin/env python3
"""
Cleanup old individual cache files after migration
"""

import shutil
from pathlib import Path
from config import CACHE_DIR


def cleanup_old_cache():
    """
    Delete all old individual cache files, keeping only the consolidated cache
    """
    cache_dir = Path(CACHE_DIR)
    
    if not cache_dir.exists():
        print("✅ No cache directory found")
        return
    
    # New consolidated cache file
    cache_file = cache_dir / "translations_cache.json"
    
    if not cache_file.exists():
        print("❌ Consolidated cache file not found!")
        print("   Run migration first: python3 scripts/translations/migrate_cache.py")
        return
    
    # Find all old cache files
    old_cache_files = list(cache_dir.glob("*.json"))
    old_cache_files = [f for f in old_cache_files if f.name != "translations_cache.json"]
    
    if not old_cache_files:
        print("✅ No old cache files to clean up")
        return
    
    print(f"🗑️  Found {len(old_cache_files)} old cache files")
    
    # Confirm deletion
    response = input(f"Delete {len(old_cache_files)} old cache files? (yes/no): ")
    
    if response.lower() in ['yes', 'y']:
        deleted = 0
        for old_file in old_cache_files:
            try:
                old_file.unlink()
                deleted += 1
            except Exception as e:
                print(f"⚠️  Could not delete {old_file.name}: {e}")
        
        print(f"✅ Deleted {deleted} old cache files")
        print(f"💾 Kept consolidated cache: {cache_file.name}")
    else:
        print("❌ Cleanup cancelled")


if __name__ == "__main__":
    cleanup_old_cache()
