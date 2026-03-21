const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '..', '..', 'src', 'locales');
const languages = ['en', 'es', 'ar', 'hi', 'kk', 'pt', 'fr', 'de'];

// Функция для проверки наличия кириллицы
function hasCyrillic(text) {
    if (typeof text !== 'string') return false;
    return /[а-яА-ЯЁё]/.test(text);
}

// Функция для преобразования ключа в текст (как в Python скрипте)
function keyToText(key) {
    const parts = key.split('.');
    const lastPart = parts[parts.length - 1];
    const text = lastPart.replace(/_/g, ' ');
    return text.charAt(0).toUpperCase() + text.slice(1);
}

// Рекурсивная функция для очистки объекта
function cleanObject(obj, parentKey = '') {
    let cleaned = false;

    for (const key in obj) {
        const fullKey = parentKey ? `${parentKey}.${key}` : key;
        const value = obj[key];

        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            const result = cleanObject(value, fullKey);
            if (result) cleaned = true;
        } else if (typeof value === 'string' && hasCyrillic(value)) {
            // Удаляем русский текст (делаем пустым), чтобы Python скрипт перевел
            obj[key] = '';
            cleaned = true;
        } else if (Array.isArray(value)) {
            for (let i = 0; i < value.length; i++) {
                if (typeof value[i] === 'string' && hasCyrillic(value[i])) {
                    value[i] = '';
                    cleaned = true;
                }
            }
        }
    }

    return cleaned;
}

// Рекурсивная функция для получения всех JSON файлов
function getAllJsonFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);

    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            getAllJsonFiles(filePath, fileList);
        } else if (file.endsWith('.json')) {
            fileList.push(filePath);
        }
    });

    return fileList;
}

console.log('🧹 Очистка русского текста из файлов других языков...\n');

let totalCleaned = 0;
let totalFiles = 0;

languages.forEach(lang => {
    const langDir = path.join(localesDir, lang);

    if (!fs.existsSync(langDir)) {
        console.log(`⚠️  Пропуск ${lang}: директория не найдена`);
        return;
    }

    const files = getAllJsonFiles(langDir);
    let langCleaned = 0;

    files.forEach(filePath => {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const data = JSON.parse(content);

            const wasCleaned = cleanObject(data);

            if (wasCleaned) {
                fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
                langCleaned++;
                totalCleaned++;
            }

            totalFiles++;
        } catch (err) {
            console.error(`❌ Ошибка обработки ${filePath}:`, err.message);
        }
    });

    if (langCleaned > 0) {
        console.log(`✅ ${lang}: Очищено ${langCleaned} файлов`);
    }
});

console.log(`\n📊 Итого:`);
console.log(`  Обработано файлов: ${totalFiles}`);
console.log(`  Очищено файлов: ${totalCleaned}`);
console.log(`\n💡 Теперь запустите: npm run db:i18n:auto`);
