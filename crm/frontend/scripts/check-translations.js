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

// Получить значение по ключу (поддержка вложенных ключей)
function getValueByKey(obj, key) {
    // Сначала проверяем, нет ли такого ключа напрямую (актуально для dynamic.json)
    if (obj && typeof obj === 'object' && key in obj) {
        return obj[key];
    }

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

// Основная функция проверки
function checkTranslations() {
    log('\n🔍 АНАЛИЗ ПЕРЕВОДОВ\n', 'bold');

    const missingByFile = {};
    const sourceEmptyByFile = {};
    const emptyByFile = {};
    let totalMissing = 0;
    let totalSourceEmpty = 0;
    let totalEmpty = 0;

    // Получаем список всех JSON файлов из эталонной локали
    const refDir = path.join(LOCALES_DIR, REFERENCE_LANG);
    const jsonFiles = getAllJsonFiles(refDir, refDir);

    log(`📁 Проверяем ${jsonFiles.length} файлов в ${LANGUAGES.length} языках\n`, 'cyan');

    // Для каждого файла
    for (const file of jsonFiles) {
        const translations = {};
        const refFilePath = path.join(LOCALES_DIR, REFERENCE_LANG, file);

        if (!fs.existsSync(refFilePath)) continue;

        const refContent = JSON.parse(fs.readFileSync(refFilePath, 'utf-8'));
        const refKeys = getAllKeys(refContent);

        // Загружаем переводы для всех языков
        for (const lang of LANGUAGES) {
            const filePath = path.join(LOCALES_DIR, lang, file);

            if (fs.existsSync(filePath)) {
                try {
                    const content = fs.readFileSync(filePath, 'utf-8');
                    translations[lang] = JSON.parse(content);
                } catch (error) {
                    log(`❌ Ошибка парсинга ${lang}/${file}: ${error.message}`, 'red');
                }
            } else {
                translations[lang] = null;
            }
        }

        // Проверяем каждый ключ из эталона
        for (const key of refKeys) {
            const refValue = getValueByKey(refContent, key);

            if (refValue === '' || refValue === null) {
                if (!sourceEmptyByFile[file]) {
                    sourceEmptyByFile[file] = [];
                }
                sourceEmptyByFile[file].push(key);
                totalSourceEmpty++;
            }

            for (const lang of LANGUAGES) {
                if (lang === REFERENCE_LANG) continue; // Пропускаем эталонный язык

                const langData = translations[lang];

                // Проверка отсутствующего файла
                if (!langData) {
                    if (!missingByFile[file]) {
                        missingByFile[file] = {};
                    }
                    if (!missingByFile[file][lang]) {
                        missingByFile[file][lang] = [];
                    }
                    missingByFile[file][lang].push({ key, refValue });
                    totalMissing++;
                    continue;
                }

                const value = getValueByKey(langData, key);

                // Проверка отсутствующего ключа
                if (value === undefined) {
                    if (!missingByFile[file]) {
                        missingByFile[file] = {};
                    }
                    if (!missingByFile[file][lang]) {
                        missingByFile[file][lang] = [];
                    }
                    missingByFile[file][lang].push({ key, refValue });
                    totalMissing++;
                }
                // Проверка пустого значения
                // КРИТИЧЕСКОЕ ИЗМЕНЕНИЕ: Не считаем ошибкой пустое значение, если в эталоне (RU) оно тоже пустое
                else if ((value === '' || value === null) && (refValue !== '' && refValue !== null)) {
                    if (!emptyByFile[file]) {
                        emptyByFile[file] = {};
                    }
                    if (!emptyByFile[file][lang]) {
                        emptyByFile[file][lang] = [];
                    }
                    emptyByFile[file][lang].push({ key, refValue });
                    totalEmpty++;
                }
            }
        }
    }

    if (totalSourceEmpty > 0) {
        log(`\n❌ ПУСТЫЕ SOURCE-ЗНАЧЕНИЯ В ${REFERENCE_LANG.toUpperCase()} (${totalSourceEmpty}):\n`, 'red');

        for (const [file, keys] of Object.entries(sourceEmptyByFile)) {
            log(`\n📄 ${file}`, 'cyan');

            const maxShow = 12;
            const keysToShow = keys.slice(0, maxShow);

            for (const key of keysToShow) {
                log(`     • ${key}`, 'dim');
            }

            if (keys.length > maxShow) {
                log(`     ... и еще ${keys.length - maxShow} ключей`, 'dim');
            }

            log(`  ${colors.magenta}→ Нужно восстановить ${keys.length} source-значений в ${REFERENCE_LANG}/${file}${colors.reset}\n`);
        }
    } else {
        log(`✅ Пустых source-значений в ${REFERENCE_LANG} не найдено\n`, 'green');
    }

    // Выводим результаты по файлам
    if (totalMissing > 0) {
        log(`\n❌ ОТСУТСТВУЮЩИЕ КЛЮЧИ (${totalMissing}):\n`, 'red');

        for (const [file, langs] of Object.entries(missingByFile)) {
            log(`\n📄 ${file}`, 'cyan');

            for (const [lang, keys] of Object.entries(langs)) {
                log(`  🌐 ${lang.toUpperCase()} (${keys.length} ключей):`, 'yellow');

                // Группируем по 5 ключей для компактности
                const maxShow = 10;
                const keysToShow = keys.slice(0, maxShow);

                for (const { key, refValue } of keysToShow) {
                    const displayValue = typeof refValue === 'string' && refValue.length > 50
                        ? refValue.substring(0, 50) + '...'
                        : refValue;
                    log(`     • ${key}`, 'dim');
                    log(`       ${colors.green}RU: ${displayValue}${colors.reset}`, 'dim');
                }

                if (keys.length > maxShow) {
                    log(`     ... и еще ${keys.length - maxShow} ключей`, 'dim');
                }

                log(`  ${colors.magenta}→ Нужно добавить ${keys.length} переводов в ${lang}/${file}${colors.reset}\n`);
            }
        }
    } else {
        log('✅ Отсутствующих ключей не найдено\n', 'green');
    }

    if (totalEmpty > 0) {
        log(`\n⚠️  ПУСТЫЕ ЗНАЧЕНИЯ (${totalEmpty}):\n`, 'yellow');

        for (const [file, langs] of Object.entries(emptyByFile)) {
            log(`\n📄 ${file}`, 'cyan');

            for (const [lang, keys] of Object.entries(langs)) {
                log(`  🌐 ${lang.toUpperCase()} (${keys.length} ключей):`, 'yellow');

                const maxShow = 10;
                const keysToShow = keys.slice(0, maxShow);

                for (const { key, refValue } of keysToShow) {
                    const displayValue = typeof refValue === 'string' && refValue.length > 50
                        ? refValue.substring(0, 50) + '...'
                        : refValue;
                    log(`     • ${key}`, 'dim');
                    log(`       ${colors.green}RU: ${displayValue}${colors.reset}`, 'dim');
                }

                if (keys.length > maxShow) {
                    log(`     ... и еще ${keys.length - maxShow} ключей`, 'dim');
                }

                log(`  ${colors.magenta}→ Нужно заполнить ${keys.length} значений в ${lang}/${file}${colors.reset}\n`);
            }
        }
    } else {
        log('✅ Пустых значений не найдено\n', 'green');
    }

    // Итоговая статистика
    log('\n📈 ИТОГОВАЯ СТАТИСТИКА:\n', 'bold');
    log(`   Всего файлов: ${jsonFiles.length}`, 'cyan');
    log(`   Языков: ${LANGUAGES.length - 1} (кроме эталонного ${REFERENCE_LANG})`, 'cyan');
    log(`   Пустых source-значений в ${REFERENCE_LANG}: ${totalSourceEmpty}`, totalSourceEmpty > 0 ? 'red' : 'green');
    log(`   Отсутствующих ключей: ${totalMissing}`, totalMissing > 0 ? 'red' : 'green');
    log(`   Пустых значений: ${totalEmpty}`, totalEmpty > 0 ? 'yellow' : 'green');

    const totalIssues = totalSourceEmpty + totalMissing + totalEmpty;
    log(`\n   ВСЕГО ПРОБЛЕМ: ${totalIssues}\n`, totalIssues > 0 ? 'red' : 'green');

    if (totalIssues === 0) {
        log('🎉 ВСЕ ПЕРЕВОДЫ В ПОРЯДКЕ!\n', 'green');
    } else {
        log('\n💡 РЕКОМЕНДАЦИИ:', 'bold');
        log('   1. Запустите: npm run db:i18n:auto', 'cyan');
        log('   2. Это восстановит пустой source и синхронизирует остальные языки', 'cyan');
        log('   3. Проверьте ключевые страницы после автоперевода\n', 'cyan');
    }

    return totalIssues;
}

// Запуск
const exitCode = checkTranslations();
process.exit(exitCode > 0 ? 1 : 0);
