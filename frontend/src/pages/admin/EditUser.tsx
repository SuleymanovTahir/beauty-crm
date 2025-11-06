// frontend/src/pages/admin/EditUser.tsx
import React, { useState, useEffect } from 'react';
import { UserCog, ArrowLeft, Loader, Key, User as UserIcon } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { useTranslation } from 'react-i18next';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { toast } from 'sonner';
import { api } from '../../services/api';

export default function EditUser() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const userId = parseInt(id || '0');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [profileData, setProfileData] = useState({
    username: '',
    full_name: '',
    email: ''
  });

  const [passwordData, setPasswordData] = useState({
    new_password: '',
    confirm_password: ''
  });

  useEffect(() => {
    loadUserProfile();
  }, [userId]);

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      const data = await api.getUserProfile(userId);
      setProfileData({
        username: data.username,
        full_name: data.full_name,
        email: data.email || ''
      });
    } catch (err) {
      toast.error('Ошибка загрузки профиля');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();

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
      await api.updateUserProfile(userId, profileData);
      toast.success('✅ Профиль обновлён');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ошибка обновления';
      toast.error(`❌ ${message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!passwordData.new_password || passwordData.new_password.length < 6) {
      toast.error('Пароль должен быть минимум 6 символов');
      return;
    }

    if (passwordData.new_password !== passwordData.confirm_password) {
      toast.error('Пароли не совпадают');
      return;
    }

    try {
      setSaving(true);
      await api.changePassword(userId, {
        new_password: passwordData.new_password
      });
      toast.success('✅ Пароль изменён');
      setPasswordData({ new_password: '', confirm_password: '' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ошибка изменения пароля';
      toast.error(`❌ ${message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-screen">
        <Loader className="w-8 h-8 text-pink-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8">
      <Button
        variant="ghost"
        className="mb-6"
        onClick={() => navigate('/admin/users')}
        disabled={saving}
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Назад к пользователям
      </Button>

      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl text-gray-900 mb-2 flex items-center gap-3">
            <UserCog className="w-8 h-8 text-pink-600" />
            Редактировать пользователя
          </h1>
          <p className="text-gray-600">{profileData.full_name}</p>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="profile">
              <UserIcon className="w-4 h-4 mr-2" />
              Профиль
            </TabsTrigger>
            <TabsTrigger value="password">
              <Key className="w-4 h-4 mr-2" />
              Пароль
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
              <h2 className="text-xl text-gray-900 mb-6 font-semibold">Основная информация</h2>
              
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
                  <Input
                    id="email"
                    type="email"
                    disabled={saving}
                    value={profileData.email}
                    onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                    placeholder="anna@example.com"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Для восстановления пароля
                  </p>
                </div>

                <Button 
                  type="submit" 
                  disabled={saving}
                  className="w-full bg-pink-600 hover:bg-pink-700"
                >
                  {saving ? (
                    <>
                      <Loader className="w-4 h-4 mr-2 animate-spin" />
                      Сохранение...
                    </>
                  ) : (
                    'Сохранить изменения'
                  )}
                </Button>
              </form>
            </div>
          </TabsContent>

          <TabsContent value="password">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
              <h2 className="text-xl text-gray-900 mb-6 font-semibold">Изменить пароль</h2>
              
              <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>⚠️ Важно:</strong> Администратор может изменить пароль без знания текущего. 
                  После изменения пользователь должен войти с новым паролем.
                </p>
              </div>

              <form onSubmit={handleChangePassword} className="space-y-6">
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
                  <Label htmlFor="confirm_password">Подтвердите пароль *</Label>
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
                  className="w-full bg-pink-600 hover:bg-pink-700"
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