#!/usr/bin/env python3
"""
Auto-translate frontend locale files in /src/locales
Optimized for ultra-speed: Groups all translations across all files per language
to minimize HTTP requests.
"""

import json
import sys
from pathlib import Path
import threading
from concurrent.futures import ThreadPoolExecutor
import re

# Add backend to path
backend_dir = Path(__file__).parent.parent.parent
sys.path.insert(0, str(backend_dir))
sys.path.insert(0, str(Path(__file__).parent))

from translator import Translator

# Frontend locales directory
FRONTEND_DIR = backend_dir.parent / "frontend"
LOCALES_DIR = FRONTEND_DIR / "src" / "locales"
SOURCE_MAP_FILE = Path(__file__).parent / "translations_source_map.json"

# Languages to translate to
LANGUAGES = ['en', 'ar', 'es', 'de', 'fr', 'pt', 'hi', 'kk']
SOURCE_LANG = 'ru'
PLURAL_SUFFIX_RE = re.compile(r'_(zero|one|two|few|many|other)$')
COMMON_SOURCE_CONTAINERS = {
    'analytics',
    'buttons',
    'calls',
    'details',
    'dialogs',
    'labels',
    'menu',
    'notifications',
    'placeholders',
    'roles',
    'stats',
    'tab',
    'tabs',
    'table',
    'toast',
    'tooltips',
}
SOURCE_KEY_REPLACEMENTS = {
    'api': 'API',
    'crm': 'CRM',
    'id': 'ID',
    'ip': 'IP',
    'kpi': 'KPI',
    'sms': 'SMS',
    'ui': 'UI',
    'vip': 'VIP',
}
RU_SOURCE_CORRECTIONS = {
    'admin/audit-log.json:clear_all': 'Очистить все',
    'admin/audit-log.json:clear_confirm': 'Очистить весь журнал аудита?',
    'admin/audit-log.json:delete_batch_confirm_few': 'Удалить выбранные записи из журнала?',
    'admin/audit-log.json:delete_batch_confirm_many': 'Удалить выбранные записи из журнала?',
    'admin/audit-log.json:delete_batch_confirm_one': 'Удалить выбранную запись из журнала?',
    'admin/audit-log.json:delete_batch_confirm_other': 'Удалить выбранные записи из журнала?',
    'admin/audit-log.json:delete_confirm': 'Удалить эту запись из журнала?',
    'admin/audit-log.json:delete_selected': 'Удалить выбранные',
    'admin/audit-log.json:details.ip': 'IP-адрес',
    'admin/audit-log.json:details.new_data': 'Новые данные',
    'admin/audit-log.json:details.no_data': 'Нет данных',
    'admin/audit-log.json:details.old_data': 'Старые данные',
    'admin/audit-log.json:details.op_id': 'ID операции',
    'admin/audit-log.json:details.title': 'Детали записи',
    'admin/audit-log.json:filter_all': 'Все действия',
    'admin/audit-log.json:filter_create': 'Создание',
    'admin/audit-log.json:filter_delete': 'Удаление',
    'admin/audit-log.json:filter_delete_all': 'Полная очистка',
    'admin/audit-log.json:filter_login': 'Вход',
    'admin/audit-log.json:filter_restore': 'Восстановление',
    'admin/audit-log.json:filter_update': 'Обновление',
    'admin/audit-log.json:search_placeholder': 'Поиск по пользователю, сущности или действию',
    'admin/audit-log.json:stat_active_users': 'Активные пользователи',
    'admin/audit-log.json:stat_created': 'Создано',
    'admin/audit-log.json:stat_errors_few': 'Ошибки за 24 часа',
    'admin/audit-log.json:stat_errors_many': 'Ошибки за 24 часа',
    'admin/audit-log.json:stat_errors_one': 'Ошибки за 24 часа',
    'admin/audit-log.json:stat_errors_other': 'Ошибки за 24 часа',
    'admin/audit-log.json:stat_total_few': 'Всего операций за 24 часа',
    'admin/audit-log.json:stat_total_many': 'Всего операций за 24 часа',
    'admin/audit-log.json:stat_total_one': 'Всего операций за 24 часа',
    'admin/audit-log.json:stat_total_other': 'Всего операций за 24 часа',
    'admin/audit-log.json:subtitle': 'История действий пользователей и системных операций',
    'admin/audit-log.json:table.action': 'Действие',
    'admin/audit-log.json:table.empty': 'Записи не найдены',
    'admin/audit-log.json:table.entity': 'Сущность',
    'admin/audit-log.json:table.error': 'Ошибка',
    'admin/audit-log.json:table.loading': 'Загрузка журнала...',
    'admin/audit-log.json:table.status': 'Статус',
    'admin/audit-log.json:table.success': 'Успешно',
    'admin/audit-log.json:table.time': 'Время',
    'admin/audit-log.json:table.user': 'Пользователь',
    'admin/audit-log.json:title': 'Журнал аудита',
    'admin/audit-log.json:toast.clear_error': 'Не удалось очистить журнал аудита',
    'admin/audit-log.json:toast.clear_success': 'Журнал аудита очищен',
    'admin/audit-log.json:toast.delete_error': 'Не удалось удалить запись',
    'admin/audit-log.json:toast.delete_success': 'Запись удалена',
    'admin/audit-log.json:toast.load_error': 'Не удалось загрузить журнал аудита',
    'admin/botsettings.json:analytics.activity_30_days_few': 'Активность за 30 дней',
    'admin/botsettings.json:analytics.activity_30_days_many': 'Активность за 30 дней',
    'admin/botsettings.json:analytics.activity_30_days_one': 'Активность за 30 дней',
    'admin/botsettings.json:analytics.activity_30_days_other': 'Активность за 30 дней',
    'admin/botsettings.json:bot_analytics_title': 'Аналитика бота',
    'admin/botsettings.json:fomo_messages': 'FOMO-сообщения',
    'admin/botsettings.json:retention_hint_few': 'Напоминание через {{count}} дня',
    'admin/botsettings.json:retention_hint_many': 'Напоминание через {{count}} дней',
    'admin/botsettings.json:retention_hint_one': 'Напоминание через {{count}} день',
    'admin/botsettings.json:retention_hint_other': 'Напоминание через {{count}} дней',
    'admin/botsettings.json:retention_placeholder': 'Текст напоминания для возврата клиента',
    'admin/botsettings.json:separate_with_pipe': 'разделяйте символом |',
    'admin/botsettings.json:style_adaptive': 'Адаптивный',
    'admin/botsettings.json:style_adaptive_desc': 'Подстраивается под контекст и клиента',
    'admin/botsettings.json:style_concise': 'Лаконичный',
    'admin/botsettings.json:style_concise_desc': 'Короткие и четкие ответы',
    'admin/botsettings.json:style_detailed': 'Подробный',
    'admin/botsettings.json:style_detailed_desc': 'Развернутые ответы с пояснениями',
    'admin/botsettings.json:tab_analytics': 'Аналитика',
    'admin/botsettings.json:tab_notifications': 'Уведомления',
    'admin/botsettings.json:tabs.advanced': 'Дополнительно',
    'admin/botsettings.json:tabs.communication': 'Коммуникация',
    'admin/botsettings.json:tabs.examples': 'Примеры',
    'admin/botsettings.json:tabs.general': 'Общие',
    'admin/botsettings.json:tabs.objections': 'Возражения',
    'admin/botsettings.json:tabs.personality': 'Личность',
    'admin/botsettings.json:tabs.pricing': 'Цены',
    'admin/botsettings.json:tabs.safety': 'Безопасность',
    'admin/botsettings.json:title': 'Настройки бота',
    'admin/broadcasts.json:delete_confirm': 'Удалить эту рассылку?',
    'admin/broadcasts.json:subtitle': 'Создавайте и отправляйте сообщения клиентам',
    'admin/broadcasts.json:title': 'Рассылки',
    'admin/clients.json:instagram_id_placeholder': 'Введите Instagram ID',
    'admin/clients.json:name_placeholder': 'Введите имя клиента',
    'admin/clients.json:notes_placeholder': 'Добавьте заметку',
    'admin/clients.json:phone_placeholder': 'Введите номер телефона',
    'admin/clients.json:search_placeholder': 'Поиск по имени, телефону или Instagram',
    'admin/clients.json:title': 'Клиенты',
    'admin/contracts.json:search_placeholder': 'Поиск по названию или типу',
    'admin/contracts.json:subtitle': 'Управление шаблонами и типами договоров',
    'admin/contracts.json:title': 'Договоры',
    'admin/contracts.json:typeManagement.deleteTitle': 'Удалить тип «{{name}}»?',
    'admin/invoices.json:search_placeholder': 'Поиск по клиенту, номеру или статусу',
    'admin/invoices.json:subtitle': 'Управление счетами и оплатами',
    'admin/invoices.json:title': 'Счета',
    'admin/products.json:search_placeholder': 'Поиск по названию или категории',
    'admin/products.json:subtitle': 'Управление товарами и остатками',
    'admin/products.json:title': 'Товары',
    'admin/services.json:change_requests.comment_placeholder': 'Комментарий для сотрудника',
    'admin/services.json:change_requests.reject_title': 'Отклонить запрос',
    'admin/services.json:change_requests.title': 'Запросы на изменение услуг',
    'admin/trash.json:empty_title': 'Корзина пуста',
    'admin/trash.json:search_placeholder': 'Поиск по названию или типу',
    'admin/trash.json:subtitle': 'Удаленные элементы, доступные для восстановления',
    'admin/trash.json:title': 'Корзина',
    'adminpanel/loyaltymanagement.json:dialogs.adjust_points.client_email_placeholder': 'Введите email клиента',
    'adminpanel/loyaltymanagement.json:dialogs.adjust_points.points_placeholder': 'Введите количество баллов',
    'adminpanel/loyaltymanagement.json:dialogs.adjust_points.reason_placeholder': 'Укажите причину',
    'adminpanel/loyaltymanagement.json:subtitle': 'Управление бонусами и историей операций',
    'adminpanel/loyaltymanagement.json:title': 'Лояльность',
    'adminpanel/loyaltymanagement.json:transactions.search_placeholder': 'Поиск по клиенту или операции',
    'crm/tasks.json:title': 'Задачи',
    'layouts/mainlayout.json:admin_panel': 'Админ-панель',
    'layouts/mainlayout.json:calls.audio_call': 'Аудиозвонок',
    'layouts/mainlayout.json:crm': 'CRM-панель',
    'layouts/mainlayout.json:roles.admin': 'Администратор',
    'layouts/mainlayout.json:roles.super_admin': 'Владелец платформы',
    'manager/chat.json:message_placeholder': 'Введите сообщение',
}

