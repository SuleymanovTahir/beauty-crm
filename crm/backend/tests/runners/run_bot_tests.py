#!/usr/bin/env python3
"""
🤖 BOT TESTING SUITE
Dedicated runner for all bot-related functionality tests.
"""
import sys
import os
from datetime import datetime

# Add global path
BACKEND_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
TESTS_ROOT = os.path.join(BACKEND_ROOT, "tests")
if BACKEND_ROOT not in sys.path:
    sys.path.insert(0, BACKEND_ROOT)

def print_header(text):
    print("\n" + "=" * 80)
    print(f"  {text}")
    print("=" * 80)

def run_suite(suite_name, subprocess_path=None):
    """Run a test suite via subprocess"""
    print(f"\n📄 Running: {suite_name}")
    print("-" * 80)
    
    import subprocess
    env = os.environ.copy()
    env["PYTHONPATH"] = BACKEND_ROOT
    env["SKIP_REAL_MAIL"] = "true"
    result = subprocess.run(
        [sys.executable, os.path.join(TESTS_ROOT, subprocess_path)],
        capture_output=True,
        text=True,
        timeout=300,
        env=env,
    )
    
    if result.stdout:
        lines = result.stdout.splitlines()
        # Filter typical "Import" lines or set paths that clog logs
        filtered_lines = [l for l in lines if not l.startswith("DEBUG:root:Importing")]
        print("\n".join(filtered_lines))
    
    if result.stderr:
        print(f"⚠️  STDERR from {suite_name}:\n{result.stderr}")
    
    success = result.returncode == 0
    status = "✅ PASS" if success else "❌ FAIL"
    print(f"\n{status} - {suite_name}")
    return success

def run_bot_tests():
    print_header("🤖 STARTING BOT TEST SUITE")
    print(f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    tests = [
        # 1. Core Logic
        ("Bot Logic Verification", "verify_bot_logic.py"),
        ("Smart Assistant Logic", "test_smart_assistant.py"),
        
        # 2. Analytics & Context
        ("Bot Analytics", "test_bot_analytics.py"),
        ("Conversation Context", "test_conversation_context.py"),
        
        # 3. Pricing & Response Generation
        ("Bot Prices & Calculations", "test_bot_prices.py"),
        
        # 4. Integration Tests
        ("Broadcasts & Reminders", "test_broadcasts_and_reminders.py"),
    ]

    results = []
    
    for name, script in tests:
        success = run_suite(script, subprocess_path=script)
        results.append((name, success))

    # Summary
    print_header("BOT SUITE RESULTS")
    total = len(results)
    passed = sum(1 for _, s in results if s)
    failed = total - passed

    for name, success in results:
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status.ljust(8)} - {name}")

    print(f"\n📊 Statistics:")
    print(f"   Total: {total}")
    print(f"   Passed: {passed}")
    print(f"   Failed: {failed}")

    if failed == 0:
        print("\n🎉 ALL BOT TESTS PASSED!")
    else:
        print(f"\n⚠️  ERRORS: {failed}")

    return passed == total

if __name__ == "__main__":
    success = run_bot_tests()
    sys.exit(0 if success else 1)
