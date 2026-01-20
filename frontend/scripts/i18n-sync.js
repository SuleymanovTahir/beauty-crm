#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');

// 📚 ГЛОССАРИЙ - Принудительные переводы для всех языков
let glossary = {};
try {
    glossary = JSON.parse(fs.readFileSync(path.join(__dirname, 'glossary.json'), 'utf8'));
} catch (e) {
    console.log('⚠️ Glossary not found, proceeding with pure auto-translate');
}

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

// 🌍 GOOGLE TRANSLATE - Бесплатный перевод через HTTP
async function translateText(text, targetLang) {
    const https = require('https');

    // Если текст пустой или это не строка, возвращаем как есть
    if (!text || typeof text !== 'string') {
        return text;
    }

    // 🔍 ПРОВЕРКА ПО ГЛОССАРИЮ (точное или частичное совпадение)
    const textLower = text.toLowerCase().trim();
    for (const key in glossary) {
        const entry = glossary[key];
        // Если текст совпадает с любым вариантом перевода в глоссарии, 
        // мы можем найти ключ и вернуть перевод для нужного языка
        for (const lang in entry) {
            if (entry[lang].toLowerCase() === textLower) {
                if (entry[targetLang]) {
                    // Сохраняем регистр оригинала (примерно)
                    const result = entry[targetLang];
                    return text[0] === text[0].toUpperCase()
                        ? result.charAt(0).toUpperCase() + result.slice(1)
                        : result;
                }
            }
        }
    }

    // Кодируем текст для URL
    const encodedText = encodeURIComponent(text);
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=ru&tl=${targetLang}&dt=t&q=${encodedText}`;

    return new Promise((resolve) => {
        https.get(url, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    // Google Translate возвращает массив переводов
                    if (parsed && parsed[0] && parsed[0][0] && parsed[0][0][0]) {
                        resolve(parsed[0][0][0]);
                    } else {
                        resolve(text); // Fallback к оригиналу
                    }
                } catch (e) {
                    resolve(text); // Fallback к оригиналу
                }
            });
        }).on('error', () => {
            resolve(text); // Fallback к оригиналу при ошибке
        });
    });
}

// Задержка для избежания rate limiting
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Основная функция синхронизации
async function syncTranslations() {
    log('\n🔄 СИНХРОНИЗАЦИЯ ПЕРЕВОДОВ С АВТОПЕРЕВОДОМ\n', 'bold');

    let totalAdded = 0;
    let totalTranslated = 0;

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

            const langDir = path.join(LOCALES_DIR, lang);
            if (!fs.existsSync(langDir)) {
                fs.mkdirSync(langDir, { recursive: true });
            }

            // Находим файл без учета регистра
            const existingFiles = fs.readdirSync(path.dirname(path.join(langDir, file))).filter(f => f.toLowerCase() === path.basename(file).toLowerCase());
            const fileName = existingFiles.length > 0 ? existingFiles[0] : path.basename(file).toLowerCase();
            const filePath = path.join(path.dirname(path.join(langDir, file)), fileName);

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
                isNewFile = true;
                log(`📄 Создан новый файл: ${lang}/${fileName}`, 'green');
            }

            let fileChanges = 0;

            // Проверяем ключи
            for (const key of refKeys) {
                const refValue = getValueByKey(refContent, key);
                const langValue = getValueByKey(langContent, key);

                if (langValue === undefined || langValue === "") {
                    if (refValue && refValue.trim() !== "") {
                        // Ключ отсутствует или пуст - переводим!
                        log(`   🌍 Перевод: "${refValue}" → ${lang}`, 'dim');
                        const translated = await translateText(refValue, lang);
                        setValueByKey(langContent, key, translated);
                        fileChanges++;
                        totalAdded++;
                        totalTranslated++;

                        // Небольшая задержка чтобы не забанили
                        await delay(100);
                    }
                }
            }

            // Если были изменения, сохраняем файл
            if (fileChanges > 0 || isNewFile) {
                // Сортируем ключи для красоты
                const sortedContent = sortObjectKeys(langContent);

                fs.writeFileSync(filePath, JSON.stringify(sortedContent, null, 2) + '\n');
                if (!isNewFile) {
                    log(`✏️  Обновлен ${lang}/${file}: переведено ${fileChanges} ключей`, 'yellow');
                }
            }
        }
    }

    log(`\n✅ Синхронизация завершена!`, 'bold');
    log(`   Всего добавлено ключей: ${totalAdded}`, 'green');
    log(`   Переведено через Google Translate: ${totalTranslated}`, 'cyan');
}

syncTranslations();
