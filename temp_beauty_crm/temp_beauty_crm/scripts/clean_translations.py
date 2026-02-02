
import json
from pathlib import Path

def clean_completed_translations():
    path = Path("backend/scripts/translations/translations_completed.json")
    if not path.exists():
        print("File not found")
        return
        
    with open(path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    cleared_count = 0
    for table, records in data.items():
        for record in records:
            for field, field_data in record["fields"].items():
                source = field_data.get("ru")
                if not source: continue
                
                for lang in ["en", "ar", "es", "de", "fr", "hi", "kk", "pt"]:
                    val = field_data.get(lang)
                    if val == source and any(ord(c) > 127 for c in source):
                        # It's a duplicate of Russian text
                        field_data[lang] = None
                        cleared_count += 1
    
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print(f"✅ Cleared {cleared_count} duplicate translations. Ready for re-translation.")

if __name__ == "__main__":
    clean_completed_translations()
