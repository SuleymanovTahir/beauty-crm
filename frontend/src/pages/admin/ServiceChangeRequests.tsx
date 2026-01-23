import { useState, useEffect } from 'react';
import { Check, X, Loader2, AlertCircle, Clock, User, Scissors } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Textarea } from '../../components/ui/textarea';
import { toast } from 'sonner';

interface ChangeRequest {
  id: number;
  user_id: number;
  employee_name: string;
  employee_name_ru: string;
  service_id: number;
  service_name: string;
  service_name_ru: string;
  request_type: string;
  status: string;
  requested_price?: number;
  requested_price_min?: number;
  requested_price_max?: number;
  requested_duration?: number;
  requested_is_online_booking_enabled?: boolean;
  requested_is_calendar_enabled?: boolean;
  employee_comment?: string;
  created_at: string;
  current_price?: number;
  current_duration?: number;
}

export default function ServiceChangeRequests() {
  const { t } = useTranslation(['admin/services', 'common']);
  const [requests, setRequests] = useState<ChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<ChangeRequest | null>(null);
  const [adminComment, setAdminComment] = useState('');
  const [processing, setProcessing] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      const response = await fetch('/api/admin/service-change-requests?status=pending', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setRequests(data.requests || []);
      }
    } catch (err) {
      console.error('Error loading requests:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;
    setProcessing(true);
    try {
      const response = await fetch(`/api/admin/service-change-requests/${selectedRequest.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ comment: adminComment })
      });

      if (!response.ok) {
        throw new Error('Failed to approve');
      }

      toast.success('Запрос одобрен');
      setShowApproveDialog(false);
      setSelectedRequest(null);
      setAdminComment('');
      loadRequests();
    } catch (err) {
      toast.error('Ошибка при одобрении');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;
    setProcessing(true);
    try {
      const response = await fetch(`/api/admin/service-change-requests/${selectedRequest.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ comment: adminComment })
      });

      if (!response.ok) {
        throw new Error('Failed to reject');
      }

      toast.success('Запрос отклонён');
      setShowRejectDialog(false);
      setSelectedRequest(null);
      setAdminComment('');
      loadRequests();
    } catch (err) {
      toast.error('Ошибка при отклонении');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-pink-600" />
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl text-gray-900 mb-2 flex items-center gap-3">
          <Scissors className="w-8 h-8 text-pink-600" />
          Запросы на изменение услуг
        </h1>
        <p className="text-gray-600">
          Одобрите или отклоните запросы сотрудников на изменение параметров услуг
        </p>
      </div>

      {requests.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <Check className="w-16 h-16 text-green-300 mx-auto mb-4" />
          <h3 className="text-xl text-gray-900 mb-2">Нет ожидающих запросов</h3>
          <p className="text-gray-600">Все запросы обработаны</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Сотрудник</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Услуга</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Изменения</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Комментарий</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Дата</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-600">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {requests.map((req) => (
                <tr key={req.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-400" />
                      <span className="font-medium text-gray-900">
                        {req.employee_name_ru || req.employee_name}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-gray-900">
                      {req.service_name_ru || req.service_name}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1 text-sm">
                      {req.requested_price !== null && req.requested_price !== undefined && (
                        <div>
                          <span className="text-gray-500">Цена: </span>
                          <span className="text-gray-400 line-through mr-1">{req.current_price}</span>
                          <span className="text-green-600 font-medium">{req.requested_price}</span>
                        </div>
                      )}
                      {req.requested_duration !== null && req.requested_duration !== undefined && (
                        <div>
                          <span className="text-gray-500">Длительность: </span>
                          <span className="text-gray-400 line-through mr-1">{req.current_duration} мин</span>
                          <span className="text-green-600 font-medium">{req.requested_duration} мин</span>
                        </div>
                      )}
                      {req.requested_is_online_booking_enabled !== null && req.requested_is_online_booking_enabled !== undefined && (
                        <div>
                          <span className="text-gray-500">Онлайн-бронь: </span>
                          <span className={req.requested_is_online_booking_enabled ? 'text-green-600' : 'text-red-600'}>
                            {req.requested_is_online_booking_enabled ? 'Вкл' : 'Выкл'}
                          </span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {req.employee_comment ? (
                      <p className="text-sm text-gray-600 max-w-xs truncate" title={req.employee_comment}>
                        {req.employee_comment}
                      </p>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <Clock className="w-4 h-4" />
                      {new Date(req.created_at).toLocaleDateString('ru-RU')}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-green-600 border-green-200 hover:bg-green-50"
                        onClick={() => {
                          setSelectedRequest(req);
                          setAdminComment('');
                          setShowApproveDialog(true);
                        }}
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Одобрить
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => {
                          setSelectedRequest(req);
                          setAdminComment('');
                          setShowRejectDialog(true);
                        }}
                      >
                        <X className="w-4 h-4 mr-1" />
                        Отклонить
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Approve Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Одобрить запрос</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-600 mb-4">
              Вы собираетесь одобрить изменения для услуги <strong>{selectedRequest?.service_name_ru}</strong> от сотрудника <strong>{selectedRequest?.employee_name_ru}</strong>.
            </p>
            <label className="text-sm font-medium text-gray-700 block mb-1">
              Комментарий (опционально)
            </label>
            <Textarea
              value={adminComment}
              onChange={(e) => setAdminComment(e.target.value)}
              placeholder="Добавьте комментарий для сотрудника..."
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproveDialog(false)}>
              Отмена
            </Button>
            <Button onClick={handleApprove} disabled={processing} className="bg-green-600 hover:bg-green-700">
              {processing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
              Одобрить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Отклонить запрос</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-600 mb-4">
              Вы собираетесь отклонить изменения для услуги <strong>{selectedRequest?.service_name_ru}</strong> от сотрудника <strong>{selectedRequest?.employee_name_ru}</strong>.
            </p>
            <label className="text-sm font-medium text-gray-700 block mb-1">
              Причина отклонения
            </label>
            <Textarea
              value={adminComment}
              onChange={(e) => setAdminComment(e.target.value)}
              placeholder="Укажите причину отклонения..."
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Отмена
            </Button>
            <Button onClick={handleReject} disabled={processing} className="bg-red-600 hover:bg-red-700">
              {processing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <X className="w-4 h-4 mr-2" />}
              Отклонить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
