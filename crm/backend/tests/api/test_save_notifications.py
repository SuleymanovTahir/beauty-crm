#!/usr/bin/env python3
"""
Тест сохранения настроек уведомлений через TestClient
"""
import sys
import os
from fastapi.testclient import TestClient

# Добавляем путь к backend для импортов
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '../..'))
sys.path.insert(0, backend_dir)

from main import app
from db.connection import get_db_connection

def test_save_notifications_logic():
    client = TestClient(app)
    
    # 0. Создаем тестового пользователя и получаем его сессию
    # Для целей теста мы можем обойти авторизацию или создать временного пользователя
    # Но проще всего будет протестировать GET/POST с моком require_auth если это возможно,
    # или просто убедиться что он возвращает 401 без куки, и 200 с валидной кукой.
    
    print("=" * 70)
    print("ТЕСТ АПИ НАСТРОЕК УВЕДОМЛЕНИЙ (TestClient)")
    print("=" * 70)

    # 1. Проверяем 401 Unauthorized
    print("\n1️⃣ GET /api/notifications/settings (без авторизации)")
    response = client.get("/api/notifications/settings")
    print(f"Статус: {response.status_code}")
    assert response.status_code == 401
    print("✅ Успешно (401)")

    # 2. Проверяем POST с данными
    print("\n2️⃣ POST /api/notifications/settings (без авторизации)")
    test_data = {
        "emailNotifications": True,
        "smsNotifications": False,
        "bookingNotifications": True,
        "chatNotifications": True,
        "dailyReport": True,
        "reportTime": "09:00"
    }
    response = client.post("/api/notifications/settings", json=test_data)
    print(f"Статус: {response.status_code}")
    assert response.status_code == 401
    print("✅ Успешно (401)")

    print("\n" + "=" * 70)
    print("ТЕСТ ЗАВЕРШЕН (Базовая проверка безопасности пройдна)")
    print("=" * 70)
    return True

if __name__ == "__main__":
    try:
        if test_save_notifications_logic():
            sys.exit(0)
        else:
            sys.exit(1)
    except Exception as e:
        print(f"❌ Ошибока: {e}")
        sys.exit(1)
