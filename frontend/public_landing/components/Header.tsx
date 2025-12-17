import { useState, useEffect } from "react";
import { Menu, X, Globe, Instagram } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "motion/react";
import logo from "../assets/logo.png";

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
  const [activeSection, setActiveSection] = useState("");

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

      // Determine active section
      const sections = navigation.map(item => item.href.substring(1));
      let current = "";
      for (const section of sections) {
        const element = document.getElementById(section);
        if (element) {
          const rect = element.getBoundingClientRect();
          // Adjust detection zone to be more forgiving
          if (rect.top <= 150 && rect.bottom >= 150) {
            current = section;
            break;
          }
        }
      }
      if (current) setActiveSection("#" + current);
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

  // Handle scroll to section
  const handleScrollTo = (e: React.MouseEvent, href: string) => {
    e.preventDefault();
    setIsMobileMenuOpen(false);
    setActiveSection(href);
    const element = document.querySelector(href);
    if (element) {
      const headerOffset = 80; // Height of fixed header
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth"
      });
    }
  };

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ?
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
              <style>{`
                .nav-item {
                  position: relative;
                  padding-bottom: 4px;
                }
                .nav-item::after {
                  content: '';
                  position: absolute;
                  bottom: 0;
                  left: 0;
                  width: 0;
                  height: 2px;
                  background-color: #db2777;
                  transition: width 0.3s ease-in-out;
                  display: block;
                }
                .nav-item:hover::after {
                  width: 100%;
                }
                .nav-item.active::after {
                  width: 100%;
                }
              `}</style>
              {navigation.map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  onClick={(e) => handleScrollTo(e, item.href)}
                  className={`nav-item text-sm transition-colors duration-200 lowercase ${activeSection === item.href ? "active text-primary" : "text-primary hover:text-primary/80"
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
              className="lg:hidden p-2 relative z-50"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? (
                <X size={24} className="text-primary" />
              ) : (
                <Menu size={24} className="text-primary" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 lg:hidden"
          >
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/20 backdrop-blur-sm"
              onClick={() => setIsMobileMenuOpen(false)}
            />

            {/* Menu Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute top-0 right-0 bottom-0 w-80 max-w-[85vw] bg-white shadow-2xl flex flex-col"
            >
              <div className="flex-none p-6 border-b border-border/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <a href="/" onClick={() => setIsMobileMenuOpen(false)}>
                    <img
                      src={logo}
                      alt="Logo"
                      className="h-10 w-auto object-contain"
                    />
                  </a>
                </div>
                {/* Close button handled by header button, but spacing needed */}
                <div className="w-8"></div>
              </div>

              {/* Menu Items */}
              <nav className="flex-1 overflow-y-auto p-6">
                <div className="space-y-2">
                  {navigation.map((item, index) => (
                    <motion.a
                      key={item.name}
                      href={item.href}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={(e) => handleScrollTo(e, item.href)}
                      className="block w-full px-4 py-3 rounded-lg hover:bg-black/5 text-primary transition-all group"
                    >
                      <span className="flex items-center justify-between">
                        <span className="lowercase text-lg font-medium">{t(item.key, { defaultValue: item.defaultText }) || item.name}</span>
                        <span className="text-primary/50 group-hover:text-primary group-hover:translate-x-1 transition-all">
                          →
                        </span>
                      </span>
                    </motion.a>
                  ))}
                </div>

                {/* Language Grid */}
                <div className="mt-8 pt-6 border-t border-border/10">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">
                    Язык / Language
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {languages.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => changeLanguage(lang.code as any)}
                        className={`px-2 py-2 rounded-lg text-xs flex flex-col items-center justify-center gap-1 transition-all ${language === lang.code
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary hover:bg-secondary/80 text-primary'
                          }`}
                      >
                        <span className="text-lg">{lang.flag}</span>
                        <span className="text-[10px]">{lang.short}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </nav>

              {/* Footer */}
              <div className="flex-none p-6 border-t border-border/10 bg-gray-50/50">
                <div className="space-y-4">
                  <Button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      document.getElementById("booking")?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className="w-full hero-button-primary"
                  >
                    {t('bookingTag') || 'Записаться'}
                  </Button>

                  {/* Social Icons */}
                  <div className="flex justify-center gap-6">
                    {salonInfo?.instagram && (
                      <a
                        href={salonInfo.instagram?.startsWith('http') ? salonInfo.instagram : `https://${salonInfo.instagram?.replace(/^(https?:\/\/)?(www\.)?/, '')}`}
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
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
