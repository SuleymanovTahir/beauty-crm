import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Folder, FolderOpen, Plus, Upload, Search, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import axios from 'axios';
import FolderTree from './FolderTree';
import RecordingsList from './RecordingsList';
import CreateFolderDialog from './CreateFolderDialog';
import UploadRecordingDialog from './UploadRecordingDialog';
import RecordingFilters from './RecordingFilters';

interface RecordingsManagerProps {
  type?: 'all' | 'telephony' | 'chat';
}

interface FolderNode {
  id: number;
  name: string;
  parent_id: number | null;
  created_by: number;
  created_at: string;
  is_deleted: boolean;
  sort_order: number;
  color?: string;
  icon?: string;
  children?: FolderNode[];
  recording_count?: number;
}

interface Recording {
  id: number;
  type: 'telephony' | 'chat';
  custom_name: string;
  recording_url?: string;
  recording_file?: string;
  duration?: number;
  file_size?: number;
  file_format?: string;
  created_at: string;
  folder_id?: number;
  folder_name?: string;
  is_archived: boolean;
  tags?: string[];
  notes?: string;
  // For telephony
  client_name?: string;
  manager_name?: string;
  phone?: string;
  // For chat
  sender_id?: number;
  sender_name?: string;
  receiver_id?: number;
  receiver_name?: string;
  recording_type?: 'audio' | 'video';
}

interface Filters {
  search: string;
  date_from?: string;
  date_to?: string;
  tags?: string[];
  sort_by: 'name' | 'date' | 'duration';
  order: 'asc' | 'desc';
}

const RecordingsManager: React.FC<RecordingsManagerProps> = ({ type = 'all' }) => {
  const { t } = useTranslation(['telephony']);
  const [folders, setFolders] = useState<FolderNode[]>([]);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [recordingsLoading, setRecordingsLoading] = useState(false);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [showUploadRecording, setShowUploadRecording] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    search: '',
    sort_by: 'date',
    order: 'desc',
  });

  // Load folders on mount
  useEffect(() => {
    loadFolders();
  }, []);

  // Load recordings when folder or filters change
  useEffect(() => {
    if (!loading) {
      loadRecordings();
    }
  }, [selectedFolderId, filters]);

  const loadFolders = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/recordings/folders');
      setFolders(response.data.folders || []);

      // Auto-select first folder if none selected
      if (!selectedFolderId && response.data.folders?.length > 0) {
        setSelectedFolderId(response.data.folders[0].id);
      }
    } catch (error: any) {
      console.error('Failed to load folders:', error);
      toast.error(t('telephony:error', 'Ошибка'), {
        description: error.response?.data?.detail || 'Не удалось загрузить папки',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadRecordings = async () => {
    try {
      setRecordingsLoading(true);
      const params: any = {
        type,
        folder_id: selectedFolderId,
        search: filters.search || undefined,
        date_from: filters.date_from || undefined,
        date_to: filters.date_to || undefined,
        tags: filters.tags?.join(',') || undefined,
        sort_by: filters.sort_by,
        order: filters.order,
      };

      const response = await axios.get('/api/recordings', { params });
      setRecordings(response.data.recordings || []);
    } catch (error: any) {
      console.error('Failed to load recordings:', error);
      toast.error(t('telephony:error', 'Ошибка'), {
        description: error.response?.data?.detail || 'Не удалось загрузить записи',
      });
    } finally {
      setRecordingsLoading(false);
    }
  };

  const handleFolderSelect = (folderId: number | null) => {
    setSelectedFolderId(folderId);
  };

  const handleFolderCreated = () => {
    loadFolders();
    setShowCreateFolder(false);
  };

  const handleFolderUpdated = () => {
    loadFolders();
  };

  const handleFolderDeleted = () => {
    loadFolders();
    if (selectedFolderId) {
      setSelectedFolderId(null);
    }
  };

  const handleRecordingUploaded = () => {
    loadRecordings();
    setShowUploadRecording(false);
  };

  const handleRecordingUpdated = () => {
    loadRecordings();
  };

  const handleRecordingDeleted = () => {
    loadRecordings();
  };

  const handleRecordingMoved = () => {
    loadRecordings();
    loadFolders(); // Reload folders to update counts
  };

  const handleSearchChange = (value: string) => {
    setFilters((prev) => ({ ...prev, search: value }));
  };

  const handleFiltersChange = (newFilters: Partial<Filters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  };

  const selectedFolder = folders.find((f) => f.id === selectedFolderId);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with actions */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 flex items-center gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('telephony:search_recordings', 'Поиск записей...')}
              value={filters.search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowFilters(!showFilters)}
            className={showFilters ? 'bg-accent' : ''}
          >
            <SlidersHorizontal className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCreateFolder(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            {t('telephony:create_folder', 'Создать папку')}
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={() => setShowUploadRecording(true)}
          >
            <Upload className="h-4 w-4 mr-2" />
            {t('telephony:upload_recording', 'Загрузить запись')}
          </Button>
        </div>
      </div>

      {/* Filters panel */}
      {showFilters && (
        <RecordingFilters
          filters={filters}
          onChange={handleFiltersChange}
        />
      )}

      {/* Main content: Folder tree + Recordings list */}
      <div className="grid grid-cols-12 gap-4">
        {/* Left sidebar: Folder tree */}
        <Card className="col-span-3 p-4">
          <div className="mb-4">
            <h3 className="font-semibold text-sm text-muted-foreground">
              {t('telephony:select_folder', 'Выберите папку')}
            </h3>
          </div>
          <ScrollArea className="h-[600px]">
            <FolderTree
              folders={folders}
              selectedFolderId={selectedFolderId}
              onFolderSelect={handleFolderSelect}
              onFolderCreated={handleFolderCreated}
              onFolderUpdated={handleFolderUpdated}
              onFolderDeleted={handleFolderDeleted}
            />
          </ScrollArea>
        </Card>

        {/* Right content: Recordings list */}
        <div className="col-span-9">
          <RecordingsList
            recordings={recordings}
            loading={recordingsLoading}
            selectedFolder={selectedFolder}
            folders={folders}
            onRecordingUpdated={handleRecordingUpdated}
            onRecordingDeleted={handleRecordingDeleted}
            onRecordingMoved={handleRecordingMoved}
          />
        </div>
      </div>

      {/* Dialogs */}
      {showCreateFolder && (
        <CreateFolderDialog
          open={showCreateFolder}
          onOpenChange={setShowCreateFolder}
          folders={folders}
          parentFolderId={selectedFolderId}
          onSuccess={handleFolderCreated}
        />
      )}

      {showUploadRecording && (
        <UploadRecordingDialog
          open={showUploadRecording}
          onOpenChange={setShowUploadRecording}
          folders={folders}
          defaultFolderId={selectedFolderId}
          onSuccess={handleRecordingUploaded}
        />
      )}
    </div>
  );
};

export default RecordingsManager;
