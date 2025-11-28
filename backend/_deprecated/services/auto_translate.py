import logging
import httpx
from typing import Dict

logger = logging.getLogger(__name__)

async def translate_to_all_languages(text_ru: str) -> Dict[str, str]:
    """
    Переводит русский текст на все поддерживаемые языки
    
    Args:
        text_ru: Текст на русском языке
        
    Returns:
        Словарь с переводами: {'en': '...', 'ar': '...', ...}
    """
    if not text_ru:
        return {}
    
    languages = {
        'en': 'English',
        'ar': 'Arabic',
        'de': 'German',
        'es': 'Spanish',
        'fr': 'French',
        'hi': 'Hindi',
        'kk': 'Kazakh',
        'pt': 'Portuguese'
    }
    
    translations = {}
    
    for lang_code in languages.keys():
        try:
            translated = await translate_text(text_ru, lang_code)
            translations[lang_code] = translated
            logger.info(f"Translated to {lang_code}: {translated[:50]}...")
        except Exception as e:
            logger.error(f"Error translating to {lang_code}: {e}")
            translations[lang_code] = text_ru  # Fallback to original
    
    return translations

async def translate_text(text: str, target_lang: str) -> str:
    """
    Переводит текст используя Google Translate (бесплатный endpoint)
    """
    if not text:
        return ""
    
    url = "https://translate.googleapis.com/translate_a/single"
    params = {
        "client": "gtx",
        "sl": "ru",
        "tl": target_lang,
        "dt": "t",
        "q": text
    }
    
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, params=params, timeout=10.0)
            if resp.status_code == 200:
                data = resp.json()
                return "".join([x[0] for x in data[0]])
    except Exception as e:
        logger.error(f"Translation error: {e}")
    
    return text
