import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
    Scissors,
    Search,
    Plus,
    History,
    Loader2,
    Gift,
    ArrowUpDown,
    Clock3,
    Pencil,
    Trash2,
    ChevronDown
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { useTranslation } from 'react-i18next';
import { Input } from '../../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Switch } from '../../components/ui/switch';
import { toast } from 'sonner';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useCurrency } from '../../hooks/useSalonSettings';
import '../../styles/crm-pages.css';

interface Service {
    id: number;
    key: string;
    name: string;
    price: number;
    min_price?: number;
    max_price?: number;
    duration?: string;
    currency: string;
    category: string;
    description?: string;
    benefits?: string[];
    is_active: boolean;
    [key: string]: any;
}

interface ServiceFormData {
    key: string;
    name: string;
    price: number | string;
    min_price: number | string;
    max_price: number | string;
    duration: number | string;
    category: string;
    description: string;
    benefits: string;
    is_active: boolean;
}

interface PendingRequest {
    request_type: string;
    requested_price?: number;
    requested_duration?: number;
    requested_is_online_booking_enabled?: boolean;
    requested_is_calendar_enabled?: boolean;
    employee_comment?: string;
    created_at?: string;
}

interface ChangeRequest {
    id: number;
    service_id: number;
    service_name: string;
    request_type: string;
    status: string;
    requested_price?: number;
    requested_duration?: number;
    employee_comment?: string;
    admin_comment?: string;
    created_at: string;
    resolved_at?: string;
}

type TabType = 'services' | 'history';
type SortKey = 'name' | 'price' | 'duration' | 'category';

const EMPTY_SERVICE_FORM: ServiceFormData = {
    key: '',
    name: '',
    price: '',
    min_price: '',
    max_price: '',
    duration: '',
    category: '',
    description: '',
    benefits: '',
    is_active: true
};

function parseDurationToMinutes(duration: unknown): number {
    if (typeof duration === 'number' && Number.isFinite(duration)) {
        return duration;
    }

    if (typeof duration !== 'string') {
        return 0;
    }

    const normalized = duration.trim().toLowerCase();
    if (normalized.length === 0) {
        return 0;
    }

    const numericDuration = Number(normalized);
    if (!Number.isNaN(numericDuration)) {
        return numericDuration;
    }

    if (normalized.includes('h')) {
        const hours = Number(normalized.replace(/[^0-9.]/g, ''));
        return Number.isNaN(hours) ? 0 : Math.round(hours * 60);
    }

    if (normalized.includes('ч')) {
        const hours = Number(normalized.replace(/[^0-9.]/g, ''));
        return Number.isNaN(hours) ? 0 : Math.round(hours * 60);
    }

    if (normalized.includes('min')) {
        const minutes = Number(normalized.replace(/[^0-9.]/g, ''));
        return Number.isNaN(minutes) ? 0 : Math.round(minutes);
    }

    if (normalized.includes('мин')) {
        const minutes = Number(normalized.replace(/[^0-9.]/g, ''));
        return Number.isNaN(minutes) ? 0 : Math.round(minutes);
    }

    return 0;
}

function extractSpecialPackagesCount(response: unknown): number {
    if (Array.isArray(response)) {
        return response.length;
    }

    if (typeof response !== 'object') {
        return 0;
    }

    if (response === null) {
        return 0;
    }

    const data = response as { packages?: unknown[]; special_packages?: unknown[] };
    if (Array.isArray(data.packages)) {
        return data.packages.length;
    }

    if (Array.isArray(data.special_packages)) {
        return data.special_packages.length;
    }

    return 0;
}

