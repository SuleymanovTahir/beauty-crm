import { useState, useEffect, useRef } from "react";
import { Menu, X, Globe, Instagram, User, ChevronDown, LogOut, Calendar, LayoutDashboard } from "lucide-react";
import { Button } from "./ui/button";
import { motion, AnimatePresence } from "motion/react";
import { useTranslation } from "react-i18next";
import { useAuth } from '../../src/contexts/AuthContext';
import { supportedLanguages } from "../../src/utils/i18nUtils";
import logo from "../styles/img/logo.png";

const navigation = [
  { name: "Главная", href: "#home", key: "homeTag", defaultText: "Главная" },
  { name: "Услуги", href: "#services", key: "servicesTag", defaultText: "Услуги" },
  { name: "Портфолио", href: "#portfolio", key: "portfolioTag", defaultText: "Портфолио" },
  { name: "Команда", href: "#team", key: "teamTag", defaultText: "Команда" },
  { name: "Отзывы", href: "#testimonials", key: "testimonialsTag", defaultText: "Отзывы" },
  { name: "FAQ", href: "#faq", key: "faqTag", defaultText: "FAQ" },
  { name: "Контакты", href: "#map-section", key: "contactsTag", defaultText: "Контакты" },
];

// Derive languages from utils
const languages = supportedLanguages.map(lang => ({
  ...lang,
  short: lang.code === 'kk' ? 'KZ' : lang.code.toUpperCase()
}));

interface HeaderProps {
  salonInfo?: any;
}

