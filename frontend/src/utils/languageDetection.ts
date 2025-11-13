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
  try {
    const response = await fetch('https://ipapi.co/json/');
    const data: CountryDetectionResult = await response.json();
    return data.country_code;
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

  // Final fallback → Russian
  return 'ru';
}

export async function autoDetectAndSetLanguage(): Promise<string> {
  // Check if language is already set in localStorage
  const savedLanguage = localStorage.getItem('i18nextLng');
  if (savedLanguage) {
    return savedLanguage;
  }

  // Detect country and set language
  const countryCode = await detectCountry();
  if (countryCode) {
    const language = getLanguageForCountry(countryCode);
    localStorage.setItem('i18nextLng', language);
    return language;
  }

  // Fallback to browser language or Russian
  const browserLang = navigator.language.split('-')[0];
  const supportedLanguages = ['ru', 'en', 'es', 'ar', 'hi', 'kk', 'pt', 'fr', 'de'];
  const finalLang = supportedLanguages.includes(browserLang) ? browserLang : 'ru';
  localStorage.setItem('i18nextLng', finalLang);
  return finalLang;
}
