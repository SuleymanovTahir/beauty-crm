// /frontend/src/pages/admin/Users.tsx
import { useState, useEffect } from 'react';
import { Users as UsersIcon, Search, UserPlus, Edit, Trash2, Loader, AlertCircle, Key, Filter, X, Calendar, AlertTriangle } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { useTranslation } from 'react-i18next';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { api } from '../../services/api';
import { PositionSelector } from '../../components/PositionSelector';
import { useAuth } from '../../contexts/AuthContext';
import { usePermissions } from '../../utils/permissions';
import { PermissionsTab } from '../../components/admin/PermissionsTab';
import { ScheduleDialog } from '../../components/admin/ScheduleDialog';
import { getDynamicAvatar } from '../../utils/avatarUtils';
import { useCurrency } from '../../hooks/useSalonSettings';
import { Switch } from '../../components/ui/switch';

import { getPhotoUrl } from '../../utils/photoUtils';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';

type DateFilter = 'last7days' | 'last30days' | 'last90days' | 'allTime';
type UserTab = 'clients' | 'employees';

interface DateRange {
  start: string;
  end: string;
}

interface User {
  id: number;
  instagram_id: string;
  username: string;
  name: string;
  full_name: string;
  phone: string;
  email: string;
  created_at: string;
  total_spend: number;
  status: string;
  role: string;
  position?: string;
  is_active?: boolean;
  is_service_provider?: boolean;
  profile_pic?: string;
  photo?: string;
  first_contact?: string;
  last_contact?: string;
  is_public_visible?: boolean;
  sort_order?: number;
}

// Sortable Row Component
function SortableUserRow({
  user,
  activeTab,
  roleConfig,
  permissions,
  handleToggleVisibility,
  handleToggleActive,
  handleDeleteUser,
  navigate,
  t,
  setSelectedUser,
  setShowScheduleDialog,
  setShowPermissionsDialog,
  formatCurrency,
  getPhotoUrl,
  getDynamicAvatar
}: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: user.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.8 : 1,
    position: isDragging ? 'relative' : undefined,
  } as React.CSSProperties;

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`hover:bg-gray-50 transition-colors ${isDragging ? 'bg-gray-50 shadow-md' : ''}`}
    >
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          {activeTab === 'employees' && (
            <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600">
              <GripVertical className="w-4 h-4" />
            </div>
          )}

          <img
            src={
              activeTab === 'employees'
                ? getPhotoUrl((user as any).photo) || getDynamicAvatar((user as any).full_name || 'User', 'cold')
                : user.profile_pic || getDynamicAvatar(user.name || user.username || 'User', 'cold')
            }
            alt={activeTab === 'employees' ? (user as any).full_name : user.name}
            className="w-10 h-10 rounded-full bg-gray-100 object-cover"
          />
          <div>
            <p className="text-sm text-gray-900 font-medium">
              {activeTab === 'employees' ? ((user as any).full_name || t('no_name')) : (user.name || user.username || t('no_name'))}
            </p>
            <p className="text-xs text-gray-400">
              {activeTab === 'employees' ? ((user as any).username || '-') : `@${user.username || 'user'} `}
            </p>
          </div>
        </div>
      </td>
      {activeTab === 'clients' && (
        <td className="px-6 py-4 text-sm text-gray-900">{user.phone || '-'}</td>
      )}
      <td className="px-6 py-4 text-sm text-gray-600">{user.email || '-'}</td>
      {activeTab === 'employees' ? (
        <>
          <td className="px-6 py-4">
            <Badge className={roleConfig[(user as any).role]?.color || 'bg-gray-100 text-gray-800'}>
              {roleConfig[(user as any).role]?.label || (user as any).role}
            </Badge>
          </td>
          <td className="px-6 py-4 text-sm text-gray-900">{(user as any).position || '-'}</td>
          <td className="px-6 py-4">
            <Switch
              checked={!!(user as any).is_public_visible}
              onCheckedChange={(checked) => handleToggleVisibility(user, checked)}
              disabled={!permissions.canEditUsers}
            />
          </td>
          <td className="px-6 py-4">
            <Switch
              checked={!!(user as any).is_active}
              onCheckedChange={(checked) => handleToggleActive(user, checked)}
              disabled={!permissions.canEditUsers}
            />
          </td>
        </>
      ) : (
        <>
          <td className="px-6 py-4">
            <Badge className={
              user.status === 'new' ? 'bg-green-100 text-green-800' :
                user.status === 'active' ? 'bg-blue-100 text-blue-800' :
                  user.status === 'lead' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
            }>
              {t(`common:status_${user.status}`)}
            </Badge>
          </td>
          <td className="px-6 py-4 text-sm text-gray-900">
            {formatCurrency(user.total_spend || 0)}
          </td>
          <td className="px-6 py-4 text-sm text-gray-900">
            {user.created_at ? new Date(user.created_at).toLocaleDateString('ru-RU') : '-'}
          </td>
        </>
      )}
      <td className="px-6 py-4">
        {activeTab === 'employees' ? (
          <div className="flex items-center gap-2">
            {permissions.canEditUsers && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    const path = `/crm/users/${(user as any).id}`;
                    navigate(path);
                  }}
                  className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                  title={t('action_edit_title')}
                >
                  <Edit className="w-4 h-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setSelectedUser(user);
                    setShowScheduleDialog(true);
                  }}
                  className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                  title={t('action_manage_schedule_title')}
                >
                  <Calendar className="w-4 h-4" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setSelectedUser(user);
                    setShowPermissionsDialog(true);
                  }}
                  className="h-8 w-8 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                  title={t('action_manage_permissions_title')}
                >
                  <Key className="w-4 h-4" />
                </Button>
              </>
            )}

            {permissions.canDeleteUsers && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDeleteUser((user as any).id)}
                className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                title={t('action_delete_title')}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            {permissions.canEditUsers && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  const path = `/crm/clients/${user.instagram_id}`;
                  navigate(path);
                }}
                className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                title={t('view_details')}
              >
                <Edit className="w-4 h-4" />
              </Button>
            )}
            {permissions.canDeleteUsers && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDeleteUser(user.instagram_id)}
                className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                title={t('action_delete_title')}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        )}
      </td>
    </tr>
  );
}

