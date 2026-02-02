const fs = require('fs');
const path = require('path');

const languages = ['en', 'es', 'ar', 'hi', 'kk', 'pt', 'fr', 'de'];
const localesDir = path.join(__dirname, '..', '..', 'src', 'locales');

// Рекурсивно получаем все русские файлы с сохранением структуры
function getRussianFiles(dir = '', result = []) {
  const ruDir = path.join(localesDir, 'ru', dir);

  if (!fs.existsSync(ruDir)) return result;

  const items = fs.readdirSync(ruDir);

  items.forEach(item => {
    const relativePath = path.join(dir, item);
    const fullPath = path.join(ruDir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      getRussianFiles(relativePath, result);
    } else if (item.endsWith('.json')) {
      result.push(relativePath);
    }
  });

  return result;
}

// Рекурсивное слияние объектов
function mergeKeys(ruObj, targetObj = {}) {
  const result = {};

  for (const key in ruObj) {
    if (typeof ruObj[key] === 'object' && ruObj[key] !== null && !Array.isArray(ruObj[key])) {
      result[key] = mergeKeys(ruObj[key], targetObj[key] || {});
    } else {
      // Если перевод уже есть и он отличается от ключа - оставляем
      // Если перевода нет или он равен ключу - копируем из русского
      if (targetObj[key] && targetObj[key] !== key) {
        result[key] = targetObj[key];
      } else {
        result[key] = ruObj[key];
      }
    }
  }

  return result;
}

console.log('🔄 Синхронизация структуры локализации...\n');

const ruFiles = getRussianFiles();

console.log(`📁 Найдено файлов в ru/: ${ruFiles.length}\n`);

for (const lang of languages) {
  console.log(`📝 Обработка языка: ${lang}`);
  let updatedCount = 0;

  for (const file of ruFiles) {
    const ruPath = path.join(localesDir, 'ru', file);
    const targetPath = path.join(localesDir, lang, file);

    // Создаем вложенные папки если нужно
    const targetDir = path.dirname(targetPath);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // Читаем русский файл
    let ruContent;
    try {
      ruContent = JSON.parse(fs.readFileSync(ruPath, 'utf8'));
    } catch (e) {
      console.warn(`   ⚠️  Ошибка чтения ${file}, пропускаем`);
      continue;
    }

    // Читаем существующий файл целевого языка
    let targetContent = {};
    if (fs.existsSync(targetPath)) {
      try {
        targetContent = JSON.parse(fs.readFileSync(targetPath, 'utf8'));
      } catch (e) {
        console.warn(`   ⚠️  Ошибка чтения ${lang}/${file}, пересоздаем`);
      }
    }

    // Сливаем с сохранением существующих переводов
    const merged = mergeKeys(ruContent, targetContent);

    // Записываем результат
    fs.writeFileSync(targetPath, JSON.stringify(merged, null, 2) + '\n', 'utf8');
    updatedCount++;
  }

  console.log(`   ✅ Обновлено файлов: ${updatedCount}\n`);
}

console.log('🎉 Синхронизация завершена!\n');
console.log('📌 Что дальше:');
console.log('1. Проверьте ru/* - там должны быть готовые переводы');
console.log('2. В других языках структура скопирована, можно заменять значения');
console.log('3. Запустите npm run i18n:extract для сканирования кода');