import React, { useState } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { api } from "@/services/api";;

interface FolderNode {
  id: number;
  name: string;
  parent_id: number | null;
  children?: FolderNode[];
}

interface CreateFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folders: FolderNode[];
  parentFolderId?: number | null;
  onSuccess: () => void;
}

const CreateFolderDialog: React.FC<CreateFolderDialogProps> = ({
  open,
  onOpenChange,
  folders,
  parentFolderId,
  onSuccess,
}) => {
  const { t } = useTranslation(['telephony']);
  const [name, setName] = useState('');
  const [selectedParentId, setSelectedParentId] = useState<number | null>(parentFolderId || null);
  const [creating, setCreating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error(t('telephony:error', 'Ошибка'), {
        description: 'Введите название папки',
      });
      return;
    }

    try {
      setCreating(true);
      await api.post('/api/recordings/folders', {
        name: name.trim(),
        parent_id: selectedParentId,
      });

      toast.success(t('telephony:success', 'Успешно'), {
        description: 'Папка создана',
      });

      setName('');
      setSelectedParentId(null);
      onSuccess();
    } catch (error: any) {
      console.error('Failed to create folder:', error);
      toast.error(t('telephony:error', 'Ошибка'), {
        description: error.response?.data?.detail || 'Не удалось создать папку',
      });
    } finally {
      setCreating(false);
    }
  };

  // Flatten folders for select
  const flattenFolders = (folders: FolderNode[], level = 0): { id: number; name: string; level: number }[] => {
    const result: { id: number; name: string; level: number }[] = [];
    folders.forEach((folder) => {
      result.push({ id: folder.id, name: folder.name, level });
      if (folder.children && folder.children.length > 0) {
        result.push(...flattenFolders(folder.children, level + 1));
      }
    });
    return result;
  };

  const flatFolders = flattenFolders(folders);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t('telephony:create_folder', 'Создать папку')}</DialogTitle>
            <DialogDescription>
              Создайте новую папку для организации записей
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

            <div className="space-y-2">
              <Label htmlFor="parent-folder">
                {t('telephony:parent_folder', 'Родительская папка')}
              </Label>
              <Select
                value={selectedParentId?.toString() || 'root'}
                onValueChange={(value) =>
                  setSelectedParentId(value === 'root' ? null : parseInt(value))
                }
              >
                <SelectTrigger id="parent-folder">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="root">
                    {t('telephony:root_folder', 'Корневая папка')}
                  </SelectItem>
                  {flatFolders.map((folder) => (
                    <SelectItem key={folder.id} value={folder.id.toString()}>
                      {'  '.repeat(folder.level) + folder.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={creating}
            >
              {t('common:cancel', 'Отмена')}
            </Button>
            <Button type="submit" disabled={creating}>
              {creating ? t('common:creating', 'Создание...') : t('common:create', 'Создать')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateFolderDialog;
