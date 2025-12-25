// /frontend/src/pages/admin/Dashboard.tsx
//src/pages/Dashboard.tsx
import { useEffect, useState } from 'react';
import { Users, Loader, AlertCircle, Crown, UserPlus, UserCheck, TrendingUp, Calendar, CheckCircle } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { api } from '../../services/api';
import { getDynamicAvatar } from '../../utils/avatarUtils';

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
  vip_clients: number;
  active_clients: number;
  growth?: {
    total_clients: { percentage: number; trend: 'up' | 'down' | 'stable' };
    vip_clients: { percentage: number; trend: 'up' | 'down' | 'stable' };
    new_clients: { percentage: number; trend: 'up' | 'down' | 'stable' };
    active_clients: { percentage: number; trend: 'up' | 'down' | 'stable' };
    revenue: { percentage: number; trend: 'up' | 'down' | 'stable' };
    pending_bookings: { percentage: number; trend: 'up' | 'down' | 'stable' };
  };
  comparison_context?: string;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation(['admin/dashboard', 'common']);
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentBookings, setRecentBookings] = useState<any[]>([]);
  const [botAnalytics, setBotAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load real data
      const [statsData, bookingsData, clientsData, botData] = await Promise.all([
        api.getStats(),
        api.getBookings(),
        api.getClients(),
        api.get('/api/bot-analytics?days=30').catch(() => null),
      ]);

      setStats(statsData);
      if (botData) setBotAnalytics(botData);

      // Take last 3 bookings and enrich with client data
      if (bookingsData.bookings) {
        const enrichedBookings = bookingsData.bookings.slice(0, 3).map((booking: any) => {
          // Try to find client by client_id first, then by instagram_id
          const client = clientsData.clients?.find((c: any) =>
            c.id === booking.client_id || c.instagram_id === booking.instagram_id
          );
          return {
            ...booking,
            profile_pic: client?.profile_pic,
            gender: client?.gender
          };
        });
        setRecentBookings(enrichedBookings);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : t('dashboard:error_loading');
      setError(message);
      toast.error(t('dashboard:errors.loading', { message }));
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

  // Use real data from stats with growth indicators
  const stat_cards = [
    {
      icon: Users,
      label: t('dashboard:total_clients'),
      value: stats.total_clients || 0,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      growth: stats.growth?.total_clients
    },
    {
      icon: Crown,
      label: t('dashboard:vip_clients'),
      value: stats.vip_clients || 0,
      color: 'text-yellow-600',
      bg: 'bg-yellow-50',
      growth: stats.growth?.vip_clients
    },
    {
      icon: UserPlus,
      label: t('dashboard:new_clients'),
      value: stats.new_clients || 0,
      color: 'text-green-600',
      bg: 'bg-green-50',
      growth: stats.growth?.new_clients
    },
    {
      icon: UserCheck,
      label: t('dashboard:active_clients'),
      value: stats.active_clients || 0,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      growth: stats.growth?.active_clients
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
    <div className="p-4 md:p-8">
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl text-gray-900 mb-2">{t('dashboard:title')}</h1>
        <p className="text-sm md:text-base text-gray-600">{t('dashboard:welcome')}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
        {stat_cards.map((stat, index) => (
          <div
            key={index}
            className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-xs md:text-sm text-gray-600 mb-2">{stat.label}</p>
                <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">
                  {stat.value}
                </h3>

                {/* Growth Indicator */}
                {stat.growth && (
                  <div className={`flex items-center gap-1 text-xs ${stat.growth.trend === 'up' ? 'text-green-600' :
                    stat.growth.trend === 'down' ? 'text-red-600' :
                      'text-gray-500'
                    }`}>
                    {stat.growth.trend === 'up' && <TrendingUp className="w-4 h-4" />}
                    {stat.growth.trend === 'down' && <TrendingUp className="w-4 h-4 rotate-180" />}
                    {stat.growth.trend === 'stable' && <span className="w-4 h-4">—</span>}
                    <span className="font-medium">
                      {stat.growth.percentage > 0 ? '+' : ''}{stat.growth.percentage}%
                    </span>
                    {stats.comparison_context && (
                      <span className="text-gray-500 ml-1">{stats.comparison_context}</span>
                    )}
                  </div>
                )}
              </div>
              <div className={`w-12 h-12 md:w-14 md:h-14 ${stat.bg} rounded-full flex items-center justify-center flex-shrink-0`}>
                <stat.icon className={`w-6 h-6 md:w-7 md:h-7 ${stat.color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>


      {/* Content Grid - 1 колонка на мобильных */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 md:mb-8">
        {/* Recent Bookings */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg md:text-xl text-gray-900">{t('dashboard:recent_bookings')}</h2>
            <Button variant="outline" size="sm" onClick={() => navigate('/admin/bookings')} className="shrink-0">
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
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer gap-3"
                    onClick={() => navigate(`/admin/bookings/${booking.id}`)}
                  >
                    <div className="flex items-center gap-3">
                      {(() => {
                        const profilePic = booking.profile_pic;
                        const clientName = booking.name || 'N';

                        return (
                          <>
                            {profilePic && profilePic.trim() !== '' ? (
                              <img
                                src={`/api/proxy/image?url=${encodeURIComponent(profilePic)}`}
                                alt={clientName}
                                className="w-10 h-10 rounded-full object-cover flex-shrink-0 border-2 border-white shadow-sm"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                                  if (fallback) fallback.style.display = 'flex';
                                }}
                              />
                            ) : null}
                            <img
                              src={getDynamicAvatar(clientName, 'cold', booking.gender)}
                              alt={clientName}
                              className="w-10 h-10 rounded-full object-cover flex-shrink-0 bg-gray-100"
                              style={{ display: profilePic && profilePic.trim() !== '' ? 'none' : 'block' }}
                            />
                          </>
                        );
                      })()}
                      <div className="min-w-0">
                        <p className="text-sm text-gray-900 truncate">{booking.name || t('dashboard:unknown_name')}</p>
                        <p className="text-xs text-gray-500 truncate">{booking.service || t('dashboard:no_service')}</p>
                      </div>
                    </div>
                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 sm:gap-0 w-full sm:w-auto mt-2 sm:mt-0 pl-13 sm:pl-0">
                      <p className="text-sm text-gray-900">
                        {new Date(booking.datetime).toLocaleTimeString(i18n.language, {
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
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
          <h2 className="text-lg md:text-xl text-gray-900 mb-4">{t('dashboard:quick_actions')}</h2>
          <div className="space-y-2">
            <Button
              className="w-full justify-start bg-pink-600 hover:bg-pink-700 h-10"
              onClick={() => navigate('/admin/bookings')}
            >
              <Calendar className="w-4 h-4 mr-2" />
              {t('dashboard:create_booking')}
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start h-10"
              onClick={() => navigate('/admin/clients')}
            >
              <Users className="w-4 h-4 mr-2" />
              {t('dashboard:add_client')}
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start h-10"
              onClick={() => navigate('/admin/users/create')}
            >
              <Users className="w-4 h-4 mr-2" />
              {t('dashboard:create_user')}
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start h-10"
              onClick={() => navigate('/admin/analytics')}
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              {t('dashboard:view_analytics')}
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start h-10"
              onClick={() => navigate('/admin/calendar')}
            >
              <Calendar className="w-4 h-4 mr-2" />
              {t('dashboard:calendar')}
            </Button>
          </div>
        </div>
      </div>

      {/* Bot Analytics Widget */}
      {botAnalytics && botAnalytics.total_sessions > 0 && (
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl shadow-sm p-4 md:p-6 mb-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg md:text-xl font-semibold">🤖 AI Бот Аналитика</h2>
            <span className="text-sm opacity-80">За 30 дней</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white/10 rounded-lg p-3">
              <p className="text-xs opacity-80">Конверсия</p>
              <p className="text-2xl font-bold">{botAnalytics.conversion_rate}%</p>
              <p className="text-xs opacity-70">{botAnalytics.bookings_created} записей</p>
            </div>
            <div className="bg-white/10 rounded-lg p-3">
              <p className="text-xs opacity-80">Сессий</p>
              <p className="text-2xl font-bold">{botAnalytics.total_sessions}</p>
              <p className="text-xs opacity-70">~{botAnalytics.avg_messages_per_session} сообщ.</p>
            </div>
            <div className="bg-white/10 rounded-lg p-3">
              <p className="text-xs opacity-80">Эскалаций</p>
              <p className="text-2xl font-bold">{botAnalytics.escalations}</p>
              <p className="text-xs opacity-70">→ менеджеру</p>
            </div>
            <div className="bg-white/10 rounded-lg p-3">
              <p className="text-xs opacity-80">Пиковые часы</p>
              <p className="text-lg font-bold">
                {botAnalytics.popular_hours?.slice(0, 3).map((h: any) => `${h.hour}:00`).join(', ') || '—'}
              </p>
              <p className="text-xs opacity-70">топ активность</p>
            </div>
          </div>
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm mb-1">{t('dashboard:total_clients')}</p>
              <p className="text-2xl md:text-3xl text-gray-900 font-bold">{stats.total_clients}</p>
              <p className="text-xs text-green-600 mt-1">+{stats.new_clients} {t('dashboard:new_clients')}</p>
            </div>
            <Users className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm mb-1">{t('dashboard:total_bookings')}</p>
              <p className="text-2xl md:text-3xl text-gray-900 font-bold">{stats.total_bookings}</p>
              <p className="text-xs text-green-600 mt-1">{stats.completed_bookings} {t('dashboard:completed_bookings')}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm mb-1">{t('dashboard:total_messages')}</p>
              <p className="text-2xl md:text-3xl text-gray-900 font-bold">
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