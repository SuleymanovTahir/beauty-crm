import { ru, enUS, ar, es, fr, de, pt, hi, kk } from 'date-fns/locale';

export const supportedLanguages = [
    { code: 'ru', flag: '🇷🇺', name: 'Русский', locale: ru },
    { code: 'en', flag: '🇬🇧', name: 'English', locale: enUS },
    { code: 'es', flag: '🇪🇸', name: 'Español', locale: es },
    { code: 'ar', flag: '🇦🇪', name: 'العربية', locale: ar },
    { code: 'hi', flag: '🇮🇳', name: 'हिन्दी', locale: hi },
    { code: 'kk', flag: '🇰🇿', name: 'Қазақша', locale: kk },
    { code: 'pt', flag: '🇵🇹', name: 'Português', locale: pt },
    { code: 'fr', flag: '🇫🇷', name: 'Français', locale: fr },
    { code: 'de', flag: '🇩🇪', name: 'Deutsch', locale: de }
];

/**
 * Returns the date-fns locale for a given language code
 */
export function getDateLocale(lang: string) {
    const found = supportedLanguages.find(l => l.code === lang);
    return found ? found.locale : enUS;
}

/**
 * Returns a localized string or value from a data object
 */
export function getLocalizedValue(data: any, field: string, _lang: string) {
    if (!data) return '';
    if (typeof field !== 'string' || field.length === 0) return '';
    const value = data[field];
    return typeof value === 'string' ? value : (value ?? '');
}

/**
 * Handles service/master names using canonical fields only.
 */
export function getLocalizedName(data: any, _lang: string) {
    if (!data) return '';
    return data.full_name ?? data.name ?? data.username ?? '';
}
