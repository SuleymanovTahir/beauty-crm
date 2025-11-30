// /frontend/public_landing/components/About.tsx
import { Sparkles, Award, Heart, Users } from "lucide-react";
import { useTranslation } from "react-i18next";

export function About() {
  const { t } = useTranslation(['public_landing', 'common']);

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
    <section id="about" className="py-24 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <p className="text-sm tracking-[0.2em] uppercase text-muted-foreground mb-4">
            {t('aboutTag') || "О нас"}
          </p>
          <h2 className="text-4xl sm:text-5xl mb-6 text-primary">
            {t('aboutTitle') || "Искусство красоты в каждой детали"}
          </h2>
          <p className="text-lg text-foreground/70">
            {t('aboutDesc') || "Colour Studio – это пространство, где традиции мастерства встречаются с современными трендами. Мы создаем не просто прически и макияж, мы создаем ваш уникальный стиль."}
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="text-center group"
            >
              <div className="w-16 h-16 md:w-20 md:h-20 bg-pink-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <feature.icon className="w-8 h-8 md:w-10 md:h-10 text-pink-600" />
              </div>
              <h3 className="text-lg md:text-xl mb-2 text-primary">{feature.title}</h3>
              <p className="text-sm md:text-base text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
