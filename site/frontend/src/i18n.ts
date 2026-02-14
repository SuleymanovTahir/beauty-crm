import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { supportedLanguages } from '@site/utils/i18nUtils';

export const languages = supportedLanguages.map(l => l.code);
const namespaces = [
  'common',
  'account',
  'public',
  'auth/login',
  'auth/register',
  'auth/forgotpassword',
  'auth/reset_password',
  'auth/verify_email',
  'auth/verify',
  'layouts/mainlayout',
  'layouts/adminpanellayout',
  'components/languageswitcher',
  'components/publiclanguageswitcher',
  'public_landing',
  'public_landing/services',
  'public_landing/faq',
  'public_landing/banners',
  'booking',
  'dynamic',
  'adminpanel/dashboard',
  'adminpanel/loyaltymanagement',
  'adminpanel/notificationsdashboard',
  'adminpanel/photogallery',
  'adminpanel/featuremanagement'
];
const localeFiles = (import.meta as any).glob(
  [
    './locales/*/common.json',
    './locales/*/account.json',
    './locales/*/public.json',
    './locales/*/booking.json',
    './locales/*/dynamic.json',
    './locales/*/auth/*.json',
    './locales/*/layouts/*.json',
    './locales/*/components/*.json',
    './locales/*/public_landing.json',
    './locales/*/public_landing/*.json',
    './locales/*/adminpanel/*.json'
  ],
  { eager: true }
);

// Create a case-insensitive map of available locale files
const lowercaseLocaleFiles: Record<string, string> = {};
Object.keys(localeFiles).forEach(key => {
  lowercaseLocaleFiles[key.toLowerCase()] = key;
});

const resources: Record<string, any> = {};

for (const lang of languages) {
  resources[lang] = {};
  for (const ns of namespaces) {
    const standardKey = `./locales/${lang}/${ns}.json`;
    let key = standardKey;

    // Support for separate public_landing folder
    if (ns.startsWith('public_landing/')) {
      const cleanNs = ns.replace('public_landing/', '');
      const altKey = `./locales/public_landing/${lang}/${cleanNs}.json`;
      if (lowercaseLocaleFiles[altKey.toLowerCase()]) {
        key = lowercaseLocaleFiles[altKey.toLowerCase()];
      }
    } else {
      // Use the case-insensitive map to find the actual key
      if (lowercaseLocaleFiles[standardKey.toLowerCase()]) {
        key = lowercaseLocaleFiles[standardKey.toLowerCase()];
      }
    }

    if (localeFiles[key] && key !== standardKey || localeFiles[standardKey]) {
      const actualKey = localeFiles[key] ? key : standardKey;
      resources[lang][ns] = (localeFiles[actualKey] as any).default || localeFiles[actualKey];
    } else {
      resources[lang][ns] = {};
    }
  }

  // Auth aliases
  resources[lang]['login'] = resources[lang]['auth/login'];
  resources[lang]['register'] = resources[lang]['auth/register'];
  resources[lang]['forgotPassword'] = resources[lang]['auth/forgotpassword'];
  resources[lang]['resetPassword'] = resources[lang]['auth/reset_password'];
  resources[lang]['verifyEmail'] = resources[lang]['auth/verify_email'];

  // Components aliases
  resources[lang]['components/LanguageSwitcher'] = resources[lang]['components/languageswitcher'];
  resources[lang]['components/PublicLanguageSwitcher'] = resources[lang]['components/publiclanguageswitcher'];
  resources[lang]['languageSwitcher'] = resources[lang]['components/languageswitcher'];
  resources[lang]['publicLanguageSwitcher'] = resources[lang]['components/publiclanguageswitcher'];
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
      order: ['querystring', 'localStorage', 'navigator'],
      lookupQuerystring: 'lang',
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
