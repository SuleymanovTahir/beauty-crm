
import React, { useState } from 'react';
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../../components/ui/select";
import { api } from '../../services/api';
import { toast } from 'sonner';

interface AddStageDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export function AddStageDialog({ open, onOpenChange, onSuccess }: AddStageDialogProps) {
    const { t } = useTranslation(['admin/tasks', 'common']);
    const [loading, setLoading] = useState(false);
    const [name, setName] = useState('');
    const [color, setColor] = useState('bg-gray-500');

    const colors = [
        { name: 'Gray', value: 'bg-gray-500' },
        { name: 'Blue', value: 'bg-blue-500' },
        { name: 'Green', value: 'bg-green-500' },
        { name: 'Yellow', value: 'bg-yellow-500' },
        { name: 'Red', value: 'bg-red-500' },
        { name: 'Purple', value: 'bg-purple-500' },
        { name: 'Pink', value: 'bg-pink-500' },
        { name: 'Orange', value: 'bg-orange-500' },
    ];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            await api.post('/api/tasks/stages', {
                name,
                color
            });
            toast.success(t('stage_created'));
            onSuccess();
            onOpenChange(false);
            setName('');
            setColor('bg-gray-500');
        } catch (error) {
            console.error('Error creating stage:', error);
            toast.error(t('create_failed'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{t('add_new_stage', 'Новая стадия')}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">{t('name')}</Label>
                        <Input
                            id="name"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder={t('stage_name_placeholder', 'Например: Review')}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="color">{t('color')}</Label>
                        <Select value={color} onValueChange={setColor}>
                            <SelectTrigger>
                                <SelectValue placeholder={t('select_color')} />
                            </SelectTrigger>
                            <SelectContent>
                                {colors.map((c) => (
                                    <SelectItem key={c.value} value={c.value}>
                                        <div className="flex items-center gap-2">
                                            <div className={`w-4 h-4 rounded-full ${c.value}`} />
                                            {c.name}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            {t('cancel')}
                        </Button>
                        <Button type="submit" disabled={loading} className="bg-gradient-to-r from-pink-500 to-purple-600 text-white">
                            {loading ? t('creating') : t('create')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
