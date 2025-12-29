// /frontend/src/components/PublicLanguageSwitcher.tsx
import { Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useState, useRef, useEffect } from 'react';

import { supportedLanguages as languages } from '../utils/i18nUtils';

export default function PublicLanguageSwitcher() {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const currentLang = languages.find(l => l.code === i18n.language) || languages[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <Globe className="w-5 h-5 text-gray-600" />
        <span className="text-xl">{currentLang.flag}</span>
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 py-2 min-w-[200px] z-50">
          {languages.map(lang => (
            <button
              key={lang.code}
              onClick={() => {
                i18n.changeLanguage(lang.code);
                localStorage.setItem('i18nextLng', lang.code);
                setOpen(false);
              }}
              className={`w-full px-4 py-2.5 text-left hover:bg-gray-50 flex items-center gap-3 transition-colors ${i18n.language === lang.code ? 'bg-purple-50 font-medium' : ''
                }`}
            >
              <span className="text-xl">{lang.flag}</span>
              <span className={`text-sm flex-1 ${i18n.language === lang.code ? 'text-purple-700' : 'text-gray-700'}`}>
                {lang.name}
              </span>
              {i18n.language === lang.code && (
                <span className="text-purple-600 text-sm">✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}