export default function UniversalServices() {
    const location = useLocation();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { user: currentUser } = useAuth();
    const { t, i18n } = useTranslation([
        'admin/services',
        'employee/services',
        'common',
        'public_landing/services',
        'dynamic',
        'booking'
    ]);
    const { currency, formatCurrency } = useCurrency();

    const isEmployee = currentUser?.role === 'employee';
    const rolePrefix = useMemo(() => {
        if (location.pathname.startsWith('/crm')) return '/crm';
        if (location.pathname.startsWith('/manager')) return '/manager';
        if (location.pathname.startsWith('/sales')) return '/sales';
        if (location.pathname.startsWith('/saler')) return '/sales';
        if (location.pathname.startsWith('/marketer')) return '/marketer';
        if (location.pathname.startsWith('/employee')) return '/employee';
        if (location.pathname.startsWith('/admin')) return '/admin';
        return '/crm';
    }, [location.pathname]);

    const [activeTab, setActiveTab] = useState<TabType>(() => {
        const tab = searchParams.get('tab');
        return tab === 'history' ? 'history' : 'services';
    });

    const [services, setServices] = useState<Service[]>([]);
    const [specialPackagesCount, setSpecialPackagesCount] = useState(0);
    const [pendingRequests, setPendingRequests] = useState<Record<number, PendingRequest>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' } | null>(null);

    const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
    const [editingService, setEditingService] = useState<Service | null>(null);
    const [serviceFormData, setServiceFormData] = useState<ServiceFormData>({ ...EMPTY_SERVICE_FORM });

    const [editOnlineBooking, setEditOnlineBooking] = useState(true);
    const [editCalendarEnabled, setEditCalendarEnabled] = useState(true);
    const [editComment, setEditComment] = useState('');

    const [changeHistory, setChangeHistory] = useState<ChangeRequest[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    useEffect(() => {
        if (!isEmployee && activeTab === 'history') {
            setActiveTab('services');
        }
    }, [activeTab, isEmployee]);

    useEffect(() => {
        void loadData();
    }, [activeTab, i18n.language, isEmployee]);

    const loadData = async () => {
        try {
            setLoading(true);

            if (isEmployee && activeTab === 'history') {
                await loadHistory();
                return;
            }

            if (isEmployee) {
                const response = await fetch('/api/my/services', { credentials: 'include' });
                const data = await response.json() as { services?: Service[]; pending_requests?: Record<number, PendingRequest> };
                setServices(Array.isArray(data.services) ? data.services : []);
                setPendingRequests(typeof data.pending_requests === 'object' && data.pending_requests !== null ? data.pending_requests : {});
                setSpecialPackagesCount(0);
                return;
            }

            const [servicesResponse, specialPackagesResponse] = await Promise.all([
                api.getServices(false),
                api.getSpecialPackages().catch(() => [])
            ]);

            const servicesList = Array.isArray(servicesResponse?.services) ? servicesResponse.services : [];
            setServices(servicesList);
            setPendingRequests({});
            setSpecialPackagesCount(extractSpecialPackagesCount(specialPackagesResponse));
        } catch (err) {
            toast.error(t('common:error_loading'));
        } finally {
            setLoading(false);
        }
    };

    const loadHistory = async () => {
        setLoadingHistory(true);
        try {
            const response = await fetch('/api/my/change-requests', { credentials: 'include' });
            const data = await response.json() as { requests?: ChangeRequest[] };
            setChangeHistory(Array.isArray(data.requests) ? data.requests : []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingHistory(false);
        }
    };

    const handleSort = (key: SortKey) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig?.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const categories = useMemo(() => {
        const uniqueCategories = new Set<string>();
        services.forEach((service) => {
            if (typeof service.category === 'string' && service.category.trim().length > 0) {
                uniqueCategories.add(service.category);
            }
        });

        return [...uniqueCategories].sort((a, b) => a.localeCompare(b, i18n.language));
    }, [services, i18n.language]);

    const getCategoryDisplayName = useCallback((category: string): string => {
        const normalizedCategory = category.trim().toLowerCase().replace(/\s+/g, '_');
        if (normalizedCategory.length === 0) {
            return category;
        }

        const dynamicLabel = t(`dynamic:categories.${normalizedCategory}`, { defaultValue: '' }).trim();
        if (dynamicLabel.length > 0) {
            return dynamicLabel;
        }

        const bookingLabel = t(`booking:services.category_${normalizedCategory}`, { defaultValue: '' }).trim();
        if (bookingLabel.length > 0) {
            return bookingLabel;
        }

        const publicLabel = t(`public_landing/services:categories.${normalizedCategory}`, { defaultValue: '' }).trim();
        if (publicLabel.length > 0) {
            return publicLabel;
        }

        return category;
    }, [t]);

    const getServiceDisplayName = useCallback((service: Service): string => {
        const sourceName = typeof service.name === 'string' ? service.name : '';
        if (typeof service.key === 'string' && service.key.trim().length > 0) {
            return t(`public_landing/services:items.${service.key}.name`, {
                defaultValue: sourceName
            });
        }
        return sourceName;
    }, [t]);

    const filteredAndSortedServices = useMemo(() => {
        const normalizedSearch = searchTerm.trim().toLowerCase();

        const result = services.filter((service) => {
            const serviceName = getServiceDisplayName(service).toLowerCase();
            const serviceCategory = typeof service.category === 'string' ? service.category : '';

            const matchesSearch = serviceName.includes(normalizedSearch);
            const matchesCategory = categoryFilter === 'all' ? true : serviceCategory === categoryFilter;
            return matchesSearch && matchesCategory;
        });

        if (sortConfig === null) {
            return result;
        }

        const sorted = [...result];
        sorted.sort((leftService, rightService) => {
            const { key, direction } = sortConfig;

            const leftValue = (() => {
                if (key === 'price') return Number(leftService.price ?? 0);
                if (key === 'duration') return parseDurationToMinutes(leftService.duration);
                if (key === 'category') return String(leftService.category ?? '').toLowerCase();
                return getServiceDisplayName(leftService).toLowerCase();
            })();

            const rightValue = (() => {
                if (key === 'price') return Number(rightService.price ?? 0);
                if (key === 'duration') return parseDurationToMinutes(rightService.duration);
                if (key === 'category') return String(rightService.category ?? '').toLowerCase();
                return getServiceDisplayName(rightService).toLowerCase();
            })();

            if (leftValue < rightValue) {
                return direction === 'asc' ? -1 : 1;
            }
            if (leftValue > rightValue) {
                return direction === 'asc' ? 1 : -1;
            }
            return 0;
        });

        return sorted;
    }, [services, searchTerm, categoryFilter, sortConfig, getServiceDisplayName]);

    const formatDurationLabel = (duration: unknown) => {
        const minutes = parseDurationToMinutes(duration);
        if (minutes <= 0) {
            return '-';
        }
        if (minutes % 60 === 0) {
            return `${minutes / 60}${t('admin/services:unit_hour')}`;
        }
        return `${minutes}${t('admin/services:unit_minute')}`;
    };

    const openCreateModal = () => {
        setEditingService(null);
        setServiceFormData({ ...EMPTY_SERVICE_FORM });
        setIsServiceModalOpen(true);
    };

    const openRouteTab = (target: string) => {
        if (location.pathname !== target) {
            navigate(target);
        }
    };

    const handleOpenEdit = (service: Service) => {
        setEditingService(service);
        if (isEmployee) {
            setServiceFormData({
                ...EMPTY_SERVICE_FORM,
                price: service.price ?? '',
                duration: service.duration ?? ''
            });
            setEditOnlineBooking(service.is_online_booking_enabled !== false);
            setEditCalendarEnabled(service.is_calendar_enabled !== false);
            setEditComment('');
        } else {
            const benefits = Array.isArray(service.benefits) ? service.benefits.join(' | ') : '';
            setServiceFormData({
                key: service.key ?? '',
                name: service.name ?? '',
                price: service.price ?? '',
                min_price: service.min_price ?? '',
                max_price: service.max_price ?? '',
                duration: service.duration ?? '',
                category: service.category ?? '',
                description: service.description ?? '',
                benefits,
                is_active: service.is_active ?? true
            });
        }
        setIsServiceModalOpen(true);
    };

    const handleDeleteService = async (serviceId: number) => {
        const isConfirmed = window.confirm(t('common:are_you_sure'));
        if (!isConfirmed) {
            return;
        }

        try {
            await api.deleteService(serviceId);
            toast.success(t('admin/services:service_deleted'));
            await loadData();
        } catch (err) {
            toast.error(t('common:error_deleting'));
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            if (isEmployee && editingService !== null) {
                const cleanedComment = editComment.trim();
                const response = await fetch(`/api/my/services/${editingService.id}/request-change`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        price: serviceFormData.price,
                        duration: serviceFormData.duration,
                        is_online_booking_enabled: editOnlineBooking,
                        is_calendar_enabled: editCalendarEnabled,
                        comment: cleanedComment.length > 0 ? cleanedComment : null
                    })
                });
                if (!response.ok) throw new Error('Request failed');
                toast.success(t('employee/services:request_submitted'));
            } else if (editingService !== null) {
                await api.updateService(editingService.id, serviceFormData);
                toast.success(t('admin/services:service_updated'));
            } else {
                await api.createService(serviceFormData);
                toast.success(t('admin/services:service_added'));
            }

            setIsServiceModalOpen(false);
            await loadData();
        } catch (err) {
            toast.error(t('common:error_saving'));
        } finally {
            setSaving(false);
        }
    };

    const handleCancelRequest = async (serviceId: number) => {
        try {
            await fetch(`/api/my/services/${serviceId}/cancel-request`, { method: 'DELETE', credentials: 'include' });
            toast.success(t('employee/services:request_cancelled'));
            await loadData();
        } catch (err) {
            toast.error(t('common:error_deleting'));
        }
    };

    if (loading) {
        return (
            <div className="crm-services-loading">
                <Loader2 className="crm-services-loading-icon" />
            </div>
        );
    }

    return (
        <div className="crm-services-page">
            <div className="crm-services-header">
                <h1 className="crm-services-title">
                    <Scissors className="crm-services-title-icon" />
                    <span>{isEmployee ? t('employee/services:my_services') : t('admin/services:services_and_packages')}</span>
                </h1>
                <p className="crm-services-subtitle">
                    {isEmployee ? t('employee/services:edit_services_description') : t('admin/services:management_of_price_list_and_salon_promotions')}
                </p>
            </div>

            {!isEmployee && (
                <>
                    <div className="crm-services-tabs-card">
                        <button type="button" className="crm-services-tab crm-services-tab-active">
                            <Scissors className="crm-services-tab-icon" />
                            <span>{t('admin/services:services')} ({services.length})</span>
                        </button>

                        <button type="button" className="crm-services-tab" onClick={() => openRouteTab(`${rolePrefix}/special-packages`)}>
                            <Gift className="crm-services-tab-icon" />
                            <span>{t('admin/services:special_packages')} ({specialPackagesCount})</span>
                        </button>
                    </div>

                    <div className="crm-services-controls-card">
                        <div className="crm-services-search-wrap">
                            <Search className="crm-services-search-icon" />
                            <Input
                                placeholder={t('admin/services:search_services')}
                                value={searchTerm}
                                onChange={(event) => setSearchTerm(event.target.value)}
                                className="crm-services-search-input"
                            />
                        </div>

                        <div className="crm-services-controls-right">
                            <div className="crm-services-category-select-wrap">
                                <select
                                    value={categoryFilter}
                                    onChange={(event) => setCategoryFilter(event.target.value)}
                                    className="crm-services-category-select"
                                >
                                    <option value="all">{t('admin/services:all_categories')}</option>
                                    {categories.map((category) => (
                                        <option key={category} value={category}>{getCategoryDisplayName(category)}</option>
                                    ))}
                                </select>
                                <ChevronDown className="crm-services-category-caret" />
                            </div>

                            <Button onClick={openCreateModal} className="crm-services-add-button">
                                <Plus className="crm-services-add-icon" />
                                <span>{t('admin/services:add_service')}</span>
                            </Button>
                        </div>
                    </div>
                </>
            )}

            {isEmployee && (
                <div className="crm-services-employee-controls">
                    <div className="crm-services-search-wrap">
                        <Search className="crm-services-search-icon" />
                        <Input
                            placeholder={t('common:search')}
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                            className="crm-services-search-input"
                        />
                    </div>

                    <Button variant="outline" onClick={() => setActiveTab(activeTab === 'history' ? 'services' : 'history')}>
                        <History className="w-4 h-4 mr-2" />
                        {activeTab === 'history' ? t('employee/services:view_all') : t('employee/services:change_history')}
                    </Button>
                </div>
            )}

            {activeTab === 'history' && isEmployee ? (
                <div className="crm-services-history-list">
                    {loadingHistory ? (
                        <Loader2 className="crm-services-history-loader" />
                    ) : (
                        changeHistory.map((request) => (
                            <div key={request.id} className="crm-services-history-card">
                                <div className="crm-services-history-card-main">
                                    <h3 className="crm-services-history-name">{request.service_name}</h3>
                                    <p className="crm-services-history-meta">
                                        {t('admin/services:price')}: {request.requested_price ?? '-'} | {t('admin/services:duration')}: {request.requested_duration ?? '-'}
                                    </p>
                                </div>
                                <Badge>{t(`common:status_${request.status}`, request.status)}</Badge>
                            </div>
                        ))
                    )}
                </div>
            ) : (
                <div className="crm-services-table-card">
                    <table className="crm-services-table">
                        <colgroup>
                            <col className="crm-services-col-name" />
                            <col className="crm-services-col-price" />
                            <col className="crm-services-col-duration" />
                            {!isEmployee && <col className="crm-services-col-category" />}
                            <col className="crm-services-col-status" />
                            <col className="crm-services-col-actions" />
                        </colgroup>
                        <thead>
                            <tr>
                                <th>
                                    <button type="button" className="crm-services-sort-button" onClick={() => handleSort('name')}>
                                        <span>{t('admin/services:name')}</span>
                                        <ArrowUpDown className="crm-services-sort-icon" />
                                    </button>
                                </th>
                                <th>
                                    <button type="button" className="crm-services-sort-button" onClick={() => handleSort('price')}>
                                        <span>{t('admin/services:price')}</span>
                                        <ArrowUpDown className="crm-services-sort-icon" />
                                    </button>
                                </th>
                                <th>
                                    <button type="button" className="crm-services-sort-button" onClick={() => handleSort('duration')}>
                                        <span>{t('admin/services:duration')}</span>
                                        <ArrowUpDown className="crm-services-sort-icon" />
                                    </button>
                                </th>
                                {!isEmployee && (
                                    <th>
                                        <button type="button" className="crm-services-sort-button" onClick={() => handleSort('category')}>
                                            <span>{t('admin/services:category')}</span>
                                            <ArrowUpDown className="crm-services-sort-icon" />
                                        </button>
                                    </th>
                                )}
                                <th>
                                    <span className="crm-services-header-inline">
                                        <span>{t('common:status')}</span>
                                        <ArrowUpDown className="crm-services-sort-icon" />
                                    </span>
                                </th>
                                <th className="crm-services-actions-header">{t('common:actions')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredAndSortedServices.map((service) => {
                                const pending = pendingRequests[service.id];
                                const hasPendingRequest = pending !== undefined;
                                const categoryLabel = service.category && service.category.trim().length > 0 ? getCategoryDisplayName(service.category) : '-';

                                return (
                                    <tr key={service.id}>
                                        <td className="crm-services-service-cell">{getServiceDisplayName(service)}</td>
                                        <td>{formatCurrency(service.price)}</td>
                                        <td>
                                            <span className="crm-services-duration-badge">
                                                <Clock3 className="crm-services-duration-icon" />
                                                <span>{formatDurationLabel(service.duration)}</span>
                                            </span>
                                        </td>
                                        {!isEmployee && (
                                            <td>
                                                <span className="crm-services-category-badge">{categoryLabel}</span>
                                            </td>
                                        )}
                                        <td>
                                            {hasPendingRequest ? (
                                                <span className="crm-services-status-badge crm-services-status-badge-pending">
                                                    <Loader2 className="crm-services-pending-icon" />
                                                    <span>{t('employee/services:pending_approval')}</span>
                                                </span>
                                            ) : (
                                                <span className="crm-services-status-badge crm-services-status-badge-active">
                                                    <span>{isEmployee ? t('common:active') : t('admin/services:active')}</span>
                                                </span>
                                            )}
                                        </td>
                                        <td className="crm-services-actions-cell">
                                            {hasPendingRequest ? (
                                                <Button variant="outline" size="sm" onClick={() => handleCancelRequest(service.id)}>
                                                    {t('employee/services:cancel_request')}
                                                </Button>
                                            ) : isEmployee ? (
                                                <Button variant="outline" size="sm" onClick={() => handleOpenEdit(service)}>
                                                    {t('employee/services:request_change')}
                                                </Button>
                                            ) : (
                                                <div className="crm-services-icon-actions">
                                                    <button
                                                        type="button"
                                                        className="crm-services-icon-button"
                                                        onClick={() => handleOpenEdit(service)}
                                                        aria-label={t('common:edit')}
                                                    >
                                                        <Pencil className="crm-services-action-icon" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="crm-services-icon-button crm-services-icon-button-danger"
                                                        onClick={() => handleDeleteService(service.id)}
                                                        aria-label={t('common:delete')}
                                                    >
                                                        <Trash2 className="crm-services-action-icon" />
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            <Dialog open={isServiceModalOpen} onOpenChange={setIsServiceModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {editingService
                                ? (isEmployee ? t('employee/services:request_service_change') : t('admin/services:edit_service'))
                                : t('admin/services:add_service')}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        {isEmployee ? (
                            <>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label>{t('admin/services:price')} ({currency ?? ''})</Label>
                                        <Input
                                            type="number"
                                            value={serviceFormData.price}
                                            onChange={(event) => setServiceFormData((prev) => ({ ...prev, price: event.target.value }))}
                                        />
                                    </div>
                                    <div>
                                        <Label>{t('admin/services:duration')} ({t('common:min')})</Label>
                                        <Input
                                            type="number"
                                            value={serviceFormData.duration}
                                            onChange={(event) => setServiceFormData((prev) => ({ ...prev, duration: event.target.value }))}
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center justify-between">
                                    <Label>{t('employee/services:online_booking')}</Label>
                                    <Switch checked={editOnlineBooking} onCheckedChange={setEditOnlineBooking} />
                                </div>

                                <div className="flex items-center justify-between">
                                    <Label>{t('employee/services:show_in_calendar')}</Label>
                                    <Switch checked={editCalendarEnabled} onCheckedChange={setEditCalendarEnabled} />
                                </div>

                                <div>
                                    <Label>{t('employee/services:comment_optional')}</Label>
                                    <Textarea value={editComment} onChange={(event) => setEditComment(event.target.value)} />
                                </div>
                            </>
                        ) : (
                            <>
                                <Label>{t('admin/services:name')}</Label>
                                <Input
                                    value={serviceFormData.name}
                                    onChange={(event) => setServiceFormData((prev) => ({ ...prev, name: event.target.value }))}
                                />

                                <Label>{t('admin/services:category')}</Label>
                                <Input
                                    value={serviceFormData.category}
                                    onChange={(event) => setServiceFormData((prev) => ({ ...prev, category: event.target.value }))}
                                />

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label>{t('admin/services:price')}</Label>
                                        <Input
                                            type="number"
                                            value={serviceFormData.price}
                                            onChange={(event) => setServiceFormData((prev) => ({ ...prev, price: event.target.value }))}
                                        />
                                    </div>
                                    <div>
                                        <Label>{t('admin/services:duration')}</Label>
                                        <Input
                                            type="number"
                                            value={serviceFormData.duration}
                                            onChange={(event) => setServiceFormData((prev) => ({ ...prev, duration: event.target.value }))}
                                        />
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsServiceModalOpen(false)}>{t('common:cancel')}</Button>
                        <Button onClick={handleSave} disabled={saving}>{saving ? t('common:saving') : t('common:save')}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function Badge({ children }: { children: React.ReactNode }) {
    return <span className="crm-services-history-badge">{children}</span>;
}
