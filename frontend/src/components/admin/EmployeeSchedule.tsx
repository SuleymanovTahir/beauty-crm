import { useState, useEffect } from 'react';
import { Calendar, Clock } from 'lucide-react';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { api } from '../../services/api';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '../ui/select';

interface ScheduleEntry {
    day_of_week: number;
    start_time: string;
    end_time: string;
    is_active: boolean;
}

interface EmployeeScheduleProps {
    employeeId: number;
}

const DAYS = [
    { value: 0, label: 'Monday' },
    { value: 1, label: 'Tuesday' },
    { value: 2, label: 'Wednesday' },
    { value: 3, label: 'Thursday' },
    { value: 4, label: 'Friday' },
    { value: 5, label: 'Saturday' },
    { value: 6, label: 'Sunday' },
];

export function EmployeeSchedule({ employeeId }: EmployeeScheduleProps) {
    const { t } = useTranslation(['admin/users', 'common']);
    const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadSchedule();
    }, [employeeId]);

    const loadSchedule = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/users/${employeeId}/schedule`);
            setSchedule(response.data.schedule || []);
        } catch (error) {
            console.error('Error loading schedule:', error);
            toast.error(t('error_loading_schedule'));
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            await api.post(`/users/${employeeId}/schedule`, { schedule });
            toast.success(t('schedule_updated'));
        } catch (error) {
            console.error('Error saving schedule:', error);
            toast.error(t('error_saving_schedule'));
        } finally {
            setSaving(false);
        }
    };

    const updateScheduleDay = (dayOfWeek: number, field: string, value: any) => {
        const existing = schedule.find(s => s.day_of_week === dayOfWeek);
        if (existing) {
            setSchedule(schedule.map(s =>
                s.day_of_week === dayOfWeek ? { ...s, [field]: value } : s
            ));
        } else {
            setSchedule([...schedule, {
                day_of_week: dayOfWeek,
                start_time: '09:00',
                end_time: '18:00',
                is_active: true,
                [field]: value
            }]);
        }
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
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">{t('work_schedule')}</h3>
                <Button onClick={handleSave} disabled={saving}>
                    {t('save_schedule')}
                </Button>
            </div>

            <div className="space-y-4">
                {DAYS.map(day => {
                    const daySchedule = schedule.find(s => s.day_of_week === day.value);
                    return (
                        <div key={day.value} className="flex items-center gap-4 p-4 border rounded-lg">
                            <div className="w-32">
                                <Label>{t(day.label.toLowerCase())}</Label>
                            </div>
                            <div className="flex items-center gap-2">
                                <Select
                                    value={daySchedule?.start_time || '09:00'}
                                    onValueChange={(value) => updateScheduleDay(day.value, 'start_time', value)}
                                >
                                    <SelectTrigger className="w-32">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Array.from({ length: 24 }, (_, i) => (
                                            <SelectItem key={i} value={`${i.toString().padStart(2, '0')}:00`}>
                                                {`${i.toString().padStart(2, '0')}:00`}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <span>—</span>
                                <Select
                                    value={daySchedule?.end_time || '18:00'}
                                    onValueChange={(value) => updateScheduleDay(day.value, 'end_time', value)}
                                >
                                    <SelectTrigger className="w-32">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Array.from({ length: 24 }, (_, i) => (
                                            <SelectItem key={i} value={`${i.toString().padStart(2, '0')}:00`}>
                                                {`${i.toString().padStart(2, '0')}:00`}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
