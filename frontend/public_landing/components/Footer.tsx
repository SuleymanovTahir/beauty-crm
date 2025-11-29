// /frontend/public_landing/components/Footer.tsx
import { Instagram, Facebook, Phone, Mail, MapPin } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

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
    <footer id="contacts" className="bg-primary text-primary-foreground">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        {/* CTA Banner */}
        <div className="bg-primary-foreground/10 backdrop-blur-sm rounded-2xl p-4 sm:p-8 mb-8 sm:mb-12 text-center">
          <h3 className="text-xl sm:text-2xl lg:text-3xl mb-4">
            {t('footerCTATitle', { defaultValue: 'Готовы к преображению?' })}
          </h3>
          <p className="text-sm sm:text-base text-primary-foreground/80 mb-6">
            {t('footerCTADesc', { defaultValue: 'Запишитесь на консультацию и получите специальное предложение' })}
          </p>
          <Button
            onClick={() => {
              document.getElementById("booking")?.scrollIntoView({ behavior: "smooth" });
            }}
            size="lg"
            className="bg-background text-primary hover:bg-background/90 shadow-lg"
          >
            {t('bookNow') || 'Забронировать'}
          </Button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8 mb-8 sm:mb-12">
          {/* About */}
          <div>
            <h3 className="text-lg sm:text-xl mb-4">{salonInfo?.name || "Beauty Salon"}</h3>
            <p className="text-primary-foreground/70 text-xs sm:text-sm leading-relaxed">
              {t('footerDesc') || "Премиальный салон красоты в центре города. Создаем безупречные образы с 2015 года."}
            </p>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="text-base sm:text-lg mb-4">{t('contacts') || "Контакты"}</h4>
            <div className="space-y-3 text-xs sm:text-sm text-primary-foreground/70">
              <div className="flex items-start gap-3">
                <MapPin className="h-3 w-3 sm:h-5 sm:w-5 text-primary-foreground/80 mt-0.5 flex-shrink-0" />
                <div>
                  <p>{salonInfo?.address || "ул. Примерная, д. 10"}</p>
                  <p>{salonInfo?.city || "Москва"}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone className="h-3 w-3 sm:h-5 sm:w-5 text-primary-foreground/80 mt-0.5 flex-shrink-0" />
                <a href={`tel:${salonInfo?.phone}`} className="hover:text-primary-foreground transition-colors">
                  {salonInfo?.phone || "+7 (999) 123-45-67"}
                </a>
              </div>
              <div className="flex items-start gap-3">
                <Mail className="h-3 w-3 sm:h-5 sm:w-5 text-primary-foreground/80 mt-0.5 flex-shrink-0" />
                <a href={`mailto:${salonInfo?.email}`} className="hover:text-primary-foreground transition-colors break-all">
                  {salonInfo?.email || "info@beautysalon.com"}
                </a>
              </div>
            </div>
          </div>

          {/* Working Hours */}
          <div>
            <h4 className="text-base sm:text-lg mb-4">{t('workingHours') || "Часы работы"}</h4>
            <div className="space-y-2 text-xs sm:text-sm text-primary-foreground/70">
              <p>{t('monSun') || "Понедельник - Воскресенье"}</p>
              <p className="text-base sm:text-lg text-primary-foreground">{salonInfo?.hours_weekdays || "10:30 - 21:30"}</p>
              <p className="mt-4 text-primary-foreground/90">{t('noWeekends') || "Без выходных"}</p>
            </div>
          </div>

          {/* Social Media */}
          <div>
            <h4 className="text-base sm:text-lg mb-4">{t('socialNetworks') || "Социальные сети"}</h4>
            <div className="flex gap-3 sm:gap-4">
              {salonInfo?.instagram && (
                <a
                  href={salonInfo.instagram.startsWith('http') ? salonInfo.instagram : `https://instagram.com/${salonInfo.instagram.replace('@', '').replace('https://instagram.com/', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary-foreground/10 backdrop-blur-sm flex items-center justify-center hover:bg-primary-foreground/20 transition-colors"
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
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary-foreground/10 backdrop-blur-sm flex items-center justify-center hover:bg-primary-foreground/20 transition-colors"
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
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary-foreground/10 backdrop-blur-sm flex items-center justify-center hover:bg-primary-foreground/20 transition-colors"
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

        <div className="border-t border-primary-foreground/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-center md:text-left">
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
