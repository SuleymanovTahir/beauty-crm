#!/usr/bin/env python3
"""
Скрипт для заполнения переводов длительности услуг
Парсит существующие значения duration и создает переводы для всех языков
"""
import sqlite3
import re
from pathlib import Path

# Путь к базе данных
DB_PATH = Path(__file__).parent.parent.parent / "salon_bot.db"

# Словарь переводов для единиц времени
TRANSLATIONS = {
    'ru': {'ч': 'ч', 'мин': 'мин'},
    'en': {'ч': 'h', 'мин': 'min'},
    'ar': {'ч': 'س', 'мин': 'د'},  # ساعة (час), دقيقة (минута)
    'de': {'ч': 'Std', 'мин': 'Min'},
    'es': {'ч': 'h', 'мин': 'min'},
    'fr': {'ч': 'h', 'мин': 'min'},
    'hi': {'ч': 'घं', 'мин': 'मि'},  # घंटा (час), मिनट (минута)
    'kk': {'ч': 'сағ', 'мин': 'мин'},  # сағат (час)
    'pt': {'ч': 'h', 'мин': 'min'}
}


def parse_duration(duration_text):
    """
    Парсит текст длительности и возвращает структурированные данные
    
    Примеры:
    "1ч" -> {'hours': 1, 'minutes': 0}
    "30мин" -> {'hours': 0, 'minutes': 30}
    "1ч 30мин" -> {'hours': 1, 'minutes': 30}
    """
    if not duration_text:
        return None
    
    result = {'hours': 0, 'minutes': 0}
    
    # Ищем часы
    hours_match = re.search(r'(\d+)\s*ч', duration_text)
    if hours_match:
        result['hours'] = int(hours_match.group(1))
    
    # Ищем минуты
    minutes_match = re.search(r'(\d+)\s*мин', duration_text)
    if minutes_match:
        result['minutes'] = int(minutes_match.group(1))
    
    return result


def format_duration(parsed, lang):
    """
    Форматирует длительность на указанном языке
    
    Args:
        parsed: dict с ключами 'hours' и 'minutes'
        lang: код языка (ru, en, ar, de, etc.)
    
    Returns:
        Отформатированная строка длительности
    """
    if not parsed:
        return None
    
    translations = TRANSLATIONS.get(lang, TRANSLATIONS['en'])
    parts = []
    
    if parsed['hours'] > 0:
        parts.append(f"{parsed['hours']}{translations['ч']}")
    
    if parsed['minutes'] > 0:
        parts.append(f"{parsed['minutes']}{translations['мин']}")
    
    return ' '.join(parts) if parts else None


def fill_duration_translations():
    """
    Основная функция для заполнения переводов длительности
    """
    print("=" * 70)
    print("🔧 ЗАПОЛНЕНИЕ ПЕРЕВОДОВ ДЛИТЕЛЬНОСТИ УСЛУГ")
    print("=" * 70)
    
    conn = sqlite3.connect(str(DB_PATH))
    c = conn.cursor()
    
    try:
        # Получаем все услуги с заполненным duration
        c.execute("""
            SELECT id, name, duration 
            FROM services 
            WHERE duration IS NOT NULL AND duration != ''
        """)
        
        services = c.fetchall()
        print(f"\n📊 Найдено услуг с длительностью: {len(services)}")
        
        if len(services) == 0:
            print("⚠️  Нет услуг для обработки")
            return
        
        updated_count = 0
        
        for service_id, name, duration in services:
            print(f"\n🔄 Обработка: {name}")
            print(f"   Исходная длительность: {duration}")
            
            # Парсим длительность
            parsed = parse_duration(duration)
            
            if not parsed:
                print(f"   ⚠️  Не удалось распарсить: {duration}")
                continue
            
            # Генерируем переводы для всех языков
            translations = {}
            for lang in TRANSLATIONS.keys():
                translated = format_duration(parsed, lang)
                if translated:
                    translations[f'duration_{lang}'] = translated
                    print(f"   {lang}: {translated}")
            
            # Обновляем запись в БД
            if translations:
                # Формируем SQL запрос
                set_clause = ', '.join([f"{key} = ?" for key in translations.keys()])
                values = list(translations.values()) + [service_id]
                
                c.execute(f"""
                    UPDATE services 
                    SET {set_clause}
                    WHERE id = ?
                """, values)
                
                updated_count += 1
                print(f"   ✅ Обновлено")
        
        conn.commit()
        
        print("\n" + "=" * 70)
        print(f"✅ ЗАВЕРШЕНО: Обновлено {updated_count} из {len(services)} услуг")
        print("=" * 70)
        
        # Проверка результатов
        print("\n🔍 Проверка результатов (первые 3 услуги):")
        c.execute("""
            SELECT id, name, duration, duration_ru, duration_en, duration_de 
            FROM services 
            WHERE duration IS NOT NULL AND duration != ''
            LIMIT 3
        """)
        
        for row in c.fetchall():
            print(f"\n  ID: {row[0]}")
            print(f"  Название: {row[1]}")
            print(f"  duration: {row[2]}")
            print(f"  duration_ru: {row[3]}")
            print(f"  duration_en: {row[4]}")
            print(f"  duration_de: {row[5]}")
        
    except Exception as e:
        print(f"\n❌ Ошибка: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    fill_duration_translations()
