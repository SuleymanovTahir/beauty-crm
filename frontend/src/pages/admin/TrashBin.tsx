
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
            case 'user': return <User className="w-5 h-5 text-purple-400" />;
            default: return <AlertTriangle className="w-5 h-5 text-gray-400" />;
        }
    };

    const getEntityName = (type: string) => {
        return t(`entity.${type}`);
    };

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 p-6 lg:p-10 font-['Outfit']">
            {/* Header section with glassmorphism */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10"
            >
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 mb-2">
                        {t('title')}
                    </h1>
                    <p className="text-gray-400 flex items-center gap-2">
                        <History className="w-4 h-4" />
                        {t('subtitle')}
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={handleRefresh}
                        className={`p-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 transition-all shadow-sm flex items-center gap-2 group ${isRefreshing ? 'animate-spin' : ''}`}
                    >
                        <RefreshCcw className="w-4 h-4 text-slate-400 group-hover:text-pink-500" />
                    </button>

                    <div className="bg-slate-100 px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
                        <span className="text-sm font-semibold text-slate-700">{t('objects_count', { count: items.length })}</span>
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
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[#db2777] transition-colors" />
                    <input
                        type="text"
                        placeholder={t('search_placeholder')}
                        className="w-full bg-white border border-slate-200 rounded-lg py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-[#db2777]/20 focus:border-[#db2777]/30 outline-none transition-all placeholder:text-slate-400 shadow-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="flex gap-2">
                    {['all', 'booking', 'client', 'user'].map((type) => (
                        <button
                            key={type}
                            onClick={() => setFilterType(type)}
                            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all shadow-sm ${filterType === type
                                ? 'bg-[#db2777] text-white shadow-lg shadow-pink-500/20'
                                : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
                                }`}
                        >
                            {type === 'all' ? t('filter_all') : getEntityName(type)}
                        </button>
                    ))}
                </div>
            </motion.div>

            {/* Items Grid/List */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <div className="w-12 h-12 border-4 border-[#db2777]/20 border-t-[#db2777] rounded-full animate-spin" />
                    <p className="text-gray-500 font-medium">{t('loading')}</p>
                </div>
            ) : filteredItems.length === 0 ? (
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center justify-center py-20 rounded-xl border border-slate-200 bg-white shadow-sm"
                >
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                        <Trash2 className="w-10 h-10 text-slate-400" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">{t('empty_title')}</h3>
                    <p className="text-gray-500">{t('empty_desc')}</p>
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
                                className="bg-white border border-slate-200 p-4 rounded-xl hover:border-pink-200 hover:bg-slate-50/50 transition-all group relative overflow-hidden shadow-sm hover:shadow-md"
                            >

                                <div className="flex items-start justify-between">
                                    <div className="flex gap-4">
                                        <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center border border-slate-100">
                                            {getIcon(item.entity_type)}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-xs uppercase tracking-widest text-[#db2777] font-bold">
                                                    {getEntityName(item.entity_type)}
                                                </span>
                                                <span className="text-xs text-slate-400">•</span>
                                                <span className="text-xs text-slate-500">ID: {item.entity_id}</span>
                                            </div>
                                            <h4 className="text-lg font-semibold mb-1 text-slate-900 group-hover:text-[#db2777] transition-colors">
                                                {item.reason}
                                            </h4>
                                            <p className="text-sm text-slate-500 flex items-center gap-2">
                                                <User className="w-3 h-3" />
                                                {t('deleted_by')}: <span className="text-slate-700 font-medium">{item.deleted_by_username}</span>
                                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 uppercase font-bold text-slate-500">
                                                    {item.deleted_by_role}
                                                </span>
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => handleRestore(item)}
                                            className="p-3 rounded-xl bg-[#22c55e]/10 text-[#22c55e] hover:bg-[#22c55e] hover:text-white transition-all shadow-lg hover:shadow-[#22c55e]/30"
                                            title="Восстановить"
                                        >
                                            <RefreshCcw className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={() => handlePermanentDelete(item)}
                                            className="p-3 rounded-xl bg-[#ef4444]/10 text-[#ef4444] hover:bg-[#ef4444] hover:text-white transition-all shadow-lg hover:shadow-[#ef4444]/30"
                                            title="Удалить навсегда"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>

                                <div className="mt-6 pt-6 border-t border-slate-50 flex items-center justify-between">
                                    <span className="text-xs text-slate-400 flex items-center gap-1">
                                        <Calendar className="w-3 h-3" />
                                        {t('deleted_at')} {new Date(item.deleted_at).toLocaleString()}
                                    </span>

                                    {!item.can_restore && (
                                        <span className="text-[10px] flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ef4444]/10 text-[#ef4444] font-bold uppercase tracking-widest">
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
                    <p className="text-sm text-slate-600">
                        {t('info_desc')}
                    </p>
                </div>
            </motion.div>

        </div>
    );
};

export default TrashBin;
