import React, { useState, useEffect } from 'react';
import { Check, X, Trash2, RefreshCw, User, Mail, Briefcase, Calendar, AlertCircle } from 'lucide-react';

interface PendingUser {
    id: number;
    username: string;
    full_name: string;
    email: string;
    role: string;
    position: string;
    created_at: string;
    email_verified: boolean;
    is_active: boolean;
}

const PendingRegistrations: React.FC = () => {
    const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState<number | null>(null);
    const [rejectReason, setRejectReason] = useState<{ [key: number]: string }>({});
    const [showRejectModal, setShowRejectModal] = useState<number | null>(null);

    const fetchPendingUsers = async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/admin/registrations/pending', {
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('Failed to fetch pending registrations');
            }

            const data = await response.json();
            setPendingUsers(data.pending_users || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
            console.error('Error fetching pending users:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPendingUsers();
    }, []);

    const handleApprove = async (userId: number) => {
        setActionLoading(userId);
        try {
            const response = await fetch('/api/admin/registrations/approve', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ user_id: userId })
            });

            if (!response.ok) {
                throw new Error('Failed to approve registration');
            }

            // Refresh the list
            await fetchPendingUsers();

            // Show success message
            alert('Регистрация одобрена! Пользователь получит email уведомление.');
        } catch (err) {
            alert('Ошибка при одобрении: ' + (err instanceof Error ? err.message : 'Unknown error'));
        } finally {
            setActionLoading(null);
        }
    };

    const handleReject = async (userId: number) => {
        const reason = rejectReason[userId] || '';
        setActionLoading(userId);

        try {
            const response = await fetch('/api/admin/registrations/reject', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ user_id: userId, reason })
            });

            if (!response.ok) {
                throw new Error('Failed to reject registration');
            }

            // Refresh the list
            await fetchPendingUsers();
            setShowRejectModal(null);
            setRejectReason(prev => {
                const newState = { ...prev };
                delete newState[userId];
                return newState;
            });

            alert('Регистрация отклонена. Пользователь получит email уведомление.');
        } catch (err) {
            alert('Ошибка при отклонении: ' + (err instanceof Error ? err.message : 'Unknown error'));
        } finally {
            setActionLoading(null);
        }
    };

    const handleDelete = async (userId: number) => {
        if (!confirm('Вы уверены что хотите удалить эту регистрацию? Это действие необратимо.')) {
            return;
        }

        setActionLoading(userId);
        try {
            const response = await fetch(`/api/admin/registrations/${userId}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('Failed to delete registration');
            }

            // Refresh the list
            await fetchPendingUsers();

            alert('Регистрация удалена.');
        } catch (err) {
            alert('Ошибка при удалении: ' + (err instanceof Error ? err.message : 'Unknown error'));
        } finally {
            setActionLoading(null);
        }
    };

    const formatDate = (dateString: string) => {
        try {
            const date = new Date(dateString);
            return date.toLocaleString('ru-RU', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return dateString;
        }
    };

    const getRoleBadgeColor = (role: string) => {
        const colors: { [key: string]: string } = {
            'director': 'bg-purple-100 text-purple-800',
            'manager': 'bg-blue-100 text-blue-800',
            'employee': 'bg-green-100 text-green-800',
            'admin': 'bg-red-100 text-red-800'
        };
        return colors[role] || 'bg-gray-100 text-gray-800';
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-indigo-600" />
                    <p className="text-gray-600">Загрузка...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Ожидающие регистрации</h1>
                        <p className="text-gray-600 mt-2">
                            Управление новыми регистрациями пользователей
                        </p>
                    </div>
                    <button
                        onClick={fetchPendingUsers}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Обновить
                    </button>
                </div>

                {pendingUsers.length > 0 && (
                    <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-center gap-2">
                            <AlertCircle className="w-5 h-5 text-blue-600" />
                            <span className="text-blue-900 font-medium">
                                {pendingUsers.length} регистраци{pendingUsers.length === 1 ? 'я' : pendingUsers.length < 5 ? 'и' : 'й'} ожидает вашего одобрения
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* Error State */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                    <p className="text-red-800">{error}</p>
                </div>
            )}

            {/* Empty State */}
            {!loading && pendingUsers.length === 0 && (
                <div className="text-center py-16">
                    <User className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                    <h3 className="text-xl font-semibold text-gray-700 mb-2">
                        Нет ожидающих регистраций
                    </h3>
                    <p className="text-gray-500">
                        Все новые регистрации будут отображаться здесь
                    </p>
                </div>
            )}

            {/* Users List */}
            {pendingUsers.length > 0 && (
                <div className="grid gap-6">
                    {pendingUsers.map(user => (
                        <div
                            key={user.id}
                            className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
                        >
                            <div className="p-6">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                                                {user.full_name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-semibold text-gray-900">
                                                    {user.full_name}
                                                </h3>
                                                <p className="text-sm text-gray-500">@{user.username}</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                                            <div className="flex items-center gap-2 text-gray-700">
                                                <Mail className="w-4 h-4 text-gray-400" />
                                                <span className="text-sm">{user.email}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-gray-700">
                                                <Briefcase className="w-4 h-4 text-gray-400" />
                                                <span className="text-sm">{user.position || 'Не указано'}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-gray-700">
                                                <Calendar className="w-4 h-4 text-gray-400" />
                                                <span className="text-sm">{formatDate(user.created_at)}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(user.role)}`}>
                                                    {user.role === 'director' ? 'Директор' :
                                                        user.role === 'manager' ? 'Менеджер' :
                                                            user.role === 'employee' ? 'Сотрудник' :
                                                                user.role === 'admin' ? 'Админ' : user.role}
                                                </span>
                                                {user.email_verified && (
                                                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                        ✓ Email подтвержден
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex flex-wrap gap-3 mt-6 pt-4 border-t border-gray-200">
                                    <button
                                        onClick={() => handleApprove(user.id)}
                                        disabled={actionLoading === user.id}
                                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        {actionLoading === user.id ? (
                                            <RefreshCw className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Check className="w-4 h-4" />
                                        )}
                                        Одобрить
                                    </button>

                                    <button
                                        onClick={() => setShowRejectModal(user.id)}
                                        disabled={actionLoading === user.id}
                                        className="flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <X className="w-4 h-4" />
                                        Отклонить
                                    </button>

                                    <button
                                        onClick={() => handleDelete(user.id)}
                                        disabled={actionLoading === user.id}
                                        className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        Удалить
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Reject Modal */}
            {showRejectModal !== null && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg max-w-md w-full p-6">
                        <h3 className="text-lg font-semibold mb-4">Отклонить регистрацию</h3>
                        <p className="text-gray-600 mb-4">
                            Укажите причину отклонения (опционально). Пользователь получит это сообщение на email.
                        </p>
                        <textarea
                            value={rejectReason[showRejectModal] || ''}
                            onChange={(e) => setRejectReason(prev => ({
                                ...prev,
                                [showRejectModal]: e.target.value
                            }))}
                            placeholder="Например: Недостаточно информации..."
                            className="w-full border border-gray-300 rounded-lg p-3 mb-4 focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                            rows={4}
                        />
                        <div className="flex gap-3">
                            <button
                                onClick={() => handleReject(showRejectModal)}
                                disabled={actionLoading === showRejectModal}
                                className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 transition-colors"
                            >
                                {actionLoading === showRejectModal ? 'Отклонение...' : 'Отклонить'}
                            </button>
                            <button
                                onClick={() => {
                                    setShowRejectModal(null);
                                    setRejectReason(prev => {
                                        const newState = { ...prev };
                                        delete newState[showRejectModal];
                                        return newState;
                                    });
                                }}
                                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                            >
                                Отмена
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PendingRegistrations;
