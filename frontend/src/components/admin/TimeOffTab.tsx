import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Calendar, Trash2, Plus, AlertCircle } from 'lucide-react';

interface TimeOffTabProps {
    userId: number;
}

interface TimeOffItem {
    id: number;
    start_datetime: string;
    end_datetime: string;
    type: string;
    reason: string | null;
}

const TIME_OFF_TYPES = [
    { value: 'vacation', label: 'Отпуск' },
    { value: 'sick_leave', label: 'Больничный' },
    { value: 'day_off', label: 'Отгул' },
    { value: 'emergency', label: 'ЧП' },
];

export const TimeOffTab: React.FC<TimeOffTabProps> = ({ userId }) => {
    const [timeOffs, setTimeOffs] = useState<TimeOffItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Form state
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [type, setType] = useState('vacation');
    const [reason, setReason] = useState('');
    const [isAdding, setIsAdding] = useState(false);

    useEffect(() => {
        fetchTimeOffs();
    }, [userId]);

    const fetchTimeOffs = async () => {
        try {
            setLoading(true);
            const data = await api.getUserTimeOff(userId);
            setTimeOffs(data);
            setError(null);
        } catch (err: any) {
            console.error('Error fetching time offs:', err);
            setError('Не удалось загрузить список отсутствий');
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!startDate || !endDate) return;

        try {
            setIsAdding(true);
            await api.addUserTimeOff(userId, {
                start_datetime: `${startDate} 00:00:00`,
                end_datetime: `${endDate} 23:59:59`,
                type,
                reason
            });

            // Reset form
            setStartDate('');
            setEndDate('');
            setType('vacation');
            setReason('');

            // Refresh list
            await fetchTimeOffs();
        } catch (err: any) {
            console.error('Error adding time off:', err);
            setError('Ошибка при добавлении отсутствия');
        } finally {
            setIsAdding(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('Вы уверены, что хотите удалить эту запись?')) return;

        try {
            await api.deleteTimeOff(id);
            setTimeOffs(timeOffs.filter(item => item.id !== id));
        } catch (err: any) {
            console.error('Error deleting time off:', err);
            setError('Ошибка при удалении записи');
        }
    };

    const formatDate = (dateStr: string) => {
        try {
            // dateStr format: YYYY-MM-DD HH:MM:SS
            const date = new Date(dateStr.replace(' ', 'T'));
            return date.toLocaleDateString('ru-RU', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });
        } catch (e) {
            return dateStr;
        }
    };

    const getTypeLabel = (typeKey: string) => {
        return TIME_OFF_TYPES.find(t => t.value === typeKey)?.label || typeKey;
    };

    if (loading) {
        return <div className="p-4 text-center text-gray-500">Загрузка...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-medium text-gray-900">Отсутствия и отпуска</h3>
            </div>

            {error && (
                <div className="p-3 bg-red-50 text-red-700 rounded-lg flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    {error}
                </div>
            )}

            {/* Form */}
            <form onSubmit={handleAdd} className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">С даты</label>
                        <input
                            type="date"
                            required
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">По дату</label>
                        <input
                            type="date"
                            required
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Тип</label>
                        <select
                            value={type}
                            onChange={(e) => setType(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            {TIME_OFF_TYPES.map(t => (
                                <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Причина (необязательно)</label>
                        <input
                            type="text"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Например: По семейным обстоятельствам"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                </div>

                <div className="flex justify-end">
                    <button
                        type="submit"
                        disabled={isAdding}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        {isAdding ? 'Добавление...' : 'Добавить'}
                    </button>
                </div>
            </form>

            {/* List */}
            <div className="space-y-3">
                {timeOffs.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 bg-white border border-gray-200 rounded-xl border-dashed">
                        Нет запланированных отсутствий
                    </div>
                ) : (
                    timeOffs.map((item) => (
                        <div key={item.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between hover:shadow-sm transition-shadow">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${item.type === 'vacation' ? 'bg-green-100 text-green-800' :
                                            item.type === 'sick_leave' ? 'bg-red-100 text-red-800' :
                                                'bg-gray-100 text-gray-800'
                                        }`}>
                                        {getTypeLabel(item.type)}
                                    </span>
                                    <span className="text-sm text-gray-500">
                                        {formatDate(item.start_datetime)} — {formatDate(item.end_datetime)}
                                    </span>
                                </div>
                                {item.reason && (
                                    <p className="text-sm text-gray-600">{item.reason}</p>
                                )}
                            </div>
                            <button
                                onClick={() => handleDelete(item.id)}
                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Удалить"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
