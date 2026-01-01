import { useState } from 'react';
import { Bell, Calendar, Tag, Award, Check, CheckCheck } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export function Notifications() {
  const { t } = useTranslation(['account/notifications', 'common']);

  // Mock notifications since we don't have them in props yet
  const initialNotifications = [
    {
      id: '1',
      type: 'appointment',
      title: t('mock_appointment_title'),
      message: t('mock_appointment_message'),
      date: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 mins ago
      read: false,
    },
    {
      id: '2',
      type: 'promotion',
      title: t('mock_promotion_title'),
      message: t('mock_promotion_message'),
      date: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
      read: false,
    },
    {
      id: '3',
      type: 'achievement',
      title: t('mock_achievement_title'),
      message: t('mock_achievement_message'),
      date: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), // 2 days ago
      read: true,
    }
  ];

  const [notifications, setNotifications] = useState(initialNotifications);

  const unreadCount = notifications.filter(n => !n.read).length;

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
        return t('type_appointment');
      case 'promotion':
        return t('type_promotion');
      case 'achievement':
        return t('type_achievement');
      case 'reminder':
        return t('type_reminder');
      default:
        return t('type_notification');
    }
  };

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    toast.success(t('all_marked_read'));
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins} ${t('time_mins_ago')}`;
    if (diffHours < 24) return `${diffHours} ${t('time_hours_ago')}`;
    return `${diffDays} ${t('time_days_ago')}`;
  };

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            {t('title')}
            {unreadCount > 0 && (
              <Badge className="bg-red-500">{unreadCount}</Badge>
            )}
          </h1>
          <p className="text-muted-foreground">
            {unreadCount > 0
              ? `${unreadCount} ${t('unread_count')}`
              : t('all_read')}
          </p>
        </div>

        {unreadCount > 0 && (
          <Button variant="outline" onClick={markAllAsRead}>
            <CheckCheck className="w-4 h-4 mr-2" />
            {t('mark_all_read')}
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {notifications.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Bell className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="mb-2">{t('no_notifications')}</h3>
              <p className="text-sm text-muted-foreground">
                {t('no_notifications_desc')}
              </p>
            </CardContent>
          </Card>
        ) : (
          notifications.map((notification) => {
            const Icon = getIcon(notification.type);
            return (
              <Card
                key={notification.id}
                className={`${!notification.read
                    ? 'border-l-4 border-l-blue-500 bg-blue-50/50'
                    : ''
                  } cursor-pointer hover:shadow-md transition-shadow`}
                onClick={() => !notification.read && markAsRead(notification.id)}
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
                          {!notification.read && (
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
                          {getTimeAgo(notification.date)}
                        </div>
                        {!notification.read && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsRead(notification.id);
                            }}
                          >
                            <Check className="w-4 h-4 mr-1" />
                            {t('mark_read')}
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
