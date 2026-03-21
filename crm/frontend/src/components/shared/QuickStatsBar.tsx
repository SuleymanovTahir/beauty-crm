/**
 * QuickStatsBar — виджет быстрой статистики для верхней части Dashboard.
 * Данные: выручка сегодня, записей сегодня, ожидают подтверждения,
 * новых клиентов за неделю, средний рейтинг, записей в ближайший час.
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiClient } from '@/api/client';

interface QuickStats {
  revenue_today: number;
  bookings_today: number;
  pending_confirmations: number;
  new_clients_week: number;
  avg_rating_30d: number;
  upcoming_next_hour: number;
}

interface StatCardProps {
  label: string;
  value: string | number;
  icon: string;
  accent?: 'green' | 'blue' | 'orange' | 'purple' | 'yellow' | 'pink';
  badge?: string;
}

const ACCENT_CLASSES: Record<string, string> = {
  green:  'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800',
  blue:   'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800',
  orange: 'bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800',
  purple: 'bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800',
  yellow: 'bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800',
  pink:   'bg-pink-50 dark:bg-pink-950/30 border-pink-200 dark:border-pink-800',
};

const ICON_ACCENT: Record<string, string> = {
  green:  'text-emerald-600 dark:text-emerald-400',
  blue:   'text-blue-600 dark:text-blue-400',
  orange: 'text-orange-600 dark:text-orange-400',
  purple: 'text-purple-600 dark:text-purple-400',
  yellow: 'text-yellow-600 dark:text-yellow-400',
  pink:   'text-pink-600 dark:text-pink-400',
};

function StatCard({ label, value, icon, accent = 'blue', badge }: StatCardProps) {
  return (
    <div
      className={`
        relative flex flex-col gap-1 rounded-xl border px-4 py-3
        transition-all duration-200 hover:shadow-md hover:-translate-y-0.5
        ${ACCENT_CLASSES[accent]}
      `}
    >
      {badge && (
        <span className="absolute top-2 right-2 text-[10px] font-semibold bg-orange-500 text-white rounded-full px-1.5 py-0.5 leading-none">
          {badge}
        </span>
      )}
      <span className={`text-xl ${ICON_ACCENT[accent]}`}>{icon}</span>
      <span className="text-xl font-bold text-foreground leading-tight">{value}</span>
      <span className="text-xs text-muted-foreground leading-tight">{label}</span>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-border px-4 py-3 animate-pulse space-y-2">
      <div className="h-5 w-5 rounded bg-muted" />
      <div className="h-6 w-16 rounded bg-muted" />
      <div className="h-3 w-24 rounded bg-muted" />
    </div>
  );
}

export default function QuickStatsBar() {
  const { t, i18n } = useTranslation();
  const [stats, setStats] = useState<QuickStats | null>(null);
  const [loading, setLoading] = useState(true);

  const currency = i18n.language === 'ru' ? '₸' : '$';

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    apiClient.getQuickStats()
      .then((res: any) => {
        if (!cancelled && res?.stats) setStats(res.stats);
      })
      .catch(() => {/* тихо — не блокируем дашборд */})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const formatMoney = (n: number) =>
    new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 0 }).format(n);

  const formatRating = (n: number) =>
    n > 0 ? `${n.toFixed(1)} ★` : '—';

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
        {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    );
  }

  if (!stats) return null;

  const cards: StatCardProps[] = [
    {
      label: t('quickStats.revenueToday', 'Выручка сегодня'),
      value: `${formatMoney(stats.revenue_today)} ${currency}`,
      icon: '💰',
      accent: 'green',
    },
    {
      label: t('quickStats.bookingsToday', 'Записей сегодня'),
      value: stats.bookings_today,
      icon: '📅',
      accent: 'blue',
    },
    {
      label: t('quickStats.pendingConfirmations', 'Ожидают подтверждения'),
      value: stats.pending_confirmations,
      icon: '⏳',
      accent: 'orange',
      badge: stats.pending_confirmations > 0 ? String(stats.pending_confirmations) : undefined,
    },
    {
      label: t('quickStats.newClientsWeek', 'Новых клиентов за 7 дней'),
      value: stats.new_clients_week,
      icon: '👤',
      accent: 'purple',
    },
    {
      label: t('quickStats.avgRating', 'Средний рейтинг (30 дн.)'),
      value: formatRating(stats.avg_rating_30d),
      icon: '⭐',
      accent: 'yellow',
    },
    {
      label: t('quickStats.upcomingHour', 'Записей в ближайший час'),
      value: stats.upcoming_next_hour,
      icon: '🔔',
      accent: 'pink',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
      {cards.map((card) => (
        <StatCard key={card.label} {...card} />
      ))}
    </div>
  );
}
