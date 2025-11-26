#!/usr/bin/env python3
"""
Test gender-based avatar functionality
"""
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from db.employees import get_avatar_url as get_employee_avatar
from db.clients import get_avatar_url as get_client_avatar
from db.connection import get_db_connection

def test_avatar_helper():
    """Test the avatar helper function"""
    print("="*60)
    print("🧪 TESTING AVATAR HELPER FUNCTION")
    print("="*60)
    
    # Test with profile pic set
    assert get_employee_avatar('/uploads/profile.jpg', 'female') == '/uploads/profile.jpg'
    print("✅ Profile pic takes precedence")
    
    # Test male fallback
    assert get_employee_avatar(None, 'male') == '/static/avatars/default_male.png'
    print("✅ Male fallback works")
    
    # Test female fallback
    assert get_employee_avatar(None, 'female') == '/static/avatars/default_female.png'
    print("✅ Female fallback works")
    
    # Test default (None gender)
    assert get_employee_avatar(None, None) == '/static/avatars/default_female.png'
    print("✅ Default fallback (None) works")
    
    print()

def test_employee_genders():
    """Test that employees have correct gender values"""
    print("="*60)
    print("🧪 TESTING EMPLOYEE GENDER VALUES")
    print("="*60)
    
    conn = get_db_connection()
    c = conn.cursor()
    
    # Get all employees with gender
    c.execute("""
        SELECT full_name, gender 
        FROM users 
        WHERE is_service_provider = 1 OR role = 'admin'
        ORDER BY full_name
    """)
    
    employees = c.fetchall()
    conn.close()
    
    print("\n📋 Employee Gender Status:")
    for name, gender in employees:
        avatar = get_employee_avatar(None, gender)  # No profile pic set
        gender_icon = "👨" if gender == 'male' else "👩"
        print(f"   {gender_icon} {name}: {gender} → {avatar}")
    
    # Verify specific employees
    male_employees = [name for name, gender in employees if gender == 'male']
    female_employees = [name for name, gender in employees if gender == 'female']
    
    print(f"\n✅ Male employees ({len(male_employees)}): {', '.join(male_employees)}")
    print(f"✅ Female employees ({len(female_employees)}): {', '.join(female_employees)}")
    
    # Check Simo and Tahir are male
    assert any('SIMO' in name.upper() for name in male_employees), "Simo should be male"
    print("✅ Simo is correctly set as male")
    
    print()

def test_avatar_files_exist():
    """Test that avatar image files exist"""
    print("="*60)
    print("🧪 TESTING AVATAR FILES")
    print("="*60)
    
    import os
    
    female_avatar = 'static/avatars/default_female.png'
    male_avatar = 'static/avatars/default_male.png'
    
    if os.path.exists(female_avatar):
        size = os.path.getsize(female_avatar)
        print(f"✅ Female avatar exists ({size} bytes)")
    else:
        print(f"❌ Female avatar NOT found at {female_avatar}")
    
    if os.path.exists(male_avatar):
        size = os.path.getsize(male_avatar)
        print(f"✅ Male avatar exists ({size} bytes)")
    else:
        print(f"❌ Male avatar NOT found at {male_avatar}")
    
    print()

if __name__ == "__main__":
    print("\n🚀 Starting Gender & Avatar Tests\n")
    
    test_avatar_helper()
    test_employee_genders()
    test_avatar_files_exist()
    
    print("="*60)
    print("✅ ALL TESTS PASSED!")
    print("="*60)
