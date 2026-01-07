import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import {
    Phone,
    Search,
    PhoneIncoming,
    PhoneOutgoing,
    PhoneMissed,
    Loader2,
    Plus,
    Trash2,
    Edit2,
    MoreVertical,
    Upload,
    ArrowUp,
    ArrowDown,
    RefreshCw,
    ChevronDown,
    Users
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
import { Checkbox } from '../../components/ui/checkbox';
import { AudioPlayer } from '../../components/telephony/AudioPlayer';

interface CallLog {
    id: number;
    client_name: string;
    client_id: string;
    booking_id?: number;
    phone: string;
    type: 'inbound' | 'outbound' | 'missed' | 'rejected' | 'ongoing';
    status: 'completed' | 'missed' | 'rejected' | 'ongoing';
    duration: number;
    recording_url?: string;
    recording_file?: string;
    created_at: string;
    manager_name?: string;
    notes?: string;
}

export default function Telephony() {
    const { t } = useTranslation(['admin/telephony', 'common']);
    const [search, setSearch] = useState('');
    const [period, setPeriod] = useState('all');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    // Sorting state
    const [sortBy, setSortBy] = useState<string>('created_at');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

    // Filters state
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [typeFilter, setTypeFilter] = useState<string>('all');

    const [calls, setCalls] = useState<CallLog[]>([]);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [showFilters, setShowFilters] = useState(false);
    const [stats, setStats] = useState({
        total_calls: 0,
        inbound: 0,
        outbound: 0,
        missed: 0
    });
    const [loading, setLoading] = useState(true);

    const [showAddDialog, setShowAddDialog] = useState(false);
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [editingCall, setEditingCall] = useState<CallLog | null>(null);
    const [processing, setProcessing] = useState(false);
    const [uploadingFile, setUploadingFile] = useState<number | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const [formData, setFormData] = useState({
        phone: '',
        direction: 'outbound',
        status: 'completed',
        duration: 0,
        notes: '',
        recording_url: '',
        booking_id: undefined as number | undefined
    });

    useEffect(() => {
        loadData();
    }, [search, period, dateFrom, dateTo, sortBy, sortOrder, statusFilter, typeFilter]);

    const handleSort = (field: string) => {
        if (sortBy === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(field);
            setSortOrder('desc');
        }
    };

    const handleRefresh = async () => {
        setProcessing(true);
        await loadData();
        setProcessing(false);
    };

    const loadData = async () => {
        setLoading(true);
        try {
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
                api.getCalls(search, 50, 0, start, end, undefined, sortBy, sortOrder, statusFilter, typeFilter),
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

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedIds(calls.map(c => c.id));
        } else {
            setSelectedIds([]);
        }
    };

    const handleSelectOne = (id: number, checked: boolean) => {
        if (checked) {
            setSelectedIds(prev => [...prev, id]);
        } else {
            setSelectedIds(prev => prev.filter(i => i !== id));
        }
    };

    const handleBulkDelete = async () => {
        if (!confirm(`Удалить выбранные звонки (${selectedIds.length})?`)) return;

        setProcessing(true);
        try {
            await Promise.all(selectedIds.map(id => api.deleteCall(id)));
            toast.success(`Удалено ${selectedIds.length} звонков`);
            setSelectedIds([]);
            loadData();
        } catch (e) {
            toast.error("Ошибка при удалении");
        } finally {
            setProcessing(false);
        }
    };

    const handleFileUpload = async (callId: number, file: File) => {
        try {
            setUploadingFile(callId);
            await api.uploadRecording(callId, file);
            toast.success('Запись загружена');
            loadData();
        } catch (error) {
            toast.error('Ошибка загрузки файла');
        } finally {
            setUploadingFile(null);
        }
    };

    const handleCreateCall = async () => {
        if (!formData.phone) {
            toast.error('Введите номер телефона');
            return;
        }
        try {
            setProcessing(true);
            const response = await api.createCall(formData) as any;

            if (response.success && response.id && selectedFile) {
                try {
                    await api.uploadRecording(response.id, selectedFile);
                    toast.success('Звонок создан и запись загружена');
                } catch (uploadError) {
                    console.error('Error uploading file:', uploadError);
                    toast.error('Звонок создан, но ошибка загрузки файла');
                }
            } else {
                toast.success('Звонок добавлен');
            }

            setShowAddDialog(false);
            setFormData({
                phone: '',
                direction: 'outbound',
                status: 'completed',
                duration: 0,
                notes: '',
                recording_url: '',
                booking_id: undefined
            });
            setSelectedFile(null);
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
            recording_url: call.recording_url || '',
            booking_id: call.booking_id
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
            <div className="p-6">
                <div className="mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-3xl font-extrabold text-gray-900 mb-2 flex items-center gap-3">
                            <div className="p-2 bg-pink-50 rounded-lg">
                                <Phone className="w-8 h-8 text-pink-600" />
                            </div>
                            {t('telephony', 'Телефония')}
                        </h1>
                        <p className="text-gray-500 font-medium flex items-center gap-2">
                            <span className="inline-block w-2 h-2 bg-pink-400 rounded-full animate-pulse" />
                            {calls.length} записей
                        </p>
                    </div>
                    <button
                        onClick={handleRefresh}
                        className="w-full md:w-auto px-5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95"
                    >
                        <RefreshCw className={`w-4 h-4 ${processing ? 'animate-spin' : ''} text-pink-600`} />
                        Обновить
                    </button>
                </div>

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

                <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-100 mb-8 backdrop-blur-xl bg-white/80">
                    <div className="flex flex-col gap-4">
                        {/* Row 1: Search */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                                placeholder="Поиск по номеру или имени..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9 h-[42px] bg-gray-50/50 border-gray-200 rounded-xl font-bold shadow-none focus-visible:ring-1 focus-visible:ring-pink-500"
                            />
                        </div>

                        {/* Row 2: Control Bar */}
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setShowAddDialog(true)}
                                className="flex-[2] min-w-[100px] h-[42px] px-3 bg-[#1e293b] text-white rounded-xl text-xs sm:text-sm font-bold hover:bg-[#334155] active:scale-95 flex items-center justify-center gap-1.5 transition-all shadow-md shadow-gray-200"
                            >
                                <Plus className="w-4 h-4" />
                                <span>Добавить</span>
                            </button>

                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className={`flex-1 h-[42px] px-2 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1 transition-all border shadow-sm ${showFilters
                                    ? 'bg-pink-50 border-pink-200 text-pink-600'
                                    : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                                    }`}
                            >
                                <Users className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${showFilters ? 'text-pink-500' : 'text-gray-400'}`} />
                                <span className="truncate">Фильтры</span>
                                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${showFilters ? 'rotate-180' : ''}`} />
                            </button>

                            {selectedIds.length > 0 && (
                                <button
                                    onClick={handleBulkDelete}
                                    className="flex-1 h-[42px] px-2 bg-red-50 text-red-600 border border-red-200 rounded-xl text-xs sm:text-sm font-bold hover:bg-red-100 active:scale-95 flex items-center justify-center gap-1.5 transition-all shadow-sm"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    <span className="truncate">Удалить ({selectedIds.length})</span>
                                </button>
                            )}

                            <button
                                onClick={handleRefresh}
                                disabled={loading}
                                className="w-[42px] h-[42px] bg-white border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 active:scale-95 disabled:opacity-50 flex items-center justify-center transition-all shadow-sm shrink-0"
                            >
                                <RefreshCw className={`w-4 h-4 text-gray-400 ${loading ? 'animate-spin' : ''}`} />
                            </button>
                        </div>

                        {/* Expandable Filters */}
                        {showFilters && (
                            <div className="pt-4 border-t border-gray-50 animate-in fade-in slide-in-from-top-2 duration-300">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    {/* Status */}
                                    <div className="flex flex-col gap-1.5">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Статус</span>
                                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                                            <SelectTrigger className="w-full h-[42px] rounded-xl font-bold bg-white border-gray-200">
                                                <SelectValue placeholder="Статус" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">Все статусы</SelectItem>
                                                <SelectItem value="completed">Завершенные</SelectItem>
                                                <SelectItem value="missed">Пропущенные</SelectItem>
                                                <SelectItem value="rejected">Отклоненные</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Type */}
                                    <div className="flex flex-col gap-1.5">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Тип звонка</span>
                                        <Select value={typeFilter} onValueChange={setTypeFilter}>
                                            <SelectTrigger className="w-full h-[42px] rounded-xl font-bold bg-white border-gray-200">
                                                <SelectValue placeholder="Тип звонка" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">Все типы</SelectItem>
                                                <SelectItem value="inbound">Входящие</SelectItem>
                                                <SelectItem value="outbound">Исходящие</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Period */}
                                    <div className="flex flex-col gap-1.5">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Период</span>
                                        <Select value={period} onValueChange={setPeriod}>
                                            <SelectTrigger className="w-full h-[42px] rounded-xl font-bold bg-white border-gray-200">
                                                <SelectValue placeholder="Период" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">Все время</SelectItem>
                                                <SelectItem value="today">Сегодня</SelectItem>
                                                <SelectItem value="week">Неделя</SelectItem>
                                                <SelectItem value="month">Месяц</SelectItem>
                                                <SelectItem value="custom">Период</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                {period === 'custom' && (
                                    <div className="grid grid-cols-2 gap-3 pt-3 mt-2 border-t border-gray-50">
                                        <div className="flex flex-col gap-1.5">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">От</span>
                                            <input
                                                type="date"
                                                value={dateFrom}
                                                onChange={e => setDateFrom(e.target.value)}
                                                className="w-full h-[42px] px-3 bg-white border border-gray-200 rounded-xl text-xs sm:text-sm font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500/50 transition-all shadow-sm"
                                            />
                                        </div>
                                        <div className="flex flex-col gap-1.5">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">До</span>
                                            <input
                                                type="date"
                                                value={dateTo}
                                                onChange={e => setDateTo(e.target.value)}
                                                className="w-full h-[42px] px-3 bg-white border border-gray-200 rounded-xl text-xs sm:text-sm font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500/50 transition-all shadow-sm"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-3 w-10">
                                    <Checkbox
                                        checked={selectedIds.length === calls.length && calls.length > 0}
                                        onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                                    />
                                </th>
                                <th onClick={() => handleSort('type')} className="px-6 py-3 font-medium cursor-pointer hover:bg-gray-100 transition-colors">
                                    <div className="flex items-center gap-1">
                                        Тип
                                        {sortBy === 'type' && (sortOrder === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                                    </div>
                                </th>
                                <th onClick={() => handleSort('client_name')} className="px-6 py-3 font-medium cursor-pointer hover:bg-gray-100 transition-colors">
                                    <div className="flex items-center gap-1">
                                        Клиент
                                        {sortBy === 'client_name' && (sortOrder === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                                    </div>
                                </th>
                                <th onClick={() => handleSort('manager_name')} className="px-6 py-3 font-medium cursor-pointer hover:bg-gray-100 transition-colors">
                                    <div className="flex items-center gap-1">
                                        Сотрудник
                                        {sortBy === 'manager_name' && (sortOrder === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                                    </div>
                                </th>
                                <th className="px-6 py-3 font-medium">Заметки</th>
                                <th onClick={() => handleSort('duration')} className="px-6 py-3 font-medium cursor-pointer hover:bg-gray-100 transition-colors">
                                    <div className="flex items-center gap-1">
                                        Длительность
                                        {sortBy === 'duration' && (sortOrder === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                                    </div>
                                </th>
                                <th onClick={() => handleSort('created_at')} className="px-6 py-3 font-medium cursor-pointer hover:bg-gray-100 transition-colors">
                                    <div className="flex items-center gap-1">
                                        Дата
                                        {sortBy === 'created_at' && (sortOrder === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                                    </div>
                                </th>
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
                                            <Checkbox
                                                checked={selectedIds.includes(call.id)}
                                                onCheckedChange={(checked) => handleSelectOne(call.id, checked as boolean)}
                                            />
                                        </td>
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
                                        <td className="px-6 py-4">
                                            {(call.recording_url || call.recording_file) ? (
                                                <AudioPlayer
                                                    url={call.recording_file ? `/static/recordings/${call.recording_file}` : call.recording_url!}
                                                    className="min-w-[400px]"
                                                />
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="file"
                                                        accept="audio/*"
                                                        className="hidden"
                                                        id={`upload-${call.id}`}
                                                        onChange={(e) => {
                                                            const file = e.target.files?.[0];
                                                            if (file) handleFileUpload(call.id, file);
                                                        }}
                                                    />
                                                    <label htmlFor={`upload-${call.id}`}>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="cursor-pointer"
                                                            asChild
                                                            disabled={uploadingFile === call.id}
                                                        >
                                                            <span>
                                                                {uploadingFile === call.id ? (
                                                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                                ) : (
                                                                    <Upload className="w-4 h-4 mr-2" />
                                                                )}
                                                                Загрузить запись
                                                            </span>
                                                        </Button>
                                                    </label>
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

                <div className="mt-8 bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-6 text-gray-300 text-sm shadow-lg">
                    <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-pink-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Phone className="w-5 h-5 text-pink-400" />
                        </div>
                        <div className="flex-1">
                            <p className="font-semibold mb-2 text-white">Интеграция с телефонией</p>
                            <p className="text-xs mb-3 text-gray-400">
                                Подключите вашу АТС для автоматической синхронизации звонков.
                                Поддерживаются: <span className="text-pink-400">Binotel</span>, <span className="text-blue-400">OnlinePBX</span>, Twilio и другие.
                            </p>
                            <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
                                <p className="text-xs text-gray-400 mb-1">Webhook URL:</p>
                                <code className="text-xs bg-gray-900 px-2 py-1 rounded text-green-400 select-all block break-all">
                                    {import.meta.env.VITE_API_URL || window.location.origin}/api/telephony/webhook/[provider]
                                </code>
                                <p className="text-xs text-gray-500 mt-2">
                                    Замените <code className="text-pink-400">[provider]</code> на: binotel, onlinepbx или generic
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

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
                                onChange={e => setFormData({ ...formData, duration: parseInt(e.target.value) || 0 })}
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
                            <Label>Файл записи (если нет ссылки)</Label>
                            <Input
                                type="file"
                                accept="audio/*"
                                onChange={e => setSelectedFile(e.target.files?.[0] || null)}
                                className="cursor-pointer file:cursor-pointer"
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
        </div >
    );
}
