#!/usr/bin/env node

/**
 * Скрипт для перевода ТОЛЬКО указанных ключей в файлах локализации
 * Использование: node translate-specific-keys.js
 */

const fs = require('fs');
const path = require('path');

// Ключи которые нужно перевести
const KEYS_TO_TRANSLATE = {
    // Common keys
    'common': [
        'profile',
        'subscriptions',
        'danger_zone',
        'my_profile',
        'click_camera_to_upload',
        'to_upload_photo',
        'max_size',
        'username',
        'full_name',
        'email',
        'change_password',
        'current_password',
        'new_password',
        'confirm_new_password',
        'new_password_placeholder',
        'repeat_new_password',
        'save_changes',
        'profile_updated',
        'error_update_profile'
    ],

    // Settings keys
    'admin/Settings': [
        'bot_enabled_for_all_clients',
        'disable_to_stop_auto_replies',
        'bot_management',
        'general_settings',
        'salon_name',
        'system_language',
        'russian',
        'english',
        'arabic',
        'city',
        'phone',
        'address',
        'instagram',
        'weekdays_hours',
        'weekends_hours',
        'notification_settings',
        'notification_channels',
        'email_notifications',
        'receive_by_email',
        'sms_notifications',
        'receive_by_phone',
        'notification_types',
        'booking_notifications',
        'new_bookings_changes_cancellations',
        'birthday_reminders',
        'notifications_about_birthdays',
        'notify_days',
        '3_days',
        '7_days',
        '14_days',
        'save_notification_settings',
        'manage_roles',
        'create_roles_and_assign_permissions',
        'create_role',
        'about_roles_system',
        'create_custom_roles_for_your_business',
        'assign_detailed_permissions',
        'builtin_roles_cannot_be_deleted',
        'builtin',
        'permissions',
        'security_and_access',
        'security_recommendations',
        'use_strong_passwords',
        'regularly_change_passwords',
        'do_not_share_credentials',
        'check_active_sessions',
        'regularly_backup_data',
        'backup',
        'download_backup_for_security',
        'download_backup',
        'email_subscriptions',
        'manage_email_subscriptions',
        'no_subscriptions_available',
        'irreversible_actions',
        'delete_account',
        'delete_account_warning',
        'enter_password',
        'delete_my_account'
    ],

    // EditUser keys
    'admin/EditUser': [
        'permissions_label'
    ],

    // BotSettings keys
    'admin/BotSettings': [
        'consult_with_husband',
        'first_time',
        'if_not_liked',
        'communication_and_emotions',
        'emotional_triggers',
        'social_proof',
        'personalization_rules',
        'emotional_responses',
        'voice_message_response',
        'anti_patterns',
        'pre_booking_data_collection',
        'pre_booking_data_collection_explanation',
        'ad_campaign_detection',
        'advanced_settings',
        'algorithm_actions',
        'location_features',
        'seasonality',
        'contextual_rules',
        'success_metrics',
        'safety_and_ethics',
        'important_for_safety',
        'these_rules_protect_clients_and_reputation',
        'safety_rules',
        'emergency_situations',
        'examples_and_dialogues',
        'good_responses',
        'dialogues',
        'real_dialogues_for_training'
    ]
};

