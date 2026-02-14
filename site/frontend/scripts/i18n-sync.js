#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');

// 📚 ГЛОССАРИЙ
let glossary = {};
try {
    glossary = JSON.parse(fs.readFileSync(path.join(__dirname, 'glossary.json'), 'utf8'));
} catch (e) { }

const LOCALES_DIR = path.join(__dirname, '../src/locales');
const LANGUAGES = ['en', 'ar', 'de', 'es', 'fr', 'hi', 'kk', 'pt'];
const REFERENCE_LANG = 'ru';
const BATCH_SIZE = 150; // ✅ Увеличено до 150 по запросу пользователя

async function translateBatch(texts, targetLang) {
    if (texts.length === 0) return [];

    // Группируем тексты тегами для пакетного перевода
    const taggedBatch = texts.map((t, i) => `<z${i}>${t}</z${i}>`).join('');
    const encodedText = encodeURIComponent(taggedBatch);
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=ru&tl=${targetLang}&dt=t&q=${encodedText}`;

    return new Promise((resolve) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    if (parsed && parsed[0]) {
                        const translatedBlocks = parsed[0].map(x => x[0]).join('');
                        const results = new Array(texts.length).fill('');
                        for (let i = 0; i < texts.length; i++) {
                            const match = translatedBlocks.match(new RegExp(`<z${i}>(.*?)</z${i}>`, 'i'));
                            results[i] = match ? match[1].trim() : texts[i];
                        }
                        resolve(results);
                    } else {
                        resolve(texts);
                    }
                } catch (e) {
                    resolve(texts);
                }
            });
        }).on('error', () => resolve(texts));
    });
}

async function syncTranslations() {
    console.log('\x1b[1m\x1b[32m🚀 FAST BATCH SYNC (Batch Size: 150)\x1b[0m\n');

    const refDir = path.join(LOCALES_DIR, REFERENCE_LANG);
    const jsonFiles = getAllJsonFiles(refDir, refDir);

    for (const file of jsonFiles) {
        const refContent = JSON.parse(fs.readFileSync(path.join(refDir, file), 'utf-8'));
        const refKeys = getAllKeys(refContent);

        for (const lang of LANGUAGES) {
            const filePath = path.join(LOCALES_DIR, lang, file);
            if (!fs.existsSync(path.dirname(filePath))) fs.mkdirSync(path.dirname(filePath), { recursive: true });

            let langContent = fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath, 'utf8')) : {};
            const missingKeys = refKeys.filter(k => !getValueByKey(langContent, k) || getValueByKey(langContent, k) === "");

            if (missingKeys.length > 0) {
                console.log(`\x1b[36m📦 ${lang}/${file}: translating ${missingKeys.length} keys...\x1b[0m`);
                for (let i = 0; i < missingKeys.length; i += BATCH_SIZE) {
                    const batch = missingKeys.slice(i, i + BATCH_SIZE);
                    const textsToTranslate = batch.map(k => getValueByKey(refContent, k));
                    const translatedTexts = await translateBatch(textsToTranslate, lang);

                    batch.forEach((key, idx) => {
                        setValueByKey(langContent, key, translatedTexts[idx] || textsToTranslate[idx]);
                    });
                }
                fs.writeFileSync(filePath, JSON.stringify(sortObjectKeys(langContent), null, 2) + '\n');
            }
        }
    }
    console.log('\n\x1b[1m\x1b[32m✅ Sync Complete!\x1b[0m');
}

// Вспомогательные функции (getAllJsonFiles, getAllKeys, getValueByKey, setValueByKey, sortObjectKeys)
// ... (оставлю их из оригинального файла)

function getAllJsonFiles(dir, baseDir = dir) {
    const files = [];
    if (!fs.existsSync(dir)) return files;
    const items = fs.readdirSync(dir);
    for (const item of items) {
        const fullPath = path.join(dir, item);
        if (fs.statSync(fullPath).isDirectory()) {
            files.push(...getAllJsonFiles(fullPath, baseDir));
        } else if (item.endsWith('.json')) {
            files.push(path.relative(baseDir, fullPath));
        }
    }
    return files;
}

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

function getValueByKey(obj, key) {
    if (obj && typeof obj === 'object' && key in obj) return obj[key];
    const parts = key.split('.');
    let current = obj;
    for (const part of parts) {
        if (current && typeof current === 'object' && part in current) current = current[part];
        else return undefined;
    }
    return current;
}

function setValueByKey(obj, key, value) {
    const parts = key.split('.');
    let current = obj;
    for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (!(part in current) || typeof current[part] !== 'object') current[part] = {};
        current = current[part];
    }
    current[parts[parts.length - 1]] = value;
}

function sortObjectKeys(obj) {
    if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) return obj;
    return Object.keys(obj).sort().reduce((acc, key) => {
        acc[key] = sortObjectKeys(obj[key]);
        return acc;
    }, {});
}

syncTranslations();
