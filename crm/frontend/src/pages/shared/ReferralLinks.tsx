import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BarChart2,
  Calendar,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  ExternalLink,
  Eye,
  Link2,
  MousePointerClick,
  Plus,
  RefreshCw,
  ShoppingCart,
  Trash2,
  TrendingUp,
  Users,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { buildApiUrl } from '@crm/api/client';
import { useAuth } from '../../contexts/AuthContext';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';

interface ReferralLink {
  id: number;
  name: string;
  slug: string;
  destination_url: string;
  advertiser_name?: string;
  advertiser_email?: string;
  campaign?: string;
  placement?: string;
  size_label?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  pricing_model?: string;
  currency?: string;
  budget_amount?: number;
  unit_price?: number;
  target_clicks?: number;
  target_conversions?: number;
  notes?: string;
  is_active: boolean;
  created_at: string;
  starts_at?: string;
  expires_at?: string;
  short_url?: string;
  tracking_pixel_url?: string;
  total_impressions: number;
  unique_impressions: number;
  total_clicks: number;
  unique_clicks: number;
  conversions: number;
  lead_conversions: number;
  total_revenue?: number;
  revenue?: number;
  spend?: number;
  ctr?: number;
  conversion_rate?: number;
  cpc?: number;
  cpa?: number;
  cpm?: number;
  roas?: number;
  budget_remaining?: number | null;
  click_goal_progress?: number | null;
  conversion_goal_progress?: number | null;
}

interface DailyStat {
  date: string;
  impressions: number;
  unique_impressions: number;
  clicks: number;
  unique_clicks: number;
  conversions: number;
  lead_conversions: number;
  revenue: number;
}

interface LinkStats {
  total_impressions: number;
  unique_impressions: number;
  total_clicks: number;
  unique_clicks: number;
  conversions: number;
  lead_conversions: number;
  revenue: number;
  spend: number;
  ctr: number;
  conversion_rate: number;
  cpc: number;
  cpa: number;
  cpm: number;
  roas: number;
  budget_amount?: number;
  budget_remaining?: number | null;
  click_goal_progress?: number | null;
  conversion_goal_progress?: number | null;
  daily: DailyStat[];
  devices: Record<string, number>;
  browsers: Record<string, number>;
  countries: Record<string, number>;
  referrers: Record<string, number>;
  placements: Record<string, number>;
  conversion_types: Record<string, number>;
  link?: ReferralLink;
}

interface CreateForm {
  name: string;
  destination_url: string;
  advertiser_name: string;
  advertiser_email: string;
  campaign: string;
  placement: string;
  size_label: string;
  pricing_model: string;
  currency: string;
  budget_amount: string;
  unit_price: string;
  target_clicks: string;
  target_conversions: string;
  notes: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_content: string;
  utm_term: string;
  starts_at: string;
  expires_at: string;
}

const EMPTY_FORM: CreateForm = {
  name: '',
  destination_url: '',
  advertiser_name: '',
  advertiser_email: '',
  campaign: '',
  placement: '',
  size_label: '',
  pricing_model: 'flat',
  currency: '',
  budget_amount: '',
  unit_price: '',
  target_clicks: '',
  target_conversions: '',
  notes: '',
  utm_source: '',
  utm_medium: '',
  utm_campaign: '',
  utm_content: '',
  utm_term: '',
  starts_at: '',
  expires_at: '',
};

function toNumberOrUndefined(value: string): number | undefined {
  const trimmedValue = value.trim();
  if (trimmedValue.length === 0) {
    return undefined;
  }
  const numericValue = Number(trimmedValue);
  return Number.isFinite(numericValue) ? numericValue : undefined;
}

function formatDate(value?: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return '—';
  }
  const dateValue = new Date(value);
  if (Number.isNaN(dateValue.getTime())) {
    return '—';
  }
  return dateValue.toLocaleDateString('ru-RU');
}

function formatMoney(value: number | undefined, currency: string | undefined): string {
  const numericValue = Number.isFinite(value) ? Number(value) : 0;
  const normalizedCurrency = currency?.trim() ?? '';
  return normalizedCurrency.length > 0 ? `${numericValue.toLocaleString()} ${normalizedCurrency}` : numericValue.toLocaleString();
}

function buildShortUrl(link: ReferralLink): string {
  return link.short_url ?? `${window.location.origin}/r/${link.slug}`;
}

function buildPixelUrl(link: ReferralLink): string {
  return link.tracking_pixel_url ?? `${window.location.origin}/r/i/${link.slug}`;
}

