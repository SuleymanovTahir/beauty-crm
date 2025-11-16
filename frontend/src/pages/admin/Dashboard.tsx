//src/pages/Dashboard.tsx
import { useEffect, useState } from 'react';
import { Calendar, Users, TrendingUp, DollarSign, CheckCircle, Loader, AlertCircle } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { api } from '../../services/api';

interface Stats {
  total_clients: number;
  total_bookings: number;
  completed_bookings: number;
  pending_bookings: number;
  total_revenue: number;
  conversion_rate: number;
  new_clients: number;
  leads: number;
  customers: number;
  total_client_messages: number;
  total_bot_messages: number;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { t } = useTranslation(['admin/Dashboard', 'common']);
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentBookings, setRecentBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // ✅ Загружаем реальные данные
      const [statsData, bookingsData] = await Promise.all([
        api.getStats(),
        api.getBookings(),
      ]);

      setStats(statsData);

      // Берём последние 3 записи
      if (bookingsData.bookings) {
        setRecentBookings(bookingsData.bookings.slice(0, 3));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ошибка загрузки';
      setError(message);
      toast.error(`Ошибка: ${message}`);
      console.error('Error loading dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader className="w-8 h-8 text-pink-600 animate-spin" />
          <p className="text-gray-600">{t('dashboard:loading_data')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-800 font-medium">{t('dashboard:error_loading')}</p>
              <p className="text-red-700 text-sm mt-1">{error}</p>
              <Button onClick={loadDashboardData} className="mt-4 bg-red-600 hover:bg-red-700">
                {t('dashboard:try_again')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">{t('dashboard:no_data')}</p>
        </div>
      </div>
    );
  }

  // ✅ Используем реальные данные из stats
  const stat_cards = [
    {
      icon: Calendar,
      label: t('dashboard:pending_bookings'),
      value: stats.pending_bookings || 0,
      color: 'text-pink-600',
      bg: 'bg-pink-50'
    },
    {
      icon: Users,
      label: t('dashboard:new_clients'),
      value: stats.new_clients || 0,
      color: 'text-purple-600',
      bg: 'bg-purple-50'
    },
    {
      icon: DollarSign,
      label: t('dashboard:total_revenue'),
      value: `${(stats.total_revenue || 0).toFixed(0)} AED`,
      color: 'text-green-600',
      bg: 'bg-green-50'
    },
    {
      icon: TrendingUp,
      label: t('dashboard:conversion_rate'),
      value: `${(stats.conversion_rate || 0).toFixed(1)}%`,
      color: 'text-blue-600',
      bg: 'bg-blue-50'
    },
  ];

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { text: string; bg: string; color: string }> = {
      pending: { text: t('dashboard:status_pending'), bg: 'bg-yellow-100', color: 'text-yellow-800' },
      confirmed: { text: t('dashboard:status_confirmed'), bg: 'bg-green-100', color: 'text-green-800' },
      completed: { text: t('dashboard:status_completed'), bg: 'bg-blue-100', color: 'text-blue-800' },
      cancelled: { text: t('dashboard:status_cancelled'), bg: 'bg-red-100', color: 'text-red-800' },
    };
    return badges[status] || { text: status, bg: 'bg-gray-100', color: 'text-gray-800' };
  };

  return (
    <div className="p-8">
      <div className="mb-8">
      <h1 className="text-3xl text-gray-900 mb-2">{t('dashboard:title')}</h1>
      <p className="text-gray-600">{t('dashboard:welcome')}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
        {stat_cards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3 md:mb-4">
                <div className={`w-10 h-10 md:w-12 md:h-12 ${stat.bg} rounded-lg flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 md:w-6 md:h-6 ${stat.color}`} />
                </div>
              </div>
              <h3 className="text-xl md:text-2xl text-gray-900 mb-1 md:mb-2 truncate">
                {stat.value}
              </h3>
              <p className="text-xs md:text-sm text-gray-600">{stat.label}</p>
            </div>
          );
        })}
      </div>

      {/* Content Grid - 1 колонка на мобильных */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 md:mb-8">
        {/* Recent Bookings */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl text-gray-900">{t('dashboard:recent_bookings')}</h2>
            <Button variant="outline" size="sm" onClick={() => navigate('/admin/bookings')}>
              {t('dashboard:all_bookings')}
            </Button>
          </div>
          <div className="space-y-4">
            {recentBookings.length > 0 ? (
              recentBookings.map((booking) => {
                const badge = getStatusBadge(booking.status);
                return (
                  <div
                    key={booking.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                    onClick={() => navigate(`/admin/bookings/${booking.id}`)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-pink-100 rounded-full flex items-center justify-center text-pink-600 font-bold">
                        {booking.name?.charAt(0) || t('dashboard:default_initials')}
                      </div>
                      <div>
                        <p className="text-sm text-gray-900">{booking.name || t('dashboard:unknown_name')}</p>
                        <p className="text-xs text-gray-500">{booking.service || t('dashboard:no_service')}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-900">
                        {new Date(booking.datetime).toLocaleTimeString('ru-RU', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                      <span className={`text-xs px-2 py-1 rounded ${badge.bg} ${badge.color}`}>
                        {badge.text}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>{t('dashboard:no_bookings')}</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl text-gray-900 mb-6">{t('dashboard:quick_actions')}</h2>
          <div className="space-y-3">
            <Button
              className="w-full justify-start bg-pink-600 hover:bg-pink-700"
              onClick={() => navigate('/admin/bookings')}
            >
              <Calendar className="w-4 h-4 mr-2" />
              {t('dashboard:create_booking')}
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => navigate('/admin/clients')}
            >
              <Users className="w-4 h-4 mr-2" />
              {t('dashboard:add_client')}
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => navigate('/admin/users/create')}
            >
              <Users className="w-4 h-4 mr-2" />
              {t('dashboard:create_user')}
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => navigate('/admin/analytics')}
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              {t('dashboard:view_analytics')}
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => navigate('/admin/calendar')}
            >
              <Calendar className="w-4 h-4 mr-2" />
              {t('dashboard:calendar')}
            </Button>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm mb-1">{t('dashboard:total_clients')}</p>
              <p className="text-3xl text-gray-900 font-bold">{stats.total_clients}</p>
              <p className="text-xs text-green-600 mt-1">+{stats.new_clients} {t('dashboard:new_clients')}</p>
            </div>
            <Users className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm mb-1">{t('dashboard:total_bookings')}</p>
              <p className="text-3xl text-gray-900 font-bold">{stats.total_bookings}</p>
              <p className="text-xs text-green-600 mt-1">{stats.completed_bookings} {t('dashboard:completed_bookings')}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm mb-1">{t('dashboard:total_messages')}</p>
              <p className="text-3xl text-gray-900 font-bold">
                {(stats.total_client_messages || 0) + (stats.total_bot_messages || 0)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {t('dashboard:client_messages')} {stats.total_client_messages || 0} | {t('dashboard:bot_messages')} {stats.total_bot_messages || 0}
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-purple-600" />
          </div>
        </div>
      </div>
    </div>
  );
}