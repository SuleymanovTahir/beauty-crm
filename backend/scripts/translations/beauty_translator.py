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

# Словарь терминов салона красоты (двунаправленный: en<->ru)
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
    
    # Услуги маникюра/педикюра (en->ru)
    'manicure': 'маникюр',
    'pedicure': 'педикюр',
    'gel polish': 'гель-лак',
    'nail extension': 'наращивание ногтей',
    'nail design': 'дизайн ногтей',
    'french manicure': 'французский маникюр',
    'spa manicure': 'SPA-маникюр',
    'spa pedicure': 'SPA-педикюр',
    'nail correction': 'коррекция ногтя',
    'nail repair': 'коррекция ногтя',
    'acrylic overlay': 'покрытие акрилом',
    'gel application': 'покрытие гелем',
    
    # Услуги для волос (en->ru)
    'haircut': 'стрижка',
    'hair coloring': 'окрашивание волос',
    'hair styling': 'укладка волос',
    'hair treatment': 'уход за волосами',
    'keratin treatment': 'кератиновое выпрямление',
    'balayage': 'балаяж',
    'highlights': 'мелирование',
    'ombre': 'омбре',
    'hair botox': 'ботокс для волос',
    'blow dry': 'укладка феном',
    'trim ends': 'подравнивание кончиков',
    'trim': 'подравнивание',
    
    # Эпиляция/депиляция (en->ru)
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
    
    # Брови/ресницы (en->ru)
    'eyebrow shaping': 'коррекция бровей',
    'eyebrow tinting': 'окрашивание бровей',
    'eyelash extensions': 'наращивание ресниц',
    'eyelash lift': 'ламинирование ресниц',
    'brow lamination': 'ламинирование бровей',
    'lashes': 'ресницы',
    'brows': 'брови',
    
    # Макияж (en->ru)
    'makeup': 'макияж',
    'bridal makeup': 'свадебный макияж',
    'evening makeup': 'вечерний макияж',
    'day makeup': 'дневной макияж',
    
    # Косметология (en->ru)
    'facial': 'уход за лицом',
    'facial cleansing': 'чистка лица',
    'peeling': 'пилинг',
    'massage': 'массаж',
    'facial massage': 'массаж лица',
    'body massage': 'массаж тела',
    
    # Общие термины (en->ru)
    'booking': 'запись',
    'appointment': 'запись',
    'post': 'запись',  # Исправление частой ошибки
    'record': 'запись',  # Исправление частой ошибки
    'recording': 'запись', # Исправление частой ошибки (не аудио-запись!)
    'consultation': 'консультация',
    'master': 'мастер',
    'specialist': 'специалист',
    'stylist': 'стилист',
    'wizard': 'мастер', # Исправление частой ошибки перевода слова "мастер"
    'reminder': 'напоминание',
    'reminders': 'напоминания',
    'any master': 'любой мастер',
    'any professional': 'любой мастер',
    'any available': 'любой мастер',
    'flexible match': 'любой мастер',
    'refused': 'отменено',
    'cancelled': 'отменено',
    'he missed it': 'пропущено',
    'skipped': 'пропущено',
    'date from': 'с даты',
    'date to': 'по дату',
    'to me': 'с даты', # Избегаем кривого перевода Google
    'the author': 'по дату', # Избегаем кривого перевода Google
    'pending': 'в ожидании',
    'waiting': 'в ожидании',
    
    # Русские-Английские пары для принудительного выбора (SSOT)
    'запись': 'booking',
    'записаться': 'book online',
    'мастер': 'stylist', # Для премиального салона лучше stylist или specialist
    'специалист': 'specialist',
    'услуга': 'service',
    'услуги': 'services',
    'ресницы': 'lashes',
    'брови': 'brows',
    'ногти': 'nails',
    'укладка': 'styling',
    'стрижка': 'haircut',
    'окрашивание': 'coloring',
    'подравнивание': 'trim',
    'снятие': 'removal',
    'любой мастер': 'any professional',
    'отменено': 'cancelled',
    'пропущено': 'skipped',
    'с даты': 'date from',
    'по дату': 'date to',
    'в ожидании': 'pending',
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
        
        # Список исключений - не переводить эти термины
        EXCLUSIONS = {
            # Валюты
            'AED', 'USD', 'EUR', 'GBP', 'RUB', 'SAR', 'KWD', 'QAR', 'BHD', 'OMR',
            # Технические термины
            'min', 'h', 'kg', 'cm', 'ml', 'ID', 'VIP', 'SPA', 'SMS', 'API',
            # Коды и аббревиатуры
            'UV', 'LED', '2D', '3D', '4D', '5D', 'ML',
        }
        
        # Проверяем исключения (точное совпадение)
        if text.strip().upper() in EXCLUSIONS:
            return text
            
        # Проверяем кэш
        cache_key = f"{text}:{source}:{target}"
        if cache_key in self.cache:
            return self.cache[cache_key]
        
        # Проверяем словарь терминов (работает для всех языковых пар)
        text_lower = text.lower().strip()
        if text_lower in BEAUTY_SALON_TERMS:
            result = BEAUTY_SALON_TERMS[text_lower]
            self.cache[cache_key] = result
            return result
        
        # Универсальный контекст для всех языков
        # Определяем контекстный префикс в зависимости от исходного языка
        context_prefixes = {
            'ru': '[Салон красоты]',
            'en': '[Beauty salon]',
            'ar': '[صالون تجميل]',
            'es': '[Salón de belleza]',
            'de': '[Schönheitssalon]',
            'fr': '[Salon de beauté]',
            'pt': '[Salão de beleza]',
            'hi': '[सौंदर्य सैलून]',
            'kk': '[Сұлулық салоны]',
        }
        
        # Переводим через API с контекстом
        try:
            # Добавляем контекст для коротких фраз (вероятно термины)
            context_text = text
            add_context = len(text.split()) <= 5  # Короткие фразы до 5 слов
            
            if add_context and source in context_prefixes:
                context_prefix = context_prefixes[source]
                context_text = f"{context_prefix} {text}"
            
            self.request_count += 1
            
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
                if add_context:
                    # Убираем все возможные варианты контекстного префикса
                    for prefix in context_prefixes.values():
                        translated = translated.replace(prefix, '').strip()
                    # Убираем квадратные скобки если остались
                    translated = translated.replace('[', '').replace(']', '').strip()
                
                self.cache[cache_key] = translated
                return translated
            elif response.status_code == 429:
                # Rate limiting - просто возвращаем оригинал без вывода
                return text
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
