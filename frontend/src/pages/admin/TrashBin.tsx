
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
            toast.error('Ошибка при загрузке корзины');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await fetchItems();
        setTimeout(() => setIsRefreshing(false), 500);
        toast.success('Обновлено');
    };

    const handleRestore = async (item: DeletedItem) => {
        try {
            const response: any = await api.restoreTrashItem(item.entity_type, item.entity_id);
            if (response.success) {
                toast.success(`${item.entity_type === 'booking' ? 'Запись' :
                    item.entity_type === 'client' ? 'Клиент' : 'Пользователь'} успешно восстановлен`);
                setItems(items.filter(i => !(i.entity_type === item.entity_type && i.entity_id === item.entity_id)));
            }
        } catch (error) {
            toast.error('Не удалось восстановить объект');
        }
    };

    const handlePermanentDelete = async (item: DeletedItem) => {
        if (!window.confirm('Вы уверены? Это действие нельзя отменить!')) return;

        try {
            const response: any = await api.permanentDeleteTrashItem(item.entity_type, item.entity_id);
            if (response.success) {
                toast.success('Объект окончательно удален');
                setItems(items.filter(i => !(i.entity_type === item.entity_type && i.entity_id === item.entity_id)));
            }
        } catch (error) {
            toast.error('Ошибка при окончательном удалении');
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
        switch (type) {
            case 'booking': return 'Запись';
            case 'client': return 'Клиент';
            case 'user': return 'Сотрудник';
            default: return type;
        }
    };

    return (
        <div className="min-h-screen bg-[#050510] text-[#f0f0f5] p-6 lg:p-10 font-['Outfit']">
            {/* Header section with glassmorphism */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10"
            >
                <div>
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-[#db2777] via-[#9333ea] to-[#2563eb] bg-clip-text text-transparent mb-2">
                        Корзина
                    </h1>
                    <p className="text-gray-400 flex items-center gap-2">
                        <History className="w-4 h-4" />
                        Управление удаленными данными и их восстановление
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={handleRefresh}
                        className={`p-3 rounded-2xl bg-[#121225] border border-white/5 hover:bg-[#1a1a35] transition-all flex items-center gap-2 group ${isRefreshing ? 'animate-spin' : ''}`}
                    >
                        <RefreshCcw className="w-5 h-5 text-gray-400 group-hover:text-white" />
                    </button>

                    <div className="relative group">
                        <div className="absolute inset-0 bg-gradient-to-r from-pink-500/20 to-purple-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl" />
                        <div className="relative p-1 bg-gradient-to-r from-pink-600 to-purple-600 rounded-3xl">
                            <div className="bg-[#0f0f20] rounded-[22px] px-6 py-2">
                                <span className="text-sm font-medium gradient-text">{items.length} объектов</span>
                            </div>
                        </div>
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
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-[#db2777] transition-colors" />
                    <input
                        type="text"
                        placeholder="Поиск по ID, причине или авторому..."
                        className="w-full bg-[#121225] border border-white/5 rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-[#db2777]/30 focus:border-[#db2777]/50 outline-none transition-all placeholder:text-gray-600"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="flex gap-2">
                    {['all', 'booking', 'client', 'user'].map((type) => (
                        <button
                            key={type}
                            onClick={() => setFilterType(type)}
                            className={`px-6 py-4 rounded-2xl font-medium transition-all ${filterType === type
                                ? 'bg-[#db2777] text-white shadow-lg shadow-pink-500/20'
                                : 'bg-[#121225] text-gray-400 border border-white/5 hover:bg-[#1a1a35]'
                                }`}
                        >
                            {type === 'all' ? 'Все' : getEntityName(type)}
                        </button>
                    ))}
                </div>
            </motion.div>

            {/* Items Grid/List */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <div className="w-12 h-12 border-4 border-[#db2777]/20 border-t-[#db2777] rounded-full animate-spin" />
                    <p className="text-gray-500 font-medium">Загрузка данных...</p>
                </div>
            ) : filteredItems.length === 0 ? (
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center justify-center py-32 rounded-3xl border border-white/5 bg-[#0a0a1a]"
                >
                    <div className="w-20 h-20 bg-[#121225] rounded-full flex items-center justify-center mb-6">
                        <Trash2 className="w-10 h-10 text-gray-700" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">Корзина пуста</h3>
                    <p className="text-gray-500">Здесь будут отображаться удаленные объекты</p>
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
                                className="bg-[#121225] border border-white/5 p-6 rounded-[32px] hover:border-white/10 hover:bg-[#16162d] transition-all group relative overflow-hidden"
                            >
                                {/* Visual Glassmorphism effects */}
                                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-pink-500/5 to-purple-500/5 blur-3xl -z-10" />

                                <div className="flex items-start justify-between">
                                    <div className="flex gap-4">
                                        <div className="w-14 h-14 rounded-2xl bg-[#0f0f20] flex items-center justify-center border border-white/5">
                                            {getIcon(item.entity_type)}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-xs uppercase tracking-widest text-[#db2777] font-bold">
                                                    {getEntityName(item.entity_type)}
                                                </span>
                                                <span className="text-xs text-gray-600">•</span>
                                                <span className="text-xs text-gray-500">ID: {item.entity_id}</span>
                                            </div>
                                            <h4 className="text-lg font-semibold mb-1 group-hover:text-white transition-colors">
                                                {item.reason}
                                            </h4>
                                            <p className="text-sm text-gray-400 flex items-center gap-2">
                                                <User className="w-3 h-3" />
                                                Удалил: <span className="text-gray-300 font-medium">{item.deleted_by_username}</span>
                                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 uppercase font-bold text-gray-500">
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

                                <div className="mt-6 pt-6 border-t border-white/5 flex items-center justify-between">
                                    <span className="text-xs text-gray-600 flex items-center gap-1">
                                        <Calendar className="w-3 h-3" />
                                        Удалено {new Date(item.deleted_at).toLocaleString()}
                                    </span>

                                    {!item.can_restore && (
                                        <span className="text-[10px] flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ef4444]/10 text-[#ef4444] font-bold uppercase tracking-widest">
                                            <XCircle className="w-3 h-3" />
                                            Не восстановимо
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
                className="mt-12 p-6 rounded-3xl bg-amber-500/5 border border-amber-500/10 flex items-start gap-4"
            >
                <AlertTriangle className="w-6 h-6 text-amber-500 flex-shrink-0" />
                <div>
                    <h5 className="font-semibold text-amber-500 mb-1">Важная информация</h5>
                    <p className="text-sm text-gray-400">
                        Объекты в корзине хранятся неограниченное время, но мы рекомендуем периодически очищать ее для поддержания оптимальной работы базы данных.
                        Восстановление сотрудника также возвращает ему статус "Активен".
                    </p>
                </div>
            </motion.div>

            <style>{`
        .gradient-text {
          background: linear-gradient(90deg, #db2777, #9333ea);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
      `}</style>
        </div>
    );
};

export default TrashBin;
