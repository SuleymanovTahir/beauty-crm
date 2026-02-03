import json
import os
from typing import Dict, Any, Optional
from utils.logger import log_error, log_warning

# Базовая директория с переводами (относительно корня проекта)
LOCALES_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "frontend", "src", "locales")

# Кэш для переводов
_translations_cache: Dict[str, Dict[str, Any]] = {}

def load_translations(lang: str) -> Dict[str, Any]:
    """Загрузить все переводы для конкретного языка"""
    if lang in _translations_cache:
        return _translations_cache[lang]
    
    combined = {}
    lang_dir = os.path.join(LOCALES_DIR, lang)
    
    if not os.path.exists(lang_dir):
        # Пробуем fallback на 'en' если языка нет
        if lang != 'en':
            return load_translations('en')
        return {}

    # Список файлов для загрузки (основные для отчетов)
    ns_files = ['common', 'booking']
    
    for ns in ns_files:
        file_path = os.path.join(lang_dir, f"{ns}.json")
        if os.path.exists(file_path):
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    combined[ns] = json.load(f)
            except Exception as e:
                log_error(f"Error loading translation file {file_path}: {e}", "i18n")
    
    # Специфичная логика для adminPanel, так как это директория
    admin_panel_dir = os.path.join(lang_dir, "adminPanel")
    if os.path.isdir(admin_panel_dir):
        dashboard_path = os.path.join(admin_panel_dir, "dashboard.json")
        if os.path.exists(dashboard_path):
            try:
                with open(dashboard_path, 'r', encoding='utf-8') as f:
                     # Загружаем как adminPanel.dashboard...
                    if 'adminPanel' not in combined:
                        combined['adminPanel'] = {}
                    combined['adminPanel']['dashboard'] = json.load(f)
            except Exception as e:
                log_error(f"Error loading dashboard translation {dashboard_path}: {e}", "i18n")
    
    _translations_cache[lang] = combined
    return combined

def t(lang: str, key: str, default: str = None, **kwargs) -> str:
    """
    Получить перевод по ключу.
    Поддерживает вложенные ключи через точку, например: 'common.actions.save'
    Поддерживает подстановку переменных через kwargs, например: t('en', 'greeting', name='John')
    """
    if not lang:
        lang = 'en'
        
    translations = load_translations(lang)
    
    # Разбираем ключ (например "common.status")
    parts = key.split('.')
    current = translations
    
    for part in parts:
        if isinstance(current, dict) and part in current:
            current = current[part]
        else:
            # Если ключ не найден, пробуем найти в 'en'
            if lang != 'en':
                val = t('en', key, None, **kwargs)
                if val:
                    return val
            return default if default is not None else key
            
    val = str(current)
    
    # Подстановка переменных {{var}}
    if kwargs:
        for k, v in kwargs.items():
            val = val.replace(f"{{{{{k}}}}}", str(v))
            
    return val

def register_fonts():
    """Регистрация шрифтов с поддержкой кириллицы и других символов"""
    try:
        from reportlab.pdfbase import pdfmetrics
        from reportlab.pdfbase.ttfonts import TTFont
        
        # Список возможных путей к шрифтам
        font_paths = [
            # macOS
            "/Library/Fonts/Arial Unicode.ttf",
            "/System/Library/Fonts/Supplemental/Arial.ttf",
            "/System/Library/Fonts/Cache/Arial.ttf",
            "/System/Library/Fonts/Arial.ttf",
            # Linux (server)
            "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
            "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
            "/usr/share/fonts/truetype/freefont/FreeSans.ttf",
        ]
        
        success = False
        for path in font_paths:
            if os.path.exists(path):
                try:
                    pdfmetrics.registerFont(TTFont('CustomFont', path))
                    pdfmetrics.registerFontFamily('CustomFont', normal='CustomFont', bold='CustomFont', italic='CustomFont', boldItalic='CustomFont')
                    success = True
                    # log_info(f"✅ Font registered: {path}", "i18n")
                    break
                except:
                    continue
        
        return 'CustomFont' if success else 'Helvetica'
    except ImportError:
        return 'Helvetica'
    except Exception as e:
        log_warning(f"Font registration warning: {e}", "i18n")
        return 'Helvetica'
