
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
    Clock
} from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
import { Badge } from "../../components/ui/badge";
import { ScrollArea } from "../../components/ui/scroll-area";
import { AddFunnelClientDialog } from "../../components/funnel/AddFunnelClientDialog";

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

    const handleDrop = async (e: React.DragEvent, stageId: number) => {
        e.preventDefault();
        if (!draggedClient || draggedClient.pipeline_stage_id === stageId) return;

        const oldStageId = draggedClient.pipeline_stage_id;

        // Optimistic update
        setClients(prev => {
            const newMap = { ...prev };
            // Remove from old
            newMap[oldStageId] = newMap[oldStageId].filter(c => c.id !== draggedClient.id);
            // Add to new
            newMap[stageId] = [...(newMap[stageId] || []), { ...draggedClient, pipeline_stage_id: stageId }];
            return newMap;
        });

        try {
            await api.post('/api/funnel/move', {
                client_id: draggedClient.id,
                stage_id: stageId
            });
            toast.success(t('moved_successfully'));
        } catch (error) {
            console.error("Move failed:", error);
            toast.error(t('move_failed'));
            // Rollback would go here
            loadData(); // Reload to be safe
        } finally {
            setDraggedClient(null);
        }
    };

    const getTemperatureColor = (temp: string) => {
        switch (temp) {
            case 'hot': return 'bg-red-500';
            case 'warm': return 'bg-orange-500';
            default: return 'bg-blue-300';
        }
    };

    return (
        <div className="h-full flex flex-col bg-gray-50/50">
            {/* Header */}
            <div className="px-6 py-4 bg-white border-b flex items-center justify-between sticky top-0 z-10 box-border">
                <div className="flex items-center gap-4">
                    <h1 className="text-2xl font-bold text-gray-900">{t('funnel')}</h1>
                    <div className="h-6 w-px bg-gray-200" />
                    <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                        <Button variant="ghost" size="sm" className="h-7 text-xs bg-white shadow-sm">
                            All Time
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 text-xs text-gray-500">
                            This Month
                        </Button>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                            placeholder={t('search_clients')}
                            className="pl-9 h-9 bg-gray-50 border-gray-200"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <Button
                        size="sm"
                        className="bg-gradient-to-r from-pink-500 to-purple-600 text-white hover:opacity-90"
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

            {/* Board */}
            <div className="flex-1 overflow-x-auto overflow-y-hidden">
                <div className="h-full flex px-6 py-6 gap-4 min-w-max">
                    {stages.map((stage) => (
                        <div
                            key={stage.id}
                            className="w-80 flex flex-col h-full rounded-xl bg-gray-100/50 border border-gray-200/60"
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, stage.id)}
                        >
                            {/* Column Header */}
                            <div className="p-3 border-b border-gray-200/60 bg-white/50 backdrop-blur-sm rounded-t-xl sticky top-0 z-10">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="font-semibold text-sm text-gray-700 uppercase tracking-wide">
                                        {stage.name}
                                    </h3>
                                    <Badge variant="secondary" className="bg-gray-100 text-gray-600 font-mono text-xs">
                                        {clients[stage.id]?.length || 0}
                                    </Badge>
                                </div>
                                <div className="h-1 w-full rounded-full bg-gray-200 overflow-hidden">
                                    <div
                                        className="h-full rounded-full transition-all duration-500"
                                        style={{ backgroundColor: stage.color, width: '100%' }}
                                    />
                                </div>
                                <div className="mt-2 text-xs text-gray-400 font-medium">
                                    {/* Placeholder for total value sum */}
                                    0 ₸
                                </div>
                            </div>

                            {/* Cards Container */}
                            <ScrollArea className="flex-1 p-2">
                                <div className="flex flex-col gap-2 pb-2">
                                    {clients[stage.id]?.map((client) => (
                                        <div
                                            key={client.id}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, client)}
                                            className="group bg-white p-3 rounded-lg border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing relative"
                                        >
                                            <div className={`absolute top-3 right-3 w-2 h-2 rounded-full ${getTemperatureColor(client.temperature)} ring-2 ring-white`} title={`Temperature: ${client.temperature}`} />

                                            <div className="mb-2">
                                                <div className="font-medium text-gray-900 text-sm line-clamp-1 hover:text-pink-600 transition-colors">
                                                    {client.name || client.username}
                                                </div>
                                                <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                                    <Clock className="w-3 h-3" />
                                                    {format(new Date(client.last_contact), 'dd MMM HH:mm', { locale: ru })}
                                                </div>
                                            </div>

                                            {client.phone && (
                                                <div className="text-xs text-gray-600 flex items-center gap-1.5 mb-2 bg-gray-50 p-1.5 rounded">
                                                    <Phone className="w-3 h-3 text-gray-400" />
                                                    {client.phone}
                                                </div>
                                            )}

                                            <div className="flex items-center justify-between pt-2 border-t border-gray-50 mt-2">
                                                <div className="flex items-center gap-2">
                                                    <Avatar className="w-5 h-5">
                                                        <AvatarImage src={client.profile_pic || `https://instagram.com/${client.username}/profilepic`} />
                                                        <AvatarFallback className="text-[9px] bg-purple-50 text-purple-600">
                                                            {client.username?.[0]?.toUpperCase()}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <span className="text-xs text-gray-400">@{client.username}</span>
                                                </div>
                                                {client.total_spend > 0 && (
                                                    <Badge variant="outline" className="text-[10px] h-5 px-1.5 border-green-200 text-green-700 bg-green-50">
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

                            <div className="p-2 pt-0 sticky bottom-0 bg-transparent">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="w-full text-gray-400 hover:text-gray-600 text-xs border border-dashed border-gray-300 hover:bg-white bg-transparent"
                                    onClick={() => setCreateDialogOpen(true)}
                                >
                                    <Plus className="w-3 h-3 mr-1.5" />
                                    {t('quick_add')}
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
