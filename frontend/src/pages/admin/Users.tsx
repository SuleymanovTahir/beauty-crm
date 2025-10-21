import React, { useState } from 'react';
import { Users as UsersIcon, Search, UserPlus, Edit, Trash2 } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner@2.0.3';

const mockUsers = [
  {
    id: 1,
    name: 'Анна',
    surname: 'Петрова',
    username: 'anna_petrova',
    email: 'anna@luxurybeauty.ae',
    role: 'admin',
    status: 'active',
    createdAt: '2025-01-15'
  },
  {
    id: 2,
    name: 'Мария',
    surname: 'Иванова',
    username: 'maria_ivanova',
    email: 'maria@luxurybeauty.ae',
    role: 'employee',
    status: 'active',
    createdAt: '2025-02-20'
  },
  {
    id: 3,
    name: 'Елена',
    surname: 'Сидорова',
    username: 'elena_sidorova',
    email: 'elena@luxurybeauty.ae',
    role: 'manager',
    status: 'active',
    createdAt: '2025-03-10'
  },
];

export default function Users() {
  const navigate = useNavigate();
  const [users, setUsers] = useState(mockUsers);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.surname.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const roleConfig = {
    admin: { label: 'Администратор', color: 'bg-purple-100 text-purple-800' },
    manager: { label: 'Менеджер', color: 'bg-blue-100 text-blue-800' },
    employee: { label: 'Сотрудник', color: 'bg-green-100 text-green-800' },
  };

  const handleDeleteUser = (id: number) => {
    if (confirm('Вы уверены, что хотите удалить этого пользователя?')) {
      setUsers(users.filter(u => u.id !== id));
      toast.success('Пользователь удален');
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl text-gray-900 mb-2 flex items-center gap-3">
          <UsersIcon className="w-8 h-8 text-pink-600" />
          Управление пользователями
        </h1>
        <p className="text-gray-600">{filteredUsers.length} пользователей</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <p className="text-gray-500 text-sm mb-2">Всего пользователей</p>
          <h3 className="text-3xl text-gray-900">{users.length}</h3>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <p className="text-gray-500 text-sm mb-2">Администраторов</p>
          <h3 className="text-3xl text-purple-600">
            {users.filter(u => u.role === 'admin').length}
          </h3>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <p className="text-gray-500 text-sm mb-2">Сотрудников</p>
          <h3 className="text-3xl text-green-600">
            {users.filter(u => u.role === 'employee').length}
          </h3>
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
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm text-gray-600">Пользователь</th>
                <th className="px-6 py-4 text-left text-sm text-gray-600">Логин</th>
                <th className="px-6 py-4 text-left text-sm text-gray-600">Email</th>
                <th className="px-6 py-4 text-left text-sm text-gray-600">Роль</th>
                <th className="px-6 py-4 text-left text-sm text-gray-600">Создан</th>
                <th className="px-6 py-4 text-left text-sm text-gray-600">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center text-white">
                        {user.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm text-gray-900">{user.name} {user.surname}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{user.username}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{user.email}</td>
                  <td className="px-6 py-4">
                    <Badge className={roleConfig[user.role as keyof typeof roleConfig].color}>
                      {roleConfig[user.role as keyof typeof roleConfig].label}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {new Date(user.createdAt).toLocaleDateString('ru-RU')}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="text-red-600 hover:text-red-700"
                        onClick={() => handleDeleteUser(user.id)}
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
      </div>
    </div>
  );
}
