#!/usr/bin/env python3
"""
Полная диагностика системы Beauty CRM
Запуск: python diagnostic_full.py
Или через API: GET /api/diagnostics/full
"""
import sys
import os
import time
import asyncio
from datetime import datetime

# Добавляем путь к backend
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

print("\n" + "=" * 80)
print("🔍 ПОЛНАЯ ДИАГНОСТИКА BEAUTY CRM")
print("=" * 80)
print(f"📅 Дата и время: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
print("=" * 80 + "\n")

# ==============================================================================
# ТЕСТ 1: Загрузка конфигурации
# ==============================================================================

def test_config_loading():
    """Тест загрузки конфигурации"""
    print("ТЕСТ 1: Загрузка конфигурации")
    print("-" * 80)

    try:
        import core.config
        print("✅ Конфигурация загружена")
        print(f"   DATABASE: {core.config.DATABASE_NAME}")
        print(f"   GEMINI_MODEL: {core.config.GEMINI_MODEL}")
        print(f"   PAGE_ACCESS_TOKEN: {'***' + core.config.PAGE_ACCESS_TOKEN[-10:] if core.config.PAGE_ACCESS_TOKEN else 'НЕ НАСТРОЕН'}")
        return True
    except Exception as e:
        print(f"❌ ОШИБКА: {e}")
        import traceback
        print(traceback.format_exc())
        return False

# ==============================================================================
# ТЕСТ 2: Подключение к базе данных
# ==============================================================================

def test_database_connection():
    """Тест подключения к БД и проверка таблиц"""
    print("\nТЕСТ 2: Подключение к базе данных")
    print("-" * 80)

    try:
        import sqlite3
        from core.config import DATABASE_NAME

        conn = sqlite3.connect(DATABASE_NAME)
        c = conn.cursor()

        # Получаем список таблиц
        c.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
        tables = [row[0] for row in c.fetchall()]

        print(f"✅ Подключение успешно")
        print(f"   Таблиц в БД: {len(tables)}")

        # Проверяем критичные таблицы
        critical_tables = ['users', 'clients', 'bookings', 'employees', 'bot_settings']
        missing_tables = [t for t in critical_tables if t not in tables]

        if missing_tables:
            print(f"\n⚠️  Отсутствуют критичные таблицы: {', '.join(missing_tables)}")
            print("   Запустите миграции!")
            conn.close()
            return False

        print(f"   ✅ Все критичные таблицы присутствуют")

        # Проверяем notification_settings
        if 'notification_settings' in tables:
            c.execute("SELECT COUNT(*) FROM notification_settings")
            count = c.fetchone()[0]
            print(f"   notification_settings: {count} записей")

        # Проверяем booking_reminder_settings
        if 'booking_reminder_settings' in tables:
            c.execute("SELECT COUNT(*) FROM booking_reminder_settings")
            count = c.fetchone()[0]
            print(f"   booking_reminder_settings: {count} записей")

        conn.close()
        return True

    except Exception as e:
        print(f"❌ ОШИБКА: {e}")
        import traceback
        print(traceback.format_exc())
        return False

# ==============================================================================
# ТЕСТ 3: Проверка API эндпоинтов (через HTTP)
# ==============================================================================

def test_api_endpoints():
    """Тест HTTP API эндпоинтов"""
    print("\nТЕСТ 3: Проверка API эндпоинтов")
    print("-" * 80)

    try:
        import requests

        base_url = "http://localhost:8000"

        # Сначала быстрая проверка доступности
        print("\n   🔍 Проверка доступности сервера...")
        try:
            response = requests.get(f"{base_url}/", timeout=30)
            print(f"   ✅ Сервер доступен (HTTP {response.status_code})")
        except requests.exceptions.Timeout:
            print(f"   ❌ Сервер не отвечает (timeout >30s)")
            print(f"   💡 Возможные причины:")
            print(f"      - Сервер зависает при обработке запросов")
            print(f"      - Медленные SQL запросы")
            print(f"      - Проблемы с middleware")
            print(f"\n   💡 Рекомендации:")
            print(f"      1. Проверьте логи: tail -f logs/app.log")
            print(f"      2. Перезапустите сервер: Ctrl+C и python main.py")
            print(f"      3. Проверьте процессы: ps aux | grep python")
            return False
        except Exception as e:
            print(f"   ❌ Ошибка подключения: {e}")
            return False

        # Тестируем эндпоинты с увеличенным таймаутом
        timeout = 30  # Увеличенный таймаут для медленных эндпоинтов

        endpoints = [
            ("/", "Корневой эндпоинт"),
            ("/health", "Health check"),
            ("/api/notifications/settings", "Настройки уведомлений"),
            ("/api/booking-reminder-settings", "Настройки напоминаний"),
        ]

        results = []

        for path, name in endpoints:
            try:
                print(f"\n   Тестируем: {name} ({path})")
                start_time = time.time()
                response = requests.get(f"{base_url}{path}", timeout=timeout)
                elapsed = time.time() - start_time

                if response.status_code == 200:
                    if elapsed > 5:
                        print(f"   ⚠️  {name}: МЕДЛЕННО ({elapsed:.2f}s)")
                    else:
                        print(f"   ✅ {name}: OK ({elapsed:.2f}s)")
                    results.append((name, True, elapsed))
                elif response.status_code == 401:
                    print(f"   ⚠️  {name}: Требуется авторизация ({elapsed:.2f}s)")
                    results.append((name, True, elapsed))  # Это нормально
                else:
                    print(f"   ⚠️  {name}: HTTP {response.status_code} ({elapsed:.2f}s)")
                    results.append((name, False, elapsed))

            except requests.exceptions.Timeout:
                print(f"   ❌ {name}: TIMEOUT (>{timeout}s)")
                print(f"      💡 Этот эндпоинт слишком медленный!")
                results.append((name, False, timeout))
            except requests.exceptions.ConnectionError:
                print(f"   ❌ {name}: CONNECTION ERROR (сервер не запущен?)")
                results.append((name, False, 0))
            except Exception as e:
                print(f"   ❌ {name}: {e}")
                results.append((name, False, 0))

        # Итоги
        success_count = sum(1 for _, success, _ in results if success)
        total = len(results)

        print(f"\n   Итого: {success_count}/{total} успешно")

        # Проверяем медленные ответы
        slow_endpoints = [(name, elapsed) for name, success, elapsed in results if success and elapsed > 2]
        if slow_endpoints:
            print(f"\n   ⚠️  Медленные эндпоинты (>2s):")
            for name, elapsed in slow_endpoints:
                print(f"      - {name}: {elapsed:.2f}s")
            print(f"\n   💡 Рекомендация: Оптимизируйте SQL запросы и логику обработки")

        return success_count == total

    except ImportError:
        print("   ⚠️  Модуль requests не установлен")
        print("   Установите: pip install requests")
        return None
    except Exception as e:
        print(f"❌ ОШИБКА: {e}")
        import traceback
        print(traceback.format_exc())
        return False

# ==============================================================================
# ТЕСТ 4: Проверка SmartAssistant
# ==============================================================================

def test_smart_assistant():
    """Тест SmartAssistant"""
    print("\nТЕСТ 4: Проверка SmartAssistant")
    print("-" * 80)

    try:
        # Правильный путь импорта
        from services.smart_assistant import SmartAssistant

        # Проверяем __init__ signature
        import inspect
        sig = inspect.signature(SmartAssistant.__init__)
        params = list(sig.parameters.keys())

        print(f"   Параметры __init__: {params}")

        if 'client_id' in params:
            print("   ℹ️  SmartAssistant требует client_id при создании")

            # Пробуем создать с тестовым client_id
            try:
                assistant = SmartAssistant(client_id="test_client")
                print("   ✅ SmartAssistant создан успешно (с client_id)")
                return True
            except Exception as e:
                print(f"   ❌ Ошибка создания SmartAssistant: {e}")
                return False
        else:
            # Старый API без client_id
            try:
                assistant = SmartAssistant()
                print("   ✅ SmartAssistant создан успешно (без client_id)")
                return True
            except Exception as e:
                print(f"   ❌ Ошибка создания SmartAssistant: {e}")
                return False

    except ImportError as e:
        print(f"   ❌ Не удалось импортировать SmartAssistant: {e}")
        print(f"   💡 Проверьте путь: services/smart_assistant.py")
        return False
    except Exception as e:
        print(f"❌ ОШИБКА: {e}")
        import traceback
        print(traceback.format_exc())
        return False

# ==============================================================================
# ТЕСТ 5: Проверка email уведомлений
# ==============================================================================

async def test_email_notifications():
    """Тест email уведомлений"""
    print("\nТЕСТ 5: Проверка email уведомлений")
    print("-" * 80)

    try:
        from utils.email import send_email_async
        import os

        # Проверяем настройки SMTP
        smtp_user = os.getenv('SMTP_USERNAME') or os.getenv('SMTP_USER')
        smtp_password = os.getenv('SMTP_PASSWORD')

        if not smtp_user or not smtp_password:
            print("   ⚠️  SMTP не настроен в .env.local")
            print(f"      SMTP_USERNAME: {'✅' if smtp_user else '❌'}")
            print(f"      SMTP_PASSWORD: {'✅' if smtp_password else '❌'}")
            return False

        print(f"   SMTP настроен: {smtp_user}")
        print("   ℹ️  Для реальной отправки запустите test_notifications_full.py")
        return True

    except Exception as e:
        print(f"❌ ОШИБКА: {e}")
        import traceback
        print(traceback.format_exc())
        return False

# ==============================================================================
# ТЕСТ 6: Проверка Instagram API
# ==============================================================================

async def test_instagram_api():
    """Тест Instagram API"""
    print("\nТЕСТ 6: Проверка Instagram API")
    print("-" * 80)

    try:
        from integrations import send_message
        from core.config import PAGE_ACCESS_TOKEN, INSTAGRAM_BUSINESS_ID

        if not PAGE_ACCESS_TOKEN:
            print("   ⚠️  PAGE_ACCESS_TOKEN не настроен")
            return False

        if not INSTAGRAM_BUSINESS_ID:
            print("   ⚠️  INSTAGRAM_BUSINESS_ID не настроен")
            return False

        print(f"   PAGE_ACCESS_TOKEN: {'***' + PAGE_ACCESS_TOKEN[-10:]}")
        print(f"   INSTAGRAM_BUSINESS_ID: {INSTAGRAM_BUSINESS_ID}")
        print("   ℹ️  Для реальной отправки запустите test_notifications_full.py")
        return True

    except Exception as e:
        print(f"❌ ОШИБКА: {e}")
        import traceback
        print(traceback.format_exc())
        return False

# ==============================================================================
# ТЕСТ 7: Проверка портов и сервера
# ==============================================================================

def test_server_ports():
    """Тест доступности портов"""
    print("\nТЕСТ 7: Проверка портов сервера")
    print("-" * 80)

    import socket

    ports_to_check = [
        (8000, "Backend (FastAPI)"),
        (5173, "Frontend (Vite)"),
    ]

    results = []
    for port, name in ports_to_check:
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(1)
            result = sock.connect_ex(('localhost', port))
            sock.close()

            if result == 0:
                print(f"   ✅ {name} (:{port}): Доступен")
                results.append(True)
            else:
                print(f"   ❌ {name} (:{port}): Не доступен")
                results.append(False)
        except Exception as e:
            print(f"   ❌ {name} (:{port}): Ошибка - {e}")
            results.append(False)

    return all(results)

# ==============================================================================
# ГЛАВНАЯ ФУНКЦИЯ
# ==============================================================================

async def run_full_diagnostics():
    """Запуск полной диагностики"""

    results = []

    # Запускаем тесты
    results.append(("Загрузка конфигурации", test_config_loading()))
    results.append(("Подключение к БД", test_database_connection()))
    results.append(("Порты сервера", test_server_ports()))
    results.append(("API эндпоинты", test_api_endpoints()))
    results.append(("SmartAssistant", test_smart_assistant()))
    results.append(("Email уведомления", await test_email_notifications()))
    results.append(("Instagram API", await test_instagram_api()))

    # Итоги
    print("\n" + "=" * 80)
    print("📊 ИТОГИ ДИАГНОСТИКИ")
    print("=" * 80)

    for name, result in results:
        if result is True:
            status = "✅ PASS"
        elif result is False:
            status = "❌ FAIL"
        else:
            status = "⚠️  SKIP"
        print(f"{status} - {name}")

    passed = sum(1 for _, r in results if r is True)
    failed = sum(1 for _, r in results if r is False)
    skipped = sum(1 for _, r in results if r is None)
    total = len(results)

    print(f"\nПройдено: {passed}/{total - skipped}")
    if failed > 0:
        print(f"Провалено: {failed}")
    if skipped > 0:
        print(f"Пропущено: {skipped}")

    print("\n" + "=" * 80)

    # Рекомендации
    if failed > 0:
        print("\n💡 РЕКОМЕНДАЦИИ:")
        print("-" * 80)

        for name, result in results:
            if result is False:
                if "API эндпоинты" in name:
                    print("   🔧 API эндпоинты не отвечают:")
                    print("      - Убедитесь, что backend запущен: python main.py")
                    print("      - Проверьте порт 8000: lsof -i :8000")
                    print("      - Проверьте логи: tail -f logs/app.log")

                if "SmartAssistant" in name:
                    print("   🔧 SmartAssistant требует исправления:")
                    print("      - Обновите вызовы SmartAssistant(client_id=...)")
                    print("      - Проверьте tests/test_all.py")

                if "Порты" in name:
                    print("   🔧 Сервер не запущен:")
                    print("      - Backend: cd backend && python main.py")
                    print("      - Frontend: cd frontend && npm run dev")

    print("=" * 80)

    return {
        "passed": passed,
        "failed": failed,
        "skipped": skipped,
        "total": total,
        "success_rate": f"{(passed / (total - skipped) * 100):.1f}%" if (total - skipped) > 0 else "0%"
    }

if __name__ == "__main__":
    try:
        result = asyncio.run(run_full_diagnostics())
        sys.exit(0 if result["failed"] == 0 else 1)
    except KeyboardInterrupt:
        print("\n\n⚠️  Диагностика прервана пользователем")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n❌ Критическая ошибка: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
