const fs = require('fs');
const path = require('path');

const LOCALES_DIR = path.resolve(__dirname, '../../src/locales');
const ROGUE_FILES = [
    'adminLayout.json',
    'employeeLayout.json',
    'managerLayout.json',
    'components.json',
    'admin-components.json'
];

function cleanupRogueFiles(dir) {
    if (!fs.existsSync(dir)) return;

    const items = fs.readdirSync(dir);

    items.forEach(item => {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            // Check if this is a language directory (e.g., 'ru', 'en')
            // We want to delete rogue files inside language directories
            ROGUE_FILES.forEach(rogueFile => {
                const roguePath = path.join(fullPath, rogueFile);
                if (fs.existsSync(roguePath)) {
                    console.log(`🗑️  Deleting rogue file: ${roguePath}`);
                    fs.unlinkSync(roguePath);
                }
            });
        }
    });
}

console.log('🧹 Cleaning up rogue locale files...');
cleanupRogueFiles(LOCALES_DIR);
console.log('✅ Done!');
