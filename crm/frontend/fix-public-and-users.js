const fs = require('fs');
const path = require('path');
const https = require('https');

// Missing keys for admin/Users
const MISSING_USERS_KEYS = {
    'stats_total': 'Total Users',
    'stats_directors': 'Directors',
    'stats_admins': 'Admins',
    'stats_managers': 'Managers',
    'permissions_label': 'Permissions',
    'perm_director_full': 'Full access to all features',
    'perm_admin_manage': 'Manage users, clients, and bookings',
    'perm_manager_bookings': 'Manage clients and bookings',
    'perm_sales_clients': 'View and chat with clients',
    'perm_employee_basic': 'View own schedule and bookings',
    'role_hierarchy_label': 'Role Hierarchy',
    'role_hierarchy_description': 'Higher roles have all permissions of lower roles.',
    'edit_dialog_title': 'Edit User',
    'edit_dialog_subtitle': 'Update user details and settings',
    'edit_username_label': 'Username',
    'edit_username_placeholder': 'johndoe',
    'edit_fullname_label': 'Full Name',
    'edit_fullname_placeholder': 'John Doe',
    'edit_position_placeholder': 'Select position',
    'edit_position_hint': 'Position is displayed in public profile',
    'edit_password_warning_title': 'Password',
    'edit_password_warning_text': 'Leave blank to keep current password',
    'edit_cancel': 'Cancel',
    'edit_saving': 'Saving...',
    'edit_save': 'Save Changes',
    'permissions_dialog_title': 'Manage Permissions',
    'permissions_dialog_role': 'Role',
    'permissions_dialog_close': 'Close',
    'role_dialog_title': 'Change Role',
    'action_manage_schedule_title': 'Manage Schedule',
    'action_manage_permissions_title': 'Manage Permissions',
    'action_change_role_title': 'Change Role'
};

const MISSING_COMMON_KEYS = {
    'status_new': 'New',
    'status_active': 'Active',
    'status_inactive': 'Inactive',
    'status_vip': 'VIP',
    'status_blocked': 'Blocked',
    'status_pending': 'Pending',
    'status_confirmed': 'Confirmed',
    'status_completed': 'Completed',
    'status_cancelled': 'Cancelled',
    'status_no_show': 'No Show',
    'export_to_csv': 'Export to CSV',
    'export_to_excel': 'Export to Excel',
    'export_to_pdf': 'Export to PDF',
    'exporting': 'Exporting...',
    'export': 'Export'
};

async function translateText(text, targetLang) {
    if (!text) return '';
    // Skip if text is already English and target is English
    if (targetLang === 'en' && !/[а-яА-ЯЁё]/.test(text)) return text;

    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;

    return new Promise((resolve) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    // Join all parts of the translation (for multi-sentence text)
                    const translated = parsed[0].map(item => item[0]).join('');
                    resolve(translated);
                } catch (err) {
                    console.error(`Translation error for "${text.substring(0, 20)}..."`);
                    resolve(text);
                }
            });
        }).on('error', () => resolve(text));
    });
}

async function processFile(filePath, lang, namespace) {
    if (!fs.existsSync(filePath)) {
        // Create file if it doesn't exist (only for Users)
        if (namespace === 'admin/Users') {
            fs.mkdirSync(path.dirname(filePath), { recursive: true });
            fs.writeFileSync(filePath, '{}', 'utf8');
        } else {
            return 0;
        }
    }

    let data = {};
    try {
        data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (e) {
        console.error(`Error parsing ${filePath}`);
        data = {};
    }

    let updated = false;
    let addedCount = 0;
    let fixedCount = 0;

    // 1. Add missing keys (only for admin/Users and common)
    if (namespace === 'admin/Users') {
        for (const [key, enText] of Object.entries(MISSING_USERS_KEYS)) {
            if (!data[key]) {
                const translated = await translateText(enText, lang);
                data[key] = translated;
                updated = true;
                addedCount++;
                await new Promise(r => setTimeout(r, 50));
            }
        }
    } else if (namespace === 'common') {
        for (const [key, enText] of Object.entries(MISSING_COMMON_KEYS)) {
            if (!data[key]) {
                const translated = await translateText(enText, lang);
                data[key] = translated;
                updated = true;
                addedCount++;
                await new Promise(r => setTimeout(r, 50));
            }
        }
    }

    // 2. Fix Russian strings (recursively for nested objects)
    async function fixObject(obj) {
        let hasChanges = false;
        for (const key in obj) {
            if (typeof obj[key] === 'string') {
                if (/[а-яА-ЯЁё]/.test(obj[key])) {
                    const translated = await translateText(obj[key], lang);
                    if (translated !== obj[key]) {
                        obj[key] = translated;
                        hasChanges = true;
                        fixedCount++;
                        await new Promise(r => setTimeout(r, 50));
                    }
                }
            } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                if (await fixObject(obj[key])) {
                    hasChanges = true;
                }
            }
        }
        return hasChanges;
    }

    if (await fixObject(data)) {
        updated = true;
    }

    if (updated) {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
        console.log(`✅ ${lang}/${namespace}: +${addedCount} keys, fixed ${fixedCount} Russian strings`);
    }

    return addedCount + fixedCount;
}

async function main() {
    const localesDir = path.join(__dirname, 'src', 'locales');
    const languages = fs.readdirSync(localesDir).filter(f =>
        fs.statSync(path.join(localesDir, f)).isDirectory() && f !== 'ru' // Skip Russian source
    );

    console.log(`🚀 Fixing Public pages and Users for: ${languages.join(', ')}...\n`);

    const namespaces = [
        'common',
        'admin/Users',
        'public/Home',
        'public/About',
        'public/PriceList',
        'public/FAQ',
        'public/Public',
        'public/Contacts',
        'public/Cooperation',
        'public/DataDeletion',
        'public/PrivacyPolicy',
        'public/Terms',
        'public/Success',
        'public/UserCabinet'
    ];

    for (const lang of languages) {
        console.log(`🌍 Processing ${lang}...`);
        for (const ns of namespaces) {
            const filePath = path.join(localesDir, lang, `${ns}.json`);
            await processFile(filePath, lang, ns);
        }
    }

    console.log('\n✨ Done! Restart dev server to see changes.');
}

main().catch(console.error);
