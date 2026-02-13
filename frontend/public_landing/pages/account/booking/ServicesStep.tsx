import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from './ui/input';
import { Search, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getLocalizedName } from '../../../../src/utils/i18nUtils';
import { getApiUrl } from '../../../utils/apiUtils';
import { safeFetch } from '../../../utils/errorHandler';
import { useCurrency } from '../../../../src/hooks/useSalonSettings';

interface ServicesStepProps {
    selectedServices: any[];
    onServicesChange: (services: any[]) => void;
    salonSettings: any;
    preloadedServices?: any[];
    selectedProfessional?: { id: number; service_ids?: number[] } | null;
}

export function ServicesStep({ selectedServices, onServicesChange, preloadedServices, selectedProfessional = null }: ServicesStepProps) {
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
        // Always use preloadedServices if provided, even if it's being populated
        if (preloadedServices) {
            setServices(preloadedServices);
            // If preloaded is empty, it means parent is still loading, don't fetch ourselves
            if (preloadedServices.length > 0) {
                return;
            }
        }

        // Fallback: Fetch if not provided at all (preloadedServices is undefined/null)
        // Don't fetch if preloadedServices is an empty array (parent will populate it)
        if (preloadedServices === undefined || preloadedServices === null) {
            const fetchServices = async () => {
                setLoading(true);
                try {
                    // Use public services endpoint to avoid auth issues
                    const API_URL = getApiUrl();
                    const res = await safeFetch(`${API_URL}/api/public/services`);
                    const data = await res.json();
                    const servicesArray = Array.isArray(data) ? data : (data.services || []);
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
            <div className="flex flex-col items-center justify-center h-64 gap-4">
                <div className="w-12 h-12 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin" />
                <p className="text-gray-400 text-sm font-medium uppercase tracking-widest">{t('loading', 'Loading services...')}</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Search and Filters */}
            <div className="space-y-3 sm:space-y-4">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                    <Input
                        type="text"
                        placeholder={t('services.search', 'Search services...')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-11 sm:pl-12 h-11 sm:h-14 text-sm sm:text-base bg-white border-gray-200 rounded-xl shadow-sm focus-visible:ring-gray-900"
                    />
                </div>

                <div className="flex flex-wrap gap-2 py-1">
                    {categories.map((category) => (
                        <button
                            key={category}
                            onClick={() => setSelectedCategory(category)}
                            className={`px-4 py-2 rounded-full text-[11px] sm:text-xs font-bold uppercase tracking-wide transition-all whitespace-nowrap shadow-sm border ${selectedCategory === category
                                ? 'bg-gray-900 text-white border-gray-900'
                                : 'bg-white text-gray-500 border-gray-100 hover:border-gray-200'
                                }`}
                        >
                            {category === 'all' ? t('services.allCategories', 'All') : (t(`services.category_${category}`, { defaultValue: category }) as string)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Services List */}
            <div className="space-y-3">
                <AnimatePresence mode="popLayout">
                    {filteredServices.map((service) => {
                        const isSelected = selectedServices.some((s) => s.id === service.id);
                        return (
                            <motion.div
                                key={service.id}
                                layout
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.98 }}
                                onClick={() => toggleService(service)}
                                className={`group p-4 sm:p-5 bg-white rounded-xl border-2 transition-all cursor-pointer shadow-sm ${isSelected ? 'border-gray-900' : 'border-transparent hover:border-gray-200'
                                    }`}
                            >
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="w-full sm:flex-1 sm:min-w-0 sm:pr-4">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-bold text-gray-900 leading-tight text-[clamp(1.05rem,4.6vw,1.3rem)] line-clamp-2 sm:line-clamp-1">
                                                {getLocalizedName(service, i18n.language)}
                                            </h3>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] sm:text-xs text-gray-500 font-medium">
                                            <span className="bg-gray-50 px-2 py-0.5 rounded uppercase tracking-wider text-[10px] sm:text-[11px]">{service.category}</span>
                                            <span>•</span>
                                            <span className="text-[11px] sm:text-xs">{service.duration} {t('min', 'min')}</span>
                                        </div>
                                    </div>
                                    <div className="w-full sm:w-auto flex items-center justify-between sm:justify-end gap-3 sm:gap-4">
                                        <span className="font-bold text-gray-900 leading-none text-[clamp(1.05rem,4.6vw,1.3rem)]">
                                            {formatCurrency(service.price)}
                                        </span>
                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all shrink-0 ${isSelected ? 'bg-gray-900 text-white' : 'border-2 border-gray-100 group-hover:border-gray-200'
                                            }`}>
                                            {isSelected && <Check className="w-4 h-4 text-white" />}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>

                {filteredServices.length === 0 && (
                    <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-200">
                        <p className="text-gray-400 font-medium">{t('services.notFound', 'No services found')}</p>
                    </div>
                )}
            </div>
        </div>
    );
}
