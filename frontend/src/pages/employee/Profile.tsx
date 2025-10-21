import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, Briefcase, Save, AlertCircle } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { toast } from 'sonner@2.0.3';

interface UserProfile {
  id: number;
  username: string;
  full_name: string;
  email: string;
  role: string;
}

export default function EmployeeProfile() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState({
    full_name: '',
    email: '',
    phone: ''
  });

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/dashboard', {
          credentials: 'include'
        });
        if (!response.ok) throw new Error('Failed to fetch user');
        const data = await response.json();
        // Из session получаем информацию пользователя
        if (data.user) {
          setUser(data.user);
          setProfileData({
            full_name: data.user.full_name || '',
            email: data.user.email || '',
            phone: ''
          });
        }
      } catch (err) {
        toast.error('Ошибка загрузки профиля');
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/profile/update', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData)
      });
      if (response.ok) {
        toast.success('Профиль обновлен');
      }
    } catch (err) {
      toast.error('Ошибка обновления профиля');
    }
  };

  if (loading) {
    return <div className="p-8">Загрузка...</div>;
  }

  if (!user) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <span className="text-red-800">Ошибка загрузки профиля</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl text-gray-900 mb-2 flex items-center gap-3">
          <User className="w-8 h-8 text-pink-600" />
          Мой профиль
        </h1>
        <p className="text-gray-600">Управление личными данными</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center">
            <div className="w-24 h-24 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center text-white text-3xl mx-auto mb-4">
              {user.full_name.charAt(0)}
            </div>
            <h3 className="text-xl text-gray-900 mb-1">{user.full_name}</h3>
            <p className="text-gray-600 mb-2">{user.role === 'admin' ? 'Администратор' : 'Сотрудник'}</p>
            <p className="text-sm text-gray-500">@{user.username}</p>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <h2 className="text-2xl text-gray-900 mb-6">Личные данные</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="full_name">Полное имя</Label>
                <Input
                  id="full_name"
                  value={profileData.full_name}
                  onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    value={profileData.email}
                    onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                    className="pl-10"
                  />
                </div>
              </div>

              <Button type="submit" className="bg-gradient-to-r from-pink-500 to-purple-600">
                <Save className="w-4 h-4 mr-2" />
                Сохранить изменения
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}