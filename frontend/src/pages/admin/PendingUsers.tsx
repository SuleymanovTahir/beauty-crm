// /frontend/src/pages/admin/PendingUsers.tsx
import React, { useState, useEffect } from "react";
import { useTranslation } from 'react-i18next';
import { CheckCircle, XCircle, Mail, User, Calendar, Loader, Shield } from "lucide-react";
import { Button } from "../../components/ui/button";
import { toast } from "sonner";
import { api } from "../../services/api";

interface PendingUser {
  id: number;
  username: string;
  full_name: string;
  email: string;
  role: string;
  created_at: string;
  email_verified: boolean;
}

export default function PendingUsers() {
  const { t, i18n } = useTranslation('admin/pending_registrations');
  const [users, setUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

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

  const handleApprove = async (userId: number, fullName: string) => {
    try {
      setActionLoading(userId);
      const response: any = await api.approveUser(userId);

      if (response.success) {
        toast.success(t('user_approved', { name: fullName }));
        // Удаляем из списка
        setUsers(users.filter((u) => u.id !== userId));
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

  const handleReject = async (userId: number, fullName: string) => {
    if (!confirm(t('confirm_reject_user', { name: fullName }))) {
      return;
    }

    try {
      setActionLoading(userId);
      const response: any = await api.rejectUser(userId);

      if (response.success) {
        toast.success(t('user_rejected', { name: fullName }));
        // Удаляем из списка
        setUsers(users.filter((u) => u.id !== userId));
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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Mail className="w-4 h-4" />
                      <span>{user.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Shield className="w-4 h-4" />
                      <span className="capitalize">{user.role}</span>
                    </div>
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

                <div className="flex gap-2 ml-4">
                  <Button
                    onClick={() => handleApprove(user.id, user.full_name)}
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
                    onClick={() => handleReject(user.id, user.full_name)}
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
    </div>
  );
}
