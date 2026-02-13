import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { Star } from 'lucide-react';
import { api } from '../../../../src/services/api';
import { format } from 'date-fns';
import { getTodayDate } from '../../../utils/dateUtils';

interface ProfessionalStepProps {
    selectedProfessionalId: number | null;
    professionalSelected: boolean;
    selectedTime?: string | null;
    onProfessionalChange: (professional: any | null) => void;
    onSlotSelect?: (professional: any, date: Date, time: string) => void;
    salonSettings: any;
    preloadedProfessionals?: any[];
    preloadedAvailability?: Record<number, string[]>;
    selectedServices?: any[];
    selectedDate?: Date | null;
}

const parseDurationToMinutes = (rawDuration: unknown): number => {
    if (typeof rawDuration === 'number' && Number.isFinite(rawDuration) && rawDuration > 0) {
        return Math.trunc(rawDuration);
    }
    if (typeof rawDuration !== 'string') {
        return 60;
    }

    const normalized = rawDuration.trim();
    if (normalized === '') {
        return 60;
    }

    if (/^\d+$/.test(normalized)) {
        const parsed = Number(normalized);
        return parsed > 0 ? Math.trunc(parsed) : 60;
    }

    const hoursMatch = normalized.match(/(\d+)\s*(h|hr|час|ч)/i);
    const minsMatch = normalized.match(/(\d+)\s*(m|min|мин)/i);
    const hours = hoursMatch && hoursMatch[1] ? Number(hoursMatch[1]) : 0;
    const mins = minsMatch && minsMatch[1] ? Number(minsMatch[1]) : 0;
    const total = hours * 60 + mins;

    return total > 0 ? Math.trunc(total) : 60;
};

