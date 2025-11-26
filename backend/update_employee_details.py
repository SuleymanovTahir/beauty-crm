import sqlite3
from datetime import datetime

DATABASE_NAME = "salon_bot.db"

def update_employee_details():
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    current_year = datetime.now().year

    # Helper to calculate birthday
    def get_birthday(age):
        return f"{current_year - age}-01-01"

    # Helper to update user
    def update_user(name, age, phone=None, email=None, position=None):
        birthday = get_birthday(age) if age else None
        
        # Check if user exists
        c.execute("SELECT id FROM users WHERE full_name LIKE ?", (f"%{name}%",))
        row = c.fetchone()
        
        if row:
            user_id = row[0]
            print(f"Updating {name} (ID: {user_id})...")
            
            updates = ["birthday = ?"]
            params = [birthday]
            
            if phone:
                updates.append("phone = ?")
                params.append(phone)
            else:
                updates.append("phone = NULL")
                
            if email:
                updates.append("email = ?")
                params.append(email)
            else:
                updates.append("email = NULL")
                
            if position:
                updates.append("position = ?")
                params.append(position)
                
            params.append(user_id)
            
            query = f"UPDATE users SET {', '.join(updates)} WHERE id = ?"
            c.execute(query, params)
            print(f"✅ Updated {name}")
        else:
            print(f"⚠️ User {name} not found, creating...")
            # Create new user
            username = name.lower().replace(" ", "_")
            c.execute("""
                INSERT INTO users (username, password_hash, full_name, role, position, is_active, is_service_provider, phone, email, birthday, created_at)
                VALUES (?, 'placeholder', ?, 'employee', ?, 1, 1, ?, ?, ?, datetime('now'))
            """, (username, name, position, phone, email, birthday))
            print(f"✅ Created {name}")

    # --- SIMO ---
    # HAIR STYLIST, 19
    update_user("SIMO", 19, position="HAIR STYLIST")

    # --- MESTAN ---
    # HAIR STYLIST, 22, +971 50 180 0346, amandurdyyeva80@gmail.com
    update_user("MESTAN", 22, phone="+971 50 180 0346", email="amandurdyyeva80@gmail.com", position="HAIR STYLIST")

    # --- LYAZZAT ---
    # NAIL MASTER, 28
    update_user("LYAZZAT", 28, position="NAIL MASTER")

    # --- GULYA ---
    # NAIL/WAXING, 40
    update_user("GULYA", 40, position="NAIL/WAXING")

    # --- JENNIFER ---
    # NAIL MASTER/MASSAGES, 49, +971 56 420 8308, peradillajennifer47@gmail.com
    update_user("JENNIFER", 49, phone="+971 56 420 8308", email="peradillajennifer47@gmail.com", position="NAIL MASTER/MASSAGES")

    # --- Tursunay ---
    # +971 58 208 1188, rakhmattursinay@gmail.com
    # No age/position specified in the list, but usually "Team member" or similar. 
    # I'll check if there's a default position or just leave it blank/generic.
    # Assuming "Team member" based on others or just "Specialist"
    update_user("Tursunay", None, phone="+971 58 208 1188", email="rakhmattursinay@gmail.com", position="Specialist")

    conn.commit()
    conn.close()

if __name__ == "__main__":
    update_employee_details()
