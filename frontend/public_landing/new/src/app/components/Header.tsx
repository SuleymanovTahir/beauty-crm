import { useState, useEffect } from "react";
import { Menu, X, Globe, Instagram, User } from "lucide-react";
import { Button } from "./ui/button";
import { motion, AnimatePresence } from "motion/react";
import { useTranslation } from "react-i18next";
import logo from "../../assets/logo.png"; // Assuming path needs adjustment or use absolute if needed, but relative usually works if structure similar. Check logo path.

const navigation = [
  { name: "Главная", href: "#home", key: "homeTag", defaultText: "Главная" },
  { name: "Услуги", href: "#services", key: "servicesTag", defaultText: "Услуги" },
  { name: "Портфолио", href: "#portfolio", key: "portfolioTag", defaultText: "Портфолио" },
  { name: "Команда", href: "#team", key: "teamTag", defaultText: "Команда" },
  { name: "Отзывы", href: "#testimonials", key: "testimonialsTag", defaultText: "Отзывы" },
  { name: "FAQ", href: "#faq", key: "faqTag", defaultText: "FAQ" },
  { name: "Контакты", href: "#map-section", key: "contactsTag", defaultText: "Контакты" }, // Kept #map-section from new
];

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

  useEffect(() => {
    // Fetch salon info if not provided
    if (!propSalonInfo || Object.keys(propSalonInfo).length === 0) {
      const API_URL = import.meta.env.VITE_API_URL || window.location.origin;
      fetch(`${API_URL}/api/public/salon-info?language=${language}`)
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

      const sections = navigation.map(item => item.href.substring(1));
      let current = "";
      for (const section of sections) {
        const element = document.getElementById(section);
        if (element) {
          const rect = element.getBoundingClientRect();
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

  const handleScrollTo = (e: React.MouseEvent, href: string) => {
    e.preventDefault();
    setIsMobileMenuOpen(false);
    setActiveSection(href);
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
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? "bg-background/95 backdrop-blur-sm shadow-sm" : "bg-background/5 backdrop-blur-sm shadow-sm"
          }`}
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
          <div className="flex justify-between items-center h-16 sm:h-20">
            <div className="flex-shrink-0">
              <a href="/" className="block">
                {/* <div className="text-xl sm:text-2xl font-bold text-primary">Beauty Salon</div> */}
                <img
                  src={logo} // Use imported logo
                  alt={salonInfo?.name || "Logo"}
                  className="h-10 sm:h-12 w-auto object-contain"
                />
              </a>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-6">
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
                }
                .nav-item:hover::after,
                .nav-item.active::after {
                  width: 100%;
                }
              `}</style>
              {navigation.map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  onClick={(e) => handleScrollTo(e, item.href)}
                  className={`nav-item text-xs xl:text-sm transition-colors duration-200 ${activeSection === item.href ? "active text-primary" : "text-primary hover:text-primary/80"
                    }`}
                >
                  {t(item.key, { defaultValue: item.defaultText }) || item.name}
                </a>
              ))}

              {/* Language Switcher */}
              <div className="relative language-switcher">
                <button
                  onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
                  className="flex items-center gap-1.5 px-2 py-1.5 rounded-full hover:bg-black/5 transition-colors"
                >
                  <Globe className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs uppercase text-primary">{language}</span>
                </button>
                {isLangMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 bg-white rounded-lg shadow-lg overflow-hidden w-max min-w-[60px] py-1 z-50">
                    {languages.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => {
                          changeLanguage(lang.code);
                          setIsLangMenuOpen(false);
                        }}
                        className={`block w-full px-3 py-2 text-left text-xs hover:bg-gray-50 flex items-center gap-1.5 text-primary ${language === lang.code ? 'bg-gray-50 font-medium' : ''
                          }`}
                      >
                        <span className="text-base leading-none">{lang.flag}</span>
                        {lang.short}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Social Icons */}
              <div className="flex items-center gap-3">
                {salonInfo?.instagram && (
                  <a
                    href={salonInfo.instagram?.startsWith('http') ? salonInfo.instagram : `https://${salonInfo.instagram?.replace(/^(https?:\/\/)?(www\.)?/, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:text-primary/80 transition-colors"
                  >
                    <Instagram className="w-4 h-4" />
                  </a>
                )}
              </div>

              {/* User Account */}
              <Button
                onClick={() => window.location.href = '/#/login'}
                variant="outline"
                size="sm"
                className="border-primary text-primary hover:bg-primary hover:text-primary-foreground h-8 text-xs"
              >
                <User className="w-3.5 h-3.5 mr-1.5" />
                {t('login', { defaultValue: 'Войти' })}
              </Button>

              <Button
                onClick={() => {
                  document.getElementById("booking")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="hero-button-primary h-8 text-xs"
                size="sm"
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
                <X size={20} className="text-primary" />
              ) : (
                <Menu size={20} className="text-primary" />
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
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/20 backdrop-blur-sm"
              onClick={() => setIsMobileMenuOpen(false)}
            />

            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute top-0 right-0 bottom-0 w-72 max-w-[85vw] bg-white shadow-2xl flex flex-col"
            >
              <div className="flex-none h-16 w-full" />

              <nav className="flex-1 overflow-y-auto p-4">
                <div className="space-y-1.5">
                  {navigation.map((item, index) => (
                    <motion.a
                      key={item.name}
                      href={item.href}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={(e) => handleScrollTo(e, item.href)}
                      className="block w-full px-3 py-2.5 rounded-lg hover:bg-black/5 text-primary transition-all group"
                    >
                      <span className="flex items-center justify-between">
                        <span className="lowercase text-lg font-medium">{t(item.key, { defaultValue: item.defaultText }) || item.name}</span>
                        <span className="text-primary/50 group-hover:text-primary group-hover:translate-x-1 transition-all text-sm">
                          →
                        </span>
                      </span>
                    </motion.a>
                  ))}
                </div>

                <div className="mt-6 pt-4 border-t border-border/10">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">
                    Язык / Language
                  </p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {languages.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => changeLanguage(lang.code)}
                        className={`px-2 py-1.5 rounded-lg text-xs flex flex-col items-center justify-center gap-0.5 transition-all ${language === lang.code
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-secondary hover:bg-secondary/80 text-primary'
                          }`}
                      >
                        <span className="text-base">{lang.flag}</span>
                        <span className="text-[9px]">{lang.short}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </nav>

              <div className="flex-none p-4 border-t border-border/10 bg-gray-50/50">
                <div className="space-y-2.5">
                  <Button
                    onClick={() => window.location.href = '/login'}
                    variant="outline"
                    className="w-full border-primary text-primary hover:bg-primary hover:text-primary-foreground h-9 text-sm"
                  >
                    <User className="w-4 h-4 mr-2" />
                    {t('login', { defaultValue: 'Войти' })}
                  </Button>
                  <Button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      document.getElementById("booking")?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className="w-full hero-button-primary h-9 text-sm"
                  >
                    {t('bookingTag') || 'Записаться'}
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}