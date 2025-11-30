#!/usr/bin/env python3
"""
Test script for static file translation
"""
import os
import json
import shutil
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

import static_translate

def test_static_translation():
    print("🧪 Starting Static Translation Test...")
    
    # Setup temp directory
    base_dir = Path(__file__).parent
    temp_dir = base_dir / "temp_locales"
    
    if temp_dir.exists():
        shutil.rmtree(temp_dir)
    
    # Create source structure (ru)
    ru_dir = temp_dir / "ru"
    ru_dir.mkdir(parents=True)
    
    # Create test file with mixed content
    # "greeting" is English (should be back-translated to Russian)
    # "question" is Russian (should be kept as is)
    test_data = {
        "greeting": "Hello world",
        "nested": {
            "question": "Как дела?"
        }
    }
    
    test_file = ru_dir / "test.json"
    with open(test_file, 'w', encoding='utf-8') as f:
        json.dump(test_data, f, ensure_ascii=False, indent=2)
    
    print(f"📝 Created test file at {test_file}")
    print(f"   Content: {json.dumps(test_data, ensure_ascii=False)}")
    
    # Run translation
    os.environ["TEST_LOCALES_DIR"] = str(temp_dir)
    
    try:
        static_translate.main()
        
        # Verify results
        print("\n🔍 Verifying results...")
        
        # 1. Check Source File (RU) - should be updated
        with open(test_file, 'r', encoding='utf-8') as f:
            updated_ru = json.load(f)
            
        print(f"   Updated RU: {json.dumps(updated_ru, ensure_ascii=False)}")
        
        # Check if "greeting" was translated to Russian
        if updated_ru["greeting"] != "Hello world" and "Привет" in updated_ru["greeting"]:
            print("   ✅ RU Back-translation: Success (English -> Russian)")
        else:
            print(f"   ❌ RU Back-translation: Failed. Expected Russian text, got '{updated_ru['greeting']}'")
            
        # 2. Check Target File (EN)
        en_file = temp_dir / "en" / "test.json"
        if en_file.exists():
            with open(en_file, 'r', encoding='utf-8') as f:
                en_data = json.load(f)
            print(f"   Generated EN: {json.dumps(en_data, ensure_ascii=False)}")
            
            if en_data["greeting"] == "Hello world":
                print("   ✅ EN Translation: Success (Preserved English)")
            else:
                print(f"   ❌ EN Translation: Failed. Expected 'Hello world', got '{en_data['greeting']}'")
                
            if "How are you" in en_data["nested"]["question"] or "How is it going" in en_data["nested"]["question"]:
                 print("   ✅ EN Nested Translation: Success (Russian -> English)")
            else:
                 print(f"   ❌ EN Nested Translation: Failed. Expected English, got '{en_data['nested']['question']}'")
        else:
            print("   ❌ EN File creation: Failed. File not found.")
            
    except Exception as e:
        print(f"❌ Test failed with error: {e}")
    finally:
        # Cleanup
        if temp_dir.exists():
            shutil.rmtree(temp_dir)
        print("\n🧹 Cleanup complete")

if __name__ == "__main__":
    test_static_translation()
