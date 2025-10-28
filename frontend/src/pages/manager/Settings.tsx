import React, { useState } from 'react';
import { Settings as SettingsIcon, Bell, Shield, Mail, Smartphone } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { toast } from 'sonner@2.0.3';

export default function ManagerSettings() {
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
        toast.success('Настройки уведомлений сохранены ✅');
      } else {
        toast.error('Ошибка при сохранении');
      }
    } catch (err) {
      console.error('Error saving settings:', err);
      toast.error('Ошибка сервера');
    }
  };
  const [generalSettings, setGeneralSettings] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
          Мои настройки
        </h1>
        <p className="text-gray-600">Персональные настройки менеджера</p>
      </div>

      <Tabs defaultValue="notifications" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:w-auto">
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            <span className="hidden sm:inline">Уведомления</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            <span className="hidden sm:inline">Безопасность</span>
          </TabsTrigger>
        </TabsList>

        {/* Notifications */}
        <TabsContent value="notifications">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <h2 className="text-2xl text-gray-900 mb-6">Уведомления</h2>

            <form onSubmit={handleSaveNotifications} className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg text-gray-900 mb-4">Каналы уведомлений</h3>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Mail className="w-6 h-6 text-blue-600" />
                    <div>
                      <p className="text-sm text-gray-900">Email уведомления</p>
                      <p className="text-xs text-gray-600">Получать на почту</p>
                    </div>
                  </div>
                  <Switch
                    checked={notificationSettings.emailNotifications}
                    onCheckedChange={(checked) => setNotificationSettings({ ...notificationSettings, emailNotifications: checked })}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Smartphone className="w-6 h-6 text-green-600" />
                    <div>
                      <p className="text-sm text-gray-900">SMS уведомления</p>
                      <p className="text-xs text-gray-600">Получать на телефон</p>
                    </div>
                  </div>
                  <Switch
                    checked={notificationSettings.smsNotifications}
                    onCheckedChange={(checked) => setNotificationSettings({ ...notificationSettings, smsNotifications: checked })}
                  />
                </div>
              </div>

              <div className="border-t border-gray-200 pt-6 space-y-4">
                <h3 className="text-lg text-gray-900 mb-4">События</h3>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-900">Новые записи клиентов</p>
                    <p className="text-xs text-gray-600">Уведомления о бронированиях</p>
                  </div>
                  <Switch
                    checked={notificationSettings.bookingNotifications}
                    onCheckedChange={(checked) => setNotificationSettings({ ...notificationSettings, bookingNotifications: checked })}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-900">Сообщения в чате</p>
                    <p className="text-xs text-gray-600">Новые сообщения от клиентов</p>
                  </div>
                  <Switch
                    checked={notificationSettings.chatNotifications}
                    onCheckedChange={(checked) => setNotificationSettings({ ...notificationSettings, chatNotifications: checked })}
                  />
                </div>

                <div className="p-4 bg-gray-50 rounded-lg space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-900">Ежедневный отчет</p>
                      <p className="text-xs text-gray-600">Статистика за день</p>
                    </div>
                    <Switch
                      checked={notificationSettings.dailyReport}
                      onCheckedChange={(checked) => setNotificationSettings({ ...notificationSettings, dailyReport: checked })}
                    />
                  </div>

                  {notificationSettings.dailyReport && (
                    <div>
                      <Label htmlFor="reportTime">Время отправки отчета</Label>
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
                Сохранить настройки
              </Button>
            </form>
          </div>
        </TabsContent>

        {/* Security */}
        <TabsContent value="security">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <h2 className="text-2xl text-gray-900 mb-6">Безопасность</h2>

            <div className="space-y-6">
              <div className="p-6 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <Shield className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-sm text-gray-900 mb-2 font-semibold">Советы по безопасности</h3>
                    <ul className="text-sm text-gray-700 space-y-2">
                      <li>• Используйте надежный пароль</li>
                      <li>• Не делитесь учетными данными</li>
                      <li>• Выходите из системы на чужих компьютерах</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg text-gray-900 mb-4">Сменить пароль</h3>
                <Button variant="outline">
                  🔐 Изменить пароль
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}