#!/usr/bin/env python3
"""
Test script to verify bot integration of employee-specific prices
"""
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from bot.prompts import PromptBuilder
from db import get_salon_settings, get_bot_settings

def test_bot_masters_list():
    """Test that bot context includes employee-specific prices"""
    print("="*60)
    print("🧪 TESTING BOT MASTERS LIST WITH PRICES")
    print("="*60)
    
    # Build the prompt
    builder = PromptBuilder(
        salon=get_salon_settings(),
        bot_settings=get_bot_settings()
    )
    
    # Get masters list
    masters_list = builder._build_masters_list('ru')
    
    print("\n📋 MASTERS LIST OUTPUT:")
    print("-"*60)
    print(masters_list)
    print("-"*60)
    
    # Verify Gulya's services
    print("\n✅ VERIFICATION CHECKS:")
    
    checks = [
        ("Gulya mentioned", any(name in masters_list for name in ["Gulya", "Гуля", "GULYA"])),
        ("50 AED (Half arms)", "50 AED" in masters_list),
        ("100 AED (Bikini line)", "100 AED" in masters_list),
        ("150 AED (Full bikini)", "150 AED" in masters_list),
        ("Online booking disabled marker", "только по телефону" in masters_list),
    ]
    
    all_passed = True
    for check_name, result in checks:
        status = "✅" if result else "❌"
        print(f"   {status} {check_name}: {result}")
        if not result:
            all_passed = False
    
    # Verify Jennifer's services
    print("\n   Jennifer's services:")
    jennifer_checks = [
        ("Jennifer mentioned", any(name in masters_list for name in ["Jennifer", "Дженнифер", "JENNIFER"])),
        ("Hair wash (60 AED, offline)", "60 AED" in masters_list),
        ("Hair Treatment (600-1500 AED)", "600-1500 AED" in masters_list or "600" in masters_list),
    ]
    
    for check_name, result in jennifer_checks:
        status = "✅" if result else "❌"
        print(f"   {status} {check_name}: {result}")
        if not result:
            all_passed = False
    
    print("\n" + "="*60)
    if all_passed:
        print("✅ ALL CHECKS PASSED!")
    else:
        print("❌ SOME CHECKS FAILED - Review output above")
    print("="*60)
    
    return all_passed


def test_bot_slot_filtering():
    """Test that slot availability filters by user_services"""
    print("\n" + "="*60)
    print("🧪 TESTING SLOT FILTERING BY USER_SERVICES")
    print("="*60)
    
    from bot.tools import get_available_time_slots
    from datetime import datetime, timedelta
    
    # Get tomorrow's date
    tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
    
    # Test 1: Get slots for a service Gulya provides (Half arms)
    print(f"\n📅 Test 1: Slots for 'Half arms' on {tomorrow}")
    slots_half_arms = get_available_time_slots(
        date=tomorrow,
        service_name="Half arms",
        duration_minutes=60
    )
    
    print(f"   Found {len(slots_half_arms)} slots")
    if slots_half_arms:
        print(f"   Sample: {slots_half_arms[0]}")
        # Check if Gulya is in the results
        gulya_found = any("Gulya" in slot.get('master', '') or "Гуля" in slot.get('master', '') 
                         for slot in slots_half_arms)
        print(f"   ✅ Gulya found in results: {gulya_found}")
    
    # Test 2: Get slots for a service with online booking disabled (Under arms)
    print(f"\n📅 Test 2: Slots for 'Under arms' on {tomorrow}")
    slots_under_arms = get_available_time_slots(
        date=tomorrow,
        service_name="Under arms",
        duration_minutes=60
    )
    
    print(f"   Found {len(slots_under_arms)} slots")
    print(f"   ⚠️  Expected: 0 slots (online booking disabled)")
    
    if len(slots_under_arms) == 0:
        print(f"   ✅ CORRECT: No slots shown (online booking disabled)")
    else:
        print(f"   ❌ ERROR: Slots shown despite online booking being disabled!")
    
    print("\n" + "="*60)


if __name__ == "__main__":
    print("\n🚀 Starting Bot Integration Tests\n")
    
    # Run tests
    test1_passed = test_bot_masters_list()
    test_bot_slot_filtering()
    
    print("\n✅ Tests complete!")
    sys.exit(0 if test1_passed else 1)
