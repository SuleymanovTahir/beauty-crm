"""
Seed Specific Employees and Services
Creates/Updates employees: Simo, Mestan, Lyazzat, Gulya, Jennifer
Assigns services with specific prices and durations.
"""
import sqlite3
import sys
import os
import hashlib
from datetime import datetime

# ...

def seed_specific_employees():
    # ... (rest of the function)
    
    # Default password hash
    default_password = "password123"
    password_hash = hashlib.sha256(default_password.encode()).hexdigest()
    
    print("\n2. Seeding Employees & Services...")

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from core.config import DATABASE_NAME

def seed_specific_employees():
    print(f"🔧 Seeding specific employees in: {DATABASE_NAME}")
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()
    
    # 1. Ensure Services Exist
    # Map service names to categories/types
    services_to_create = [
        # Hair (Simo, Mestan)
        ("Hair wash", "Hair", 60),
        ("Highlights", "Hair", 700),
        ("Balayage", "Hair", 700),
        ("Roots bleach and blow dry", "Hair", 350),
        ("Toner and blow dry", "Hair", 300),
        ("Bleach hair", "Hair", 1300),
        ("Hair Treatment", "Hair", 600),
        ("Natural Treatment", "Hair", 200),
        ("Hair extension (only work)", "Hair", 1500),
        ("Hair extensions (1 capsule)", "Hair", 10),
        ("Eyebrows coloring", "Brows", 40),
        ("Blow dry packages 5", "Promo", 500),
        ("Promo 390", "Promo", 390),
        
        # Nails (Lyazzat, Gulya, Jennifer)
        ("Manicure/Pedicure", "Nails", 120),
        ("Gel extension", "Nails", 350),
        ("Acrylic overlay", "Nails", 300),
        ("Acrylic extension", "Nails", 380),
        ("Remove nail extensions", "Nails", 50),
        ("Promotion overlay manicure, pedicure 290 aed", "Promo", 145),
        ("Promo mani pedi 250 без укрепления", "Promo", 125),
        ("Combo basic 150", "Promo", 75),
        
        # Waxing (Gulya, Jennifer)
        ("Half arms", "Waxing", 50),
        ("Full body", "Waxing", 400),
        ("Bikini line", "Waxing", 100),
        ("Under arms", "Waxing", 50),
        ("Full bikini", "Waxing", 150),
        ("Brazilian", "Waxing", 120),
        ("Full face", "Waxing", 90),
        ("Cheeks", "Waxing", 40),
        ("Upper lip", "Waxing", 30),
        ("Chin", "Waxing", 30),
        
        # Massage (Jennifer)
        ("Massage", "Massage", 200),
    ]
    
    service_map = {} # name -> id
    
    print("\n1. Checking Services...")
    for name, category, price in services_to_create:
        c.execute("SELECT id FROM services WHERE name = ?", (name,))
        row = c.fetchone()
        if row:
            service_map[name] = row[0]
        else:
            # Generate service_key
            service_key = name.lower().replace(" ", "_").replace("/", "_").replace("(", "").replace(")", "").replace("-", "_")
            # Ensure unique key if needed (simple check)
            
            try:
                c.execute("INSERT INTO services (name, service_key, category, price, duration) VALUES (?, ?, ?, ?, 60)", 
                         (name, service_key, category, price))
                service_map[name] = c.lastrowid
                print(f"   ➕ Created service: {name} (key: {service_key})")
            except sqlite3.IntegrityError:
                # If key exists, try appending random suffix or just skip
                print(f"   ⚠️ Service key collision for {name}, trying with suffix")
                service_key = f"{service_key}_{int(datetime.now().timestamp())}"
                c.execute("INSERT INTO services (name, service_key, category, price, duration) VALUES (?, ?, ?, ?, 60)", 
                         (name, service_key, category, price))
                service_map[name] = c.lastrowid
                print(f"   ➕ Created service: {name} (key: {service_key})")
            
    # 2. Employees Data
    employees = [
        {
            "name": "SIMO",
            "position": "HAIR STYLIST",
            "phone": "19", # Placeholder from user request
            "email": "simo@example.com",
            "bio": "Team member",
            "services": [
                {"name": "Hair wash", "price": 60, "duration": 30, "online": 0},
                {"name": "Balayage", "price_min": 700, "price_max": 1200, "duration": 60, "online": 0},
                {"name": "Roots bleach and blow dry", "price_min": 350, "price_max": 450, "duration": 60, "online": 0},
                {"name": "Toner and blow dry", "price_min": 300, "price_max": 450, "duration": 60, "online": 0},
                {"name": "Bleach hair", "price_min": 1300, "price_max": 2300, "duration": 60, "online": 0},
                {"name": "Hair Treatment", "price_min": 600, "price_max": 1500, "duration": 180, "online": 1},
                {"name": "Natural Treatment", "price": 200, "duration": 60, "online": 1},
                {"name": "Hair extension (only work)", "price": 1500, "duration": 60, "online": 0},
                {"name": "Hair extensions (1 capsule)", "price_min": 10, "price_max": 12, "duration": 60, "online": 0},
            ]
        },
        {
            "name": "MESTAN",
            "position": "HAIR STYLIST",
            "phone": "+971 50 180 0346",
            "email": "amandurdyyeva80@gmail.com",
            "bio": "Team member",
            "services": [
                {"name": "Hair wash", "price": 60, "duration": 30, "online": 0},
                {"name": "Natural Treatment", "price": 200, "duration": 60, "online": 1},
                {"name": "Hair extension (only work)", "price": 1500, "duration": 60, "online": 0},
                {"name": "Hair extensions (1 capsule)", "price_min": 10, "price_max": 12, "duration": 60, "online": 0},
                {"name": "Eyebrows coloring", "price": 40, "duration": 60, "online": 1},
                {"name": "Blow dry packages 5", "price": 500, "duration": 60, "online": 1},
                {"name": "Promo 390", "price": 390, "duration": 60, "online": 0},
            ]
        },
        {
            "name": "LYAZZAT",
            "position": "NAIL MASTER",
            "phone": "28",
            "email": "lyazzat@example.com",
            "bio": "Team member",
            "services": [
                {"name": "Gel extension", "price": 350, "duration": 60, "online": 0},
                {"name": "Acrylic overlay", "price": 300, "duration": 60, "online": 0},
                {"name": "Acrylic extension", "price": 380, "duration": 60, "online": 0},
                {"name": "Remove nail extensions", "price": 50, "duration": 60, "online": 1},
                {"name": "Promotion overlay manicure, pedicure 290 aed", "price": 145, "duration": 90, "online": 0},
                {"name": "Promo mani pedi 250 без укрепления", "price": 125, "duration": 60, "online": 0},
                {"name": "Combo basic 150", "price": 75, "duration": 60, "online": 0},
                {"name": "Promo 390", "price": 390, "duration": 60, "online": 0},
            ]
        },
        {
            "name": "GULYA",
            "position": "NAIL/WAXING",
            "phone": "40",
            "email": "gulya@example.com",
            "bio": "Team member",
            "services": [
                {"name": "Half arms", "price": 50, "duration": 60, "online": 1},
                {"name": "Full body", "price": 400, "duration": 60, "online": 1},
                {"name": "Bikini line", "price": 100, "duration": 60, "online": 1},
                {"name": "Under arms", "price": 50, "duration": 60, "online": 0},
                {"name": "Full bikini", "price": 150, "duration": 60, "online": 0},
                {"name": "Brazilian", "price": 120, "duration": 60, "online": 1},
                {"name": "Full face", "price": 90, "duration": 60, "online": 1},
                {"name": "Cheeks", "price": 40, "duration": 60, "online": 1},
                {"name": "Upper lip", "price": 30, "duration": 60, "online": 1},
                {"name": "Chin", "price": 30, "duration": 60, "online": 1},
            ]
        },
        {
            "name": "JENNIFER",
            "position": "NAIL MASTER/MASSAGES",
            "phone": "+971 56 420 8308",
            "email": "peradillajennifer47@gmail.com",
            "bio": "Team member",
            "services": [
                {"name": "Hair wash", "price": 60, "duration": 30, "online": 0},
                {"name": "Hair Treatment", "price_min": 600, "price_max": 1500, "duration": 180, "online": 1},
            ]
        }
    ]
    
    # Default password hash
    default_password = "password123"
    password_hash = hashlib.sha256(default_password.encode()).hexdigest()
    
    print("\n2. Seeding Employees & Services...")
    
    for emp in employees:
        # Create/Update User
        username = emp['name'].lower().replace(" ", "_")
        
        c.execute("SELECT id FROM users WHERE full_name = ?", (emp['name'],))
        user_row = c.fetchone()
        
        if user_row:
            user_id = user_row[0]
            print(f"   🔄 Updating {emp['name']} (ID: {user_id})")
            c.execute("""
                UPDATE users 
                SET position = ?, phone = ?, email = ?, bio = ?, is_service_provider = 1
                WHERE id = ?
            """, (emp['position'], emp['phone'], emp['email'], emp['bio'], user_id))
        else:
            print(f"   ➕ Creating {emp['name']}")
            c.execute("""
                INSERT INTO users (username, password_hash, full_name, role, position, phone, email, bio, is_service_provider, is_active)
                VALUES (?, ?, ?, 'employee', ?, ?, ?, ?, 1, 1)
            """, (username, password_hash, emp['name'], emp['position'], emp['phone'], emp['email'], emp['bio']))
            user_id = c.lastrowid
            
        # Assign Services
        c.execute("DELETE FROM user_services WHERE user_id = ?", (user_id,))
        
        for svc in emp['services']:
            svc_name = svc['name']
            if svc_name in service_map:
                svc_id = service_map[svc_name]
                
                price = svc.get('price')
                price_min = svc.get('price_min')
                price_max = svc.get('price_max')
                duration = svc.get('duration', 60)
                online = svc.get('online', 1)
                
                c.execute("""
                    INSERT INTO user_services (
                        user_id, service_id, price, price_min, price_max, duration, is_online_booking_enabled
                    ) VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (user_id, svc_id, price, price_min, price_max, duration, online))
                # print(f"      Linked: {svc_name}")
            else:
                print(f"      ⚠️ Service not found: {svc_name}")
                
    conn.commit()
    conn.close()
    print("\n✨ Seeding completed!")

if __name__ == "__main__":
    seed_specific_employees()
