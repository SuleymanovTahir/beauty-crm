/**
 * Auto-detect language based on user's country
 */

// CIS countries (use Russian)
const CIS_COUNTRIES = ['RU', 'BY', 'KZ', 'UZ', 'KG', 'TJ', 'AM', 'AZ', 'MD', 'GE', 'TM'];

// Spanish-speaking countries
const SPANISH_COUNTRIES = [
  'ES', 'MX', 'AR', 'CO', 'VE', 'CL', 'PE', 'EC', 'GT', 'CU', 'BO', 'DO',
  'HN', 'PY', 'SV', 'NI', 'CR', 'PA', 'UY', 'GQ'
];

// Portuguese-speaking countries
const PORTUGUESE_COUNTRIES = ['PT', 'BR', 'AO', 'MZ', 'GW', 'TL', 'CV', 'ST'];

// Arabic-speaking countries (excluding UAE)
const ARABIC_COUNTRIES = [
  'SA', 'EG', 'DZ', 'SD', 'IQ', 'MA', 'YE', 'SY', 'TN', 'JO', 'LY', 'LB',
  'PS', 'OM', 'KW', 'MR', 'QA', 'BH', 'DJ', 'KM'
];

interface CountryDetectionResult {
  country_code: string;
  country_name: string;
  languages?: string[];
}

export async function detectCountry(): Promise<string | null> {
  // Check cache first
  const cachedCountry = localStorage.getItem('user_country');
  if (cachedCountry) return cachedCountry;

  try {
    const response = await fetch('https://ipapi.co/json/');
    const data: CountryDetectionResult = await response.json();
    if (data.country_code) {
      localStorage.setItem('user_country', data.country_code);
      return data.country_code;
    }
    return null;
  } catch (error) {
    console.error('Country detection failed:', error);
    return null;
  }
}

export function getLanguageForCountry(countryCode: string): string {
  const code = countryCode.toUpperCase();

  // Dubai/UAE → English
  if (code === 'AE') {
    return 'en';
  }

  // CIS countries → Russian
  if (CIS_COUNTRIES.includes(code)) {
    return 'ru';
  }

  // Spanish-speaking countries → Spanish
  if (SPANISH_COUNTRIES.includes(code)) {
    return 'es';
  }

  // Portuguese-speaking countries → Portuguese
  if (PORTUGUESE_COUNTRIES.includes(code)) {
    return 'pt';
  }

  // Arabic-speaking countries → Arabic
  if (ARABIC_COUNTRIES.includes(code)) {
    return 'ar';
  }

  // Default fallback based on browser language
  const browserLang = navigator.language.split('-')[0];

  // Check if browser language is in our supported languages
  const supportedLanguages = ['ru', 'en', 'es', 'ar', 'hi', 'kk', 'pt', 'fr', 'de'];
  if (supportedLanguages.includes(browserLang)) {
    return browserLang;
  }

  // Final fallback → English
  return 'en';
}

export async function autoDetectAndSetLanguage(): Promise<string> {
  // Check if language is already set in localStorage
  const savedLanguage = localStorage.getItem('i18nextLng');
  if (savedLanguage) {
    return savedLanguage;
  }

  // FORCE ENGLISH BY DEFAULT for new users
  // We ignore browser language and IP detection to ensure the site starts in English
  const defaultLang = 'en';
  localStorage.setItem('i18nextLng', defaultLang);
  return defaultLang;
}

export function getSortedLanguages(countryCode: string | null): string[] {
  const defaultOrder = ['ru', 'en', 'es', 'ar', 'hi', 'kk', 'pt', 'fr', 'de'];

  if (!countryCode) return defaultOrder;

  const code = countryCode.toUpperCase();
  let primaryLang = 'ru';

  // Determine primary language
  if (code === 'AE') primaryLang = 'ar';
  else if (code === 'KZ') primaryLang = 'kk';
  else if (CIS_COUNTRIES.includes(code)) primaryLang = 'ru';
  else if (SPANISH_COUNTRIES.includes(code)) primaryLang = 'es';
  else if (PORTUGUESE_COUNTRIES.includes(code)) primaryLang = 'pt';
  else if (ARABIC_COUNTRIES.includes(code)) primaryLang = 'ar';
  else if (['US', 'GB', 'CA', 'AU', 'NZ', 'IE'].includes(code)) primaryLang = 'en';

  // Create sorted list
  const sorted = [primaryLang];

  // If primary is not English and country is not English-speaking, add English second
  if (primaryLang !== 'en') {
    sorted.push('en');
  }

  // Add remaining languages
  defaultOrder.forEach(lang => {
    if (!sorted.includes(lang)) {
      sorted.push(lang);
    }
  });

  return sorted;
}
