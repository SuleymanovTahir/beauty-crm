import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

import ru from './locales/ru.json';
import en from './locales/en.json';

const LANGUAGE_KEY = '@beauty_crm_language';

const resources = {
  ru: { translation: ru },
  en: { translation: en },
};

// Get stored language or device language
async function getStoredLanguage(): Promise<string> {
  try {
    const stored = await AsyncStorage.getItem(LANGUAGE_KEY);
    if (stored && resources[stored as keyof typeof resources]) {
      return stored;
    }
  } catch (error) {
    console.error('Error getting stored language:', error);
  }

  // Fallback to device language
  const deviceLang = Localization.getLocales()[0]?.languageCode || 'ru';
  return resources[deviceLang as keyof typeof resources] ? deviceLang : 'ru';
}

// Initialize i18n
i18n.use(initReactI18next).init({
  resources,
  lng: 'ru', // Default, will be updated
  fallbackLng: 'ru',
  interpolation: {
    escapeValue: false,
  },
  react: {
    useSuspense: false,
  },
});

// Set language from storage
getStoredLanguage().then((lang) => {
  i18n.changeLanguage(lang);
});

// Export helper to change language
export async function setLanguage(lang: string): Promise<void> {
  if (resources[lang as keyof typeof resources]) {
    await AsyncStorage.setItem(LANGUAGE_KEY, lang);
    await i18n.changeLanguage(lang);
  }
}

// Export helper to get current language
export function getCurrentLanguage(): string {
  return i18n.language;
}

export default i18n;
