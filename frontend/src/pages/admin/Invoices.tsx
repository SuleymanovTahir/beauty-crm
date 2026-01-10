import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Plus, Send, DollarSign, Trash2, FileText, X,
    Layout, LayoutDashboard, Search, ArrowUpDown,
    ArrowUp, ArrowDown, Clock
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../services/api';
import { useCurrency } from '../../hooks/useSalonSettings';
import '../../styles/crm-pages.css';

interface Invoice {
    id: number;
    invoice_number: string;
    client_id: string;
    client_name: string;
    client_phone: string;
    total_amount: number;
    paid_amount: number;
    currency: string;
    status: string;
    due_date?: string;
    created_at: string;
}

const Invoices = () => {
    const { t } = useTranslation('admin/invoices');
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [showPaymentDialog, setShowPaymentDialog] = useState(false);
    const [showSendDialog, setShowSendDialog] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
    const [filterStatus, setFilterStatus] = useState<string>('');
    const [viewMode, setViewMode] = useState<'board' | 'list'>(() => {
        return localStorage.getItem('invoices_view_mode') as 'board' | 'list' || 'board';
    });
    const [searchQuery, setSearchQuery] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);

    useEffect(() => {
        localStorage.setItem('invoices_view_mode', viewMode);
    }, [viewMode]);

    useEffect(() => {
        loadInvoices();
    }, [filterStatus]);

    const loadInvoices = async () => {
        try {
            setLoading(true);
            const response = await api.getInvoices(undefined, filterStatus);
            setInvoices(response.invoices);
        } catch (error) {
            console.error('Error loading invoices:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const getSortIcon = (key: string) => {
        if (!sortConfig || sortConfig.key !== key) return <ArrowUpDown size={14} className="ml-1 opacity-30" />;
        return sortConfig.direction === 'asc' ? <ArrowUp size={14} className="ml-1" /> : <ArrowDown size={14} className="ml-1" />;
    };

    const filteredAndSortedInvoices = useMemo(() => {
        return invoices.filter(i => {
            const matchesStatus = filterStatus ? i.status === filterStatus : true;
            const matchesSearch = searchQuery ? (
                i.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
                i.client_name.toLowerCase().includes(searchQuery.toLowerCase())
            ) : true;
            return matchesStatus && matchesSearch;
        }).sort((a, b) => {
            if (!sortConfig) return 0;
            const { key, direction } = sortConfig;

            let aVal = a[key as keyof Invoice];
            let bVal = b[key as keyof Invoice];

            if (key === 'created_at' || key === 'due_date') {
                aVal = aVal ? new Date(aVal as string).getTime() : 0;
                bVal = bVal ? new Date(bVal as string).getTime() : 0;
            }

            if (aVal! < bVal!) return direction === 'asc' ? -1 : 1;
            if (aVal! > bVal!) return direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [invoices, filterStatus, searchQuery, sortConfig]);

    const handleStatusMove = async (invoiceId: number, newStatus: string) => {
        try {
            await api.put(`/api/invoices/${invoiceId}`, { status: newStatus });
            toast.success(t('messages.invoiceUpdated'));
            loadInvoices();
        } catch (error) {
            toast.error(t('errors.updateError', 'Failed to update status'));
        }
    };

    const handleDragStart = (e: React.DragEvent, invoiceId: number) => {
        e.dataTransfer.setData('invoiceId', invoiceId.toString());
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleDrop = (e: React.DragEvent, newStatus: string) => {
        e.preventDefault();
        const invoiceId = parseInt(e.dataTransfer.getData('invoiceId'));
        const invoice = invoices.find(i => i.id === invoiceId);
        if (invoice && invoice.status !== newStatus) {
            handleStatusMove(invoiceId, newStatus);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm(t('messages.confirmDelete'))) return;

        try {
            await api.delete(`/api/invoices/${id}`);
            toast.success(t('messages.invoiceDeleted'));
            loadInvoices();
        } catch (error) {
            console.error('Error deleting invoice:', error);
            toast.error(t('errors.deleteError', 'Error deleting invoice'));
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'draft': return 'draft';
            case 'sent': return 'sent';
            case 'partial': return 'partial';
            case 'paid': return 'paid';
            case 'overdue': return 'overdue';
            case 'cancelled': return 'cancelled';
            default: return '';
        }
    };

    const getPaymentProgress = (invoice: Invoice) => {
        if (invoice.total_amount === 0) return 0;
        return (invoice.paid_amount / invoice.total_amount) * 100;
    };

    const statuses = ['draft', 'sent', 'partial', 'paid', 'overdue'];

    return (
        <div className="crm-page p-0 bg-gray-50/50 flex flex-col h-full overflow-hidden">
            <div className="px-8 py-6 bg-white border-b sticky top-0 z-20 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
                        <p className="text-sm text-gray-500 mt-1">{t('subtitle')}</p>
                    </div>
                    <div className="flex gap-3">
                        <div className="bg-gray-100 p-1 rounded-lg flex items-center border border-gray-200">
                            <button
                                onClick={() => setViewMode('board')}
                                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center ${viewMode === 'board'
                                    ? 'bg-white text-gray-900 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-900'
                                    }`}
                            >
                                <Layout className="w-4 h-4 mr-2" />
                                {t('board', 'Доска')}
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center ${viewMode === 'list'
                                    ? 'bg-white text-gray-900 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-900'
                                    }`}
                            >
                                <LayoutDashboard className="w-4 h-4 mr-2" />
                                {t('allInvoices', 'Все счета')}
                            </button>
                        </div>

                        <button className="crm-btn-primary h-10" onClick={() => setShowAddDialog(true)}>
                            <Plus size={18} />
                            {t('addInvoice')}
                        </button>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 min-w-0 flex-1">
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="crm-select text-sm h-9 min-w-[150px]"
                        >
                            <option value="">{t('allStatuses')}</option>
                            {statuses.map(s => (
                                <option key={s} value={s}>{t(`statuses.${s}`)}</option>
                            ))}
                        </select>
                    </div>

                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder={t('search_placeholder', 'Поиск по номеру или клиенту...')}
                            className="pl-9 pr-4 h-9 w-full md:w-64 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 outline-none transition-all"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-hidden p-6">
                {loading ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
                    </div>
                ) : viewMode === 'board' ? (
                    <div className="h-full overflow-x-auto flex gap-6 pb-4">
                        {statuses.map(status => (
                            <div
                                key={status}
                                className="w-80 flex flex-col h-full bg-gray-100/50 rounded-xl border border-gray-200/60"
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDrop(e, status)}
                            >
                                <div className="p-4 border-b border-gray-200/60 bg-white/50 backdrop-blur-sm rounded-t-xl">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-semibold text-sm text-gray-700 uppercase tracking-tight">
                                            {t(`statuses.${status}`)}
                                        </h3>
                                        <span className="px-2 py-0.5 rounded-full bg-white border text-xs font-mono text-gray-500 shadow-sm">
                                            {filteredAndSortedInvoices.filter(i => i.status === status).length}
                                        </span>
                                    </div>
                                    <div className={`h-1 w-full rounded-full mt-3 bg-gray-200 overflow-hidden`}>
                                        <div
                                            className={`h-full transition-all duration-500`}
                                            style={{
                                                width: '100%',
                                                backgroundColor: status === 'paid' ? '#10b981' :
                                                    status === 'sent' ? '#3b82f6' :
                                                        status === 'partial' ? '#f59e0b' :
                                                            status === 'overdue' ? '#ef4444' : '#64748b'
                                            }}
                                        />
                                    </div>
                                </div>

                                <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3 no-scrollbar">
                                    {filteredAndSortedInvoices.filter(i => i.status === status).map(invoice => (
                                        <div
                                            key={invoice.id}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, invoice.id)}
                                            className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing group relative"
                                        >
                                            <div className="flex items-start justify-between mb-2">
                                                <div className="flex items-center gap-1.5 text-xs font-medium text-pink-600 bg-pink-50 px-2 py-0.5 rounded-full">
                                                    <FileText size={12} />
                                                    {invoice.invoice_number}
                                                </div>
                                            </div>

                                            <div className="font-bold text-gray-900 mb-1">{invoice.client_name}</div>
                                            <div className="text-sm font-semibold text-gray-700 mb-2">
                                                {invoice.total_amount} {invoice.currency}
                                            </div>

                                            <div className="mb-3">
                                                <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                                                    <span>{t('paidAmount')}</span>
                                                    <span>{Math.round(getPaymentProgress(invoice))}%</span>
                                                </div>
                                                <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-green-500 transition-all"
                                                        style={{ width: `${getPaymentProgress(invoice)}%` }}
                                                    />
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                                                <div className="text-[10px] text-gray-400 flex items-center gap-1">
                                                    <Clock size={10} />
                                                    {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : '-'}
                                                </div>
                                                <div className="flex gap-1">
                                                    <button
                                                        className="p-1.5 hover:bg-green-50 text-gray-400 hover:text-green-600 rounded-lg transition-colors"
                                                        onClick={() => {
                                                            setSelectedInvoice(invoice);
                                                            setShowPaymentDialog(true);
                                                        }}
                                                        title={t('addPayment')}
                                                    >
                                                        <DollarSign size={14} />
                                                    </button>
                                                    <button
                                                        className="p-1.5 hover:bg-blue-50 text-gray-400 hover:text-blue-600 rounded-lg transition-colors"
                                                        onClick={() => {
                                                            setSelectedInvoice(invoice);
                                                            setShowSendDialog(true);
                                                        }}
                                                        title={t('sendButton')}
                                                    >
                                                        <Send size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {filteredAndSortedInvoices.filter(i => i.status === status).length === 0 && (
                                        <div className="text-center py-8 text-xs text-gray-400 italic">
                                            {t('noInvoices')}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="h-full bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                        <div className="flex-1 overflow-auto">
                            <table className="crm-table w-full">
                                <thead className="sticky top-0 bg-gray-50 z-10 shadow-sm">
                                    <tr>
                                        <th onClick={() => handleSort('invoice_number')} className="cursor-pointer hover:bg-gray-100 transition-colors">
                                            <div className="flex items-center">{t('invoiceNumber')} {getSortIcon('invoice_number')}</div>
                                        </th>
                                        <th onClick={() => handleSort('client_name')} className="cursor-pointer hover:bg-gray-100 transition-colors">
                                            <div className="flex items-center">{t('client')} {getSortIcon('client_name')}</div>
                                        </th>
                                        <th onClick={() => handleSort('total_amount')} className="cursor-pointer hover:bg-gray-100 transition-colors">
                                            <div className="flex items-center">{t('totalAmount')} {getSortIcon('total_amount')}</div>
                                        </th>
                                        <th onClick={() => handleSort('paid_amount')} className="cursor-pointer hover:bg-gray-100 transition-colors">
                                            <div className="flex items-center">{t('paidAmount')} {getSortIcon('paid_amount')}</div>
                                        </th>
                                        <th onClick={() => handleSort('status')} className="cursor-pointer hover:bg-gray-100 transition-colors">
                                            <div className="flex items-center">{t('status')} {getSortIcon('status')}</div>
                                        </th>
                                        <th onClick={() => handleSort('due_date')} className="cursor-pointer hover:bg-gray-100 transition-colors">
                                            <div className="flex items-center">{t('dueDate')} {getSortIcon('due_date')}</div>
                                        </th>
                                        <th className="w-24">{t('actions')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredAndSortedInvoices.map((invoice) => (
                                        <tr key={invoice.id} className="hover:bg-gray-50 transition-colors">
                                            <td>
                                                <div className="flex items-center gap-2 font-medium text-pink-600">
                                                    <FileText size={16} />
                                                    {invoice.invoice_number}
                                                </div>
                                            </td>
                                            <td>
                                                <div className="flex flex-col">
                                                    <div className="font-semibold text-gray-900">{invoice.client_name}</div>
                                                    <div className="text-xs text-gray-500">{invoice.client_phone}</div>
                                                </div>
                                            </td>
                                            <td>
                                                <span className="font-bold">{invoice.total_amount} {invoice.currency}</span>
                                            </td>
                                            <td>
                                                <div className="flex flex-col gap-1 w-32">
                                                    <div className="flex justify-between text-[10px] text-gray-500">
                                                        <span>{invoice.paid_amount} {invoice.currency}</span>
                                                        <span>{Math.round(getPaymentProgress(invoice))}%</span>
                                                    </div>
                                                    <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-green-500 transition-all"
                                                            style={{ width: `${getPaymentProgress(invoice)}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`crm-badge ${getStatusColor(invoice.status)}`}>
                                                    {t(`statuses.${invoice.status}`)}
                                                </span>
                                            </td>
                                            <td className="text-gray-600 text-sm">
                                                {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : '-'}
                                            </td>
                                            <td>
                                                <div className="flex gap-1">
                                                    <button
                                                        className="p-2 hover:bg-green-50 text-gray-400 hover:text-green-600 rounded-lg transition-colors"
                                                        onClick={() => {
                                                            setSelectedInvoice(invoice);
                                                            setShowPaymentDialog(true);
                                                        }}
                                                        title={t('addPayment')}
                                                    >
                                                        <DollarSign size={16} />
                                                    </button>
                                                    <button
                                                        className="p-2 hover:bg-blue-50 text-gray-400 hover:text-blue-600 rounded-lg transition-colors"
                                                        onClick={() => {
                                                            setSelectedInvoice(invoice);
                                                            setShowSendDialog(true);
                                                        }}
                                                        title={t('sendButton')}
                                                    >
                                                        <Send size={16} />
                                                    </button>
                                                    <button
                                                        className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded-lg transition-colors"
                                                        onClick={() => handleDelete(invoice.id)}
                                                        title={t('delete')}
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredAndSortedInvoices.length === 0 && (
                                        <tr>
                                            <td colSpan={7} className="text-center py-12 text-gray-400">
                                                {t('noInvoices')}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {showAddDialog && (
                <InvoiceDialog
                    onClose={() => setShowAddDialog(false)}
                    onSuccess={() => {
                        setShowAddDialog(false);
                        loadInvoices();
                    }}
                />
            )}

            {showPaymentDialog && selectedInvoice && (
                <PaymentDialog
                    invoice={selectedInvoice}
                    onClose={() => {
                        setShowPaymentDialog(false);
                        setSelectedInvoice(null);
                    }}
                    onSuccess={() => {
                        setShowPaymentDialog(false);
                        setSelectedInvoice(null);
                        loadInvoices();
                    }}
                />
            )}

            {showSendDialog && selectedInvoice && (
                <SendInvoiceDialog
                    invoice={selectedInvoice}
                    onClose={() => {
                        setShowSendDialog(false);
                        setSelectedInvoice(null);
                    }}
                    onSuccess={() => {
                        setShowSendDialog(false);
                        setSelectedInvoice(null);
                        loadInvoices();
                    }}
                />
            )}
        </div>
    );
};

const InvoiceDialog = ({ onClose, onSuccess }: any) => {
    const { t } = useTranslation('admin/invoices');
    const { currency } = useCurrency();
    const [clients, setClients] = useState<any[]>([]);
    const [items, setItems] = useState([{ name: '', quantity: 1, price: 0 }]);
    const [formData, setFormData] = useState({
        client_id: '',
        booking_id: null,
        notes: '',
        due_date: ''
    });

    useEffect(() => {
        loadClients();
    }, []);

    const loadClients = async () => {
        try {
            const response = await api.get('/api/clients');
            setClients(response.clients || []);
        } catch (error) {
            console.error('Error loading clients:', error);
        }
    };

    const addItem = () => {
        setItems([...items, { name: '', quantity: 1, price: 0 }]);
    };

    const updateItem = (index: number, field: string, value: any) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };
        setItems(newItems);
    };

    const removeItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const calculateTotal = () => {
        return items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const invoiceItems = items.map(item => ({
                name: item.name,
                quantity: item.quantity,
                price: item.price,
                amount: item.quantity * item.price
            }));

            await api.post('/api/invoices', {
                ...formData,
                items: invoiceItems
            });
            toast.success(t('messages.invoiceCreated'));
            onSuccess();
        } catch (error) {
            console.error('Error creating invoice:', error);
            toast.error(t('errors.createError', 'Error creating invoice'));
        }
    };

    return (
        <div className="crm-modal-overlay" onClick={onClose}>
            <div className="crm-modal modal-large" onClick={(e) => e.stopPropagation()}>
                <button className="crm-modal-close" onClick={onClose}>
                    <X size={20} />
                </button>
                <h2 className="text-xl font-bold mb-4">{t('addInvoice')}</h2>
                <form onSubmit={handleSubmit}>
                    <div className="crm-form-content">
                        <div className="crm-form-group">
                            <label className="crm-label">{t('form.selectClient')}</label>
                            <select
                                className="crm-select"
                                value={formData.client_id}
                                onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                                required
                            >
                                <option value="">{t('form.selectClient')}</option>
                                {clients.map((client) => (
                                    <option key={client.instagram_id} value={client.instagram_id}>
                                        {client.name} - {client.phone}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="invoice-items mt-6">
                            <h3 className="text-lg font-semibold mb-3">{t('form.items')}</h3>
                            <div className="space-y-3">
                                {items.map((item, index) => (
                                    <div key={index} className="flex gap-3 items-end">
                                        <div className="flex-1">
                                            <label className="crm-label">{t('form.itemName')}</label>
                                            <input
                                                type="text"
                                                className="crm-input"
                                                value={item.name}
                                                onChange={(e) => updateItem(index, 'name', e.target.value)}
                                                required
                                            />
                                        </div>
                                        <div className="w-24">
                                            <label className="crm-label">{t('form.itemQuantity')}</label>
                                            <input
                                                type="number"
                                                className="crm-input"
                                                value={item.quantity}
                                                onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value))}
                                                min="1"
                                                required
                                            />
                                        </div>
                                        <div className="w-32">
                                            <label className="crm-label">{t('form.itemPrice')}</label>
                                            <input
                                                type="number"
                                                className="crm-input"
                                                step="0.01"
                                                value={item.price}
                                                onChange={(e) => updateItem(index, 'price', parseFloat(e.target.value))}
                                                required
                                            />
                                        </div>
                                        <div className="w-24 pb-2 text-sm font-bold text-gray-700">
                                            {(item.quantity * item.price).toFixed(2)}
                                        </div>
                                        {items.length > 1 && (
                                            <button
                                                type="button"
                                                className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50"
                                                onClick={() => removeItem(index)}
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                            <button type="button" className="crm-btn-secondary mt-3" onClick={addItem}>
                                <Plus size={16} />
                                {t('form.addItem')}
                            </button>
                        </div>

                        <div className="mt-6 p-4 bg-gray-50 rounded-xl flex justify-end items-center gap-4">
                            <span className="text-gray-600">{t('totalAmount')}</span>
                            <span className="text-2xl font-bold text-gray-900">{calculateTotal().toFixed(2)} {currency}</span>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mt-6">
                            <div className="crm-form-group">
                                <label className="crm-label">{t('form.dueDate')}</label>
                                <input
                                    type="date"
                                    className="crm-input"
                                    value={formData.due_date}
                                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="crm-form-group mt-4">
                            <label className="crm-label">{t('form.notes')}</label>
                            <textarea
                                className="crm-textarea"
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                rows={3}
                            />
                        </div>
                    </div>

                    <div className="crm-modal-footer mt-8 flex justify-end gap-3">
                        <button type="button" className="crm-btn-secondary" onClick={onClose}>
                            {t('form.cancel')}
                        </button>
                        <button type="submit" className="crm-btn-primary">
                            {t('form.save')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const PaymentDialog = ({ invoice, onClose, onSuccess }: any) => {
    const { t } = useTranslation('admin/invoices');
    const [formData, setFormData] = useState({
        amount: invoice.total_amount - invoice.paid_amount,
        payment_method: 'cash',
        notes: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post(`/api/invoices/${invoice.id}/payments`, formData);
            toast.success(t('messages.paymentAdded'));
            onSuccess();
        } catch (error) {
            console.error('Error adding payment:', error);
            toast.error(t('errors.paymentError', 'Error adding payment'));
        }
    };

    return (
        <div className="crm-modal-overlay" onClick={onClose}>
            <div className="crm-modal" onClick={(e) => e.stopPropagation()}>
                <button className="crm-modal-close" onClick={onClose}>
                    <X size={20} />
                </button>
                <h2 className="text-xl font-bold mb-1">{t('payment.title')}</h2>
                <p className="text-sm text-gray-500 mb-6 font-mono">
                    {invoice.invoice_number} • {invoice.client_name}
                </p>
                <form onSubmit={handleSubmit}>
                    <div className="crm-form-content">
                        <div className="crm-form-group">
                            <label className="crm-label">{t('payment.amount')}</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    className="crm-input pr-12 font-bold text-lg"
                                    step="0.01"
                                    value={formData.amount}
                                    onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                                    max={invoice.total_amount - invoice.paid_amount}
                                    required
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">
                                    {invoice.currency}
                                </span>
                            </div>
                        </div>

                        <div className="crm-form-group">
                            <label className="crm-label">{t('payment.method')}</label>
                            <select
                                className="crm-select"
                                value={formData.payment_method}
                                onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                            >
                                <option value="cash">{t('payment.methods.cash')}</option>
                                <option value="card">{t('payment.methods.card')}</option>
                                <option value="transfer">{t('payment.methods.transfer')}</option>
                                <option value="online">{t('payment.methods.online')}</option>
                            </select>
                        </div>

                        <div className="crm-form-group">
                            <label className="crm-label">{t('payment.notes')}</label>
                            <textarea
                                className="crm-textarea"
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                rows={3}
                            />
                        </div>
                    </div>

                    <div className="crm-modal-footer mt-8 flex justify-end gap-3">
                        <button type="button" className="crm-btn-secondary" onClick={onClose}>
                            {t('form.cancel')}
                        </button>
                        <button type="submit" className="crm-btn-primary">
                            {t('payment.add')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const SendInvoiceDialog = ({ invoice, onClose, onSuccess }: any) => {
    const { t } = useTranslation('admin/invoices');
    const [formData, setFormData] = useState({
        delivery_method: 'email',
        recipient: invoice.client_phone || ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post(`/api/invoices/${invoice.id}/send?delivery_method=${formData.delivery_method}&recipient=${formData.recipient}`);
            toast.success(t('messages.invoiceSent'));
            onSuccess();
        } catch (error) {
            console.error('Error sending invoice:', error);
            toast.error(t('errors.sendError', 'Error sending invoice'));
        }
    };

    return (
        <div className="crm-modal-overlay" onClick={onClose}>
            <div className="crm-modal" onClick={(e) => e.stopPropagation()}>
                <button className="crm-modal-close" onClick={onClose}>
                    <X size={20} />
                </button>
                <h2 className="text-xl font-bold mb-4">{t('sendDialog.title')}</h2>
                <form onSubmit={handleSubmit}>
                    <div className="crm-form-content">
                        <div className="crm-form-group">
                            <label className="crm-label">{t('sendDialog.method')}</label>
                            <select
                                className="crm-select"
                                value={formData.delivery_method}
                                onChange={(e) => setFormData({ ...formData, delivery_method: e.target.value })}
                            >
                                <option value="email">{t('sendDialog.email')}</option>
                                <option value="whatsapp">{t('sendDialog.whatsapp')}</option>
                                <option value="telegram">{t('sendDialog.telegram')}</option>
                            </select>
                        </div>

                        <div className="crm-form-group">
                            <label className="crm-label">{t('sendDialog.recipient')}</label>
                            <input
                                type="text"
                                className="crm-input"
                                value={formData.recipient}
                                onChange={(e) => setFormData({ ...formData, recipient: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    <div className="crm-modal-footer mt-8 flex justify-end gap-3">
                        <button type="button" className="crm-btn-secondary" onClick={onClose}>
                            {t('form.cancel')}
                        </button>
                        <button type="submit" className="crm-btn-primary">
                            {t('sendDialog.sendButton')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Invoices;
