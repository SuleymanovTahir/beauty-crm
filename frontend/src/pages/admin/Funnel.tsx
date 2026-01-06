
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../services/api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
    Search,
    Plus,
    Phone,
    DollarSign,
    Clock,
    Layout,
    LayoutDashboard,
    Users,
    Flame,
    TrendingUp,
    Settings,
    Eye,
    Trash2
} from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
import { Badge } from "../../components/ui/badge";
import { AddFunnelClientDialog } from "../../components/funnel/AddFunnelClientDialog";
import { CreateBookingDialog } from "../../components/bookings/CreateBookingDialog";
import { ManageFunnelStagesDialog } from '../../components/funnel/ManageFunnelStagesDialog';
import { ClientDetailsDialog } from '../../components/funnel/ClientDetailsDialog';
import { ScrollArea } from '../../components/ui/scroll-area';

interface Stage {
    id: number;
    name: string;
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
}

export default function Funnel() {
    const { t } = useTranslation(['admin/funnel', 'common']);
    const [stages, setStages] = useState<Stage[]>([]);
    const [clients, setClients] = useState<Record<number, Client[]>>({});
    const [search, setSearch] = useState('');
    const [draggedClient, setDraggedClient] = useState<Client | null>(null);

    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [manageStagesOpen, setManageStagesOpen] = useState(false);

    // Client Details Dialog State
    const [clientDetailsOpen, setClientDetailsOpen] = useState(false);
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);

    // Booking Dialog State
    const [createBookingOpen, setCreateBookingOpen] = useState(false);
    const [bookingClient, setBookingClient] = useState<Client | null>(null);
    const [pendingStageId, setPendingStageId] = useState<number | null>(null);

    // View state
    const [viewMode, setViewMode] = useState<'board' | 'list'>('board');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            // 1. Load stages
            const stagesData = await api.get('/api/funnel/stages');
            setStages(stagesData);

            // 2. Load clients for each stage
            // In a real app, you might want to load this more efficiently
            const clientsMap: Record<number, Client[]> = {};
            await Promise.all(stagesData.map(async (stage: Stage) => {
                const clientsData = await api.get(`/api/funnel/clients?stage_id=${stage.id}&limit=20`);
                clientsMap[stage.id] = clientsData;
            }));
            setClients(clientsMap);
        } catch (error) {
            console.error('Error loading funnel:', error);
            toast.error('Failed to load funnel data');
        }
    };

    const handleDragStart = (e: React.DragEvent, client: Client) => {
        setDraggedClient(client);
        e.dataTransfer.effectAllowed = "move";
        // Set a custom drag image or data if needed
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault(); // Necessary to allow dropping
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

            // Remove from ALL stages to ensure no duplication
            Object.keys(newMap).forEach(key => {
                const sId = Number(key);
                if (newMap[sId]) {
                    newMap[sId] = newMap[sId].filter(c => c.id !== client.id);
                }
            });

            // Add to new
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
            loadData(); // Reload to be safe
        }
    };

    const handleDrop = async (e: React.DragEvent, stageId: number) => {
        e.preventDefault();
        if (!draggedClient || draggedClient.pipeline_stage_id === stageId) return;

        const targetStage = stages.find(s => s.id === stageId);

        // If moving to "Booked" or "Запись", trigger booking creation
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
        if (!confirm(t('confirm_delete_client', 'Delete this client?'))) return;

        try {
            await api.post(`/api/clients/${client.id}/delete`);
            // Optimistic removal
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
            toast.success(t('client_deleted', 'Client deleted'));
        } catch (error) {
            console.error('Delete failed:', error);
            toast.error(t('delete_failed', 'Failed to delete client'));
        }
    };

    const getTemperatureColor = (temp: string) => {
        switch (temp) {
            case 'hot': return 'bg-red-500';
            case 'warm': return 'bg-orange-500';
            default: return 'bg-blue-300';
        }
    };

    // Funnel Analytics (Optimized for board view header)
    const funnelAnalytics = {
        total_clients: Object.values(clients).flat().length,
        hot_leads: Object.values(clients).flat().filter(c => c.temperature === 'hot').length,
        total_revenue: Object.values(clients).flat().reduce((acc, c) => acc + (c.total_spend || 0), 0),
        new_this_month: Object.values(clients).flat().filter(c => {
            const date = new Date(c.last_contact);
            const now = new Date();
            return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
        }).length
    };

    return (
        <div className="h-full flex flex-col bg-gray-50/50">
            {/* Header & Analytics */}
            <div className="px-8 py-6 bg-white border-b sticky top-0 z-20">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{t('funnel')}</h1>
                        <p className="text-sm text-gray-500 mt-1">{t('subtitle', 'Управление этапами и конверсией')}</p>
                    </div>
                    <div className="flex gap-2">
                        <div className="bg-gray-100 p-1 rounded-lg flex items-center mr-2 border border-gray-200">
                            <button
                                onClick={() => setViewMode('board')}
                                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'board'
                                    ? 'bg-white text-gray-900 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-900'
                                    }`}
                            >
                                <Layout className="w-4 h-4 mr-2 inline-block" />
                                {t('kanban_view')}
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'list'
                                    ? 'bg-white text-gray-900 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-900'
                                    }`}
                            >
                                <LayoutDashboard className="w-4 h-4 mr-2 inline-block" />
                                {t('list_view')}
                            </button>
                        </div>

                        <Button
                            variant="outline"
                            size="icon"
                            className="text-gray-500 hover:text-gray-900"
                            onClick={() => setManageStagesOpen(true)}
                            title={t('manage_stages', 'Управление стадиями')}
                        >
                            <Settings className="w-4 h-4" />
                        </Button>

                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                                placeholder={t('search_clients')}
                                className="pl-9 h-9 w-64 bg-gray-50 border-gray-200"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>

                        <Button
                            className="bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg shadow-purple-500/20"
                            onClick={() => setCreateDialogOpen(true)}
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            {t('quick_add')}
                        </Button>
                    </div>
                </div>

                <AddFunnelClientDialog
                    open={createDialogOpen}
                    onOpenChange={setCreateDialogOpen}
                    onSuccess={loadData}
                    stages={stages}
                />

                <ManageFunnelStagesDialog
                    open={manageStagesOpen}
                    onOpenChange={setManageStagesOpen}
                    onSuccess={loadData}
                />

                <ClientDetailsDialog
                    open={clientDetailsOpen}
                    onOpenChange={setClientDetailsOpen}
                    client={selectedClient}
                    onSuccess={loadData}
                    stages={stages}
                    onAddBooking={(client) => {
                        setBookingClient(client);
                        setCreateBookingOpen(true);
                    }}
                />


                <CreateBookingDialog
                    open={createBookingOpen}
                    onOpenChange={setCreateBookingOpen}
                    onSuccess={handleBookingSuccess}
                    initialClient={bookingClient}
                />

                {/* Analytics Summary */}
                <div className="grid grid-cols-4 gap-4">
                    <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-center gap-4">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                            <Users className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-blue-900">{funnelAnalytics.total_clients}</div>
                            <div className="text-xs text-blue-600 font-medium">{t('total_clients', 'Всего клиентов')}</div>
                        </div>
                    </div>
                    <div className="bg-red-50 border border-red-100 p-4 rounded-xl flex items-center gap-4">
                        <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center text-red-600">
                            <Flame className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-red-900">{funnelAnalytics.hot_leads}</div>
                            <div className="text-xs text-red-600 font-medium">{t('hot_leads', 'Горячие лиды')}</div>
                        </div>
                    </div>
                    <div className="bg-green-50 border border-green-100 p-4 rounded-xl flex items-center gap-4">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center text-green-600">
                            <DollarSign className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-green-900">{funnelAnalytics.total_revenue}</div>
                            <div className="text-xs text-green-600 font-medium">{t('pipeline_value', 'Сумма в воронке')}</div>
                        </div>
                    </div>
                    <div className="bg-purple-50 border border-purple-100 p-4 rounded-xl flex items-center gap-4">
                        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600">
                            <TrendingUp className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-purple-900">{funnelAnalytics.new_this_month}</div>
                            <div className="text-xs text-purple-600 font-medium">{t('new_this_month', 'Новые за месяц')}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden">
                {viewMode === 'board' ? (

                    /* Kanban Board */
                    <div className="h-full overflow-x-auto p-6">
                        <div className="flex gap-6 h-full w-max">
                            {stages.map((stage) => (
                                <div

                                    key={stage.id}
                                    className="w-80 flex flex-col h-full rounded-xl bg-gray-100/50 border border-gray-200/60"
                                    onDragOver={handleDragOver}
                                    onDrop={(e) => handleDrop(e, stage.id)}
                                >
                                    {/* Column Header */}
                                    <div className="p-4 border-b border-gray-200/60 bg-white/50 backdrop-blur-sm rounded-t-xl sticky top-0 z-10">
                                        <div className="flex items-center justify-between mb-2">
                                            <h3 className="font-semibold text-sm text-gray-700 uppercase tracking-wide">
                                                {stage.name}
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
                                                {clients[stage.id]?.reduce((sum, c) => sum + c.total_spend, 0) || 0} ₸
                                            </span>
                                        </div>
                                    </div>

                                    {/* Cards Container */}
                                    <ScrollArea className="flex-1 p-3">
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
                                                    {/* Actions Overlay */}
                                                    <div className="absolute top-2 right-2 flex gap-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 rounded-lg p-0.5 backdrop-blur-sm">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7 text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleClientClick(client);
                                                            }}
                                                            title={t('view_details', 'View Details')}
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
                                                            title={t('delete_client', 'Delete Client')}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>

                                                    <div className={`absolute top-3 right-3 w-2 h-2 rounded-full ${getTemperatureColor(client.temperature)} ring-2 ring-white shadow-sm opacity-100 group-hover:opacity-0 transition-opacity`} title={`Temperature: ${client.temperature}`} />

                                                    <div className="mb-3">
                                                        <div className="font-semibold text-gray-900 text-sm line-clamp-1 hover:text-pink-600 transition-colors cursor-pointer">
                                                            {client.name || client.username}
                                                        </div>
                                                        <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                                                            <Clock className="w-3 h-3 text-gray-400" />
                                                            {format(new Date(client.last_contact), 'dd MMM HH:mm', { locale: ru })}
                                                        </div>
                                                    </div>

                                                    {client.phone && (
                                                        <div className="text-xs text-gray-600 flex items-center gap-1.5 mb-3 bg-gray-50 p-2 rounded-md border border-gray-100">
                                                            <Phone className="w-3 h-3 text-gray-400" />
                                                            {client.phone}
                                                        </div>
                                                    )}

                                                    <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                                                        <div className="flex items-center gap-2">
                                                            <Avatar className="w-6 h-6 border border-gray-100">
                                                                <AvatarImage src={client.profile_pic || `https://instagram.com/${client.username}/profilepic`} />
                                                                <AvatarFallback className="text-[10px] bg-purple-50 text-purple-600 font-medium">
                                                                    {client.username?.[0]?.toUpperCase()}
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
                ) : (
                    <div className="p-6 h-full overflow-hidden flex flex-col">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex-1 overflow-hidden flex flex-col">
                            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0">
                                <h3 className="font-semibold text-gray-900">{t('client_list')}</h3>
                                <div className="text-sm text-gray-500">
                                    {Object.values(clients).flat().length} {t('clients')}
                                </div>
                            </div>
                            <ScrollArea className="flex-1">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-gray-500 uppercase bg-gray-50 sticky top-0 z-10 shadow-sm">
                                        <tr>
                                            <th className="px-6 py-3 font-medium">{t('client')}</th>
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
                                                                    <AvatarFallback className="bg-purple-50 text-purple-600 font-medium text-xs">
                                                                        {client.username?.[0]?.toUpperCase()}
                                                                    </AvatarFallback>
                                                                </Avatar>
                                                                <div>
                                                                    <div className="font-medium text-gray-900">{client.name || client.username}</div>
                                                                    <div className="text-xs text-gray-500">@{client.username}</div>
                                                                    {client.phone && (
                                                                        <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                                                                            <Phone className="w-3 h-3" />
                                                                            {client.phone}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <Badge variant="secondary" className="bg-gray-100 font-normal">
                                                                {stages.find(s => s.id === client.pipeline_stage_id)?.name}
                                                            </Badge>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-2">
                                                                <div className={`w-2 h-2 rounded-full ${getTemperatureColor(client.temperature)}`} />
                                                                <span className="capitalize text-gray-600">{client.temperature}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-gray-500">
                                                            {format(new Date(client.last_contact), 'dd MMM HH:mm', { locale: ru })}
                                                        </td>
                                                        <td className="px-6 py-4 text-right font-medium text-gray-900">
                                                            {client.total_spend > 0 ? `${client.total_spend} ₸` : '-'}
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8 text-gray-400 hover:text-blue-600"
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
                                                                    className="h-8 w-8 text-gray-400 hover:text-red-600"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleDeleteClient(client);
                                                                    }}
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </Button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))
                                        ) : (
                                            <tr>
                                                <td colSpan={6} className="text-center py-12 text-gray-400 text-sm">
                                                    {t('no_clients_found', 'Клиенты не найдены')}
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </ScrollArea>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
