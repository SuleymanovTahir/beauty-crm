import React, { useState } from 'react';
import { UserPlus, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { toast } from 'sonner@2.0.3';

export default function CreateUser() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    surname: '',
    username: '',
    email: '',
    password: '',
    role: 'employee'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password.length < 6) {
      toast.error('Пароль должен содержать минимум 6 символов');
      return;
    }
    
    toast.success('Пользователь успешно создан!');
    navigate('/admin/users');
  };

  return (
    <div className="p-8">
      <Button
        variant="ghost"
        className="mb-6"
        onClick={() => navigate('/admin/users')}
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Назад к пользователям
      </Button>

      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl text-gray-900 mb-2 flex items-center gap-3">
            <UserPlus className="w-8 h-8 text-pink-600" />
            Создать нового пользователя
          </h1>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <Label htmlFor="name">Имя *</Label>
                <Input
                  id="name"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Анна"
                />
              </div>
              
              <div>
                <Label htmlFor="surname">Фамилия</Label>
                <Input
                  id="surname"
                  value={formData.surname}
                  onChange={(e) => setFormData({ ...formData, surname: e.target.value })}
                  placeholder="Иванова"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="username">Логин *</Label>
              <Input
                id="username"
                required
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="anna_ivanova"
              />
              <p className="text-sm text-gray-500 mt-1">
                Будет использоваться для входа в систему
              </p>
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="anna@example.com"
              />
              <p className="text-sm text-gray-500 mt-1">
                Необязательно, для восстановления пароля
              </p>
            </div>

            <div>
              <Label htmlFor="password">Пароль *</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={6}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="••••••"
              />
              <p className="text-sm text-gray-500 mt-1">
                Минимум 6 символов
              </p>
            </div>

            <div>
              <Label htmlFor="role">Роль *</Label>
              <Select required value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="employee">Сотрудник</SelectItem>
                  <SelectItem value="manager">Менеджер</SelectItem>
                  <SelectItem value="admin">Администратор</SelectItem>
                </SelectContent>
              </Select>
              <div className="mt-2 p-4 bg-gray-50 rounded-lg text-sm text-gray-600 space-y-1">
                <p><strong>Сотрудник:</strong> базовые права - просмотр своих записей и графика</p>
                <p><strong>Менеджер:</strong> расширенные права - работа с клиентами и аналитикой</p>
                <p><strong>Администратор:</strong> полный доступ ко всем функциям системы</p>
              </div>
            </div>

            <Button type="submit" className="w-full bg-pink-600 hover:bg-pink-700">
              <UserPlus className="w-4 h-4 mr-2" />
              Создать аккаунт
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
