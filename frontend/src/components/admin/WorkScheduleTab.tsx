import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Clock, Save, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface WorkScheduleTabProps {
    userId: number;
}

interface ScheduleItem {
    day_of_week: number;
    start_time: string;
    end_time: string;
    is_working: boolean;
}



export const WorkScheduleTab: React.FC<WorkScheduleTabProps> = ({ userId }) => {
    const { t } = useTranslation('admin-components');

    const DAYS_OF_WEEK = [
        t('monday'),
        t('tuesday'),
        t('wednesday'),
        t('thursday'),
        t('friday'),
        t('saturday'),
        t('sunday')
    ];

    const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    useEffect(() => {
        fetchSchedule();
    }, [userId]);

    const fetchSchedule = async () => {
        try {
            setLoading(true);
            const data = await api.getUserSchedule(userId);
            setSchedule(data);
            setError(null);
        } catch (err: any) {
            console.error('Error fetching schedule:', err);
            setError(t('failed_to_load_schedule'));
        } finally {
            setLoading(false);
        }
    };

    const handleDayChange = (index: number, field: keyof ScheduleItem, value: any) => {
        const newSchedule = [...schedule];
        newSchedule[index] = { ...newSchedule[index], [field]: value };
        setSchedule(newSchedule);
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            setError(null);
            setSuccessMessage(null);
            await api.updateUserSchedule(userId, schedule);
            setSuccessMessage(t('schedule_saved'));
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err: any) {
            console.error('Error saving schedule:', err);
            setError(t('error_saving_schedule'));
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="p-4 text-center text-gray-500">{t('loading_schedule')}</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-blue-600" />
                    {t('work_schedule')}
                </h3>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                    <Save className="w-4 h-4" />
                    {saving ? t('saving') : t('save')}
                </button>
            </div>

            {error && (
                <div className="p-3 bg-red-50 text-red-700 rounded-lg flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    {error}
                </div>
            )}

            {successMessage && (
                <div className="p-3 bg-green-50 text-green-700 rounded-lg">
                    {successMessage}
                </div>
            )}

            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="grid grid-cols-1 divide-y divide-gray-200">
                    {schedule.map((day, index) => (
                        <div key={day.day_of_week} className={`p-4 flex items-center justify-between hover:bg-gray-50 transition-colors ${!day.is_working ? 'bg-gray-50/50' : ''}`}>
                            <div className="flex items-center gap-4 w-1/3">
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={day.is_working}
                                        onChange={(e) => handleDayChange(index, 'is_working', e.target.checked)}
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                </label>
                                <span className={`font-medium ${day.is_working ? 'text-gray-900' : 'text-gray-400'}`}>
                                    {DAYS_OF_WEEK[day.day_of_week]}
                                </span>
                            </div>

                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-gray-500">{t('from')}</span>
                                    <input
                                        type="time"
                                        value={day.start_time}
                                        onChange={(e) => handleDayChange(index, 'start_time', e.target.value)}
                                        disabled={!day.is_working}
                                        className="border border-gray-300 rounded-md px-2 py-1 text-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-400"
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-gray-500">{t('to')}</span>
                                    <input
                                        type="time"
                                        value={day.end_time}
                                        onChange={(e) => handleDayChange(index, 'end_time', e.target.value)}
                                        disabled={!day.is_working}
                                        className="border border-gray-300 rounded-md px-2 py-1 text-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-400"
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
