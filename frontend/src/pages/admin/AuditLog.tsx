
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ShieldCheck,
    Search,
    User,
    Clock,
    Database,
    AlertCircle,
    CheckCircle2,
    XCircle,
    RefreshCcw,
    Eye,
    Activity,
    UserCheck,
    Trash2,
    Edit,
    Plus
} from 'lucide-react';
import { api } from '../../services/api';
import { toast } from 'sonner';

type AuditEntry = {
    id: number;
    user_id: number;
    username: string;
    user_role: string;
    action: string;
    entity_type: string;
    entity_id: string;
    old_value: any;
    new_value: any;
    ip_address: string;
    success: boolean;
    created_at: string;
    error_message: string | null;
};

const AuditLog: React.FC = () => {
    const [history, setHistory] = useState<AuditEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [summary, setSummary] = useState<any>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedEntry, setSelectedEntry] = useState<AuditEntry | null>(null);
    const [filterAction, setFilterAction] = useState<string>('all');

    useEffect(() => {
        fetchData();
        fetchSummary();
    }, [filterAction]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const data = await api.getAuditLog({
                action: filterAction === 'all' ? undefined : filterAction,
                limit: 100
            });
            setHistory(data.history);
        } catch (error) {
            toast.error('Ошибка при загрузке журнала аудита');
        } finally {
            setLoading(false);
        }
    };

    const fetchSummary = async () => {
        try {
            const data = await api.getAuditSummary();
            setSummary(data.summary);
        } catch (error) { }
    };

    const getActionIcon = (action: string) => {
        switch (action) {
            case 'create': return <Plus className="w-4 h-4 text-green-400" />;
            case 'update': return <Edit className="w-4 h-4 text-blue-400" />;
            case 'delete': return <Trash2 className="w-4 h-4 text-red-400" />;
            case 'restore': return <RefreshCcw className="w-4 h-4 text-amber-400" />;
            case 'login': return <UserCheck className="w-4 h-4 text-purple-400" />;
            default: return <Activity className="w-4 h-4 text-gray-400" />;
        }
    };

    const filteredHistory = history.filter(item => {
        const searchStr = `${item.username} ${item.entity_type} ${item.action}`.toLowerCase();
        return searchStr.includes(searchTerm.toLowerCase());
    });

    return (
        <div className="min-h-screen bg-[#050510] text-[#f0f0f5] p-6 lg:p-10 font-['Outfit']">
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10"
            >
                <div>
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-[#6366f1] via-[#a855f7] to-[#ec4899] bg-clip-text text-transparent mb-2">
                        Журнал Аудита
                    </h1>
                    <p className="text-gray-400 flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-[#6366f1]" />
                        История всех действий и изменений в системе
                    </p>
                </div>

                <button
                    onClick={() => { fetchData(); fetchSummary(); }}
                    className="p-3 rounded-2xl bg-[#121225] border border-white/5 hover:bg-[#1a1a35] transition-all"
                >
                    <RefreshCcw className="w-5 h-5 text-gray-400" />
                </button>
            </motion.div>

            {/* Summary Chips */}
            {summary && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-10">
                    {[
                        { label: 'Всего (24ч)', value: summary.total_24h, icon: Activity, color: 'text-blue-400' },
                        { label: 'Ошибки (24ч)', value: summary.failures_24h, icon: AlertCircle, color: 'text-red-400' },
                        { label: 'Активные пользователи', value: summary.active_users_24h, icon: User, color: 'text-purple-400' },
                        { label: 'Создано', value: summary.actions_breakdown?.create || 0, icon: Plus, color: 'text-green-400' },
                    ].map((stat, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.1 }}
                            className="bg-[#121225] border border-white/5 p-4 rounded-[24px] flex items-center gap-4"
                        >
                            <div className={`w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center ${stat.color}`}>
                                <stat.icon size={20} />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 uppercase tracking-widest">{stat.label}</p>
                                <p className="text-xl font-bold">{stat.value}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Filters */}
            <div className="flex flex-col lg:flex-row gap-4 mb-8">
                <div className="flex-1 relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                        type="text"
                        placeholder="Поиск по пользователю, сущности или действию..."
                        className="w-full bg-[#121225] border border-white/5 rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-[#6366f1]/30 outline-none"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <select
                    className="bg-[#121225] border border-white/5 rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-[#6366f1]/30 cursor-pointer"
                    value={filterAction}
                    onChange={(e) => setFilterAction(e.target.value)}
                >
                    <option value="all">Все действия</option>
                    <option value="create">Создание</option>
                    <option value="update">Изменение</option>
                    <option value="delete">Удаление</option>
                    <option value="restore">Восстановление</option>
                    <option value="login">Вход</option>
                </select>
            </div>

            {/* Table */}
            <div className="bg-[#121225] border border-white/5 rounded-[32px] overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-white/5 bg-white/2">
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-400">Действие</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-400">Пользователь</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-400">Сущность</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-400">Статус</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-400">Время</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-400"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="py-20 text-center text-gray-500">Загрузка...</td>
                                </tr>
                            ) : filteredHistory.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-20 text-center text-gray-500">История пуста</td>
                                </tr>
                            ) : (
                                filteredHistory.map((entry) => (
                                    <tr key={entry.id} className="border-b border-white/2 hover:bg-white/5 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 rounded-lg bg-[#050510] border border-white/5">
                                                    {getActionIcon(entry.action)}
                                                </div>
                                                <span className="font-medium capitalize">{entry.action}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-white">{entry.username}</span>
                                                <span className="text-[10px] text-gray-500 uppercase font-bold tracking-tighter">
                                                    {entry.user_role}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium">{entry.entity_type || '-'}</span>
                                                <span className="text-xs text-gray-500">ID: {entry.entity_id || '-'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {entry.success ? (
                                                <div className="flex items-center gap-1.5 text-green-400 text-xs font-bold">
                                                    <CheckCircle2 size={14} /> УСПЕХ
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1.5 text-red-400 text-xs font-bold">
                                                    <XCircle size={14} /> ОШИБКА
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-400">
                                            {new Date(entry.created_at).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => setSelectedEntry(entry)}
                                                className="p-2 rounded-xl border border-white/5 bg-[#050510] text-[#6366f1] opacity-0 group-hover:opacity-100 transition-all hover:bg-[#6366f1] hover:text-white"
                                            >
                                                <Eye size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Details Modal */}
            <AnimatePresence>
                {selectedEntry && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#050510]/80 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="bg-[#121225] border border-white/10 w-full max-w-4xl max-h-[90vh] rounded-[32px] overflow-hidden shadow-2xl relative"
                        >
                            <button
                                onClick={() => setSelectedEntry(null)}
                                className="absolute top-6 right-6 p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-all"
                            >
                                <XCircle className="w-6 h-6 text-gray-400" />
                            </button>

                            <div className="p-10">
                                <div className="flex items-center gap-4 mb-8">
                                    <div className="p-4 rounded-2xl bg-[#6366f1]/10 text-[#6366f1]">
                                        <Database size={32} />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-bold">Детали изменения</h2>
                                        <p className="text-gray-400">ID операции: {selectedEntry.id} • {new Date(selectedEntry.created_at).toLocaleString()}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-[50vh] overflow-y-auto">
                                    <div className="space-y-4">
                                        <h3 className="text-sm font-bold uppercase tracking-widest text-[#6366f1]">Старые данные</h3>
                                        <div className="p-6 rounded-2xl bg-[#050510] border border-white/5 text-xs font-mono overflow-auto max-h-[40vh]">
                                            <pre className="text-pink-400/80">
                                                {JSON.stringify(selectedEntry.old_value, null, 2) || 'Данные отсутствуют'}
                                            </pre>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <h3 className="text-sm font-bold uppercase tracking-widest text-green-400">Новые данные</h3>
                                        <div className="p-6 rounded-2xl bg-[#050510] border border-white/5 text-xs font-mono overflow-auto max-h-[40vh]">
                                            <pre className="text-green-400/80">
                                                {JSON.stringify(selectedEntry.new_value, null, 2) || 'Данные отсутствуют'}
                                            </pre>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-8 flex items-center gap-6 text-sm text-gray-500">
                                    <span className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-full">
                                        <Clock size={16} /> IP: {selectedEntry.ip_address || 'Неизвестен'}
                                    </span>
                                    {selectedEntry.error_message && (
                                        <span className="flex items-center gap-2 bg-red-500/10 text-red-400 px-4 py-2 rounded-full font-bold">
                                            <AlertCircle size={16} /> {selectedEntry.error_message}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AuditLog;
