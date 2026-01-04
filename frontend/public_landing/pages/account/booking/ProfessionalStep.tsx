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
                        // Filter past times - only for today
                        // If hour is less than current, it's in the past
                        if (h < currentHours) return false;
                        // If same hour, check minutes (exclude if time has already passed)
                        if (h === currentHours && m < currentMinutes) return false;
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
    // Track next available date for masters with no slots today
    const [nextAvailableDate, setNextAvailableDate] = useState<Record<number, string>>({});

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
                        // Filter past times - only for today
                        if (h < currentHours) return false;
                        if (h === currentHours && m < currentMinutes) return false;
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
                                // Filter past times - only for today
                                if (h < currentHours) return false;
                                if (h === currentHours && m < currentMinutes) return false;
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

    // Fetch next available date for masters without slots today
    useEffect(() => {
        if (professionals.length === 0) return;

        const fetchNextAvailableDates = async () => {
            const now = new Date();
            const currentYear = now.getFullYear();
            const currentMonth = now.getMonth() + 1; // JavaScript months are 0-indexed

            const updates: Record<number, string> = {};

            for (const prof of professionals) {
                // Only fetch if master has no slots today
                if (!nextSlots[prof.id] || nextSlots[prof.id].trim() === '') {
                    try {
                        // Fetch available dates for this month using the master's full name
                        const masterName = encodeURIComponent(prof.full_name);
                        const response = await fetch(
                            `/api/public/schedule/${masterName}/available-dates?year=${currentYear}&month=${currentMonth}&duration=60`
                        );

                        if (response.ok) {
                            const data = await response.json();
                            const availableDates = data.available_dates || [];

                            if (availableDates.length > 0) {
                                // Find first date that's not today
                                const today = format(now, 'yyyy-MM-dd');
                                const nextDate = availableDates.find((date: string) => date > today);

                                if (nextDate) {
                                    // Format date nicely (e.g., "Jan 15" or "15 янв")
                                    const dateObj = new Date(nextDate);
                                    updates[prof.id] = format(dateObj, 'MMM d');
                                }
                            }
                        }
                    } catch (error) {
                        console.error(`Failed to fetch next available date for professional ${prof.id}:`, error);
                    }
                }
            }

            setNextAvailableDate(updates);
        };

        fetchNextAvailableDates();
    }, [professionals, nextSlots]);

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
            <h2 className="text-2xl font-bold">{t('professional.title', 'Choose Master')}</h2>

            {/* Any Professional Option */}
            <div
                className={`bg-white rounded-xl border p-5 transition-colors cursor-pointer ${isAnyProfessional
                    ? 'border-purple-500 border-2 shadow-sm bg-purple-50/50'
                    : 'border-gray-200 hover:border-gray-300'
                    }`}
                onClick={() => onProfessionalChange(null)}
            >
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-gray-900 rounded-xl flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-2xl">✨</span>
                    </div>
                    <div className="flex-1">
                        <h3 className="font-semibold mb-1">
                            {t('professional.anyAvailable', 'Flexible Match')}
                        </h3>
                        <p className="text-sm text-gray-600">
                            {t('professional.anyDesc', 'We\'ll match you with the best available professional')}
                        </p>
                    </div>
                </div>
            </div>

            {/* Professionals List */}
            <div className="grid md:grid-cols-2 gap-4 pb-10">
                {filteredProfessionals.map((professional, index) => {
                    const isSelected = selectedProfessionalId === professional.id;
                    return (
                        <div
                            key={professional.id}
                            className={`bg-white rounded-2xl border-2 p-6 transition-all cursor-pointer ${isSelected
                                ? 'border-purple-500 shadow-lg bg-gradient-to-br from-purple-50 to-pink-50'
                                : 'border-purple-200 hover:border-purple-300 hover:shadow-md'
                                }`}
                            onClick={() => onProfessionalChange(professional)}
                        >
                            {/* Master Info */}
                            <div className="flex items-start gap-3 mb-4">
                                <Avatar className="w-16 h-16 rounded-2xl flex-shrink-0">
                                    <AvatarImage src={professional.photo} alt={professional.full_name} className="object-cover" />
                                    <AvatarFallback className="bg-purple-100 text-purple-600 font-bold text-xl">
                                        {professional.full_name?.charAt(0)}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold mb-0.5">{professional.full_name}</h3>
                                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">{professional.position}</p>
                                    <div className="flex items-center gap-1">
                                        <Star className="text-amber-400 fill-amber-400" size={14} />
                                        <span className="text-sm font-medium">{professional.rating || '5.0'}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Availability */}
                            {nextSlots[professional.id] ? (
                                <>
                                    <div className="flex items-center gap-2 mb-3">
                                        <Clock className="text-green-600" size={14} />
                                        <span className="text-xs text-green-600 font-medium uppercase tracking-wide">
                                            {t('professional.availableToday', 'Available Today')}
                                        </span>
                                    </div>

                                    {/* Time Slots */}
                                    <div className="grid grid-cols-4 gap-2">
                                        {nextSlots[professional.id].split(', ').map((time: string, idx: number) => (
                                            <div
                                                key={idx}
                                                className="py-1.5 rounded-lg text-xs font-medium bg-gray-50 text-gray-700 border border-gray-200 text-center"
                                            >
                                                {time}
                                            </div>
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <div className="flex items-center gap-2 py-3">
                                    <Clock className="text-gray-400" size={14} />
                                    <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">
                                        {nextAvailableDate[professional.id]
                                            ? `${t('professional.availableOn', 'Available')} ${nextAvailableDate[professional.id]}`
                                            : t('professional.notAvailableToday', 'Not Available Today')
                                        }
                                    </span>
                                </div>
                            )}
                        </div>
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
