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
  name?: string; // Changed from client_name to match backend
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

  // Helper functions
  const parseDate = (dateStr: string) => {
    if (!dateStr) return new Date(0);

    const cleanStr = dateStr.trim();

    // 1. Try standard Date constructor first (ISO 8601, etc.)
    const d1 = new Date(cleanStr);
    if (!isNaN(d1.getTime())) return d1;

    // 2. Handle Russian/European format: DD.MM.YYYY [HH:mm[:ss]]
    const match = cleanStr.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})(?:[, ]+\s*(\d{1,2})(?::(\d{1,2}))?(?::(\d{1,2}))?)?/);

    if (match) {
      const day = parseInt(match[1], 10);
      const month = parseInt(match[2], 10) - 1;
      const year = parseInt(match[3], 10);
      const hour = match[4] ? parseInt(match[4], 10) : 0;
      const minute = match[5] ? parseInt(match[5], 10) : 0;
      const second = match[6] ? parseInt(match[6], 10) : 0;

      const d2 = new Date(year, month, day, hour, minute, second);
      if (!isNaN(d2.getTime())) return d2;
    }

    return new Date(0);
  };

  const isSameDay = (d1: Date, d2: Date) => {
    return d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate();
  };

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
        // Фильтруем только сегодняшние записи
        // Safely parse date from various formats
        const now = new Date();

        const todayBookings = allBookings.filter((b: any) => {
          const bookingDate = parseDate(b.datetime);
          return isSameDay(bookingDate, now);
        });
        setBookings(todayBookings);

        // Вычисляем статистику
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        const weekBookings = allBookings.filter((b: any) => parseDate(b.datetime) >= weekAgo);
        const monthBookings = allBookings.filter((b: any) => parseDate(b.datetime) >= monthAgo);

        // Подсчет уникальных клиентов
        const uniqueClients = new Set(allBookings.map((b: any) => b.name || b.phone)).size;

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
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-20" />)}
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

      {/* Today's Schedule - Timeline View */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl text-gray-900 flex items-center gap-2">
            <Clock className="w-6 h-6 text-pink-600" />
            {t('dashboard:schedule_for_today')}
          </h2>
          <span className="text-sm text-gray-500">
            {confirmedCount} подтверждено, {pendingCount} ожидает
          </span>
        </div>

        {bookings.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">{t('dashboard:no_bookings_today')}</p>
            <p className="text-gray-400 text-sm mt-2">Наслаждайтесь свободным днём!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {bookings
              .sort((a, b) => parseDate(a.datetime).getTime() - parseDate(b.datetime).getTime())
              .map((booking) => {
                const bookingTime = parseDate(booking.datetime);
                const now = new Date();
                const isPast = bookingTime < now;
                const isNow = Math.abs(bookingTime.getTime() - now.getTime()) < 30 * 60 * 1000; // within 30 min

                return (
                  <div
                    key={booking.id}
                    className={`border-l-4 rounded-lg p-4 transition-all ${isNow ? 'border-pink-500 bg-pink-50' :
                      isPast ? 'border-gray-300 bg-gray-50 opacity-60' :
                        'border-purple-300 bg-white hover:bg-purple-50'
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="text-center min-w-[60px]">
                          <div className={`text-2xl font-bold ${isNow ? 'text-pink-600' : 'text-gray-900'}`}>
                            {bookingTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                          {isNow && (
                            <span className="text-xs text-pink-600 font-semibold animate-pulse">СЕЙЧАС</span>
                          )}
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-gray-900">{booking.name || 'Клиент'}</h3>
                            <Badge className={
                              booking.status === 'confirmed'
                                ? 'bg-green-100 text-green-800 text-xs'
                                : 'bg-yellow-100 text-yellow-800 text-xs'
                            }>
                              {booking.status === 'confirmed' ? '✓' : '⏱'}
                            </Badge>
                          </div>
                          <p className="text-gray-700 text-sm mb-1">{booking.service}</p>
                          <p className="text-gray-500 text-xs">{booking.phone}</p>
                        </div>
                      </div>

                      {isPast && !isNow && (
                        <CheckCircle className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}