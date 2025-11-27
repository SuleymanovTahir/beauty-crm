import { Globe, Phone } from "lucide-react";
import logoImage from "../../assets/294c370f335689b82fcbd9b38cf01af26370eed7.png";
import { useTranslation } from "react-i18next";

interface HeaderProps {
  salonInfo?: any;
}

export function Header({ salonInfo }: HeaderProps) {
  const { t, i18n } = useTranslation(['public_landing', 'common']);
  const language = i18n.language;

  const languages = [
    { code: 'ru', name: 'RU', flag: '🇷🇺' },
    { code: 'en', name: 'EN', flag: '🇬🇧' },
    { code: 'ar', name: 'AR', flag: '🇦🇪' },
    { code: 'es', name: 'ES', flag: '🇪🇸' },
    { code: 'de', name: 'DE', flag: '🇩🇪' },
    { code: 'fr', name: 'FR', flag: '🇫🇷' },
    { code: 'hi', name: 'HI', flag: '🇮🇳' },
    { code: 'kk', name: 'KK', flag: '🇰🇿' },
    { code: 'pt', name: 'PT', flag: '🇵🇹' }
  ];

  const setLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('i18nextLng', lang);
  };

  const scrollToSection = (sectionId: string) => {
    // If not on home page, navigate to home first
    if (window.location.pathname !== '/') {
      window.location.href = `/#${sectionId}`;
      return;
    }

    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 bg-[#c9c7bc]/95 backdrop-blur-md z-50 border-b border-[#b8a574]/20">
      <div className="container mx-auto px-6 lg:px-12">
        <div className="flex items-center justify-between h-20" dir={language === 'ar' ? 'rtl' : 'ltr'}>
          <div className="flex items-center gap-12">
            <a href="/" className="cursor-pointer">
              <img src={logoImage} alt="M Le Diamant" className="h-16" />
            </a>

            <nav className="hidden lg:flex items-center gap-8">
              <button onClick={() => scrollToSection('services-section')} className="text-[#2d2d2d] hover:text-[#b8a574] transition-colors text-sm">
                {t('nails', { defaultValue: 'Nails' })}
              </button>
              <button onClick={() => scrollToSection('services-section')} className="text-[#2d2d2d] hover:text-[#b8a574] transition-colors text-sm">
                {t('hair', { defaultValue: 'Hair' })}
              </button>
              <button onClick={() => scrollToSection('services-section')} className="text-[#2d2d2d] hover:text-[#b8a574] transition-colors text-sm">
                {t('brows', { defaultValue: 'Brows' })}
              </button>
              <button onClick={() => scrollToSection('pricing-section')} className="text-[#2d2d2d] hover:text-[#b8a574] transition-colors text-sm">
                {t('prices', { defaultValue: 'Prices' })}
              </button>
              <button onClick={() => scrollToSection('map-section')} className="text-[#2d2d2d] hover:text-[#b8a574] transition-colors text-sm">
                {t('contact', { defaultValue: 'Contact' })}
              </button>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            {salonInfo?.phone && (
              <a href={`tel:${salonInfo.phone}`} className="hidden md:flex items-center gap-2 px-4 py-2 bg-[#b8a574] text-white rounded-full hover:bg-[#a08f5f] transition-colors">
                <Phone className="w-4 h-4" />
                <span className="text-sm">{salonInfo.phone.startsWith('+') ? salonInfo.phone : `+${salonInfo.phone}`}</span>
              </a>
            )}

            {/* Social Media Icons */}
            <div className="hidden md:flex items-center gap-2">
              {salonInfo?.whatsapp && (
                <a href={`https://wa.me/${salonInfo.whatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-[#b8a574] transition-colors">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                  </svg>
                </a>
              )}
              {salonInfo?.instagram && (
                <a href={`https://instagram.com/${salonInfo.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-[#b8a574] transition-colors">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                  </svg>
                </a>
              )}
            </div>

            <div className="relative group">
              <button className="flex items-center gap-2 px-3 py-2 bg-white/50 rounded-full hover:bg-white transition-colors min-w-[80px] justify-center">
                <Globe className="w-4 h-4 text-[#2d2d2d]" />
                <span className="text-sm uppercase">{language}</span>
              </button>
              <div className="absolute right-0 top-full mt-2 bg-white rounded-lg shadow-lg overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all min-w-[120px] before:content-[''] before:absolute before:-top-2 before:left-0 before:right-0 before:h-2">
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => setLanguage(lang.code)}
                    className={`block w-full px-6 py-3 text-left hover:bg-[#f5f3f0] text-sm whitespace-nowrap ${language === lang.code ? 'bg-[#f5f3f0] font-semibold' : ''
                      }`}
                  >
                    {lang.flag} {lang.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}