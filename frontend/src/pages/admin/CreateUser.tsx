import React, { useState } from 'react';
import { UserPlus, ArrowLeft, Loader } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { useTranslation } from 'react-i18next';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { toast } from 'sonner';
import { api } from '../../services/api';
import { useTranslation } from 'react-i18next';

export default function CreateUser() {
  const navigate = useNavigate();
  const { t } = useTranslation(['createuser', 'common']);
  const [formData, setFormData] = useState({
    full_name: '',
    username: '',
    email: '',
    password: '',
    role: 'employee'
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Валидация
    if (!formData.full_name.trim()) {
      toast.error('Заполните поле "ФИ"');
      return;
    }

    if (!formData.username.trim()) {
      toast.error('Заполните поле "Логин"');
      return;
    }

    if (formData.username.length < 3) {
      toast.error('Логин должен содержать минимум 3 символа');
      return;
    }

    if (!formData.password) {
      toast.error('Заполните поле "Пароль"');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('Пароль должен содержать минимум 6 символов');
      return;
    }

    try {
      setLoading(true);

      // Используем новый API endpoint для создания пользователя
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/users`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(formData)
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Ошибка создания пользователя');
      }

      toast.success('Пользователь успешно создан!');
      navigate('/admin/users');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ошибка создания пользователя';
      toast.error(`Ошибка: ${message}`);
      console.error('Error creating user:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <Button
        variant="ghost"
        className="mb-6"
        onClick={() => navigate('/admin/users')}
        disabled={loading}
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
            <div>
              <Label htmlFor="full_name">ФИ *</Label>
              <Input
                id="full_name"
                required
                disabled={loading}
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="Анна Петрова"
              />
            </div>

            <div>
              <Label htmlFor="username">Логин *</Label>
              <Input
                id="username"
                required
                disabled={loading}
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="anna_petrova"
              />
              <p className="text-sm text-gray-500 mt-1">
                Минимум 3 символа, будет использоваться для входа в систему
              </p>
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                disabled={loading}
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
                disabled={loading}
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
              <Select 
                value={formData.role} 
                onValueChange={(value) => setFormData({ ...formData, role: value })}
                disabled={loading}
              >
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

            <Button 
              type="submit" 
              disabled={loading}
              className="w-full bg-pink-600 hover:bg-pink-700"
            >
              {loading ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  Создание...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Создать аккаунт
                </>
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}