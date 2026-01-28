"""
Утилиты для работы с языками - универсальные функции без хардкода
"""
from typing import List, Optional

# Поддерживаемые языки - единый источник истины
SUPPORTED_LANGUAGES = ['ru', 'en', 'ar', 'es', 'de', 'fr', 'hi', 'kk', 'pt']
DEFAULT_LANGUAGE = 'ru'
FALLBACK_LANGUAGE = 'en'

def validate_language(language: str) -> str:
    """Валидировать и нормализовать код языка"""
    if language in SUPPORTED_LANGUAGES:
        return language
    return DEFAULT_LANGUAGE

def build_coalesce_query(base_field, language_code, fallback_fields=[]):
    """
    Returns the field name without language prefixes as per Rule 15.
    Translations are handled via locale files in the frontend.
    """
    return base_field

def get_localized_name(emp_id, full_name, language='ru'):
    """
    Получить имя с учетом транслитерации.
    """
    return get_transliterated_name(full_name, language)

def get_transliterated_name(name: str, language: str) -> str:
    """
    Универсальная транслитерация (обертка над utils.transliteration).
    """
    try:
        from utils.transliteration import transliterate_name
        return transliterate_name(name, language)
    except ImportError:
        return name

def translate_position(position: str, language: str) -> str:
    """
    Перевод должности с использованием словаря BeautySalonTranslator.
    """
    if not position:
        return ""
        
    language = validate_language(language)
    
    if language == 'ru':
        try:
            from utils.beauty_translator import BEAUTY_SALON_TERMS
            pos_lower = position.lower().strip()
            if pos_lower in BEAUTY_SALON_TERMS:
                result = BEAUTY_SALON_TERMS[pos_lower]
                # Делаем первую букву заглавной
                if result:
                    return result[0].upper() + result[1:]
        except ImportError:
            pass
    
    return position

def get_dynamic_translation(table: str, item_id: int, field: str, language: str, default_value: str = "") -> str:
    """
    Получить перевод динамического контента из locales/*.json
    Служит заменой локализованным колонкам в БД.
    """
    import json
    from pathlib import Path
    
    language = validate_language(language)
    
    # Путь к файлу локализации (относительно корня проекта)
    base_dir = Path(__file__).parent.parent.parent
    locales_file = base_dir / 'frontend' / 'src' / 'locales' / language / 'dynamic.json'
    
    if not locales_file.exists():
        return default_value
        
    try:
        with open(locales_file, 'r', encoding='utf-8') as f:
            translations = json.load(f)
            
        # Ищем ключ: table.item_id.field (может быть с хешем в конце)
        if field:
            prefix = f"{table}.{item_id}.{field}"
        else:
            prefix = f"{table}.{item_id}"
        
        # Ищем все подходящие ключи
        matches = []
        
        # 1. Точное совпадение
        if prefix in translations:
            matches.append((prefix, translations[prefix]))
            
        # 2. Совпадение по префиксу (с хешем)
        for key, value in translations.items():
            if key != prefix and key.startswith(prefix + "_ru."): # Format: field_ru.hash
                matches.append((key, value))
            elif key != prefix and key.startswith(prefix + "."): # Format: field.hash
                matches.append((key, value))
        
        # Эвристика выбора: приоритет ключам с хешем (длинным), так как они содержат нормальные переводы
        for key, value in matches:
            if "_ru." in key:
                return value
        
        # Если нет ключей с хешем, возвращаем точное совпадение или первое попавшееся
        result = default_value
        if matches:
            result = matches[0][1]
            
        # Fallback: Dictionary check for EN if result contains Cyrillic
        if language == 'en' and _has_cyrillic(result):
            try:
                from utils.beauty_translator import RU_TO_EN_TERMS
                val_lower = result.lower().strip()
                if val_lower in RU_TO_EN_TERMS:
                    tr = RU_TO_EN_TERMS[val_lower]
                    return tr[0].upper() + tr[1:]
            except ImportError:
                pass
                
        return result
            
    except Exception:
        pass
        
    return default_value

def _has_cyrillic(text: str) -> bool:
    """Проверка на наличие кириллицы"""
    if not text: return False
    return any(u'\u0400' <= c <= u'\u04FF' for c in text)
