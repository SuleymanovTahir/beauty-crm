import { useState, useEffect } from "react";
import { Search, Clock, Hand, Scissors, Sparkles } from "lucide-react";
import { Button } from "./ui/button";
import { motion, AnimatePresence } from "motion/react";
import { useTranslation } from "react-i18next";

interface Service {
  id: number;
  name: string;
  name_ru?: string;
  name_en?: string;
  price: number;
  duration: number;
  category: string;
}

export function Services() {
  const { t, i18n } = useTranslation(['public_landing', 'common']);
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [displayCount, setDisplayCount] = useState(9);
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<{ id: string, label: string }[]>([]);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        // Use relative path to leverage Vite proxy
        const res = await fetch(`/api/public/services?language=${i18n.language}`);
        const data = await res.json();

        // Transform data: backend returns categories with items. We need flat services list and categories list.
        if (Array.isArray(data)) {
          console.log("Services loaded:", data.length);
          // Set services directly
          setServices(data);

          // Extract unique categories
          const uniqueCategories = new Set(data.map((item: any) => item.category));
          const cats = [{ id: "all", label: t('allServices', { defaultValue: 'Все' }) }];

          uniqueCategories.forEach(cat => {
            if (cat) {
              const catId = String(cat).toLowerCase();
              // Universal translation attempt:
              // Try to translate using the category ID as key, fallback to capitalized ID
              let label = t(catId, { defaultValue: catId.charAt(0).toUpperCase() + catId.slice(1) });

              // Special case: 'waxing' -> 'epilation' (if desired, but better to keep 1:1)
              // We'll trust the translation file has keys like 'nails', 'hair', 'brows', etc.

              // Avoid duplicates if casing differs slightly in DB
              if (!cats.find(c => c.id === cat)) {
                cats.push({ id: cat, label: label });
              }
            }
          });
          setCategories(cats);
        } else if (data.categories) {
          // Fallback for nested structure if API changes back
          const flatServices: Service[] = [];
          const cats = [{ id: "all", label: t('allServices', { defaultValue: 'Все' }) }];

          data.categories.forEach((cat: any) => {
            cats.push({ id: cat.id, label: cat.title });
            if (cat.items) {
              flatServices.push(...cat.items.map((item: any) => ({
                ...item,
                category: cat.id
              })));
            }
          });
          setServices(flatServices);
          setCategories(cats);
        }
      } catch (error) {
        console.error("Error loading services:", error);
      }
    };
    fetchServices();
  }, [i18n.language]);

  const getCategoryIcon = (categoryId: string) => {
    switch (categoryId.toLowerCase()) {
      case 'nails': return Hand;
      case 'hair': return Scissors;
      case 'face': return Sparkles; // Assuming face/cosmetology
      default: return Sparkles;
    }
  };

  const filteredServices = services.filter((service) => {
    const matchesCategory = activeCategory === "all" || service.category === activeCategory;
    const matchesSearch =
      (service.name_ru && service.name_ru.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (service.name_en && service.name_en.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (service.name && service.name.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const displayedServices = filteredServices.slice(0, displayCount);

  return (
    <section id="services" className="py-12 sm:py-16 lg:py-24 bg-background">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
        <div className="text-center mb-8 sm:mb-12 max-w-3xl mx-auto">
          <p className="text-xs sm:text-sm tracking-[0.15em] sm:tracking-[0.2em] uppercase text-muted-foreground mb-3">
            {t('servicesTag', { defaultValue: 'Наши услуги' })}
          </p>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl mb-3 sm:mb-4 text-[var(--heading)]">
            {t('servicesTitle', { defaultValue: 'Выберите свою услугу' })}
          </h2>
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder={t('searchServicePlaceholder', { defaultValue: 'Поиск услуги...' })}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 sm:h-12 pl-10 pr-4 rounded-full border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
            />
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-2 mb-8 sm:mb-12">
          {categories.map((category) => {
            const Icon = getCategoryIcon(category.id);
            return (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={`flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 rounded-full transition-all text-sm sm:text-base ${activeCategory === category.id
                  ? "bg-primary text-primary-foreground shadow-lg scale-105"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
              >
                {category.id !== "all" && <Icon className="w-4 h-4" />}
                {category.label}
              </button>
            )
          })}
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          <AnimatePresence mode="popLayout">
            {displayedServices.map((service) => (
              <motion.div
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
                key={service.id}
                className="bg-card rounded-xl sm:rounded-2xl p-4 sm:p-6 hover:shadow-lg transition-shadow border border-border/50 group"
              >
                <div className="flex justify-between items-start mb-3 sm:mb-4">
                  <h3 className="text-lg sm:text-xl font-medium text-[var(--heading)] group-hover:text-primary transition-colors">
                    {service[`name_${i18n.language}` as keyof Service] || service.name_ru || service.name}
                  </h3>
                  <div className="flex items-center text-primary bg-primary/10 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap">
                    {service.price} {t('currency', { defaultValue: 'AED' })}
                  </div>
                </div>
                <div className="flex justify-between items-center mt-4 pt-3 border-t border-border/50">
                  <div className="flex items-center text-muted-foreground text-xs sm:text-sm">
                    <Clock className="w-4 h-4 mr-2 text-primary/60" />
                    {service.duration} {t('min', { defaultValue: 'мин' })}
                  </div>
                  <Button
                    size="sm"
                    className="rounded-full bg-primary/10 text-primary hover:bg-primary hover:text-white transition-colors h-7 text-xs px-4"
                    onClick={() => document.getElementById("booking")?.scrollIntoView({ behavior: "smooth" })}
                  >
                    {t('book', { defaultValue: 'Записаться' })}
                  </Button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {displayedServices.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            {t('noServicesFound', { defaultValue: 'Найдено 0 услуг' })}
          </div>
        )}

        {displayCount < filteredServices.length && (
          <div className="text-center mt-8 sm:mt-12">
            <Button
              variant="outline"
              onClick={() => setDisplayCount((prev) => prev + 6)}
              className="rounded-full px-8 border-primary text-primary hover:bg-primary hover:text-primary-foreground"
            >
              {t('showMore', { defaultValue: 'Показать еще' })} ({filteredServices.length - displayCount})
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
