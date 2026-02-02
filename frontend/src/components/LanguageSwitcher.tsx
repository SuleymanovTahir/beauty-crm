// /frontend/src/components/LanguageSwitcher.tsx
import { Globe, ChevronUp, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
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
  const { i18n } = useTranslation('components/LanguageSwitcher');
  const [open, setOpen] = useState(false);
  const [sortedLanguages, setSortedLanguages] = useState(languages);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
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

  // Calculate dropdown position when opening
  const updateDropdownPosition = useCallback(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const dropdownHeight = 300; // max-h-[300px]
      const dropdownWidth = 160; // Approximate width

      // Check if there's enough space above
      const spaceAbove = rect.top;
      const spaceBelow = window.innerHeight - rect.bottom;

      let top: number;
      if (spaceAbove >= dropdownHeight || spaceAbove > spaceBelow) {
        // Open upward
        top = rect.top - Math.min(dropdownHeight, spaceAbove - 8);
        // If opening upward, we need to adjust calculating max-height based on available space
        // if not enough space for full height
      } else {
        // Open downward
        top = rect.bottom + 8;
      }

      // Ensure dropdown doesn't go off-screen horizontally
      let left = rect.left;
      if (left + dropdownWidth > window.innerWidth) {
        left = window.innerWidth - dropdownWidth - 8;
      }

      // Also ensure it doesn't go off screen to the left
      if (left < 0) left = 8;

      setDropdownPosition({ top, left });
    }
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        buttonRef.current && !buttonRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      updateDropdownPosition();
      window.addEventListener('resize', updateDropdownPosition);
      window.addEventListener('scroll', updateDropdownPosition, true);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('resize', updateDropdownPosition);
      window.removeEventListener('scroll', updateDropdownPosition, true);
    };
  }, [open, updateDropdownPosition]);

  const currentLang = languages.find(l => l.code === i18n.language) || languages[0];

  const handleLanguageChange = (code: string) => {
    i18n.changeLanguage(code);
    localStorage.setItem('i18nextLng', code);
    setOpen(false);
  };

  const dropdown = open ? createPortal(
    <div
      ref={dropdownRef}
      className="fixed bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden w-max min-w-[140px] max-h-[300px] overflow-y-auto"
      style={{
        top: dropdownPosition.top,
        left: dropdownPosition.left,
        zIndex: 9999
      }}
    >
      {sortedLanguages.map(lang => (
        <button
          key={lang.code}
          onClick={() => handleLanguageChange(lang.code)}
          type="button"
          className={`w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center justify-between gap-3 transition-all ${i18n.language === lang.code
            ? 'bg-blue-50 text-blue-700 font-medium'
            : ''
            }`}
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <span className="text-xl flex-shrink-0">{lang.flag}</span>
            <span className="text-sm truncate">{lang.name}</span>
          </div>
          {i18n.language === lang.code && (
            <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />
          )}
        </button>
      ))}
    </div>,
    document.body
  ) : null;

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setOpen(!open)}
        type="button"
        className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg hover:bg-gray-50 transition-colors shadow-md border border-gray-200"
      >
        <Globe className="w-4 h-4 text-gray-600" />
        <span className="text-lg">{currentLang.flag}</span>
        <ChevronUp className={`w-4 h-4 text-gray-600 transition-transform ${open ? '' : 'rotate-180'}`} />
      </button>

      {dropdown}
    </div>
  );
}