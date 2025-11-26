import sqlite3
import os

DATABASE_NAME = "salon_bot.db"

def update_services():
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    # Helper to get service ID by name
    def get_service_id(name):
        c.execute("SELECT id FROM services WHERE name = ?", (name,))
        res = c.fetchone()
        return res[0] if res else None

    # Helper to upsert user_service
    def upsert_user_service(user_id, service_name, price, duration_minutes, online_booking=True, price_min=None, price_max=None):
        service_id = get_service_id(service_name)
        if not service_id:
            print(f"⚠️ Service not found: {service_name}")
            return

        # Check if exists
        c.execute("SELECT id FROM user_services WHERE user_id = ? AND service_id = ?", (user_id, service_id))
        existing = c.fetchone()

        if existing:
            c.execute("""
                UPDATE user_services 
                SET price = ?, duration = ?, is_online_booking_enabled = ?, price_min = ?, price_max = ?
                WHERE id = ?
            """, (price, duration_minutes, 1 if online_booking else 0, price_min, price_max, existing[0]))
            print(f"✅ Updated {service_name} for user {user_id}")
        else:
            c.execute("""
                INSERT INTO user_services (user_id, service_id, price, duration, is_online_booking_enabled, price_min, price_max)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (user_id, service_id, price, duration_minutes, 1 if online_booking else 0, price_min, price_max))
            print(f"✅ Inserted {service_name} for user {user_id}")

    # --- GULYA (ID: 11) ---
    # Half arms: 50 AED, 1h (60m)
    upsert_user_service(11, "Half arms", 50, 60, True)
    # Full body: 400 AED, 1h (60m)
    upsert_user_service(11, "Full body", 400, 60, True)
    # Bikini line: 100 AED, 1h (60m)
    upsert_user_service(11, "Bikini line", 100, 60, True)
    # Under arms: 50 AED, 1h (60m), Online: Off
    upsert_user_service(11, "Under arms", 50, 60, False)
    # Full bikini: 150 AED, 1h (60m), Online: Off
    upsert_user_service(11, "Full bikini", 150, 60, False)
    # Brazilian: 120 AED, 1h (60m)
    upsert_user_service(11, "Brazilian", 120, 60, True)
    # Full face: 90 AED, 1h (60m)
    upsert_user_service(11, "Full face", 90, 60, True)
    # Cheeks: 40 AED, 1h (60m)
    upsert_user_service(11, "Cheeks", 40, 60, True)
    # Upper lip: 30 AED, 1h (60m)
    upsert_user_service(11, "Upper lip", 30, 60, True)
    # Chin: 30 AED, 1h (60m)
    upsert_user_service(11, "Chin", 30, 60, True)

    # --- JENNIFER (ID: 12) ---
    # Hair wash: 60 AED, 30m, Online: Off
    upsert_user_service(12, "Hair wash", 60, 30, False)
    # Hair Treatment: 600-1500 AED, 3h (180m)
    upsert_user_service(12, "Hair Treatment", 600, 180, True, price_min=600, price_max=1500)

    conn.commit()
    conn.close()

if __name__ == "__main__":
    update_services()
