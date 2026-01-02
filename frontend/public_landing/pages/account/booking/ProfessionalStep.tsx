import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from './ui/card';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { Star, Clock } from 'lucide-react';
import { motion } from 'motion/react';
import { api } from '../../../../src/services/api';
import { format } from 'date-fns';

interface ProfessionalStepProps {
    selectedProfessionalId: number | null;
    professionalSelected: boolean;
    onProfessionalChange: (professional: any | null) => void;
    salonSettings: any;
    preloadedProfessionals?: any[];
    preloadedAvailability?: Record<number, string[]>;
    selectedServices?: any[];
    selectedDate?: Date | null;
}

export function ProfessionalStep({
    selectedProfessionalId,
    professionalSelected,
    onProfessionalChange,
    salonSettings,
    preloadedProfessionals,
    preloadedAvailability,
    selectedServices = [],
    selectedDate = null
}: ProfessionalStepProps) {
    const { t } = useTranslation(['booking', 'common']);
    const [professionals, setProfessionals] = useState<any[]>(preloadedProfessionals || []);
    // No loading spinner if data is preloaded
    const [loading, setLoading] = useState(false);
    const [dateAvailability, setDateAvailability] = useState<Record<number, string[]>>({});
    const [loadingAvailability, setLoadingAvailability] = useState(false);
    // Initialize nextSlots synchronously to avoid "pop-in" effect
    const [nextSlots, setNextSlots] = useState<Record<number, string>>(() => {
        if (preloadedAvailability && Object.keys(preloadedAvailability).length > 0 && preloadedProfessionals) {
            const updates: Record<number, string> = {};
            const now = new Date();
            const currentHours = now.getHours();
            const currentMinutes = now.getMinutes();

            preloadedProfessionals.forEach(p => {
                const slots = preloadedAvailability[p.id] || [];
                if (slots.length > 0) {
                    const available = slots.filter(time => {
                        const [h, m] = time.split(':').map(Number);
                        // Filter past times
                        if (h < currentHours || (h === currentHours && m <= currentMinutes)) return false;
                        return true;
                    });

                    if (available.length > 0) {
                        updates[p.id] = available.slice(0, 4).join(', ');
                    }
                }
            });
            return updates;
        }
        return {};
    });

    useEffect(() => {
        if (preloadedProfessionals && preloadedProfessionals.length > 0) {
            setProfessionals(preloadedProfessionals);
            return;
        }

        // Fallback fetch - use public employees API
        const fetchProfessionals = async () => {
            setLoading(true);
            try {
                const res = await api.getPublicEmployees();
                // API возвращает массив напрямую
                const data = Array.isArray(res) ? res : [];
                setProfessionals(data);
            } catch (error) {
                console.error('Failed to fetch professionals:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchProfessionals();
    }, [preloadedProfessionals]);

    useEffect(() => {
        if (professionals.length === 0) return;

        // Optimization: Use preloaded batch availability if present
        if (preloadedAvailability && Object.keys(preloadedAvailability).length > 0) {
            const updates: Record<number, string> = {};
            const now = new Date();
            const currentHours = now.getHours();
            const currentMinutes = now.getMinutes();

            professionals.forEach(p => {
                const slots = preloadedAvailability[p.id] || [];
                if (slots.length > 0) {
                    const available = slots.filter(time => {
                        const [h, m] = time.split(':').map(Number);
                        // Filter past times
                        if (h < currentHours || (h === currentHours && m <= currentMinutes)) return false;
                        return true;
                    });

                    if (available.length > 0) {
                        updates[p.id] = available.slice(0, 4).join(', ');
                    }
                }
            });
            setNextSlots(updates);
            return;
        }

        // Fallback: Individual fetching (OPTIMIZED PATH)
        const fetchNextSlots = async () => {
            const today = new Date().toISOString().split('T')[0];
            try {
                // Use batch endpoint instead of N requests
                const res = await api.getPublicBatchAvailability(today);
                if (res && res.availability) {
                    const updates: Record<number, string> = {};
                    const now = new Date();
                    const currentHours = now.getHours();
                    const currentMinutes = now.getMinutes();

                    professionals.forEach(p => {
                        const slots = res.availability[p.id] || [];
                        if (slots.length > 0) {
                            const available = slots.filter(time => {
                                const [h, m] = time.split(':').map(Number);
                                if (h < currentHours || (h === currentHours && m <= currentMinutes)) return false;
                                return true;
                            });

                            if (available.length > 0) {
                                updates[p.id] = available.slice(0, 4).join(', ');
                            }
                        }
                    });
                    setNextSlots(updates);
                }
            } catch (e) {
                console.error("Failed to fetch batch availability", e);
            }
        };
        fetchNextSlots();
    }, [professionals, preloadedAvailability]);

    // Load availability for selected date
    useEffect(() => {
        if (selectedDate) {
            const loadDateAvailability = async () => {
                setLoadingAvailability(true);
                try {
                    const dateStr = format(selectedDate, 'yyyy-MM-dd');
                    const response = await api.getPublicBatchAvailability(dateStr);
                    setDateAvailability(response.availability || {});
                } catch (error) {
                    console.error('Failed to load availability:', error);
                } finally {
                    setLoadingAvailability(false);
                }
            };
            loadDateAvailability();
        } else {
            setDateAvailability({});
        }
    }, [selectedDate]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gray-600 font-medium tracking-tight">{t('loading', 'Syncing masters...')}</p>
                </div>
            </div>
        );
    }

    // Фильтруем мастеров по выбранным услугам
    const selectedServiceIds = selectedServices.map((s: any) => s.id);
    let filteredProfessionals = selectedServiceIds.length > 0
        ? professionals.filter((prof: any) => {
            // Если у мастера нет service_ids или массив пустой - показываем его (совместимость)
            if (!prof.service_ids || prof.service_ids.length === 0) {
                return true;
            }
            // Проверяем, предоставляет ли мастер хотя бы одну из выбранных услуг
            return selectedServiceIds.some((serviceId: number) => prof.service_ids.includes(serviceId));
        })
        : professionals;

    // Дополнительно фильтруем по доступности на выбранную дату
    if (selectedDate && Object.keys(dateAvailability).length > 0) {
        filteredProfessionals = filteredProfessionals.filter((prof: any) => {
            const masterAvailableSlots = dateAvailability[prof.id] || [];
            return masterAvailableSlots.length > 0;
        });
    }

    const isAnyProfessional = professionalSelected && selectedProfessionalId === null;

    return (
        <div className="space-y-6">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl shadow-lg p-6"
            >
                <h2 className="text-2xl font-black text-gray-900 leading-none uppercase tracking-tighter">{t('professional.title', 'Choose Master')}</h2>
            </motion.div>

            {/* Any Professional Option */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
            >
                <Card
                    className={`cursor-pointer transition-all duration-300 rounded-2xl ${isAnyProfessional
                        ? 'border-purple-500 border-2 shadow-lg bg-purple-50/50'
                        : 'border hover:border-purple-200 hover:shadow-md'
                        }`}
                    onClick={() => onProfessionalChange(null)}
                >
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-3xl shadow-lg">
                                ✨
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-bold text-gray-900 leading-none mb-2">
                                    {t('professional.anyAvailable', 'Flexible Match')}
                                </h3>
                                <p className="text-sm font-medium text-gray-500">
                                    {t('professional.anyDesc', 'We\'ll match you with the best available professional')}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>

            {/* Professionals List */}
            <div className="grid md:grid-cols-2 gap-4 pb-10">
                {filteredProfessionals.map((professional, index) => {
                    const isSelected = selectedProfessionalId === professional.id;
                    return (
                        <motion.div
                            key={professional.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: (index + 1) * 0.1 }}
                        >
                            <Card
                                className={`cursor-pointer transition-all duration-300 rounded-2xl ${isSelected
                                    ? 'border-purple-500 border-2 shadow-lg bg-purple-50/50'
                                    : 'border hover:border-purple-200 hover:shadow-md'
                                    }`}
                                onClick={() => onProfessionalChange(professional)}
                            >
                                <CardContent className="p-6">
                                    <div className="flex items-start gap-4">
                                        <Avatar className="w-16 h-16 rounded-2xl">
                                            <AvatarImage src={professional.photo} alt={professional.full_name} className="object-cover" />
                                            <AvatarFallback className="bg-purple-100 text-purple-600 font-bold text-xl">
                                                {professional.full_name?.charAt(0)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1">
                                            <h3 className="text-lg font-bold text-gray-900 leading-none mb-1">{professional.full_name}</h3>
                                            <p className="text-sm font-semibold text-purple-500 uppercase tracking-wider mb-3 leading-none italic">{professional.position}</p>

                                            <div className="flex items-center gap-4 mb-3">
                                                <div className="flex items-center gap-1.5 bg-yellow-50 px-2 py-1 rounded-lg">
                                                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                                    <span className="text-sm font-bold text-yellow-700">{professional.rating || '5.0'}</span>
                                                </div>
                                                {professional.reviews > 0 && (
                                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">({professional.reviews} {t('professional.reviews', 'Reviews')})</span>
                                                )}
                                            </div>

                                            <div className="flex flex-col gap-1.5 mt-2">
                                                <div className="flex items-center gap-2 text-green-600 bg-green-50 w-fit px-3 py-1 rounded-full border border-green-100/50">
                                                    <Clock className="w-3.5 h-3.5" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest leading-none">
                                                        {salonSettings?.timezone ? t('professional.ready', 'Ready') : t('professional.availableToday', 'Available Today')}
                                                    </span>
                                                </div>
                                                {!salonSettings?.timezone && nextSlots[professional.id] && (
                                                    <div className="flex flex-wrap gap-1.5 mt-1">
                                                        {nextSlots[professional.id].split(', ').map((time: string, idx: number) => (
                                                            <span
                                                                key={idx}
                                                                className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold tracking-wide hover:bg-slate-100 transition-colors"
                                                            >
                                                                {time}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    );
                })}
            </div>

            {/* Continue Button commented out as per global wizard design
            {(selectedProfessionalId !== null || professionalSelected) && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex justify-end mt-10"
                >
                    <Button
                        onClick={onContinue}
                        className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 h-14 px-12 rounded-2xl text-lg font-black shadow-xl"
                        size="lg"
                    >
                        {t('common.continue', 'Next step')}
                    </Button>
                </motion.div>
            )}
            */}
        </div>
    );
}
