#!/usr/bin/env python3
"""
Переводчик для Beauty CRM с использованием LibreTranslate
Контекст: Салон красоты
"""
import requests
import time
from typing import Dict, Optional

# Публичный API LibreTranslate
LIBRETRANSLATE_URL = "https://libretranslate.com/translate"

# Словарь терминов салона красоты (не переводим через API)
BEAUTY_SALON_TERMS = {
    # Длительность
    '15min': '15 мин',
    '20min': '20 мин',
    '30min': '30 мин',
    '40min': '40 мин',
    '45min': '45 мин',
    '1h': '1 час',
    '1h 15min': '1 час 15 мин',
    '1h 30min': '1 час 30 мин',
    '1h 45min': '1 час 45 мин',
    '2h': '2 часа',
    '2h 30min': '2 часа 30 мин',
    '3h': '3 часа',
    '3h 30min': '3 часа 30 мин',
    '4h': '4 часа',
    
    # Услуги маникюра/педикюра
    'manicure': 'маникюр',
    'pedicure': 'педикюр',
    'gel polish': 'гель-лак',
    'nail extension': 'наращивание ногтей',
    'nail design': 'дизайн ногтей',
    'french manicure': 'французский маникюр',
    'spa manicure': 'SPA-маникюр',
    'spa pedicure': 'SPA-педикюр',
    
    # Услуги для волос
    'haircut': 'стрижка',
    'hair coloring': 'окрашивание волос',
    'hair styling': 'укладка волос',
    'hair treatment': 'уход за волосами',
    'keratin treatment': 'кератиновое выпрямление',
    'balayage': 'балаяж',
    'highlights': 'мелирование',
    'ombre': 'омбре',
    'hair botox': 'ботокс для волос',
    
    # Эпиляция/депиляция
    'waxing': 'восковая эпиляция',
    'sugaring': 'шугаринг',
    'laser hair removal': 'лазерная эпиляция',
    'half arm': 'эпиляция рук до локтя',
    'full arm': 'эпиляция рук полностью',
    'half leg': 'эпиляция ног до колена',
    'full leg': 'эпиляция ног полностью',
    'bikini': 'бикини',
    'deep bikini': 'глубокое бикини',
    'brazilian': 'бразильская эпиляция',
    'underarms': 'подмышки',
    'upper lip': 'верхняя губа',
    
    # Брови/ресницы
    'eyebrow shaping': 'коррекция бровей',
    'eyebrow tinting': 'окрашивание бровей',
    'eyelash extensions': 'наращивание ресниц',
    'eyelash lift': 'ламинирование ресниц',
    'brow lamination': 'ламинирование бровей',
    
    # Макияж
    'makeup': 'макияж',
    'bridal makeup': 'свадебный макияж',
    'evening makeup': 'вечерний макияж',
    'day makeup': 'дневной макияж',
    
    # Косметология
    'facial': 'уход за лицом',
    'facial cleansing': 'чистка лица',
    'peeling': 'пилинг',
    'massage': 'массаж',
    'facial massage': 'массаж лица',
    'body massage': 'массаж тела',
    
    # Общие термины
    'booking': 'запись',
    'appointment': 'запись',
    'consultation': 'консультация',
    'master': 'мастер',
    'specialist': 'специалист',
}

class BeautySalonTranslator:
    """Переводчик с контекстом салона красоты"""
    
    def __init__(self):
        self.cache = {}
        self.request_count = 0
        
    def translate(self, text: str, source: str = 'en', target: str = 'ru') -> Optional[str]:
        """
        Переводит текст с учетом контекста салона красоты
        
        Args:
            text: Текст для перевода
            source: Исходный язык
            target: Целевой язык
            
        Returns:
            Переведенный текст или None при ошибке
        """
        if not text or not text.strip():
            return text
            
        # Проверяем кэш
        cache_key = f"{text}:{source}:{target}"
        if cache_key in self.cache:
            return self.cache[cache_key]
        
        # Проверяем словарь терминов (только для en->ru)
        if source == 'en' and target == 'ru':
            text_lower = text.lower().strip()
            if text_lower in BEAUTY_SALON_TERMS:
                result = BEAUTY_SALON_TERMS[text_lower]
                self.cache[cache_key] = result
                return result
        
        # Переводим через API с контекстом
        try:
            # Добавляем контекст для лучшего перевода
            context_text = text
            if source == 'en' and len(text.split()) <= 3:
                # Для коротких фраз добавляем контекст
                context_text = f"beauty salon service: {text}"
            
            self.request_count += 1
            
            # Небольшая задержка чтобы не превысить лимиты
            if self.request_count % 5 == 0:
                time.sleep(1)
            
            response = requests.post(LIBRETRANSLATE_URL, data={
                'q': context_text,
                'source': source,
                'target': target,
                'format': 'text'
            }, timeout=15)
            
            if response.status_code == 200:
                result = response.json()
                translated = result.get('translatedText', text)
                
                # Убираем добавленный контекст из результата
                if context_text != text:
                    # Убираем "услуга салона красоты:" и подобное
                    translated = translated.replace('услуга салона красоты:', '').strip()
                    translated = translated.replace('Услуга салона красоты:', '').strip()
                    translated = translated.replace('beauty salon service:', '').strip()
                
                self.cache[cache_key] = translated
                return translated
            else:
                print(f"⚠️  API error {response.status_code} for: {text}")
                return text
                
        except Exception as e:
            print(f"❌ Translation error for '{text}': {e}")
            return text
    
    def get_stats(self) -> Dict:
        """Возвращает статистику переводов"""
        return {
            'total_requests': self.request_count,
            'cached_translations': len(self.cache),
            'dictionary_terms': len(BEAUTY_SALON_TERMS)
        }

# Глобальный экземпляр переводчика
_translator = None

def get_translator() -> BeautySalonTranslator:
    """Получить глобальный экземпляр переводчика"""
    global _translator
    if _translator is None:
        _translator = BeautySalonTranslator()
    return _translator

def translate_text(text: str, source: str = 'en', target: str = 'ru') -> Optional[str]:
    """
    Удобная функция для перевода текста
    
    Args:
        text: Текст для перевода
        source: Исходный язык (по умолчанию 'en')
        target: Целевой язык (по умолчанию 'ru')
        
    Returns:
        Переведенный текст
    """
    translator = get_translator()
    return translator.translate(text, source, target)

if __name__ == '__main__':
    # Тестирование
    print("🧪 ТЕСТ ПЕРЕВОДЧИКА САЛОНА КРАСОТЫ\n")
    
    test_cases = [
        'booking',
        'half arm',
        'full leg',
        'gel polish',
        'hair coloring',
        '1h 30min',
        'eyebrow shaping',
        'deep bikini',
        'bridal makeup',
    ]
    
    translator = get_translator()
    
    for text in test_cases:
        translated = translator.translate(text)
        print(f"  {text:20} → {translated}")
    
    print(f"\n📊 Статистика:")
    stats = translator.get_stats()
    for key, value in stats.items():
        print(f"  {key}: {value}")
