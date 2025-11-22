import { Globe, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
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
  const { i18n, t } = useTranslation('components/LanguageSwitcher');
  const [open, setOpen] = useState(false);
  const [sortedLanguages, setSortedLanguages] = useState(languages);

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

  const currentLang = languages.find(l => l.code === i18n.language) || languages[0];

  const handleLanguageChange = (code: string) => {
    i18n.changeLanguage(code);
    localStorage.setItem('i18nextLng', code);
    setOpen(false);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        type="button"
        className="w-full flex items-center justify-between gap-2 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Globe className="w-5 h-5 text-gray-600" />
          <span className="text-xl">{currentLang.flag}</span>
        </div>
      </button>

      {open && createPortal(
        <>
          {/* Затемнённый фон */}
          <div
            className="fixed inset-0 bg-black/50 z-[9998] backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          {/* Modal окно */}
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div
              className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <div className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-purple-600" />
                  <h3 className="text-lg font-semibold text-gray-900">{t('select_language')}</h3>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Languages list */}
              <div className="overflow-y-auto max-h-[calc(80vh-80px)] p-2">
                {sortedLanguages.map(lang => (
                  <button
                    key={lang.code}
                    onClick={() => handleLanguageChange(lang.code)}
                    type="button"
                    className={`w-full px-4 py-3 text-left hover:bg-gray-50 rounded-lg flex items-center gap-3 transition-all ${i18n.language === lang.code
                      ? 'bg-purple-50 text-purple-700 font-medium border-2 border-purple-200'
                      : 'border-2 border-transparent'
                      }`}
                  >
                    <span className="text-2xl">{lang.flag}</span>
                    <span className="text-base">{lang.name}</span>
                    {i18n.language === lang.code && (
                      <span className="ml-auto text-purple-600">✓</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  );
}