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
    <section id="about" className="py-24 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <p className="text-sm tracking-[0.2em] uppercase text-muted-foreground mb-4">
            О нас
          </p>
          <h2 className="text-4xl sm:text-5xl mb-6 text-primary">
            Искусство красоты в каждой детали
          </h2>
          <p className="text-lg text-foreground/70">
            Colour Studio – это пространство, где традиции мастерства встречаются с современными 
            трендами. Мы создаем не просто прически и макияж, мы создаем ваш уникальный стиль.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group relative bg-card p-8 rounded-2xl transition-all duration-300 hover:shadow-lg"
            >
              <div className="mb-6 inline-flex items-center justify-center w-14 h-14 rounded-full bg-accent/20 text-accent-foreground">
                <feature.icon className="w-6 h-6" />
              </div>
              <h3 className="mb-3 text-primary">{feature.title}</h3>
              <p className="text-sm text-foreground/70">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
