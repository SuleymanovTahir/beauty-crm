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
        "where": "is_service_provider = TRUE AND is_active = TRUE"
    },
    "public_reviews": {
        "id_field": "id",
        "fields": ["text", "author_name", "employee_name", "employee_position"],
        "where": "is_active = TRUE"
    },
    "public_faq": {
        "id_field": "id",
        "fields": ["question", "answer"],
        "where": "is_active = TRUE"
    },
    "services": {
        "id_field": "id",
        "fields": ["name", "description"],
        "where": "is_active = TRUE"
    },
    "salon_settings": {
        "id_field": "id",
        "fields": ["name", "address", "hours_weekdays", "hours_weekends"], 
        "where": None
    },
    "public_banners": {
        "id_field": "id",
        "fields": ["title", "subtitle"],
        "where": "is_active = TRUE"
    },
    "active_challenges": {
        "id_field": "id",
        "fields": ["title", "description"],
        "where": "is_active = TRUE"
    },
    "public_gallery": {
        "id_field": "id",
        "fields": ["title", "description"],
        "where": "is_active = TRUE"
    },
    "workflow_stages": {
        "id_field": "id",
        "fields": ["name"],
        "where": None
    }
}

# Translation cache directory
CACHE_DIR = "scripts/translations/.cache"

# Output files
EXTRACT_OUTPUT = "scripts/translations/translations_needed.json"
TRANSLATE_OUTPUT = "scripts/translations/translations_completed.json"

# Fields that should NEVER be translated (technical fields, proper nouns, etc.)
SKIP_TRANSLATION_FIELDS = {
    "salon_settings": ["city", "country"],  # Proper nouns should not be translated
    "services": ["duration"]  # Duration format like "1h", "30min" should not be translated
}

# Patterns that indicate content should not be translated
# Only skip English time formats, not Russian ones
SKIP_TRANSLATION_PATTERNS = [
    r'^[A-Z]{2,3}$',  # Country codes like "UAE", "USA"
]
# Proxy list for rotation (optional)
# Format: ["http://user:pass@host:port", ...]
PROXIES = []
