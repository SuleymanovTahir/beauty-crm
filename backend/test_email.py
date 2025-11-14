#!/usr/bin/env python3
"""
Тестовый скрипт для проверки отправки email
"""
import sys
import os

# Добавляем путь к backend в sys.path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from utils.email import send_verification_email, generate_verification_code
from dotenv import load_dotenv

# Загружаем переменные окружения
load_dotenv('.env.local')

def test_email_sending():
    """Тестируем отправку email"""
    print("=" * 70)
    print("🧪 ТЕСТ ОТПРАВКИ EMAIL")
    print("=" * 70)

    # Параметры
    test_email = input("\n📧 Введите email для теста (или нажмите Enter для ii3391609@gmail.com): ").strip()
    if not test_email:
        test_email = "ii3391609@gmail.com"

    test_name = "Test User"
    test_code = generate_verification_code()

    print(f"\n✉️  Отправка тестового письма...")
    print(f"   Email: {test_email}")
    print(f"   Имя: {test_name}")
    print(f"   Код: {test_code}")
    print(f"\n⏳ Отправка...")

    # Отправляем
    success = send_verification_email(test_email, test_code, test_name)

    print("\n" + "=" * 70)
    if success:
        print("✅ Email успешно отправлен!")
        print(f"   Проверьте почту {test_email}")
        print(f"   Код верификации: {test_code}")
    else:
        print("❌ Ошибка при отправке email!")
        print("   Проверьте:")
        print("   1. SMTP настройки в .env.local")
        print("   2. Пароль приложения Gmail (App Password)")
        print("   3. Двухфакторная аутентификация включена в Gmail")
    print("=" * 70)

    return success

if __name__ == "__main__":
    test_email_sending()
