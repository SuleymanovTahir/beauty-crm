/**
 * Компонент для управления правами и ролями пользователя
 */
import React, { useState, useEffect } from 'react';
import { Shield, Check, X, Loader, AlertCircle, Save } from 'lucide-react';
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
      const result = await api.updateUserRole(userId, selectedRole);
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
            <p className="text-sm text-blue-800">
              <strong>ℹ️ {t('individual_permissions')}:</strong> {t('individual_permissions_description')}
            </p>
          </div>
        )}

        <div className="space-y-2">
          {Object.entries(permissionDescriptions).map(([permKey, permDescription]) => {
            const hasRolePermission = currentPermissions.includes(permKey);
            const hasCustomPermission = customPermissions[permKey];
            const finalPermission = hasCustomPermission !== undefined ? hasCustomPermission : hasRolePermission;
            const isCustomized = hasCustomPermission !== undefined;
            const canEdit = currentUser?.role === 'director';

            return (
              <div
                key={permKey}
                className={`p-4 rounded-lg border transition-colors ${finalPermission
                  ? 'bg-green-50 border-green-200'
                  : isCustomized
                    ? 'bg-red-50 border-red-200'
                    : 'bg-gray-50 border-gray-200'
                  }`}
              >


                <div className="flex items-start gap-3">
                  {canEdit ? (
                    <input
                      type="checkbox"
                      checked={finalPermission}
                      onChange={() => togglePermission(permKey)}
                      className="w-5 h-5 mt-0.5 text-pink-600 rounded border-gray-300 focus:ring-pink-500 cursor-pointer"
                    />
                  ) : (
                    finalPermission ? (
                      <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    ) : (
                      <X className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                    )
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {isCustomized && (
                        <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs font-medium rounded">
                          {t('modified')}
                        </span>
                      )}
                    </div>
                    <p
                      className={`text-sm ${finalPermission ? 'text-gray-900' : 'text-gray-500'
                        }`}
                    >
                      {t(`common:perm_${permKey}`) || permDescription}
                    </p>
                    {isCustomized && (
                      <p className="text-xs text-gray-500 mt-1">
                        {hasRolePermission
                          ? `${t('by_role')}: ${finalPermission ? t('was_granted') : t('granted_revoked')}`
                          : `${t('by_role')}: ${finalPermission ? t('not_was_granted') : t('not_granted')}`
                        }
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
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
