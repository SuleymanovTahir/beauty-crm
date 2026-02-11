import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
    Scissors, Search, Plus, History, Loader2
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

type TabType = 'services' | 'packages' | 'referrals' | 'challenges' | 'history';

export default function UniversalServices() {
    const [searchParams] = useSearchParams();
    const { user: currentUser } = useAuth();
    const { t, i18n } = useTranslation(['admin/services', 'employee/services', 'common']);
    const { currency, formatCurrency } = useCurrency();

    const isEmployee = currentUser?.role === 'employee';

    const [activeTab, setActiveTab] = useState<TabType>(() => {
        const tab = searchParams.get('tab') as TabType;
        return (tab === 'services' || tab === 'packages' || tab === 'referrals' || tab === 'challenges' || tab === 'history') ? tab : 'services';
    });

    const [services, setServices] = useState<Service[]>([]);
    const [pendingRequests, setPendingRequests] = useState<Record<number, PendingRequest>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter] = useState('all');
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);

    // Edit / Request Modal
    const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
    const [editingService, setEditingService] = useState<Service | null>(null);
    const [serviceFormData, setServiceFormData] = useState<any>({
        key: '', name: '', price: 0, min_price: '', max_price: '', duration: '',
        category: '', description: '', benefits: '', is_active: true
    });

    // Employee specific change request state
    const [editOnlineBooking, setEditOnlineBooking] = useState(true);
    const [editCalendarEnabled, setEditCalendarEnabled] = useState(true);
    const [editComment, setEditComment] = useState('');

    // History state
    const [changeHistory, setChangeHistory] = useState<ChangeRequest[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    useEffect(() => {
        loadData();
    }, [activeTab, i18n.language]);

    const loadData = async () => {
        try {
            setLoading(true);
            if (activeTab === 'services') {
                if (isEmployee) {
                    const response = await fetch('/api/my/services', { credentials: 'include' });
                    const data = await response.json();
                    setServices(data.services || []);
                    setPendingRequests(data.pending_requests || {});
                } else {
                    const data = await api.getServices(false);
                    setServices(data.services || []);
                }
            } else if (activeTab === 'history' && isEmployee) {
                loadHistory();
            }
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
            const data = await response.json();
            setChangeHistory(data.requests || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingHistory(false);
        }
    };

    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
        setSortConfig({ key, direction });
    };

    const filteredAndSortedServices = useMemo(() => {
        let result = services.filter(s => {
            const name = (s.name || '').toLowerCase();
            const search = searchTerm.toLowerCase();
            return name.includes(search) && (categoryFilter === 'all' || s.category === categoryFilter);
        });

        if (sortConfig) {
            result.sort((a, b) => {
                const { key, direction } = sortConfig;
                let aVal = a[key as keyof Service];
                let bVal = b[key as keyof Service];
                if (aVal! < bVal!) return direction === 'asc' ? -1 : 1;
                if (aVal! > bVal!) return direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return result;
    }, [services, searchTerm, categoryFilter, sortConfig]);

    const handleOpenEdit = (service: Service) => {
        setEditingService(service);
        if (isEmployee) {
            setServiceFormData({ price: service.price, duration: service.duration });
            setEditOnlineBooking(service.is_online_booking_enabled !== false);
            setEditCalendarEnabled(service.is_calendar_enabled !== false);
            setEditComment('');
        } else {
            setServiceFormData({
                key: service.key, name: service.name, price: service.price,
                min_price: service.min_price || '', max_price: service.max_price || '',
                duration: service.duration || '', category: service.category,
                description: service.description || '', benefits: (service.benefits || []).join(' | ')
            });
        }
        setIsServiceModalOpen(true);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            if (isEmployee && editingService) {
                const response = await fetch(`/api/my/services/${editingService.id}/request-change`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        price: serviceFormData.price,
                        duration: serviceFormData.duration,
                        is_online_booking_enabled: editOnlineBooking,
                        is_calendar_enabled: editCalendarEnabled,
                        comment: editComment || null
                    })
                });
                if (!response.ok) throw new Error('Request failed');
                toast.success(t('employee/services:request_submitted'));
            } else if (editingService) {
                await api.updateService(editingService.id, serviceFormData);
                toast.success(t('admin/services:service_updated'));
            } else {
                await api.createService(serviceFormData);
                toast.success(t('admin/services:service_added'));
            }
            setIsServiceModalOpen(false);
            loadData();
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
            loadData();
        } catch (err) {
            toast.error(t('common:error_deleting'));
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center h-screen">
            <Loader2 className="w-8 h-8 text-pink-600 animate-spin" />
        </div>
    );

    return (
        <div className="p-8">
            <div className="mb-8 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl text-gray-900 mb-2 flex items-center gap-3">
                        <Scissors className="w-8 h-8 text-pink-600" />
                        {isEmployee ? t('employee/services:my_services') : t('admin/services:services_and_packages')}
                    </h1>
                    <p className="text-gray-600">
                        {isEmployee ? t('employee/services:edit_services_description') : t('admin/services:management_of_price_list_and_salon_promotions')}
                    </p>
                </div>
                {!isEmployee && (
                    <Button onClick={() => { setEditingService(null); setIsServiceModalOpen(true); }} className="bg-pink-600 hover:bg-pink-700">
                        <Plus className="w-4 h-4 mr-2" /> {t('admin/services:add_service')}
                    </Button>
                )}
            </div>

            <div className="flex gap-4 mb-6">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input placeholder={t('common:search')} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
                </div>
                {isEmployee && (
                    <Button variant="outline" onClick={() => setActiveTab(activeTab === 'history' ? 'services' : 'history')}>
                        <History className="w-4 h-4 mr-2" /> {activeTab === 'history' ? t('employee/services:view_all') : t('employee/services:change_history')}
                    </Button>
                )}
            </div>

            {activeTab === 'history' && isEmployee ? (
                <div className="space-y-4">
                    {loadingHistory ? <Loader2 className="animate-spin" /> : changeHistory.map(req => (
                        <div key={req.id} className={`p-4 rounded-xl border ${req.status === 'approved' ? 'bg-green-50 border-green-200' : req.status === 'rejected' ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
                            <div className="flex justify-between">
                                <div>
                                    <h3 className="font-bold">{req.service_name}</h3>
                                    <p className="text-sm text-gray-600">{t('admin/services:price')}: {req.requested_price} | {t('admin/services:duration')}: {req.requested_duration}</p>
                                </div>
                                <Badge>{t(`common:status_${req.status}`, req.status)}</Badge>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th onClick={() => handleSort('name')} className="px-6 py-4 cursor-pointer">{t('admin/services:service_name')}</th>
                                <th onClick={() => handleSort('price')} className="px-6 py-4 cursor-pointer">{t('admin/services:price')}</th>
                                <th onClick={() => handleSort('duration')} className="px-6 py-4 cursor-pointer">{t('admin/services:duration')}</th>
                                <th className="px-6 py-4">{t('common:status')}</th>
                                <th className="px-6 py-4 text-right">{t('common:actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredAndSortedServices.map(s => {
                                const pending = pendingRequests[s.id];
                                return (
                                    <tr key={s.id} className={`hover:bg-gray-50 ${pending ? 'bg-amber-50/50' : ''}`}>
                                        <td className="px-6 py-4 font-bold">{s.name}</td>
                                        <td className="px-6 py-4">{formatCurrency(s.price)}</td>
                                        <td className="px-6 py-4">{s.duration} {t('common:min')}</td>
                                        <td className="px-6 py-4">
                                            {pending ? (
                                                <span className="text-amber-600 text-sm flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> {t('employee/services:pending_approval')}</span>
                                            ) : (
                                                <span className="text-green-600 text-sm">{t('common:active')}</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {pending ? (
                                                <Button variant="outline" size="sm" onClick={() => handleCancelRequest(s.id)} className="text-red-500">{t('employee/services:cancel_request')}</Button>
                                            ) : (
                                                <Button variant="outline" size="sm" onClick={() => handleOpenEdit(s)}>{isEmployee ? t('employee/services:request_change') : t('common:edit')}</Button>
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
                        <DialogTitle>{editingService ? (isEmployee ? t('employee/services:request_service_change') : t('admin/services:edit_service')) : t('admin/services:add_service')}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        {isEmployee ? (
                            <>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label>{t('admin/services:price')} ({currency})</Label>
                                        <Input type="number" value={serviceFormData.price} onChange={e => setServiceFormData({ ...serviceFormData, price: e.target.value })} />
                                    </div>
                                    <div>
                                        <Label>{t('admin/services:duration')} ({t('common:min')})</Label>
                                        <Input type="number" value={serviceFormData.duration} onChange={e => setServiceFormData({ ...serviceFormData, duration: e.target.value })} />
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
                                    <Textarea value={editComment} onChange={e => setEditComment(e.target.value)} />
                                </div>
                            </>
                        ) : (
                            <>
                                <Label>{t('admin/services:service_name')}</Label>
                                <Input value={serviceFormData.name} onChange={e => setServiceFormData({ ...serviceFormData, name: e.target.value })} />
                                <Label>{t('admin/services:category')}</Label>
                                <Input value={serviceFormData.category} onChange={e => setServiceFormData({ ...serviceFormData, category: e.target.value })} />
                                <div className="grid grid-cols-2 gap-4">
                                    <div><Label>{t('admin/services:price')}</Label><Input type="number" value={serviceFormData.price} onChange={e => setServiceFormData({ ...serviceFormData, price: e.target.value })} /></div>
                                    <div><Label>{t('admin/services:duration')}</Label><Input type="number" value={serviceFormData.duration} onChange={e => setServiceFormData({ ...serviceFormData, duration: e.target.value })} /></div>
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
    return <span className="px-2 py-1 rounded-full bg-gray-100 text-xs font-bold text-gray-600">{children}</span>;
}
