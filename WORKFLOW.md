# 🌍 i18n Workflow Guide

This guide explains how to manage translations in the Beauty CRM project.

## 🚀 Quick Commands

| Goal | Command | Description |
|------|---------|-------------|
| **Extract Keys** | `npm run i18n:extract` | Scans code (`.tsx`, `.ts`) and adds new keys to `src/locales/ru/*.json`. Does NOT delete existing keys. |
| **Check Missing** | `npm run i18n:check` | Checks if any keys in other languages are missing compared to Russian. |
| **Find Empty** | `node scripts/i18n/check-empty-keys.js` | Finds keys in `ru` locale that have no translation (empty string). |
| **Auto-Translate** | `npm run i18n:sync` | Translates filled Russian keys to all other languages using Google Translate (Python script). |

---

## 🔄 Typical Workflows

### 1. Adding New Text to Code
When you add new text to a component (e.g., `<div>New Text</div>`):

1.  **Wrap in `t()`**: Change it to `<div>{t('new_key')}</div>`.
2.  **Extract**: Run `npm run i18n:extract`.
    *   This adds `"new_key": ""` to the corresponding JSON file in `src/locales/ru/`.
3.  **Fill Russian**: Open the JSON file and fill the empty string: `"new_key": "Новый текст"`.
4.  **Translate**: Run `npm run i18n:sync`.
    *   This will auto-translate "Новый текст" to English, Arabic, etc.

### 2. Removing Text
When you remove text from code:

1.  **Remove from Code**: Delete the `t('key')` usage.
2.  **Extract**: Run `npm run i18n:extract`.
    *   The parser is configured to **NOT** delete keys automatically to prevent accidental loss.
    *   If you want to clean up unused keys, you must manually remove them from `ru` JSON files.

### 3. Checking Translation Status
To see what's missing or empty:

1.  **Empty Russian Keys**: `node scripts/i18n/check-empty-keys.js`
    *   Shows keys you haven't filled in yet.
2.  **Missing Foreign Keys**: `npm run i18n:check`
    *   Shows keys that exist in Russian but are missing in other languages.

---

## 🤖 Auto-Translation Features
The script `scripts/i18n/translate_from_russian.py` (run via `npm run i18n:sync`):
*   **Incremental**: Only translates keys that are missing or different from the source.
*   **Smart**: Skips long phrases (>3 words) to avoid bad machine translation (logs them for manual review).
*   **Progress**: Shows a progress bar and percentage.
*   **Safe**: Does not overwrite existing manual translations in other languages.