# Target-language-specific corrections to fix known bad auto-translations.
# Format: { 'lang': { 'file:key.path': 'correct_value' } }
# These are applied AFTER translation to override wrong auto-translated strings.
TARGET_CORRECTIONS: dict[str, dict[str, str]] = {
    'en': {
        # "записей" (appointments/bookings) was wrongly translated as "recordings" (audio/video)
        'analytics.json:bookings_trend': 'Booking dynamics',
        # "сделок" (CRM deals) was wrongly translated as "trades" (financial)
        'common.json:active_bookings_end': 'Active deals at the end of the period',
        'common.json:active_sum_label': 'Active deals at the end of the period totaling',
        # "удалить" should be "delete", not "uninstall"
        'common.json:delete_error': 'Delete error',
        'common.json:delete_failed': 'Delete error',
        # "загрузка файла" should be "upload", not "download"
        'common.json:upload_error': 'File upload error',
        # "новых записей" should be "bookings", not "transactions"
        'common.json:new_bookings_created': 'New bookings created during the period',
        'common.json:completed_bookings': 'Successfully completed bookings',
        # "забронировано" should be "Booked", not "Recorded"
        'common.json:quick_reply_booked': 'Booked',
        # "Дата" in Russian accidentally leaked into EN
        'common.json:date': 'Date',
        # "Нет данных" in Russian accidentally leaked into EN
        'common.json:no_data': 'No data',
        # chat.recording_* refers to call recordings (audio), not bookings
        'common.json:chat.recording_cancelled': 'Recording cancelled',
        'common.json:chat.recording_in_progress': 'Recording in progress...',
        'common.json:chat.recording_started': 'Recording started',
        # account portal tabs
        'account.json:settings.special_offers': 'Special offers',
        'account.json:tabs.appointments': 'Appointments',
        'account.json:tabs.beauty': 'Care & Recommendations',
        'account.json:tabs.dashboard': 'Home',
        'account.json:tabs.gallery': 'Gallery',
        'account.json:tabs.masters': 'Stylists',
        'account.json:tabs.notifications': 'Notifications',
        'account.json:tabs.settings': 'Settings',
        # bookings page
        'bookings.json:my_bookings': 'My Bookings',
        # settings page gradient/theme strings
        'settings.json:angle_bottom': 'Down (↓)',
        'settings.json:angle_bottom_left': 'Bottom-left corner (↙)',
        'settings.json:angle_bottom_right': 'Bottom-right corner (↘)',
        'settings.json:angle_left': 'Left (←)',
        'settings.json:angle_right': 'Right (→)',
        'settings.json:angle_top': 'Up (↑)',
        'settings.json:angle_top_left': 'Top-left corner (↖)',
        'settings.json:angle_top_right': 'Top-right corner (↗)',
        'settings.json:cancel': 'Cancel',
        'settings.json:change_settings': 'Configure',
        'settings.json:configure': 'Configure',
        'settings.json:configured': 'Configured',
        'settings.json:custom_theme': 'Custom color',
        'settings.json:disabled': 'Disabled',
        'settings.json:enabled': 'Enabled',
        'settings.json:gradient_colors': 'Gradient colors',
        'settings.json:gradient_direction': 'Gradient direction',
        'settings.json:gradient_end': 'End (Primary)',
        'settings.json:gradient_start': 'Gradient start',
        'settings.json:instagram_desc': 'Automatic replies in Direct and stories, lead collection.',
        'settings.json:manage_messengers': 'Configure messenger integrations for automation and notifications',
        'settings.json:needs_configuration': 'Needs configuration',
        'settings.json:open_chat': 'Chat',
        'settings.json:placeholder_enter_api_token': 'Enter API token...',
        'settings.json:save': 'Save',
        'settings.json:telegram_desc': 'Chatbot for client booking, notifications to managers.',
        'settings.json:tiktok_desc': 'Lead collection from TikTok Lead Gen and chat communication.',
        'settings.json:whatsapp_desc': 'Broadcasts via WhatsApp Business API, booking reminders.',
        # services
        'crm/services.json:management_of_price_list_and_business_promotions': 'Management of price list, packages and company promotions',
        # admin menu customization
        'admin/menucustomization.json:account_apply_mode_all': 'All clients',
        'admin/menucustomization.json:account_apply_mode_selected': 'Selected only',
        'admin/menucustomization.json:account_apply_mode_title': 'Apply hidden items to',
        'admin/menucustomization.json:account_hide_hint': 'Disabled items will disappear in the client portal',
        'admin/menucustomization.json:account_menu_group_bonus_program': 'Loyalty program',
        'admin/menucustomization.json:account_menu_group_main': 'Main sections',
        'admin/menucustomization.json:account_menu_group_profile_tools': 'Profile & Settings',
        'admin/menucustomization.json:account_menu_subtitle': 'Hide sections in the client portal for all clients or selected profiles',
        'admin/menucustomization.json:account_menu_title': 'Client menu settings',
        'admin/menucustomization.json:account_select_clients': 'Select clients:',
        'admin/menucustomization.json:account_visible_items': 'Client menu items',
        'admin/menucustomization.json:autosave_error': 'Autosave error',
        'admin/menucustomization.json:autosave_saved': 'Saved automatically',
        'admin/menucustomization.json:autosave_saving': 'Autosaving...',
        # trash entity labels
        'admin/trash.json:entity.booking': 'Booking',
        'admin/trash.json:entity.client': 'Client',
        'admin/trash.json:entity.user': 'Employee',
    },
}


