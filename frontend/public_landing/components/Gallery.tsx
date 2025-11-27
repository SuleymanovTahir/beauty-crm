import salonImage from "../assets/c35944ec2655ccc8750b237ba9f12712e579cbcc.png";

const galleryImages = [
  {
    url: salonImage,
    title: "Главный зал",
  },
  {
    url: salonImage,
    title: "Маникюрная зона",
  },
  {
    url: salonImage,
    title: "VIP кабинет",
  },
  {
    url: salonImage,
    title: "Зона окрашивания",
  },
];

export function Gallery() {
  return (
    <section id="gallery" className="py-24 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <p className="text-sm tracking-[0.2em] uppercase text-muted-foreground mb-4">
            Наш салон
          </p>
          <h2 className="text-4xl sm:text-5xl mb-6 text-primary">
            Атмосфера роскоши и комфорта
          </h2>
          <p className="text-lg text-foreground/70">
            Современный интерьер в светлых тонах создает атмосферу спокойствия и элегантности
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {galleryImages.map((item, index) => (
            <div
              key={index}
              className="group relative aspect-[4/3] overflow-hidden rounded-2xl bg-muted"
            >
              <img
                src={item.url}
                alt={item.title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-primary/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <p className="text-lg text-primary-foreground">{item.title}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 bg-accent/10 border border-accent/20 rounded-2xl p-8 text-center">
          <h3 className="mb-4 text-primary">Посетите нас</h3>
          <p className="text-foreground/70 mb-6 max-w-2xl mx-auto">
            Мы находимся в самом центре города. Приглашаем вас посетить наш салон
            и убедиться в высоком качестве наших услуг. Наши мастера с радостью
            проконсультируют вас и подберут идеальные процедуры.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center text-sm text-muted-foreground">
            <div>
              <p>Адрес: ул. Примерная, д. 10</p>
            </div>
            <div className="hidden sm:block">•</div>
            <div>
              <p>Часы работы: Пн-Вс 10:30 - 21:30</p>
            </div>
            <div className="hidden sm:block">•</div>
            <div>
              <p>Телефон: +7 (999) 123-45-67</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
