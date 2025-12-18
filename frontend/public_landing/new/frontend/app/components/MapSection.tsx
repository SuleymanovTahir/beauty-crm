import { MapPin, Phone, Clock, Mail } from "lucide-react";
import { Button } from "./ui/button";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

export function MapSection() {
  const { t, i18n } = useTranslation(['public_landing', 'common']);
  const [salonInfo, setSalonInfo] = useState<any>(null);

  useEffect(() => {
    const fetchSalonInfo = async () => {
      try {
        const API_URL = import.meta.env.VITE_API_URL || window.location.origin;
        const res = await fetch(`${API_URL}/api/public/salon-info?language=${i18n.language}`);
        const data = await res.json();
        setSalonInfo(data);
      } catch (error) {
        console.error('Error loading salon info:', error);
      }
    };
    fetchSalonInfo();
  }, [i18n.language]);

  const phone = salonInfo?.phone || "";
  const email = salonInfo?.email || "";
  const address = salonInfo?.address || "";
  // Working hours handling
  const workingHours = salonInfo?.hours || "";

  return (
    <section id="map-section" className="py-12 sm:py-16 bg-muted/30">
      <div className="container mx-auto max-w-7xl px-3 sm:px-4 lg:px-6">
        <div className="text-center mb-8 sm:mb-12">
          <p className="text-xs sm:text-sm tracking-[0.15em] sm:tracking-[0.2em] uppercase text-muted-foreground mb-3">
            {t('mapTag', { defaultValue: 'Наше местоположение' })}
          </p>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl mb-3 sm:mb-4 text-[var(--heading)]">
            {t('mapTitle', { defaultValue: 'Посетите наш салон' })}
          </h2>
        </div>

        <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
          <div className="space-y-3 sm:space-y-4">
            <div className="bg-card rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-5 shadow-sm hover:shadow-md transition-all border border-border/50">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Phone className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 text-green-600" />
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
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Mail className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 text-blue-600" />
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
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 text-red-600" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-semibold text-[var(--heading)] mb-1">{t('address', { defaultValue: 'Адрес' })}</h3>
                  <p className="text-xs sm:text-sm text-foreground/70">{address}</p>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-5 shadow-sm hover:shadow-md transition-all border border-border/50">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Clock className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 text-purple-600" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-semibold text-[var(--heading)] mb-1">{t('workingHours', { defaultValue: 'Часы работы' })}</h3>
                  <p className="text-xs sm:text-sm text-foreground/70">{workingHours}</p>
                </div>
              </div>
            </div>

            <div className="flex gap-2 sm:gap-3 pt-2">
              <Button
                onClick={() => window.open(salonInfo?.map_url || 'https://maps.google.com', '_blank')}
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

          <div className="w-full h-[400px] sm:h-[500px] lg:h-auto lg:min-h-[600px] rounded-lg sm:rounded-xl overflow-hidden shadow-lg bg-gray-200 border border-border/50">
            <iframe
              className="w-full h-full"
              src={salonInfo?.google_maps_embed_url || "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3613.1!2d55.1315886!3d25.0738739!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3e5f138d81fa2729%3A0x4f52784c0fa00c32!2sBusiness%20Bay%2C%20Dubai!5e0!3m2!1sen!2sae!4v1733334000000"}
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