// Русские переводы (источник)
const RU_TRANSLATIONS = {
    'common': {
        'profile': 'Профиль',
        'subscriptions': 'Подписки',
        'danger_zone': 'Опасная зона',
        'my_profile': 'Мой профиль',
        'click_camera_to_upload': 'Нажмите на камеру',
        'to_upload_photo': 'чтобы загрузить фото',
        'max_size': 'Макс. 5MB',
        'username': 'Логин',
        'full_name': 'Полное имя',
        'email': 'Email',
        'change_password': 'Изменить пароль',
        'current_password': 'Текущий пароль',
        'new_password': 'Новый пароль',
        'confirm_new_password': 'Подтвердите новый пароль',
        'new_password_placeholder': 'Оставьте пустым, если не хотите менять',
        'repeat_new_password': 'Повторите новый пароль',
        'save_changes': 'Сохранить изменения',
        'profile_updated': 'Профиль обновлен',
        'error_update_profile': 'Ошибка обновления профиля'
    },

    'admin/Settings': {
        'bot_enabled_for_all_clients': 'Бот включен для всех клиентов',
        'disable_to_stop_auto_replies': 'Отключите, чтобы остановить автоответы',
        'bot_management': 'Управление ботом',
        'general_settings': 'Общие настройки',
        'salon_name': 'Название салона',
        'system_language': 'Язык системы',
        'russian': 'Русский',
        'english': 'Английский',
        'arabic': 'Арабский',
        'city': 'Город',
        'phone': 'Телефон',
        'address': 'Адрес',
        'instagram': 'Instagram',
        'weekdays_hours': 'Часы работы (будни)',
        'weekends_hours': 'Часы работы (выходные)',
        'notification_settings': 'Настройки уведомлений',
        'notification_channels': 'Каналы уведомлений',
        'email_notifications': 'Email уведомления',
        'receive_by_email': 'Получать по email',
        'sms_notifications': 'SMS уведомления',
        'receive_by_phone': 'Получать по телефону',
        'notification_types': 'Типы уведомлений',
        'booking_notifications': 'Уведомления о записях',
        'new_bookings_changes_cancellations': 'Новые записи, изменения, отмены',
        'birthday_reminders': 'Напоминания о днях рождения',
        'notifications_about_birthdays': 'Уведомления о днях рождения клиентов',
        'notify_days': 'Уведомлять за (дней)',
        '3_days': '3 дня',
        '7_days': '7 дней',
        '14_days': '14 дней',
        'save_notification_settings': 'Сохранить настройки уведомлений',
        'manage_roles': 'Управление ролями',
        'create_roles_and_assign_permissions': 'Создавайте роли и назначайте права доступа',
        'create_role': 'Создать роль',
        'about_roles_system': 'О системе ролей',
        'create_custom_roles_for_your_business': 'Создавайте кастомные роли под ваш бизнес',
        'assign_detailed_permissions': 'Назначайте детальные права',
        'builtin_roles_cannot_be_deleted': 'Встроенные роли нельзя удалить',
        'builtin': 'Встроенная',
        'permissions': 'Права',
        'security_and_access': 'Безопасность и доступ',
        'security_recommendations': 'Рекомендации по безопасности',
        'use_strong_passwords': 'Используйте сложные пароли',
        'regularly_change_passwords': 'Регулярно меняйте пароли',
        'do_not_share_credentials': 'Не делитесь учетными данными',
        'check_active_sessions': 'Проверяйте активные сессии',
        'regularly_backup_data': 'Регулярно делайте резервные копии',
        'backup': 'Резервная копия',
        'download_backup_for_security': 'Скачайте резервную копию для безопасности',
        'download_backup': 'Скачать резервную копию',
        'email_subscriptions': 'Email подписки',
        'manage_email_subscriptions': 'Управление email подписками',
        'no_subscriptions_available': 'Нет доступных подписок',
        'irreversible_actions': 'Необратимые действия',
        'delete_account': 'Удалить аккаунт',
        'delete_account_warning': 'Это действие необратимо. Все ваши данные будут удалены.',
        'enter_password': 'Введите пароль',
        'delete_my_account': 'Удалить мой аккаунт'
    },

    'admin/EditUser': {
        'permissions_label': 'Права доступа'
    },

    'admin/BotSettings': {
        'consult_with_husband': 'Посоветоваться с мужем',
        'first_time': 'Первый раз',
        'if_not_liked': 'Если не понравится',
        'communication_and_emotions': 'Коммуникация и эмоции',
        'emotional_triggers': 'Эмоциональные триггеры',
        'social_proof': 'Социальное доказательство',
        'personalization_rules': 'Правила персонализации',
        'emotional_responses': 'Эмоциональные ответы',
        'voice_message_response': 'Ответ на голосовое сообщение',
        'anti_patterns': 'Антипаттерны (что НЕ делать)',
        'pre_booking_data_collection': 'Сбор данных перед записью',
        'pre_booking_data_collection_explanation': 'Объяснение сбора данных',
        'ad_campaign_detection': 'Определение рекламной кампании',
        'advanced_settings': 'Расширенные настройки',
        'algorithm_actions': 'Действия алгоритма',
        'location_features': 'Особенности локации',
        'seasonality': 'Сезонность',
        'contextual_rules': 'Контекстные правила',
        'success_metrics': 'Метрики успеха',
        'safety_and_ethics': 'Безопасность и этика',
        'important_for_safety': 'Важно для безопасности',
        'these_rules_protect_clients_and_reputation': 'Эти правила защищают клиентов и репутацию',
        'safety_rules': 'Правила безопасности',
        'emergency_situations': 'Экстренные ситуации',
        'examples_and_dialogues': 'Примеры и диалоги',
        'good_responses': 'Хорошие ответы',
        'dialogues': 'Диалоги',
        'real_dialogues_for_training': 'Реальные диалоги для обучения'
    }
};
// Автоматически определяем все языки из папки locales
function getAvailableLanguages() {
    const localesDir = path.join(__dirname, 'src', 'locales');
    const languages = fs.readdirSync(localesDir)
        .filter(item => {
            const itemPath = path.join(localesDir, item);
            return fs.statSync(itemPath).isDirectory() && item !== 'ru'; // Исключаем русский (источник)
        });

    console.log(`📚 Found languages: ${languages.join(', ')}`);
    return languages;
}

