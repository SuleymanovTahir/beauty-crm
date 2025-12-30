// /frontend/src/pages/adminPanel/LoyaltyManagement.tsx
import { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, TrendingUp, Gift, DollarSign } from 'lucide-react';
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

interface LoyaltyTier {
  id: string;
  name: string;
  min_points: number;
  discount: number;
  color: string;
}

interface LoyaltyTransaction {
  id: string;
  client_name: string;
  client_email: string;
  points: number;
  type: 'earn' | 'redeem' | 'adjust';
  reason: string;
  created_at: string;
}

export default function LoyaltyManagement() {
  const { t } = useTranslation(['adminPanel/LoyaltyManagement', 'common']);
  const [tiers, setTiers] = useState<LoyaltyTier[]>([
    { id: '1', name: 'Bronze', min_points: 0, discount: 0, color: '#CD7F32' },
    { id: '2', name: 'Silver', min_points: 1000, discount: 5, color: '#C0C0C0' },
    { id: '3', name: 'Gold', min_points: 5000, discount: 10, color: '#FFD700' },
    { id: '4', name: 'Platinum', min_points: 10000, discount: 15, color: '#E5E4E2' },
  ]);

  const [transactions, setTransactions] = useState<LoyaltyTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showTierDialog, setShowTierDialog] = useState(false);
  const [showAdjustDialog, setShowAdjustDialog] = useState(false);
  const [editingTier, setEditingTier] = useState<LoyaltyTier | null>(null);

  const [adjustForm, setAdjustForm] = useState({
    client_email: '',
    points: 0,
    reason: '',
  });

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      // TODO: API call
      // Mock data
      setTransactions([
        {
          id: '1',
          client_name: 'John Doe',
          client_email: 'john@example.com',
          points: 500,
          type: 'earn',
          reason: 'Purchase',
          created_at: new Date().toISOString(),
        },
        {
          id: '2',
          client_name: 'Jane Smith',
          client_email: 'jane@example.com',
          points: -200,
          type: 'redeem',
          reason: 'Discount applied',
          created_at: new Date().toISOString(),
        },
      ]);
    } catch (error) {
      console.error('Error loading transactions:', error);
      toast.error(t('toasts.failed_load'));
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTier = () => {
    if (editingTier) {
      setTiers(tiers.map(t => t.id === editingTier.id ? editingTier : t));
      toast.success(t('toasts.tier_updated'));
    }
    setShowTierDialog(false);
    setEditingTier(null);
  };

  const handleAdjustPoints = async () => {
    try {
      // TODO: API call to adjust points
      const message = adjustForm.points > 0
        ? t('toasts.points_adjusted_add', { points: adjustForm.points, email: adjustForm.client_email })
        : t('toasts.points_adjusted_deduct', { points: Math.abs(adjustForm.points), email: adjustForm.client_email });
      toast.success(message);
      setShowAdjustDialog(false);
      setAdjustForm({ client_email: '', points: 0, reason: '' });
      loadTransactions();
    } catch (error) {
      toast.error(t('toasts.failed_adjust'));
    }
  };

  const stats = [
    {
      title: t('stats.total_points_issued'),
      value: '125,000',
      change: '+12%',
      icon: Gift,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      title: t('stats.points_redeemed'),
      value: '45,000',
      change: '+8%',
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: t('stats.active_members'),
      value: '1,234',
      change: '+15%',
      icon: TrendingUp,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('title')}</h1>
          <p className="text-gray-500 mt-1">{t('subtitle')}</p>
        </div>
        <Button onClick={() => setShowAdjustDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          {t('adjust_points')}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 font-medium">{stat.title}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-2">{stat.value}</p>
                    <p className="text-xs text-green-600 font-medium mt-1">{stat.change} {t('stats.from_last_month')}</p>
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

      {/* Loyalty Tiers */}
      <Card>
        <CardHeader>
          <CardTitle>{t('tiers.title')}</CardTitle>
          <CardDescription>{t('tiers.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {tiers.map((tier) => (
              <div key={tier.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-4">
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: tier.color }}
                  >
                    {tier.name[0]}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">{tier.name}</div>
                    <div className="text-sm text-gray-500">
                      {tier.min_points === 0 ? t('tiers.starting_level') : t('tiers.from_points', { points: tier.min_points.toLocaleString() })} • {t('tiers.discount', { percent: tier.discount })}
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditingTier(tier);
                    setShowTierDialog(true);
                  }}
                >
                  <Edit className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t('transactions.title')}</CardTitle>
              <CardDescription>{t('transactions.description')}</CardDescription>
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder={t('transactions.search_placeholder')}
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
                <TableHead>{t('transactions.table.client')}</TableHead>
                <TableHead>{t('transactions.table.points')}</TableHead>
                <TableHead>{t('transactions.table.type')}</TableHead>
                <TableHead>{t('transactions.table.reason')}</TableHead>
                <TableHead>{t('transactions.table.date')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{transaction.client_name}</div>
                      <div className="text-sm text-gray-500">{transaction.client_email}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={transaction.points > 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                      {transaction.points > 0 ? '+' : ''}{transaction.points}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={transaction.type === 'earn' ? 'default' : 'secondary'}>
                      {t(`transactions.types.${transaction.type}`)}
                    </Badge>
                  </TableCell>
                  <TableCell>{transaction.reason}</TableCell>
                  <TableCell>{new Date(transaction.created_at).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Tier Dialog */}
      <Dialog open={showTierDialog} onOpenChange={setShowTierDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('dialogs.edit_tier.title')}</DialogTitle>
            <DialogDescription>{t('dialogs.edit_tier.description')}</DialogDescription>
          </DialogHeader>
          {editingTier && (
            <div className="space-y-4">
              <div>
                <Label>{t('dialogs.edit_tier.tier_name')}</Label>
                <Input
                  value={editingTier.name}
                  onChange={(e) => setEditingTier({ ...editingTier, name: e.target.value })}
                />
              </div>
              <div>
                <Label>{t('dialogs.edit_tier.min_points')}</Label>
                <Input
                  type="number"
                  value={editingTier.min_points}
                  onChange={(e) => setEditingTier({ ...editingTier, min_points: parseInt(e.target.value) })}
                />
              </div>
              <div>
                <Label>{t('dialogs.edit_tier.discount_percent')}</Label>
                <Input
                  type="number"
                  value={editingTier.discount}
                  onChange={(e) => setEditingTier({ ...editingTier, discount: parseInt(e.target.value) })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTierDialog(false)}>
              {t('buttons.cancel')}
            </Button>
            <Button onClick={handleSaveTier}>{t('buttons.save_changes')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Adjust Points Dialog */}
      <Dialog open={showAdjustDialog} onOpenChange={setShowAdjustDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('dialogs.adjust_points.title')}</DialogTitle>
            <DialogDescription>{t('dialogs.adjust_points.description')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('dialogs.adjust_points.client_email')}</Label>
              <Input
                placeholder={t('dialogs.adjust_points.client_email_placeholder')}
                value={adjustForm.client_email}
                onChange={(e) => setAdjustForm({ ...adjustForm, client_email: e.target.value })}
              />
            </div>
            <div>
              <Label>{t('dialogs.adjust_points.points')}</Label>
              <Input
                type="number"
                placeholder={t('dialogs.adjust_points.points_placeholder')}
                value={adjustForm.points}
                onChange={(e) => setAdjustForm({ ...adjustForm, points: parseInt(e.target.value) })}
              />
            </div>
            <div>
              <Label>{t('dialogs.adjust_points.reason')}</Label>
              <Input
                placeholder={t('dialogs.adjust_points.reason_placeholder')}
                value={adjustForm.reason}
                onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdjustDialog(false)}>
              {t('buttons.cancel')}
            </Button>
            <Button onClick={handleAdjustPoints}>{t('buttons.adjust_points')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
