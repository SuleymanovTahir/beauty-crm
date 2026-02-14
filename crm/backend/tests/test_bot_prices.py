#!/usr/bin/env python3
"""
Test script to verify bot integration of employee-specific prices
Updated for 2026 Price List
"""
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from bot.prompts import PromptBuilder
from db.settings import get_salon_settings, get_bot_settings

def test_bot_masters_list():
    """Test that bot context includes employee-specific prices"""
    print("="*60)
    print("[TEST] TESTING BOT MASTERS LIST WITH NEW 2026 PRICES")
    print("="*60)
    
    # Build the prompt
    builder = PromptBuilder(
        salon=get_salon_settings(),
        bot_settings=get_bot_settings()
    )
    
    # Get masters list
    masters_list = builder._build_masters_list('ru')
    
    print("\n[LIST] MASTERS LIST OUTPUT:")
    print("-"*60)
    print(masters_list)
    print("-"*60)
    
    # Verify Gulcehre's services
    print("\n[VERIFY] VERIFICATION CHECKS:")
    
    checks = [
        ("Gulcehre (Gulya) mentioned", any(name in masters_list for name in ["Gulcehre", "Gulya", "Гуля"])),
        ("50 AED (Half arms)", "50 AED" in masters_list),
        ("100 AED (Bikini line)", "100 AED" in masters_list),
        ("150 AED (Full bikini)", "150 AED" in masters_list),
        ("Online booking disabled marker", "только по телефону" in masters_list or "phone only" in masters_list),
    ]
    
    all_passed = True
    for check_name, result in checks:
        status = "[OK]" if result else "[FAIL]"
        print(f"   {status} {check_name}: {result}")
        if not result:
            all_passed = False
    
    # Verify Mohamed Sabri's services (Director/Hair)
    print("\n   Mohamed Sabri's services:")
    sabri_checks = [
        ("Mohamed Sabri mentioned", "Mohamed Sabri" in masters_list),
        ("Hair services mentioned", any(service in masters_list for service in ["Укладка", "Стрижка", "Окрашивание"])),
    ]
    
    for check_name, result in sabri_checks:
        status = "[OK]" if result else "[FAIL]"
        print(f"   {status} {check_name}: {result}")
        if not result:
            all_passed = False
            
    # Verify Tursunay (Should NOT have services)
    print("\n   Tursunay check:")
    tursunay_present = "Турсунай" in masters_list
    # Note: She might be mentioned as director but shouldn't have services in the list
    if tursunay_present and " - " in masters_list.split("Турсунай")[1].split("\n\n")[0]:
         print("   [FAIL] ERROR: Tursunay has services listed!")
         all_passed = False
    else:
         print("   [OK] Tursunay has no services (Correct)")
    
    print("\n" + "="*60)
    if all_passed:
        print("[OK] ALL CHECKS PASSED!")
    else:
        print("[FAIL] SOME CHECKS FAILED - Review output above")
    print("="*60)
    
    return all_passed

def test_bot_slot_filtering():
    """Test that slot availability filters by user_services"""
    print("\n" + "="*60)
    print("[TEST] SLOT FILTERING BY USER_SERVICES")
    print("="*60)
    
    from bot.tools import get_available_time_slots
    from datetime import datetime, timedelta
    
    # Get tomorrow's date
    tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
    
    # Test 1: Get slots for a service Gulcehre provides (Half arms)
    # Using specific key snippet to find service
    service_name_to_test = "Подмышки" 
    print(f"\n[DATE] Test 1: Slots for '{service_name_to_test}' on {tomorrow}")
    slots = get_available_time_slots(
        date=tomorrow,
        service_name=service_name_to_test,
        duration_minutes=30
    )
    
    print(f"   Found {len(slots)} slots")
    print(f"   [WARN] Expected: 0 slots (online booking disabled for 'Подмышки')")
    
    if len(slots) == 0:
        print(f"   [OK] CORRECT: No slots shown (online booking disabled)")
    else:
        print(f"   [FAIL] ERROR: Slots shown despite online booking being disabled!")
        # If slots shown, print who is doing it
        masters_shown = set(s.get('master') for s in slots)
        print(f"   Shown for: {masters_shown}")
    
    # Test 2: Get slots for Mani
    service_name_test_2 = "Маникюр"
    print(f"\n[DATE] Test 2: Slots for '{service_name_test_2}' on {tomorrow}")
    slots_mani = get_available_time_slots(
        date=tomorrow,
        service_name=service_name_test_2,
        duration_minutes=60
    )
    print(f"   Found {len(slots_mani)} slots")
    if slots_mani:
        print(f"   Sample: {slots_mani[0]}")
        gulya_found = any(name in slots_mani[0].get('master', '') for name in ["Gulcehre", "Gulya", "Гуля"])
        print(f"   [OK] Gulcehre found in results: {gulya_found}")
    
    print("\n" + "="*60)

if __name__ == "__main__":
    print("\n🚀 Starting Bot Price & Logic Tests\n")
    
    # Run tests
    test1_passed = test_bot_masters_list()
    test_bot_slot_filtering()
    
    print(f"\n✅ Tests complete!")
    sys.exit(0 if test1_passed else 1)