const TARGET_LANGUAGES = getAvailableLanguages();

// Функция для перевода текста через Google Translate API
async function translateText(text, targetLang) {
    const https = require('https');

    // Используем бесплатный Google Translate API
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=ru&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;

    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    const translated = parsed[0][0][0];
                    resolve(translated);
                } catch (err) {
                    console.error(`Translation error for "${text}":`, err.message);
                    resolve(text); // Возвращаем оригинал если не удалось перевести
                }
            });
        }).on('error', (err) => {
            console.error(`Network error:`, err.message);
            resolve(text); // Возвращаем оригинал при ошибке сети
        });
    });
}

// Функция для обновления файла локализации
async function updateLocaleFile(namespace, lang, keys) {
    const filePath = path.join(__dirname, '..', 'src', 'locales', lang, `${namespace}.json`);

    // Создаем директорию если не существует
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    // Читаем существующий файл или создаем новый
    let translations = {};
    if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        translations = JSON.parse(content);
    }

    // Добавляем/обновляем только указанные ключи
    for (const key of keys) {
        const ruText = RU_TRANSLATIONS[namespace][key];
        if (ruText) {
            if (lang === 'ru') {
                translations[key] = ruText;
            } else {
                translations[key] = await translateText(ruText, lang);
            }
        }
    }

    // Сохраняем файл
    fs.writeFileSync(filePath, JSON.stringify(translations, null, 2) + '\n', 'utf-8');
    console.log(`✅ Updated ${filePath}`);
}

// Основная функция
async function main() {
    console.log('🚀 Starting translation of specific keys...\n');

    for (const [namespace, keys] of Object.entries(KEYS_TO_TRANSLATE)) {
        console.log(`\n📦 Processing namespace: ${namespace}`);

        // Обновляем русский файл
        await updateLocaleFile(namespace, 'ru', keys);

        // Обновляем целевые языки
        for (const lang of TARGET_LANGUAGES) {
            await updateLocaleFile(namespace, lang, keys);
        }
    }

    console.log('\n✨ Translation completed!');
}

main().catch(console.error);
