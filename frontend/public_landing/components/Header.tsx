import { useState, useEffect } from "react";
import { Menu, X, Globe, Instagram, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "../LanguageContext";
import logo from "../assets/logo.png";

const navigation = [
  { name: "О нас", href: "#about" },
  { name: "Услуги", href: "#services" },
  { name: "Портфолио", href: "#portfolio" },
  { name: "Команда", href: "#team" },
  { name: "Отзывы", href: "#testimonials" },
  { name: "Галерея", href: "#gallery" },
  { name: "FAQ", href: "#faq" },
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
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? "bg-background/95 backdrop-blur-sm shadow-sm" : "bg-transparent"
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
                className={`text-sm transition-colors duration-200 ${isScrolled ? "text-foreground/80 hover:text-foreground" : "text-foreground/80 hover:text-foreground"
                  }`}
              >
                {item.name}
              </a>
            ))}

            {/* Language Switcher Dropdown */}
            <div className="relative language-switcher">
              <button
                onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
                className="flex items-center gap-2 px-3 py-2 rounded-full hover:bg-black/5 transition-colors"
              >
                <Globe className="w-4 h-4" />
                <span className="text-sm uppercase">{language}</span>
              </button>
              {isLangMenuOpen && (
                <div className="absolute right-0 top-full mt-2 bg-white rounded-lg shadow-lg overflow-hidden min-w-[120px] py-1 z-50">
                  {languages.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => {
                        changeLanguage(lang.code as any);
                        setIsLangMenuOpen(false);
                      }}
                      className={`block w-full px-4 py-2 text-left text-sm hover:bg-gray-50 ${language === lang.code ? 'bg-gray-50 font-medium' : ''
                        }`}
                    >
                      <span className="mr-2">{lang.flag}</span>
                      {lang.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Social Icons */}
            <div className="flex items-center gap-4">
              {salonInfo?.instagram && (
                <a
                  href={salonInfo.instagram.startsWith('http') ? salonInfo.instagram : `https://instagram.com/${salonInfo.instagram.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-foreground/80 hover:text-foreground transition-colors"
                >
                  <Instagram className="w-5 h-5" />
                </a>
              )}
              {salonInfo?.whatsapp && (
                <a
                  href={`https://wa.me/${salonInfo.whatsapp.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-foreground/80 hover:text-foreground transition-colors"
                >
                  <MessageCircle className="w-5 h-5" />
                </a>
              )}
            </div>

            <Button
              onClick={() => {
                document.getElementById("booking")?.scrollIntoView({ behavior: "smooth" });
              }}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Записаться
            </Button>
          </nav>

          {/* Mobile Menu Button */}
          <button
            className="lg:hidden p-2"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <nav className="lg:hidden pb-6 space-y-4 bg-background px-4 rounded-b-2xl shadow-lg absolute left-0 right-0 top-20 border-t">
            {navigation.map((item) => (
              <a
                key={item.name}
                href={item.href}
                className="block text-sm text-foreground/80 hover:text-foreground transition-colors duration-200 py-2"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {item.name}
              </a>
            ))}

            {/* Mobile Language Switcher */}
            <div className="py-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Язык / Language</p>
              <div className="grid grid-cols-4 gap-2">
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
                    <span>{lang.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Mobile Social Icons */}
            <div className="flex justify-center gap-6 py-4 border-t border-border/50">
              {salonInfo?.instagram && (
                <a
                  href={salonInfo.instagram.startsWith('http') ? salonInfo.instagram : `https://instagram.com/${salonInfo.instagram.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-foreground/80 hover:text-foreground transition-colors"
                >
                  <Instagram className="w-6 h-6" />
                </a>
              )}
              {salonInfo?.whatsapp && (
                <a
                  href={`https://wa.me/${salonInfo.whatsapp.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-foreground/80 hover:text-foreground transition-colors"
                >
                  <MessageCircle className="w-6 h-6" />
                </a>
              )}
            </div>

            <Button
              onClick={() => {
                setIsMobileMenuOpen(false);
                document.getElementById("booking")?.scrollIntoView({ behavior: "smooth" });
              }}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Записаться
            </Button>
          </nav>
        )}
      </div>
    </header>
  );
}
