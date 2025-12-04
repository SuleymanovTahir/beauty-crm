// /frontend/src/pages/admin/Users.tsx
import { useState, useEffect } from 'react';
import { Users as UsersIcon, Search, UserPlus, Edit, Trash2, Loader, AlertCircle, Shield, Key, ArrowLeft, Filter, X, Check } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { useTranslation } from 'react-i18next';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { api } from '../../services/api';
import { PositionSelector } from '../../components/PositionSelector';
import { useAuth } from '../../contexts/AuthContext';
import { usePermissions, RoleHierarchy } from '../../utils/permissions';
import { PermissionsTab } from '../../components/admin/PermissionsTab';
import { ScheduleDialog } from '../../components/admin/ScheduleDialog';
import { Calendar } from 'lucide-react';
import { getDynamicAvatar } from '../../utils/avatarUtils';

import { getPhotoUrl } from '../../utils/photoUtils';

interface User {
  id: number;
  username: string;
  full_name: string;
  email: string;
  role: string;
  position?: string;
  created_at: string;
  photo?: string;
}

export default function Users() {
  const navigate = useNavigate();
  const { t } = useTranslation(['admin/users', 'common']);
  const { user: currentUser } = useAuth();

  // Используем централизованную систему прав
  const permissions = usePermissions(currentUser?.role || 'employee');

  const roleConfig: Record<string, { label: string; color: string }> = {
    director: { label: t('role_director_label'), color: 'bg-red-100 text-red-800' },
    admin: { label: t('role_admin_label'), color: 'bg-purple-100 text-purple-800' },
    manager: { label: t('role_manager_label'), color: 'bg-blue-100 text-blue-800' },
    sales: { label: t('role_sales_label'), color: 'bg-green-100 text-green-800' },
    marketer: { label: t('role_marketer_label'), color: 'bg-orange-100 text-orange-800' },
    employee: { label: t('role_employee_label'), color: 'bg-gray-100 text-gray-800' },
  };

  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [availableRoles, setAvailableRoles] = useState<Array<{ key: string; name: string; level: number }>>([]);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [savingRole, setSavingRole] = useState(false);

  // Edit user dialog states
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editForm, setEditForm] = useState({ username: '', full_name: '', email: '', position: '' });
  const [savingEdit, setSavingEdit] = useState(false);

  // Permissions dialog states
  // Permissions dialog states
  const [showPermissionsDialog, setShowPermissionsDialog] = useState(false);

  // Schedule dialog states
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);

  useEffect(() => {
    loadUsers();
    loadAvailableRoles();
  }, []);

  const loadAvailableRoles = async () => {
    try {
      setLoadingRoles(true);
      const data = await api.getRoles();
      setAvailableRoles(data.roles || []);
    } catch (err) {
      console.error('Error loading roles:', err);
    } finally {
      setLoadingRoles(false);
    }
  };

  const getRoleDescription = (roleKey: string): string => {
    const descriptions: Record<string, string> = {
      director: t('role_director_desc'),
      admin: t('role_admin_desc'),
      manager: t('role_manager_desc'),
      sales: t('role_sales_desc'),
      marketer: t('role_marketer_desc'),
      employee: t('role_employee_desc')
    };
    return descriptions[roleKey] || t('role_default');
  };

  const handleChangeRole = async (userId: number, newRole: string) => {
    try {
      setSavingRole(true);
      await api.updateUserRole(userId, newRole); // fix argument type
      toast.success(t('role_changed'));
      setShowRoleDialog(false);
      setSelectedUser(null);
      await loadUsers();
    } catch (err) {
      const message = err instanceof Error ? err.message : t('error_changing_role');
      toast.error(message);
    } finally {
      setSavingRole(false);
    }
  };

  const handleEditUser = async () => {
    if (!selectedUser) return;

    try {
      setSavingEdit(true);
      await api.updateUserProfile(selectedUser.id, editForm);
      toast.success(t('user_updated'));
      setShowEditDialog(false);
      setSelectedUser(null);
      await loadUsers();
    } catch (err) {
      const message = err instanceof Error ? err.message : t('error_updating_user');
      toast.error(message);
    } finally {
      setSavingEdit(false);
    }
  };

  useEffect(() => {
    const filtered = users.filter(user =>
      (user.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.username || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.email || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredUsers(filtered);
  }, [searchTerm, users]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.getUsers();

      console.log('📥 Received response:', response);

      // ✅ ПРАВИЛЬНОЕ ИЗВЛЕЧЕНИЕ
      const usersArray = Array.isArray(response)
        ? response
        : (response?.users || []);

      console.log('✅ Users array:', usersArray);
      console.log('🔍 First user photo:', usersArray[0]?.photo);
      setUsers(usersArray);

      if (usersArray.length === 0) {
        console.warn('⚠️  Массив пользователей пуст');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : t('error_loading_users');
      setError(message);
      toast.error(`${t('error')}: ${message} `);
      console.error('❌ Error loading users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (id: number) => {
    if (!confirm(t('confirm_delete'))) return;

    try {
      await api.deleteUser(id);
      setUsers(users.filter(u => u.id !== id));
      toast.success(t('user_deleted'));
    } catch (err) {
      const message = err instanceof Error ? err.message : t('error_deleting_user');
      toast.error(`${t('error')}: ${message} `);
      console.error('Error deleting user:', err);
    }
  };

  const stats = {
    total: users.length,
    directors: users.filter(u => u.role === 'director').length,
    admins: users.filter(u => u.role === 'admin').length,
    managers: users.filter(u => u.role === 'manager').length,
    others: users.filter(u => ['employee', 'sales', 'marketer'].includes(u.role)).length,
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader className="w-8 h-8 text-pink-600 animate-spin" />
          <p className="text-gray-600">{t('loading')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-800 font-medium">{t('error_loading')}</p>
              <p className="text-red-700 text-sm mt-1">{error}</p>
              <Button onClick={loadUsers} className="mt-4 bg-red-600 hover:bg-red-700">
                {t('try_again')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl text-gray-900 mb-2 flex items-center gap-3">
          <UsersIcon className="w-8 h-8 text-pink-600" />
          {t('title')}
        </h1>
        <p className="text-gray-600">{filteredUsers.length} {t('user_count')}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <p className="text-gray-600 text-sm mb-2">{t('stats_total')}</p>
          <h3 className="text-3xl text-gray-900">{stats.total}</h3>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <p className="text-gray-600 text-sm mb-2">{t('stats_directors')}</p>
          <h3 className="text-3xl text-red-600">{stats.directors}</h3>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <p className="text-gray-600 text-sm mb-2">{t('stats_admins')}</p>
          <h3 className="text-3xl text-purple-600">{stats.admins}</h3>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <p className="text-gray-600 text-sm mb-2">{t('stats_managers')}</p>
          <h3 className="text-3xl text-blue-600">{stats.managers}</h3>
        </div>
      </div>

      <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-200 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              type="text"
              placeholder={t('search_placeholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          {/* Кнопка создания только для тех, у кого есть право */}
          {permissions.canCreateUsers && (
            <Button
              className="bg-pink-600 hover:bg-pink-700"
              onClick={() => navigate('/admin/users/create')}
            >
              <UserPlus className="w-4 h-4 mr-2" />
              {t('add_user')}
            </Button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {filteredUsers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">{t('table_user')}</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">{t('table_username')}</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">{t('table_email')}</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">{t('table_role')}</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">{t('table_position')}</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">{t('table_created')}</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">{t('table_actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={getPhotoUrl(user.photo) || getDynamicAvatar(user.full_name || user.username, 'cold')}
                          alt={user.full_name}
                          className="w-10 h-10 rounded-full bg-gray-100 object-cover"
                        />
                        <div>
                          <p className="text-sm text-gray-900 font-medium">{user.full_name}</p>
                          {/* DEBUG: Show photo URL */}
                          <p className="text-xs text-gray-400">{user.photo ? 'Has Photo' : 'No Photo'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{user.username}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{user.email || '-'}</td>
                    <td className="px-6 py-4">
                      <Badge className={roleConfig[user.role as keyof typeof roleConfig]?.color || 'bg-gray-100 text-gray-800'}>
                        {roleConfig[user.role as keyof typeof roleConfig]?.label || user.role}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{user.position || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {new Date(user.created_at).toLocaleDateString('ru-RU')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {/* Кнопка редактирования - открывает детальную страницу */}
                        {permissions.canEditUsers && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate(`/admin/users/${user.id}`)}
                            className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            title={t('action_edit_title')}
                          >
                            <Edit className="w-4 h-4" />
                          </Button >
                        )}

                        {/* Кнопка удаления только если есть право */}
                        {
                          permissions.canDeleteUsers && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleDeleteUser(user.id)}
                              title={t('action_delete_title')}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )
                        }
                      </div >
                    </td >
                  </tr >
                ))}
              </tbody >
            </table >
          </div >
        ) : (
          <div className="py-20 text-center text-gray-500">
            <UsersIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p>{t('no_users_found')}</p>
          </div>
        )}
      </div >

      {/* Диалог смены роли */}
      {
        showRoleDialog && selectedUser && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-md w-full shadow-2xl custom-dialog-scroll flex flex-col">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    {t('role_dialog_title')}: {selectedUser.full_name}
                  </h3>
                  <p className="text-xs text-gray-600 mt-1">
                    {t('role_dialog_current')}: {roleConfig[selectedUser.role]?.label || selectedUser.role}
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowRoleDialog(false);
                    setSelectedUser(null);
                  }}
                  className="ml-4"
                  disabled={savingRole}
                >
                  {t('role_dialog_close')}
                </Button>
              </div>

              <div className="p-4 overflow-y-auto flex-1">
                {loadingRoles ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
                  </div>
                ) : (
                  <>
                    {availableRoles.length === 0 ? (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <p className="text-sm text-yellow-800">
                          {t('no_permission_to_change_roles')}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {availableRoles.map((role) => {
                          // Get permissions for this role
                          const rolePermissions = permissions.canCreateUsers ? [
                            role.key === 'director' && t('perm_director_full'),
                            role.key === 'admin' && t('perm_admin_manage'),
                            role.key === 'manager' && t('perm_manager_bookings'),
                            (role.key === 'sales' || role.key === 'marketer') && t('perm_sales_clients'),
                            role.key === 'employee' && t('perm_employee_basic')
                          ].filter(Boolean) : [];

                          return (
                            <div key={role.key} className="space-y-2">
                              <button
                                onClick={() => handleChangeRole(selectedUser.id, role.key)}
                                disabled={savingRole}
                                className={`w-full p-3 rounded-lg border-2 transition-all text-left ${selectedUser.role === role.key
                                  ? 'border-pink-500 bg-pink-50'
                                  : 'border-gray-200 hover:border-pink-300 hover:bg-gray-50'
                                  }`}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <p className="font-medium text-gray-900">{role.name}</p>
                                    <p className="text-sm text-gray-600 mt-1">
                                      {getRoleDescription(role.key)}
                                    </p>
                                  </div>
                                  {selectedUser.role === role.key && (
                                    <Badge className="bg-pink-100 text-pink-800">{t('role_dialog_current_badge')}</Badge>
                                  )}
                                </div>
                              </button>

                              {/* Permissions display */}
                              {rolePermissions.length > 0 && (
                                <div className="ml-3 pl-3 border-l-2 border-gray-200">
                                  <p className="text-xs font-medium text-gray-500 mb-1">{t('permissions_label')}:</p>
                                  <ul className="space-y-1">
                                    {rolePermissions.map((perm, idx) => (
                                      <li key={idx} className="text-xs text-gray-600 flex items-start gap-1">
                                        <span className="text-green-600 mt-0.5">✓</span>
                                        <span>{perm}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
                      <p className="text-xs text-blue-800">
                        <strong>ℹ️ {t('role_hierarchy_label')}:</strong> {t('role_hierarchy_description')}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )
      }

      {/* Диалог редактирования пользователя */}
      {
        showEditDialog && selectedUser && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-md w-full shadow-2xl">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-xl font-bold text-gray-900">
                  {t('edit_dialog_title')}: {selectedUser.full_name}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {t('edit_dialog_subtitle')}
                </p>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('edit_username_label')}
                  </label>
                  <Input
                    type="text"
                    value={editForm.username}
                    onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                    placeholder={t('edit_username_placeholder')}
                    disabled={savingEdit}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('edit_fullname_label')}
                  </label>
                  <Input
                    type="text"
                    value={editForm.full_name}
                    onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                    placeholder={t('edit_fullname_placeholder')}
                    disabled={savingEdit}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <Input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    placeholder="email@example.com"
                    disabled={savingEdit}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('position_label')}
                  </label>
                  <PositionSelector
                    value={editForm.position}
                    onChange={(value) => setEditForm({ ...editForm, position: value })}
                    placeholder={t('edit_position_placeholder')}
                    disabled={savingEdit}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {t('edit_position_hint')}
                  </p>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-sm text-yellow-800">
                    <strong>⚠️ {t('edit_password_warning_title')}:</strong> {t('edit_password_warning_text')}
                  </p>
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowEditDialog(false);
                    setSelectedUser(null);
                  }}
                  className="flex-1"
                  disabled={savingEdit}
                >
                  {t('edit_cancel')}
                </Button>
                <Button
                  onClick={handleEditUser}
                  className="flex-1 bg-pink-600 hover:bg-pink-700"
                  disabled={savingEdit}
                >
                  {savingEdit ? t('edit_saving') : t('edit_save')}
                </Button>
              </div>
            </div>
          </div>
        )
      }

      {/* Диалог управления правами */}
      {
        showPermissionsDialog && selectedUser && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-2xl w-full shadow-2xl custom-dialog-scroll flex flex-col">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-white rounded-t-xl flex-shrink-0">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    {t('permissions_dialog_title')}: {selectedUser.full_name}
                  </h3>
                  <p className="text-xs text-gray-600 mt-1">
                    {t('permissions_dialog_role')}: {roleConfig[selectedUser.role]?.label || selectedUser.role}
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowPermissionsDialog(false);
                    setSelectedUser(null);
                    loadUsers();
                  }}
                  className="ml-4"
                >
                  {t('permissions_dialog_close')}
                </Button>
              </div>

              <div className="p-4 overflow-y-auto flex-1">
                <PermissionsTab userId={selectedUser.id} />
              </div>
            </div>
          </div>
        )
      }

      {/* Диалог управления графиком */}
      <ScheduleDialog
        isOpen={showScheduleDialog}
        onClose={() => {
          setShowScheduleDialog(false);
          setSelectedUser(null);
        }}
        user={selectedUser}
      />
    </div >
  );
}