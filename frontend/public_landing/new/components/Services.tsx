import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { Hand, Scissors, Sparkles, Heart, Gift, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export function Services() {
  const { t, i18n } = useTranslation(['public_landing/services', 'public_landing', 'common']);
  const [loading, setLoading] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [isMobile, setIsMobile] = useState(false);

  const servicesData = t('items', { returnObjects: true, ns: 'public_landing/services' }) as Record<string, any> || {};

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 100);
    return () => clearTimeout(timer);
  }, [i18n.language]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const ITEMS_TO_SHOW = 4; // Show 4 services initially on mobile

  if (loading) {
    return <div className="py-24 text-center">Loading services...</div>;
  }

  return (
    <section className="py-12 sm:py-16 lg:py-24 px-4 sm:px-6 lg:px-12 bg-background">
      <div className="container mx-auto max-w-7xl">
        <div className="text-center mb-8 sm:mb-12 lg:mb-16">
          <p className="text-xs sm:text-sm tracking-[0.2em] uppercase text-muted-foreground mb-3 sm:mb-4">
            {t('servicesTag', { ns: 'public_landing' }) || "Our Services"}
          </p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl mb-4 sm:mb-6 text-[var(--heading)]">
            {t('servicesTitle', { ns: 'public_landing' }) || "Choose Your Service"}
          </h2>
          <p className="text-base sm:text-lg text-foreground/70 max-w-2xl mx-auto px-4">
            {t('servicesDesc', { ns: 'public_landing' }) || "We offer a wide range of premium beauty services."}
          </p>
        </div>

        <div className="space-y-4 sm:space-y-6">
          {Object.entries(groupedServices).map(([category, categoryServices]) => {
            const Icon = getTabIcon(category);
            const isExpanded = expandedCategories[category];
            const shouldShowToggle = isMobile && categoryServices.length > ITEMS_TO_SHOW;
            const displayedServices = (isMobile && !isExpanded)
              ? categoryServices.slice(0, ITEMS_TO_SHOW)
              : categoryServices;

            return (
              <div
                key={category}
                className="bg-card border-2 border-primary/20 rounded-2xl sm:rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all"
              >
                {/* Category Header */}
                <div className="bg-gradient-to-r from-primary/5 to-transparent px-4 sm:px-6 lg:px-8 py-4 sm:py-5 border-b border-primary/10">
                  <div className="flex items-center gap-3">
                    <div className="p-2 sm:p-2.5 bg-primary/10 rounded-xl">
                      <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                    </div>
                    <h3 className="text-lg sm:text-xl lg:text-2xl font-semibold text-[var(--heading)]">
                      {getTabLabel(category)}
                    </h3>
                    <span className="ml-auto text-xs sm:text-sm text-muted-foreground bg-primary/5 px-2 sm:px-3 py-1 rounded-full">
                      {categoryServices.length} {categoryServices.length === 1 ? 'услуга' : 'услуг'}
                    </span>
                  </div>
                </div>

                {/* Services Grid */}
                <div className="p-4 sm:p-6 lg:p-8">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
                    <AnimatePresence>
                      {displayedServices.map((service, index) => (
                        <motion.div
                          key={service.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          transition={{ delay: index * 0.05 }}
                          className="group bg-gradient-to-br from-white to-primary/5 border border-border/50 rounded-xl sm:rounded-2xl p-4 sm:p-5 hover:shadow-lg hover:border-primary/30 transition-all duration-300 hover:-translate-y-1"
                        >
                          <h4 className="text-sm sm:text-base lg:text-lg font-semibold text-foreground group-hover:text-primary transition-colors mb-2 line-clamp-2 min-h-[2.5rem] sm:min-h-[3rem]">
                            {service.name}
                          </h4>

                          {service.description && (
                            <p className="text-xs sm:text-sm text-[#717182] mb-3 line-clamp-2 min-h-[2.5rem]">
                              {service.description}
                            </p>
                          )}

                          <div className="flex items-end justify-between mt-auto pt-3 border-t border-border/30">
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
                            <span className="text-base sm:text-lg lg:text-xl font-bold text-pink-600 ml-auto">
                              {service.min_price && service.max_price ?
                                `${service.min_price}—${service.max_price}` :
                                service.price
                              } <span className="text-xs sm:text-sm">{service.currency}</span>
                            </span>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>

                  {/* Show More/Less Button */}
                  {shouldShowToggle && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="mt-6 text-center"
                    >
                      <button
                        onClick={() => toggleCategory(category)}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-primary/10 hover:bg-primary/20 text-primary rounded-full transition-all font-medium text-sm"
                      >
                        {isExpanded ? (
                          <>
                            <span>Показать меньше</span>
                            <ChevronDown className="w-4 h-4 rotate-180 transition-transform" />
                          </>
                        ) : (
                          <>
                            <span>Показать все ({categoryServices.length})</span>
                            <ChevronDown className="w-4 h-4 transition-transform" />
                          </>
                        )}
                      </button>
                    </motion.div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* CTA Button */}
        <div className="text-center mt-8 sm:mt-12 lg:mt-16">
          <Button
            onClick={() => {
              document.getElementById("booking")?.scrollIntoView({ behavior: "smooth" });
            }}
            className="hero-button-primary px-6 sm:px-8 lg:px-12 py-5 sm:py-6 text-base sm:text-lg shadow-lg hover:shadow-xl transition-all"
            size="lg"
          >
            {t('bookNowBtn') || "Book Now"}
          </Button>
        </div>
      </div>
    </section>
  );
}
