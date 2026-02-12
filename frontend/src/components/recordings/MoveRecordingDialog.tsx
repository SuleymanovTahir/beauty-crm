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
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { api } from "@/services/api";

interface FolderNode {
  id: number;
  name: string;
  parent_id: number | null;
  children?: FolderNode[];
}

interface Recording {
  id: number;
  source?: 'telephony' | 'chat';
  type?: 'telephony' | 'chat';
  custom_name: string;
  folder_id?: number;
}

interface MoveRecordingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recording: Recording;
  folders: FolderNode[];
  onSuccess: () => void;
}

const MoveRecordingDialog: React.FC<MoveRecordingDialogProps> = ({
  open,
  onOpenChange,
  recording,
  folders,
  onSuccess,
}) => {
  const { t } = useTranslation(['telephony']);
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(
    recording.folder_id !== undefined ? recording.folder_id : null
  );
  const [moving, setMoving] = useState(false);

  useEffect(() => {
    setSelectedFolderId(recording.folder_id !== undefined ? recording.folder_id : null);
  }, [recording]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedFolderId === recording.folder_id) {
      onOpenChange(false);
      return;
    }

    try {
      setMoving(true);
      const isChatSource = recording.source === 'chat';
      const isChatType = recording.type === 'chat';
      const source = isChatSource ? 'chat' : (isChatType ? 'chat' : 'telephony');

      await api.put(`/api/recordings/${source}/${recording.id}`, {
        folder_id: selectedFolderId,
      });

      toast.success(t('telephony:success', 'Успешно'), {
        description: 'Запись перемещена',
      });

      onSuccess();
    } catch (error: any) {
      console.error('Failed to move recording:', error);
      toast.error(t('telephony:error', 'Ошибка'), {
        description: error.response?.data?.detail || 'Не удалось переместить запись',
      });
    } finally {
      setMoving(false);
    }
  };

  // Flatten folders for select
  const flattenFolders = (
    folders: FolderNode[],
    level = 0
  ): { id: number; name: string; level: number }[] => {
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
            <DialogTitle>{t('telephony:move_to_folder', 'Переместить в папку')}</DialogTitle>
            <DialogDescription>
              Выберите папку для перемещения записи "{recording.custom_name}"
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="target-folder">
                {t('telephony:select_folder', 'Выберите папку')}
              </Label>
              <Select
                value={selectedFolderId !== null ? selectedFolderId.toString() : 'none'}
                onValueChange={(value) =>
                  setSelectedFolderId(value === 'none' ? null : parseInt(value))
                }
              >
                <SelectTrigger id="target-folder">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Без папки</SelectItem>
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
              disabled={moving}
            >
              {t('common:cancel', 'Отмена')}
            </Button>
            <Button type="submit" disabled={moving}>
              {moving ? 'Перемещение...' : 'Переместить'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default MoveRecordingDialog;
