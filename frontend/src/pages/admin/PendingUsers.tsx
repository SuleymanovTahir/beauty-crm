// /frontend/src/pages/admin/PendingUsers.tsx
import React, { useState, useEffect } from "react";
import { useTranslation } from 'react-i18next';
import { CheckCircle, XCircle, Mail, User, Calendar, Loader, Shield, Phone, Briefcase } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { toast } from "sonner";
import { api } from "../../services/api";

interface PendingUser {
  id: number;
  username: string;
  full_name: string;
  email: string;
  phone?: string;
  role: string;
  position?: string;
  created_at: string;
  email_verified: boolean;
}

export default function PendingUsers() {
  const { t } = useTranslation('admin/pending_registrations');
  const [users, setUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  // Modal states
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<PendingUser | null>(null);
  const [position, setPosition] = useState("");
  const [rejectReason, setRejectReason] = useState("");

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await api.getPendingUsers();
      setUsers(response.users || []);
    } catch (error) {
      console.error("Error loading pending users:", error);
      toast.error(t('error_loading_users'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const openApproveModal = (user: PendingUser) => {
    setSelectedUser(user);
    setPosition(user.position || "");
    setApproveModalOpen(true);
  };

  const openRejectModal = (user: PendingUser) => {
    setSelectedUser(user);
    setRejectReason("");
    setRejectModalOpen(true);
  };

  const handleApprove = async () => {
    if (!selectedUser) return;

    try {
      setActionLoading(selectedUser.id);
      const response: any = await api.approveUser(selectedUser.id, position || undefined);

      if (response.success) {
        toast.success(t('user_approved', { name: selectedUser.full_name }));
        setUsers(users.filter((u) => u.id !== selectedUser.id));
        setApproveModalOpen(false);
      } else {
        toast.error(response.error || t('error_approving'));
      }
    } catch (error: any) {
      console.error("Error approving user:", error);
      toast.error(error.message || t('error_approving'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!selectedUser) return;

    try {
      setActionLoading(selectedUser.id);
      const response: any = await api.rejectUser(selectedUser.id);

      if (response.success) {
        toast.success(t('user_rejected', { name: selectedUser.full_name }));
        setUsers(users.filter((u) => u.id !== selectedUser.id));
        setRejectModalOpen(false);
      } else {
        toast.error(response.error || t('error_rejecting'));
      }
    } catch (error: any) {
      console.error("Error rejecting user:", error);
      toast.error(error.message || t('error_rejecting'));
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="w-8 h-8 animate-spin text-pink-500" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {t('pending_approval_title')}
        </h1>
        <p className="text-gray-600">
          {t('pending_approval_desc')}
        </p>
      </div>

      {users.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {t('no_pending_users')}
          </h3>
          <p className="text-gray-600">
            {t('all_processed')}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {users.map((user) => (
            <div
              key={user.id}
              className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-blue-600 rounded-full flex items-center justify-center">
                      <User className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {user.full_name}
                      </h3>
                      <p className="text-sm text-gray-500">@{user.username}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Mail className="w-4 h-4" />
                      <span>{user.email}</span>
                    </div>
                    {user.phone && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Phone className="w-4 h-4" />
                        <span>{user.phone}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Shield className="w-4 h-4" />
                      <span className="capitalize">{t(`role_${user.role}`, user.role)}</span>
                    </div>
                    {user.position && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Briefcase className="w-4 h-4" />
                        <span>{user.position}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {new Date(user.created_at).toLocaleDateString('ru-RU')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {user.email_verified ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                          <CheckCircle className="w-3 h-3" />
                          {t('status_verified')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full">
                          <XCircle className="w-3 h-3" />
                          {t('email_not_verified')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2 ml-4">
                  <Button
                    onClick={() => openApproveModal(user)}
                    disabled={!user.email_verified || actionLoading === user.id}
                    className="bg-green-500 hover:bg-green-600 text-white"
                    size="sm"
                    title={
                      !user.email_verified
                        ? t('email_not_verified')
                        : t('approve')
                    }
                  >
                    {actionLoading === user.id ? (
                      <Loader className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-1" />
                        {t('approve')}
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => openRejectModal(user)}
                    disabled={actionLoading === user.id}
                    variant="destructive"
                    size="sm"
                  >
                    {actionLoading === user.id ? (
                      <Loader className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <XCircle className="w-4 h-4 mr-1" />
                        {t('reject')}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Approve Modal with Position */}
      <Dialog open={approveModalOpen} onOpenChange={setApproveModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              {t('approve_modal_title', 'Approve Registration')}
            </DialogTitle>
            <DialogDescription>
              {t('approve_modal_desc', 'Specify the position for user {{name}}').replace('{{name}}', selectedUser?.full_name || '')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="position">{t('position', 'Position')}</Label>
              <Input
                id="position"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                placeholder={t('position_placeholder', 'e.g., Nail Technician')}
              />
              <p className="text-xs text-gray-500">
                {t('position_hint', 'The position will be displayed in the employee profile')}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveModalOpen(false)}>
              {t('cancel')}
            </Button>
            <Button
              onClick={handleApprove}
              disabled={actionLoading === selectedUser?.id}
              className="bg-green-500 hover:bg-green-600"
            >
              {actionLoading === selectedUser?.id ? (
                <Loader className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <CheckCircle className="w-4 h-4 mr-2" />
              )}
              {t('approve')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Modal */}
      <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="w-5 h-5" />
              {t('reject_modal_title')}
            </DialogTitle>
            <DialogDescription>
              {t('reject_modal_desc')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 bg-red-50 rounded-lg">
              <p className="text-sm text-red-800">
                <strong>{selectedUser?.full_name}</strong> ({selectedUser?.email})
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason">{t('reject_reason', 'Rejection reason')}</Label>
              <Input
                id="reason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder={t('reject_reason_placeholder')}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectModalOpen(false)}>
              {t('cancel')}
            </Button>
            <Button
              onClick={handleReject}
              disabled={actionLoading === selectedUser?.id}
              variant="destructive"
            >
              {actionLoading === selectedUser?.id ? (
                <Loader className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <XCircle className="w-4 h-4 mr-2" />
              )}
              {t('reject')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
