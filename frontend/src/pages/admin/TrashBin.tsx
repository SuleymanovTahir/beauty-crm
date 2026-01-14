
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Trash2,
    RefreshCcw,
    Search,
    Calendar,
    User,
    Users,
    AlertTriangle,
    XCircle,
    History
} from 'lucide-react';
import { api } from '../../services/api';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';


type DeletedItem = {
    id: number;
    entity_type: 'booking' | 'client' | 'user';
    entity_id: string;
    deleted_at: string;
    deleted_by: number;
    deleted_by_role: string;
    reason: string;
    can_restore: boolean;
    deleted_by_username: string;
    restored_at: string | null;
    restored_by: number | null;
    restored_by_username: string | null;
};

const TrashBin: React.FC = () => {
    const { t } = useTranslation('admin/trash');
    const [items, setItems] = useState<DeletedItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterType, setFilterType] = useState<string>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedIds, setSelectedIds] = useState<string[]>([]); // "type:id" strings
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Get current user role
    const userJson = localStorage.getItem('user');
    const currentUser = userJson ? JSON.parse(userJson) : null;
    const isDirector = currentUser?.role === 'director';

    useEffect(() => {
        fetchItems();
        setSelectedIds([]);
    }, [filterType]);

    const fetchItems = async () => {
        try {
            setLoading(true);
            const data = await api.getTrashItems(filterType === 'all' ? undefined : filterType);
            setItems(data.items || []);
        } catch (error) {
            toast.error(t('toast.load_error'));
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await fetchItems();
        setTimeout(() => setIsRefreshing(false), 500);
        toast.success(t('toast.refreshed'));
        setSelectedIds([]);
    };

    const handleRestore = async (item: DeletedItem) => {
        try {
            const response: any = await api.restoreTrashItem(item.entity_type, item.entity_id);
            if (response.success) {
                const typeName = t(`entity.${item.entity_type}`);
                toast.success(t('toast.restore_success', { type: typeName }));
                setItems(items.filter(i => !(i.entity_type === item.entity_type && i.entity_id === item.entity_id)));
                setSelectedIds(selectedIds.filter(id => id !== `${item.entity_type}:${item.entity_id}`));
            }
        } catch (error) {
            toast.error(t('toast.restore_error'));
        }
    };

    const handlePermanentDelete = async (item: DeletedItem) => {
        if (!window.confirm(t('permanent_delete_confirm'))) return;

        try {
            const response: any = await api.permanentDeleteTrashItem(item.entity_type, item.entity_id);
            if (response.success) {
                toast.success(t('toast.delete_success'));
                setItems(items.filter(i => !(i.entity_type === item.entity_type && i.entity_id === item.entity_id)));
                setSelectedIds(selectedIds.filter(id => id !== `${item.entity_type}:${item.entity_id}`));
            }
        } catch (error) {
            toast.error(t('toast.delete_error'));
        }
    };

    const handleBatchRestore = async () => {
        if (selectedIds.length === 0) return;
        const itemsToRestore = selectedIds.map(sid => {
            const [type, id] = sid.split(':');
            return { type, id };
        });

        try {
            setIsActionLoading(true);
            const response = await api.restoreTrashItemsBatch(itemsToRestore);
            toast.success(t('toast.restore_success', { type: `${response.count} объектов` }));
            fetchItems();
            setSelectedIds([]);
        } catch (error) {
            toast.error(t('toast.restore_error'));
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleBatchDelete = async () => {
        if (selectedIds.length === 0) return;
        if (!window.confirm(t('permanent_delete_confirm'))) return;

        const itemsToDelete = selectedIds.map(sid => {
            const [type, id] = sid.split(':');
            return { type, id };
        });

        try {
            setIsActionLoading(true);
            await api.deleteTrashItemsBatch(itemsToDelete);
            toast.success(t('toast.delete_success'));
            fetchItems();
            setSelectedIds([]);
        } catch (error) {
            toast.error(t('toast.delete_error'));
        } finally {
            setIsActionLoading(false);
        }
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === filteredItems.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filteredItems.map(i => `${i.entity_type}:${i.entity_id}`));
        }
    };

    const toggleSelect = (type: string, id: string) => {
        const sid = `${type}:${id}`;
        if (selectedIds.includes(sid)) {
            setSelectedIds(selectedIds.filter(i => i !== sid));
        } else {
            setSelectedIds([...selectedIds, sid]);
        }
    };

    const filteredItems = items.filter(item => {
        const searchString = `${item.entity_type} ${item.entity_id} ${item.reason} ${item.deleted_by_username}`.toLowerCase();
        return searchString.includes(searchTerm.toLowerCase());
    });

    const getIcon = (type: string) => {
        switch (type) {
            case 'booking': return <Calendar className="w-5 h-5 trash-icon-booking" />;
            case 'client': return <Users className="w-5 h-5 trash-icon-client" />;
            case 'user': return <User className="w-5 h-5 trash-icon-user" />;
            default: return <AlertTriangle className="w-5 h-5 trash-icon-default" />;
        }
    };

    const getEntityName = (type: string) => {
        return t(`entity.${type}`);
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header section */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10"
            >
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">
                        {t('title')}
                    </h1>
                    <p className="text-muted-foreground flex items-center gap-2">
                        <History className="w-4 h-4" />
                        {t('subtitle')}
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    {selectedIds.length > 0 && (
                        <div className="flex items-center gap-2 mr-4 bg-muted/50 p-1 rounded-lg border">
                            <Button
                                onClick={handleBatchRestore}
                                disabled={isActionLoading}
                                variant="outline"
                                size="sm"
                                className="trash-restore-button"
                            >
                                <RefreshCcw className="w-4 h-4 mr-2" />
                                {t('restore_selected') || 'Восстановить'} ({selectedIds.length})
                            </Button>
                            {isDirector && (
                                <Button
                                    onClick={handleBatchDelete}
                                    disabled={isActionLoading}
                                    variant="destructive"
                                    size="sm"
                                >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    {t('delete_selected') || 'Удалить'}
                                </Button>
                            )}
                        </div>
                    )}

                    {isDirector && items.length > 0 && selectedIds.length === 0 && (
                        <Button
                            onClick={async () => {
                                if (window.confirm(t('confirm_empty_trash') || 'Are you sure you want to permanently delete all items?')) {
                                    try {
                                        await api.emptyTrash();
                                        toast.success(t('toast.trash_emptied') || 'Trash emptied');
                                        fetchItems();
                                    } catch (e) {
                                        toast.error(t('toast.empty_error') || 'Error emptying trash');
                                    }
                                }
                            }}
                            variant="outline"
                            size="sm"
                            className="trash-empty-button"
                        >
                            <Trash2 className="w-4 h-4 mr-2" />
                            {t('empty_trash') || 'Empty Trash'}
                        </Button>
                    )}
                    <Button
                        onClick={handleRefresh}
                        variant="outline"
                        size="icon"
                        className={isRefreshing ? 'animate-spin' : ''}
                    >
                        <RefreshCcw className="w-4 h-4" />
                    </Button>

                    <div className="bg-muted px-4 py-2 rounded-xl border shadow-sm">
                        <span className="text-sm font-semibold">
                            {t('objects_count', { count: items.length })}
                        </span>
                    </div>
                </div>
            </motion.div>

            {/* Control Bar */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="flex flex-col lg:flex-row gap-4 mb-8"
            >
                <div className="flex-1 flex gap-4">
                    <div className="relative group flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
                        <Input
                            type="text"
                            placeholder={t('search_placeholder')}
                            className="pl-10 h-10"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    {filteredItems.length > 0 && (
                        <div className="flex items-center px-4 bg-muted/30 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer" onClick={toggleSelectAll}>
                            <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                                checked={selectedIds.length === filteredItems.length && filteredItems.length > 0}
                                onChange={toggleSelectAll}
                            />
                            <span className="ml-2 text-xs font-semibold text-muted-foreground select-none uppercase tracking-wider">Выбрать все</span>
                        </div>
                    )}
                </div>

                <div className="flex gap-2">
                    {['all', 'booking', 'client', 'user'].map((type) => (
                        <Button
                            key={type}
                            onClick={() => setFilterType(type)}
                            variant={filterType === type ? 'default' : 'outline'}
                            className="capitalize h-10 px-6"
                        >
                            {type === 'all' ? t('filter_all') : getEntityName(type)}
                        </Button>
                    ))}
                </div>
            </motion.div>

            {/* Items Grid/List */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                    <p className="text-muted-foreground font-medium">{t('loading')}</p>
                </div>
            ) : filteredItems.length === 0 ? (
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center justify-center py-20 rounded-xl border bg-card shadow-sm"
                >
                    <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-6">
                        <Trash2 className="w-10 h-10 text-muted-foreground" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">{t('empty_title')}</h3>
                    <p className="text-muted-foreground">{t('empty_desc')}</p>
                </motion.div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3">
                    <AnimatePresence mode="popLayout">
                        {filteredItems.map((item, idx) => (
                            <motion.div
                                layout
                                key={`${item.entity_type}-${item.entity_id}`}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ delay: idx * 0.05 }}
                                className={`bg-card border p-3 rounded-xl hover:border-primary/30 hover:bg-muted/30 transition-all group relative overflow-hidden shadow-sm hover:shadow-md ${selectedIds.includes(`${item.entity_type}:${item.entity_id}`) ? 'border-primary/50 bg-primary/5' : ''}`}
                            >
                                <div className={`absolute top-3 left-3 z-10 transition-opacity flex items-center gap-2 ${selectedIds.includes(`${item.entity_type}:${item.entity_id}`) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                    <input
                                        type="checkbox"
                                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer shadow-sm"
                                        checked={selectedIds.includes(`${item.entity_type}:${item.entity_id}`)}
                                        onChange={() => toggleSelect(item.entity_type, item.entity_id)}
                                    />
                                </div>

                                <div className="flex items-start justify-between">
                                    <div className={`flex gap-3 transition-transform ${selectedIds.includes(`${item.entity_type}:${item.entity_id}`) ? 'translate-x-6' : 'group-hover:translate-x-6'}`}>
                                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center border shrink-0">
                                            {getIcon(item.entity_type)}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-1.5 mb-0.5">
                                                <span className="text-[10px] uppercase tracking-wider text-primary font-bold truncate">
                                                    {getEntityName(item.entity_type)}
                                                </span>
                                                <span className="text-[10px] text-muted-foreground">•</span>
                                                <span className="text-[10px] text-muted-foreground">ID: {item.entity_id}</span>
                                            </div>
                                            <h4 className="text-sm font-semibold mb-1 group-hover:text-primary transition-colors truncate" title={item.reason}>
                                                {item.reason}
                                            </h4>
                                            <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                                                <User className="w-2.5 h-2.5" />
                                                <span className="truncate">{item.deleted_by_username}</span>
                                                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted uppercase font-bold shrink-0">
                                                    {item.deleted_by_role}
                                                </span>
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                        <Button
                                            onClick={() => handleRestore(item)}
                                            variant="outline"
                                            size="icon"
                                            className="h-8 w-8 text-green-600 hover:bg-green-600 hover:text-white"
                                            title={t('restore')}
                                        >
                                            <RefreshCcw className="w-4 h-4" />
                                        </Button>
                                        {isDirector && (
                                            <Button
                                                onClick={() => handlePermanentDelete(item)}
                                                variant="destructive"
                                                size="icon"
                                                className="h-8 w-8"
                                                title={t('permanent_delete')}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                <div className="mt-3 pt-3 border-t flex items-center justify-between">
                                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                        <Calendar className="w-2.5 h-2.5" />
                                        {new Date(item.deleted_at).toLocaleDateString()}
                                    </span>

                                    {!item.can_restore && (
                                        <span className="text-[8px] flex items-center gap-1 px-2 py-0.5 rounded-full bg-destructive/10 text-destructive font-bold uppercase tracking-widest">
                                            <XCircle className="w-2.5 h-2.5" />
                                            {t('not_restorable')}
                                        </span>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}

            {/* Info Warning Footer */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="mt-12 p-5 rounded-xl border flex items-start gap-4 trash-info-warning"
            >
                <AlertTriangle className="w-6 h-6 flex-shrink-0 trash-info-warning-icon" />
                <div>
                    <h5 className="font-semibold mb-1 trash-info-warning-title">{t('important_info')}</h5>

                    <p className="text-sm text-foreground/70">
                        {t('info_desc')}
                    </p>
                </div>
            </motion.div>

        </div>
    );
};

export default TrashBin;
