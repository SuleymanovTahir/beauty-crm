import { useState, useEffect, useRef } from "react";
import { Search, Clock, ChevronDown, X } from "lucide-react";
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
  const [displayCount, setDisplayCount] = useState(12);
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<{ id: string, label: string }[]>([]);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsCategoryDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const res = await fetch(`/api/public/services?language=${i18n.language}`);
        const data = await res.json();

        if (Array.isArray(data)) {
          setServices(data);

          const uniqueCategories = new Set(data.map((item: any) => item.category));
          const cats = [{ id: "all", label: t('allServices', { defaultValue: 'Все услуги' }) }];

          uniqueCategories.forEach(cat => {
            if (cat) {
              const catId = String(cat).toLowerCase();
              let label = t(catId, { defaultValue: catId.charAt(0).toUpperCase() + catId.slice(1) });
              if (!cats.find(c => c.id === cat)) {
                cats.push({ id: cat, label: label });
              }
            }
          });
          setCategories(cats);
        } else if (data.categories) {
          const flatServices: Service[] = [];
          const cats = [{ id: "all", label: t('allServices', { defaultValue: 'Все услуги' }) }];

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

  const filteredServices = services.filter((service) => {
    const matchesCategory = activeCategory === "all" || service.category === activeCategory;
    const serviceName = (service[`name_${i18n.language}` as keyof Service] || service.name_ru || service.name || "") as string;
    const matchesSearch = serviceName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const displayedServices = filteredServices.slice(0, displayCount);

  const activeCategoryLabel = categories.find(c => c.id === activeCategory)?.label || t('allServices', { defaultValue: 'Все услуги' });

  return (
    <section id="services" className="py-12 sm:py-16 lg:py-20 bg-background">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
        <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-12">
          <p className="text-xs sm:text-sm tracking-[0.15em] sm:tracking-[0.2em] uppercase text-muted-foreground mb-2 sm:mb-3">
            {t('servicesTag', { defaultValue: 'УСЛУГИ' })}
          </p>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl mb-3 sm:mb-4 text-[var(--heading)]">
            {t('servicesTitlePart1', { defaultValue: 'Что мы' })} <span className="text-primary">{t('servicesTitlePart2', { defaultValue: 'предлагаем' })}</span>
          </h2>
        </div>

        {/* Search and Category Filter Row */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8 max-w-2xl mx-auto">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
            <input
              type="text"
              placeholder={t('searchServices', { defaultValue: 'Поиск услуг...' })}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-12 pl-11 pr-4 rounded-full border border-primary/20 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Category Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
              className="flex items-center justify-between gap-2 h-12 px-5 rounded-full border border-primary bg-background text-primary font-medium text-sm min-w-[180px] hover:bg-primary/5 transition-colors"
            >
              <span className="truncate">{activeCategoryLabel}</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${isCategoryDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isCategoryDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-full mt-2 left-0 right-0 bg-background border border-border rounded-2xl shadow-lg overflow-hidden z-50"
              >
                <div className="max-h-64 overflow-y-auto py-2">
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => {
                        setActiveCategory(category.id);
                        setIsCategoryDropdownOpen(false);
                        setDisplayCount(12);
                      }}
                      className={`w-full text-left px-4 py-3 text-sm transition-colors ${activeCategory === category.id
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted text-foreground'
                        }`}
                    >
                      {category.label}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        </div>

        {/* Services Grid - Original Card Design */}
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
                className="service-card"
              >
                <div className="flex justify-between items-start mb-3 sm:mb-4">
                  <h3 className="text-lg sm:text-xl font-medium">
                    {service[`name_${i18n.language}` as keyof Service] || service.name_ru || service.name}
                  </h3>
                  <div className="service-badge">
                    {service.price} {t('currency', { defaultValue: 'AED' })}
                  </div>
                </div>
                <div className="service-footer">
                  <div className="service-meta">
                    <Clock className="w-4 h-4 mr-2" />
                    {service.duration && service.duration !== 0 ? `${service.duration} ` : ""}{t('min', { defaultValue: 'мин' })}
                  </div>
                  <Button
                    size="sm"
                    className="rounded-full bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground h-7 text-xs px-4"
                    onClick={() => {
                      window.location.hash = `booking?service=${service.id}`;
                      document.getElementById("booking")?.scrollIntoView({ behavior: "smooth" });
                    }}
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
            {t('noServicesFound', { defaultValue: 'Услуги не найдены' })}
          </div>
        )}

        {displayCount < filteredServices.length && (
          <div className="text-center mt-8 sm:mt-12">
            <Button
              variant="outline"
              onClick={() => setDisplayCount((prev) => prev + 12)}
              className="rounded-full px-8 border-primary/20 text-primary hover:bg-primary hover:text-primary-foreground"
            >
              {t('showMore', { defaultValue: 'Показать еще' })} ({filteredServices.length - displayCount})
            </Button>
          </div>
        )}
      </div>
    </section >
  );
}
