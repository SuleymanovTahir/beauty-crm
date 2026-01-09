import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Send, DollarSign, Edit, Trash2, FileText } from 'lucide-react';
import api from '../../services/api';

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

    useEffect(() => {
        loadInvoices();
    }, [filterStatus]);

    const loadInvoices = async () => {
        try {
            setLoading(true);
            const params: any = {};
            if (filterStatus) params.status = filterStatus;

            const response = await api.get('/invoices', { params });
            setInvoices(response.data.invoices);
        } catch (error) {
            console.error('Error loading invoices:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm(t('messages.confirmDelete'))) return;

        try {
            await api.delete(`/invoices/${id}`);
            loadInvoices();
        } catch (error) {
            console.error('Error deleting invoice:', error);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'draft': return 'status-draft';
            case 'sent': return 'status-sent';
            case 'partial': return 'status-partial';
            case 'paid': return 'status-paid';
            case 'overdue': return 'status-overdue';
            case 'cancelled': return 'status-cancelled';
            default: return '';
        }
    };

    const getPaymentProgress = (invoice: Invoice) => {
        if (invoice.total_amount === 0) return 0;
        return (invoice.paid_amount / invoice.total_amount) * 100;
    };

    return (
        <div className="invoices-page">
            <div className="page-header">
                <h1>{t('title')}</h1>
                <button className="btn-primary" onClick={() => setShowAddDialog(true)}>
                    <Plus size={20} />
                    {t('addInvoice')}
                </button>
            </div>

            <div className="filters">
                <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="filter-select"
                >
                    <option value="">{t('allStatuses')}</option>
                    <option value="draft">{t('statuses.draft')}</option>
                    <option value="sent">{t('statuses.sent')}</option>
                    <option value="partial">{t('statuses.partial')}</option>
                    <option value="paid">{t('statuses.paid')}</option>
                    <option value="overdue">{t('statuses.overdue')}</option>
                </select>
            </div>

            {loading ? (
                <div className="loading">{t('loading')}</div>
            ) : (
                <div className="invoices-table">
                    <table>
                        <thead>
                            <tr>
                                <th>{t('invoiceNumber')}</th>
                                <th>{t('client')}</th>
                                <th>{t('totalAmount')}</th>
                                <th>{t('paidAmount')}</th>
                                <th>{t('status')}</th>
                                <th>{t('dueDate')}</th>
                                <th>{t('actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {invoices.map((invoice) => (
                                <tr key={invoice.id}>
                                    <td>
                                        <div className="invoice-number">
                                            <FileText size={16} />
                                            {invoice.invoice_number}
                                        </div>
                                    </td>
                                    <td>
                                        <div className="client-info">
                                            <div className="client-name">{invoice.client_name}</div>
                                            <div className="client-phone">{invoice.client_phone}</div>
                                        </div>
                                    </td>
                                    <td>
                                        <strong>{invoice.total_amount} {invoice.currency}</strong>
                                    </td>
                                    <td>
                                        <div className="payment-info">
                                            <div className="amount">{invoice.paid_amount} {invoice.currency}</div>
                                            <div className="progress-bar">
                                                <div
                                                    className="progress-fill"
                                                    style={{ width: `${getPaymentProgress(invoice)}%` }}
                                                />
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <span className={`status-badge ${getStatusColor(invoice.status)}`}>
                                            {t(`statuses.${invoice.status}`)}
                                        </span>
                                    </td>
                                    <td>
                                        {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : '-'}
                                    </td>
                                    <td>
                                        <div className="actions">
                                            <button
                                                className="btn-icon"
                                                onClick={() => {
                                                    setSelectedInvoice(invoice);
                                                    setShowPaymentDialog(true);
                                                }}
                                                title={t('addPayment')}
                                            >
                                                <DollarSign size={16} />
                                            </button>
                                            <button
                                                className="btn-icon"
                                                onClick={() => {
                                                    setSelectedInvoice(invoice);
                                                    setShowSendDialog(true);
                                                }}
                                                title={t('sendButton')}
                                            >
                                                <Send size={16} />
                                            </button>
                                            <button
                                                className="btn-icon"
                                                onClick={() => handleDelete(invoice.id)}
                                                title={t('delete')}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

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
            const response = await api.get('/clients');
            setClients(response.data.clients);
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

            await api.post('/invoices', {
                ...formData,
                items: invoiceItems
            });
            onSuccess();
        } catch (error) {
            console.error('Error creating invoice:', error);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
                <h2>{t('addInvoice')}</h2>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>{t('form.selectClient')}</label>
                        <select
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

                    <div className="invoice-items">
                        <h3>{t('form.items')}</h3>
                        {items.map((item, index) => (
                            <div key={index} className="item-row">
                                <input
                                    type="text"
                                    placeholder={t('form.itemName')}
                                    value={item.name}
                                    onChange={(e) => updateItem(index, 'name', e.target.value)}
                                    required
                                />
                                <input
                                    type="number"
                                    placeholder={t('form.itemQuantity')}
                                    value={item.quantity}
                                    onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value))}
                                    min="1"
                                    required
                                />
                                <input
                                    type="number"
                                    step="0.01"
                                    placeholder={t('form.itemPrice')}
                                    value={item.price}
                                    onChange={(e) => updateItem(index, 'price', parseFloat(e.target.value))}
                                    required
                                />
                                <span className="item-amount">
                                    {(item.quantity * item.price).toFixed(2)}
                                </span>
                                {items.length > 1 && (
                                    <button
                                        type="button"
                                        className="btn-icon"
                                        onClick={() => removeItem(index)}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                )}
                            </div>
                        ))}
                        <button type="button" className="btn-secondary" onClick={addItem}>
                            {t('form.addItem')}
                        </button>
                    </div>

                    <div className="invoice-total">
                        <strong>{t('totalAmount')}: {calculateTotal().toFixed(2)} AED</strong>
                    </div>

                    <div className="form-group">
                        <label>{t('form.dueDate')}</label>
                        <input
                            type="date"
                            value={formData.due_date}
                            onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                        />
                    </div>

                    <div className="form-group">
                        <label>{t('form.notes')}</label>
                        <textarea
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            rows={3}
                        />
                    </div>

                    <div className="form-actions">
                        <button type="button" className="btn-secondary" onClick={onClose}>
                            {t('form.cancel')}
                        </button>
                        <button type="submit" className="btn-primary">
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
            await api.post(`/invoices/${invoice.id}/payments`, formData);
            onSuccess();
        } catch (error) {
            console.error('Error adding payment:', error);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <h2>{t('payment.title')}</h2>
                <p className="invoice-info">
                    {invoice.invoice_number} - {invoice.client_name}
                </p>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>{t('payment.amount')}</label>
                        <input
                            type="number"
                            step="0.01"
                            value={formData.amount}
                            onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                            max={invoice.total_amount - invoice.paid_amount}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>{t('payment.method')}</label>
                        <select
                            value={formData.payment_method}
                            onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                        >
                            <option value="cash">{t('payment.methods.cash')}</option>
                            <option value="card">{t('payment.methods.card')}</option>
                            <option value="transfer">{t('payment.methods.transfer')}</option>
                            <option value="online">{t('payment.methods.online')}</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label>{t('payment.notes')}</label>
                        <textarea
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            rows={3}
                        />
                    </div>

                    <div className="form-actions">
                        <button type="button" className="btn-secondary" onClick={onClose}>
                            {t('form.cancel')}
                        </button>
                        <button type="submit" className="btn-primary">
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
            await api.post(`/invoices/${invoice.id}/send?delivery_method=${formData.delivery_method}&recipient=${formData.recipient}`);
            onSuccess();
        } catch (error) {
            console.error('Error sending invoice:', error);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <h2>{t('sendDialog.title')}</h2>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>{t('sendDialog.method')}</label>
                        <select
                            value={formData.delivery_method}
                            onChange={(e) => setFormData({ ...formData, delivery_method: e.target.value })}
                        >
                            <option value="email">{t('sendDialog.email')}</option>
                            <option value="whatsapp">{t('sendDialog.whatsapp')}</option>
                            <option value="telegram">{t('sendDialog.telegram')}</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label>{t('sendDialog.recipient')}</label>
                        <input
                            type="text"
                            value={formData.recipient}
                            onChange={(e) => setFormData({ ...formData, recipient: e.target.value })}
                            required
                        />
                    </div>

                    <div className="form-actions">
                        <button type="button" className="btn-secondary" onClick={onClose}>
                            {t('form.cancel')}
                        </button>
                        <button type="submit" className="btn-primary">
                            {t('sendDialog.sendButton')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Invoices;
