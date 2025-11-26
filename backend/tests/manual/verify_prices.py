import sys
import os
import sqlite3
from datetime import datetime

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from core.config import DATABASE_NAME
from bot.prompts import PromptBuilder

def verify_prices():
    print("🔍 Verifying specific employee prices...")
    
    prompts = PromptBuilder()
    
    # Test 1: Simo - Balayage (Range 700-1200)
    print("\n1️⃣ Testing SIMO - Balayage (Expect: 700 - 1200 AED)")
    text = prompts._build_booking_availability(
        instagram_id="test_user",
        service_name="Balayage",
        preferred_date=datetime.now().strftime("%Y-%m-%d")
    )
    print("-" * 40)
    print(text)
    print("-" * 40)
    
    if "SIMO (700 - 1200 AED)" in text:
        print("✅ PASS: Simo price range correct")
    else:
        print("❌ FAIL: Simo price range not found")

    # Test 2: Lyazzat - Gel extension (Fixed 350)
    print("\n2️⃣ Testing LYAZZAT - Gel extension (Expect: 350 AED)")
    text = prompts._build_booking_availability(
        instagram_id="test_user",
        service_name="Gel extension",
        preferred_date=datetime.now().strftime("%Y-%m-%d")
    )
    print("-" * 40)
    print(text)
    print("-" * 40)
    
    if "LYAZZAT (350 AED)" in text:
        print("✅ PASS: Lyazzat price correct")
    else:
        print("❌ FAIL: Lyazzat price not found")

if __name__ == "__main__":
    verify_prices()
