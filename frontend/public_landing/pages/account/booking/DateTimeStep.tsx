import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar } from './ui/calendar';
import { Clock } from 'lucide-react';
import { motion } from 'motion/react';
import { format } from 'date-fns';
import { api } from '../../../../src/services/api';
import { getDateLocale as getDateLocaleCentral } from '../../../../src/utils/i18nUtils';

interface DateTimeStepProps {
    selectedDate: Date | null;
    selectedTime: string | null;
    selectedMaster: any;
    selectedServices: any[];
    totalDuration: number;
    onDateTimeChange: (date: Date | null, time: string | null) => void;
}

interface TimeSlot {
    time: string;
    period: 'morning' | 'afternoon' | 'evening';
    isOptimal: boolean;
    available: boolean;
}

export function DateTimeStep({
    selectedDate,
    selectedTime,
    selectedMaster,
    selectedServices,
    totalDuration,
    onDateTimeChange,
}: DateTimeStepProps) {
    const { t, i18n } = useTranslation(['booking', 'common']);
    const [availableDates, setAvailableDates] = useState<Set<string>>(new Set());
    const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingDates, setLoadingDates] = useState(true);
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const dateLocale = getDateLocaleCentral(i18n.language);
    const selectedServiceIds = useMemo(
        () => selectedServices
            .map((service: any) => Number(service?.id))
            .filter((serviceId: number) => Number.isFinite(serviceId) && serviceId > 0),
        [selectedServices]
    );
    const resolvedDurationMinutes = totalDuration > 0 ? totalDuration : 60;

    // Fetch available dates pattern optimized
    useEffect(() => {
        const fetchDates = async () => {
            setLoadingDates(true);
            const masterName = selectedMaster
                ? (selectedMaster.username ?? selectedMaster.full_name ?? 'any')
                : 'any';
            try {
                // Fetch for Current Month AND Next Month to ensure outside days are clickable
                const nextMonth = new Date(currentMonth);
                nextMonth.setMonth(nextMonth.getMonth() + 1);

                const [currentRes, nextRes] = await Promise.all([
                    api.getAvailableDates(masterName, currentMonth.getFullYear(), currentMonth.getMonth() + 1, resolvedDurationMinutes),
                    api.getAvailableDates(masterName, nextMonth.getFullYear(), nextMonth.getMonth() + 1, resolvedDurationMinutes)
                ]);

                const combinedDates = new Set([
                    ...(currentRes.available_dates || []),
                    ...(nextRes.available_dates || [])
                ]);

                setAvailableDates(combinedDates);
            } catch (e) {
                console.error('[DateTimeStep] Failed to fetch available dates:', e);
            } finally {
                setLoadingDates(false);
            }
        };
        fetchDates();
    }, [currentMonth, selectedMaster, resolvedDurationMinutes]);

    // Fetch time slots when date is selected
    useEffect(() => {
        if (!selectedDate) return;

        const fetchSlots = async () => {
            setLoading(true);
            const dateStr = format(selectedDate, 'yyyy-MM-dd');
            try {
                let rawSlots: any[] = [];
                if (selectedMaster) {
                    const res = await api.getPublicAvailableSlots(
                        dateStr,
                        selectedMaster.id,
                        undefined,
                        {
                            serviceIds: selectedServiceIds,
                            durationMinutes: resolvedDurationMinutes,
                        }
                    );
                    rawSlots = (res.slots || []).filter((s: any) => s.available);
                } else {
                    // Optimization: Single request for "Any Master" instead of N requests
                    const res = await api.getPublicAvailableSlots(
                        dateStr,
                        undefined,
                        undefined,
                        {
                            serviceIds: selectedServiceIds,
                            durationMinutes: resolvedDurationMinutes,
                        }
                    );
                    rawSlots = (res.slots || []).filter((s: any) => s.available);
                }

                const processed = rawSlots.map(s => {
                    const hour = parseInt(s.time.split(':')[0]);
                    let period: 'morning' | 'afternoon' | 'evening' = 'afternoon';
                    if (hour < 12) period = 'morning';
                    else if (hour >= 17) period = 'evening';
                    return {
                        ...s,
                        period,
                        isOptimal: (s.isOptimal ?? s.is_optimal ?? false) === true
                    };
                });
                setTimeSlots(processed);
            } catch (e) { } finally { setLoading(false); }
        };
        fetchSlots();
    }, [selectedDate, selectedMaster, selectedServiceIds, resolvedDurationMinutes]);

    const handleDateSelect = (date: Date | undefined) => {
        if (date) {
            onDateTimeChange(date, null);
        } else {
            onDateTimeChange(null, null);
        }
    };

    const handleTimeSelect = (time: string) => {
        if (selectedDate) {
            if (selectedTime === time) {
                onDateTimeChange(selectedDate, null);
            } else {
                onDateTimeChange(selectedDate, time);
            }
        }
    };

    const groupedSlots = {
        morning: timeSlots.filter((slot) => slot.period === 'morning'),
        afternoon: timeSlots.filter((slot) => slot.period === 'afternoon'),
        evening: timeSlots.filter((slot) => slot.period === 'evening'),
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 shadow-sm"
            >
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 mb-1">{t('datetime.title', 'Date & Time')}</h2>
                        <div className="flex items-center gap-2">
                            <Clock size={12} className="text-gray-400" />
                            <p className="text-xs text-gray-500 font-medium tracking-wide">
                                {t('totalDuration', 'Total duration')}: <span className="text-gray-900 font-bold">{totalDuration} {t('min', 'min')}</span>
                            </p>
                        </div>
                    </div>
                </div>
            </motion.div>

            <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
                {/* Calendar */}
                <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm h-full">
                        <div className="p-4 border-b border-gray-50 bg-gray-50/50">
                            <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                                {t('datetime.date', '1. Select Date')}
                            </h3>
                        </div>
                        <div className="p-3 sm:p-4 overflow-x-hidden flex justify-center">
                            <Calendar
                                mode="single"
                                selected={selectedDate || undefined}
                                onSelect={handleDateSelect}
                                month={currentMonth}
                                onMonthChange={setCurrentMonth}
                                locale={dateLocale}
                                disabled={(date) => {
                                    const today = new Date();
                                    today.setHours(0, 0, 0, 0);
                                    const dateStr = format(date, 'yyyy-MM-dd');
                                    // Don't disable dates while loading - prevents all dates from being disabled on initial load
                                    if (loadingDates) return date < today;
                                    return date < today || !availableDates.has(dateStr);
                                }}
                                className="rounded-xl border-none w-full mx-auto"
                            />
                        </div>
                    </div>
                </motion.div>

                {/* Time Slots */}
                <motion.div
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm h-full flex flex-col">
                        <div className="p-4 border-b border-gray-50 bg-gray-50/50">
                            <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{t('datetime.time', '2. Pick Time')}</h3>
                        </div>
                        <div className="p-4 sm:p-6 flex-1">
                            {!selectedDate ? (
                                <div className="text-center py-12 text-gray-400">
                                    <Clock className="w-10 h-10 mx-auto mb-3 opacity-20" />
                                    <p className="font-bold uppercase tracking-widest text-[10px]">
                                        {t('datetime.selectDateFirst', 'Select a date first')}
                                    </p>
                                </div>
                            ) : loading ? (
                                <div className="text-center py-12">
                                    <div className="w-10 h-10 border-4 border-gray-100 border-t-gray-900 rounded-full animate-spin mx-auto mb-3" />
                                    <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">{t('loading', 'Syncing slots...')}</p>
                                </div>
                            ) : timeSlots.length === 0 ? (
                                <div className="text-center py-12 text-gray-400">
                                    <p className="font-bold uppercase tracking-widest text-[10px]">{t('datetime.noSlots', 'No slots available')}</p>
                                </div>
                            ) : (
                                <div className="space-y-6 max-h-[360px] sm:max-h-[400px] overflow-y-auto overflow-x-hidden pr-1 sm:pr-2 custom-scrollbar">
                                    {(['morning', 'afternoon', 'evening'] as const).map((period) => {
                                        const periodSlots = groupedSlots[period];
                                        if (periodSlots.length === 0) return null;

                                        return (
                                            <div key={period}>
                                                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] mb-3">
                                                    {t(`datetime.${period}`, period.charAt(0).toUpperCase() + period.slice(1))}
                                                </h4>
                                                <div className="grid grid-cols-2 min-[430px]:grid-cols-3 gap-2">
                                                    {periodSlots.map((slot) => (
                                                        <button
                                                            key={slot.time}
                                                            onClick={() => handleTimeSelect(slot.time)}
                                                            className={`relative min-h-11 rounded-lg text-[clamp(0.8rem,3.1vw,0.95rem)] font-bold transition-all border ${selectedTime === slot.time
                                                                    ? 'bg-gray-900 text-white border-gray-900 shadow-md'
                                                                    : 'bg-white text-gray-900 border-gray-100 hover:border-gray-300'
                                                                }`}
                                                        >
                                                            {slot.isOptimal && (
                                                                <div className="absolute -top-1 -right-1">
                                                                    <img
                                                                        src="/logo.webp"
                                                                        alt={t('common:salon_logo', 'Salon logo')}
                                                                        className="w-3 h-3 object-contain"
                                                                        loading="lazy"
                                                                        onError={(event) => {
                                                                            const target = event.currentTarget;
                                                                            if (!target.src.endsWith('/logo.png')) {
                                                                                target.src = '/logo.png';
                                                                            }
                                                                        }}
                                                                    />
                                                                </div>
                                                            )}
                                                            {slot.time}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
