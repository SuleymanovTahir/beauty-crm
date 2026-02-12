"""
Script to update canonical salon settings content (single-field storage).
"""
import asyncio
import sys
from pathlib import Path

from db.connection import get_db_connection

# Add backend directory to path
sys.path.append(str(Path(__file__).resolve().parents[2]))


async def update_salon_settings_content():
    """Update canonical salon settings fields."""
    print("🔧 Updating salon settings content...")

    conn = get_db_connection()
    c = conn.cursor()

    try:
        address_value = "Shop 13, Amwaj 3 Plaza Level, JBR, Dubai, UAE"
        hours_value = "Daily 10:30 - 21:00"

        c.execute(
            """
            UPDATE salon_settings
            SET
                address = %s,
                hours = %s
            WHERE id = 1
            """,
            (address_value, hours_value),
        )

        if c.rowcount > 0:
            print("✅ Salon settings updated successfully")
        else:
            print("⚠️ Salon settings not found (id=1)")

        conn.commit()

    except Exception as e:
        print(f"❌ Error updating salon settings: {e}")
        conn.rollback()
    finally:
        conn.close()


if __name__ == "__main__":
    asyncio.run(update_salon_settings_content())
