import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Loader2,
  Play,
  Pause,
  Download,
  Edit,
  Trash2,
  FolderInput,
  MoreVertical,
  Phone,
  MessageSquare,
  Archive,
  ArchiveRestore,
} from 'lucide-react';
import { Button } from '@crm/components/ui/button';
import { Card } from '@crm/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@crm/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@crm/components/ui/alert-dialog';
import { toast } from 'sonner';
import { api } from "@crm/services/api";
import RenameRecordingDialog from './RenameRecordingDialog';
import MoveRecordingDialog from './MoveRecordingDialog';

interface FolderNode {
  id: number;
  name: string;
  parent_id: number | null;
}

interface Recording {
  id: number;
  source?: 'telephony' | 'chat';
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
  client_name?: string;
  manager_name?: string;
  phone?: string;
  sender_id?: number;
  sender_name?: string;
  receiver_id?: number;
  receiver_name?: string;
  recording_type?: 'audio' | 'video';
}

interface RecordingsListProps {
  recordings: Recording[];
  loading: boolean;
  selectedFolder?: FolderNode;
  folders: FolderNode[];
  onRecordingUpdated: () => void;
  onRecordingDeleted: () => void;
  onRecordingMoved: () => void;
}

const RecordingsList: React.FC<RecordingsListProps> = ({
  recordings,
  loading,
  selectedFolder,
  folders,
  onRecordingUpdated,
  onRecordingDeleted,
  onRecordingMoved,
}) => {
  const { t } = useTranslation(['telephony']);
  const [playingId, setPlayingId] = useState<number | null>(null);
  const [selectedRecording, setSelectedRecording] = useState<Recording | null>(null);
  const [showRename, setShowRename] = useState(false);
  const [showMove, setShowMove] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [archiving, setArchiving] = useState(false);

  const formatDuration = (seconds?: number): string => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '--';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const getRecordingUrl = (recording: Recording): string | null => {
    if (recording.recording_url) {
      return recording.recording_url;
    }
    if (recording.recording_file) {
      return `/static/recordings/${recording.recording_file}`;
    }
    return null;
  };

  const handlePlayPause = (recording: Recording) => {
    if (playingId === recording.id) {
      setPlayingId(null);
    } else {
      setPlayingId(recording.id);
    }
  };

  const handleDownload = (recording: Recording) => {
    const url = getRecordingUrl(recording);
    if (!url) return;

    const link = document.createElement('a');
    link.href = url;
    link.download = `${recording.custom_name}.${recording.file_format || 'mp3'}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success(t('telephony:success', 'Успешно'), {
      description: 'Запись скачивается',
    });
  };

  const handleArchive = async (recording: Recording) => {
    try {
      setArchiving(true);
      const source = recording.source === 'chat' ? 'chat' : 'telephony';
      const archiveState = !recording.is_archived;
      await api.post(`/api/recordings/${source}/${recording.id}/archive?is_archived=${archiveState}`);

      toast.success(t('telephony:success', 'Успешно'), {
        description: recording.is_archived ? 'Запись разархивирована' : 'Запись архивирована',
      });

      onRecordingUpdated();
    } catch (error: any) {
      console.error('Failed to archive recording:', error);
      toast.error(t('telephony:error', 'Ошибка'), {
        description: error.response?.data?.detail || 'Не удалось выполнить операцию',
      });
    } finally {
      setArchiving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedRecording) return;

    try {
      setDeleting(true);
      const source = selectedRecording.source === 'chat' ? 'chat' : 'telephony';
      await api.delete(`/api/recordings/${source}/${selectedRecording.id}`);

      toast.success(t('telephony:success', 'Успешно'), {
        description: 'Запись удалена',
      });

      onRecordingDeleted();
    } catch (error: any) {
      console.error('Failed to delete recording:', error);
      toast.error(t('telephony:error', 'Ошибка'), {
        description: error.response?.data?.detail || 'Не удалось удалить запись',
      });
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
      setSelectedRecording(null);
    }
  };

  const openRename = (recording: Recording) => {
    setSelectedRecording(recording);
    setShowRename(true);
  };

  const openMove = (recording: Recording) => {
    setSelectedRecording(recording);
    setShowMove(true);
  };

  const openDelete = (recording: Recording) => {
    setSelectedRecording(recording);
    setShowDeleteConfirm(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (recordings.length === 0) {
    return (
      <Card className="p-12">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 text-muted-foreground mb-4">
            {selectedFolder ? <FolderInput className="h-12 w-12" /> : <Archive className="h-12 w-12" />}
          </div>
          <h3 className="text-lg font-semibold mb-2">
            {t('telephony:no_recordings', 'Нет записей')}
          </h3>
          <p className="text-sm text-muted-foreground">
            {selectedFolder
              ? t('telephony:no_recordings_in_folder', 'В этой папке пока нет записей')
              : 'Загрузите записи или выберите папку'}
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {recordings.map((recording) => {
        const recordingUrl = getRecordingUrl(recording);
        const isPlaying = playingId === recording.id;
        const recordingSource = recording.source === 'chat' ? 'chat' : recording.type;

        return (
          <Card key={recording.id} className="p-4">
            <div className="flex items-start gap-4">
              {/* Type icon */}
              <div className="flex-shrink-0">
                {recordingSource === 'telephony' ? (
                  <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                    <Phone className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                ) : (
                  <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                    <MessageSquare className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                )}
              </div>

              {/* Recording info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium truncate">{recording.custom_name}</h4>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span>{formatDate(recording.created_at)}</span>
                      <span>•</span>
                      <span>{formatDuration(recording.duration)}</span>
                      <span>•</span>
                      <span>{formatFileSize(recording.file_size)}</span>
                      {recording.file_format && (
                        <>
                          <span>•</span>
                          <span className="uppercase">{recording.file_format}</span>
                        </>
                      )}
                    </div>
                    {recording.notes && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {recording.notes}
                      </p>
                    )}
                  </div>

                  {/* Actions menu */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleDownload(recording)}>
                        <Download className="h-4 w-4 mr-2" />
                        {t('telephony:download_recording', 'Скачать запись')}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openRename(recording)}>
                        <Edit className="h-4 w-4 mr-2" />
                        {t('telephony:rename_recording', 'Переименовать')}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openMove(recording)}>
                        <FolderInput className="h-4 w-4 mr-2" />
                        {t('telephony:move_to_folder', 'Переместить в папку')}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleArchive(recording)} disabled={archiving}>
                        {recording.is_archived ? (
                          <>
                            <ArchiveRestore className="h-4 w-4 mr-2" />
                            {t('telephony:unarchive_recording', 'Разархивировать')}
                          </>
                        ) : (
                          <>
                            <Archive className="h-4 w-4 mr-2" />
                            {t('telephony:archive_recording', 'Архивировать')}
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => openDelete(recording)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {t('telephony:delete_recording', 'Удалить запись')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Audio player */}
                {recordingUrl && (
                  <div className="flex items-center gap-2 mt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePlayPause(recording)}
                    >
                      {isPlaying ? (
                        <Pause className="h-3 w-3 mr-1" />
                      ) : (
                        <Play className="h-3 w-3 mr-1" />
                      )}
                      {isPlaying
                        ? t('telephony:pause_recording', 'Пауза')
                        : t('telephony:play_recording', 'Воспроизвести')}
                    </Button>
                    {isPlaying && (
                      <audio
                        src={recordingUrl}
                        autoPlay
                        controls
                        className="flex-1 h-8"
                        onEnded={() => setPlayingId(null)}
                      />
                    )}
                  </div>
                )}

                {/* Tags */}
                {recording.tags && recording.tags.length > 0 && (
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {recording.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-secondary text-secondary-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Card>
        );
      })}

      {/* Dialogs */}
      {selectedRecording && showRename && (
        <RenameRecordingDialog
          open={showRename}
          onOpenChange={setShowRename}
          recording={selectedRecording}
          onSuccess={() => {
            setShowRename(false);
            setSelectedRecording(null);
            onRecordingUpdated();
          }}
        />
      )}

      {selectedRecording && showMove && (
        <MoveRecordingDialog
          open={showMove}
          onOpenChange={setShowMove}
          recording={selectedRecording}
          folders={folders}
          onSuccess={() => {
            setShowMove(false);
            setSelectedRecording(null);
            onRecordingMoved();
          }}
        />
      )}

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('telephony:delete_recording', 'Удалить запись')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                'telephony:delete_recording_confirm',
                'Вы уверены, что хотите удалить эту запись? Это действие необратимо.'
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common:cancel', 'Отмена')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting}>
              {deleting ? t('common:deleting', 'Удаление...') : t('common:delete', 'Удалить')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default RecordingsList;
