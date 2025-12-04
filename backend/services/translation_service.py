"""
Сервис перевода с использованием Gemini API
"""
from typing import Dict, List, Optional
import google.generativeai as genai
from core.config import GEMINI_API_KEY, GEMINI_MODEL
from utils.logger import log_info, log_error
import asyncio
import json

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

# Инициализация Gemini
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    log_info("✅ Translation service: Gemini API configured", "translation")
else:
    log_error("❌ Translation service: GEMINI_API_KEY not found", "translation")

async def translate_text(text: str, source_lang: str = 'ru', target_lang: str = 'en') -> Optional[str]:
    """
    Переводит текст используя Gemini API
    """
    if not text:
        return ""
        
    if not GEMINI_API_KEY:
        log_error("Cannot translate: API key missing", "translation")
        return text

    try:
        model = genai.GenerativeModel(GEMINI_MODEL)
        
        source_name = LANGUAGE_NAMES.get(source_lang, source_lang)
        target_name = LANGUAGE_NAMES.get(target_lang, target_lang)
        
        prompt = f"""
        Translate the following text from {source_name} to {target_name}.
        Return ONLY the translated text, no explanations or quotes.
        
        Text: {text}
        """
        
        # Запускаем синхронный вызов в thread pool
        response = await asyncio.to_thread(model.generate_content, prompt)
        
        if response.text:
            return response.text.strip()
        return text
        
    except Exception as e:
        log_error(f"Translation error: {e}", "translation")
        return text

async def translate_to_all_languages(text: str, source_lang: str = 'ru') -> Dict[str, str]:
    """
    Переводит текст на все поддерживаемые языки за один запрос
    """
    if not text:
        return {lang: "" for lang in LANGUAGE_NAMES}
        
    if not GEMINI_API_KEY:
        return {lang: text for lang in LANGUAGE_NAMES}

    try:
        model = genai.GenerativeModel(GEMINI_MODEL)
        
        target_langs = [lang for lang in LANGUAGE_NAMES.keys() if lang != source_lang]
        target_langs_str = ", ".join([f"{lang} ({LANGUAGE_NAMES[lang]})" for lang in target_langs])
        
        prompt = f"""
        Translate the following text from {LANGUAGE_NAMES.get(source_lang, source_lang)} to multiple languages: {target_langs_str}.
        Return the result as a JSON object where keys are language codes (e.g. "en", "ar") and values are translations.
        Include the source language in the output as well.
        
        Text: {text}
        """
        
        response = await asyncio.to_thread(model.generate_content, prompt)
        
        result_text = response.text.strip()
        # Очистка от markdown блоков кода если есть
        if result_text.startswith("```json"):
            result_text = result_text[7:-3]
        elif result_text.startswith("```"):
            result_text = result_text[3:-3]
            
        translations = json.loads(result_text)
        
        # Добавляем исходный язык если нет
        if source_lang not in translations:
            translations[source_lang] = text
            
        # Заполняем пропуски исходным текстом
        for lang in LANGUAGE_NAMES:
            if lang not in translations:
                translations[lang] = text
                
        return translations
        
    except Exception as e:
        log_error(f"Batch translation error: {e}", "translation")
        # Fallback
        return {lang: text for lang in LANGUAGE_NAMES}

async def batch_translate(texts: List[str], source_lang: str = 'ru', target_lang: str = 'en') -> List[str]:
    """
    Переводит список текстов
    """
    if not texts:
        return []
        
    # Для простоты пока переводим по одному, но можно оптимизировать в один промпт
    results = []
    for text in texts:
        translated = await translate_text(text, source_lang, target_lang)
        results.append(translated)
    return results
