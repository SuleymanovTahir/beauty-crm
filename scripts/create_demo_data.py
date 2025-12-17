
import asyncio
import os
import sys
from datetime import datetime, timedelta
import random

# Add project root to python path (assuming script is in scripts/ folder, backend is in backend/)
sys.path.append(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "backend"))

from db.users import create_user, get_user_by_email
from db.bookings import save_booking
from db.clients import get_or_create_client
from db.connection import get_db_connection

async def create_demo_data():
    print("🚀 Starting demo data creation...")

    # 1. Create Demo Client User
    email = "client@demo.com"
    password = "password123"
    name = "Demo Client"
    phone = "+971501234567"
    
    existing = get_user_by_email(email)
    if existing:
        print(f"⚠️ User {email} already exists. Skipping creation.")
    else:
        create_user(email, password, role="client", full_name=name, phone=phone)
        print(f"✅ Created user: {email} / {password} ({phone})")

    # 2. Ensure Client exists in 'clients' table (linked via instagram_id/username for now)
    # For web users, we might use username as ID or generated ID.
    # Let's map this user to instagram_id = user.username or generated.
    client_id = "demo_client_id" 
    get_or_create_client(client_id, username=name)
    print(f"✅ ensured client record for {client_id}")

    # 3. Create Bookings
    services = ["Manicure", "Pedicure", "Haircut", "Massage"]
    
    # Past bookings
    for i in range(3):
        date = (datetime.now() - timedelta(days=random.randint(1, 30))).strftime("%Y-%m-%d %H:%M")
        service = random.choice(services)
        save_booking(client_id, service, date, phone, name)
        # Manually update status to completed for demo purposes
        conn = get_db_connection()
        c = conn.cursor()
        c.execute("UPDATE bookings SET status = 'completed' WHERE instagram_id = %s AND datetime = %s", (client_id, date))
        conn.commit()
        conn.close()
        print(f"➕ Created past booking: {service} at {date}")

    # Future bookings
    for i in range(2):
        date = (datetime.now() + timedelta(days=random.randint(1, 14))).strftime("%Y-%m-%d %H:%M")
        service = random.choice(services)
        save_booking(client_id, service, date, phone, name)
        print(f"➕ Created future booking: {service} at {date}")

    print("\n🎉 Demo data creation complete!")
    print(f"👉 Login with: {email} / {password}")

if __name__ == "__main__":
    asyncio.run(create_demo_data())
