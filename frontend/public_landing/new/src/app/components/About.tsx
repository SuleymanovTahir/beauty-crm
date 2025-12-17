import { Sparkles, Award, Heart, Users } from "lucide-react";

const features = [
  {
    icon: Sparkles,
    title: "Премиальное качество",
    description: "Используем только лучшие продукты и материалы мировых брендов",
  },
  {
    icon: Award,
    title: "Опытные мастера",
    description: "Наша команда - дипломированные специалисты с многолетним опытом",
  },
  {
    icon: Heart,
    title: "Индивидуальный подход",
    description: "Каждый клиент уникален, мы создаем образ специально для вас",
  },
  {
    icon: Users,
    title: "Атмосфера комфорта",
    description: "Уютная обстановка и внимательное отношение к каждой детали",
  },
];

export function About() {
  return (
    <section id="about" className="py-10 sm:py-14 lg:py-20 bg-background">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
        <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-12">
          <p className="text-xs sm:text-sm tracking-[0.15em] sm:tracking-[0.2em] uppercase text-muted-foreground mb-2 sm:mb-3">
            О нас
          </p>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl mb-3 sm:mb-4 text-[var(--heading)]">
            Искусство красоты в каждой детали
          </h2>
          <p className="text-sm sm:text-base lg:text-lg text-foreground/70">
            Colour Studio – это пространство, где традиции мастерства встречаются с современными трендами. Мы создаем не просто прически и макияж, мы создаем ваш уникальный стиль.
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="text-center group"
            >
              <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 bg-pink-100 rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto mb-2 sm:mb-3">
                <feature.icon className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-pink-600" />
              </div>
              <h3 className="text-sm sm:text-base lg:text-lg mb-1 sm:mb-2 text-[var(--heading)] px-1">{feature.title}</h3>
              <p className="text-xs sm:text-sm text-[#717182] px-1">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
