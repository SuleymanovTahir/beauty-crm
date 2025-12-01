// /frontend/public_landing/MapSection.tsx
import { MapPin, Phone, Clock, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

interface MapSectionProps {
  salonInfo?: any;
}

export function MapSection({ salonInfo }: MapSectionProps) {
  const { t } = useTranslation(['public_landing', 'common']);

  const handleGetDirections = () => {
    const address = salonInfo?.address || "Business Bay, Dubai";
    const url = salonInfo?.google_maps_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    window.open(url, '_blank');
  };

  const handleCall = () => {
    if (salonInfo?.phone) {
      window.location.href = `tel:${salonInfo.phone}`;
    }
  };

  return (
    <section className="py-12 sm:py-16 px-4 sm:px-6 lg:px-12 bg-muted/30">
      <div className="container mx-auto max-w-7xl">
        <div className="text-center mb-12 sm:mb-16">
          <p className="text-xs sm:text-sm tracking-[0.2em] uppercase text-muted-foreground mb-4">
            {t('locationTag') || 'Наше местоположение'}
          </p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl mb-4 sm:mb-6 text-[var(--heading)]">
            {t('visitSalon') || "Посетите наш салон"}
          </h2>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 sm:gap-8">
          <div className="space-y-3 sm:space-y-4">
            {/* Phone */}
            <div className="bg-card rounded-xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-all border border-border/50">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Phone className="w-7 h-7 text-green-600" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-semibold text-[var(--heading)] mb-1">
                    {t('phone') || "Телефон"}
                  </h3>
                  <a href={`tel:${salonInfo?.phone}`} className="text-foreground hover:underline text-sm sm:text-base">
                    {salonInfo?.phone || "+971 54 247 8604"}
                  </a>
                </div>
              </div>
            </div>

            {/* Email */}
            <div className="bg-card rounded-xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-all border border-border/50">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Mail className="w-7 h-7 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-semibold text-[var(--heading)] mb-1">
                    {t('email') || "Email"}
                  </h3>
                  <a href={`mailto:${salonInfo?.email}`} className="text-foreground hover:underline text-sm sm:text-base break-all">
                    {salonInfo?.email || "info@salon.ru"}
                  </a>
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="bg-card rounded-xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-all border border-border/50">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-7 h-7 text-red-600" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-semibold text-[var(--heading)] mb-1">
                    {t('address') || "Адрес"}
                  </h3>
                  <p className="text-xs sm:text-sm text-foreground/70 leading-snug">
                    {salonInfo?.address || "Business Bay, Dubai Marina"}, {salonInfo?.city || "Dubai"}
                  </p>
                </div>
              </div>
            </div>

            {/* Working Hours */}
            <div className="bg-card rounded-xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-all border border-border/50">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-14 h-14 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Clock className="w-7 h-7 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-semibold text-[var(--heading)] mb-1">
                    {t('workingHours') || "Часы работы"}
                  </h3>
                  <p className="text-xs sm:text-sm text-foreground/70 leading-snug">
                    {t('monSun') || "Понедельник - Воскресенье"}: <span className="text-foreground font-medium">{salonInfo?.hours || "10:30 - 21:30"}</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                onClick={handleGetDirections}
                variant="outline"
                className="flex-1 border-primary text-primary hover:bg-primary hover:text-primary-foreground h-10 sm:h-12 text-sm"
              >
                {t('getDirections') || "Маршрут"}
              </Button>
              <Button
                onClick={handleCall}
                className="flex-1 hero-button-primary h-10 sm:h-12 shadow-sm hover:shadow-md text-sm"
              >
                {t('callUs') || "Позвонить"}
              </Button>
            </div>
          </div>

          <div className="w-full h-[500px] lg:h-auto lg:min-h-[600px] rounded-xl overflow-hidden shadow-lg bg-gray-200 border border-border/50">
            <iframe
              src={salonInfo?.google_maps_embed_url || "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d231543.89654711885!2d55.04788838369384!3d25.07619619999999!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f15!3m3!1m2!1s0x3e5f43496ad9c645%3A0xbde66e5084295162!2sDubai%20-%20United%20Arab%20Emirates!5e0!3m2!1sen!2s!4v1234567890123"}
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Salon Location"
              className="w-full h-full"
            />
          </div>
        </div>
      </div>
    </section>
  );
}