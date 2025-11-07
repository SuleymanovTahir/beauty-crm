import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const languages = ["ru","en","es","ar","hi","kk","pt","fr","de"];
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

export default i18n;