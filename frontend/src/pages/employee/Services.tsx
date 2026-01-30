import { useEffect, useState, useMemo } from 'react';
import { Scissors, Clock, AlertCircle, Edit2, X, Loader2, Send, History, Search, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Skeleton } from '../../components/ui/skeleton';
import { useTranslation } from 'react-i18next';
import i18n from 'i18next';
import { api } from '../../services/api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Switch } from '../../components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Textarea } from '../../components/ui/textarea';
import { toast } from 'sonner';
import { useCurrency } from '../../hooks/useSalonSettings';

interface Service {
  id: number;
  name: string;
  description?: string;
  price: number;
  default_price?: number;
  price_min?: number;
  price_max?: number;
  duration: number;
  default_duration?: number;
  category: string;
  is_online_booking_enabled?: boolean;
  is_calendar_enabled?: boolean;
  currency?: string;
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

export default function EmployeeServices() {
  const { t } = useTranslation(['employee/services', 'common']);
  const { currency, formatCurrency } = useCurrency();
  const [services, setServices] = useState<Service[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Record<number, PendingRequest>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);

  // Edit modal state
  const [editService, setEditService] = useState<Service | null>(null);
  const [editPrice, setEditPrice] = useState('');
  const [editDuration, setEditDuration] = useState('');
  const [editOnlineBooking, setEditOnlineBooking] = useState(true);
  const [editCalendarEnabled, setEditCalendarEnabled] = useState(true);
  const [editComment, setEditComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // History modal
  const [showHistory, setShowHistory] = useState(false);
  const [changeHistory, setChangeHistory] = useState<ChangeRequest[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Reload services when language changes
  useEffect(() => {
    loadServices();
  }, [i18n.language]);

  const loadServices = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/my/services', {
        credentials: 'include'
      });
      if (!response.ok) {
        // Fallback to old endpoint
        const data = await api.getServices();
        setServices(data.services || []);
        setPendingRequests({});
      } else {
        const data = await response.json();
        setServices(data.services || []);
        setPendingRequests(data.pending_requests || {});
      }
    } catch (err: any) {
      console.error('Error loading services:', err);
      setError(err.message || t('common:error_loading'));
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
    return sortConfig.direction === 'asc' ? <ArrowUp size={14} className="ml-1 text-pink-500" /> : <ArrowDown size={14} className="ml-1 text-pink-500" />;
  };

  const getLocalizedName = (service: Service) => {
    return service.name || '';
  };

  const getLocalizedCategory = (service: Service) => {
    return service.category || '';
  };

