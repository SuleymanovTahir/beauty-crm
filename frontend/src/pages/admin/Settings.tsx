import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Globe, Bell, Bot, Shield, Mail, Smartphone, Plus, Edit, Trash2, Check, Loader, AlertCircle } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Switch } from '../../components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { toast } from 'sonner';
import { api } from '../../services/api';

export default function AdminSettings() {
  const [generalSettings, setGeneralSettings] = useState({
    salonName: 'M.Le Diamant Beauty Lounge',
    city: 'Dubai',
    address: 'Shop 13, Amwaj 3 Plaza Level, Jumeirah Beach Residence, Dubai',
    phone: '+971 50 123 4567',
    email: 'info@luxurybeauty.ae',
    instagram: '@luxurybeauty_dubai',
    language: 'ru'
  });

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
  }, []);

  const loadRoles = async () => {
    try {
      setLoadingRoles(true);
      const data = await api.getRoles();
      setRoles(data.roles || []);
    } catch (err) {
      console.error('Error loading roles:', err);
    } finally {
      setLoadingRoles(false);
    }
  };

  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/settings/general', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(generalSettings)
      });

      if (response.ok) {
        toast.success('Основные настройки сохранены ✅');
      } else {
        toast.error('Ошибка при сохранении');
      }
    } catch (err) {
      console.error('Error saving general settings:', err);
      toast.error('Ошибка сервера');
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
        toast.success('Уведомления настроены');
      } else {
        toast.error('Ошибка при сохранении');
      }
    } catch (err) {
      console.error('Error saving notification settings:', err);
      toast.error('Ошибка сервера');
    }
  };

  // Roles handlers
  const handleCreateRole = async () => {
    if (!createRoleForm.role_key || !createRoleForm.role_name) {
      toast.error('Заполните обязательные поля');
      return;
    }

    try {
      setSavingRole(true);
      await api.createRole(createRoleForm);
      toast.success('✅ Роль создана');
      setShowCreateRoleDialog(false);
      setCreateRoleForm({ role_key: '', role_name: '', role_description: '' });
      await loadRoles();
    } catch (err) {
      toast.error(`❌ Ошибка: ${err.message}`);
    } finally {
      setSavingRole(false);
    }
  };

  const handleDeleteRole = async (roleKey: string, roleName: string) => {
    if (!confirm(`Удалить роль "${roleName}"?`)) return;

    try {
      await api.deleteRole(roleKey);
      toast.success('✅ Роль удалена');
      await loadRoles();
    } catch (err) {
      toast.error(`❌ Ошибка: ${err.message}`);
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
      toast.error(`❌ Ошибка: ${err.message}`);
    }
  };

  const handleTogglePermission = (permKey: string, action: string) => {
    setPermissions(prev => ({
      ...prev,
      [permKey]: {
        ...(prev[permKey] || {}),
        [action]: !prev[permKey]?.[action]
      }
    }));
  };

  const handleSavePermissions = async () => {
    try {
      setSavingRole(true);
      await api.updateRolePermissions(selectedRole.key, permissions);
      toast.success('✅ Права обновлены');
      setShowPermissionsDialog(false);
    } catch (err) {
      toast.error(`❌ Ошибка: ${err.message}`);
    } finally {
      setSavingRole(false);
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl text-gray-900 mb-2 flex items-center gap-3">
          <SettingsIcon className="w-8 h-8 text-pink-600" />
          Настройки системы
        </h1>
        <p className="text-gray-600">Управление параметрами CRM</p>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Globe className="w-4 h-4" />
            <span className="hidden sm:inline">Общие</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            <span className="hidden sm:inline">Уведомления</span>
          </TabsTrigger>
          <TabsTrigger value="roles" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            <span className="hidden sm:inline">Роли</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            <span className="hidden sm:inline">Безопасность</span>
          </TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <h2 className="text-2xl text-gray-900 mb-6">Основные настройки</h2>
            
            <form onSubmit={handleSaveGeneral} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="salonName">Название салона *</Label>
                  <Input
                    id="salonName"
                    value={generalSettings.salonName}
                    onChange={(e) => setGeneralSettings({ ...generalSettings, salonName: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="language">Язык системы</Label>
                  <Select value={generalSettings.language} onValueChange={(value) => setGeneralSettings({ ...generalSettings, language: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ru">🇷🇺 Русский</SelectItem>
                      <SelectItem value="en">🇬🇧 English</SelectItem>
                      <SelectItem value="ar">🇦🇪 العربية</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="city">Город</Label>
                  <Input
                    id="city"
                    value={generalSettings.city}
                    onChange={(e) => setGeneralSettings({ ...generalSettings, city: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="phone">Телефон</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={generalSettings.phone}
                    onChange={(e) => setGeneralSettings({ ...generalSettings, phone: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="address">Адрес</Label>
                <Input
                  id="address"
                  value={generalSettings.address}
                  onChange={(e) => setGeneralSettings({ ...generalSettings, address: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={generalSettings.email}
                    onChange={(e) => setGeneralSettings({ ...generalSettings, email: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="instagram">Instagram</Label>
                  <Input
                    id="instagram"
                    value={generalSettings.instagram}
                    onChange={(e) => setGeneralSettings({ ...generalSettings, instagram: e.target.value })}
                    placeholder="@username"
                  />
                </div>
              </div>

              <Button type="submit" className="bg-gradient-to-r from-pink-500 to-purple-600">
                Сохранить изменения
              </Button>
            </form>
          </div>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <h2 className="text-2xl text-gray-900 mb-6">Настройки уведомлений</h2>
            
            <form onSubmit={handleSaveNotifications} className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg text-gray-900 mb-4">Каналы уведомлений</h3>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Mail className="w-6 h-6 text-blue-600" />
                    <div>
                      <p className="text-sm text-gray-900">Email уведомления</p>
                      <p className="text-xs text-gray-600">Получать уведомления на почту</p>
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
                      <p className="text-xs text-gray-600">Получать SMS на телефон</p>
                    </div>
                  </div>
                  <Switch
                    checked={notificationSettings.smsNotifications}
                    onCheckedChange={(checked) => setNotificationSettings({ ...notificationSettings, smsNotifications: checked })}
                  />
                </div>
              </div>

              <div className="border-t border-gray-200 pt-6 space-y-4">
                <h3 className="text-lg text-gray-900 mb-4">Типы уведомлений</h3>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-900">Уведомления о записях</p>
                    <p className="text-xs text-gray-600">Новые записи, изменения, отмены</p>
                  </div>
                  <Switch
                    checked={notificationSettings.bookingNotifications}
                    onCheckedChange={(checked) => setNotificationSettings({ ...notificationSettings, bookingNotifications: checked })}
                  />
                </div>

                <div className="p-4 bg-gray-50 rounded-lg space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-900">Напоминания о днях рождения</p>
                      <p className="text-xs text-gray-600">Уведомления сотрудников о ДР клиентов</p>
                    </div>
                    <Switch
                      checked={notificationSettings.birthdayReminders}
                      onCheckedChange={(checked) => setNotificationSettings({ ...notificationSettings, birthdayReminders: checked })}
                    />
                  </div>
                  
                  {notificationSettings.birthdayReminders && (
                    <div>
                      <Label htmlFor="birthdayDays">Напоминать за (дней)</Label>
                      <Select 
                        value={notificationSettings.birthdayDaysAdvance.toString()} 
                        onValueChange={(value) => setNotificationSettings({ ...notificationSettings, birthdayDaysAdvance: parseInt(value) })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="3">3 дня</SelectItem>
                          <SelectItem value="7">7 дней (неделя)</SelectItem>
                          <SelectItem value="14">14 дней (2 недели)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </div>

              <Button type="submit" className="bg-gradient-to-r from-pink-500 to-purple-600">
                Сохранить настройки уведомлений
              </Button>
            </form>
          </div>
        </TabsContent>

        {/* Roles Tab */}
        <TabsContent value="roles">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl text-gray-900 mb-2">Управление ролями</h2>
                <p className="text-gray-600">Создавайте роли и назначайте права доступа</p>
              </div>
              <Button onClick={() => setShowCreateRoleDialog(true)} className="bg-pink-600 hover:bg-pink-700">
                <Plus className="w-4 h-4 mr-2" />
                Создать роль
              </Button>
            </div>

            {/* Info Alert */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-blue-800 font-medium text-sm mb-2">О системе ролей:</p>
                  <ul className="text-blue-700 text-sm space-y-1 list-disc list-inside">
                    <li>Создавайте кастомные роли под нужды вашего бизнеса</li>
                    <li>Назначайте детальные права: просмотр, создание, редактирование, удаление</li>
                    <li>Встроенные роли (Админ, Менеджер, Сотрудник) нельзя удалить</li>
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
                        Встроенная
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
                        Права
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
            <h2 className="text-2xl text-gray-900 mb-6">Безопасность и доступ</h2>
            
            <div className="space-y-6">
              <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <Shield className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-sm text-gray-900 mb-2 font-semibold">Рекомендации по безопасности</h3>
                    <ul className="text-sm text-gray-700 space-y-2">
                      <li>• Используйте сложные пароли (минимум 8 символов)</li>
                      <li>• Регулярно меняйте пароли сотрудников</li>
                      <li>• Не передавайте учетные данные третьим лицам</li>
                      <li>• Проверяйте активные сессии пользователей</li>
                      <li>• Регулярно создавайте резервные копии данных</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg text-gray-900 mb-4">Резервное копирование</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Скачайте резервную копию всех данных системы для безопасности
                </p>
                <Button variant="outline">
                  📥 Скачать резервную копию
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
              <h3 className="text-xl font-bold text-gray-900">Создать роль</h3>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <Label htmlFor="roleKey">Ключ роли (латиница) *</Label>
                <Input
                  id="roleKey"
                  placeholder="senior_master"
                  value={createRoleForm.role_key}
                  onChange={(e) => setCreateRoleForm({ ...createRoleForm, role_key: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                />
              </div>

              <div>
                <Label htmlFor="roleName">Название роли *</Label>
                <Input
                  id="roleName"
                  placeholder="Старший мастер"
                  value={createRoleForm.role_name}
                  onChange={(e) => setCreateRoleForm({ ...createRoleForm, role_name: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="roleDesc">Описание</Label>
                <Textarea
                  id="roleDesc"
                  placeholder="Описание роли..."
                  value={createRoleForm.role_description}
                  onChange={(e) => setCreateRoleForm({ ...createRoleForm, role_description: e.target.value })}
                  rows={3}
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex gap-3">
              <Button variant="outline" onClick={() => setShowCreateRoleDialog(false)} className="flex-1">
                Отмена
              </Button>
              <Button onClick={handleCreateRole} disabled={savingRole} className="flex-1 bg-pink-600 hover:bg-pink-700">
                {savingRole ? 'Создание...' : 'Создать'}
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
              <h3 className="text-xl font-bold text-gray-900">Права роли: {selectedRole.name}</h3>
              <p className="text-sm text-gray-600 mt-1">Настройте детальные права доступа</p>
            </div>

            <div className="p-6">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="p-3 text-left text-sm font-semibold text-gray-600 border-b">Ресурс</th>
                      <th className="p-3 text-center text-sm font-semibold text-gray-600 border-b">Просмотр</th>
                      <th className="p-3 text-center text-sm font-semibold text-gray-600 border-b">Создание</th>
                      <th className="p-3 text-center text-sm font-semibold text-gray-600 border-b">Редактирование</th>
                      <th className="p-3 text-center text-sm font-semibold text-gray-600 border-b">Удаление</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(availablePermissions).map(([key, name]) => (
                      <tr key={key} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="p-3 text-sm font-medium text-gray-900">{name as string}</td>
                        {['can_view', 'can_create', 'can_edit', 'can_delete'].map(action => (
                          <td key={action} className="p-3 text-center">
                            <input
                              type="checkbox"
                              checked={permissions[key]?.[action] || false}
                              onChange={() => handleTogglePermission(key, action)}
                              className="w-5 h-5 cursor-pointer accent-pink-600"
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex gap-3 sticky bottom-0 bg-white">
              <Button variant="outline" onClick={() => setShowPermissionsDialog(false)} className="flex-1">
                Отмена
              </Button>
              <Button onClick={handleSavePermissions} disabled={savingRole} className="flex-1 bg-pink-600 hover:bg-pink-700">
                {savingRole ? 'Сохранение...' : 'Сохранить права'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}