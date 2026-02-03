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
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';

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
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isClearing, setIsClearing] = useState(false);

    // Get current user role
    const userJson = localStorage.getItem('user');
    const currentUser = userJson ? JSON.parse(userJson) : null;
    const isDirector = currentUser?.role === 'director';

    useEffect(() => {
        fetchData();
        fetchSummary();
        setSelectedIds([]);
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
        if (!window.confirm(t('clear_confirm'))) return;

        try {
            setIsClearing(true);
            await api.clearAuditLog();
            toast.success(t('toast.clear_success'));
            setHistory([]);
            setSummary(null);
            fetchSummary();
            setSelectedIds([]);
        } catch (error) {
            toast.error(t('toast.clear_error'));
        } finally {
            setIsClearing(false);
        }
    };

    const handleDeleteEntry = async (id: number) => {
        if (!window.confirm(t('delete_confirm'))) return;
        try {
            await api.deleteAuditLog(id);
            toast.success(t('toast.delete_success'));
            setHistory(history.filter(h => h.id !== id));
            setSelectedIds(selectedIds.filter(sid => sid !== id));
        } catch (error) {
            toast.error(t('toast.delete_error'));
        }
    };

    const handleDeleteBatch = async () => {
        if (!window.confirm(t('delete_batch_confirm', { count: selectedIds.length }))) return;
        try {
            setIsDeleting(true);
            await api.deleteAuditLogsBatch(selectedIds);
            toast.success(t('toast.delete_success'));
            setHistory(history.filter(h => !selectedIds.includes(h.id)));
            setSelectedIds([]);
        } catch (error) {
            toast.error(t('toast.delete_error'));
        } finally {
            setIsDeleting(false);
        }
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === filteredHistory.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filteredHistory.map(h => h.id));
        }
    };

    const toggleSelect = (id: number) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(sid => sid !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    const getActionIcon = (action: string) => {
        switch (action) {
            case 'create': return <Plus className="w-4 h-4 text-green-400" />;
            case 'update': return <Edit className="w-4 h-4 text-blue-400" />;
            case 'delete': return <Trash2 className="w-4 h-4 text-red-400" />;
            case 'restore': return <RefreshCcw className="w-4 h-4 text-amber-400" />;
            case 'login': return <UserCheck className="w-4 h-4 text-blue-400" />;
            case 'delete_all': return <Trash2 className="w-4 h-4 text-red-600" />;
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
                    {isDirector && selectedIds.length > 0 && (
                        <Button
                            onClick={handleDeleteBatch}
                            disabled={isDeleting}
                            variant="destructive"
                        >
                            <Trash2 size={18} className="mr-2" />
                            <span>{t('delete_selected')} ({selectedIds.length})</span>
                        </Button>
                    )}
                    {isDirector && (
                        <Button
                            onClick={handleClearLogs}
                            disabled={isClearing || history.length === 0}
                            variant="outline"
                            className="text-red-500 border-red-200 hover:bg-red-50"
                        >
                            <Trash2 size={18} className="mr-2" />
                            <span className="hidden md:inline">{t('clear_all')}</span>
                        </Button>
                    )}
                    <Button
                        onClick={() => { fetchData(); fetchSummary(); }}
                        variant="outline"
                        size="icon"
                    >
                        <RefreshCcw className="w-5 h-5" />
                    </Button>
                </div>
            </motion.div>

            {/* Summary Chips */}
            {summary && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-10">
                    {[
                        { label: t('stat_total', { count: 24 }), value: summary.total_24h, icon: Activity, color: 'text-blue-400' },
                        { label: t('stat_errors', { count: 24 }), value: summary.failures_24h, icon: AlertCircle, color: 'text-red-400' },
                        { label: t('stat_active_users'), value: summary.active_users_24h, icon: User, color: 'text-blue-400' },
                        { label: t('stat_created'), value: summary.actions_breakdown?.create || 0, icon: Plus, color: 'text-green-400' },
                    ].map((stat, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.1 }}
                            className="bg-card border p-4 rounded-xl flex items-center gap-4 shadow-sm"
                        >
                            <div className={`w-10 h-10 rounded-xl bg-muted flex items-center justify-center ${stat.color}`}>
                                <stat.icon size={20} />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground uppercase tracking-widest">{stat.label}</p>
                                <p className="text-xl font-bold">{stat.value}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Filters */}
            <div className="flex flex-col lg:flex-row gap-4 mb-8">
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
                <div className="relative">
                    <select
                        className="w-full lg:w-48 appearance-none bg-card border rounded-lg pl-4 pr-10 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] cursor-pointer shadow-sm"
                        value={filterAction}
                        onChange={(e) => setFilterAction(e.target.value)}
                    >
                        <option value="all">{t('filter_all')}</option>
                        <option value="create">{t('filter_create')}</option>
                        <option value="update">{t('filter_update')}</option>
                        <option value="delete">{t('filter_delete')}</option>
                        <option value="restore">{t('filter_restore')}</option>
                        <option value="login">{t('filter_login')}</option>
                        <option value="delete_all">{t('filter_delete_all')}</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                </div>
            </div>

            {/* Table */}
            <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b bg-muted/50">
                                <th className="px-6 py-4 w-10">
                                    <input
                                        type="checkbox"
                                        className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                                        checked={filteredHistory.length > 0 && selectedIds.length === filteredHistory.length}
                                        onChange={toggleSelectAll}
                                    />
                                </th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('table.action')}</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('table.user')}</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('table.entity')}</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('table.status')}</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('table.time')}</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground text-right"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="py-20 text-center text-muted-foreground">{t('table.loading')}</td>
                                </tr>
                            ) : filteredHistory.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="py-20 text-center text-muted-foreground">{t('table.empty')}</td>
                                </tr>
                            ) : (
                                filteredHistory.map((entry) => (
                                    <tr
                                        key={entry.id}
                                        className={`border-b hover:bg-muted/30 transition-colors group ${selectedIds.includes(entry.id) ? 'bg-primary/5' : ''}`}
                                    >
                                        <td className="px-6 py-4">
                                            <input
                                                type="checkbox"
                                                className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                                                checked={selectedIds.includes(entry.id)}
                                                onChange={() => toggleSelect(entry.id)}
                                            />
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 rounded-lg bg-muted border">
                                                    {getActionIcon(entry.action)}
                                                </div>
                                                <span className="font-medium capitalize">{t(`filter_${entry.action}`)}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-semibold">{entry.username}</span>
                                                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">
                                                    {entry.user_role}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium">{entry.entity_type || '-'}</span>
                                                <span className="text-xs text-muted-foreground">ID: {entry.entity_id || '-'}</span>
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
                                        <td className="px-6 py-4 text-sm text-muted-foreground">
                                            {new Date(entry.created_at).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button
                                                    onClick={() => setSelectedEntry(entry)}
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-muted-foreground hover:text-primary"
                                                >
                                                    <Eye size={16} />
                                                </Button>
                                                {isDirector && (
                                                    <Button
                                                        onClick={() => handleDeleteEntry(entry.id)}
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <Trash2 size={16} />
                                                    </Button>
                                                )}
                                            </div>
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
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="bg-card border w-full max-w-4xl max-h-[90vh] rounded-2xl overflow-hidden shadow-2xl relative"
                        >
                            <Button
                                onClick={() => setSelectedEntry(null)}
                                variant="ghost"
                                size="icon"
                                className="absolute top-6 right-6"
                            >
                                <XCircle className="w-6 h-6" />
                            </Button>

                            <div className="p-10">
                                <div className="flex items-center gap-4 mb-8">
                                    <div className="p-4 rounded-2xl bg-primary/5 text-primary">
                                        <Database size={32} />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-bold">{t('details.title')}</h2>
                                        <p className="text-muted-foreground">{t('details.op_id')}: {selectedEntry.id} • {new Date(selectedEntry.created_at).toLocaleString()}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-[50vh] overflow-y-auto">
                                    <div className="space-y-4">
                                        <h3 className="text-sm font-bold uppercase tracking-widest text-primary">{t('details.old_data')}</h3>
                                        <div className="p-6 rounded-2xl bg-muted border text-xs font-mono overflow-auto max-h-[40vh]">
                                            <pre className="text-pink-600/80">
                                                {JSON.stringify(selectedEntry.old_value, null, 2) || t('details.no_data')}
                                            </pre>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <h3 className="text-sm font-bold uppercase tracking-widest text-green-600">{t('details.new_data')}</h3>
                                        <div className="p-6 rounded-2xl bg-muted border text-xs font-mono overflow-auto max-h-[40vh]">
                                            <pre className="text-green-700/80">
                                                {JSON.stringify(selectedEntry.new_value, null, 2) || t('details.no_data')}
                                            </pre>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-8 flex items-center gap-6 text-sm text-muted-foreground">
                                    <span className="flex items-center gap-2 bg-muted px-4 py-2 rounded-full border">
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