export function Header({ salonInfo: propSalonInfo }: HeaderProps) {
  const { t, i18n } = useTranslation(['public_landing', 'common', 'account']);
  const { user, logout } = useAuth();
  const language = i18n.language;
  const changeLanguage = (lang: string) => i18n.changeLanguage(lang);
  const [salonInfo, setSalonInfo] = useState(propSalonInfo || {});
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMobileUserMenuOpen, setIsMobileUserMenuOpen] = useState(false);
  const [isMobileLangMenuOpen, setIsMobileLangMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("");
  const langMenuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (langMenuRef.current && !langMenuRef.current.contains(event.target as Node)) {
        setIsLangMenuOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

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

  const location = window.location;
  const navigate = (path: string) => window.location.href = path;

  const handleScrollTo = (e: React.MouseEvent, href: string) => {
    e.preventDefault();
    setIsMobileMenuOpen(false);
    setActiveSection(href);

    if (location.pathname !== '/') {
      navigate(`/${href}`);
      return;
    }

    const element = document.querySelector(href);
    if (element) {
      const headerOffset = 80;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth"
      });

      // Update URL hash without jumping
      window.history.pushState(null, '', href);
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
                <img
                  src={salonInfo?.logo_url || logo}
                  alt={salonInfo?.name || "M Le Diamant"}
                  className="h-10 sm:h-12 w-auto object-contain"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    if (target.src !== logo) {
                      target.src = logo;
                    }
                  }}
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
                  background-color: var(--primary);
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
              <div className="relative language-switcher" ref={langMenuRef}>
                <button
                  onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
                  className="flex items-center gap-1.5 px-2 py-1.5 rounded-full hover:bg-black/5 transition-colors"
                >
                  <Globe className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs uppercase text-primary">{language}</span>
                </button>
                {isLangMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 bg-background rounded-lg shadow-lg overflow-hidden w-max min-w-[60px] py-1 z-50">
                    {languages.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => {
                          changeLanguage(lang.code);
                          setIsLangMenuOpen(false);
                        }}
                        className={`block w-full px-3 py-2 text-left text-xs hover:bg-muted/50 flex items-center gap-1.5 text-primary ${language === lang.code ? 'bg-muted/50 font-medium' : ''
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
                {(salonInfo?.whatsapp || salonInfo?.phone) && (
                  <a
                    href={`https://wa.me/${(salonInfo?.whatsapp || salonInfo?.phone)?.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-whatsapp hover:text-whatsapp-hover transition-colors"
                  >
                    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" xmlns="http://www.w3.org/2000/svg">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                    </svg>
                  </a>
                )}
              </div>

              {/* User Account */}
              {user ? (
                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    onMouseEnter={() => setIsUserMenuOpen(true)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/10 hover:border-primary/30 hover:bg-black/5 transition-all group"
                  >
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <span className="text-xs font-medium text-primary max-w-[100px] truncate">
                      {user.full_name || user.username}
                    </span>
                    <ChevronDown className={`w-3.5 h-3.5 text-primary/50 transition-transform duration-300 ${isUserMenuOpen ? 'rotate-180' : ''}`} />
                  </button>

                  <AnimatePresence>
                    {isUserMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        onMouseLeave={() => setIsUserMenuOpen(false)}
                        className="absolute right-0 top-full mt-2 w-48 bg-white/95 backdrop-blur-md border border-gray-100 rounded-2xl shadow-2xl overflow-hidden z-50 py-1.5"
                      >
                        <div className="px-4 py-2 border-b border-gray-50 mb-1">
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t('account:user_role', 'Клиент')}</p>
                          <p className="text-xs font-bold text-gray-900 truncate">{user.full_name || user.username}</p>
                        </div>

                        <button
                          onClick={() => window.location.href = '/account/dashboard'}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-xs text-gray-600 hover:text-primary hover:bg-primary/5 transition-all"
                        >
                          <LayoutDashboard className="w-4 h-4" />
                          <span>{t('account:tabs.dashboard', 'Личный кабинет')}</span>
                        </button>

                        <button
                          onClick={() => window.location.href = '/account/appointments'}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-xs text-gray-600 hover:text-primary hover:bg-primary/5 transition-all"
                        >
                          <Calendar className="w-4 h-4" />
                          <span>{t('account:tabs.appointments', 'Мои записи')}</span>
                        </button>

                        <div className="h-px bg-gray-50 my-1" />

                        <button
                          onClick={() => {
                            logout();
                            window.location.href = '/';
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-xs text-red-500 hover:bg-red-50 transition-all font-medium"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>{t('common:logout', 'Выйти')}</span>
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <Button
                  onClick={() => window.location.href = '/login'}
                  variant="outline"
                  size="sm"
                  className="border-primary/20 text-primary hover:bg-primary hover:text-primary-foreground h-8 text-xs rounded-full px-4"
                >
                  <User className="w-3.5 h-3.5 mr-1.5" />
                  {t('login', { defaultValue: 'Войти' })}
                </Button>
              )}

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
              className="absolute top-0 right-0 bottom-0 w-72 max-w-[85vw] bg-background shadow-2xl flex flex-col"
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
                  <button
                    onClick={() => setIsMobileLangMenuOpen(!isMobileLangMenuOpen)}
                    className="w-full flex items-center justify-between mb-2 group"
                  >
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">
                      {t('common:language', 'Язык / Language')}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-primary uppercase">
                        {languages.find(l => l.code === language)?.short || language}
                      </span>
                      <ChevronDown className={`w-3 h-3 text-muted-foreground transition-transform duration-300 ${isMobileLangMenuOpen ? 'rotate-180' : ''}`} />
                    </div>
                  </button>

                  <AnimatePresence>
                    {isMobileLangMenuOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="grid grid-cols-3 gap-1.5 pt-1">
                          {languages.map((lang) => (
                            <button
                              key={lang.code}
                              onClick={() => {
                                changeLanguage(lang.code);
                                // Optional: close menu after selection
                                // setIsMobileLangMenuOpen(false);
                              }}
                              className={`px-2 py-2.5 rounded-xl text-xs flex flex-col items-center justify-center gap-1 transition-all active:scale-95 ${language === lang.code
                                ? 'bg-primary text-primary-foreground shadow-md'
                                : 'bg-gray-50 hover:bg-gray-100 text-gray-600'
                                }`}
                            >
                              <span className="text-lg leading-none">{lang.flag}</span>
                              <span className="text-[10px] font-bold uppercase tracking-tight">{lang.short}</span>
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </nav>

              <div className="flex-none p-4 border-t border-border/10 bg-muted/20">
                <div className="space-y-2.5">
                  {/* Social Icons Mobile */}
                  <div className="flex items-center justify-center gap-6 mb-4">
                    {salonInfo?.instagram && (
                      <a
                        href={salonInfo.instagram?.startsWith('http') ? salonInfo.instagram : `https://${salonInfo.instagram?.replace(/^(https?:\/\/)?(www\.)?/, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:text-primary/80 transition-colors flex items-center gap-2"
                      >
                        <Instagram className="w-5 h-5" />
                        <span className="text-xs font-medium">Instagram</span>
                      </a>
                    )}
                    {/* WhatsApp */}
                    {(salonInfo?.whatsapp || salonInfo?.phone) && (
                      <a
                        href={`https://wa.me/${(salonInfo?.whatsapp || salonInfo?.phone)?.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-whatsapp hover:text-whatsapp-hover transition-colors flex items-center gap-2"
                      >
                        {/* WhatsApp SVG */}
                        <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" xmlns="http://www.w3.org/2000/svg">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                        </svg>
                        <span className="text-xs font-medium">WhatsApp</span>
                      </a>
                    )}
                  </div>

                  {user ? (
                    <div className="space-y-2">
                      {/* Premium User Card Trigger */}
                      <button
                        onClick={() => setIsMobileUserMenuOpen(!isMobileUserMenuOpen)}
                        className="w-full bg-primary/5 rounded-2xl p-4 flex items-center justify-between transition-all active:bg-primary/10"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 shadow-inner">
                            <User className="w-5 h-5 text-primary" />
                          </div>
                          <div className="text-left min-w-0">
                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">{t('account:user_role', 'Клиент')}</p>
                            <p className="text-sm font-bold text-gray-900 truncate">{user.full_name || user.username}</p>
                          </div>
                        </div>
                        <ChevronDown className={`w-4 h-4 text-primary/50 transition-transform duration-300 ${isMobileUserMenuOpen ? 'rotate-180' : ''}`} />
                      </button>

                      {/* Collapsible Actions */}
                      <AnimatePresence>
                        {isMobileUserMenuOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden space-y-1 pt-1"
                          >
                            <Button
                              onClick={() => window.location.href = '/account/dashboard'}
                              variant="ghost"
                              className="w-full h-11 text-xs justify-start hover:bg-primary/5 rounded-xl px-4 transition-all"
                            >
                              <LayoutDashboard className="w-4 h-4 mr-3 text-primary/70" />
                              <span className="font-medium text-gray-600">{t('account:tabs.dashboard', 'Личный кабинет')}</span>
                            </Button>
                            <Button
                              onClick={() => window.location.href = '/account/appointments'}
                              variant="ghost"
                              className="w-full h-11 text-xs justify-start hover:bg-primary/5 rounded-xl px-4 transition-all"
                            >
                              <Calendar className="w-4 h-4 mr-3 text-primary/70" />
                              <span className="font-medium text-gray-600">{t('account:tabs.appointments', 'Мои записи')}</span>
                            </Button>
                            <Button
                              onClick={() => {
                                logout();
                                window.location.href = '/';
                              }}
                              variant="ghost"
                              className="w-full h-11 text-xs justify-start text-red-500 hover:bg-red-50 rounded-xl px-4 transition-all"
                            >
                              <LogOut className="w-4 h-4 mr-3" />
                              <span className="font-medium">{t('common:logout', 'Выйти')}</span>
                            </Button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ) : (
                    <Button
                      onClick={() => window.location.href = '/login'}
                      variant="outline"
                      className="w-full border-primary/20 text-primary hover:bg-primary hover:text-primary-foreground h-11 text-sm font-bold rounded-xl transition-all active:scale-[0.98]"
                    >
                      <User className="w-4 h-4 mr-2" />
                      {t('login', { defaultValue: 'Войти' })}
                    </Button>
                  )}
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