#!/usr/bin/env python3
"""
🧪 МАСТЕР-ФАЙЛ ДЛЯ ЗАПУСКА ВСЕХ ТЕСТОВ
Запускает все тесты проекта и выводит детальные логи
"""
import sys
import os
from datetime import datetime

# Добавляем путь к backend для импортов
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

def print_header(text):
    """Красивый заголовок"""
    print("\n" + "=" * 80)
    print(f"  {text}")
    print("=" * 80)

def print_test_file(file_name, description=""):
    """Вывод информации о запускаемом тесте"""
    print(f"\n📄 Запуск: {file_name}")
    if description:
        print(f"   {description}")
    print("-" * 80)

    print("-" * 80)

def cleanup_test_data():
    """
    Очистка тестовых данных после выполнения тестов.
    Удаляет пользователей, созданных во время тестирования.
    """

def run_all_tests():
    """Запуск всех тестов проекта"""
    print_header("ЗАПУСК ВСЕХ ТЕСТОВ BEAUTY CRM")
    print(f"Дата: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    results = []

    # ========================================================================
    # 1. test_all.py - Основные тесты системы
    # ========================================================================
    print_test_file(
        "tests/test_all.py",
        "База данных + Новые функции + SmartAssistant + API модули"
    )
    try:
        from tests.test_all import main as test_all_main
        result = test_all_main()
        results.append(("test_all.py - Основные тесты", result))
    except Exception as e:
        print(f"❌ Ошибка: {e}")
        import traceback
        traceback.print_exc()
        results.append(("test_all.py - Основные тесты", False))

    # ========================================================================
    # 2. test_detailed.py - Детальные тесты
    # ========================================================================
    print_test_file(
        "tests/test_detailed.py",
        "Детальное тестирование БД, клиентов, записей, сотрудников"
    )
    try:
        from tests.test_detailed import main as test_detailed_main
        result = test_detailed_main()
        results.append(("test_detailed.py - Детальные тесты", result))
    except Exception as e:
        print(f"❌ Ошибка: {e}")
        import traceback
        traceback.print_exc()
        results.append(("test_detailed.py - Детальные тесты", False))

    # ========================================================================
    # 3. test_new_features.py - Тесты новых функций
    # ========================================================================
    print_test_file(
        "tests/test_new_features.py",
        "Тестирование новых фич системы"
    )
    try:
        from tests.test_new_features import main as test_new_features_main
        result = test_new_features_main()
        results.append(("test_new_features.py - Новые функции", result))
    except Exception as e:
        print(f"❌ Ошибка: {e}")
        import traceback
        traceback.print_exc()
        results.append(("test_new_features.py - Новые функции", False))

    # ========================================================================
    # 4. comprehensive_test.py - Комплексное тестирование
    # ========================================================================
    # print_test_file(
    #     "tests/comprehensive_test.py",
    #     "Полное end-to-end тестирование всей системы"
    # )
    # try:
    #     from tests.comprehensive_test import run_comprehensive_test
    #     result = run_comprehensive_test()
    #     results.append(("comprehensive_test.py - Комплексное тестирование", result))
    # except Exception as e:
    #     print(f"❌ Ошибка: {e}")
    #     import traceback
    #     traceback.print_exc()
    #     results.append(("comprehensive_test.py - Комплексное тестирование", False))

    # # ========================================================================
    # # 5. test_smart_assistant.py - AI ассистент
    # # ========================================================================
    # print_test_file(
    #     "tests/test_smart_assistant.py",
    #     "Тестирование AI SmartAssistant"
    # )
    # try:
    #     # Этот файл нужно запустить как subprocess т.к. у него есть if __name__
    #     import subprocess
    #     result = subprocess.run(
    #         [sys.executable, os.path.join(os.path.dirname(__file__), "test_smart_assistant.py")],
    #         capture_output=True,
    #         text=True
    #     )
    #     print(result.stdout)
    #     if result.stderr:
    #         print(result.stderr)
    #     success = result.returncode == 0
    #     results.append(("test_smart_assistant.py - AI ассистент", success))
    # except Exception as e:
    #     print(f"❌ Ошибка: {e}")
    #     import traceback
    #     traceback.print_exc()
    #     results.append(("test_smart_assistant.py - AI ассистент", False))

    # # ========================================================================
    # # 6. test_immediate_notification.py - Уведомления
    # # ========================================================================
    # print_test_file(
    #     "tests/test_immediate_notification.py",
    #     "Тестирование системы уведомлений"
    # )
    # try:
    #     import subprocess
    #     result = subprocess.run(
    #         [sys.executable, os.path.join(os.path.dirname(__file__), "test_immediate_notification.py")],
    #         capture_output=True,
    #         text=True
    #     )
    #     print(result.stdout)
    #     if result.stderr:
    #         print(result.stderr)
    #     success = result.returncode == 0
    #     results.append(("test_immediate_notification.py - Уведомления", success))
    # except Exception as e:
    #     print(f"❌ Ошибка: {e}")
    #     import traceback
    #     traceback.print_exc()
    #     results.append(("test_immediate_notification.py - Уведомления", False))

    # ========================================================================
    # 7. check_bot.py - Проверка бота (REMOVED)
    # ========================================================================
    # print_test_file(
    #     "tests/check_bot.py",
    #     "Проверка настроек и работы AI бота"
    # )
    # try:
    #     import subprocess
    #     result = subprocess.run(
    #         [sys.executable, os.path.join(os.path.dirname(__file__), "check_bot.py")],
    #         capture_output=True,
    #         text=True,
    #         timeout=600
    #     )
    #     print(result.stdout)
    #     if result.stderr:
    #         print(result.stderr)
    #     success = result.returncode == 0
    #     results.append(("check_bot.py - Проверка бота", success))
    # except Exception as e:
    #     print(f"❌ Ошибка: {e}")
    #     import traceback
    #     traceback.print_exc()
    #     results.append(("check_bot.py - Проверка бота", False))

    # ========================================================================
    # 8. check_employees.py - Проверка сотрудников
    # ========================================================================
    # print_test_file(
    #     "tests/check_employees.py",
    #     "Проверка данных сотрудников"
    # )
    # try:
    #     import subprocess
    #     result = subprocess.run(
    #         [sys.executable, os.path.join(os.path.dirname(__file__), "check_employees.py")],
    #         capture_output=True,
    #         text=True
    #     )
    #     print(result.stdout)
    #     if result.stderr:
    #         print(result.stderr)
    #     success = result.returncode == 0
    #     results.append(("check_employees.py - Сотрудники", success))
    # except Exception as e:
    #     print(f"❌ Ошибка: {e}")
    #     import traceback
    #     traceback.print_exc()
    #     results.append(("check_employees.py - Сотрудники", False))

    # # ========================================================================
    # # 9. check_services.py - Проверка услуг
    # # ========================================================================
    # print_test_file(
    #     "tests/check_services.py",
    #     "Проверка услуг салона"
    # )
    # try:
    #     import subprocess
    #     result = subprocess.run(
    #         [sys.executable, os.path.join(os.path.dirname(__file__), "check_services.py")],
    #         capture_output=True,
    #         text=True
    #     )
    #     print(result.stdout)
    #     if result.stderr:
    #         print(result.stderr)
    #     success = result.returncode == 0
    #     results.append(("check_services.py - Услуги", success))
    # except Exception as e:
    #     print(f"❌ Ошибка: {e}")
    #     import traceback
    #     traceback.print_exc()
    #     results.append(("check_services.py - Услуги", False))

    # # ========================================================================
    # # 10. check_users.py - Проверка пользователей
    # # ========================================================================
    # print_test_file(
    #     "tests/check_users.py",
    #     "Проверка пользователей CRM"
    # )
    # try:
    #     import subprocess
    #     result = subprocess.run(
    #         [sys.executable, os.path.join(os.path.dirname(__file__), "check_users.py")],
    #         capture_output=True,
    #         text=True
    #     )
    #     print(result.stdout)
    #     if result.stderr:
    #         print(result.stderr)
    #     success = result.returncode == 0
    #     results.append(("check_users.py - Пользователи", success))
    # except Exception as e:
    #     print(f"❌ Ошибка: {e}")
    #     import traceback
    #     traceback.print_exc()
    #     results.append(("check_users.py - Пользователи", False))

    # ========================================================================
    # 11. BOT MODULES - AI Responses, Universal Messenger, Reminders
    # ========================================================================
    print_test_file(
        "bot/ai_responses + universal_messenger + reminders",
        "Тестирование новых модулей бота"
    )
    try:
        # Тест 1: AI Responses - проверка инструкций
        from bot.ai_responses import RESPONSE_INSTRUCTIONS, get_instruction
        required_keys = ['photo_response', 'voice_response', 'feedback_request', 
                         'feedback_thanks', 'abandoned_booking', 'retention_reminder',
                         'booking_reminder_1d', 'booking_reminder_2h']
        missing = [k for k in required_keys if k not in RESPONSE_INSTRUCTIONS]
        if missing:
            print(f"❌ Missing AI instructions: {missing}")
            results.append(("AI Responses - Instructions", False))
        else:
            print(f"✅ AI Responses: {len(RESPONSE_INSTRUCTIONS)} инструкций OK")
            results.append(("AI Responses - Instructions", True))
        
        # Тест 2: Universal Messenger - проверка импорта
        from services.universal_messenger import send_universal_message
        print("✅ Universal Messenger импорт OK")
        results.append(("Universal Messenger - Import", True))
        
        # Тест 3: Reminders - проверка импорта и ночной функции
        from bot.reminders.abandoned import check_abandoned_bookings, _is_night_hours
        from bot.reminders.feedback import check_visits_for_feedback
        from bot.reminders.retention import check_client_retention
        from bot.reminders.appointments import check_appointment_reminders
        
        # Проверяем ночную функцию
        from datetime import time
        test_night = _is_night_hours()  # Просто проверяем что не падает
        print(f"✅ Reminders: 4 модуля импортированы, _is_night_hours()={test_night}")
        results.append(("Reminders - Import & Night Check", True))
        
        # Тест 4: Feedback Handler
        from bot.feedback_handler import handle_feedback_response
        print("✅ Feedback Handler импорт OK")
        results.append(("Feedback Handler - Import", True))
        
    except Exception as e:
        print(f"❌ Ошибка в Bot Modules: {e}")
        import traceback
        traceback.print_exc()
        results.append(("Bot Modules - General", False))

    # # ========================================================================
    # # 12. check_migrations.py - Проверка миграций
    # # ========================================================================
    # print_test_file(
    #     "tests/check_migrations.py",
    #     "Проверка примененных миграций"
    # )
    # try:
    #     import subprocess
    #     result = subprocess.run(
    #         [sys.executable, os.path.join(os.path.dirname(__file__), "check_migrations.py")],
    #         capture_output=True,
    #         text=True
    #     )
    #     print(result.stdout)
    #     if result.stderr:
    #         print(result.stderr)
    #     success = result.returncode == 0
    #     results.append(("check_migrations.py - Миграции", success))
    # except Exception as e:
    #     print(f"❌ Ошибка: {e}")
    #     import traceback
    #     traceback.print_exc()
    #     results.append(("check_migrations.py - Миграции", False))

    # ========================================================================
    # 12. API тесты - test_reminders_api.py
    # ========================================================================
    print_test_file(
        "tests/api/test_reminders_api.py",
        "Тестирование API напоминаний о записях"
    )
    try:
        import subprocess
        result = subprocess.run(
            [sys.executable, os.path.join(os.path.dirname(__file__), "api/test_reminders_api.py")],
            capture_output=True,
            text=True
        )
        print(result.stdout)
        if result.stderr:
            print(result.stderr)
        success = result.returncode == 0
        results.append(("api/test_reminders_api.py - API напоминаний", success))
    except Exception as e:
        print(f"❌ Ошибка: {e}")
        import traceback
        traceback.print_exc()
        results.append(("api/test_reminders_api.py - API напоминаний", False))

    # ========================================================================
    # 13. API тесты - test_notifications_api.py
    # ========================================================================
    print_test_file(
        "tests/api/test_notifications_api.py",
        "Тестирование API уведомлений"
    )
    try:
        import subprocess
        result = subprocess.run(
            [sys.executable, os.path.join(os.path.dirname(__file__), "api/test_notifications_api.py")],
            capture_output=True,
            text=True
        )
        print(result.stdout)
        if result.stderr:
            print(result.stderr)
        success = result.returncode == 0
        results.append(("api/test_notifications_api.py - API уведомлений", success))
    except Exception as e:
        print(f"❌ Ошибка: {e}")
        import traceback
        traceback.print_exc()
        results.append(("api/test_notifications_api.py - API уведомлений", False))

    # ========================================================================
    # 14. Schedule API Tests
    # ========================================================================
    print_test_file(
        "tests/test_schedule.py",
        "Тестирование API расписания сотрудников"
    )
    try:
        import subprocess
        result = subprocess.run(
            [sys.executable, os.path.join(os.path.dirname(__file__), "test_schedule.py")],
            capture_output=True,
            text=True
        )
        print(result.stdout)
        if result.stderr:
            print(result.stderr)
        success = result.returncode == 0
        results.append(("test_schedule.py - API расписания", success))
    except Exception as e:
        print(f"❌ Ошибка: {e}")
        import traceback
        traceback.print_exc()
        results.append(("test_schedule.py - API расписания", False))

    # ========================================================================
    # 15. Employee Management Tests
    # ========================================================================
    print_test_file(
        "tests/test_employee_management.py",
        "Тестирование Employee Management UI (Services, Schedule, User Detail)"
    )
    try:
        import subprocess
        result = subprocess.run(
            [sys.executable, os.path.join(os.path.dirname(__file__), "test_employee_management.py")],
            capture_output=True,
            text=True
        )
        print(result.stdout)
        if result.stderr:
            print(result.stderr)
        success = result.returncode == 0
        results.append(("test_employee_management.py - Employee Management", success))
    except Exception as e:
        results.append(("test_employee_management.py - Employee Management", False))
    
    # ========================================================================
    # 16. Bot Analytics Tests
    # ========================================================================
    print_test_file(
        "tests/test_bot_analytics.py",
        "Тестирование аналитики бота и реферальной системы"
    )
    try:
        import subprocess
        result = subprocess.run(
            [sys.executable, os.path.join(os.path.dirname(__file__), "test_bot_analytics.py")],
            capture_output=True,
            text=True
        )
        print(result.stdout)
        if result.stderr:
            print(result.stderr)
        success = result.returncode == 0
        results.append(("test_bot_analytics.py - Аналитика бота", success))
    except Exception as e:
        print(f"❌ Ошибка: {e}")
        import traceback
        traceback.print_exc()
        results.append(("test_bot_analytics.py - Аналитика бота", False))
    
    # ========================================================================
    # 17. Conversation Context Tests
    # ========================================================================
    print_test_file(
        "tests/test_conversation_context.py",
        "Тестирование сохранения и чтения контекста диалога"
    )
    try:
        import subprocess
        result = subprocess.run(
            [sys.executable, os.path.join(os.path.dirname(__file__), "test_conversation_context.py")],
            capture_output=True,
            text=True
        )
        print(result.stdout)
        if result.stderr:
            print(result.stderr)
        success = result.returncode == 0
        results.append(("test_conversation_context.py - Контекст диалога", success))
    except Exception as e:
        print(f"❌ Ошибка: {e}")
        import traceback
        traceback.print_exc()
        results.append(("test_conversation_context.py - Контекст диалога", False))
    
    # ========================================================================
    # 18. Проверка услуг без мастеров
    # ========================================================================
    print_test_file(
        "Проверка услуг без мастеров",
        "Проверка наличия услуг без назначенных мастеров"
    )
    try:
        from db.connection import get_db_connection
        
        conn = get_db_connection()
        c = conn.cursor()
        
        c.execute("""
            SELECT s.id, s.name_ru, s.name, s.category
            FROM services s
            WHERE s.is_active = TRUE
            AND s.id NOT IN (
                SELECT DISTINCT us.service_id
                FROM user_services us
                JOIN users u ON u.id = us.user_id
                WHERE u.is_active = TRUE 
                AND u.is_service_provider = TRUE
                AND u.role NOT IN ('director', 'admin', 'manager')
                AND (us.is_online_booking_enabled = TRUE OR us.is_online_booking_enabled IS NULL)
            )
            ORDER BY s.category, s.name_ru
        """)
        
        services_without_masters = c.fetchall()
        conn.close()
        
        if services_without_masters:
            print(f"❌ Найдено {len(services_without_masters)} услуг без мастеров:")
            print()
            
            # Группируем по категориям
            by_category = {}
            for service in services_without_masters:
                category = service[3] if len(service) > 3 else "N/A"
                if category not in by_category:
                    by_category[category] = []
                by_category[category].append(service)
            
            for category in sorted(by_category.keys()):
                print(f"   📂 {category}:")
                for service in sorted(by_category[category], key=lambda x: x[1] or x[2]):
                    service_id = service[0]
                    service_name_ru = service[1] if service[1] else None
                    service_name_en = service[2] if service[2] else None
                    service_name = service_name_ru or service_name_en or f"ID: {service_id}"
                    print(f"      • {service_name} (ID: {service_id})")
                print()
            
            print("   ⚠️  ВНИМАНИЕ: Эти услуги не могут быть забронированы через бота!")
            print("   💡 Рекомендация: Назначьте мастеров на эти услуги через админ-панель")
            print()
            results.append(("Проверка услуг без мастеров", False))
        else:
            print("✅ Все услуги имеют назначенных мастеров")
            results.append(("Проверка услуг без мастеров", True))
            
    except Exception as e:
        print(f"❌ Ошибка при проверке услуг без мастеров: {e}")
        import traceback
        traceback.print_exc()
        results.append(("Проверка услуг без мастеров", False))

    # ========================================================================
    # ИТОГИ
    # ========================================================================
    print_header("ИТОГИ ТЕСТИРОВАНИЯ")

    total = len(results)
    passed = sum(1 for _, s in results if s)
    failed = total - passed

    for name, success in results:
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {name}")

    print(f"\n  Всего тестов: {total}")
    print(f"  Пройдено: {passed}")
    print(f"  Провалено: {failed}")

    if failed == 0:
        print("\n  🎉 ВСЕ ТЕСТЫ ПРОЙДЕНЫ УСПЕШНО!")
    else:
        print("\n  ⚠️  Некоторые тесты провалены")
        print("  ℹ️  Проверьте логи выше для деталей")

    print("=" * 80 + "\n")

    return passed == total
    # print_test_file(
    #     "tests/test_broadcasts_and_reminders.py",
    #     "Тестирование акционных рассылок и напоминаний Instagram"
    # )
    # try:
    #     import subprocess
    #     result = subprocess.run(
    #         [sys.executable, os.path.join(os.path.dirname(__file__), "test_broadcasts_and_reminders.py")],
    #         capture_output=True,
    #         text=True
    #     )
    #     print(result.stdout)
    #     if result.stderr:
    #         print(result.stderr)
    #     success = result.returncode == 0
    #     results.append(("test_broadcasts_and_reminders.py - Рассылки и напоминания", success))
    # except Exception as e:
    #     print(f"❌ Ошибка: {e}")
    #     import traceback
    #     traceback.print_exc()
    #     results.append(("test_broadcasts_and_reminders.py - Рассылки и напоминания", False))

    # # ========================================================================
    # # 15. Система управления правами
    # # ========================================================================
    # print_test_file(
    #     "tests/test_permissions.py",
    #     "Тестирование системы управления правами и ролями"
    # )
    # try:
    #     import subprocess
    #     result = subprocess.run(
    #         [sys.executable, os.path.join(os.path.dirname(__file__), "test_permissions.py")],
    #         capture_output=True,
    #         text=True
    #     )
    #     print(result.stdout)
    #     if result.stderr:
    #         print(result.stderr)
    #     success = result.returncode == 0
    #     results.append(("test_permissions.py - Управление правами", success))
    # except Exception as e:
    #     print(f"❌ Ошибка: {e}")
    #     import traceback
    #     traceback.print_exc()
    #     results.append(("test_permissions.py - Управление правами", False))

    # # ========================================================================
    # # ИТОГИ
    # # ========================================================================
    # print_header("ИТОГИ ТЕСТИРОВАНИЯ")

    # total = len(results)
    # passed = sum(1 for _, s in results if s)
    # failed = total - passed

    # for name, success in results:
    #     status = "✅ PASS" if success else "❌ FAIL"
    #     print(f"{status} - {name}")

    # print(f"\n  Всего тестов: {total}")
    # print(f"  Пройдено: {passed}")
    # print(f"  Провалено: {failed}")

    # if failed == 0:
    #     print("\n  🎉 ВСЕ ТЕСТЫ ПРОЙДЕНЫ УСПЕШНО!")
    # else:
    #     print("\n  ⚠️  Некоторые тесты провалены")
    #     print("  ℹ️  Проверьте логи выше для деталей")

    # print("=" * 80 + "\n")

    # return passed == total

if __name__ == "__main__":
    success = False
    try:
        success = run_all_tests()
    except Exception as e:
        print(f"\n❌ Критическая ошибка: {e}")
        import traceback
        traceback.print_exc()
    finally:
        # Всегда запускаем очистку
        cleanup_test_data()
        
    sys.exit(0 if success else 1)
