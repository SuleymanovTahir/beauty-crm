import os
import re

dir_path = "/Users/tahir/Desktop/beauty-crm/crm/frontend/src"

class_replacements = [
    (r"#ec4899", "var(--brand-primary)"),
    (r"#db2777", "var(--brand-primary)"),
]

for root, _, files in os.walk(dir_path):
    for file in files:
        if file.endswith(".css"):
            file_path = os.path.join(root, file)
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()
            
            orig = content
            
            # For instagram, we keep it pink, so ignore messenger-themes.css
            if file == "messenger-themes.css" or file == "globals.css":
                continue
                
            for regex, rep in class_replacements:
                content = re.sub(regex, rep, content)
            
            if content != orig:
                with open(file_path, "w", encoding="utf-8") as f:
                    f.write(content)
                print(f"Updated {file_path}")

print("Done")
