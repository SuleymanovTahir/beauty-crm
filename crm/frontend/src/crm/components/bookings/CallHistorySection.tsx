import { useState, useEffect } from 'react';
import { Phone, Loader2 } from 'lucide-react';
import { api } from '../../services/api';
import { AudioPlayer } from '../telephony/AudioPlayer';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface CallHistorySectionProps {
    bookingId: number;
    clientId: string;
}

interface CallLog {
    id: number;
    client_name: string;
    phone: string;
    type: 'inbound' | 'outbound';
    status: string;
    duration: number;
    recording_url?: string;
    recording_file?: string;
    created_at: string;
    notes?: string;
}

export function CallHistorySection({ bookingId, clientId }: CallHistorySectionProps) {
    const [calls, setCalls] = useState<CallLog[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadCalls();
    }, [bookingId, clientId]);

    const loadCalls = async () => {
        try {
            setLoading(true);
            // Сначала пытаемся загрузить звонки по booking_id
            const bookingCalls = await api.getCalls('', 50, 0, undefined, undefined, bookingId);

            // Если звонков по букингу нет, загружаем все звонки клиента
            if (!bookingCalls || bookingCalls.length === 0) {
                const allCalls = await api.getCalls('', 50, 0);
                const clientCalls = allCalls.filter((call: CallLog) => {
                    // Ищем звонки этого клиента
                    return call.client_name && call.client_name.toLowerCase().includes(clientId.toLowerCase());
                });
                setCalls(clientCalls.slice(0, 5)); // Показываем последние 5
            } else {
                setCalls(bookingCalls);
            }
        } catch (error) {
            console.error('Error loading calls:', error);
            setCalls([]);
        } finally {
            setLoading(false);
        }
    };

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (loading) {
        return (
            <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-pink-500" />
                </div>
            </div>
        );
    }

    if (calls.length === 0) {
        return null; // Не показываем секцию если звонков нет
    }

    return (
        <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <Phone className="w-5 h-5 text-green-600" />
                </div>
                <div>
                    <h2 className="text-2xl text-gray-900">История звонков</h2>
                    <p className="text-sm text-gray-500">Звонки связанные с этой записью</p>
                </div>
            </div>

            <div className="space-y-4">
                {calls.map((call) => (
                    <div
                        key={call.id}
                        className="border border-gray-200 rounded-lg p-4 hover:border-pink-200 transition-colors"
                    >
                        <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-full ${call.type === 'inbound' ? 'bg-green-50' : 'bg-blue-50'
                                    }`}>
                                    <Phone className={`w-4 h-4 ${call.type === 'inbound' ? 'text-green-600' : 'text-blue-600'
                                        }`} />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-gray-900">
                                            {call.type === 'inbound' ? 'Входящий' : 'Исходящий'}
                                        </span>
                                        <span className="text-sm text-gray-500">•</span>
                                        <span className="text-sm text-gray-600">{call.phone}</span>
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1">
                                        {call.created_at && format(new Date(call.created_at), 'dd MMMM yyyy, HH:mm', { locale: ru })}
                                        {call.duration > 0 && (
                                            <>
                                                <span className="mx-2">•</span>
                                                <span>{formatDuration(call.duration)}</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className={`px-2 py-1 rounded text-xs font-medium ${call.status === 'completed' ? 'bg-green-100 text-green-700' :
                                    call.status === 'missed' ? 'bg-red-100 text-red-700' :
                                        'bg-gray-100 text-gray-700'
                                }`}>
                                {call.status === 'completed' ? 'Завершен' :
                                    call.status === 'missed' ? 'Пропущен' :
                                        call.status}
                            </div>
                        </div>

                        {call.notes && (
                            <div className="mb-3 p-3 bg-yellow-50 border border-yellow-100 rounded-lg">
                                <p className="text-sm text-gray-700">{call.notes}</p>
                            </div>
                        )}

                        {(call.recording_url || call.recording_file) && (
                            <AudioPlayer
                                url={call.recording_file ? `/static/recordings/${call.recording_file}` : call.recording_url!}
                                className="mt-3"
                            />
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
