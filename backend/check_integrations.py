#!/usr/bin/env python3
"""
Скрипт проверки настройки интеграций Beauty CRM
Проверяет все компоненты системы на готовность к работе
"""
import os
import sys
from typing import Dict, List, Tuple

# Цвета для вывода
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
RESET = '\033[0m'

def print_header(text: str):
    """Печать заголовка"""
    print(f"\n{BLUE}{'='*60}{RESET}")
    print(f"{BLUE}{text:^60}{RESET}")
    print(f"{BLUE}{'='*60}{RESET}\n")

def check_status(name: str, status: bool, details: str = ""):
    """Печать статуса проверки"""
    icon = f"{GREEN}✅{RESET}" if status else f"{RED}❌{RESET}"
    print(f"{icon} {name:<40} {details}")
    return status

def check_python_packages() -> List[Tuple[str, bool]]:
    """Проверка установленных Python пакетов"""
    print_header("ПРОВЕРКА PYTHON ПАКЕТОВ")
    
    required_packages = [
        'fastapi',
        'uvicorn',
        'httpx',
        'reportlab',
        'psycopg2',
        'python-dotenv',
        'python-docx',
        'aiosmtplib'
    ]
    
    results = []
    for package in required_packages:
        try:
            __import__(package.replace('-', '_'))
            check_status(package, True, "установлен")
            results.append((package, True))
        except ImportError:
            check_status(package, False, "НЕ УСТАНОВЛЕН")
            results.append((package, False))
    
    return results

def check_env_variables() -> Dict[str, Dict[str, bool]]:
    """Проверка переменных окружения"""
    print_header("ПРОВЕРКА ПЕРЕМЕННЫХ ОКРУЖЕНИЯ")
    
    categories = {
        "Email (SMTP)": ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASSWORD'],
        "Telegram": ['TELEGRAM_BOT_TOKEN'],
        "WhatsApp": ['WHATSAPP_API_URL', 'WHATSAPP_API_TOKEN'],
        "Stripe": ['STRIPE_API_KEY', 'STRIPE_WEBHOOK_SECRET'],
        "Yookassa": ['YOOKASSA_SHOP_ID', 'YOOKASSA_SECRET_KEY'],
        "Tinkoff": ['TINKOFF_TERMINAL_KEY', 'TINKOFF_SECRET_KEY'],
        "Database": ['DATABASE_URL']
    }
    
    results = {}
    for category, vars in categories.items():
        print(f"\n{YELLOW}{category}:{RESET}")
        category_results = {}
        for var in vars:
            value = os.getenv(var)
            is_set = bool(value)
            status_text = "настроено" if is_set else "не настроено"
            check_status(f"  {var}", is_set, status_text)
            category_results[var] = is_set
        results[category] = category_results
    
    return results

def check_directories() -> List[Tuple[str, bool]]:
    """Проверка необходимых директорий"""
    print_header("ПРОВЕРКА ДИРЕКТОРИЙ")
    
    directories = [
        '/tmp/crm_pdfs',
        '/tmp',
        'backend/services',
        'backend/api',
        'backend/db/migrations'
    ]
    
    results = []
    for directory in directories:
        exists = os.path.exists(directory)
        writable = os.access(directory, os.W_OK) if exists else False
        status_text = "существует и доступна" if exists and writable else \
                     "существует, но недоступна" if exists else "не существует"
        check_status(directory, exists and writable, status_text)
        results.append((directory, exists and writable))
    
    return results

def check_fonts() -> bool:
    """Проверка шрифтов для PDF"""
    print_header("ПРОВЕРКА ШРИФТОВ ДЛЯ PDF")
    
    font_paths = [
        '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
        '/System/Library/Fonts/Supplemental/DejaVuSans.ttf',
        'DejaVuSans.ttf'
    ]
    
    font_found = False
    for path in font_paths:
        if os.path.exists(path):
            check_status(f"Шрифт DejaVu", True, f"найден: {path}")
            font_found = True
            break
    
    if not font_found:
        check_status("Шрифт DejaVu", False, "не найден (PDF может не работать)")
    
    return font_found

def check_services() -> Dict[str, bool]:
    """Проверка сервисов"""
    print_header("ПРОВЕРКА СЕРВИСОВ")
    
    services = {
        'pdf_generator': 'backend/services/pdf_generator.py',
        'document_sender': 'backend/services/document_sender.py'
    }
    
    results = {}
    for name, path in services.items():
        exists = os.path.exists(path)
        check_status(name, exists, "найден" if exists else "не найден")
        results[name] = exists
    
    return results

def check_api_endpoints() -> Dict[str, bool]:
    """Проверка API эндпоинтов"""
    print_header("ПРОВЕРКА API ЭНДПОИНТОВ")
    
    endpoints = {
        'contracts': 'backend/api/contracts.py',
        'invoices': 'backend/api/invoices.py',
        'products': 'backend/api/products.py',
        'payment_integrations': 'backend/api/payment_integrations.py',
        'marketplace_integrations': 'backend/api/marketplace_integrations.py'
    }
    
    results = {}
    for name, path in endpoints.items():
        exists = os.path.exists(path)
        check_status(name, exists, "найден" if exists else "не найден")
        results[name] = exists
    
    return results

