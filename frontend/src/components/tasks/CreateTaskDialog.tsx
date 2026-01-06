
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../../components/ui/select";
import { api } from '../../services/api';
import { toast } from 'sonner';

interface Stage {
    id: number;
    name: string;
    key?: string;
}

interface Task {
    id: number;
    title: string;
    description?: string;
    stage_id: number;
    priority: 'low' | 'medium' | 'high';
    due_date?: string;
    assignee_id?: number | string;
}

interface CreateTaskDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
    stages: Stage[];
    defaultStageId?: number;
    taskToEdit?: Task | null;
}

export function CreateTaskDialog({ open, onOpenChange, onSuccess, stages, defaultStageId, taskToEdit }: CreateTaskDialogProps) {
    const { t } = useTranslation(['admin/tasks', 'common']);
    const [loading, setLoading] = useState(false);

    // Initial state setup
    const initialFormState = {
        title: '',
        description: '',
        stage_id: defaultStageId?.toString() || stages[0]?.id?.toString() || '',
        priority: 'medium',
        due_date: '',
        assignee_id: '',
    };

    const [formData, setFormData] = useState(initialFormState);

    // Update form when taskToEdit changes or dialog opens
    useEffect(() => {
        if (open) {
            if (taskToEdit) {
                setFormData({
                    title: taskToEdit.title || '',
                    description: taskToEdit.description || '',
                    stage_id: taskToEdit.stage_id?.toString() || stages[0]?.id?.toString() || '',
                    priority: taskToEdit.priority || 'medium',
                    due_date: taskToEdit.due_date ? taskToEdit.due_date.split('T')[0] : '',
                    assignee_id: taskToEdit.assignee_id?.toString() || '',
                });
            } else {
                setFormData({
                    ...initialFormState,
                    stage_id: defaultStageId?.toString() || stages[0]?.id?.toString() || ''
                });
            }
        }
    }, [open, taskToEdit, defaultStageId, stages]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const payload = {
                ...formData,
                stage_id: parseInt(formData.stage_id),
                assignee_id: formData.assignee_id ? parseInt(formData.assignee_id) : undefined,
            };

            if (taskToEdit) {
                await api.put(`/api/tasks/${taskToEdit.id}`, payload);
                toast.success(t('task_updated'));
            } else {
                await api.post('/api/tasks', payload);
                toast.success(t('task_created'));
            }

            onSuccess();
            onOpenChange(false);
        } catch (error) {
            console.error('Error saving task:', error);
            toast.error(taskToEdit ? t('update_failed') : t('create_failed'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{taskToEdit ? t('edit_task', 'Редактировать задачу') : t('create_new_task', 'Новая задача')}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="title">{t('title')}</Label>
                        <Input
                            id="title"
                            required
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">{t('description')}</Label>
                        <Textarea
                            id="description"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="stage">{t('stage', 'Стадия')}</Label>
                            <Select
                                value={formData.stage_id}
                                onValueChange={(value) => setFormData({ ...formData, stage_id: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder={t('select_stage')} />
                                </SelectTrigger>
                                <SelectContent>
                                    {stages.map((stage) => (
                                        <SelectItem key={stage.id} value={stage.id.toString()}>
                                            {stage.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="priority">{t('priority')}</Label>
                            <Select
                                value={formData.priority}
                                onValueChange={(value) => setFormData({ ...formData, priority: value })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder={t('select_priority')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="low">{t('priority.low')}</SelectItem>
                                    <SelectItem value="medium">{t('priority.medium')}</SelectItem>
                                    <SelectItem value="high">{t('priority.high')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="due_date">{t('due_date')}</Label>
                        <Input
                            id="due_date"
                            type="date"
                            value={formData.due_date}
                            onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                        />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            {t('cancel')}
                        </Button>
                        <Button type="submit" disabled={loading} className="bg-pink-600 hover:bg-pink-700 text-white">
                            {loading ? (taskToEdit ? t('saving') : t('creating')) : (taskToEdit ? t('save') : t('create'))}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
