import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Lock,
  Mail,
  Phone,
  Calendar,
  Bell,
  Newspaper,
  LogOut,
  Eye,
  EyeOff,
  Cake,
  CheckCircle,
  XCircle,
  Clock,
  Edit,
  Trash2,
  CalendarClock
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../../components/ui/dialog';
import { Calendar as CalendarComponent } from '../../components/ui/calendar';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

interface Client {
  id: string;
  email: string;
  name: string;
  phone: string;
  birthday: string;
}

interface Booking {
  id: number;
  service_name: string;
  datetime: string;
  status: string;
  created_at: string;
  completed_at: string | null;
  revenue: number;
  notes: string | null;
}

interface TimeSlot {
  time: string;
  available: boolean;
}

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  sent_at: string;
  read_at: string | null;
  created_at: string;
}

interface News {
  id: number;
  title: string;
  content: string;
  image_url: string | null;
  published_at: string;
}

export default function ClientCabinet() {
  const navigate = useNavigate();
  const { t } = useTranslation(['public/ClientCabinet', 'common']);

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);

  // Client data
  const [client, setClient] = useState<Client | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [news, setNews] = useState<News[]>([]);

  // Forms
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [registerData, setRegisterData] = useState({
    email: '',
    password: '',
    name: '',
    phone: '',
    birthday: ''
  });

  // Reschedule booking modal
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState<Date | undefined>(undefined);
  const [rescheduleTime, setRescheduleTime] = useState<string>('');
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);

  useEffect(() => {
    // Check if already logged in
    const savedClient = localStorage.getItem('client');
    const savedToken = localStorage.getItem('client_token');
    if (savedClient && savedToken) {
      const clientData = JSON.parse(savedClient);
      setClient(clientData);
      setIsLoggedIn(true);
      fetchClientData(clientData.id);
    }
  }, []);

  const fetchClientData = async (clientId: string) => {
    try {
      // Fetch bookings
      const bookingsRes = await fetch(`/public/client/my-bookings?client_id=${clientId}`);
      const bookingsData = await bookingsRes.json();
      setBookings(bookingsData.bookings);

      // Fetch notifications
      const notifRes = await fetch(`/public/client/my-notifications?client_id=${clientId}`);
      const notifData = await notifRes.json();
      setNotifications(notifData.notifications);

      // Fetch news
      const newsRes = await fetch('/public/news?limit=10');
      const newsData = await newsRes.json();
      setNews(newsData.news);
    } catch (error) {
      console.error('Error fetching client data:', error);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginData.email || !loginData.password) {
      toast.error('Заполните все поля');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/public/client/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData)
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('client_token', data.token);
        localStorage.setItem('client', JSON.stringify(data.client));
        setClient(data.client);
        setIsLoggedIn(true);
        toast.success('Добро пожаловать!');
        fetchClientData(data.client.id);
      } else {
        toast.error('Неверный email или пароль');
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Ошибка входа');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registerData.email || !registerData.password || !registerData.name || !registerData.phone) {
      toast.error('Заполните все обязательные поля');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/public/client/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registerData)
      });

      if (response.ok) {
        toast.success('Регистрация успешна! Теперь войдите.');
        setIsRegistering(false);
        setLoginData({ email: registerData.email, password: registerData.password });
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Ошибка регистрации');
      }
    } catch (error) {
      console.error('Register error:', error);
      toast.error('Ошибка регистрации');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('client_token');
    localStorage.removeItem('client');
    setClient(null);
    setIsLoggedIn(false);
    setBookings([]);
    setNotifications([]);
    setNews([]);
    toast.success('Вы вышли из системы');
  };

  const markNotificationRead = async (notificationId: number) => {
    try {
      await fetch(`/public/client/notifications/${notificationId}/mark-read`, {
        method: 'POST'
      });
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read_at: new Date().toISOString() } : n)
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Cancel booking
  const handleCancelBooking = async (bookingId: number) => {
    if (!confirm('Вы уверены, что хотите отменить запись?')) {
      return;
    }

    try {
      const response = await fetch(`/public/client/bookings/${bookingId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        toast.success('Запись успешно отменена');
        if (client) {
          fetchClientData(client.id);
        }
      } else {
        toast.error('Ошибка отмены записи');
      }
    } catch (error) {
      console.error('Error cancelling booking:', error);
      toast.error('Ошибка отмены записи');
    }
  };

  // Open reschedule modal
  const handleOpenReschedule = (booking: Booking) => {
    setSelectedBooking(booking);
    setRescheduleDate(undefined);
    setRescheduleTime('');
    setAvailableSlots([]);
    setIsRescheduleModalOpen(true);
  };

  // Fetch available time slots when date changes
  useEffect(() => {
    if (rescheduleDate && isRescheduleModalOpen) {
      fetchAvailableSlots();
    }
  }, [rescheduleDate, isRescheduleModalOpen]);

  const fetchAvailableSlots = async () => {
    if (!rescheduleDate) return;

    try {
      const dateStr = rescheduleDate.toISOString().split('T')[0];
      const response = await fetch(`/public/available-slots?date=${dateStr}`);
      const data = await response.json();
      setAvailableSlots(data.slots || []);
    } catch (error) {
      console.error('Error fetching available slots:', error);
      toast.error('Ошибка загрузки доступных слотов');
    }
  };

  // Reschedule booking
  const handleRescheduleBooking = async () => {
    if (!selectedBooking || !rescheduleDate || !rescheduleTime) {
      toast.error('Выберите дату и время');
      return;
    }

    try {
      const dateStr = rescheduleDate.toISOString().split('T')[0];
      const newDatetime = `${dateStr} ${rescheduleTime}`;

      const response = await fetch(`/public/client/bookings/${selectedBooking.id}/reschedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_datetime: newDatetime })
      });

      if (response.ok) {
        toast.success('Запись успешно перенесена');
        setIsRescheduleModalOpen(false);
        if (client) {
          fetchClientData(client.id);
        }
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Ошибка переноса записи');
      }
    } catch (error) {
      console.error('Error rescheduling booking:', error);
      toast.error('Ошибка переноса записи');
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string; icon: any }> = {
      confirmed: { variant: 'default', label: 'Подтверждена', icon: CheckCircle },
      completed: { variant: 'outline', label: 'Завершена', icon: CheckCircle },
      cancelled: { variant: 'destructive', label: 'Отменена', icon: XCircle },
      pending: { variant: 'secondary', label: 'Ожидает', icon: Clock }
    };
    const config = variants[status] || variants.pending;
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  // Login/Register Form
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 py-20 px-4">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <User className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              {isRegistering ? 'Регистрация' : 'Личный кабинет'}
            </h1>
            <p className="text-gray-600">
              {isRegistering ? 'Создайте аккаунт' : 'Войдите в свой аккаунт'}
            </p>
          </div>

          <Card>
            <CardContent className="pt-6">
              {!isRegistering ? (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      value={loginData.email}
                      onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                      placeholder="client@example.com"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="login-password">Пароль</Label>
                    <div className="relative">
                      <Input
                        id="login-password"
                        type={showPassword ? 'text' : 'password'}
                        value={loginData.password}
                        onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                        placeholder="••••••••"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-pink-500 to-purple-600"
                  >
                    {loading ? 'Вход...' : 'Войти'}
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleRegister} className="space-y-4">
                  <div>
                    <Label htmlFor="reg-name">Имя *</Label>
                    <Input
                      id="reg-name"
                      value={registerData.name}
                      onChange={(e) => setRegisterData({ ...registerData, name: e.target.value })}
                      placeholder="Иван Иванов"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="reg-email">Email *</Label>
                    <Input
                      id="reg-email"
                      type="email"
                      value={registerData.email}
                      onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                      placeholder="client@example.com"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="reg-phone">Телефон *</Label>
                    <Input
                      id="reg-phone"
                      value={registerData.phone}
                      onChange={(e) => setRegisterData({ ...registerData, phone: e.target.value })}
                      placeholder="+971 50 123 4567"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="reg-birthday">Дата рождения</Label>
                    <Input
                      id="reg-birthday"
                      type="date"
                      value={registerData.birthday}
                      onChange={(e) => setRegisterData({ ...registerData, birthday: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="reg-password">Пароль *</Label>
                    <Input
                      id="reg-password"
                      type="password"
                      value={registerData.password}
                      onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                      placeholder="••••••••"
                      required
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-pink-500 to-purple-600"
                  >
                    {loading ? 'Регистрация...' : 'Зарегистрироваться'}
                  </Button>
                </form>
              )}

              <div className="mt-4 text-center">
                <button
                  onClick={() => setIsRegistering(!isRegistering)}
                  className="text-sm text-pink-600 hover:text-pink-700"
                >
                  {isRegistering ? 'Уже есть аккаунт? Войти' : 'Нет аккаунта? Зарегистрироваться'}
                </button>
              </div>

              <div className="mt-6">
                <Button
                  variant="outline"
                  onClick={() => navigate('/')}
                  className="w-full"
                >
                  На главную
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Client Dashboard
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                Добро пожаловать, {client?.name}!
              </h1>
              <p className="text-gray-600">Ваш личный кабинет</p>
            </div>
            <Button
              variant="outline"
              onClick={handleLogout}
              className="gap-2"
            >
              <LogOut className="w-4 h-4" />
              Выход
            </Button>
          </div>
        </div>

        <Tabs defaultValue="bookings" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
            <TabsTrigger value="bookings" className="gap-2">
              <Calendar className="w-4 h-4" />
              Мои записи
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="w-4 h-4" />
              Уведомления
              {notifications.filter(n => !n.read_at).length > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center">
                  {notifications.filter(n => !n.read_at).length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="news" className="gap-2">
              <Newspaper className="w-4 h-4" />
              Новости
            </TabsTrigger>
            <TabsTrigger value="profile" className="gap-2">
              <User className="w-4 h-4" />
              Профиль
            </TabsTrigger>
          </TabsList>

          {/* Bookings Tab */}
          <TabsContent value="bookings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>История записей</CardTitle>
                <CardDescription>Все ваши записи в салоне</CardDescription>
              </CardHeader>
              <CardContent>
                {bookings.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>У вас пока нет записей</p>
                    <Button
                      onClick={() => navigate('/booking')}
                      className="mt-4 bg-gradient-to-r from-pink-500 to-purple-600"
                    >
                      Записаться онлайн
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {bookings.map((booking) => (
                      <Card key={booking.id}>
                        <CardContent className="pt-6">
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h4 className="font-semibold text-lg">{booking.service_name}</h4>
                                {getStatusBadge(booking.status)}
                              </div>
                              <div className="space-y-1 text-sm text-gray-600">
                                <p>
                                  <Calendar className="w-4 h-4 inline mr-2" />
                                  {new Date(booking.datetime).toLocaleString('ru-RU', {
                                    dateStyle: 'long',
                                    timeStyle: 'short'
                                  })}
                                </p>
                                {booking.notes && (
                                  <p className="text-gray-500 italic">"{booking.notes}"</p>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold text-pink-600">{booking.revenue} AED</p>
                              <p className="text-xs text-gray-500">
                                Создана: {new Date(booking.created_at).toLocaleDateString('ru-RU')}
                              </p>
                            </div>
                          </div>

                          {/* Action buttons - only for confirmed or pending bookings */}
                          {(booking.status === 'confirmed' || booking.status === 'pending') && (
                            <div className="flex gap-2 pt-4 border-t">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenReschedule(booking)}
                                className="flex-1 gap-2"
                              >
                                <Edit className="w-4 h-4" />
                                Изменить время
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleCancelBooking(booking.id)}
                                className="flex-1 gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                                Отменить
                              </Button>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Уведомления</CardTitle>
                <CardDescription>Важные сообщения от салона</CardDescription>
              </CardHeader>
              <CardContent>
                {notifications.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Bell className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>У вас нет уведомлений</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {notifications.map((notification) => (
                      <Card
                        key={notification.id}
                        className={notification.read_at ? 'bg-gray-50' : 'border-pink-200 bg-pink-50'}
                        onClick={() => !notification.read_at && markNotificationRead(notification.id)}
                      >
                        <CardContent className="pt-4 cursor-pointer">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center text-white">
                              {notification.type === 'birthday' && <Cake className="w-5 h-5" />}
                              {notification.type === 'news' && <Newspaper className="w-5 h-5" />}
                              {notification.type === 'reminder' && <Bell className="w-5 h-5" />}
                              {notification.type === 'promotion' && <Bell className="w-5 h-5" />}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <h4 className="font-semibold">{notification.title}</h4>
                                {!notification.read_at && (
                                  <Badge variant="destructive">Новое</Badge>
                                )}
                              </div>
                              <p className="text-sm text-gray-600 whitespace-pre-line">{notification.message}</p>
                              <p className="text-xs text-gray-400 mt-2">
                                {new Date(notification.created_at).toLocaleString('ru-RU')}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* News Tab */}
          <TabsContent value="news" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Новости салона</CardTitle>
                <CardDescription>Последние события и акции</CardDescription>
              </CardHeader>
              <CardContent>
                {news.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Newspaper className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>Пока нет новостей</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {news.map((item) => (
                      <Card key={item.id}>
                        <CardContent className="pt-6">
                          {item.image_url && (
                            <img
                              src={item.image_url}
                              alt={item.title}
                              className="w-full h-48 object-cover rounded-lg mb-4"
                            />
                          )}
                          <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                          <p className="text-gray-600 whitespace-pre-line">{item.content}</p>
                          <p className="text-xs text-gray-400 mt-3">
                            {new Date(item.published_at).toLocaleDateString('ru-RU', {
                              dateStyle: 'long'
                            })}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Личная информация</CardTitle>
                <CardDescription>Ваши данные</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center text-white text-3xl font-bold">
                    {client?.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold">{client?.name}</h3>
                    <p className="text-gray-600">{client?.email}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Mail className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-500">Email</span>
                    </div>
                    <p className="font-medium">{client?.email}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Phone className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-500">Телефон</span>
                    </div>
                    <p className="font-medium">{client?.phone || 'Не указан'}</p>
                  </div>
                  {client?.birthday && (
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Cake className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-500">День рождения</span>
                      </div>
                      <p className="font-medium">
                        {new Date(client.birthday).toLocaleDateString('ru-RU', { dateStyle: 'long' })}
                      </p>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t">
                  <Button
                    onClick={() => navigate('/booking')}
                    className="w-full bg-gradient-to-r from-pink-500 to-purple-600"
                  >
                    Записаться онлайн
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Reschedule Booking Modal */}
        <Dialog open={isRescheduleModalOpen} onOpenChange={setIsRescheduleModalOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CalendarClock className="w-5 h-5 text-pink-600" />
                Изменить время записи
              </DialogTitle>
              <DialogDescription>
                {selectedBooking && `Услуга: ${selectedBooking.service_name}`}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Calendar */}
              <div>
                <Label className="mb-3 block">Выберите новую дату:</Label>
                <div className="flex justify-center">
                  <CalendarComponent
                    mode="single"
                    selected={rescheduleDate}
                    onSelect={setRescheduleDate}
                    disabled={(date) => date < new Date()}
                    className="rounded-md border"
                  />
                </div>
              </div>

              {/* Time slots */}
              {rescheduleDate && (
                <div>
                  <Label className="mb-3 block">
                    Доступные временные слоты на {rescheduleDate.toLocaleDateString('ru-RU')}:
                  </Label>
                  {availableSlots.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">
                      Нет доступных слотов на выбранную дату
                    </p>
                  ) : (
                    <div className="grid grid-cols-4 gap-2 max-h-64 overflow-y-auto">
                      {availableSlots.map((slot) => (
                        <Button
                          key={slot.time}
                          variant={rescheduleTime === slot.time ? 'default' : 'outline'}
                          disabled={!slot.available}
                          onClick={() => setRescheduleTime(slot.time)}
                          className={`
                            ${rescheduleTime === slot.time ? 'bg-pink-600 hover:bg-pink-700' : ''}
                            ${!slot.available ? 'opacity-50 cursor-not-allowed' : ''}
                          `}
                        >
                          {slot.time}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsRescheduleModalOpen(false)}
              >
                Отмена
              </Button>
              <Button
                onClick={handleRescheduleBooking}
                disabled={!rescheduleDate || !rescheduleTime}
                className="bg-gradient-to-r from-pink-500 to-purple-600"
              >
                Сохранить изменения
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
