import { useTranslation } from "react-i18next";
import { useState, useEffect } from "react";

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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-center md:text-left">
          <p className="text-xs sm:text-sm text-primary-foreground/70">
            © {currentYear} {salonInfo?.name || "Beauty Salon"}. {t('allRightsReserved') || "Все права защищены."}
          </p>
          <div className="flex flex-wrap gap-4 sm:gap-6 text-xs sm:text-sm text-primary-foreground/70 justify-center">
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
