const fs = require('fs');
const path = require('path');

const LOCALES_DIR = path.resolve(__dirname, '../../src/locales');

function renameToLowercase(dir) {
    const files = fs.readdirSync(dir);

    files.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            renameToLowercase(fullPath);
        } else if (file.endsWith('.json')) {
            const lowerName = file.toLowerCase();
            if (file !== lowerName) {
                const newPath = path.join(dir, lowerName);
                console.log(`Renaming: ${file} -> ${lowerName}`);
                fs.renameSync(fullPath, newPath);
            }
        }
    });
}

console.log('🔄 Renaming all locale files to lowercase...');
renameToLowercase(LOCALES_DIR);
console.log('✅ Done!');
