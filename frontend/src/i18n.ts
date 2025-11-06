import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const languages = ["ru","en","es","ar","hi","kk","pt","fr","de"];
const namespaces = ["common","auth","dashboard","clients","bookings","chat","analytics","services","settings","users","employee","manager","public","layouts"];

// Используем import.meta.glob для Vite
const localeFiles = import.meta.glob('./locales/**/*.json', { eager: true });

const resources: any = {};

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