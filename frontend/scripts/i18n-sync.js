#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const LOCALES_DIR = path.join(__dirname, '../src/locales');
const LANGUAGES = ['ru', 'en', 'ar', 'de', 'es', 'fr', 'hi', 'kk', 'pt'];
const REFERENCE_LANG = 'ru'; // Эталонный язык

// Цвета для консоли
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    bold: '\x1b[1m',
    dim: '\x1b[2m',
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

// Рекурсивно получить все JSON файлы
function getAllJsonFiles(dir, baseDir = dir) {
    const files = [];
    if (!fs.existsSync(dir)) return files;
    const items = fs.readdirSync(dir);

    for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            files.push(...getAllJsonFiles(fullPath, baseDir));
        } else if (item.endsWith('.json')) {
            const relativePath = path.relative(baseDir, fullPath);
            files.push(relativePath);
        }
    }

    return files;
}

// Получить все ключи из объекта (включая вложенные)
function getAllKeys(obj, prefix = '') {
    const keys = [];

    for (const [key, value] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;

        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            keys.push(...getAllKeys(value, fullKey));
        } else {
            keys.push(fullKey);
        }
    }

    return keys;
}

// Получить значение по ключу
function getValueByKey(obj, key) {
    const parts = key.split('.');
    let current = obj;

    for (const part of parts) {
        if (current && typeof current === 'object' && part in current) {
            current = current[part];
        } else {
            return undefined;
        }
    }

    return current;
}

// Установить значение по ключу
function setValueByKey(obj, key, value) {
    const parts = key.split('.');
    let current = obj;

    for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (!(part in current) || typeof current[part] !== 'object') {
            current[part] = {};
        }
        current = current[part];
    }

    current[parts[parts.length - 1]] = value;
}

// Сортировка ключей объекта рекурсивно
function sortObjectKeys(obj) {
    if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
        return obj;
    }

    return Object.keys(obj).sort().reduce((acc, key) => {
        acc[key] = sortObjectKeys(obj[key]);
        return acc;
    }, {});
}

// Основная функция синхронизации
function syncTranslations() {
    log('\n🔄 СИНХРОНИЗАЦИЯ ПЕРЕВОДОВ\n', 'bold');

    let totalAdded = 0;
    let totalUpdated = 0;

    // Получаем список всех JSON файлов из эталонной локали
    const refDir = path.join(LOCALES_DIR, REFERENCE_LANG);
    const jsonFiles = getAllJsonFiles(refDir, refDir);

    log(`📁 Обработка ${jsonFiles.length} файлов...\n`, 'cyan');

    // Для каждого файла
    for (const file of jsonFiles) {
        const refFilePath = path.join(LOCALES_DIR, REFERENCE_LANG, file);

        if (!fs.existsSync(refFilePath)) continue;

        const refContent = JSON.parse(fs.readFileSync(refFilePath, 'utf-8'));
        const refKeys = getAllKeys(refContent);

        // Для каждого языка
        for (const lang of LANGUAGES) {
            if (lang === REFERENCE_LANG) continue;

            const filePath = path.join(LOCALES_DIR, lang, file);
            let langContent = {};
            let isNewFile = false;

            if (fs.existsSync(filePath)) {
                try {
                    langContent = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
                } catch (error) {
                    log(`❌ Ошибка чтения ${lang}/${file}: ${error.message}`, 'red');
                    continue;
                }
            } else {
                // Создаем директорию если нет
                const dirPath = path.dirname(filePath);
                if (!fs.existsSync(dirPath)) {
                    fs.mkdirSync(dirPath, { recursive: true });
                }
                isNewFile = true;
                log(`📄 Создан новый файл: ${lang}/${file}`, 'green');
            }

            let fileChanges = 0;

            // Проверяем ключи
            for (const key of refKeys) {
                const refValue = getValueByKey(refContent, key);
                const langValue = getValueByKey(langContent, key);

                if (langValue === undefined) {
                    // Ключ отсутствует - добавляем
                    // В будущем здесь можно подключить Google Translate API
                    // Пока просто копируем оригинал или ставим пометку
                    setValueByKey(langContent, key, refValue);
                    fileChanges++;
                    totalAdded++;
                }
            }

            // Если были изменения, сохраняем файл
            if (fileChanges > 0 || isNewFile) {
                // Сортируем ключи для красоты
                const sortedContent = sortObjectKeys(langContent);

                fs.writeFileSync(filePath, JSON.stringify(sortedContent, null, 2) + '\n');
                if (!isNewFile) {
                    log(`✏️  Обновлен ${lang}/${file}: добавлено ${fileChanges} ключей`, 'yellow');
                }
            }
        }
    }

    log(`\n✅ Синхронизация завершена!`, 'bold');
    log(`   Всего добавлено ключей: ${totalAdded}`, 'green');
}

syncTranslations();
