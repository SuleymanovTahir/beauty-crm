import { useState } from 'react';
import { User, Lock, Bell, Eye, Download, Smartphone } from 'lucide-react';
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

export function Settings({ user }: any) {
  const { t } = useTranslation(['account/settings', 'common']);

  // Adapt user prop to profile structure or use defaults
  const [profile, setProfile] = useState({
    name: user?.full_name || 'Tahir',
    email: user?.email || 'tahir@example.com',
    phone: user?.phone || '+7 (999) 000-00-00',
    avatar: user?.avatar_url || '',
    memberSince: user?.created_at || new Date().toISOString(),
  });

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

  const handleSaveProfile = () => {
    toast.success(t('profile_updated'));
  };

  const handleChangePassword = () => {
    toast.info(t('password_coming_soon'));
  };

  const handleEnable2FA = () => {
    toast.info(t('2fa_coming_soon'));
  };

  const handleExportData = () => {
    toast.success(t('export_started'));
  };

  const handleDeleteAccount = () => {
    toast.error(t('delete_contact_support'));
  };

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
        <p className="text-muted-foreground">{t('subtitle')}</p>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile">
            <User className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">{t('tab_profile')}</span>
          </TabsTrigger>
          <TabsTrigger value="security">
            <Lock className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">{t('tab_security')}</span>
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">{t('tab_notifications')}</span>
          </TabsTrigger>
          <TabsTrigger value="privacy">
            <Eye className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">{t('tab_privacy')}</span>
          </TabsTrigger>
        </TabsList>

        {/* Профиль */}
        <TabsContent value="profile" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('personal_info_title')}</CardTitle>
              <CardDescription>{t('personal_info_desc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6">
                <Avatar className="w-24 h-24">
                  <AvatarImage src={profile.avatar} alt={profile.name} />
                  <AvatarFallback>{profile.name?.[0]}</AvatarFallback>
                </Avatar>
                <div className="space-y-2">
                  <Button variant="outline">{t('change_photo')}</Button>
                  <p className="text-sm text-muted-foreground">
                    {t('photo_requirements')}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">{t('field_name')}</Label>
                  <Input
                    id="name"
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">{t('field_email')}</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">{t('field_phone')}</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="member-since">{t('field_member_since')}</Label>
                  <Input
                    id="member-since"
                    value={new Date(profile.memberSince).toLocaleDateString('ru-RU')}
                    disabled
                  />
                </div>
              </div>

              <Button onClick={handleSaveProfile}>{t('save_changes')}</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Безопасность */}
        <TabsContent value="security" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('password_title')}</CardTitle>
              <CardDescription>{t('password_desc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">{t('current_password')}</Label>
                <Input id="current-password" type="password" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-password">{t('new_password')}</Label>
                <Input id="new-password" type="password" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">{t('confirm_password')}</Label>
                <Input id="confirm-password" type="password" />
              </div>

              <Button onClick={handleChangePassword}>{t('change_password')}</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('2fa_title')}</CardTitle>
              <CardDescription>
                {t('2fa_desc')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="font-semibold">{t('2fa_sms')}</div>
                  <p className="text-sm text-muted-foreground">
                    {t('2fa_sms_desc')}
                  </p>
                </div>
                <Button variant="outline" onClick={handleEnable2FA}>
                  <Smartphone className="w-4 h-4 mr-2" />
                  {t('2fa_enable')}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('export_data_title')}</CardTitle>
              <CardDescription>{t('export_data_desc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" onClick={handleExportData}>
                <Download className="w-4 h-4 mr-2" />
                {t('export_data_button')}
              </Button>
            </CardContent>
          </Card>

          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="text-red-600">{t('danger_zone')}</CardTitle>
              <CardDescription>{t('danger_zone_desc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="destructive" onClick={handleDeleteAccount}>
                {t('delete_account')}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Уведомления */}
        <TabsContent value="notifications" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('notification_channels_title')}</CardTitle>
              <CardDescription>{t('notification_channels_desc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="font-semibold">{t('channel_push')}</div>
                  <p className="text-sm text-muted-foreground">
                    {t('channel_push_desc')}
                  </p>
                </div>
                <Switch
                  checked={notifications.push}
                  onCheckedChange={(checked) =>
                    setNotifications({ ...notifications, push: checked })
                  }
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="font-semibold">{t('channel_email')}</div>
                  <p className="text-sm text-muted-foreground">
                    {t('channel_email_desc')}
                  </p>
                </div>
                <Switch
                  checked={notifications.email}
                  onCheckedChange={(checked) =>
                    setNotifications({ ...notifications, email: checked })
                  }
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="font-semibold">{t('channel_sms')}</div>
                  <p className="text-sm text-muted-foreground">
                    {t('channel_sms_desc')}
                  </p>
                </div>
                <Switch
                  checked={notifications.sms}
                  onCheckedChange={(checked) =>
                    setNotifications({ ...notifications, sms: checked })
                  }
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('notification_types_title')}</CardTitle>
              <CardDescription>{t('notification_types_desc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="font-semibold">{t('type_appointments')}</div>
                  <p className="text-sm text-muted-foreground">
                    {t('type_appointments_desc')}
                  </p>
                </div>
                <Switch
                  checked={notifications.appointments}
                  onCheckedChange={(checked) =>
                    setNotifications({ ...notifications, appointments: checked })
                  }
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="font-semibold">{t('type_promotions')}</div>
                  <p className="text-sm text-muted-foreground">
                    {t('type_promotions_desc')}
                  </p>
                </div>
                <Switch
                  checked={notifications.promotions}
                  onCheckedChange={(checked) =>
                    setNotifications({ ...notifications, promotions: checked })
                  }
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="font-semibold">{t('type_achievements')}</div>
                  <p className="text-sm text-muted-foreground">
                    {t('type_achievements_desc')}
                  </p>
                </div>
                <Switch
                  checked={notifications.achievements}
                  onCheckedChange={(checked) =>
                    setNotifications({ ...notifications, achievements: checked })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Приватность */}
        <TabsContent value="privacy" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('privacy_settings_title')}</CardTitle>
              <CardDescription>{t('privacy_settings_desc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="font-semibold">{t('privacy_photos')}</div>
                  <p className="text-sm text-muted-foreground">
                    {t('privacy_photos_desc')}
                  </p>
                </div>
                <Switch
                  checked={privacy.allowPhotos}
                  onCheckedChange={(checked) =>
                    setPrivacy({ ...privacy, allowPhotos: checked })
                  }
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="font-semibold">{t('privacy_masters')}</div>
                  <p className="text-sm text-muted-foreground">
                    {t('privacy_masters_desc')}
                  </p>
                </div>
                <Switch
                  checked={privacy.shareWithMasters}
                  onCheckedChange={(checked) =>
                    setPrivacy({ ...privacy, shareWithMasters: checked })
                  }
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="font-semibold">{t('privacy_public')}</div>
                  <p className="text-sm text-muted-foreground">
                    {t('privacy_public_desc')}
                  </p>
                </div>
                <Switch
                  checked={privacy.publicProfile}
                  onCheckedChange={(checked) =>
                    setPrivacy({ ...privacy, publicProfile: checked })
                  }
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('data_usage_title')}</CardTitle>
              <CardDescription>
                {t('data_usage_desc')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>{t('data_usage_1')}</p>
              <p>{t('data_usage_2')}</p>
              <p>{t('data_usage_3')}</p>
              <p>{t('data_usage_4')}</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
