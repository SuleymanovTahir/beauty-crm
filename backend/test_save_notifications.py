#!/usr/bin/env python3
"""
Тест сохранения настроек уведомлений
"""
import requests
import json

def test_save_notifications():
    """Тестировать POST /api/notifications/settings"""

    url = "http://localhost:8000/api/notifications/settings"

    # Тестовые данные
    test_data = {
        "emailNotifications": True,
        "smsNotifications": False,
        "bookingNotifications": True,
        "chatNotifications": True,
        "dailyReport": True,
        "reportTime": "09:00"
    }

    print("=" * 70)
    print("ТЕСТ СОХРАНЕНИЯ НАСТРОЕК УВЕДОМЛЕНИЙ")
    print("=" * 70)

    # 1. GET - проверяем начальное состояние
    print("\n1️⃣ GET /api/notifications/settings (до сохранения)")
    print("-" * 70)
    response = requests.get(url)
    print(f"Статус: {response.status_code}")
    print(f"Данные: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")

    # 2. POST - сохраняем настройки
    print("\n2️⃣ POST /api/notifications/settings (сохранение)")
    print("-" * 70)
    print(f"Отправляем: {json.dumps(test_data, indent=2, ensure_ascii=False)}")

    response = requests.post(
        url,
        json=test_data,
        headers={"Content-Type": "application/json"}
    )

    print(f"\nСтатус: {response.status_code}")

    if response.status_code == 200:
        print(f"✅ УСПЕХ!")
        print(f"Ответ: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")
    else:
        print(f"❌ ОШИБКА!")
        print(f"Ответ: {response.text}")

        # Если есть детали ошибки
        try:
            error_data = response.json()
            print(f"Детали: {json.dumps(error_data, indent=2, ensure_ascii=False)}")
        except:
            pass

    # 3. GET - проверяем что настройки сохранились
    print("\n3️⃣ GET /api/notifications/settings (после сохранения)")
    print("-" * 70)
    response = requests.get(url)
    print(f"Статус: {response.status_code}")
    print(f"Данные: {json.dumps(response.json(), indent=2, ensure_ascii=False)}")

    print("\n" + "=" * 70)
    print("ТЕСТ ЗАВЕРШЕН")
    print("=" * 70)

if __name__ == "__main__":
    test_save_notifications()
