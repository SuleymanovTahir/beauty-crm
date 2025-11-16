"""
Seed employee_services relationships
Links employees to services they can perform based on their position
"""
import sqlite3
from datetime import datetime
from core.config import DATABASE_NAME
from utils.logger import log_info, log_warning


def seed_employee_services():
    """Create employee-service relationships based on position"""
    conn = sqlite3.connect(DATABASE_NAME)
    c = conn.cursor()

    now = datetime.now().isoformat()

    try:
        # Clear existing relationships
        c.execute("DELETE FROM employee_services")
        log_info("🧹 Cleared existing employee_services", "seed")

        # Get all employees
        c.execute("SELECT id, full_name, position FROM employees WHERE is_active = 1")
        employees = c.fetchall()

        # Get all services by category
        c.execute("SELECT id, category, name_ru FROM services WHERE is_active = 1")
        services = c.fetchall()

        # Build category mapping
        services_by_category = {}
        for service_id, category, name in services:
            if category not in services_by_category:
                services_by_category[category] = []
            services_by_category[category].append((service_id, name))

        # Position to categories mapping (case-insensitive)
        position_rules = {
            'Hair Stylist': ['Hair', 'Brows', 'Lashes'],
            'Nail Master': ['Nails'],
            'Nail/Waxing': ['Nails', 'Waxing', 'Brows'],
            'Nail Master/Massages': ['Nails', 'Massage'],
            'Владелец': []  # Owner can do everything or nothing (admin role)
        }

        total_links = 0

        for emp_id, full_name, position in employees:
            print(f"\n👤 {full_name} ({position})")

            # Get categories for this position
            categories = position_rules.get(position, [])

            if not categories:
                # Owner or unknown position - skip
                print(f"   ⏭️  Skipped (admin/owner role)")
                continue

            # Link to all services in these categories
            for category in categories:
                if category in services_by_category:
                    for service_id, service_name in services_by_category[category]:
                        try:
                            c.execute("""
                                INSERT INTO employee_services (employee_id, service_id, created_at)
                                VALUES (?, ?, ?)
                            """, (emp_id, service_id, now))
                            total_links += 1
                        except sqlite3.IntegrityError:
                            # Already exists
                            pass

                    print(f"   ✅ {category}: {len(services_by_category[category])} services")

        conn.commit()
        log_info(f"✅ Created {total_links} employee-service links", "seed")

        # Show summary
        print("\n" + "=" * 70)
        print("📊 SUMMARY:")
        c.execute("""
            SELECT e.full_name, e.position, COUNT(es.id) as service_count
            FROM employees e
            LEFT JOIN employee_services es ON e.id = es.employee_id
            WHERE e.is_active = 1
            GROUP BY e.id
            ORDER BY service_count DESC
        """)
        summary = c.fetchall()
        for name, position, count in summary:
            print(f"   {name:20s} ({position:25s}): {count:2d} services")
        print("=" * 70)

    except Exception as e:
        conn.rollback()
        log_warning(f"❌ Seed failed: {str(e)}", "seed")
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    seed_employee_services()
