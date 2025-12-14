import { useTranslation } from "react-i18next";
import { motion } from "motion/react";
import { useInView } from "react-intersection-observer";

export function MastersSection() {
  const { t } = useTranslation(['public_landing', 'common']);
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.1
  });

  // Здесь должна быть загрузка мастеров из API
  // Временно используем заглушку
  const masters = [];

  if (masters.length === 0) return null;

  return (
    <section id="team" className="py-16 sm:py-20 lg:py-24 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-8 sm:mb-12 lg:mb-16"
        >
          <p className="text-xs sm:text-sm tracking-[0.2em] uppercase text-muted-foreground mb-3 sm:mb-4">
            {t('teamTag') || 'Наша команда'}
          </p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl mb-4 sm:mb-6 text-[var(--heading)]">
            {t('teamTitle') || 'Наши мастера'}
          </h2>
          <p className="text-base sm:text-lg text-foreground/70 leading-relaxed">
            {t('teamDesc') || 'Профессионалы своего дела с многолетним опытом'}
          </p>
        </motion.div>

        {/* Здесь будут карточки мастеров */}
      </div>
    </section>
  );
}
