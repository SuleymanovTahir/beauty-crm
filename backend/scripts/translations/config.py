"""
Configuration for database translation system
Defines which tables and fields should be translated
"""

# Supported languages
LANGUAGES = ["ru", "en", "ar", "es", "de", "fr", "hi", "kk", "pt"]
SOURCE_LANGUAGE = "ru"  # Default source language

# Tables and fields to translate
TRANSLATION_CONFIG = {
    "users": {
        "id_field": "id",
        "fields": ["full_name", "position", "bio"],
        "where": "is_service_provider = 1 AND is_active = 1"
    },
    "public_reviews": {
        "id_field": "id",
        "fields": ["author_name", "employee_name", "employee_position"],
        "where": "is_active = 1"
    },
    "services": {
        "id_field": "id",
        "fields": ["name", "description"],
        "where": "is_active = 1"
    },
    "salon_settings": {
        "id_field": "id",
        "fields": ["main_location"],
        "where": None  # No filter needed
    }
}

# Database path
DATABASE_PATH = "salon_bot.db"

# Translation cache directory
CACHE_DIR = "scripts/translations/.cache"

# Output files
EXTRACT_OUTPUT = "scripts/translations/translations_needed.json"
TRANSLATE_OUTPUT = "scripts/translations/translations_completed.json"
