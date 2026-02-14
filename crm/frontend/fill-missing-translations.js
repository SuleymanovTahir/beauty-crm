const fs = require('fs');
const path = require('path');
const https = require('https');

// Configuration
const API_URL = 'https://translate.googleapis.com/translate_a/single';
const SOURCE_LANG = 'ru';
const TARGET_LANGS = ['en', 'es', 'fr', 'de', 'pt', 'ar', 'hi', 'kk'];

// Missing keys to add
const MISSING_KEYS = {
    'common': {
        'status_new': 'Новый',
        'status_contacted': 'Связались',
        'status_interested': 'Заинтересован',
        'status_lead': 'Лид',
        'status_customer': 'Клиент',
        'status_vip': 'VIP',
        'status_inactive': 'Неактивен',
        'status_blocked': 'Заблокирован',
        'status_pending': 'Ожидает',
        'status_confirmed': 'Подтверждена',
        'status_completed': 'Завершена',
        'status_cancelled': 'Отменена'
    },
    'admin/BookingDetail': {
        // Add any specific missing keys here if identified, otherwise script checks for existing keys
    },
    'admin/PermissionManagement': {
        'permissions_title': 'Управление правами доступа',
        'permissions_subtitle': 'Настройте индивидуальные права для пользователей',
        'users_list_title': 'Пользователи',
        'permissions_for_user': 'Права доступа: {name}',
        'role_label': 'Роль:',
        'view_permission': 'Просмотр',
        'create_permission': 'Создание',
        'edit_permission': 'Редактирование',
        'delete_permission': 'Удаление',
        'permission_granted': 'Право предоставлено',
        'permission_revoked': 'Право отозвано',
        'select_user_prompt': 'Выберите пользователя'
    },
    'admin/PermissionsTab': {
        'role_user_title': 'Роль пользователя',
        'current_role': 'Текущая роль',
        'hierarchy_level': 'Уровень иерархии:',
        'change_role_to': 'Изменить роль на',
        'change_role_button': 'Изменить роль',
        'permissions_title': 'Права доступа',
        'save_changes': 'Сохранить изменения',
        'full_access_message': 'Полный доступ ко всем функциям системы (роль Директор)',
        'individual_permissions_info': 'Индивидуальные права: Вы можете изменить права пользователя независимо от его роли. Галочка означает, что право предоставлено. Снятая галочка означает, что право отозвано.',
        'can_manage_roles_title': 'Может управлять ролями',
        'role_unchanged': 'Роль не изменилась',
        'permissions_updated': 'Права обновлены',
        'error_saving_permissions': 'Ошибка сохранения прав',
        'error_loading_permissions': 'Не удалось загрузить данные о правах'
    },
    'admin/Broadcasts': {
        'title': 'Массовые рассылки',
        'subtitle': 'Отправка уведомлений пользователям по разным каналам',
        'create_broadcast': 'Создать рассылку',
        'history': 'История',
        'broadcast_params': 'Параметры рассылки',
        'subscription_type': 'Тип подписки *',
        'select_type': 'Выберите тип',
        'channels': 'Каналы отправки *',
        'target_role': 'Целевая роль (опционально)',
        'all_users': 'Все пользователи',
        'subject': 'Тема (для Email) *',
        'message': 'Сообщение *',
        'preview': 'Предпросмотр',
        'send': 'Отправить',
        'recipients': 'Получатели',
        'total_recipients': 'Всего получателей',
        'by_channel': 'По каналам:',
        'sample_recipients': 'Примеры получателей:',
        'no_recipients_warning': 'Нет подписанных пользователей для выбранных параметров',
        'no_history': 'Рассылок еще не было',
        'sent_count': 'Отправлено: {count}',
        'access_denied_title': 'Доступ запрещен',
        'access_denied_message': 'Функция массовых рассылок доступна только для директора, администратора и продажника. Обратитесь к администратору для получения доступа.',
        'fill_required_fields': 'Заполните все обязательные поля',
        'select_channel_error': 'Выберите хотя бы один канал',
        'confirm_send': 'Вы уверены, что хотите отправить рассылку?',
        'preview_found': 'Найдено {count} получателей'
    }
};

// Helper to translate text
function translateText(text, targetLang) {
    return new Promise((resolve, reject) => {
        if (!text) return resolve('');

        const url = `${API_URL}?client=gtx&sl=${SOURCE_LANG}&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;

        https.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    if (result && result[0]) {
                        resolve(result[0].map(x => x[0]).join(''));
                    } else {
                        resolve(text); // Fallback
                    }
                } catch (e) {
                    console.error(`Translation error for ${targetLang}:`, e.message);
                    resolve(text);
                }
            });
        }).on('error', (err) => {
            console.error(`Network error for ${targetLang}:`, err.message);
            resolve(text);
        });
    });
}

// Main function
async function fillTranslations() {
    console.log('🚀 Starting translation fill process...');

    for (const [namespace, keys] of Object.entries(MISSING_KEYS)) {
        console.log(`\nProcessing namespace: ${namespace}`);

        // 1. Update Russian file first (Source)
        const ruPath = path.join(__dirname, 'src/locales/ru', `${namespace}.json`);
        let ruData = {};

        if (fs.existsSync(ruPath)) {
            ruData = JSON.parse(fs.readFileSync(ruPath, 'utf8'));
        } else {
            // Ensure directory exists
            const dir = path.dirname(ruPath);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        }

        let ruUpdated = false;
        for (const [key, value] of Object.entries(keys)) {
            if (!ruData[key]) {
                ruData[key] = value;
                ruUpdated = true;
                console.log(`  [ru] Added missing key: ${key}`);
            }
        }

        if (ruUpdated) {
            fs.writeFileSync(ruPath, JSON.stringify(ruData, null, 2));
            console.log(`  ✅ Updated ${ruPath}`);
        }

        // 2. Update other languages
        for (const lang of TARGET_LANGS) {
            const langPath = path.join(__dirname, `src/locales/${lang}`, `${namespace}.json`);
            let langData = {};

            if (fs.existsSync(langPath)) {
                langData = JSON.parse(fs.readFileSync(langPath, 'utf8'));
            } else {
                const dir = path.dirname(langPath);
                if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            }

            let langUpdated = false;
            for (const [key, ruValue] of Object.entries(keys)) {
                if (!langData[key]) {
                    console.log(`  [${lang}] Translating: ${key}...`);
                    const translated = await translateText(ruValue, lang);
                    langData[key] = translated;
                    langUpdated = true;
                    // Rate limiting
                    await new Promise(r => setTimeout(r, 100));
                }
            }

            if (langUpdated) {
                fs.writeFileSync(langPath, JSON.stringify(langData, null, 2));
                console.log(`  ✅ Updated ${langPath}`);
            }
        }
    }

    console.log('\n✨ Translation fill complete!');
}

// Uncomment to run
fillTranslations();
