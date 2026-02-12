import { useState, useEffect } from 'react';
import { Check, X, Loader2, Clock, User, Scissors } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Textarea } from '../../components/ui/textarea';
import { toast } from 'sonner';

interface ChangeRequest {
  id: number;
  user_id: number;
  employee_name: string;
  service_id: number;
  service_name: string;
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

      toast.success(t('change_requests.request_approved'));
      setShowApproveDialog(false);
      setSelectedRequest(null);
      setAdminComment('');
      loadRequests();
    } catch (err) {
      toast.error(t('change_requests.error_approving'));
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

      toast.success(t('change_requests.request_rejected'));
      setShowRejectDialog(false);
      setSelectedRequest(null);
      setAdminComment('');
      loadRequests();
    } catch (err) {
      toast.error(t('change_requests.error_rejecting'));
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
          {t('change_requests.title')}
        </h1>
        <p className="text-gray-600">
          {t('change_requests.description')}
        </p>
      </div>

      {requests.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <Check className="w-16 h-16 text-green-300 mx-auto mb-4" />
          <h3 className="text-xl text-gray-900 mb-2">{t('change_requests.no_pending')}</h3>
          <p className="text-gray-600">{t('change_requests.all_processed')}</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">{t('change_requests.employee')}</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">{t('change_requests.service')}</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">{t('change_requests.changes')}</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">{t('change_requests.comment')}</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">{t('change_requests.date')}</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-600">{t('change_requests.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {requests.map((req) => (
                <tr key={req.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-400" />
                      <span className="font-medium text-gray-900">
                        {req.employee_name}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-gray-900">
                      {req.service_name}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1 text-sm">
                      {req.requested_price !== null && req.requested_price !== undefined && (
                        <div>
                          <span className="text-gray-500">{t('change_requests.price')}: </span>
                          <span className="text-gray-400 line-through mr-1">{req.current_price}</span>
                          <span className="text-green-600 font-medium">{req.requested_price}</span>
                        </div>
                      )}
                      {req.requested_duration !== null && req.requested_duration !== undefined && (
                        <div>
                          <span className="text-gray-500">{t('change_requests.duration')}: </span>
                          <span className="text-gray-400 line-through mr-1">{req.current_duration} {t('common:min')}</span>
                          <span className="text-green-600 font-medium">{req.requested_duration} {t('common:min')}</span>
                        </div>
                      )}
                      {req.requested_is_online_booking_enabled !== null && req.requested_is_online_booking_enabled !== undefined && (
                        <div>
                          <span className="text-gray-500">{t('change_requests.online_booking')}: </span>
                          <span className={req.requested_is_online_booking_enabled ? 'text-green-600' : 'text-red-600'}>
                            {req.requested_is_online_booking_enabled ? t('common:on') : t('common:off')}
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
                        {t('change_requests.approve')}
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
                        {t('change_requests.reject')}
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
            <DialogTitle>{t('change_requests.approve_title')}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-600 mb-4">
              {t('change_requests.approve_confirm', { service: selectedRequest?.service_name, employee: selectedRequest?.employee_name })}
            </p>
            <label className="text-sm font-medium text-gray-700 block mb-1">
              {t('change_requests.comment_optional')}
            </label>
            <Textarea
              value={adminComment}
              onChange={(e) => setAdminComment(e.target.value)}
              placeholder={t('change_requests.comment_placeholder')}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproveDialog(false)}>
              {t('common:cancel')}
            </Button>
            <Button onClick={handleApprove} disabled={processing} className="bg-green-600 hover:bg-green-700">
              {processing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
              {t('change_requests.approve')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('change_requests.reject_title')}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-600 mb-4">
              {t('change_requests.reject_confirm', { service: selectedRequest?.service_name || selectedRequest?.service_name, employee: selectedRequest?.employee_name || selectedRequest?.employee_name })}
            </p>
            <label className="text-sm font-medium text-gray-700 block mb-1">
              {t('change_requests.reject_reason')}
            </label>
            <Textarea
              value={adminComment}
              onChange={(e) => setAdminComment(e.target.value)}
              placeholder={t('change_requests.reject_placeholder')}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              {t('common:cancel')}
            </Button>
            <Button onClick={handleReject} disabled={processing} className="bg-red-600 hover:bg-red-700">
              {processing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <X className="w-4 h-4 mr-2" />}
              {t('change_requests.reject')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