function StatCard({ icon: Icon, label, value }: { icon: typeof Eye; label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-3">
        <div className="rounded-lg border border-slate-200 p-2">
          <Icon size={18} />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-slate-500">{label}</p>
          <p className="truncate text-lg font-semibold text-slate-900">{value}</p>
        </div>
      </div>
    </div>
  );
}

function BreakdownBlock({
  title,
  items,
  emptyLabel,
}: {
  title: string;
  items: Record<string, number>;
  emptyLabel: string;
}) {
  const entries = Object.entries(items);
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h4 className="mb-3 text-sm font-semibold text-slate-900">{title}</h4>
      {entries.length === 0 ? (
        <p className="text-sm text-slate-500">{emptyLabel}</p>
      ) : (
        <div className="space-y-2">
          {entries.map(([key, value]) => (
            <div key={key} className="flex items-center justify-between gap-3 text-sm">
              <span className="truncate text-slate-600">{key}</span>
              <span className="font-medium text-slate-900">{value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ReferralLinks() {
  const { t } = useTranslation('common');
  const { user: currentUser } = useAuth();
  const [links, setLinks] = useState<ReferralLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [form, setForm] = useState<CreateForm>(EMPTY_FORM);
  const [creating, setCreating] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [stats, setStats] = useState<Record<number, LinkStats>>({});
  const [statsLoading, setStatsLoading] = useState<Record<number, boolean>>({});
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [reportLoading, setReportLoading] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const role = currentUser?.role ?? '';
  const canEdit = ['admin', 'director', 'marketer', 'manager'].includes(role);
  const canDelete = ['admin', 'director'].includes(role);

  const pricingOptions = [
    { value: 'flat', label: t('referral_pricing_flat', { defaultValue: 'Фикс за период' }) },
    { value: 'fixed', label: t('referral_pricing_fixed', { defaultValue: 'Фиксированная сумма' }) },
    { value: 'cpc', label: t('referral_pricing_cpc', { defaultValue: 'Оплата за клик (CPC)' }) },
    { value: 'cpa', label: t('referral_pricing_cpa', { defaultValue: 'Оплата за конверсию (CPA)' }) },
    { value: 'cpm', label: t('referral_pricing_cpm', { defaultValue: 'Оплата за 1000 показов (CPM)' }) },
  ];

  const loadLinks = async () => {
    setLoading(true);
    try {
      const response = await fetch(buildApiUrl('/api/referral-links'), { credentials: 'include' });
      const data = await response.json();
      setLinks(data.links ?? []);
    } catch {
      toast.error(t('referral_load_error', { defaultValue: 'Не удалось загрузить рекламные ссылки' }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadLinks();
  }, []);

  useEffect(() => {
    setStats({});
  }, [dateFrom, dateTo]);

  const handleCreate = async () => {
    if (form.name.trim().length === 0 || form.destination_url.trim().length === 0) {
      toast.error(t('referral_create_required', { defaultValue: 'Укажите название кампании и ссылку назначения' }));
      return;
    }

    setCreating(true);
    try {
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        destination_url: form.destination_url.trim(),
        advertiser_name: form.advertiser_name.trim(),
        advertiser_email: form.advertiser_email.trim(),
        campaign: form.campaign.trim(),
        placement: form.placement.trim(),
        size_label: form.size_label.trim(),
        pricing_model: form.pricing_model,
        currency: form.currency.trim(),
        budget_amount: toNumberOrUndefined(form.budget_amount),
        unit_price: toNumberOrUndefined(form.unit_price),
        target_clicks: toNumberOrUndefined(form.target_clicks),
        target_conversions: toNumberOrUndefined(form.target_conversions),
        notes: form.notes.trim(),
        utm_source: form.utm_source.trim(),
        utm_medium: form.utm_medium.trim(),
        utm_campaign: form.utm_campaign.trim(),
        utm_content: form.utm_content.trim(),
        utm_term: form.utm_term.trim(),
        starts_at: form.starts_at.trim(),
        expires_at: form.expires_at.trim(),
      };

      Object.keys(payload).forEach((key) => {
        const value = payload[key];
        if (value === '' || value == null) {
          delete payload[key];
        }
      });

      const response = await fetch(buildApiUrl('/api/referral-links'), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (data.success === true) {
        toast.success(t('referral_created', { defaultValue: 'Рекламная ссылка создана' }));
        setForm(EMPTY_FORM);
        setShowCreate(false);
        await loadLinks();
        return;
      }
      toast.error(data.error ?? t('referral_create_error', { defaultValue: 'Не удалось создать рекламную ссылку' }));
    } catch {
      toast.error(t('referral_create_error', { defaultValue: 'Не удалось создать рекламную ссылку' }));
    } finally {
      setCreating(false);
    }
  };

  const toggleActive = async (link: ReferralLink) => {
    try {
      const response = await fetch(buildApiUrl(`/api/referral-links/${link.id}`), {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !link.is_active }),
      });
      const data = await response.json();
      if (data.success === true) {
        toast.success(
          link.is_active
            ? t('referral_deactivated', { defaultValue: 'Кампания отключена' })
            : t('referral_activated', { defaultValue: 'Кампания активирована' }),
        );
        await loadLinks();
        return;
      }
      toast.error(t('referral_toggle_error', { defaultValue: 'Не удалось изменить статус кампании' }));
    } catch {
      toast.error(t('referral_toggle_error', { defaultValue: 'Не удалось изменить статус кампании' }));
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm(t('referral_delete_confirm', { defaultValue: 'Удалить рекламную ссылку и всю связанную статистику?' }))) {
      return;
    }

    try {
      const response = await fetch(buildApiUrl(`/api/referral-links/${id}`), {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await response.json();
      if (data.success === true) {
        toast.success(t('referral_deleted', { defaultValue: 'Рекламная ссылка удалена' }));
        await loadLinks();
        return;
      }
      toast.error(t('referral_delete_error', { defaultValue: 'Не удалось удалить рекламную ссылку' }));
    } catch {
      toast.error(t('referral_delete_error', { defaultValue: 'Не удалось удалить рекламную ссылку' }));
    }
  };

  const copyValue = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      toast.success(t('referral_copied', { defaultValue: 'Значение скопировано' }));
      window.setTimeout(() => setCopiedKey(null), 1500);
    } catch {
      toast.error(t('referral_copy_error', { defaultValue: 'Не удалось скопировать значение' }));
    }
  };

  const toggleExpand = async (linkId: number) => {
    if (expandedId === linkId) {
      setExpandedId(null);
      return;
    }

    setExpandedId(linkId);
    if (stats[linkId] != null) {
      return;
    }

    setStatsLoading((prev) => ({ ...prev, [linkId]: true }));
    try {
      const params = new URLSearchParams();
      if (dateFrom.trim().length > 0) {
        params.append('date_from', dateFrom);
      }
      if (dateTo.trim().length > 0) {
        params.append('date_to', dateTo);
      }
      const suffix = params.toString().length > 0 ? `?${params.toString()}` : '';
      const response = await fetch(buildApiUrl(`/api/referral-links/${linkId}/stats${suffix}`), {
        credentials: 'include',
      });
      const data = await response.json();
      setStats((prev) => ({ ...prev, [linkId]: data as LinkStats }));
    } catch {
      toast.error(t('referral_stats_error', { defaultValue: 'Не удалось загрузить статистику кампании' }));
    } finally {
      setStatsLoading((prev) => ({ ...prev, [linkId]: false }));
    }
  };

  const downloadReport = async (format: 'json' | 'csv', linkId?: number) => {
    setReportLoading(true);
    try {
      const params = new URLSearchParams({ format });
      if (dateFrom.trim().length > 0) {
        params.append('date_from', dateFrom);
      }
      if (dateTo.trim().length > 0) {
        params.append('date_to', dateTo);
      }

      const url = linkId != null
        ? `/api/referral-links/report/detailed/${linkId}?${params.toString()}`
        : `/api/referral-links/report/advertiser?${params.toString()}`;

      const response = await fetch(buildApiUrl(url), { credentials: 'include' });
      if (format === 'csv') {
        const blob = await response.blob();
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = linkId != null ? `advertiser_link_${linkId}.csv` : 'advertiser_report.csv';
        link.click();
      } else {
        const data = await response.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = linkId != null ? `advertiser_link_${linkId}.json` : 'advertiser_report.json';
        link.click();
      }
      toast.success(t('referral_report_downloaded', { defaultValue: 'Отчёт скачан' }));
    } catch {
      toast.error(t('referral_report_error', { defaultValue: 'Не удалось скачать отчёт' }));
    } finally {
      setReportLoading(false);
    }
  };

  const totals = links.reduce(
    (accumulator, item) => ({
      impressions: accumulator.impressions + (item.total_impressions ?? 0),
      clicks: accumulator.clicks + (item.total_clicks ?? 0),
      conversions: accumulator.conversions + (item.conversions ?? 0),
      spend: accumulator.spend + (item.spend ?? 0),
      revenue: accumulator.revenue + (item.revenue ?? item.total_revenue ?? 0),
    }),
    { impressions: 0, clicks: 0, conversions: 0, spend: 0, revenue: 0 },
  );
  const totalCtr = totals.impressions > 0 ? ((totals.clicks / totals.impressions) * 100).toFixed(2) : '0.00';
  const summaryCurrency = links.find((item) => (item.currency?.trim() ?? '').length > 0)?.currency ?? '';

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-slate-900">
            <Link2 size={22} />
            {t('referral_title', { defaultValue: 'Рекламные кампании' })}
          </h1>
          <p className="max-w-3xl text-sm text-slate-500">
            {t('referral_subtitle', {
              defaultValue:
                'Создавайте рекламные и реферальные ссылки, считайте показы и клики, собирайте конверсии и выгружайте отчёты для рекламодателя.',
            })}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => void loadLinks()} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </Button>
          <Button variant="outline" size="sm" onClick={() => void downloadReport('csv')} disabled={reportLoading}>
            <Download size={14} />
            <span className="ml-2">{t('referral_report_csv', { defaultValue: 'CSV-отчёт' })}</span>
          </Button>
          <Button variant="outline" size="sm" onClick={() => void downloadReport('json')} disabled={reportLoading}>
            <Download size={14} />
            <span className="ml-2">{t('referral_report_json', { defaultValue: 'JSON-отчёт' })}</span>
          </Button>
          {canEdit ? (
            <Button size="sm" onClick={() => setShowCreate((prev) => !prev)}>
              <Plus size={14} />
              <span className="ml-2">{t('referral_create_button', { defaultValue: 'Новая кампания' })}</span>
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-5">
        <StatCard icon={Eye} label={t('referral_impressions', { defaultValue: 'Показы' })} value={totals.impressions} />
        <StatCard icon={MousePointerClick} label={t('referral_clicks', { defaultValue: 'Клики' })} value={totals.clicks} />
        <StatCard icon={TrendingUp} label={t('referral_ctr', { defaultValue: 'CTR' })} value={`${totalCtr}%`} />
        <StatCard icon={ShoppingCart} label={t('referral_conversions', { defaultValue: 'Конверсии' })} value={totals.conversions} />
        <StatCard icon={Users} label={t('referral_spend', { defaultValue: 'Расход' })} value={formatMoney(totals.spend, summaryCurrency)} />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <Calendar size={16} />
            <span>{t('referral_period', { defaultValue: 'Период' })}</span>
          </div>
          <Input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} className="w-40" />
          <Input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} className="w-40" />
          <div className="ml-auto text-sm text-slate-500">
            {t('referral_period_hint', { defaultValue: 'Фильтр применяется к статистике и экспортируемым отчётам.' })}
          </div>
        </div>
      </div>

      {showCreate ? (
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-slate-900">{t('referral_create_title', { defaultValue: 'Новая рекламная кампания' })}</h2>
            <p className="text-sm text-slate-500">
              {t('referral_create_hint', {
                defaultValue:
                  'Заполните ссылку перехода, параметры размещения и коммерческие условия, чтобы затем отдавать рекламодателю полный отчёт.',
              })}
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-1">
              <label className="text-xs text-slate-500">{t('referral_name_label', { defaultValue: 'Название кампании' })}</label>
              <Input value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-500">{t('referral_destination_label', { defaultValue: 'Ссылка назначения' })}</label>
              <Input value={form.destination_url} onChange={(event) => setForm((prev) => ({ ...prev, destination_url: event.target.value }))} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-500">{t('referral_advertiser_label', { defaultValue: 'Рекламодатель' })}</label>
              <Input value={form.advertiser_name} onChange={(event) => setForm((prev) => ({ ...prev, advertiser_name: event.target.value }))} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-500">{t('referral_advertiser_email_label', { defaultValue: 'Email рекламодателя' })}</label>
              <Input value={form.advertiser_email} onChange={(event) => setForm((prev) => ({ ...prev, advertiser_email: event.target.value }))} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-500">{t('referral_campaign_label', { defaultValue: 'Кампания' })}</label>
              <Input value={form.campaign} onChange={(event) => setForm((prev) => ({ ...prev, campaign: event.target.value }))} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-500">{t('referral_placement_label', { defaultValue: 'Место размещения' })}</label>
              <Input value={form.placement} onChange={(event) => setForm((prev) => ({ ...prev, placement: event.target.value }))} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-500">{t('referral_size_label', { defaultValue: 'Размер или формат' })}</label>
              <Input value={form.size_label} onChange={(event) => setForm((prev) => ({ ...prev, size_label: event.target.value }))} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-500">{t('referral_pricing_model_label', { defaultValue: 'Модель оплаты' })}</label>
              <select
                value={form.pricing_model}
                onChange={(event) => setForm((prev) => ({ ...prev, pricing_model: event.target.value }))}
                className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900"
              >
                {pricingOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-500">{t('referral_currency_label', { defaultValue: 'Валюта' })}</label>
              <Input value={form.currency} onChange={(event) => setForm((prev) => ({ ...prev, currency: event.target.value }))} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-500">{t('referral_budget_label', { defaultValue: 'Бюджет или сумма договора' })}</label>
              <Input value={form.budget_amount} onChange={(event) => setForm((prev) => ({ ...prev, budget_amount: event.target.value }))} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-500">{t('referral_unit_price_label', { defaultValue: 'Ставка за единицу' })}</label>
              <Input value={form.unit_price} onChange={(event) => setForm((prev) => ({ ...prev, unit_price: event.target.value }))} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-500">{t('referral_target_clicks_label', { defaultValue: 'План по кликам' })}</label>
              <Input value={form.target_clicks} onChange={(event) => setForm((prev) => ({ ...prev, target_clicks: event.target.value }))} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-500">{t('referral_target_conversions_label', { defaultValue: 'План по конверсиям' })}</label>
              <Input value={form.target_conversions} onChange={(event) => setForm((prev) => ({ ...prev, target_conversions: event.target.value }))} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-500">{t('referral_start_label', { defaultValue: 'Начало размещения' })}</label>
              <Input type="date" value={form.starts_at} onChange={(event) => setForm((prev) => ({ ...prev, starts_at: event.target.value }))} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-500">{t('referral_end_label', { defaultValue: 'Окончание размещения' })}</label>
              <Input type="date" value={form.expires_at} onChange={(event) => setForm((prev) => ({ ...prev, expires_at: event.target.value }))} />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-slate-500">{t('referral_notes_label', { defaultValue: 'Комментарий для отчёта' })}</label>
            <Textarea
              value={form.notes}
              onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
              className="min-h-[96px]"
            />
          </div>

          <button
            type="button"
            className="inline-flex items-center gap-2 text-sm text-slate-600"
            onClick={() => setShowAdvanced((prev) => !prev)}
          >
            {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            <span>{t('referral_advanced_toggle', { defaultValue: 'UTM-метки и расширенные параметры' })}</span>
          </button>

          {showAdvanced ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              {(['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const).map((key) => (
                <div key={key} className="space-y-1">
                  <label className="text-xs text-slate-500">{key}</label>
                  <Input value={form[key]} onChange={(event) => setForm((prev) => ({ ...prev, [key]: event.target.value }))} />
                </div>
              ))}
            </div>
          ) : null}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => { setShowCreate(false); setForm(EMPTY_FORM); }}>
              {t('referral_cancel', { defaultValue: 'Отмена' })}
            </Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? t('referral_creating', { defaultValue: 'Создание...' }) : t('referral_save', { defaultValue: 'Создать кампанию' })}
            </Button>
          </div>
        </div>
      ) : null}

      {loading ? (
        <div className="flex justify-center py-16">
          <RefreshCw size={24} className="animate-spin text-slate-400" />
        </div>
      ) : links.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white py-16 text-center">
          <Link2 size={36} className="mx-auto mb-3 text-slate-300" />
          <p className="font-medium text-slate-900">{t('referral_empty_title', { defaultValue: 'Рекламные кампании ещё не созданы' })}</p>
          <p className="mt-1 text-sm text-slate-500">
            {t('referral_empty_description', {
              defaultValue: 'После создания ссылки вы сможете считать показы, клики, конверсии и готовить отчёт для рекламодателя.',
            })}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {links.map((link) => {
            const shortUrl = buildShortUrl(link);
            const pixelUrl = buildPixelUrl(link);
            const stat = stats[link.id];

            return (
              <div key={link.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <div className="space-y-4 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-base font-semibold text-slate-900">{link.name}</span>
                        {link.campaign?.trim().length ? <Badge variant="outline">{link.campaign}</Badge> : null}
                        {link.placement?.trim().length ? <Badge variant="outline">{link.placement}</Badge> : null}
                        {link.pricing_model?.trim().length ? <Badge variant="outline">{link.pricing_model.toUpperCase()}</Badge> : null}
                        <Badge variant="outline">
                          {link.is_active
                            ? t('referral_status_active', { defaultValue: 'Активна' })
                            : t('referral_status_inactive', { defaultValue: 'Отключена' })}
                        </Badge>
                      </div>
                      <div className="grid gap-2 text-sm text-slate-500 md:grid-cols-3">
                        <span>{t('referral_advertiser_short', { defaultValue: 'Рекламодатель' })}: {link.advertiser_name?.trim() ?? '—'}</span>
                        <span>{t('referral_schedule_short', { defaultValue: 'Период' })}: {formatDate(link.starts_at)} - {formatDate(link.expires_at)}</span>
                        <span>{t('referral_budget_short', { defaultValue: 'Бюджет' })}: {formatMoney(link.budget_amount, link.currency)}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => void toggleExpand(link.id)}>
                        <BarChart2 size={14} />
                        <span className="ml-2">{t('referral_stats_button', { defaultValue: 'Статистика' })}</span>
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => void downloadReport('csv', link.id)}>
                        <Download size={14} />
                        <span className="ml-2">{t('referral_report_button', { defaultValue: 'Отчёт' })}</span>
                      </Button>
                      {canEdit ? (
                        <Button variant="outline" size="sm" onClick={() => void toggleActive(link)}>
                          {link.is_active ? <X size={14} /> : <Check size={14} />}
                        </Button>
                      ) : null}
                      {canDelete ? (
                        <Button variant="outline" size="sm" onClick={() => void handleDelete(link.id)}>
                          <Trash2 size={14} />
                        </Button>
                      ) : null}
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-xl border border-slate-200 p-3">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-slate-900">{t('referral_short_link', { defaultValue: 'Ссылка перехода' })}</p>
                        <div className="flex items-center gap-2">
                          <button className="text-slate-500" onClick={() => void copyValue(`short-${link.id}`, shortUrl)}>
                            {copiedKey === `short-${link.id}` ? <Check size={14} /> : <Copy size={14} />}
                          </button>
                          <a href={link.destination_url} target="_blank" rel="noopener noreferrer" className="text-slate-500">
                            <ExternalLink size={14} />
                          </a>
                        </div>
                      </div>
                      <code className="block overflow-x-auto rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-700">{shortUrl}</code>
                    </div>
                    <div className="rounded-xl border border-slate-200 p-3">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-slate-900">{t('referral_pixel_link', { defaultValue: 'Пиксель учёта показов' })}</p>
                        <button className="text-slate-500" onClick={() => void copyValue(`pixel-${link.id}`, pixelUrl)}>
                          {copiedKey === `pixel-${link.id}` ? <Check size={14} /> : <Copy size={14} />}
                        </button>
                      </div>
                      <code className="block overflow-x-auto rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-700">{pixelUrl}</code>
                    </div>
                  </div>

                  <div className="grid gap-3 text-sm md:grid-cols-6">
                    <div className="rounded-lg border border-slate-200 px-3 py-2">
                      <p className="text-xs text-slate-500">{t('referral_impressions', { defaultValue: 'Показы' })}</p>
                      <p className="text-base font-semibold text-slate-900">{link.total_impressions ?? 0}</p>
                    </div>
                    <div className="rounded-lg border border-slate-200 px-3 py-2">
                      <p className="text-xs text-slate-500">{t('referral_clicks', { defaultValue: 'Клики' })}</p>
                      <p className="text-base font-semibold text-slate-900">{link.total_clicks ?? 0}</p>
                    </div>
                    <div className="rounded-lg border border-slate-200 px-3 py-2">
                      <p className="text-xs text-slate-500">{t('referral_ctr', { defaultValue: 'CTR' })}</p>
                      <p className="text-base font-semibold text-slate-900">{`${(link.ctr ?? 0).toFixed(2)}%`}</p>
                    </div>
                    <div className="rounded-lg border border-slate-200 px-3 py-2">
                      <p className="text-xs text-slate-500">{t('referral_conversions', { defaultValue: 'Конверсии' })}</p>
                      <p className="text-base font-semibold text-slate-900">{link.conversions ?? 0}</p>
                    </div>
                    <div className="rounded-lg border border-slate-200 px-3 py-2">
                      <p className="text-xs text-slate-500">{t('referral_spend', { defaultValue: 'Расход' })}</p>
                      <p className="text-base font-semibold text-slate-900">{formatMoney(link.spend, link.currency)}</p>
                    </div>
                    <div className="rounded-lg border border-slate-200 px-3 py-2">
                      <p className="text-xs text-slate-500">{t('referral_revenue', { defaultValue: 'Выручка' })}</p>
                      <p className="text-base font-semibold text-slate-900">{formatMoney(link.revenue ?? link.total_revenue, link.currency)}</p>
                    </div>
                  </div>
                </div>

                {expandedId === link.id ? (
                  <div className="border-t border-slate-200 bg-slate-50 p-4">
                    {statsLoading[link.id] ? (
                      <div className="flex justify-center py-8">
                        <RefreshCw size={20} className="animate-spin text-slate-400" />
                      </div>
                    ) : stat != null ? (
                      <div className="space-y-4">
                        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
                          <StatCard icon={Eye} label={t('referral_impressions', { defaultValue: 'Показы' })} value={stat.total_impressions} />
                          <StatCard icon={MousePointerClick} label={t('referral_clicks', { defaultValue: 'Клики' })} value={stat.total_clicks} />
                          <StatCard icon={TrendingUp} label={t('referral_ctr', { defaultValue: 'CTR' })} value={`${stat.ctr.toFixed(2)}%`} />
                          <StatCard icon={ShoppingCart} label={t('referral_conversions', { defaultValue: 'Конверсии' })} value={stat.conversions} />
                          <StatCard icon={Users} label={t('referral_spend', { defaultValue: 'Расход' })} value={formatMoney(stat.spend, link.currency)} />
                          <StatCard icon={TrendingUp} label={t('referral_roas', { defaultValue: 'ROAS' })} value={stat.roas.toFixed(2)} />
                        </div>

                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                          <div className="rounded-xl border border-slate-200 bg-white p-4">
                            <p className="text-xs text-slate-500">{t('referral_cpc', { defaultValue: 'CPC' })}</p>
                            <p className="mt-1 text-lg font-semibold text-slate-900">{formatMoney(stat.cpc, link.currency)}</p>
                          </div>
                          <div className="rounded-xl border border-slate-200 bg-white p-4">
                            <p className="text-xs text-slate-500">{t('referral_cpa', { defaultValue: 'CPA' })}</p>
                            <p className="mt-1 text-lg font-semibold text-slate-900">{formatMoney(stat.cpa, link.currency)}</p>
                          </div>
                          <div className="rounded-xl border border-slate-200 bg-white p-4">
                            <p className="text-xs text-slate-500">{t('referral_cpm', { defaultValue: 'CPM' })}</p>
                            <p className="mt-1 text-lg font-semibold text-slate-900">{formatMoney(stat.cpm, link.currency)}</p>
                          </div>
                          <div className="rounded-xl border border-slate-200 bg-white p-4">
                            <p className="text-xs text-slate-500">{t('referral_budget_remaining', { defaultValue: 'Остаток бюджета' })}</p>
                            <p className="mt-1 text-lg font-semibold text-slate-900">{formatMoney(stat.budget_remaining ?? 0, link.currency)}</p>
                          </div>
                        </div>

                        <div className="grid gap-4 xl:grid-cols-3">
                          <div className="rounded-xl border border-slate-200 bg-white p-4 xl:col-span-2">
                            <div className="mb-3 flex items-center justify-between gap-2">
                              <h4 className="text-sm font-semibold text-slate-900">{t('referral_daily_title', { defaultValue: 'Динамика по дням' })}</h4>
                              <span className="text-xs text-slate-500">
                                {t('referral_daily_hint', { defaultValue: 'Показы / клики / конверсии / выручка' })}
                              </span>
                            </div>
                            {stat.daily.length === 0 ? (
                              <p className="text-sm text-slate-500">{t('referral_no_data', { defaultValue: 'Нет данных за выбранный период' })}</p>
                            ) : (
                              <div className="space-y-2">
                                {stat.daily.slice(-14).reverse().map((row) => (
                                  <div key={row.date} className="grid gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm md:grid-cols-5">
                                    <span className="font-medium text-slate-900">{row.date}</span>
                                    <span className="text-slate-600">{t('referral_impressions', { defaultValue: 'Показы' })}: {row.impressions}</span>
                                    <span className="text-slate-600">{t('referral_clicks', { defaultValue: 'Клики' })}: {row.clicks}</span>
                                    <span className="text-slate-600">{t('referral_conversions', { defaultValue: 'Конверсии' })}: {row.conversions}</span>
                                    <span className="text-slate-600">{t('referral_revenue', { defaultValue: 'Выручка' })}: {formatMoney(row.revenue, link.currency)}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="rounded-xl border border-slate-200 bg-white p-4">
                            <h4 className="mb-3 text-sm font-semibold text-slate-900">{t('referral_goals_title', { defaultValue: 'Планы и KPI' })}</h4>
                            <div className="space-y-3 text-sm">
                              <div>
                                <p className="text-slate-500">{t('referral_budget_label', { defaultValue: 'Бюджет или сумма договора' })}</p>
                                <p className="font-medium text-slate-900">{formatMoney(stat.budget_amount, link.currency)}</p>
                              </div>
                              <div>
                                <p className="text-slate-500">{t('referral_click_goal_progress', { defaultValue: 'Прогресс по кликам' })}</p>
                                <p className="font-medium text-slate-900">
                                  {stat.click_goal_progress != null ? `${stat.click_goal_progress.toFixed(2)}%` : '—'}
                                </p>
                              </div>
                              <div>
                                <p className="text-slate-500">{t('referral_conversion_goal_progress', { defaultValue: 'Прогресс по конверсиям' })}</p>
                                <p className="font-medium text-slate-900">
                                  {stat.conversion_goal_progress != null ? `${stat.conversion_goal_progress.toFixed(2)}%` : '—'}
                                </p>
                              </div>
                              <div>
                                <p className="text-slate-500">{t('referral_leads', { defaultValue: 'Лиды' })}</p>
                                <p className="font-medium text-slate-900">{stat.lead_conversions}</p>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                          <BreakdownBlock
                            title={t('referral_devices_title', { defaultValue: 'Устройства' })}
                            items={stat.devices}
                            emptyLabel={t('referral_no_data', { defaultValue: 'Нет данных за выбранный период' })}
                          />
                          <BreakdownBlock
                            title={t('referral_browsers_title', { defaultValue: 'Браузеры' })}
                            items={stat.browsers}
                            emptyLabel={t('referral_no_data', { defaultValue: 'Нет данных за выбранный период' })}
                          />
                          <BreakdownBlock
                            title={t('referral_countries_title', { defaultValue: 'Страны' })}
                            items={stat.countries}
                            emptyLabel={t('referral_no_data', { defaultValue: 'Нет данных за выбранный период' })}
                          />
                          <BreakdownBlock
                            title={t('referral_referrers_title', { defaultValue: 'Источники переходов' })}
                            items={stat.referrers}
                            emptyLabel={t('referral_no_data', { defaultValue: 'Нет данных за выбранный период' })}
                          />
                          <BreakdownBlock
                            title={t('referral_placements_title', { defaultValue: 'Размещения' })}
                            items={stat.placements}
                            emptyLabel={t('referral_no_data', { defaultValue: 'Нет данных за выбранный период' })}
                          />
                          <BreakdownBlock
                            title={t('referral_conversion_types_title', { defaultValue: 'Типы конверсий' })}
                            items={stat.conversion_types}
                            emptyLabel={t('referral_no_data', { defaultValue: 'Нет данных за выбранный период' })}
                          />
                        </div>

                        {(link.utm_source?.trim().length ?? 0) > 0 || (link.utm_medium?.trim().length ?? 0) > 0 || (link.utm_campaign?.trim().length ?? 0) > 0 ? (
                          <div className="rounded-xl border border-slate-200 bg-white p-4">
                            <h4 className="mb-3 text-sm font-semibold text-slate-900">{t('referral_utm_title', { defaultValue: 'UTM-метки' })}</h4>
                            <div className="flex flex-wrap gap-2">
                              {link.utm_source?.trim().length ? <Badge variant="outline">source: {link.utm_source}</Badge> : null}
                              {link.utm_medium?.trim().length ? <Badge variant="outline">medium: {link.utm_medium}</Badge> : null}
                              {link.utm_campaign?.trim().length ? <Badge variant="outline">campaign: {link.utm_campaign}</Badge> : null}
                              {link.utm_content?.trim().length ? <Badge variant="outline">content: {link.utm_content}</Badge> : null}
                              {link.utm_term?.trim().length ? <Badge variant="outline">term: {link.utm_term}</Badge> : null}
                            </div>
                          </div>
                        ) : null}

                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => void copyValue(`pixel-code-${link.id}`, `<img src="${pixelUrl}" alt="" width="1" height="1" />`)}>
                            <Copy size={14} />
                            <span className="ml-2">{t('referral_copy_pixel_tag', { defaultValue: 'Копировать пиксель' })}</span>
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => void downloadReport('csv', link.id)}>
                            <Download size={14} />
                            <span className="ml-2">{t('referral_report_button', { defaultValue: 'Отчёт' })}</span>
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="py-8 text-center text-sm text-slate-500">
                        {t('referral_no_data', { defaultValue: 'Нет данных за выбранный период' })}
                      </p>
                    )}
                  </div>
                ) : null}

                <button
                  type="button"
                  className="flex w-full items-center justify-center gap-2 border-t border-slate-200 bg-white px-4 py-3 text-sm text-slate-600"
                  onClick={() => void toggleExpand(link.id)}
                >
                  {expandedId === link.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  <span>
                    {expandedId === link.id
                      ? t('referral_hide_details', { defaultValue: 'Скрыть детали' })
                      : t('referral_show_details', { defaultValue: 'Показать детали' })}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
