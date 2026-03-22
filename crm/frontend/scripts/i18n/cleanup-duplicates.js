const fs = require('fs');
const path = require('path');

/**
 * Скрипт для очистки дублирующих файлов переводов после i18next-parser.
 * Для namespace-алиасов переносит новые ключи в SSOT-файлы, затем удаляет root-дубликат.
 * Root analytics/booking/calendar не трогаем, потому что они являются рабочими namespace.
 */

const LOCALES_DIR = path.resolve(__dirname, '../../src/locales');

const DUPLICATE_NAMESPACE_TARGETS = {
    bookings: 'crm/bookings',
    chat: 'manager/chat',
    clients: 'crm/clients',
    dashboard: 'crm/dashboard',
    funnel: 'crm/funnel',
    login: 'auth/login',
    profile: 'employee/profile',
    services: 'crm/services',
    settings: 'crm/settings',
    tasks: 'crm/tasks',
    users: 'crm/users',
};

function sortObjectKeys(obj) {
    if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
        return obj;
    }

    return Object.keys(obj).sort().reduce((acc, key) => {
        acc[key] = sortObjectKeys(obj[key]);
        return acc;
    }, {});
}

function mergeMissingKeys(target, source) {
    if (typeof source !== 'object' || source === null || Array.isArray(source)) {
        return target;
    }

    const normalizedTarget = typeof target === 'object' && target !== null && !Array.isArray(target)
        ? { ...target }
        : {};

    Object.entries(source).forEach(([key, value]) => {
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            normalizedTarget[key] = mergeMissingKeys(normalizedTarget[key], value);
            return;
        }

        if (normalizedTarget[key] === undefined || normalizedTarget[key] === '') {
            normalizedTarget[key] = value;
        }
    });

    return normalizedTarget;
}

console.log('🧹 Очистка дублирующих файлов переводов...');

let totalRemoved = 0;
let totalMerged = 0;

const locales = fs.readdirSync(LOCALES_DIR);
locales.forEach(locale => {
    const localePath = path.join(LOCALES_DIR, locale);

    if (!fs.statSync(localePath).isDirectory()) return;

    Object.entries(DUPLICATE_NAMESPACE_TARGETS).forEach(([filename, targetNamespace]) => {
        const filePath = path.join(localePath, `${filename}.json`);

        if (fs.existsSync(filePath)) {
            const targetPath = path.join(localePath, `${targetNamespace}.json`);
            const duplicateContent = JSON.parse(fs.readFileSync(filePath, 'utf8'));

            if (fs.existsSync(targetPath)) {
                const targetContent = JSON.parse(fs.readFileSync(targetPath, 'utf8'));
                const mergedContent = sortObjectKeys(mergeMissingKeys(targetContent, duplicateContent));
                fs.writeFileSync(targetPath, `${JSON.stringify(mergedContent, null, 2)}\n`);
                totalMerged++;
            } else {
                fs.mkdirSync(path.dirname(targetPath), { recursive: true });
                fs.writeFileSync(targetPath, `${JSON.stringify(sortObjectKeys(duplicateContent), null, 2)}\n`);
                totalMerged++;
            }

            fs.unlinkSync(filePath);
            totalRemoved++;
        }
    });
});

console.log(`✅ Перенесено ${totalMerged} наборов ключей в SSOT-файлы`);
console.log(`✅ Удалено ${totalRemoved} root-дубликатов`);
