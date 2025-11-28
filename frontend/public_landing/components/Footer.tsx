import { Link } from "react-router-dom";
import { Instagram, Facebook, MessageCircle } from "lucide-react";
import { useLanguage } from "../LanguageContext";

interface FooterProps {
  salonInfo?: any;
}

export function Footer({ salonInfo }: FooterProps) {
  const { t } = useLanguage();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          <div>
            <h3 className="text-xl mb-4">M. Le Diamant</h3>
            <p className="text-primary-foreground/70 text-sm leading-relaxed">
              {t('footerDesc') || "Премиальный салон красоты в центре города. Создаем безупречные образы с 2015 года."}
            </p>
          </div>

          <div>
            <h4 className="mb-4">{t('contacts') || "Контакты"}</h4>
            <div className="space-y-2 text-sm text-primary-foreground/70">
              <p>{salonInfo?.address || "ул. Примерная, д. 10"}</p>
              <p>{salonInfo?.city || "Москва"}, {salonInfo?.zip || "123456"}</p>
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
              <p>{salonInfo?.working_hours || "10:30 - 21:30"}</p>
              <p className="mt-4">{t('noWeekends') || "Без выходных"}</p>
            </div>
          </div>

          <div>
            <h4 className="mb-4">{t('socialNetworks') || "Социальные сети"}</h4>
            <div className="flex gap-4">
              {salonInfo?.instagram && (
                <a
                  href={salonInfo.instagram.startsWith('http') ? salonInfo.instagram : `https://${salonInfo.instagram.replace('@', '')}`}
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
                  href={`https://wa.me/${salonInfo.whatsapp}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-primary-foreground/10 flex items-center justify-center hover:bg-primary-foreground/20 transition-colors"
                  aria-label="WhatsApp"
                >
                  <MessageCircle className="w-5 h-5" />
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-primary-foreground/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-primary-foreground/70">
            © {currentYear} M. Le Diamant. {t('allRightsReserved') || "Все права защищены."}
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
