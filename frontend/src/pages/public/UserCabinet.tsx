import React, { useState } from 'react';
import { User, Calendar, Clock, CheckCircle, XCircle, Lock } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Badge } from '../../components/ui/badge';
import { toast } from 'sonner@2.0.3';
import { useNavigate } from 'react-router-dom';

const mockBookings = [
  {
    id: 1,
    service: 'Перманентный макияж бровей',
    date: '2025-10-25',
    time: '10:00',
    status: 'confirmed',
    price: 800
  },
  {
    id: 2,
    service: 'Маникюр + Педикюр',
    date: '2025-10-20',
    time: '14:00',
    status: 'completed',
    price: 350
  },
  {
    id: 3,
    service: 'Массаж лица',
    date: '2025-10-15',
    time: '11:00',
    status: 'completed',
    price: 450
  },
];

const availableSlots = [
  { date: '2025-10-21', times: ['10:00', '12:00', '14:00', '16:00'] },
  { date: '2025-10-22', times: ['09:00', '11:00', '15:00', '17:00'] },
  { date: '2025-10-23', times: ['10:00', '13:00', '15:00', '18:00'] },
];

export default function UserCabinet() {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [registerData, setRegisterData] = useState({ name: '', email: '', phone: '', password: '' });
  const [profileData, setProfileData] = useState({
    name: 'Анна Иванова',
    email: 'anna@example.com',
    phone: '+971 50 123 4567'
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggedIn(true);
    toast.success('Вы успешно вошли в систему');
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggedIn(true);
    toast.success('Регистрация прошла успешно!');
  };

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Профиль обновлен');
  };

  const statusConfig = {
    confirmed: { label: 'Подтверждена', icon: CheckCircle, color: 'bg-green-100 text-green-800' },
    completed: { label: 'Завершена', icon: CheckCircle, color: 'bg-blue-100 text-blue-800' },
    cancelled: { label: 'Отменена', icon: XCircle, color: 'bg-red-100 text-red-800' },
  };

  // Login/Register Form
  if (!isLoggedIn) {
    return (
      <div className="py-20 bg-gray-50 min-h-screen">
        <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <User className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl text-gray-900 mb-2">Личный кабинет</h1>
            <p className="text-gray-600">Войдите или зарегистрируйтесь</p>
          </div>

          <Tabs defaultValue="login" className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="login">Вход</TabsTrigger>
              <TabsTrigger value="register">Регистрация</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-6">
                <div>
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    required
                    value={loginData.email}
                    onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                    placeholder="anna@example.com"
                  />
                </div>
                <div>
                  <Label htmlFor="login-password">Пароль</Label>
                  <Input
                    id="login-password"
                    type="password"
                    required
                    value={loginData.password}
                    onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                    placeholder="••••••"
                  />
                </div>
                <Button type="submit" className="w-full bg-gradient-to-r from-pink-500 to-purple-600">
                  <Lock className="w-4 h-4 mr-2" />
                  Войти
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-6">
                <div>
                  <Label htmlFor="register-name">Имя</Label>
                  <Input
                    id="register-name"
                    required
                    value={registerData.name}
                    onChange={(e) => setRegisterData({ ...registerData, name: e.target.value })}
                    placeholder="Анна Иванова"
                  />
                </div>
                <div>
                  <Label htmlFor="register-email">Email</Label>
                  <Input
                    id="register-email"
                    type="email"
                    required
                    value={registerData.email}
                    onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                    placeholder="anna@example.com"
                  />
                </div>
                <div>
                  <Label htmlFor="register-phone">Телефон</Label>
                  <Input
                    id="register-phone"
                    type="tel"
                    required
                    value={registerData.phone}
                    onChange={(e) => setRegisterData({ ...registerData, phone: e.target.value })}
                    placeholder="+971 50 123 4567"
                  />
                </div>
                <div>
                  <Label htmlFor="register-password">Пароль</Label>
                  <Input
                    id="register-password"
                    type="password"
                    required
                    minLength={6}
                    value={registerData.password}
                    onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                    placeholder="••••••"
                  />
                </div>
                <Button type="submit" className="w-full bg-gradient-to-r from-pink-500 to-purple-600">
                  <User className="w-4 h-4 mr-2" />
                  Зарегистрироваться
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    );
  }

  // User Cabinet
  return (
    <div className="py-20 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-4xl text-gray-900 mb-2">Личный кабинет</h1>
          <p className="text-gray-600">Управляйте своими записями и профилем</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <div className="text-center mb-6">
                <div className="w-24 h-24 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center text-white text-3xl mx-auto mb-4">
                  {profileData.name.charAt(0)}
                </div>
                <h3 className="text-xl text-gray-900 mb-1">{profileData.name}</h3>
                <p className="text-gray-600">{profileData.email}</p>
              </div>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => navigate('/')}
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Новая запись
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start text-red-600 hover:text-red-700"
                  onClick={() => setIsLoggedIn(false)}
                >
                  Выйти
                </Button>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="bookings" className="space-y-6">
              <TabsList>
                <TabsTrigger value="bookings">Мои записи</TabsTrigger>
                <TabsTrigger value="slots">Доступные слоты</TabsTrigger>
                <TabsTrigger value="profile">Профиль</TabsTrigger>
              </TabsList>

              <TabsContent value="bookings" className="space-y-4">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                  <h2 className="text-2xl text-gray-900 mb-6">История записей</h2>
                  <div className="space-y-4">
                    {mockBookings.map((booking) => {
                      const StatusIcon = statusConfig[booking.status as keyof typeof statusConfig].icon;
                      return (
                        <div key={booking.id} className="border border-gray-200 rounded-lg p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <h3 className="text-lg text-gray-900 mb-2">{booking.service}</h3>
                              <div className="flex items-center gap-4 text-gray-600">
                                <div className="flex items-center gap-2">
                                  <Calendar className="w-4 h-4" />
                                  <span>{new Date(booking.date).toLocaleDateString('ru-RU')}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Clock className="w-4 h-4" />
                                  <span>{booking.time}</span>
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <Badge className={statusConfig[booking.status as keyof typeof statusConfig].color}>
                                {statusConfig[booking.status as keyof typeof statusConfig].label}
                              </Badge>
                              <p className="text-lg text-gray-900 mt-2">{booking.price} AED</p>
                            </div>
                          </div>
                          {booking.status === 'confirmed' && (
                            <Button variant="outline" size="sm" className="text-red-600">
                              Отменить запись
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="slots">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                  <h2 className="text-2xl text-gray-900 mb-6">Доступные дни и время</h2>
                  <div className="space-y-6">
                    {availableSlots.map((slot, idx) => (
                      <div key={idx}>
                        <h3 className="text-lg text-gray-900 mb-3">
                          {new Date(slot.date).toLocaleDateString('ru-RU', { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })}
                        </h3>
                        <div className="grid grid-cols-4 gap-3">
                          {slot.times.map((time, timeIdx) => (
                            <Button
                              key={timeIdx}
                              variant="outline"
                              className="hover:bg-pink-50 hover:border-pink-300"
                              onClick={() => {
                                toast.success(`Выбрано время: ${time}`);
                                navigate('/');
                              }}
                            >
                              {time}
                            </Button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="profile">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                  <h2 className="text-2xl text-gray-900 mb-6">Редактировать профиль</h2>
                  <form onSubmit={handleUpdateProfile} className="space-y-6">
                    <div>
                      <Label htmlFor="profile-name">Имя</Label>
                      <Input
                        id="profile-name"
                        value={profileData.name}
                        onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="profile-email">Email</Label>
                      <Input
                        id="profile-email"
                        type="email"
                        value={profileData.email}
                        onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="profile-phone">Телефон</Label>
                      <Input
                        id="profile-phone"
                        type="tel"
                        value={profileData.phone}
                        onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                      />
                    </div>
                    <Button type="submit" className="bg-gradient-to-r from-pink-500 to-purple-600">
                      Сохранить изменения
                    </Button>
                  </form>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