  const filteredAndSortedServices = useMemo(() => {
    let result = [...services];

    // Filter by search term
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter(s => {
        const name = getLocalizedName(s).toLowerCase();
        const category = getLocalizedCategory(s).toLowerCase();
        return name.includes(lowerSearch) || category.includes(lowerSearch);
      });
    }

    // Sort
    if (sortConfig) {
      result.sort((a, b) => {
        let aVal: any, bVal: any;

        switch (sortConfig.key) {
          case 'name':
            aVal = getLocalizedName(a).toLowerCase();
            bVal = getLocalizedName(b).toLowerCase();
            break;
          case 'price':
            aVal = a.price || 0;
            bVal = b.price || 0;
            break;
          case 'duration':
            aVal = a.duration || 0;
            bVal = b.duration || 0;
            break;
          case 'category':
            aVal = getLocalizedCategory(a).toLowerCase();
            bVal = getLocalizedCategory(b).toLowerCase();
            break;
          default:
            return 0;
        }

        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [services, searchTerm, sortConfig]);

  const openEditModal = (service: Service) => {
    setEditService(service);
    setEditPrice(service.price?.toString() || '');
    setEditDuration(service.duration?.toString() || '');
    setEditOnlineBooking(service.is_online_booking_enabled !== false);
    setEditCalendarEnabled(service.is_calendar_enabled !== false);
    setEditComment('');
  };

  const closeEditModal = () => {
    setEditService(null);
    setEditPrice('');
    setEditDuration('');
    setEditComment('');
  };

  const submitChangeRequest = async () => {
    if (!editService) return;

    setSubmitting(true);
    try {
      const response = await fetch(`/api/my/services/${editService.id}/request-change`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          price: editPrice ? parseFloat(editPrice) : null,
          duration: editDuration ? parseInt(editDuration) : null,
          is_online_booking_enabled: editOnlineBooking,
          is_calendar_enabled: editCalendarEnabled,
          comment: editComment || null
        })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to submit request');
      }

      toast.success(t('request_submitted'));
      closeEditModal();
      loadServices();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const cancelRequest = async (serviceId: number) => {
    try {
      const response = await fetch(`/api/my/services/${serviceId}/cancel-request`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to cancel request');
      }

      toast.success(t('request_cancelled'));
      loadServices();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const response = await fetch('/api/my/change-requests', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setChangeHistory(data.requests || []);
      }
    } catch (err) {
      console.error('Error loading history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const openHistory = () => {
    setShowHistory(true);
    loadHistory();
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="mb-8">
          <Skeleton className="h-10 w-48 mb-2" />
          <Skeleton className="h-6 w-64" />
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16 mb-2" />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <span className="text-red-800">{t('common:error')}: {error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl text-gray-900 mb-2 flex items-center gap-3">
            <Scissors className="w-8 h-8 text-pink-600" />
            {t('my_services')}
          </h1>
          <p className="text-gray-600">{t('edit_services_description')}</p>
        </div>
        <Button variant="outline" onClick={openHistory} className="flex items-center gap-2">
          <History className="w-4 h-4" />
          {t('change_history')}
        </Button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder={t('common:search')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {services.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <Scissors className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl text-gray-900 mb-2">{t('no_services')}</h3>
          <p className="text-gray-600">{t('no_services_description')}</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th onClick={() => handleSort('name')} className="px-6 py-4 text-sm font-semibold text-gray-600 cursor-pointer hover:bg-gray-100 transition-colors">
                    <div className="flex items-center">{t('service_name')} {getSortIcon('name')}</div>
                  </th>
                  <th onClick={() => handleSort('price')} className="px-6 py-4 text-sm font-semibold text-gray-600 cursor-pointer hover:bg-gray-100 transition-colors">
                    <div className="flex items-center">{t('price')} {getSortIcon('price')}</div>
                  </th>
                  <th onClick={() => handleSort('duration')} className="px-6 py-4 text-sm font-semibold text-gray-600 cursor-pointer hover:bg-gray-100 transition-colors">
                    <div className="flex items-center">{t('duration')} {getSortIcon('duration')}</div>
                  </th>
                  <th onClick={() => handleSort('category')} className="px-6 py-4 text-sm font-semibold text-gray-600 cursor-pointer hover:bg-gray-100 transition-colors">
                    <div className="flex items-center">{t('category')} {getSortIcon('category')}</div>
                  </th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600">{t('common:status', 'Статус')}</th>
                  <th className="px-6 py-4 text-sm font-semibold text-gray-600 text-right">{t('common:actions', 'Действия')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredAndSortedServices.map((service) => {
                  const pending = pendingRequests[service.id];
                  const serviceName = getLocalizedName(service);
                  const categoryName = getLocalizedCategory(service);

                  return (
                    <tr key={service.id} className={`hover:bg-gray-50/80 transition-colors ${pending ? 'bg-amber-50/50' : ''}`}>
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-gray-900">{serviceName}</p>
                      </td>
                      <td className="px-6 py-4 font-bold text-gray-900 text-[13px]">
                        {formatCurrency(service.price)}
                      </td>
                      <td className="px-6 py-4">
                        {service.duration ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-600 border border-blue-100">
                            <Clock className="w-3 h-3 mr-1" />
                            {service.duration} {t('min')}
                          </span>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-600 border border-blue-100">
                          {categoryName}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {pending ? (
                          <span className="inline-flex items-center px-2 py-1 text-xs bg-amber-100 text-amber-700 rounded-full gap-1">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            {t('pending_approval')}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">
                            {t('common:active', 'Активно')}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          {pending ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-amber-600 border-amber-300 hover:bg-amber-50"
                              onClick={() => cancelRequest(service.id)}
                            >
                              <X className="w-4 h-4 mr-1" />
                              {t('cancel_request')}
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditModal(service)}
                            >
                              <Edit2 className="w-4 h-4 mr-1" />
                              {t('request_change')}
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      <Dialog open={!!editService} onOpenChange={() => closeEditModal()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('request_service_change')}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm text-gray-600">{t('service')}: <strong>{editService?.name}</strong></p>
              <p className="text-xs text-gray-500 mt-1">{t('changes_require_approval')}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  {t('price')}
                </label>
                <Input
                  type="number"
                  value={editPrice}
                  onChange={(e) => setEditPrice(e.target.value)}
                  placeholder={editService?.price?.toString()}
                />
                {editService?.default_price && (
                  <p className="text-xs text-gray-500 mt-1">
                    {t('default')}: {editService.default_price}
                  </p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  {t('duration_min')}
                </label>
                <Input
                  type="number"
                  value={editDuration}
                  onChange={(e) => setEditDuration(e.target.value)}
                  placeholder={editService?.duration?.toString()}
                />
                {editService?.default_duration && (
                  <p className="text-xs text-gray-500 mt-1">
                    {t('default')}: {editService.default_duration}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">
                  {t('online_booking')}
                </label>
                <Switch
                  checked={editOnlineBooking}
                  onCheckedChange={setEditOnlineBooking}
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">
                  {t('show_in_calendar')}
                </label>
                <Switch
                  checked={editCalendarEnabled}
                  onCheckedChange={setEditCalendarEnabled}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                {t('comment_optional')}
              </label>
              <Textarea
                value={editComment}
                onChange={(e) => setEditComment(e.target.value)}
                placeholder={t('comment_placeholder')}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeEditModal}>
              {t('common:cancel')}
            </Button>
            <Button onClick={submitChangeRequest} disabled={submitting}>
              {submitting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              {t('submit_request')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History Modal */}
      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('change_history')}</DialogTitle>
          </DialogHeader>

          <div className="max-h-96 overflow-y-auto">
            {loadingHistory ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : changeHistory.length === 0 ? (
              <p className="text-center text-gray-500 py-8">{t('no_history')}</p>
            ) : (
              <div className="space-y-3">
                {changeHistory.map((req) => (
                  <div key={req.id} className={`p-3 rounded-lg border ${
                    req.status === 'approved' ? 'bg-green-50 border-green-200' :
                    req.status === 'rejected' ? 'bg-red-50 border-red-200' :
                    'bg-amber-50 border-amber-200'
                  }`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-gray-900">
                          {req.service_name}
                        </p>
                        <p className="text-sm text-gray-600">
                          {req.requested_price && `${t('price')}: ${req.requested_price}`}
                          {req.requested_price && req.requested_duration && ' | '}
                          {req.requested_duration && `${t('duration')}: ${req.requested_duration} ${t('min')}`}
                        </p>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        req.status === 'approved' ? 'bg-green-100 text-green-700' :
                        req.status === 'rejected' ? 'bg-red-100 text-red-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {req.status === 'approved' ? t('approved') :
                         req.status === 'rejected' ? t('rejected') :
                         t('pending')}
                      </span>
                    </div>
                    {req.employee_comment && (
                      <p className="text-sm text-gray-500 mt-2">
                        {t('your_comment')}: {req.employee_comment}
                      </p>
                    )}
                    {req.admin_comment && (
                      <p className="text-sm text-gray-600 mt-1 font-medium">
                        {t('admin_response')}: {req.admin_comment}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 mt-2">
                      {new Date(req.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowHistory(false)}>
              {t('common:close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
