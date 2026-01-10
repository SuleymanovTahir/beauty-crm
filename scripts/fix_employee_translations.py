import os
import sys

# Add backend directory to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../backend')))
from db.connection import get_db_connection

def fix_employee_translations():
    print("Connecting to PostgreSQL database...")
    conn = get_db_connection()
    c = conn.cursor()
    
    # Check if columns exist
    c.execute("SELECT column_name FROM information_schema.columns WHERE table_name='users'")
    columns = {col[0] for col in c.fetchall()}
    
    for lang in ['ru', 'en', 'ar']:
        for field in ['full_name', 'position', 'bio']:
            col_name = f"{field}_{lang}"
            if col_name not in columns:
                print(f"  Adding missing column: {col_name}")
                c.execute(f"ALTER TABLE users ADD COLUMN {col_name} TEXT")
    
    conn.commit()

    # Manual translations for specific employees
    translations = {
        'SIMO': {'ru': 'Симо', 'en': 'Simo', 'ar': 'سيمو'},
        'MESTAN': {'ru': 'Местан', 'en': 'Mestan', 'ar': 'ميستان'},
        'LYAZZAT': {'ru': 'Ляззат', 'en': 'Lyazzat', 'ar': 'лазат'},
        'GULYA': {'ru': 'Гуля', 'en': 'Gulya', 'ar': 'جوليا'},
        'JENNIFER': {'ru': 'Дженнифер', 'en': 'Jennifer', 'ar': 'جينيфер'},
        'Турсунай': {'ru': 'Турсунай', 'en': 'Tursunay', 'ar': 'тұрсынай'}
    }

    c.execute("SELECT id, full_name FROM users WHERE is_service_provider = TRUE")
    users = c.fetchall()
    
    for user_row in users:
        user_id, name = user_row[0], user_row[1]
        print(f"Processing: {name}")
        trans = translations.get(name) or translations.get(name.upper())
        if trans:
            updates = []
            params = []
            for lang, val in trans.items():
                updates.append(f"full_name_{lang} = %s")
                params.append(val)
            
            if updates:
                params.append(user_id)
                c.execute(f"UPDATE users SET {', '.join(updates)} WHERE id = %s", params)
                print(f"  ✅ Updated translations for {name}")

    conn.commit()
    conn.close()
    print("✨ Done!")

if __name__ == "__main__":
    fix_employee_translations()
