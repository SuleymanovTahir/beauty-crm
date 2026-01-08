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
    Plus,
    ChevronDown
} from 'lucide-react';
import { api } from '../../services/api';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

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
    const { t } = useTranslation('admin/audit-log');
    const [history, setHistory] = useState<AuditEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [summary, setSummary] = useState<any>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedEntry, setSelectedEntry] = useState<AuditEntry | null>(null);
    const [filterAction, setFilterAction] = useState<string>('all');
    const [isClearing, setIsClearing] = useState(false);

    // Get current user role
    const userJson = localStorage.getItem('user');
    const currentUser = userJson ? JSON.parse(userJson) : null;
    const isDirector = currentUser?.role === 'director';

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
            toast.error(t('toast.load_error'));
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

    const handleClearLogs = async () => {
        if (!window.confirm(t('clear_confirm', 'Вы уверены, что хотите полностью очистить журнал аудита? Это действие необратимо.'))) return;

        try {
            setIsClearing(true);
            await api.clearAuditLog();
            toast.success(t('toast.clear_success', 'Журнал аудита успешно очищен'));
            setHistory([]);
            setSummary(null);
            fetchSummary();
        } catch (error) {
            toast.error(t('toast.clear_error', 'Ошибка при очистке журнала'));
        } finally {
            setIsClearing(false);
        }
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
        <div className="p-6 space-y-6">
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
                        <ShieldCheck className="w-4 h-4" />
                        {t('subtitle')}
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    {isDirector && (
                        <button
                            onClick={handleClearLogs}
                            disabled={isClearing || history.length === 0}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition-all shadow-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Trash2 size={18} />
                            <span className="hidden md:inline">{t('clear_all', 'Очистить всё')}</span>
                        </button>
                    )}
                    <button
                        onClick={() => { fetchData(); fetchSummary(); }}
                        className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 shadow-sm transition-all text-slate-400 hover:text-[#6366f1]"
                    >
                        <RefreshCcw className="w-5 h-5" />
                    </button>
                </div>
            </motion.div>

            {/* Summary Chips */}
            {summary && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-10">
                    {[
                        { label: t('stat_total'), value: summary.total_24h, icon: Activity, color: 'text-blue-400' },
                        { label: t('stat_errors'), value: summary.failures_24h, icon: AlertCircle, color: 'text-red-400' },
                        { label: t('stat_active_users'), value: summary.active_users_24h, icon: User, color: 'text-purple-400' },
                        { label: t('stat_created'), value: summary.actions_breakdown?.create || 0, icon: Plus, color: 'text-green-400' },
                    ].map((stat, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.1 }}
                            className="bg-white border border-slate-200 p-4 rounded-xl flex items-center gap-4 shadow-sm"
                        >
                            <div className={`w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center ${stat.color}`}>
                                <stat.icon size={20} />
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 uppercase tracking-widest">{stat.label}</p>
                                <p className="text-xl font-bold text-slate-900">{stat.value}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Filters */}
            <div className="flex flex-col lg:flex-row gap-4 mb-8">
                <div className="flex-1 relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder={t('search_placeholder')}
                        className="w-full bg-white border border-slate-200 rounded-lg py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-[#6366f1]/20 outline-none shadow-sm transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="relative">
                    <select
                        className="w-full lg:w-48 appearance-none bg-white border border-slate-200 rounded-lg pl-4 pr-10 py-2 text-sm outline-none focus:ring-2 focus:ring-[#6366f1]/20 cursor-pointer shadow-sm text-slate-700"
                        value={filterAction}
                        onChange={(e) => setFilterAction(e.target.value)}
                    >
                        <option value="all">{t('filter_all')}</option>
                        <option value="create">{t('filter_create')}</option>
                        <option value="update">{t('filter_update')}</option>
                        <option value="delete">{t('filter_delete')}</option>
                        <option value="restore">{t('filter_restore')}</option>
                        <option value="login">{t('filter_login')}</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
            </div>

            {/* Table */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-slate-100 bg-slate-50/50">
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">{t('table.action')}</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">{t('table.user')}</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">{t('table.entity')}</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">{t('table.status')}</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">{t('table.time')}</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="py-20 text-center text-gray-500">{t('table.loading')}</td>
                                </tr>
                            ) : filteredHistory.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-20 text-center text-gray-500">{t('table.empty')}</td>
                                </tr>
                            ) : (
                                filteredHistory.map((entry) => (
                                    <tr key={entry.id} className="border-b border-slate-50 hover:bg-slate-50/80 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                                                    {getActionIcon(entry.action)}
                                                </div>
                                                <span className="font-medium capitalize text-slate-700">{t(`filter_${entry.action}`)}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-slate-900">{entry.username}</span>
                                                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">
                                                    {entry.user_role}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium text-slate-700">{entry.entity_type || '-'}</span>
                                                <span className="text-xs text-slate-400">ID: {entry.entity_id || '-'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {entry.success ? (
                                                <div className="flex items-center gap-1.5 text-green-400 text-xs font-bold">
                                                    <CheckCircle2 size={14} /> {t('table.success')}
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1.5 text-red-400 text-xs font-bold">
                                                    <XCircle size={14} /> {t('table.error')}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-500">
                                            {new Date(entry.created_at).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => setSelectedEntry(entry)}
                                                className="p-2 rounded-xl border border-slate-200 bg-white text-[#6366f1] opacity-0 group-hover:opacity-100 transition-all hover:bg-[#6366f1] hover:text-white shadow-sm"
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
                            className="bg-white border border-slate-200 w-full max-w-4xl max-h-[90vh] rounded-2xl overflow-hidden shadow-2xl relative"
                        >
                            <button
                                onClick={() => setSelectedEntry(null)}
                                className="absolute top-6 right-6 p-2 rounded-xl bg-slate-100 hover:bg-slate-200 transition-all"
                            >
                                <XCircle className="w-6 h-6 text-slate-500" />
                            </button>

                            <div className="p-10">
                                <div className="flex items-center gap-4 mb-8">
                                    <div className="p-4 rounded-2xl bg-[#6366f1]/5 text-[#6366f1]">
                                        <Database size={32} />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-bold text-slate-900">{t('details.title')}</h2>
                                        <p className="text-slate-500">{t('details.op_id')}: {selectedEntry.id} • {new Date(selectedEntry.created_at).toLocaleString()}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-[50vh] overflow-y-auto">
                                    <div className="space-y-4">
                                        <h3 className="text-sm font-bold uppercase tracking-widest text-[#6366f1]">{t('details.old_data')}</h3>
                                        <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 text-xs font-mono overflow-auto max-h-[40vh]">
                                            <pre className="text-pink-600/80">
                                                {JSON.stringify(selectedEntry.old_value, null, 2) || t('details.no_data')}
                                            </pre>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <h3 className="text-sm font-bold uppercase tracking-widest text-green-600">{t('details.new_data')}</h3>
                                        <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 text-xs font-mono overflow-auto max-h-[40vh]">
                                            <pre className="text-green-700/80">
                                                {JSON.stringify(selectedEntry.new_value, null, 2) || t('details.no_data')}
                                            </pre>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-8 flex items-center gap-6 text-sm text-slate-500">
                                    <span className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-full border border-slate-100">
                                        <Clock size={16} /> {t('details.ip')}: {selectedEntry.ip_address || 'N/A'}
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
