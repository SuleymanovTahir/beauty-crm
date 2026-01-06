
import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import {
    Phone,
    Search,
    Play,
    Pause,
    Download,
    PhoneIncoming,
    PhoneOutgoing,
    PhoneMissed,
    Calendar,
    Filter,
    Loader2,
    Plus,
    Trash2,
    Edit2,
    MoreVertical
} from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { api } from '../../services/api';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";

interface CallLog {
    id: number;
    client_name: string;
    client_id: string;
    phone: string;
    type: 'inbound' | 'outbound' | 'missed' | 'rejected' | 'ongoing';
    status: 'completed' | 'missed' | 'rejected' | 'ongoing';
    duration: number; // seconds
    recording_url?: string;
    created_at: string;
    manager_name?: string;
    notes?: string;
}

// Imports from other components at the top
import { PeriodFilterSelect } from '../../components/shared/PeriodFilterSelect';
import { usePeriodFilter } from '../../hooks/usePeriodFilter';

// ... (other imports)

export default function Telephony() {
    const { t } = useTranslation(['admin/telephony', 'common']);
    const [search, setSearch] = useState('');
    const [period, setPeriod] = useState('all');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    // ... (other state)

    useEffect(() => {
        loadData();
    }, [search, period, dateFrom, dateTo]);

    const loadData = async () => {
        setLoading(true);
        try {
            // Calculate timestamps based on period if not custom
            let start = dateFrom;
            let end = dateTo;

            if (period !== 'custom' && period !== 'all') {
                const now = new Date();
                const startDate = new Date();
                if (period === 'today') {
                    start = new Date(now.setHours(0, 0, 0, 0)).toISOString();
                    end = new Date(now.setHours(23, 59, 59, 999)).toISOString();
                } else if (period === 'week') {
                    startDate.setDate(now.getDate() - 7);
                    start = startDate.toISOString();
                    end = now.toISOString();
                } else if (period === 'month') {
                    startDate.setMonth(now.getMonth() - 1);
                    start = startDate.toISOString();
                    end = now.toISOString();
                }
            }

            if (period === 'all') {
                start = '';
                end = '';
            }

            const [callsData, statsData] = await Promise.all([
                api.getCalls(search, 50, 0, start, end),
                api.getTelephonyStats()
            ]);
            setCalls(callsData);
            setStats(statsData);
        } catch (error) {
            console.error('Failed to load telephony data:', error);
            toast.error('Ошибка загрузки данных');
        } finally {
            setLoading(false);
        }
    };

    // ... (rest of the component)

    // Update the Filter section in JSX to:
    /*
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
                
                    <PeriodFilterSelect 
                        value={period}
                        onChange={setPeriod}
                    />

                    {period === 'custom' && (
                       <div className="flex gap-2">
                          <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-32" />
                          <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-32" />
                       </div>
                    )}
                </div>
    */

    const handleCreateCall = async () => {
        if (!formData.phone) {
            toast.error('Введите номер телефона');
            return;
        }
        try {
            setProcessing(true);
            await api.createCall(formData);
            toast.success('Звонок добавлен');
            setShowAddDialog(false);
            setFormData({
                phone: '',
                direction: 'outbound',
                status: 'completed',
                duration: 0,
                notes: '',
                recording_url: ''
            });
            loadData();
        } catch (error) {
            toast.error('Ошибка создания звонка');
        } finally {
            setProcessing(false);
        }
    };

    const handleUpdateCall = async () => {
        if (!editingCall) return;
        try {
            setProcessing(true);
            await api.updateCall(editingCall.id, {
                notes: formData.notes,
                status: formData.status
            });
            toast.success('Звонок обновлен');
            setShowEditDialog(false);
            setEditingCall(null);
            loadData();
        } catch (error) {
            toast.error('Ошибка обновления');
        } finally {
            setProcessing(false);
        }
    };

    const handleDeleteCall = async (id: number) => {
        if (!confirm('Вы уверены, что хотите удалить эту запись?')) return;
        try {
            await api.deleteCall(id);
            toast.success('Звонок удален');
            setCalls(calls.filter(c => c.id !== id));
        } catch (error) {
            toast.error('Ошибка удаления');
        }
    };

    const openEditDialog = (call: CallLog) => {
        setEditingCall(call);
        setFormData({
            phone: call.phone,
            direction: call.type as string,
            status: call.status as string,
            duration: call.duration,
            notes: call.notes || '',
            recording_url: call.recording_url || ''
        });
        setShowEditDialog(true);
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
                        <p className="text-sm text-gray-500 mt-1">{t('subtitle', 'История звонков и интеграции')}</p>
                    </div>
                    <Button onClick={() => setShowAddDialog(true)} className="bg-pink-600 hover:bg-pink-700">
                        <Plus className="w-4 h-4 mr-2" /> Добавить звонок
                    </Button>
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
                                <th className="px-6 py-3 font-medium">Заметки</th>
                                <th className="px-6 py-3 font-medium">Длительность</th>
                                <th className="px-6 py-3 font-medium">Дата</th>
                                <th className="px-6 py-3 font-medium text-right">Запись</th>
                                <th className="px-6 py-3 font-medium text-right"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                                        <div className="flex justify-center mb-2">
                                            <Loader2 className="animate-spin w-8 h-8 text-pink-500" />
                                        </div>
                                        Загрузка звонков...
                                    </td>
                                </tr>
                            ) : calls.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
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
                                        <td className="px-6 py-4 max-w-xs truncate text-gray-500">
                                            {call.notes}
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
                                        <td className="px-6 py-4 text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                                        <MoreVertical className="w-4 h-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => openEditDialog(call)}>
                                                        <Edit2 className="w-4 h-4 mr-2" /> Редактировать
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleDeleteCall(call.id)} className="text-red-600">
                                                        <Trash2 className="w-4 h-4 mr-2" /> Удалить
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Integration Info */}
                <div className="mt-8 bg-gray-900 rounded-xl p-6 text-gray-400 text-sm">
                    <p className="font-mono mb-2 text-white">Webhook URL для интеграции:</p>
                    <code className="bg-gray-800 px-3 py-1 rounded select-all block mb-4">
                        {window.location.origin}/api/telephony/webhook/generic
                    </code>
                    <p>
                        Поддерживаемые провайдеры:
                        <span className="text-white mx-1">binotel</span>,
                        <span className="text-white mx-1">onlinepbx</span>,
                        <span className="text-white mx-1">generic</span>.
                        Просто замените последнее слово в URL.
                    </p>
                </div>
            </div>

            {/* Add Call Dialog */}
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Добавить звонок</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label>Телефон</Label>
                            <Input
                                value={formData.phone}
                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                placeholder="+7..."
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Тип</Label>
                                <Select
                                    value={formData.direction}
                                    onValueChange={v => setFormData({ ...formData, direction: v })}
                                >
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="outbound">Исходящий</SelectItem>
                                        <SelectItem value="inbound">Входящий</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>Статус</Label>
                                <Select
                                    value={formData.status}
                                    onValueChange={v => setFormData({ ...formData, status: v })}
                                >
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="completed">Завершен</SelectItem>
                                        <SelectItem value="missed">Пропущен</SelectItem>
                                        <SelectItem value="rejected">Отклонен</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div>
                            <Label>Длительность (сек)</Label>
                            <Input
                                type="number"
                                value={formData.duration}
                                onChange={e => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                            />
                        </div>
                        <div>
                            <Label>Ссылка на запись (URL)</Label>
                            <Input
                                value={formData.recording_url}
                                onChange={e => setFormData({ ...formData, recording_url: e.target.value })}
                                placeholder="https://..."
                            />
                        </div>
                        <div>
                            <Label>Заметки</Label>
                            <Input
                                value={formData.notes}
                                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAddDialog(false)}>Отмена</Button>
                        <Button onClick={handleCreateCall} disabled={processing}>
                            {processing ? <Loader2 className="animate-spin" /> : 'Создать'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Call Dialog */}
            <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Редактировать звонок</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label>Статус</Label>
                            <Select
                                value={formData.status}
                                onValueChange={v => setFormData({ ...formData, status: v })}
                            >
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="completed">Завершен</SelectItem>
                                    <SelectItem value="missed">Пропущен</SelectItem>
                                    <SelectItem value="rejected">Отклонен</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Заметки</Label>
                            <Input
                                value={formData.notes}
                                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowEditDialog(false)}>Отмена</Button>
                        <Button onClick={handleUpdateCall} disabled={processing}>
                            {processing ? <Loader2 className="animate-spin" /> : 'Сохранить'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
