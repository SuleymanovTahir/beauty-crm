const fs = require('fs');
const path = require('path');

/**
 * Скрипт для исправления дублирующих вложенных/плоских ключей
 * Удаляет плоские ключи типа "menu.analytics" если есть вложенная структура menu.analytics
 */

const LOCALES_DIR = path.resolve(__dirname, '../../src/locales');

console.log('🔧 Исправление дублирующих ключей...');

let totalFixed = 0;

function fixFile(filePath) {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    let modified = false;

    // Находим все плоские ключи с точкой
    const flatKeys = Object.keys(data).filter(key => key.includes('.'));

    flatKeys.forEach(flatKey => {
        const parts = flatKey.split('.');
        const rootKey = parts[0];
        const nestedKey = parts.slice(1).join('.');

        // Проверяем, есть ли вложенная структура
        if (data[rootKey] && typeof data[rootKey] === 'object') {
            // Находим вложенное значение и объект-родитель
            let current = data[rootKey];
            let targetObj = data[rootKey];
            let lastPart = '';

            const nestedParts = nestedKey.split('.');
            let exists = true;

            for (let i = 0; i < nestedParts.length; i++) {
                const part = nestedParts[i];
                if (current && typeof current === 'object' && part in current) {
                    if (i === nestedParts.length - 1) {
                        lastPart = part;
                        targetObj = current; // Родительский объект для последнего ключа
                    }
                    current = current[part];
                } else {
                    exists = false;
                    break;
                }
            }

            const flatValue = data[flatKey];

            // Случай 1: Вложенный ключ существует и имеет значение -> Удаляем плоский ключ
            if (exists && current !== '') {
                delete data[flatKey];
                modified = true;
            }
            // Случай 2: Вложенный ключ пустой, а плоский имеет значение -> Переносим значение и удаляем плоский
            else if (exists && (current === '' || current === undefined) && flatValue !== '') {
                targetObj[lastPart] = flatValue;
                delete data[flatKey];
                modified = true;
            }
        }
    });

    if (modified) {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
        totalFixed++;
    }
}

function processDirectory(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    entries.forEach(entry => {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            processDirectory(fullPath);
        } else if (entry.name.endsWith('.json')) {
            fixFile(fullPath);
        }
    });
}

const locales = fs.readdirSync(LOCALES_DIR);
locales.forEach(locale => {
    const localePath = path.join(LOCALES_DIR, locale);

    if (fs.statSync(localePath).isDirectory()) {
        processDirectory(localePath);
    }
});

console.log(`✅ Исправлено ${totalFixed} файлов`);
