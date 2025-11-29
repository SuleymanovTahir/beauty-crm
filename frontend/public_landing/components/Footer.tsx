import { Link } from "react-router-dom";
import { Instagram, Facebook } from "lucide-react";
import { useLanguage } from "../LanguageContext";
import { useState, useEffect } from "react";

interface FooterProps {
  salonInfo?: any;
}

export function Footer({ salonInfo: propSalonInfo }: FooterProps) {
  const { t, language } = useLanguage();
  const [salonInfo, setSalonInfo] = useState(propSalonInfo || {});
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    // If salonInfo not provided via props, fetch it
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          <div>
            <h3 className="text-xl mb-4">{salonInfo?.name || "M. Le Diamant"}</h3>
            <p className="text-primary-foreground/70 text-sm leading-relaxed">
              {t('footerDesc') || "Премиальный салон красоты в центре города. Создаем безупречные образы с 2015 года."}
            </p>
          </div>

          <div>
            <h4 className="mb-4">{t('contacts') || "Контакты"}</h4>
            <div className="space-y-2 text-sm text-primary-foreground/70">
              <p>{salonInfo?.address || "ул. Примерная, д. 10"}</p>
              <p>{salonInfo?.city || "Москва"}</p>
              <p>
                <a href={`tel:${salonInfo?.phone}`} className="hover:text-primary-foreground transition-colors">
                  {salonInfo?.phone || "+7 (999) 123-45-67"}
                </a>
              </p>
              <p>
                <a href={`mailto:${salonInfo?.email}`} className="hover:text-primary-foreground transition-colors">
                  {salonInfo?.email || "info@mlediamant.ru"}
                </a>
              </p>
            </div>
          </div>

          <div>
            <h4 className="mb-4">{t('workingHours') || "Часы работы"}</h4>
            <div className="space-y-2 text-sm text-primary-foreground/70">
              <p>{t('monSun') || "Понедельник - Воскресенье"}</p>
              <p>{salonInfo?.hours_weekdays || "10:30 - 21:30"}</p>
              <p className="mt-4">{t('noWeekends') || "Без выходных"}</p>
            </div>
          </div>

          <div>
            <h4 className="mb-4">{t('socialNetworks') || "Социальные сети"}</h4>
            <div className="flex gap-4">
              {salonInfo?.instagram && (
                <a
                  href={salonInfo.instagram.startsWith('http') ? salonInfo.instagram : `https://instagram.com/${salonInfo.instagram.replace('@', '').replace('https://instagram.com/', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-primary-foreground/10 flex items-center justify-center hover:bg-primary-foreground/20 transition-colors"
                  aria-label="Instagram"
                >
                  <Instagram className="w-5 h-5" />
                </a>
              )}
              {salonInfo?.facebook && (
                <a
                  href={salonInfo.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-primary-foreground/10 flex items-center justify-center hover:bg-primary-foreground/20 transition-colors"
                  aria-label="Facebook"
                >
                  <Facebook className="w-5 h-5" />
                </a>
              )}
              {salonInfo?.whatsapp && (
                <a
                  href={`https://wa.me/${salonInfo.whatsapp.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-primary-foreground/10 flex items-center justify-center hover:bg-primary-foreground/20 transition-colors"
                  aria-label="WhatsApp"
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="24"
                    height="24"
                    stroke="currentColor"
                    strokeWidth="2"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-5 h-5"
                  >
                    <path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21" />
                    <path d="M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1a5 5 0 0 0 5 5h1a.5.5 0 0 0 0-1h-1a.5.5 0 0 0 0 1" />
                  </svg>
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-primary-foreground/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-primary-foreground/70">
            © {currentYear} {salonInfo?.name || "M. Le Diamant"}. {t('allRightsReserved') || "Все права защищены."}
          </p>
          <div className="flex gap-6 text-sm text-primary-foreground/70">
            <Link to="/privacy-policy" className="hover:text-primary-foreground transition-colors">
              {t('privacyPolicy') || "Политика конфиденциальности"}
            </Link>
            <Link to="/terms" className="hover:text-primary-foreground transition-colors">
              {t('termsOfUse') || "Условия использования"}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
