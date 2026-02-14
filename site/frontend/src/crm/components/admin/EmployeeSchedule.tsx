import { useState, useEffect } from 'react';
import { Copy, Trash2, Plus, X, Edit } from 'lucide-react';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { api } from '../../services/api';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

interface ScheduleEntry {
    day_of_week: number;
    start_time: string;
    end_time: string;
    is_working: boolean;
}

interface TimeOff {
    id: number;
    start_datetime: string;
    end_datetime: string;
    type: string;
    reason?: string;
}

interface Booking {
    id: number;
    datetime: string;
    service_name: string;
    master: string;
}

interface EmployeeScheduleProps {
    employeeId: number;
    employee: any;
}

// 8:00 to 22:00 with 30min steps
const TIME_SLOTS = Array.from({ length: 29 }, (_, i) => 8 + i * 0.5);
const DAY_KEYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

const getWeekStart = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
};

export function EmployeeSchedule({ employeeId, employee }: EmployeeScheduleProps) {
    const { t, i18n } = useTranslation(['admin/users', 'common']);

    // ✅ ДОБАВИТЬ: Состояние для дефолтных часов салона
    const [defaultHours, setDefaultHours] = useState({ start: '10:30', end: '21:30' }); // ✅ Это fallback, будет заменено из API

    // State
    const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
    const [timeOffs, setTimeOffs] = useState<TimeOff[]>([]);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [holidays, setHolidays] = useState<Array<{ date: string; name: string; is_closed: boolean; master_exceptions?: number[] }>>([]);
    const [loading, setLoading] = useState(true);

    // Autofill template state
    const [autofillHours, setAutofillHours] = useState({ start: '09', startMin: '00', end: '18', endMin: '00' });
    const [weeksAhead, setWeeksAhead] = useState('2');
    const [schedulePattern, setSchedulePattern] = useState('5/2');
    const [startingDate, setStartingDate] = useState(new Date().toISOString().split('T')[0]);
    const [scheduleEditMode, setScheduleEditMode] = useState<'bookings' | 'vacation' | 'sick_leave'>('bookings');

    // Time-off dialog state
    const [showTimeOffDialog, setShowTimeOffDialog] = useState(false);
    const [timeOffForm, setTimeOffForm] = useState({
        id: null as number | null,
        start_date: '',
        end_date: '',
        type: 'vacation',
        reason: ''
    });

    useEffect(() => {
        loadScheduleData();
    }, [employeeId]);

    const closeTimeOffDialog = () => {
        setShowTimeOffDialog(false);
        setTimeOffForm({ id: null, start_date: '', end_date: '', type: 'vacation', reason: '' });
    };

    // ✅ ДОБАВИТЬ: Загрузка дефолтных часов из API
    useEffect(() => {
        const loadDefaultHours = async () => {
            try {
                const hours = await api.get('/api/salon-settings/working-hours');
                const start = hours.weekdays.start;
                const end = hours.weekdays.end;
                setDefaultHours({ start, end });

                // Set autofill defaults from salon hours
                const [startH, startM] = (start || '10:00').split(':');
                const [endH, endM] = (end || '20:00').split(':');
                setAutofillHours({
                    start: startH.padStart(2, '0'),
                    startMin: startM.padStart(2, '0'),
                    end: endH.padStart(2, '0'),
                    endMin: endM.padStart(2, '0')
                });
            } catch (error) {
                console.error('Error loading default hours:', error);
                // Оставляем fallback значения
            }
        };
        loadDefaultHours();
    }, []);

    const loadScheduleData = async () => {
        try {
            setLoading(true);

            // Load schedule
            const scheduleData = await api.get(`/api/schedule/user/${employeeId}`);
            const normalizedSchedule = Array.isArray(scheduleData) ? scheduleData : [];
            if (normalizedSchedule.length === 0) {
                const fallbackStartTime = `${autofillHours.start}:${autofillHours.startMin}`;
                const fallbackEndTime = `${autofillHours.end}:${autofillHours.endMin}`;
                const seededSchedule = buildScheduleFromPattern(schedulePattern, startingDate, fallbackStartTime, fallbackEndTime);
                await api.put(`/api/schedule/user/${employeeId}`, { schedule: seededSchedule });
                setSchedule(seededSchedule);
            } else {
                setSchedule(normalizedSchedule);
            }

            // Load time-offs
            const timeOffData = await api.get(`/api/schedule/user/${employeeId}/time-off`);
            setTimeOffs(timeOffData || []);

            // Load bookings for the selected week
            const bookingsData = await api.get(`/api/bookings`);
            const allBookings = bookingsData?.bookings || [];
            const employeeBookings = allBookings.filter((b: Booking) => b.master === employee?.full_name);
            setBookings(employeeBookings);

            // Load holidays for current week to reflect automatic day-off state
            const weekStart = getWeekStart(new Date());
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);
            const weekStartKey = weekStart.toISOString().split('T')[0];
            const weekEndKey = weekEnd.toISOString().split('T')[0];
            const holidaysData = await api.getHolidays(weekStartKey, weekEndKey);
            setHolidays(Array.isArray(holidaysData) ? holidaysData : []);

        } catch (error) {
            console.error('Error loading schedule data:', error);
            toast.error(t('error_loading_schedule'));
        } finally {
            setLoading(false);
        }
    };

    const handleAutofillSchedule = async () => {
        try {
            const startTime = `${autofillHours.start}:${autofillHours.startMin}`;
            const endTime = `${autofillHours.end}:${autofillHours.endMin}`;
            const newSchedule = buildScheduleFromPattern(schedulePattern, startingDate, startTime, endTime);

            await api.put(`/api/schedule/user/${employeeId}`, { schedule: newSchedule });
            setSchedule(newSchedule);
            toast.success(t('schedule_filled', 'Schedule filled successfully'));

        } catch (error) {
            console.error('Error autofilling schedule:', error);
            toast.error(t('error_saving_schedule'));
        }
    };

    const handleAddTimeOff = async () => {
        if (!timeOffForm.start_date || !timeOffForm.end_date) {
            toast.error(t('fill_required_fields', 'Please fill required fields'));
            return;
        }

        try {
            if (timeOffForm.id) {
                // Update
                await api.put(`/api/schedule/time-off/${timeOffForm.id}`, {
                    start_datetime: timeOffForm.start_date,
                    end_datetime: timeOffForm.end_date,
                    type: timeOffForm.type,
                    reason: timeOffForm.reason
                });
                toast.success(t('time_off_updated', 'Time-off updated successfully'));
            } else {
                // Create
                await api.post(`/api/schedule/user/${employeeId}/time-off`, {
                    start_datetime: timeOffForm.start_date,
                    end_datetime: timeOffForm.end_date,
                    type: timeOffForm.type,
                    reason: timeOffForm.reason
                });
                toast.success(t('time_off_added', 'Time-off added successfully'));
            }

            setShowTimeOffDialog(false);
            setTimeOffForm({ id: null, start_date: '', end_date: '', type: 'vacation', reason: '' });
            loadScheduleData();

        } catch (error) {
            console.error('Error saving time-off:', error);
            toast.error(t('error_saving_settings', 'Error saving settings'));
        }
    };

    const handleEditTimeOff = (timeOff: TimeOff) => {
        setTimeOffForm({
            id: timeOff.id,
            start_date: timeOff.start_datetime ? timeOff.start_datetime.split('T')[0] : '',
            end_date: timeOff.end_datetime ? timeOff.end_datetime.split('T')[0] : '',
            type: timeOff.type || 'vacation',
            reason: timeOff.reason || ''
        });
        setShowTimeOffDialog(true);
    };

    const handleDeleteTimeOff = async (id: number) => {
        if (!confirm(t('confirm_delete_time_off', 'Delete this time-off period?'))) return;

        try {
            await api.delete(`/api/schedule/time-off/${id}`);
            toast.success(t('time_off_deleted', 'Time-off deleted'));
            loadScheduleData();
        } catch (error) {
            console.error('Error deleting time-off:', error);
            toast.error(t('error_deleting_time_off'));
        }
    };

    const handleClearWeek = async () => {
        if (!confirm(t('confirm_clear_schedule', 'Clear schedule for this week?'))) return;

        try {
            const emptySchedule = Array.from({ length: 7 }, (_, i) => ({
                day_of_week: i,
                start_time: defaultHours.start,
                end_time: defaultHours.end,
                is_working: false
            }));

            await api.put(`/api/schedule/user/${employeeId}`, { schedule: emptySchedule });
            setSchedule(emptySchedule);
            toast.success(t('schedule_cleared', 'Schedule cleared'));

        } catch (error) {
            console.error('Error clearing schedule:', error);
            toast.error(t('error_clearing_schedule'));
        }
    };

    const buildScheduleFromPattern = (
        patternValue: string,
        startDateValue: string,
        workStartTime: string,
        workEndTime: string
    ): ScheduleEntry[] => {
        const [workRaw, offRaw] = patternValue.split(/[/:]/);
        const parsePatternPart = (value: string | undefined, defaultValue: number) => {
            if (value === undefined || value === null || value.trim() === '') {
                return defaultValue;
            }
            const parsed = Number.parseInt(value, 10);
            if (!Number.isFinite(parsed)) {
                return defaultValue;
            }
            return Math.max(0, parsed);
        };

        const workDays = parsePatternPart(workRaw, 5);
        const offDays = parsePatternPart(offRaw, 2);
        const cycleLength = Math.max(1, workDays + offDays);

        const startDate = new Date(`${startDateValue}T00:00:00`);
        const templateWeekStart = getWeekStart(startDate);
        const dayInMs = 24 * 60 * 60 * 1000;

        return Array.from({ length: 7 }, (_, dayOfWeek) => {
            const dateForDay = new Date(templateWeekStart);
            dateForDay.setDate(templateWeekStart.getDate() + dayOfWeek);
            const diffDays = Math.floor((dateForDay.getTime() - startDate.getTime()) / dayInMs);
            const normalizedCycleDay = ((diffDays % cycleLength) + cycleLength) % cycleLength;
            const isWorking = workDays > 0 && normalizedCycleDay < workDays;

            return {
                day_of_week: dayOfWeek,
                start_time: isWorking ? workStartTime : defaultHours.start,
                end_time: isWorking ? workEndTime : defaultHours.end,
                is_working: isWorking
            };
        });
    };

    const getHolidayForDay = (dayIndex: number) => {
        const today = new Date();
        const weekStart = getWeekStart(today);
        const slotDate = new Date(weekStart);
        slotDate.setDate(slotDate.getDate() + dayIndex);
        const dateKey = slotDate.toISOString().split('T')[0];

        const holiday = holidays.find((item) => item.date === dateKey && item.is_closed);
        if (!holiday) {
            return null;
        }

        const exceptions = Array.isArray(holiday.master_exceptions) ? holiday.master_exceptions : [];
        return exceptions.includes(employeeId) ? null : holiday;
    };

    const getDateKeyForDay = (dayIndex: number) => {
        const today = new Date();
        const weekStart = getWeekStart(today);
        const slotDate = new Date(weekStart);
        slotDate.setDate(slotDate.getDate() + dayIndex);
        return slotDate.toISOString().split('T')[0];
    };

    const getTimeOffTypeForDay = (dayIndex: number): 'vacation' | 'sick_leave' | null => {
        if (!Array.isArray(timeOffs) || timeOffs.length === 0) {
            return null;
        }

        const today = new Date();
        const weekStart = getWeekStart(today);
        const slotDate = new Date(weekStart);
        slotDate.setDate(slotDate.getDate() + dayIndex);
        slotDate.setHours(0, 0, 0, 0);

        for (const timeOff of timeOffs) {
            const start = new Date(timeOff.start_datetime);
            const end = new Date(timeOff.end_datetime);
            if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
                continue;
            }

            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);

            if (slotDate >= start && slotDate <= end) {
                if (timeOff.type === 'vacation') {
                    return 'vacation';
                }
                if (timeOff.type === 'sick_leave') {
                    return 'sick_leave';
                }
            }
        }

        return null;
    };

    const isSlotBooked = (dayIndex: number, hour: number) => {
        const today = new Date();
        const weekStart = getWeekStart(today);
        const slotDate = new Date(weekStart);
        slotDate.setDate(slotDate.getDate() + dayIndex);

        return bookings.some(booking => {
            const bookingDate = new Date(booking.datetime);
            const bookingHour = bookingDate.getHours();
            const bookingMin = bookingDate.getMinutes();

            return bookingDate.getDate() === slotDate.getDate() &&
                bookingDate.getMonth() === slotDate.getMonth() &&
                bookingHour === Math.floor(hour) &&
                (hour % 1 === 0 ? bookingMin < 30 : bookingMin >= 30);
        });
    };

    const isSlotAvailable = (dayIndex: number, hour: number) => {
        if (getHolidayForDay(dayIndex)) {
            return false;
        }

        const daySchedule = schedule.find(s => s.day_of_week === dayIndex);
        if (!daySchedule || !daySchedule.is_working) return false;

        const parseTimeToFloat = (timeStr: string) => {
            const [h, m] = timeStr.split(':').map(Number);
            return h + (m / 60);
        };

        const startHour = parseTimeToFloat(daySchedule.start_time);
        const endHour = parseTimeToFloat(daySchedule.end_time);

        return hour >= startHour && hour < endHour;
    };

    const findTimeOffByDay = (dayIndex: number) => {
        const dayDateKey = getDateKeyForDay(dayIndex);
        const dayDate = new Date(`${dayDateKey}T00:00:00`);

        return timeOffs.find((timeOff) => {
            const startDate = new Date(timeOff.start_datetime);
            const endDate = new Date(timeOff.end_datetime);
            if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
                return false;
            }
            startDate.setHours(0, 0, 0, 0);
            endDate.setHours(23, 59, 59, 999);
            return dayDate >= startDate && dayDate <= endDate;
        }) ?? null;
    };

    const handleCalendarTimeOffClick = async (dayIndex: number, selectedType: 'vacation' | 'sick_leave') => {
        const existingTimeOff = findTimeOffByDay(dayIndex);
        const dayDateKey = getDateKeyForDay(dayIndex);

        if (existingTimeOff && String(existingTimeOff.type ?? '') === selectedType) {
            await api.delete(`/api/schedule/time-off/${existingTimeOff.id}`);
            toast.success(t('time_off_deleted', 'Time-off deleted'));
            await loadScheduleData();
            return;
        }

        if (existingTimeOff) {
            await api.put(`/api/schedule/time-off/${existingTimeOff.id}`, {
                start_datetime: existingTimeOff.start_datetime,
                end_datetime: existingTimeOff.end_datetime,
                type: selectedType,
                reason: existingTimeOff.reason
            });
            toast.success(t('time_off_updated', 'Time-off updated successfully'));
            await loadScheduleData();
            return;
        }

        await api.post(`/api/schedule/user/${employeeId}/time-off`, {
            start_datetime: `${dayDateKey}T00:00:00`,
            end_datetime: `${dayDateKey}T23:59:59`,
            type: selectedType,
            reason: ''
        });
        toast.success(t('time_off_added', 'Time-off added successfully'));
        await loadScheduleData();
    };

    const patternParts = schedulePattern.split(/[/:]/);
    const patternDaysOn = patternParts[0] !== undefined ? patternParts[0] : '5';
    const patternDaysOff = patternParts[1] !== undefined ? patternParts[1] : '2';

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Schedule Autofill Template */}
            <div className="bg-white rounded-lg border p-4 sm:p-6">
                <h3 className="font-semibold mb-4">{t('schedule_autofill_template', 'Schedule autofill template')}</h3>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                    <div>
                        <Label>{t('schedule_pattern', 'Schedule')}</Label>
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                            <Input
                                type="number"
                                value={patternDaysOn}
                                onChange={(e) => {
                                    const daysOn = e.target.value;
                                    const daysOff = patternDaysOff;
                                    setSchedulePattern(`${daysOn}/${daysOff}`);
                                }}
                                className="w-20"
                                placeholder="5"
                            />
                            <span>/</span>
                            <Input
                                type="number"
                                value={patternDaysOff}
                                onChange={(e) => {
                                    const daysOn = patternDaysOn;
                                    const daysOff = e.target.value;
                                    setSchedulePattern(`${daysOn}/${daysOff}`);
                                }}
                                className="w-20"
                                placeholder="2"
                            />
                            <span className="text-sm text-gray-500 break-words">{t('days_on_off', '(days on/off)')}</span>
                        </div>
                    </div>

                    <div>
                        <Label>{t('starting_date', 'Starting')}</Label>
                        <Input
                            type="date"
                            value={startingDate}
                            onChange={(e) => setStartingDate(e.target.value)}
                            className="mt-2"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                    <div>
                        <Label>{t('working_hours', 'Working hours')}</Label>
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                            <Select value={autofillHours.start} onValueChange={(v) => setAutofillHours({ ...autofillHours, start: v })}>
                                <SelectTrigger className="w-20">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {Array.from({ length: 24 }, (_, i) => (
                                        <SelectItem key={i} value={i.toString().padStart(2, '0')}>
                                            {i.toString().padStart(2, '0')}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <span>{(t('unit_hour', 'hour') || 'h')[0].toLowerCase()}</span>
                            <Select value={autofillHours.startMin} onValueChange={(v) => setAutofillHours({ ...autofillHours, startMin: v })}>
                                <SelectTrigger className="w-20">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="00">00</SelectItem>
                                    <SelectItem value="30">30</SelectItem>
                                </SelectContent>
                            </Select>
                            <span>{(t('unit_minute', 'minute') || 'm')[0].toLowerCase()}</span>
                            <span className="mx-2">—</span>
                            <Select value={autofillHours.end} onValueChange={(v) => setAutofillHours({ ...autofillHours, end: v })}>
                                <SelectTrigger className="w-20">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {Array.from({ length: 24 }, (_, i) => (
                                        <SelectItem key={i} value={i.toString().padStart(2, '0')}>
                                            {i.toString().padStart(2, '0')}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <span>{(t('unit_hour', 'hour') || 'h')[0].toLowerCase()}</span>
                            <Select value={autofillHours.endMin} onValueChange={(v) => setAutofillHours({ ...autofillHours, endMin: v })}>
                                <SelectTrigger className="w-20">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="00">00</SelectItem>
                                    <SelectItem value="30">30</SelectItem>
                                </SelectContent>
                            </Select>
                            <span>{(t('unit_minute', 'minute') || 'm')[0].toLowerCase()}</span>
                        </div>
                    </div>

                    <div>
                        <Label>{t('set_for', 'Set for')}</Label>
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                            <Input
                                type="number"
                                value={weeksAhead}
                                onChange={(e) => setWeeksAhead(e.target.value)}
                                className="w-24 min-w-0"
                            />
                            <span>{t('weeks_ahead', 'weeks ahead')}</span>
                        </div>
                    </div>
                </div>

                <Button onClick={handleAutofillSchedule} className="bg-blue-500 hover:bg-blue-600 text-white w-full sm:w-auto">
                    {t('save_and_fill_schedule', 'Save and fill schedule')}
                </Button>
            </div>

            {/* Weekly Schedule Grid */}
            <div className="bg-white rounded-lg border p-4 sm:p-6">
                <div className="flex flex-col gap-3 mb-4 lg:flex-row lg:items-center lg:justify-between">
                    <h3 className="font-semibold">{t('schedule', 'Schedule')}</h3>
                    <div className="flex flex-col gap-3 w-full lg:w-auto lg:flex-row lg:items-center">
                        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                            <Button
                                type="button"
                                size="sm"
                                variant={scheduleEditMode === 'bookings' ? 'default' : 'outline'}
                                onClick={() => setScheduleEditMode('bookings')}
                                className={`${scheduleEditMode === 'bookings' ? 'bg-red-500 hover:bg-red-600 text-white ring-2 ring-red-200' : ''} w-full sm:w-auto`}
                            >
                                <span className={`w-2 h-2 rounded-full ${scheduleEditMode === 'bookings' ? 'bg-white' : 'bg-red-500'}`}></span>
                                {t('bookings', 'Записи')}
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                variant={scheduleEditMode === 'vacation' ? 'default' : 'outline'}
                                onClick={() => setScheduleEditMode('vacation')}
                                className={`${scheduleEditMode === 'vacation' ? 'bg-amber-500 hover:bg-amber-600 text-white ring-2 ring-amber-200' : ''} w-full sm:w-auto`}
                            >
                                <span className={`w-2 h-2 rounded-full ${scheduleEditMode === 'vacation' ? 'bg-white' : 'bg-amber-500'}`}></span>
                                {t('vacation', 'Отпуск')}
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                variant={scheduleEditMode === 'sick_leave' ? 'default' : 'outline'}
                                onClick={() => setScheduleEditMode('sick_leave')}
                                className={`${scheduleEditMode === 'sick_leave' ? 'bg-purple-500 hover:bg-purple-600 text-white ring-2 ring-purple-200' : ''} w-full sm:w-auto`}
                            >
                                <span className={`w-2 h-2 rounded-full ${scheduleEditMode === 'sick_leave' ? 'bg-white' : 'bg-purple-500'}`}></span>
                                {t('sick_leave', 'Больничный')}
                            </Button>
                        </div>
                        <p className="text-xs text-gray-500 w-full lg:w-auto">{t('schedule_mode_hint', 'Выберите режим и нажмите по ячейке в календаре')}</p>
                        <Button variant="outline" size="sm" onClick={handleClearWeek} className="w-full sm:w-auto">
                            {t('clear_schedule_for_week', 'Clear schedule for the week')}
                        </Button>
                    </div>
                </div>

                <div className="overflow-x-auto pb-1">
                    <table className="min-w-[760px] w-full border-collapse">
                        <thead>
                            <tr>
                                <th className="border p-2 text-xs font-medium text-gray-500"></th>
                                {DAY_KEYS.map((dayKey, dayIndex) => {
                                    const translatedDay = t(`days.${dayKey}`, dayKey);
                                    const shortDay = i18n.language === 'ar' ? translatedDay : translatedDay.substring(0, 2).toUpperCase();
                                    const holidayForDay = getHolidayForDay(dayIndex);
                                    return (
                                        <th key={dayKey} className="border p-2 text-xs font-medium text-gray-700">
                                            <div className="flex flex-col items-center gap-1">
                                                <span>{shortDay}</span>
                                                {holidayForDay ? (
                                                    <span className="text-[10px] text-red-500" title={holidayForDay.name || ''}>
                                                        {t('day_off', 'Day Off')}
                                                    </span>
                                                ) : null}
                                            </div>
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>
                        <tbody>
                            {TIME_SLOTS.map(hour => {
                                const h = Math.floor(hour);
                                const m = (hour % 1 === 0) ? '00' : '30';
                                return (
                                    <tr key={hour}>
                                        <td className="border p-2 text-[10px] text-gray-500 text-center font-mono">
                                            {`${h.toString().padStart(2, '0')}:${m}`}
                                        </td>
                                        {DAY_KEYS.map((_, dayIndex) => {
                                            const isBooked = isSlotBooked(dayIndex, hour);
                                            const isAvailable = isSlotAvailable(dayIndex, hour);
                                            const timeOffType = getTimeOffTypeForDay(dayIndex);
                                            const isVacationSlot = timeOffType === 'vacation';
                                            const isSickLeaveSlot = timeOffType === 'sick_leave';

                                            const handleCellClick = async () => {
                                                const holidayForDay = getHolidayForDay(dayIndex);
                                                if (holidayForDay) {
                                                    toast.info(t('day_off', 'Day Off'));
                                                    return;
                                                }

                                                if (scheduleEditMode !== 'bookings') {
                                                    if (isBooked) {
                                                        toast.info(t('slot_has_booking', 'Этот слот занят записью'));
                                                        return;
                                                    }
                                                    try {
                                                        await handleCalendarTimeOffClick(dayIndex, scheduleEditMode);
                                                    } catch (error) {
                                                        console.error('Error updating calendar time-off:', error);
                                                        toast.error(t('error_saving_settings', 'Error saving settings'));
                                                    }
                                                    return;
                                                }

                                                if (isVacationSlot || isSickLeaveSlot) {
                                                    toast.info(isVacationSlot ? t('vacation', 'Отпуск') : t('sick_leave', 'Больничный'));
                                                    return;
                                                }

                                                if (isBooked) {
                                                    toast.info(t('slot_has_booking', 'Этот слот занят записью'));
                                                    return;
                                                }

                                                const daySchedule = schedule.find(s => s.day_of_week === dayIndex);
                                                const parseTimeToFloat = (timeStr: string) => {
                                                    const [h_part, m_part] = timeStr.split(':').map(Number);
                                                    return h_part + (m_part / 60);
                                                };
                                                const toSlotStart = (slotHour: number) => {
                                                    const localH = Math.floor(slotHour);
                                                    const localM = slotHour % 1 === 0 ? '00' : '30';
                                                    return `${localH.toString().padStart(2, '0')}:${localM}`;
                                                };
                                                const toSlotEnd = (slotHour: number) => {
                                                    const endSlotHour = slotHour % 1 === 0 ? Math.floor(slotHour) : Math.floor(slotHour) + 1;
                                                    const endSlotMin = slotHour % 1 === 0 ? '30' : '00';
                                                    return `${endSlotHour.toString().padStart(2, '0')}:${endSlotMin}`;
                                                };
                                                const slotStart = toSlotStart(hour);
                                                const slotEnd = toSlotEnd(hour);

                                                const startHour = daySchedule ? parseTimeToFloat(daySchedule.start_time) : -1;
                                                const endHour = daySchedule ? parseTimeToFloat(daySchedule.end_time) : -1;

                                                let nextSchedule: ScheduleEntry[];

                                                if (!daySchedule || !daySchedule.is_working) {
                                                    const newEntry: ScheduleEntry = {
                                                        day_of_week: dayIndex,
                                                        start_time: slotStart,
                                                        end_time: slotEnd,
                                                        is_working: true
                                                    };

                                                    const existingIndex = schedule.findIndex((entry) => entry.day_of_week === dayIndex);
                                                    if (existingIndex >= 0) {
                                                        nextSchedule = schedule.map((entry, idx) => idx === existingIndex ? newEntry : entry);
                                                    } else {
                                                        nextSchedule = [...schedule, newEntry];
                                                    }
                                                } else {
                                                    const epsilon = 0.001;
                                                    const isAdjacentBeforeStart = Math.abs((hour + 0.5) - startHour) < epsilon;
                                                    const isAdjacentAfterEnd = Math.abs(hour - endHour) < epsilon;
                                                    const isRangeStart = Math.abs(hour - startHour) < epsilon;
                                                    const isRangeEndSlot = Math.abs((hour + 0.5) - endHour) < epsilon;
                                                    const isInsideRange = hour >= startHour && hour < endHour;

                                                    if (!isInsideRange) {
                                                        // Prevent accidental long merge: only expand when user clicks adjacent slot.
                                                        // Otherwise start a new shift from the clicked slot.
                                                        if (isAdjacentBeforeStart) {
                                                            nextSchedule = schedule.map((entry) =>
                                                                entry.day_of_week === dayIndex ? { ...entry, start_time: slotStart } : entry
                                                            );
                                                        } else if (isAdjacentAfterEnd) {
                                                            nextSchedule = schedule.map((entry) =>
                                                                entry.day_of_week === dayIndex ? { ...entry, end_time: slotEnd } : entry
                                                            );
                                                        } else {
                                                            nextSchedule = schedule.map((entry) =>
                                                                entry.day_of_week === dayIndex
                                                                    ? { ...entry, start_time: slotStart, end_time: slotEnd, is_working: true }
                                                                    : entry
                                                            );
                                                        }
                                                    } else {
                                                        if (isRangeStart && isRangeEndSlot) {
                                                            nextSchedule = schedule.map((entry) =>
                                                                entry.day_of_week === dayIndex ? { ...entry, is_working: false } : entry
                                                            );
                                                        } else if (isRangeStart) {
                                                            nextSchedule = schedule.map((entry) =>
                                                                entry.day_of_week === dayIndex ? { ...entry, start_time: slotEnd } : entry
                                                            );
                                                        } else if (isRangeEndSlot) {
                                                            nextSchedule = schedule.map((entry) =>
                                                                entry.day_of_week === dayIndex ? { ...entry, end_time: slotStart } : entry
                                                            );
                                                        } else {
                                                            toast.info(t('cannot_remove_middle_hour', 'Cannot remove hour from middle of shift. Remove from start or end first.'));
                                                            return;
                                                        }
                                                    }
                                                }

                                                await api.put(`/api/schedule/user/${employeeId}`, { schedule: nextSchedule });
                                                setSchedule(nextSchedule);
                                                toast.success(t('schedule_updated', 'Schedule updated'));
                                            };

                                            return (
                                                <td
                                                    key={dayIndex}
                                                    className="border p-2 text-center cursor-pointer hover:bg-gray-50 transition-colors"
                                                    onClick={handleCellClick}
                                                >
                                                    {(isAvailable || isVacationSlot || isSickLeaveSlot) ? (
                                                        <div className="flex items-center justify-center w-full h-full">
                                                            <div className={`w-3 h-3 rounded-full transition-all ${isBooked
                                                                ? 'bg-red-500 shadow-sm shadow-red-200'
                                                                : isVacationSlot
                                                                    ? 'bg-amber-500 shadow-sm shadow-amber-200'
                                                                    : isSickLeaveSlot
                                                                        ? 'bg-purple-500 shadow-sm shadow-purple-200'
                                                                        : 'bg-green-400 shadow-sm shadow-green-100'
                                                                }`} />
                                                        </div>
                                                    ) : null}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                    <Label>{t('copy_schedule_for', 'Copy schedule for')}</Label>
                    <Input type="number" defaultValue="1" className="w-20" />
                    <span className="text-sm text-gray-600">{t('weeks_ahead', 'weeks ahead')}</span>
                    <Button variant="outline" size="sm" className="w-full sm:w-auto">
                        <Copy className="w-4 h-4 mr-2" />
                        {t('copy', 'Copy')}
                    </Button>
                </div>
            </div>

            {/* Time-Off Management */}
            <div className="bg-white rounded-lg border p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">{t('time_off', 'Time-off / Absences')}</h3>
                    <Button onClick={() => setShowTimeOffDialog(true)} size="sm">
                        <Plus className="w-4 h-4 mr-2" />
                        {t('add_time_off', 'Add time-off')}
                    </Button>
                </div>

                {timeOffs.length > 0 ? (
                    <div className="space-y-2">
                        {timeOffs.map(timeOff => (
                            <div key={timeOff.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                                <div>
                                    <div className="font-medium">
                                        {new Date(timeOff.start_datetime).toLocaleDateString('ru-RU')} - {new Date(timeOff.end_datetime).toLocaleDateString('ru-RU')}
                                    </div>
                                    <div className="text-sm text-gray-600">
                                        {timeOff.type} {timeOff.reason && `- ${timeOff.reason}`}
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleEditTimeOff(timeOff)}
                                    >
                                        <Edit className="w-4 h-4 text-yellow-600" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDeleteTimeOff(timeOff.id)}
                                    >
                                        <Trash2 className="w-4 h-4 text-red-500" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-gray-500 text-sm">{t('no_time_off', 'No time-off periods scheduled')}</p>
                )}
            </div>

            {/* Time-Off Dialog */}
            {showTimeOffDialog && (
                <div
                    className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
                    onClick={closeTimeOffDialog}
                >
                    <div
                        className="bg-white rounded-lg p-6 w-full max-w-md"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold">{timeOffForm.id ? t('edit_time_off', 'Edit Time-off') : t('add_time_off', 'Add Time-off')}</h3>
                            <Button variant="ghost" size="sm" onClick={closeTimeOffDialog}>
                                <X className="w-4 h-4" />
                            </Button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <Label>{t('start_date', 'Start Date')}</Label>
                                <Input
                                    type="date"
                                    value={timeOffForm.start_date}
                                    onChange={(e) => setTimeOffForm({ ...timeOffForm, start_date: e.target.value })}
                                    className="mt-2"
                                />
                            </div>

                            <div>
                                <Label>{t('end_date', 'End Date')}</Label>
                                <Input
                                    type="date"
                                    value={timeOffForm.end_date}
                                    onChange={(e) => setTimeOffForm({ ...timeOffForm, end_date: e.target.value })}
                                    className="mt-2"
                                />
                            </div>

                            <div>
                                <Label>{t('type', 'Type')}</Label>
                                <Select value={timeOffForm.type} onValueChange={(v) => setTimeOffForm({ ...timeOffForm, type: v })}>
                                    <SelectTrigger className="mt-2">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="vacation">{t('vacation', 'Vacation')}</SelectItem>
                                        <SelectItem value="sick_leave">{t('sick_leave', 'Sick Leave')}</SelectItem>
                                        <SelectItem value="day_off">{t('day_off', 'Day Off')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Label>{t('reason', 'Reason (optional)')}</Label>
                                <Input
                                    value={timeOffForm.reason}
                                    onChange={(e) => setTimeOffForm({ ...timeOffForm, reason: e.target.value })}
                                    placeholder={t('reason_placeholder', 'e.g., Family vacation')}
                                    className="mt-2"
                                />
                            </div>
                        </div>

                        <div className="flex gap-2 mt-6">
                            <Button onClick={handleAddTimeOff} className="flex-1">
                                {timeOffForm.id ? t('edit_save', 'Save') : t('add', 'Add')}
                            </Button>
                            <Button variant="outline" onClick={() => {
                                closeTimeOffDialog();
                            }} className="flex-1">
                                {t('cancel', 'Cancel')}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
