// /frontend/public_landing/components/Services.tsx
import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../src/components/ui/tabs";
import { Button } from "../../src/components/ui/button";
import { useTranslation } from "react-i18next";
import { Hand, Scissors, Sparkles, Heart, Gift } from "lucide-react";



export function Services() {
  const { t, i18n } = useTranslation(['public_landing/services', 'public_landing', 'common']);
  const [loading, setLoading] = useState(true);

  // Load services from i18n locale files instead of API
  const servicesData = t('items', { returnObjects: true, ns: 'public_landing/services' }) as Record<string, any> || {};

  useEffect(() => {
    // Simulate loading delay for smooth transition
    const timer = setTimeout(() => setLoading(false), 100);
    return () => clearTimeout(timer);
  }, [i18n.language]);

  // Convert services object to array
  const services = Object.entries(servicesData).map(([key, service]: [string, any]) => ({
    id: key,
    service_key: key,
    name: service.name || '',
    description: service.description || '',
    price: service.price || service.min_price || 0,
    min_price: service.min_price,
    max_price: service.max_price,
    duration: service.duration || '',
    category: service.category || 'other',
    currency: service.currency || 'AED'
  }));

  // Helper to categorize services
  const getCategory = (serviceCategory: string | null | undefined) => {
    const cat = (serviceCategory || '')?.toLowerCase();
    if (cat.includes('nail') || cat.includes('тырнақ') || cat.includes('ногт') || cat.includes('manicure') || cat.includes('pedicure')) return 'nails';
    if (cat.includes('hair') || cat.includes('шаш') || cat.includes('волос') || cat.includes('стриж') || cat.includes('cut') || cat.includes('color')) return 'hair';
    if (cat.includes('brow') || cat.includes('lash') || cat.includes('қас') || cat.includes('кірпік') || cat.includes('бров') || cat.includes('ресниц') || cat.includes('permanent')) return 'makeup';
    if (cat.includes('face') || cat.includes('бет') || cat.includes('лицо') || cat.includes('массаж') || cat.includes('massage') || cat.includes('wax') || cat.includes('балауыз')) return 'beauty';
    if (cat.includes('promo') || cat.includes('промо') || cat.includes('акция')) return 'promo';
    return 'other';
  };

  const groupedServices = services.reduce((acc, service) => {
    const category = getCategory(service.category);
    if (!acc[category]) acc[category] = [];
    acc[category].push(service);
    return acc;
  }, {} as Record<string, typeof services>);

  // Translation mapping for tabs
  const getTabLabel = (value: string) => {
    switch (value) {
      case 'nails': return t('nails', { ns: 'public_landing' }) || "Nails";
      case 'hair': return t('hair', { ns: 'public_landing' }) || "Hair";
      case 'makeup': return t('brows', { ns: 'public_landing' }) || "Brows & Lashes";
      case 'beauty': return t('cosmetology', { ns: 'public_landing' }) || "Cosmetology";
      case 'other': return t('otherServices', { ns: 'public_landing' }) || "Other Services";
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
    <section className="py-24 px-6 lg:px-12 bg-background">
      <div className="container mx-auto max-w-7xl">
        <div className="text-center mb-16">
          <p className="text-sm tracking-[0.2em] uppercase text-muted-foreground mb-4">
            {t('servicesTag', { ns: 'public_landing' }) || "Our Services"}
          </p>
          <h2 className="text-4xl sm:text-5xl mb-6 text-[var(--heading)]">
            {t('servicesTitle', { ns: 'public_landing' }) || "Choose Your Service"}
          </h2>
          <p className="text-lg text-foreground/70">
            {t('servicesDesc', { ns: 'public_landing' }) || "We offer a wide range of premium beauty services."}
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 gap-2 mb-12 bg-transparent p-2 rounded-2xl h-auto">
            {Object.keys(groupedServices).map((category) => {
              const Icon = getTabIcon(category);
              const isActive = activeTab === category;
              return (
                <TabsTrigger
                  key={category}
                  value={category}
                  className="py-4 rounded-xl whitespace-normal min-h-[60px] transition-all hover:bg-muted-foreground/10 data-[state=active]:shadow-lg border border-primary bg-[#faf8f6] text-primary"
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
                {categoryServices.map((service, index) => (
                  <div
                    key={index}
                    className="group bg-card border border-border/50 rounded-2xl p-4 sm:p-5 hover:shadow-lg transition-all duration-300"
                  >
                    <h3 className="text-base sm:text-lg font-semibold text-foreground group-hover:text-primary transition-colors mb-2">
                      {service.name}
                    </h3>

                    {service.description && (
                      <p className="text-xs sm:text-sm text-[#717182] mb-3 line-clamp-2">{service.description}</p>
                    )}

                    <div className="flex items-center justify-between mt-auto pt-2">
                      {service.duration && (
                        <span className="text-xs sm:text-sm text-muted-foreground">
                          {(() => {
                            const duration = String(service.duration).trim();
                            if (/^\d+$/.test(duration)) {
                              return `${duration} min`;
                            }
                            return duration;
                          })()}
                        </span>
                      )}
                      <span className="text-base sm:text-lg font-bold text-pink-600 ml-auto">
                        {service.min_price && service.max_price ?
                          `${service.min_price} — ${service.max_price}` :
                          service.price
                        } {service.currency}
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
