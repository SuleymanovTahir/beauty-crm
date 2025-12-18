import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../../../../../src/contexts/AuthContext';
import { api } from '../../../../../../src/services/api';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { ru, enUS, ar } from 'date-fns/locale';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Label } from "../../components/ui/label";
import { Bell, Calendar, User, Gift, LogOut, Camera, Plus, Loader2, Info, XCircle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "../../components/ui/dialog";
import { UserBookingWizard } from '../../components/account/UserBookingWizard';

interface Booking {
  id: number;
  service_name: string;
  start_time: string;
  status: string;
  master_name?: string;
  price?: number;
  phone?: string;
}

interface Notification {
  id: number;
  title: string;
  message: string;
  created_at: string;
  read_at: string | null;
}

interface LoyaltyInfo {
  points: number;
  level: string;
  history: any[];
}

export const AccountPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation(['account', 'common']);
  const [searchParams, setSearchParams] = useSearchParams();

  const [loading, setLoading] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loyalty, setLoyalty] = useState<LoyaltyInfo>({ points: 0, level: 'Bronze', history: [] });

  const isBooking = searchParams.get('booking') === 'true';
  const openBooking = () => setSearchParams({ booking: 'true' });
  const closeBooking = () => setSearchParams({});

  // Extended user type for local use
  const currentUser = user as any;

  // Profile Form State
  const [profileForm, setProfileForm] = useState({
    name: '',
    email: '',
    phone: '',
    birth_date: '',
    new_password: '', // for changing password
    notification_preferences: { sms: true, email: true, push: true }
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Booking Actions State
  const [bookingToCancel, setBookingToCancel] = useState<number | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  // Redirect if not logged in
  useEffect(() => {
    if (!user) {
      navigate('/login');
    } else {
      // Initialize form
      setProfileForm(prev => ({
        ...prev,
        name: user.full_name || '',
        email: user.email || '',
        phone: user.phone || '',
        birth_date: currentUser.birthday || currentUser.birth_date || '',
      }));
    }
  }, [user, navigate]);

  // Load Data
  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const getDateLocale = () => {
    switch (i18n.language) {
      case 'ru': return ru;
      case 'ar': return ar;
      default: return enUS;
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Bookings
      try {
        const bookingsData = await api.getClientBookings();
        setBookings(bookingsData.bookings);
      } catch (e) {
        console.error("Bookings error", e)
      }

      // 2. Notifications
      try {
        const API_URL = import.meta.env.VITE_API_URL || '';
        const res = await fetch(`${API_URL}/api/client/my-notifications?client_id=${user?.id}`);
        if (res.ok) {
          const data = await res.json();
          setNotifications(data.notifications || []);
        }
      } catch (e) { console.error("Notifs error", e) }

      // 3. Loyalty
      try {
        const API_URL = import.meta.env.VITE_API_URL || '';
        const res = await fetch(`${API_URL}/api/client/loyalty?client_id=${user?.id}`);
        if (res.ok) {
          const data = await res.json();
          setLoyalty(data);
        }
      } catch (e) { console.error("Loyalty error", e) }

    } catch (error) {
      console.error('Error loading account data', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const API_URL = import.meta.env.VITE_API_URL || '';
      const res = await fetch(`${API_URL}/api/client/upload-avatar`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        // Update profile with new avatar URL
        await handleProfileUpdate({ avatar_url: data.url });
      }
    } catch (error) {
      console.error("Avatar upload failed", error);
    }
  };

  const handleProfileUpdate = async (updates: any = {}) => {
    try {
      const payload = {
        client_id: user?.id,
        ...profileForm,
        ...updates
      };

      if (profileForm.new_password) {
        payload.password = profileForm.new_password;
      }

      const API_URL = import.meta.env.VITE_API_URL || '';
      const res = await fetch(`${API_URL}/api/client/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        if (data.client) {
          alert("Профиль обновлен!");
          window.location.reload();
        }
      }
    } catch (error) {
      alert("Ошибка обновления профиля");
    }
  };

  if (!user) return null;

  const handleCancelClick = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setBookingToCancel(id);
  };

  const confirmCancel = async () => {
    if (!bookingToCancel) return;
    try {
      await api.cancelBooking(bookingToCancel);
      loadData(); // Refresh list
    } catch (e: any) {
      console.error(e);
      alert(e.message || "Ошибка отмены записи");
    } finally {
      setBookingToCancel(null);
    }
  };

  const handleDetailsClick = (booking: Booking) => {
    setSelectedBooking(booking);
  };

  if (isBooking) {
    return (
      <div className="min-h-screen bg-background pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <UserBookingWizard
            onClose={closeBooking}
            onSuccess={() => {
              closeBooking();
              loadData();
            }}
          />
        </div>
      </div>
    );
  }


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8">

        {/* Header Profile Card */}
        <div className="bg-card rounded-2xl shadow-sm border border-border/50 p-6 flex flex-col md:flex-row items-center gap-6 relative overflow-hidden">

          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />

          <div className="relative group">
            <Avatar className="w-24 h-24 border-4 border-background shadow-md">
              <AvatarImage src={currentUser.avatar_url || (String(user.id).startsWith('web_') ? undefined : `https://instagram.com/${user.id}/profile_pic`)} />
              <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                {user.full_name?.[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white">
              <Camera size={24} />
            </div>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleAvatarUpload} />
          </div>

          <div className="flex-1 text-center md:text-left z-10">
            <h1 className="text-3xl font-bold text-foreground mb-1">{user.full_name}</h1>
            <p className="text-muted-foreground flex items-center justify-center md:justify-start gap-2">
              {user.phone || user.email}
              {loyalty.level && <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">{loyalty.level} Member</span>}
            </p>
            <div className="mt-4 flex flex-wrap gap-2 justify-center md:justify-start">
              <div className="bg-background/80 backdrop-blur px-3 py-1 rounded-lg border border-border/50 text-sm flex items-center gap-2">
                <Gift className="w-4 h-4 text-primary" />
                <span className="font-semibold">{loyalty.points}</span> баллов
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 z-10 w-full md:w-auto">
            <Button onClick={openBooking} className="w-full md:w-auto bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20">
              <Plus className="w-4 h-4 mr-2" />
              Записаться
            </Button>
            <Button variant="outline" onClick={handleLogout} className="w-full md:w-auto text-destructive hover:text-destructive hover:bg-destructive/10 border-border">
              <LogOut className="w-4 h-4 mr-2" />
              {t('common:logout', 'Выйти')}
            </Button>
          </div>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="bookings" className="w-full">
          <TabsList className="w-full justify-start h-auto p-1 bg-muted/50 rounded-xl overflow-x-auto flex-nowrap">
            <TabsTrigger value="bookings" className="flex-1 min-w-[100px] py-3 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Calendar className="w-4 h-4 mr-2" />
              Мои записи
            </TabsTrigger>
            <TabsTrigger value="profile" className="flex-1 min-w-[100px] py-3 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <User className="w-4 h-4 mr-2" />
              Профиль
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex-1 min-w-[100px] py-3 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm relative">
              <Bell className="w-4 h-4 mr-2" />
              Уведомления
              {notifications.filter(n => !n.read_at).length > 0 && (
                <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full" />
              )}
            </TabsTrigger>
            <TabsTrigger value="bonuses" className="flex-1 min-w-[100px] py-3 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Gift className="w-4 h-4 mr-2" />
              Бонусы
            </TabsTrigger>
          </TabsList>

          <div className="mt-6">
            {/* Bookings Tab */}
            <TabsContent value="bookings" className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">История посещений</h2>
                <Button variant="link" onClick={openBooking} className="text-primary p-0">Новая запись &rarr;</Button>
              </div>
              {bookings.length > 0 ? (
                <div className="grid gap-4">
                  {bookings.map(booking => (
                    <Card key={booking.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => handleDetailsClick(booking)}>
                      <CardContent className="p-4 flex flex-col sm:flex-row justify-between gap-4">
                        <div>
                          <h3 className="font-semibold text-lg">{booking.service_name}</h3>
                          <div className="text-muted-foreground flex items-center gap-2 mt-1">
                            <Calendar className="w-4 h-4" />
                            {format(new Date(booking.start_time), "d MMMM yyyy", { locale: getDateLocale() })}
                          </div>
                          <div className="text-sm text-muted-foreground flex items-center">
                            <Bell className="w-3 h-3 mr-1" />
                            {format(new Date(booking.start_time), "HH:mm", { locale: getDateLocale() })}
                          </div>
                          <p className="text-sm mt-1">Мастер: {booking.master_name || "Не выбран"}</p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <div className="flex items-center gap-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium uppercase tracking-wider ${booking.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                              booking.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                'bg-yellow-100 text-yellow-700'
                              }`}>
                              {booking.status}
                            </span>
                          </div>
                          {(booking.status === 'pending' || booking.status === 'confirmed') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={(e) => handleCancelClick(booking.id, e)}
                            >
                              <XCircle className="w-4 h-4 mr-2" />
                              Отменить
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-muted/30 rounded-2xl border border-dashed">
                  <p className="text-muted-foreground">У вас пока нет записей</p>
                  <Button variant="outline" className="mt-4" onClick={openBooking}>Записаться</Button>
                </div>
              )}
            </TabsContent>

            {/* Profile Tab */}
            <TabsContent value="profile">
              <Card>
                <CardHeader>
                  <CardTitle>Редактирование профиля</CardTitle>
                  <CardDescription>Измените свои личные данные и настройки пароля</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Имя</Label>
                      <Input value={profileForm.name} onChange={e => setProfileForm({ ...profileForm, name: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Дата рождения</Label>
                      <Input type="date" value={profileForm.birth_date} onChange={e => setProfileForm({ ...profileForm, birth_date: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Телефон</Label>
                      <Input value={profileForm.phone} onChange={e => setProfileForm({ ...profileForm, phone: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input value={profileForm.email} onChange={e => setProfileForm({ ...profileForm, email: e.target.value })} />
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <h3 className="text-sm font-medium mb-4">Смена пароля</h3>
                    <div className="space-y-2 max-w-sm">
                      <Label>Новый пароль</Label>
                      <Input type="password" placeholder="••••••••" value={profileForm.new_password} onChange={e => setProfileForm({ ...profileForm, new_password: e.target.value })} />
                    </div>
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button onClick={() => handleProfileUpdate()} className="bg-primary text-white">Сохранить изменения</Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Notifications Tab */}
            <TabsContent value="notifications">
              <Card>
                <CardHeader>
                  <CardTitle>Уведомления</CardTitle>
                </CardHeader>
                <CardContent>
                  {notifications.length > 0 ? (
                    <div className="space-y-4">
                      {notifications.map(n => (
                        <div key={n.id} className={`p-4 rounded-lg border ${!n.read_at ? 'bg-primary/5 border-primary/20' : 'bg-card border-border'}`}>
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-medium">{n.title}</h4>
                              <p className="text-sm text-muted-foreground mt-1">{n.message}</p>
                              <span className="text-xs text-muted-foreground mt-2 block">
                                {format(new Date(n.created_at), 'd MMM HH:mm')}
                              </span>
                            </div>
                            {!n.read_at && <div className="w-2 h-2 bg-primary rounded-full" />}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">Нет новых уведомлений</div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Bonuses Tab */}
            <TabsContent value="bonuses">
              <div className="grid sm:grid-cols-2 gap-6">
                <Card className="bg-gradient-to-br from-primary/10 to-transparent border-primary/20">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Gift className="text-primary" />
                      Ваш баланс
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-bold text-primary mb-2">{loyalty.points}</div>
                    <p className="text-sm text-muted-foreground">баллов доступно для списания</p>
                    <div className="mt-4 pt-4 border-t border-primary/10">
                      <div className="flex justify-between text-sm">
                        <span>Текущий уровень</span>
                        <span className="font-medium text-foreground">{loyalty.level}</span>
                      </div>
                      <div className="w-full bg-background rounded-full h-2 mt-2">
                        <div className="bg-primary h-2 rounded-full w-2/3" />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 text-right">до уровня Gold еще 500 баллов</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>История начислений</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loyalty.history.length > 0 ? (
                      <div className="space-y-3">
                        {loyalty.history.map((h: any, i: number) => (
                          <div key={i} className="flex justify-between items-center text-sm py-2 border-b last:border-0 border-dashed">
                            <div>
                              <div className="font-medium">{h.reason}</div>
                              <div className="text-xs text-muted-foreground">{h.date}</div>
                            </div>
                            <div className={`font-mono font-medium ${h.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {h.amount > 0 ? '+' : ''}{h.amount}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-sm">История пуста</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

          </div>
        </Tabs>

      </div>

      {/* Cancel Alert Dialog */}
      <AlertDialog open={!!bookingToCancel} onOpenChange={(open) => !open && setBookingToCancel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Отменить запись?</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите отменить эту запись? Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Нет, оставить</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCancel} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Да, отменить запись
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Details Dialog */}
      <Dialog open={!!selectedBooking} onOpenChange={(open) => !open && setSelectedBooking(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Детали записи</DialogTitle>
            <DialogDescription>
              Информация о вашем визите
            </DialogDescription>
          </DialogHeader>
          {selectedBooking && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <span className="font-bold col-span-4 text-primary">{selectedBooking.service_name}</span>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="col-span-3">
                  {format(new Date(selectedBooking.start_time), "d MMMM yyyy", { locale: getDateLocale() })}
                </span>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Bell className="w-4 h-4 text-muted-foreground" />
                <span className="col-span-3">
                  {format(new Date(selectedBooking.start_time), "HH:mm", { locale: getDateLocale() })}
                </span>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <User className="w-4 h-4 text-muted-foreground" />
                <span className="col-span-3">{selectedBooking.master_name || "Мастер не выбран"}</span>
              </div>
              {selectedBooking.price && (
                <div className="grid grid-cols-4 items-center gap-4 text-muted-foreground">
                  <span className="col-span-1 text-sm">Стоимость:</span>
                  <span className="col-span-3 font-medium text-foreground">{selectedBooking.price} AED</span>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            {selectedBooking && (selectedBooking.status === 'pending' || selectedBooking.status === 'confirmed') && (
              <Button variant="destructive" onClick={() => {
                setBookingToCancel(selectedBooking.id);
                setSelectedBooking(null);
              }}>
                Отменить запись
              </Button>
            )}
            <Button variant="outline" onClick={() => setSelectedBooking(null)}>Закрыть</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
};
