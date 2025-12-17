// /frontend/public_landing/components/Services.tsx
import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search, Star, Clock, Sparkles, Heart, Gift, Hand, Scissors, User,
  X, Calendar
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../src/components/ui/button';
import { Input } from '../../src/components/ui/input';
import { Badge } from '../../src/components/ui/badge';
import { Card, CardContent } from '../../src/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../../src/components/ui/accordion';
import { apiClient } from '../../src/api/client';

interface Service {
  id: number;
  name: string;
  price: number;
  currency: string;
  duration?: number;
  category: string;
  description?: string;
  min_price?: number;
  max_price?: number;
}

const CATEGORY_ICONS: Record<string, any> = {
  'nails': Hand,
  'hair': Scissors,
  'makeup': Sparkles,
  'brows': Sparkles,
  'face': Sparkles,
  'body': User,
  'depilation': Sparkles,
  'manicure': Hand,
  'pedicure': Hand,
  'brows & lashes': Sparkles,
  'cosmetology': Heart,
  'other': Gift
};

const getCategoryIcon = (category: string) => {
  const norm = category?.toLowerCase() || 'other';
  if (norm.includes('nail') || norm.includes('manicure') || norm.includes('pedicure')) return Hand;
  if (norm.includes('hair') || norm.includes('cut') || norm.includes('color')) return Scissors;
  if (norm.includes('brow') || norm.includes('lash')) return Sparkles;
  if (norm.includes('face') || norm.includes('cosmetology') || norm.includes('skin')) return Heart;
  if (norm.includes('body') || norm.includes('massage')) return User;
  return Sparkles;
};

export function Services() {
  const { t, i18n } = useTranslation(['public_landing/services', 'public_landing', 'common']);
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState<Service[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  useEffect(() => {
    const fetchServices = async () => {
      setLoading(true);
      try {
        const data = await apiClient.getPublicServices(i18n.language);
        setServices(data || []);
      } catch (error) {
        console.error("Failed to fetch services", error);
      } finally {
        setLoading(false);
      }
    };

    fetchServices();
  }, [i18n.language]);

  const categories = useMemo(() => {
    const cats = new Set(services.map(s => s.category));
    return Array.from(cats).sort((a, b) => a.localeCompare(b));
  }, [services]);

  useEffect(() => {
    if (categories.length > 0 && selectedCategory === '') {
      setSelectedCategory(categories[0]);
    }
  }, [categories, selectedCategory]);

  const filteredServices = useMemo(() => {
    return services.filter(service => {
      const matchesSearch = service.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === '' || service.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory, services]);

  const handleBookClick = () => {
    document.getElementById("booking")?.scrollIntoView({ behavior: "smooth" });
  };

  if (loading) {
    return <div className="py-24 text-center">Loading services...</div>;
  }

  return (
    <section id="services" className="py-20 bg-white">
      <div className="container mx-auto px-4 max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <p className="text-sm tracking-[0.2em] uppercase text-muted-foreground mb-4 text-primary">
            {t('servicesTag', { ns: 'public_landing' }) || "Our Services"}
          </p>
          <h2 className="text-4xl font-bold mb-4 text-[var(--heading)]">
            {t('servicesTitle', { ns: 'public_landing' }) || "Choose Your Service"}
          </h2>
          <p className="text-lg text-gray-600">
            {t('servicesDesc', { ns: 'public_landing' }) || "We offer a wide range of premium beauty services."}
          </p>
        </motion.div>

        {/* Search and Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-12"
        >
          {/* Using Card component as requested (Boxed Design) */}
          <Card className="p-4 md:p-6 border-pink-100 shadow-lg">
            {/* 
               SEARCH BAR:
               Using 'max-w-2xl' as per user preference for "normal size",
               centered horizontally.
            */}
            <div className="flex flex-col items-center gap-4 mb-6">
              <div className="relative w-full max-w-2xl">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  type="text"
                  placeholder={t('searchPlaceholder', { ns: 'public_landing' }) || "Search service..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 border-pink-200 focus:border-primary w-full rounded-full"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                  >
                    <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                  </button>
                )}
              </div>
            </div>

            {/* Category Pills */}
            <div className="flex overflow-x-auto md:flex-wrap justify-center gap-2 pb-2 md:pb-0 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
              {categories.map((category) => {
                const Icon = getCategoryIcon(category);
                const label = category.charAt(0).toUpperCase() + category.slice(1);

                return (
                  <Button
                    key={category}
                    variant={selectedCategory === category ? "default" : "outline"}
                    onClick={() => setSelectedCategory(category)}
                    className={`
                      whitespace-nowrap flex-shrink-0
                      ${selectedCategory === category
                        ? "bg-primary hover:bg-primary/90 text-primary-foreground border-0"
                        : "border-pink-200 text-gray-700 hover:bg-pink-50"}
                    `}
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {label}
                  </Button>
                );
              })}
            </div>

            {/* Results count */}
            <div className="mt-4 text-sm text-gray-600 text-center">
              {t('foundServices', { ns: 'public_landing' }) || "Found services"}: <span className="font-semibold text-primary">{filteredServices.length}</span>
            </div>
          </Card>
        </motion.div>

        {/* Services List */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {filteredServices.map((service) => (
            <motion.div
              key={service.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-4 rounded-xl border border-pink-100 hover:border-pink-300 hover:shadow-lg transition-all bg-white group flex flex-row justify-between items-start gap-3"
            >
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-base group-hover:text-primary transition-colors truncate pr-2">
                  {service.name}
                </h4>
                {service.description && (
                  <p className="text-xs text-gray-600 mt-1 line-clamp-3">{service.description}</p>
                )}
                {service.duration && (
                  <div className="text-xs text-gray-500 flex items-center gap-1 mt-2">
                    <Clock className="w-3 h-3" />
                    <span>{service.duration} min</span>
                  </div>
                )}
              </div>

              <div className="flex flex-col items-end gap-2 min-w-[30%]">
                <div className="text-lg font-bold text-primary whitespace-nowrap">
                  {service.min_price && service.max_price ?
                    `${service.min_price} - ${service.max_price}` :
                    service.price} {service.currency}
                </div>
                <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground w-full max-w-[120px]" onClick={handleBookClick}>
                  {t('bookBtn', { ns: 'public_landing' }) || "Book"}
                </Button>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {filteredServices.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
            key="empty-state"
          >
            <div className="w-24 h-24 mx-auto mb-6 bg-pink-100 rounded-full flex items-center justify-center">
              <Search className="w-12 h-12 text-primary/50" />
            </div>
            <h3 className="text-2xl font-semibold mb-2">{t('noServicesFound', { ns: 'public_landing' }) || "No services found"}</h3>
            <p className="text-gray-600 mb-6">{t('tryChangingFilters', { ns: 'public_landing' }) || "Try changing your search parameters"}</p>
            <Button onClick={() => { setSearchQuery(''); if (categories.length > 0) setSelectedCategory(categories[0]); }} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              {t('resetFilters', { ns: 'public_landing' }) || "Reset Filters"}
            </Button>
          </motion.div>
        )}
      </div>
    </section>
  );
}
