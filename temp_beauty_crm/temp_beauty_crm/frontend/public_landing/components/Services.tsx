import { useState, useEffect, useRef } from "react";
import { Search, Clock, ChevronDown, X } from "lucide-react";
import { Button } from "./ui/button";
import { motion, AnimatePresence } from "motion/react";
import { useTranslation } from "react-i18next";
import { useCurrency } from "../../src/hooks/useSalonSettings";
import { LIMITS } from "../utils/constants";

interface Service {
  id: number;
  name: string;
  name?: string;
  name?: string;
  price: number;
  duration: number;
  category: string;
}

interface ServicesProps {
  initialServices?: Service[];
}

export function Services({ initialServices }: ServicesProps) {
  const { t, i18n } = useTranslation(['public_landing', 'booking', 'common', 'dynamic']);
  const { formatCurrency } = useCurrency();
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [displayCount, setDisplayCount] = useState<number>(LIMITS.DISPLAY_SERVICES_COUNT);
  const [services, setServices] = useState<Service[]>(initialServices || []);
  const [categories, setCategories] = useState<{ id: string, label: string }[]>([]);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const processServicesData = (data: any) => {
    if (Array.isArray(data)) {
      setServices(data);

      const uniqueCategories = new Set(data.map((item: any) => item.category));
      const cats = [{ id: "all", label: t('allServices') }];

      uniqueCategories.forEach(cat => {
        if (cat) {
          // Try to get translation from dynamic or booking files
          let label = t(`dynamic:categories.${cat}`, { defaultValue: "" });

          if (!label) {
            label = t(`services.category_${cat}`, { ns: 'booking', defaultValue: "" });
          }

          // If translation not found, use capitalized category name
          if (!label) {
            label = cat.charAt(0).toUpperCase() + cat.slice(1).toLowerCase();
          }

          if (!cats.find(c => c.id === cat)) {
            cats.push({ id: cat, label: label });
          }
        }
      });
      setCategories(cats);
    } else if (data.categories) {
      const flatServices: Service[] = [];
      const cats = [{ id: "all", label: t('allServices') }];

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
  };

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
    if (initialServices && initialServices.length > 0) {
      processServicesData(initialServices);
      return;
    }

    const fetchServices = async () => {
      try {
        const res = await fetch(`/api/public/services?language=${i18n.language}`);
        const data = await res.json();
        processServicesData(data);
      } catch (error) {
        console.error("Error loading services:", error);
      }
    };
    fetchServices();
  }, [initialServices, i18n.language]);


  const filteredServices = services.filter((service) => {
    const matchesCategory = activeCategory === "all" || service.category === activeCategory;
    const matchesSearch = (service?.name ?? "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const displayedServices = filteredServices.slice(0, displayCount);

  const activeCategoryLabel = categories.find(c => c.id === activeCategory)?.label || t('allServices');

  return (
    <section id="services" className="py-12 sm:py-16 lg:py-20 bg-background">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
        <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-12">
          <p className="text-xs sm:text-sm tracking-[0.15em] sm:tracking-[0.2em] uppercase text-muted-foreground mb-2 sm:mb-3">
            {t('servicesTag')}
          </p>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl mb-3 sm:mb-4 text-[var(--heading)]">
            {t('servicesTitlePart1')} <span className="text-primary">{t('servicesTitlePart2')}</span>
          </h2>
        </div>

        {/* Search and Category Filter Row */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8 max-w-2xl mx-auto">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
            <input
              type="text"
              placeholder={t('searchServices')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="service-search-input"
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
              className="service-category-btn"
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
                        setDisplayCount(LIMITS.DISPLAY_SERVICES_COUNT);
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
                className="service-card group cursor-pointer relative overflow-hidden"
              >
                <div className="service-category-tag ">
                  {categories.find(c => c.id === service.category)?.label}
                </div>
                <div className="flex justify-between items-start mb-3 sm:mb-4 gap-2">
                  <h3 className="text-[13px] sm:text-base font-medium group-hover:text-primary transition-colors pr-2">
                    {t(`dynamic:services.${service.id}.name`, { defaultValue: service.name || "" })}
                  </h3>
                  <div className="service-badge flex-shrink-0 ">
                    {formatCurrency(service.price)}
                  </div>
                </div>
                <div className="service-footer">
                  <div className="service-meta">
                    <Clock className="w-3.5 h-3.5 mr-1.5 opacity-60" />
                    <span className="flex items-center gap-1.5">
                      <span>{service.duration && service.duration !== 0 ? `${service.duration} ` : ""}{t('min')}</span>
                      <span className="text-muted-foreground/30">•</span>
                      <span className="text-[10px] uppercase tracking-wider opacity-70">
                        {categories.find(c => c.id === service.category)?.label}
                      </span>
                    </span>
                  </div>
                  <Button
                    size="sm"
                    className="service-book-btn translate-y-1"
                    onClick={() => {
                      const serviceId = service.id;
                      window.location.hash = `booking?service=${serviceId}`;
                      document.getElementById("booking")?.scrollIntoView({ behavior: "smooth" });
                    }}
                  >
                    {t('book')}
                  </Button>

                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {displayedServices.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            {t('noServicesFound')}
          </div>
        )}

        {displayCount < filteredServices.length && (
          <div className="text-center mt-8 sm:mt-12">
            <Button
              variant="outline"
              onClick={() => setDisplayCount((prev) => prev + LIMITS.DISPLAY_SERVICES_COUNT)}
              className="service-show-more-btn"
            >
              {t('showMore')} ({filteredServices.length - displayCount})
            </Button>
          </div>
        )}
      </div>
    </section >
  );
}
