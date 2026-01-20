import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import RecordingsManager from '../../components/recordings/RecordingsManager';
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
    Users,
    Check,
    ChevronsUpDown,
    Play,
    Headphones,
    FileText,
    AlertCircle,
    CheckCircle2,
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '../../components/ui/command';
import { cn } from '../../lib/utils';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
    PieChart,
    Pie,
    Cell,
    LineChart,
    Line
} from 'recharts';

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
    manual_client_name?: string;
    manual_manager_name?: string;
    manual_service_name?: string;
}

export default function Telephony() {
    const { t } = useTranslation(['admin/telephony', 'common']);
    const [search, setSearch] = useState('');
    const [period, setPeriod] = useState('all');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [analytics, setAnalytics] = useState<any[]>([]);

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
    const [managerFilter, setManagerFilter] = useState<string>('all');
    const [managers, setManagers] = useState<string[]>([]);
    const [minDuration, setMinDuration] = useState<string>('');
    const [maxDuration, setMaxDuration] = useState<string>('');

    // Lists for selection
    const [allClients, setAllClients] = useState<any[]>([]);
    const [allMasters, setAllMasters] = useState<any[]>([]);
    const [allServices, setAllServices] = useState<any[]>([]);

    // Add/Edit states
    const [clientOpen, setClientOpen] = useState(false);
    const [masterOpen, setMasterOpen] = useState(false);
    const [serviceOpen, setServiceOpen] = useState(false);

    const [formData, setFormData] = useState({
        phone: '',
        direction: 'outbound' as any,
        status: 'completed' as any,
        duration: 0,
        notes: '',
        recording_url: '',
        booking_id: undefined as number | undefined,
        manual_client_name: '',
        manual_manager_name: '',
        manual_service_name: '',
        client_id: ''
    });

    const [integrationSettings, setIntegrationSettings] = useState({
        provider: 'binotel',
        api_key: '',
        api_secret: '',
        webhook_token: '',
        is_active: true
    });
    const [testingConnection, setTestingConnection] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string; error?: string } | null>(null);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const settings = await api.getTelephonySettings();
                if (settings && Object.keys(settings).length > 0) {
                    setIntegrationSettings(settings);
                }
            } catch (error) {
                console.error('Failed to load telephony settings:', error);
            }
        };
        fetchSettings();
    }, []);

    useEffect(() => {
        loadData();

        // Polling: refresh data every 30 seconds to see updates (duration, etc.)
        const interval = setInterval(() => {
            loadData();
        }, 30000);

        return () => clearInterval(interval);
    }, [search, period, dateFrom, dateTo, sortBy, sortOrder, statusFilter, typeFilter, managerFilter, minDuration, maxDuration]);

    // Set default manager when opening add dialog
    useEffect(() => {
        if (showAddDialog && formData.manual_manager_name === '') {
            const defaultManager = allMasters.find(m =>
                (m.position && m.position.toLowerCase().includes('менеджер')) ||
                (m.position_ru && m.position_ru.toLowerCase().includes('менеджер')) ||
                (m.role && m.role.toLowerCase().includes('manager'))
            );
            if (defaultManager) {
                setFormData(prev => ({
                    ...prev,
                    manual_manager_name: defaultManager.full_name || defaultManager.username
                }));
            }
        }
    }, [showAddDialog, allMasters]);

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

            const [callsData, statsData, analyticsData] = await Promise.all([
                api.getCalls(search, 50, 0, start, end, undefined, sortBy, sortOrder, statusFilter, typeFilter),
                api.getTelephonyStats(start, end),
                api.getTelephonyAnalytics(
                    start,
                    end,
                    managerFilter === 'all' ? undefined : managerFilter,
                    statusFilter === 'all' ? undefined : statusFilter,
                    typeFilter === 'all' ? undefined : typeFilter,
                    minDuration ? parseInt(minDuration) : undefined,
                    maxDuration ? parseInt(maxDuration) : undefined
                )
            ]);
            setCalls(callsData);
            setStats(statsData);
            setAnalytics(analyticsData);

            // Extract unique managers for filter
            const mgrs = Array.from(new Set(callsData.map((c: any) => c.manager_name).filter(Boolean))) as string[];
            if (mgrs.length > 0) setManagers(mgrs);

            // Fetch additional data for dialogs
            const [clientsData, mastersData, servicesData] = await Promise.all([
                api.getClients(),
                api.getMasters(),
                api.getServices()
            ]);
            setAllClients(clientsData.clients || []);
            setAllMasters(mastersData.employees || mastersData.users || (Array.isArray(mastersData) ? mastersData : []));
            setAllServices(servicesData.services || []);
        } catch (error) {
            console.error('Failed to load telephony data:', error);
            toast.error(t('common:error_loading_data', 'Ошибка загрузки данных'));
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
        if (!confirm(t('telephony:confirm_delete_selected', { count: selectedIds.length }))) return;

        setProcessing(true);
        try {
            await Promise.all(selectedIds.map(id => api.deleteCall(id)));
            toast.success(t('telephony:deleted_calls_count', { count: selectedIds.length }));
            setSelectedIds([]);
            loadData();
        } catch (e) {
            toast.error(t('common:delete_error', 'Ошибка при удалении'));
        } finally {
            setProcessing(false);
        }
    };

    const handleFileUpload = async (callId: number, file: File) => {
        try {
            setUploadingFile(callId);
            await api.uploadRecording(callId, file);
            toast.success(t('telephony:recording_uploaded'));
            loadData();
        } catch (error) {
            toast.error(t('common:upload_error', 'Ошибка загрузки файла'));
        } finally {
            setUploadingFile(null);
        }
    };

    const handleCreateCall = async () => {
        if (!formData.phone) {
            toast.error(t('telephony:enter_phone'));
            return;
        }
        try {
            setProcessing(true);
            const response = await api.createCall(formData) as any;

            if (response.success && response.id && selectedFile) {
                try {
                    await api.uploadRecording(response.id, selectedFile);
                    toast.success(t('telephony:call_created_recording_uploaded'));
                } catch (uploadError) {
                    console.error('Error uploading file:', uploadError);
                    toast.error(t('telephony:call_created_upload_error'));
                }
            } else {
                toast.success(t('telephony:call_added'));
            }

            await loadData();
            setShowAddDialog(false);
            setFormData({
                phone: '',
                direction: 'outbound' as any,
                status: 'completed' as any,
                duration: 0,
                notes: '',
                recording_url: '',
                booking_id: undefined,
                manual_client_name: '',
                manual_manager_name: '',
                manual_service_name: '',
                client_id: ''
            });
            setSelectedFile(null);
            loadData();
        } catch (error) {
            toast.error(t('telephony:create_error'));
        } finally {
            setProcessing(false);
        }
    };

    const handleTestIntegration = async () => {
        setTestingConnection(true);
        setTestResult(null);
        try {
            const result = await api.testTelephonyIntegration(integrationSettings);
            setTestResult(result);
            if (result.success) {
                toast.success(result.message || t('telephony:connection_success'));
            } else {
                toast.error(result.error || t('telephony:connection_error'));
            }
        } catch (error: any) {
            setTestResult({ success: false, message: error.message || t('telephony:test_error') });
            toast.error(t('telephony:testing_error'));
        } finally {
            setTestingConnection(false);
        }
    };

    const handleSaveSettings = async () => {
        setProcessing(true);
        try {
            await api.saveTelephonySettings(integrationSettings);
            toast.success(t('common:settings_saved', 'Настройки сохранены'));
        } catch (error) {
            toast.error(t('common:settings_save_error', 'Ошибка сохранения настроек'));
        } finally {
            setProcessing(false);
        }
    };

    const handleUpdateCall = async () => {
        if (!editingCall) return;
        try {
            setProcessing(true);
            await api.updateCall(editingCall.id, formData);
            toast.success(t('telephony:call_updated'));
            setShowEditDialog(false);
            setEditingCall(null);
            loadData();
        } catch (error) {
            toast.error(t('common:update_error', 'Ошибка обновления'));
        } finally {
            setProcessing(false);
        }
    };

    const handleDeleteCall = async (id: number) => {
        if (!confirm(t('common:confirm_delete', 'Вы уверены, что хотите удалить эту запись?'))) return;
        try {
            await api.deleteCall(id);
            toast.success(t('telephony:call_deleted'));
            setCalls(calls.filter(c => c.id !== id));
        } catch (error) {
            toast.error(t('common:delete_error', 'Ошибка удаления'));
        }
    };

    const openEditDialog = (call: CallLog) => {
        setEditingCall(call);
        setFormData({
            phone: call.phone,
            direction: call.type as any,
            status: call.status as any,
            duration: call.duration,
            notes: call.notes || '',
            recording_url: call.recording_url || '',
            booking_id: call.booking_id,
            manual_client_name: call.manual_client_name || '',
            manual_manager_name: call.manager_name || '',
            manual_service_name: call.manual_service_name || '',
            client_id: call.client_id || ''
        });
        setShowEditDialog(true);
    };

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const getIcon = (type: string, status: string) => {
        if (status === 'missed') return <PhoneMissed className="w-4 h-4" style={{ color: 'var(--telephony-missed)' }} />;
        if (type === 'inbound') return <PhoneIncoming className="w-4 h-4" style={{ color: 'var(--telephony-inbound)' }} />;
        return <PhoneOutgoing className="w-4 h-4" style={{ color: 'var(--telephony-outbound)' }} />;
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
                            {t('telephony:records_count', { count: calls.length })}
                        </p>
                    </div>
                    <button
                        onClick={handleRefresh}
                        className="w-full md:w-auto px-5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95"
                    >
                        <RefreshCw className={`w-4 h-4 ${processing ? 'animate-spin' : ''} text-pink-600`} />
                        {t('common:refresh', 'Обновить')}
                    </button>
                </div>

                <Tabs defaultValue="list" className="w-full">
                    <TabsList className="mb-6 bg-gray-100/50 p-1 rounded-xl w-fit">
                        <TabsTrigger value="list" className="rounded-lg px-4 py-2 text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-pink-600 data-[state=active]:shadow-sm transition-all focus-visible:outline-none">
                            {t('telephony:call_list_tab', 'Список звонков')}
                        </TabsTrigger>
                        <TabsTrigger value="recordings" className="rounded-lg px-4 py-2 text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-pink-600 data-[state=active]:shadow-sm transition-all focus-visible:outline-none">
                            {t('telephony:recordings_tab', 'Записи')}
                        </TabsTrigger>
                        <TabsTrigger value="analytics" className="rounded-lg px-4 py-2 text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-pink-600 data-[state=active]:shadow-sm transition-all focus-visible:outline-none">
                            {t('telephony:analytics_tab', 'Аналитика')}
                        </TabsTrigger>
                        <TabsTrigger value="integrations" className="rounded-lg px-4 py-2 text-sm font-medium data-[state=active]:bg-white data-[state=active]:text-pink-600 data-[state=active]:shadow-sm transition-all focus-visible:outline-none">
                            {t('telephony:integrations_tab', 'Интеграции')}
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="list" className="space-y-6 focus-visible:outline-none">
                        <div className="grid grid-cols-4 gap-4 mb-6">
                            <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-center gap-4">
                                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                                    <Phone className="w-6 h-6" />
                                </div>
                                <div>
                                    <div className="text-2xl font-bold text-blue-900">{stats.total_calls}</div>
                                    <div className="text-xs text-blue-600 font-medium">{t('telephony:total_calls', 'Всего звонков')}</div>
                                </div>
                            </div>
                            <div className="bg-green-50 border border-green-100 p-4 rounded-xl flex items-center gap-4">
                                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center text-green-600">
                                    <PhoneIncoming className="w-6 h-6" />
                                </div>
                                <div>
                                    <div className="text-2xl font-bold text-green-900">{stats.inbound}</div>
                                    <div className="text-xs text-green-600 font-medium">{t('telephony:inbound', 'Входящие')}</div>
                                </div>
                            </div>
                            <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-center gap-4">
                                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                                    <PhoneOutgoing className="w-6 h-6" />
                                </div>
                                <div>
                                    <div className="text-2xl font-bold text-blue-900">{stats.outbound}</div>
                                    <div className="text-xs text-blue-600 font-medium">{t('telephony:outbound', 'Исходящие')}</div>
                                </div>
                            </div>
                            <div className="bg-red-50 border border-red-100 p-4 rounded-xl flex items-center gap-4">
                                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center text-red-600">
                                    <PhoneMissed className="w-6 h-6" />
                                </div>
                                <div>
                                    <div className="text-2xl font-bold text-red-900">{stats.missed}</div>
                                    <div className="text-xs text-red-600 font-medium">{t('telephony:missed', 'Пропущенные')}</div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-100 mb-8 backdrop-blur-xl bg-white/80">
                            <div className="flex flex-col gap-4">
                                {/* Row 1: Search */}
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <Input
                                        placeholder={t('telephony:search_placeholder', 'Поиск по номеру или имени...')}
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
                                        <span>{t('common:add', 'Добавить')}</span>
                                    </button>

                                    <button
                                        onClick={() => setShowFilters(!showFilters)}
                                        className={`flex-1 h-[42px] px-2 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1 transition-all border shadow-sm ${showFilters
                                            ? 'bg-pink-50 border-pink-200 text-pink-600'
                                            : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                                            }`}
                                    >
                                        <Users className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${showFilters ? 'text-pink-500' : 'text-gray-400'}`} />
                                        <span className="truncate">{t('common:filters', 'Фильтры')}</span>
                                        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${showFilters ? 'rotate-180' : ''}`} />
                                    </button>

                                    {selectedIds.length > 0 && (
                                        <button
                                            onClick={handleBulkDelete}
                                            className="flex-1 h-[42px] px-2 bg-red-50 text-red-600 border border-red-200 rounded-xl text-xs sm:text-sm font-bold hover:bg-red-100 active:scale-95 flex items-center justify-center gap-1.5 transition-all shadow-sm"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                            <span className="truncate">{t('common:delete', 'Удалить')} ({selectedIds.length})</span>
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
                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">{t('telephony:status', 'Статус')}</span>
                                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                                    <SelectTrigger className="w-full h-[42px] rounded-xl font-bold bg-white border-gray-200">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="all">{t('telephony:all', 'Все')}</SelectItem>
                                                        <SelectItem value="completed">{t('telephony:status_completed', 'Завершенные')}</SelectItem>
                                                        <SelectItem value="missed">{t('telephony:missed', 'Пропущенные')}</SelectItem>
                                                        <SelectItem value="rejected">{t('common:rejected', 'Отклоненные')}</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            {/* Type */}
                                            <div className="flex flex-col gap-1.5">
                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">{t('telephony:type', 'Тип')}</span>
                                                <Select value={typeFilter} onValueChange={setTypeFilter}>
                                                    <SelectTrigger className="w-full h-[42px] rounded-xl font-bold bg-white border-gray-200">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="all">{t('telephony:all', 'Все')}</SelectItem>
                                                        <SelectItem value="inbound">{t('telephony:inbound', 'Входящие')}</SelectItem>
                                                        <SelectItem value="outbound">{t('telephony:outbound', 'Исходящие')}</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            {/* Manager */}
                                            <div className="flex flex-col gap-1.5">
                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">{t('telephony:employee', 'Сотрудник')}</span>
                                                <Select value={managerFilter} onValueChange={setManagerFilter}>
                                                    <SelectTrigger className="w-full h-[42px] rounded-xl font-bold bg-white border-gray-200">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="all">{t('common:all', 'Все сотрудники')}</SelectItem>
                                                        {managers.map(m => (
                                                            <SelectItem key={m} value={m}>{m}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            {/* Period */}
                                            <div className="flex flex-col gap-1.5">
                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">{t('telephony:period', 'Период')}</span>
                                                <Select value={period} onValueChange={setPeriod}>
                                                    <SelectTrigger className="w-full h-[42px] rounded-xl font-bold bg-white border-gray-200">
                                                        <SelectValue placeholder={t('telephony:period', 'Период')} />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="all">{t('telephony:all_time', 'Все время')}</SelectItem>
                                                        <SelectItem value="today">{t('telephony:today', 'Сегодня')}</SelectItem>
                                                        <SelectItem value="week">{t('telephony:week', 'Неделя')}</SelectItem>
                                                        <SelectItem value="month">{t('telephony:month', 'Месяц')}</SelectItem>
                                                        <SelectItem value="custom">{t('telephony:period', 'Период')}</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            {/* Duration Range */}
                                            <div className="flex flex-col gap-1.5 sm:col-span-2">
                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">{t('telephony:duration_range', 'Длительность (сек)')}</span>
                                                <div className="flex items-center gap-2">
                                                    <Input
                                                        type="number"
                                                        placeholder={t('telephony:from', 'От')}
                                                        value={minDuration}
                                                        onChange={(e) => setMinDuration(e.target.value)}
                                                        className="h-[42px] bg-white border-gray-200 rounded-xl"
                                                    />
                                                    <div className="w-2 h-[1px] bg-gray-300" />
                                                    <Input
                                                        type="number"
                                                        placeholder={t('telephony:to', 'До')}
                                                        value={maxDuration}
                                                        onChange={(e) => setMaxDuration(e.target.value)}
                                                        className="h-[42px] bg-white border-gray-200 rounded-xl"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {period === 'custom' && (
                                            <div className="grid grid-cols-2 gap-3 pt-3 mt-2 border-t border-gray-50">
                                                <div className="flex flex-col gap-1.5">
                                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">{t('telephony:from', 'От')}</span>
                                                    <input
                                                        type="date"
                                                        value={dateFrom}
                                                        onChange={e => setDateFrom(e.target.value)}
                                                        className="w-full h-[42px] px-3 bg-white border border-gray-200 rounded-xl text-xs sm:text-sm font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500/50 transition-all shadow-sm"
                                                    />
                                                </div>
                                                <div className="flex flex-col gap-1.5">
                                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">{t('telephony:to', 'До')}</span>
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
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-100">
                                    <tr>
                                        <th className="px-6 py-3 w-10">
                                            <Checkbox
                                                checked={selectedIds.length === calls.length && calls.length > 0}
                                                onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                                            />
                                        </th>
                                        <th onClick={() => handleSort('type')} className="px-6 py-3 font-medium cursor-pointer hover:bg-gray-100 transition-colors w-[80px]">
                                            <div className="flex items-center gap-1">
                                                {t('telephony:type', 'Тип')}
                                                {sortBy === 'type' && (sortOrder === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                                            </div>
                                        </th>
                                        <th onClick={() => handleSort('client_name')} className="px-6 py-3 font-medium cursor-pointer hover:bg-gray-100 transition-colors min-w-[180px]">
                                            <div className="flex items-center gap-1">
                                                {t('telephony:client', 'Клиент')}
                                                {sortBy === 'client_name' && (sortOrder === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                                            </div>
                                        </th>
                                        <th onClick={() => handleSort('manager_name')} className="px-6 py-3 font-medium cursor-pointer hover:bg-gray-100 transition-colors min-w-[150px]">
                                            <div className="flex items-center gap-1">
                                                {t('telephony:employee', 'Сотрудник')}
                                                {sortBy === 'manager_name' && (sortOrder === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                                            </div>
                                        </th>
                                        <th className="px-6 py-3 font-medium min-w-[150px]">{t('telephony:notes', 'Заметки')}</th>
                                        <th onClick={() => handleSort('duration')} className="px-6 py-3 font-medium cursor-pointer hover:bg-gray-100 transition-colors min-w-[110px]">
                                            <div className="flex items-center gap-1">
                                                {t('telephony:duration', 'Длительность')}
                                                {sortBy === 'duration' && (sortOrder === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                                            </div>
                                        </th>
                                        <th onClick={() => handleSort('created_at')} className="px-6 py-3 font-medium cursor-pointer hover:bg-gray-100 transition-colors min-w-[130px]">
                                            <div className="flex items-center gap-1">
                                                {t('telephony:date', 'Дата')}
                                                {sortBy === 'created_at' && (sortOrder === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                                            </div>
                                        </th>
                                        <th className="px-6 py-3 font-medium text-right min-w-[80px]">{t('telephony:recording', 'Запись')}</th>
                                        <th className="px-6 py-3 font-medium text-right w-10"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                                                <div className="flex justify-center mb-2">
                                                    <Loader2 className="animate-spin w-8 h-8 text-pink-500" />
                                                </div>
                                                {t('telephony:loading', 'Загрузка звонков...')}
                                            </td>
                                        </tr>
                                    ) : calls.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                                                {t('telephony:no_calls_found', 'Звонков не найдено')}
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
                                                    <div className="font-medium text-gray-900">{call.client_name || t('common:unknown', 'Неизвестный')}</div>
                                                    <div className="text-xs text-gray-500">{call.phone}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {call.manager_name || <span className="text-gray-400">-</span>}
                                                </td>
                                                <td className="px-6 py-4 max-w-[200px] text-gray-500">
                                                    {call.notes && call.notes.length > 50 ? (
                                                        <Popover>
                                                            <PopoverTrigger asChild>
                                                                <div className="cursor-help flex items-center gap-1 hover:text-pink-500 transition-colors">
                                                                    <FileText className="w-4 h-4 text-gray-400 group-hover:text-pink-400" />
                                                                    <span className="truncate">{call.notes.substring(0, 47)}...</span>
                                                                </div>
                                                            </PopoverTrigger>
                                                            <PopoverContent className="w-80 p-4">
                                                                <div className="space-y-2">
                                                                    <h4 className="font-medium text-sm border-b pb-1">{t('telephony:notes', 'Заметки')}</h4>
                                                                    <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                                                                        {call.notes}
                                                                    </p>
                                                                </div>
                                                            </PopoverContent>
                                                        </Popover>
                                                    ) : (
                                                        <span className="truncate overflow-hidden block">{call.notes || <span className="text-gray-400">-</span>}</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 font-mono text-gray-600">
                                                    {call.status === 'missed' ? '-' : formatDuration(call.duration)}
                                                </td>
                                                <td className="px-6 py-4 text-gray-500">
                                                    {call.created_at ? format(new Date(call.created_at), 'dd MMM HH:mm', { locale: ru }) : '-'}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    {(call.recording_url || call.recording_file) ? (
                                                        <div className="flex justify-end">
                                                            <Popover>
                                                                <PopoverTrigger asChild>
                                                                    <Button variant="ghost" size="icon" className="h-8 w-8 bg-pink-50 text-pink-600 border border-pink-100 hover:bg-pink-100 rounded-full shadow-sm">
                                                                        <Play className="w-4 h-4 fill-current ml-0.5" />
                                                                    </Button>
                                                                </PopoverTrigger>
                                                                <PopoverContent className="w-[450px] p-0 border-none shadow-2xl bg-transparent" side="left">
                                                                    <div className="bg-white rounded-2xl shadow-2xl border p-4">
                                                                        <div className="flex items-center gap-3 mb-3 px-1">
                                                                            <div className="w-10 h-10 bg-pink-100 rounded-xl flex items-center justify-center">
                                                                                <Headphones className="w-6 h-6 text-pink-600" />
                                                                            </div>
                                                                            <div>
                                                                                <p className="text-xs font-semibold text-gray-900 leading-none mb-1">{call.client_name || call.phone}</p>
                                                                                <p className="text-[10px] text-gray-500">{format(new Date(call.created_at), 'dd MMMM yyyy, HH:mm', { locale: ru })}</p>
                                                                            </div>
                                                                        </div>
                                                                        <AudioPlayer
                                                                            url={call.recording_file ? `/static/recordings/${call.recording_file}` : call.recording_url!}
                                                                            autoPlay={true}
                                                                            initialExpanded={true}
                                                                        />
                                                                    </div>
                                                                </PopoverContent>
                                                            </Popover>
                                                        </div>
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
                                                                        {t('telephony:upload_recording')}
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
                                                                <Edit2 className="w-4 h-4 mr-2" /> {t('common:edit')}
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => handleDeleteCall(call.id)} className="text-red-600">
                                                                <Trash2 className="w-4 h-4 mr-2" /> {t('common:delete')}
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


                    </TabsContent>

                    <TabsContent value="recordings" className="space-y-6 focus-visible:outline-none">
                        <RecordingsManager type="telephony" />
                    </TabsContent>

                    <TabsContent value="analytics" className="space-y-6 focus-visible:outline-none">
                        {analytics.length > 0 ? (
                            <div className="space-y-6">
                                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                                    <h3 className="text-lg font-bold text-gray-900 mb-6">{t('telephony:dynamics', 'Динамика звонков')}</h3>
                                    <div className="h-[300px] w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={analytics}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                <XAxis
                                                    dataKey="date"
                                                    tickFormatter={(value) => {
                                                        if (!value) return '';
                                                        try { return format(new Date(value), 'd MMM', { locale: ru }); } catch { return value; }
                                                    }}
                                                    fontSize={12}
                                                />
                                                <YAxis fontSize={12} />
                                                <Tooltip
                                                    labelFormatter={(value) => {
                                                        if (!value) return '';
                                                        try { return format(new Date(value), 'd MMMM yyyy', { locale: ru }); } catch { return value; }
                                                    }}
                                                />
                                                <Legend />
                                                <Bar dataKey="inbound" name={t('telephony:inbound', 'Входящие')} fill="var(--telephony-inbound)" radius={[4, 4, 0, 0]} stackId="a" />
                                                <Bar dataKey="outbound" name={t('telephony:outbound', 'Исходящие')} fill="var(--telephony-outbound)" radius={[4, 4, 0, 0]} stackId="a" />
                                                <Bar dataKey="missed" name={t('telephony:missed', 'Пропущенные')} fill="var(--telephony-missed)" radius={[4, 4, 0, 0]} stackId="a" />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                                    <h3 className="text-lg font-bold text-gray-900 mb-6">{t('telephony:average_duration_stats')}</h3>
                                    <div className="h-[300px] w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={analytics}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                <XAxis
                                                    dataKey="date"
                                                    tickFormatter={(value) => {
                                                        if (!value) return '';
                                                        try { return format(new Date(value), 'd MMM', { locale: ru }); } catch { return value; }
                                                    }}
                                                    fontSize={12}
                                                />
                                                <YAxis fontSize={12} />
                                                <Tooltip />
                                                <Legend />
                                                <Line type="monotone" dataKey="avg_duration" name={t('telephony:duration_label', 'Длительность')} stroke="var(--telephony-avg-duration)" strokeWidth={3} dot={{ r: 4, fill: 'var(--telephony-avg-duration)' }} activeDot={{ r: 6 }} />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                                        <h3 className="text-lg font-bold text-gray-900 mb-6">{t('telephony:distribution', 'Распределение по типам')}</h3>
                                        <div className="h-[300px] w-full">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={[
                                                            { name: t('telephony:inbound', 'Входящие'), value: stats.inbound, color: 'var(--telephony-inbound)' },
                                                            { name: t('telephony:outbound', 'Исходящие'), value: stats.outbound, color: 'var(--telephony-outbound)' },
                                                            { name: t('telephony:missed', 'Пропущенные'), value: stats.missed, color: 'var(--telephony-missed)' }
                                                        ].filter(item => item.value > 0)}
                                                        innerRadius={60}
                                                        outerRadius={80}
                                                        paddingAngle={5}
                                                        dataKey="value"
                                                    >
                                                        {[
                                                            { name: t('telephony:inbound'), value: stats.inbound, color: 'var(--telephony-inbound)' },
                                                            { name: t('telephony:outbound'), value: stats.outbound, color: 'var(--telephony-outbound)' },
                                                            { name: t('telephony:missed'), value: stats.missed, color: 'var(--telephony-missed)' }
                                                        ].filter(item => item.value > 0).map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip />
                                                    <Legend verticalAlign="bottom" height={36} />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>

                                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                                        <h3 className="text-lg font-bold text-gray-900 mb-6">{t('telephony:period_stats', 'Статистика за период')}</h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                                                <p className="text-sm text-gray-500 mb-1">{t('telephony:total_calls', 'Всего звонков')}</p>
                                                <p className="text-2xl font-bold text-gray-900">{stats.total_calls}</p>
                                            </div>
                                            <div className="p-4 bg-green-50 rounded-lg border border-green-100">
                                                <p className="text-sm text-green-600 mb-1">{t('telephony:efficiency', 'Эффективность')}</p>
                                                <p className="text-2xl font-bold text-green-700">
                                                    {stats.total_calls > 0 ? Math.round(((stats.inbound + stats.outbound) / stats.total_calls) * 100) : 0}%
                                                </p>
                                            </div>
                                            <div className="col-span-2 p-4 bg-blue-50 rounded-lg border border-blue-100 flex items-center justify-between">
                                                <div>
                                                    <p className="text-sm text-blue-600 mb-1">{t('telephony:outbound', 'Исходящие')}</p>
                                                    <p className="text-2xl font-bold text-blue-700">{stats.outbound}</p>
                                                </div>
                                                <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                                                    <div className="h-6 w-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" style={{ animationDuration: '3s' }}></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-white p-12 text-center rounded-xl border border-gray-200 text-gray-500">
                                {t('telephony:no_data_analytics', 'Нет данных для аналитики за выбранный период')}
                            </div>
                        )}
                    </TabsContent>
                    <TabsContent value="integrations" className="space-y-6 focus-visible:outline-none">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                            <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                                <Plus className="w-5 h-5 text-pink-600" />
                                {t('telephony:add_integration')}
                            </h3>

                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <Label className="text-gray-700 font-semibold">{t('telephony:provider')}</Label>
                                    <Select
                                        value={integrationSettings.provider}
                                        onValueChange={(val) => setIntegrationSettings({ ...integrationSettings, provider: val })}
                                    >
                                        <SelectTrigger className="h-[45px] rounded-xl border-gray-200">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="binotel">{t('telephony:provider_binotel')}</SelectItem>
                                            <SelectItem value="onlinepbx">{t('telephony:provider_onlinepbx')}</SelectItem>
                                            <SelectItem value="twilio">{t('telephony:provider_twilio')}</SelectItem>
                                            <SelectItem value="generic">{t('telephony:provider_generic')}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {integrationSettings.provider !== 'generic' && (
                                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                        <div className="space-y-2">
                                            <Label className="text-gray-700 font-semibold">{integrationSettings.provider === 'twilio' ? 'Account SID' : 'API Key'}</Label>
                                            <Input
                                                type="password"
                                                value={integrationSettings.api_key}
                                                onChange={(e) => setIntegrationSettings({ ...integrationSettings, api_key: e.target.value })}
                                                placeholder={integrationSettings.provider === 'twilio' ? t('telephony:placeholder_account_sid') : t('telephony:placeholder_api_key')}
                                                className="h-[45px] rounded-xl border-gray-200"
                                            />
                                        </div>

                                        {(integrationSettings.provider === 'binotel' || integrationSettings.provider === 'twilio') && (
                                            <div className="space-y-2">
                                                <Label className="text-gray-700 font-semibold">{integrationSettings.provider === 'twilio' ? 'Auth Token' : 'API Secret'}</Label>
                                                <Input
                                                    type="password"
                                                    value={integrationSettings.api_secret}
                                                    onChange={(e) => setIntegrationSettings({ ...integrationSettings, api_secret: e.target.value })}
                                                    placeholder={integrationSettings.provider === 'twilio' ? t('telephony:placeholder_auth_token') : t('telephony:placeholder_api_secret')}
                                                    className="h-[45px] rounded-xl border-gray-200"
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-50">
                                    <Button
                                        onClick={handleTestIntegration}
                                        disabled={testingConnection}
                                        variant="outline"
                                        className="h-[45px] rounded-xl font-bold flex-1"
                                    >
                                        {testingConnection ? (
                                            <>
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                {t('telephony:testing')}
                                            </>
                                        ) : (
                                            t('telephony:test_connection')
                                        )}
                                    </Button>
                                    <Button
                                        onClick={handleSaveSettings}
                                        disabled={processing}
                                        className="h-[45px] rounded-xl font-bold flex-1 bg-pink-600 hover:bg-pink-700 shadow-md shadow-pink-100"
                                    >
                                        {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : t('telephony:save_settings')}
                                    </Button>
                                </div>

                                {testResult && (
                                    <div className={`mt-4 p-4 rounded-xl border flex items-start gap-3 animate-in fade-in zoom-in-95 duration-300 ${testResult.success ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                                        {testResult.success ? (
                                            <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                                        ) : (
                                            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                                        )}
                                        <div>
                                            <p className={`text-sm font-bold ${testResult.success ? 'text-green-800' : 'text-red-800'}`}>
                                                {testResult.success ? t('telephony:success') : t('telephony:error')}
                                            </p>
                                            <p className={`text-xs ${testResult.success ? 'text-green-600' : 'text-red-600'}`}>
                                                {testResult.message}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 text-gray-300 text-sm shadow-xl">
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 bg-pink-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                                    <Phone className="w-6 h-6 text-pink-400" />
                                </div>
                                <div className="flex-1">
                                    <p className="font-bold mb-2 text-white text-lg">{t('telephony:integration_status')}</p>
                                    <p className="text-xs mb-4 text-gray-400 leading-relaxed">
                                        {t('telephony:webhook_instruction_short')}
                                    </p>
                                    <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700 shadow-inner">
                                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">{t('telephony:webhook_url_label')}</p>
                                        <div className="flex items-center gap-3">
                                            <code className="text-xs bg-gray-900 px-3 py-2 rounded-lg text-green-400 select-all block break-all flex-1 border border-gray-700">
                                                {import.meta.env.VITE_API_URL || window.location.origin}/api/telephony/webhook/{integrationSettings.provider === 'generic' ? 'generic' : integrationSettings.provider}
                                            </code>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-gray-400 hover:text-white hover:bg-gray-700"
                                                onClick={() => {
                                                    const url = `${import.meta.env.VITE_API_URL || window.location.origin}/api/telephony/webhook/${integrationSettings.provider === 'generic' ? 'generic' : integrationSettings.provider}`;
                                                    navigator.clipboard.writeText(url);
                                                    toast.success(t('telephony:copied'));
                                                }}
                                            >
                                                {t('telephony:copy')}
                                            </Button>
                                        </div>
                                        <p className="text-[10px] text-gray-500 mt-3 flex items-center gap-1.5">
                                            <AlertCircle className="w-3 h-3" />
                                            {t('telephony:webhook_security_note')}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </TabsContent>
                </Tabs >
            </div>

            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{t('telephony:add_call')}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>{t('phone')}</Label>
                                <Input
                                    value={formData.phone}
                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                    placeholder="+7..."
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>{t('type')}</Label>
                                <Select
                                    value={formData.direction}
                                    onValueChange={v => setFormData({ ...formData, direction: v as any })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="inbound">{t('inbound')}</SelectItem>
                                        <SelectItem value="outbound">{t('outbound')}</SelectItem>
                                        <SelectItem value="missed">{t('missed')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>{t('status')}</Label>
                                <Select
                                    value={formData.status}
                                    onValueChange={v => setFormData({ ...formData, status: v as any })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="completed">{t('status_completed')}</SelectItem>
                                        <SelectItem value="missed">{t('status_missed')}</SelectItem>
                                        <SelectItem value="ongoing">{t('status_ongoing')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>{t('duration')} ({t('common:seconds')})</Label>
                                <Input
                                    type="number"
                                    value={formData.duration}
                                    onChange={e => setFormData({ ...formData, duration: parseInt(e.target.value) || 0 })}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>{t('client_name')}</Label>
                            <div className="flex gap-2">
                                <Popover open={clientOpen} onOpenChange={setClientOpen}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            role="combobox"
                                            aria-expanded={clientOpen}
                                            className="flex-1 justify-between font-normal"
                                        >
                                            {formData.manual_client_name || formData.client_id || t('select_client')}
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[300px] p-0">
                                        <Command>
                                            <CommandInput placeholder={t('search_client')} />
                                            <CommandEmpty>{t('no_clients_found')}</CommandEmpty>
                                            <CommandGroup className="max-h-[200px] overflow-y-auto">
                                                {allClients.map((client) => (
                                                    <CommandItem
                                                        key={client.id}
                                                        value={client.name || client.id}
                                                        onSelect={() => {
                                                            setFormData({
                                                                ...formData,
                                                                client_id: client.instagram_id || client.id,
                                                                manual_client_name: client.name || client.display_name || client.id
                                                            });
                                                            setClientOpen(false);
                                                        }}
                                                    >
                                                        <Check
                                                            className={cn(
                                                                "mr-2 h-4 w-4",
                                                                formData.client_id === (client.instagram_id || client.id) ? "opacity-100" : "opacity-0"
                                                            )}
                                                        />
                                                        <div>
                                                            <div>{client.name || client.display_name || client.username || client.id}</div>
                                                            <div className="text-xs text-gray-400">{client.phone}</div>
                                                        </div>
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                                <Input
                                    placeholder={t('manual_input')}
                                    value={formData.manual_client_name}
                                    onChange={e => setFormData({ ...formData, manual_client_name: e.target.value })}
                                    className="w-[180px] shrink-0"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>{t('manager_name')}</Label>
                            <div className="flex gap-2">
                                <Popover open={masterOpen} onOpenChange={setMasterOpen}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            role="combobox"
                                            aria-expanded={masterOpen}
                                            className="flex-1 justify-between font-normal"
                                        >
                                            {formData.manual_manager_name || t('select_manager')}
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[300px] p-0">
                                        <Command>
                                            <CommandInput placeholder={t('search_manager')} />
                                            <CommandEmpty>{t('no_managers_found')}</CommandEmpty>
                                            <CommandGroup className="max-h-[200px] overflow-y-auto">
                                                {allMasters.map((master) => (
                                                    <CommandItem
                                                        key={master.id}
                                                        value={master.full_name || master.username}
                                                        onSelect={() => {
                                                            setFormData({
                                                                ...formData,
                                                                manual_manager_name: master.full_name || master.username
                                                            });
                                                            setMasterOpen(false);
                                                        }}
                                                    >
                                                        <Check
                                                            className={cn(
                                                                "mr-2 h-4 w-4",
                                                                formData.manual_manager_name === (master.full_name || master.username) ? "opacity-100" : "opacity-0"
                                                            )}
                                                        />
                                                        {master.full_name || master.username}
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                                <Input
                                    placeholder={t('manual_input')}
                                    value={formData.manual_manager_name}
                                    onChange={e => setFormData({ ...formData, manual_manager_name: e.target.value })}
                                    className="w-[180px] shrink-0"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>{t('service_name')}</Label>
                            <div className="flex gap-2">
                                <Popover open={serviceOpen} onOpenChange={setServiceOpen}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            role="combobox"
                                            aria-expanded={serviceOpen}
                                            className="flex-1 justify-between font-normal"
                                        >
                                            {formData.manual_service_name || t('select_service')}
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[300px] p-0">
                                        <Command>
                                            <CommandInput placeholder={t('search_service')} />
                                            <CommandEmpty>{t('no_services_found')}</CommandEmpty>
                                            <CommandGroup className="max-h-[200px] overflow-y-auto">
                                                {allServices.map((service) => (
                                                    <CommandItem
                                                        key={service.id}
                                                        value={service.name_ru || service.name}
                                                        onSelect={() => {
                                                            setFormData({
                                                                ...formData,
                                                                manual_service_name: service.name_ru || service.name
                                                            });
                                                            setServiceOpen(false);
                                                        }}
                                                    >
                                                        <Check
                                                            className={cn(
                                                                "mr-2 h-4 w-4",
                                                                formData.manual_service_name === (service.name_ru || service.name) ? "opacity-100" : "opacity-0"
                                                            )}
                                                        />
                                                        {service.name_ru || service.name}
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                                <Input
                                    placeholder={t('manual_input')}
                                    value={formData.manual_service_name}
                                    onChange={e => setFormData({ ...formData, manual_service_name: e.target.value })}
                                    className="w-[180px] shrink-0"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>{t('recording_url')}</Label>
                            <Input
                                value={formData.recording_url}
                                onChange={e => setFormData({ ...formData, recording_url: e.target.value })}
                                placeholder="https://..."
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>{t('recording_file')}</Label>
                            <Input
                                type="file"
                                accept="audio/*"
                                onChange={e => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        setSelectedFile(file);
                                        const audio = new Audio(URL.createObjectURL(file));
                                        audio.onloadedmetadata = () => {
                                            setFormData(prev => ({ ...prev, duration: Math.floor(audio.duration) }));
                                            URL.revokeObjectURL(audio.src);
                                        };
                                    } else {
                                        setSelectedFile(null);
                                    }
                                }}
                                className="cursor-pointer file:cursor-pointer"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>{t('notes')}</Label>
                            <Input
                                value={formData.notes}
                                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                placeholder={t('notes_placeholder')}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAddDialog(false)}>{t('common:cancel')}</Button>
                        <Button onClick={handleCreateCall} disabled={processing}>
                            {processing ? <Loader2 className="animate-spin" /> : t('common:create')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{t('telephony:edit_call')}</DialogTitle>
                    </DialogHeader>
                    {/* Reusing same fields for Edit Dialog */}
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>{t('phone')}</Label>
                                <Input
                                    value={formData.phone}
                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>{t('type')}</Label>
                                <Select
                                    value={formData.direction}
                                    onValueChange={v => setFormData({ ...formData, direction: v as any })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="inbound">{t('inbound')}</SelectItem>
                                        <SelectItem value="outbound">{t('outbound')}</SelectItem>
                                        <SelectItem value="missed">{t('missed')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>{t('status')}</Label>
                                <Select
                                    value={formData.status}
                                    onValueChange={v => setFormData({ ...formData, status: v as any })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="completed">{t('status_completed')}</SelectItem>
                                        <SelectItem value="missed">{t('status_missed')}</SelectItem>
                                        <SelectItem value="ongoing">{t('status_ongoing')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>{t('duration')} ({t('common:seconds')})</Label>
                                <Input
                                    type="number"
                                    value={formData.duration}
                                    onChange={e => setFormData({ ...formData, duration: parseInt(e.target.value) || 0 })}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>{t('client_name')}</Label>
                            <div className="flex gap-2">
                                <Popover open={clientOpen} onOpenChange={setClientOpen}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            role="combobox"
                                            aria-expanded={clientOpen}
                                            className="flex-1 justify-between font-normal"
                                        >
                                            {formData.manual_client_name || formData.client_id || t('select_client')}
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[300px] p-0">
                                        <Command>
                                            <CommandInput placeholder={t('search_client')} />
                                            <CommandEmpty>{t('no_clients_found')}</CommandEmpty>
                                            <CommandGroup className="max-h-[200px] overflow-y-auto">
                                                {allClients.map((client) => (
                                                    <CommandItem
                                                        key={client.id}
                                                        value={client.name || client.id}
                                                        onSelect={() => {
                                                            setFormData({
                                                                ...formData,
                                                                client_id: client.instagram_id || client.id,
                                                                manual_client_name: client.name || client.display_name || client.id
                                                            });
                                                            setClientOpen(false);
                                                        }}
                                                    >
                                                        <Check
                                                            className={cn(
                                                                "mr-2 h-4 w-4",
                                                                formData.client_id === (client.instagram_id || client.id) ? "opacity-100" : "opacity-0"
                                                            )}
                                                        />
                                                        <div>
                                                            <div>{client.name || client.display_name || client.username || client.id}</div>
                                                            <div className="text-xs text-gray-400">{client.phone}</div>
                                                        </div>
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                                <Input
                                    placeholder={t('manual_input')}
                                    value={formData.manual_client_name}
                                    onChange={e => setFormData({ ...formData, manual_client_name: e.target.value })}
                                    className="w-[180px] shrink-0"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>{t('manager_name')}</Label>
                            <div className="flex gap-2">
                                <Popover open={masterOpen} onOpenChange={setMasterOpen}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            role="combobox"
                                            aria-expanded={masterOpen}
                                            className="flex-1 justify-between font-normal"
                                        >
                                            {formData.manual_manager_name || t('select_manager')}
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[300px] p-0">
                                        <Command>
                                            <CommandInput placeholder={t('search_manager')} />
                                            <CommandEmpty>{t('no_managers_found')}</CommandEmpty>
                                            <CommandGroup className="max-h-[200px] overflow-y-auto">
                                                {allMasters.map((master) => (
                                                    <CommandItem
                                                        key={master.id}
                                                        value={master.full_name || master.username}
                                                        onSelect={() => {
                                                            setFormData({
                                                                ...formData,
                                                                manual_manager_name: master.full_name || master.username
                                                            });
                                                            setMasterOpen(false);
                                                        }}
                                                    >
                                                        <Check
                                                            className={cn(
                                                                "mr-2 h-4 w-4",
                                                                formData.manual_manager_name === (master.full_name || master.username) ? "opacity-100" : "opacity-0"
                                                            )}
                                                        />
                                                        {master.full_name || master.username}
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                                <Input
                                    placeholder={t('manual_input')}
                                    value={formData.manual_manager_name}
                                    onChange={e => setFormData({ ...formData, manual_manager_name: e.target.value })}
                                    className="w-[180px] shrink-0"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>{t('service_name')}</Label>
                            <div className="flex gap-2">
                                <Popover open={serviceOpen} onOpenChange={setServiceOpen}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            role="combobox"
                                            aria-expanded={serviceOpen}
                                            className="flex-1 justify-between font-normal"
                                        >
                                            {formData.manual_service_name || t('select_service')}
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[300px] p-0">
                                        <Command>
                                            <CommandInput placeholder={t('search_service')} />
                                            <CommandEmpty>{t('no_services_found')}</CommandEmpty>
                                            <CommandGroup className="max-h-[200px] overflow-y-auto">
                                                {allServices.map((service) => (
                                                    <CommandItem
                                                        key={service.id}
                                                        value={service.name_ru || service.name}
                                                        onSelect={() => {
                                                            setFormData({
                                                                ...formData,
                                                                manual_service_name: service.name_ru || service.name
                                                            });
                                                            setServiceOpen(false);
                                                        }}
                                                    >
                                                        <Check
                                                            className={cn(
                                                                "mr-2 h-4 w-4",
                                                                formData.manual_service_name === (service.name_ru || service.name) ? "opacity-100" : "opacity-0"
                                                            )}
                                                        />
                                                        {service.name_ru || service.name}
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                                <Input
                                    placeholder={t('manual_input')}
                                    value={formData.manual_service_name}
                                    onChange={e => setFormData({ ...formData, manual_service_name: e.target.value })}
                                    className="w-[180px] shrink-0"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>{t('notes')}</Label>
                            <Input
                                value={formData.notes}
                                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowEditDialog(false)}>{t('common:cancel')}</Button>
                        <Button onClick={handleUpdateCall} disabled={processing}>
                            {processing ? <Loader2 className="animate-spin" /> : t('common:save')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div >
    );
}
