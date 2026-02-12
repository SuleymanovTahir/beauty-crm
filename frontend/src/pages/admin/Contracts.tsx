import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Plus, Send, Trash2, FileText, X, Edit, Settings,
    Layout, LayoutDashboard, Search, Clock, Users,
    ArrowUpDown, ArrowUp, ArrowDown, Lock
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { api } from '../../services/api';
import { ManageStagesDialog } from '../../components/shared/ManageStagesDialog';
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
    const [contractStages, setContractStages] = useState<any[]>([]);
    const [showStagesDialog, setShowStagesDialog] = useState(false);
    const [userRole, setUserRole] = useState<string>('');

    const [searchParams, setSearchParams] = useSearchParams();
    const [viewMode, setViewMode] = useState<'board' | 'list'>(() => {
        const urlMode = searchParams.get('view');
        if (urlMode === 'board' || urlMode === 'list') return urlMode;
        return localStorage.getItem('contracts_view_mode') as 'board' | 'list' || 'board';
    });
    const [subTab, setSubTab] = useState<'all' | 'client' | 'internal'>(() => {
        const urlTab = searchParams.get('tab');
        if (urlTab === 'all' || urlTab === 'client' || urlTab === 'internal') return urlTab;
        return 'all';
    });
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const currentParams = Object.fromEntries(searchParams.entries());
        if (currentParams.view !== viewMode || currentParams.tab !== subTab) {
            setSearchParams({ ...currentParams, view: viewMode, tab: subTab }, { replace: true });
        }
    }, [viewMode, subTab]);

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        setUserRole(user.role || '');
        loadData();
    }, [filterStatus]);

    useEffect(() => {
        localStorage.setItem('contracts_view_mode', viewMode);
    }, [viewMode]);

    const loadData = async () => {
        try {
            setLoading(true);
            const [contractsRes, typesRes, stagesRes] = await Promise.all([
                api.getContracts(undefined, filterStatus),
                api.getContractTypes(),
                api.get('/api/contracts/stages')
            ]);
            setContracts(contractsRes.contracts);
            setContractTypes(typesRes.types || []);
            setContractStages(stagesRes || []);
        } catch (error) {
            console.error('Error loading data:', error);
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

    const filteredAndSortedContracts = useMemo(() => {
        return contracts.filter(c => {
            const matchesStatus = filterStatus ? c.status === filterStatus : true;
            const matchesSearch = searchQuery ? (
                c.contract_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
                c.client_name.toLowerCase().includes(searchQuery.toLowerCase())
            ) : true;

            let matchesSubTab = true;
            if (subTab === 'client') {
                matchesSubTab = !['employment', 'rental'].includes(c.contract_type);
            } else if (subTab === 'internal') {
                matchesSubTab = ['employment', 'rental'].includes(c.contract_type);
            }

            return matchesStatus && matchesSearch && matchesSubTab;
        }).sort((a, b) => {
            if (!sortConfig) return 0;
            const { key, direction } = sortConfig;

            let aVal = a[key as keyof Contract];
            let bVal = b[key as keyof Contract];

            if (key === 'created_at') {
                aVal = new Date(aVal as string).getTime();
                bVal = new Date(bVal as string).getTime();
            }

            if (aVal! < bVal!) return direction === 'asc' ? -1 : 1;
            if (aVal! > bVal!) return direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [contracts, filterStatus, searchQuery, subTab, sortConfig]);

    const handleStatusMove = async (contractId: number, newStageId: number) => {
        try {
            await api.put(`/api/contracts/${contractId}`, { stage_id: newStageId });
            toast.success(t('messages.contractUpdated'));
            loadData();
        } catch (error) {
            toast.error(t('errors.updateError'));
        }
    };

    const handleDragStart = (e: React.DragEvent, contractId: number) => {
        e.dataTransfer.setData('contractId', contractId.toString());
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleDrop = (e: React.DragEvent, newStageId: number) => {
        e.preventDefault();
        const contractIdStr = e.dataTransfer.getData('contractId');
        if (contractIdStr) {
            handleStatusMove(parseInt(contractIdStr), newStageId);
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
            toast.error(t('errors.deleteError'));
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
        <div className="crm-page crm-calendar-theme p-0 bg-gray-50/50 flex flex-col h-full overflow-hidden">
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
                                {t('board')}
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center ${viewMode === 'list'
                                    ? 'bg-white text-gray-900 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-900'
                                    }`}
                            >
                                <LayoutDashboard className="w-4 h-4 mr-2" />
                                {t('allContracts')}
                            </button>
                        </div>

                        {canManageTypes && (
                            <button className="crm-btn-secondary h-10" onClick={() => setShowStagesDialog(true)}>
                                <LayoutDashboard size={18} />
                                <span className="hidden lg:inline ml-2">{t('manage_stages')}</span>
                            </button>
                        )}
                        {canManageTypes && (
                            <button className="crm-btn-secondary h-10" onClick={() => setShowTypesDialog(true)}>
                                <Settings size={18} />
                                <span className="hidden lg:inline ml-2">{t('manageTypes')}</span>
                            </button>
                        )}
                        <button className="crm-btn-primary h-10" onClick={() => {
                            setEditingContract(null);
                            setShowContractDialog(true);
                        }}>
                            <Plus size={18} />
                            <span className="ml-2">{t('addContract')}</span>
                        </button>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 min-w-0 flex-1">
                        {viewMode === 'list' && (
                            <>
                                <button
                                    onClick={() => setSubTab('all')}
                                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all border ${subTab === 'all'
                                        ? 'bg-pink-50 text-pink-600 border-pink-200'
                                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                                        }`}
                                >
                                    {t('all')}
                                </button>
                                <button
                                    onClick={() => setSubTab('client')}
                                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all border ${subTab === 'client'
                                        ? 'bg-pink-50 text-pink-600 border-pink-200'
                                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                                        }`}
                                >
                                    {t('clientContracts')}
                                </button>
                                <button
                                    onClick={() => setSubTab('internal')}
                                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all border ${subTab === 'internal'
                                        ? 'bg-pink-50 text-pink-600 border-pink-200'
                                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                                        }`}
                                >
                                    {t('internalContracts')}
                                </button>
                                <div className="h-4 w-[1px] bg-gray-200 mx-2" />
                            </>
                        )}
                        <div className="relative flex-shrink-0">
                            <select
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                                className="crm-select text-sm h-10 min-w-[160px] py-2"
                                style={{ lineHeight: '1.5' }}
                            >
                                <option value="">{t('allStatuses')}</option>
                                {contractStages.map(s => (
                                    <option key={s.key} value={s.key}>{t(`statuses.${s.key}`, { defaultValue: s.name })}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder={t('search_placeholder')}
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
                        {contractStages.map(stage => (
                            <div
                                key={stage.id}
                                className="w-80 flex flex-col h-full bg-gray-100/50 rounded-xl border border-gray-200/60"
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDrop(e, stage.id)}
                            >
                                <div className="p-4 border-b border-gray-200/60 bg-white/50 backdrop-blur-sm rounded-t-xl">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-semibold text-sm text-gray-700 uppercase tracking-tight">
                                            {t(`statuses.${stage.key}`, { defaultValue: stage.name })}
                                        </h3>
                                        <span className="px-2 py-0.5 rounded-full bg-white border text-xs font-mono text-gray-500 shadow-sm">
                                            {filteredAndSortedContracts.filter(c => c.status === stage.key).length}
                                        </span>
                                    </div>
                                    <div className={`h-1 w-full rounded-full mt-3 bg-gray-200 overflow-hidden`}>
                                        <div
                                            className={`h-full transition-all duration-500`}
                                            style={{
                                                width: '100%',
                                                backgroundColor: stage.color
                                            }}
                                        />
                                    </div>
                                </div>

                                <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3 no-scrollbar">
                                    {filteredAndSortedContracts.filter(c => c.status === stage.key).map(contract => (
                                        <div
                                            key={contract.id}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, contract.id)}
                                            className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing group relative"
                                        >
                                            <div className="flex items-start justify-between mb-2">
                                                <div className="flex items-center gap-1.5 text-xs font-medium text-pink-600 bg-pink-50 px-2 py-0.5 rounded-full">
                                                    <FileText size={12} />
                                                    {contract.contract_number}
                                                </div>
                                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-blue-500"
                                                        onClick={() => {
                                                            setEditingContract(contract);
                                                            setShowContractDialog(true);
                                                        }}
                                                    >
                                                        <Edit size={14} />
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="font-bold text-gray-900 mb-1">{contract.client_name}</div>
                                            <div className="text-xs text-gray-500 flex items-center gap-1 mb-3">
                                                <Users size={12} />
                                                {getTypeName(contract.contract_type)}
                                            </div>

                                            <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                                                <div className="text-[10px] text-gray-400 flex items-center gap-1">
                                                    <Clock size={10} />
                                                    {new Date(contract.created_at).toLocaleDateString('ru-RU')}
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                                                        onClick={() => {
                                                            setSelectedContract(contract);
                                                            setShowSendDialog(true);
                                                        }}
                                                    >
                                                        <Send size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {filteredAndSortedContracts.filter(c => c.status === status).length === 0 && (
                                        <div className="text-center py-8 text-xs text-gray-400 italic">
                                            {t('noContracts')}
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
                                        <th onClick={() => handleSort('contract_number')} className="cursor-pointer hover:bg-gray-100 transition-colors">
                                            <div className="flex items-center">{t('contractNumber')} {getSortIcon('contract_number')}</div>
                                        </th>
                                        <th onClick={() => handleSort('client_name')} className="cursor-pointer hover:bg-gray-100 transition-colors">
                                            <div className="flex items-center">{t('client')} {getSortIcon('client_name')}</div>
                                        </th>
                                        <th onClick={() => handleSort('contract_type')} className="cursor-pointer hover:bg-gray-100 transition-colors">
                                            <div className="flex items-center">{t('type')} {getSortIcon('contract_type')}</div>
                                        </th>
                                        <th onClick={() => handleSort('status')} className="cursor-pointer hover:bg-gray-100 transition-colors">
                                            <div className="flex items-center">{t('status')} {getSortIcon('status')}</div>
                                        </th>
                                        <th onClick={() => handleSort('created_at')} className="cursor-pointer hover:bg-gray-100 transition-colors">
                                            <div className="flex items-center">{t('createdAt')} {getSortIcon('created_at')}</div>
                                        </th>
                                        <th className="w-24">{t('actions')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredAndSortedContracts.map((contract) => (
                                        <tr key={contract.id} className="hover:bg-gray-50 transition-colors">
                                            <td>
                                                <div className="flex items-center gap-2 font-medium text-pink-600">
                                                    <FileText size={16} />
                                                    {contract.contract_number}
                                                </div>
                                            </td>
                                            <td>
                                                <div className="flex flex-col">
                                                    <div className="font-semibold text-gray-900">{contract.client_name}</div>
                                                    <div className="text-xs text-gray-500">{contract.client_phone}</div>
                                                </div>
                                            </td>
                                            <td>
                                                <span className="text-sm px-2 py-1 bg-gray-100 rounded-md text-gray-700">
                                                    {getTypeName(contract.contract_type)}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`crm-badge ${getStatusColor(contract.status)}`}>
                                                    {t(`statuses.${contract.status}`)}
                                                </span>
                                            </td>
                                            <td className="text-gray-600 text-sm">
                                                {new Date(contract.created_at).toLocaleDateString('ru-RU')}
                                            </td>
                                            <td>
                                                <div className="flex gap-1">
                                                    <button
                                                        className="p-2 hover:bg-blue-50 text-gray-400 hover:text-blue-600 rounded-lg transition-colors"
                                                        onClick={() => {
                                                            setEditingContract(contract);
                                                            setShowContractDialog(true);
                                                        }}
                                                    >
                                                        <Edit size={16} />
                                                    </button>
                                                    <button
                                                        className="p-2 hover:bg-green-50 text-gray-400 hover:text-green-600 rounded-lg transition-colors"
                                                        onClick={() => {
                                                            setSelectedContract(contract);
                                                            setShowSendDialog(true);
                                                        }}
                                                    >
                                                        <Send size={16} />
                                                    </button>
                                                    <button
                                                        className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded-lg transition-colors"
                                                        onClick={() => handleDelete(contract.id)}
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredAndSortedContracts.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="text-center py-12 text-gray-400">
                                                {t('noContracts')}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

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

            {showStagesDialog && (
                <ManageStagesDialog
                    open={showStagesDialog}
                    onOpenChange={setShowStagesDialog}
                    onSuccess={loadData}
                    apiUrl="/api/contracts/stages"
                    title={t('manage_stages')}
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
            toast.error(t('errors.saveError'));
        }
    };

    const displayedTypes = isRestricted
        ? contractTypes.filter(type => !['employment', 'rental'].includes(type.code))
        : contractTypes;

    return (
        <div className="crm-modal-overlay" onClick={onClose}>
            <div className="crm-modal" onClick={(e) => e.stopPropagation()}>
                <button className="crm-modal-close" onClick={onClose}>
                    <X size={20} />
                </button>
                <h2 className="text-xl font-bold mb-4">{contract ? t('editContract') : t('addContract')}</h2>
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

                    <div className="crm-modal-footer mt-6 flex justify-end gap-3">
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
            toast.error(t('errors.sendError'));
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

                    <div className="crm-modal-footer mt-6 flex justify-end gap-3">
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
                toast.success(t('typeManagement.messages.updated'));
            } else {
                await api.createContractType(formData);
                toast.success(t('typeManagement.messages.created'));
            }
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
            toast.success(t('typeManagement.messages.deleted'));
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
                    <h2 className="text-xl font-bold mb-4">{editingType ? t('typeManagement.editType') : t('typeManagement.createType')}</h2>
                    <form onSubmit={handleSave}>
                        <div className="crm-form-content">
                            <div className="crm-form-group">
                                <label className="crm-label">{t('typeManagement.name')}</label>
                                <input className="crm-input" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                            </div>
                            {/* Hide code field as requested by user */}
                            {!editingType && (
                                <div className="crm-form-group">
                                    <label className="crm-label">{t('typeManagement.code')}</label>
                                    <input
                                        className="crm-input"
                                        value={formData.code}
                                        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                        required
                                        placeholder="contract_type_code"
                                    />
                                </div>
                            )}
                            <div className="crm-form-group">
                                <label className="crm-label">{t('typeManagement.description')}</label>
                                <textarea className="crm-textarea" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
                            </div>
                        </div>
                        <div className="crm-modal-footer mt-6 flex justify-end gap-3">
                            <button type="button" className="crm-btn-secondary" onClick={() => setMode('list')}>
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
    }

    if (mode === 'delete') {
        return (
            <div className="crm-modal-overlay" onClick={onClose}>
                <div className="crm-modal" onClick={(e) => e.stopPropagation()}>
                    <h2 className="text-xl font-bold mb-2 text-red-600">{t('typeManagement.deleteTitle', { name: typeToDelete?.name })}</h2>
                    <p className="text-gray-600 mb-6">{t('typeManagement.deletePrompt')}</p>

                    <div className="space-y-4 mb-8">
                        <label className={`flex items-start p-4 rounded-xl border-2 transition-all cursor-pointer ${!deleteWithDocs ? 'border-pink-500 bg-pink-50' : 'border-gray-100 hover:border-pink-200'}`}>
                            <input type="radio" name="deleteMode" checked={!deleteWithDocs} onChange={() => setDeleteWithDocs(false)} className="mt-1 mr-3" />
                            <div>
                                <div className="font-bold text-gray-900">{t('typeManagement.keepDocs')}</div>
                                <div className="text-sm text-gray-500">{t('typeManagement.keepDocsSub')}</div>
                            </div>
                        </label>

                        <label className={`flex items-start p-4 rounded-xl border-2 transition-all cursor-pointer ${deleteWithDocs ? 'border-red-500 bg-red-50' : 'border-gray-100 hover:border-red-200'}`}>
                            <input type="radio" name="deleteMode" checked={deleteWithDocs} onChange={() => setDeleteWithDocs(true)} className="mt-1 mr-3" />
                            <div>
                                <div className="font-bold text-red-600">{t('typeManagement.deleteWithDocs')}</div>
                                <div className="text-sm text-red-500">{t('typeManagement.deleteWithDocsSub')}</div>
                            </div>
                        </label>
                    </div>

                    <div className="flex justify-end gap-3">
                        <button className="crm-btn-secondary" onClick={() => setMode('list')}>{t('form.cancel')}</button>
                        <button className="crm-btn-danger" onClick={confirmDelete}>{t('typeManagement.confirmDelete')}</button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="crm-modal-overlay" onClick={onClose}>
            <div className="crm-modal modal-large" onClick={(e) => e.stopPropagation()}>
                <button className="crm-modal-close" onClick={onClose}>
                    <X size={20} />
                </button>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">{t('typeManagement.title')}</h2>
                    <button className="crm-btn-primary" onClick={() => {
                        setEditingType(null);
                        setFormData({ name: '', code: '', description: '' });
                        setMode('edit');
                    }}>
                        <Plus size={18} />
                        {t('typeManagement.add')}
                    </button>
                </div>

                <div className="overflow-auto max-h-[60vh]">
                    <table className="crm-table w-full">
                        <thead>
                            <tr>
                                <th>{t('typeManagement.name')}</th>
                                <th>{t('typeManagement.code')}</th>
                                <th>{t('typeManagement.description')}</th>
                                <th className="w-24 text-right">{t('actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {types.map((type) => (
                                <tr key={type.id}>
                                    <td className="font-medium text-gray-900">{type.name}</td>
                                    <td><code className="bg-gray-100 px-1.5 py-0.5 rounded text-pink-600">{type.code}</code></td>
                                    <td className="text-gray-500">{type.description}</td>
                                    <td>
                                        <div className="flex justify-end items-center gap-1">
                                            {type.is_system ? (
                                                <div className="flex items-center gap-2 pr-2">
                                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-400 border border-gray-200">
                                                        {t('typeManagement.system')}
                                                    </span>
                                                    <div className="p-2 text-gray-300" title={t('typeManagement.systemProtected')}>
                                                        <Lock size={16} className="opacity-40" />
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-blue-600 transition-colors" onClick={() => {
                                                        setEditingType(type);
                                                        setFormData({ name: type.name, code: type.code, description: type.description || '' });
                                                        setMode('edit');
                                                    }}>
                                                        <Edit size={16} />
                                                    </button>
                                                    <button className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg transition-colors" onClick={() => {
                                                        setTypeToDelete(type);
                                                        setDeleteWithDocs(false);
                                                        setMode('delete');
                                                    }}>
                                                        <Trash2 size={16} />
                                                    </button>
                                                </>
                                            )}
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
