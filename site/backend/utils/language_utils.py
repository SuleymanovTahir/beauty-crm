"""
Утилиты для работы с языками - универсальные функции без хардкода
"""
from typing import List, Optional
import re
import time

# Поддерживаемые языки - единый источник истины
SUPPORTED_LANGUAGES = ['ru', 'en', 'ar', 'es', 'de', 'fr', 'hi', 'kk', 'pt']
DEFAULT_LANGUAGE = 'en'
FALLBACK_LANGUAGE = 'en'

POSITION_NORMALIZATION_RULES = {
    "beauty_specialist": {
        "variants": {
            "universal beauty master",
            "beauty specialist",
            "мастер универсальной красоты",
            "универсальный мастер красоты",
            "мастер универсал",
            "мастер-универсал",
            "maestro de belleza universal",
            "universal beauty master",
            "عالم تجميل عالمي",
            "यूनिवर्सल ब्यूटी मास्टर",
        },
        "labels": {
            "ru": "Бьюти-специалист",
            "en": "Beauty Specialist",
            "ar": "أخصائية تجميل",
            "es": "Especialista en belleza",
            "de": "Beauty-Spezialistin",
            "fr": "Spécialiste beauté",
            "hi": "ब्यूटी स्पेशलिस्ट",
            "kk": "Бьюти-специалист",
            "pt": "Especialista em beleza",
        },
    },
}

PUBLIC_NAME_OVERRIDES = {
    "анна петрова": "Anna Petrova",
    "сара дженкинс": "Sarah Jenkins",
    "елена смирнова": "Elena Smirnova",
    "мария гонсалес": "Mariya Gonsales",
    "фатима аль сайед": "Fatima Al-Sayed",
    "фатима аль-сайед": "Fatima Al-Sayed",
}

# Cache for dynamic translations (language -> {translations dict, load_time})
_translations_cache = {}
_CACHE_TTL_SECONDS = 3600  # 1 hour (translations change rarely)

def validate_language(language: str) -> str:
    """Валидировать и нормализовать код языка"""
    normalized_language = str(language or '').strip().lower()
    if normalized_language in SUPPORTED_LANGUAGES:
        return normalized_language

    if '-' in normalized_language:
        short_language = normalized_language.split('-', 1)[0]
        if short_language in SUPPORTED_LANGUAGES:
            return short_language

    if '_' in normalized_language:
        short_language = normalized_language.split('_', 1)[0]
        if short_language in SUPPORTED_LANGUAGES:
            return short_language

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


def normalize_public_person_name(name: str) -> str:
    """
    Нормализовать имя для публичного отображения без русификации.
    Канонический вид для отзывов и публичных карточек — латиница, если имя было на кириллице.
    """
    clean_name = " ".join(str(name or "").split())
    if not clean_name:
        return ""

    normalized_name = re.sub(r"[^\w\sа-яё]", " ", clean_name.casefold(), flags=re.IGNORECASE)
    normalized_name = re.sub(r"\s+", " ", normalized_name).strip()
    canonical_name = PUBLIC_NAME_OVERRIDES.get(normalized_name)
    if canonical_name:
        return canonical_name

    return get_transliterated_name(clean_name, "en")


def normalize_position_label(position: str, language: str) -> str:
    """
    Исправить известные некорректные/неестественные должности на нормальный label.
    """
    clean_position = " ".join(str(position or "").split())
    if not clean_position:
        return ""

    normalized_language = validate_language(language)
    normalized_position = re.sub(r"[\-–—]", " ", clean_position.casefold())
    normalized_position = re.sub(r"\s+", " ", normalized_position).strip()

    for rule in POSITION_NORMALIZATION_RULES.values():
        if normalized_position in rule["variants"]:
            labels = rule["labels"]
            return labels.get(normalized_language, labels[FALLBACK_LANGUAGE])

    return clean_position

def translate_position(position: str, language: str) -> str:
    """
    Перевод должности с использованием словаря BeautySalonTranslator.
    """
    if not position:
        return ""
        
    language = validate_language(language)
    normalized_position = normalize_position_label(position, language)
    if normalized_position != " ".join(str(position).split()):
        return normalized_position
    
    if language == 'ru':
        try:
            from utils.beauty_translator import BEAUTY_SALON_TERMS
            pos_lower = position.lower().strip()
            if pos_lower in BEAUTY_SALON_TERMS:
                result = BEAUTY_SALON_TERMS[pos_lower]
                # Делаем первую букву заглавной
                if result:
                    normalized_result = normalize_position_label(result, language)
                    if normalized_result:
                        return normalized_result
                    return result[0].upper() + result[1:]
        except ImportError:
            pass
    
    return normalize_position_label(position, language)

def _load_translations(language: str) -> dict:
    """Load translations from file with caching and pre-indexing for performance"""
    import json
    from pathlib import Path

    global _translations_cache

    now = time.time()
    cached = _translations_cache.get(language)

    # Return cached if still valid
    if cached and (now - cached['time']) < _CACHE_TTL_SECONDS:
        return cached['data']

    # Load from file
    base_dir = Path(__file__).parent.parent.parent
    locales_file = base_dir / 'frontend' / 'src' / 'locales' / language / 'dynamic.json'

    data = {}
    if locales_file.exists():
        try:
            with open(locales_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
        except Exception:
            data = {}

    # Pre-index for get_dynamic_translation performance
    # We want O(1) lookup for prefixes
    index = {}
    for key, value in data.items():
        if '.' in key:
            parts = key.split('.')
            if len(parts) >= 3:
                table, item_id, field_part = parts[0], parts[1], parts[2]
                base_field = field_part
                prefix = f"{table}.{item_id}.{base_field}"
                if prefix not in index:
                    index[prefix] = []
                index[prefix].append((key, value))
            elif len(parts) == 2:
                prefix = f"{parts[0]}.{parts[1]}"
                if prefix not in index:
                    index[prefix] = []
                index[prefix].append((key, value))
        
        if key not in index:
            index[key] = [(key, value)]
        else:
            if not any(k == key for k, v in index[key]):
                index[key].append((key, value))

    result = {'raw': data, 'index': index}
    _translations_cache[language] = {'data': result, 'time': now}
    return result


def get_dynamic_translation(table: str, item_id: int, field: str, language: str, default_value: str = "") -> str:
    """
    Получить перевод динамического контента из locales/*.json
    Служит заменой локализованным колонкам в БД.
    Uses in-memory cache and index for high performance (O(1)).
    """
    language = validate_language(language)
    cache_obj = _load_translations(language)
    
    if not cache_obj:
        return default_value
        
    index = cache_obj.get('index', {})
    
    # Ищем ключ: table.item_id.field
    if field:
        prefix = f"{table}.{item_id}.{field}"
    else:
        prefix = f"{table}.{item_id}"

    matches = index.get(prefix, [])
    if not matches:
        return default_value

    # Priority 1: Exact match with shortest key (no hash/suffix)
    # Sort matches by key length to find the cleanest one
    matches.sort(key=lambda x: len(x[0]))
    
    # Priority 2: If we have an exact match with the prefix, use it
    for key, value in matches:
        if key == prefix:
            return value
            
    # Priority 3: Keys with hash suffixes (backwards compatibility)
    for key, value in matches:
        if "." in key and len(key.split('.')[-1]) > 5:
            return value

    return matches[0][1]

def _has_cyrillic(text: str) -> bool:
    """Проверка на наличие кириллицы"""
    if not text: return False
    return any(u'\u0400' <= c <= u'\u04FF' for c in text)
