import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Send, Trash2, FileText, X, Edit, Settings } from 'lucide-react';
import { toast } from 'sonner';
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

interface ContractType {
    id: number;
    name: string;
    code: string;
    description: string;
    is_system: boolean;
}

const Contracts = () => {
    const { t } = useTranslation('admin/contracts');
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [contractTypes, setContractTypes] = useState<ContractType[]>([]);
    const [loading, setLoading] = useState(true);
    const [showContractDialog, setShowContractDialog] = useState(false);
    const [showSendDialog, setShowSendDialog] = useState(false);
    const [showTypesDialog, setShowTypesDialog] = useState(false);
    const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
    const [editingContract, setEditingContract] = useState<Contract | null>(null);
    const [filterStatus, setFilterStatus] = useState<string>('');
    const [userRole, setUserRole] = useState<string>('');

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        setUserRole(user.role || '');
        loadData();
    }, [filterStatus]);

    const loadData = async () => {
        try {
            setLoading(true);
            const [contractsRes, typesRes] = await Promise.all([
                api.getContracts(undefined, filterStatus),
                api.getContractTypes()
            ]);
            setContracts(contractsRes.contracts);
            setContractTypes(typesRes.types || []);
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm(t('messages.confirmDelete'))) return;

        try {
            await api.delete(`/api/contracts/${id}`);
            toast.success(t('messages.contractDeleted'));
            loadData();
        } catch (error) {
            console.error('Error deleting contract:', error);
            toast.error(t('errors.deleteError', 'Error deleting contract'));
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

    const getTypeName = (code: string) => {
        const type = contractTypes.find(t => t.code === code);
        return type ? type.name : code;
    }

    const canManageTypes = ['admin', 'director'].includes(userRole);

    return (
        <div className="crm-page">
            <div className="crm-page-header">
                <div>
                    <h1>{t('title')}</h1>
                    <p className="text-gray-600">{t('subtitle')}</p>
                </div>
                <div className="flex gap-2">
                    {canManageTypes && (
                        <button className="crm-btn-secondary" onClick={() => setShowTypesDialog(true)}>
                            <Settings size={20} />
                            {t('manageTypes', 'Типы договоров')}
                        </button>
                    )}
                    <button className="crm-btn-primary" onClick={() => {
                        setEditingContract(null);
                        setShowContractDialog(true);
                    }}>
                        <Plus size={20} />
                        {t('addContract')}
                    </button>
                </div>
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
                                <th>{t('type', 'Тип')}</th>
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
                                        {getTypeName(contract.contract_type)}
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
                                                    setEditingContract(contract);
                                                    setShowContractDialog(true);
                                                }}
                                                title={t('editButton')}
                                            >
                                                <Edit size={16} />
                                            </button>
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

            {showContractDialog && (
                <ContractDialog
                    contract={editingContract}
                    contractTypes={contractTypes}
                    onClose={() => setShowContractDialog(false)}
                    onSuccess={() => {
                        setShowContractDialog(false);
                        loadData();
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
                        loadData();
                    }}
                />
            )}

            {showTypesDialog && (
                <ContractTypesDialog
                    onClose={() => setShowTypesDialog(false)}
                    onUpdate={() => loadData()}
                />
            )}
        </div>
    );
};

interface ContractDialogProps {
    contract?: Contract | null;
    contractTypes: ContractType[];
    onClose: () => void;
    onSuccess: () => void;
}

