// /frontend/src/pages/adminPanel/Dashboard.tsx
import { useEffect, useState } from 'react';
import { Users, Gift, Award, Target, Bell, TrendingUp, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { api } from '../../services/api';

export default function AdminDashboard() {
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
      // TODO: Create API endpoint for admin stats
      // const response = await api.getAdminStats();
      // setStats(response);

      // Mock data for now
      setStats({
        total_users: 1234,
        active_challenges: 5,
        total_loyalty_points: 125000,
        total_referrals: 89,
        pending_notifications: 12,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    {
      title: 'User Management',
      description: 'Manage user accounts and permissions',
      icon: Users,
      path: '/admin/users',
      color: 'from-blue-500 to-cyan-500',
    },
    {
      title: 'Loyalty Management',
      description: 'Manage loyalty points and tiers',
      icon: Gift,
      path: '/admin/loyalty',
      color: 'from-purple-500 to-pink-500',
    },
    {
      title: 'Referral Program',
      description: 'View and manage referrals',
      icon: Award,
      path: '/admin/referrals',
      color: 'from-orange-500 to-red-500',
    },
    {
      title: 'Challenges',
      description: 'Create and manage challenges',
      icon: Target,
      path: '/admin/challenges',
      color: 'from-green-500 to-emerald-500',
    },
    {
      title: 'Notifications',
      description: 'Send and manage notifications',
      icon: Bell,
      path: '/admin/notifications',
      color: 'from-indigo-500 to-purple-500',
    },
  ];

  const statCards = [
    {
      title: 'Total Users',
      value: stats.total_users.toLocaleString(),
      icon: Users,
      change: '+12%',
      changeType: 'increase' as const,
    },
    {
      title: 'Active Challenges',
      value: stats.active_challenges.toString(),
      icon: Target,
      change: '+2',
      changeType: 'increase' as const,
    },
    {
      title: 'Loyalty Points Issued',
      value: stats.total_loyalty_points.toLocaleString(),
      icon: Gift,
      change: '+8%',
      changeType: 'increase' as const,
    },
    {
      title: 'Total Referrals',
      value: stats.total_referrals.toString(),
      icon: Award,
      change: '+15%',
      changeType: 'increase' as const,
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-500 mt-1">Manage users, loyalty, and engagement</p>
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
                <div className="flex items-center gap-1 mt-1">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  <span className="text-xs text-green-600 font-medium">
                    {stat.change} from last month
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
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
                        <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-purple-600 transition-colors">
                          {action.title}
                        </h3>
                        <p className="text-sm text-gray-500">{action.description}</p>
                      </div>
                      <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-purple-600 transition-colors" />
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
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest actions in the admin panel</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                <Gift className="w-5 h-5 text-purple-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">
                  New loyalty tier activated
                </p>
                <p className="text-xs text-gray-500">2 hours ago</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">
                  15 new users registered
                </p>
                <p className="text-xs text-gray-500">5 hours ago</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <Target className="w-5 h-5 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">
                  Challenge "Summer Glow" completed by 23 users
                </p>
                <p className="text-xs text-gray-500">1 day ago</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
