import { MapPin, Phone, Clock, Mail } from "lucide-react";
import { Button } from "./ui/button";
import { useTranslation } from "react-i18next";
import { formatGoogleMapsUrl } from "../utils/urlUtils";
import { useSalonInfo } from "../hooks/useSalonInfo";

interface MapSectionProps {
  salonInfo?: any;
}

export function MapSection({ salonInfo: initialSalonInfo }: MapSectionProps) {
  const { t } = useTranslation(['public_landing', 'common']);
  const { phone, email, address, workingHours, mapUrl } = useSalonInfo(initialSalonInfo);

  return (
    <section id="map-section" className="py-12 sm:py-16 bg-background">
      <div className="container mx-auto max-w-7xl px-3 sm:px-4 lg:px-6">
        <div className="text-center mb-8 sm:mb-12">
          <p className="text-xs sm:text-sm tracking-[0.15em] sm:tracking-[0.2em] uppercase text-muted-foreground mb-3">
            {t('mapTag', { defaultValue: 'Наше местоположение' })}
          </p>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl mb-3 sm:mb-4 text-[var(--heading)]">
            {t('mapTitlePart1', { defaultValue: 'Посетите' })} <span className="text-primary">{t('mapTitlePart2', { defaultValue: 'наш салон' })}</span>
          </h2>
        </div>

        <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
          <div className="space-y-3 sm:space-y-4">
            <div className="bg-card rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-5 shadow-sm hover:shadow-md transition-all border border-border/50">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center flex-shrink-0 contact-icon-phone">
                  <Phone className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-semibold text-[var(--heading)] mb-1">{t('phone', { defaultValue: 'Телефон' })}</h3>
                  <a href={`tel:${phone}`} className="text-xs sm:text-sm text-foreground/70 hover:underline truncate block">
                    {phone}
                  </a>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-5 shadow-sm hover:shadow-md transition-all border border-border/50">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center flex-shrink-0 contact-icon-email">
                  <Mail className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-semibold text-[var(--heading)] mb-1">Email</h3>
                  <a href={`mailto:${email}`} className="text-xs sm:text-sm text-foreground/70 hover:underline truncate block">
                    {email}
                  </a>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-5 shadow-sm hover:shadow-md transition-all border border-border/50">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center flex-shrink-0 contact-icon-address">
                  <MapPin className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-semibold text-[var(--heading)] mb-1">{t('address', { defaultValue: 'Адрес' })}</h3>
                  <p className="text-xs sm:text-sm text-foreground/70">{address}</p>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-5 shadow-sm hover:shadow-md transition-all border border-border/50">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center flex-shrink-0 contact-icon-hours">
                  <Clock className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-semibold text-[var(--heading)] mb-1">{t('workingHours', { defaultValue: 'Часы работы' })}</h3>
                  <p className="text-xs sm:text-sm text-foreground/70">{workingHours}</p>
                </div>
              </div>
            </div>

            <div className="flex gap-2 sm:gap-3 pt-2">
              <Button
                onClick={() => window.open(mapUrl || formatGoogleMapsUrl(address), '_blank')}
                variant="outline"
                className="flex-1 border-primary text-primary hover:bg-primary hover:text-primary-foreground h-9 sm:h-10 text-xs sm:text-sm"
              >
                {t('getDirections', { defaultValue: 'Маршрут' })}
              </Button>
              <Button
                onClick={() => window.location.href = `tel:${phone}`}
                className="flex-1 hero-button-primary h-9 sm:h-10 text-xs sm:text-sm"
              >
                {t('callUs', { defaultValue: 'Позвонить' })}
              </Button>
            </div>
          </div>

          <div className="w-full h-[400px] sm:h-[500px] lg:h-auto lg:min-h-[600px] rounded-lg sm:rounded-xl overflow-hidden shadow-lg bg-muted border border-border/50">
            <iframe
              className="w-full h-full"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d1911.6982277277355!2d55.130208507174196!3d25.073873893619908!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f15!3m3!1m2!1s0x3e5f138d81fa2729%3A0x4f52784c0fa00c32!2sM%20Le%20Diamant%20-%20Best%20Beauty%20Salon%20in%20Jumeirah%20Beach%20Dubai!5e1!3m2!1sen!2sge!4v1768962138779!5m2!1sen!2sge"
              loading="lazy"
              title="Salon Location"
              allowFullScreen
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
