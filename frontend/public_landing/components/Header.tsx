import { useState } from "react";
import { Menu, X, Globe } from "lucide-react";
import { Button } from "./ui/button";
import { useTranslation } from "react-i18next";

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

export function Header({ salonInfo }: HeaderProps) {
  const { i18n } = useTranslation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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


  return (
    <header
      className="fixed top-0 left-0 right-0 z-[9999] bg-background/95 backdrop-blur-sm shadow-sm transition-all duration-300"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <div className="flex-shrink-0">
            <span className="text-2xl tracking-tight font-serif text-primary transition-colors duration-300">
              {salonInfo?.name || "M. Le Diamant"}
            </span>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-8">
            {navigation.map((item) => (
              <a
                key={item.name}
                href={item.href.startsWith('#') ? `/${item.href}` : item.href}
                className="text-sm text-foreground/80 hover:text-foreground transition-colors duration-200"
              >
                {item.name}
              </a>
            ))}

            {/* Language Switcher Dropdown */}
            <div className="relative group">
              <button className="flex items-center gap-2 px-3 py-2 bg-white/50 rounded-full hover:bg-white transition-colors min-w-[80px] justify-center">
                <Globe className="w-4 h-4 text-[#2d2d2d]" />
                <span className="text-sm uppercase">{i18n.language}</span>
              </button>
              <div className="absolute right-0 top-full mt-2 bg-white rounded-lg shadow-lg overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all min-w-[120px] before:content-[''] before:absolute before:-top-2 before:left-0 before:right-0 before:h-2 z-[110]">
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => setLanguage(lang.code)}
                    className={`block w-full px-6 py-3 text-left hover:bg-[#f5f3f0] text-sm whitespace-nowrap ${i18n.language === lang.code ? 'bg-[#f5f3f0] font-semibold' : ''
                      }`}
                  >
                    {lang.flag} {lang.name}
                  </button>
                ))}
              </div>
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
          <nav className="lg:hidden pb-6 space-y-4">
            {navigation.map((item) => (
              <a
                key={item.name}
                href={item.href}
                className="block text-sm text-foreground/80 hover:text-foreground transition-colors duration-200"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {item.name}
              </a>
            ))}

            {/* Mobile Language Switcher */}
            <div className="space-y-2">
              <p className="text-xs text-foreground/60 uppercase tracking-wider">Язык / Language</p>
              <div className="grid grid-cols-3 gap-2">
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => setLanguage(lang.code)}
                    className={`px-3 py-2 rounded-lg text-sm ${i18n.language === lang.code
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-white/50 hover:bg-white'
                      }`}
                  >
                    {lang.flag} {lang.name}
                  </button>
                ))}
              </div>
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
