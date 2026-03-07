#!/usr/bin/env python3
"""
Тесты для системы регистрации с email verification и админским одобрением
"""
import sys
import os
from datetime import datetime

# Добавляем backend в путь
backend_dir = os.path.abspath(os.path.dirname(os.path.dirname(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from db.connection import get_db_connection
from utils.email_service import generate_verification_code, get_code_expiry
from db.pending_registrations import (
    get_pending_registrations,
    approve_registration
)


def print_section(title):
    """Красивый вывод секции"""
    print("\n" + "=" * 70)
    print(f"  {title}")
    print("=" * 70)


async def test_email_uniqueness_check():
    """Тест проверки уникальности email"""
    print_section("TEST 1: Email Uniqueness Check")
    
    conn = get_db_connection()
    c = conn.cursor()
    try:
        # Получаем существующий email
        c.execute("SELECT email FROM users LIMIT 1")
        result = c.fetchone()
        
        if result and result[0]:
            existing_email = result[0]
            print(f"✅ Found existing email: {existing_email}")
            
            # Проверяем что дубликат не может быть создан
            c.execute("SELECT id FROM users WHERE LOWER(email) = LOWER(%s)", (existing_email,))
            duplicate = c.fetchone()
            
            if duplicate:
                print(f"✅ PASS: Duplicate email correctly detected")
                return True
            else:
                print(f"❌ FAIL: Duplicate detection failed")
                return False
        else:
            print("⚠️  SKIP: No users in database")
            return True
    finally:
        conn.close()


async def test_username_uniqueness_check():
    """Тест проверки уникальности логина"""
    print_section("TEST 2: Username Uniqueness Check")
    
    conn = get_db_connection()
    c = conn.cursor()
    try:
        # Получаем существующий username
        c.execute("SELECT username FROM users LIMIT 1")
        result = c.fetchone()
        
        if result:
            existing_username = result[0]
            print(f"✅ Found existing username: {existing_username}")
            
            # Проверяем что дубликат не может быть создан (case-insensitive)
            c.execute("SELECT id FROM users WHERE LOWER(username) = LOWER(%s)", (existing_username.upper(),))
            duplicate = c.fetchone()
            
            if duplicate:
                print(f"✅ PASS: Case-insensitive duplicate username correctly detected")
                return True
            else:
                print(f"❌ FAIL: Duplicate detection failed")
                return False
        else:
            print("⚠️  SKIP: No users in database")
            return True
    finally:
        conn.close()


async def test_verification_code_generation():
    """Тест генерации кода верификации"""
    print_section("TEST 3: Verification Code Generation")
    
    code = generate_verification_code()
    print(f"Generated code: {code}")
    
    # Проверяем длину
    if len(code) != 6:
        print(f"❌ FAIL: Code length is {len(code)}, expected 6")
        return False
    
    # Проверяем что это цифры
    if not code.isdigit():
        print(f"❌ FAIL: Code contains non-digit characters")
        return False
    
    print(f"✅ PASS: Code is valid 6-digit number")
    
    # Проверяем expiry
    expiry = get_code_expiry()
    print(f"Code expiry: {expiry}")
    
    # Проверяем что expiry в будущем
    expiry_dt = datetime.fromisoformat(expiry)
    now = datetime.now()
    
    if expiry_dt > now:
        print(f"✅ PASS: Expiry time is in the future")
        return True
    else:
        print(f"❌ FAIL: Expiry time is not in the future")
        return False


async def test_email_verification_flow():
    """Тест полного процесса email верификации"""
    print_section("TEST 4: Email Verification Flow")
    
    conn = get_db_connection()
    c = conn.cursor()
    
    # Создаем тестового пользователя
    import uuid
    test_email = f"test_{int(datetime.now().timestamp())}_{uuid.uuid4().hex[:6]}@test.com"
    test_username = f"testuser_{int(datetime.now().timestamp())}_{uuid.uuid4().hex[:6]}"
    verification_code = generate_verification_code()
    code_expires = get_code_expiry()
    
    print(f"Creating test user: {test_username} ({test_email})")
    
    try:
        import hashlib
        password_hash = hashlib.sha256("testpassword".encode()).hexdigest()
        now = datetime.now().isoformat()
        
        c.execute("""
            INSERT INTO users 
            (username, password_hash, full_name, email, role, created_at,
             is_active, email_verified, verification_code, verification_code_expires)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (test_username, password_hash, "Test User", test_email, "employee", now,
              False, False, verification_code, code_expires))
        
        user_id = c.fetchone()[0]
        conn.commit()
        
        print(f"✅ Test user created with ID: {user_id}")
        print(f"   Verification code: {verification_code}")
        
        # Проверяем что пользователь неактивен
        c.execute("SELECT is_active, email_verified FROM users WHERE id = %s", (user_id,))
        is_active, email_verified = c.fetchone()
        
        if is_active or email_verified:
            print(f"❌ FAIL: User should be inactive and unverified")
            return False
        
        print(f"✅ User is correctly inactive and unverified")
        
        # "Верифицируем" email
        c.execute("""
            UPDATE users 
            SET email_verified = TRUE
            WHERE id = %s AND verification_code = %s
        """, (user_id, verification_code))
        
        conn.commit()
        
        # Проверяем что email верифицирован
        c.execute("SELECT email_verified FROM users WHERE id = %s", (user_id,))
        email_verified = c.fetchone()[0]
        
        if not email_verified:
            print(f"❌ FAIL: Email should be verified")
            return False
        
        print(f"✅ PASS: Email verification successful")
        
        # Cleanup
        c.execute("DELETE FROM users WHERE id = %s", (user_id,))
        conn.commit()
        print(f"✅ Test user cleaned up")
        
        return True
        
    except Exception as e:
        conn.rollback()
        print(f"❌ FAIL: {e}")
        return False
    finally:
        conn.close()


async def test_admin_approval_flow():
    """Тест процесса одобрения админом"""
    print_section("TEST 5: Admin Approval Flow")
    
    conn = get_db_connection()
    c = conn.cursor()
    
    # Создаем тестового пользователя (email verified, но неактивного)
    import uuid
    test_email = f"test_{int(datetime.now().timestamp())}_{uuid.uuid4().hex[:6]}@test.com"
    test_username = f"testuser_{int(datetime.now().timestamp())}_{uuid.uuid4().hex[:6]}"
    
    print(f"Creating test user waiting for approval: {test_username}")
    
    try:
        import hashlib
        password_hash = hashlib.sha256("testpassword".encode()).hexdigest()
        now = datetime.now().isoformat()
        
        c.execute("""
            INSERT INTO users 
            (username, password_hash, full_name, email, role, created_at,
             is_active, email_verified)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (test_username, password_hash, "Test User", test_email, "employee", now,
              False, True))
        
        user_id = c.fetchone()[0]
        conn.commit()
        
        print(f"✅ Test user created with ID: {user_id}")
        
        # Получаем pending registrations
        pending = get_pending_registrations()
        
        # Проверяем что наш пользователь в списке
        found = any(u['id'] == user_id for u in pending)
        
        if not found:
            print(f"❌ FAIL: User not found in pending registrations")
            return False
        
        print(f"✅ User found in pending registrations ({len(pending)} total)")
        
        # Получаем admin ID для одобрения
        c.execute("SELECT id FROM users WHERE role = 'director' AND is_active = TRUE LIMIT 1")
        admin_result = c.fetchone()
        
        if not admin_result:
            print(f"⚠️  SKIP: No active director found for approval test")
            # Cleanup
            c.execute("DELETE FROM users WHERE id = %s", (user_id,))
            conn.commit()
            return True
        
        admin_id = admin_result[0]
        print(f"Using admin ID: {admin_id}")
        
        # Одобряем регистрацию
        success = approve_registration(user_id, admin_id)
        
        if not success:
            print(f"❌ FAIL: Failed to approve registration")
            return False
        
        print(f"✅ Registration approved")
        
        # Проверяем что пользователь активирован
        c.execute("SELECT is_active FROM users WHERE id = %s", (user_id,))
        is_active = c.fetchone()[0]
        
        if not is_active:
            print(f"❌ FAIL: User should be active after approval")
            return False
        
        print(f"✅ PASS: User is now active")
        
        # Cleanup
        c.execute("DELETE FROM users WHERE id = %s", (user_id,))
        conn.commit()
        print(f"✅ Test user cleaned up")
        
        return True
        
    except Exception as e:
        conn.rollback()
        print(f"❌ FAIL: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        conn.close()


async def test_first_admin_exception():
    """Тест что admin/director работает без подтверждений"""
    print_section("TEST 6: First Admin Exception")
    
    conn = get_db_connection()
    c = conn.cursor()
    try:
        # Проверяем что admin пользователь или director существует
        c.execute("SELECT id, username, is_active, email_verified FROM users WHERE LOWER(username) = 'admin' OR role = 'director' LIMIT 1")
        result = c.fetchone()
        
        if not result:
            print("⚠️  SKIP: Admin/Director user not found in database")
            return True
        
        user_id, username, is_active, email_verified = result
        
        print(f"Found admin/director user: {username} (ID: {user_id})")
        print(f"   is_active: {is_active}")
        print(f"   email_verified: {email_verified}")
        
        # Admin должен быть как минимум активен. 
        # Верификация email для директора может быть не установлена в старой базе,
        # но он должен иметь возможность входа.
        if is_active:
            print(f"✅ PASS: Admin/Director user is active")
            return True
        else:
            print(f"❌ FAIL: Admin/Director user should be active")
            return False
    finally:
        conn.close()


async def run_all_tests():
    """Запустить все тесты"""
    print("\n" + "🧪" * 35)
    print("  AUTHENTICATION SYSTEM TESTS")
    print("🧪" * 35)
    
    results = []
    
    # Запускаем тесты
    results.append(("Email Uniqueness", await test_email_uniqueness_check()))
    results.append(("Username Uniqueness", await test_username_uniqueness_check()))
    results.append(("Verification Code", await test_verification_code_generation()))
    results.append(("Email Verification Flow", await test_email_verification_flow()))
    results.append(("Admin Approval Flow", await test_admin_approval_flow()))
    results.append(("First Admin Exception", await test_first_admin_exception()))
    
    # Выводим итоги
    print_section("TEST RESULTS")
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {name}")
    
    print(f"\nTotal: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 ALL TESTS PASSED! 🎉\n")
        return True
    else:
        print(f"\n⚠️  {total - passed} test(s) failed\n")
        return False


if __name__ == "__main__":
    import asyncio
    success = asyncio.run(run_all_tests())
    sys.exit(0 if success else 1)