export function ProfessionalStep({
    selectedProfessionalId,
    professionalSelected,
    selectedTime = null,
    onProfessionalChange,
    onSlotSelect,
    preloadedProfessionals,
    preloadedAvailability,
    selectedServices = [],
    selectedDate = null
}: ProfessionalStepProps) {
    const { t, i18n } = useTranslation(['booking', 'common']);
    const [professionals, setProfessionals] = useState<any[]>(preloadedProfessionals || []);
    // No loading spinner if data is preloaded
    const [loading, setLoading] = useState(false);
    const [dateAvailability, setDateAvailability] = useState<Record<number, string[]>>({});
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
    const todayDate = getTodayDate();
    const selectedDateString = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null;
    const isTodaySelected = selectedDateString === todayDate;
    const selectedServiceIds = useMemo(
        () => selectedServices
            .map((service: any) => Number(service?.id))
            .filter((serviceId: number) => Number.isFinite(serviceId) && serviceId > 0),
        [selectedServices]
    );
    const selectedDurationMinutes = useMemo(() => {
        if (selectedServices.length === 0) {
            return 60;
        }
        const total = selectedServices.reduce(
            (sum: number, service: any) => sum + parseDurationToMinutes(service?.duration),
            0
        );
        return total > 0 ? total : 60;
    }, [selectedServices]);

    useEffect(() => {
        if (preloadedProfessionals && preloadedProfessionals.length > 0) {
            setProfessionals(preloadedProfessionals);
            return;
        }

        // Fallback fetch - use public employees API
        const fetchProfessionals = async () => {
            setLoading(true);
            try {
                const res = await api.getPublicEmployees(i18n.language);
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
    }, [preloadedProfessionals, i18n.language]);

    useEffect(() => {
        if (professionals.length === 0) return;

        // Optimization: Use preloaded batch availability if present
        if (
            selectedServiceIds.length === 0 &&
            preloadedAvailability &&
            Object.keys(preloadedAvailability).length > 0
        ) {
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
            const today = getTodayDate();
            try {
                // Use batch endpoint instead of N requests
                const res = await api.getPublicBatchAvailability(today, {
                    serviceIds: selectedServiceIds,
                    durationMinutes: selectedDurationMinutes,
                });
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
    }, [professionals, preloadedAvailability, selectedServiceIds, selectedDurationMinutes]);

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
                        const masterIdentifier = prof.username ?? prof.full_name ?? '';
                        if (masterIdentifier === '') {
                            continue;
                        }
                        const masterName = encodeURIComponent(masterIdentifier);
                        const serviceIdsQuery = selectedServiceIds.length > 0
                            ? `&service_ids=${selectedServiceIds.join(',')}`
                            : '';
                        const response = await fetch(
                            `/api/public/schedule/${masterName}/available-dates?year=${currentYear}&month=${currentMonth}&duration=${selectedDurationMinutes}${serviceIdsQuery}`
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
    }, [professionals, nextSlots, selectedDurationMinutes, selectedServiceIds]);

    // Load availability for selected date
    useEffect(() => {
        if (selectedDate) {
            const loadDateAvailability = async () => {
                try {
                    const dateStr = format(selectedDate, 'yyyy-MM-dd');
                    const response = await api.getPublicBatchAvailability(dateStr, {
                        serviceIds: selectedServiceIds,
                        durationMinutes: selectedDurationMinutes,
                    });
                    setDateAvailability(response.availability || {});
                } catch (error) {
                    console.error('Failed to load availability:', error);
                } finally {
                    // done
                }
            };
            loadDateAvailability();
        } else {
            setDateAvailability({});
        }
    }, [selectedDate, selectedServiceIds, selectedDurationMinutes]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
                <div className="w-12 h-12 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin" />
                <p className="text-gray-400 text-sm font-medium uppercase tracking-widest">{t('loading')}</p>
            </div>
        );
    }

    // Фильтруем мастеров по выбранным услугам
    let filteredProfessionals = selectedServiceIds.length > 0
        ? professionals.filter((prof: any) => {
            // Если у мастера нет service_ids или массив пустой - показываем его (совместимость)
            if (!prof.service_ids || prof.service_ids.length === 0) {
                return true;
            }
            // Проверяем, что мастер предоставляет все выбранные услуги
            return selectedServiceIds.every((serviceId: number) => prof.service_ids.includes(serviceId));
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
            <h2 className="text-xl sm:text-2xl font-bold">{t('professional.title')}</h2>

            {/* Any Professional Option */}
            <div
                className={`bg-white rounded-xl border-2 p-5 transition-all cursor-pointer shadow-sm ${isAnyProfessional
                    ? 'border-gray-900'
                    : 'border-transparent hover:border-gray-200'
                    }`}
                onClick={() => onProfessionalChange(null)}
            >
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0">
                        <img
                            src="/logo.webp"
                            alt={t('common:salon_logo', 'Salon logo')}
                            className="w-12 h-12 object-contain"
                            loading="lazy"
                            onError={(event) => {
                                const target = event.currentTarget;
                                if (!target.src.endsWith('/logo.png')) {
                                    target.src = '/logo.png';
                                }
                            }}
                        />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-bold text-gray-900 text-sm mb-0.5">
                            {t('professional.anyAvailable')}
                        </h3>
                        <p className="text-xs text-gray-500 line-clamp-2">
                            {t('professional.anyDesc')}
                        </p>
                    </div>
                </div>
            </div>

            {/* Professionals List */}
            <div className="grid lg:grid-cols-2 gap-4 lg:gap-5 pb-10">
                {filteredProfessionals.map((professional) => {
                    const isSelected = selectedProfessionalId === professional.id;
                    const professionalRating = typeof professional.rating === 'number' && Number.isFinite(professional.rating)
                        ? professional.rating.toFixed(1)
                        : '5.0';
                    const professionalTimes = nextSlots[professional.id]
                        ? nextSlots[professional.id].split(', ').filter((slot) => slot.trim().length > 0)
                        : [];
                    return (
                        <div
                            key={professional.id}
                            className={`bg-white rounded-xl border-2 p-4 sm:p-5 lg:p-6 transition-all cursor-pointer shadow-sm ${isSelected
                                ? 'border-gray-900'
                                : 'border-transparent hover:border-gray-200'
                                }`}
                            onClick={() => onProfessionalChange(professional)}
                        >
                            {/* Master Info */}
                            <div className="flex items-start gap-3 sm:gap-4 mb-4">
                                <Avatar className="w-16 h-16 sm:w-[72px] sm:h-[72px] rounded-xl flex-shrink-0 shadow-sm border border-gray-100">
                                    <AvatarImage src={professional.photo} alt={professional.full_name} className="object-cover" />
                                    <AvatarFallback className="bg-gray-100 text-gray-500 font-bold">
                                        {professional.full_name?.charAt(0)}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-gray-900 text-[clamp(1.15rem,2vw,1.9rem)] leading-tight truncate">{professional.full_name}</h3>
                                    <p className="professional-position text-[10px] sm:text-xs text-gray-500 uppercase tracking-[0.1em] font-medium mt-0.5 break-words leading-tight">{professional.position}</p>
                                    <div className="flex items-center gap-1.5 mt-1.5">
                                        <Star className="w-3.5 h-3.5 text-amber-500 fill-current" />
                                        <span className="text-sm font-bold text-gray-700">{professionalRating}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Availability */}
                            {professionalTimes.length > 0 ? (
                                <div className="pt-4 border-t border-gray-50">
                                    <div className="flex items-center gap-1.5 mb-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                        <span className="text-[10px] text-green-600 font-bold uppercase tracking-wide leading-tight">
                                            {t('professional.availableToday')}
                                        </span>
                                    </div>

                                    {/* Time Slots */}
                                    <div className="professional-times-grid grid grid-cols-[repeat(auto-fit,minmax(62px,1fr))] gap-1.5">
                                        {professionalTimes.map((time: string, idx: number) => {
                                            const isSlotSelected =
                                                isSelected &&
                                                isTodaySelected &&
                                                selectedTime === time;
                                            return (
                                            <button
                                                type="button"
                                                key={idx}
                                                className={`professional-time-chip px-1 py-1 rounded-md text-[10px] sm:text-[11px] leading-none font-bold text-center border transition-all min-w-0 ${isSlotSelected
                                                    ? 'bg-gray-900 text-white border-gray-900'
                                                    : 'bg-gray-50 text-gray-700 border-gray-100 hover:border-gray-300'
                                                    }`}
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    if (onSlotSelect) {
                                                        onSlotSelect(professional, new Date(`${todayDate}T00:00:00`), time);
                                                    } else {
                                                        onProfessionalChange(professional);
                                                    }
                                                }}
                                            >
                                                {time}
                                            </button>
                                        )})}
                                    </div>
                                </div>
                            ) : (
                                <div className="pt-4 border-t border-gray-50 flex items-center gap-1.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                                        {nextAvailableDate[professional.id]
                                            ? `${t('professional.availableOn')} ${nextAvailableDate[professional.id]}`
                                            : t('professional.notAvailableToday')
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
