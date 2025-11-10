import React, { useState, useEffect } from 'react';

import { Settings as SettingsIcon, Globe, Bell, Shield, Mail, Smartphone, Bot, Save, Building, Phone, Clock, Plus, Edit, Trash2, Loader, AlertCircle } from 'lucide-react';
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
    language: 'ru',
    working_hours: {
      weekdays: '',
      weekends: ''
    }
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // ✅ ДОБАВЬ СОСТОЯНИЕ:
  const [botGloballyEnabled, setBotGloballyEnabled] = useState(true);

  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    smsNotifications: false,
    bookingNotifications: true,
    birthdayReminders: true,
    birthdayDaysAdvance: 7,
  });

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
      <TabsList className="grid w-full grid-cols-3 lg:w-auto">
          <TabsTrigger key="general" value="general" className="flex items-center gap-2">
            <Globe className="w-4 h-4" />
            <span className="hidden sm:inline">{t('settings:general')}</span>
          </TabsTrigger>
          <TabsTrigger key="notifications" value="notifications" className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            <span className="hidden sm:inline">{t('settings:notifications')}</span>
          </TabsTrigger>
          <TabsTrigger key="security" value="security" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            <span className="hidden sm:inline">{t('settings:security')}</span>
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