# Translation Scripts (i18n)

This folder contains scripts for managing internationalization (i18n) in the Beauty CRM project.

## Scripts

### 1. check_russian_locales.py
**Purpose:** Validates Russian locale files for completeness and correctness.

**Usage:**
```bash
cd /Users/tahir/Desktop/beauty-crm
python3 scripts/i18n/check_russian_locales.py
```

**What it does:**
- Checks all Russian JSON files in `frontend/src/locales/ru/`
- Validates JSON syntax
- Reports missing or empty keys
- Shows statistics about translation coverage

---

### 2. sync_locales.py
**Purpose:** Synchronizes translation keys across all language files.

**Usage:**
```bash
cd /Users/tahir/Desktop/beauty-crm
python3 scripts/i18n/sync_locales.py
```

**What it does:**
- Uses Russian (`ru`) as the source of truth
- Copies structure to all other languages (en, ar, tr, ur, hi, fr, es, zh)
- Preserves existing translations
- Adds missing keys with empty values
- Removes obsolete keys

---

### 3. translate_from_russian.py
**Purpose:** Auto-translates missing keys from Russian to other languages using Google Translate API.

**Usage:**
```bash
cd /Users/tahir/Desktop/beauty-crm
python3 scripts/i18n/translate_from_russian.py
```

**What it does:**
- Scans all language files for empty values
- Translates from Russian to target language
- Updates JSON files with translations
- Shows progress and statistics
- **Note:** Requires internet connection for Google Translate API

---

## Quick Workflow

### Full Translation Pipeline
Run all scripts in sequence:
```bash
cd /Users/tahir/Desktop/beauty-crm
python3 scripts/i18n/check_russian_locales.py && \
python3 scripts/i18n/sync_locales.py && \
python3 scripts/i18n/translate_from_russian.py
```

### When to Use Each Script

**After adding new features:**
1. Add Russian translations to appropriate JSON files
2. Run `sync_locales.py` to copy structure
3. Run `translate_from_russian.py` to auto-translate

**Before deployment:**
1. Run `check_russian_locales.py` to validate
2. Fix any reported issues
3. Run full pipeline to ensure all languages are up-to-date

**After manual translation updates:**
1. Run `check_russian_locales.py` to validate
2. Run `sync_locales.py` if structure changed

---

## Supported Languages

- 🇷🇺 Russian (ru) - Source language
- 🇬🇧 English (en)
- 🇸🇦 Arabic (ar)
- 🇹🇷 Turkish (tr)
- 🇵🇰 Urdu (ur)
- 🇮🇳 Hindi (hi)
- 🇫🇷 French (fr)
- 🇪🇸 Spanish (es)
- 🇨🇳 Chinese (zh)

---

## File Structure

All locale files are located in:
```
frontend/src/locales/
├── ru/           # Russian (source)
│   ├── common.json
│   ├── components.json
│   ├── admin-components.json
│   ├── admin/
│   │   ├── Users.json
│   │   └── ...
│   └── manager/
│       ├── Chat.json
│       └── ...
├── en/           # English
├── ar/           # Arabic
├── tr/           # Turkish
├── ur/           # Urdu
├── hi/           # Hindi
├── fr/           # French
├── es/           # Spanish
└── zh/           # Chinese
```

---

## Notes

- Always use Russian as the source language
- Run scripts from project root directory
- Scripts automatically create backups before modifications
- Translation quality may vary - review important translations manually
- Scripts are safe to run multiple times
