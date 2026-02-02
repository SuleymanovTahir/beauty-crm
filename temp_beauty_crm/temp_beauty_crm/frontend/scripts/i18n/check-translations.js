const fs = require('fs');
const path = require('path');
const chalk = require('chalk'); // You might need to install chalk or remove colors if not available

const localesDir = path.join(__dirname, '../../src/locales');
const sourceLocale = 'ru';
const targetLocales = ['en', 'es', 'ar', 'hi', 'kk', 'pt', 'fr', 'de'];

let hasError = false;

function getFiles(dir) {
  const dirents = fs.readdirSync(dir, { withFileTypes: true });
  const files = dirents.map((dirent) => {
    const res = path.resolve(dir, dirent.name);
    return dirent.isDirectory() ? getFiles(res) : res;
  });
  return Array.prototype.concat(...files);
}

function getKeys(obj, prefix = '') {
  return Object.keys(obj).reduce((res, el) => {
    if(Array.isArray(obj[el])) return res;
    if(typeof obj[el] === 'object' && obj[el] !== null) {
      return [...res, ...getKeys(obj[el], prefix + el + '.')];
    }
    return [...res, prefix + el];
  }, []);
}

console.log(`Checking translations against source locale: ${sourceLocale}`);

// Get all namespaces from source locale
const sourcePath = path.join(localesDir, sourceLocale);
if (!fs.existsSync(sourcePath)) {
  console.error(`Source locale directory not found: ${sourcePath}`);
  process.exit(1);
}

const namespaces = fs.readdirSync(sourcePath).filter(f => f.endsWith('.json'));

namespaces.forEach(file => {
  const namespace = file.replace('.json', '');
  const sourceContent = JSON.parse(fs.readFileSync(path.join(sourcePath, file), 'utf8'));
  const sourceKeys = getKeys(sourceContent);

  targetLocales.forEach(locale => {
    const targetFilePath = path.join(localesDir, locale, file);
    
    if (!fs.existsSync(targetFilePath)) {
      console.log(`⚠️  Missing file for ${locale}: ${namespace}.json`);
      // hasError = true; // Optional: fail if file missing
      return;
    }

    const targetContent = JSON.parse(fs.readFileSync(targetFilePath, 'utf8'));
    const targetKeys = getKeys(targetContent);

    const missingKeys = sourceKeys.filter(k => !targetKeys.includes(k));
    
    if (missingKeys.length > 0) {
      console.log(`\n❌ Missing keys in ${locale}/${namespace}:`);
      missingKeys.forEach(k => console.log(`  - ${k}`));
      hasError = true;
    }
  });
});

if (hasError) {
  console.log('\n❌ Translation check failed. Some keys are missing.');
  process.exit(1);
} else {
  console.log('\n✅ All translations are present.');
  process.exit(0);
}
