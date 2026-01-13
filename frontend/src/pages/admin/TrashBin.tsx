
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
    const [isRefreshing, setIsRefreshing] = useState(false);

    useEffect(() => {
        fetchItems();
    }, [filterType]);

    const fetchItems = async () => {
        try {
            setLoading(true);
            const data = await api.getTrashItems(filterType === 'all' ? undefined : filterType);
            setItems(data.items);
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
    };

    const handleRestore = async (item: DeletedItem) => {
        try {
            const response: any = await api.restoreTrashItem(item.entity_type, item.entity_id);
            if (response.success) {
                const typeName = t(`entity.${item.entity_type}`);
                toast.success(t('toast.restore_success', { type: typeName }));
                setItems(items.filter(i => !(i.entity_type === item.entity_type && i.entity_id === item.entity_id)));
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
            }
        } catch (error) {
            toast.error(t('toast.delete_error'));
        }
    };

    const filteredItems = items.filter(item => {
        const searchString = `${item.entity_type} ${item.entity_id} ${item.reason} ${item.deleted_by_username}`.toLowerCase();
        return searchString.includes(searchTerm.toLowerCase());
    });

    const getIcon = (type: string) => {
        switch (type) {
            case 'booking': return <Calendar className="w-5 h-5 text-blue-400" />;
            case 'client': return <Users className="w-5 h-5 text-pink-400" />;
            case 'user': return <User className="w-5 h-5 text-blue-400" />;
            default: return <AlertTriangle className="w-5 h-5 text-gray-400" />;
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
                    {items.length > 0 && (
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
                            variant="destructive"
                            size="sm"
                            className="mr-2"
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
                        <span className="text-sm font-semibold">{t('objects_count', { count: items.length })}</span>
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
                <div className="flex-1 relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
                    <Input
                        type="text"
                        placeholder={t('search_placeholder')}
                        className="pl-10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="flex gap-2">
                    {['all', 'booking', 'client', 'user'].map((type) => (
                        <Button
                            key={type}
                            onClick={() => setFilterType(type)}
                            variant={filterType === type ? 'default' : 'outline'}
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
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    <AnimatePresence mode="popLayout">
                        {filteredItems.map((item, idx) => (
                            <motion.div
                                layout
                                key={`${item.entity_type}-${item.entity_id}`}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ delay: idx * 0.05 }}
                                className="bg-card border p-4 rounded-xl hover:border-primary/30 hover:bg-muted/30 transition-all group relative overflow-hidden shadow-sm hover:shadow-md"
                            >

                                <div className="flex items-start justify-between">
                                    <div className="flex gap-4">
                                        <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center border">
                                            {getIcon(item.entity_type)}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-xs uppercase tracking-widest text-primary font-bold">
                                                    {getEntityName(item.entity_type)}
                                                </span>
                                                <span className="text-xs text-muted-foreground">•</span>
                                                <span className="text-xs text-muted-foreground">ID: {item.entity_id}</span>
                                            </div>
                                            <h4 className="text-lg font-semibold mb-1 group-hover:text-primary transition-colors">
                                                {item.reason}
                                            </h4>
                                            <p className="text-sm text-muted-foreground flex items-center gap-2">
                                                <User className="w-3 h-3" />
                                                {t('deleted_by')}: <span className="font-medium">{item.deleted_by_username}</span>
                                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted uppercase font-bold">
                                                    {item.deleted_by_role}
                                                </span>
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button
                                            onClick={() => handleRestore(item)}
                                            variant="outline"
                                            size="icon"
                                            className="text-green-600 hover:bg-green-600 hover:text-white"
                                            title={t('restore')}
                                        >
                                            <RefreshCcw className="w-5 h-5" />
                                        </Button>
                                        <Button
                                            onClick={() => handlePermanentDelete(item)}
                                            variant="destructive"
                                            size="icon"
                                            title={t('permanent_delete')}
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </Button>
                                    </div>
                                </div>

                                <div className="mt-6 pt-6 border-t flex items-center justify-between">
                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                        <Calendar className="w-3 h-3" />
                                        {t('deleted_at')} {new Date(item.deleted_at).toLocaleString()}
                                    </span>

                                    {!item.can_restore && (
                                        <span className="text-[10px] flex items-center gap-1.5 px-3 py-1 rounded-full bg-destructive/10 text-destructive font-bold uppercase tracking-widest">
                                            <XCircle className="w-3 h-3" />
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
                className="mt-12 p-5 rounded-xl bg-amber-50/50 border border-amber-200 flex items-start gap-4"
            >
                <AlertTriangle className="w-6 h-6 text-amber-500 flex-shrink-0" />
                <div>
                    <h5 className="font-semibold text-amber-600 mb-1">{t('important_info')}</h5>
                    <p className="text-sm text-foreground/70">
                        {t('info_desc')}
                    </p>
                </div>
            </motion.div>

        </div>
    );
};

export default TrashBin;
