// /frontend/public_landing/components/Footer.tsx
// import { Instagram, Facebook, Phone, Mail, MapPin, MessageCircle } from "lucide-react"; // Commented out - only used in full footer
import { useTranslation } from "react-i18next";
import { useState, useEffect } from "react";
// import { Button } from "@/components/ui/button"; // Commented out - only used in full footer

interface FooterProps {
  salonInfo?: any;
}

export function Footer({ salonInfo: propSalonInfo }: FooterProps) {
  const { t, i18n } = useTranslation(['public_landing', 'common']);
  const language = i18n.language;
  const [salonInfo, setSalonInfo] = useState(propSalonInfo || {});
  const currentYear = new Date().getFullYear();

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

  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Simplified Footer - Only Copyright and Legal Links */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-y-6 gap-x-8 text-center md:text-left">
          <p className="text-xs sm:text-sm text-primary-foreground/70 leading-loose">
            © {currentYear} {salonInfo?.name || "Beauty Salon"}.<br className="sm:hidden" /> {t('allRightsReserved') || "Все права защищены."}
          </p>
          <div className="flex flex-wrap gap-6 sm:gap-10 text-xs sm:text-sm text-primary-foreground/70 justify-center">
            <a href="/privacy-policy" className="hover:text-primary-foreground transition-colors">
              {t('privacyPolicy') || "Политика конфиденциальности"}
            </a>
            <a href="/terms" className="hover:text-primary-foreground transition-colors">
              {t('termsOfUse') || "Условия использования"}
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