def generate_report(
    packages: List[Tuple[str, bool]],
    env_vars: Dict[str, Dict[str, bool]],
    directories: List[Tuple[str, bool]],
    fonts: bool,
    services: Dict[str, bool],
    api_endpoints: Dict[str, bool]
):
    """Генерация итогового отчета"""
    print_header("ИТОГОВЫЙ ОТЧЕТ")
    
    # Подсчет статистики
    packages_ok = sum(1 for _, status in packages if status)
    packages_total = len(packages)
    
    env_ok = sum(1 for cat in env_vars.values() for status in cat.values() if status)
    env_total = sum(len(cat) for cat in env_vars.values())
    
    dirs_ok = sum(1 for _, status in directories if status)
    dirs_total = len(directories)
    
    services_ok = sum(1 for status in services.values() if status)
    services_total = len(services)
    
    api_ok = sum(1 for status in api_endpoints.values() if status)
    api_total = len(api_endpoints)
    
    # Вывод статистики
    print(f"📦 Python пакеты:     {packages_ok}/{packages_total} {GREEN if packages_ok == packages_total else RED}{'✓' if packages_ok == packages_total else '✗'}{RESET}")
    print(f"🔧 Переменные окр.:   {env_ok}/{env_total} {GREEN if env_ok > 0 else YELLOW}{'✓' if env_ok > 0 else '⚠'}{RESET}")
    print(f"📁 Директории:        {dirs_ok}/{dirs_total} {GREEN if dirs_ok == dirs_total else RED}{'✓' if dirs_ok == dirs_total else '✗'}{RESET}")
    print(f"🔤 Шрифты PDF:        {GREEN if fonts else RED}{'✓' if fonts else '✗'}{RESET}")
    print(f"⚙️  Сервисы:          {services_ok}/{services_total} {GREEN if services_ok == services_total else RED}{'✓' if services_ok == services_total else '✗'}{RESET}")
    print(f"🌐 API эндпоинты:     {api_ok}/{api_total} {GREEN if api_ok == api_total else RED}{'✓' if api_ok == api_total else '✗'}{RESET}")
    
    # Общая готовность
    total_checks = packages_total + dirs_total + services_total + api_total + 1  # +1 для шрифтов
    total_ok = packages_ok + dirs_ok + services_ok + api_ok + (1 if fonts else 0)
    
    readiness = (total_ok / total_checks) * 100
    
    print(f"\n{'='*60}")
    print(f"ОБЩАЯ ГОТОВНОСТЬ: {readiness:.1f}%")
    
    if readiness == 100:
        print(f"{GREEN}🎉 ВСЕ КОМПОНЕНТЫ ГОТОВЫ К РАБОТЕ!{RESET}")
    elif readiness >= 80:
        print(f"{YELLOW}⚠️  Система готова, но есть необязательные компоненты{RESET}")
    elif readiness >= 60:
        print(f"{YELLOW}⚠️  Требуется настройка некоторых компонентов{RESET}")
    else:
        print(f"{RED}❌ ТРЕБУЕТСЯ НАСТРОЙКА КРИТИЧЕСКИХ КОМПОНЕНТОВ{RESET}")
    
    print(f"{'='*60}\n")
    
    # Рекомендации
    if packages_ok < packages_total:
        print(f"{YELLOW}💡 Установите недостающие пакеты:{RESET}")
        print(f"   pip install -r requirements.txt\n")
    
    if not fonts:
        print(f"{YELLOW}💡 Установите шрифты DejaVu:{RESET}")
        print(f"   Ubuntu/Debian: sudo apt-get install fonts-dejavu")
        print(f"   macOS: brew install --cask font-dejavu\n")
    
    if env_ok < env_total:
        print(f"{YELLOW}💡 Настройте переменные окружения:{RESET}")
        print(f"   cp .env.example .env")
        print(f"   nano .env\n")
    
    print(f"{BLUE}📖 Полная документация: INTEGRATION_SETUP.md{RESET}\n")

def main():
    """Главная функция"""
    print(f"\n{BLUE}{'='*60}{RESET}")
    print(f"{BLUE}{'ПРОВЕРКА ИНТЕГРАЦИЙ BEAUTY CRM':^60}{RESET}")
    print(f"{BLUE}{'='*60}{RESET}")
    
    # Проверки
    packages = check_python_packages()
    env_vars = check_env_variables()
    directories = check_directories()
    fonts = check_fonts()
    services = check_services()
    api_endpoints = check_api_endpoints()
    
    # Отчет
    generate_report(packages, env_vars, directories, fonts, services, api_endpoints)

if __name__ == "__main__":
    main()
