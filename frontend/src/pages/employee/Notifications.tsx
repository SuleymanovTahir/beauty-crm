import { useState, useEffect } from 'react';
import { Bell, X, Trash2, CheckCheck } from 'lucide-react';
import { api } from '../../services/api';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export default function NotificationsPage() {
    const { t } = useTranslation(['common']);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedNotification, setSelectedNotification] = useState<any>(null);
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        loadNotifications();
    }, []);

    const loadNotifications = async () => {
        try {
            setLoading(true);
            const data = await api.getNotifications(false, 100);
            setNotifications(data.notifications || []);
        } catch (error) {
            console.error('Error loading notifications:', error);
            toast.error('Ошибка загрузки уведомлений');
        } finally {
            setLoading(false);
        }
    };

    const handleNotificationClick = async (notif: any) => {
        setSelectedNotification(notif);
        setShowModal(true);
        if (!notif.is_read) {
            try {
                await api.markNotificationRead(notif.id);
                loadNotifications();
            } catch (error) {
                console.error('Error marking notification read:', error);
            }
        }
    };

    const handleMarkAllRead = async () => {
        try {
            await api.markAllNotificationsRead();
            await loadNotifications();
            toast.success('Все уведомления отмечены как прочитанные');
        } catch (error) {
            console.error('Error marking all read:', error);
            toast.error('Ошибка при отметке уведомлений');
        }
    };

    const handleClearAll = async () => {
        if (!window.confirm('Вы уверены что хотите удалить все уведомления?')) {
            return;
        }
        try {
            await api.clearAllNotifications();
            setNotifications([]);
            toast.success('Все уведомления удалены');
        } catch (error) {
            console.error('Error clearing notifications:', error);
            toast.error('Ошибка при удалении уведомлений');
        }
    };

    const unreadCount = notifications.filter(n => !n.is_read).length;

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <div className="mb-8">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                            <Bell className="w-8 h-8 text-purple-600" />
                            Уведомления
                        </h1>
                        <p className="text-gray-600 mt-2">
                            {unreadCount > 0
                                ? `У вас ${unreadCount} ${unreadCount === 1 ? 'непрочитанное уведомление' : 'непрочитанных уведомлений'}`
                                : 'Все уведомления прочитаны'}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        {unreadCount > 0 && (
                            <button
                                onClick={handleMarkAllRead}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
                            >
                                <CheckCheck size={16} />
                                Отметить все прочитанными
                            </button>
                        )}
                        {notifications.length > 0 && (
                            <button
                                onClick={handleClearAll}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                            >
                                <Trash2 size={16} />
                                Очистить все
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
                </div>
            ) : notifications.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
                    <Bell size={64} className="mx-auto mb-4 text-gray-300" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                        Нет уведомлений
                    </h3>
                    <p className="text-gray-600">
                        У вас пока нет никаких уведомлений
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {notifications.map((notif) => (
                        <div
                            key={notif.id}
                            onClick={() => handleNotificationClick(notif)}
                            className={`bg-white rounded-xl shadow-sm border border-gray-200 p-6 cursor-pointer transition-all hover:shadow-md hover:border-purple-300 ${!notif.is_read ? 'bg-gradient-to-r from-blue-50/50 to-purple-50/50 border-l-4 border-l-blue-500' : ''
                                }`}
                        >
                            <div className="flex items-start gap-4">
                                {!notif.is_read && (
                                    <div className="w-3 h-3 bg-blue-500 rounded-full mt-1.5 flex-shrink-0 animate-pulse"></div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                        {notif.title}
                                    </h3>
                                    <p className="text-gray-700 line-clamp-2 mb-3">
                                        {notif.message}
                                    </p>
                                    <div className="flex items-center gap-4 text-sm text-gray-500">
                                        <span>
                                            {new Date(notif.created_at).toLocaleString('ru-RU', {
                                                day: '2-digit',
                                                month: 'long',
                                                year: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </span>
                                        {notif.type && (
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${notif.type === 'info' ? 'bg-blue-100 text-blue-700' :
                                                notif.type === 'success' ? 'bg-green-100 text-green-700' :
                                                    notif.type === 'warning' ? 'bg-yellow-100 text-yellow-700' :
                                                        'bg-red-100 text-red-700'
                                                }`}>
                                                {notif.type}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Notification Detail Modal */}
            {showModal && selectedNotification && (
                <div
                    className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
                    onClick={() => setShowModal(false)}
                >
                    <div
                        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-pink-50">
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <h2 className="text-2xl font-bold text-gray-900">
                                        {selectedNotification.title}
                                    </h2>
                                    <p className="text-sm text-gray-500 mt-2">
                                        {new Date(selectedNotification.created_at).toLocaleString('ru-RU', {
                                            day: '2-digit',
                                            month: 'long',
                                            year: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    <X size={24} />
                                </button>
                            </div>
                        </div>
                        <div className="p-8 overflow-y-auto max-h-[calc(90vh-200px)]">
                            <p className="text-gray-700 whitespace-pre-wrap leading-relaxed text-lg">
                                {selectedNotification.message}
                            </p>
                        </div>
                        <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-2">
                            <button
                                onClick={() => setShowModal(false)}
                                className="px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-purple-500 to-pink-500 hover:shadow-lg rounded-lg transition-all"
                            >
                                Закрыть
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
