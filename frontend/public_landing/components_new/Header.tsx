import { Globe, Phone } from "lucide-react";
import logoImage from "figma:asset/294c370f335689b82fcbd9b38cf01af26370eed7.png";
import { useLanguage } from "./LanguageContext";

export function Header() {
  const { language, setLanguage, t } = useLanguage();

  return (
    <header className="fixed top-0 left-0 right-0 bg-[#c9c7bc]/95 backdrop-blur-md z-50 border-b border-[#b8a574]/20">
      <div className="container mx-auto px-6 lg:px-12">
        <div className="flex items-center justify-between h-20" dir={language === 'ar' ? 'rtl' : 'ltr'}>
          <div className="flex items-center gap-12">
            <img src={logoImage} alt="M Le Diamant" className="h-16" />
            
            <nav className="hidden lg:flex items-center gap-8">
              <a href="#" className="text-[#2d2d2d] hover:text-[#b8a574] transition-colors text-sm">
                {t.nails}
              </a>
              <a href="#" className="text-[#2d2d2d] hover:text-[#b8a574] transition-colors text-sm">
                {t.hair}
              </a>
              <a href="#" className="text-[#2d2d2d] hover:text-[#b8a574] transition-colors text-sm">
                {t.brows}
              </a>
              <a href="#" className="text-[#2d2d2d] hover:text-[#b8a574] transition-colors text-sm">
                {t.prices}
              </a>
              <a href="#" className="text-[#2d2d2d] hover:text-[#b8a574] transition-colors text-sm">
                {t.contact}
              </a>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex gap-2">
              <button className="px-4 py-2 bg-[#2d2d2d] text-white rounded-full text-sm">
                {t.dubai}
              </button>
              <button className="px-4 py-2 border border-[#2d2d2d] text-[#2d2d2d] rounded-full text-sm hover:bg-[#2d2d2d] hover:text-white transition-colors">
                {t.abuDhabi}
              </button>
            </div>

            <a href="tel:+971542478604" className="hidden md:flex items-center gap-2 px-4 py-2 bg-[#b8a574] text-white rounded-full hover:bg-[#a08f5f] transition-colors">
              <Phone className="w-4 h-4" />
              <span className="text-sm">+971 54 247 8604</span>
            </a>

            <div className="relative group">
              <button className="flex items-center gap-2 px-3 py-2 bg-white/50 rounded-full hover:bg-white transition-colors min-w-[80px] justify-center">
                <Globe className="w-4 h-4 text-[#2d2d2d]" />
                <span className="text-sm uppercase">{language}</span>
              </button>
              <div className="absolute right-0 top-full mt-2 bg-white rounded-lg shadow-lg overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all min-w-[120px]">
                <button
                  onClick={() => setLanguage("ru")}
                  className="block w-full px-6 py-3 text-left hover:bg-[#f5f3f0] text-sm whitespace-nowrap"
                >
                  Русский
                </button>
                <button
                  onClick={() => setLanguage("en")}
                  className="block w-full px-6 py-3 text-left hover:bg-[#f5f3f0] text-sm whitespace-nowrap"
                >
                  English
                </button>
                <button
                  onClick={() => setLanguage("ar")}
                  className="block w-full px-6 py-3 text-left hover:bg-[#f5f3f0] text-sm whitespace-nowrap"
                >
                  العربية
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}