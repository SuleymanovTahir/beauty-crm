"""
Seed test data for beauty CRM
Creates services and links them to employees
"""
import sqlite3
import sys
sys.path.insert(0, '/home/user/beauty-crm/backend')
from core.config import DATABASE_NAME
from datetime import datetime

def seed_services():
    """Create test services"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    now = datetime.now().isoformat()

    # Clear existing services
    c.execute("DELETE FROM services")

    services = [
        # Hair services
        ("haircut", "Haircut", "Стрижка", 150, "AED", "Hair", "Professional haircut", "Профессиональная стрижка", None, 1),
        ("hair_coloring", "Hair Coloring", "Окрашивание волос", 300, "AED", "Hair", "Hair coloring", "Окрашивание волос", None, 1),

        # Nail services
        ("manicure", "Manicure", "Маникюр", 100, "AED", "Nails", "Professional manicure", "Профессиональный маникюр", None, 1),
        ("pedicure", "Pedicure", "Педикюр", 120, "AED", "Nails", "Professional pedicure", "Профессиональный педикюр", None, 1),

        # Brows services
        ("brow_shaping", "Brow Shaping", "Оформление бровей", 80, "AED", "Brows", "Brow shaping", "Оформление бровей", None, 1),
        ("brow_lamination", "Brow Lamination", "Ламинирование бровей", 150, "AED", "Brows", "Brow lamination", "Ламинирование бровей", None, 1),
        ("brow_tinting", "Brow Tinting", "Окрашивание бровей", 60, "AED", "Brows", "Brow tinting", "Окрашивание бровей", None, 1),

        # Lashes services
        ("lash_lamination", "Lash Lamination", "Ламинирование ресниц", 180, "AED", "Lashes", "Lash lamination", "Ламинирование ресниц", None, 1),

        # Massage services
        ("massage", "Massage", "Массаж", 200, "AED", "Massage", "Relaxing massage", "Расслабляющий массаж", None, 1),

        # Waxing services
        ("waxing", "Waxing", "Эпиляция", 150, "AED", "Waxing", "Professional waxing", "Профессиональная эпиляция", None, 1),
    ]

    for service in services:
        c.execute("""
            INSERT INTO services
            (service_key, name, name_ru, price, currency, category, description, description_ru, benefits, is_active, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, service + (now, now))

    conn.commit()
    print(f"✅ Created {len(services)} services")

    # Show summary by category
    c.execute("""
        SELECT category, COUNT(*) as count
        FROM services
        WHERE is_active = 1
        GROUP BY category
        ORDER BY category
    """)
    print("\n📊 Services by category:")
    for category, count in c.fetchall():
        print(f"   {category:20s}: {count} services")

    conn.close()

if __name__ == "__main__":
    print("=" * 70)
    print("🌱 SEEDING TEST DATA")
    print("=" * 70)

    seed_services()

    print("\n✅ Done!")
    print("=" * 70)