def apply_target_corrections(locales_dir: Path) -> int:
    """Apply TARGET_CORRECTIONS for each language to prevent wrong auto-translations from persisting."""
    total_fixed = 0
    for lang, corrections in TARGET_CORRECTIONS.items():
        lang_dir = locales_dir / lang
        for key_path, correct_value in corrections.items():
            colon_idx = key_path.index(':')
            rel_file = key_path[:colon_idx]
            nested_path = key_path[colon_idx + 1:]
            target_file = lang_dir / rel_file
            if not target_file.exists():
                continue
            try:
                with open(target_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                current = get_value_by_path(data, nested_path)
                if current == correct_value:
                    continue
                set_value_by_path(data, nested_path, correct_value)
                with open(target_file, 'w', encoding='utf-8') as f:
                    json.dump(data, f, ensure_ascii=False, indent=2, sort_keys=True)
                    f.write('\n')
                total_fixed += 1
                print(f"  ✏️  [{lang}] {rel_file}::{nested_path} → {correct_value!r}")
            except Exception as exc:
                print(f"  ⚠️  [{lang}] Could not fix {rel_file}::{nested_path}: {exc}")
    return total_fixed


def get_value_by_path(data, path):
    if not path:
        return data

    current = data
    for part in path.split('.'):
        if not isinstance(current, dict) or part not in current:
            return None
        current = current[part]
    return current


def set_value_by_path(data, path, value):
    current = data
    parts = path.split('.')
    for part in parts[:-1]:
        if part not in current or not isinstance(current[part], dict):
            current[part] = {}
        current = current[part]
    current[parts[-1]] = value


def apply_source_glossary_to_ru_files(ru_files, ru_dir, translator):
    source_glossary = dict(RU_SOURCE_CORRECTIONS)
    source_glossary.update(translator.key_glossary.get(SOURCE_LANG, {}))
    if not source_glossary:
        return 0

    updated_files = 0

    for ru_file in ru_files:
        rel_path = str(ru_file.relative_to(ru_dir))
        file_prefix = f"{rel_path}:"
        matching_items = {
            key_path[len(file_prefix):]: value
            for key_path, value in source_glossary.items()
            if key_path.startswith(file_prefix) and isinstance(value, str) and value.strip()
        }

        if not matching_items:
            continue

        with open(ru_file, 'r', encoding='utf-8') as f:
            ru_data = json.load(f)

        changed = False
        for nested_path, glossary_value in matching_items.items():
            current_value = get_value_by_path(ru_data, nested_path)
            if current_value != glossary_value:
                set_value_by_path(ru_data, nested_path, glossary_value)
                changed = True

        if changed:
            with open(ru_file, 'w', encoding='utf-8') as f:
                json.dump(ru_data, f, ensure_ascii=False, indent=2, sort_keys=True)
                f.write('\n')
            updated_files += 1

    return updated_files


def humanize_source_key(path):
    path_parts = [part for part in path.split('.') if part]
    if not path_parts:
        return None

    leaf = PLURAL_SUFFIX_RE.sub('', path_parts[-1])
    if not leaf:
        return None

    phrase_parts = []
    if len(path_parts) > 1:
        parent = path_parts[-2]
        if leaf in {'title', 'subtitle', 'description', 'message'} and parent not in COMMON_SOURCE_CONTAINERS:
            phrase_parts.append(parent)

    phrase_parts.append(leaf)
    human = " ".join(phrase_parts)
    human = re.sub(r'(?<!^)(?=[A-Z])', ' ', human)
    human = human.replace('_', ' ').replace('-', ' ')
    human = re.sub(r'\s+', ' ', human).strip()
    if not human:
        return None

    words = []
    for word in human.split():
        replacement = SOURCE_KEY_REPLACEMENTS.get(word.lower())
        words.append(replacement if replacement else word)

    human = " ".join(words)
    if not human:
        return None

    return human[0].upper() + human[1:]


def rescue_empty_ru_sources(ru_files, ru_dir, translator):
    updated_files = 0
    rescued_values = 0

    def rescue_value(container, key, rel_path, nested_path):
        nonlocal rescued_values

        current_value = container.get(key)
        if not isinstance(current_value, str) or current_value.strip():
            return

        source_hint = humanize_source_key(nested_path)
        if not source_hint:
            return

        key_path = f"{rel_path}:{nested_path}"
        translated = translator.translate(source_hint, 'en', SOURCE_LANG, key_path=key_path)
        translated = (translated or '').strip()
        if not translated:
            return

        container[key] = translated
        rescued_values += 1

    for ru_file in ru_files:
        rel_path = str(ru_file.relative_to(ru_dir))

        with open(ru_file, 'r', encoding='utf-8') as f:
            try:
                ru_data = json.load(f)
            except json.JSONDecodeError:
                continue

        changed = False

        def walk(data, path=""):
            nonlocal changed

            if isinstance(data, dict):
                for key, value in data.items():
                    nested_path = f"{path}.{key}" if path else key
                    if isinstance(value, dict):
                        walk(value, nested_path)
                    elif isinstance(value, list):
                        for index, item in enumerate(value):
                            if isinstance(item, (dict, list)):
                                walk(item, f"{nested_path}[{index}]")
                    else:
                        before = data.get(key)
                        rescue_value(data, key, rel_path, nested_path)
                        if data.get(key) != before:
                            changed = True

        walk(ru_data)

        if changed:
            with open(ru_file, 'w', encoding='utf-8') as f:
                json.dump(ru_data, f, ensure_ascii=False, indent=2, sort_keys=True)
                f.write('\n')
            updated_files += 1

    return updated_files, rescued_values

def load_source_map():
    if SOURCE_MAP_FILE.exists():
        try:
            with open(SOURCE_MAP_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except:
            return {}
    return {}

def save_source_map(source_map):
    with open(SOURCE_MAP_FILE, 'w', encoding='utf-8') as f:
        json.dump(source_map, f, ensure_ascii=False, indent=2)

def is_russian_text(text: str) -> bool:
    if not text or not isinstance(text, str): return False
    # Check for cyrillic characters
    cyrillic_count = sum(1 for c in text if '\u0400' <= c <= '\u04FF')
    alpha_count = sum(1 for c in text if c.isalpha())
    if alpha_count == 0: return False
    return cyrillic_count / alpha_count > 0.3

def needs_translation(path: str, source_value: str, target_value: str, lang: str, file_rel_path: str, file_source_map: dict, translator: Translator, force: bool) -> bool:
    if force: return True
    
    # Priority 1: Glossary Match (SSOT)
    key_path = f"{file_rel_path}:{path}"
    if lang in translator.key_glossary and key_path in translator.key_glossary[lang]:
        if target_value != translator.key_glossary[lang][key_path]:
            return True

    # Priority 1.5: Salon Terminology Source Check
    if lang in translator.SALON_TERMINOLOGY:
        source_lower = source_value.lower().strip()
        if source_lower in translator.SALON_TERMINOLOGY[lang]:
            expected = translator.SALON_TERMINOLOGY[lang][source_lower]
            if target_value != expected:
                return True
            
    # Priority 2: Source Value Changed
    saved_source = file_source_map.get(path)
    if saved_source and saved_source != source_value:
        return True
        
    # Priority 3: Missing Target or Cyrillic in Target
    # If the target is empty, it definitely needs translation
    if not target_value or not str(target_value).strip():
        return True

    # If the language is not Russian and we see Russian text in the target, it needs translation
    # Even if the source is also Russian (which is always true for our source locales)
    if lang != 'ru' and is_russian_text(str(target_value)):
        return True
        
    # Priority 4: Terminology Correction Check
    if lang in translator.SALON_TERMINOLOGY:
        term_map = translator.SALON_TERMINOLOGY[lang]
        lower_target = str(target_value).lower().strip()
        if lower_target in term_map:
            # If the current target is an "incorrect" term from our glossary, we must fix it
            return True
            
    return False

def collect_from_dict(source_dict, target_dict, file_rel_path, lang, translator, file_source_map, force, path=""):
    tasks = []
    
    if isinstance(source_dict, dict):
        for k, v in source_dict.items():
            cp = f"{path}.{k}" if path else k
            if isinstance(v, dict):
                if k not in target_dict or not isinstance(target_dict[k], dict): target_dict[k] = {}
                tasks.extend(collect_from_dict(v, target_dict[k], file_rel_path, lang, translator, file_source_map, force, cp))
            elif isinstance(v, list):
                if k not in target_dict or not isinstance(target_dict[k], list): target_dict[k] = [None] * len(v)
                elif len(target_dict[k]) != len(v): target_dict[k] = [None] * len(v)
                tasks.extend(collect_from_dict(v, target_dict[k], file_rel_path, lang, translator, file_source_map, force, cp))
            elif isinstance(v, str):
                existing = target_dict.get(k, "")
                if needs_translation(cp, v, existing, lang, file_rel_path, file_source_map, translator, force):
                    if v.strip():
                        tasks.append({
                            'parent': target_dict,
                            'key': k,
                            'path': cp,
                            'value': v,
                            'file_rel_path': file_rel_path
                        })
                    else:
                        target_dict[k] = v
                        file_source_map[cp] = v
                else:
                    if cp not in file_source_map and existing:
                        file_source_map[cp] = v
            else:
                target_dict[k] = v
    elif isinstance(source_dict, list):
        for i, v in enumerate(source_dict):
            cp = f"{path}[{i}]"
            if isinstance(v, dict):
                if not target_dict[i] or not isinstance(target_dict[i], dict): target_dict[i] = {}
                tasks.extend(collect_from_dict(v, target_dict[i], file_rel_path, lang, translator, file_source_map, force, cp))
            elif isinstance(v, list):
                if not target_dict[i] or not isinstance(target_dict[i], list): target_dict[i] = [None] * len(v)
                tasks.extend(collect_from_dict(v, target_dict[i], file_rel_path, lang, translator, file_source_map, force, cp))
            elif isinstance(v, str):
                existing = target_dict[i] if i < len(target_dict) and target_dict[i] else ""
                if needs_translation(cp, v, existing, lang, file_rel_path, file_source_map, translator, force):
                    if v.strip():
                        tasks.append({
                            'parent': target_dict,
                            'key': i,
                            'path': cp,
                            'value': v,
                            'file_rel_path': file_rel_path
                        })
                    else:
                        target_dict[i] = v
                        file_source_map[cp] = v
                else:
                    if cp not in file_source_map and existing:
                        file_source_map[cp] = v
            else:
                target_dict[i] = v
                
    return tasks

def process_language(lang, ru_files, ru_dir, translator, source_map, force):
    print(f"  🌐 {lang.upper()}: Collecting strings...")
    all_lang_tasks = []
    file_data_map = {} # path -> (target_data, target_file, file_source_map)
    
    if lang not in source_map: source_map[lang] = {}
    
    for ru_file in ru_files:
        rel_path = ru_file.relative_to(ru_dir)
        file_rel_path_str = str(rel_path)
        target_file = LOCALES_DIR / lang / rel_path
        
        if file_rel_path_str not in source_map[lang]: source_map[lang][file_rel_path_str] = {}
        file_source_map = source_map[lang][file_rel_path_str]
        
        # Load RU
        with open(ru_file, 'r', encoding='utf-8') as f:
            ru_data = json.load(f)
            
        # Load existing target
        target_data = {}
        if target_file.exists():
            try:
                with open(target_file, 'r', encoding='utf-8') as f:
                    target_data = json.load(f)
            except: pass
            
        # Collect tasks
        file_tasks = collect_from_dict(ru_data, target_data, file_rel_path_str, lang, translator, file_source_map, force)
        all_lang_tasks.extend(file_tasks)
        file_data_map[file_rel_path_str] = (target_data, target_file, file_source_map)

    if not all_lang_tasks:
        print(f"    ✅ {lang.upper()}: Nothing to translate")
        return 0

    print(f"    🚀 {lang.upper()}: Translating {len(all_lang_tasks)} strings in mass batch...")
    
    # Extract texts and paths
    texts = [t['value'] for t in all_lang_tasks]
    key_paths = [f"{t['file_rel_path']}:{t['path']}" for t in all_lang_tasks]
    
    # Translate everything for this language in one go
    translated_texts = translator.translate_batch(texts, SOURCE_LANG, lang, key_paths=key_paths)
    
    # Apply back
    affected_files = set()
    for i, task in enumerate(all_lang_tasks):
        v = task['value']
        translated = translated_texts[i]
        old_translated = translated
        
        # Case matching
        if v and v[0].isupper() and translated and not translated[0].isupper():
            translated = translated[0].upper() + translated[1:]
        elif v and v[0].islower() and translated and translated[0].isupper():
            translated = translated[0].lower() + translated[1:]
            
        if lang == 'en' and ('иванов' in v.lower() or 'ivanov' in v.lower()):
            print(f"      DEBUG: {v} -> {old_translated} -> {translated}")

        task['parent'][task['key']] = translated
        # Update source map
        task_file_rel_path = task['file_rel_path']
        file_source_map = file_data_map[task_file_rel_path][2]
        file_source_map[task['path']] = v
        affected_files.add(task_file_rel_path)
        
    # Save affected files
    for file_rel_path in affected_files:
        target_data, target_file, _ = file_data_map[file_rel_path]
        target_file.parent.mkdir(parents=True, exist_ok=True)
        with open(target_file, 'w', encoding='utf-8') as f:
            json.dump(target_data, f, ensure_ascii=False, indent=2, sort_keys=True)
            
    print(f"    ✅ {lang.upper()}: Done ({len(all_lang_tasks)} strings across {len(affected_files)} files)")
    return len(all_lang_tasks)

def main():
    force = "--force" in sys.argv
    print(f"🌍 Auto-translating frontend locale files ({'FORCE' if force else 'Smart'} Mode)...")
    print(f"🚀 Optimized Mode: Grouping by language for maximum speed")
    
    translator = Translator(use_cache=True)
    source_map = load_source_map() if not force else {}
    
    ru_dir = LOCALES_DIR / SOURCE_LANG
    if not ru_dir.exists():
        print(f"❌ Russian locale directory not found: {ru_dir}")
        return
        
    ru_files = list(ru_dir.rglob("*.json"))
    print(f"📋 Found {len(ru_files)} source files\n")

    updated_source_files = apply_source_glossary_to_ru_files(ru_files, ru_dir, translator)
    if updated_source_files:
        print(f"🧭 Updated {updated_source_files} RU source locale files from glossary before translation\n")

    rescued_source_files, rescued_source_values = rescue_empty_ru_sources(ru_files, ru_dir, translator)
    if rescued_source_files:
        print(
            f"🛟 Rescued {rescued_source_values} empty RU source values "
            f"across {rescued_source_files} files before translation\n"
        )

    total_translated = 0
    
    # We process languages in parallel, but collect all strings for each language FIRST
    # 16 threads is good for processing languages
    with ThreadPoolExecutor(max_workers=8) as executor:
        future_to_lang = {executor.submit(process_language, lang, ru_files, ru_dir, translator, source_map, force): lang for lang in LANGUAGES}
        for future in future_to_lang:
            total_translated += future.result()
            
    save_source_map(source_map)
    translator.save_cache_to_disk()
    print(f"\n✅ Total translations performed: {total_translated}")

    fixed = apply_target_corrections(LOCALES_DIR)
    if fixed:
        print(f"✏️  Applied {fixed} target-language corrections (wrong auto-translations fixed)")

if __name__ == "__main__":
    main()
