import { Instagram, Facebook, Mail, Phone, MapPin } from "lucide-react";
import { useLanguage } from "./LanguageContext";

export function Footer() {
  const { t, language } = useLanguage();

  return (
    <footer className="bg-[#2d2d2d] text-white py-16 px-6 lg:px-12" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="container mx-auto">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          <div>
            <h3 className="text-3xl mb-4">M Le Diamant</h3>
            <p className="text-gray-400 mb-6">
              {t.aboutSalon}
            </p>
            <div className="flex gap-4">
              <a href="#" className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-[#b8a574] transition-colors">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-[#b8a574] transition-colors">
                <Facebook className="w-5 h-5" />
              </a>
            </div>
          </div>

          <div>
            <h4 className="mb-6">{t.servicesTitle}</h4>
            <ul className="space-y-3 text-gray-400">
              <li><a href="#" className="hover:text-[#b8a574] transition-colors">{t.manicurePedicure}</a></li>
              <li><a href="#" className="hover:text-[#b8a574] transition-colors">{t.haircutsStyling}</a></li>
              <li><a href="#" className="hover:text-[#b8a574] transition-colors">{t.coloring}</a></li>
              <li><a href="#" className="hover:text-[#b8a574] transition-colors">{t.spaMassage}</a></li>
              <li><a href="#" className="hover:text-[#b8a574] transition-colors">{t.cosmetology}</a></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-6">{t.infoTitle}</h4>
            <ul className="space-y-3 text-gray-400">
              <li><a href="#" className="hover:text-[#b8a574] transition-colors">{t.aboutUs}</a></li>
              <li><a href="#" className="hover:text-[#b8a574] transition-colors">{t.ourTeam}</a></li>
              <li><a href="#" className="hover:text-[#b8a574] transition-colors">{t.promotions}</a></li>
              <li><a href="#" className="hover:text-[#b8a574] transition-colors">{t.reviews}</a></li>
              <li><a href="#" className="hover:text-[#b8a574] transition-colors">{t.contact}</a></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-6">{t.contactTitle}</h4>
            <ul className="space-y-4 text-gray-400">
              <li className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-[#b8a574] flex-shrink-0 mt-1" />
                <span>{t.location}</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-[#b8a574]" />
                <a href="tel:+971542478604" className="hover:text-[#b8a574] transition-colors">
                  +971 54 247 8604
                </a>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-[#b8a574]" />
                <a href="mailto:info@mlediamant.ae" className="hover:text-[#b8a574] transition-colors">
                  info@mlediamant.ae
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-gray-400 text-sm">
          <p>&copy; 2025 M Le Diamant. {t.allRightsReserved}</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-[#b8a574] transition-colors">{t.privacyPolicy}</a>
            <a href="#" className="hover:text-[#b8a574] transition-colors">{t.termsOfUse}</a>
          </div>
        </div>
      </div>
    </footer>
  );
}