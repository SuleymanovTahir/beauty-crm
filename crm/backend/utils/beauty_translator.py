#!/usr/bin/env python3
"""
Переводчик для CRM с использованием LibreTranslate
Контекст: бизнес и услуги
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
    'hair haircut': 'стрижка', # Cleanup
    'bangs cut': 'стрижка челки',
    'fringe cut': 'стрижка челки',
    'hair wash': 'мытье головы',
    'hair trim only': 'стрижка кончиков (ровный срез)',
    'complex coloring (ombre/balayage/highlights)': 'сложное (омбре/балаяж/мелирование)', # OLD: complex coloring
    'roots coloring': 'окрашивание корней',
    'evening hairstyle': 'вечерняя прическа',
    'blow dry (short)': 'укладка феном (короткие)',
    'blow dry (medium)': 'укладка феном (средние)',
    'blow dry (long)': 'укладка феном (длинные)',
    'curls / straightening (short)': 'локоны / выпрямление (короткие)',
    'curls / straightening (medium)': 'локоны / выпрямление (средние)',
    'curls / straightening (long)': 'локоны / выпрямление (длинные)',
    'lash extensions 2D': 'наращивание (2d объем)',
    'lash extensions 3D': 'наращивание (3d объем)',
    'lash extensions 4-5D': 'наращивание (4-5d объем)',
    'classic lash extensions': 'наращивание (классика)',
    'Kim effect (L/M curves)': 'эффект ким / l, m изгибы',
    'lash removal': 'снятие ресниц',
    'total blonde': 'тотальный блонд',
    'toning': 'тонирование',
    'kids cut': 'детская стрижка',
    'haircut (trim only)': 'стрижка (только срез)',
    'haircut + wash': 'стрижка + мытье',
    'haircut + wash + styling': 'стрижка + мытье + укладка', 
    'bangs': 'челка',
    'express shape (no wash)': 'экспресс-форма (без мытья)',
    'one tone color (short hair)': 'в один тон (короткие)',
    'one tone color (medium hair)': 'в один тон (средние)',
    'one tone color (long hair)': 'в один тон (длинные)',
    'medical facial cleansing (problem skin)': 'мед. чистка лица (проблемная кожа)',
    'lamination of eyelashes + eyebrows': 'ламинирование ресниц + брови',
    'permanent lip makeup': 'перманентный макияж губ',
    'permanent eyebrow makeup': 'перманентный макияж бровей',
    'interciliary arrow': 'межресничная стрелка',
    'eyeliner': 'стрелка',
    'permanent makeup correction': 'коррекция перманентного макияжа',
    'cheek wax': 'депиляция щек',
    'chin wax': 'депиляция подбородка',
    'full face wax': 'депиляция лица полностью',
    'neck wax': 'депиляция шеи',
    'nose wax': 'депиляция носа',
    'hair wash': 'мытье головы',
    
    # Эпиляция/депиляция (en->ru)
    'waxing': 'восковая эпиляция',
    'sugaring': 'шугаринг',
    'laser hair removal': 'лазерная эпиляция',
    'underarms': 'эпиляция подмышек',
    'underarms waxing': 'эпиляция подмышек',
    'underarms laser': 'лазерная эпиляция подмышек',
    'upper lip': 'эпиляция верхней губы',
    'upper lip waxing': 'эпиляция верхней губы',
    'full face waxing': 'эпиляция лица полностью',
    'cheeks waxing': 'эпиляция щек',
    'chin waxing': 'эпиляция подбородка',
    'half arm': 'эпиляция рук до локтя',
    'full arm': 'эпиляция рук полностью',
    'half leg': 'эпиляция голеней (ноги)',
    'full leg': 'эпиляция ног полностью',
    'bikini line': 'эпиляция: линия бикини',
    'deep bikini': 'глубокое бикини',
    'full body': 'эпиляция: все тело',
    
    # Брови/ресницы (en->ru)
    'eyebrow shaping': 'коррекция бровей',
    'eyebrow tinting': 'окрашивание бровей',
    'eyelash extensions': 'наращивание ресниц',
    'eyelash lift': 'ламинирование ресниц',
    'brow lamination': 'ламинирование бровей',
    'lash lamination': 'ламинирование ресниц',
    'brow and lash lamination': 'ламинирование бровей и ресниц',
    'eyebrow tinting': 'окрашивание бровей',
    'eyebrow shaping': 'оформление бровей',
    'lashes': 'ресницы',
    'brows': 'брови',
    'deep facial cleansing': 'глубокая чистка лица',
    'lifting facial massage with mask': 'подтягивающий массаж лица с маской',
    'medical cleansing for problem skin': 'медицинская чистка лица (проблемная кожа)',
    'peeling': 'Пилинг',
    'peel': 'Пилинг',
    'balayage': 'балаяж',
    'black color removal': 'выход из черного',
    
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
    'moroccan bath': 'традиционная марокканская баня',
    'moroccan bath service': 'традиционная марокканская баня',
    'traditional moroccan bath': 'традиционная марокканская баня',
    
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
    'обрезка': 'trim', # Исправление грубого перевода
    'снятие': 'removal',
    'любой мастер': 'any professional',
    'отменено': 'cancelled',
    'пропущено': 'skipped',
    'с даты': 'date from',
    'по дату': 'date to',
    'в ожидании': 'pending',
    'ламинирование бровей и ресниц': 'brow and lash lamination',
    'окрашивание бровей': 'eyebrow tinting',
    'оформление бровей': 'eyebrow shaping',
    'ламинирование бровей': 'brow lamination',
    'глубокая чистка лица': 'deep facial cleansing',
    'подтягивающий массаж лица с маской': 'lifting facial massage with mask',
    'медицинская чистка для проблемной кожи': 'medical cleansing for problem skin',
    'пилинг': 'peeling',
    'балаяж': 'balayage',
    'выход из черного': 'black color removal',
    'традиционная марокканская баня': 'traditional moroccan bath',
    
    # Должности (en->ru) - добавлены для отображения на сайте
    'nail master': 'мастер маникюра',
    'hair stylist': 'стилист по волосам',
    'barber': 'стилист по волосам',
    'hairdresser': 'стилист по волосам',
    'makeup artist': 'визажист',
    'spa therapist': 'SPA-терапевт',
    'director': 'директор',
    'owner': 'владелец',
    'owner / director': 'владелец / директор',
    'nail & waxing master': 'мастер маникюра и депиляции',
    'hair stylist & permanent makeup artist': 'стилист по волосам и мастер перманента',
    'universal beauty master': 'мастер-универсал',
    'aesthetician': 'косметолог-эстетист',
    'top stylist': 'топ-стилист',
    'art director': 'арт-директор',
    'permanent makeup': 'перманентный макияж',
}

class BeautySalonTranslator:
    """Переводчик с нейтральным бизнес-контекстом"""
    
    def __init__(self):
        self.cache = {}
        self.request_count = 0
        
    def translate(self, text: str, source: str = 'en', target: str = 'ru') -> Optional[str]:
        """
        Переводит текст с учетом нейтрального сервисного контекста
        
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
            'ru': '[Услуга]',
            'en': '[Service]',
            'ar': '[خدمة]',
            'es': '[Servicio]',
            'de': '[Service]',
            'fr': '[Service]',
            'pt': '[Serviço]',
            'hi': '[सेवा]',
            'kk': '[Қызмет]',
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

# Создаем обратный словарь для перевода с русского на английский
RU_TO_EN_TERMS = {v: k for k, v in BEAUTY_SALON_TERMS.items()}
