// /frontend/public_landing/components/Services.tsx
import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../src/components/ui/tabs";
import { Button } from "../../src/components/ui/button";
import { apiClient } from "../../src/api/client";
import { useTranslation } from "react-i18next";
import { Hand, Scissors, Sparkles, Heart, Gift } from "lucide-react";

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
  const { t, i18n } = useTranslation(['public_landing', 'common', 'dynamic']);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.getPublicServices()
      .then((data: any) => {
        setServices(Array.isArray(data) ? data : []);
      })
      .catch(err => console.error('Error loading services:', err))
      .finally(() => setLoading(false));
  }, [t]);

  // Helper to categorize services
  const getCategory = (serviceCategory: string | null | undefined) => {
    const cat = (serviceCategory || '')?.toLowerCase();
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

  // Icon mapping for tabs
  const getTabIcon = (value: string) => {
    switch (value) {
      case 'nails': return Hand;
      case 'hair': return Scissors;
      case 'makeup': return Sparkles;
      case 'beauty': return Heart;
      case 'other': return Gift;
      default: return Sparkles;
    }
  };

  const [activeTab, setActiveTab] = useState("nails");

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
          <h2 className="text-4xl sm:text-5xl mb-6 text-[var(--heading)]">
            {t('servicesTitle') || "Choose Your Service"}
          </h2>
          <p className="text-lg text-foreground/70">
            {t('servicesDesc') || "We offer a wide range of premium beauty services."}
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 gap-2 mb-12 bg-muted/50 p-2 rounded-2xl h-auto">
            {Object.keys(groupedServices).map((category) => {
              const Icon = getTabIcon(category);
              const isActive = activeTab === category;
              return (
                <TabsTrigger
                  key={category}
                  value={category}
                  className="py-4 rounded-xl whitespace-normal min-h-[60px] transition-all hover:bg-muted-foreground/10 data-[state=active]:shadow-lg border border-border/50"
                  style={isActive ? { backgroundColor: '#db2777', color: 'white' } : {}}
                >
                  <div className="flex items-center gap-2 justify-center">
                    <Icon className={`w-4 h-4 ${isActive ? '' : 'text-primary'}`} style={isActive ? { color: 'white' } : {}} />
                    <span>{getTabLabel(category)}</span>
                  </div>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {Object.entries(groupedServices).map(([category, categoryServices]) => (
            <TabsContent key={category} value={category} className="mt-0">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
                {categoryServices.map((service, index) => {
                  // Use API provided localized fields
                  const currentLang = i18n.language;
                  const localizedName = service[`name_${currentLang}`] || service.name;
                  const localizedDescription = service[`description_${currentLang}`] || service.description;
                  const localizedDuration = service[`duration_${currentLang}`] || service.duration;

                  return (
                    <div
                      key={index}
                      className="group bg-card border border-border/50 rounded-2xl p-4 sm:p-5 hover:shadow-lg transition-all duration-300"
                    >
                      <h3 className="text-base sm:text-lg font-semibold text-foreground group-hover:text-primary transition-colors mb-2">
                        {localizedName}
                      </h3>

                      {localizedDescription && (
                        <p className="text-xs sm:text-sm text-muted-foreground mb-3 line-clamp-2">{localizedDescription}</p>
                      )}

                      <div className="flex items-center justify-between mt-auto pt-2">
                        {localizedDuration && (
                          <span className="text-xs sm:text-sm text-muted-foreground">
                            {(() => {
                              const duration = String(localizedDuration);
                              if (/[a-zа-я]/i.test(duration)) {
                                return duration;
                              }
                              return `${duration} min`;
                            })()}
                          </span>
                        )}
                        <span className="text-base sm:text-lg font-bold text-pink-600 ml-auto">
                          {service.price} {service.currency || 'AED'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="text-center mt-12">
                <Button
                  onClick={() => {
                    document.getElementById("booking")?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="hero-button-primary px-8 py-6"
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
