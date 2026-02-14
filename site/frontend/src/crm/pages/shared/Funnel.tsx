
import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../services/api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
    Layout,
    LayoutDashboard,
    Users,
    Plus,
    Search,
    Clock,
    DollarSign,
    Phone,
    Flame,
    TrendingUp,
    TrendingDown,
    Settings,
    Eye,
    Trash2,
    Bell,
    Filter,
    BarChart3,
    Loader,
    CheckCircle,
    AlertTriangle,
    AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { ru, enUS, ar, es, de, fr, pt, hi, kk } from 'date-fns/locale';
import { toast } from 'sonner';

const dateLocales: Record<string, any> = {
    ru, en: enUS, ar, es, de, fr, pt, hi, kk
};
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
import { Badge } from "../../components/ui/badge";
import { AddFunnelClientDialog } from "../../components/funnel/AddFunnelClientDialog";
import { CreateBookingDialog } from "../../components/bookings/CreateBookingDialog";
import { ManageFunnelStagesDialog } from '../../components/funnel/ManageFunnelStagesDialog';
import { ClientDetailsDialog } from '../../components/funnel/ClientDetailsDialog';
import { ScrollArea } from '../../components/ui/scroll-area';
import { useCurrency } from '../../hooks/useSalonSettings';

interface Stage {
    id: number;
    name: string;
    key?: string;
    color: string;
    count?: number;
    total_value?: number;
}

interface Client {
    id: string; // instagram_id
    name: string;
    username: string;
    phone?: string;
    notes?: string;
    total_spend: number;
    last_contact: string;
    temperature: 'cold' | 'warm' | 'hot';
    pipeline_stage_id: number;
    profile_pic?: string;
    reminder_date?: string;
}

interface FunnelData {
    visitors: number;
    engaged: number;
    started_booking: number;
    booked: number;
    completed: number;
    conversion_rates: {
        visitor_to_engaged: number;
        engaged_to_booking: number;
        booking_to_booked: number;
        booked_to_completed: number;
    };
}

const analyticsStageColors = [
    'bg-blue-500',
    'bg-cyan-500',
    'bg-green-500',
    'bg-amber-500',
    'bg-pink-500'
];

