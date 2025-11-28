import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../src/components/ui/tabs";
import { Button } from "../../src/components/ui/button";
import { apiClient } from "../../src/api/client";
import { useLanguage } from "../LanguageContext";

interface Service {
  id: number;
  name: string;
  price: number;
  duration: number;
  category: string;
  description?: string;
}

export function Services() {
  const { t } = useLanguage();
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

  // Helper to categorize services
  const getCategory = (serviceCategory: string) => {
    const cat = serviceCategory?.toLowerCase() || '';
    if (cat.includes('маникюр') || cat.includes('педикюр') || cat.includes('manicure') || cat.includes('pedicure') || cat.includes('nails') || cat.includes('nail')) return 'nails';
    if (cat.includes('волос') || cat.includes('hair') || cat.includes('стриж') || cat.includes('cut') || cat.includes('color') || cat.includes('окрашивание')) return 'hair';
    if (cat.includes('макияж') || cat.includes('makeup') || cat.includes('бров') || cat.includes('brow') || cat.includes('ресниц') || cat.includes('lash')) return 'makeup';
    if (cat.includes('косметолог') || cat.includes('cosmetolog') || cat.includes('face') || cat.includes('лицо') || cat.includes('beauty')) return 'beauty';
    return 'other'; // New category for unmatched items
  };

  const groupedServices = services.reduce((acc, service) => {
    const category = getCategory(service.category);
    if (!acc[category]) acc[category] = [];
    acc[category].push(service);
    return acc;
  }, {} as Record<string, Service[]>);

  // Translation mapping for tabs
  const getTabLabel = (value: string) => {
    switch (value) {
      case 'nails': return t('nails') || "Nails";
      case 'hair': return t('hair') || "Hair";
      case 'makeup': return t('brows') || "Brows & Lashes";
      case 'beauty': return t('cosmetology') || "Cosmetology";
      case 'other': return t('otherServices') || "Other Services";
      default: return value;
    }
  };

  if (loading) {
    return <div className="py-24 text-center">Loading services...</div>;
  }

  return (
    <section className="py-24 px-6 lg:px-12 bg-white">
      <div className="container mx-auto max-w-7xl">
        <div className="text-center mb-16">
          <p className="text-sm tracking-[0.2em] uppercase text-muted-foreground mb-4">
            {t('servicesTag') || "Our Services"}
          </p>
          <h2 className="text-4xl sm:text-5xl mb-6 text-primary">
            {t('servicesTitle') || "Choose Your Service"}
          </h2>
          <p className="text-lg text-foreground/70">
            {t('servicesDesc') || "We offer a wide range of premium beauty services."}
          </p>
        </div>

        <Tabs defaultValue="nails" className="w-full">
          <TabsList className="flex flex-wrap justify-center gap-4 mb-12 bg-transparent">
            {Object.keys(groupedServices).map((category) => (
              <TabsTrigger
                key={category}
                value={category}
                className="px-8 py-3 rounded-full border border-primary/20 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all uppercase tracking-wider text-sm"
              >
                {getTabLabel(category)}
              </TabsTrigger>
            ))}
          </TabsList>

          {Object.entries(groupedServices).map(([category, categoryServices]) => (
            <TabsContent key={category} value={category} className="mt-0">
              <div className="grid md:grid-cols-2 gap-x-12 gap-y-8 max-w-4xl mx-auto">
                {categoryServices.map((service, index) => (
                  <div key={index} className="group flex justify-between items-baseline border-b border-primary/10 pb-4 hover:border-primary/30 transition-colors">
                    <div className="flex-1 pr-8">
                      <h3 className="text-xl text-foreground group-hover:text-primary transition-colors">
                        {service.name}
                      </h3>
                      {service.description && (
                        <p className="text-sm text-muted-foreground mt-1">{service.description}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-xl font-light whitespace-nowrap">
                        {service.price} AED
                      </span>
                      <span className="text-xs text-muted-foreground uppercase tracking-wider">
                        {service.duration} min
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="text-center mt-12">
                <Button
                  onClick={() => {
                    document.getElementById("booking")?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 px-10 py-6 text-lg"
                >
                  {t('bookNowBtn') || "Book Now"}
                </Button>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </section>
  );
}
