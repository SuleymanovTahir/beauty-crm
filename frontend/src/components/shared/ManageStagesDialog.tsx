
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { ScrollArea } from '../ui/scroll-area';
import { api } from '../../services/api';
import { toast } from 'sonner';
import { Trash2, GripVertical, Plus } from 'lucide-react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "../ui/alert-dialog";

interface Stage {
    id: number;
    name: string;
    color: string;
    order_index: number;
    key?: string;
}

interface ManageStagesDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
    apiUrl: string;
    title?: string;
}

export function ManageStagesDialog({ open, onOpenChange, onSuccess, apiUrl, title }: ManageStagesDialogProps) {
    const { t } = useTranslation(['common']);
    const [stages, setStages] = useState<Stage[]>([]);
    const [loading, setLoading] = useState(false);
    const [draggedItem, setDraggedItem] = useState<number | null>(null);

    // New stage state
    const [newStageName, setNewStageName] = useState('');
    const [newStageColor, setNewStageColor] = useState('#6b7280'); // gray-500

    // Delete confirmation
    const [deleteId, setDeleteId] = useState<number | null>(null);

    useEffect(() => {
        if (open) {
            loadStages();
        }
    }, [open]);

    const loadStages = async () => {
        setLoading(true);
        try {
            const data = await api.get(apiUrl);
            setStages(data.sort((a: Stage, b: Stage) => a.order_index - b.order_index));
        } catch (error) {
            toast.error(t('failed_to_load_stages'));
        } finally {
            setLoading(false);
        }
    };

    const handleAddStage = async () => {
        if (!newStageName.trim()) return;
        try {
            await api.post(apiUrl, {
                name: newStageName,
                color: newStageColor,
                order_index: stages.length
            });
            setNewStageName('');
            loadStages();
            toast.success(t('stage_created'));
        } catch (error) {
            toast.error(t('create_failed'));
        }
    };

    const handleUpdateStage = async (id: number, name: string, color: string) => {
        setStages(prev => prev.map(s => s.id === id ? { ...s, name, color } : s));
        try {
            await api.put(`${apiUrl}/${id}`, { name, color });
        } catch (error) {
            toast.error(t('update_failed'));
            loadStages();
        }
    };

    const handleDeleteStage = async (id: number) => {
        setDeleteId(id);
    };

    const confirmDelete = async () => {
        if (!deleteId) return;
        try {
            await api.delete(`${apiUrl}/${deleteId}`);
            setDeleteId(null);
            loadStages();
            toast.success(t('stage_deleted'));
        } catch (error) {
            toast.error(t('delete_failed'));
        }
    };

    const handleDragStart = (e: React.DragEvent, index: number) => {
        setDraggedItem(index);
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        if (draggedItem === null || draggedItem === index) return;

        const newStages = [...stages];
        const draggedStage = newStages[draggedItem];
        newStages.splice(draggedItem, 1);
        newStages.splice(index, 0, draggedStage);

        setStages(newStages);
        setDraggedItem(index);
    };

    const handleDragEnd = async () => {
        setDraggedItem(null);
        const orderedIds = stages.map(s => s.id);
        try {
            await api.post(`${apiUrl}/reorder`, { ordered_ids: orderedIds });
        } catch (error) {
            toast.error(t('update_failed'));
            loadStages();
        }
    };

    const quickColors = [
        '#ef4444', '#f97316', '#f59e0b', '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280',
    ];

    return (
        <>
            <Dialog open={open} onOpenChange={(val) => {
                onOpenChange(val);
                if (!val) onSuccess();
            }}>
                <DialogContent className="max-w-2xl bg-white max-h-[80vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>{title || t('manage_stages')}</DialogTitle>
                    </DialogHeader>

                    <div className="flex-1 overflow-hidden flex flex-col gap-4">
                        <ScrollArea className="flex-1 pr-4">
                            <div className="space-y-2">
                                {stages.map((stage, idx) => (
                                    <div
                                        key={stage.id}
                                        className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100 group"
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, idx)}
                                        onDragOver={(e) => handleDragOver(e, idx)}
                                        onDragEnd={handleDragEnd}
                                    >
                                        <div className="cursor-grab hover:text-gray-600 text-gray-400">
                                            <GripVertical className="w-5 h-5" />
                                        </div>

                                        <div className="flex-1 grid grid-cols-[auto_1fr] gap-3 items-center">
                                            <div className="relative group/color">
                                                <div
                                                    className="w-8 h-8 rounded-full border-2 border-white shadow-sm cursor-pointer transition-transform hover:scale-110"
                                                    style={{ backgroundColor: stage.color }}
                                                />
                                                <input
                                                    type="color"
                                                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                                    value={stage.color.startsWith('#') ? stage.color : '#808080'}
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

                        <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                            <div className="text-sm font-medium text-gray-700 mb-3">{t('add_new_stage')}</div>
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
                                    placeholder={t('stage_name')}
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
                                    {t('create')}
                                </Button>
                            </div>
                            <div className="flex gap-1 mt-3 pl-11">
                                {quickColors.map(c => (
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
                            {t('close')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={!!deleteId} onOpenChange={(val) => !val && setDeleteId(null)}>
                <AlertDialogContent className="bg-white">
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('are_you_sure')}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t('confirm_delete_stage')}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700 text-white">
                            {t('delete')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
