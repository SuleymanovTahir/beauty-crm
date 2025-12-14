import { useTranslation } from "react-i18next";
import { MapPin, Phone, Clock } from "lucide-react";
import { motion } from "motion/react";
import { useInView } from "react-intersection-observer";

interface MapSectionProps {
  salonInfo?: any;
}

export function MapSection({ salonInfo }: MapSectionProps) {
  const { t } = useTranslation(['public_landing', 'common']);
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.1
  });

  return (
    <section id="location" className="py-16 sm:py-20 lg:py-24 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-8 sm:mb-12 lg:mb-16"
        >
          <p className="text-xs sm:text-sm tracking-[0.2em] uppercase text-muted-foreground mb-3 sm:mb-4">
            {t('locationTag') || 'Как нас найти'}
          </p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl mb-4 sm:mb-6 text-[var(--heading)]">
            {t('locationTitle') || 'Наше расположение'}
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6 sm:gap-8">
          {/* Contact Info */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="bg-card rounded-xl sm:rounded-2xl p-6 sm:p-8 shadow-lg space-y-6"
          >
            <h3 className="text-2xl font-semibold text-[var(--heading)] mb-6">
              {t('contactInfo') || 'Контактная информация'}
            </h3>

            {salonInfo?.address && (
              <div className="flex items-start gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <MapPin className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h4 className="font-medium text-foreground mb-1">{t('address') || 'Адрес'}</h4>
                  <p className="text-sm text-foreground/70">{salonInfo.address}</p>
                </div>
              </div>
            )}

            {salonInfo?.phone && (
              <div className="flex items-start gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Phone className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h4 className="font-medium text-foreground mb-1">{t('phone') || 'Телефон'}</h4>
                  <a href={`tel:${salonInfo.phone}`} className="text-sm text-primary hover:underline">
                    {salonInfo.phone}
                  </a>
                </div>
              </div>
            )}

            {salonInfo?.working_hours && (
              <div className="flex items-start gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Clock className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h4 className="font-medium text-foreground mb-1">{t('workingHours') || 'Часы работы'}</h4>
                  <p className="text-sm text-foreground/70">{salonInfo.working_hours}</p>
                </div>
              </div>
            )}
          </motion.div>

          {/* Map Placeholder */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="bg-muted rounded-xl sm:rounded-2xl overflow-hidden shadow-lg h-[300px] sm:h-[400px]"
          >
            {salonInfo?.map_url ? (
              <iframe
                src={salonInfo.map_url}
                className="w-full h-full"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                {t('mapPlaceholder') || 'Карта скоро появится'}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
