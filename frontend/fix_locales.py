import os

root_dir = '/Users/tahir/Desktop/beauty-crm/frontend/src/locales'

for root, dirs, files in os.walk(root_dir):
    for filename in files:
        if filename.endswith('.json'):
            # First, handle the mess I made with 'L' prefix
            new_filename = filename
            if new_filename.startswith('L') and new_filename != 'Layouts.json': # Be careful
                 # Check if it was a mistake (e.g. LDashboard.json)
                 # Most of them seem to have L prefix now
                 pass
            
            # Safe way: replace any uppercase with lowercase
            # Actually, let's just remove the L prefix if it matches my mistake pattern
            # My mistake was: s/\(.*\)\/\(.*\)/\1\/\L\2/
            # This resulted in LDashboard.json instead of dashboard.json
            
            clean_name = filename
            if clean_name.startswith('L') and len(clean_name) > 1 and clean_name[1].isupper():
                clean_name = clean_name[1:]
            
            final_name = clean_name.lower()
            
            old_path = os.path.join(root, filename)
            new_path = os.path.join(root, final_name)
            
            if old_path != new_path:
                print(f"Renaming {old_path} -> {new_path}")
                if os.path.exists(new_path):
                    # Merge if exists? For now just overwrite or delete old
                    # But wait, if both exist, maybe we should be careful.
                    # Since I'm fixing a mess, I'll just remove the old one if it's the L version
                    pass
                os.rename(old_path, new_path)
