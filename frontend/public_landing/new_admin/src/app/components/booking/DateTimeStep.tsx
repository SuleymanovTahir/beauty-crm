import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Service } from '../../App';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Calendar } from '../ui/calendar';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { format } from 'date-fns';
import { projectId, publicAnonKey } from '../../../../utils/supabase/info';

interface DateTimeStepProps {
  selectedDate: string | null;
  selectedTime: string | null;
  professionalId: string | null;
  services: Service[];
  totalDuration: number;
  onDateTimeChange: (date: string | null, time: string | null) => void;
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
  professionalId,
  services,
  totalDuration,
  onDateTimeChange,
  onContinue,
}: DateTimeStepProps) {
  const { t } = useTranslation();
  const [availableDates, setAvailableDates] = useState<Date[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDateObj, setSelectedDateObj] = useState<Date | undefined>(
    selectedDate ? new Date(selectedDate) : undefined
  );

  // Fetch available dates
  useEffect(() => {
    fetch(`https://${projectId}.supabase.co/functions/v1/make-server-6b68b787/booking/available-dates`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${publicAnonKey}`,
      },
      body: JSON.stringify({
        professionalId,
        serviceIds: services.map((s) => s.id),
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        const dates = data.dates.map((d: string) => new Date(d));
        setAvailableDates(dates);
      })
      .catch(console.error);
  }, [professionalId, services]);

  // Fetch time slots when date is selected
  useEffect(() => {
    if (!selectedDateObj) return;

    setLoading(true);
    const dateString = format(selectedDateObj, 'yyyy-MM-dd');

    fetch(`https://${projectId}.supabase.co/functions/v1/make-server-6b68b787/booking/available-slots`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${publicAnonKey}`,
      },
      body: JSON.stringify({
        date: dateString,
        professionalId,
        serviceIds: services.map((s) => s.id),
        duration: totalDuration,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        setTimeSlots(data.slots);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Failed to fetch time slots:', error);
        setLoading(false);
      });
  }, [selectedDateObj, professionalId, services, totalDuration]);

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDateObj(date);
    if (date) {
      const dateString = format(date, 'yyyy-MM-dd');
      onDateTimeChange(dateString, null);
    } else {
      onDateTimeChange(null, null);
    }
  };

  const handleTimeSelect = (time: string) => {
    if (selectedDateObj) {
      const dateString = format(selectedDateObj, 'yyyy-MM-dd');
      onDateTimeChange(dateString, time);
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
        <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('booking.datetime.title')}</h2>
        <p className="text-gray-600">
          {t('booking.services.duration')}: {totalDuration} {t('booking.min')}
        </p>
      </motion.div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Calendar */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="overflow-hidden">
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-4">
              <h3 className="text-white font-semibold">{t('booking.datetime.date')}</h3>
            </div>
            <CardContent className="p-4">
              <Calendar
                mode="single"
                selected={selectedDateObj}
                onSelect={handleDateSelect}
                disabled={(date) => {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  return date < today || !availableDates.some(
                    (d) => d.toDateString() === date.toDateString()
                  );
                }}
                className="rounded-md border-none"
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
          <Card className="overflow-hidden">
            <div className="bg-gradient-to-r from-pink-500 to-rose-500 p-4">
              <h3 className="text-white font-semibold">{t('booking.datetime.time')}</h3>
            </div>
            <CardContent className="p-4">
              {!selectedDateObj ? (
                <div className="text-center py-12 text-gray-500">
                  {t('booking.datetime.date')} first
                </div>
              ) : loading ? (
                <div className="text-center py-12">
                  <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-gray-600">{t('booking.loading')}</p>
                </div>
              ) : (
                <div className="space-y-6 max-h-96 overflow-y-auto">
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
                              className={`relative ${
                                selectedTime === slot.time
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
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex justify-end"
        >
          <Button
            onClick={onContinue}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            size="lg"
          >
            {t('booking.datetime.continue')}
          </Button>
        </motion.div>
      )}
    </div>
  );
}
