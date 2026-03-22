import os
import re

css_path = "/Users/tahir/Desktop/beauty-crm/crm/frontend/src/pages/shared/Bookings.css"

with open(css_path, "r", encoding="utf-8") as f:
    content = f.read()

# Remove .messenger-instagram rule completely
content = re.sub(r"\.messenger-instagram\s*\{[^}]*\}\n*", "", content)

with open(css_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Updated Bookings.css")

crm_pages_path = "/Users/tahir/Desktop/beauty-crm/crm/frontend/src/styles/crm-pages.css"

with open(crm_pages_path, "r", encoding="utf-8") as f:
    content = f.read()

# Replace #ec008c with var(--brand-primary)
content = content.replace("#ec008c", "var(--brand-primary)")

with open(crm_pages_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Updated crm-pages.css")
