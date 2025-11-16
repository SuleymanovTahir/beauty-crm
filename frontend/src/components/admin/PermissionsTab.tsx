/**
 * Компонент для управления правами и ролями пользователя
 */
import React, { useState, useEffect } from 'react';
import { Shield, Check, X, Loader, AlertCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { toast } from 'sonner';
import { api } from '../../services/api';

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
}

export function PermissionsTab({ userId }: PermissionsTabProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userPermissions, setUserPermissions] = useState<UserPermissions | null>(null);
  const [allRoles, setAllRoles] = useState<Record<string, RoleInfo>>({});
  const [permissionDescriptions, setPermissionDescriptions] = useState<Record<string, string>>({});
  const [selectedRole, setSelectedRole] = useState<string>('');

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
    } catch (err) {
      console.error('Error loading permissions:', err);
      toast.error('Ошибка загрузки данных о правах');
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
          Роль пользователя
        </h2>

        <div className="space-y-6">
          <div>
            <Label>Текущая роль</Label>
            <div className="mt-2 p-4 bg-pink-50 border border-pink-200 rounded-lg">
              <p className="text-lg font-semibold text-gray-900">
                {userPermissions.role_info.name}
              </p>
              <p className="text-sm text-gray-600">
                Уровень иерархии: {userPermissions.role_info.hierarchy_level}
              </p>
            </div>
          </div>

          <div>
            <Label htmlFor="role_select">Изменить роль на</Label>
            <select
              id="role_select"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              disabled={saving}
              className="mt-2 w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-600 focus:border-transparent"
            >
              {Object.entries(allRoles).map(([roleKey, roleData]) => (
                <option key={roleKey} value={roleKey}>
                  {roleData.name} (уровень: {roleData.hierarchy_level})
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
                  Сохранение...
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4 mr-2" />
                  Изменить роль
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Список прав */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <h2 className="text-xl text-gray-900 mb-6 font-semibold">
          Права доступа
        </h2>

        {userPermissions.role_info.permissions === '*' ? (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg mb-4">
            <p className="text-green-800 font-semibold flex items-center gap-2">
              <Check className="w-5 h-5" />
              Полный доступ ко всем функциям системы
            </p>
          </div>
        ) : null}

        <div className="space-y-2">
          {Object.entries(permissionDescriptions).map(([permKey, permDescription]) => {
            const hasPermission = currentPermissions.includes(permKey);

            return (
              <div
                key={permKey}
                className={`p-4 rounded-lg border transition-colors ${
                  hasPermission
                    ? 'bg-green-50 border-green-200'
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  {hasPermission ? (
                    <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <X className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className="font-mono text-sm text-gray-600">{permKey}</p>
                    <p
                      className={`text-sm ${
                        hasPermission ? 'text-gray-900' : 'text-gray-500'
                      }`}
                    >
                      {permDescription}
                    </p>
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
            Может управлять ролями
          </h2>
          <div className="flex flex-wrap gap-2">
            {userPermissions.role_info.can_manage_roles.map((role) => (
              <span
                key={role}
                className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
              >
                {allRoles[role]?.name || role}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
