import json
import os
from typing import Dict, Any, Optional
from utils.logger import log_error

LOCALES_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "frontend",
    "src",
    "locales",
)

_translations_cache: Dict[str, Dict[str, Any]] = {}


def _assign_nested(target: Dict[str, Any], parts: list[str], value: Any) -> None:
    current = target
    for part in parts[:-1]:
        current = current.setdefault(part, {})
    current[parts[-1]] = value


def load_translations(lang: str) -> Dict[str, Any]:
    if lang in _translations_cache:
        return _translations_cache[lang]

    lang_dir = os.path.join(LOCALES_DIR, lang)
    if not os.path.exists(lang_dir):
        if lang != 'en':
            return load_translations('en')
        return {}

    combined: Dict[str, Any] = {}
    for root_dir, _, files in os.walk(lang_dir):
        for file_name in files:
            if not file_name.endswith('.json'):
                continue
            file_path = os.path.join(root_dir, file_name)
            relative_path = os.path.relpath(file_path, lang_dir)
            namespace_parts = relative_path[:-5].split(os.sep)
            try:
                with open(file_path, 'r', encoding='utf-8') as file_handle:
                    _assign_nested(combined, namespace_parts, json.load(file_handle))
            except Exception as error:
                log_error(f"Error loading translation file {file_path}: {error}", 'i18n')

    _translations_cache[lang] = combined
    return combined


def t(lang: str, key: str, default: Optional[str] = None, **kwargs) -> str:
    if not lang:
        lang = 'en'

    translations = load_translations(lang)
    normalized_key = key.replace(':', '.').replace('/', '.')
    parts = normalized_key.split('.')
    current: Any = translations

    for part in parts:
        if isinstance(current, dict) and part in current:
            current = current[part]
        else:
            if lang != 'en':
                fallback = t('en', key, None, **kwargs)
                if fallback:
                    return fallback
            return default if default is not None else key

    value = str(current)
    if kwargs:
        for variable, replacement in kwargs.items():
            value = value.replace(f"{{{{{variable}}}}}", str(replacement))

    return value


def register_fonts():
    return None
