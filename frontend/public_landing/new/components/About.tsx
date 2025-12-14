import { Sparkles, Award, Heart, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { motion } from "motion/react";
import { useInView } from "react-intersection-observer";

export function About() {
  const { t } = useTranslation(['public_landing', 'common']);
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.1
  });

  const features = [
    {
      icon: Sparkles,
      title: t('aboutFeature1Title') || "Премиальное качество",
      description: t('aboutFeature1Desc') || "Используем только лучшие продукты и материалы мировых брендов",
    },
    {
      icon: Award,
      title: t('aboutFeature2Title') || "Опытные мастера",
      description: t('aboutFeature2Desc') || "Наша команда - дипломированные специалисты с многолетним опытом",
    },
    {
      icon: Heart,
      title: t('aboutFeature3Title') || "Индивидуальный подход",
      description: t('aboutFeature3Desc') || "Каждый клиент уникален, мы создаем образ специально для вас",
    },
    {
      icon: Users,
      title: t('aboutFeature4Title') || "Атмосфера комфорта",
      description: t('aboutFeature4Desc') || "Уютная обстановка и внимательное отношение к каждой детали",
    },
  ];

  return (
    <section id="about" className="py-16 sm:py-20 lg:py-24 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-12 sm:mb-16"
        >
          <p className="text-xs sm:text-sm tracking-[0.2em] uppercase text-muted-foreground mb-3 sm:mb-4">
            {t('aboutTag') || "О нас"}
          </p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl mb-4 sm:mb-6 text-[var(--heading)]">
            {t('aboutTitle') || "Искусство красоты в каждой детали"}
          </h2>
          <p className="text-base sm:text-lg text-foreground/70 leading-relaxed">
            {t('aboutDesc') || "Colour Studio – это пространство, где традиции мастерства встречаются с современными трендами. Мы создаем не просто прически и макияж, мы создаем ваш уникальный стиль."}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 lg:gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="group text-center bg-gradient-to-br from-white to-primary/5 rounded-2xl p-6 sm:p-8 border border-border/30 hover:border-primary/30 hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
            >
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-pink-100 to-pink-50 rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6 group-hover:scale-110 transition-transform duration-300 shadow-sm">
                <feature.icon className="w-8 h-8 sm:w-10 sm:h-10 text-pink-600" />
              </div>
              <h3 className="text-base sm:text-lg lg:text-xl mb-2 sm:mb-3 text-[var(--heading)] font-semibold group-hover:text-primary transition-colors">
                {feature.title}
              </h3>
              <p className="text-sm sm:text-base text-[#717182] leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
