import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  MoreVertical,
  Edit,
  Trash2,
  FolderPlus,
} from 'lucide-react';
import { Button } from '@crm/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import CreateFolderDialog from './CreateFolderDialog';
import RenameFolderDialog from './RenameFolderDialog';

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

interface FolderTreeProps {
  folders: FolderNode[];
  selectedFolderId: number | null;
  onFolderSelect: (folderId: number | null) => void;
  onFolderCreated: () => void;
  onFolderUpdated: () => void;
  onFolderDeleted: () => void;
}

interface FolderItemProps {
  folder: FolderNode;
  level: number;
  selectedFolderId: number | null;
  onFolderSelect: (folderId: number | null) => void;
  onFolderCreated: () => void;
  onFolderUpdated: () => void;
  onFolderDeleted: () => void;
}

const FolderItem: React.FC<FolderItemProps> = ({
  folder,
  level,
  selectedFolderId,
  onFolderSelect,
  onFolderCreated,
  onFolderUpdated,
  onFolderDeleted,
}) => {
  const { t } = useTranslation(['telephony']);
  const [expanded, setExpanded] = useState(true);
  const [showCreateSubfolder, setShowCreateSubfolder] = useState(false);
  const [showRename, setShowRename] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const hasChildren = folder.children && folder.children.length > 0;
  const isSelected = selectedFolderId === folder.id;

  const handleDelete = async () => {
    try {
      setDeleting(true);
      await api.delete(`/api/recordings/folders/${folder.id}`);
      toast.success(t('telephony:success', 'Успешно'), {
        description: 'Папка удалена',
      });
      onFolderDeleted();
    } catch (error: any) {
      console.error('Failed to delete folder:', error);
      toast.error(t('telephony:error', 'Ошибка'), {
        description: error.response?.data?.detail || 'Не удалось удалить папку',
      });
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div>
      <div
        className={`
          flex items-center gap-1 py-1.5 px-2 rounded-md cursor-pointer group
          hover:bg-accent/50 transition-colors
          ${isSelected ? 'bg-accent' : ''}
        `}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
      >
        {/* Expand/collapse button */}
        {hasChildren ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 p-0"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
          >
            {expanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </Button>
        ) : (
          <div className="h-5 w-5" />
        )}

        {/* Folder icon */}
        <div onClick={() => onFolderSelect(folder.id)} className="flex items-center gap-2 flex-1">
          {isSelected || expanded ? (
            <FolderOpen className="h-4 w-4 text-primary flex-shrink-0" />
          ) : (
            <Folder className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          )}
          <span className={`text-sm truncate ${isSelected ? 'font-medium' : ''}`}>
            {folder.name}
          </span>
          {folder.recording_count !== undefined && folder.recording_count > 0 && (
            <span className="text-xs text-muted-foreground">({folder.recording_count})</span>
          )}
        </div>

        {/* Actions menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setShowCreateSubfolder(true)}>
              <FolderPlus className="h-4 w-4 mr-2" />
              {t('telephony:create_folder', 'Создать папку')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowRename(true)}>
              <Edit className="h-4 w-4 mr-2" />
              {t('telephony:rename_folder', 'Переименовать')}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setShowDeleteConfirm(true)}
              className="text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {t('telephony:delete_folder', 'Удалить папку')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Children folders */}
      {hasChildren && expanded && (
        <div>
          {folder.children!.map((child) => (
            <FolderItem
              key={child.id}
              folder={child}
              level={level + 1}
              selectedFolderId={selectedFolderId}
              onFolderSelect={onFolderSelect}
              onFolderCreated={onFolderCreated}
              onFolderUpdated={onFolderUpdated}
              onFolderDeleted={onFolderDeleted}
            />
          ))}
        </div>
      )}

      {/* Dialogs */}
      {showCreateSubfolder && (
        <CreateFolderDialog
          open={showCreateSubfolder}
          onOpenChange={setShowCreateSubfolder}
          folders={[]}
          parentFolderId={folder.id}
          onSuccess={() => {
            setShowCreateSubfolder(false);
            onFolderCreated();
          }}
        />
      )}

      {showRename && (
        <RenameFolderDialog
          open={showRename}
          onOpenChange={setShowRename}
          folder={folder}
          onSuccess={() => {
            setShowRename(false);
            onFolderUpdated();
          }}
        />
      )}

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('telephony:delete_folder', 'Удалить папку')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                'telephony:delete_folder_confirm',
                'Вы уверены, что хотите удалить эту папку? Записи будут перемещены в родительскую папку.'
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

const FolderTree: React.FC<FolderTreeProps> = ({
  folders,
  selectedFolderId,
  onFolderSelect,
  onFolderCreated,
  onFolderUpdated,
  onFolderDeleted,
}) => {
  const { t } = useTranslation(['telephony']);

  // Build tree structure
  const buildTree = (items: FolderNode[]): FolderNode[] => {
    const map = new Map<number, FolderNode>();
    const roots: FolderNode[] = [];

    // First pass: create map
    items.forEach((item) => {
      map.set(item.id, { ...item, children: [] });
    });

    // Second pass: build tree
    items.forEach((item) => {
      const node = map.get(item.id)!;
      if (item.parent_id === null) {
        roots.push(node);
      } else {
        const parent = map.get(item.parent_id);
        if (parent) {
          parent.children!.push(node);
        } else {
          // If parent not found, treat as root
          roots.push(node);
        }
      }
    });

    // Sort by sort_order and name
    const sortNodes = (nodes: FolderNode[]) => {
      nodes.sort((a, b) => {
        if (a.sort_order !== b.sort_order) {
          return a.sort_order - b.sort_order;
        }
        return a.name.localeCompare(b.name);
      });
      nodes.forEach((node) => {
        if (node.children && node.children.length > 0) {
          sortNodes(node.children);
        }
      });
    };

    sortNodes(roots);
    return roots;
  };

  const tree = buildTree(folders);

  if (folders.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-muted-foreground">
        {t('telephony:no_recordings_in_folder', 'Нет папок')}
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      {tree.map((folder) => (
        <FolderItem
          key={folder.id}
          folder={folder}
          level={0}
          selectedFolderId={selectedFolderId}
          onFolderSelect={onFolderSelect}
          onFolderCreated={onFolderCreated}
          onFolderUpdated={onFolderUpdated}
          onFolderDeleted={onFolderDeleted}
        />
      ))}
    </div>
  );
};

export default FolderTree;
