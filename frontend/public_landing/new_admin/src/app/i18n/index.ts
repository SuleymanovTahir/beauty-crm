import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import ru from './locales/ru.json';
import es from './locales/es.json';
import ar from './locales/ar.json';
import hi from './locales/hi.json';
import kk from './locales/kk.json';
import pt from './locales/pt.json';
import fr from './locales/fr.json';
import de from './locales/de.json';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      ru: { translation: ru },
      es: { translation: es },
      ar: { translation: ar },
      hi: { translation: hi },
      kk: { translation: kk },
      pt: { translation: pt },
      fr: { translation: fr },
      de: { translation: de },
    },
    lng: 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
