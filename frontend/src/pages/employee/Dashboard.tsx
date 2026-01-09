// /frontend/src/pages/employee/Dashboard.tsx
import { useEffect, useState } from 'react';
import { Clock, AlertCircle, Calendar, TrendingUp, Users, CheckCircle, DollarSign, Star } from 'lucide-react';
import { Badge } from '../../components/ui/badge';
import { Skeleton } from '../../components/ui/skeleton';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

interface Booking {
  id: number;
  service: string;
  datetime: string;
  status: string;
  phone: string;
  client_name?: string;
}

interface Stats {
  today_bookings: number;
  week_bookings: number;
  month_bookings: number;
  total_revenue: number;
  avg_rating: number;
  total_clients: number;
}

export default function EmployeeDashboard() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const { t } = useTranslation(['employee/Dashboard', 'common']);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/bookings', {
          credentials: 'include',
        });
        if (!response.ok) throw new Error(t('dashboard:failed_to_fetch_bookings'));
        const data = await response.json();
        const allBookings = data.bookings || [];

        // Фильтруем только сегодняшние записи
        const today = new Date().toISOString().split('T')[0];
        const todayBookings = allBookings.filter((b: any) => b.datetime.startsWith(today));
        setBookings(todayBookings);

        // Вычисляем статистику
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        const weekBookings = allBookings.filter((b: any) => new Date(b.datetime) >= weekAgo);
        const monthBookings = allBookings.filter((b: any) => new Date(b.datetime) >= monthAgo);

        // Подсчет уникальных клиентов
        const uniqueClients = new Set(allBookings.map((b: any) => b.client_name || b.phone)).size;

        setStats({
          today_bookings: todayBookings.length,
          week_bookings: weekBookings.length,
          month_bookings: monthBookings.length,
          total_revenue: monthBookings.reduce((sum: number, b: any) => sum + (b.price || 0), 0),
          avg_rating: 4.8, // Placeholder - можно получить из API
          total_clients: uniqueClients
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : t('dashboard:unknown_error'));
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="p-8">
        <div className="mb-8">
          <Skeleton className="h-10 w-32 mb-2" />
          <Skeleton className="h-6 w-48" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {[1,2,3].map(i => <Skeleton key={i} className="h-20" />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <span className="text-red-800">{t('dashboard:loading_error')}: {error}</span>
        </div>
      </div>
    );
  }

  const confirmedCount = bookings.filter(b => b.status === 'confirmed').length;
  const pendingCount = bookings.filter(b => b.status === 'pending').length;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl text-gray-900 mb-2 flex items-center gap-3">
          <Calendar className="w-8 h-8 text-pink-600" />
          Мой дашборд
        </h1>
        <p className="text-gray-600">{t('dashboard:today')}, {new Date().toLocaleDateString('ru-RU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <div className="bg-gradient-to-br from-pink-500 to-pink-600 p-6 rounded-xl shadow-lg text-white">
          <div className="flex items-center justify-between mb-2">
            <Clock className="w-8 h-8 opacity-80" />
          </div>
          <p className="text-pink-100 text-sm mb-1">Сегодня</p>
          <h3 className="text-3xl font-bold">{stats?.today_bookings || 0}</h3>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-6 rounded-xl shadow-lg text-white">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-8 h-8 opacity-80" />
          </div>
          <p className="text-purple-100 text-sm mb-1">За неделю</p>
          <h3 className="text-3xl font-bold">{stats?.week_bookings || 0}</h3>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-xl shadow-lg text-white">
          <div className="flex items-center justify-between mb-2">
            <Calendar className="w-8 h-8 opacity-80" />
          </div>
          <p className="text-blue-100 text-sm mb-1">За месяц</p>
          <h3 className="text-3xl font-bold">{stats?.month_bookings || 0}</h3>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 p-6 rounded-xl shadow-lg text-white">
          <div className="flex items-center justify-between mb-2">
            <Users className="w-8 h-8 opacity-80" />
          </div>
          <p className="text-green-100 text-sm mb-1">Клиентов</p>
          <h3 className="text-3xl font-bold">{stats?.total_clients || 0}</h3>
        </div>

        <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 p-6 rounded-xl shadow-lg text-white">
          <div className="flex items-center justify-between mb-2">
            <Star className="w-8 h-8 opacity-80" />
          </div>
          <p className="text-yellow-100 text-sm mb-1">Рейтинг</p>
          <h3 className="text-3xl font-bold">{stats?.avg_rating || 0}</h3>
        </div>

        <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 p-6 rounded-xl shadow-lg text-white">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="w-8 h-8 opacity-80" />
          </div>
          <p className="text-indigo-100 text-sm mb-1">Доход (мес)</p>
          <h3 className="text-3xl font-bold">{stats?.total_revenue || 0}</h3>
        </div>
      </div>

      {/* Быстрые действия */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <button
          onClick={() => navigate('/employee/bookings')}
          className="bg-white p-6 rounded-xl shadow-sm border-2 border-gray-200 hover:border-pink-500 transition-all group"
        >
          <Calendar className="w-8 h-8 text-pink-600 mb-3 group-hover:scale-110 transition-transform" />
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Все записи</h3>
          <p className="text-gray-600 text-sm">Просмотр всех записей с фильтрами</p>
        </button>

        <button
          onClick={() => navigate('/employee/services')}
          className="bg-white p-6 rounded-xl shadow-sm border-2 border-gray-200 hover:border-purple-500 transition-all group"
        >
          <CheckCircle className="w-8 h-8 text-purple-600 mb-3 group-hover:scale-110 transition-transform" />
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Услуги</h3>
          <p className="text-gray-600 text-sm">Мои услуги и прайс-лист</p>
        </button>

        <button
          onClick={() => navigate('/employee/profile')}
          className="bg-white p-6 rounded-xl shadow-sm border-2 border-gray-200 hover:border-blue-500 transition-all group"
        >
          <Users className="w-8 h-8 text-blue-600 mb-3 group-hover:scale-110 transition-transform" />
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Профиль</h3>
          <p className="text-gray-600 text-sm">Редактировать мой профиль</p>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl text-gray-900 mb-6">{t('dashboard:schedule_for_today')}</h2>
        {bookings.length === 0 ? (
          <p className="text-gray-500">{t('dashboard:no_bookings_today')}</p>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => (
              <div key={booking.id} className="border border-gray-200 rounded-lg p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center">
                      <Clock className="w-6 h-6 text-pink-600" />
                    </div>
                    <div>
                      <p className="text-lg text-gray-900 mb-1">{booking.datetime.split(' ')[1]}</p>
                      <p className="text-gray-900">{t('dashboard:booking')} #{booking.id}</p>
                      <p className="text-gray-600 text-sm">{booking.service}</p>
                      <p className="text-gray-600 text-sm">{booking.phone}</p>
                    </div>
                  </div>
                  <Badge className={
                    booking.status === 'confirmed' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }>
                    {booking.status === 'confirmed' ? t('dashboard:confirmed') : t('dashboard:pending')}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}