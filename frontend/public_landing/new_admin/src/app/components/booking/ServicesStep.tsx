import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Service } from '../../App';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Checkbox } from '../ui/checkbox';
import { Search, Clock, DollarSign } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { projectId, publicAnonKey } from '../../../../utils/supabase/info';

interface ServicesStepProps {
  selectedServices: Service[];
  onServicesChange: (services: Service[]) => void;
  onContinue: () => void;
}

export function ServicesStep({ selectedServices, onServicesChange, onContinue }: ServicesStepProps) {
  const { t, i18n } = useTranslation();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    setLoading(true);
    fetch(`https://${projectId}.supabase.co/functions/v1/make-server-6b68b787/services`, {
      headers: { Authorization: `Bearer ${publicAnonKey}` },
    })
      .then((res) => res.json())
      .then((data) => {
        setServices(data);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Failed to fetch services:', error);
        setLoading(false);
      });
  }, []);

  const getServiceName = (service: Service) => {
    return service.name[i18n.language] || service.name.en;
  };

  const getServiceDescription = (service: Service) => {
    return service.description[i18n.language] || service.description.en;
  };

  const categories = ['all', ...Array.from(new Set(services.map((s) => s.category)))];

  const filteredServices = services.filter((service) => {
    const matchesSearch = getServiceName(service).toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || service.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const toggleService = (service: Service) => {
    const isSelected = selectedServices.some((s) => s.id === service.id);
    if (isSelected) {
      onServicesChange(selectedServices.filter((s) => s.id !== service.id));
    } else {
      onServicesChange([...selectedServices, service]);
    }
  };

  const totalDuration = selectedServices.reduce((sum, s) => sum + s.duration, 0);
  const totalPrice = selectedServices.reduce((sum, s) => sum + s.price, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">{t('booking.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-lg p-6"
      >
        <h2 className="text-2xl font-bold text-gray-900 mb-6">{t('booking.services.title')}</h2>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            placeholder={t('booking.services.search')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Categories */}
        <div className="flex flex-wrap gap-2 mt-4">
          {categories.map((category) => (
            <Badge
              key={category}
              variant={selectedCategory === category ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setSelectedCategory(category)}
            >
              {category === 'all' ? t('booking.services.allCategories') : category}
            </Badge>
          ))}
        </div>
      </motion.div>

      {/* Services List */}
      <div className="grid md:grid-cols-2 gap-4">
        <AnimatePresence>
          {filteredServices.map((service, index) => {
            const isSelected = selectedServices.some((s) => s.id === service.id);
            return (
              <motion.div
                key={service.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card
                  className={`cursor-pointer transition-all duration-300 ${
                    isSelected
                      ? 'border-purple-500 border-2 shadow-lg bg-purple-50/50'
                      : 'border hover:border-purple-200 hover:shadow-md'
                  }`}
                  onClick={() => toggleService(service)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg text-gray-900 mb-1">
                          {getServiceName(service)}
                        </h3>
                        <p className="text-sm text-gray-600 mb-3">{getServiceDescription(service)}</p>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            <span>{service.duration} {t('booking.min')}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <DollarSign className="w-4 h-4" />
                            <span>${service.price}</span>
                          </div>
                        </div>
                      </div>
                      <Checkbox checked={isSelected} onCheckedChange={() => toggleService(service)} />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Bottom Bar */}
      {selectedServices.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4 z-50"
        >
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div>
              <p className="font-semibold text-gray-900">
                {selectedServices.length} {t('booking.services.selected')}
              </p>
              <p className="text-sm text-gray-600">
                {totalDuration} {t('booking.min')} • ${totalPrice}
              </p>
            </div>
            <Button
              onClick={onContinue}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              size="lg"
            >
              {t('booking.services.continue')}
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
