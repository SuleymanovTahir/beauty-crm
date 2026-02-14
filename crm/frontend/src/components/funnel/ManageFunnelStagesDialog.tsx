
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { api } from '../../services/api';
import { toast } from 'sonner';
import { GripVertical, Trash2, Plus } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';

interface Stage {
    id: number;
    name: string;
    color: string;
    order_index: number;
}

interface ManageFunnelStagesDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export function ManageFunnelStagesDialog({ open, onOpenChange, onSuccess }: ManageFunnelStagesDialogProps) {
    const { t } = useTranslation(['admin/funnel', 'common']);
    const [stages, setStages] = useState<Stage[]>([]);
    const [draggedItem, setDraggedItem] = useState<number | null>(null);

    // New stage state
    const [newStageName, setNewStageName] = useState('');
    const [newStageColor, setNewStageColor] = useState('#3b82f6');

    useEffect(() => {
        if (open) {
            loadStages();
        }
    }, [open]);

    const loadStages = async () => {
        try {
            const data = await api.get('/api/funnel/stages');
            setStages(data.sort((a: Stage, b: Stage) => a.order_index - b.order_index));
        } catch (error) {
            toast.error(t('failed_to_load_stages'));
        }
    };

    const handleAddStage = async () => {
        if (!newStageName.trim()) return;

        try {
            await api.post('/api/funnel/stages', {
                name: newStageName,
                color: newStageColor,
                order_index: stages.length
            });
            toast.success(t('stage_created'));
            setNewStageName('');
            loadStages();
        } catch (error) {
            toast.error(t('create_failed'));
        }
    };

    const handleUpdateStage = async (id: number, name: string, color: string) => {
        // Optimistic update
        setStages(prev => prev.map(s => s.id === id ? { ...s, name, color } : s));

        // Debouncing could be good here, but for now simple update
        try {
            await api.put(`/api/funnel/stages/${id}`, { name, color });
        } catch (error) {
            toast.error(t('update_failed'));
            loadStages(); // Revert
        }
    };

    const handleDeleteStage = async (id: number) => {
        // In a real app we might ask where to move clients if any
        if (!confirm(t('confirm_delete_stage'))) return;

        try {
            await api.delete(`/api/funnel/stages/${id}`);
            toast.success(t('stage_deleted'));
            loadStages();
        } catch (error) {
            toast.error(t('delete_failed'));
        }
    };

    // Simple drag and drop
    const handleDragStart = (idx: number) => {
        setDraggedItem(idx);
    };

    const handleDragOver = (e: React.DragEvent, idx: number) => {
        e.preventDefault();
        if (draggedItem === null || draggedItem === idx) return;

        const newStages = [...stages];
        const item = newStages[draggedItem];
        newStages.splice(draggedItem, 1);
        newStages.splice(idx, 0, item);

        setStages(newStages);
        setDraggedItem(idx);
    };

    const handleDragEnd = async () => {
        setDraggedItem(null);
        // Save new order
        const orderedIds = stages.map(s => s.id);
        try {
            await api.post('/api/funnel/stages/reorder', { ordered_ids: orderedIds });
            toast.success(t('order_saved'));
        } catch (error) {
            toast.error(t('update_failed'));
        }
    };

    // Predefined colors
    const colors = [
        '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#6366f1', '#64748b'
    ];

    return (
        <Dialog open={open} onOpenChange={(val) => {
            onOpenChange(val);
            if (!val) onSuccess(); // Refresh parent on close
        }}>
            <DialogContent className="max-w-2xl bg-white max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>{t('manage_stages', 'Управление стадиями')}</DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-hidden flex flex-col gap-4">
                    {/* List of existing stages */}
                    <ScrollArea className="flex-1 pr-4">
                        <div className="space-y-2">
                            {stages.map((stage, idx) => (
                                <div
                                    key={stage.id}
                                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100 group"
                                    draggable
                                    onDragStart={() => handleDragStart(idx)}
                                    onDragOver={(e) => handleDragOver(e, idx)}
                                    onDragEnd={handleDragEnd}
                                >
                                    <div className="cursor-grab hover:text-gray-600 text-gray-400">
                                        <GripVertical className="w-5 h-5" />
                                    </div>

                                    <div className="flex-1 grid grid-cols-[auto_1fr] gap-3 items-center">
                                        <div className="relative group/color dropdown">
                                            <div
                                                className="w-8 h-8 rounded-full border-2 border-white shadow-sm cursor-pointer transition-transform hover:scale-110"
                                                style={{ backgroundColor: stage.color }}
                                            />
                                            {/* Simple color picker dropdown could go here, for now cycling or input */}
                                            <input
                                                type="color"
                                                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                                value={stage.color}
                                                onChange={(e) => handleUpdateStage(stage.id, stage.name, e.target.value)}
                                            />
                                        </div>

                                        <Input
                                            value={stage.name}
                                            onChange={(e) => {
                                                const newStages = [...stages];
                                                newStages[idx].name = e.target.value;
                                                setStages(newStages);
                                            }}
                                            onBlur={(e) => handleUpdateStage(stage.id, e.target.value, stage.color)}
                                            className="h-9 bg-white"
                                        />
                                    </div>

                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-gray-400 hover:text-red-500 hover:bg-red-50"
                                        onClick={() => handleDeleteStage(stage.id)}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>

                    {/* Add new stage */}
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                        <div className="text-sm font-medium text-gray-700 mb-3">{t('add_new_stage', 'Добавить новую стадию')}</div>
                        <div className="flex gap-3 items-center">
                            <div className="w-8 h-8 rounded-full flex-shrink-0 relative overflow-hidden border border-gray-200">
                                <div
                                    className="w-full h-full"
                                    style={{ backgroundColor: newStageColor }}
                                />
                                <input
                                    type="color"
                                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                    value={newStageColor}
                                    onChange={(e) => setNewStageColor(e.target.value)}
                                />
                            </div>
                            <Input
                                placeholder={t('stage_name', 'Название стадии')}
                                value={newStageName}
                                onChange={(e) => setNewStageName(e.target.value)}
                                className="bg-white"
                            />
                            <Button
                                onClick={handleAddStage}
                                disabled={!newStageName.trim()}
                                className="bg-gray-900 text-white hover:bg-gray-800"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                {t('add')}
                            </Button>
                        </div>
                        {/* Quick colors */}
                        <div className="flex gap-1 mt-3 pl-11">
                            {colors.map(c => (
                                <button
                                    key={c}
                                    className={`w-4 h-4 rounded-full border border-gray-200 hover:scale-125 transition-transform ${newStageColor === c ? 'ring-2 ring-offset-1 ring-gray-400' : ''}`}
                                    style={{ backgroundColor: c }}
                                    onClick={() => setNewStageColor(c)}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        {t('close', 'Закрыть')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
