import os
import re

dir_path = "/Users/tahir/Desktop/beauty-crm/crm/frontend/src"

for root, _, files in os.walk(dir_path):
    for file in files:
        if file.endswith(".css"):
            file_path = os.path.join(root, file)
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()
            
            orig = content
            
            # Keep messenger themes standard, globals might have tailwind definitions.
            if file == "messenger-themes.css" or file == "globals.css":
                continue
                
            # Replace #2563eb with var(--brand-primary) globally across all other CSS files
            content = content.replace("#2563eb", "var(--brand-primary)")
            
            if content != orig:
                with open(file_path, "w", encoding="utf-8") as f:
                    f.write(content)
                print(f"Updated {file_path}")

print("Done")
