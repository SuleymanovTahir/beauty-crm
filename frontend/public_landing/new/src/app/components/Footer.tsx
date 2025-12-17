import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

export function Footer() {
  const { t, i18n } = useTranslation(['public_landing', 'common']);
  const [salonName, setSalonName] = useState("Beauty Salon");
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    const fetchSalonInfo = async () => {
      try {
        const API_URL = import.meta.env.VITE_API_URL || window.location.origin;
        const res = await fetch(`${API_URL}/api/public/salon-info?language=${i18n.language}`);
        const data = await res.json();
        if (data.name) {
          setSalonName(data.name);
        }
      } catch (error) {
        console.error('Error loading salon info:', error);
      }
    };
    fetchSalonInfo();
  }, [i18n.language]);

  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-center sm:text-left">
          <p className="text-xs sm:text-sm text-primary-foreground/70">
            © {currentYear} {salonName}. {t('allRightsReserved', { defaultValue: 'Все права защищены.' })}
          </p>
          <div className="flex flex-wrap gap-4 sm:gap-6 lg:gap-10 text-xs sm:text-sm text-primary-foreground/70 justify-center">
            <a href="/privacy-policy" className="hover:text-primary-foreground transition-colors">
              {t('privacyPolicy', { defaultValue: 'Политика конфиденциальности' })}
            </a>
            <a href="/terms" className="hover:text-primary-foreground transition-colors">
              {t('termsOfUse', { defaultValue: 'Условия использования' })}
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
