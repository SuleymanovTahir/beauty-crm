import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
// import { autoDetectAndSetLanguage } from './utils/languageDetection';

export const languages = ["ru", "en", "es", "ar", "hi", "kk", "pt", "fr", "de"];
const namespaces = [
  'common',
  'admin-components',
  'components',
  'admin/analytics',
  'admin/bookingdetail',
  'admin/bookings',
  'admin/botsettings',
  'admin/broadcasts',
  'admin/calendar',
  'admin/clientdetail',
  'admin/clients',
  'admin/createuser',
  'admin/dashboard',
  'admin/edituser',
  'admin/permissionmanagement',
  'admin/permissionstab',
  'admin/plans',
  'admin/PublicContent',
  'admin/services',
  'admin/settings',
  'admin/specialpackages',
  'admin/users',
  'admin/VisitorAnalytics',
  'manager/chat',
  'manager/dashboard',
  'manager/funnel',
  'manager/messages',
  'manager/settings',
  'employee/dashboard',
  'employee/profile',
  'public/about',
  'public/contacts',
  'public/cooperation',
  'public/datadeletion',
  'public/faq',
  'public/home',
  'public/pricelist',
  'public/privacypolicy',
  'public/success',
  'public/terms',
  'public/usercabinet',
  'public/public',
  'auth/login',
  'auth/register',
  'auth/forgotpassword',
  'layouts/adminlayout',
  'layouts/employeelayout',
  'layouts/managerlayout',
  'layouts/publiclayout',
  'components/languageswitcher',
  'components/employeelayout',
  'components/publiclanguageswitcher',
  'public_landing',
  'public_landing/services',
  'public_landing/faq',
  'public_landing/banners',
  'dynamic'
];
// Используем import.meta as any для обхода ошибки типов с Vite
const localeFiles = (import.meta as any).glob('./locales/**/*.json', { eager: true });

const resources: Record<string, any> = {};

for (const lang of languages) {
  resources[lang] = {};
  for (const ns of namespaces) {
    let key = `./locales/${lang}/${ns}.json`;

    // Support for separate public_landing folder
    if (ns.startsWith('public_landing/')) {
      const cleanNs = ns.replace('public_landing/', '');
      // Check if file exists in the separate folder: locales/public_landing/en/common.json
      const altKey = `./locales/public_landing/${lang}/${cleanNs}.json`;
      if (localeFiles[altKey]) {
        key = altKey;
      }
    }

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
  resources[lang]['calendar'] = resources[lang]['admin/calendar'];
  resources[lang]['clientDetail'] = resources[lang]['admin/clientdetail'];
  resources[lang]['clients'] = resources[lang]['admin/clients'];
  resources[lang]['createUser'] = resources[lang]['admin/createuser'];
  resources[lang]['dashboard'] = resources[lang]['admin/dashboard'];
  resources[lang]['editUser'] = resources[lang]['admin/edituser'];
  resources[lang]['services'] = resources[lang]['admin/services'];
  resources[lang]['settings'] = resources[lang]['admin/settings'];
  resources[lang]['specialPackages'] = resources[lang]['admin/specialpackages'];
  resources[lang]['users'] = resources[lang]['admin/users'];

  // Manager pages
  resources[lang]['chat'] = resources[lang]['manager/chat'];
  resources[lang]['funnel'] = resources[lang]['manager/funnel'];
  resources[lang]['messages'] = resources[lang]['manager/messages'];
  resources[lang]['managerSettings'] = resources[lang]['manager/settings'];
  resources[lang]['managerDashboard'] = resources[lang]['manager/dashboard'];

  // Employee pages
  resources[lang]['employeeDashboard'] = resources[lang]['employee/dashboard'];
  resources[lang]['employeeProfile'] = resources[lang]['employee/profile'];

  // Auth pages
  resources[lang]['login'] = resources[lang]['auth/login'];
  resources[lang]['register'] = resources[lang]['auth/register'];
  resources[lang]['forgotPassword'] = resources[lang]['auth/forgotpassword'];

  // Public pages - add both full path and short aliases
  resources[lang]['about'] = resources[lang]['public/about'];
  resources[lang]['contacts'] = resources[lang]['public/contacts'];
  resources[lang]['cooperation'] = resources[lang]['public/cooperation'];
  resources[lang]['dataDeletion'] = resources[lang]['public/datadeletion'];
  resources[lang]['datadeletion'] = resources[lang]['public/datadeletion'];
  resources[lang]['faq'] = resources[lang]['public/faq'];
  resources[lang]['home'] = resources[lang]['public/home'];
  resources[lang]['priceList'] = resources[lang]['public/pricelist'];
  resources[lang]['pricelist'] = resources[lang]['public/pricelist'];
  resources[lang]['privacyPolicy'] = resources[lang]['public/privacypolicy'];
  resources[lang]['success'] = resources[lang]['public/success'];
  resources[lang]['terms'] = resources[lang]['public/terms'];
  resources[lang]['userCabinet'] = resources[lang]['public/usercabinet'];
  resources[lang]['usercabinet'] = resources[lang]['public/usercabinet'];
  resources[lang]['public'] = resources[lang]['public/public'];

  // Additional namespaces used in public pages
  resources[lang]['stats'] = resources[lang]['public/about']; // Stats are in About page
  resources[lang]['cta'] = resources[lang]['public/about']; // CTA is in About page

  // Layouts
  resources[lang]['adminLayout'] = resources[lang]['layouts/adminlayout'];
  resources[lang]['employeeLayout'] = resources[lang]['layouts/employeelayout'];
  resources[lang]['managerLayout'] = resources[lang]['layouts/managerlayout'];
  resources[lang]['publicLayout'] = resources[lang]['layouts/publiclayout'];

  // Components
  resources[lang]['languageSwitcher'] = resources[lang]['components/languageswitcher'];
  resources[lang]['publicLanguageSwitcher'] = resources[lang]['components/publiclanguageswitcher'];
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: namespaces,
    interpolation: {
      escapeValue: false
    },
    detection: {
      order: ['localStorage'],
      caches: ['localStorage']
    }
  });

// Auto-detect language based on country (only on first visit)
// autoDetectAndSetLanguage().then((detectedLang) => {
//   if (i18n.language !== detectedLang) {
//     i18n.changeLanguage(detectedLang);
//   }
// });

export default i18n;