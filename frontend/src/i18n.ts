import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const languages = ["ru","en","es","ar","hi","kk","pt","fr","de"];
const namespaces = ["common","auth","dashboard","clients","bookings","chat","analytics","services","settings","users","employee","manager","public","layouts"];

const resources: any = {};

for (const lang of languages) {
  resources[lang] = {};
  for (const ns of namespaces) {
    try {
      resources[lang][ns] = require(`./locales/${lang}/${ns}.json`);
    } catch (e) {
      console.warn(`Missing: ${lang}/${ns}.json`);
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
