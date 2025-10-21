import React, { useState } from 'react';
import { User, Mail, Phone, Briefcase, Save } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { toast } from 'sonner@2.0.3';

export default function EmployeeProfile() {
  const [profileData, setProfileData] = useState({
    name: 'Анна',
    surname: 'Петрова',
    email: 'anna.petrova@luxurybeauty.ae',
    phone: '+971 50 123 4567',
    position: 'Мастер перманентного макияжа',
    experience: '8 лет'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Профиль обновлен');
  };

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
              {profileData.name.charAt(0)}
            </div>
            <h3 className="text-xl text-gray-900 mb-1">
              {profileData.name} {profileData.surname}
            </h3>
            <p className="text-gray-600 mb-2">{profileData.position}</p>
            <p className="text-sm text-gray-500">{profileData.experience} опыта</p>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <h2 className="text-2xl text-gray-900 mb-6">Личные данные</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="name">Имя</Label>
                  <Input
                    id="name"
                    value={profileData.name}
                    onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="surname">Фамилия</Label>
                  <Input
                    id="surname"
                    value={profileData.surname}
                    onChange={(e) => setProfileData({ ...profileData, surname: e.target.value })}
                  />
                </div>
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

              <div>
                <Label htmlFor="phone">Телефон</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    id="phone"
                    type="tel"
                    value={profileData.phone}
                    onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                    className="pl-10"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="position">Должность</Label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    id="position"
                    value={profileData.position}
                    onChange={(e) => setProfileData({ ...profileData, position: e.target.value })}
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
