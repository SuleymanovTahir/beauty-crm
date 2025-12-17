import { useState, useEffect } from 'react';
import { Menu, X, Globe, Instagram } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface HeaderProps {
  onNavigate: (section: string) => void;
  salonInfo?: any;
}

export function Header({ onNavigate, salonInfo }: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const [currentLang, setCurrentLang] = useState('RU');

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
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
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

  const menuItems = [
    { label: 'Главная', value: 'hero' },
    { label: 'Услуги', value: 'services' },
    { label: 'Портфолио', value: 'portfolio' },
    { label: 'Команда', value: 'team' },
    { label: 'Отзывы', value: 'reviews' },
    { label: 'FAQ', value: 'faq' },
    { label: 'Контакты', value: 'contacts' },
  ];

  const handleClick = (section: string) => {
    onNavigate(section);
    setIsMenuOpen(false);
  };

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? 'bg-background/95 backdrop-blur-md shadow-md' : 'bg-background/95 backdrop-blur-sm'
        }`}
      >
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
                <span className="text-primary-foreground font-serif text-xl">M</span>
              </div>
              <div>
                <h1 className="text-lg font-serif text-foreground">M Je Diamant</h1>
                <p className="text-xs text-primary">Beauty Studio</p>
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-8">
              {menuItems.map((item) => (
                <button
                  key={item.value}
                  onClick={() => handleClick(item.value)}
                  className="text-foreground hover:text-primary transition-colors relative group"
                >
                  {item.label}
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full"></span>
                </button>
              ))}

              {/* Language Switcher */}
              <div className="relative language-switcher">
                <button
                  onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
                  className="flex items-center gap-2 px-3 py-2 rounded-full hover:bg-muted transition-colors"
                >
                  <Globe className="w-4 h-4 text-primary" />
                  <span className="text-sm uppercase text-primary">{currentLang}</span>
                </button>
                {isLangMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 bg-card rounded-lg shadow-lg overflow-hidden w-max min-w-[60px] py-1 z-50 border border-border">
                    {languages.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => {
                          setCurrentLang(lang.short);
                          setIsLangMenuOpen(false);
                        }}
                        className={`block w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-1.5 text-foreground ${
                          currentLang === lang.short ? 'bg-muted font-medium' : ''
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
              {salonInfo?.instagram && (
                <a
                  href={salonInfo.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:text-primary/80 transition-colors"
                >
                  <Instagram className="w-5 h-5" />
                </a>
              )}
            </nav>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="lg:hidden p-2 hover:bg-muted rounded-lg transition-colors"
              aria-label="Toggle menu"
            >
              {isMenuOpen ? (
                <X className="w-6 h-6 text-primary" />
              ) : (
                <Menu className="w-6 h-6 text-primary" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
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
              onClick={() => setIsMenuOpen(false)}
            />

            {/* Menu Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute top-0 right-0 bottom-0 w-80 max-w-[85vw] bg-card shadow-2xl"
            >
              <div className="flex flex-col h-full">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-border">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                      <span className="text-primary-foreground font-serif">M</span>
                    </div>
                    <div>
                      <h2 className="font-serif text-foreground">M Je Diamant</h2>
                      <p className="text-xs text-primary">Beauty Studio</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsMenuOpen(false)}
                    className="p-2 hover:bg-muted rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-foreground" />
                  </button>
                </div>

                {/* Menu Items */}
                <nav className="flex-1 overflow-y-auto p-6">
                  <div className="space-y-2">
                    {menuItems.map((item, index) => (
                      <motion.button
                        key={item.value}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => handleClick(item.value)}
                        className="w-full text-left px-4 py-3 rounded-lg hover:bg-muted text-foreground hover:text-primary transition-all group"
                      >
                        <span className="flex items-center justify-between">
                          {item.label}
                          <span className="text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                            →
                          </span>
                        </span>
                      </motion.button>
                    ))}
                  </div>

                  {/* Language Grid */}
                  <div className="mt-6 pt-6 border-t border-border">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">
                      Язык / Language
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {languages.map((lang) => (
                        <button
                          key={lang.code}
                          onClick={() => setCurrentLang(lang.short)}
                          className={`px-2 py-2 rounded-lg text-xs flex flex-col items-center justify-center gap-1 transition-all ${
                            currentLang === lang.short
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted hover:bg-muted/80 text-foreground'
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
                <div className="p-6 border-t border-border">
                  <div className="space-y-3">
                    <button
                      onClick={() => handleClick('contacts')}
                      className="w-full py-3 bg-primary text-primary-foreground rounded-lg hover:shadow-lg transition-all"
                    >
                      Записаться
                    </button>
                    
                    {/* Social Icons */}
                    {salonInfo?.instagram && (
                      <div className="flex justify-center gap-4 pt-3">
                        <a
                          href={salonInfo.instagram}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:text-primary/80 transition-colors"
                        >
                          <Instagram className="w-6 h-6" />
                        </a>
                      </div>
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
