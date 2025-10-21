#!/usr/bin/env python
# backend/check_imports.py

print("🔍 Проверяю импорты...")

try:
    print("1️⃣  from fastapi import FastAPI...")
    from fastapi import FastAPI
    print("✅ OK")
except Exception as e:
    print(f"❌ ОШИБКА: {e}")

try:
    print("2️⃣  from logger import logger...")
    from logger import logger
    print("✅ OK")
except Exception as e:
    print(f"❌ ОШИБКА: {e}")

try:
    print("3️⃣  from config import VERIFY_TOKEN...")
    from config import VERIFY_TOKEN
    print("✅ OK")
except Exception as e:
    print(f"❌ ОШИБКА: {e}")

try:
    print("4️⃣  from database import init_database...")
    from database import init_database
    print("✅ OK")
except Exception as e:
    print(f"❌ ОШИБКА: {e}")

try:
    print("5️⃣  from bot import ask_gemini...")
    from bot import ask_gemini
    print("✅ OK")
except Exception as e:
    print(f"❌ ОШИБКА: {e}")

try:
    print("6️⃣  from instagram import send_message...")
    from instagram import send_message
    print("✅ OK")
except Exception as e:
    print(f"❌ ОШИБКА: {e}")

try:
    print("7️⃣  from api import router...")
    from api import router
    print("✅ OK")
except Exception as e:
    print(f"❌ ОШИБКА: {e}")

print("\n✅ Все импорты проверены!")