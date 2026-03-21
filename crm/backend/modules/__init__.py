"""
Менеджер модулей Beauty CRM

Позволяет включать/выключать модули через конфигурацию
и управлять зависимостями между модулями.
"""
import json
import os
from typing import Dict, Any, Optional
from pathlib import Path
from utils.logger import log_info, log_warning, log_error

# Путь к конфигурации модулей
CONFIG_PATH = Path(__file__).parent.parent / "modules_config.json"

# Кеш конфигурации
_config_cache: Optional[Dict[str, Any]] = None

def load_modules_config() -> Dict[str, Any]:
    """Загрузить конфигурацию модулей"""
    global _config_cache

    if _config_cache is not None:
        return _config_cache

    try:
        with open(CONFIG_PATH, 'r', encoding='utf-8') as f:
            config = json.load(f)
            _config_cache = config
            log_info(f"📦 Загружена конфигурация модулей из {CONFIG_PATH}", "modules")
            return config
    except FileNotFoundError:
        log_error(f"Файл конфигурации модулей не найден: {CONFIG_PATH}", "modules")
        return {"modules": {}}
    except json.JSONDecodeError as e:
        log_error(f"Ошибка парсинга конфигурации модулей: {e}", "modules")
        return {"modules": {}}

def reload_modules_config():
    """Перезагрузить конфигурацию модулей"""
    global _config_cache
    _config_cache = None
    return load_modules_config()

def is_module_enabled(module_name: str) -> bool:
    """
    Проверить, включен ли модуль

    Args:
        module_name: Имя модуля (notifications, scheduler, instagram)

    Returns:
        True если модуль включен, False иначе
    """
    config = load_modules_config()
    modules = config.get("modules", {})

    if module_name not in modules:
        log_warning(f"Модуль '{module_name}' не найден в конфигурации", "modules")
        return False

    return modules[module_name].get("enabled", False)

def get_module_config(module_name: str) -> Dict[str, Any]:
    """
    Получить конфигурацию модуля

    Args:
        module_name: Имя модуля

    Returns:
        Словарь с конфигурацией модуля
    """
    config = load_modules_config()
    modules = config.get("modules", {})

    if module_name not in modules:
        log_warning(f"Модуль '{module_name}' не найден в конфигурации", "modules")
        return {}

    return modules[module_name]

def get_module_setting(module_name: str, *keys: str, default: Any = None) -> Any:
    """
    Получить конкретную настройку модуля

    Args:
        module_name: Имя модуля
        *keys: Путь к настройке (например, 'channels', 'email', 'enabled')
        default: Значение по умолчанию

    Returns:
        Значение настройки или default

    Example:
        >>> get_module_setting('notifications', 'channels', 'email', 'enabled')
        True
    """
    config = get_module_config(module_name)

    # Навигация по вложенным ключам
    current = config
    for key in keys:
        if isinstance(current, dict) and key in current:
            current = current[key]
        else:
            return default

    return current

def set_module_enabled(module_name: str, enabled: bool) -> bool:
    """
    Включить/выключить модуль

    Args:
        module_name: Имя модуля
        enabled: True - включить, False - выключить

    Returns:
        True если успешно, False при ошибке
    """
    try:
        with open(CONFIG_PATH, 'r', encoding='utf-8') as f:
            config = json.load(f)

        if module_name not in config.get("modules", {}):
            log_error(f"Модуль '{module_name}' не найден", "modules")
            return False

        # Core модуль нельзя выключить
        if module_name == "core" and not enabled:
            log_warning("Core модуль нельзя выключить", "modules")
            return False

        config["modules"][module_name]["enabled"] = enabled

        with open(CONFIG_PATH, 'w', encoding='utf-8') as f:
            json.dump(config, f, indent=2, ensure_ascii=False)

        # Сбрасываем кеш
        global _config_cache
        _config_cache = None

        status = "включен" if enabled else "выключен"
        log_info(f"✅ Модуль '{module_name}' {status}", "modules")
        return True

    except Exception as e:
        log_error(f"Ошибка изменения статуса модуля '{module_name}': {e}", "modules")
        return False

def get_enabled_modules() -> list:
    """Получить список включенных модулей"""
    config = load_modules_config()
    modules = config.get("modules", {})

    return [
        name for name, cfg in modules.items()
        if cfg.get("enabled", False)
    ]

def print_modules_status():
    """Вывести статус всех модулей"""
    config = load_modules_config()
    modules = config.get("modules", {})

    log_info("=" * 70, "modules")
    log_info("📦 СТАТУС МОДУЛЕЙ", "modules")
    log_info("=" * 70, "modules")

    for name, cfg in modules.items():
        enabled = cfg.get("enabled", False)
        description = cfg.get("description", "")
        status = "✅ ВКЛЮЧЕН" if enabled else "❌ ВЫКЛЮЧЕН"

        log_info(f"{status:12} | {name:15} | {description}", "modules")

    log_info("=" * 70, "modules")

# Автозагрузка конфигурации при импорте
load_modules_config()
