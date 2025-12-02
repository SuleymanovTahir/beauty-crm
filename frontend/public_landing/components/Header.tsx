// /frontend/public_landing/components/Header.tsx
import { useState, useEffect } from "react";
import { Menu, X, Globe, Instagram } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import logo from "../assets/logo.webp";

const navigation = [
  { name: "Главная", href: "#home", key: "homeTag", defaultText: "Главная" },
  { name: "Услуги", href: "#services", key: "servicesTag", defaultText: "Услуги" },
  { name: "Портфолио", href: "#portfolio", key: "portfolioTag", defaultText: "Портфолио" },
  { name: "Команда", href: "#team", key: "teamTag", defaultText: "Команда" },
  { name: "Отзывы", href: "#testimonials", key: "testimonialsTag", defaultText: "Отзывы" },
  { name: "FAQ", href: "#faq", key: "faqTag", defaultText: "FAQ" },
  { name: "Контакты", href: "#contacts", key: "contactsTag", defaultText: "Контакты" },
];

interface HeaderProps {
  salonInfo?: any;
}

export function Header({ salonInfo: propSalonInfo }: HeaderProps) {
  const { t, i18n } = useTranslation(['public_landing', 'common']);
  const language = i18n.language;
  const changeLanguage = (lang: string) => i18n.changeLanguage(lang);
  const [salonInfo, setSalonInfo] = useState(propSalonInfo || {});
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);

  const languages = [
    { code: 'ru', name: 'Русский', flag: '🇷🇺', short: 'RU' },
    { code: 'en', name: 'English', flag: '🇬🇧', short: 'EN' },
    { code: 'ar', name: 'العربية', flag: '🇦🇪', short: 'AR' },
    { code: 'es', name: 'Español', flag: '🇪🇸', short: 'ES' },
    { code: 'de', name: 'Deutsch', flag: '🇩🇪', short: 'DE' },
    { code: 'fr', name: 'Français', flag: '🇫🇷', short: 'FR' },
    { code: 'hi', name: 'हिन्दी', flag: '🇮🇳', short: 'HI' },
    { code: 'kk', name: 'Қазақша', flag: '🇰🇿', short: 'KZ' },
    { code: 'pt', name: 'Português', flag: '🇵🇹', short: 'PT' }
  ];

  useEffect(() => {
    // Fetch salon info if not provided
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

  // Close language menu when clicking outside
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

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ?
        // "bg-background/95 backdrop-blur-sm shadow-sm" : "bg-transparent"
        "bg-background/95 backdrop-blur-sm shadow-sm" : "bg-background/5 backdrop-blur-sm shadow-sm"
        }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <div className="flex-shrink-0">
            <a href="/" className="block">
              <img
                src={logo}
                alt={salonInfo?.name || "Logo"}
                className="h-12 w-auto object-contain"
              />
            </a>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-8">
            {navigation.map((item) => (
              <a
                key={item.name}
                href={item.href}
                onClick={(e) => {
                  e.preventDefault();
                  const element = document.querySelector(item.href);
                  if (element) {
                    const headerOffset = 80; // Height of fixed header
                    const elementPosition = element.getBoundingClientRect().top;
                    const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

                    window.scrollTo({
                      top: offsetPosition,
                      behavior: "smooth"
                    });
                  }
                }}
                className={`text-sm transition-colors duration-200 lowercase ${isScrolled ? "text-primary hover:text-primary/80" : "text-primary hover:text-primary/80"
                  }`}
              >
                {t(item.key, { defaultValue: item.defaultText }) || item.name}
              </a>
            ))}

            {/* Language Switcher Dropdown */}
            <div className="relative language-switcher">
              <button
                onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
                className="flex items-center gap-2 px-3 py-2 rounded-full hover:bg-black/5 transition-colors"
              >
                <Globe className="w-4 h-4 text-primary" />
                <span className="text-sm uppercase text-primary">{language}</span>
              </button>
              {isLangMenuOpen && (
                <div className="absolute right-0 top-full mt-2 bg-white rounded-lg shadow-lg overflow-hidden w-max min-w-[60px] py-1 z-50">
                  {languages.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => {
                        changeLanguage(lang.code as any);
                        setIsLangMenuOpen(false);
                      }}
                      className={`block w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-1.5 text-primary ${language === lang.code ? 'bg-gray-50 font-medium' : ''
                        }`}
                    >
                      <span className="text-lg leading-none">{lang.flag}</span>
                      {lang.short}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Social Icons */}
            <div className="flex items-center gap-4">
              {salonInfo?.instagram && (
                <a
                  href={salonInfo.instagram.startsWith('http') ? salonInfo.instagram : `https://instagram.com/${salonInfo.instagram.replace('@', '').replace('https://instagram.com/', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:text-primary/80 transition-colors"
                >
                  <Instagram className="w-5 h-5" />
                </a>
              )}
              {salonInfo?.whatsapp && (
                <a
                  href={`https://wa.me/${salonInfo.whatsapp.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:text-primary/80 transition-colors"
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
                    className="w-[22px] h-[22px]"
                  >
                    <path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21" />
                    <path d="M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1a5 5 0 0 0 5 5h1a.5.5 0 0 0 0-1h-1a.5.5 0 0 0 0 1" />
                  </svg>
                </a>
              )}
            </div>

            <Button
              onClick={() => {
                document.getElementById("booking")?.scrollIntoView({ behavior: "smooth" });
              }}
              className="hero-button-primary"
            >
              {t('bookingTag') || 'Записаться'}
            </Button>
          </nav>

          {/* Mobile Menu Button */}
          <button
            className="lg:hidden p-2"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X size={24} className="text-primary" /> : <Menu size={24} className="text-primary" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <nav className="lg:hidden pb-6 space-y-4 bg-background px-4 rounded-b-2xl shadow-lg absolute left-0 right-0 top-20 border-t">
            {navigation.map((item) => (
              <a
                key={item.name}
                href={item.href}
                className="block text-sm text-primary hover:text-primary/80 transition-colors duration-200 py-2"
                onClick={(e) => {
                  e.preventDefault();
                  setIsMobileMenuOpen(false);
                  const element = document.querySelector(item.href);
                  if (element) {
                    const headerOffset = 80;
                    const elementPosition = element.getBoundingClientRect().top;
                    const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

                    window.scrollTo({
                      top: offsetPosition,
                      behavior: "smooth"
                    });
                  }
                }}
              >
                {t(item.key, { defaultValue: item.defaultText }) || item.name}
              </a>
            ))}

            {/* Mobile Language Switcher */}
            <div className="py-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Язык / Language</p>
              <div className="grid grid-cols-3 gap-2">
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      changeLanguage(lang.code as any);
                    }}
                    className={`px-2 py-1.5 rounded text-xs flex items-center justify-center gap-1 ${language === lang.code
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary hover:bg-secondary/80'
                      }`}
                  >
                    <span>{lang.flag}</span>
                    <span>{lang.short}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Mobile Social Icons */}
            <div className="flex justify-center gap-6 py-4 border-t border-border/50">
              {salonInfo?.instagram && (
                <a
                  href={salonInfo.instagram.startsWith('http') ? salonInfo.instagram : `https://instagram.com/${salonInfo.instagram.replace('@', '').replace('https://instagram.com/', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:text-primary/80 transition-colors"
                >
                  <Instagram className="w-6 h-6" />
                </a>
              )}
              {salonInfo?.whatsapp && (
                <a
                  href={`https://wa.me/${salonInfo.whatsapp.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:text-primary/80 transition-colors"
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
                    className="w-7 h-7"
                  >
                    <path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21" />
                    <path d="M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1a5 5 0 0 0 5 5h1a.5.5 0 0 0 0-1h-1a.5.5 0 0 0 0 1" />
                  </svg>
                </a>
              )}
            </div>

            <Button
              onClick={() => {
                setIsMobileMenuOpen(false);
                document.getElementById("booking")?.scrollIntoView({ behavior: "smooth" });
              }}
              className="w-full hero-button-primary"
            >
              {t('bookingTag') || 'Записаться'}
            </Button>
          </nav>
        )}
      </div>
    </header>
  );
}
