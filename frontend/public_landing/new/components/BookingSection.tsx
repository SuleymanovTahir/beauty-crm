import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Calendar, Phone } from "lucide-react";
import { motion } from "motion/react";
import { useInView } from "react-intersection-observer";

interface BookingSectionProps {
  services?: any[];
}

export function BookingSection({ services }: BookingSectionProps) {
  const { t } = useTranslation(['public_landing', 'common']);
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.1
  });

  const salonPhone = "+971 58 533 5555";

  return (
    <section id="booking" className="py-16 sm:py-20 lg:py-24 bg-gradient-to-br from-primary/5 to-pink-50/30">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <p className="text-xs sm:text-sm tracking-[0.2em] uppercase text-muted-foreground mb-3 sm:mb-4">
            {t('bookingTag') || 'Запись'}
          </p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl mb-4 sm:mb-6 text-[var(--heading)]">
            {t('bookingTitle') || 'Запишитесь сейчас'}
          </h2>
          <p className="text-base sm:text-lg text-foreground/70 mb-8 sm:mb-12 max-w-2xl mx-auto leading-relaxed">
            {t('bookingDesc') || 'Позвоните нам или оставьте заявку, и мы подберем удобное время для вашего визита'}
          </p>

          {/* CTA Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 max-w-xl mx-auto">
            <Button
              onClick={() => window.location.href = `tel:${salonPhone}`}
              className="hero-button-primary px-6 sm:px-8 py-5 sm:py-6 text-base sm:text-lg shadow-lg hover:shadow-xl transition-all group"
              size="lg"
            >
              <Phone className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
              <span className="truncate">{t('callNow') || 'Позвонить'}</span>
            </Button>

            <Button
              onClick={() => {
                // Здесь должна быть логика онлайн-записи
                alert(t('bookingComingSoon') || 'Функция онлайн-записи скоро будет доступна');
              }}
              variant="outline"
              className="border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground px-6 sm:px-8 py-5 sm:py-6 text-base sm:text-lg shadow-md hover:shadow-lg transition-all group"
              size="lg"
            >
              <Calendar className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
              <span className="truncate">{t('bookOnline') || 'Онлайн запись'}</span>
            </Button>
          </div>

          {/* Additional Info */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-8 text-sm text-foreground/60"
          >
            {t('bookingNote') || 'Мы работаем ежедневно с 10:00 до 21:00'}
          </motion.p>
        </motion.div>
      </div>
    </section>
  );
}
