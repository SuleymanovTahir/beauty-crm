import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Button } from "./ui/button";

const services = {
  nails: [
    { name: "Маникюр классический", price: "от 2 500 ₽", duration: "60 мин" },
    { name: "Маникюр + покрытие гель-лак", price: "от 3 500 ₽", duration: "90 мин" },
    { name: "Наращивание ногтей", price: "от 4 500 ₽", duration: "120 мин" },
    { name: "Дизайн ногтей (1 ноготь)", price: "от 200 ₽", duration: "15 мин" },
    { name: "Педикюр классический", price: "от 3 000 ₽", duration: "75 мин" },
    { name: "Педикюр + покрытие гель-лак", price: "от 4 000 ₽", duration: "105 мин" },
    { name: "Укрепление ногтей", price: "от 500 ₽", duration: "30 мин" },
    { name: "Снятие покрытия", price: "от 500 ₽", duration: "20 мин" },
  ],
  hair: [
    { name: "Женская стрижка", price: "от 3 000 ₽", duration: "60 мин" },
    { name: "Мужская стрижка", price: "от 2 000 ₽", duration: "45 мин" },
    { name: "Окрашивание волос", price: "от 5 000 ₽", duration: "120 мин" },
    { name: "Сложное окрашивание", price: "от 8 000 ₽", duration: "180 мин" },
    { name: "Укладка", price: "от 2 500 ₽", duration: "45 мин" },
    { name: "Кератиновое выпрямление", price: "от 7 000 ₽", duration: "180 мин" },
    { name: "Ботокс для волос", price: "от 6 000 ₽", duration: "120 мин" },
    { name: "Вечерняя прическа", price: "от 4 000 ₽", duration: "90 мин" },
  ],
  makeup: [
    { name: "Дневной макияж", price: "от 3 500 ₽", duration: "60 мин" },
    { name: "Вечерний макияж", price: "от 5 000 ₽", duration: "90 мин" },
    { name: "Свадебный макияж", price: "от 7 000 ₽", duration: "120 мин" },
    { name: "Макияж для фотосессии", price: "от 6 000 ₽", duration: "90 мин" },
    { name: "Оформление бровей", price: "от 1 500 ₽", duration: "30 мин" },
    { name: "Окрашивание бровей", price: "от 1 000 ₽", duration: "20 мин" },
    { name: "Ламинирование ресниц", price: "от 3 000 ₽", duration: "60 мин" },
    { name: "Наращивание ресниц", price: "от 4 000 ₽", duration: "120 мин" },
  ],
  beauty: [
    { name: "Чистка лица", price: "от 4 000 ₽", duration: "75 мин" },
    { name: "Пилинг лица", price: "от 3 500 ₽", duration: "45 мин" },
    { name: "Массаж лица", price: "от 3 000 ₽", duration: "45 мин" },
    { name: "Альгинатная маска", price: "от 2 000 ₽", duration: "30 мин" },
    { name: "Мезотерапия", price: "от 5 000 ₽", duration: "60 мин" },
    { name: "Биоревитализация", price: "от 8 000 ₽", duration: "45 мин" },
    { name: "Контурная пластика губ", price: "от 12 000 ₽", duration: "60 мин" },
    { name: "Ботулинотерапия", price: "от 250 ₽/ед", duration: "30 мин" },
  ],
};

const tabs = [
  { value: "nails", label: "Ногтевой сервис" },
  { value: "hair", label: "Парикмахерские услуги" },
  { value: "makeup", label: "Макияж и брови" },
  { value: "beauty", label: "Косметология" },
];

export function Services() {
  const [activeTab, setActiveTab] = useState("nails");

  return (
    <section id="services" className="py-24 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <p className="text-sm tracking-[0.2em] uppercase text-muted-foreground mb-4">
            Наши услуги
          </p>
          <h2 className="text-4xl sm:text-5xl mb-6 text-primary">
            Полный спектр услуг для вашей красоты
          </h2>
          <p className="text-lg text-foreground/70">
            Профессиональный уход с использованием премиальных продуктов
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 gap-2 mb-12 bg-muted/50 p-2 rounded-2xl h-auto">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="py-4 rounded-xl data-[state=active]:bg-card data-[state=active]:shadow-sm whitespace-normal min-h-[60px]"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {Object.entries(services).map(([category, items]) => (
            <TabsContent key={category} value={category} className="mt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {items.map((service, index) => (
                  <div
                    key={index}
                    className="group bg-card border border-border/50 rounded-2xl p-6 hover:shadow-lg transition-all duration-300"
                  >
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1">
                        <h3 className="mb-2 text-primary group-hover:text-accent-foreground transition-colors">
                          {service.name}
                        </h3>
                        <p className="text-sm text-muted-foreground">{service.duration}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-primary whitespace-nowrap">{service.price}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>

        <div className="text-center mt-12">
          <Button
            onClick={() => {
              document.getElementById("booking")?.scrollIntoView({ behavior: "smooth" });
            }}
            className="bg-primary text-primary-foreground hover:bg-primary/90 px-8 py-6"
          >
            Записаться на услугу
          </Button>
        </div>
      </div>
    </section>
  );
}
