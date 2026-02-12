// /frontend/src/pages/adminpanel/dashboard.tsx
import { useEffect, useState } from 'react';
import { Users, Gift, Award, Target, Bell, Image, ArrowRight, Download } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';


export default function AdminDashboard() {
  const { t } = useTranslation(['adminpanel/dashboard', 'common']);
  const [stats, setStats] = useState({
    total_users: 0,
    active_challenges: 0,
    total_loyalty_points: 0,
    total_referrals: 0,
    pending_notifications: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/stats', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.stats) {
          setStats({
            total_users: data.stats.total_users || 0,
            active_challenges: data.stats.active_challenges || 0,
            total_loyalty_points: data.stats.total_loyalty_points || 0,
            total_referrals: data.stats.total_referrals || 0,
            pending_notifications: 0,
          });
        }
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const response = await fetch('/api/admin/export-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          start_date: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString(),
          end_date: new Date().toISOString(),
          format: 'csv'
        }),
      });

      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting report:', error);
    }
  };

  const quickActions = [
    {
      title: t('quick_actions.user_management.title'),
      description: t('quick_actions.user_management.description'),
      icon: Users,
      path: '/admin/users',
      color: 'from-blue-500 to-cyan-500',
    },
    {
      title: t('quick_actions.loyalty_management.title'),
      description: t('quick_actions.loyalty_management.description'),
      icon: Gift,
      path: '/admin/loyalty',
      color: 'from-blue-500 to-pink-500',
    },
    {
      title: t('quick_actions.referral_program.title'),
      description: t('quick_actions.referral_program.description'),
      icon: Award,
      path: '/admin/referrals',
      color: 'from-orange-500 to-red-500',
    },
    {
      title: t('quick_actions.challenges.title'),
      description: t('quick_actions.challenges.description'),
      icon: Target,
      path: '/admin/challenges',
      color: 'from-green-500 to-emerald-500',
    },
    {
      title: t('quick_actions.notifications.title'),
      description: t('quick_actions.notifications.description'),
      icon: Bell,
      path: '/admin/notifications',
      color: 'from-indigo-500 to-blue-500',
    },
    {
      title: t('quick_actions.photo_gallery.title'),
      description: t('quick_actions.photo_gallery.description'),
      icon: Image,
      path: '/admin/gallery',
      color: 'from-pink-500 to-rose-500',
    },
  ];

  const statCards = [
    {
      title: t('stats.total_users'),
      value: stats.total_users.toLocaleString(),
      icon: Users,
    },
    {
      title: t('stats.active_challenges'),
      value: stats.active_challenges.toString(),
      icon: Target,
    },
    {
      title: t('stats.loyalty_points_issued'),
      value: stats.total_loyalty_points.toLocaleString(),
      icon: Gift,
    },
    {
      title: t('stats.total_referrals'),
      value: stats.total_referrals.toString(),
      icon: Award,
    },
  ];

  if (loading) {
    return (
      <div className="p-4 md:p-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('title')}</h1>
          <p className="text-sm text-gray-500 mt-1">{t('subtitle')}</p>
        </div>
        <Button onClick={handleExport} variant="outline" className="flex items-center gap-2">
          <Download className="w-4 h-4" />
          {t('common:export_report')}
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">
                  {stat.title}
                </CardTitle>
                <Icon className="w-4 h-4 text-gray-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('quick_actions.title')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.path} to={action.path}>
                <Card className="hover:shadow-lg transition-shadow cursor-pointer group">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 bg-gradient-to-br ${action.color} rounded-lg flex items-center justify-center flex-shrink-0`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
                          {action.title}
                        </h3>
                        <p className="text-sm text-gray-500">{action.description}</p>
                      </div>
                      <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>{t('recent_activity.title')}</CardTitle>
          <CardDescription>{t('recent_activity.subtitle')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Gift className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">
                  {t('recent_activity.new_tier_activated')}
                </p>
                <p className="text-xs text-gray-500">{t('recent_activity.hours_ago', { count: 2 })}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">
                  {t('recent_activity.users_registered', { count: 15 })}
                </p>
                <p className="text-xs text-gray-500">{t('recent_activity.hours_ago', { count: 5 })}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <Target className="w-5 h-5 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">
                  {t('recent_activity.challenge_completed', { name: 'Summer Glow', count: 23 })}
                </p>
                <p className="text-xs text-gray-500">{t('recent_activity.day_ago', { count: 1 })}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
