import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Send, Trash2, FileText, X } from 'lucide-react';
import { api } from '../../services/api';
import '../../styles/crm-pages.css';



interface Contract {
    id: number;
    contract_number: string;
    client_id: string;
    client_name: string;
    client_phone: string;
    booking_id?: number;
    contract_type: string;
    status: string;
    created_at: string;
    sent_at?: string;
    signed_at?: string;
}

const Contracts = () => {
    const { t } = useTranslation('admin/contracts');
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [showSendDialog, setShowSendDialog] = useState(false);
    const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
    const [filterStatus, setFilterStatus] = useState<string>('');

    useEffect(() => {
        loadContracts();
    }, [filterStatus]);

    const loadContracts = async () => {
        try {
            setLoading(true);
            const response = await api.getContracts(undefined, filterStatus);
            setContracts(response.contracts);
        } catch (error) {
            console.error('Error loading contracts:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm(t('messages.confirmDelete'))) return;

        try {
            await api.delete(`/api/contracts/${id}`);
            loadContracts();
        } catch (error) {
            console.error('Error deleting contract:', error);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'draft': return 'draft';
            case 'sent': return 'sent';
            case 'signed': return 'signed';
            case 'cancelled': return 'cancelled';
            default: return '';
        }
    };

    return (
        <div className="crm-page">
            <div className="crm-page-header">
                <div>
                    <h1>{t('title')}</h1>
                    <p className="text-gray-600">{t('subtitle')}</p>
                </div>
                <button className="crm-btn-primary" onClick={() => setShowAddDialog(true)}>
                    <Plus size={20} />
                    {t('addContract')}
                </button>
            </div>

            <div className="crm-filters">
                <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="crm-filter-select"
                >
                    <option value="">{t('allStatuses')}</option>
                    <option value="draft">{t('statuses.draft')}</option>
                    <option value="sent">{t('statuses.sent')}</option>
                    <option value="signed">{t('statuses.signed')}</option>
                    <option value="cancelled">{t('statuses.cancelled')}</option>
                </select>
            </div>

            {loading ? (
                <div className="crm-loading">{t('loading')}</div>
            ) : (
                <div className="crm-table-container">
                    <table className="crm-table">
                        <thead>
                            <tr>
                                <th>{t('contractNumber')}</th>
                                <th>{t('client')}</th>
                                <th>{t('status')}</th>
                                <th>{t('createdAt')}</th>
                                <th>{t('actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {contracts.map((contract) => (
                                <tr key={contract.id}>
                                    <td>
                                        <div className="contract-number">
                                            <FileText size={16} />
                                            {contract.contract_number}
                                        </div>
                                    </td>
                                    <td>
                                        <div className="client-info">
                                            <div className="client-name">{contract.client_name}</div>
                                            <div className="client-phone">{contract.client_phone}</div>
                                        </div>
                                    </td>
                                    <td>
                                        <span className={`crm-badge ${getStatusColor(contract.status)}`}>
                                            {t(`statuses.${contract.status}`)}
                                        </span>
                                    </td>
                                    <td>{new Date(contract.created_at).toLocaleDateString()}</td>
                                    <td>
                                        <div className="actions">
                                            <button
                                                className="crm-btn-icon"
                                                onClick={() => {
                                                    setSelectedContract(contract);
                                                    setShowSendDialog(true);
                                                }}
                                                title={t('sendButton')}
                                            >
                                                <Send size={16} />
                                            </button>
                                            <button
                                                className="crm-btn-icon"
                                                onClick={() => handleDelete(contract.id)}
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
                <AddContractDialog
                    onClose={() => setShowAddDialog(false)}
                    onSuccess={() => {
                        setShowAddDialog(false);
                        loadContracts();
                    }}
                />
            )}

            {showSendDialog && selectedContract && (
                <SendContractDialog
                    contract={selectedContract}
                    onClose={() => {
                        setShowSendDialog(false);
                        setSelectedContract(null);
                    }}
                    onSuccess={() => {
                        setShowSendDialog(false);
                        setSelectedContract(null);
                        loadContracts();
                    }}
                />
            )}
        </div>
    );
};

const AddContractDialog = ({ onClose, onSuccess }: any) => {
    const { t } = useTranslation('admin/contracts');
    const [clients, setClients] = useState<any[]>([]);
    const [formData, setFormData] = useState({
        client_id: '',
        booking_id: null,
        contract_type: 'service',
        template_name: 'default'
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/api/contracts', formData);
            onSuccess();
        } catch (error) {
            console.error('Error creating contract:', error);
        }
    };

    return (
        <div className="crm-modal-overlay" onClick={onClose}>
            <div className="crm-modal" onClick={(e) => e.stopPropagation()}>
                <button className="crm-modal-close" onClick={onClose}>
                    <X size={20} />
                </button>
                <h2>{t('addContract')}</h2>
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

                        <div className="crm-form-group">
                            <label className="crm-label">{t('form.contractType')}</label>
                            <select
                                className="crm-select"
                                value={formData.contract_type}
                                onChange={(e) => setFormData({ ...formData, contract_type: e.target.value })}
                            >
                                <option value="service">{t('contractTypes.service')}</option>
                                <option value="employment">{t('contractTypes.employment')}</option>
                                <option value="rental">{t('contractTypes.rental')}</option>
                            </select>
                        </div>
                    </div>

                    <div className="crm-modal-footer">
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

const SendContractDialog = ({ contract, onClose, onSuccess }: any) => {
    const { t } = useTranslation('admin/contracts');
    const [formData, setFormData] = useState({
        delivery_method: 'email',
        recipient: contract.client_phone || ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post(`/api/contracts/${contract.id}/send?delivery_method=${formData.delivery_method}&recipient=${formData.recipient}`);
            onSuccess();
        } catch (error) {
            console.error('Error sending contract:', error);
        }
    };

    return (
        <div className="crm-modal-overlay" onClick={onClose}>
            <div className="crm-modal" onClick={(e) => e.stopPropagation()}>
                <button className="crm-modal-close" onClick={onClose}>
                    <X size={20} />
                </button>
                <h2>{t('sendDialog.title')}</h2>
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
                                <option value="instagram">{t('sendDialog.instagram')}</option>
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

                    <div className="crm-modal-footer">
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

export default Contracts;
