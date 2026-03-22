import os

dir_path = "/Users/tahir/Desktop/beauty-crm/crm/frontend/src"

for root, _, files in os.walk(dir_path):
    for file in files:
        if file.endswith((".css", ".tsx")):
            file_path = os.path.join(root, file)
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()
            
            orig = content
            
            # Keep messenger themes standard, globals might have tailwind definitions.
            if file == "messenger-themes.css" or file == "globals.css":
                continue
                
            # Replace #fdf2f8 with var(--brand-light) globally across all other CSS files
            content = content.replace("#fdf2f8", "var(--brand-light)")
            content = content.replace("bg-[#fdf2f8]", "bg-[var(--brand-light)]")
            
            if content != orig:
                with open(file_path, "w", encoding="utf-8") as f:
                    f.write(content)
                print(f"Updated {file_path}")

print("Done")