export default function Users() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation(['admin/users', 'common']);
  const { formatCurrency } = useCurrency();
  const { user: currentUser } = useAuth();

  // Используем централизованную систему прав
  const permissions = usePermissions(currentUser?.role || 'employee');

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = users.findIndex((user) => user.id === active.id);
      const newIndex = users.findIndex((user) => user.id === over.id);

      const newUsers = arrayMove(users, oldIndex, newIndex);

      // Update sort order optimistically
      const updatedUsers = newUsers.map((user, index) => ({
        ...user,
        sort_order: index
      }));

      setUsers(updatedUsers);
      setFilteredUsers(updatedUsers);

      try {
        // Send updates to backend
        // Update sort_order for each user that changed position
        const updates = updatedUsers.map(async (user, index) => {
          if (users.find(u => u.id === user.id)?.sort_order !== index) {
            await api.updateUserProfile(user.id, { sort_order: index });
          }
        });

        await Promise.all(updates);

        toast.success(t('order_saved'));
      } catch (error) {
        console.error('Error saving order:', error);
        toast.error(t('error_saving_order'));
        // Revert on error would be complex here, usually just reload
        loadUsers();
      }
    }
  };

  // Цвета для ролей (статичные)
  const roleColors: Record<string, string> = {
    director: 'bg-red-100 text-red-800',
    admin: 'bg-blue-100 text-blue-800',
    manager: 'bg-blue-100 text-blue-800',
    sales: 'bg-green-100 text-green-800',
    marketer: 'bg-orange-100 text-orange-800',
    employee: 'bg-gray-100 text-gray-800',
  };

  const [searchParams, setSearchParams] = useSearchParams();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<DateFilter>('last30days');
  const [activeTab, setActiveTab] = useState<UserTab>((searchParams.get('tab') as UserTab) || 'employees');

  const handleTabChange = (tab: UserTab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Edit user dialog states
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editForm, setEditForm] = useState({ username: '', full_name: '', email: '', position: '' });
  const [savingEdit, setSavingEdit] = useState(false);

  // Permissions dialog states
  const [showPermissionsDialog, setShowPermissionsDialog] = useState(false);

  // Schedule dialog states
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);

  useEffect(() => {
    loadUsers();
  }, [activeTab, i18n.language]);


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

  // Роли для отображения в таблице (теперь просто как константы для названий)
  const roleConfig: Record<string, { label: string; color: string }> = {
    director: { label: t('role_director'), color: roleColors.director },
    admin: { label: t('role_admin'), color: roleColors.admin },
    manager: { label: t('role_manager'), color: roleColors.manager },
    sales: { label: t('role_sales'), color: roleColors.sales },
    marketer: { label: t('role_marketer'), color: roleColors.marketer },
    employee: { label: t('role_employee'), color: roleColors.employee },
  };

  useEffect(() => {
    const filtered = users.filter(user =>
      (user.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.username || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.phone || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.email || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredUsers(filtered);
  }, [searchTerm, users]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      let response;
      if (activeTab === 'employees') {
        // Загружаем сотрудников через CRM API
        response = await api.getUsers(i18n.language);
      } else {
        // Загружаем клиентов
        response = await api.getClients();
      }

      console.log(`📥 Received ${activeTab}: `, response);

      // Извлечение массива
      const dataArray = Array.isArray(response)
        ? response
        : (response?.clients || response?.users || []);

      console.log(`✅ ${activeTab} array: `, dataArray);
      setUsers(dataArray);

      if (dataArray.length === 0) {
        console.warn(`⚠️  Массив ${activeTab} пуст`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : t('error_loading_users');
      setError(message);
      toast.error(`${t('error')}: ${message} `);
      console.error(`❌ Error loading ${activeTab}: `, err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (id: number | string) => {
    if (!confirm(t('confirm_delete'))) return;

    try {
      if (activeTab === 'clients') {
        // Delete client by instagram_id
        await api.deleteClient(id as string);
        setUsers(users.filter(u => u.instagram_id !== id));
        toast.success(t('client_deleted'));
      } else {
        // Delete employee by id
        await api.deleteUser(id as number);
        setUsers(users.filter(u => u.id !== id));
        toast.success(t('user_deleted'));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : t('error_deleting_user');
      toast.error(`${t('error')}: ${message} `);
      console.error('Error deleting user/client:', err);
    }
  };

  const handleToggleVisibility = async (user: User, newValue: boolean) => {
    try {
      // Optimistic update
      setUsers(users.map(u => u.id === user.id ? { ...u, is_public_visible: newValue } : u));

      await api.updateUserProfile(user.id, { is_public_visible: newValue });
      toast.success(t('visibility_updated'));
    } catch (err) {
      // Revert on error
      setUsers(users.map(u => u.id === user.id ? { ...u, is_public_visible: !newValue } : u));
      const message = err instanceof Error ? err.message : t('error_updating_user');
      toast.error(message);
    }
  };

  const handleToggleActive = async (user: User, newValue: boolean) => {
    try {
      // Optimistic update
      setUsers(users.map(u => u.id === user.id ? { ...u, is_active: newValue } : u));

      if (newValue) {
        await api.activateUser(user.id);
        toast.success(t('user_activated'));
      } else {
        await api.deactivateUser(user.id);
        toast.success(t('user_deactivated'));
      }
    } catch (err) {
      // Revert on error
      setUsers(users.map(u => u.id === user.id ? { ...u, is_active: !newValue } : u));
      const message = err instanceof Error ? err.message : t('error_updating_user');
      toast.error(message);
    }
  };

  const getDateRange = (): DateRange => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (dateFilter) {
      case 'last7days':
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        return {
          start: sevenDaysAgo.toISOString(),
          end: now.toISOString()
        };
      case 'last30days':
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return {
          start: thirtyDaysAgo.toISOString(),
          end: now.toISOString()
        };
      case 'last90days':
        const ninetyDaysAgo = new Date(today);
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
        return {
          start: ninetyDaysAgo.toISOString(),
          end: now.toISOString()
        };
      case 'allTime':
      default:
        return {
          start: new Date(0).toISOString(),
          end: now.toISOString()
        };
    }
  };

  const dateRange = getDateRange();

  const stats = activeTab === 'employees'
    ? {
      total: users.length,
      active: users.filter((u: any) => u.is_active).length,
      serviceProviders: users.filter((u: any) => u.is_service_provider).length,
    }
    : {
      total: users.length,
      // New clients: created within the selected period
      new: users.filter(u => {
        if (!u.created_at) return false;
        const createdDate = new Date(u.created_at);
        const periodStart = new Date(dateRange.start);
        return createdDate >= periodStart;
      }).length,
      active: users.filter(u => u.status === 'active' || u.status === 'lead').length,
      totalSpend: users.reduce((sum, u) => sum + (u.total_spend || 0), 0),
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

      {/* Tabs Section */}
      <div className="mb-6 bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex gap-2">
          <button
            onClick={() => handleTabChange('employees')}
            className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'employees'
              ? 'bg-pink-600 text-white shadow-sm'
              : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              } `}
          >
            <div className="flex items-center justify-center gap-2">
              <UsersIcon className="w-4 h-4" />
              <span>{t('tab_employees')}</span>
              {activeTab === 'employees' && (
                <Badge className="bg-white/20 text-white border-0">{users.length}</Badge>
              )}
            </div>
          </button>
          <button
            onClick={() => handleTabChange('clients')}
            className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'clients'
              ? 'bg-pink-600 text-white shadow-sm'
              : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              } `}
          >
            <div className="flex items-center justify-center gap-2">
              <UsersIcon className="w-4 h-4" />
              <span>{t('tab_clients')}</span>
              {activeTab === 'clients' && (
                <Badge className="bg-white/20 text-white border-0">{users.length}</Badge>
              )}
            </div>
          </button>
        </div>
      </div>

      {/* Date Filter Section-только для клиентов */}
      {activeTab === 'clients' && (
        <div className="mb-6 bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex items-center gap-2 text-gray-700">
              <Filter className="w-5 h-5 text-gray-400" />
              <span className="font-medium text-sm">{t('period_filter')}</span>
            </div>
            <div className="w-full md:w-64">
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as DateFilter)}
                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all outline-none appearance-none cursor-pointer"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236B7280' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 12px center',
                  backgroundSize: '16px'
                }}
              >
                <option value="last7days">{t('filter_last7days', { count: 7 })}</option>
                <option value="last30days">{t('filter_last30days', { count: 30 })}</option>
                <option value="last90days">{t('filter_last90days', { count: 90 })}</option>
                <option value="allTime">{t('filter_all_time')}</option>
              </select>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <p className="text-gray-600 text-sm mb-2">
            {activeTab === 'employees' ? t('stats_total_employees') : t('stats_total')}
          </p>
          <h3 className="text-3xl text-gray-900">{stats.total}</h3>
        </div>

        {activeTab === 'employees' ? (
          <>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <p className="text-gray-600 text-sm mb-2">{t('stats_active_employees')}</p>
              <h3 className="text-3xl text-green-600">{(stats as any).active}</h3>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <p className="text-gray-600 text-sm mb-2">{t('stats_service_providers')}</p>
              <h3 className="text-3xl text-pink-600">{(stats as any).serviceProviders}</h3>
            </div>
          </>
        ) : (
          <>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <p className="text-gray-600 text-sm mb-2">{t('stats_new_clients')}</p>
              <h3 className="text-3xl text-green-600">{(stats as any).new}</h3>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <p className="text-gray-600 text-sm mb-2">{t('stats_total_spend')}</p>
              <h3 className="text-3xl text-pink-600">{formatCurrency((stats as any).totalSpend)}</h3>
            </div>
          </>
        )}
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
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="text-gray-700 hover:text-gray-900 border-gray-300"
                onClick={() => navigate('/crm/users/pending')}
              >
                <UsersIcon className="w-4 h-4 mr-2" />
                {t('pending_registrations')}
              </Button>

              <Button
                className="bg-pink-600 hover:bg-pink-700"
                onClick={() => navigate('/crm/users/create')}
              >
                <UserPlus className="w-4 h-4 mr-2" />
                {t('add_user')}
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {filteredUsers.length > 0 ? (
          <div className="overflow-x-auto">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                      {activeTab === 'employees' ? t('table_employee') : t('table_client')}
                    </th>
                    {activeTab === 'clients' && (
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">{t('table_phone')}</th>
                    )}
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">{t('table_email')}</th>
                    {activeTab === 'employees' ? (
                      <>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">{t('table_role')}</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">{t('table_position')}</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">{t('table_public')}</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">{t('table_is_active')}</th>
                      </>
                    ) : (
                      <>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">{t('table_status')}</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">{t('table_spent')}</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">{t('table_created')}</th>
                      </>
                    )}
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">{t('table_actions')}</th>
                  </tr>
                </thead>

                <SortableContext
                  items={filteredUsers.map((u) => u.id)}
                  strategy={verticalListSortingStrategy}
                  disabled={activeTab !== 'employees'} // Disable sorting for clients
                >
                  <tbody className="divide-y divide-gray-200">
                    {filteredUsers.map((user) => (
                      <SortableUserRow
                        key={(user as any).id || user.instagram_id} // Should be unique
                        user={user}
                        activeTab={activeTab}
                        roleConfig={roleConfig}
                        permissions={permissions}
                        handleToggleVisibility={handleToggleVisibility}
                        handleToggleActive={handleToggleActive}
                        handleDeleteUser={handleDeleteUser}
                        navigate={navigate}
                        t={t}
                        setSelectedUser={setSelectedUser}
                        setShowScheduleDialog={setShowScheduleDialog}
                        setShowPermissionsDialog={setShowPermissionsDialog}
                        formatCurrency={formatCurrency}
                        getPhotoUrl={getPhotoUrl} // Pass helper functions
                        getDynamicAvatar={getDynamicAvatar}
                      />
                    ))}
                  </tbody>
                </SortableContext>
              </table >
            </DndContext>
          </div >
        ) : (
          <div className="py-20 text-center text-gray-500">
            <UsersIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p>{t('no_users_found')}</p>
          </div>
        )}
      </div >

      {/* Диалог редактирования пользователя */}
      {
        showEditDialog && selectedUser && (
          <div className="crm-modal-overlay" onClick={() => setShowEditDialog(false)}>
            <div className="crm-modal max-w-md" onClick={(e) => e.stopPropagation()}>
              <div className="p-6 border-b border-gray-200 -m-6 mb-6 rounded-t-2xl">
                <h3 className="text-xl font-bold text-gray-900">
                  {t('edit_dialog_title')}: {(selectedUser as any).full_name}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {t('edit_dialog_subtitle')}
                </p>
              </div>

              <div className="crm-form-content">
                <div className="space-y-4">
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
                    <p className="text-sm text-yellow-800 flex items-center gap-1">
                      <AlertTriangle className="w-4 h-4 text-yellow-600" />
                      <strong>{t('edit_password_warning_title')}:</strong> {t('edit_password_warning_text')}
                    </p>
                  </div>
                </div>
              </div>

              <div className="crm-modal-footer mt-8 border-t pt-4">
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
                  className="flex-1 bg-pink-600 hover:bg-pink-700 text-white"
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
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200"
            onClick={() => {
              setShowPermissionsDialog(false);
              setSelectedUser(null);
              loadUsers();
            }}
          >
            <div
              className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-white flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-50 rounded-lg">
                    <Key className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 leading-tight">
                      {t('permissions_dialog_title')}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      {(selectedUser as any).full_name} • {roleConfig[(selectedUser as any).role]?.label || (selectedUser as any).role}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setShowPermissionsDialog(false);
                    setSelectedUser(null);
                    loadUsers();
                  }}
                  className="rounded-full hover:bg-gray-100 h-9 w-9"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </Button>
              </div>

              <div className="overflow-y-auto flex-1 p-2 bg-gray-50/30">
                <PermissionsTab userId={(selectedUser as any).id} />
              </div>

              <div className="p-4 border-t border-gray-100 bg-white rounded-b-2xl">
                <Button
                  onClick={() => {
                    setShowPermissionsDialog(false);
                    setSelectedUser(null);
                    loadUsers();
                  }}
                  className="w-full bg-gray-900 hover:bg-black text-white h-11"
                >
                  {t('permissions_dialog_close')}
                </Button>
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