const ContractDialog = ({ contract, contractTypes, onClose, onSuccess }: ContractDialogProps) => {
    const { t } = useTranslation('admin/contracts');
    const [clients, setClients] = useState<any[]>([]);
    const [formData, setFormData] = useState<{ client_id: string; booking_id: number | null; contract_type: string; template_name: string }>({
        client_id: '',
        booking_id: null,
        contract_type: 'service',
        template_name: 'default'
    });

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const isRestricted = ['sales', 'manager'].includes(user.role);

    useEffect(() => {
        loadClients();
        if (contract) {
            setFormData({
                client_id: contract.client_id,
                booking_id: contract.booking_id || null,
                contract_type: contract.contract_type || 'service',
                template_name: 'default'
            });
        }
    }, [contract]);

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
            if (contract) {
                await api.put(`/api/contracts/${contract.id}`, formData);
                toast.success(t('messages.contractUpdated'));
            } else {
                await api.post('/api/contracts', formData);
                toast.success(t('messages.contractCreated'));
            }
            onSuccess();
        } catch (error) {
            console.error('Error saving contract:', error);
            toast.error(t('errors.saveError', 'Error saving contract'));
        }
    };

    // Filter types logic
    const displayedTypes = isRestricted
        ? contractTypes.filter(type => type.code === 'service')
        : contractTypes;

    return (
        <div className="crm-modal-overlay" onClick={onClose}>
            <div className="crm-modal" onClick={(e) => e.stopPropagation()}>
                <button className="crm-modal-close" onClick={onClose}>
                    <X size={20} />
                </button>
                <h2>{contract ? t('editContract') : t('addContract')}</h2>
                <form onSubmit={handleSubmit}>
                    <div className="crm-form-content">
                        <div className="crm-form-group">
                            <label className="crm-label">{t('form.selectClient')}</label>
                            <select
                                className="crm-select"
                                value={formData.client_id}
                                onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                                required
                                disabled={!!contract}
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
                                {displayedTypes.map((type) => (
                                    <option key={type.code} value={type.code}>
                                        {type.name}
                                    </option>
                                ))}
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
            toast.success(t('messages.contractSent'));
            onSuccess();
        } catch (error) {
            console.error('Error sending contract:', error);
            toast.error(t('errors.sendError', 'Error sending contract'));
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

const ContractTypesDialog = ({ onClose, onUpdate }: any) => {
    const { t } = useTranslation('admin/contracts');
    const [types, setTypes] = useState<ContractType[]>([]);
    const [editingType, setEditingType] = useState<ContractType | null>(null);
    const [formData, setFormData] = useState({ name: '', code: '', description: '' });
    const [mode, setMode] = useState<'list' | 'edit' | 'delete'>('list');
    const [typeToDelete, setTypeToDelete] = useState<ContractType | null>(null);
    const [deleteWithDocs, setDeleteWithDocs] = useState(false);

    useEffect(() => {
        loadTypes();
    }, []);

    const loadTypes = async () => {
        try {
            const response = await api.getContractTypes();
            setTypes(response.types);
        } catch (error) {
            console.error('Error loading types:', error);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingType) {
                await api.updateContractType(editingType.id, formData);
                toast.success('Тип обновлен');
            } else {
                await api.createContractType(formData);
                toast.success('Тип создан');
            }
            // Reset and reload
            setEditingType(null);
            setFormData({ name: '', code: '', description: '' });
            setMode('list');
            loadTypes();
            onUpdate();
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    const confirmDelete = async () => {
        if (!typeToDelete) return;
        try {
            await api.deleteContractType(typeToDelete.id, deleteWithDocs);
            toast.success('Тип удален');
            setMode('list');
            setTypeToDelete(null);
            loadTypes();
            onUpdate();
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    if (mode === 'edit') {
        return (
            <div className="crm-modal-overlay" onClick={onClose}>
                <div className="crm-modal" onClick={(e) => e.stopPropagation()}>
                    <button className="crm-modal-close" onClick={() => setMode('list')}>
                        <X size={20} />
                    </button>
                    <h2>{editingType ? 'Редактировать тип' : 'Создать тип'}</h2>
                    <form onSubmit={handleSave}>
                        <div className="crm-form-content">
                            <div className="crm-form-group">
                                <label className="crm-label">Название</label>
                                <input className="crm-input" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                            </div>
                            <div className="crm-form-group">
                                <label className="crm-label">Код (с-лат, уникальный)</label>
                                <input className="crm-input" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} required disabled={!!editingType} />
                            </div>
                            <div className="crm-form-group">
                                <label className="crm-label">Описание</label>
                                <textarea className="crm-input" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
                            </div>
                        </div>
                        <div className="crm-modal-footer">
                            <button type="button" className="crm-btn-secondary" onClick={() => setMode('list')}>Отмена</button>
                            <button type="submit" className="crm-btn-primary">Сохранить</button>
                        </div>
                    </form>
                </div>
            </div>
        );
    }

    if (mode === 'delete' && typeToDelete) {
        return (
            <div className="crm-modal-overlay" onClick={onClose}>
                <div className="crm-modal" onClick={(e) => e.stopPropagation()}>
                    <button className="crm-modal-close" onClick={() => setMode('list')}>
                        <X size={20} />
                    </button>
                    <h2>Удаление типа "{typeToDelete.name}"</h2>
                    <div className="crm-form-content">
                        <p className="mb-4">Вы хотите удалить этот тип договора. Как поступить с существующими договорами этого типа?</p>

                        <div className="flex flex-col gap-2">
                            <label className="flex items-center gap-2 cursor-pointer p-2 border rounded hover:bg-gray-50">
                                <input
                                    type="radio"
                                    name="deleteOption"
                                    checked={deleteWithDocs}
                                    onChange={() => setDeleteWithDocs(true)}
                                />
                                <div>
                                    <span className="font-medium">Удалить все договоры</span>
                                    <p className="text-sm text-gray-500">Все документы этого типа будут удалены безвозвратно.</p>
                                </div>
                            </label>

                            <label className="flex items-center gap-2 cursor-pointer p-2 border rounded hover:bg-gray-50">
                                <input
                                    type="radio"
                                    name="deleteOption"
                                    checked={!deleteWithDocs}
                                    onChange={() => setDeleteWithDocs(false)}
                                />
                                <div>
                                    <span className="font-medium">Оставить договоры без типа</span>
                                    <p className="text-sm text-gray-500">Договоры останутся, но поле "Тип" будет очищено.</p>
                                </div>
                            </label>
                        </div>
                    </div>
                    <div className="crm-modal-footer">
                        <button type="button" className="crm-btn-secondary" onClick={() => setMode('list')}>Отмена</button>
                        <button type="button" className="crm-btn-danger" onClick={confirmDelete}>Подтвердить удаление</button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="crm-modal-overlay" onClick={onClose}>
            <div className="crm-modal" style={{ maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
                <button className="crm-modal-close" onClick={onClose}>
                    <X size={20} />
                </button>
                <div className="flex justify-between items-center mb-4">
                    <h2>Типы договоров</h2>
                    <button className="crm-btn-primary" onClick={() => {
                        setEditingType(null);
                        setFormData({ name: '', code: '', description: '' });
                        setMode('edit');
                    }}>
                        <Plus size={16} /> Добавить
                    </button>
                </div>

                <div className="crm-table-container" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                    <table className="crm-table">
                        <thead>
                            <tr>
                                <th>Название</th>
                                <th>Код</th>
                                <th style={{ width: '100px' }}>Действия</th>
                            </tr>
                        </thead>
                        <tbody>
                            {types.map(type => (
                                <tr key={type.id}>
                                    <td>
                                        <div className="font-medium">{type.name}</div>
                                        <div className="text-xs text-gray-500">{type.description}</div>
                                    </td>
                                    <td><code>{type.code}</code></td>
                                    <td>
                                        <div className="flex gap-2">
                                            <button className="crm-btn-icon" onClick={() => {
                                                setEditingType(type);
                                                setFormData({ name: type.name, code: type.code, description: type.description });
                                                setMode('edit');
                                            }}>
                                                <Edit size={16} />
                                            </button>
                                            <button className="crm-btn-icon text-red-500" onClick={() => {
                                                setTypeToDelete(type);
                                                setDeleteWithDocs(false); // Default to safe option
                                                setMode('delete');
                                            }}>
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Contracts;
