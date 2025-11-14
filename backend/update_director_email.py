#!/usr/bin/env python3
"""
Скрипт для обновления email директора и отправки кода верификации
"""
import sqlite3
import sys
from datetime import datetime, timedelta
from utils.email import generate_verification_code, send_verification_email

# Email директора
DIRECTOR_EMAIL = "ii3391609@gmail.com"
DIRECTOR_USERNAME = "admin"

def update_director_email():
    """Обновить email директора и отправить код верификации"""

    conn = sqlite3.connect('salon_bot.db')
    c = conn.cursor()

    try:
        # Найдем директора
        c.execute("SELECT id, full_name FROM users WHERE username = ?", (DIRECTOR_USERNAME,))
        result = c.fetchone()

        if not result:
            print(f"❌ Пользователь {DIRECTOR_USERNAME} не найден!")
            return False

        user_id, full_name = result
        print(f"✅ Найден пользователь: ID={user_id}, Name={full_name}")

        # Генерируем код верификации
        verification_code = generate_verification_code()
        code_expires = (datetime.now() + timedelta(minutes=15)).isoformat()

        print(f"🔐 Сгенерирован код: {verification_code}")
        print(f"⏰ Код действителен до: {code_expires}")

        # Обновляем email и код в БД
        c.execute("""
            UPDATE users
            SET email = ?,
                verification_code = ?,
                verification_code_expires = ?,
                email_verified = 0
            WHERE id = ?
        """, (DIRECTOR_EMAIL, verification_code, code_expires, user_id))

        conn.commit()
        print(f"✅ Email обновлен на: {DIRECTOR_EMAIL}")

        # Отправляем email с кодом
        print(f"📧 Отправка кода на {DIRECTOR_EMAIL}...")
        email_sent = send_verification_email(DIRECTOR_EMAIL, verification_code, full_name)

        if email_sent:
            print("✅ Код верификации отправлен на почту!")
            print()
            print("=" * 80)
            print("Для подтверждения email:")
            print(f"1. Проверьте почту {DIRECTOR_EMAIL}")
            print(f"2. Используйте код: {verification_code}")
            print(f"3. Или войдите на сайт и введите код при попытке входа")
            print("=" * 80)
            return True
        else:
            print("❌ Не удалось отправить email!")
            print("⚠️  Проверьте настройки SMTP в .env файле")
            print()
            print("Вы можете использовать код вручную:")
            print(f"Код: {verification_code}")
            print()
            print("Или установить email_verified=1 вручную:")
            print(f"UPDATE users SET email_verified=1 WHERE id={user_id};")
            return False

    except Exception as e:
        print(f"❌ Ошибка: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        conn.close()

if __name__ == "__main__":
    print("=" * 80)
    print("ОБНОВЛЕНИЕ EMAIL ДИРЕКТОРА")
    print("=" * 80)
    print()

    success = update_director_email()
    sys.exit(0 if success else 1)
