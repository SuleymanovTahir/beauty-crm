import { Sparkles, Award, Heart, Users } from "lucide-react";
import { useLanguage } from "../LanguageContext";

export function About() {
  const { t } = useLanguage();

  const features = [
    {
      icon: Sparkles,
      title: t('aboutFeature1Title', { defaultValue: "Премиальное качество" }),
      description: t('aboutFeature1Desc', { defaultValue: "Используем только лучшие продукты и материалы мировых брендов" }),
    },
    {
      icon: Award,
      title: t('aboutFeature2Title', { defaultValue: "Опытные мастера" }),
      description: t('aboutFeature2Desc', { defaultValue: "Наша команда - дипломированные специалисты с многолетним опытом" }),
    },
    {
      icon: Heart,
      title: t('aboutFeature3Title', { defaultValue: "Индивидуальный подход" }),
      description: t('aboutFeature3Desc', { defaultValue: "Каждый клиент уникален, мы создаем образ специально для вас" }),
    },
    {
      icon: Users,
      title: t('aboutFeature4Title', { defaultValue: "Атмосфера комфорта" }),
      description: t('aboutFeature4Desc', { defaultValue: "Уютная обстановка и внимательное отношение к каждой детали" }),
    },
  ];

  return (
    <section id="about" className="py-16 sm:py-24 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <p className="text-xs sm:text-sm tracking-[0.2em] uppercase text-muted-foreground mb-4">
            {t('aboutTag', { defaultValue: "О нас" })}
          </p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl mb-4 sm:mb-6 text-primary">
            {t('aboutTitle', { defaultValue: "Искусство красоты в каждой детали" })}
          </h2>
          <p className="text-base sm:text-lg text-foreground/70">
            {t('aboutDesc', { defaultValue: "Colour Studio – это пространство, где традиции мастерства встречаются с современными трендами. Мы создаем не просто прически и макияж, мы создаем ваш уникальный стиль." })}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group relative bg-card p-6 sm:p-8 rounded-xl sm:rounded-2xl transition-all duration-300 hover:shadow-xl border border-border/50 hover:border-primary/50"
            >
              <div className="mb-4 sm:mb-6 inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                <feature.icon className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <h3 className="mb-2 sm:mb-3 text-base sm:text-lg text-primary">{feature.title}</h3>
              <p className="text-xs sm:text-sm text-foreground/70 leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