export default function UniversalFunnel() {
    const { t, i18n } = useTranslation(['admin/funnel', 'common']);
    const { currency } = useCurrency();

    // View state
    const [viewMode, setViewMode] = useState<'board' | 'list' | 'analytics'>('board');

    // Board Data
    const [stages, setStages] = useState<Stage[]>([]);
    const [clients, setClients] = useState<Record<number, Client[]>>({});
    const [search, setSearch] = useState('');
    const [draggedClient, setDraggedClient] = useState<Client | null>(null);

    // Analytics Data
    const [funnelAnalytics, setFunnelAnalytics] = useState<FunnelData | null>(null);
    const [period] = useState('month');
    const [loadingAnalytics, setLoadingAnalytics] = useState(false);

    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [manageStagesOpen, setManageStagesOpen] = useState(false);

    // Client Details Dialog State
    const [clientDetailsOpen, setClientDetailsOpen] = useState(false);
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);

    // Booking Dialog State
    const [createBookingOpen, setCreateBookingOpen] = useState(false);
    const [bookingClient, setBookingClient] = useState<Client | null>(null);
    const [pendingStageId, setPendingStageId] = useState<number | null>(null);

    const [loading, setLoading] = useState(true);
    const currentUser = useMemo(() => {
        const userStr = localStorage.getItem('user');
        return userStr ? JSON.parse(userStr) : null;
    }, []);
    const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'director';

    useEffect(() => {
        if (viewMode === 'analytics') {
            loadAnalyticsData();
        } else {
            loadBoardData();
        }
    }, [viewMode, period]);

    const getStageLabel = (stage: Stage) => {
        return t(`stages.${stage.key}`, { defaultValue: stage.name });
    };

    const loadBoardData = async () => {
        try {
            setLoading(true);
            // 1. Load stages
            const stagesData = await api.get('/api/funnel/stages');
            setStages(stagesData);

            // 2. Load clients for each stage
            const clientsMap: Record<number, Client[]> = {};
            await Promise.all(stagesData.map(async (stage: Stage) => {
                const clientsData = await api.get(`/api/funnel/clients?stage_id=${stage.id}&limit=20`);

                // Sort by reminder_date if stage is Reminder
                if (stage.key === 'remind_later' || stage.name.toLowerCase().includes('напомнить') || stage.name.toLowerCase().includes('remind')) {
                    clientsData.sort((a: Client, b: Client) => {
                        if (!a.reminder_date) return 1;
                        if (!b.reminder_date) return -1;
                        return new Date(a.reminder_date).getTime() - new Date(b.reminder_date).getTime();
                    });
                }

                clientsMap[stage.id] = clientsData;
            }));
            setClients(clientsMap);
        } catch (error) {
            console.error('Error loading funnel board:', error);
            toast.error(t('common:error_loading'));
        } finally {
            setLoading(false);
        }
    };

    const loadAnalyticsData = async () => {
        try {
            setLoadingAnalytics(true);
            const data = await api.getFunnel();
            setFunnelAnalytics(data);
        } catch (err) {
            console.error('Error loading funnel analytics:', err);
            toast.error(t('common:error_loading'));
        } finally {
            setLoadingAnalytics(false);
        }
    };

    const handleDragStart = (e: React.DragEvent, client: Client) => {
        setDraggedClient(client);
        e.dataTransfer.effectAllowed = "move";
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
    };

    const handleClientClick = (client: Client) => {
        setSelectedClient(client);
        setClientDetailsOpen(true);
    };

    const moveClient = async (client: Client, stageId: number) => {
        // Optimistic update
        setClients(prev => {
            const newMap = { ...prev };
            Object.keys(newMap).forEach(key => {
                const sId = Number(key);
                if (newMap[sId]) {
                    newMap[sId] = newMap[sId].filter(c => c.id !== client.id);
                }
            });
            newMap[stageId] = [...(newMap[stageId] || []), { ...client, pipeline_stage_id: stageId }];
            return newMap;
        });

        try {
            await api.post('/api/funnel/move', {
                client_id: client.id,
                stage_id: stageId
            });
            toast.success(t('moved_successfully'));
        } catch (error) {
            console.error("Move failed:", error);
            toast.error(t('move_failed'));
            loadBoardData();
        }
    };

    const handleDrop = async (e: React.DragEvent, stageId: number) => {
        e.preventDefault();
        if (!draggedClient || draggedClient.pipeline_stage_id === stageId) return;

        const targetStage = stages.find(s => s.id === stageId);

        if (targetStage && (targetStage.name.toLowerCase().includes('запис') || targetStage.name.toLowerCase().includes('book'))) {
            setBookingClient(draggedClient);
            setPendingStageId(stageId);
            setCreateBookingOpen(true);
            setDraggedClient(null);
            return;
        }

        await moveClient(draggedClient, stageId);
        setDraggedClient(null);
    };

    const handleBookingSuccess = async () => {
        if (bookingClient && pendingStageId) {
            await moveClient(bookingClient, pendingStageId);
        }
        setBookingClient(null);
        setPendingStageId(null);
        setCreateBookingOpen(false);
    };

    const handleDeleteClient = async (client: Client) => {
        if (!confirm(t('confirm_delete_client'))) return;

        try {
            await api.post(`/api/clients/${client.id}/delete`);
            setClients(prev => {
                const newMap = { ...prev };
                Object.keys(newMap).forEach(key => {
                    const sId = Number(key);
                    if (newMap[sId]) {
                        newMap[sId] = newMap[sId].filter(c => c.id !== client.id);
                    }
                });
                return newMap;
            });
            toast.success(t('client_deleted'));
        } catch (error) {
            console.error('Delete failed:', error);
            toast.error(t('delete_failed'));
        }
    };

    const getTemperatureColor = (temp: string) => {
        switch (temp) {
            case 'hot': return 'bg-red-500';
            case 'warm': return 'bg-orange-500';
            default: return 'bg-blue-300';
        }
    };

    const dashboardAnalytics = useMemo(() => {
        const allClients = Object.values(clients).flat();
        return {
            total_clients: allClients.length,
            hot_leads: allClients.filter(c => c.temperature === 'hot').length,
            total_revenue: allClients.reduce((acc, c) => acc + (c.total_spend || 0), 0),
            new_this_month: allClients.filter(c => {
                const date = new Date(c.last_contact);
                const now = new Date();
                return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
            }).length
        };
    }, [clients]);

    if (loading && viewMode !== 'analytics') {
        return (
            <div className="p-8 flex items-center justify-center h-screen">
                <div className="flex flex-col items-center gap-4">
                    <Loader className="w-8 h-8 text-pink-600 animate-spin" />
                    <p className="text-gray-600">{t('common:loading')}...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col bg-gray-50/50 min-h-screen">
            {/* Header */}
            <div className="px-6 py-4 bg-white border-b relative z-20">
                <div className="flex flex-col gap-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{t('funnel')}</h1>
                        <p className="text-sm text-gray-500 mt-1">{t('subtitle')}</p>
                    </div>

                    <div className="flex flex-col gap-4">
                        {/* Tabs - Full Width */}
                        <div className="bg-gray-100 p-1 rounded-lg flex w-full border border-gray-200">
                            <button
                                onClick={() => setViewMode('board')}
                                className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${viewMode === 'board'
                                    ? 'bg-white text-gray-900 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-900'
                                    }`}
                            >
                                <Layout className="w-4 h-4 mr-2 inline-block" />
                                {t('kanban_view')}
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${viewMode === 'list'
                                    ? 'bg-white text-gray-900 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-900'
                                    }`}
                            >
                                <LayoutDashboard className="w-4 h-4 mr-2 inline-block" />
                                {t('list_view')}
                            </button>
                            {isAdmin && (
                                <button
                                    onClick={() => setViewMode('analytics')}
                                    className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${viewMode === 'analytics'
                                        ? 'bg-white text-gray-900 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-900'
                                        }`}
                                >
                                    <BarChart3 className="w-4 h-4 mr-2 inline-block" />
                                    {t('funnel_chart')}
                                </button>
                            )}
                        </div>

                        {/* Search & Actions Row */}
                        {viewMode !== 'analytics' && (
                            <div className="flex flex-col min-[600px]:flex-row gap-3 min-[600px]:items-center">
                                <div className="relative w-full min-[600px]:flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <Input
                                        placeholder={t('search_clients')}
                                        className="pl-9 h-10 w-full bg-gray-50 border-gray-200"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                    />
                                </div>

                                <div className="flex items-center gap-3 shrink-0">
                                    {isAdmin && (
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="h-10 w-10 shrink-0 bg-white"
                                            onClick={() => setManageStagesOpen(true)}
                                        >
                                            <Settings className="w-5 h-5" />
                                        </Button>
                                    )}

                                    <Button
                                        className="h-10 flex-initial bg-gradient-to-r from-pink-500 to-blue-600 text-white shadow-lg shadow-blue-500/20 shrink-0 whitespace-nowrap px-6"
                                        onClick={() => setCreateDialogOpen(true)}
                                    >
                                        <Plus className="w-4 h-4 mr-2" />
                                        {t('quick_add')}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Analytics Grid */}
                    {viewMode !== 'analytics' && (
                        <div className="grid grid-cols-1 min-[400px]:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
                            <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-center gap-4">
                                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                                    <Users className="w-6 h-6" />
                                </div>
                                <div>
                                    <div className="text-2xl font-bold text-blue-900">{dashboardAnalytics.total_clients}</div>
                                    <div className="text-xs text-blue-600 font-medium">{t('total_clients')}</div>
                                </div>
                            </div>
                            <div className="bg-red-50 border border-red-100 p-4 rounded-xl flex items-center gap-4">
                                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center text-red-600">
                                    <Flame className="w-6 h-6" />
                                </div>
                                <div>
                                    <div className="text-2xl font-bold text-red-900">{dashboardAnalytics.hot_leads}</div>
                                    <div className="text-xs text-red-600 font-medium">{t('hot_leads')}</div>
                                </div>
                            </div>
                            <div className="bg-green-50 border border-green-100 p-4 rounded-xl flex items-center gap-4">
                                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center text-green-600">
                                    <DollarSign className="w-6 h-6" />
                                </div>
                                <div>
                                    <div className="text-2xl font-bold text-green-900">{dashboardAnalytics.total_revenue}</div>
                                    <div className="text-xs text-green-600 font-medium">{t('pipeline_value')}</div>
                                </div>
                            </div>
                            <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-center gap-4">
                                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                                    <TrendingUp className="w-6 h-6" />
                                </div>
                                <div>
                                    <div className="text-2xl font-bold text-blue-900">{dashboardAnalytics.new_this_month}</div>
                                    <div className="text-xs text-blue-600 font-medium">{t('new_this_month')}</div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 flex flex-col">
                {viewMode === 'board' && (
                    <div className="flex-1 overflow-x-auto p-4 md:p-6">
                        <div className="flex gap-6 min-h-full w-max">
                            {stages.map((stage) => (
                                <div
                                    key={stage.id}
                                    className="w-96 shrink-0 flex flex-col min-h-[380px] rounded-xl bg-gray-100/50 border border-gray-200/60"
                                    onDragOver={handleDragOver}
                                    onDrop={(e) => handleDrop(e, stage.id)}
                                >
                                    <div className="p-4 border-b border-gray-200/60 bg-white/50 backdrop-blur-sm rounded-t-xl sticky top-0 z-10">
                                        <div className="flex items-center justify-between mb-2">
                                            <h3 className="font-semibold text-sm text-gray-700 uppercase tracking-wide">
                                                {getStageLabel(stage)}
                                            </h3>
                                            <Badge variant="secondary" className="bg-white text-gray-600 font-mono text-xs border shadow-sm">
                                                {clients[stage.id]?.length || 0}
                                            </Badge>
                                        </div>
                                        <div className="h-1 w-full rounded-full bg-gray-200 overflow-hidden">
                                            <div
                                                className="h-full rounded-full transition-all duration-500"
                                                style={{ backgroundColor: stage.color, width: '100%' }}
                                            />
                                        </div>
                                        <div className="mt-2 text-xs text-gray-400 font-medium flex justify-between">
                                            <span>{t('total')}:</span>
                                            <span>
                                                {clients[stage.id]?.reduce((sum, c) => sum + (c.total_spend || 0), 0) || 0} {currency}
                                            </span>
                                        </div>
                                    </div>

                                    <ScrollArea className="p-3">
                                        <div className="flex flex-col gap-3 pb-2">
                                            {clients[stage.id]?.filter(c =>
                                                c.name.toLowerCase().includes(search.toLowerCase()) ||
                                                c.username.toLowerCase().includes(search.toLowerCase())
                                            ).map((client) => (
                                                <div
                                                    key={client.id}
                                                    draggable
                                                    onDragStart={(e) => handleDragStart(e, client)}
                                                    onClick={() => handleClientClick(client)}
                                                    className="group bg-white p-4 rounded-lg border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing relative"
                                                >
                                                    <div className="absolute top-2 right-2 flex gap-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 rounded-lg p-0.5 backdrop-blur-sm">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7 text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleClientClick(client);
                                                            }}
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7 text-gray-400 hover:text-red-600 hover:bg-red-50"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDeleteClient(client);
                                                            }}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>

                                                    <div className={`absolute top-3 right-3 w-2 h-2 rounded-full ${getTemperatureColor(client.temperature)} ring-2 ring-white shadow-sm opacity-100 group-hover:opacity-0 transition-opacity`} />

                                                    <div className="mb-3">
                                                        <div className="font-semibold text-gray-900 text-sm line-clamp-1 hover:text-pink-600 transition-colors cursor-pointer">
                                                            {client.name || client.username}
                                                        </div>
                                                        <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                                                            <Clock className="w-3 h-3 text-gray-400" />
                                                            {client.last_contact ? format(new Date(client.last_contact), 'dd MMM HH:mm', { locale: dateLocales[i18n.language] || ru }) : '-'}
                                                        </div>
                                                    </div>

                                                    {client.phone && (
                                                        <div className="text-xs text-gray-600 flex items-center gap-1.5 mb-3 bg-gray-50 p-2 rounded-md border border-gray-100">
                                                            <Phone className="w-3 h-3 text-gray-400" />
                                                            {client.phone}
                                                        </div>
                                                    )}

                                                    {client.reminder_date && (
                                                        <div className="flex items-center gap-1 mt-1.5 text-xs text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full w-fit">
                                                            <Bell className="w-3 h-3" />
                                                            {format(new Date(client.reminder_date), 'dd MMM HH:mm', { locale: dateLocales[i18n.language] || ru })}
                                                        </div>
                                                    )}

                                                    <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                                                        <div className="flex items-center gap-2">
                                                            <Avatar className="w-6 h-6 border border-gray-100">
                                                                <AvatarImage src={client.profile_pic} />
                                                                <AvatarFallback className="text-[10px] bg-blue-50 text-blue-600 font-medium">
                                                                    {client.username?.[0]?.toUpperCase() || 'U'}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                            <span className="text-xs text-gray-500 font-medium truncate max-w-[100px]">@{client.username}</span>
                                                        </div>
                                                        {client.total_spend > 0 && (
                                                            <Badge variant="outline" className="text-[10px] h-5 px-1.5 border-green-200 text-green-700 bg-green-50 font-medium">
                                                                <DollarSign className="w-2.5 h-2.5 mr-0.5" />
                                                                {client.total_spend}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                            {(!clients[stage.id] || clients[stage.id].length === 0) && (
                                                <div className="text-center py-8 text-xs text-gray-400 border-2 border-dashed border-gray-100 rounded-lg">
                                                    {t('no_clients')}
                                                </div>
                                            )}
                                        </div>
                                    </ScrollArea>

                                    <div className="p-3 pt-0 sticky bottom-0 bg-transparent">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="w-full text-gray-400 hover:text-gray-600 text-xs border border-dashed border-gray-300 hover:bg-white bg-transparent"
                                            onClick={(e) => { e.stopPropagation(); setCreateDialogOpen(true); }}
                                        >
                                            <Plus className="w-3 h-3 mr-1.5" />
                                            {t('quick_add')}
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {viewMode === 'list' && (
                    <div className="p-6 h-full overflow-hidden flex flex-col">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex-1 overflow-hidden flex flex-col">
                            <ScrollArea className="flex-1">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-gray-500 uppercase bg-gray-50 sticky top-0 z-10 shadow-sm">
                                        <tr>
                                            <th className="px-6 py-3 font-medium">{t('name')}</th>
                                            <th className="px-6 py-3 font-medium">{t('stage')}</th>
                                            <th className="px-6 py-3 font-medium">{t('temperature')}</th>
                                            <th className="px-6 py-3 font-medium">{t('last_contact')}</th>
                                            <th className="px-6 py-3 font-medium text-right">{t('total_spend')}</th>
                                            <th className="px-6 py-3 font-medium text-right">{t('actions')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {Object.values(clients).flat().length > 0 ? (
                                            Object.values(clients).flat()
                                                .filter(c =>
                                                    c.name?.toLowerCase().includes(search.toLowerCase()) ||
                                                    c.username?.toLowerCase().includes(search.toLowerCase())
                                                )
                                                .map((client) => (
                                                    <tr
                                                        key={client.id}
                                                        className="hover:bg-gray-50/80 group cursor-pointer transition-colors"
                                                        onClick={() => handleClientClick(client)}
                                                    >
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-3">
                                                                <Avatar className="w-9 h-9 border border-gray-100">
                                                                    <AvatarImage src={client.profile_pic} />
                                                                    <AvatarFallback className="bg-blue-50 text-blue-600 font-medium text-xs">
                                                                        {client.username?.[0]?.toUpperCase()}
                                                                    </AvatarFallback>
                                                                </Avatar>
                                                                <div>
                                                                    <div className="font-medium text-gray-900">{client.name || client.username}</div>
                                                                    <div className="text-xs text-gray-500">@{client.username}</div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <Badge variant="secondary" className="bg-gray-100 font-normal">
                                                                {(() => {
                                                                    const s = stages.find(s => s.id === client.pipeline_stage_id);
                                                                    return s ? t(`stages.${s.key || s.name.toLowerCase().replace(/\s+/g, '_')}`, { defaultValue: s.name }) : '-';
                                                                })()}
                                                            </Badge>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-2">
                                                                <div className={`w-2 h-2 rounded-full ${getTemperatureColor(client.temperature)}`} />
                                                                <span className="capitalize text-gray-600">{client.temperature}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-gray-500">
                                                            {client.last_contact ? format(new Date(client.last_contact), 'dd MMM HH:mm', { locale: dateLocales[i18n.language] || ru }) : '-'}
                                                        </td>
                                                        <td className="px-6 py-4 text-right font-medium text-gray-900">
                                                            {client.total_spend > 0 ? `${client.total_spend} ${currency}` : '-'}
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-blue-600" onClick={(e) => { e.stopPropagation(); handleClientClick(client); }}>
                                                                    <Eye className="w-4 h-4" />
                                                                </Button>
                                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-red-600" onClick={(e) => { e.stopPropagation(); handleDeleteClient(client); }}>
                                                                    <Trash2 className="w-4 h-4" />
                                                                </Button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))
                                        ) : (
                                            <tr>
                                                <td colSpan={6} className="text-center py-12 text-gray-400 text-sm">
                                                    {t('no_clients_found')}
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </ScrollArea>
                        </div>
                    </div>
                )}

                {viewMode === 'analytics' && (
                    <div className="p-8 h-full overflow-y-auto">
                        {loadingAnalytics ? (
                            <div className="flex flex-col items-center justify-center py-20 gap-4">
                                <Loader className="w-8 h-8 text-pink-600 animate-spin" />
                                <p className="text-gray-500">{t('common:loading')}...</p>
                            </div>
                        ) : funnelAnalytics ? (
                            <div className="max-w-6xl mx-auto space-y-8 pb-12">
                                {/* Conversion Tiles */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                    {[
                                        { label: t('conversion.visitor_to_engaged'), value: funnelAnalytics.conversion_rates.visitor_to_engaged },
                                        { label: t('conversion.engaged_to_booking'), value: funnelAnalytics.conversion_rates.engaged_to_booking },
                                        { label: t('conversion.booking_to_booked'), value: funnelAnalytics.conversion_rates.booking_to_booked },
                                        { label: t('conversion.booked_to_completed'), value: funnelAnalytics.conversion_rates.booked_to_completed },
                                    ].map((metric, index) => (
                                        <div key={index} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                                            <p className="text-gray-600 text-sm mb-2">{metric.label}</p>
                                            <div className="flex items-center justify-between">
                                                <h3 className="text-3xl font-bold text-gray-900">{metric.value.toFixed(1)}%</h3>
                                                {metric.value >= 60 ? <TrendingUp className="w-6 h-6 text-green-500" /> : <TrendingDown className="w-6 h-6 text-yellow-500" />}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Funnel Chart */}
                                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                                    <h2 className="text-2xl font-bold text-gray-900 mb-8 flex items-center gap-2">
                                        <Filter className="w-6 h-6 text-pink-600" />
                                        {t('funnel_chart')}
                                    </h2>

                                    <div className="space-y-6">
                                        {[
                                            { name: t('table.visitors'), val: funnelAnalytics.visitors, desc: t('table.visitors_desc', 'Зашли в бот/чат') },
                                            { name: t('table.engaged'), val: funnelAnalytics.engaged, desc: t('table.engaged_desc', 'Написали сообщение') },
                                            { name: t('table.started_booking'), val: funnelAnalytics.started_booking, desc: t('table.started_booking_desc', 'Открыли календарь') },
                                            { name: t('table.booked'), val: funnelAnalytics.booked, desc: t('table.booked_desc', 'Оставили бронь') },
                                            { name: t('table.completed'), val: funnelAnalytics.completed, desc: t('table.completed_desc', 'Визит завершен') }
                                        ].map((stage, idx) => {
                                            const maxVal = Math.max(funnelAnalytics.visitors, 1);
                                            const widthPerc = (stage.val / maxVal) * 100;
                                            return (
                                                <div key={idx} className="relative">
                                                    <div className="flex items-center gap-4">
                                                        <div className="flex-1">
                                                            <div
                                                                className={`${analyticsStageColors[idx] || 'bg-gray-400'} text-white p-5 rounded-lg transition-all hover:shadow-lg cursor-default`}
                                                                style={{ width: `${Math.max(widthPerc, 15)}%`, minWidth: '150px' }}
                                                            >
                                                                <div className="flex items-center justify-between overflow-hidden whitespace-nowrap">
                                                                    <div>
                                                                        <h3 className="text-base font-semibold">{stage.name}</h3>
                                                                        <p className="text-xs opacity-80">{stage.desc}</p>
                                                                    </div>
                                                                    <div className="text-right pl-4">
                                                                        <p className="text-xl font-bold">{stage.val}</p>
                                                                        <p className="text-xs opacity-80">{((stage.val / maxVal) * 100).toFixed(1)}%</p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Recommendations and Summary */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                        <h2 className="text-xl font-bold text-gray-900 mb-6">{t('key_metrics')}</h2>
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                                                <div className="flex items-center gap-4">
                                                    <CheckCircle className="w-8 h-8 text-green-600" />
                                                    <div>
                                                        <p className="text-sm text-gray-600">{t('total_conversion')}</p>
                                                        <p className="text-2xl font-bold text-gray-900">{((funnelAnalytics.completed / (funnelAnalytics.visitors || 1)) * 100).toFixed(1)}%</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
                                                <div className="flex items-center gap-4">
                                                    <AlertTriangle className="w-8 h-8 text-red-600" />
                                                    <div>
                                                        <p className="text-sm text-gray-600">{t('total_losses')}</p>
                                                        <p className="text-2xl font-bold text-gray-900">{funnelAnalytics.visitors - funnelAnalytics.completed}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                                        <h2 className="text-xl font-bold text-gray-900 mb-6">{t('recommendations_title')}</h2>
                                        <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                                            <div className="flex items-start gap-4">
                                                <AlertCircle className="w-6 h-6 text-blue-600 mt-1" />
                                                <div>
                                                    <h3 className="text-sm font-semibold text-gray-900 mb-1">{t('all_good')}</h3>
                                                    <p className="text-xs text-gray-600">{t('recommendations_feedback', 'Ваша воронка работает стабильно. Рекомендуем обратить внимание на вовлечение новых пользователей через Instagram.')}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-20 text-gray-500">
                                <Filter className="w-16 h-16 mx-auto mb-4 opacity-10" />
                                <p>{t('no_data')}</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Dialogs */}
            <AddFunnelClientDialog
                open={createDialogOpen}
                onOpenChange={setCreateDialogOpen}
                onSuccess={loadBoardData}
                stages={stages}
            />
            <ManageFunnelStagesDialog
                open={manageStagesOpen}
                onOpenChange={setManageStagesOpen}
                onSuccess={loadBoardData}
            />
            <ClientDetailsDialog
                open={clientDetailsOpen}
                onOpenChange={setClientDetailsOpen}
                client={selectedClient}
                onSuccess={loadBoardData}
                stages={stages}
                onAddBooking={(client) => {
                    setBookingClient(client);
                    setCreateBookingOpen(true);
                    setClientDetailsOpen(false);
                }}
            />
            <CreateBookingDialog
                open={createBookingOpen}
                onOpenChange={setCreateBookingOpen}
                onSuccess={handleBookingSuccess}
                initialClient={bookingClient}
            />
        </div>
    );
}
