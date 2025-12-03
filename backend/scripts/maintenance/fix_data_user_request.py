from db.connection import get_db_connection
import os

DATABASE_NAME = "salon_bot.db"

def fix_data():
    conn = get_db_connection()
    c = conn.cursor()
    
    print("🔧 Starting data fix...")

    # 1. Fix Salon Email
    email = "mladiamontuae@gmail.com"
    print(f"📧 Updating salon email to: {email}")
    
    # Update base email and all translations (since it shouldn't be translated)
    c.execute("""
        UPDATE salon_settings 
        SET email = %s,
            email_ru = %s, email_en = %s, email_ar = %s,
            email_de = %s, email_es = %s, email_fr = %s,
            email_hi = %s, email_kk = %s, email_pt = %s
        WHERE id = 1
    """, (email, email, email, email, email, email, email, email, email, email))
    
    print("✅ Salon email updated.")

    # 2. Update Employee Positions to Russian
    # This ensures the translation script (which uses RU as source) works correctly
    employees = [
        ("Дженнифер", "Мастер маникюра / Массаж"),
        ("Ляззат", "Мастер маникюра"),
        ("Местан", "Стилист"),
        ("Симо", "Стилист")
    ]
    
    print("👥 Updating employee positions...")
    for name, position_ru in employees:
        # Check if user exists
        c.execute("SELECT id FROM users WHERE full_name LIKE %s", (f"%{name}%",))
        row = c.fetchone()
        if row:
            user_id = row[0]
            # Update position (which is the source field for translations)
            # And clear translations to force re-translation
            c.execute("""
                UPDATE users 
                SET position = %s, position_ru = %s,
                    position_en = NULL, position_ar = NULL, position_de = NULL,
                    position_es = NULL, position_fr = NULL, position_hi = NULL,
                    position_kk = NULL, position_pt = NULL
                WHERE id = %s
            """, (position_ru, position_ru, user_id))
            print(f"  ✅ Updated {name} -> {position_ru}")
        else:
            print(f"  ⚠️ User {name} not found")

    conn.commit()
    conn.close()
    print("✨ Data fix complete!")

if __name__ == "__main__":
    fix_data()
