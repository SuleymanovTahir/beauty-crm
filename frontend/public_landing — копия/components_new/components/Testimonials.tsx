import { Star } from "lucide-react";

const testimonials = [
  {
    name: "Екатерина Смирнова",
    text: "Colour Studio - это место, куда хочется возвращаться снова и снова. Атмосфера роскоши, профессионализм мастеров и безупречный результат каждый раз!",
    rating: 5,
    service: "Окрашивание волос",
  },
  {
    name: "Анастасия Белова",
    text: "Делала здесь свадебный макияж и прическу. Результат превзошел все ожидания! Профессионалы высочайшего уровня. Спасибо огромное!",
    rating: 5,
    service: "Свадебный образ",
  },
  {
    name: "Виктория Морозова",
    text: "Уже несколько лет делаю маникюр только здесь. Качество работы и материалов на высоте. Мастера - настоящие художники!",
    rating: 5,
    service: "Маникюр",
  },
  {
    name: "Дарья Новикова",
    text: "Потрясающее место! Стильный интерьер, приятная атмосфера и внимательное отношение. После процедур чувствуешь себя королевой.",
    rating: 5,
    service: "Комплексный уход",
  },
  {
    name: "Ольга Соловьева",
    text: "Впервые попробовала здесь кератиновое выпрямление. Результат держится уже 4 месяца! Очень довольна качеством услуг.",
    rating: 5,
    service: "Уход за волосами",
  },
  {
    name: "Мария Павлова",
    text: "Colour Studio - это не просто салон, это целый мир красоты и стиля. Рекомендую всем своим подругам!",
    rating: 5,
    service: "Парикмахерские услуги",
  },
];

export function Testimonials() {
  return (
    <section id="testimonials" className="py-24 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <p className="text-sm tracking-[0.2em] uppercase text-muted-foreground mb-4">
            Отзывы клиентов
          </p>
          <h2 className="text-4xl sm:text-5xl mb-6 text-primary">
            Что говорят о нас
          </h2>
          <p className="text-lg text-foreground/70">
            Мы ценим доверие каждого клиента и гордимся положительными отзывами
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="bg-card rounded-2xl p-8 border border-border/50 hover:shadow-lg transition-all duration-300"
            >
              <div className="flex gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-accent text-accent" />
                ))}
              </div>
              <p className="text-foreground/80 mb-6 leading-relaxed">
                "{testimonial.text}"
              </p>
              <div className="border-t border-border/50 pt-4">
                <p className="text-primary mb-1">{testimonial.name}</p>
                <p className="text-sm text-muted-foreground">{testimonial.service}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
