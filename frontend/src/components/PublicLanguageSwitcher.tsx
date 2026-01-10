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
        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl hover:shadow-md transition-all h-10 shadow-sm"
      >
        <Globe className="w-4 h-4 text-slate-500" />
        <span className="text-lg">{currentLang.flag}</span>
        <span className="text-sm font-bold text-slate-700 hidden sm:inline">{currentLang.name}</span>
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
              className={`w-full px-4 py-2.5 text-left hover:bg-gray-50 flex items-center gap-3 transition-colors ${i18n.language === lang.code ? 'bg-blue-50 font-medium' : ''
                }`}
            >
              <span className="text-xl">{lang.flag}</span>
              <span className={`text-sm flex-1 ${i18n.language === lang.code ? 'text-blue-700' : 'text-gray-700'}`}>
                {lang.name}
              </span>
              {i18n.language === lang.code && (
                <span className="text-blue-600 text-sm">✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}