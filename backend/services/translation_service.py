"""
Сервис автоматического перевода с использованием Google Gemini API
"""
import os
from typing import Dict, List, Optional
import google.generativeai as genai
from utils.logger import log_info, log_error

# Настройка API
genai.configure(api_key=os.getenv('GEMINI_API_KEY'))

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

def translate_text(text: str, source_lang: str = 'ru', target_lang: str = 'en') -> Optional[str]:
    """
    Перевести текст с одного языка на другой
    
    Args:
        text: Текст для перевода
        source_lang: Исходный язык (код)
        target_lang: Целевой язык (код)
    
    Returns:
        Переведенный текст или None при ошибке
    """
    if source_lang == target_lang:
        return text
    
    if not text or text.strip() == '':
        return text
    
    try:
        source_name = LANGUAGE_NAMES.get(source_lang, source_lang)
        target_name = LANGUAGE_NAMES.get(target_lang, target_lang)
        
        model = genai.GenerativeModel('gemini-2.0-flash-exp')
        
        prompt = f"""Translate the following text from {source_name} to {target_name}.
Provide ONLY the translation, without any explanations or additional text.
Maintain the same tone and style as the original.

Text to translate:
{text}"""
        
        response = model.generate_content(prompt)
        translated = response.text.strip()
        
        log_info(f"Translated text from {source_lang} to {target_lang}: {text[:50]}... -> {translated[:50]}...", "translation")
        return translated
        
    except Exception as e:
        log_error(f"Translation error ({source_lang} -> {target_lang}): {e}", "translation")
        return None


def translate_to_all_languages(text: str, source_lang: str = 'ru') -> Dict[str, str]:
    """
    Перевести текст на все поддерживаемые языки
    
    Args:
        text: Текст для перевода
        source_lang: Исходный язык
    
    Returns:
        Словарь с переводами {язык: перевод}
    """
    translations = {source_lang: text}
    
    for lang_code in LANGUAGE_NAMES.keys():
        if lang_code != source_lang:
            translated = translate_text(text, source_lang, lang_code)
            if translated:
                translations[lang_code] = translated
            else:
                # Fallback to source language if translation fails
                translations[lang_code] = text
                log_error(f"Failed to translate to {lang_code}, using source text", "translation")
    
    return translations


def batch_translate(texts: List[str], source_lang: str = 'ru', target_lang: str = 'en') -> List[str]:
    """
    Пакетный перевод списка текстов
    
    Args:
        texts: Список текстов для перевода
        source_lang: Исходный язык
        target_lang: Целевой язык
    
    Returns:
        Список переведенных текстов
    """
    if source_lang == target_lang:
        return texts
    
    try:
        source_name = LANGUAGE_NAMES.get(source_lang, source_lang)
        target_name = LANGUAGE_NAMES.get(target_lang, target_lang)
        
        model = genai.GenerativeModel('gemini-2.0-flash-exp')
        
        # Объединяем тексты с разделителями
        combined_text = "\n---SEPARATOR---\n".join(texts)
        
        prompt = f"""Translate the following texts from {source_name} to {target_name}.
The texts are separated by "---SEPARATOR---".
Provide ONLY the translations in the same order, separated by "---SEPARATOR---".
Do not add any explanations or additional text.
Maintain the same tone and style as the original.

Texts to translate:
{combined_text}"""
        
        response = model.generate_content(prompt)
        translated_texts = response.text.strip().split("---SEPARATOR---")
        
        # Очистка переводов
        translated_texts = [t.strip() for t in translated_texts]
        
        # Проверка количества
        if len(translated_texts) != len(texts):
            log_error(f"Batch translation count mismatch: expected {len(texts)}, got {len(translated_texts)}", "translation")
            # Fallback to individual translation
            return [translate_text(t, source_lang, target_lang) or t for t in texts]
        
        log_info(f"Batch translated {len(texts)} texts from {source_lang} to {target_lang}", "translation")
        return translated_texts
        
    except Exception as e:
        log_error(f"Batch translation error: {e}", "translation")
        # Fallback to individual translation
        return [translate_text(t, source_lang, target_lang) or t for t in texts]
