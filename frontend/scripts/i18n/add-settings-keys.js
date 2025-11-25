const fs = require('fs');
const path = require('path');

// Путь к файлу Settings.tsx
const settingsFile = path.join(__dirname, '..', '..', 'src', 'pages', 'admin', 'Settings.tsx');
// Путь к русскому файлу локализации
const ruSettingsFile = path.join(__dirname, '..', '..', 'src', 'locales', 'ru', 'admin', 'settings.json');

// Читаем файл Settings.tsx
const settingsContent = fs.readFileSync(settingsFile, 'utf8');

// Извлекаем все ключи с префиксом settings:
const regex = /t\('settings:([^']+)'\)/g;
const matches = [...settingsContent.matchAll(regex)];
const keys = [...new Set(matches.map(m => m[1]))]; // Уникальные ключи

console.log(`🔍 Найдено ${keys.length} уникальных ключей с префиксом 'settings:':\n`);

// Словарь переводов (добавьте сюда переводы для всех ключей)
const translations = {
    // Основные
    'system_settings': 'Системные настройки',
    'manage_crm_parameters': 'Управление параметрами CRM',
    'view_mode': 'Режим просмотра',
    'view_mode_message': 'У вас есть доступ только для просмотра. Для изменения настроек обратитесь к администратору.',
    'general': 'Общие',
    'notifications': 'Уведомления',
    'security': 'Безопасность',
    'diagnostics': 'Диагностика',
    'broadcasts': 'Рассылки',
    'messengers': 'Мессенджеры',

    // Общие настройки
    'general_settings': 'Общие настройки',
    'salon_name': 'Название салона',
    'system_language': 'Язык системы',
    'city': 'Город',
    'phone': 'Телефон',
    'address': 'Адрес',
    'instagram': 'Instagram',
    'weekdays_hours': 'Часы работы (будни)',
    'weekends_hours': 'Часы работы (выходные)',

    // Управление ботом
    'bot_management': 'Управление ботом',
    'bot_enabled_for_all_clients': 'Бот включен для всех клиентов',
    'disable_to_stop_auto_replies': 'Отключите, чтобы остановить автоматические ответы',
    'bot_enabled_globally': 'Бот включен глобально',
    'bot_disabled_globally': 'Бот отключен глобально',

    // Ошибки и сообщения
    'error_loading_salon_settings': 'Ошибка загрузки настроек салона',
    'error_loading_settings': 'Ошибка загрузки настроек',
    'error_loading_roles': 'Ошибка загрузки ролей',
    'general_settings_saved': 'Общие настройки сохранены',
    'error_saving_general_settings': 'Ошибка сохранения общих настроек',
    'server_error': 'Ошибка сервера',
    'notifications_configured': 'Уведомления настроены',
    'error_saving_notifications': 'Ошибка сохранения уведомлений',
    'error_saving_notification_settings': 'Ошибка сохранения настроек уведомлений',
    'error_updating': 'Ошибка обновления',

    // Роли и права
    'fill_required_fields': 'Заполните обязательные поля',
    'role_created': 'Роль создана',
    'error': 'Ошибка: ',
    'unknown_error': 'Неизвестная ошибка',
    'delete_role': 'Удалить роль ',
    'role_deleted': 'Роль удалена',
    'no_role_selected': 'Роль не выбрана',
    'permissions_updated': 'Права обновлены',

    // Напоминания
    'enter_reminder_name': 'Введите название напоминания',
    'specify_reminder_time': 'Укажите время напоминания',
    'reminder_setting_created': 'Настройка напоминания создана',
    'error_creating_setting': 'Ошибка создания настройки',
    'error_changing_setting': 'Ошибка изменения настройки',
    'delete_reminder_setting': 'Удалить настройку напоминания?',
    'setting_deleted': 'Настройка удалена',
    'error_deleting_setting': 'Ошибка удаления настройки',

    // Мессенджеры
    'enabled': 'включен',
    'disabled': 'отключен',
    'settings_saved': 'Настройки сохранены',
    'error_saving_settings': 'Ошибка сохранения настроек',

    // Рассылки
    'select_subscription_type': 'Выберите тип подписки',
    'select_at_least_one_channel': 'Выберите хотя бы один канал',
    'preview_error': 'Ошибка предпросмотра',
    'fill_all_required_fields': 'Заполните все обязательные поля',
    'confirm_send_broadcast': 'Подтвердите отправку рассылки',
    'send_error': 'Ошибка отправки',

    // Доступ
    'access_denied': 'Доступ запрещен',
    'access_denied_message': 'У вас нет прав для просмотра этой страницы',
};

// Читаем существующий файл локализации
let ruSettings = {};
if (fs.existsSync(ruSettingsFile)) {
    ruSettings = JSON.parse(fs.readFileSync(ruSettingsFile, 'utf8'));
}

// Добавляем новые ключи
let addedCount = 0;
keys.forEach(key => {
    if (!ruSettings[key]) {
        ruSettings[key] = translations[key] || key;
        addedCount++;
        console.log(`  ✅ Добавлен: ${key} = "${ruSettings[key]}"`);
    }
});

// Сортируем ключи алфавитно
const sortedSettings = {};
Object.keys(ruSettings).sort().forEach(key => {
    sortedSettings[key] = ruSettings[key];
});

// Записываем обратно
fs.writeFileSync(ruSettingsFile, JSON.stringify(sortedSettings, null, 2) + '\n', 'utf8');

console.log(`\n🎉 Добавлено ${addedCount} новых ключей в ru/admin/settings.json`);
console.log(`📝 Всего ключей: ${Object.keys(sortedSettings).length}`);
console.log(`\n💡 Теперь запустите: node scripts/i18n/auto-translate.js`);
