import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import axios from 'axios';

interface Recording {
  id: number;
  custom_name: string;
  notes?: string;
}

interface RenameRecordingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recording: Recording;
  onSuccess: () => void;
}

const RenameRecordingDialog: React.FC<RenameRecordingDialogProps> = ({
  open,
  onOpenChange,
  recording,
  onSuccess,
}) => {
  const { t } = useTranslation(['telephony']);
  const [name, setName] = useState(recording.custom_name);
  const [notes, setNotes] = useState(recording.notes || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(recording.custom_name);
    setNotes(recording.notes || '');
  }, [recording]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error(t('telephony:error', 'Ошибка'), {
        description: 'Введите название записи',
      });
      return;
    }

    try {
      setSaving(true);
      await axios.put(`/api/recordings/${recording.id}`, {
        custom_name: name.trim(),
        notes: notes.trim() || null,
      });

      toast.success(t('telephony:success', 'Успешно'), {
        description: 'Запись обновлена',
      });

      onSuccess();
    } catch (error: any) {
      console.error('Failed to update recording:', error);
      toast.error(t('telephony:error', 'Ошибка'), {
        description: error.response?.data?.detail || 'Не удалось обновить запись',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t('telephony:rename_recording', 'Переименовать запись')}</DialogTitle>
            <DialogDescription>
              Измените название и заметки для этой записи
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="recording-name">Название</Label>
              <Input
                id="recording-name"
                placeholder="Введите название записи"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="recording-notes">
                {t('telephony:notes', 'Заметки')}
              </Label>
              <Textarea
                id="recording-notes"
                placeholder={t('telephony:notes_placeholder', 'Введите заметки...')}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              {t('common:cancel', 'Отмена')}
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? t('common:saving', 'Сохранение...') : t('common:save', 'Сохранить')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default RenameRecordingDialog;
