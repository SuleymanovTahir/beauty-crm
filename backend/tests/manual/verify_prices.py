import sys
import os
from db.connection import get_db_connection
from datetime import datetime

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from core.config import DATABASE_NAME
from bot.prompts import PromptBuilder

def verify_prices():
    print("🔍 Verifying pricing display in bot prompts...")
    
    conn = get_db_connection()
    c = conn.cursor()
    
    # Find a service that has at least one master and some pricing
    c.execute("""
        SELECT s.id, s.name, u.full_name, us.price, us.price_min, us.price_max
        FROM services s
        JOIN user_services us ON s.id = us.service_id
        JOIN users u ON u.id = us.user_id
        WHERE s.is_active = TRUE AND u.is_active = TRUE
        LIMIT 1
    """)
    row = c.fetchone()
    conn.close()
    
    if not row:
        print("⚠️  SKIP: No services with assigned masters found in database")
        return

    s_id, s_name, m_name, price, p_min, p_max = row
    print(f"Testing with service: '{s_name}' and master: '{m_name}'")
    
    prompts = PromptBuilder()
    text = prompts._build_booking_availability(
        instagram_id="test_user",
        service_name=s_name,
        preferred_date=datetime.now().strftime("%Y-%m-%d")
    )
    
    print("-" * 40)
    print(text)
    print("-" * 40)
    
    # Check if price is in text
    found_price = False
    if p_min and p_max:
        expected = f"{int(p_min)}-{int(p_max)}"
        if expected in text:
            print(f"✅ PASS: Found expected price range {expected}")
            found_price = True
    elif price:
        expected = f"{int(price)}"
        if expected in text:
            print(f"✅ PASS: Found expected price {expected}")
            found_price = True
            
    if not found_price:
        print("❌ FAIL: Could not find expected pricing in the availability text")
        sys.exit(1)

if __name__ == "__main__":
    verify_prices()
