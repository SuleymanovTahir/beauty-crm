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
import { toast } from 'sonner';
import { api } from "@/services/api";;

interface FolderNode {
  id: number;
  name: string;
  parent_id: number | null;
}

interface RenameFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folder: FolderNode;
  onSuccess: () => void;
}

const RenameFolderDialog: React.FC<RenameFolderDialogProps> = ({
  open,
  onOpenChange,
  folder,
  onSuccess,
}) => {
  const { t } = useTranslation(['telephony']);
  const [name, setName] = useState(folder.name);
  const [renaming, setRenaming] = useState(false);

  useEffect(() => {
    setName(folder.name);
  }, [folder.name]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error(t('telephony:error', 'Ошибка'), {
        description: 'Введите название папки',
      });
      return;
    }

    if (name.trim() === folder.name) {
      onOpenChange(false);
      return;
    }

    try {
      setRenaming(true);
      await api.put(`/api/recordings/folders/${folder.id}`, {
        name: name.trim(),
      });

      toast.success(t('telephony:success', 'Успешно'), {
        description: 'Папка переименована',
      });

      onSuccess();
    } catch (error: any) {
      console.error('Failed to rename folder:', error);
      toast.error(t('telephony:error', 'Ошибка'), {
        description: error.response?.data?.detail || 'Не удалось переименовать папку',
      });
    } finally {
      setRenaming(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t('telephony:rename_folder', 'Переименовать папку')}</DialogTitle>
            <DialogDescription>
              Введите новое название для папки "{folder.name}"
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="folder-name">
                {t('telephony:folder_name', 'Название папки')}
              </Label>
              <Input
                id="folder-name"
                placeholder={t('telephony:folder_name_placeholder', 'Введите название папки')}
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={renaming}
            >
              {t('common:cancel', 'Отмена')}
            </Button>
            <Button type="submit" disabled={renaming}>
              {renaming ? t('common:saving', 'Сохранение...') : t('common:save', 'Сохранить')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default RenameFolderDialog;
