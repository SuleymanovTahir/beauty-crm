// frontend/src/pages/employee/Profile.tsx
// ✅ ПОЛНАЯ ВЕРСИЯ С ВСЕМИ УЛУЧШЕНИЯМИ

import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, Briefcase, Save, AlertCircle, Key, Loader, Calendar, UserIcon } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { toast } from 'sonner';
import { api } from '../../services/api';

interface UserProfile {
  id: number;
  username: string;
  full_name: string;
  email: string;
  role: string;
  created_at?: string;
  last_login?: string;
}

export default function EmployeeProfile() {
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const userId = currentUser.id;

  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Данные для редактирования профиля
  const [profileData, setProfileData] = useState({
    username: '',
    full_name: '',
    email: '',
    phone: ''
  });

  // Данные для смены пароля
  const [passwordData, setPasswordData] = useState({
    old_password: '',
    new_password: '',
    confirm_password: ''
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      
      // ✅ Используем новый API endpoint
      const data = await api.getUserProfile(userId);
      
      setUser(data);
      setProfileData({
        username: data.username || '',
        full_name: data.full_name || '',
        email: data.email || '',
        phone: ''
      });
    } catch (err) {
      console.error('Error loading profile:', err);
      toast.error('Ошибка загрузки профиля');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    // Валидация
    if (!profileData.username || profileData.username.length < 3) {
      toast.error('Логин должен быть минимум 3 символа');
      return;
    }

    if (!profileData.full_name || profileData.full_name.length < 2) {
      toast.error('Имя должно быть минимум 2 символа');
      return;
    }

    try {
      setSaving(true);
      
      // ✅ Обновляем профиль через API
      await api.updateUserProfile(userId, {
        username: profileData.username,
        full_name: profileData.full_name,
        email: profileData.email
      });
      
      // ✅ Обновляем локальное хранилище
      const updatedUser = { 
        ...currentUser, 
        username: profileData.username,
        full_name: profileData.full_name,
        email: profileData.email
      };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      // Перезагружаем профиль
      await loadProfile();
      
      toast.success('✅ Профиль успешно обновлён');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ошибка обновления';
      toast.error(`❌ ${message}`);
      console.error('Error updating profile:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    // Валидация
    if (!passwordData.old_password) {
      toast.error('Введите текущий пароль');
      return;
    }

    if (!passwordData.new_password || passwordData.new_password.length < 6) {
      toast.error('Новый пароль должен быть минимум 6 символов');
      return;
    }

    if (passwordData.new_password !== passwordData.confirm_password) {
      toast.error('Пароли не совпадают');
      return;
    }

    try {
      setSaving(true);
      
      // ✅ Меняем пароль через API
      await api.changePassword(userId, {
        old_password: passwordData.old_password,
        new_password: passwordData.new_password
      });
      
      toast.success('✅ Пароль успешно изменён');
      
      // Очищаем поля
      setPasswordData({ 
        old_password: '', 
        new_password: '', 
        confirm_password: '' 
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ошибка изменения пароля';
      toast.error(`❌ ${message}`);
      console.error('Error changing password:', err);
    } finally {
      setSaving(false);
    }
  };

  // ✅ Роли с красивыми метками
  const roleLabels: Record<string, { label: string; color: string }> = {
    admin: { label: 'Администратор', color: 'bg-purple-100 text-purple-800' },
    manager: { label: 'Менеджер', color: 'bg-blue-100 text-blue-800' },
    employee: { label: 'Сотрудник', color: 'bg-green-100 text-green-800' }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader className="w-8 h-8 text-pink-600 animate-spin" />
          <p className="text-gray-600">Загрузка профиля...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <div>
            <p className="text-red-800 font-medium">Ошибка загрузки профиля</p>
            <p className="text-red-700 text-sm mt-1">Попробуйте перезагрузить страницу</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl text-gray-900 mb-2 flex items-center gap-3">
            <User className="w-8 h-8 text-pink-600" />
            Мой профиль
          </h1>
          <p className="text-gray-600">Управление личными данными и настройками безопасности</p>
        </div>

        {/* ✅ НОВОЕ: Карточка профиля с расширенной информацией */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-start gap-6">
            <div className="w-20 h-20 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center text-white text-3xl font-bold flex-shrink-0">
              {user.full_name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <h2 className="text-2xl text-gray-900 font-bold mb-2">{user.full_name}</h2>
              <div className="flex items-center gap-3 mb-3 flex-wrap">
                <Badge className={roleLabels[user.role]?.color || 'bg-gray-100 text-gray-800'}>
                  {roleLabels[user.role]?.label || user.role}
                </Badge>
                <span className="text-sm text-gray-600">@{user.username}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-600">
                {user.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-500" />
                    {user.email}
                  </div>
                )}
                {user.created_at && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    В системе с {new Date(user.created_at).toLocaleDateString('ru-RU')}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ✅ НОВОЕ: Вкладки для разделения функционала */}
        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="profile">
              <UserIcon className="w-4 h-4 mr-2" />
              Редактировать профиль
            </TabsTrigger>
            <TabsTrigger value="password">
              <Key className="w-4 h-4 mr-2" />
              Сменить пароль
            </TabsTrigger>
          </TabsList>

          {/* ✅ Вкладка: Редактирование профиля */}
          <TabsContent value="profile">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
              <h2 className="text-xl text-gray-900 mb-6 font-semibold">Личная информация</h2>
              
              <form onSubmit={handleUpdateProfile} className="space-y-6">
                <div>
                  <Label htmlFor="username">Логин *</Label>
                  <Input
                    id="username"
                    required
                    disabled={saving}
                    value={profileData.username}
                    onChange={(e) => setProfileData({ ...profileData, username: e.target.value })}
                    placeholder="username"
                    minLength={3}
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Минимум 3 символа
                  </p>
                </div>

                <div>
                  <Label htmlFor="full_name">Полное имя *</Label>
                  <Input
                    id="full_name"
                    required
                    disabled={saving}
                    value={profileData.full_name}
                    onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })}
                    placeholder="Анна Петрова"
                    minLength={2}
                  />
                </div>

                <div>
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      disabled={saving}
                      value={profileData.email}
                      onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                      placeholder="anna@example.com"
                      className="pl-10"
                    />
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    Для восстановления пароля
                  </p>
                </div>

                <Button 
                  type="submit" 
                  disabled={saving}
                  className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
                >
                  {saving ? (
                    <>
                      <Loader className="w-4 h-4 mr-2 animate-spin" />
                      Сохранение...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Сохранить изменения
                    </>
                  )}
                </Button>
              </form>
            </div>
          </TabsContent>

          {/* ✅ НОВАЯ Вкладка: Смена пароля */}
          <TabsContent value="password">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
              <h2 className="text-xl text-gray-900 mb-6 font-semibold">Изменить пароль</h2>
              
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>💡 Совет:</strong> Используйте сложный пароль длиной минимум 6 символов. 
                  Комбинируйте буквы, цифры и специальные символы для максимальной безопасности.
                </p>
              </div>

              <form onSubmit={handleChangePassword} className="space-y-6">
                <div>
                  <Label htmlFor="old_password">Текущий пароль *</Label>
                  <Input
                    id="old_password"
                    type="password"
                    required
                    disabled={saving}
                    value={passwordData.old_password}
                    onChange={(e) => setPasswordData({ ...passwordData, old_password: e.target.value })}
                    placeholder="••••••"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Введите ваш текущий пароль для подтверждения
                  </p>
                </div>

                <div>
                  <Label htmlFor="new_password">Новый пароль *</Label>
                  <Input
                    id="new_password"
                    type="password"
                    required
                    disabled={saving}
                    value={passwordData.new_password}
                    onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                    placeholder="••••••"
                    minLength={6}
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Минимум 6 символов
                  </p>
                </div>

                <div>
                  <Label htmlFor="confirm_password">Подтвердите новый пароль *</Label>
                  <Input
                    id="confirm_password"
                    type="password"
                    required
                    disabled={saving}
                    value={passwordData.confirm_password}
                    onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                    placeholder="••••••"
                    minLength={6}
                  />
                </div>

                <Button 
                  type="submit" 
                  disabled={saving}
                  className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
                >
                  {saving ? (
                    <>
                      <Loader className="w-4 h-4 mr-2 animate-spin" />
                      Изменение...
                    </>
                  ) : (
                    <>
                      <Key className="w-4 h-4 mr-2" />
                      Изменить пароль
                    </>
                  )}
                </Button>
              </form>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}