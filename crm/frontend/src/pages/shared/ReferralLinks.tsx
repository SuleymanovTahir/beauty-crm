import { useEffect, useState } from 'react';
import {
  Link2, Plus, Copy, Trash2, ExternalLink, BarChart2, Download,
  ChevronDown, ChevronUp, RefreshCw, Edit2, Check, X,
  MousePointerClick, Users, ShoppingCart, TrendingUp, Calendar
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { toast } from 'sonner';
import { buildApiUrl } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReferralLink {
  id: number;
  name: string;
  slug: string;
  destination_url: string;
  advertiser_name?: string;
  advertiser_email?: string;
  campaign?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  is_active: boolean;
  created_at: string;
  expires_at?: string;
  total_clicks: number;
  unique_clicks: number;
  conversions: number;
  total_revenue: number;
}

interface LinkStats {
  total_clicks: number;
  unique_clicks: number;
  conversions: number;
  revenue: number;
  conversion_rate: number;
  daily: { date: string; clicks: number; unique: number }[];
  devices: Record<string, number>;
  browsers: Record<string, number>;
  countries: Record<string, number>;
}

interface CreateForm {
  name: string;
  destination_url: string;
  advertiser_name: string;
  advertiser_email: string;
  campaign: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_content: string;
  utm_term: string;
  expires_at: string;
}

const EMPTY_FORM: CreateForm = {
  name: '',
  destination_url: '',
  advertiser_name: '',
  advertiser_email: '',
  campaign: '',
  utm_source: '',
  utm_medium: '',
  utm_campaign: '',
  utm_content: '',
  utm_term: '',
  expires_at: '',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getShortUrl(slug: string) {
  return `${window.location.origin}/r/${slug}`;
}

function fmtDate(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('ru-RU');
}

function StatCard({ icon: Icon, label, value, color = 'blue' }: any) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
    green: 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400',
    purple: 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400',
    orange: 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400',
  };
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex items-center gap-3">
      <div className={`p-2 rounded-lg ${colors[color]}`}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
        <p className="text-lg font-bold text-gray-900 dark:text-white">{value}</p>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ReferralLinks() {
  const { currentUser } = useAuth();
  const [links, setLinks] = useState<ReferralLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<CreateForm>(EMPTY_FORM);
  const [creating, setCreating] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [stats, setStats] = useState<Record<number, LinkStats>>({});
  const [statsLoading, setStatsLoading] = useState<Record<number, boolean>>({});
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [reportLoading, setReportLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const canEdit = ['admin', 'director', 'marketer', 'manager'].includes(currentUser?.role || '');
  const canDelete = ['admin', 'director'].includes(currentUser?.role || '');

  // ─── Load links ─────────────────────────────────────────────────────────────

  const loadLinks = async () => {
    setLoading(true);
    try {
      const res = await fetch(buildApiUrl('/api/referral-links'), { credentials: 'include' });
      const data = await res.json();
      setLinks(data.links || []);
    } catch {
      toast.error('Ошибка загрузки ссылок');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadLinks(); }, []);

  // ─── Create ──────────────────────────────────────────────────────────────────

  const handleCreate = async () => {
    if (!form.name.trim() || !form.destination_url.trim()) {
      toast.error('Укажите название и URL назначения');
      return;
    }
    setCreating(true);
    try {
      const payload: any = { ...form };
      if (!payload.expires_at) delete payload.expires_at;
      Object.keys(payload).forEach(k => { if (!payload[k]) delete payload[k]; });

      const res = await fetch(buildApiUrl('/api/referral-links'), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Ссылка создана');
        setForm(EMPTY_FORM);
        setShowCreate(false);
        loadLinks();
      } else {
        toast.error(data.error || 'Ошибка создания ссылки');
      }
    } catch {
      toast.error('Ошибка создания ссылки');
    } finally {
      setCreating(false);
    }
  };

  // ─── Toggle active ───────────────────────────────────────────────────────────

  const toggleActive = async (link: ReferralLink) => {
    await fetch(buildApiUrl(`/api/referral-links/${link.id}`), {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !link.is_active }),
    });
    loadLinks();
  };

  // ─── Delete ──────────────────────────────────────────────────────────────────

  const handleDelete = async (id: number) => {
    if (!confirm('Удалить ссылку? Все данные о кликах будут потеряны.')) return;
    await fetch(buildApiUrl(`/api/referral-links/${id}`), {
      method: 'DELETE', credentials: 'include',
    });
    toast.success('Ссылка удалена');
    loadLinks();
  };

  // ─── Copy ────────────────────────────────────────────────────────────────────

  const copyUrl = (id: number, slug: string) => {
    navigator.clipboard.writeText(getShortUrl(slug));
    setCopiedId(id);
    toast.success('Ссылка скопирована');
    setTimeout(() => setCopiedId(null), 2000);
  };

  // ─── Expand stats ────────────────────────────────────────────────────────────

  const toggleExpand = async (id: number) => {
    if (expandedId === id) { setExpandedId(null); return; }
    setExpandedId(id);
    if (!stats[id]) {
      setStatsLoading(p => ({ ...p, [id]: true }));
      try {
        let url = `/api/referral-links/${id}/stats`;
        const params = new URLSearchParams();
        if (dateFrom) params.append('date_from', dateFrom);
        if (dateTo) params.append('date_to', dateTo);
        if (params.toString()) url += '?' + params.toString();
        const res = await fetch(buildApiUrl(url), { credentials: 'include' });
        const data = await res.json();
        setStats(p => ({ ...p, [id]: data }));
      } catch {
        toast.error('Ошибка загрузки статистики');
      } finally {
        setStatsLoading(p => ({ ...p, [id]: false }));
      }
    }
  };

  // ─── Reports ─────────────────────────────────────────────────────────────────

  const downloadReport = async (format: 'json' | 'csv', linkId?: number) => {
    setReportLoading(true);
    try {
      let url: string;
      if (linkId) {
        url = `/api/referral-links/report/detailed/${linkId}?format=${format}`;
      } else {
        url = `/api/referral-links/report/advertiser?format=${format}`;
      }
      if (dateFrom) url += `&date_from=${dateFrom}`;
      if (dateTo) url += `&date_to=${dateTo}`;

      const res = await fetch(buildApiUrl(url), { credentials: 'include' });
      if (format === 'csv') {
        const blob = await res.blob();
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = linkId ? `link_${linkId}_report.csv` : `ad_report.csv`;
        a.click();
      } else {
        const data = await res.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = linkId ? `link_${linkId}_report.json` : `ad_report.json`;
        a.click();
      }
      toast.success('Отчёт скачан');
    } catch {
      toast.error('Ошибка скачивания отчёта');
    } finally {
      setReportLoading(false);
    }
  };

  // ─── Aggregates ──────────────────────────────────────────────────────────────

  const totals = links.reduce((acc, l) => ({
    clicks: acc.clicks + (l.total_clicks || 0),
    unique: acc.unique + (l.unique_clicks || 0),
    conversions: acc.conversions + (l.conversions || 0),
    revenue: acc.revenue + (l.total_revenue || 0),
  }), { clicks: 0, unique: 0, conversions: 0, revenue: 0 });

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Link2 size={24} className="text-purple-500" />
            Рекламные ссылки
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Создавайте реферальные ссылки и отслеживайте переходы
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadLinks} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </Button>
          {canEdit && (
            <Button size="sm" onClick={() => setShowCreate(!showCreate)} className="gap-1">
              <Plus size={14} /> Новая ссылка
            </Button>
          )}
        </div>
      </div>

      {/* Summary stats */}
      {links.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard icon={MousePointerClick} label="Всего кликов" value={totals.clicks} color="blue" />
          <StatCard icon={Users} label="Уникальных" value={totals.unique} color="purple" />
          <StatCard icon={ShoppingCart} label="Конверсий" value={totals.conversions} color="green" />
          <StatCard icon={TrendingUp} label="Выручка" value={`${totals.revenue.toLocaleString()} ₽`} color="orange" />
        </div>
      )}

      {/* Date filter + Report download */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-gray-400" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Период:</span>
          </div>
          <Input
            type="date" value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="w-36 h-8 text-sm"
            placeholder="От"
          />
          <span className="text-gray-400">—</span>
          <Input
            type="date" value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="w-36 h-8 text-sm"
            placeholder="До"
          />
          <div className="ml-auto flex gap-2">
            <Button
              variant="outline" size="sm"
              onClick={() => downloadReport('csv')}
              disabled={reportLoading}
              className="gap-1"
            >
              <Download size={14} /> CSV-отчёт
            </Button>
            <Button
              variant="outline" size="sm"
              onClick={() => downloadReport('json')}
              disabled={reportLoading}
              className="gap-1"
            >
              <Download size={14} /> JSON-отчёт
            </Button>
          </div>
        </div>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Новая реферальная ссылка</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Название *</label>
              <Input
                placeholder="Например: Instagram апрель 2025"
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">URL назначения *</label>
              <Input
                placeholder="https://example.com/landing"
                value={form.destination_url}
                onChange={e => setForm(p => ({ ...p, destination_url: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Рекламодатель</label>
              <Input
                placeholder="ООО Реклама"
                value={form.advertiser_name}
                onChange={e => setForm(p => ({ ...p, advertiser_name: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Email рекламодателя</label>
              <Input
                placeholder="ads@company.com"
                value={form.advertiser_email}
                onChange={e => setForm(p => ({ ...p, advertiser_email: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Кампания</label>
              <Input
                placeholder="Весенняя акция"
                value={form.campaign}
                onChange={e => setForm(p => ({ ...p, campaign: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Срок действия</label>
              <Input
                type="date" value={form.expires_at}
                onChange={e => setForm(p => ({ ...p, expires_at: e.target.value }))}
              />
            </div>
          </div>

          {/* UTM параметры */}
          <button
            type="button"
            className="text-sm text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            UTM-параметры
          </button>
          {showAdvanced && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {(['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const).map(key => (
                <div key={key}>
                  <label className="text-xs text-gray-500 mb-1 block">{key}</label>
                  <Input
                    placeholder={key}
                    value={form[key]}
                    onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => { setShowCreate(false); setForm(EMPTY_FORM); }}>
              Отмена
            </Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? 'Создание...' : 'Создать ссылку'}
            </Button>
          </div>
        </div>
      )}

      {/* Links list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <RefreshCw size={24} className="animate-spin text-gray-400" />
        </div>
      ) : links.length === 0 ? (
        <div className="text-center py-16 text-gray-500 dark:text-gray-400">
          <Link2 size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">Нет реферальных ссылок</p>
          <p className="text-sm">Создайте первую ссылку для отслеживания рекламы</p>
        </div>
      ) : (
        <div className="space-y-3">
          {links.map(link => (
            <div
              key={link.id}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
            >
              {/* Link row */}
              <div className="p-4 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-900 dark:text-white">{link.name}</span>
                    {link.campaign && (
                      <Badge variant="outline" className="text-xs">{link.campaign}</Badge>
                    )}
                    <Badge className={`text-xs ${link.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {link.is_active ? 'Активна' : 'Отключена'}
                    </Badge>
                  </div>
                  {link.advertiser_name && (
                    <p className="text-xs text-gray-500 mt-0.5">Рекламодатель: {link.advertiser_name}</p>
                  )}
                  <div className="flex items-center gap-1 mt-1">
                    <code className="text-xs text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 px-2 py-0.5 rounded">
                      {getShortUrl(link.slug)}
                    </code>
                    <button
                      className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 p-1"
                      onClick={() => copyUrl(link.id, link.slug)}
                    >
                      {copiedId === link.id ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
                    </button>
                    <a
                      href={link.destination_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 p-1"
                    >
                      <ExternalLink size={13} />
                    </a>
                  </div>
                </div>

                {/* Stats pills */}
                <div className="hidden md:flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                  <span className="flex items-center gap-1">
                    <MousePointerClick size={13} className="text-blue-500" />
                    {link.total_clicks}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users size={13} className="text-purple-500" />
                    {link.unique_clicks}
                  </span>
                  <span className="flex items-center gap-1">
                    <ShoppingCart size={13} className="text-green-500" />
                    {link.conversions}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <button
                    className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                    onClick={() => toggleExpand(link.id)}
                    title="Статистика"
                  >
                    <BarChart2 size={15} />
                  </button>
                  <button
                    className="p-1.5 text-gray-400 hover:text-green-600 dark:hover:text-green-400"
                    onClick={() => downloadReport('csv', link.id)}
                    title="Скачать отчёт"
                  >
                    <Download size={15} />
                  </button>
                  {canEdit && (
                    <button
                      className={`p-1.5 ${link.is_active ? 'text-green-500 hover:text-yellow-500' : 'text-gray-400 hover:text-green-500'}`}
                      onClick={() => toggleActive(link)}
                      title={link.is_active ? 'Деактивировать' : 'Активировать'}
                    >
                      {link.is_active ? <Check size={15} /> : <X size={15} />}
                    </button>
                  )}
                  {canDelete && (
                    <button
                      className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                      onClick={() => handleDelete(link.id)}
                      title="Удалить"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                  <button
                    className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                    onClick={() => toggleExpand(link.id)}
                  >
                    {expandedId === link.id ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                  </button>
                </div>
              </div>

              {/* Expanded stats */}
              {expandedId === link.id && (
                <div className="border-t border-gray-100 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900/30">
                  {statsLoading[link.id] ? (
                    <div className="flex justify-center py-6">
                      <RefreshCw size={18} className="animate-spin text-gray-400" />
                    </div>
                  ) : stats[link.id] ? (
                    <div className="space-y-4">
                      {/* Top stats */}
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-center">
                        {[
                          { label: 'Кликов', value: stats[link.id].total_clicks },
                          { label: 'Уникальных', value: stats[link.id].unique_clicks },
                          { label: 'Конверсий', value: stats[link.id].conversions },
                          { label: 'Выручка', value: `${stats[link.id].revenue.toLocaleString()} ₽` },
                          { label: 'CR %', value: `${stats[link.id].conversion_rate}%` },
                        ].map(s => (
                          <div key={s.label} className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                            <p className="text-xl font-bold text-gray-900 dark:text-white">{s.value}</p>
                            <p className="text-xs text-gray-500">{s.label}</p>
                          </div>
                        ))}
                      </div>

                      {/* Breakdown grids */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Daily */}
                        <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                          <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">По дням</h4>
                          <div className="space-y-1 max-h-40 overflow-y-auto">
                            {(stats[link.id].daily || []).slice(-14).reverse().map(d => (
                              <div key={d.date} className="flex justify-between text-xs text-gray-700 dark:text-gray-300">
                                <span>{d.date}</span>
                                <span className="font-medium">{d.clicks} / {d.unique} уник.</span>
                              </div>
                            ))}
                            {!stats[link.id].daily?.length && <p className="text-xs text-gray-400">Нет данных</p>}
                          </div>
                        </div>

                        {/* Devices + Browsers */}
                        <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                          <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Устройства</h4>
                          <div className="space-y-1">
                            {Object.entries(stats[link.id].devices || {}).map(([k, v]) => (
                              <div key={k} className="flex justify-between text-xs text-gray-700 dark:text-gray-300">
                                <span>{k}</span>
                                <span className="font-medium">{v}</span>
                              </div>
                            ))}
                          </div>
                          <h4 className="text-xs font-semibold text-gray-500 uppercase mt-3 mb-2">Браузеры</h4>
                          <div className="space-y-1">
                            {Object.entries(stats[link.id].browsers || {}).slice(0, 5).map(([k, v]) => (
                              <div key={k} className="flex justify-between text-xs text-gray-700 dark:text-gray-300">
                                <span>{k}</span>
                                <span className="font-medium">{v}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Countries */}
                        <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                          <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Страны</h4>
                          <div className="space-y-1">
                            {Object.entries(stats[link.id].countries || {}).slice(0, 10).map(([k, v]) => (
                              <div key={k} className="flex justify-between text-xs text-gray-700 dark:text-gray-300">
                                <span>{k || '(неизвестно)'}</span>
                                <span className="font-medium">{v}</span>
                              </div>
                            ))}
                            {!Object.keys(stats[link.id].countries || {}).length && (
                              <p className="text-xs text-gray-400">Нет данных</p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* UTM info */}
                      {(link.utm_source || link.utm_medium || link.utm_campaign) && (
                        <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                          <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">UTM-метки</h4>
                          <div className="flex flex-wrap gap-2">
                            {link.utm_source && <Badge variant="outline" className="text-xs">source: {link.utm_source}</Badge>}
                            {link.utm_medium && <Badge variant="outline" className="text-xs">medium: {link.utm_medium}</Badge>}
                            {link.utm_campaign && <Badge variant="outline" className="text-xs">campaign: {link.utm_campaign}</Badge>}
                            {link.utm_content && <Badge variant="outline" className="text-xs">content: {link.utm_content}</Badge>}
                            {link.utm_term && <Badge variant="outline" className="text-xs">term: {link.utm_term}</Badge>}
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="outline" size="sm"
                          onClick={() => downloadReport('csv', link.id)}
                          className="gap-1 text-xs"
                        >
                          <Download size={12} /> Отчёт для рекламодателя (CSV)
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 text-center py-4">Нет данных</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
