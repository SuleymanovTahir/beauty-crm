const fs = require('fs');
const path = require('path');

const languages = ['ru', 'en', 'es', 'ar', 'hi', 'kk', 'pt', 'fr', 'de'];

const namespaces = [
  'common',
  'admin/Analytics',
  'admin/BookingDetail',
  'admin/Bookings',
  'admin/BotSettings',
  'admin/Calendar',
  'admin/ClientDetail',
  'admin/Clients',
  'admin/CreateUser',
  'admin/Dashboard',
  'admin/EditUser',
  'admin/Services',
  'admin/Settings',
  'admin/SpecialPackages',
  'admin/Users',
  'manager/Chat',
  'manager/Dashboard',
  'manager/Funnel',
  'manager/Messages',
  'manager/Settings',
  'employee/Dashboard',
  'employee/Profile',
  'public/About',
  'public/Contacts',
  'public/Cooperation',
  'public/DataDeletion',
  'public/FAQ',
  'public/Home',
  'public/PriceList',
  'public/PrivacyPolicy',
  'public/Success',
  'public/Terms',
  'public/UserCabinet',
  'auth/Login',
  'layouts/AdminLayout',
  'layouts/EmployeeLayout',
  'layouts/ManagerLayout',
  'layouts/PublicLayout',
  'components/LanguageSwitcher',
  'components/PublicLanguageSwitcher'
];

const localesDir = path.join(__dirname, 'src', 'locales');

console.log('🚀 Создание структуры локализации с подпапками...\n');

for (const lang of languages) {
  for (const ns of namespaces) {
    const parts = ns.split('/');
    let currentPath = path.join(localesDir, lang);
    
    // Создаем подпапки
    for (let i = 0; i < parts.length - 1; i++) {
      currentPath = path.join(currentPath, parts[i]);
      if (!fs.existsSync(currentPath)) {
        fs.mkdirSync(currentPath, { recursive: true });
      }
    }
    
    // Создаем JSON файл
    const filePath = path.join(localesDir, lang, `${ns}.json`);
    const fileDir = path.dirname(filePath);
    
    if (!fs.existsSync(fileDir)) {
      fs.mkdirSync(fileDir, { recursive: true });
    }
    
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify({}, null, 2), 'utf8');
      console.log(`✅ ${lang}/${ns}.json`);
    }
  }
}

console.log('\n🎉 Структура создана!');