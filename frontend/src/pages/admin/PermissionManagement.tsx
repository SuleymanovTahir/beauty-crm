// /frontend/src/pages/admin/PermissionManagement.tsx
import React, { useState, useEffect } from "react";
import { Shield, Loader, Check, X, Settings } from "lucide-react";
import { Button } from "../../components/ui/button";
import { toast } from "sonner";
import { api } from "../../services/api";
import { useTranslation } from "react-i18next";

interface User {
  id: number;
  username: string;
  full_name: string;
  role: string;
  email: string;
}

interface Permission {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
}

interface Permissions {
  [resource: string]: Permission;
}

export default function PermissionManagement() {
  const { t } = useTranslation();
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<Permissions>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Function to get permission label with translation
  const getPermissionLabel = (key: string): string => {
    return t(`permissions:perm_${key}`, key);
  };

  // List of all permission resources
  const permissionResources = [
    'clients', 'bookings', 'services', 'analytics', 'settings',
    'users', 'bot_settings', 'export_data', 'import_data',
    'view_contacts', 'instagram_chat', 'internal_chat',
    'employees', 'reports', 'financial_data'
  ];

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (selectedUser) {
      loadUserPermissions(selectedUser.id);
    }
  }, [selectedUser]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await api.getUsers();
      setUsers(response.users || []);
      if (response.users && response.users.length > 0) {
        setSelectedUser(response.users[0]);
      }
    } catch (error) {
      console.error("Error loading users:", error);
      toast.error(t('permissions:error_loading_users', 'Ошибка загрузки пользователей'));
    } finally {
      setLoading(false);
    }
  };

  const loadUserPermissions = async (userId: number) => {
    try {
      const response = await api.getUserPermissions(userId);
      setPermissions(response.permissions || {});
    } catch (error) {
      console.error("Error loading permissions:", error);
      toast.error(t('permissions:error_loading_permissions', 'Ошибка загрузки прав доступа'));
    }
  };

  const togglePermission = async (resource: string, action: "view" | "create" | "edit" | "delete") => {
    if (!selectedUser) return;

    const currentValue = permissions[resource]?.[action] || false;

    try {
      setSaving(true);

      if (currentValue) {
        // Revoke permission
        await api.revokePermission(selectedUser.id, resource);
        toast.success(t('permissions:permission_revoked', 'Право отозвано'));
      } else {
        // Grant permission
        await api.grantPermission(selectedUser.id, resource);
        toast.success(t('permissions:permission_granted', 'Право предоставлено'));
      }

      // Reload permissions
      await loadUserPermissions(selectedUser.id);
    } catch (error: any) {
      console.error("Error toggling permission:", error);
      toast.error(error.message || t('permissions:error_changing_permissions', 'Ошибка изменения прав'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="w-8 h-8 animate-spin text-pink-500" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
          <Settings className="w-8 h-8" />
          Управление правами доступа
        </h1>
        <p className="text-gray-600">
          Настройте индивидуальные права для пользователей
        </p>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* User list */}
        <div className="col-span-12 md:col-span-4">
          <div className="bg-white rounded-xl shadow-sm">
            <div className="p-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">Пользователи</h2>
            </div>
            <div className="max-h-[600px] overflow-y-auto">
              {users.map((user) => (
                <button
                  key={user.id}
                  onClick={() => setSelectedUser(user)}
                  className={`w-full p-4 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 ${
                    selectedUser?.id === user.id
                      ? "bg-pink-50 border-l-4 border-l-pink-500"
                      : ""
                  }`}
                >
                  <div className="font-medium text-gray-900">{user.full_name}</div>
                  <div className="text-sm text-gray-500">@{user.username}</div>
                  <div className="text-xs text-gray-400 mt-1 capitalize">
                    {user.role}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Permissions grid */}
        <div className="col-span-12 md:col-span-8">
          {selectedUser ? (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-1">
                  Права доступа: {selectedUser.full_name}
                </h2>
                <p className="text-sm text-gray-500">
                  Роль: <span className="capitalize">{selectedUser.role}</span>
                </p>
              </div>

              <div className="space-y-4">
                {permissionResources.map((resource) => {
                  const perm = permissions[resource] || {
                    view: false,
                    create: false,
                    edit: false,
                    delete: false,
                  };

                  return (
                    <div
                      key={resource}
                      className="border border-gray-200 rounded-lg p-4"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Shield className="w-5 h-5 text-gray-400" />
                          <span className="font-medium text-gray-900">{getPermissionLabel(resource)}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {[
                          { key: "view", label: t('permissions:view_permission', 'Просмотр') },
                          { key: "create", label: t('permissions:create_permission', 'Создание') },
                          { key: "edit", label: t('permissions:edit_permission', 'Редактирование') },
                          { key: "delete", label: t('permissions:delete_permission', 'Удаление') },
                        ].map(({ key, label: actionLabel }) => (
                          <button
                            key={key}
                            onClick={() =>
                              togglePermission(
                                resource,
                                key as "view" | "create" | "edit" | "delete"
                              )
                            }
                            disabled={saving}
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                              perm[key as keyof Permission]
                                ? "bg-green-100 text-green-700 hover:bg-green-200"
                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            }`}
                          >
                            <div className="flex items-center justify-center gap-1">
                              {perm[key as keyof Permission] ? (
                                <Check className="w-4 h-4" />
                              ) : (
                                <X className="w-4 h-4" />
                              )}
                              <span>{actionLabel}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {saving && (
                <div className="mt-4 flex items-center justify-center text-sm text-gray-500">
                  <Loader className="w-4 h-4 animate-spin mr-2" />
                  Сохранение...
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm p-12 text-center">
              <Shield className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Выберите пользователя</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
