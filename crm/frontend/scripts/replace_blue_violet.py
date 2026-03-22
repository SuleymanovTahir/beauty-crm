import os
import re

dir_path = "/Users/tahir/Desktop/beauty-crm/crm/frontend/src"

class_replacements = [
    (r"#3b82f6", "var(--brand-primary)"),
    (r"#8b5cf6", "var(--brand-primary)"),
]

for root, _, files in os.walk(dir_path):
    for file in files:
        if file.endswith(".css"):
            file_path = os.path.join(root, file)
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()
            
            orig = content
            
            # Keep messenger themes standard, globals might have tailwind definitions.
            if file in ["messenger-themes.css", "globals.css"]:
                continue
                
            for regex, rep in class_replacements:
                content = re.sub(regex, rep, content)
            
            if content != orig:
                with open(file_path, "w", encoding="utf-8") as f:
                    f.write(content)
                print(f"Updated {file_path}")

print("Done")
