import json
import os

def unflatten_dict(d, sep='.'):
    """Преобразование плоского словаря обратно во вложенный"""
    result = {}
    for key, value in d.items():
        parts = key.split(sep)
        current = result
        for i, part in enumerate(parts[:-1]):
            if part not in current:
                current[part] = {}
            if not isinstance(current[part], dict):
                # Конфликт ключей: если auth="foo" и auth.login="bar"
                # Превращаем auth в {"_self": "foo"} или просто перезаписываем
                current[part] = {} 
            current = current[part]
        current[parts[-1]] = value
    return result

file_path = 'src/locales/ar/public/terms.json'
with open(file_path, 'r') as f:
    data = json.load(f)

print(f"Original keys sample: {list(data.keys())[:5]}")

nested = unflatten_dict(data)

print(f"\nNested keys sample: {list(nested.keys())[:5]}")
if 'sections' in nested:
    print(f"sections type: {type(nested['sections'])}")
    if isinstance(nested['sections'], dict):
        print(f"sections keys: {list(nested['sections'].keys())}")

with open('src/locales/ar/public/terms_debug.json', 'w', encoding='utf-8') as f:
    json.dump(nested, f, ensure_ascii=False, indent=2, sort_keys=True)
print("\nSaved to src/locales/ar/public/terms_debug.json")
