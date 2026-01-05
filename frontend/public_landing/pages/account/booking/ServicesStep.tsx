import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Checkbox } from './ui/checkbox';
import { Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getLocalizedName } from '../../../../src/utils/i18nUtils';
import { useCurrency } from '../../../../src/hooks/useSalonSettings';

interface ServicesStepProps {
    selectedServices: any[];
    onServicesChange: (services: any[]) => void;
    salonSettings: any;
    preloadedServices?: any[];
    selectedProfessional?: { id: number; service_ids?: number[] } | null;
}

export function ServicesStep({ selectedServices, onServicesChange, salonSettings, preloadedServices, selectedProfessional = null }: ServicesStepProps) {
    const { t, i18n } = useTranslation(['booking', 'common']);
    const { formatCurrency } = useCurrency();
    // Use preloaded services if available, otherwise empty (or start fetch)
    const [services, setServices] = useState<any[]>(preloadedServices || []);
    // Only show loading if we DON'T have preloaded services AND we are fetching (fallback)
    // Since we expect preloadedServices to be passed from parent who handles loading, init with false if preloaded exists
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');

    useEffect(() => {
        console.log('[ServicesStep] Received preloadedServices:', preloadedServices?.length, preloadedServices);

        // Always use preloadedServices if provided, even if it's being populated
        if (preloadedServices) {
            console.log('[ServicesStep] Setting services from preloaded:', preloadedServices.length);
            setServices(preloadedServices);
            // If preloaded is empty, it means parent is still loading, don't fetch ourselves
            if (preloadedServices.length > 0) {
                return;
            }
        }

        // Fallback: Fetch if not provided at all (preloadedServices is undefined/null)
        // Don't fetch if preloadedServices is an empty array (parent will populate it)
        if (preloadedServices === undefined || preloadedServices === null) {
            console.log('[ServicesStep] No preloaded services, fetching from public API...');
            const fetchServices = async () => {
                setLoading(true);
                try {
                    // Use public services endpoint to avoid auth issues
                    const res = await fetch('/api/public/services');
                    const data = await res.json();
                    const servicesArray = Array.isArray(data) ? data : (data.services || []);
                    console.log('[ServicesStep] Fetched services:', servicesArray.length);
                    setServices(servicesArray);
                } catch (error) {
                    console.error('[ServicesStep] Failed to fetch services:', error);
                } finally {
                    setLoading(false);
                }
            };
            fetchServices();
        }
    }, [preloadedServices]);

    const categories = ['all', ...Array.from(new Set(services.map((s) => s.category)))];

    let filteredServices = services.filter((service) => {
        const name = getLocalizedName(service, i18n.language);
        const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === 'all' || service.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    // Дополнительно фильтруем по выбранному мастеру
    if (selectedProfessional?.service_ids && selectedProfessional.service_ids.length > 0) {
        filteredServices = filteredServices.filter((service: any) =>
            selectedProfessional.service_ids!.includes(service.id)
        );
    }

    const toggleService = (service: any) => {
        const isSelected = selectedServices.some((s) => s.id === service.id);
        if (isSelected) {
            onServicesChange(selectedServices.filter((s) => s.id !== service.id));
        } else {
            onServicesChange([...selectedServices, service]);
        }
    };

    // const totalDuration = selectedServices.reduce((sum, s) => sum + parseInt(s.duration || '0'), 0);
    // const totalPrice = selectedServices.reduce((sum, s) => sum + s.price, 0);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gray-600">{t('loading', 'Loading services...')}</p>
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
                <h2 className="text-2xl font-black text-gray-900 mb-6 uppercase tracking-tighter">{t('services.title', 'Select Services')}</h2>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                        placeholder={t('services.search', 'Search services...')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 h-12 text-lg rounded-xl"
                    />
                </div>

                {/* Categories */}
                <div className="flex flex-wrap gap-2 mt-4">
                    {categories.map((category) => (
                        <Badge
                            key={category}
                            variant={selectedCategory === category ? 'default' : 'outline'}
                            className={`cursor-pointer px-4 py-2 rounded-full text-sm font-medium transition-all ${selectedCategory === category ? 'bg-purple-600 text-white shadow-md' : 'hover:bg-purple-50'
                                }`}
                            onClick={() => setSelectedCategory(category)}
                        >
                            {category === 'all' ? t('services.allCategories', 'All') : category}
                        </Badge>
                    ))}
                </div>
            </motion.div>

            {/* Services List */}
            <div className="grid md:grid-cols-2 gap-3 pb-32">
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
                                    className={`cursor-pointer transition-all duration-300 rounded-lg ${isSelected
                                        ? 'border-purple-500 border-2 shadow-sm bg-purple-50/50'
                                        : 'border-2 border-gray-200 hover:border-gray-300'
                                        }`}
                                    onClick={() => toggleService(service)}
                                >
                                    <CardContent className="p-4">
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex-1">
                                                <h3 className="font-semibold text-sm text-gray-900 mb-1">
                                                    {getLocalizedName(service, i18n.language)}
                                                </h3>
                                                {service.description && (
                                                    <p className="text-xs text-gray-500 mb-3 line-clamp-2">{service.description}</p>
                                                )}
                                                <div className="flex items-center gap-3 text-xs text-gray-500">
                                                    {service.duration && (
                                                        <span>{service.duration} {t('min', 'min')}</span>
                                                    )}
                                                    <span className="text-sm font-bold text-gray-900">{formatCurrency(service.price)}</span>
                                                </div>
                                            </div>
                                            <Checkbox
                                                checked={isSelected}
                                                onCheckedChange={() => toggleService(service)}
                                                className="w-5 h-5 rounded-full data-[state=checked]:bg-purple-600 flex-shrink-0 ml-2"
                                            />
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>

        </div>
    );
}
