#!/usr/bin/env python3
"""
Тестовый скрипт для перевода duration услуг через LibreTranslate
"""
import requests
import sys
from db.connection import get_db_connection

# Публичный API LibreTranslate
LIBRETRANSLATE_URL = "https://libretranslate.com/translate"

# Словарь для технических терминов (не переводим)
DURATION_PATTERNS = {
    '30min': '30 мин',
    '45min': '45 мин', 
    '1h': '1 час',
    '1h 30min': '1 час 30 мин',
    '2h': '2 часа',
    '2h 30min': '2 часа 30 мин',
    '3h': '3 часа',
}

def translate_with_libretranslate(text, source='en', target='ru'):
    """Перевод через LibreTranslate"""
    try:
        response = requests.post(LIBRETRANSLATE_URL, data={
            'q': text,
            'source': source,
            'target': target,
            'format': 'text'
        }, timeout=10)
        
        if response.status_code == 200:
            result = response.json()
            return result.get('translatedText', text)
        else:
            print(f"❌ Ошибка API: {response.status_code}")
            return None
    except Exception as e:
        print(f"❌ Ошибка: {e}")
        return None

def translate_duration(duration_en):
    """Переводим duration с учетом паттернов"""
    # Сначала проверяем словарь
    if duration_en in DURATION_PATTERNS:
        return DURATION_PATTERNS[duration_en]
    
    # Если нет в словаре - используем API
    translated = translate_with_libretranslate(duration_en, 'en', 'ru')
    return translated if translated else duration_en

def test_duration_translation():
    """Тестируем перевод для нескольких примеров"""
    print("🧪 ТЕСТ ПЕРЕВОДА ДЛИТЕЛЬНОСТИ\n")
    
    test_cases = ['30min', '1h', '1h 30min', '2h', '45min']
    
    for duration in test_cases:
        translated = translate_duration(duration)
        print(f"  {duration:15} → {translated}")
    
    print("\n" + "="*50)
    
    # Спрашиваем подтверждение
    answer = input("\n✅ Переводы корректны? Применить ко всем услугам? (y/n): ")
    
    if answer.lower() != 'y':
        print("❌ Отменено")
        return False
    
    return True

def update_services_duration():
    """Обновляем duration для всех услуг"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Получаем все услуги с duration
        cursor.execute("""
            SELECT id, duration, duration_ru, duration_en 
            FROM services 
            WHERE duration IS NOT NULL
        """)
        
        services = cursor.fetchall()
        print(f"\n📋 Найдено услуг: {len(services)}")
        
        updated = 0
        for service in services:
            service_id, duration, duration_ru, duration_en = service
            
            # Если duration_ru пустой или некорректный
            if not duration_ru or 'Услуги салона' in duration_ru:
                # Переводим
                new_duration_ru = translate_duration(duration)
                
                # Обновляем
                cursor.execute("""
                    UPDATE services 
                    SET duration_ru = %s 
                    WHERE id = %s
                """, (new_duration_ru, service_id))
                
                print(f"  ✅ ID {service_id}: '{duration}' → '{new_duration_ru}'")
                updated += 1
        
        conn.commit()
        print(f"\n✅ Обновлено услуг: {updated}")
        
    except Exception as e:
        conn.rollback()
        print(f"❌ Ошибка: {e}")
    finally:
        conn.close()

if __name__ == '__main__':
    print("="*50)
    print("🔄 ПЕРЕВОД DURATION ЧЕРЕЗ LIBRETRANSLATE")
    print("="*50 + "\n")
    
    # Сначала тестируем
    if test_duration_translation():
        # Если тест прошел - применяем
        update_services_duration()
    
    print("\n✅ Готово!")
