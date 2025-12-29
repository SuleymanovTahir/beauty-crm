import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Calendar } from './ui/calendar';
import { Sparkles, Clock, ChevronRight } from 'lucide-react';
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
    onContinue: () => void;
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
    totalDuration,
    onDateTimeChange,
    onContinue,
}: DateTimeStepProps) {
    const { t, i18n } = useTranslation(['booking', 'common']);
    const [availableDates, setAvailableDates] = useState<Set<string>>(new Set());
    const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
    const [loading, setLoading] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const dateLocale = getDateLocaleCentral(i18n.language);

    // Fetch available dates
    useEffect(() => {
        const fetchDates = async () => {
            let masterName = selectedMaster ? (selectedMaster.full_name || selectedMaster.username) : 'any';
            try {
                const res = await api.getAvailableDates(masterName, currentMonth.getFullYear(), currentMonth.getMonth() + 1, totalDuration || 60);
                if (res.available_dates) setAvailableDates(new Set(res.available_dates));
            } catch (e) { }
        };
        fetchDates();
    }, [currentMonth, selectedMaster, totalDuration]);

    // Fetch time slots when date is selected
    useEffect(() => {
        if (!selectedDate) return;

        const fetchSlots = async () => {
            setLoading(true);
            const dateStr = format(selectedDate, 'yyyy-MM-dd');
            try {
                let rawSlots: any[] = [];
                if (selectedMaster) {
                    const res = await api.getPublicAvailableSlots(dateStr, selectedMaster.id);
                    rawSlots = (res.slots || []).filter((s: any) => s.available);
                } else {
                    const usersRes = await api.getUsers();
                    const masters = (Array.isArray(usersRes) ? usersRes : (usersRes.users || [])).filter((u: any) => u.role === 'employee' || u.is_service_provider);
                    const results = await Promise.all(masters.map((m: any) =>
                        api.getPublicAvailableSlots(dateStr, m.id).then(r => r.slots || []).catch(() => [])
                    ));
                    const seen = new Set<string>();
                    rawSlots = results.flat().filter(s => {
                        if (s.available && !seen.has(s.time)) {
                            seen.add(s.time);
                            return true;
                        }
                        return false;
                    }).sort((a, b) => a.time.localeCompare(b.time));
                }

                const processed = rawSlots.map(s => {
                    const hour = parseInt(s.time.split(':')[0]);
                    let period: 'morning' | 'afternoon' | 'evening' = 'afternoon';
                    if (hour < 12) period = 'morning';
                    else if (hour >= 17) period = 'evening';
                    return { ...s, period, isOptimal: s.isOptimal || false };
                });
                setTimeSlots(processed);
            } catch (e) { } finally { setLoading(false); }
        };
        fetchSlots();
    }, [selectedDate, selectedMaster]);

    const handleDateSelect = (date: Date | undefined) => {
        if (date) {
            onDateTimeChange(date, null);
        } else {
            onDateTimeChange(null, null);
        }
    };

    const handleTimeSelect = (time: string) => {
        if (selectedDate) {
            onDateTimeChange(selectedDate, time);
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
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl shadow-lg p-6"
            >
                <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('booking.datetime.title', 'Date & Time')}</h2>
                <p className="text-gray-600 font-medium">
                    {t('booking.services.duration', 'Duration')}: {totalDuration} {t('booking.min', 'min')}
                </p>
            </motion.div>

            <div className="grid lg:grid-cols-2 gap-6 pb-20">
                {/* Calendar */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <Card className="overflow-hidden border-none shadow-xl rounded-2xl">
                        <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-5">
                            <h3 className="text-white font-black uppercase tracking-widest text-sm">
                                {t('booking.datetime.date', 'Select Date')}
                            </h3>
                        </div>
                        <CardContent className="p-4 bg-white">
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
                                    return date < today || !availableDates.has(dateStr);
                                }}
                                className="rounded-xl border-none w-full"
                            />
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Time Slots */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <Card className="overflow-hidden border-none shadow-xl rounded-2xl h-full">
                        <div className="bg-gradient-to-r from-pink-500 to-rose-500 p-5">
                            <h3 className="text-white font-black uppercase tracking-widest text-sm">{t('booking.datetime.time', 'Pick Time')}</h3>
                        </div>
                        <CardContent className="p-6 bg-white">
                            {!selectedDate ? (
                                <div className="text-center py-24 text-gray-400">
                                    <Clock className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                    <p className="font-bold uppercase tracking-widest text-xs">
                                        {t('booking.datetime.selectDateFirst', 'Select a date first')}
                                    </p>
                                </div>
                            ) : loading ? (
                                <div className="text-center py-24">
                                    <div className="w-12 h-12 border-8 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                                    <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">{t('booking.loading', 'Syncing slots...')}</p>
                                </div>
                            ) : timeSlots.length === 0 ? (
                                <div className="text-center py-24 text-gray-400">
                                    <p className="font-bold uppercase tracking-widest text-xs">{t('booking.datetime.noSlots', 'No slots available')}</p>
                                </div>
                            ) : (
                                <div className="space-y-8 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                                    {(['morning', 'afternoon', 'evening'] as const).map((period) => {
                                        const periodSlots = groupedSlots[period];
                                        if (periodSlots.length === 0) return null;

                                        return (
                                            <div key={period}>
                                                <h4 className="text-sm font-semibold text-gray-700 mb-3">
                                                    {t(`booking.datetime.${period}`)}
                                                </h4>
                                                <div className="grid grid-cols-3 gap-2">
                                                    {periodSlots.map((slot) => (
                                                        <Button
                                                            key={slot.time}
                                                            variant={selectedTime === slot.time ? 'default' : 'outline'}
                                                            className={`relative ${selectedTime === slot.time
                                                                ? 'bg-gradient-to-r from-purple-600 to-pink-600'
                                                                : ''
                                                                }`}
                                                            onClick={() => handleTimeSelect(slot.time)}
                                                        >
                                                            {slot.isOptimal && (
                                                                <Sparkles className="absolute -top-1 -right-1 w-3 h-3 text-yellow-400 fill-yellow-400" />
                                                            )}
                                                            {slot.time}
                                                        </Button>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </motion.div>
            </div>

            {/* Continue Button */}
            {selectedDate && selectedTime && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex justify-end mt-10"
                >
                    <Button
                        onClick={onContinue}
                        className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 h-16 px-16 rounded-2xl text-xl font-black shadow-2xl transition-all hover:scale-105"
                        size="lg"
                    >
                        {t('common.continue', 'Next step')}
                        <ChevronRight className="w-6 h-6 ml-2" />
                    </Button>
                </motion.div>
            )}
        </div>
    );
}
