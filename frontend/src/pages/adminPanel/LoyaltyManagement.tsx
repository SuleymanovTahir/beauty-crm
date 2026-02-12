// /frontend/src/pages/adminPanel/LoyaltyManagement.tsx
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, Search, Edit, Trash2, TrendingUp, Gift, DollarSign, Power } from 'lucide-react';
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
import { useAuth } from '../../contexts/AuthContext';

interface LoyaltyTier {
  id: string;
  name: string;
  min_points: number;
  discount: number;
  is_active: boolean;
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

interface LoyaltyConfig {
  loyalty_points_conversion_rate: number;
  points_expiration_days: number;
}

interface CategoryRule {
  category: string;
  points_multiplier: number;
  is_active: boolean;
}

interface LoyaltyManagementProps {
  embedded?: boolean;
  showEmbeddedHeader?: boolean;
  onEmbeddedPrimaryActionReady?: (handler: (() => void) | null) => void;
}

export default function LoyaltyManagement({
  embedded = false,
  showEmbeddedHeader = true,
  onEmbeddedPrimaryActionReady
}: LoyaltyManagementProps) {
  const { t } = useTranslation(['adminpanel/loyaltymanagement', 'common']);
  const { user } = useAuth();
  const allowedEditorRoles = useMemo(() => new Set(['admin', 'manager', 'director']), []);
  const canManageLoyalty = [user?.role ?? '', user?.secondary_role ?? ''].some((role) => allowedEditorRoles.has(role));
  const [tiers, setTiers] = useState<LoyaltyTier[]>([]);
  const [transactions, setTransactions] = useState<LoyaltyTransaction[]>([]);
  const [config, setConfig] = useState<LoyaltyConfig>({
    loyalty_points_conversion_rate: 0,
    points_expiration_days: 365
  });
  const [categoryRules, setCategoryRules] = useState<CategoryRule[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showTierDialog, setShowTierDialog] = useState(false);
  const [showAdjustDialog, setShowAdjustDialog] = useState(false);
  const [showRuleDialog, setShowRuleDialog] = useState(false);
  const [editingTier, setEditingTier] = useState<LoyaltyTier | null>(null);
  const [stats, setStats] = useState({
    total_points_issued: 0,
    points_redeemed: 0,
    active_members: 0,
  });

  const [adjustForm, setAdjustForm] = useState({
    client_email: '',
    points: 0,
    reason: '',
  });

  const [ruleForm, setRuleForm] = useState<CategoryRule>({
    category: '',
    points_multiplier: 1.0,
    is_active: true,
  });

  const parseNumberOrFallback = (value: string, fallbackValue: number): number => {
    const parsedValue = Number(value);
    if (!Number.isFinite(parsedValue)) {
      return fallbackValue;
    }
    return parsedValue;
  };

  const parseIntegerOrFallback = (value: string, fallbackValue: number): number => {
    const parsedValue = parseNumberOrFallback(value, fallbackValue);
    return Math.round(parsedValue);
  };

  const normalizedCashbackRate = Number.isFinite(config.loyalty_points_conversion_rate)
    ? config.loyalty_points_conversion_rate
    : 0;
  const cashbackPercent = Math.round(normalizedCashbackRate * 1000) / 10;
  const pointsPerHundredCurrencyUnits = Math.round(normalizedCashbackRate * 100);

  const filteredTransactions = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    if (normalizedSearch.length === 0) {
      return transactions;
    }

    return transactions.filter((transaction) => {
      const clientName = transaction.client_name.toLowerCase();
      const clientEmail = transaction.client_email.toLowerCase();
      const reason = transaction.reason.toLowerCase();

      if (clientName.includes(normalizedSearch)) {
        return true;
      }
      if (clientEmail.includes(normalizedSearch)) {
        return true;
      }
      return reason.includes(normalizedSearch);
    });
  }, [transactions, searchTerm]);
  useEffect(() => {
    loadTransactions();
    loadTiers();
    loadStats();
    loadConfig();
    loadCategoryRules();
  }, []);

  const loadConfig = async () => {
    try {
      const response = await fetch('/api/admin/loyalty/config', { credentials: 'include' });
      const data = await response.json();
      if (data.success) {
        setConfig(data.config);
      }
    } catch (error) {
      console.error('Error loading config:', error);
    }
  };

  const loadCategoryRules = async () => {
    try {
      const response = await fetch('/api/admin/loyalty/categories', { credentials: 'include' });
      const data = await response.json();
      if (data.success) {
        const normalizedRules = Array.isArray(data.rules)
          ? data.rules.map((rule: CategoryRule) => ({
            ...rule,
            is_active: typeof rule.is_active === 'boolean' ? rule.is_active : true,
          }))
          : [];
        setCategoryRules(normalizedRules);
      }
    } catch (error) {
      console.error('Error loading category rules:', error);
    }
  };

  const handleUpdateConfig = async () => {
    try {
      const response = await fetch('/api/admin/loyalty/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(config),
      });
      if (response.ok) {
        toast.success(t('toasts.config_updated'));
      } else {
        throw new Error('Failed to update config');
      }
    } catch (error) {
      toast.error(t('toasts.failed_update'));
    }
  };

  const handleSaveRule = async () => {
    try {
      const response = await fetch('/api/admin/loyalty/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(ruleForm),
      });
      if (response.ok) {
        toast.success(t('toasts.rule_saved'));
        loadCategoryRules();
        setShowRuleDialog(false);
      } else {
        throw new Error('Failed to save rule');
      }
    } catch (error) {
      toast.error(t('toasts.failed_save'));
    }
  };

  const handleToggleRuleStatus = async (rule: CategoryRule) => {
    try {
      const response = await fetch('/api/admin/loyalty/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          category: rule.category,
          points_multiplier: rule.points_multiplier,
          is_active: !rule.is_active,
        }),
      });

      if (response.ok) {
        toast.success(t('toasts.rule_saved'));
        await loadCategoryRules();
      } else {
        throw new Error('Failed to update rule status');
      }
    } catch (error) {
      toast.error(t('toasts.failed_update'));
    }
  };

  const handleDeleteRule = async (category: string) => {
    if (!confirm(t('confirm_delete_rule'))) return;
    try {
      const response = await fetch(`/api/admin/loyalty/categories?category=${encodeURIComponent(category)}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (response.ok) {
        toast.success(t('toasts.rule_deleted'));
        loadCategoryRules();
      }
    } catch (error) {
      toast.error(t('toasts.failed_delete'));
    }
  };

  const loadTiers = async () => {
    try {
      const response = await fetch('/api/admin/loyalty/tiers', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.tiers) {
          const normalizedTiers = data.tiers.map((tier: LoyaltyTier) => ({
            ...tier,
            is_active: typeof tier.is_active === 'boolean' ? tier.is_active : true,
          }));
          setTiers(normalizedTiers);
        }
      }
    } catch (error) {
      console.error('Error loading tiers:', error);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch('/api/admin/loyalty/stats', {
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

  const loadTransactions = async () => {
    try {
      const response = await fetch('/api/admin/loyalty/transactions', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.transactions) {
          setTransactions(data.transactions);
        }
      } else {
        throw new Error('Failed to load transactions');
      }
    } catch (error) {
      console.error('Error loading transactions:', error);
      toast.error(t('toasts.failed_load'));
    }
  };

  const handleSaveTier = async () => {
    if (editingTier === null) {
      return;
    }

    try {
      const isEditMode = editingTier.id.length > 0;
      const endpoint = isEditMode ? `/api/admin/loyalty/tiers/${editingTier.id}` : '/api/admin/loyalty/tiers';
      const method = isEditMode ? 'PUT' : 'POST';

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(editingTier),
      });

      if (response.ok) {
        toast.success(t('toasts.tier_updated'));
        loadTiers();
        setShowTierDialog(false);
        setEditingTier(null);
      } else {
        throw new Error('Failed to save tier');
      }
    } catch (error) {
      toast.error(t('toasts.failed_update'));
    }
  };

  const handleDeleteTier = async (tierId: string) => {
    if (!confirm(t('confirm_delete_rule'))) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/loyalty/tiers/${tierId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        toast.success(t('toasts.rule_deleted'));
        loadTiers();
      } else {
        throw new Error('Failed to delete tier');
      }
    } catch (error) {
      toast.error(t('toasts.failed_delete'));
    }
  };

  const handleToggleTierStatus = async (tier: LoyaltyTier) => {
    try {
      const response = await fetch(`/api/admin/loyalty/tiers/${tier.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...tier,
          is_active: !tier.is_active,
        }),
      });

      if (response.ok) {
        toast.success(t('toasts.tier_updated'));
        await loadTiers();
      } else {
        throw new Error('Failed to update tier status');
      }
    } catch (error) {
      toast.error(t('toasts.failed_update'));
    }
  };

  const handleDeleteTransaction = async (transactionId: string) => {
    if (!confirm(t('confirm_delete_rule'))) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/loyalty/transactions/${transactionId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        toast.success(t('toasts.rule_deleted'));
        loadTransactions();
        loadStats();
      } else {
        throw new Error('Failed to delete transaction');
      }
    } catch (error) {
      toast.error(t('toasts.failed_delete'));
    }
  };

  const handleAdjustPoints = async () => {
    try {
      const response = await fetch('/api/admin/loyalty/adjust-points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(adjustForm),
      });

      if (response.ok) {
        const absolutePoints = Math.abs(adjustForm.points);
        const message = adjustForm.points > 0
          ? t('toasts.points_adjusted_add', { count: absolutePoints, points: absolutePoints, email: adjustForm.client_email })
          : t('toasts.points_adjusted_deduct', { count: absolutePoints, points: absolutePoints, email: adjustForm.client_email });
        toast.success(message);
        setShowAdjustDialog(false);
        setAdjustForm({ client_email: '', points: 0, reason: '' });
        loadTransactions();
      } else {
        throw new Error('Failed to adjust points');
      }
    } catch (error) {
      toast.error(t('toasts.failed_adjust'));
    }
  };

  // ... (Stats Cards array - same as before)
  const statsCards = [
    {
      title: t('stats.total_points_issued'),
      value: stats.total_points_issued.toLocaleString(),
      icon: Gift,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: t('stats.points_redeemed'),
      value: stats.points_redeemed.toLocaleString(),
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: t('stats.active_members'),
      value: stats.active_members.toLocaleString(),
      icon: TrendingUp,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
  ];

  const cardClassName = embedded ? 'crm-calendar-panel bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden' : '';
  const showHeader = !embedded || showEmbeddedHeader;
  const handleOpenAdjustDialog = useCallback(() => {
    setShowAdjustDialog(true);
  }, []);

  useEffect(() => {
    if (typeof onEmbeddedPrimaryActionReady !== 'function') {
      return;
    }

    if (embedded && canManageLoyalty) {
      onEmbeddedPrimaryActionReady(() => handleOpenAdjustDialog());
      return () => onEmbeddedPrimaryActionReady(null);
    }

    onEmbeddedPrimaryActionReady(null);
  }, [embedded, canManageLoyalty, handleOpenAdjustDialog, onEmbeddedPrimaryActionReady]);

  return (
    <div className="space-y-6">
      {/* Header */}
      {showHeader && (
        <div className={embedded ? 'flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between' : 'flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4'}>
          <div className={embedded ? 'min-w-0 lg:flex-1' : 'min-w-0'}>
            <h1 className={embedded ? 'text-3xl text-gray-900 mb-2 flex items-center gap-3' : 'text-3xl font-bold text-gray-900'}>
              {embedded && <Gift className="w-8 h-8 text-blue-600" />}
              {t('title')}
            </h1>
            <p className={embedded ? 'text-gray-600' : 'text-gray-500 mt-1'}>{t('subtitle')}</p>
          </div>
          {canManageLoyalty && (
            <div className="flex gap-2 w-full sm:w-auto lg:self-start">
              <Button
                onClick={handleOpenAdjustDialog}
                className={embedded ? 'w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-11 px-6 font-semibold shadow-sm' : ''}
              >
                <Plus className="w-4 h-4 mr-2" />
                {t('adjust_points')}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {statsCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className={cardClassName}>
              <CardContent className="p-5 sm:p-6">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
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

      {/* Global Configuration */}
      <Card className={cardClassName}>
        <CardHeader className="space-y-3">
          <CardTitle>{t('config.title', 'Настройки')}</CardTitle>
          <CardDescription>{t('config.description', 'Управление глобальными настройками лояльности')}</CardDescription>
        </CardHeader>
        <CardContent className={embedded ? 'pt-0' : ''}>
          {embedded ? (
            <div className="max-w-5xl space-y-6">
              <div className="space-y-2">
                <Label className="text-base font-semibold text-gray-900">{t('config.cashback_rate', 'Кэшбэк (%)')}</Label>
                <div className="flex flex-wrap items-center gap-3">
                  <Input
                    type="number"
                    step="0.1"
                    value={cashbackPercent}
                    onChange={(e) => setConfig({ ...config, loyalty_points_conversion_rate: parseNumberOrFallback(e.target.value, cashbackPercent) / 100 })}
                    className="h-11 w-full sm:w-44"
                  />
                  <span className="text-base text-gray-500 font-semibold">%</span>
                  <span className="text-sm text-gray-500">
                    ({normalizedCashbackRate} {t('config.points_per_unit', 'баллов за 1 ед. валюты')})
                  </span>
                </div>
                <p className="text-sm text-gray-500 leading-6">{t('config.cashback_hint', {
                  percent: cashbackPercent,
                  points: pointsPerHundredCurrencyUnits,
                  unit: 100,
                  defaultValue: 'Пример: 10% кэшбэк (10 баллов за каждые 100 потраченных)'
                })}</p>
              </div>

              <div className="space-y-2">
                <Label className="text-base font-semibold text-gray-900">{t('config.expiration_days', 'Срок действия баллов (дней)')}</Label>
                <div className="flex flex-col lg:flex-row lg:items-start gap-3">
                  <div className="w-full space-y-2">
                    <Input
                      type="number"
                      value={config.points_expiration_days}
                      onChange={(e) => setConfig({ ...config, points_expiration_days: parseIntegerOrFallback(e.target.value, config.points_expiration_days) })}
                      placeholder="365"
                      className="h-11 w-full"
                    />
                    <p className="text-sm text-gray-500 leading-6">
                      {t('config.expiration_hint', 'Начисленные баллы сгорят через указанное количество дней.')}
                    </p>
                  </div>
                  {canManageLoyalty && (
                    <div className="w-full lg:w-auto lg:min-w-[170px]">
                      <Button onClick={handleUpdateConfig} className="w-full lg:w-auto lg:min-w-[170px] bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-11 px-6 font-semibold shadow-sm">
                        {t('buttons.save', 'Сохранить')}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-end gap-4 max-w-md">
              <div className="space-y-2">
                <Label>{t('config.cashback_rate', 'Кэшбэк (%)')}</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={cashbackPercent}
                  onChange={(e) => setConfig({ ...config, loyalty_points_conversion_rate: parseNumberOrFallback(e.target.value, cashbackPercent) / 100 })}
                  className="w-24"
                />
                <p className="text-sm text-gray-500">{t('config.cashback_hint', {
                  percent: cashbackPercent,
                  points: pointsPerHundredCurrencyUnits,
                  unit: 100,
                  defaultValue: 'Пример: 10% кэшбэк (10 баллов за каждые 100 потраченных)'
                })}</p>
              </div>
              <div className="space-y-2">
                <Label>{t('config.expiration_days', 'Срок действия баллов (дней)')}</Label>
                <Input
                  type="number"
                  value={config.points_expiration_days}
                  onChange={(e) => setConfig({ ...config, points_expiration_days: parseIntegerOrFallback(e.target.value, config.points_expiration_days) })}
                  placeholder="365"
                />
                <p className="text-sm text-gray-500">
                  {t('config.expiration_hint', 'Начисленные баллы сгорят через указанное количество дней.')}
                </p>
              </div>
              {canManageLoyalty && (
                <Button onClick={handleUpdateConfig}>
                  {t('buttons.save', 'Сохранить')}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Category Rules */}
      <Card className={cardClassName}>
        <CardHeader className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 space-y-2 sm:space-y-0">
          <div className="space-y-1.5">
            <CardTitle>{t('categories.title', 'Правила начисления по категориям')}</CardTitle>
            <CardDescription>{t('categories.description', 'Настройте коэффициент начисления баллов для каждой категории услуг')}</CardDescription>
            <p className="text-sm text-gray-500">{t('categories.hint', 'Коэффициент применяется только к выбранной категории. Для выключенных правил используется обычное начисление x1.')}</p>
          </div>
          {canManageLoyalty && (
            <Button variant="outline" size="sm" className="w-full sm:w-auto" onClick={() => {
              setRuleForm({ category: '', points_multiplier: 1.0, is_active: true });
              setShowRuleDialog(true);
            }}>
              <Plus className="w-4 h-4 mr-2" />
              {t('buttons.add_rule', 'Добавить правило')}
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table className="min-w-[900px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">{t('categories.category', 'Категория')}</TableHead>
                  <TableHead className="whitespace-nowrap">{t('categories.multiplier', 'Коэффициент начисления')}</TableHead>
                  <TableHead className="w-[140px] whitespace-nowrap">{t('common:status')}</TableHead>
                  {canManageLoyalty && <TableHead className="w-[260px] text-right whitespace-nowrap">{t('common:actions')}</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {categoryRules.map((rule) => (
                  <TableRow key={rule.category}>
                    <TableCell className="whitespace-nowrap">{rule.category}</TableCell>
                    <TableCell className="whitespace-nowrap">x{rule.points_multiplier}</TableCell>
                    <TableCell>
                      <Badge variant={rule.is_active ? 'default' : 'secondary'}>
                        {rule.is_active ? t('common:active') : t('statuses.inactive', 'Неактивно')}
                      </Badge>
                    </TableCell>
                    {canManageLoyalty && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant={rule.is_active ? 'secondary' : 'outline'} size="sm" onClick={() => handleToggleRuleStatus(rule)}>
                            {rule.is_active ? t('actions.deactivate', 'Отключить') : t('actions.activate', 'Включить')}
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => {
                            setRuleForm({
                              ...rule,
                              is_active: typeof rule.is_active === 'boolean' ? rule.is_active : true,
                            });
                            setShowRuleDialog(true);
                          }}>
                            <Edit className="w-4 h-4 mr-1" />
                            {t('common:edit')}
                          </Button>
                          <Button variant="outline" size="sm" className="text-red-500" onClick={() => handleDeleteRule(rule.category)}>
                            <Trash2 className="w-4 h-4 mr-1" />
                            {t('common:delete')}
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Loyalty Tiers */}
      <Card className={cardClassName}>
        <CardHeader className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 space-y-2 sm:space-y-0">
          <div className="space-y-1.5">
            <CardTitle>{t('tiers.title')}</CardTitle>
            <CardDescription>{t('tiers.description')}</CardDescription>
          </div>
          {canManageLoyalty && (
            <Button
              variant="outline"
              size="sm"
              className="w-full sm:w-auto"
              onClick={() => {
                setEditingTier({
                  id: '',
                  name: '',
                  min_points: 0,
                  discount: 0,
                  is_active: true,
                  color: '#CD7F32',
                });
                setShowTierDialog(true);
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              {t('common:add')}
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {tiers.map((tier) => (
              <div key={tier.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-gray-50 rounded-lg border border-gray-100">
                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: tier.color }}
                  >
                    {tier.name[0]}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-gray-900">{tier.name}</div>
                    <div className="text-sm text-gray-500">
                      {tier.min_points === 0 ? t('tiers.starting_level') : t('tiers.from_points', { points: tier.min_points.toLocaleString() })} • {t('tiers.discount', { percent: tier.discount })}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={tier.is_active ? 'default' : 'secondary'}>
                    {tier.is_active ? t('common:active') : t('statuses.inactive', 'Неактивно')}
                  </Badge>
                </div>
                {canManageLoyalty && (
                  <div className="flex gap-2 w-full sm:w-auto sm:justify-end">
                    <Button
                      variant={tier.is_active ? 'secondary' : 'outline'}
                      size="icon"
                      title={tier.is_active ? t('actions.deactivate', 'Отключить') : t('actions.activate', 'Включить')}
                      aria-label={tier.is_active ? t('actions.deactivate', 'Отключить') : t('actions.activate', 'Включить')}
                      className={`h-9 w-9 ${tier.is_active ? 'text-gray-700' : 'text-green-600'}`}
                      onClick={() => handleToggleTierStatus(tier)}
                    >
                      <Power className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      title={t('common:edit')}
                      aria-label={t('common:edit')}
                      className="h-9 w-9"
                      onClick={() => {
                        setEditingTier(tier);
                        setShowTierDialog(true);
                      }}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      title={t('common:delete')}
                      aria-label={t('common:delete')}
                      className="h-9 w-9 text-red-500"
                      onClick={() => handleDeleteTier(tier.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card className={cardClassName}>
        <CardHeader className="space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
            <div className="space-y-1.5">
              <CardTitle>{t('transactions.title')}</CardTitle>
              <CardDescription>{t('transactions.description')}</CardDescription>
            </div>
            <div className="w-full lg:w-auto">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder={t('transactions.search_placeholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 w-full sm:w-72"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table className="min-w-[980px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">{t('transactions.table.client')}</TableHead>
                  <TableHead className="whitespace-nowrap">{t('transactions.table.points')}</TableHead>
                  <TableHead className="whitespace-nowrap">{t('transactions.table.type')}</TableHead>
                  <TableHead className="whitespace-nowrap">{t('transactions.table.reason')}</TableHead>
                  <TableHead className="whitespace-nowrap">{t('transactions.table.date')}</TableHead>
                  {canManageLoyalty && <TableHead className="text-right whitespace-nowrap">{t('common:actions')}</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.map((transaction) => (
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
                    <TableCell className="whitespace-nowrap">{transaction.reason}</TableCell>
                    <TableCell className="whitespace-nowrap">{new Date(transaction.created_at).toLocaleDateString('ru-RU')}</TableCell>
                    {canManageLoyalty && (
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-500"
                          onClick={() => handleDeleteTransaction(transaction.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Tier Dialog */}
      <Dialog open={showTierDialog} onOpenChange={setShowTierDialog}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader className="space-y-2 pb-1">
            <DialogTitle>{t('dialogs.edit_tier.title')}</DialogTitle>
            <DialogDescription>{t('dialogs.edit_tier.description')}</DialogDescription>
          </DialogHeader>
          {editingTier && (
            <div className="space-y-4 pt-1">
              <div className="space-y-2">
                <Label>{t('dialogs.edit_tier.tier_name')}</Label>
                <Input
                  value={editingTier.name}
                  onChange={(e) => setEditingTier({ ...editingTier, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('dialogs.edit_tier.min_points')}</Label>
                <Input
                  type="number"
                  value={editingTier.min_points}
                  onChange={(e) => setEditingTier({ ...editingTier, min_points: parseIntegerOrFallback(e.target.value, editingTier.min_points) })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('dialogs.edit_tier.discount_percent')}</Label>
                <Input
                  type="number"
                  value={editingTier.discount}
                  onChange={(e) => setEditingTier({ ...editingTier, discount: parseIntegerOrFallback(e.target.value, editingTier.discount) })}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2.5">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium text-gray-900">{t('dialogs.edit_tier.status_label', 'Статус уровня')}</p>
                  <p className="text-xs text-gray-500">{t('dialogs.edit_tier.status_hint', 'Неактивный уровень не участвует в авторасчете привилегий')}</p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant={editingTier.is_active ? 'default' : 'outline'}
                  onClick={() => setEditingTier({ ...editingTier, is_active: !editingTier.is_active })}
                >
                  {editingTier.is_active ? t('common:active') : t('statuses.inactive', 'Неактивно')}
                </Button>
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

      {/* Category Rule Dialog */}
      <Dialog open={showRuleDialog} onOpenChange={setShowRuleDialog}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader className="space-y-2 pb-1">
            <DialogTitle>{t('dialogs.rule.title', 'Редактировать правило категории')}</DialogTitle>
            <DialogDescription>{t('dialogs.rule.description', 'Установите множитель баллов для категории услуг')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div className="space-y-2">
              <Label>{t('categories.category', 'Категория')}</Label>
              <Input
                value={ruleForm.category}
                onChange={(e) => setRuleForm({ ...ruleForm, category: e.target.value })}
                placeholder={t('categories.category_placeholder', 'Напр. Ногти')}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('categories.multiplier', 'Множитель')}</Label>
              <Input
                type="number"
                step="0.1"
                value={ruleForm.points_multiplier}
                onChange={(e) => setRuleForm({ ...ruleForm, points_multiplier: parseNumberOrFallback(e.target.value, ruleForm.points_multiplier) })}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2.5">
              <div className="space-y-0.5">
                <p className="text-sm font-medium text-gray-900">{t('dialogs.rule.status_label', 'Статус правила')}</p>
                <p className="text-xs text-gray-500">{t('dialogs.rule.status_hint', 'Если правило отключено, категории начисляются по базовой ставке')}</p>
              </div>
              <Button
                type="button"
                size="sm"
                variant={ruleForm.is_active ? 'default' : 'outline'}
                onClick={() => setRuleForm({ ...ruleForm, is_active: !ruleForm.is_active })}
              >
                {ruleForm.is_active ? t('common:active') : t('statuses.inactive', 'Неактивно')}
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRuleDialog(false)}>
              {t('buttons.cancel')}
            </Button>
            <Button onClick={handleSaveRule}>{t('buttons.save')}</Button>
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
                onChange={(e) => setAdjustForm({ ...adjustForm, points: parseIntegerOrFallback(e.target.value, adjustForm.points) })}
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
