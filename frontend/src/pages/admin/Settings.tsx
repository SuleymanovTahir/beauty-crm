import React, { useState, useEffect } from 'react';

import { Settings as SettingsIcon, Globe, Bell, Shield, Mail, Smartphone, Bot, Plus, Edit, Trash2, Loader, AlertCircle, User, Lock, Camera, Save, Send, MessageCircle, Instagram, Users, Eye, History } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { useTranslation } from 'react-i18next';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Switch } from '../../components/ui/switch';
import { api } from '../../services/api';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { toast } from 'sonner';

export default function AdminSettings() {
  const { t } = useTranslation(['admin/Settings', 'common']);
  const [generalSettings, setGeneralSettings] = useState({
    salonName: '',
    city: '',
    address: '',
    phone: '',
    email: '',
    instagram: '',
    language: '',  // ✅ Пусто - заполнится из БД
    working_hours: {
      weekdays: '',
      weekends: ''
    }
  });
  const [loading, setLoading] = useState(true);

  // ✅ ДОБАВЬ СОСТОЯНИЕ:
  const [botGloballyEnabled, setBotGloballyEnabled] = useState(false);

  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    smsNotifications: false,
    bookingNotifications: true,
    birthdayReminders: true,
    birthdayDaysAdvance: 7,
  });

  // Profile state
  const [profile, setProfile] = useState(null);
  const [profileForm, setProfileForm] = useState({
    username: '',
    full_name: '',
    email: '',
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Subscriptions state
  const [subscriptions, setSubscriptions] = useState<Record<string, {
    is_subscribed: boolean
    channels: {
      email: boolean
      telegram: boolean
      instagram: boolean
    }
  }>>({});
  const [availableSubscriptions, setAvailableSubscriptions] = useState<Record<string, { name: string; description: string }>>({});
  const [loadingSubscriptions, setLoadingSubscriptions] = useState(false);

  // Account deletion state
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);

  // Broadcasts state
  const [broadcastForm, setBroadcastForm] = useState({
    subscription_type: '',
    channels: [] as string[],
    subject: '',
    message: '',
    target_role: '',
  });
  const [broadcastPreview, setBroadcastPreview] = useState<any>(null);
  const [loadingBroadcastPreview, setLoadingBroadcastPreview] = useState(false);
  const [sendingBroadcast, setSendingBroadcast] = useState(false);
  const [broadcastHistory, setBroadcastHistory] = useState<any[]>([]);
  const [loadingBroadcastHistory, setLoadingBroadcastHistory] = useState(false);

  // Roles state
  const [roles, setRoles] = useState([]);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [showCreateRoleDialog, setShowCreateRoleDialog] = useState(false);
  const [showPermissionsDialog, setShowPermissionsDialog] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const [permissions, setPermissions] = useState({});
  const [availablePermissions, setAvailablePermissions] = useState({});
  const [savingRole, setSavingRole] = useState(false);


  const [createRoleForm, setCreateRoleForm] = useState({
    role_key: '',
    role_name: '',
    role_description: ''
  });

  useEffect(() => {
    loadRoles();
    loadSalonSettings();
    loadProfile();
    loadSubscriptions();
    loadBroadcastHistory();
  }, []);

  // ДОБАВИТЬ эту функцию:
  const loadSalonSettings = async () => {
    try {
      setLoading(true);
      const data = await api.getSalonSettings();
      setGeneralSettings({
        salonName: data.name || '',
        city: data.city || '',
        address: data.address || '',
        phone: data.phone || '',
        email: data.email || '',
        instagram: data.instagram || '',
        language: data.language || 'ru',
        working_hours: {
          weekdays: data.hours_weekdays || '',
          weekends: data.hours_weekends || ''
        }
      });
      setBotGloballyEnabled(data.bot_globally_enabled ?? true);
    } catch (err) {
      console.error(t('settings:error_loading_salon_settings'), err);
      toast.error(t('settings:error_loading_settings'));
    } finally {
      setLoading(false);
    }
  };

  const loadProfile = async () => {
    try {
      const response = await api.getMyProfile();
      if (response.success && response.profile) {
        setProfile(response.profile);
        setProfileForm({
          username: response.profile.username,
          full_name: response.profile.full_name,
          email: response.profile.email || '',
          current_password: '',
          new_password: '',
          confirm_password: '',
        });
      }
    } catch (err) {
      console.error('Error loading profile:', err);
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('file_too_large'));
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error(t('images_only'));
      return;
    }

    try {
      setUploadingPhoto(true);
      const uploadResponse = await api.uploadFile(file);
      if (uploadResponse.url) {
        const response = await api.updateMyProfile({ photo_url: uploadResponse.url });
        if (response.success) {
          setProfile(response.profile);
          toast.success(t('photo_updated'));
        }
      }
    } catch (err) {
      toast.error(err.message || t('error_photo_upload'));
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSaveProfile = async () => {
    if (profileForm.username.length < 3) {
      toast.error(t('error_username_too_short'));
      return;
    }

    if (profileForm.full_name.length < 2) {
      toast.error(t('error_name_too_short'));
      return;
    }

    if (profileForm.email && !profileForm.email.includes('@')) {
      toast.error(t('error_invalid_email'));
      return;
    }

    if (profileForm.new_password) {
      if (!profileForm.current_password) {
        toast.error(t('error_enter_current_password'));
        return;
      }

      if (profileForm.new_password.length < 6) {
        toast.error(t('error_password_too_short'));
        return;
      }

      if (profileForm.new_password !== profileForm.confirm_password) {
        toast.error(t('error_passwords_dont_match'));
        return;
      }
    }

    try {
      setSavingProfile(true);

      const updateData = {
        username: profileForm.username,
        full_name: profileForm.full_name,
        email: profileForm.email,
      };

      if (profileForm.new_password) {
        updateData.current_password = profileForm.current_password;
        updateData.new_password = profileForm.new_password;
      }

      const response = await api.updateMyProfile(updateData);

      if (response.success) {
        setProfile(response.profile);
        toast.success(t('profile_updated'));
        setProfileForm({
          ...profileForm,
          current_password: '',
          new_password: '',
          confirm_password: '',
        });

        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          const user = JSON.parse(storedUser);
          user.username = response.profile.username;
          user.full_name = response.profile.full_name;
          user.email = response.profile.email;
          localStorage.setItem('user', JSON.stringify(user));
        }
      } else {
        toast.error(response.error || t('error_update_profile'));
      }
    } catch (err) {
      toast.error(err.message || t('error_update_profile'));
    } finally {
      setSavingProfile(false);
    }
  };


  const loadRoles = async () => {
    try {
      setLoadingRoles(true);
      const data = await api.getRoles();
      setRoles(data.roles || []);
    } catch (err) {
      console.error(t('settings:error_loading_roles'), err);
    } finally {
      setLoadingRoles(false);
    }
  }

  const handleSaveGeneral = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      await api.updateSalonSettings({
        name: generalSettings.salonName,
        city: generalSettings.city,
        address: generalSettings.address,
        phone: generalSettings.phone,
        email: generalSettings.email,
        instagram: generalSettings.instagram,
        language: generalSettings.language,
        hours_weekdays: generalSettings.working_hours.weekdays,
        hours_weekends: generalSettings.working_hours.weekends
      });

      toast.success(t('settings:general_settings_saved'));
    } catch (err) {
      console.error(t('settings:error_saving_general_settings'), err);
      toast.error(t('settings:server_error'));
    }
  };

  const handleSaveNotifications = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/notifications/settings', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notificationSettings)
      });

      if (response.ok) {
        toast.success(t('settings:notifications_configured'));
      } else {
        toast.error(t('settings:error_saving_notifications'));
      }
    } catch (err) {
      console.error(t('settings:error_saving_notification_settings'), err);
      toast.error(t('settings:server_error'));
    }
  };

  // Roles handlers
  const handleCreateRole = async () => {
    if (!createRoleForm.role_key || !createRoleForm.role_name) {
      toast.error(t('settings:fill_required_fields'));
      return;
    }

    try {
      setSavingRole(true);
      await api.createRole(createRoleForm);
      toast.success(t('settings:role_created'));
      setShowCreateRoleDialog(false);
      setCreateRoleForm({ role_key: '', role_name: '', role_description: '' });
      await loadRoles();
    } catch (err) {
      let message = t('settings:error');
      if (err instanceof Error) {
        message += err.message;
      } else if (typeof err === 'string') {
        message += err;
      } else {
        message += t('settings:unknown_error');
      }
      toast.error(message);
    } finally {
      setSavingRole(false);
    }
  };

  const handleDeleteRole = async (roleKey: string, roleName: string) => {
    if (!confirm(t('settings:delete_role') + roleName)) return;

    try {
      await api.deleteRole(roleKey);
      toast.success(t('settings:role_deleted'));
      await loadRoles();
    } catch (err) {
      let errorMessage = t('settings:error');
      if (err instanceof Error) {
        errorMessage += err.message;
      } else if (typeof err === 'string') {
        errorMessage += err;
      } else {
        errorMessage += t('settings:unknown_error');
      }
      toast.error(errorMessage);
    }
  };

  const handleOpenPermissions = async (role: any) => {
    try {
      setSelectedRole(role);
      setShowPermissionsDialog(true);
      const data = await api.getRolePermissions(role.key);
      setPermissions(data.permissions || {});
      setAvailablePermissions(data.available_permissions || {});
    } catch (err) {
      toast.error(t('settings:error') + (err instanceof Error ? err.message : t('settings:unknown_error')));
    }
  };

  const handleTogglePermission = (permKey: string, action: string) => {
    setPermissions(prev => {
      const typedPrev = prev as Record<string, Record<string, boolean>>;
      return {
        ...prev,
        [permKey]: {
          ...(typedPrev[permKey] || {}),
          [action]: !(typedPrev[permKey]?.[action])
        }
      };
    });
  };

  const handleSavePermissions = async () => {
    try {
      setSavingRole(true);
      if (!selectedRole) {
        toast.error(t('settings:error') + t('settings:no_role_selected'));
        return;
      }
      if (!('key' in selectedRole)) {
        toast.error(t('settings:error') + t('settings:no_role_selected'));
        return;
      }
      await api.updateRolePermissions((selectedRole as { key: string }).key, permissions);
      toast.success(t('settings:permissions_updated'));
      setShowPermissionsDialog(false);
    } catch (err) {
      toast.error(t('settings:error') + (err instanceof Error ? err.message : t('settings:unknown_error')));
    } finally {
      setSavingRole(false);
    }
  };
  const handleUpdateBotEnabled = async (enabled: boolean) => {
    try {
      await api.updateBotGloballyEnabled(enabled);
      setBotGloballyEnabled(enabled);
      toast.success(enabled ? 'Бот включен глобально' : 'Бот отключен глобально');
    } catch (err) {
      toast.error('Ошибка обновления');
    }
  };

  // Subscriptions functions
  const loadSubscriptions = async () => {
    try {
      setLoadingSubscriptions(true);
      const response = await api.getUserSubscriptions();
      setSubscriptions(response.subscriptions);
      setAvailableSubscriptions(response.available_types);
    } catch (err) {
      console.error('Error loading subscriptions:', err);
    } finally {
      setLoadingSubscriptions(false);
    }
  };

  const handleToggleSubscription = async (type: string, isSubscribed: boolean) => {
    try {
      await api.updateSubscription(type, isSubscribed);
      setSubscriptions({
        ...subscriptions,
        [type]: {
          ...subscriptions[type],
          is_subscribed: isSubscribed
        }
      });
      toast.success(t('subscription_updated'));
    } catch (err) {
      toast.error(t('error_updating_subscription'));
    }
  };

  const handleToggleChannel = async (type: string, channel: 'email' | 'telegram' | 'instagram', enabled: boolean) => {
    try {
      await api.updateSubscription(type, subscriptions[type]?.is_subscribed || false, {
        [channel]: enabled
      });
      setSubscriptions({
        ...subscriptions,
        [type]: {
          ...subscriptions[type],
          channels: {
            ...subscriptions[type].channels,
            [channel]: enabled
          }
        }
      });
      toast.success(t('channel_updated'));
    } catch (err) {
      toast.error(t('error_updating_channel'));
    }
  };

  // Account deletion function
  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      toast.error(t('enter_password_to_delete'));
      return;
    }

    if (deleteConfirmText !== 'DELETE') {
      toast.error(t('type_delete_to_confirm'));
      return;
    }

    if (!window.confirm(t('are_you_absolutely_sure'))) {
      return;
    }

    try {
      setDeletingAccount(true);
      await api.deleteAccount(deletePassword, true);
      toast.success(t('account_deleted_successfully'));
      setTimeout(() => {
        localStorage.removeItem('user');
        localStorage.removeItem('session_token');
        window.location.href = '/';
      }, 1500);
    } catch (err: any) {
      toast.error(err.message || t('error_deleting_account'));
    } finally {
      setDeletingAccount(false);
    }
  };

  // Broadcasts functions
  const loadBroadcastHistory = async () => {
    try {
      setLoadingBroadcastHistory(true);
      const response = await api.getBroadcastHistory();
      setBroadcastHistory(response.history);
    } catch (err) {
      console.error('Error loading broadcast history:', err);
    } finally {
      setLoadingBroadcastHistory(false);
    }
  };

  const handleBroadcastChannelToggle = (channel: string) => {
    if (broadcastForm.channels.includes(channel)) {
      setBroadcastForm({ ...broadcastForm, channels: broadcastForm.channels.filter(c => c !== channel) });
    } else {
      setBroadcastForm({ ...broadcastForm, channels: [...broadcastForm.channels, channel] });
    }
  };

  const handleBroadcastPreview = async () => {
    if (!broadcastForm.subscription_type) {
      toast.error('Выберите тип подписки');
      return;
    }

    if (broadcastForm.channels.length === 0) {
      toast.error('Выберите хотя бы один канал');
      return;
    }

    try {
      setLoadingBroadcastPreview(true);
      const data = await api.previewBroadcast(broadcastForm);
      setBroadcastPreview(data);
      toast.success(`Найдено ${data.total_users} получателей`);
    } catch (err: any) {
      toast.error(err.message || 'Ошибка предпросмотра');
    } finally {
      setLoadingBroadcastPreview(false);
    }
  };

  const handleSendBroadcast = async () => {
    if (!broadcastForm.subscription_type || !broadcastForm.subject || !broadcastForm.message) {
      toast.error('Заполните все обязательные поля');
      return;
    }

    if (broadcastForm.channels.length === 0) {
      toast.error('Выберите хотя бы один канал');
      return;
    }

    if (!window.confirm('Вы уверены, что хотите отправить рассылку?')) {
      return;
    }

    try {
      setSendingBroadcast(true);
      const response = await api.sendBroadcast(broadcastForm);
      toast.success(response.message);

      // Reset form
      setBroadcastForm({
        subscription_type: '',
        channels: [],
        subject: '',
        message: '',
        target_role: '',
      });
      setBroadcastPreview(null);

      // Reload history
      await loadBroadcastHistory();
    } catch (err: any) {
      toast.error(err.message || 'Ошибка отправки');
    } finally {
      setSendingBroadcast(false);
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl text-gray-900 mb-2 flex items-center gap-3">
          <SettingsIcon className="w-8 h-8 text-pink-600" />
          Настройки системы
        </h1>
        <p className="text-gray-600">{t('settings:manage_crm_parameters')}</p>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-8 lg:w-auto">

          <TabsTrigger key="general" value="general" className="flex items-center gap-2">
            <Globe className="w-4 h-4" />
            <span className="hidden sm:inline">{t('settings:general')}</span>
          </TabsTrigger>
          <TabsTrigger key="profile" value="profile" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            <span className="hidden sm:inline">{t('profile')}</span>
          </TabsTrigger>
          <TabsTrigger key="notifications" value="notifications" className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            <span className="hidden sm:inline">{t('settings:notifications')}</span>
          </TabsTrigger>
          <TabsTrigger key="security" value="security" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            <span className="hidden sm:inline">{t('settings:security')}</span>
          </TabsTrigger>
          <TabsTrigger key="diagnostics" value="diagnostics" className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Диагностика</span>
          </TabsTrigger>
          <TabsTrigger key="subscriptions" value="subscriptions" className="flex items-center gap-2">
            <Mail className="w-4 h-4" />
            <span className="hidden sm:inline">{t('subscriptions')}</span>
          </TabsTrigger>
          <TabsTrigger key="broadcasts" value="broadcasts" className="flex items-center gap-2">
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Рассылки</span>
          </TabsTrigger>
          <TabsTrigger key="danger" value="danger" className="flex items-center gap-2">
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline">{t('danger_zone')}</span>
          </TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <h2 className="text-2xl text-gray-900 mb-6">{t('settings:general_settings')}</h2>
            <div className="mb-8 p-6 bg-gradient-to-r from-pink-50 to-purple-50 border-2 border-pink-200 rounded-xl">
              <div className="flex items-center gap-3 mb-4">
                <Bot className="w-6 h-6 text-pink-600" />
                <h3 className="text-lg font-bold text-gray-900">{t('settings:bot_management')}</h3>
              </div>

              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 mb-1">
                    {t('settings:bot_enabled_for_all_clients')}
                  </p>
                  <p className="text-xs text-gray-600">
                    {t('settings:disable_to_stop_auto_replies')}
                  </p>
                </div>
                <Switch
                  checked={botGloballyEnabled}
                  onCheckedChange={handleUpdateBotEnabled}
                />
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader className="w-8 h-8 text-pink-600 animate-spin" />
              </div>
            ) : (
              <form onSubmit={handleSaveGeneral} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="salonName">{t('settings:salon_name')} *</Label>
                    <Input
                      id="salonName"
                      value={generalSettings.salonName}
                      onChange={(e) => setGeneralSettings({ ...generalSettings, salonName: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="language">{t('settings:system_language')}</Label>
                    <Select
                      value={generalSettings.language}
                      onValueChange={(value: string) =>
                        setGeneralSettings({ ...generalSettings, language: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ru">{t('settings:russian')}</SelectItem>
                        <SelectItem value="en">{t('settings:english')}</SelectItem>
                        <SelectItem value="ar">{t('settings:arabic')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="city">{t('settings:city')}</Label>
                    <Input
                      id="city"
                      value={generalSettings.city}
                      onChange={(e) => setGeneralSettings({ ...generalSettings, city: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="phone">{t('settings:phone')}</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={generalSettings.phone}
                      onChange={(e) => setGeneralSettings({ ...generalSettings, phone: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="address">{t('settings:address')}</Label>
                  <Input
                    id="address"
                    value={generalSettings.address}
                    onChange={(e) => setGeneralSettings({ ...generalSettings, address: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="email">{t('settings:email')}</Label>
                    <Input
                      id="email"
                      type="email"
                      value={generalSettings.email}
                      onChange={(e) => setGeneralSettings({ ...generalSettings, email: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="instagram">{t('settings:instagram')}</Label>
                    <Input
                      id="instagram"
                      value={generalSettings.instagram}
                      onChange={(e) => setGeneralSettings({ ...generalSettings, instagram: e.target.value })}
                      placeholder="@username"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="weekdays">{t('settings:weekdays_hours')}</Label>
                    <Input
                      id="weekdays"
                      value={generalSettings.working_hours.weekdays}
                      onChange={(e) => setGeneralSettings({
                        ...generalSettings,
                        working_hours: { ...generalSettings.working_hours, weekdays: e.target.value }
                      })}
                      placeholder="9:00 - 21:00"
                    />
                  </div>

                  <div>
                    <Label htmlFor="weekends">{t('settings:weekends_hours')}</Label>
                    <Input
                      id="weekends"
                      value={generalSettings.working_hours.weekends}
                      onChange={(e) => setGeneralSettings({
                        ...generalSettings,
                        working_hours: { ...generalSettings.working_hours, weekends: e.target.value }
                      })}
                      placeholder="10:30 - 21:00"
                    />
                  </div>
                </div>

                <Button type="submit" className="bg-gradient-to-r from-pink-500 to-purple-600">
                  {t('settings:save_changes')}
                </Button>
              </form>
            )}
          </div>
        </TabsContent>

        {/* Profile Settings */}
        <TabsContent value="profile">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <h2 className="text-2xl text-gray-900 mb-6">{t('my_profile')}</h2>

            {!profile ? (
              <div className="flex justify-center py-8">
                <Loader className="w-8 h-8 animate-spin text-pink-500" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Фото профиля */}
                <div className="md:col-span-1">
                  <div className="flex flex-col items-center">
                    <div className="relative">
                      {profile.photo_url ? (
                        <img
                          src={profile.photo_url}
                          alt={profile.full_name}
                          className="w-32 h-32 rounded-full object-cover border-4 border-gray-100"
                        />
                      ) : (
                        <div className="w-32 h-32 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
                          <User className="w-16 h-16 text-white" />
                        </div>
                      )}

                      <label
                        htmlFor="photo-upload"
                        className="absolute bottom-0 right-0 bg-white rounded-full p-2 shadow-lg cursor-pointer hover:bg-gray-50 transition-colors"
                      >
                        {uploadingPhoto ? (
                          <Loader className="w-5 h-5 animate-spin text-pink-500" />
                        ) : (
                          <Camera className="w-5 h-5 text-gray-600" />
                        )}
                      </label>
                      <input
                        id="photo-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handlePhotoUpload}
                        disabled={uploadingPhoto}
                      />
                    </div>

                    <p className="text-sm text-gray-500 mt-4 text-center">
                      {t('click_camera_to_upload')}<br />{t('to_upload_photo')}<br />{t('max_size')}
                    </p>
                  </div>
                </div>

                {/* Форма редактирования */}
                <div className="md:col-span-2">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="username">{t('username')}</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <Input
                          id="username"
                          value={profileForm.username}
                          onChange={(e) =>
                            setProfileForm({ ...profileForm, username: e.target.value })
                          }
                          className="pl-10"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="full_name">{t('full_name')}</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <Input
                          id="full_name"
                          value={profileForm.full_name}
                          onChange={(e) =>
                            setProfileForm({ ...profileForm, full_name: e.target.value })
                          }
                          className="pl-10"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="email">{t('email')}</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <Input
                          id="email"
                          type="email"
                          value={profileForm.email}
                          onChange={(e) =>
                            setProfileForm({ ...profileForm, email: e.target.value })
                          }
                          className="pl-10"
                        />
                      </div>
                    </div>

                    <div className="pt-4 border-t border-gray-200">
                      <h3 className="font-medium text-gray-900 mb-4">
                        {t('change_password')}
                      </h3>

                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="current_password">{t('current_password')}</Label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <Input
                              id="current_password"
                              type="password"
                              value={profileForm.current_password}
                              onChange={(e) =>
                                setProfileForm({
                                  ...profileForm,
                                  current_password: e.target.value,
                                })
                              }
                              className="pl-10"
                            />
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="new_password">{t('new_password')}</Label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <Input
                              id="new_password"
                              type="password"
                              value={profileForm.new_password}
                              onChange={(e) =>
                                setProfileForm({
                                  ...profileForm,
                                  new_password: e.target.value,
                                })
                              }
                              className="pl-10"
                              placeholder={t('new_password_placeholder')}
                            />
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="confirm_password">
                            {t('confirm_new_password')}
                          </Label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <Input
                              id="confirm_password"
                              type="password"
                              value={profileForm.confirm_password}
                              onChange={(e) =>
                                setProfileForm({
                                  ...profileForm,
                                  confirm_password: e.target.value,
                                })
                              }
                              className="pl-10"
                              placeholder={t('repeat_new_password')}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end pt-4">
                      <Button
                        onClick={handleSaveProfile}
                        disabled={savingProfile}
                        className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
                      >
                        {savingProfile ? (
                          <>
                            <Loader className="w-4 h-4 animate-spin mr-2" />
                            Сохранение...
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4 mr-2" />
                            {t('save_changes')}
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <h2 className="text-2xl text-gray-900 mb-6">{t('settings:notification_settings')}</h2>

            <form onSubmit={handleSaveNotifications} className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg text-gray-900 mb-4">{t('settings:notification_channels')}</h3>

                <div key="email-notifications" className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
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
                </div>

                <div key="sms-notifications" className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
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
                <h3 className="text-lg text-gray-900 mb-4">{t('settings:notification_types')}</h3>

                <div key="booking-notif" className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-900">{t('settings:booking_notifications')}</p>
                    <p className="text-xs text-gray-600">{t('settings:new_bookings_changes_cancellations')}</p>
                  </div>
                  <Switch
                    checked={notificationSettings.bookingNotifications}
                    onCheckedChange={(checked: boolean) =>
                      setNotificationSettings({ ...notificationSettings, bookingNotifications: checked })
                    }
                  />
                </div>

                <div key="birthday-notif" className="p-4 bg-gray-50 rounded-lg space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-900">{t('settings:birthday_reminders')}</p>
                      <p className="text-xs text-gray-600">{t('settings:notifications_about_birthdays')}</p>
                    </div>
                    <Switch
                      checked={!!notificationSettings.birthdayReminders}
                      onCheckedChange={(checked: boolean) =>
                        setNotificationSettings({ ...notificationSettings, birthdayReminders: checked })
                      }
                    />
                  </div>

                  {notificationSettings.birthdayReminders && (
                    <div>
                      <Label htmlFor="birthdayDays">{t('settings:notify_days')}</Label>
                      <Select
                        value={notificationSettings.birthdayDaysAdvance.toString()}
                        onValueChange={(value: string) =>
                          setNotificationSettings({ ...notificationSettings, birthdayDaysAdvance: parseInt(value, 10) })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="3">{t('settings:3_days')}</SelectItem>
                          <SelectItem value="7">{t('settings:7_days')}</SelectItem>
                          <SelectItem value="14">{t('settings:14_days')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </div>

              <Button type="submit" className="bg-gradient-to-r from-pink-500 to-purple-600">
                {t('settings:save_notification_settings')}
              </Button>
            </form>
          </div>
        </TabsContent>

        {/* Roles Tab */}
        <TabsContent value="roles">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl text-gray-900 mb-2">{t('settings:manage_roles')}</h2>
                <p className="text-gray-600">{t('settings:create_roles_and_assign_permissions')}</p>
              </div>
              <Button onClick={() => setShowCreateRoleDialog(true)} className="bg-pink-600 hover:bg-pink-700">
                <Plus className="w-4 h-4 mr-2" />
                {t('settings:create_role')}
              </Button>
            </div>

            {/* Info Alert */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-blue-800 font-medium text-sm mb-2">{t('settings:about_roles_system')}:</p>
                  <ul className="text-blue-700 text-sm space-y-1 list-disc list-inside">
                    <li>{t('settings:create_custom_roles_for_your_business')}</li>
                    <li>{t('settings:assign_detailed_permissions')}: просмотр, создание, редактирование, удаление</li>
                    <li>{t('settings:builtin_roles_cannot_be_deleted')}</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Roles Grid */}
            {loadingRoles ? (
              <div className="flex items-center justify-center py-12">
                <Loader className="w-8 h-8 text-pink-600 animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {roles.map((role: any) => (
                  <div key={role.key} className="relative bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
                    {!role.is_custom && (
                      <div className="absolute top-4 right-4 px-3 py-1 bg-yellow-100 border border-yellow-200 rounded-full text-xs font-semibold text-yellow-800">
                        {t('settings:builtin')}
                      </div>
                    )}

                    <div className="mb-4">
                      <div className="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center mb-4">
                        <Shield className="w-6 h-6 text-pink-600" />
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 mb-2">{role.name}</h3>
                      <p className="text-sm text-gray-600 line-clamp-2">{role.description}</p>
                    </div>

                    <div className="flex gap-2 pt-4 border-t border-gray-200">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenPermissions(role)}
                        className="flex-1"
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        {t('settings:permissions')}
                      </Button>
                      {role.is_custom && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteRole(role.key, role.name)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Security */}
        <TabsContent value="security">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <h2 className="text-2xl text-gray-900 mb-6">{t('settings:security_and_access')}</h2>

            <div className="space-y-6">
              <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <Shield className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-sm text-gray-900 mb-2 font-semibold">{t('settings:security_recommendations')}</h3>
                    <ul className="text-sm text-gray-700 space-y-2">
                      <li>• {t('settings:use_strong_passwords')}</li>
                      <li>• {t('settings:regularly_change_passwords')}</li>
                      <li>• {t('settings:do_not_share_credentials')}</li>
                      <li>• {t('settings:check_active_sessions')}</li>
                      <li>• {t('settings:regularly_backup_data')}</li>
                    </ul>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-lg text-gray-900 mb-4">{t('settings:backup')}</h3>
                <p className="text-sm text-gray-600 mb-4">
                  {t('settings:download_backup_for_security')}
                </p>
                <Button variant="outline">
                  📥 {t('settings:download_backup')}
                </Button>
              </div>
            </div>

          </div>
        </TabsContent>
        {/* Diagnostics */}
        <TabsContent value="diagnostics">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <h2 className="text-2xl text-gray-900 mb-6 flex items-center gap-3">
              🔍 Диагностика системы
            </h2>

            <div className="space-y-6">
              <div className="p-6 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-blue-800 font-medium mb-2">Что проверяется:</p>
                <ul className="text-blue-700 text-sm space-y-1 list-disc list-inside">
                  <li>База данных (таблицы, записи)</li>
                  <li>Настройки бота (промпты, языки)</li>
                  <li>Мастера и услуги</li>
                  <li>Связи между таблицами</li>
                </ul>
              </div>

              <Button 
                size="lg"
                className="bg-gradient-to-r from-pink-500 to-purple-600"
                onClick={async () => {
                  const loadingToast = toast.loading('Запуск диагностики...');
                  
                  try {
                    const response = await fetch('/api/diagnostics/full', {
                      credentials: 'include'
                    });
                    const data = await response.json();
                    
                    console.log('🔍 РЕЗУЛЬТАТЫ ДИАГНОСТИКИ:', data);
                    
                    toast.dismiss(loadingToast);
                    
                    const issues = data.issues || [];
                    if (issues.length === 0) {
                      toast.success('✅ Диагностика успешна! Все работает отлично.');
                    } else {
                      toast.warning(
                        `⚠️ Найдено проблем: ${issues.length}. 
                        Откройте консоль браузера (F12) для деталей.`
                      );
                    }
                    
                    // Дополнительно выводим проблемы
                    if (issues.length > 0) {
                      console.error('❌ ПРОБЛЕМЫ:', issues);
                    }
                  } catch (error) {
                    toast.dismiss(loadingToast);
                    console.error('Ошибка диагностики:', error);
                    toast.error('Ошибка запуска диагностики');
                  }
                }}
              >
                🔍 Запустить полную диагностику
              </Button>

              <div className="text-sm text-gray-600">
                💡 Результаты появятся в консоли браузера (нажмите F12)
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Subscriptions */}
        <TabsContent value="subscriptions">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <div className="mb-6">
              <h2 className="text-2xl text-gray-900 mb-2 flex items-center gap-3">
                <Mail className="w-6 h-6 text-pink-600" />
                {t('email_subscriptions')}
              </h2>
              <p className="text-gray-600">{t('manage_email_subscriptions')}</p>
            </div>

            {loadingSubscriptions ? (
              <div className="flex items-center justify-center py-12">
                <Loader className="w-8 h-8 text-pink-600 animate-spin" />
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(availableSubscriptions).map(([type, info]) => {
                  const sub = subscriptions[type] || { is_subscribed: false, channels: { email: true, telegram: true, instagram: true } };

                  return (
                    <div key={type} className="border border-gray-200 rounded-lg overflow-hidden">
                      {/* Main Subscription Toggle */}
                      <div className="flex items-start justify-between p-4 bg-gray-50">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">{info.name}</h3>
                          <p className="text-sm text-gray-600 mt-1">{info.description}</p>
                        </div>
                        <Switch
                          checked={sub.is_subscribed}
                          onCheckedChange={(checked) => handleToggleSubscription(type, checked)}
                        />
                      </div>

                      {/* Channel Toggles - Only shown if subscribed */}
                      {sub.is_subscribed && (
                        <div className="p-4 space-y-3 bg-white border-t border-gray-200">
                          <p className="text-xs font-medium text-gray-500 uppercase">Каналы уведомлений</p>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Mail className="w-4 h-4 text-blue-600" />
                              <span className="text-sm text-gray-700">Email</span>
                            </div>
                            <Switch
                              checked={sub.channels.email}
                              onCheckedChange={(checked) => handleToggleChannel(type, 'email', checked)}
                            />
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Smartphone className="w-4 h-4 text-green-600" />
                              <span className="text-sm text-gray-700">Telegram</span>
                            </div>
                            <Switch
                              checked={sub.channels.telegram}
                              onCheckedChange={(checked) => handleToggleChannel(type, 'telegram', checked)}
                            />
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Camera className="w-4 h-4 text-purple-600" />
                              <span className="text-sm text-gray-700">Instagram</span>
                            </div>
                            <Switch
                              checked={sub.channels.instagram}
                              onCheckedChange={(checked) => handleToggleChannel(type, 'instagram', checked)}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {Object.keys(availableSubscriptions).length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    {t('no_subscriptions_available')}
                  </div>
                )}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Broadcasts */}
        <TabsContent value="broadcasts">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <h2 className="text-2xl text-gray-900 mb-6 flex items-center gap-3">
              <Send className="w-6 h-6 text-pink-600" />
              Массовые рассылки
            </h2>
            <p className="text-gray-600 mb-6">Отправка уведомлений пользователям по разным каналам</p>

            <Tabs defaultValue="compose" className="space-y-6">
              <TabsList>
                <TabsTrigger value="compose" className="flex items-center gap-2">
                  <Send className="w-4 h-4" />
                  Создать рассылку
                </TabsTrigger>
                <TabsTrigger value="history" className="flex items-center gap-2">
                  <History className="w-4 h-4" />
                  История
                </TabsTrigger>
              </TabsList>

              {/* Compose Tab */}
              <TabsContent value="compose">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Form */}
                  <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-6">Параметры рассылки</h2>

                    <div className="space-y-6">
                      {/* Subscription Type */}
                      <div>
                        <Label htmlFor="subscription_type">Тип подписки *</Label>
                        <Select
                          value={broadcastForm.subscription_type}
                          onValueChange={(value) => setBroadcastForm({ ...broadcastForm, subscription_type: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Выберите тип" />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(availableSubscriptions).map(([key, info]) => (
                              <SelectItem key={key} value={key}>
                                {info.name} - {info.description}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Channels */}
                      <div>
                        <Label>Каналы отправки *</Label>
                        <div className="flex gap-4 mt-2">
                          <button
                            type="button"
                            onClick={() => handleBroadcastChannelToggle('email')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all ${
                              broadcastForm.channels.includes('email')
                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                            }`}
                          >
                            <Mail className="w-5 h-5" />
                            Email
                          </button>

                          <button
                            type="button"
                            onClick={() => handleBroadcastChannelToggle('telegram')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all ${
                              broadcastForm.channels.includes('telegram')
                                ? 'border-green-500 bg-green-50 text-green-700'
                                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                            }`}
                          >
                            <MessageCircle className="w-5 h-5" />
                            Telegram
                          </button>

                          <button
                            type="button"
                            onClick={() => handleBroadcastChannelToggle('instagram')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all ${
                              broadcastForm.channels.includes('instagram')
                                ? 'border-purple-500 bg-purple-50 text-purple-700'
                                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                            }`}
                          >
                            <Instagram className="w-5 h-5" />
                            Instagram
                          </button>
                        </div>
                      </div>

                      {/* Target Role (optional) */}
                      <div>
                        <Label htmlFor="target_role">Целевая роль (опционально)</Label>
                        <Select
                          value={broadcastForm.target_role}
                          onValueChange={(value) => setBroadcastForm({ ...broadcastForm, target_role: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Все пользователи" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Все пользователи</SelectItem>
                            <SelectItem value="admin">Администраторы</SelectItem>
                            <SelectItem value="manager">Менеджеры</SelectItem>
                            <SelectItem value="employee">Сотрудники</SelectItem>
                            <SelectItem value="client">Клиенты</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Subject */}
                      <div>
                        <Label htmlFor="subject">Тема (для Email) *</Label>
                        <Input
                          id="subject"
                          value={broadcastForm.subject}
                          onChange={(e) => setBroadcastForm({ ...broadcastForm, subject: e.target.value })}
                          placeholder="Специальное предложение для вас!"
                        />
                      </div>

                      {/* Message */}
                      <div>
                        <Label htmlFor="message">Сообщение *</Label>
                        <Textarea
                          id="message"
                          value={broadcastForm.message}
                          onChange={(e) => setBroadcastForm({ ...broadcastForm, message: e.target.value })}
                          rows={8}
                          placeholder="Введите текст вашего сообщения..."
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          {broadcastForm.message.length} символов
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-3">
                        <Button
                          onClick={handleBroadcastPreview}
                          disabled={loadingBroadcastPreview}
                          variant="outline"
                          className="flex-1"
                        >
                          {loadingBroadcastPreview ? (
                            <>
                              <Loader className="w-4 h-4 mr-2 animate-spin" />
                              Загрузка...
                            </>
                          ) : (
                            <>
                              <Eye className="w-4 h-4 mr-2" />
                              Предпросмотр
                            </>
                          )}
                        </Button>

                        <Button
                          onClick={handleSendBroadcast}
                          disabled={sendingBroadcast || !broadcastPreview}
                          className="flex-1 bg-gradient-to-r from-pink-500 to-purple-600"
                        >
                          {sendingBroadcast ? (
                            <>
                              <Loader className="w-4 h-4 mr-2 animate-spin" />
                              Отправка...
                            </>
                          ) : (
                            <>
                              <Send className="w-4 h-4 mr-2" />
                              Отправить
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Preview Panel */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <Users className="w-5 h-5 text-pink-600" />
                      Получатели
                    </h2>

                    {!broadcastPreview ? (
                      <div className="text-center py-12">
                        <Eye className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500 text-sm">
                          Нажмите "Предпросмотр" чтобы увидеть получателей
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Total */}
                        <div className="bg-gradient-to-r from-pink-50 to-purple-50 border border-pink-200 rounded-lg p-4">
                          <p className="text-sm text-gray-600 mb-1">Всего получателей</p>
                          <p className="text-3xl font-bold text-pink-600">{broadcastPreview.total_users}</p>
                        </div>

                        {/* By Channel */}
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-gray-700">По каналам:</p>

                          {broadcastPreview.by_channel.email > 0 && (
                            <div className="flex items-center justify-between p-2 bg-blue-50 rounded">
                              <div className="flex items-center gap-2">
                                <Mail className="w-4 h-4 text-blue-600" />
                                <span className="text-sm text-gray-700">Email</span>
                              </div>
                              <span className="font-bold text-blue-600">{broadcastPreview.by_channel.email}</span>
                            </div>
                          )}

                          {broadcastPreview.by_channel.telegram > 0 && (
                            <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                              <div className="flex items-center gap-2">
                                <MessageCircle className="w-4 h-4 text-green-600" />
                                <span className="text-sm text-gray-700">Telegram</span>
                              </div>
                              <span className="font-bold text-green-600">{broadcastPreview.by_channel.telegram}</span>
                            </div>
                          )}

                          {broadcastPreview.by_channel.instagram > 0 && (
                            <div className="flex items-center justify-between p-2 bg-purple-50 rounded">
                              <div className="flex items-center gap-2">
                                <Instagram className="w-4 h-4 text-purple-600" />
                                <span className="text-sm text-gray-700">Instagram</span>
                              </div>
                              <span className="font-bold text-purple-600">{broadcastPreview.by_channel.instagram}</span>
                            </div>
                          )}
                        </div>

                        {/* Sample Users */}
                        {broadcastPreview.users_sample.length > 0 && (
                          <div className="mt-4">
                            <p className="text-sm font-medium text-gray-700 mb-2">Примеры получателей:</p>
                            <div className="space-y-2">
                              {broadcastPreview.users_sample.map((user: any, idx: number) => (
                                <div key={idx} className="text-xs p-2 bg-gray-50 rounded">
                                  <p className="font-medium text-gray-900">{user.full_name}</p>
                                  <p className="text-gray-600">{user.channel}: {user.contact}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Warning */}
                        {broadcastPreview.total_users === 0 && (
                          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                            <div className="flex items-start gap-2">
                              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                              <p className="text-sm text-yellow-800">
                                Нет подписанных пользователей для выбранных параметров
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              {/* History Tab */}
              <TabsContent value="history">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-6">История рассылок</h2>

                  {loadingBroadcastHistory ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader className="w-8 h-8 text-pink-600 animate-spin" />
                    </div>
                  ) : broadcastHistory.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <History className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p>Рассылок еще не было</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {broadcastHistory.map((item) => (
                        <div key={item.id} className="border border-gray-200 rounded-lg p-4 hover:border-pink-300 transition-colors">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h3 className="font-medium text-gray-900">{item.subject}</h3>
                              <p className="text-sm text-gray-600">
                                {availableSubscriptions[item.subscription_type]?.name || item.subscription_type}
                              </p>
                            </div>
                            <span className="text-xs text-gray-500">
                              {new Date(item.created_at).toLocaleString('ru-RU')}
                            </span>
                          </div>

                          <div className="flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4 text-gray-400" />
                              <span className="text-gray-600">Отправлено: {item.total_sent}</span>
                            </div>

                            <div className="flex gap-2">
                              {item.channels.map((channel: string) => (
                                <span
                                  key={channel}
                                  className="px-2 py-1 rounded text-xs bg-gray-100 text-gray-700"
                                >
                                  {channel}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </TabsContent>

        {/* Danger Zone */}
        <TabsContent value="danger">
          <div className="bg-white rounded-xl shadow-sm border border-red-200 p-8">
            <div className="mb-6">
              <h2 className="text-2xl text-gray-900 mb-2 flex items-center gap-3">
                <Trash2 className="w-6 h-6 text-red-600" />
                {t('danger_zone')}
              </h2>
              <p className="text-gray-600">{t('irreversible_actions')}</p>
            </div>

            <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6">
              <h3 className="text-lg font-bold text-red-900 mb-2">{t('delete_account')}</h3>
              <p className="text-sm text-red-700 mb-6">
                {t('delete_account_warning')}
              </p>

              <div className="space-y-4 max-w-md">
                <div>
                  <Label htmlFor="deletePassword">{t('your_password')} *</Label>
                  <Input
                    id="deletePassword"
                    type="password"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    placeholder={t('enter_password')}
                  />
                </div>

                <div>
                  <Label htmlFor="deleteConfirm">
                    {t('type_delete_to_confirm_label')}
                  </Label>
                  <Input
                    id="deleteConfirm"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder="DELETE"
                  />
                </div>

                <Button
                  onClick={handleDeleteAccount}
                  disabled={deletingAccount || !deletePassword || deleteConfirmText !== 'DELETE'}
                  className="w-full bg-red-600 hover:bg-red-700 text-white"
                >
                  {deletingAccount ? (
                    <>
                      <Loader className="w-4 h-4 mr-2 animate-spin" />
                      {t('deleting')}...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-2" />
                      {t('delete_my_account')}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Create Role Dialog */}
      {showCreateRoleDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full shadow-2xl">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">{t('settings:create_role')}</h3>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <Label htmlFor="roleKey">{t('settings:role_key')} *</Label>
                <Input
                  id="roleKey"
                  placeholder="senior_master"
                  value={createRoleForm.role_key}
                  onChange={(e) => setCreateRoleForm({ ...createRoleForm, role_key: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                />
              </div>

              <div>
                <Label htmlFor="roleName">{t('settings:role_name')} *</Label>
                <Input
                  id="roleName"
                  placeholder={t('settings:senior_master')}
                  value={createRoleForm.role_name}
                  onChange={(e) => setCreateRoleForm({ ...createRoleForm, role_name: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="roleDesc">{t('settings:role_description')}</Label>
                <Textarea
                  id="roleDesc"
                  placeholder={t('settings:role_description_placeholder')}
                  value={createRoleForm.role_description}
                  onChange={(e) => setCreateRoleForm({ ...createRoleForm, role_description: e.target.value })}
                  rows={3}
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex gap-3">
              <Button variant="outline" onClick={() => setShowCreateRoleDialog(false)} className="flex-1">
                {t('settings:cancel')}
              </Button>
              <Button onClick={handleCreateRole} disabled={savingRole} className="flex-1 bg-pink-600 hover:bg-pink-700">
                {savingRole ? t('settings:creating') + '...' : t('settings:create')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Permissions Dialog */}
      {showPermissionsDialog && selectedRole && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-auto">
          <div className="bg-white rounded-xl max-w-4xl w-full shadow-2xl max-h-[90vh] overflow-auto">
            <div className="p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
              <h3 className="text-xl font-bold text-gray-900">
                {t('settings:role_permissions')}:&nbsp;
                {selectedRole &&
                  (
                    // Try both fields but fallback to displaying the whole object as JSON if neither present
                    (selectedRole as any).role_name ||
                    (selectedRole as any).name ||
                    JSON.stringify(selectedRole)
                  )
                }
              </h3>
              <p className="text-sm text-gray-600 mt-1">{t('settings:configure_detailed_access_permissions')}</p>
            </div>

            <div className="p-6">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="p-3 text-left text-sm font-semibold text-gray-600 border-b">{t('settings:resource')}</th>
                      <th className="p-3 text-center text-sm font-semibold text-gray-600 border-b">{t('settings:view')}</th>
                      <th className="p-3 text-center text-sm font-semibold text-gray-600 border-b">{t('settings:create')}</th>
                      <th className="p-3 text-center text-sm font-semibold text-gray-600 border-b">{t('settings:edit')}</th>
                      <th className="p-3 text-center text-sm font-semibold text-gray-600 border-b">{t('settings:delete')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(availablePermissions).map(([key, name]) => (
                      <tr key={key} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="p-3 text-sm font-medium text-gray-900">{name as string}</td>
                        {['can_view', 'can_create', 'can_edit', 'can_delete'].map(action => (
                          <td key={`${key}-${action}`} className="p-3 text-center">
                            <input
                              type="checkbox"
                              checked={
                                Boolean(
                                  permissions &&
                                  typeof permissions === 'object' &&
                                  (permissions as Record<string, any>)[key] &&
                                  typeof (permissions as Record<string, any>)[key] === 'object' &&
                                  ((permissions as Record<string, any>)[key] as Record<string, any>)[action]
                                )
                              }
                              onChange={() => handleTogglePermission(key, action)}
                              className="w-5 h-5 cursor-pointer accent-pink-600"
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>   {/* ✅ ИСПРАВЛЕНО */}
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex gap-3 sticky bottom-0 bg-white">
              <Button variant="outline" onClick={() => setShowPermissionsDialog(false)} className="flex-1">
                {t('settings:cancel')}
              </Button>
              <Button onClick={handleSavePermissions} disabled={savingRole} className="flex-1 bg-pink-600 hover:bg-pink-700">
                {savingRole ? t('settings:saving') + '...' : t('settings:save_permissions')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}