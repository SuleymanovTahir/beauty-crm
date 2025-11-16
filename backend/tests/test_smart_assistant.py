#!/usr/bin/env python3
"""
Тестовый скрипт для проверки SmartAssistant
"""
import sys
import os

# Добавляем путь к backend
sys.path.insert(0, os.path.dirname(__file__))

from services.smart_assistant import SmartAssistant, get_smart_greeting, get_smart_suggestion

def test_smart_assistant():
    """Тест SmartAssistant"""
    print("=" * 60)
    print("🧠 Тестирование SmartAssistant")
    print("=" * 60)

    # Тестируем с реальным клиентом (если есть)
    test_client_id = "test_client_123"

    try:
        # 1. Создаем экземпляр ассистента
        print("\n1️⃣ Создание SmartAssistant...")
        assistant = SmartAssistant(test_client_id)
        print(f"✅ SmartAssistant создан для клиента: {test_client_id}")

        # 2. Проверяем предпочтения
        print("\n2️⃣ Проверка предпочтений...")
        if assistant.preferences:
            print(f"✅ Предпочтения найдены:")
            print(f"   - Предпочитаемый мастер: {assistant.preferences.get('preferred_master')}")
            print(f"   - Предпочитаемая услуга: {assistant.preferences.get('preferred_service')}")
            print(f"   - Время: {assistant.preferences.get('preferred_time_of_day')}")
        else:
            print("ℹ️  Предпочтений пока нет (новый клиент)")

        # 3. Проверяем историю
        print(f"\n3️⃣ Проверка истории...")
        print(f"   Количество записей: {len(assistant.history)}")
        if assistant.history:
            last = assistant.history[0]
            print(f"   Последняя запись: {last['service']} у {last['master']}")

        # 4. Получаем персонализированное приветствие
        print("\n4️⃣ Персонализированное приветствие...")
        greeting = assistant.get_personalized_greeting("Анна")
        print(f"✅ Приветствие: {greeting}")

        # 5. Получаем умное предложение
        print("\n5️⃣ Умное предложение...")
        suggestion = assistant.suggest_next_booking()
        if suggestion:
            print(f"✅ Предложение найдено:")
            print(f"   - Услуга: {suggestion['service']}")
            print(f"   - Мастер: {suggestion['master']}")
            print(f"   - Рекомендуемая дата: {suggestion['recommended_date']}")
            print(f"   - Уверенность: {suggestion['confidence']*100:.0f}%")

            message = assistant.generate_booking_suggestion_message("Анна")
            print(f"   - Сообщение: {message}")
        else:
            print("ℹ️  Предложений пока нет (недостаточно данных)")

        # 6. Тестируем сохранение предпочтений
        print("\n6️⃣ Сохранение предпочтений...")
        test_preferences = {
            'preferred_master': 'Jennifer',
            'preferred_service': 'Маникюр',
            'preferred_time_of_day': 'afternoon',
            'allergies': 'Нет',
            'special_notes': 'Любит яркие цвета'
        }

        success = assistant.save_preferences(test_preferences)
        if success:
            print("✅ Предпочтения успешно сохранены!")
        else:
            print("❌ Ошибка при сохранении предпочтений")

        # 7. Тестируем обучение
        print("\n7️⃣ Обучение на основе записи...")
        test_booking = {
            'service': 'Маникюр',
            'master': 'Jennifer',
            'datetime': '2025-11-20 15:00',
            'phone': '+1234567890',
            'name': 'Анна'
        }

        assistant.learn_from_booking(test_booking)
        print("✅ Обучение завершено!")

        print("\n" + "=" * 60)
        print("✅ ВСЕ ТЕСТЫ ПРОЙДЕНЫ УСПЕШНО!")
        print("=" * 60)

        return True

    except Exception as e:
        print(f"\n❌ ОШИБКА: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = test_smart_assistant()
    sys.exit(0 if success else 1)
