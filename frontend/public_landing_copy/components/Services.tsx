import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../components/ui/tabs";
import { Button } from "../../../components/ui/button";
import { apiClient } from "../../../src/api/client";
import { useLanguage } from "../LanguageContext";
import { Clock, Calendar } from "lucide-react";

interface Service {
  id: number;
  name: string;
  price: number;
  duration: number;
  category: string;
  description?: string;
  currency?: string;
  name_ru?: string;
  description_ru?: string;
  [key: string]: any;
}

export function Services() {
  const { t, language } = useLanguage();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.getPublicServices()
      .then((data: any) => {
        setServices(Array.isArray(data) ? data : []);
      })
      .catch(err => console.error('Error loading services:', err))
      .finally(() => setLoading(false));
  }, []);

  const getCategory = (serviceCategory: string | null | undefined) => {
    const cat = (serviceCategory || '')?.toLowerCase();
    if (cat.includes('маникюр') || cat.includes('педикюр') || cat.includes('manicure') || cat.includes('pedicure') || cat.includes('nails') || cat.includes('nail')) return 'nails';
    if (cat.includes('волос') || cat.includes('hair') || cat.includes('стриж') || cat.includes('cut') || cat.includes('color') || cat.includes('окрашивание')) return 'hair';
    if (cat.includes('макияж') || cat.includes('makeup') || cat.includes('бров') || cat.includes('brow') || cat.includes('ресниц') || cat.includes('lash')) return 'makeup';
    if (cat.includes('косметолог') || cat.includes('cosmetolog') || cat.includes('face') || cat.includes('лицо') || cat.includes('beauty')) return 'beauty';
    return 'other';
  };

  const groupedServices = services.reduce((acc, service) => {
    const category = getCategory(service.category);
    if (!acc[category]) acc[category] = [];
    acc[category].push(service);
    return acc;
  }, {} as Record<string, Service[]>);

  const getTabLabel = (value: string) => {
    switch (value) {
      case 'nails': return t('nails', { defaultValue: "Ногти" });
      case 'hair': return t('hair', { defaultValue: "Волосы" });
      case 'makeup': return t('brows', { defaultValue: "Брови и ресницы" });
      case 'beauty': return t('cosmetology', { defaultValue: "Косметология" });
      case 'other': return t('otherServices', { defaultValue: "Другое" });
      default: return value;
    }
  };

  const [activeTab, setActiveTab] = useState("nails");

  if (loading) {
    return <div className="py-24 text-center">{t('loading', { defaultValue: 'Загрузка...' })}</div>;
  }

  return (
    <section className="py-16 sm:py-24 px-4 sm:px-6 lg:px-12 bg-white">
      <div className="container mx-auto max-w-7xl">
        <div className="text-center mb-12 sm:mb-16">
          <p className="text-xs sm:text-sm tracking-[0.2em] uppercase text-muted-foreground mb-4">
            {t('servicesTag', { defaultValue: "Наши услуги" })}
          </p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl mb-4 sm:mb-6 text-primary">
            {t('servicesTitle', { defaultValue: "Выберите свою услугу" })}
          </h2>
          <p className="text-base sm:text-lg text-foreground/70 max-w-2xl mx-auto">
            {t('servicesDesc', { defaultValue: "Мы предлагаем широкий спектр премиальных услуг красоты" })}
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 mb-8 sm:mb-12 bg-muted/50 p-2 rounded-2xl h-auto">
            {Object.keys(groupedServices).map((category) => (
              <TabsTrigger
                key={category}
                value={category}
                className="py-3 sm:py-4 rounded-xl whitespace-normal min-h-[50px] sm:min-h-[60px] transition-all hover:bg-muted-foreground/10 data-[state=active]:shadow-lg text-xs sm:text-sm"
              >
                {getTabLabel(category)}
              </TabsTrigger>
            ))}
          </TabsList>

          {Object.entries(groupedServices).map(([category, categoryServices]) => (
            <TabsContent key={category} value={category} className="mt-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {categoryServices.map((service, index) => {
                  const localizedName = service[`name_${language}`] || service.name_ru || service.name;
                  const localizedDescription = service[`description_${language}`] || service.description_ru || service.description;

                  return (
                    <div
                      key={index}
                      className="group bg-card border-2 border-border/50 rounded-2xl p-5 sm:p-6 hover:shadow-xl hover:border-primary/50 transition-all duration-300"
                    >
                      <div className="flex flex-col gap-3 sm:gap-4 h-full">
                        <div className="flex-1">
                          <h3 className="mb-2 text-base sm:text-lg text-primary group-hover:text-accent-foreground transition-colors">
                            {localizedName}
                          </h3>
                          {localizedDescription && (
                            <p className="text-xs sm:text-sm text-muted-foreground mb-3 line-clamp-2">{localizedDescription}</p>
                          )}
                          <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground mb-3">
                            <Clock className="w-4 h-4" />
                            <span>{service.duration} мин</span>
                          </div>
                          <div className="text-xl sm:text-2xl text-primary">
                            {service.price} {service.currency || 'AED'}
                          </div>
                        </div>
                        <Button
                          onClick={() => {
                            document.getElementById("booking")?.scrollIntoView({ behavior: "smooth" });
                          }}
                          className="w-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                          size="sm"
                        >
                          <Calendar className="w-4 h-4" />
                          {t('bookNowBtn', { defaultValue: "Записаться" })}
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="text-center mt-8 sm:mt-12 space-y-4">
                <p className="text-sm sm:text-base text-muted-foreground">
                  {t('servicesCallToAction', { defaultValue: 'Готовы преобразиться? Запишитесь на услугу прямо сейчас!' })}
                </p>
                <Button
                  onClick={() => {
                    document.getElementById("booking")?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 px-8 sm:px-12 py-5 sm:py-6 shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
                  size="lg"
                >
                  <Calendar className="w-5 h-5" />
                  {t('bookNow', { defaultValue: "Забронировать сейчас" })}
                </Button>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </section>
  );
}
