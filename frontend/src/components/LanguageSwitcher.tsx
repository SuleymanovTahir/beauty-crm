// /frontend/src/components/LanguageSwitcher.tsx
import { Globe, ChevronUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useState, useEffect, useRef } from 'react';
import { detectCountry, getSortedLanguages } from '../utils/languageDetection';

const languages = [
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'ar', name: 'العربية', flag: '🇦🇪' },
  { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' },
  { code: 'kk', name: 'Қазақша', flag: '🇰🇿' },
  { code: 'pt', name: 'Português', flag: '🇵🇹' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' }
];

export default function LanguageSwitcher() {
  const { i18n, t } = useTranslation('components/LanguageSwitcher');
  const [open, setOpen] = useState(false);
  const [sortedLanguages, setSortedLanguages] = useState(languages);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const init = async () => {
      const country = await detectCountry();
      const sortedCodes = getSortedLanguages(country);

      const sorted = sortedCodes
        .map(code => languages.find(l => l.code === code))
        .filter((l): l is typeof languages[0] => !!l);

      setSortedLanguages(sorted);
    };
    init();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  const currentLang = languages.find(l => l.code === i18n.language) || languages[0];

  const handleLanguageChange = (code: string) => {
    i18n.changeLanguage(code);
    localStorage.setItem('i18nextLng', code);
    setOpen(false);
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        type="button"
        className="w-full flex items-center justify-between gap-2 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Globe className="w-5 h-5 text-gray-600" />
          <span className="text-xl">{currentLang.flag}</span>
        </div>
        <ChevronUp className={`w-4 h-4 text-gray-600 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown menu - opens upward */}
      {open && (
        <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden z-50 max-h-[300px] overflow-y-auto">
          {sortedLanguages.map(lang => (
            <button
              key={lang.code}
              onClick={() => handleLanguageChange(lang.code)}
              type="button"
              className={`w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center justify-between gap-3 transition-all ${
                i18n.language === lang.code
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : ''
              }`}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <span className="text-xl flex-shrink-0">{lang.flag}</span>
                <span className="text-sm truncate">{lang.name}</span>
              </div>
              {i18n.language === lang.code && (
                <span className="text-blue-600 flex-shrink-0">✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}