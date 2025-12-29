import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Checkbox } from './ui/checkbox';
import { Search, Clock, DollarSign } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../../../../src/services/api';
import { getLocalizedName } from '../../../../src/utils/i18nUtils';

interface ServicesStepProps {
    selectedServices: any[];
    onServicesChange: (services: any[]) => void;
    salonSettings: any;
}

export function ServicesStep({ selectedServices, onServicesChange, salonSettings }: ServicesStepProps) {
    const { t, i18n } = useTranslation(['booking', 'common']);
    const [services, setServices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');

    useEffect(() => {
        const fetchServices = async () => {
            setLoading(true);
            try {
                const res = await api.getServices();
                const data = Array.isArray(res) ? res : (res.services || []);
                setServices(data || []);
            } catch (error) {
                console.error('Failed to fetch services:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchServices();
    }, []);

    const categories = ['all', ...Array.from(new Set(services.map((s) => s.category)))];

    const filteredServices = services.filter((service) => {
        const name = getLocalizedName(service, i18n.language);
        const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === 'all' || service.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

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
            <div className="grid md:grid-cols-2 gap-4 pb-32">
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
                                    className={`cursor-pointer transition-all duration-300 rounded-2xl ${isSelected
                                        ? 'border-purple-500 border-2 shadow-lg bg-purple-50/50'
                                        : 'border hover:border-purple-200 hover:shadow-md'
                                        }`}
                                    onClick={() => toggleService(service)}
                                >
                                    <CardContent className="p-6">
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex-1">
                                                <h3 className="font-bold text-lg text-gray-900 mb-1">
                                                    {getLocalizedName(service, i18n.language)}
                                                </h3>
                                                {service.description && (
                                                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">{service.description}</p>
                                                )}
                                                <div className="flex items-center gap-4 text-sm font-medium text-gray-500">
                                                    <div className="flex items-center gap-1">
                                                        <Clock className="w-4 h-4" />
                                                        <span>{service.duration} {t('min', 'min')}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1 text-purple-600">
                                                        <DollarSign className="w-4 h-4" />
                                                        <span>{service.price} {salonSettings?.currency || 'AED'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <Checkbox
                                                checked={isSelected}
                                                onCheckedChange={() => toggleService(service)}
                                                className="w-6 h-6 rounded-lg data-[state=checked]:bg-purple-600"
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
