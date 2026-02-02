// /frontend/src/pages/manager/Dashboard.tsx
import { useState, useEffect } from 'react';
import { LayoutDashboard, MessageSquare, Users, TrendingUp, MessageCircle, Filter, ArrowRight, Loader, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { toast } from 'sonner';
import { api } from '../../services/api';
import { useTranslation } from 'react-i18next';
import { useCurrency } from '../../hooks/useSalonSettings';

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

interface FunnelData {
  visitors: number;
  engaged: number;
  started_booking: number;
  booked: number;
  completed: number;
  conversion_rates: {
    visitor_to_engaged: number;
    engaged_to_booking: number;
    booking_to_booked: number;
    booked_to_completed: number;
  };
}

export default function ManagerDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const { t } = useTranslation(['manager/dashboard', 'common']);
  const { formatCurrency } = useCurrency();
  const [funnel, setFunnel] = useState<FunnelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [statsData, funnelData] = await Promise.all([
        api.getStats(),
        api.getFunnel(),
      ]);

      setStats(statsData);
      setFunnel(funnelData);
    } catch (err) {
      const message = err instanceof Error ? err.message : t('dashboard:errors.loading');
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
          <p className="text-gray-600">{t('dashboard:loading')}</p>
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
              <p className="text-red-800 font-medium">{t('dashboard:errors.loading_title')}</p>
              <p className="text-red-700 text-sm mt-1">{error}</p>
              <Button onClick={loadDashboardData} className="mt-4 bg-red-600 hover:bg-red-700">
                {t('dashboard:retry')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl text-gray-900 mb-2">{t('dashboard:manager_panel')}</h1>
        <p className="text-gray-600">{t('dashboard:manager_desc')}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Link to="/manager/chat" className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
            <MessageSquare className="w-6 h-6 text-blue-600" />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl text-gray-900 mb-1">{stats?.total_client_messages || 0}</h3>
              <p className="text-gray-600 text-sm">{t('dashboard:client_messages')}</p>
            </div>
            {stats && stats.total_client_messages > 0 && (
              <Badge className="bg-blue-100 text-blue-800">
                +{Math.floor(stats.total_client_messages * 0.1)}
              </Badge>
            )}
          </div>
        </Link>

        <Link to="/crm/clients" className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
            <Users className="w-6 h-6 text-green-600" />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl text-gray-900 mb-1">{stats?.total_clients || 0}</h3>
              <p className="text-gray-600 text-sm">{t('dashboard:total_clients')}</p>
            </div>
            {stats && stats.new_clients > 0 && (
              <Badge className="bg-green-100 text-green-800">
                +{stats.new_clients}
              </Badge>
            )}
          </div>
        </Link>

        <Link to="/manager/funnel" className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
            <TrendingUp className="w-6 h-6 text-blue-600" />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl text-gray-900 mb-1">{stats?.conversion_rate.toFixed(1)}%</h3>
              <p className="text-gray-600 text-sm">{t('dashboard:conversion_rate')}</p>
            </div>
            <Badge className="bg-blue-100 text-blue-800">
              {stats && stats.conversion_rate > 15 ? t('dashboard:good') : t('dashboard:normal')}
            </Badge>
          </div>
        </Link>

        <Link to="/crm/bookings" className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center mb-4">
            <LayoutDashboard className="w-6 h-6 text-pink-600" />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl text-gray-900 mb-1">{stats?.total_bookings || 0}</h3>
              <p className="text-gray-600 text-sm">{t('dashboard:total_bookings')}</p>
            </div>
            {stats && stats.pending_bookings > 0 && (
              <Badge className="bg-pink-100 text-pink-800">
                {stats.pending_bookings} {t('dashboard:pending')}
              </Badge>
            )}
          </div>
        </Link>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl text-gray-900 mb-4">{t('dashboard:quick_actions')}</h2>
          <div className="space-y-3">
            <Link to="/manager/chat">
              <Button className="w-full justify-between bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700">
                <span className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  {t('dashboard:open_chat')}
                </span>
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>

            <Link to="/manager/messages">
              <Button className="w-full justify-between bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700">
                <span className="flex items-center gap-2">
                  <MessageCircle className="w-5 h-5" />
                  {t('dashboard:messages')}
                </span>
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>

            <Link to="/manager/funnel">
              <Button className="w-full justify-between bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700">
                <span className="flex items-center gap-2">
                  <Filter className="w-5 h-5" />
                  {t('dashboard:sales_funnel')}
                </span>
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>

            <Link to="/crm/clients">
              <Button className="w-full justify-between bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700">
                <span className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  {t('dashboard:client_base')}
                </span>
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl text-gray-900 mb-4">{t('dashboard:key_metrics')}</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-600">{t('dashboard:active_clients')}</p>
                <p className="text-2xl text-gray-900 font-medium">{stats?.customers || 0}</p>
              </div>
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>

            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-600">{t('dashboard:completed_procedures')}</p>
                <p className="text-2xl text-gray-900 font-medium">{stats?.completed_bookings || 0}</p>
              </div>
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>

            <div className="flex items-center justify-between p-4 bg-pink-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-600">{t('dashboard:total_revenue')}</p>
                <p className="text-2xl text-gray-900 font-medium">{formatCurrency(stats?.total_revenue || 0)}</p>
              </div>
              <TrendingUp className="w-6 h-6 text-pink-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Funnel Overview */}
      {funnel && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl text-gray-900 mb-6 flex items-center gap-2">
            <Filter className="w-6 h-6 text-pink-600" />
            {t('dashboard:sales_funnel')}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-2">{t('dashboard:visitors')}</p>
              <p className="text-3xl text-gray-900 mb-1">{funnel.visitors}</p>
              <p className="text-xs text-gray-500">100%</p>
            </div>

            <div className="bg-cyan-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-2">{t('dashboard:engaged')}</p>
              <p className="text-3xl text-gray-900 mb-1">{funnel.engaged}</p>
              <p className="text-xs text-gray-500">
                {((funnel.engaged / funnel.visitors) * 100).toFixed(1)}%
              </p>
            </div>

            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-2">{t('dashboard:started_booking')}</p>
              <p className="text-3xl text-gray-900 mb-1">{funnel.started_booking}</p>
              <p className="text-xs text-gray-500">
                {((funnel.started_booking / funnel.visitors) * 100).toFixed(1)}%
              </p>
            </div>

            <div className="bg-amber-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-2">{t('dashboard:booked')}</p>
              <p className="text-3xl text-gray-900 mb-1">{funnel.booked}</p>
              <p className="text-xs text-gray-500">
                {((funnel.booked / funnel.visitors) * 100).toFixed(1)}%
              </p>
            </div>

            <div className="bg-pink-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-2">{t('dashboard:completed')}</p>
              <p className="text-3xl text-gray-900 mb-1">{funnel.completed}</p>
              <p className="text-xs text-gray-500">
                {((funnel.completed / funnel.visitors) * 100).toFixed(1)}%
              </p>
            </div>
          </div>

          <Link to="/manager/funnel" className="mt-4">
            <Button className="bg-pink-600 hover:bg-pink-700">
              {t('dashboard:funnel_details')}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}