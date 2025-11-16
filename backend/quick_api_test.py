#!/usr/bin/env python3
"""
Быстрая проверка API без полной диагностики
"""
import requests
import time

def test_endpoint(url, name, timeout=30):
    """Тест одного эндпоинта"""
    print(f"\n🔍 Тестируем: {name}")
    print(f"   URL: {url}")
    print(f"   Таймаут: {timeout}s")

    try:
        start = time.time()
        print("   ⏳ Отправка запроса...")

        response = requests.get(url, timeout=timeout)
        elapsed = time.time() - start

        print(f"   ✅ Ответ получен за {elapsed:.2f}s")
        print(f"   📊 HTTP {response.status_code}")

        if elapsed > 5:
            print(f"   ⚠️  МЕДЛЕННО! (>{elapsed:.2f}s)")

        # Показываем первые 200 символов ответа
        try:
            data = response.json()
            print(f"   📝 Данные: {str(data)[:200]}...")
        except:
            print(f"   📝 Текст: {response.text[:200]}...")

        return True

    except requests.exceptions.Timeout:
        print(f"   ❌ TIMEOUT (>{timeout}s)")
        print(f"\n   💡 Сервер не отвечает! Возможные причины:")
        print(f"      1. Сервер зависает при обработке")
        print(f"      2. Медленные SQL запросы")
        print(f"      3. Блокирующие операции")
        print(f"\n   🔧 Что делать:")
        print(f"      1. Проверьте логи сервера")
        print(f"      2. Перезапустите: Ctrl+C и python main.py")
        print(f"      3. Проверьте CPU: top или htop")
        return False

    except requests.exceptions.ConnectionError as e:
        print(f"   ❌ CONNECTION ERROR")
        print(f"   💡 Сервер не запущен на этом адресе")
        return False

    except Exception as e:
        print(f"   ❌ ОШИБКА: {e}")
        return False

if __name__ == "__main__":
    print("=" * 70)
    print("⚡ БЫСТРАЯ ПРОВЕРКА API")
    print("=" * 70)

    base_url = "http://localhost:8000"

    # Тестируем самый простой эндпоинт
    test_endpoint(f"{base_url}/", "Корневой эндпоинт (самый быстрый)", timeout=30)

    print("\n" + "=" * 70)
    print("\n💡 Если этот тест не прошел, проблема в самом сервере.")
    print("   Проверьте логи: tail -f backend/logs/app.log")
    print("   Или перезапустите сервер: Ctrl+C и python main.py")
