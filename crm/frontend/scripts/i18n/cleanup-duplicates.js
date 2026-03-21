const fs = require('fs');
const path = require('path');

/**
 * Скрипт для очистки дублирующих файлов переводов после i18next-parser
 * Удаляет файлы из корня локалей, если они дублируют файлы в поддиректориях
 */

const LOCALES_DIR = path.resolve(__dirname, '../../src/locales');

// Список файлов, которые являются дубликатами
const DUPLICATE_FILES = [
    'analytics', 'bookings', 'chat', 'clients', 'dashboard',
    'funnel', 'login', 'profile', 'services', 'settings', 'tasks', 'users'
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
