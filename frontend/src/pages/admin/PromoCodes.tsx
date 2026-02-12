import { useState, useEffect, useMemo } from 'react';
import {
    Ticket,
    Plus,
    Pencil,
    Trash2,
    Loader,
    CheckCircle2,
    XCircle,
    Percent,
    Calendar,
    Users,
    Activity,
    Search,
    Zap,
    Tag,
    Gift,
    Target
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { api } from '../../services/api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { toast } from 'sonner';
import { useCurrency } from '../../hooks/useSalonSettings';
import '../../styles/crm-pages.css';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '../../components/ui/dialog';

type PromoTargetScope = 'all' | 'categories' | 'services' | 'clients';
type PromoScopeFilter = 'all_scopes' | PromoTargetScope;
type PromoSortKey = 'newest' | 'oldest' | 'discount_desc' | 'usage_desc' | 'code_asc';

interface PromoCode {
    id: number;
    code: string;
    discount_type: 'percent' | 'fixed';
    discount_value: number;
    min_booking_amount: number;
    valid_from: string;
    valid_until: string | null;
    usage_limit: number | null;
    times_used: number;
    is_active: boolean;
    is_personalized: boolean;
    target_client_id: string | null;
    target_scope: PromoTargetScope;
    target_categories: string[];
    target_service_ids: number[];
    target_client_ids: string[];
    created_at: string;
}

interface ServiceOption {
    id: number;
    name: string;
    category: string;
}

interface ClientOption {
    id: string;
    label: string;
}

interface NewPromoState {
    code: string;
    discount_type: 'percent' | 'fixed';
    discount_value: number;
    min_booking_amount: number;
    valid_from: string;
    valid_until: string;
    usage_limit: string;
    target_scope: PromoTargetScope;
    target_categories: string[];
    target_service_ids: string[];
    target_client_ids: string[];
}

interface PromoCodesProps {
    embedded?: boolean;
}

const createInitialPromoState = (): NewPromoState => ({
    code: '',
    discount_type: 'percent',
    discount_value: 10,
    min_booking_amount: 0,
    valid_from: new Date().toISOString().split('T')[0],
    valid_until: '',
    usage_limit: '',
    target_scope: 'all',
    target_categories: [],
    target_service_ids: [],
    target_client_ids: [],
});

export default function PromoCodes({ embedded = false }: PromoCodesProps) {
    const { t } = useTranslation(['admin/promocodes', 'common', 'layouts/mainlayout', 'admin/services']);
    const { currency } = useCurrency();
    const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [editingPromo, setEditingPromo] = useState<PromoCode | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [scopeFilter, setScopeFilter] = useState<PromoScopeFilter>('all_scopes');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [sortBy, setSortBy] = useState<PromoSortKey>('newest');
    const [newPromo, setNewPromo] = useState<NewPromoState>(createInitialPromoState());
    const [serviceOptions, setServiceOptions] = useState<ServiceOption[]>([]);
    const [categoryOptions, setCategoryOptions] = useState<string[]>([]);
    const [clientOptions, setClientOptions] = useState<ClientOption[]>([]);

    const parseNonNegativeInteger = (value: string, fallbackValue: number): number => {
        const parsedValue = Number(value);
        if (!Number.isFinite(parsedValue)) {
            return fallbackValue;
        }
        if (parsedValue < 0) {
            return 0;
        }
        return Math.round(parsedValue);
    };

    const normalizeDateInput = (value: string | null): string => {
        if (typeof value !== 'string') {
            return '';
        }
        const trimmedValue = value.trim();
        if (trimmedValue.length === 0) {
            return '';
        }
        return trimmedValue.slice(0, 10);
    };

    useEffect(() => {
        void loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [promos, servicesResponse, clientsResponse] = await Promise.all([
                api.getPromoCodes(),
                api.getServices(false),
                api.getClients().catch(() => ({ clients: [] })),
            ]);

            setPromoCodes(promos);

            const rawServices = Array.isArray(servicesResponse?.services) ? servicesResponse.services : [];
            const normalizedServices: ServiceOption[] = rawServices
                .map((service: any) => {
                    const id = Number(service?.id);
                    const name = typeof service?.name === 'string' ? service.name.trim() : '';
                    const category = typeof service?.category === 'string' ? service.category.trim() : '';
                    return { id, name, category };
                })
                .filter((service: ServiceOption) => Number.isFinite(service.id) && service.id > 0 && service.name.length > 0);

            setServiceOptions(normalizedServices);
            const uniqueCategories = [...new Set(
                normalizedServices
                    .map((service: ServiceOption) => service.category)
                    .filter((category: string) => category.length > 0)
            )];
            setCategoryOptions(uniqueCategories.sort((left, right) => left.localeCompare(right)));

            const rawClients = Array.isArray(clientsResponse?.clients)
                ? clientsResponse.clients
                : Array.isArray(clientsResponse)
                    ? clientsResponse
                    : [];

            const dedupedClients = new Map<string, ClientOption>();
            rawClients.forEach((client: any) => {
                const clientId = String(client?.id ?? client?.instagram_id ?? client?.username ?? '').trim();
                if (clientId.length === 0) {
                    return;
                }
                const labelSource = client?.display_name ?? client?.name ?? client?.full_name ?? client?.username ?? clientId;
                const trimmedLabel = String(labelSource).trim();
                const label = trimmedLabel.length > 0 ? trimmedLabel : clientId;
                if (!dedupedClients.has(clientId)) {
                    dedupedClients.set(clientId, { id: clientId, label });
                }
            });
            setClientOptions([...dedupedClients.values()]);
        } catch (err) {
            toast.error(t('error_loading', 'Ошибка загрузки промокодов'));
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setNewPromo(createInitialPromoState());
        setEditingPromo(null);
    };

    const handleOpenCreateDialog = () => {
        resetForm();
        setShowCreateDialog(true);
    };

    const handleOpenEditDialog = (promo: PromoCode) => {
        const normalizedValidFrom = normalizeDateInput(promo.valid_from);
        setEditingPromo(promo);
        setNewPromo({
            code: promo.code,
            discount_type: promo.discount_type,
            discount_value: promo.discount_value,
            min_booking_amount: promo.min_booking_amount,
            valid_from: normalizedValidFrom.length > 0 ? normalizedValidFrom : new Date().toISOString().split('T')[0],
            valid_until: normalizeDateInput(promo.valid_until),
            usage_limit: promo.usage_limit === null ? '' : String(promo.usage_limit),
            target_scope: promo.target_scope,
            target_categories: promo.target_categories,
            target_service_ids: promo.target_service_ids.map((value) => String(value)),
            target_client_ids: promo.target_client_ids,
        });
        setShowCreateDialog(true);
    };

    const handleCreate = async () => {
        if (newPromo.code.trim().length === 0) {
            toast.error(t('code_required', 'Введите код'));
            return;
        }

        if (newPromo.discount_value <= 0) {
            toast.error(t('error_creating', 'Ошибка создания'));
            return;
        }

        if (newPromo.discount_type === 'percent' && newPromo.discount_value > 100) {
            toast.error(t('error_creating', 'Ошибка создания'));
            return;
        }

        if (newPromo.valid_until.length > 0 && newPromo.valid_until < newPromo.valid_from) {
            toast.error(t('error_creating', 'Ошибка создания'));
            return;
        }

        if (newPromo.target_scope === 'categories' && newPromo.target_categories.length === 0) {
            toast.error(t('target_categories_required', 'Выберите минимум одну категорию услуг'));
            return;
        }

        if (newPromo.target_scope === 'services' && newPromo.target_service_ids.length === 0) {
            toast.error(t('target_services_required', 'Выберите минимум одну услугу'));
            return;
        }

        if (newPromo.target_scope === 'clients' && newPromo.target_client_ids.length === 0) {
            toast.error(t('target_clients_required', 'Выберите минимум одного клиента'));
            return;
        }

        try {
            const payload = {
                ...newPromo,
                usage_limit: newPromo.usage_limit.length > 0 ? parseNonNegativeInteger(newPromo.usage_limit, 0) : null,
                valid_until: newPromo.valid_until.length > 0 ? newPromo.valid_until : null,
                target_service_ids: newPromo.target_service_ids.map((value: string) => Number(value)),
            };
            if (editingPromo === null) {
                await api.createPromoCode(payload);
                toast.success(t('created_success', 'Промокод создан'));
            } else {
                await api.updatePromoCode(editingPromo.id, payload);
                toast.success(t('updated_success', 'Промокод обновлен'));
            }
            setShowCreateDialog(false);
            resetForm();
            await loadData();
        } catch (err: any) {
            toast.error(err?.error ?? t('error_creating', 'Ошибка создания'));
        }
    };

    const handleToggle = async (id: number) => {
        try {
            await api.togglePromoCode(id);
            await loadData();
            toast.success(t('status_updated', 'Статус обновлен'));
        } catch (err) {
            toast.error(t('error_toggling', 'Ошибка смены статуса'));
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm(t('confirm_delete', 'Удалить этот промокод?'))) return;
        try {
            await api.deletePromoCode(id);
            await loadData();
            toast.success(t('deleted_success', 'Промокод удален'));
        } catch (err) {
            toast.error(t('error_deleting', 'Ошибка удаления'));
        }
    };

    const handleScopeChange = (value: PromoTargetScope) => {
        setNewPromo((prev) => ({
            ...prev,
            target_scope: value,
            target_categories: value === 'categories' ? prev.target_categories : [],
            target_service_ids: value === 'services' ? prev.target_service_ids : [],
            target_client_ids: value === 'clients' ? prev.target_client_ids : [],
        }));
    };

    const handleMultiSelectChange = (field: 'target_categories' | 'target_service_ids' | 'target_client_ids', values: string[]) => {
        setNewPromo((prev) => ({ ...prev, [field]: values }));
    };

    const selectedServicesPreview = useMemo(() => {
        const selectedIds = new Set(newPromo.target_service_ids);
        return serviceOptions.filter((service) => selectedIds.has(String(service.id))).map((service) => service.name);
    }, [newPromo.target_service_ids, serviceOptions]);

    const selectedClientsPreview = useMemo(() => {
        const selectedIds = new Set(newPromo.target_client_ids);
        return clientOptions.filter((client) => selectedIds.has(client.id)).map((client) => client.label);
    }, [newPromo.target_client_ids, clientOptions]);

    const serviceCategoryById = useMemo(() => {
        const categoryMap = new Map<number, string>();
        serviceOptions.forEach((service) => {
            categoryMap.set(service.id, service.category);
        });
        return categoryMap;
    }, [serviceOptions]);

    const filteredCodes = useMemo(() => {
        const normalizedQuery = searchQuery.trim().toLowerCase();
        const filteredByQuery = promoCodes.filter((promo) => {
            if (normalizedQuery.length === 0) {
                return true;
            }
            return promo.code.toLowerCase().includes(normalizedQuery);
        });

        const filteredByScope = filteredByQuery.filter((promo) => {
            if (scopeFilter === 'all_scopes') {
                return true;
            }
            return promo.target_scope === scopeFilter;
        });

        const filteredByCategory = filteredByScope.filter((promo) => {
            if (categoryFilter === 'all') {
                return true;
            }
            if (promo.target_scope === 'all') {
                return true;
            }
            if (promo.target_scope === 'categories') {
                return promo.target_categories.some((category) => category === categoryFilter);
            }
            if (promo.target_scope === 'services') {
                return promo.target_service_ids.some((serviceId) => serviceCategoryById.get(serviceId) === categoryFilter);
            }
            return false;
        });

        const sorted = [...filteredByCategory];
        sorted.sort((leftPromo, rightPromo) => {
            if (sortBy === 'code_asc') {
                return leftPromo.code.localeCompare(rightPromo.code);
            }
            if (sortBy === 'discount_desc') {
                return rightPromo.discount_value - leftPromo.discount_value;
            }
            if (sortBy === 'usage_desc') {
                return rightPromo.times_used - leftPromo.times_used;
            }

            const leftDateValue = new Date(leftPromo.created_at).getTime();
            const rightDateValue = new Date(rightPromo.created_at).getTime();
            const safeLeftDate = Number.isFinite(leftDateValue) ? leftDateValue : 0;
            const safeRightDate = Number.isFinite(rightDateValue) ? rightDateValue : 0;
            if (sortBy === 'oldest') {
                return safeLeftDate - safeRightDate;
            }
            return safeRightDate - safeLeftDate;
        });
        return sorted;
    }, [categoryFilter, promoCodes, scopeFilter, searchQuery, serviceCategoryById, sortBy]);

    const getScopeLabel = (promo: PromoCode): string => {
        if (promo.target_scope === 'categories') {
            return `${t('admin/services:category', 'Категория')}: ${promo.target_categories.length}`;
        }
        if (promo.target_scope === 'services') {
            return `${t('layouts/mainlayout:menu.services', 'Услуги')}: ${promo.target_service_ids.length}`;
        }
        if (promo.target_scope === 'clients') {
            return `${t('layouts/mainlayout:menu.clients', 'Клиенты')}: ${promo.target_client_ids.length}`;
        }
        return t('scope_all_clients', 'Все клиенты');
    };

    const containerClassName = embedded
        ? 'crm-calendar-promocodes'
        : 'crm-calendar-theme crm-calendar-page crm-calendar-promocodes p-4 sm:p-8 max-w-7xl mx-auto min-h-screen bg-[#fafafa]';

    return (
        <div className={containerClassName}>
            <div className={embedded ? 'flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8' : 'crm-calendar-toolbar flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8'}>
                <div>
                    <h1 className={embedded ? 'text-3xl text-gray-900 mb-2 flex items-center gap-3' : 'text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3'}>
                        {embedded ? (
                            <Ticket size={32} className="text-blue-600" />
                        ) : (
                            <div className="p-2 bg-pink-100 rounded-xl text-pink-600">
                                <Ticket size={28} />
                            </div>
                        )}
                        {t('title', 'Промокоды')}
                    </h1>
                    <p className={embedded ? 'text-gray-600' : 'text-gray-500 mt-2 font-medium'}>
                        {t('subtitle', 'Управление скидками и бонусными кодами для клиентов')}
                    </p>
                </div>

                <Button
                    onClick={handleOpenCreateDialog}
                    className={embedded
                        ? 'w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white rounded-lg h-10 px-4 font-semibold shadow-sm flex items-center gap-2 transition-all'
                        : 'bg-pink-600 hover:bg-pink-700 text-white shadow-lg shadow-pink-100 px-6 py-6 rounded-2xl flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-95'}
                >
                    <Plus size={embedded ? 16 : 20} />
                    {t('create_btn', 'Создать промокод')}
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className={embedded ? 'crm-calendar-panel bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4' : 'crm-calendar-panel bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4'}>
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                        <Activity size={24} />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">{t('total_active', 'Всего активных')}</p>
                        <p className="text-2xl font-bold text-gray-900">{promoCodes.filter((promo) => promo.is_active).length}</p>
                    </div>
                </div>

                <div className={embedded ? 'crm-calendar-panel bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4' : 'crm-calendar-panel bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4'}>
                    <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center">
                        <Zap size={24} />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">{t('total_usage', 'Использований всего')}</p>
                        <p className="text-2xl font-bold text-gray-900">{promoCodes.reduce((sum, promo) => sum + promo.times_used, 0)}</p>
                    </div>
                </div>

                <div className={embedded ? 'crm-calendar-panel bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4' : 'crm-calendar-panel bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4'}>
                    <div className="w-12 h-12 rounded-2xl bg-pink-50 text-pink-600 flex items-center justify-center">
                        <Gift size={24} />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">{t('personalized_count', 'Персональных')}</p>
                        <p className="text-2xl font-bold text-gray-900">{promoCodes.filter((promo) => promo.target_scope === 'clients').length}</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 mb-6">
                <div className="relative lg:col-span-2">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <Input
                        placeholder={t('search_placeholder', 'Поиск по коду...')}
                        className={embedded
                            ? 'pl-12 h-10 bg-white border-gray-200 rounded-lg focus:ring-blue-500 focus:border-blue-500 shadow-sm'
                            : 'pl-12 h-14 bg-white border-gray-100 rounded-2xl focus:ring-pink-500 focus:border-pink-500 shadow-sm'}
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                    />
                </div>

                <select
                    className={embedded
                        ? 'h-10 bg-white border border-gray-200 rounded-lg px-3 text-sm'
                        : 'h-14 bg-white border border-gray-100 rounded-2xl px-4 text-sm'}
                    value={scopeFilter}
                    onChange={(event) => setScopeFilter(event.target.value as PromoScopeFilter)}
                >
                    <option value="all_scopes">{t('filter_scope_all', 'Все области')}</option>
                    <option value="all">{t('scope_all_clients', 'Все клиенты')}</option>
                    <option value="categories">{t('scope_categories', 'Определенные категории')}</option>
                    <option value="services">{t('scope_services', 'Определенные услуги')}</option>
                    <option value="clients">{t('scope_clients', 'Определенные клиенты')}</option>
                </select>

                <select
                    className={embedded
                        ? 'h-10 bg-white border border-gray-200 rounded-lg px-3 text-sm'
                        : 'h-14 bg-white border border-gray-100 rounded-2xl px-4 text-sm'}
                    value={categoryFilter}
                    onChange={(event) => setCategoryFilter(event.target.value)}
                >
                    <option value="all">{t('admin/services:all_categories')}</option>
                    {categoryOptions.map((category) => (
                        <option key={category} value={category}>{category}</option>
                    ))}
                </select>

                <select
                    className={embedded
                        ? 'h-10 bg-white border border-gray-200 rounded-lg px-3 text-sm'
                        : 'h-14 bg-white border border-gray-100 rounded-2xl px-4 text-sm'}
                    value={sortBy}
                    onChange={(event) => setSortBy(event.target.value as PromoSortKey)}
                >
                    <option value="newest">{t('sort_newest', 'Сначала новые')}</option>
                    <option value="oldest">{t('sort_oldest', 'Сначала старые')}</option>
                    <option value="discount_desc">{t('sort_discount_desc', 'По скидке')}</option>
                    <option value="usage_desc">{t('sort_usage_desc', 'По использованиям')}</option>
                    <option value="code_asc">{t('sort_code_asc', 'По коду А-Я')}</option>
                </select>
            </div>

            {loading ? (
                <div className={embedded ? 'crm-calendar-panel flex flex-col items-center justify-center py-16 bg-white rounded-xl border border-gray-200' : 'crm-calendar-panel flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-gray-100'}>
                    <Loader className="w-10 h-10 text-pink-600 animate-spin mb-4" />
                    <p className="text-gray-500 font-medium">{t('loading', 'Загружаем промокоды...')}</p>
                </div>
            ) : filteredCodes.length === 0 ? (
                <div className={embedded ? 'crm-calendar-panel text-center py-16 bg-white rounded-xl border border-dashed border-gray-200' : 'crm-calendar-panel text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200'}>
                    <Tag className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-gray-900">{t('not_found', 'Промокоды не найдены')}</h3>
                    <p className="text-gray-500 mt-2">{t('not_found_desc', 'Создайте свой первый промокод, чтобы привлечь больше клиентов!')}</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {filteredCodes.map((promo) => (
                        <div
                            key={promo.id}
                            className={`crm-calendar-panel group bg-white ${embedded ? 'rounded-xl border-gray-200 p-6 shadow-sm hover:shadow-md' : 'rounded-[32px] border-gray-100 p-8 shadow-sm hover:shadow-xl hover:shadow-pink-50'} border transition-all duration-300 relative overflow-hidden ${!promo.is_active ? 'opacity-70' : ''}`}
                        >
                            <div className="absolute top-0 right-0 p-6 flex gap-2">
                                <button
                                    onClick={() => handleToggle(promo.id)}
                                    className={`p-2 rounded-full transition-colors ${promo.is_active ? 'bg-green-50 text-green-600 hover:bg-green-100' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                                    title={promo.is_active ? t('deactivate', 'Деактивировать') : t('activate', 'Активировать')}
                                >
                                    {promo.is_active ? <CheckCircle2 size={24} /> : <XCircle size={24} />}
                                </button>
                                <button
                                    onClick={() => handleOpenEditDialog(promo)}
                                    className="p-2 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                                    title={t('common:edit')}
                                >
                                    <Pencil size={24} />
                                </button>
                                <button
                                    onClick={() => handleDelete(promo.id)}
                                    className="p-2 rounded-full bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                                    title={t('delete', 'Удалить')}
                                >
                                    <Trash2 size={24} />
                                </button>
                            </div>

                            <div className="flex items-start gap-6">
                                <div className={`p-5 rounded-3xl ${promo.discount_type === 'percent' ? 'bg-pink-50 text-pink-600' : 'bg-blue-50 text-blue-600'}`}>
                                    {promo.discount_type === 'percent' ? <Percent size={32} /> : <Gift size={32} />}
                                </div>

                                <div className="flex-1 pr-20">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-2xl font-black text-gray-900 uppercase tracking-wider">{promo.code}</span>
                                        {promo.target_scope === 'clients' && (
                                            <span className="bg-purple-100 text-purple-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                                                {t('personal', 'Personal')}
                                            </span>
                                        )}
                                    </div>

                                    <div className="text-gray-500 font-medium mb-2">
                                        {promo.discount_type === 'percent'
                                            ? `${promo.discount_value}% ${t('discount_off', 'скидка')}`
                                            : `${promo.discount_value} ${currency} ${t('discount_off', 'скидка')}`}
                                        {promo.min_booking_amount > 0 ? ` • ${t('min_order', 'От')} ${promo.min_booking_amount} ${currency}` : ''}
                                    </div>

                                    <div className="flex items-center gap-2 text-sm text-gray-400 mb-3">
                                        <Target size={14} />
                                        <span>{getScopeLabel(promo)}</span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="flex items-center gap-2 text-sm text-gray-400">
                                            <Calendar size={14} />
                                            <span>{new Date(promo.valid_from).toLocaleDateString()} — {promo.valid_until ? new Date(promo.valid_until).toLocaleDateString() : '∞'}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-gray-400">
                                            <Users size={14} />
                                            <span>{promo.times_used} / {(promo.usage_limit ?? '∞')} {t('used', 'исп.')}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <Dialog
                open={showCreateDialog}
                onOpenChange={(open) => {
                    setShowCreateDialog(open);
                    if (!open) {
                        resetForm();
                    }
                }}
            >
                <DialogContent className="max-w-md bg-white rounded-[40px] p-8 border-0 shadow-2xl">
                    <DialogHeader className="mb-6">
                        <DialogTitle className="text-2xl font-bold text-gray-900">
                            {editingPromo === null
                                ? t('create_title', 'Новый промокод')
                                : t('edit_title', 'Редактирование промокода')}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-6">
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold text-gray-700 ml-1">{t('code_label', 'Код промокода')}</Label>
                            <Input
                                placeholder="PROMO2024"
                                className="h-12 rounded-2xl bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-pink-500 transition-all uppercase font-mono font-bold tracking-widest"
                                value={newPromo.code}
                                onChange={(event) => setNewPromo((prev) => ({ ...prev, code: event.target.value.toUpperCase() }))}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold text-gray-700 ml-1">{t('type_label', 'Тип скидки')}</Label>
                                <select
                                    className="w-full h-12 rounded-2xl bg-gray-50 border-transparent px-4 py-2 focus:bg-white focus:ring-2 focus:ring-pink-500 outline-none transition-all"
                                    value={newPromo.discount_type}
                                    onChange={(event) => setNewPromo((prev) => ({ ...prev, discount_type: event.target.value as 'percent' | 'fixed' }))}
                                >
                                    <option value="percent">{t('percent', 'Процент %')}</option>
                                    <option value="fixed">{t('fixed', 'Фикс. сумма')}</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-sm font-semibold text-gray-700 ml-1">{t('value_label', 'Размер скидки')}</Label>
                                <Input
                                    type="number"
                                    className="h-12 rounded-2xl bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-pink-500 transition-all"
                                    value={newPromo.discount_value}
                                    onChange={(event) => setNewPromo((prev) => ({ ...prev, discount_value: parseNonNegativeInteger(event.target.value, 0) }))}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-sm font-semibold text-gray-700 ml-1">
                                {t('min_amount_label', {
                                    currency,
                                    defaultValue: 'Миним. сумма записи ({{currency}})'
                                })}
                            </Label>
                            <Input
                                type="number"
                                className="h-12 rounded-2xl bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-pink-500 transition-all"
                                value={newPromo.min_booking_amount}
                                onChange={(event) => setNewPromo((prev) => ({ ...prev, min_booking_amount: parseNonNegativeInteger(event.target.value, 0) }))}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold text-gray-700 ml-1">{t('valid_until_label', 'Действует до')}</Label>
                                <Input
                                    type="date"
                                    className="h-12 rounded-2xl bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-pink-500 transition-all"
                                    value={newPromo.valid_until}
                                    onChange={(event) => setNewPromo((prev) => ({ ...prev, valid_until: event.target.value }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold text-gray-700 ml-1">{t('limit_label', 'Лимит исп.')}</Label>
                                <Input
                                    type="number"
                                    placeholder="∞"
                                    className="h-12 rounded-2xl bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-pink-500 transition-all"
                                    value={newPromo.usage_limit}
                                    onChange={(event) => setNewPromo((prev) => ({ ...prev, usage_limit: event.target.value }))}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-sm font-semibold text-gray-700 ml-1">{t('target_scope_label', 'Область применения')}</Label>
                            <select
                                className="w-full h-12 rounded-2xl bg-gray-50 border-transparent px-4 py-2 focus:bg-white focus:ring-2 focus:ring-pink-500 outline-none transition-all"
                                value={newPromo.target_scope}
                                onChange={(event) => handleScopeChange(event.target.value as PromoTargetScope)}
                            >
                                <option value="all">{t('scope_all_clients', 'Все клиенты')}</option>
                                <option value="categories">{t('scope_categories', 'Определенные категории')}</option>
                                <option value="services">{t('scope_services', 'Определенные услуги')}</option>
                                <option value="clients">{t('scope_clients', 'Определенные клиенты')}</option>
                            </select>
                        </div>

                        {newPromo.target_scope === 'categories' && (
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold text-gray-700 ml-1">{t('scope_categories', 'Определенные категории')}</Label>
                                <select
                                    multiple
                                    className="w-full min-h-[120px] rounded-2xl bg-gray-50 border-transparent px-4 py-3 focus:bg-white focus:ring-2 focus:ring-pink-500 outline-none transition-all"
                                    value={newPromo.target_categories}
                                    onChange={(event) => {
                                        const selected = Array.from(event.target.selectedOptions).map((option) => option.value);
                                        handleMultiSelectChange('target_categories', selected);
                                    }}
                                >
                                    {categoryOptions.map((category) => (
                                        <option key={category} value={category}>{category}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {newPromo.target_scope === 'services' && (
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold text-gray-700 ml-1">{t('scope_services', 'Определенные услуги')}</Label>
                                <select
                                    multiple
                                    className="w-full min-h-[120px] rounded-2xl bg-gray-50 border-transparent px-4 py-3 focus:bg-white focus:ring-2 focus:ring-pink-500 outline-none transition-all"
                                    value={newPromo.target_service_ids}
                                    onChange={(event) => {
                                        const selected = Array.from(event.target.selectedOptions).map((option) => option.value);
                                        handleMultiSelectChange('target_service_ids', selected);
                                    }}
                                >
                                    {serviceOptions.map((service) => (
                                        <option key={service.id} value={String(service.id)}>
                                            {service.name} {service.category.length > 0 ? `(${service.category})` : ''}
                                        </option>
                                    ))}
                                </select>
                                {selectedServicesPreview.length > 0 && (
                                    <p className="text-xs text-gray-500">
                                        {selectedServicesPreview.slice(0, 3).join(', ')}
                                        {selectedServicesPreview.length > 3 ? ` +${selectedServicesPreview.length - 3}` : ''}
                                    </p>
                                )}
                            </div>
                        )}

                        {newPromo.target_scope === 'clients' && (
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold text-gray-700 ml-1">{t('scope_clients', 'Определенные клиенты')}</Label>
                                <select
                                    multiple
                                    className="w-full min-h-[120px] rounded-2xl bg-gray-50 border-transparent px-4 py-3 focus:bg-white focus:ring-2 focus:ring-pink-500 outline-none transition-all"
                                    value={newPromo.target_client_ids}
                                    onChange={(event) => {
                                        const selected = Array.from(event.target.selectedOptions).map((option) => option.value);
                                        handleMultiSelectChange('target_client_ids', selected);
                                    }}
                                >
                                    {clientOptions.map((client) => (
                                        <option key={client.id} value={client.id}>{client.label}</option>
                                    ))}
                                </select>
                                {selectedClientsPreview.length > 0 && (
                                    <p className="text-xs text-gray-500">
                                        {selectedClientsPreview.slice(0, 2).join(', ')}
                                        {selectedClientsPreview.length > 2 ? ` +${selectedClientsPreview.length - 2}` : ''}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    <DialogFooter className="mt-10 sm:justify-start gap-3">
                        <Button
                            className="flex-1 h-14 bg-pink-600 hover:bg-pink-700 text-white rounded-2xl font-bold shadow-lg shadow-pink-100 transition-all"
                            onClick={handleCreate}
                        >
                            {editingPromo === null
                                ? t('create_action_btn', 'Подтвердить создание')
                                : t('save_action_btn', 'Сохранить изменения')}
                        </Button>
                        <Button
                            variant="outline"
                            className="flex-1 h-14 rounded-2xl font-bold border-gray-100"
                            onClick={() => {
                                setShowCreateDialog(false);
                                resetForm();
                            }}
                        >
                            {t('cancel', 'Отмена')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
