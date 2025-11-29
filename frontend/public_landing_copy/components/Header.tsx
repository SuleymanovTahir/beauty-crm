import { useState, useEffect } from "react";
import { Menu, X, Globe, Instagram, Phone } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { useLanguage } from "../LanguageContext";

const navigation = [
  { nameKey: "aboutTag", href: "#about" },
  { nameKey: "servicesTag", href: "#services" },
  { nameKey: "portfolioTag", href: "#portfolio" },
  { nameKey: "teamTag", href: "#team" },
  { nameKey: "testimonialsTag", href: "#testimonials" },
  { nameKey: "galleryTag", href: "#gallery" },
  { nameKey: "faqTag", href: "#faq" },
];

interface HeaderProps {
  salonInfo?: any;
}

export function Header({ salonInfo: propSalonInfo }: HeaderProps) {
  const { language, setLanguage: changeLanguage, t } = useLanguage();
  const [salonInfo, setSalonInfo] = useState(propSalonInfo || {});
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);

  const languages = [
    { code: 'ru', name: 'RU', fullName: 'Русский', flag: '🇷🇺' },
    { code: 'en', name: 'EN', fullName: 'English', flag: '🇬🇧' },
    { code: 'ar', name: 'AR', fullName: 'العربية', flag: '🇦🇪' },
    { code: 'es', name: 'ES', fullName: 'Español', flag: '🇪🇸' },
    { code: 'de', name: 'DE', fullName: 'Deutsch', flag: '🇩🇪' },
    { code: 'fr', name: 'FR', fullName: 'Français', flag: '🇫🇷' },
    { code: 'hi', name: 'HI', fullName: 'हिन्दी', flag: '🇮🇳' },
    { code: 'kk', name: 'KK', fullName: 'Қазақша', flag: '🇰🇿' },
    { code: 'pt', name: 'PT', fullName: 'Português', flag: '🇵🇹' }
  ];

  useEffect(() => {
    if (!propSalonInfo || Object.keys(propSalonInfo).length === 0) {
      fetch(`/api/public/salon-info?language=${language}`)
        .then(res => res.json())
        .then(setSalonInfo)
        .catch(err => console.error('Error loading salon info:', err));
    } else {
      setSalonInfo(propSalonInfo);
    }
  }, [propSalonInfo, language]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.language-switcher')) {
        setIsLangMenuOpen(false);
      }
    };

    if (isLangMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isLangMenuOpen]);

  const currentLang = languages.find(l => l.code === language) || languages[0];

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled ? "bg-background/95 backdrop-blur-md shadow-lg border-b border-border/50" : "bg-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 lg:h-20">
            {/* Logo */}
            <div className="flex-shrink-0">
              <a href="/" className="block">
                {salonInfo?.logo_url ? (
                  <img
                    src={salonInfo.logo_url}
                    alt={salonInfo?.name || "Logo"}
                    className="h-10 lg:h-14 w-auto object-contain"
                  />
                ) : (
                  <div className="text-xl lg:text-2xl tracking-tight">
                    <span className="text-primary">{salonInfo?.name || "Beauty"}</span>
                    <span className="text-foreground">Salon</span>
                  </div>
                )}
              </a>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden xl:flex items-center gap-6">
              {navigation.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className={`text-sm whitespace-nowrap transition-colors duration-200 hover:text-primary ${
                    isScrolled ? "text-foreground/80" : "text-foreground/90"
                  }`}
                >
                  {t(item.nameKey, { defaultValue: item.href.replace('#', '') })}
                </a>
              ))}
            </nav>

            {/* Desktop Actions */}
            <div className="hidden lg:flex items-center gap-3">
              {/* Language Switcher */}
              <div className="relative language-switcher">
                <button
                  onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <Globe className="w-4 h-4" />
                  <span className="text-sm uppercase">{currentLang.name}</span>
                </button>
                {isLangMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 bg-card rounded-xl shadow-lg overflow-hidden min-w-[180px] py-2 z-50 border border-border/50">
                    {languages.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => {
                          changeLanguage(lang.code as any);
                          setIsLangMenuOpen(false);
                        }}
                        className={`block w-full px-4 py-2.5 text-left text-sm hover:bg-muted/50 flex items-center gap-3 transition-colors ${
                          language === lang.code ? 'bg-muted/30' : ''
                        }`}
                      >
                        <span className="text-lg">{lang.flag}</span>
                        <span>{lang.fullName}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Phone Button */}
              {salonInfo?.phone && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.location.href = `tel:${salonInfo.phone}`}
                  className="gap-2 hidden xl:flex"
                >
                  <Phone className="w-4 h-4" />
                  {salonInfo.phone}
                </Button>
              )}

              {/* Book Button */}
              <Button
                onClick={() => {
                  document.getElementById("booking")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-md hover:shadow-lg transition-all"
                size="sm"
              >
                {t('bookingTag', { defaultValue: 'Записаться' })}
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="lg:hidden p-2 hover:bg-muted/50 rounded-lg transition-colors"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

          {/* Mobile Navigation */}
          {isMobileMenuOpen && (
            <nav className="lg:hidden pb-6 pt-4 space-y-1 bg-background/95 backdrop-blur-md rounded-b-2xl shadow-lg border-t border-border/50">
              {navigation.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="block text-sm text-foreground/80 hover:text-foreground hover:bg-muted/50 transition-colors duration-200 py-3 px-4 rounded-lg"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {t(item.nameKey, { defaultValue: item.href.replace('#', '') })}
                </a>
              ))}

              {/* Mobile Language Switcher */}
              <div className="px-4 pt-4 pb-2 border-t border-border/50">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">
                  {t('selectLanguage', { defaultValue: 'Язык' })}
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {languages.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => {
                        changeLanguage(lang.code as any);
                      }}
                      className={`px-2 py-2 rounded-lg text-xs flex flex-col items-center justify-center gap-1 transition-all ${
                        language === lang.code
                          ? 'bg-primary text-primary-foreground shadow-md'
                          : 'bg-muted/50 hover:bg-muted'
                      }`}
                    >
                      <span className="text-base">{lang.flag}</span>
                      <span className="text-xs">{lang.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Mobile Social & Contact */}
              <div className="px-4 pt-4 space-y-3 border-t border-border/50">
                {salonInfo?.phone && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.location.href = `tel:${salonInfo.phone}`}
                    className="w-full gap-2"
                  >
                    <Phone className="w-4 h-4" />
                    {salonInfo.phone}
                  </Button>
                )}

                <Button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    document.getElementById("booking")?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                  size="sm"
                >
                  {t('bookingTag', { defaultValue: 'Записаться' })}
                </Button>

                {/* Social Icons */}
                <div className="flex justify-center gap-4 pt-2">
                  {salonInfo?.instagram && (
                    <a
                      href={salonInfo.instagram.startsWith('http') ? salonInfo.instagram : `https://instagram.com/${salonInfo.instagram.replace('@', '').replace('https://instagram.com/', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-10 h-10 flex items-center justify-center rounded-full bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <Instagram className="w-5 h-5" />
                    </a>
                  )}
                  {salonInfo?.whatsapp && (
                    <a
                      href={`https://wa.me/${salonInfo.whatsapp.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-10 h-10 flex items-center justify-center rounded-full bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        width="24"
                        height="24"
                        stroke="currentColor"
                        strokeWidth="2"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="w-5 h-5"
                      >
                        <path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21" />
                        <path d="M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1a5 5 0 0 0 5 5h1a.5.5 0 0 0 0-1h-1a.5.5 0 0 0 0 1" />
                      </svg>
                    </a>
                  )}
                </div>
              </div>
            </nav>
          )}
        </div>
      </header>

      {/* Floating CTA Button for Mobile */}
      <div className="fixed bottom-6 right-6 lg:hidden z-40">
        <Button
          onClick={() => document.getElementById("booking")?.scrollIntoView({ behavior: "smooth" })}
          className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-xl rounded-full px-6 py-6 flex items-center gap-2"
          size="lg"
        >
          <span>{t('bookNow', { defaultValue: 'Записаться' })}</span>
        </Button>
      </div>
    </>
  );
}
