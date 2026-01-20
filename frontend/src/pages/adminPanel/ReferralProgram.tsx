// /frontend/src/pages/adminpanel/referralprogram.tsx
import { useState, useEffect } from 'react';
import { Users, Gift, TrendingUp, Search, ExternalLink, Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import { toast } from 'sonner';

interface Referral {
  id: string;
  referrer_name: string;
  referrer_email: string;
  referred_name: string;
  referred_email: string;
  status: 'pending' | 'completed' | 'cancelled';
  points_awarded: number;
  created_at: string;
}

export default function ReferralProgram() {
  const { t } = useTranslation(['adminpanel/referralprogram', 'common']);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'points' | 'status'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [stats, setStats] = useState({
    total_referrals: 0,
    completed_referrals: 0,
    points_distributed: 0,
  });

  const [settings, setSettings] = useState({
    referrer_bonus: 500,
    referred_bonus: 200,
    min_purchase_amount: 0,
  });

  useEffect(() => {
    loadReferrals();
    loadSettings();
    loadStats();
  }, [statusFilter, sortBy, sortOrder]);

  const loadReferrals = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      params.append('sort_by', sortBy);
      params.append('order', sortOrder);

      const response = await fetch(`/api/admin/referrals?${params.toString()}`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.referrals) {
          setReferrals(data.referrals);
        }
      } else {
        throw new Error('Failed to load referrals');
      }
    } catch (error) {
      console.error('Error loading referrals:', error);
      toast.error(t('toasts.failed_load'));
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/admin/referrals/settings', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.settings) {
          setSettings(data.settings);
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch('/api/admin/referrals/stats', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.stats) {
          setStats(data.stats);
        }
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleSaveSettings = async () => {
    try {
      const response = await fetch('/api/admin/referrals/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        toast.success(t('toasts.settings_saved'));
        setShowSettingsDialog(false);
      } else {
        throw new Error('Failed to save settings');
      }
    } catch (error) {
      toast.error(t('toasts.failed_save'));
    }
  };

  const statsCards = [
    {
      title: t('stats.total_referrals'),
      value: stats.total_referrals.toString(),
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: t('stats.completed_referrals'),
      value: stats.completed_referrals.toString(),
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: t('stats.points_distributed'),
      value: stats.points_distributed.toLocaleString(),
      icon: Gift,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
  ];

  const filteredReferrals = referrals.filter(r =>
    r.referrer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.referrer_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.referred_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.referred_email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('title')}</h1>
          <p className="text-gray-500 mt-1">{t('subtitle')}</p>
        </div>
        <Button onClick={() => setShowSettingsDialog(true)}>
          <Settings className="w-4 h-4 mr-2" />
          {t('settings')}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {statsCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 font-medium">{stat.title}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-2">{stat.value}</p>
                  </div>
                  <div className={`w-12 h-12 ${stat.bgColor} rounded-lg flex items-center justify-center`}>
                    <Icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Current Settings Info */}
      <Card className="bg-gradient-to-r from-blue-50 to-pink-50">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('current_settings.title')}</h3>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Gift className="w-4 h-4 text-blue-600" />
                  <span dangerouslySetInnerHTML={{ __html: t('current_settings.referrer_bonus', { points: settings.referrer_bonus }) }} />
                </div>
                <div className="flex items-center gap-2">
                  <Gift className="w-4 h-4 text-pink-600" />
                  <span dangerouslySetInnerHTML={{ __html: t('current_settings.referred_bonus', { points: settings.referred_bonus }) }} />
                </div>
                {settings.min_purchase_amount > 0 && (
                  <div className="flex items-center gap-2">
                    <ExternalLink className="w-4 h-4 text-blue-600" />
                    <span dangerouslySetInnerHTML={{ __html: t('current_settings.min_purchase', { amount: settings.min_purchase_amount }) }} />
                  </div>
                )}
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowSettingsDialog(true)}>
              {t('current_settings.edit')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Referrals Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t('table.title')}</CardTitle>
              <CardDescription>{t('table.description')}</CardDescription>
            </div>
            <div className="flex gap-2">
              <select
                className="px-3 py-2 border rounded-md text-sm"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">{t('table.filters.all_statuses', { defaultValue: 'All Statuses' })}</option>
                <option value="pending">{t('table.statuses.pending')}</option>
                <option value="completed">{t('table.statuses.completed')}</option>
                <option value="cancelled">{t('table.statuses.cancelled')}</option>
              </select>
              <select
                className="px-3 py-2 border rounded-md text-sm"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'date' | 'points' | 'status')}
              >
                <option value="date">{t('table.sort.date', { defaultValue: 'Sort by Date' })}</option>
                <option value="points">{t('table.sort.points', { defaultValue: 'Sort by Points' })}</option>
                <option value="status">{t('table.sort.status', { defaultValue: 'Sort by Status' })}</option>
              </select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </Button>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder={t('table.search_placeholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 w-64"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('table.columns.referrer')}</TableHead>
                <TableHead>{t('table.columns.referred_friend')}</TableHead>
                <TableHead>{t('table.columns.status')}</TableHead>
                <TableHead>{t('table.columns.points_awarded')}</TableHead>
                <TableHead>{t('table.columns.date')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReferrals.map((referral) => (
                <TableRow key={referral.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{referral.referrer_name}</div>
                      <div className="text-sm text-gray-500">{referral.referrer_email}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{referral.referred_name}</div>
                      <div className="text-sm text-gray-500">{referral.referred_email}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        referral.status === 'completed' ? 'default' :
                        referral.status === 'pending' ? 'secondary' :
                        'destructive'
                      }
                    >
                      {t(`table.statuses.${referral.status}`)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className={referral.points_awarded > 0 ? 'text-green-600 font-medium' : 'text-gray-400'}>
                      {referral.points_awarded > 0 ? `+${referral.points_awarded}` : '-'}
                    </span>
                  </TableCell>
                  <TableCell>{new Date(referral.created_at).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Settings Dialog */}
      <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('dialogs.settings.title')}</DialogTitle>
            <DialogDescription>{t('dialogs.settings.description')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('dialogs.settings.referrer_bonus')}</Label>
              <Input
                type="number"
                value={settings.referrer_bonus}
                onChange={(e) => setSettings({ ...settings, referrer_bonus: parseInt(e.target.value) })}
              />
              <p className="text-xs text-gray-500 mt-1">{t('dialogs.settings.referrer_bonus_help')}</p>
            </div>
            <div>
              <Label>{t('dialogs.settings.referred_bonus')}</Label>
              <Input
                type="number"
                value={settings.referred_bonus}
                onChange={(e) => setSettings({ ...settings, referred_bonus: parseInt(e.target.value) })}
              />
              <p className="text-xs text-gray-500 mt-1">{t('dialogs.settings.referred_bonus_help')}</p>
            </div>
            <div>
              <Label>{t('dialogs.settings.min_purchase_amount')}</Label>
              <Input
                type="number"
                value={settings.min_purchase_amount}
                onChange={(e) => setSettings({ ...settings, min_purchase_amount: parseInt(e.target.value) })}
              />
              <p className="text-xs text-gray-500 mt-1">{t('dialogs.settings.min_purchase_help')}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSettingsDialog(false)}>
              {t('buttons.cancel')}
            </Button>
            <Button onClick={handleSaveSettings}>{t('buttons.save_changes')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
