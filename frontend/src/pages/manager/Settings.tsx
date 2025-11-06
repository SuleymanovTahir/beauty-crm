import React, { useState } from 'react';
import { api } from '../../services/api';
import { Settings as SettingsIcon, Bell, Shield, Mail, Smartphone } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export default function ManagerSettings() {
  const { t } = useTranslation(['settings', 'common']);
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    smsNotifications: false,
    bookingNotifications: true,
    chatNotifications: true,
    dailyReport: true,
    reportTime: '09:00',
  });

  const handleSaveNotifications = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/settings/notifications', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notificationSettings)
      });

      if (response.ok) {
        toast.success(t('settings:notifications_saved'));
      } else {
        toast.error(t('common:save_error'));
      }
    } catch (err) {
      console.error('Error saving settings:', err);
      toast.error(t('common:server_error'));
    }
  };
  const [generalSettings, setGeneralSettings] = useState({});
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    api.getSalonSettings().then(data => {
      setGeneralSettings(data);
      setLoading(false);
    });
  }, []);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl text-gray-900 mb-2 flex items-center gap-3">
          <SettingsIcon className="w-8 h-8 text-pink-600" />
          {t('settings:title')}
        </h1>
        <p className="text-gray-600">{t('settings:subtitle')}</p>
      </div>

      <Tabs defaultValue="notifications" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:w-auto">
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            <span className="hidden sm:inline">{t('settings:notifications')}</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            <span className="hidden sm:inline">{t('settings:security')}</span>
          </TabsTrigger>
        </TabsList>

        {/* Notifications */}
        <TabsContent value="notifications">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <h2 className="text-2xl text-gray-900 mb-6">{t('settings:notifications')}</h2>

            <form onSubmit={handleSaveNotifications} className="space-y-6">
              <div className="space-y-4">
              <h3 className="text-lg text-gray-900 mb-4">{t('settings:notification_channels')}</h3>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Mail className="w-6 h-6 text-blue-600" />
                    <div>
                    <p className="text-sm text-gray-900">{t('settings:email_notifications')}</p>
                    <p className="text-xs text-gray-600">{t('settings:receive_by_email')}</p>
                    </div>
                  </div>
                  <Switch
                    checked={!!notificationSettings.emailNotifications}
                    onCheckedChange={(checked: boolean) => setNotificationSettings({ ...notificationSettings, emailNotifications: checked })}
                  />
                  <div className="flex items-center gap-3">
                    <Smartphone className="w-6 h-6 text-green-600" />
                    <div>
                    <p className="text-sm text-gray-900">{t('settings:sms_notifications')}</p>
                    <p className="text-xs text-gray-600">{t('settings:receive_by_phone')}</p>
                    </div>
                  </div>
                  <Switch
                    checked={!!notificationSettings.smsNotifications}
                    onCheckedChange={(checked: boolean) =>
                      setNotificationSettings({ ...notificationSettings, smsNotifications: checked })
                    }
                  />
                </div>
              </div>

              <div className="border-t border-gray-200 pt-6 space-y-4">
              <h3 className="text-lg text-gray-900 mb-4">{t('settings:events')}</h3>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                  <p className="text-sm text-gray-900">{t('settings:new_bookings')}</p>
                  <p className="text-xs text-gray-600">{t('settings:booking_notifications_desc')}</p>
                  </div>
                  <Switch
                    checked={!!notificationSettings.bookingNotifications}
                    onCheckedChange={(checked: boolean) =>
                      setNotificationSettings({ ...notificationSettings, bookingNotifications: checked })
                    }
                  />
                  <div>
                  <p className="text-sm text-gray-900">{t('settings:chat_messages')}</p>
                  <p className="text-xs text-gray-600">{t('settings:new_messages_desc')}</p>
                  </div>
                  <Switch
                    checked={!!notificationSettings.chatNotifications}
                    onCheckedChange={(checked: boolean) =>
                      setNotificationSettings({ ...notificationSettings, chatNotifications: checked })
                    }
                  />
                </div>

                <div className="p-4 bg-gray-50 rounded-lg space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                    <p className="text-sm text-gray-900">{t('settings:daily_report')}</p>
                    <p className="text-xs text-gray-600">{t('settings:daily_stats')}</p>
                    </div>
                    <Switch
                      checked={!!notificationSettings.dailyReport}
                      onCheckedChange={(checked: boolean) => setNotificationSettings({ ...notificationSettings, dailyReport: checked })}
                    />
                  </div>

                  {notificationSettings.dailyReport && (
                    <div>
                      <Label htmlFor="reportTime">{t('settings:report_time')}</Label>
                      <Input
                        id="reportTime"
                        type="time"
                        value={notificationSettings.reportTime}
                        onChange={(e) => setNotificationSettings({ ...notificationSettings, reportTime: e.target.value })}
                      />
                    </div>
                  )}
                </div>
              </div>

              <Button type="submit" className="bg-gradient-to-r from-pink-500 to-purple-600">
              {t('common:save_settings')}
              </Button>
            </form>
          </div>
        </TabsContent>

        {/* Security */}
        <TabsContent value="security">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <h2 className="text-2xl text-gray-900 mb-6">{t('settings:security')}</h2>

            <div className="space-y-6">
              <div className="p-6 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <Shield className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                  <div>
                  <h3 className="text-sm text-gray-900 mb-2 font-semibold">{t('settings:security_tips')}</h3>
                    <ul className="text-sm text-gray-700 space-y-2">
                    <li>• {t('settings:security_tip1')}</li>
                      <li>• {t('settings:security_tip2')}</li>
                      <li>• {t('settings:security_tip3')}</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div>
              <h3 className="text-lg text-gray-900 mb-4">{t('settings:change_password')}</h3>
              <Button variant="outline">
              🔐 {t('settings:change_password_btn')}
              </Button>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}