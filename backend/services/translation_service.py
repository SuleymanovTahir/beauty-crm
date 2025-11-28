"""
Сервис перевода (упрощенная версия без API)
Возвращает исходный текст без перевода
"""
from typing import Dict, List, Optional
from utils.logger import log_info

# Маппинг языковых кодов на полные названия
LANGUAGE_NAMES = {
    'ru': 'Russian',
    'en': 'English',
    'ar': 'Arabic',
    'de': 'German',
    'es': 'Spanish',
    'fr': 'French',
    'hi': 'Hindi',
    'kk': 'Kazakh',
    'pt': 'Portuguese'
}

# Логируем один раз при импорте
log_info("Translation service: returning source text (no API translation)", "translation")

async def translate_text(text: str, source_lang: str = 'ru', target_lang: str = 'en') -> Optional[str]:
    """
    Возвращает исходный текст без перевода
    
    Args:
        text: Текст для перевода
        source_lang: Исходный язык (код)
        target_lang: Целевой язык (код)
    
    Returns:
        Исходный текст
    """
    return text


async def translate_to_all_languages(text: str, source_lang: str = 'ru') -> Dict[str, str]:
    """
    Возвращает исходный текст для всех языков
    
    Args:
        text: Текст для перевода
        source_lang: Исходный язык
    
    Returns:
        Словарь с исходным текстом для всех языков {язык: текст}
    """
    translations = {}
    for lang_code in LANGUAGE_NAMES.keys():
        translations[lang_code] = text
    return translations


async def batch_translate(texts: List[str], source_lang: str = 'ru', target_lang: str = 'en') -> List[str]:
    """
    Возвращает исходные тексты без перевода
    
    Args:
        texts: Список текстов для перевода
        source_lang: Исходный язык
        target_lang: Целевой язык
    
    Returns:
        Список исходных текстов
    """
    return texts
