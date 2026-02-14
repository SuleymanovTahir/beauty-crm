import { useState, useEffect } from 'react';
import { Bell, Calendar, Tag, Award, Check, CheckCheck, Loader2 } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { apiClient } from '@site/api/client';

export function Notifications() {
  const { t } = useTranslation(['account', 'common']);
  const [loading, setLoading] = useState(true);
  const [notificationsData, setNotificationsData] = useState<any>(null);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getClientNotifications();
      if (data.success) {
        setNotificationsData(data);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
      toast.error(t('common:error_loading_data'));
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'appointment':
        return Calendar;
      case 'promotion':
        return Tag;
      case 'achievement':
        return Award;
      default:
        return Bell;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'appointment':
        return 'bg-blue-500';
      case 'promotion':
        return 'bg-green-500';
      case 'achievement':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'appointment':
        return t('notifications.type_appointment', 'Запись');
      case 'promotion':
        return t('notifications.type_promotion', 'Акция');
      case 'achievement':
        return t('notifications.type_achievement', 'Достижение');
      case 'reminder':
        return t('notifications.type_reminder', 'Напоминание');
      default:
        return t('notifications.type_notification', 'Уведомление');
    }
  };

  const markAsRead = async (id: number) => {
    try {
      await apiClient.markNotificationRead(id);
      await loadNotifications(); // Reload notifications
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast.error(t('common:error_occurred'));
    }
  };

  const markAllAsRead = async () => {
    try {
      await apiClient.markAllNotificationsRead();
      await loadNotifications(); // Reload notifications
      toast.success(t('notifications.all_marked_read', 'Все уведомления отмечены как прочитанные'));
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast.error(t('common:error_occurred'));
    }
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins} ${t('notifications.min_ago', 'мин назад')}`;
    if (diffHours < 24) return `${diffHours} ${t('notifications.hours_ago', 'ч назад')}`;
    return `${diffDays} ${t('notifications.days_ago', 'д назад')}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
      </div>
    );
  }

  const notifications = notificationsData?.notifications || [];
  const unreadCount = notifications.filter((n: any) => !n.is_read).length;

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2">
            {t('notifications.title', 'Уведомления')}
            {unreadCount > 0 && (
              <Badge className="bg-red-500">{unreadCount}</Badge>
            )}
          </h1>
          <p className="text-muted-foreground">
            {unreadCount > 0
              ? `${unreadCount} ${t('notifications.unread', 'непрочитанных уведомлений')}`
              : t('notifications.all_read', 'Все уведомления прочитаны')}
          </p>
        </div>

        {unreadCount > 0 && (
          <Button variant="outline" onClick={markAllAsRead}>
            <CheckCheck className="w-4 h-4 mr-2" />
            {t('notifications.read_all', 'Прочитать все')}
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {notifications.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Bell className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="mb-2">{t('notifications.no_notifications', 'Нет уведомлений')}</h3>
              <p className="text-sm text-muted-foreground">
                {t('notifications.no_notifications_text', 'Здесь будут отображаться ваши уведомления')}
              </p>
            </CardContent>
          </Card>
        ) : (
          notifications.map((notification: any) => {
            const Icon = getIcon(notification.type);
            return (
              <Card
                key={notification.id}
                className={`${
                  !notification.is_read
                    ? 'border-l-4 border-l-blue-500 bg-blue-50/50'
                    : ''
                } cursor-pointer hover:shadow-md transition-shadow`}
                onClick={() => !notification.is_read && markAsRead(notification.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className={`p-2 rounded-full ${getTypeColor(notification.type)} text-white`}>
                      <Icon className="w-5 h-5" />
                    </div>

                    <div className="flex-1 space-y-1">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div className="font-semibold">{notification.title}</div>
                          {!notification.is_read && (
                            <div className="w-2 h-2 rounded-full bg-blue-500" />
                          )}
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {getTypeLabel(notification.type)}
                        </Badge>
                      </div>

                      <p className="text-sm text-muted-foreground">
                        {notification.message}
                      </p>

                      <div className="flex items-center justify-between pt-2">
                        <div className="text-xs text-muted-foreground">
                          {getTimeAgo(notification.created_at)}
                        </div>
                        {!notification.is_read && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsRead(notification.id);
                            }}
                          >
                            <Check className="w-4 h-4 mr-1" />
                            {t('notifications.mark_read', 'Отметить прочитанным')}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
