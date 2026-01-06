
import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
    Phone,
    Search,
    Play,
    Pause,
    Download,
    MoreHorizontal,
    PhoneIncoming,
    PhoneOutgoing,
    PhoneMissed,
    Calendar,
    Filter,
    Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { api } from '../../services/api';

interface CallLog {
    id: number;
    client_name: string;
    phone: string;
    type: 'inbound' | 'outbound' | 'missed';
    status: 'completed' | 'missed' | 'rejected' | 'ongoing';
    duration: number; // seconds
    recording_url?: string;
    created_at: string;
    manager_name?: string;
}

export default function Telephony() {
    const { t } = useTranslation(['admin/telephony', 'common']);
    const [search, setSearch] = useState('');
    const [playingId, setPlayingId] = useState<number | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const [calls, setCalls] = useState<CallLog[]>([]);
    const [stats, setStats] = useState({
        total_calls: 0,
        inbound: 0,
        outbound: 0,
        missed: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, [search]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [callsData, statsData] = await Promise.all([
                api.getCalls(search),
                api.getTelephonyStats()
            ]);
            setCalls(callsData);
            setStats(statsData);
        } catch (error) {
            console.error('Failed to load telephony data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePlay = (id: number, url: string) => {
        if (playingId === id) {
            audioRef.current?.pause();
            setPlayingId(null);
        } else {
            if (audioRef.current) {
                audioRef.current.pause();
            }
            const audio = new Audio(url);
            audio.onended = () => setPlayingId(null);
            audio.play();
            audioRef.current = audio;
            setPlayingId(id);
        }
    };

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const getIcon = (type: string, status: string) => {
        if (status === 'missed') return <PhoneMissed className="w-4 h-4 text-red-500" />;
        if (type === 'inbound') return <PhoneIncoming className="w-4 h-4 text-green-500" />;
        return <PhoneOutgoing className="w-4 h-4 text-blue-500" />;
    };

    return (
        <div className="h-full flex flex-col bg-gray-50/50">
            {/* Header */}
            <div className="px-8 py-6 bg-white border-b sticky top-0 z-20">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{t('telephony', 'Телефония')}</h1>
                        <p className="text-sm text-gray-500 mt-1">{t('subtitle', 'История звонков и записи разговоров')}</p>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-4 gap-4 mb-6">
                    <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-center gap-4">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                            <Phone className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-blue-900">{stats.total_calls}</div>
                            <div className="text-xs text-blue-600 font-medium">Всего звонков</div>
                        </div>
                    </div>
                    <div className="bg-green-50 border border-green-100 p-4 rounded-xl flex items-center gap-4">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center text-green-600">
                            <PhoneIncoming className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-green-900">{stats.inbound}</div>
                            <div className="text-xs text-green-600 font-medium">Входящие</div>
                        </div>
                    </div>
                    <div className="bg-purple-50 border border-purple-100 p-4 rounded-xl flex items-center gap-4">
                        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600">
                            <PhoneOutgoing className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-purple-900">{stats.outbound}</div>
                            <div className="text-xs text-purple-600 font-medium">Исходящие</div>
                        </div>
                    </div>
                    <div className="bg-red-50 border border-red-100 p-4 rounded-xl flex items-center gap-4">
                        <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center text-red-600">
                            <PhoneMissed className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-red-900">{stats.missed}</div>
                            <div className="text-xs text-red-600 font-medium">Пропущенные</div>
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex gap-2">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                            placeholder="Поиск по номеру или имени..."
                            className="pl-9 bg-gray-50 border-gray-200"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <Button variant="outline" className="gap-2">
                        <Calendar className="w-4 h-4" />
                        Дата
                    </Button>
                    <Button variant="outline" className="gap-2">
                        <Filter className="w-4 h-4" />
                        Фильтр
                    </Button>
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-auto p-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-3 font-medium">Тип</th>
                                <th className="px-6 py-3 font-medium">Клиент</th>
                                <th className="px-6 py-3 font-medium">Сотрудник</th>
                                <th className="px-6 py-3 font-medium">Длительность</th>
                                <th className="px-6 py-3 font-medium">Дата</th>
                                <th className="px-6 py-3 font-medium text-right">Запись</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                        <div className="flex justify-center mb-2">
                                            <Loader2 className="animate-spin w-8 h-8 text-pink-500" />
                                        </div>
                                        Загрузка звонков...
                                    </td>
                                </tr>
                            ) : calls.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                        Звонков не найдено
                                    </td>
                                </tr>
                            ) : (
                                calls.map((call) => (
                                    <tr key={call.id} className="hover:bg-gray-50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className={`p-2 rounded-full bg-gray-50 ${call.status === 'missed' ? 'bg-red-50' :
                                                    call.type === 'inbound' ? 'bg-green-50' : 'bg-blue-50'
                                                    }`}>
                                                    {getIcon(call.type, call.status)}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-gray-900">{call.client_name || 'Неизвестный'}</div>
                                            <div className="text-xs text-gray-500">{call.phone}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {call.manager_name || <span className="text-gray-400">-</span>}
                                        </td>
                                        <td className="px-6 py-4 font-mono text-gray-600">
                                            {call.status === 'missed' ? '-' : formatDuration(call.duration)}
                                        </td>
                                        <td className="px-6 py-4 text-gray-500">
                                            {call.created_at ? format(new Date(call.created_at), 'dd MMM HH:mm', { locale: ru }) : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {call.recording_url && (
                                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 rounded-full hover:bg-pink-50 hover:text-pink-600"
                                                        onClick={() => call.recording_url && handlePlay(call.id, call.recording_url)}
                                                    >
                                                        {playingId === call.id ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                                                    </Button>
                                                    <a href={call.recording_url} download target="_blank" rel="noreferrer">
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-gray-100">
                                                            <Download className="w-4 h-4 text-gray-400" />
                                                        </Button>
                                                    </a>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Integration Banner */}
                <div className="mt-8 bg-gradient-to-r from-gray-900 to-gray-800 rounded-xl p-8 text-white relative overflow-hidden">
                    <div className="relative z-10 max-w-2xl">
                        <h3 className="text-2xl font-bold mb-2">Подключите IP-телефонию</h3>
                        <p className="text-gray-300 mb-6">
                            Интегрируйте CRM с Binotel, OnlinePBX или Twilio, чтобы автоматически сохранять историю звонков,
                            слушать записи разговоров и видеть карточку клиента при входящем звонке.
                        </p>
                        <Button className="bg-white text-gray-900 hover:bg-gray-100">
                            Настроить интеграцию
                        </Button>
                    </div>
                    <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-pink-500/20 to-transparent pointer-events-none" />
                </div>
            </div>
        </div>
    );
}
