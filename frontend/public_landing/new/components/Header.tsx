import { useState, useEffect } from "react";
import { Menu, X, Globe, Instagram, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import logo from "../assets/logo.svg";
import { motion, AnimatePresence } from "motion/react";

const navigation = [
  { name: "Главная", href: "#home", key: "homeTag", defaultText: "Главная" },
  { name: "Услуги", href: "#services", key: "servicesTag", defaultText: "Услуги" },
  { name: "Портфолио", href: "#portfolio", key: "portfolioTag", defaultText: "Портфолио" },
  { name: "Команда", href: "#team", key: "teamTag", defaultText: "Команда" },
  { name: "Отзывы", href: "#testimonials", key: "testimonialsTag", defaultText: "Отзывы" },
  { name: "FAQ", href: "#faq", key: "faqTag", defaultText: "FAQ" },
  { name: "Контакты", href: "#location", key: "contactsTag", defaultText: "Контакты" },
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

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen]);

  const handleNavClick = (href: string) => {
    setIsMobileMenuOpen(false);
    const element = document.querySelector(href);
    if (element) {
      const headerOffset = 80;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth"
      });
    }
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? "bg-background/95 backdrop-blur-sm shadow-sm" : "bg-background/5 backdrop-blur-sm shadow-sm"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 sm:h-20">
          <div className="flex-shrink-0">
            <a href="/" className="block">
              <img
                src={logo}
                alt={salonInfo?.name || "Logo"}
                className="h-10 sm:h-12 w-auto object-contain"
              />
            </a>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-6 xl:gap-8">
            {navigation.map((item) => (
              <a
                key={item.name}
                href={item.href}
                onClick={(e) => {
                  e.preventDefault();
                  handleNavClick(item.href);
                }}
                className="text-sm transition-colors duration-200 lowercase text-primary hover:text-primary/80"
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
                      className={`block w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-1.5 text-primary ${
                        language === lang.code ? 'bg-gray-50 font-medium' : ''
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
                  href={salonInfo.instagram?.startsWith('http') ? salonInfo.instagram : `https://${salonInfo.instagram?.replace(/^(https?:\/\/)?(www\.)?/, '')}`}
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
              onClick={() => handleNavClick("#booking")}
              className="hero-button-primary"
            >
              {t('bookingTag') || 'Записаться'}
            </Button>
          </nav>

          {/* Mobile Menu Button */}
          <button
            className="lg:hidden p-2 rounded-lg hover:bg-primary/10 transition-colors"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label={isMobileMenuOpen ? "Закрыть меню" : "Открыть меню"}
          >
            <AnimatePresence mode="wait">
              {isMobileMenuOpen ? (
                <motion.div
                  key="close"
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <X size={24} className="text-primary" />
                </motion.div>
              ) : (
                <motion.div
                  key="menu"
                  initial={{ rotate: 90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: -90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Menu size={24} className="text-primary" />
                </motion.div>
              )}
            </AnimatePresence>
          </button>
        </div>
      </div>

      {/* Mobile Navigation - Full Screen Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="lg:hidden fixed inset-0 top-16 sm:top-20 bg-background z-40 overflow-y-auto"
          >
            <div className="px-4 py-6 space-y-6">
              {/* Navigation Links */}
              <nav className="space-y-1">
                {navigation.map((item, index) => (
                  <motion.a
                    key={item.name}
                    href={item.href}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="block text-lg font-medium text-primary hover:text-primary/80 transition-colors py-3 px-4 rounded-lg hover:bg-primary/5"
                    onClick={(e) => {
                      e.preventDefault();
                      handleNavClick(item.href);
                    }}
                  >
                    {t(item.key, { defaultValue: item.defaultText }) || item.name}
                  </motion.a>
                ))}
              </nav>

              {/* Mobile Language Switcher */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="py-4 border-t border-border/50"
              >
                <button
                  onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
                  className="flex items-center justify-between w-full text-sm text-muted-foreground uppercase tracking-wider mb-3 px-4"
                >
                  <span>Язык / Language</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${isLangMenuOpen ? 'rotate-180' : ''}`} />
                </button>
                
                <AnimatePresence>
                  {isLangMenuOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="grid grid-cols-3 gap-2 px-4 overflow-hidden"
                    >
                      {languages.map((lang) => (
                        <button
                          key={lang.code}
                          onClick={() => {
                            changeLanguage(lang.code as any);
                            setIsLangMenuOpen(false);
                          }}
                          className={`px-3 py-2.5 rounded-lg text-sm flex items-center justify-center gap-1.5 transition-all ${
                            language === lang.code
                              ? 'bg-primary text-primary-foreground shadow-md scale-105'
                              : 'bg-secondary hover:bg-secondary/80'
                          }`}
                        >
                          <span className="text-base">{lang.flag}</span>
                          <span className="font-medium">{lang.short}</span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Mobile Social Icons */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="flex justify-center gap-6 py-4 border-t border-border/50"
              >
                {salonInfo?.instagram && (
                  <a
                    href={salonInfo.instagram?.startsWith('http') ? salonInfo.instagram : `https://${salonInfo.instagram?.replace(/^(https?:\/\/)?(www\.)?/, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 rounded-full bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-all"
                  >
                    <Instagram className="w-6 h-6" />
                  </a>
                )}
                {salonInfo?.whatsapp && (
                  <a
                    href={`https://wa.me/${salonInfo.whatsapp.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 rounded-full bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-all"
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
                      className="w-6 h-6"
                    >
                      <path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21" />
                      <path d="M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1a5 5 0 0 0 5 5h1a.5.5 0 0 0 0-1h-1a.5.5 0 0 0 0 1" />
                    </svg>
                  </a>
                )}
              </motion.div>

              {/* Mobile CTA Button */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="pt-4"
              >
                <Button
                  onClick={() => handleNavClick("#booking")}
                  className="w-full hero-button-primary py-6 text-base"
                  size="lg"
                >
                  {t('bookingTag') || 'Записаться'}
                </Button>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}