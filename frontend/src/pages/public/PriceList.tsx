// /frontend/src/pages/public/PriceList.tsx
import React, { useEffect, useState } from 'react';
import { AlertCircle, Search } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../../components/ui/accordion';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { useTranslation } from 'react-i18next';

interface Service {
  id: number;
  name: string;
  price: number;
  category: string;
  description: string;
}

export default function PriceList() {
  const navigate = useNavigate();
  const { t } = useTranslation(['public/PriceList', 'common']);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const data = await apiClient.getPublicServices();
        setServices(data.services);
      } catch (err) {
        setError(t('pricelist:error'));
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchServices();
  }, [t]);

  // Filter services based on search query
  const filteredServices = services.filter(service =>
    service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    service.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedServices = filteredServices.reduce((acc, service) => {
    const category = service.category || 'other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(service);
    return acc;
  }, {} as Record<string, Service[]>);

  const categoryIcons: Record<string, React.ReactNode> = {
    'permanent-makeup': '💄',
    'facial-care': '✨',
    'nails': '💅',
    'lashes': '👁️',
    'hair': '✂️',
    'massage': '💖',
    'other': '🌟'
  };

  const getCategoryName = (category: string): string => {
    return t(`pricelist:categories.${category}`);
  };

  if (loading) {
    return (
      <div className="py-20">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-gray-600">{t('pricelist:loading')}</p>
        </div>
      </div>
    );
  }

  if (error || services.length === 0) {
    return (
      <div className="py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <span className="text-red-800">{error || t('pricelist:noServices')}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <section className="bg-gradient-to-br from-pink-100 via-purple-100 to-pink-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl text-gray-900 mb-4">{t('pricelist:title')}</h1>
          <p className="text-xl text-gray-600">
            {t('pricelist:subtitle')}
          </p>
        </div>
      </section>

      {/* Search and CTA */}
      <section className="bg-white border-b border-gray-200 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Search Bar */}
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="text"
                placeholder={t('pricelist:search', { defaultValue: 'Search services...' })}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* CTA Button */}
            <Button
              size="lg"
              className="bg-gradient-to-r from-pink-500 to-purple-600 w-full md:w-auto"
              onClick={() => navigate('/')}
            >
              {t('pricelist:cta.bookButton')}
            </Button>
          </div>
        </div>
      </section>

      {/* Services with Accordion */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {Object.keys(groupedServices).length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600">{t('pricelist:noResults', { defaultValue: 'No services found matching your search' })}</p>
            </div>
          ) : (
            <Accordion type="multiple" defaultValue={Object.keys(groupedServices)} className="space-y-4">
              {Object.entries(groupedServices).map(([category, categoryServices]) => (
                <AccordionItem key={category} value={category} className="border border-gray-200 rounded-xl overflow-hidden">
                  <AccordionTrigger className="px-6 py-4 hover:bg-gray-50 hover:no-underline">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-purple-600 rounded-lg flex items-center justify-center text-2xl">
                        {categoryIcons[category] || '🌟'}
                      </div>
                      <div className="text-left">
                        <h2 className="text-2xl text-gray-900">{getCategoryName(category)}</h2>
                        <p className="text-sm text-gray-500">{categoryServices.length} {t('pricelist:services', { defaultValue: 'services' })}</p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-6 pb-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      {categoryServices.map((service) => (
                        <div
                          key={service.id}
                          className="bg-gradient-to-br from-pink-50 to-purple-50 border border-pink-100 rounded-lg p-5 hover:shadow-md transition-shadow"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">{service.name}</h3>
                            <p className="text-xl font-bold text-pink-600 ml-4 whitespace-nowrap">{service.price} {t('common:currency')}</p>
                          </div>
                          <p className="text-sm text-gray-600">{service.description}</p>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="bg-gradient-to-br from-pink-50 to-purple-50 py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl text-gray-900 mb-4">{t('pricelist:bottomCta.title')}</h2>
          <p className="text-lg text-gray-600 mb-8">
            {t('pricelist:bottomCta.description')}
          </p>
          <Button
            size="lg"
            className="bg-gradient-to-r from-pink-500 to-purple-600"
            onClick={() => navigate('/')}
          >
            {t('pricelist:bottomCta.bookButton')}
          </Button>
        </div>
      </section>
    </div>
  );
}