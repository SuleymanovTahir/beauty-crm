import { useState, useEffect } from 'react';
import { Users as UsersIcon, Search, UserPlus, Edit, Trash2, Loader, AlertCircle, Shield } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { useTranslation } from 'react-i18next';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { api } from '../../services/api';

interface User {
  id: number;
  username: string;
  full_name: string;
  email: string;
  role: string;
  created_at: string;
}

export default function Users() {
  const navigate = useNavigate();
  const { t } = useTranslation(['admin/Users', 'common']);

  const roleConfig: Record<string, { label: string; color: string }> = {
    director: { label: 'Директор', color: 'bg-red-100 text-red-800' },
    admin: { label: 'Администратор', color: 'bg-purple-100 text-purple-800' },
    manager: { label: 'Менеджер', color: 'bg-blue-100 text-blue-800' },
    sales: { label: 'Продажник', color: 'bg-green-100 text-green-800' },
    marketer: { label: 'Таргетолог', color: 'bg-orange-100 text-orange-800' },
    employee: { label: 'Сотрудник', color: 'bg-gray-100 text-gray-800' },
  };

  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [availableRoles, setAvailableRoles] = useState<Array<{key: string; name: string; level: number}>>([]);
  const [savingRole, setSavingRole] = useState(false);

  useEffect(() => {
    loadUsers();
    loadAvailableRoles();
  }, []);

  const loadAvailableRoles = async () => {
    try {
      const data = await api.getRoles();
      setAvailableRoles(data.roles || []);
    } catch (err) {
      console.error('Error loading roles:', err);
    }
  };

  const getRoleDescription = (roleKey: string): string => {
    const descriptions: Record<string, string> = {
      director: 'Полный доступ ко всем функциям',
      admin: 'Управление пользователями, клиентами и записями',
      manager: 'Работа с клиентами и записями',
      sales: 'Instagram чат, статистика',
      marketer: 'Аналитика и статистика',
      employee: 'Свои записи и календарь'
    };
    return descriptions[roleKey] || 'Роль пользователя';
  };

  const handleChangeRole = async (userId: number, newRole: string) => {
    try {
      setSavingRole(true);
      await api.updateUserRole(userId, { role: newRole });
      toast.success('Роль изменена');
      setShowRoleDialog(false);
      setSelectedUser(null);
      await loadUsers();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ошибка изменения роли';
      toast.error(message);
    } finally {
      setSavingRole(false);
    }
  };

  useEffect(() => {
    const filtered = users.filter(user =>
      user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredUsers(filtered);
  }, [searchTerm, users]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getUsers();

      const usersArray = data.users || (Array.isArray(data) ? data : []);
      setUsers(usersArray);

      if (usersArray.length === 0) {
        toast.info('Пользователи не найдены');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ошибка загрузки пользователей';
      setError(message);
      toast.error(`Ошибка: ${message}`);
      console.error('Error loading users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (id: number) => {
    if (!confirm('Вы уверены, что хотите удалить этого пользователя?')) return;

    try {
      await api.deleteUser(id);
      setUsers(users.filter(u => u.id !== id));
      toast.success('Пользователь удален');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ошибка удаления пользователя';
      toast.error(`Ошибка: ${message}`);
      console.error('Error deleting user:', err);
    }
  };

  const stats = {
    total: users.length,
    directors: users.filter(u => u.role === 'director').length,
    admins: users.filter(u => u.role === 'admin').length,
    sales: users.filter(u => u.role === 'sales').length,
    employees: users.filter(u => u.role === 'employee').length,
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader className="w-8 h-8 text-pink-600 animate-spin" />
          <p className="text-gray-600">Загрузка пользователей...</p>
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
              <p className="text-red-800 font-medium">Ошибка загрузки</p>
              <p className="text-red-700 text-sm mt-1">{error}</p>
              <Button onClick={loadUsers} className="mt-4 bg-red-600 hover:bg-red-700">
                Попробовать снова
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
          Управление пользователями
        </h1>
        <p className="text-gray-600">{filteredUsers.length} пользователей</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 md:gap-6 mb-6 md:mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <p className="text-gray-600 text-sm mb-2">Всего</p>
          <h3 className="text-3xl text-gray-900">{stats.total}</h3>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <p className="text-gray-600 text-sm mb-2">Директоров</p>
          <h3 className="text-3xl text-red-600">{stats.directors}</h3>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <p className="text-gray-600 text-sm mb-2">Админов</p>
          <h3 className="text-3xl text-purple-600">{stats.admins}</h3>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <p className="text-gray-600 text-sm mb-2">Продажников</p>
          <h3 className="text-3xl text-green-600">{stats.sales}</h3>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <p className="text-gray-600 text-sm mb-2">Сотрудников</p>
          <h3 className="text-3xl text-gray-600">{stats.employees}</h3>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Поиск по имени, логину или email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button
            className="bg-pink-600 hover:bg-pink-700"
            onClick={() => navigate('/admin/users/create')}
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Добавить пользователя
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {filteredUsers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Пользователь</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Логин</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Email</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Роль</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Создан</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium">
                          {user.full_name?.charAt(0) || '?'}
                        </div>
                        <div>
                          <p className="text-sm text-gray-900 font-medium">{user.full_name}</p>
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
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {new Date(user.created_at).toLocaleDateString('ru-RU')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/admin/users/${user.id}/edit`)}
                          title="Редактировать профиль"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedUser(user);
                            setShowRoleDialog(true);
                          }}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          title="Изменить роль"
                        >
                          <Shield className="w-4 h-4" />
                        </Button>
                        
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDeleteUser(user.id)}
                          title="Удалить пользователя"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-20 text-center text-gray-500">
            <UsersIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p>Пользователи не найдены</p>
          </div>
        )}
      </div>

      {/* Диалог смены роли */}
      {showRoleDialog && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full shadow-2xl">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">
                Изменить роль: {selectedUser.full_name}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Текущая роль: {roleConfig[selectedUser.role]?.label || selectedUser.role}
              </p>
            </div>

            <div className="p-6 space-y-4">
              {availableRoles.map((role) => (
                <button
                  key={role.key}
                  onClick={() => handleChangeRole(selectedUser.id, role.key)}
                  disabled={savingRole}
                  className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                    selectedUser.role === role.key
                      ? 'border-pink-500 bg-pink-50'
                      : 'border-gray-200 hover:border-pink-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{role.name}</p>
                      <p className="text-sm text-gray-600 mt-1">
                        {getRoleDescription(role.key)}
                      </p>
                    </div>
                    {selectedUser.role === role.key && (
                      <Badge className="bg-pink-100 text-pink-800">Текущая</Badge>
                    )}
                  </div>
                </button>
              ))}
            </div>

            <div className="p-6 border-t border-gray-200">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowRoleDialog(false);
                  setSelectedUser(null);
                }} 
                className="w-full"
                disabled={savingRole}
              >
                Закрыть
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}