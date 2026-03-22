import os
import re

dir_path = "/Users/tahir/Desktop/beauty-crm/crm/frontend/src"

# Define the replacements as a list of tuples to process in order
class_replacements = [
    (r"\bbg-gradient-to-r\s+from-pink-500\s+to-blue-600\s+hover:from-pink-600\s+hover:to-blue-700\b", "settings-button-gradient"),
    (r"\bbg-gradient-to-br\s+from-pink-500\s+to-blue-600\b", "settings-button-gradient"),
    (r"\bbg-gradient-to-r\s+from-pink-500\s+to-blue-600\b", "settings-button-gradient"),
    
    # Replacing bg-pink-600 hover:bg-pink-700
    (r"\bbg-pink-600\s+hover:bg-pink-700\b", "settings-bg-primary settings-bg-primary-hover"),
    (r"\bbg-pink-600\b", "settings-bg-primary"),
    (r"\bbg-pink-500\b", "settings-bg-primary"),
    (r"\bbg-pink-[67]00\b", "settings-bg-primary"),
    (r"\bfrom-pink-500\b", "settings-bg-primary"),
    (r"\btext-pink-600\b", "settings-text-primary"),
    (r"\bbg-pink-50\b", "settings-bg-primary-light"),
    (r"\bbg-pink-[123]00\b", "settings-bg-primary-light"),
    (r"\bborder-pink-[2-6]00\b", "brand-border"),
]

for root, _, files in os.walk(dir_path):
    for file in files:
        if file.endswith((".tsx", ".ts", ".css")):
            file_path = os.path.join(root, file)
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()
            
            orig = content
            
            # Specifically for `.bookings-add-button` which may contain different gradient styles
            if ".bookings-add-button" in content and file.endswith(".css"):
                content = re.sub(
                    r"(\.bookings-add-button\s*\{[^}]*)background:\s*linear-gradient[^;]*;", 
                    r"\1background: var(--brand-gradient);", 
                    content,
                    flags=re.MULTILINE
                )
                
            for regex, rep in class_replacements:
                content = re.sub(regex, rep, content)
            
            # For gradients without hover explicitly stated but part of a compound class
            content = re.sub(
                r"\bfrom-pink-500\s+to-blue-600\b", 
                "settings-button-gradient", 
                content
            )
            
            if content != orig:
                with open(file_path, "w", encoding="utf-8") as f:
                    f.write(content)
                print(f"Updated {file_path}")

print("Done")
