const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '../../src/locales/ru');

function getEmptyKeys(obj, prefix = '') {
  return Object.keys(obj).reduce((res, el) => {
    const val = obj[el];
    const newKey = prefix ? `${prefix}.${el}` : el;
    
    if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
      return [...res, ...getEmptyKeys(val, newKey)];
    }
    
    if (val === "" || val === null) {
      return [...res, newKey];
    }
    
    return res;
  }, []);
}

console.log('🔍 Scanning for empty translation keys in Russian locale (ru)...\n');

if (!fs.existsSync(localesDir)) {
  console.error(`❌ Directory not found: ${localesDir}`);
  process.exit(1);
}

const files = fs.readdirSync(localesDir).filter(f => f.endsWith('.json'));
let totalEmpty = 0;

files.forEach(file => {
  const filePath = path.join(localesDir, file);
  try {
    const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const emptyKeys = getEmptyKeys(content);
    
    if (emptyKeys.length > 0) {
      console.log(`📄 ${file}:`);
      emptyKeys.forEach(key => console.log(`  - ${key}`));
      console.log('');
      totalEmpty += emptyKeys.length;
    }
  } catch (e) {
    console.error(`❌ Error parsing ${file}: ${e.message}`);
  }
});

if (totalEmpty === 0) {
  console.log('✅ No empty keys found! All translations are present.');
} else {
  console.log(`⚠️  Found ${totalEmpty} empty keys that need to be filled.`);
}
