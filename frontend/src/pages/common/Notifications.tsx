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
    const [selectedIds, setSelectedIds] = useState<number[]>([]);

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

    const handleDeleteNotification = async (id: number) => {
        try {
            await api.deleteNotification(id);
            setNotifications(notifications.filter(n => n.id !== id));
            setSelectedIds(selectedIds.filter(sid => sid !== id));
            toast.success('Уведомление удалено');
        } catch (error) {
            console.error('Error deleting notification:', error);
            toast.error('Ошибка при удалении уведомления');
        }
    };

    const handleClearAll = async () => {
        if (!window.confirm('Вы уверены что хотите удалить все уведомления?')) {
            return;
        }
        try {
            await api.clearAllNotifications();
            setNotifications([]);
            setSelectedIds([]);
            toast.success('Все уведомления удалены');
        } catch (error) {
            console.error('Error clearing notifications:', error);
            toast.error('Ошибка при удалении уведомлений');
        }
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === notifications.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(notifications.map(n => n.id));
        }
    };

    const toggleSelect = (id: number) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(sid => sid !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    const handleDeleteSelected = async () => {
        if (selectedIds.length === 0) return;
        if (!window.confirm(`Вы уверены что хотите удалить ${selectedIds.length} уведомлений?`)) return;

        try {
            // Delete one by one as API doesn't seem to have bulk delete by IDs
            // Or use clearAll if all are selected
            if (selectedIds.length === notifications.length) {
                await api.clearAllNotifications();
                setNotifications([]);
            } else {
                await Promise.all(selectedIds.map(id => api.deleteNotification(id)));
                setNotifications(notifications.filter(n => !selectedIds.includes(n.id)));
            }
            setSelectedIds([]);
            toast.success('Выбранные уведомления удалены');
        } catch (error) {
            console.error('Error deleting selected:', error);
            toast.error('Ошибка при удалении выбранных уведомлений');
        }
    };

    const unreadCount = notifications.filter(n => !n.is_read).length;

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <div className="mb-8">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                            <Bell className="w-8 h-8 text-blue-600" />
                            Уведомления
                        </h1>
                        <p className="text-gray-600 mt-2">
                            {unreadCount > 0
                                ? `У вас ${unreadCount} ${unreadCount === 1 ? 'непрочитанное уведомление' : 'непрочитанных уведомлений'}`
                                : 'Все уведомления прочитаны'}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        {selectedIds.length > 0 && (
                            <button
                                onClick={handleDeleteSelected}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-sm"
                            >
                                <Trash2 size={16} />
                                Удалить ({selectedIds.length})
                            </button>
                        )}
                        {unreadCount > 0 && (
                            <button
                                onClick={handleMarkAllRead}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-100"
                            >
                                <CheckCheck size={16} />
                                Отметить все прочитанными
                            </button>
                        )}
                        {notifications.length > 0 && (
                            <button
                                onClick={handleClearAll}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors"
                            >
                                <Trash2 size={16} />
                                Очистить список
                            </button>
                        )}
                    </div>
                </div>

                {notifications.length > 0 && (
                    <div className="flex items-center gap-3 mb-4 p-2">
                        <input
                            type="checkbox"
                            checked={notifications.length > 0 && selectedIds.length === notifications.length}
                            onChange={toggleSelectAll}
                            className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
                        />
                        <span className="text-sm text-gray-600 font-medium">Выбрать все</span>
                    </div>
                )}
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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
                            className={`bg-white rounded-xl shadow-sm border border-gray-200 p-4 transition-all hover:shadow-md hover:border-blue-300 group flex items-start gap-4 ${!notif.is_read ? 'bg-gradient-to-r from-blue-50/50 to-blue-50/50 border-l-4 border-l-blue-500' : ''
                                }`}
                        >
                            <div className="pt-1.5 flex flex-col items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={selectedIds.includes(notif.id)}
                                    onChange={(e) => { e.stopPropagation(); toggleSelect(notif.id); }}
                                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 border-gray-300 cursor-pointer"
                                />
                                {!notif.is_read && (
                                    <div className="w-3 h-3 bg-blue-500 rounded-full flex-shrink-0 animate-pulse" title="Не прочитано"></div>
                                )}
                            </div>

                            <div
                                className="flex-1 min-w-0 cursor-pointer"
                                onClick={() => handleNotificationClick(notif)}
                            >
                                <div className="flex justify-between items-start">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                                        {notif.title}
                                    </h3>
                                    <span className="text-xs text-gray-400 whitespace-nowrap ml-2">
                                        {new Date(notif.created_at).toLocaleString('ru-RU', {
                                            day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                                        })}
                                    </span>
                                </div>

                                <p className="text-gray-700 line-clamp-2 mb-2 text-sm">
                                    {notif.message}
                                </p>

                                <div className="flex items-center gap-2">
                                    {notif.type && (
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${notif.type === 'info' ? 'bg-blue-100 text-blue-700' :
                                            notif.type === 'success' ? 'bg-green-100 text-green-700' :
                                                notif.type === 'warning' ? 'bg-yellow-100 text-yellow-700' :
                                                    'bg-red-100 text-red-700'
                                            }`}>
                                            {notif.type}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <button
                                onClick={(e) => { e.stopPropagation(); handleDeleteNotification(notif.id); }}
                                className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition-all self-center"
                                title="Удалить"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
            {/* Modal code remains same in next chunk... but since replacing whole component body... */}

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
                        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-pink-50">
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
                                className="px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-pink-500 hover:shadow-lg rounded-lg transition-all"
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
