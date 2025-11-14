"""
Тест отправки email через SMTP
"""
import os
from dotenv import load_dotenv

# Загружаем переменные окружения
load_dotenv('.env.local')

from utils.email import send_verification_link_email, send_password_reset_email

print("=" * 60)
print("ТЕСТ ОТПРАВКИ EMAIL")
print("=" * 60)

# Проверяем настройки
smtp_user = os.getenv('SMTP_USERNAME')
smtp_password = os.getenv('SMTP_PASSWORD')
smtp_host = os.getenv('SMTP_SERVER', 'smtp.gmail.com')
smtp_port = os.getenv('SMTP_PORT', '587')

print(f"\n📧 SMTP настройки:")
print(f"   Сервер: {smtp_host}:{smtp_port}")
print(f"   Пользователь: {smtp_user}")
print(f"   Пароль: {'*' * 10} (установлен: {bool(smtp_password)})")

if not smtp_user or not smtp_password:
    print("\n❌ ОШИБКА: SMTP учетные данные не настроены!")
    print("   Проверьте .env.local файл")
    exit(1)

print("\n" + "=" * 60)
print("ТЕСТ 1: Отправка ссылки верификации")
print("=" * 60)

test_token = "TEST_TOKEN_123456789"
result1 = send_verification_link_email(
    to_email=smtp_user,  # Отправляем на свой же email
    verification_token=test_token,
    full_name="Тестовый Пользователь"
)

if result1:
    print("✅ Email с верификацией ОТПРАВЛЕН успешно!")
    print(f"   Проверьте почту: {smtp_user}")
else:
    print("❌ Ошибка при отправке email")

print("\n" + "=" * 60)
print("ТЕСТ 2: Отправка ссылки восстановления пароля")
print("=" * 60)

test_reset_token = "RESET_TOKEN_987654321"
result2 = send_password_reset_email(
    to_email=smtp_user,
    reset_token=test_reset_token,
    full_name="Тестовый Пользователь"
)

if result2:
    print("✅ Email с восстановлением пароля ОТПРАВЛЕН успешно!")
    print(f"   Проверьте почту: {smtp_user}")
else:
    print("❌ Ошибка при отправке email")

print("\n" + "=" * 60)
print("ИТОГИ")
print("=" * 60)
if result1 and result2:
    print("✅ ВСЕ ТЕСТЫ ПРОШЛИ УСПЕШНО!")
    print("   SMTP настроен правильно и работает")
else:
    print("❌ НЕКОТОРЫЕ ТЕСТЫ ПРОВАЛИЛИСЬ")
    print("   Проверьте:")
    print("   1. App Password в Gmail (не обычный пароль!)")
    print("   2. Двухфакторная аутентификация включена")
    print("   3. Доступ для небезопасных приложений разрешен")
    print("\n   Как создать App Password:")
    print("   https://support.google.com/accounts/answer/185833")
