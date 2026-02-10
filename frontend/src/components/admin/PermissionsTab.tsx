// /frontend/src/components/admin/PermissionsTab.tsx
/**
 * Компонент для управления правами и ролями пользователя
 */
import { useState, useEffect } from 'react';
import { Shield, Check, X, Loader, AlertCircle, Save, Info } from 'lucide-react';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

interface PermissionsTabProps {
  userId: number;
}

interface RoleInfo {
  name: string;
  hierarchy_level: number;
  permissions: string[] | '*';
  can_manage_roles: string[];
}

interface UserPermissions {
  user: {
    id: number;
    username: string;
    full_name: string;
    role: string;
    email: string;
  };
  role_info: RoleInfo;
  custom_permissions: Record<string, boolean>;
}

export function PermissionsTab({ userId }: PermissionsTabProps) {
  const { t } = useTranslation(['admin-components', 'common']);
  const { user: currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingPermissions, setSavingPermissions] = useState(false);
  const [userPermissions, setUserPermissions] = useState<UserPermissions | null>(null);
  const [allRoles, setAllRoles] = useState<Record<string, RoleInfo>>({});
  const [permissionDescriptions, setPermissionDescriptions] = useState<Record<string, string>>({});
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [customPermissions, setCustomPermissions] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadData();
  }, [userId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [permsData, rolesData, descriptionsData] = await Promise.all([
        api.getUserPermissions(userId),
        api.getAllRoles(),
        api.getPermissionDescriptions(),
      ]);

      setUserPermissions(permsData);
      setAllRoles(rolesData.roles);
      setPermissionDescriptions(descriptionsData.permissions);
      setSelectedRole(permsData.user.role);
      setCustomPermissions(permsData.custom_permissions || {});
    } catch (err) {
      console.error('Error loading permissions:', err);
      toast.error(t('error_loading_permissions'));
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRole = async () => {
    if (!selectedRole || selectedRole === userPermissions?.user.role) {
      toast.info('Роль не изменилась');
      return;
    }

    try {
      setSaving(true);
      const result = (await api.updateUserRole(userId, selectedRole)) as { message: string };
      toast.success(result.message);
      await loadData(); // Перезагружаем данные
    } catch (err: any) {
      toast.error(err.message || 'Ошибка изменения роли');
    } finally {
      setSaving(false);
    }
  };

  const togglePermission = (permKey: string) => {
    setCustomPermissions(prev => ({
      ...prev,
      [permKey]: !prev[permKey]
    }));
  };

  const handleSaveCustomPermissions = async () => {
    try {
      setSavingPermissions(true);
      await api.updateUserCustomPermissions(userId, customPermissions);
      toast.success(t('permissions_updated'));
      await loadData();
    } catch (err: any) {
      toast.error(err.message || t('error_saving_permissions'));
    } finally {
      setSavingPermissions(false);
    }
  };

  const hasCustomChanges = () => {
    const original = userPermissions?.custom_permissions || {};
    return JSON.stringify(original) !== JSON.stringify(customPermissions);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader className="w-8 h-8 text-pink-600 animate-spin" />
      </div>
    );
  }

  if (!userPermissions) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="text-center text-gray-500">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p>Не удалось загрузить данные о правах</p>
        </div>
      </div>
    );
  }

  const currentPermissions = userPermissions.role_info.permissions === '*'
    ? Object.keys(permissionDescriptions)
    : userPermissions.role_info.permissions;

  return (
    <div className="space-y-6">
      {/* Текущая роль и изменение */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <h2 className="text-xl text-gray-900 mb-6 font-semibold flex items-center gap-2">
          <Shield className="w-5 h-5 text-pink-600" />
          {t('admin-components:user_role')}
        </h2>

        <div className="space-y-6">
          <div>
            <Label>{t('admin-components:current_role')}</Label>
            <div className="mt-2 p-4 bg-pink-50 border border-pink-200 rounded-lg">
              <p className="text-lg font-semibold text-gray-900">
                {t(`common:role_${userPermissions.user.role}`)}
              </p>
              <p className="text-sm text-gray-600">
                {t('admin-components:hierarchy_level')}: {userPermissions.role_info.hierarchy_level}
              </p>
            </div>
          </div>

          <div>
            <Label htmlFor="role_select">{t('admin-components:change_role_to')}</Label>
            <select
              id="role_select"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              disabled={saving}
              className="mt-2 w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-600 focus:border-transparent"
            >
              {Object.entries(allRoles).map(([roleKey, roleData]) => (
                <option key={roleKey} value={roleKey}>
                  {t(`common:role_${roleKey}`)} ({t('common:level')}: {roleData.hierarchy_level})
                </option>
              ))}
            </select>
          </div>

          {selectedRole !== userPermissions.user.role && (
            <Button
              onClick={handleUpdateRole}
              disabled={saving}
              className="w-full bg-pink-600 hover:bg-pink-700"
            >
              {saving ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  {t('common:saving')}
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4 mr-2" />
                  {t('admin-components:change_role')}
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Список прав */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl text-gray-900 font-semibold">
            {t('admin-components:access_rights')}
          </h2>
          {currentUser?.role === 'director' && hasCustomChanges() && (
            <Button
              onClick={handleSaveCustomPermissions}
              disabled={savingPermissions}
              className="bg-pink-600 hover:bg-pink-700"
            >
              {savingPermissions ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  {t('saving')}
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {t('save_changes')}
                </>
              )}
            </Button>
          )}
        </div>

        {userPermissions.role_info.permissions === '*' ? (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg mb-4">
            <p className="text-green-800 font-semibold flex items-center gap-2">
              <Check className="w-5 h-5" />
              {t('full_access_director')}
            </p>
          </div>
        ) : null}

        {currentUser?.role === 'director' && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-4">
            <p className="text-sm text-blue-800 flex items-center gap-1.5">
              <Info className="w-4 h-4 text-blue-600" />
              <strong>{t('individual_permissions')}:</strong> {t('individual_permissions_description')}
            </p>
          </div>
        )}
        {/* Список прав с группировкой, фиксированной высотой и скроллом */}
        <div className="mt-4 border border-gray-100 rounded-xl overflow-hidden shadow-inner bg-gray-50/50">
          <div className="max-h-[500px] overflow-y-auto p-4 custom-scrollbar space-y-6">
            {Object.entries(
              Object.entries(permissionDescriptions).reduce((acc, [permKey, permDescription]) => {
                let category = 'other';
                if (permKey.startsWith('clients_')) category = 'clients';
                else if (permKey.startsWith('services_')) category = 'services';
                else if (permKey.startsWith('users_')) category = 'users';
                else if (permKey.startsWith('roles_')) category = 'system';
                else if (permKey.startsWith('analytics_')) category = 'analytics';
                else if (permKey.startsWith('instagram_')) category = 'integration';
                else if (permKey.startsWith('staff_chat_')) category = 'communication';
                else if (permKey.startsWith('telephony_')) category = 'communication';
                else if (permKey.startsWith('tasks_')) category = 'tasks';
                else if (permKey.startsWith('broadcasts_')) category = 'marketing';

                if (!acc[category]) acc[category] = [];
                acc[category].push({ permKey, permDescription });
                return acc;
              }, {} as Record<string, Array<{ permKey: string; permDescription: string }>>)
            ).map(([category, perms]) => (
              <div key={category} className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                  <div className="h-px flex-1 bg-gray-200"></div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                    {t(`common:category_${category}`)}
                  </span>
                  <div className="h-px flex-1 bg-gray-200"></div>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {perms.map(({ permKey, permDescription }) => {
                    const hasRolePermission = currentPermissions.includes(permKey);
                    const hasCustomPermission = customPermissions[permKey];
                    const finalPermission = hasCustomPermission !== undefined ? hasCustomPermission : hasRolePermission;
                    const isCustomized = hasCustomPermission !== undefined;
                    const canEdit = currentUser?.role === 'director';

                    return (
                      <div
                        key={permKey}
                        className={`p-4 rounded-xl border-2 transition-all duration-200 ${finalPermission
                          ? 'bg-white border-green-200 shadow-sm'
                          : isCustomized
                            ? 'bg-red-50 border-red-100'
                            : 'bg-white border-gray-100 opacity-75'
                          }`}
                      >
                        <div className="flex items-start gap-4">
                          <div className="pt-1">
                            {canEdit ? (
                              <div
                                className={`w-6 h-6 rounded-md border-2 flex items-center justify-center cursor-pointer transition-colors ${finalPermission ? 'bg-pink-600 border-pink-600' : 'bg-white border-gray-300'
                                  }`}
                                onClick={() => togglePermission(permKey)}
                              >
                                {finalPermission && <Check className="w-4 h-4 text-white" />}
                              </div>
                            ) : (
                              <div className={`p-1 rounded-full ${finalPermission ? 'bg-green-100' : 'bg-gray-100'}`}>
                                {finalPermission ? (
                                  <Check className="w-4 h-4 text-green-600" />
                                ) : (
                                  <X className="w-4 h-4 text-gray-400" />
                                )}
                              </div>
                            )}
                          </div>

                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`font-semibold text-sm ${finalPermission ? 'text-gray-900' : 'text-gray-500'}`}>
                                {t(`common:perm_${permKey}`) || permDescription}
                              </span>
                              {isCustomized && (
                                <span className="px-2 py-0.5 bg-pink-100 text-pink-700 text-[10px] uppercase font-bold tracking-wider rounded-full">
                                  {t('common:modified')}
                                </span>
                              )}
                            </div>

                            <p className="text-[10px] text-gray-400 font-mono mb-1">
                              {permKey}
                            </p>

                            <p className="text-xs text-gray-500 leading-relaxed">
                              {permDescription}
                            </p>

                            {isCustomized && (
                              <div className="mt-2 flex items-center gap-1.5 py-1 px-2 bg-gray-100 rounded-md w-fit">
                                <Info className="w-3 h-3 text-gray-400" />
                                <p className="text-[10px] text-gray-500 italic">
                                  {hasRolePermission
                                    ? t('common:granted_by_role_but_overridden')
                                    : t('common:not_granted_by_role_but_forced')
                                  }
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Может управлять ролями */}
      {userPermissions.role_info.can_manage_roles.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <h2 className="text-xl text-gray-900 mb-4 font-semibold">
            {t('can_manage_roles')}
          </h2>
          <div className="flex flex-wrap gap-2">
            {userPermissions.role_info.can_manage_roles.map((role) => (
              <span
                key={role}
                className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
              >
                {t(`common:role_${role}`) || allRoles[role]?.name || role}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
