import { useState, useEffect } from 'react';
import { Copy, Trash2, Plus, X } from 'lucide-react';
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

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const HOURS = Array.from({ length: 23 }, (_, i) => i + 1); // 1 AM - 11 PM

export function EmployeeSchedule({ employeeId, employee }: EmployeeScheduleProps) {
    const { t } = useTranslation(['admin/users', 'common']);

    // State
    const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
    const [timeOffs, setTimeOffs] = useState<TimeOff[]>([]);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);

    // Autofill template state
    const [autofillHours, setAutofillHours] = useState({ start: '09', startMin: '00', end: '18', endMin: '00' });
    const [weeksAhead, setWeeksAhead] = useState('2');
    const [schedulePattern, setSchedulePattern] = useState('5/2');
    const [startingDate, setStartingDate] = useState(new Date().toISOString().split('T')[0]);

    // Time-off dialog state
    const [showTimeOffDialog, setShowTimeOffDialog] = useState(false);
    const [timeOffForm, setTimeOffForm] = useState({
        start_date: '',
        end_date: '',
        type: 'vacation',
        reason: ''
    });

    useEffect(() => {
        loadScheduleData();
    }, [employeeId]);

    const loadScheduleData = async () => {
        try {
            setLoading(true);

            // Load schedule
            const scheduleData = await api.get(`/api/schedule/user/${employeeId}`);
            setSchedule(scheduleData || []);

            // Load time-offs
            const timeOffData = await api.get(`/api/schedule/user/${employeeId}/time-off`);
            setTimeOffs(timeOffData || []);

            // Load bookings for the selected week
            // Note: We'll load all bookings and filter client-side since bookings use master name not ID
            const bookingsData = await api.get(`/api/bookings`);
            const allBookings = bookingsData?.bookings || [];
            // Filter by employee's full_name (master field)
            const employeeBookings = allBookings.filter((b: Booking) => b.master === employee?.full_name);
            setBookings(employeeBookings);

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

            // Create schedule for all working days (Mon-Fri by default)
            const newSchedule: ScheduleEntry[] = [];
            for (let day = 0; day < 5; day++) { // Mon-Fri
                newSchedule.push({
                    day_of_week: day,
                    start_time: startTime,
                    end_time: endTime,
                    is_working: true
                });
            }
            // Weekend as non-working
            for (let day = 5; day < 7; day++) {
                newSchedule.push({
                    day_of_week: day,
                    start_time: '09:00',
                    end_time: '18:00',
                    is_working: false
                });
            }

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
            await api.post(`/api/schedule/user/${employeeId}/time-off`, {
                start_datetime: timeOffForm.start_date,
                end_datetime: timeOffForm.end_date,
                type: timeOffForm.type,
                reason: timeOffForm.reason
            });

            toast.success(t('time_off_added', 'Time-off added successfully'));
            setShowTimeOffDialog(false);
            setTimeOffForm({ start_date: '', end_date: '', type: 'vacation', reason: '' });
            loadScheduleData();

        } catch (error) {
            console.error('Error adding time-off:', error);
            toast.error(t('error_adding_time_off'));
        }
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
                start_time: '09:00',
                end_time: '18:00',
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

    // Helper functions
    const getWeekStart = (date: Date) => {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
        return new Date(d.setDate(diff));
    };

    const isSlotBooked = (dayIndex: number, hour: number) => {
        // For simplicity, let's assume we're always looking at the current week for bookings
        // A more robust solution would involve a selectedDate state for the calendar view
        const today = new Date();
        const weekStart = getWeekStart(today);
        const slotDate = new Date(weekStart);
        slotDate.setDate(slotDate.getDate() + dayIndex);

        return bookings.some(booking => {
            const bookingDate = new Date(booking.datetime);
            return bookingDate.getDate() === slotDate.getDate() &&
                bookingDate.getMonth() === slotDate.getMonth() &&
                bookingDate.getHours() === hour;
        });
    };

    const isSlotAvailable = (dayIndex: number, hour: number) => {
        const daySchedule = schedule.find(s => s.day_of_week === dayIndex);
        if (!daySchedule || !daySchedule.is_working) return false;

        const startHour = parseInt(daySchedule.start_time.split(':')[0]);
        const endHour = parseInt(daySchedule.end_time.split(':')[0]);

        return hour >= startHour && hour < endHour;
    };



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
            <div className="bg-white rounded-lg border p-6">
                <h3 className="font-semibold mb-4">{t('schedule_autofill_template', 'Schedule autofill template')}</h3>

                <div className="grid grid-cols-2 gap-4 mb-4">
                    {/* Schedule Pattern */}
                    <div>
                        <Label>{t('schedule_pattern', 'Schedule')}</Label>
                        <div className="flex items-center gap-2 mt-2">
                            <Input
                                type="number"
                                min="1"
                                max="31"
                                value={schedulePattern.split('/')[0] || '5'}
                                onChange={(e) => {
                                    const daysOn = e.target.value;
                                    const daysOff = schedulePattern.split('/')[1] || '2';
                                    setSchedulePattern(`${daysOn}/${daysOff}`);
                                }}
                                className="w-20"
                                placeholder="5"
                            />
                            <span>/</span>
                            <Input
                                type="number"
                                min="1"
                                max="31"
                                value={schedulePattern.split('/')[1] || '2'}
                                onChange={(e) => {
                                    const daysOn = schedulePattern.split('/')[0] || '5';
                                    const daysOff = e.target.value;
                                    setSchedulePattern(`${daysOn}/${daysOff}`);
                                }}
                                className="w-20"
                                placeholder="2"
                            />
                            <span className="text-sm text-gray-500">{t('days_on_off', '(days on/off)')}</span>
                        </div>
                    </div>

                    {/* Starting Date */}
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

                <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                        <Label>{t('working_hours', 'Working hours')}</Label>
                        <div className="flex items-center gap-2 mt-2">
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
                            <span>h</span>
                            <Select value={autofillHours.startMin} onValueChange={(v) => setAutofillHours({ ...autofillHours, startMin: v })}>
                                <SelectTrigger className="w-20">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="00">00</SelectItem>
                                    <SelectItem value="30">30</SelectItem>
                                </SelectContent>
                            </Select>
                            <span>m</span>
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
                            <span>h</span>
                            <Select value={autofillHours.endMin} onValueChange={(v) => setAutofillHours({ ...autofillHours, endMin: v })}>
                                <SelectTrigger className="w-20">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="00">00</SelectItem>
                                    <SelectItem value="30">30</SelectItem>
                                </SelectContent>
                            </Select>
                            <span>m</span>
                        </div>
                    </div>

                    <div>
                        <Label>{t('set_for', 'Set for')}</Label>
                        <div className="flex items-center gap-2 mt-2">
                            <Input
                                type="number"
                                min="1"
                                max="4"
                                value={weeksAhead}
                                onChange={(e) => setWeeksAhead(e.target.value)}
                                className="w-24"
                            />
                            <span>{t('weeks_ahead', 'weeks ahead')}</span>
                        </div>
                    </div>
                </div>

                <Button onClick={handleAutofillSchedule} className="bg-blue-500 hover:bg-blue-600 text-white">
                    {t('save_and_fill_schedule', 'Save and fill schedule')}
                </Button>
            </div>

            {/* Weekly Schedule Grid */}
            <div className="bg-white rounded-lg border p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">{t('schedule', 'Schedule')}</h3>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-red-500"></div>
                            <span className="text-sm">{t('bookings', 'Bookings')}</span>
                        </div>
                        <Button variant="outline" size="sm" onClick={handleClearWeek}>
                            {t('clear_schedule_for_week', 'Clear schedule for the week')}
                        </Button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr>
                                <th className="border p-2 text-xs font-medium text-gray-500"></th>
                                {DAYS.map(day => (
                                    <th key={day} className="border p-2 text-xs font-medium text-gray-700">
                                        {day}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {HOURS.map(hour => (
                                <tr key={hour}>
                                    <td className="border p-2 text-xs text-gray-500 text-center">
                                        {hour} {hour < 12 ? 'AM' : 'PM'}
                                    </td>
                                    {DAYS.map((_, dayIndex) => {
                                        const isBooked = isSlotBooked(dayIndex, hour);
                                        const isAvailable = isSlotAvailable(dayIndex, hour);

                                        const handleCellClick = async () => {
                                            // Toggle working hours for this slot
                                            const daySchedule = schedule.find(s => s.day_of_week === dayIndex);

                                            if (!daySchedule || !daySchedule.is_working) {
                                                // Day is not working, make it working with this hour
                                                const newSchedule = [...schedule];
                                                const existingIndex = newSchedule.findIndex(s => s.day_of_week === dayIndex);

                                                if (existingIndex >= 0) {
                                                    newSchedule[existingIndex] = {
                                                        day_of_week: dayIndex,
                                                        start_time: `${hour.toString().padStart(2, '0')}:00`,
                                                        end_time: `${(hour + 1).toString().padStart(2, '0')}:00`,
                                                        is_working: true
                                                    };
                                                } else {
                                                    newSchedule.push({
                                                        day_of_week: dayIndex,
                                                        start_time: `${hour.toString().padStart(2, '0')}:00`,
                                                        end_time: `${(hour + 1).toString().padStart(2, '0')}:00`,
                                                        is_working: true
                                                    });
                                                }

                                                await api.put(`/api/schedule/user/${employeeId}`, { schedule: newSchedule });
                                                setSchedule(newSchedule);
                                                toast.success(t('schedule_updated', 'Schedule updated'));
                                            } else {
                                                // Day is working
                                                const startHour = parseInt(daySchedule.start_time.split(':')[0]);
                                                const endHour = parseInt(daySchedule.end_time.split(':')[0]);

                                                if (hour < startHour) {
                                                    // Extend start time backwards
                                                    const newSchedule = schedule.map(s =>
                                                        s.day_of_week === dayIndex
                                                            ? { ...s, start_time: `${hour.toString().padStart(2, '0')}:00` }
                                                            : s
                                                    );
                                                    await api.put(`/api/schedule/user/${employeeId}`, { schedule: newSchedule });
                                                    setSchedule(newSchedule);
                                                    toast.success(t('schedule_updated', 'Schedule updated'));
                                                } else if (hour >= endHour) {
                                                    // Extend end time forward
                                                    const newSchedule = schedule.map(s =>
                                                        s.day_of_week === dayIndex
                                                            ? { ...s, end_time: `${(hour + 1).toString().padStart(2, '0')}:00` }
                                                            : s
                                                    );
                                                    await api.put(`/api/schedule/user/${employeeId}`, { schedule: newSchedule });
                                                    setSchedule(newSchedule);
                                                    toast.success(t('schedule_updated', 'Schedule updated'));
                                                } else {
                                                    // Hour is within range - remove it by shrinking the range
                                                    if (hour === startHour && hour + 1 === endHour) {
                                                        // Only one hour - remove the day entirely
                                                        const newSchedule = schedule.map(s =>
                                                            s.day_of_week === dayIndex
                                                                ? { ...s, is_working: false }
                                                                : s
                                                        );
                                                        await api.put(`/api/schedule/user/${employeeId}`, { schedule: newSchedule });
                                                        setSchedule(newSchedule);
                                                        toast.success(t('schedule_updated', 'Schedule updated'));
                                                    } else if (hour === startHour) {
                                                        // Remove from start
                                                        const newSchedule = schedule.map(s =>
                                                            s.day_of_week === dayIndex
                                                                ? { ...s, start_time: `${(hour + 1).toString().padStart(2, '0')}:00` }
                                                                : s
                                                        );
                                                        await api.put(`/api/schedule/user/${employeeId}`, { schedule: newSchedule });
                                                        setSchedule(newSchedule);
                                                        toast.success(t('schedule_updated', 'Schedule updated'));
                                                    } else if (hour + 1 === endHour) {
                                                        // Remove from end
                                                        const newSchedule = schedule.map(s =>
                                                            s.day_of_week === dayIndex
                                                                ? { ...s, end_time: `${hour.toString().padStart(2, '0')}:00` }
                                                                : s
                                                        );
                                                        await api.put(`/api/schedule/user/${employeeId}`, { schedule: newSchedule });
                                                        setSchedule(newSchedule);
                                                        toast.success(t('schedule_updated', 'Schedule updated'));
                                                    } else {
                                                        // Hour is in the middle - can't remove without splitting
                                                        toast.info(t('cannot_remove_middle_hour', 'Cannot remove hour from middle of shift. Remove from start or end first.'));
                                                    }
                                                }
                                            }
                                        };

                                        return (
                                            <td
                                                key={dayIndex}
                                                className="border p-2 text-center cursor-pointer hover:bg-gray-50 transition-colors"
                                                onClick={handleCellClick}
                                            >
                                                {isAvailable && (
                                                    <div className={`w-3 h-3 rounded-full mx-auto ${isBooked ? 'bg-red-500' : 'bg-gray-400'
                                                        }`} />
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="mt-4 flex items-center gap-2">
                    <Label>{t('copy_schedule_for', 'Copy schedule for')}</Label>
                    <Input type="number" min="1" max="4" defaultValue="1" className="w-20" />
                    <span>{t('weeks_ahead', 'weeks ahead')}</span>
                    <Button variant="outline" size="sm">
                        <Copy className="w-4 h-4 mr-2" />
                        {t('copy', 'Copy')}
                    </Button>
                </div>
            </div>

            {/* Time-Off Management */}
            <div className="bg-white rounded-lg border p-6">
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
                                        {new Date(timeOff.start_datetime).toLocaleDateString()} - {new Date(timeOff.end_datetime).toLocaleDateString()}
                                    </div>
                                    <div className="text-sm text-gray-600">
                                        {timeOff.type} {timeOff.reason && `- ${timeOff.reason}`}
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteTimeOff(timeOff.id)}
                                >
                                    <Trash2 className="w-4 h-4 text-red-500" />
                                </Button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-gray-500 text-sm">{t('no_time_off', 'No time-off periods scheduled')}</p>
                )}
            </div>

            {/* Time-Off Dialog */}
            {showTimeOffDialog && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold">{t('add_time_off', 'Add Time-off')}</h3>
                            <Button variant="ghost" size="sm" onClick={() => setShowTimeOffDialog(false)}>
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
                                {t('add', 'Add')}
                            </Button>
                            <Button variant="outline" onClick={() => setShowTimeOffDialog(false)} className="flex-1">
                                {t('cancel', 'Cancel')}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
