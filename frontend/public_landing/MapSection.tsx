// /frontend/public_landing/MapSection.tsx
import { MapPin, Phone, Clock } from "lucide-react";
import { useLanguage } from "./LanguageContext";
import { Button } from "@/components/ui/button";

interface MapSectionProps {
  salonInfo?: any;
}

export function MapSection({ salonInfo }: MapSectionProps) {
  const { t } = useLanguage();

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
    <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-12 bg-muted/30">
      <div className="container mx-auto max-w-7xl">
        <div className="text-center mb-12 sm:mb-16">
          <p className="text-xs sm:text-sm tracking-[0.2em] uppercase text-muted-foreground mb-4">
            {t('locationTag') || 'Наше местоположение'}
          </p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl mb-4 sm:mb-6 text-primary">
            {t('visitSalon') || "Посетите наш салон"}
          </h2>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 sm:gap-12">
          <div className="space-y-4 sm:space-y-6">
            <div className="bg-card rounded-xl sm:rounded-2xl p-6 sm:p-8 shadow-md hover:shadow-xl transition-all border border-border/50">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg text-primary mb-2 sm:mb-3 tracking-wider">
                    {salonInfo?.city || "Dubai"} ({t('mainLocation') || 'Основная локация'})
                  </h3>
                  <p className="text-sm sm:text-base text-foreground/70 leading-relaxed">
                    {salonInfo?.address || "Business Bay, Dubai Marina, Internet City"}<br />
                    {salonInfo?.country || "UAE"}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-xl sm:rounded-2xl p-6 sm:p-8 shadow-md hover:shadow-xl transition-all border border-border/50">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <Phone className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg text-primary mb-2 sm:mb-3 tracking-wider">
                    {t('phone') || "Телефон"}
                  </h3>
                  <a href={`tel:${salonInfo?.phone}`} className="text-primary hover:underline text-base sm:text-lg">
                    {salonInfo?.phone || "+971 54 247 8604"}
                  </a>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-xl sm:rounded-2xl p-6 sm:p-8 shadow-md hover:shadow-xl transition-all border border-border/50">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <Clock className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg text-primary mb-2 sm:mb-3 tracking-wider">
                    {t('workingHours') || "Часы работы"}
                  </h3>
                  <p className="text-sm sm:text-base text-foreground/70 leading-relaxed">
                    {t('monSun') || "Понедельник - Воскресенье"}<br />
                    <span className="text-base sm:text-lg text-primary">{salonInfo?.hours_weekdays || "10:30 - 21:30"}</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-2">
              <Button
                onClick={handleGetDirections}
                variant="outline"
                className="flex-1 border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-all h-12 sm:h-14"
              >
                {t('getDirections') || "Построить маршрут"}
              </Button>
              <Button
                onClick={handleCall}
                className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 h-12 sm:h-14 shadow-md hover:shadow-lg transition-all"
              >
                {t('callUs') || "Позвонить"}
              </Button>
            </div>
          </div>

          <div className="relative h-[400px] sm:h-[500px] lg:h-[600px] rounded-xl sm:rounded-2xl overflow-hidden shadow-2xl bg-gray-200 border-2 border-border/50">
            <iframe
              src={salonInfo?.google_maps_embed_url || "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d231543.89654711885!2d55.04788838369384!3d25.07619619999999!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3e5f43496ad9c645%3A0xbde66e5084295162!2sDubai%20-%20United%20Arab%20Emirates!5e0!3m2!1sen!2s!4v1234567890123"}
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Salon Location"
            />
          </div>
        </div>
      </div>
    </section>
  );
}