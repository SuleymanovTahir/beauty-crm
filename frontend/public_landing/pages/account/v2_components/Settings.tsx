import { useState, useEffect } from 'react';
import { User, Lock, Bell, Eye, Download, Smartphone, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Separator } from './ui/separator';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { apiClient } from '../../../../src/api/client';

export function Settings() {
  const { t } = useTranslation(['account', 'common']);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [notifications, setNotifications] = useState({
    push: true,
    email: true,
    sms: false,
    appointments: true,
    promotions: true,
    achievements: true,
  });
  const [privacy, setPrivacy] = useState({
    allowPhotos: true,
    shareWithMasters: true,
    publicProfile: false,
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);

      // Get user data from localStorage
      const userName = localStorage.getItem('user_name') || '';
      const userEmail = localStorage.getItem('user_email') || '';
      const userPhone = localStorage.getItem('user_phone') || '';

      // Set profile with available data
      setProfile({
        name: userName,
        email: userEmail,
        phone: userPhone,
        avatar: '',
      });

      setLoading(false);
    } catch (error) {
      console.error('Error loading profile:', error);
      toast.error(t('common:error_loading_data'));
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      const result = await apiClient.updateClientProfile(profile);
      if (result.success) {
        toast.success(t('settings.profile_updated', 'Профиль обновлен'));
        // Dispatch event to update profile across all components
        window.dispatchEvent(new CustomEvent('profile-updated'));
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error(t('common:error_occurred'));
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error(t('settings.passwords_dont_match', 'Пароли не совпадают'));
      return;
    }

    try {
      const result = await apiClient.changeClientPassword({
        old_password: passwordData.currentPassword,
        new_password: passwordData.newPassword,
      });
      if (result.success) {
        toast.success(t('settings.password_changed', 'Пароль изменен'));
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      }
    } catch (error) {
      console.error('Error changing password:', error);
      toast.error(t('common:error_occurred'));
    }
  };

  const handleSaveNotifications = async () => {
    try {
      const result = await apiClient.updateNotificationPreferences(notifications);
      if (result.success) {
        toast.success(t('settings.notifications_updated', 'Настройки уведомлений сохранены'));
      }
    } catch (error) {
      console.error('Error saving notifications:', error);
      toast.error(t('common:error_occurred'));
    }
  };

  const handleSavePrivacy = async () => {
    try {
      const result = await apiClient.updatePrivacyPreferences(privacy);
      if (result.success) {
        toast.success(t('settings.privacy_updated', 'Настройки приватности сохранены'));
      }
    } catch (error) {
      console.error('Error saving privacy:', error);
      toast.error(t('common:error_occurred'));
    }
  };

  const handleEnable2FA = () => {
    toast.info(t('settings.2fa_coming_soon', 'Двухфакторная аутентификация будет доступна в следующей версии'));
  };

  const handleExportData = () => {
    toast.success(t('settings.export_started', 'Экспорт данных начат. Вы получите файл на email'));
  };

  const handleDeleteAccount = () => {
    toast.error(t('settings.delete_contact_support', 'Для удаления аккаунта свяжитесь с поддержкой'));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1>{t('settings.title', 'Настройки')}</h1>
        <p className="text-muted-foreground">{t('settings.subtitle', 'Управление профилем и приватностью')}</p>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile">
            <User className="w-4 h-4 mr-2" />
            {t('settings.profile', 'Профиль')}
          </TabsTrigger>
          <TabsTrigger value="security">
            <Lock className="w-4 h-4 mr-2" />
            {t('settings.security', 'Безопасность')}
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="w-4 h-4 mr-2" />
            {t('settings.notifications', 'Уведомления')}
          </TabsTrigger>
          <TabsTrigger value="privacy">
            <Eye className="w-4 h-4 mr-2" />
            {t('settings.privacy', 'Приватность')}
          </TabsTrigger>
        </TabsList>

        {/* Профиль */}
        <TabsContent value="profile" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('settings.personal_info', 'Личная информация')}</CardTitle>
              <CardDescription>{t('settings.update_data', 'Обновите ваши данные')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6">
                <Avatar className="w-24 h-24">
                  <AvatarImage src={profile.avatar} alt={profile.name} />
                  <AvatarFallback>{profile.name?.[0] || 'U'}</AvatarFallback>
                </Avatar>
                <div className="space-y-2">
                  <Button variant="outline">{t('settings.change_photo', 'Изменить фото')}</Button>
                  <p className="text-sm text-muted-foreground">
                    {t('settings.photo_format', 'JPG, PNG. Макс. 5MB')}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">{t('settings.name', 'Имя')}</Label>
                  <Input
                    id="name"
                    value={profile.name || ''}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">{t('settings.email', 'Email')}</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profile.email || ''}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">{t('settings.phone', 'Телефон')}</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={profile.phone || ''}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="member-since">{t('settings.member_since', 'Клиент с')}</Label>
                  <Input
                    id="member-since"
                    value={profile.created_at ? new Date(profile.created_at).toLocaleDateString('ru-RU') : ''}
                    disabled
                  />
                </div>
              </div>

              <Button onClick={handleSaveProfile}>{t('settings.save_changes', 'Сохранить изменения')}</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Безопасность */}
        <TabsContent value="security" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('settings.password', 'Пароль')}</CardTitle>
              <CardDescription>{t('settings.change_password', 'Измените ваш пароль')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">{t('settings.current_password', 'Текущий пароль')}</Label>
                <Input
                  id="current-password"
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-password">{t('settings.new_password', 'Новый пароль')}</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">{t('settings.confirm_password', 'Подтвердите пароль')}</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                />
              </div>

              <Button onClick={handleChangePassword}>{t('settings.change_password', 'Изменить пароль')}</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('settings.2fa', 'Двухфакторная аутентификация (2FA)')}</CardTitle>
              <CardDescription>
                {t('settings.2fa_description', 'Дополнительный уровень защиты вашего аккаунта')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="font-semibold">{t('settings.sms_code', 'SMS-код')}</div>
                  <p className="text-sm text-muted-foreground">
                    {t('settings.sms_description', 'Получайте код подтверждения на телефон')}
                  </p>
                </div>
                <Button variant="outline" onClick={handleEnable2FA}>
                  <Smartphone className="w-4 h-4 mr-2" />
                  {t('settings.enable', 'Включить')}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('settings.export_data', 'Экспорт данных')}</CardTitle>
              <CardDescription>{t('settings.download_copy', 'Скачайте копию ваших данных')}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" onClick={handleExportData}>
                <Download className="w-4 h-4 mr-2" />
                {t('settings.export_data', 'Экспортировать данные')}
              </Button>
            </CardContent>
          </Card>

          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="text-red-600">{t('settings.danger_zone', 'Опасная зона')}</CardTitle>
              <CardDescription>{t('settings.irreversible', 'Необратимые действия')}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="destructive" onClick={handleDeleteAccount}>
                {t('settings.delete_account', 'Удалить аккаунт')}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Уведомления */}
        <TabsContent value="notifications" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('settings.notification_channels', 'Каналы уведомлений')}</CardTitle>
              <CardDescription>{t('settings.choose_channels', 'Выберите способы получения уведомлений')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="font-semibold">{t('settings.push_notifications', 'Push-уведомления')}</div>
                  <p className="text-sm text-muted-foreground">
                    {t('settings.push_description', 'Получайте уведомления в приложении')}
                  </p>
                </div>
                <Switch
                  checked={notifications.push}
                  onCheckedChange={(checked) => {
                    setNotifications({ ...notifications, push: checked });
                    handleSaveNotifications();
                  }}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="font-semibold">{t('settings.email', 'Email')}</div>
                  <p className="text-sm text-muted-foreground">
                    {t('settings.email_description', 'Отправлять уведомления на почту')}
                  </p>
                </div>
                <Switch
                  checked={notifications.email}
                  onCheckedChange={(checked) => {
                    setNotifications({ ...notifications, email: checked });
                    handleSaveNotifications();
                  }}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="font-semibold">{t('settings.sms', 'SMS')}</div>
                  <p className="text-sm text-muted-foreground">
                    {t('settings.sms_notifications', 'Получайте SMS-уведомления')}
                  </p>
                </div>
                <Switch
                  checked={notifications.sms}
                  onCheckedChange={(checked) => {
                    setNotifications({ ...notifications, sms: checked });
                    handleSaveNotifications();
                  }}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('settings.notification_types', 'Типы уведомлений')}</CardTitle>
              <CardDescription>{t('settings.what_to_receive', 'Что вы хотите получать')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="font-semibold">{t('settings.appointments', 'Записи')}</div>
                  <p className="text-sm text-muted-foreground">
                    {t('settings.appointment_reminders', 'Напоминания о предстоящих визитах')}
                  </p>
                </div>
                <Switch
                  checked={notifications.appointments}
                  onCheckedChange={(checked) => {
                    setNotifications({ ...notifications, appointments: checked });
                    handleSaveNotifications();
                  }}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="font-semibold">{t('settings.promotions', 'Акции и предложения')}</div>
                  <p className="text-sm text-muted-foreground">
                    {t('settings.special_offers', 'Специальные предложения и скидки')}
                  </p>
                </div>
                <Switch
                  checked={notifications.promotions}
                  onCheckedChange={(checked) => {
                    setNotifications({ ...notifications, promotions: checked });
                    handleSaveNotifications();
                  }}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="font-semibold">{t('settings.achievements', 'Достижения')}</div>
                  <p className="text-sm text-muted-foreground">
                    {t('settings.new_achievements', 'Новые награды и челленджи')}
                  </p>
                </div>
                <Switch
                  checked={notifications.achievements}
                  onCheckedChange={(checked) => {
                    setNotifications({ ...notifications, achievements: checked });
                    handleSaveNotifications();
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Приватность */}
        <TabsContent value="privacy" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('settings.privacy_settings', 'Настройки приватности')}</CardTitle>
              <CardDescription>{t('settings.control_data', 'Контролируйте ваши данные')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="font-semibold">{t('settings.photo_permission', 'Разрешение на фото')}</div>
                  <p className="text-sm text-muted-foreground">
                    {t('settings.allow_photos', 'Разрешить мастерам делать фото до/после')}
                  </p>
                </div>
                <Switch
                  checked={privacy.allowPhotos}
                  onCheckedChange={(checked) => {
                    setPrivacy({ ...privacy, allowPhotos: checked });
                    handleSavePrivacy();
                  }}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="font-semibold">{t('settings.master_access', 'Доступ мастеров')}</div>
                  <p className="text-sm text-muted-foreground">
                    {t('settings.share_history', 'Делиться историей визитов с мастерами')}
                  </p>
                </div>
                <Switch
                  checked={privacy.shareWithMasters}
                  onCheckedChange={(checked) => {
                    setPrivacy({ ...privacy, shareWithMasters: checked });
                    handleSavePrivacy();
                  }}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="font-semibold">{t('settings.public_profile', 'Публичный профиль')}</div>
                  <p className="text-sm text-muted-foreground">
                    {t('settings.show_achievements', 'Показывать ваши достижения другим клиентам')}
                  </p>
                </div>
                <Switch
                  checked={privacy.publicProfile}
                  onCheckedChange={(checked) => {
                    setPrivacy({ ...privacy, publicProfile: checked });
                    handleSavePrivacy();
                  }}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('settings.data_usage', 'Использование данных')}</CardTitle>
              <CardDescription>
                {t('settings.how_we_use', 'Как мы используем ваши данные для улучшения сервиса')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                • {t('settings.data_usage_1', 'Ваши данные используются только для персонализации услуг')}
              </p>
              <p>
                • {t('settings.data_usage_2', 'Мы не передаем информацию третьим лицам без вашего согласия')}
              </p>
              <p>
                • {t('settings.data_usage_3', 'Фотографии используются только в личной галерее и для анализа')}
              </p>
              <p>
                • {t('settings.data_usage_4', 'Вы можете запросить удаление всех данных в любое время')}
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
