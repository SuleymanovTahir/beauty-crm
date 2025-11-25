import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { autoDetectAndSetLanguage } from './utils/languageDetection';

const languages = ["ru", "en", "es", "ar", "hi", "kk", "pt", "fr", "de"];
const namespaces = [
  'common',
  'admin/analytics',
  'admin/bookingdetail',
  'admin/bookings',
  'admin/botsettings',
  'admin/Calendar',
  'admin/clientdetail',
  'admin/clients',
  'admin/createuser',
  'admin/dashboard',
  'admin/EditUser',
  'admin/services',
  'admin/settings',
  'admin/SpecialPackages',
  'admin/Users',
  'manager/chat',
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
  'public/faq',
  'public/home',
  'public/pricelist',
  'public/privacypolicy',
  'public/success',
  'public/terms',
  'public/UserCabinet',
  'public/public',
  'auth/Login',
  'auth/Register',
  'auth/ForgotPassword',
  'layouts/AdminLayout',
  'layouts/EmployeeLayout',
  'layouts/ManagerLayout',
  'layouts/PublicLayout',
  'components/LanguageSwitcher',
  'components/PublicLanguageSwitcher'
];
// Используем import.meta as any для обхода ошибки типов с Vite
const localeFiles = (import.meta as any).glob('./locales/**/*.json', { eager: true });

const resources: Record<string, any> = {};

for (const lang of languages) {
  resources[lang] = {};
  for (const ns of namespaces) {
    const key = `./locales/${lang}/${ns}.json`;
    if (localeFiles[key]) {
      resources[lang][ns] = (localeFiles[key] as any).default || localeFiles[key];
    } else {
      resources[lang][ns] = {};
    }
  }

  // Add aliases for backward compatibility
  // Admin pages
  resources[lang]['analytics'] = resources[lang]['admin/analytics'];
  resources[lang]['bookingDetail'] = resources[lang]['admin/bookingdetail'];
  resources[lang]['bookings'] = resources[lang]['admin/bookings'];
  resources[lang]['botSettings'] = resources[lang]['admin/botsettings'];
  resources[lang]['botsettings'] = resources[lang]['admin/botsettings'];
  resources[lang]['calendar'] = resources[lang]['admin/Calendar'];
  resources[lang]['clientDetail'] = resources[lang]['admin/clientdetail'];
  resources[lang]['clients'] = resources[lang]['admin/clients'];
  resources[lang]['createUser'] = resources[lang]['admin/createuser'];
  resources[lang]['dashboard'] = resources[lang]['admin/dashboard'];
  resources[lang]['editUser'] = resources[lang]['admin/EditUser'];
  resources[lang]['services'] = resources[lang]['admin/services'];
  resources[lang]['settings'] = resources[lang]['admin/settings'];
  resources[lang]['specialPackages'] = resources[lang]['admin/SpecialPackages'];
  resources[lang]['users'] = resources[lang]['admin/Users'];

  // Manager pages
  resources[lang]['chat'] = resources[lang]['manager/chat'];
  resources[lang]['funnel'] = resources[lang]['manager/Funnel'];
  resources[lang]['messages'] = resources[lang]['manager/Messages'];
  resources[lang]['managerSettings'] = resources[lang]['manager/Settings'];
  resources[lang]['managerDashboard'] = resources[lang]['manager/Dashboard'];

  // Employee pages
  resources[lang]['employeeDashboard'] = resources[lang]['employee/Dashboard'];
  resources[lang]['employeeProfile'] = resources[lang]['employee/Profile'];

  // Auth pages
  resources[lang]['login'] = resources[lang]['auth/Login'];
  resources[lang]['register'] = resources[lang]['auth/Register'];
  resources[lang]['forgotPassword'] = resources[lang]['auth/ForgotPassword'];

  // Public pages - add both full path and short aliases
  resources[lang]['about'] = resources[lang]['public/About'];
  resources[lang]['contacts'] = resources[lang]['public/Contacts'];
  resources[lang]['cooperation'] = resources[lang]['public/Cooperation'];
  resources[lang]['dataDeletion'] = resources[lang]['public/DataDeletion'];
  resources[lang]['datadeletion'] = resources[lang]['public/DataDeletion'];
  resources[lang]['faq'] = resources[lang]['public/faq'];
  resources[lang]['home'] = resources[lang]['public/home'];
  resources[lang]['priceList'] = resources[lang]['public/pricelist'];
  resources[lang]['pricelist'] = resources[lang]['public/pricelist'];
  resources[lang]['privacyPolicy'] = resources[lang]['public/privacypolicy'];
  resources[lang]['success'] = resources[lang]['public/success'];
  resources[lang]['terms'] = resources[lang]['public/terms'];
  resources[lang]['userCabinet'] = resources[lang]['public/UserCabinet'];
  resources[lang]['usercabinet'] = resources[lang]['public/UserCabinet'];
  resources[lang]['public'] = resources[lang]['public/public'];

  // Additional namespaces used in public pages
  resources[lang]['stats'] = resources[lang]['public/About']; // Stats are in About page
  resources[lang]['cta'] = resources[lang]['public/About']; // CTA is in About page

  // Layouts
  resources[lang]['adminLayout'] = resources[lang]['layouts/AdminLayout'];
  resources[lang]['employeeLayout'] = resources[lang]['layouts/EmployeeLayout'];
  resources[lang]['managerLayout'] = resources[lang]['layouts/ManagerLayout'];
  resources[lang]['publicLayout'] = resources[lang]['layouts/PublicLayout'];

  // Components
  resources[lang]['languageSwitcher'] = resources[lang]['components/LanguageSwitcher'];
  resources[lang]['publicLanguageSwitcher'] = resources[lang]['components/PublicLanguageSwitcher'];
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'ru',
    defaultNS: 'common',
    ns: namespaces,
    interpolation: {
      escapeValue: false
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage']
    }
  });

// Auto-detect language based on country (only on first visit)
autoDetectAndSetLanguage().then((detectedLang) => {
  if (i18n.language !== detectedLang) {
    i18n.changeLanguage(detectedLang);
  }
});

export default i18n;