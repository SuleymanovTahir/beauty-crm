
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
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
}

interface AddFunnelClientDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
    stages: Stage[];
}

export function AddFunnelClientDialog({ open, onOpenChange, onSuccess, stages }: AddFunnelClientDialogProps) {
    const { t } = useTranslation(['admin/funnel', 'common']);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        username: '',
        stage_id: stages[0]?.id?.toString() || '',
        notes: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            await api.post('/api/funnel/clients', {
                ...formData,
                stage_id: parseInt(formData.stage_id)
            });
            toast.success(t('client_added'));
            onSuccess();
            onOpenChange(false);
            setFormData({
                name: '',
                phone: '',
                username: '',
                stage_id: stages[0]?.id?.toString() || '',
                notes: ''
            });
        } catch (error) {
            console.error('Error adding client:', error);
            toast.error(t('add_failed'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{t('add_client_to_funnel')}</DialogTitle>
                    <DialogDescription className="sr-only">
                        {t('add_client_to_funnel_description', 'Fill in the details to add a new client to the funnel')}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">{t('name')}</Label>
                        <Input
                            id="name"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder={t('name_placeholder')}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="phone">{t('phone')}</Label>
                        <Input
                            id="phone"
                            required
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            placeholder="+7..."
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="username">{t('username')} ({t('optional')})</Label>
                        <Input
                            id="username"
                            value={formData.username}
                            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                            placeholder={t('username_placeholder')}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="stage">{t('stage')}</Label>
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
                        <Label htmlFor="notes">{t('notes')}</Label>
                        <Textarea
                            id="notes"
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            {t('cancel')}
                        </Button>
                        <Button type="submit" disabled={loading} className="bg-gradient-to-r from-pink-500 to-blue-600 text-white">
                            {loading ? t('adding') : t('add')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
