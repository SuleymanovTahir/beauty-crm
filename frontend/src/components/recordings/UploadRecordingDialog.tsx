import React, { useState, useRef } from 'react';
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
import { Upload } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

interface FolderNode {
  id: number;
  name: string;
  parent_id: number | null;
  children?: FolderNode[];
}

interface UploadRecordingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folders: FolderNode[];
  defaultFolderId?: number | null;
  onSuccess: () => void;
}

const UploadRecordingDialog: React.FC<UploadRecordingDialogProps> = ({
  open,
  onOpenChange,
  folders,
  defaultFolderId,
  onSuccess,
}) => {
  const { t } = useTranslation(['telephony']);
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [folderId, setFolderId] = useState<number | null>(defaultFolderId || null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/m4a', 'audio/webm'];
    if (!allowedTypes.includes(selectedFile.type) && !selectedFile.name.match(/\.(mp3|wav|ogg|m4a|webm)$/i)) {
      toast.error(t('telephony:error', 'Ошибка'), {
        description: 'Поддерживаемые форматы: mp3, wav, ogg, m4a, webm',
      });
      return;
    }

    // Validate file size (max 100MB)
    const maxSize = 100 * 1024 * 1024;
    if (selectedFile.size > maxSize) {
      toast.error(t('telephony:error', 'Ошибка'), {
        description: 'Размер файла не должен превышать 100 МБ',
      });
      return;
    }

    setFile(selectedFile);

    // Auto-generate name from filename if not set
    if (!name) {
      const baseName = selectedFile.name.replace(/\.[^/.]+$/, '');
      setName(baseName);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file) {
      toast.error(t('telephony:error', 'Ошибка'), {
        description: 'Выберите файл для загрузки',
      });
      return;
    }

    if (!name.trim()) {
      toast.error(t('telephony:error', 'Ошибка'), {
        description: 'Введите название записи',
      });
      return;
    }

    try {
      setUploading(true);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('custom_name', name.trim());
      if (folderId) {
        formData.append('folder_id', folderId.toString());
      }

      await axios.post('/api/internal-chat/upload-recording', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      toast.success(t('telephony:success', 'Успешно'), {
        description: 'Запись загружена',
      });

      // Reset form
      setFile(null);
      setName('');
      setFolderId(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      onSuccess();
    } catch (error: any) {
      console.error('Failed to upload recording:', error);
      toast.error(t('telephony:error', 'Ошибка'), {
        description: error.response?.data?.detail || 'Не удалось загрузить запись',
      });
    } finally {
      setUploading(false);
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
            <DialogTitle>{t('telephony:upload_recording', 'Загрузить запись')}</DialogTitle>
            <DialogDescription>
              Загрузите аудио файл и укажите название
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="file">Файл записи</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="file"
                  ref={fileInputRef}
                  type="file"
                  accept=".mp3,.wav,.ogg,.m4a,.webm,audio/*"
                  onChange={handleFileChange}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4" />
                </Button>
              </div>
              {file && (
                <p className="text-xs text-muted-foreground">
                  Выбран файл: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} МБ)
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="recording-name">Название</Label>
              <Input
                id="recording-name"
                placeholder="Введите название записи"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="folder">
                {t('telephony:select_folder', 'Выберите папку')}
              </Label>
              <Select
                value={folderId?.toString() || 'none'}
                onValueChange={(value) => setFolderId(value === 'none' ? null : parseInt(value))}
              >
                <SelectTrigger id="folder">
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
              disabled={uploading}
            >
              {t('common:cancel', 'Отмена')}
            </Button>
            <Button type="submit" disabled={uploading}>
              {uploading ? 'Загрузка...' : 'Загрузить'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default UploadRecordingDialog;
