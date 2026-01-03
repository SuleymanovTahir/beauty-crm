import os

root_dir = '/Users/tahir/Desktop/beauty-crm/frontend/src/locales'

for root, dirs, files in os.walk(root_dir):
    for filename in files:
        if filename.endswith('.json'):
            old_path = os.path.join(root, filename)
            
            # Remove the 'l' prefix if it was part of the previous failure
            # e.g. lfeedback.json should be feedback.json
            name = filename
            if name.startswith('l') and len(name) > 1:
                # Check if the name without 'l' exists in the reference 'ru' locale
                # or if it's clearly a double-L case
                pass
            
            # Simple rule: if it starts with 'l' and there's a corresponding file in 'ru' without 'l'
            # But that's complicated. Let's just remove 'l' from the start and see if it's better.
            
            # Actually, most files in ru are lowercase. 
            # I'll just lowercase everything and remove the leading 'l' if it was my mistake.
            
            clean_name = filename.lower()
            if clean_name.startswith('l') and len(clean_name) > 1:
                # List of known files that start with l? None really.
                # All files I saw were like 'dashboard.json'
                # So 'ldashboard.json' is definitely wrong.
                # However 'loyalty.json' IS correct.
                
                # Check if it was my mistake: I added 'L' then lowercased it to 'l'
                # My mistake added 'L' to the start of the filename.
                
                # If I have 'ldashboard.json' and 'dashboard' is a known namespace
                clean_name = clean_name[1:]
            
            # Wait, this is still risky.
            # Let's just fix the known wrong ones.
            
            pass

# Let's try another approach. 
# Get all file names from 'ru' locale (the reference).
ref_names = set()
ref_dir_ru = os.path.join(root_dir, 'ru')
for root, dirs, files in os.walk(ref_dir_ru):
    for f in files:
        if f.endswith('.json'):
            ref_names.add(f.lower())

# Now for all other languages, find files that match ref_names (case-insensitive) or match with an 'l' prefix
for lang in ['en', 'ar', 'de', 'es', 'fr', 'hi', 'kk', 'pt']:
    lang_dir = os.path.join(root_dir, lang)
    for root, dirs, files in os.walk(lang_dir):
        for f in files:
            if not f.endswith('.json'): continue
            
            old_path = os.path.join(root, f)
            low_f = f.lower()
            
            target_name = low_f
            if low_f.startswith('l') and low_f[1:] in ref_names:
                target_name = low_f[1:]
            
            new_path = os.path.join(root, target_name)
            if old_path != new_path:
                print(f"Fixing {old_path} -> {new_path}")
                if os.path.exists(new_path):
                    os.remove(old_path)
                else:
                    os.rename(old_path, new_path)
