const fs = require('fs');
const path = require('path');

/**
 * Скрипт для очистки дублирующих файлов переводов после i18next-parser
 * Удаляет файлы из корня локалей, если они дублируют файлы в поддиректориях
 */

const LOCALES_DIR = path.resolve(__dirname, '../../src/locales');

// Список файлов, которые являются дубликатами
const DUPLICATE_FILES = [
    'about', 'analytics', 'bookingdetail', 'bookings', 'calendar', 'chat',
    'clientdetail', 'clients', 'contacts', 'cooperation', 'dashboard',
    'datadeletion', 'edituser', 'faq', 'funnel', 'home', 'login',
    'pricelist', 'profile', 'public', 'services', 'settings',
    'specialpackages', 'success', 'terms', 'usercabinet', 'users'
];

console.log('🧹 Очистка дублирующих файлов переводов...');

let totalRemoved = 0;

const locales = fs.readdirSync(LOCALES_DIR);
locales.forEach(locale => {
    const localePath = path.join(LOCALES_DIR, locale);

    if (!fs.statSync(localePath).isDirectory()) return;

    DUPLICATE_FILES.forEach(filename => {
        const filePath = path.join(localePath, `${filename}.json`);

        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            totalRemoved++;
        }
    });
});

console.log(`✅ Удалено ${totalRemoved} дублирующих файлов`);
