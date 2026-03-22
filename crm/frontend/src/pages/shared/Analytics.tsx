// /frontend/src/pages/admin/Analytics.tsx
import { useState, useEffect } from 'react';
import { BarChart3, Download, RefreshCw, AlertCircle, Loader, Filter, TrendingUp, TrendingDown, Lightbulb } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { useTranslation } from 'react-i18next';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';
import { api } from '../../services/api';
import { PeriodFilter } from '../../components/shared/PeriodFilter';
import { useCurrency } from '../../hooks/useSalonSettings';
import { useAuth } from '../../contexts/AuthContext';
import { usePermissions } from '../../utils/permissions';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import './Analytics.css';

interface AnalyticsData {
  bookings_by_day: [string, number][];
  services_stats: [string, number, number][];
  status_stats: [string, number][];
  avg_response_time: number;
  bookings_by_hour?: Array<{
    hour: string;
    count: number;
  }>;
  bookings_by_weekday?: Array<{
    weekday: string;
    iso_weekday: number;
    count: number;
  }>;
  bookings_by_region?: Array<{
    region: string;
    bookings: number;
    revenue: number;
  }>;
  top_products?: Array<{
    product_name: string;
    orders: number;
    amount: number;
  }>;
  website_sections_before_booking?: Array<{
    section: string;
    total_seconds: number;
    avg_seconds: number;
    session_count: number;
    sessions_before_booking: number;
    to_booking_rate: number;
    reliable_sample: boolean;
  }>;
  website_sections_summary?: {
    tracked_sessions: number;
    booking_sessions: number;
    low_sample: boolean;
    includes_account_pages: boolean;
  };
  association_tests?: {
    region_vs_booking_source?: {
      chi_square: number;
      cramers_v: number;
      p_value?: number;
      significant?: boolean;
      strength: string;
      sample_size: number;
    };
  };
  data_reliability?: {
    sample_size: number;
    unknown_region_share: number;
    unknown_region_count: number;
    unknown_source_share: number;
    unknown_source_count: number;
    revenue_outlier_share: number;
    revenue_outlier_count: number;
    hourly_cv: number;
    noise_score: number;
    noise_level: string;
    trust_score: number;
    can_trust: boolean;
    confidence_level: string;
    filters?: {
      service_name: string | null;
      product_name: string | null;
    };
    noise_components?: Array<{
      key: string;
      score: number;
      raw_value: number;
    }>;
  };
  statistical_tests?: {
    chi_square_region_vs_booking_source?: {
      enabled: boolean;
      sample_size: number;
      chi_square: number;
      df: number;
      p_value: number;
      significant: boolean;
      cramers_v: number;
      strength: string;
    };
    anova_revenue_by_region?: {
      enabled: boolean;
      groups_count: number;
      sample_size: number;
      f_stat: number;
      p_value: number;
      eta_squared: number;
      significant: boolean;
      strength: string;
    };
    spearman_section_time_vs_booking_rate?: {
      enabled: boolean;
      sample_size: number;
      coefficient: number;
      p_value: number;
      significant: boolean;
      strength: string;
      direction: string;
    };
    kendall_section_time_vs_booking_rate?: {
      enabled: boolean;
      sample_size: number;
      coefficient: number;
      p_value: number;
      significant: boolean;
      strength: string;
      direction: string;
    };
    pearson_section_time_vs_booking_rate?: {
      enabled: boolean;
      sample_size: number;
      coefficient: number;
      p_value: number;
      significant: boolean;
      strength: string;
      direction: string;
    };
    comparison?: {
      strongest_effect_test: string;
      strongest_effect_value: number;
      significant_tests_count: number;
      enabled_tests_count: number;
    };
  };
  cohort_retention_ltv?: {
    horizon_months: number;
    cohorts_analyzed: number;
    summary: Array<{
      cohort_month: string;
      cohort_size: number;
      m0_retention: number;
      m1_retention: number;
      m3_avg_ltv: number;
    }>;
    heatmap: Array<{
      cohort_month: string;
      month_offset: number;
      retention_rate: number;
      avg_ltv: number;
      active_clients: number;
      cohort_size: number;
    }>;
  };
  attribution_multi_touch?: {
    sample_size: number;
    channels: Array<{
      channel: string;
      first_touch: number;
      last_touch: number;
      linear_credit: number;
      linear_share: number;
    }>;
    top_paths: Array<{
      path: string;
      count: number;
    }>;
  };
  load_forecast?: {
    horizon_days: number;
    generated_from_period: {
      start_date: string;
      end_date: string;
    };
    historical_sample_size: number;
    active_slot_count: number;
    scope: {
      service_name: string | null;
      product_name: string | null;
    };
    upcoming_days: Array<{
      date: string;
      predicted_total_bookings: number;
      load_level: string;
    }>;
    high_load_slots: Array<{
      date: string;
      hour: string;
      predicted_bookings: number;
      std: number;
    }>;
    method: string;
  };
  no_show_cancellation_analytics?: {
    services: Array<{
      service_name: string;
      bookings: number;
      no_show_rate: number;
      cancel_rate: number;
      risk_score: number;
    }>;
    hours: Array<{
      hour: string;
      bookings: number;
      no_show_rate: number;
      cancel_rate: number;
    }>;
    weekdays: Array<{
      iso_weekday: number;
      bookings: number;
      no_show_rate: number;
      cancel_rate: number;
    }>;
    high_risk_clients: Array<{
      client_id: string;
      bookings: number;
      no_show_rate: number;
      cancel_rate: number;
      risk_score: number;
      risk_level: string;
    }>;
  };
  unit_economics?: {
    model: string;
    services: Array<{
      service_name: string;
      bookings: number;
      revenue: number;
      commission_cost: number;
      product_cost: number;
      variable_cost: number;
      margin: number;
      margin_rate: number;
    }>;
    masters: Array<{
      master_name: string;
      bookings: number;
      revenue: number;
      commission_cost: number;
      product_cost: number;
      base_salary_period: number;
      margin_before_salary: number;
      margin_after_salary: number;
    }>;
    summary: {
      revenue_total: number;
      variable_cost_total: number;
      margin_total: number;
    };
  };
  time_to_book?: {
    sample_size: number;
    avg_minutes: number;
    median_minutes: number;
    min_minutes: number;
    max_minutes: number;
    buckets: {
      under_1h: number;
      under_6h: number;
      under_24h: number;
      under_7d: number;
      over_7d: number;
    };
    by_source: Array<{
      source: string;
      avg_minutes: number;
      median_minutes: number;
      sample_size: number;
    }>;
    by_master: Array<{
      master_name: string;
      avg_minutes: number;
      median_minutes: number;
      sample_size: number;
    }>;
  };
  full_funnel?: {
    stages: Array<{
      stage: string;
      count: number;
    }>;
    conversions: {
      contact_to_booked: number;
      booked_to_visited: number;
      visited_to_repeat: number;
      contact_to_repeat: number;
    };
    sources: {
      chat_clients: number;
      messenger_clients: number;
      call_clients: number;
    };
  };
  promo_uplift?: {
    promo_bookings: number;
    regular_bookings: number;
    promo_completion_rate: number;
    regular_completion_rate: number;
    completion_rate_uplift: number;
    promo_avg_revenue: number;
    regular_avg_revenue: number;
    avg_revenue_uplift: number;
    top_codes: Array<{
      promo_code: string;
      bookings: number;
      completion_rate: number;
      avg_revenue: number;
    }>;
  };
  rfm_segmentation?: {
    sample_size: number;
    segments: Array<{
      segment: string;
      count: number;
    }>;
    examples: Record<string, Array<{
      client_id: string;
      r_score: number;
      f_score: number;
      m_score: number;
      recency_days: number;
      frequency: number;
      monetary: number;
    }>>;
  };
  sla_analytics?: {
    thresholds_seconds: number[];
    calls_team: {
      sample_size: number;
      avg_seconds: number;
      median_seconds: number;
      within_thresholds: Array<{
        seconds: number;
        rate: number;
      }>;
    };
    chat_team: {
      sample_size: number;
      avg_seconds: number;
      median_seconds: number;
      within_thresholds: Array<{
        seconds: number;
        rate: number;
      }>;
    };
    combined_team: {
      sample_size: number;
      avg_seconds: number;
      median_seconds: number;
      within_thresholds: Array<{
        seconds: number;
        rate: number;
      }>;
    };
    by_employee: Array<{
      employee_name: string;
      call_sample_size: number;
      chat_sample_size: number;
      combined_sample_size: number;
      combined_avg_seconds: number;
      combined_median_seconds: number;
      combined_sla_5m_rate: number;
    }>;
  };
  peak_hours?: Array<{
    hour: string;
    count: number;
  }>;
  drop_off_points?: Array<{
    stage: string;
    count: number;
    percentage: number;
  }>;
}

interface Stats {
  total_clients: number;
  total_bookings: number;
  completed_bookings: number;
  pending_bookings: number;
  total_revenue: number;
  conversion_rate: number;
}

const ALL_FILTER_VALUE = '__all__';

const COLORS = [
  'var(--chart-pink)',
  'var(--chart-purple)',
  'var(--chart-cyan)',
  'var(--chart-green)',
  'var(--chart-amber)',
  'var(--chart-red)'
];

export default function Analytics() {
  const [period, setPeriod] = useState<string>('30');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedServiceName, setSelectedServiceName] = useState('');
  const [selectedProductName, setSelectedProductName] = useState('');
  const [forecastHorizonDays, setForecastHorizonDays] = useState('14');
  const [serviceOptions, setServiceOptions] = useState<string[]>([]);
  const [productOptions, setProductOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [funnel, setFunnel] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const { t, i18n: i18nInstance } = useTranslation(['analytics', 'common', 'admin/calendar']);
  const { user } = useAuth();
  const userRole = typeof user?.role === 'string' ? user.role : '';
  const permissions = usePermissions(userRole);
  const { currency, formatCurrency } = useCurrency();

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const loadFilterOptions = async () => {
      try {
        const [servicesResponse, productsResponse] = await Promise.all([
          api.getServices(true, i18nInstance.language),
          api.getProducts(undefined, true)
        ]);

        const nextServiceOptions = Array.isArray(servicesResponse?.services)
          ? Array.from(new Set<string>(
            servicesResponse.services
              .map((serviceItem: { name?: string }) => String(serviceItem?.name ?? '').trim())
              .filter((serviceName: string): serviceName is string => serviceName.length > 0)
          )).sort((leftValue: string, rightValue: string) => leftValue.localeCompare(rightValue, i18nInstance.language))
          : [];

        const nextProductOptions = Array.isArray(productsResponse?.products)
          ? Array.from(new Set<string>(
            productsResponse.products
              .map((productItem: { name?: string }) => String(productItem?.name ?? '').trim())
              .filter((productName: string): productName is string => productName.length > 0)
          )).sort((leftValue: string, rightValue: string) => leftValue.localeCompare(rightValue, i18nInstance.language))
          : [];

        setServiceOptions(nextServiceOptions);
        setProductOptions(nextProductOptions);
      } catch (filterOptionsError) {
        console.error('Error loading analytics filter options:', filterOptionsError);
      }
    };

    void loadFilterOptions();
  }, [i18nInstance.language]);

  useEffect(() => {
    if (period !== 'custom') {
      void loadData();
    }
  }, [period, selectedServiceName, selectedProductName, forecastHorizonDays]);

  const loadData = async () => {
    console.log('🔍 [Analytics] Starting to load analytics data...');
    try {
      setLoading(true);
      setError(null);

      // Определяем параметры периода для аналитики
      let periodNum: number;
      if (dateFrom && dateTo) {
        periodNum = 0; // будет использоваться dateFrom, dateTo
      } else if (period === 'today') {
        periodNum = 1;
      } else if (period === 'all') {
        periodNum = 365;
      } else {
        periodNum = parseInt(period);
        if (isNaN(periodNum)) {
          throw new Error(t('analytics:errors.invalid_period'));
        }
      }

      // Параллельная загрузка всех данных для ускорения (оптимизация производительности)
      console.log('📊 [Analytics] Loading all data in parallel...');
      const analyticsRequestOptions = {
        serviceName: selectedServiceName,
        productName: selectedProductName,
        forecastHorizonDays: Number.parseInt(forecastHorizonDays, 10)
      };
      const [statsData, funnelData, analyticsData] = await Promise.all([
        api.getStats(),
        api.get('/api/analytics/funnel'),
        dateFrom && dateTo
          ? api.getAnalytics(0, dateFrom, dateTo, analyticsRequestOptions)
          : api.getAnalytics(periodNum, undefined, undefined, analyticsRequestOptions)
      ]);

      console.log('✅ [Analytics] All data loaded successfully!');
      setStats(statsData);
      setFunnel(funnelData);
      setAnalytics(analyticsData);
    } catch (err) {
      const message = err instanceof Error ? err.message : t('analytics:errors.loading_error');
      console.error('❌ [Analytics] Error loading analytics:', err);
      console.error('❌ [Analytics] Error details:', {
        message: message,
        response: (err as any)?.response?.data,
        status: (err as any)?.response?.status
      });
      setError(message);
      toast.error(`${t('analytics:errors.loading_error')}: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePeriodChange = (value: string) => {
    setPeriod(value);

    if (value !== 'custom') {
      setDateFrom('');
      setDateTo('');
    }
  };

  const handleServiceFilterChange = (value: string) => {
    setSelectedServiceName(value === ALL_FILTER_VALUE ? '' : value);
  };

  const handleProductFilterChange = (value: string) => {
    setSelectedProductName(value === ALL_FILTER_VALUE ? '' : value);
  };

  const handleApplyCustomDates = () => {
    if (!dateFrom || !dateTo) {
      toast.error(t('analytics:errors.select_both_dates'));
      return;
    }
    if (dateFrom > dateTo) {
      toast.error(t('analytics:errors.invalid_date_range'));
      return;
    }
    void loadData();
  };

  const handleExportCSV = async () => {
    try {
      setExporting(true);
      const blob = await api.exportAnalytics('csv', parseInt(period));

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `analytics_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success(t('analytics:success.file_downloaded'));
    } catch (err) {
      console.error('Export error:', err);
      toast.error(t('analytics:errors.export_failed'));
    } finally {
      setExporting(false);
    }
  };

  if (error) {
    return (
      <div className="analytics-error-container p-4 md:p-8">
        <div className="analytics-error-box bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="analytics-error-icon w-5 h-5 md:w-6 md:h-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="analytics-error-title text-sm md:text-base text-red-800 font-medium">{t('analytics:errors.loading_error')}</p>
              <p className="analytics-error-message text-xs md:text-sm text-red-700 mt-1">{error}</p>
              <Button onClick={loadData} className="analytics-error-button mt-4 bg-red-600 hover:bg-red-700 text-sm">
                {t('analytics:try_again')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-4 md:p-8 flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader className="w-6 h-6 md:w-8 md:h-8 text-pink-600 animate-spin" />
          <p className="text-sm md:text-base text-gray-600">{t('analytics:detailed_analysis')}</p>
        </div>
      </div>
    );
  }

  const toArray = <T,>(value: T[] | undefined | null): T[] => (Array.isArray(value) ? value : []);
  const getChannelLabel = (channelValue: string) => {
    const normalizedChannel = String(channelValue ?? '').trim().toLowerCase();
    const channelLabelMap: Record<string, string> = {
      unknown: t('analytics:channel_unknown'),
      client_cabinet: t('analytics:channel_client_cabinet'),
      public_landing: t('analytics:channel_public_landing'),
      website: t('analytics:channel_website'),
      instagram: t('analytics:channel_instagram'),
      whatsapp: t('analytics:channel_whatsapp'),
      telegram: t('analytics:channel_telegram'),
      manual: t('analytics:channel_manual'),
      crm: t('analytics:channel_crm'),
      call: t('analytics:channel_call'),
      messenger: t('analytics:channel_messenger')
    };
    return channelLabelMap[normalizedChannel] ?? normalizedChannel;
  };
  const formatChannelPath = (pathValue: string) => pathValue
    .split('->')
    .map((pathChunk) => getChannelLabel(pathChunk.trim()))
    .join(' -> ');
  const getSectionLabel = (sectionValue: string) => {
    const normalizedSection = String(sectionValue ?? '').trim().toLowerCase();
    return t(`analytics:section_values.${normalizedSection}`, normalizedSection);
  };
  const formatForecastPredictedBookings = (predictedValue: number) => {
    const safePredictedValue = Number.isFinite(predictedValue) ? predictedValue : 0;
    const roundedValue = safePredictedValue.toFixed(2);
    if (safePredictedValue <= 0) {
      return roundedValue;
    }
    if (safePredictedValue < 1) {
      const approxSlots = Math.max(1, Math.round(1 / safePredictedValue));
      return t('analytics:forecast_predicted_less_than_one', '{{value}} (примерно 1 запись на {{slots}} похожих слотов)', {
        value: roundedValue,
        slots: approxSlots
      });
    }
    return roundedValue;
  };
  const getNoiseComponentLabel = (componentKey: string) => t(`analytics:noise_component_labels.${componentKey}`, componentKey);
  const getUnitEconomicsModelLabel = (modelValue: string) => t(`analytics:unit_model_values.${modelValue}`, modelValue);
  const getUnitEconomicsModelDescription = (modelValue: string) => t(`analytics:unit_model_descriptions.${modelValue}`, modelValue);
  const selectedServiceValue = selectedServiceName !== '' ? selectedServiceName : ALL_FILTER_VALUE;
  const selectedProductValue = selectedProductName !== '' ? selectedProductName : ALL_FILTER_VALUE;
  const truncateChartLabel = (value: string, maxLength: number = isMobile ? 10 : 16) => {
    const normalizedValue = String(value ?? '').trim();
    if (normalizedValue.length <= maxLength) {
      return normalizedValue;
    }
    return `${normalizedValue.slice(0, Math.max(1, maxLength - 1)).trim()}…`;
  };
  const getCategoryAxisProps = (
    formatter?: (value: string) => string,
    maxLength: number = isMobile ? 10 : 16
  ) => ({
    interval: 0 as const,
    angle: isMobile ? -40 : -28,
    textAnchor: 'end' as const,
    height: isMobile ? 84 : 74,
    tickMargin: 10,
    tick: { fontSize: isMobile ? 10 : 12 },
    tickFormatter: (value: string) => truncateChartLabel(
      formatter ? formatter(String(value ?? '')) : String(value ?? ''),
      maxLength
    )
  });
  const renderNamedFilterSelect = ({
    label,
    value,
    options,
    allLabel,
    onValueChange,
    triggerClassName
  }: {
    label: string;
    value: string;
    options: string[];
    allLabel: string;
    onValueChange: (value: string) => void;
    triggerClassName: string;
  }) => (
    <div className="analytics-inline-filter">
      <p className="analytics-inline-filter-label">{label}</p>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className={triggerClassName}>
          <SelectValue placeholder={label} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_FILTER_VALUE}>{allLabel}</SelectItem>
          {options.map((optionValue) => (
            <SelectItem key={optionValue} value={optionValue}>
              {optionValue}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  const bookingsTrendData = toArray(analytics?.bookings_by_day).map(([date, count]) => ({
    name: isMobile
      ? new Date(date).toLocaleDateString(i18nInstance.language, { day: 'numeric', month: 'numeric' })
      : new Date(date).toLocaleDateString(i18nInstance.language, { day: 'numeric', month: 'short' }),
    [t('analytics:bookings')]: count
  }));

  const servicesData = toArray(analytics?.services_stats).map(([name, count, revenue], index) => ({
    name,
    value: count,
    revenue,
    color: COLORS[index % COLORS.length]
  }));
  const showServicesPieLabels = !isMobile
    && servicesData.length <= 5
    && servicesData.every((serviceItem) => String(serviceItem.name ?? '').trim().length <= 18);

  const statusData = toArray(analytics?.status_stats).map(([status, count]) => ({
    name: t(`analytics:status.${status}`),
    [t('analytics:bookings')]: count
  }));

  const topServices = toArray(analytics?.services_stats).slice(0, 5).map(([name, count, revenue]) => ({
    name,
    count,
    revenue
  }));

  const bookingsByHourData = Array.isArray(analytics?.bookings_by_hour)
    ? analytics.bookings_by_hour.map((hourItem) => ({
      hour: hourItem.hour,
      count: hourItem.count
    }))
    : [];

  const bookingsByRegionData = Array.isArray(analytics?.bookings_by_region)
    ? analytics.bookings_by_region.slice(0, 10)
    : [];

  const topProductsData = Array.isArray(analytics?.top_products)
    ? analytics.top_products.slice(0, 10)
    : [];

  const websiteSectionsData = Array.isArray(analytics?.website_sections_before_booking)
    ? analytics.website_sections_before_booking.slice(0, 10)
    : [];
  const websiteSectionsSummary = analytics?.website_sections_summary;

  const regionAssociation = analytics?.association_tests?.region_vs_booking_source;
  const dataReliability = analytics?.data_reliability;
  const statisticalTests = analytics?.statistical_tests;

  const formatPValue = (pValue?: number) => {
    if (pValue === undefined || pValue === null) {
      return '—';
    }
    if (!Number.isFinite(pValue)) {
      return '—';
    }
    if (pValue < 0.001) {
      return '< 0.001';
    }
    return pValue.toFixed(3);
  };

  const formatEffectValue = (effectValue?: number) => {
    if (effectValue === undefined || effectValue === null) {
      return '—';
    }
    if (!Number.isFinite(effectValue)) {
      return '—';
    }
    return effectValue.toFixed(4);
  };

  const correlationConclusion = (
    significant: boolean | undefined,
    strength: string | undefined,
    direction: string | undefined
  ) => {
    if (!significant) {
      return t('analytics:test_conclusion_not_significant', 'Статистически значимой связи не обнаружено');
    }
    const directionLabel = direction === 'negative'
      ? t('analytics:direction_negative', 'отрицательная')
      : t('analytics:direction_positive', 'положительная');
    const strengthLabel = t(`analytics:association_strength_values.${strength}`, strength ?? 'none');
    return t('analytics:test_conclusion_correlation', '{{direction}} связь, сила: {{strength}}', {
      direction: directionLabel,
      strength: strengthLabel
    });
  };

  const statTestRows = [
    {
      key: 'chi_square_region_vs_booking_source',
      name: t('analytics:test_chi_square', 'Chi-square: регион vs источник'),
      enabled: statisticalTests?.chi_square_region_vs_booking_source?.enabled,
      effect: statisticalTests?.chi_square_region_vs_booking_source?.cramers_v,
      pValue: statisticalTests?.chi_square_region_vs_booking_source?.p_value,
      significant: statisticalTests?.chi_square_region_vs_booking_source?.significant,
      conclusion: statisticalTests?.chi_square_region_vs_booking_source?.significant
        ? t('analytics:test_conclusion_chi_square_significant', 'Категории связаны статистически значимо')
        : t('analytics:test_conclusion_chi_square_not_significant', 'Значимой связи категорий не выявлено')
    },
    {
      key: 'anova_revenue_by_region',
      name: t('analytics:test_anova', 'ANOVA: выручка по регионам'),
      enabled: statisticalTests?.anova_revenue_by_region?.enabled,
      effect: statisticalTests?.anova_revenue_by_region?.eta_squared,
      pValue: statisticalTests?.anova_revenue_by_region?.p_value,
      significant: statisticalTests?.anova_revenue_by_region?.significant,
      conclusion: statisticalTests?.anova_revenue_by_region?.significant
        ? t('analytics:test_conclusion_anova_significant', 'Средняя выручка по регионам различается значимо')
        : t('analytics:test_conclusion_anova_not_significant', 'Значимых различий средней выручки между регионами нет')
    },
    {
      key: 'spearman_section_time_vs_booking_rate',
      name: t('analytics:test_spearman', 'Spearman: время на секции vs конверсия'),
      enabled: statisticalTests?.spearman_section_time_vs_booking_rate?.enabled,
      effect: statisticalTests?.spearman_section_time_vs_booking_rate?.coefficient,
      pValue: statisticalTests?.spearman_section_time_vs_booking_rate?.p_value,
      significant: statisticalTests?.spearman_section_time_vs_booking_rate?.significant,
      conclusion: correlationConclusion(
        statisticalTests?.spearman_section_time_vs_booking_rate?.significant,
        statisticalTests?.spearman_section_time_vs_booking_rate?.strength,
        statisticalTests?.spearman_section_time_vs_booking_rate?.direction
      )
    },
    {
      key: 'kendall_section_time_vs_booking_rate',
      name: t('analytics:test_kendall', 'Kendall: время на секции vs конверсия'),
      enabled: statisticalTests?.kendall_section_time_vs_booking_rate?.enabled,
      effect: statisticalTests?.kendall_section_time_vs_booking_rate?.coefficient,
      pValue: statisticalTests?.kendall_section_time_vs_booking_rate?.p_value,
      significant: statisticalTests?.kendall_section_time_vs_booking_rate?.significant,
      conclusion: correlationConclusion(
        statisticalTests?.kendall_section_time_vs_booking_rate?.significant,
        statisticalTests?.kendall_section_time_vs_booking_rate?.strength,
        statisticalTests?.kendall_section_time_vs_booking_rate?.direction
      )
    },
    {
      key: 'pearson_section_time_vs_booking_rate',
      name: t('analytics:test_pearson', 'Pearson: время на секции vs конверсия'),
      enabled: statisticalTests?.pearson_section_time_vs_booking_rate?.enabled,
      effect: statisticalTests?.pearson_section_time_vs_booking_rate?.coefficient,
      pValue: statisticalTests?.pearson_section_time_vs_booking_rate?.p_value,
      significant: statisticalTests?.pearson_section_time_vs_booking_rate?.significant,
      conclusion: correlationConclusion(
        statisticalTests?.pearson_section_time_vs_booking_rate?.significant,
        statisticalTests?.pearson_section_time_vs_booking_rate?.strength,
        statisticalTests?.pearson_section_time_vs_booking_rate?.direction
      )
    }
  ].filter((row) => row.enabled);

  const strongestTestLabelMap: Record<string, string> = {
    chi_square_region_vs_booking_source: t('analytics:test_chi_square', 'Chi-square: регион vs источник'),
    anova_revenue_by_region: t('analytics:test_anova', 'ANOVA: выручка по регионам'),
    spearman_section_time_vs_booking_rate: t('analytics:test_spearman', 'Spearman: время на секции vs конверсия'),
    kendall_section_time_vs_booking_rate: t('analytics:test_kendall', 'Kendall: время на секции vs конверсия'),
    pearson_section_time_vs_booking_rate: t('analytics:test_pearson', 'Pearson: время на секции vs конверсия')
  };
  const noiseComponentsData = toArray(dataReliability?.noise_components);
  const hasStatsQualityBlock = dataReliability ? true : statTestRows.length > 0;
  const cohortSummaryData = toArray(analytics?.cohort_retention_ltv?.summary).slice(0, 6);
  const cohortHeatmapM1Data = toArray(analytics?.cohort_retention_ltv?.heatmap)
    .filter((row) => row.month_offset === 1)
    .slice(0, 6)
    .map((row) => ({
      cohort: row.cohort_month,
      retention: row.retention_rate,
      ltv: row.avg_ltv
    }));

  const attributionChannelsData = toArray(analytics?.attribution_multi_touch?.channels).slice(0, 10);
  const attributionPathsData = toArray(analytics?.attribution_multi_touch?.top_paths).slice(0, 10);

  const forecastUpcomingData = toArray(analytics?.load_forecast?.upcoming_days).map((dayItem) => ({
    date: new Date(dayItem.date).toLocaleDateString(i18nInstance.language, { day: 'numeric', month: 'short' }),
    predicted: dayItem.predicted_total_bookings,
    load_level: dayItem.load_level
  }));
  const forecastHighLoadSlotsData = toArray(analytics?.load_forecast?.high_load_slots).slice(0, 12);
  const forecastScopeDescription = analytics?.load_forecast?.scope?.service_name
    ? t('analytics:forecast_scope_service', { service: analytics.load_forecast.scope.service_name })
    : analytics?.load_forecast?.scope?.product_name
      ? t('analytics:forecast_scope_product', { product: analytics.load_forecast.scope.product_name })
      : t('analytics:forecast_scope_all');

  const noShowServiceData = toArray(analytics?.no_show_cancellation_analytics?.services).slice(0, 10);
  const noShowHourlyData = toArray(analytics?.no_show_cancellation_analytics?.hours);
  const noShowHighRiskClientsData = toArray(analytics?.no_show_cancellation_analytics?.high_risk_clients).slice(0, 10);

  const unitEconomicsServices = toArray(analytics?.unit_economics?.services).slice(0, 10);
  const unitEconomicsMasters = toArray(analytics?.unit_economics?.masters).slice(0, 10);
  const unitEconomicsSummary = analytics?.unit_economics?.summary;

  const timeToBookData = analytics?.time_to_book;
  const timeToBookBucketsData = timeToBookData
    ? [
      { bucket: t('analytics:ttb_bucket_under_1h'), count: timeToBookData.buckets.under_1h },
      { bucket: t('analytics:ttb_bucket_under_6h'), count: timeToBookData.buckets.under_6h },
      { bucket: t('analytics:ttb_bucket_under_24h'), count: timeToBookData.buckets.under_24h },
      { bucket: t('analytics:ttb_bucket_under_7d'), count: timeToBookData.buckets.under_7d },
      { bucket: t('analytics:ttb_bucket_over_7d'), count: timeToBookData.buckets.over_7d }
    ]
    : [];

  const fullFunnelData = analytics?.full_funnel;
  const fullFunnelStagesData = (fullFunnelData?.stages ?? []).map((stageItem) => ({
    stage: t(`analytics:full_funnel_stage_${stageItem.stage}`),
    count: stageItem.count
  }));

  const promoUpliftData = analytics?.promo_uplift;
  const promoCodesData = toArray(promoUpliftData?.top_codes).slice(0, 10);

  const rfmSegmentationData = analytics?.rfm_segmentation;
  const rfmSegmentsChartData = rfmSegmentationData?.segments ?? [];
  const rfmLargestSegment = rfmSegmentsChartData.length > 0 ? rfmSegmentsChartData[0].segment : '';
  const rfmExamplesData = rfmLargestSegment !== ''
    ? rfmSegmentationData?.examples[rfmLargestSegment] ?? []
    : [];

  const slaAnalyticsData = analytics?.sla_analytics;
  const slaEmployeeData = toArray(slaAnalyticsData?.by_employee).slice(0, 10);
  const slaCombinedThresholdsData = toArray(slaAnalyticsData?.combined_team?.within_thresholds).map((thresholdItem) => ({
    threshold: `${thresholdItem.seconds}s`,
    rate: thresholdItem.rate
  }));
  const timeToBookSourceData = toArray(timeToBookData?.by_source).slice(0, 8);
  const secondsToMinutes = (seconds: number) => (seconds / 60).toFixed(1);
  const formatPercentDelta = (value: number) => {
    const prefix = value > 0 ? '+' : '';
    return `${prefix}${value.toFixed(2)}%`;
  };
  const formatCurrencyDelta = (value: number) => {
    const prefix = value > 0 ? '+' : '';
    return `${prefix}${formatCurrency(value)}`;
  };
  const hasCohortAttributionBlock = cohortSummaryData.length + attributionChannelsData.length > 0;
  const hasForecastNoShowBlock = forecastUpcomingData.length + noShowServiceData.length > 0;
  const hasUnitTimeBlock = unitEconomicsServices.length + timeToBookBucketsData.length > 0;
  const hasFunnelPromoBlock = fullFunnelStagesData.length + promoCodesData.length > 0;
  const hasRfmSlaBlock = rfmSegmentsChartData.length + slaEmployeeData.length > 0;

  return (
    <div className="analytics-container p-4 md:p-8 pb-20 md:pb-8">
      {/* Header */}
      <div className="analytics-header mb-6 md:mb-8">
        <h1 className="analytics-title text-2xl md:text-3xl text-gray-900 mb-2 flex items-center gap-2 md:gap-3">
          <BarChart3 className="analytics-title-icon w-6 h-6 md:w-8 md:h-8" />
          <span>{t('analytics:title')}</span>
        </h1>
        <p className="analytics-subtitle text-sm md:text-base text-gray-600">{t('analytics:detailed_analysis')}</p>
      </div>

      {/* Filters */}
      <div className="analytics-filter-card bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-200 mb-4 md:mb-6">
        <div className="analytics-filter-grid">
          <div className="analytics-filter-section">
            <div className="analytics-filter-section-header">
              <div>
                <p className="analytics-filter-section-title">{t('common:period')}</p>
                <p className="analytics-filter-section-description">{t('analytics:for_period')}</p>
              </div>
            </div>
            <div className="analytics-filter-section-content">
              <PeriodFilter
                period={period}
                dateFrom={dateFrom}
                dateTo={dateTo}
                onPeriodChange={handlePeriodChange}
                onDateFromChange={setDateFrom}
                onDateToChange={setDateTo}
                className="items-end"
                showAllOption={false}
              />
              {period === 'custom' && (
                <Button onClick={handleApplyCustomDates} className="analytics-apply-button bg-pink-600 hover:bg-pink-700 w-full sm:w-auto text-sm md:text-base">
                  {t('analytics:apply')}
                </Button>
              )}
            </div>
          </div>

          <div className="analytics-filter-section">
            <div className="analytics-filter-section-header">
              <Filter className="analytics-filter-section-icon" />
              <div>
                <p className="analytics-filter-section-title">{t('analytics:service_filter')} / {t('analytics:product_filter')}</p>
                <p className="analytics-filter-section-description">{t('analytics:filters_description')}</p>
              </div>
            </div>
            <div className="analytics-filter-scope-grid">
              {renderNamedFilterSelect({
                label: t('analytics:service_filter'),
                value: selectedServiceValue,
                options: serviceOptions,
                allLabel: t('admin/calendar:all_services'),
                onValueChange: handleServiceFilterChange,
                triggerClassName: 'w-full'
              })}
              {renderNamedFilterSelect({
                label: t('analytics:product_filter'),
                value: selectedProductValue,
                options: productOptions,
                allLabel: t('analytics:all_products'),
                onValueChange: handleProductFilterChange,
                triggerClassName: 'w-full'
              })}
            </div>
          </div>

          <div className="analytics-filter-section analytics-filter-section-forecast">
            <div className="analytics-filter-section-header">
              <Lightbulb className="analytics-filter-section-icon" />
              <div>
                <p className="analytics-filter-section-title">{t('analytics:forecast_horizon')}</p>
                <p className="analytics-filter-section-description">{t('analytics:load_forecast_title')}</p>
              </div>
            </div>
            <div className="analytics-filter-section-content">
              <Select value={forecastHorizonDays} onValueChange={setForecastHorizonDays}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t('analytics:forecast_horizon')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7</SelectItem>
                  <SelectItem value="14">14</SelectItem>
                  <SelectItem value="30">30</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="analytics-filter-actions">
          <Button
            variant="outline"
            onClick={loadData}
            className="analytics-refresh-button"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            {t('analytics:refresh')}
          </Button>
          <Button
            onClick={handleExportCSV}
            disabled={exporting}
            className="analytics-export-button bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 gap-2"
          >
            <Download className="w-4 h-4" />
            {exporting ? t('analytics:exporting') : t('analytics:export')}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="analytics-stats-grid grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mb-6 md:mb-8">
          <div className="analytics-stat-card bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="analytics-stat-value text-2xl md:text-3xl text-gray-900 mb-1 md:mb-2">
              {stats.conversion_rate.toFixed(1)}%
            </h3>
            <p className="analytics-stat-label text-xs md:text-sm text-gray-600 mb-1 md:mb-2">{t('analytics:conversion')}</p>
            <div className="analytics-stat-note text-xs md:text-sm text-green-600">
              {isMobile ? t('analytics:conversion') : t('analytics:from_visitors')}
            </div>
          </div>

          <div className="analytics-stat-card bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="analytics-stat-value text-2xl md:text-3xl text-gray-900 mb-1 md:mb-2">
              {analytics?.avg_response_time?.toFixed(0) ?? '0'} {t('analytics:min')}
            </h3>
            <p className="analytics-stat-label text-xs md:text-sm text-gray-600 mb-1 md:mb-2">{t('analytics:response_time')}</p>
            <div className="analytics-stat-note text-xs md:text-sm text-blue-600">
              {t('analytics:avg_time')}
            </div>
          </div>

          <div className="analytics-stat-card bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="analytics-stat-value text-2xl md:text-3xl text-gray-900 mb-1 md:mb-2">
              {permissions.canViewFinancials ? (
                isMobile ? `${(stats.total_revenue / 1000).toFixed(1)}k ${currency}` : formatCurrency(stats.total_revenue)
              ) : '---'}
            </h3>
            <p className="analytics-stat-label text-xs md:text-sm text-gray-600 mb-1 md:mb-2">{t('analytics:revenue')}</p>
            <div className="analytics-stat-note text-xs md:text-sm text-green-600">
              {t('analytics:for_period')}
            </div>
          </div>

          <div className="analytics-stat-card bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="analytics-stat-value text-2xl md:text-3xl text-gray-900 mb-1 md:mb-2">
              {permissions.canViewFinancials ? (
                stats.total_revenue > 0 ? formatCurrency(stats.total_revenue / stats.total_bookings) : formatCurrency(0)
              ) : '---'}
            </h3>
            <p className="analytics-stat-label text-xs md:text-sm text-gray-600 mb-1 md:mb-2">{t('analytics:avg_check')}</p>
            <div className="analytics-stat-note text-xs md:text-sm text-green-600">
              {t('analytics:per_booking')}
            </div>
          </div>
        </div>
      )}

      {/* Charts Grid */}
      <div className="analytics-chart-grid grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-8">
        {/* Bookings Trend */}
        {bookingsTrendData.length > 0 && (
          <div className="analytics-chart-card bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h2 className="analytics-chart-title text-xl text-gray-900 mb-6">{t('analytics:bookings_trend')}</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={bookingsTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey={t('analytics:bookings')}
                  stroke="var(--chart-pink)"
                  strokeWidth={2}
                  dot={{ fill: 'var(--chart-pink)' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Services Distribution */}
        {servicesData.length > 0 && (
          <div className="analytics-chart-card bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-200">
            <h2 className="analytics-chart-title text-base md:text-xl text-gray-900 mb-4 md:mb-6">{t('analytics:services_distribution')}</h2>
            <ResponsiveContainer width="100%" height={isMobile ? 350 : 300}>
              <PieChart>
                <Pie
                  data={servicesData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy={isMobile ? "40%" : "50%"}
                  outerRadius={isMobile ? 80 : 100}
                  label={showServicesPieLabels}
                  labelLine={showServicesPieLabels}
                >
                  {servicesData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    fontSize: isMobile ? 11 : 14,
                    padding: '8px 12px',
                    borderRadius: '8px'
                  }}
                />
                {!isMobile && <Legend wrapperStyle={{ fontSize: 12 }} />}
              </PieChart>
            </ResponsiveContainer>

            {/* Mobile Legend - Improved */}
            {isMobile && servicesData.length > 0 && (
              <div className="mt-4 grid grid-cols-2 gap-2">
                {servicesData.map((entry, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg text-xs"
                  >
                    <div
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{ backgroundColor: entry.color }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium text-gray-900">
                        {entry.name}
                      </div>
                      <div className="text-gray-600">
                        {entry.value} {permissions.canViewFinancials && `• ${formatCurrency(entry.revenue)}`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Status Chart */}
        {statusData.length > 0 && (
          <div className="analytics-chart-card bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-200">
            <h2 className="analytics-chart-title text-base md:text-xl text-gray-900 mb-4 md:mb-6">{t('analytics:booking_statuses')}</h2>
            <ResponsiveContainer width="100%" height={isMobile ? 250 : 300}>
              <BarChart data={statusData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: isMobile ? 10 : 12 }}
                  interval={0}
                  angle={isMobile ? -45 : 0}
                  textAnchor={isMobile ? 'end' : 'middle'}
                  height={isMobile ? 60 : 30}
                />
                <YAxis tick={{ fontSize: isMobile ? 10 : 12 }} />
                <Tooltip contentStyle={{ fontSize: isMobile ? 12 : 14 }} />
                {!isMobile && <Legend />}
                <Bar dataKey={t('analytics:bookings')} fill="var(--chart-purple)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Peak Hours Chart */}
        {analytics?.peak_hours && analytics.peak_hours.length > 0 && (
          <div className="analytics-chart-card bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-200 lg:col-span-2">
            <h2 className="analytics-chart-title text-base md:text-xl text-gray-900 mb-4 md:mb-6">{t('analytics:peak_hours')}</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.peak_hours}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" name={t('analytics:bookings')} fill="var(--chart-amber)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Top Services Table */}
      {topServices.length > 0 && (
        <div className="analytics-table-card bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6 md:mb-8">
          <div className="analytics-table-header p-4 md:p-6 border-b border-gray-200">
            <h2 className="analytics-table-title text-base md:text-xl text-gray-900">{t('analytics:top_services')}</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 md:px-6 py-3 md:py-4 text-left text-xs md:text-sm text-gray-600">{t('analytics:name')}</th>
                  <th className="px-3 md:px-6 py-3 md:py-4 text-left text-xs md:text-sm text-gray-600">{t('analytics:quantity')}</th>
                  <th className="px-3 md:px-6 py-3 md:py-4 text-left text-xs md:text-sm text-gray-600">{t('analytics:income')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {topServices.map((service, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-3 md:px-6 py-3 md:py-4 text-xs md:text-sm text-gray-900">
                      <div className="truncate max-w-[150px] md:max-w-none">{service.name}</div>
                    </td>
                    <td className="px-3 md:px-6 py-3 md:py-4 text-xs md:text-sm text-gray-900">
                      {service.count}
                    </td>
                    <td className="px-3 md:px-6 py-3 md:py-4 text-xs md:text-sm text-green-600 font-medium">
                      {permissions.canViewFinancials ? formatCurrency(service.revenue ?? 0) : '---'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Booking Time + Region */}
      <div className="grid grid-cols-1 gap-4 md:gap-6 mb-6 md:mb-8">
        {bookingsByHourData.length > 0 && (
          <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-200">
            <h2 className="text-base md:text-xl text-gray-900 mb-4 md:mb-6">
              {t('analytics:bookings_by_hour', 'В какое время больше всего записей')}
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={bookingsByHourData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" name={t('analytics:bookings')} fill="var(--chart-cyan)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {bookingsByRegionData.length > 0 && (
          <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-200">
            <h2 className="text-base md:text-xl text-gray-900 mb-4 md:mb-6">
              {t('analytics:bookings_by_region', 'Из каких регионов больше всего записей')}
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={bookingsByRegionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                <XAxis dataKey="region" {...getCategoryAxisProps(undefined, isMobile ? 9 : 14)} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="bookings" name={t('analytics:bookings')} fill="var(--chart-green)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Product + Website Pre-booking */}
      <div className="grid grid-cols-1 gap-4 md:gap-6 mb-6 md:mb-8">
        {topProductsData.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 md:p-6 border-b border-gray-200">
              <h2 className="text-base md:text-xl text-gray-900">
                {t('analytics:top_products_orders', 'Товары с наибольшим числом заказов')}
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 md:px-6 py-3 text-left text-xs md:text-sm text-gray-600">{t('analytics:name')}</th>
                    <th className="px-3 md:px-6 py-3 text-left text-xs md:text-sm text-gray-600">{t('analytics:quantity')}</th>
                    <th className="px-3 md:px-6 py-3 text-left text-xs md:text-sm text-gray-600">{t('analytics:income')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {topProductsData.map((productItem, productIndex) => (
                    <tr key={`product-${productIndex}`} className="hover:bg-gray-50">
                      <td className="px-3 md:px-6 py-3 text-xs md:text-sm text-gray-900">{productItem.product_name}</td>
                      <td className="px-3 md:px-6 py-3 text-xs md:text-sm text-gray-900">{productItem.orders}</td>
                      <td className="px-3 md:px-6 py-3 text-xs md:text-sm text-green-700">
                        {permissions.canViewFinancials ? formatCurrency(productItem.amount) : '---'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {websiteSectionsData.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 md:p-6 border-b border-gray-200">
              <h2 className="text-base md:text-xl text-gray-900">
                {t('analytics:website_sections_before_booking', 'Секции сайта перед записью')}
              </h2>
              <p className="mt-2 text-xs md:text-sm text-gray-600">
                {t('analytics:website_sections_description')}
              </p>
              {websiteSectionsSummary && (
                <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-xs text-gray-500">{t('analytics:tracked_sessions')}</p>
                    <p className="text-base font-semibold text-gray-900">{websiteSectionsSummary.tracked_sessions}</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-xs text-gray-500">{t('analytics:booking_sessions')}</p>
                    <p className="text-base font-semibold text-gray-900">{websiteSectionsSummary.booking_sessions}</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-xs text-gray-500">{t('analytics:sample_reliability')}</p>
                    <p className="text-base font-semibold text-gray-900">
                      {websiteSectionsSummary.low_sample
                        ? t('analytics:sample_low')
                        : t('analytics:sample_ok')}
                    </p>
                  </div>
                </div>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 md:px-6 py-3 text-left text-xs md:text-sm text-gray-600">{t('analytics:section', 'Секция')}</th>
                    <th className="px-3 md:px-6 py-3 text-left text-xs md:text-sm text-gray-600">{t('analytics:sessions_with_section')}</th>
                    <th className="px-3 md:px-6 py-3 text-left text-xs md:text-sm text-gray-600">{t('analytics:sessions_to_booking')}</th>
                    <th className="px-3 md:px-6 py-3 text-left text-xs md:text-sm text-gray-600">{t('analytics:avg_time_seconds', 'Среднее время (сек)')}</th>
                    <th className="px-3 md:px-6 py-3 text-left text-xs md:text-sm text-gray-600">{t('analytics:total_time_seconds', 'Общее время (сек)')}</th>
                    <th className="px-3 md:px-6 py-3 text-left text-xs md:text-sm text-gray-600">{t('analytics:to_booking_rate_sessions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {websiteSectionsData.map((sectionItem, sectionIndex) => (
                    <tr key={`section-${sectionIndex}`} className="hover:bg-gray-50">
                      <td className="px-3 md:px-6 py-3 text-xs md:text-sm text-gray-900">{getSectionLabel(sectionItem.section)}</td>
                      <td className="px-3 md:px-6 py-3 text-xs md:text-sm text-gray-900">{sectionItem.session_count}</td>
                      <td className="px-3 md:px-6 py-3 text-xs md:text-sm text-gray-900">{sectionItem.sessions_before_booking}</td>
                      <td className="px-3 md:px-6 py-3 text-xs md:text-sm text-gray-900">{sectionItem.avg_seconds.toFixed(1)}</td>
                      <td className="px-3 md:px-6 py-3 text-xs md:text-sm text-gray-900">{sectionItem.total_seconds.toFixed(1)}</td>
                      <td className="px-3 md:px-6 py-3 text-xs md:text-sm text-blue-700">
                        <div>{sectionItem.to_booking_rate.toFixed(1)}%</div>
                        <div className="text-[11px] text-gray-500">
                          {sectionItem.reliable_sample
                            ? t('analytics:sample_ok')
                            : t('analytics:website_sections_low_sample')}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Category Association Test */}
      {regionAssociation && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6 mb-6 md:mb-8">
          <h2 className="text-base md:text-xl text-gray-900 mb-3">
            {t('analytics:region_source_association', 'Связь региона и источника записи')}
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            {t('analytics:region_source_association_description')}
          </p>
          <p className="text-sm text-gray-700 mb-2">
            {t('analytics:chi_square_label', 'Chi-square')}: {regionAssociation.chi_square.toFixed(2)}
          </p>
          <p className="text-sm text-gray-700 mb-2">
            {t('analytics:cramers_v_label', "Cramer's V")}: {regionAssociation.cramers_v.toFixed(3)}
          </p>
          {regionAssociation.p_value !== undefined && (
            <p className="text-sm text-gray-700 mb-2">
              {t('analytics:p_value_label', 'P-value')}: {formatPValue(regionAssociation.p_value)}
            </p>
          )}
          <p className="text-sm text-gray-700">
            {t('analytics:association_strength', 'Сила связи')}: {t(`analytics:association_strength_values.${regionAssociation.strength}`, regionAssociation.strength)}
          </p>
        </div>
      )}

      {hasStatsQualityBlock && (
        <div className="grid grid-cols-1 gap-4 md:gap-6 mb-6 md:mb-8">
          {dataReliability && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
              <h2 className="text-base md:text-xl text-gray-900 mb-4">
                {t('analytics:data_reliability_title', 'Шум и доверие к данным')}
              </h2>
              <p className="mb-4 text-sm text-gray-600">
                {t('analytics:data_reliability_description')}
              </p>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-xs text-gray-500">{t('analytics:trust_score', 'Trust score')}</p>
                  <p className="text-lg font-semibold text-gray-900">{dataReliability.trust_score.toFixed(1)} / 100</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-xs text-gray-500">{t('analytics:noise_level', 'Уровень шума')}</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {t(`analytics:noise_level_values.${dataReliability.noise_level}`, dataReliability.noise_level)}
                  </p>
                </div>
              </div>
              <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-xs text-gray-500">{t('analytics:sample_size')}</p>
                  <p className="text-base font-semibold text-gray-900">{dataReliability.sample_size}</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-3">
                  {renderNamedFilterSelect({
                    label: t('analytics:service_filter'),
                    value: selectedServiceValue,
                    options: serviceOptions,
                    allLabel: t('admin/calendar:all_services'),
                    onValueChange: handleServiceFilterChange,
                    triggerClassName: 'w-full bg-white'
                  })}
                </div>
                <div className="rounded-lg bg-gray-50 p-3">
                  {renderNamedFilterSelect({
                    label: t('analytics:product_filter'),
                    value: selectedProductValue,
                    options: productOptions,
                    allLabel: t('analytics:all_products'),
                    onValueChange: handleProductFilterChange,
                    triggerClassName: 'w-full bg-white'
                  })}
                </div>
              </div>
              <div className="space-y-2 text-sm text-gray-700">
                <p>{t('analytics:noise_score', 'Noise score')}: {dataReliability.noise_score.toFixed(1)} / 100</p>
                <p>{t('analytics:unknown_region_share', 'Доля неизвестного региона')}: {dataReliability.unknown_region_share.toFixed(2)}% ({dataReliability.unknown_region_count})</p>
                <p>{t('analytics:unknown_source_share', 'Доля неизвестного источника')}: {dataReliability.unknown_source_share.toFixed(2)}% ({dataReliability.unknown_source_count})</p>
                <p>{t('analytics:revenue_outlier_share', 'Доля выбросов по выручке')}: {dataReliability.revenue_outlier_share.toFixed(2)}% ({dataReliability.revenue_outlier_count})</p>
                <p>{t('analytics:hourly_cv', 'Коэффициент вариации по часам')}: {dataReliability.hourly_cv.toFixed(4)}</p>
                <p>
                  {t('analytics:can_trust_data', 'Можно ли доверять данным')}:{' '}
                  {dataReliability.can_trust
                    ? t('analytics:significant_yes', 'Да')
                    : t('analytics:significant_no', 'Нет')}
                </p>
                <p>
                  {t('analytics:confidence_level', 'Уровень уверенности')}:{' '}
                  {t(`analytics:confidence_values.${dataReliability.confidence_level}`, dataReliability.confidence_level)}
                </p>
              </div>
              {noiseComponentsData.length > 0 && (
                <div className="mt-5 rounded-xl border border-gray-200">
                  <div className="border-b border-gray-200 px-4 py-3">
                    <h3 className="text-sm md:text-base text-gray-900">{t('analytics:noise_breakdown_title')}</h3>
                    <p className="mt-1 text-xs md:text-sm text-gray-600">{t('analytics:noise_breakdown_description')}</p>
                  </div>
                  <div className="divide-y divide-gray-200">
                    {noiseComponentsData.map((componentItem) => (
                      <div key={componentItem.key} className="grid grid-cols-1 gap-2 px-4 py-3 md:grid-cols-[1.8fr_1fr_1fr] md:items-center">
                        <p className="text-sm text-gray-900">{getNoiseComponentLabel(componentItem.key)}</p>
                        <p className="text-sm text-gray-600">{componentItem.raw_value.toFixed(2)}</p>
                        <p className="text-sm font-medium text-gray-900">{componentItem.score.toFixed(1)} / 100</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {statTestRows.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 md:p-6 border-b border-gray-200">
                <h2 className="text-base md:text-xl text-gray-900">
                  {t('analytics:stat_tests_title', 'Статистические тесты и вывод')}
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 md:px-6 py-3 text-left text-xs md:text-sm text-gray-600">{t('analytics:test_name', 'Тест')}</th>
                      <th className="px-3 md:px-6 py-3 text-left text-xs md:text-sm text-gray-600">{t('analytics:effect_value', 'Эффект')}</th>
                      <th className="px-3 md:px-6 py-3 text-left text-xs md:text-sm text-gray-600">{t('analytics:p_value_label', 'P-value')}</th>
                      <th className="px-3 md:px-6 py-3 text-left text-xs md:text-sm text-gray-600">{t('analytics:significant', 'Значимость')}</th>
                      <th className="px-3 md:px-6 py-3 text-left text-xs md:text-sm text-gray-600">{t('analytics:conclusion_label', 'Вывод')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {statTestRows.map((testRow) => (
                      <tr key={testRow.key} className="hover:bg-gray-50">
                        <td className="px-3 md:px-6 py-3 text-xs md:text-sm text-gray-900">{testRow.name}</td>
                        <td className="px-3 md:px-6 py-3 text-xs md:text-sm text-gray-900">{formatEffectValue(testRow.effect)}</td>
                        <td className="px-3 md:px-6 py-3 text-xs md:text-sm text-gray-900">{formatPValue(testRow.pValue)}</td>
                        <td className="px-3 md:px-6 py-3 text-xs md:text-sm text-gray-900">
                          {testRow.significant
                            ? t('analytics:significant_yes', 'Да')
                            : t('analytics:significant_no', 'Нет')}
                        </td>
                        <td className="px-3 md:px-6 py-3 text-xs md:text-sm text-gray-700">{testRow.conclusion}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {statisticalTests?.comparison && (
                <div className="p-4 md:p-6 border-t border-gray-200 bg-gray-50 text-sm text-gray-700">
                  <p className="mb-1">
                    {t('analytics:strongest_effect_test', 'Самый сильный эффект')}:{' '}
                    {strongestTestLabelMap[statisticalTests.comparison.strongest_effect_test] ?? statisticalTests.comparison.strongest_effect_test}
                  </p>
                  <p className="mb-1">
                    {t('analytics:effect_value', 'Эффект')}: {formatEffectValue(statisticalTests.comparison.strongest_effect_value)}
                  </p>
                  <p>
                    {t('analytics:significant_tests_count', 'Значимых тестов')}:{' '}
                    {statisticalTests.comparison.significant_tests_count} / {statisticalTests.comparison.enabled_tests_count}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {hasCohortAttributionBlock && (
        <div className="grid grid-cols-1 gap-4 md:gap-6 mb-6 md:mb-8">
          {cohortSummaryData.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 md:p-6 border-b border-gray-200">
                <h2 className="text-base md:text-xl text-gray-900">
                  {t('analytics:cohort_retention_ltv_title')}
                </h2>
                <p className="text-xs md:text-sm text-gray-600 mt-2">
                  {t('analytics:cohort_horizon_months')}: {analytics?.cohort_retention_ltv?.horizon_months ?? 0},
                  {' '}
                  {t('analytics:cohorts_analyzed')}: {analytics?.cohort_retention_ltv?.cohorts_analyzed ?? 0}
                </p>
              </div>
              <div className="p-4 md:p-6 border-b border-gray-200">
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={cohortHeatmapM1Data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                    <XAxis dataKey="cohort" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="retention" name={t('analytics:cohort_m1_retention')} stroke="var(--chart-pink)" strokeWidth={2} />
                    <Line type="monotone" dataKey="ltv" name={t('analytics:cohort_m3_ltv')} stroke="var(--chart-cyan)" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 md:px-6 py-3 text-left text-xs md:text-sm text-gray-600">{t('analytics:cohort_month')}</th>
                      <th className="px-3 md:px-6 py-3 text-left text-xs md:text-sm text-gray-600">{t('analytics:cohort_size')}</th>
                      <th className="px-3 md:px-6 py-3 text-left text-xs md:text-sm text-gray-600">{t('analytics:cohort_m0_retention')}</th>
                      <th className="px-3 md:px-6 py-3 text-left text-xs md:text-sm text-gray-600">{t('analytics:cohort_m1_retention')}</th>
                      <th className="px-3 md:px-6 py-3 text-left text-xs md:text-sm text-gray-600">{t('analytics:cohort_m3_ltv')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {cohortSummaryData.map((rowItem) => (
                      <tr key={rowItem.cohort_month} className="hover:bg-gray-50">
                        <td className="px-3 md:px-6 py-3 text-xs md:text-sm text-gray-900">{rowItem.cohort_month}</td>
                        <td className="px-3 md:px-6 py-3 text-xs md:text-sm text-gray-900">{rowItem.cohort_size}</td>
                        <td className="px-3 md:px-6 py-3 text-xs md:text-sm text-gray-900">{rowItem.m0_retention.toFixed(1)}%</td>
                        <td className="px-3 md:px-6 py-3 text-xs md:text-sm text-gray-900">{rowItem.m1_retention.toFixed(1)}%</td>
                        <td className="px-3 md:px-6 py-3 text-xs md:text-sm text-gray-900">
                          {permissions.canViewFinancials ? formatCurrency(rowItem.m3_avg_ltv) : '---'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {unitEconomicsMasters.length > 0 && (
                <div className="p-4 md:p-6 border-t border-gray-200">
                  <h3 className="text-sm md:text-base text-gray-900 mb-3">{t('analytics:unit_by_master')}</h3>
                  <div className="space-y-2">
                    {unitEconomicsMasters.map((rowItem) => (
                      <div key={rowItem.master_name} className="flex items-center justify-between text-sm">
                        <span className="text-gray-700">{rowItem.master_name}</span>
                        <span className="text-gray-900">
                          {permissions.canViewFinancials ? formatCurrency(rowItem.margin_after_salary) : '---'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {attributionChannelsData.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 md:p-6 border-b border-gray-200">
                <h2 className="text-base md:text-xl text-gray-900">{t('analytics:attribution_title')}</h2>
                <p className="text-xs md:text-sm text-gray-600 mt-2">
                  {t('analytics:attribution_description')}
                </p>
                <p className="text-xs md:text-sm text-gray-600 mt-2">
                  {t('analytics:sample_size')}: {analytics?.attribution_multi_touch?.sample_size ?? 0}
                </p>
              </div>
              <div className="p-4 md:p-6 border-b border-gray-200">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={attributionChannelsData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                    <XAxis dataKey="channel" {...getCategoryAxisProps(getChannelLabel, isMobile ? 9 : 14)} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="first_touch" name={t('analytics:first_touch')} fill="var(--chart-purple)" />
                    <Bar dataKey="last_touch" name={t('analytics:last_touch')} fill="var(--chart-cyan)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 md:px-6 py-3 text-left text-xs md:text-sm text-gray-600">{t('analytics:channel')}</th>
                      <th className="px-3 md:px-6 py-3 text-left text-xs md:text-sm text-gray-600">{t('analytics:first_touch')}</th>
                      <th className="px-3 md:px-6 py-3 text-left text-xs md:text-sm text-gray-600">{t('analytics:last_touch')}</th>
                      <th className="px-3 md:px-6 py-3 text-left text-xs md:text-sm text-gray-600">{t('analytics:linear_share')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {attributionChannelsData.map((rowItem) => (
                      <tr key={rowItem.channel} className="hover:bg-gray-50">
                        <td className="px-3 md:px-6 py-3 text-xs md:text-sm text-gray-900">{getChannelLabel(rowItem.channel)}</td>
                        <td className="px-3 md:px-6 py-3 text-xs md:text-sm text-gray-900">{rowItem.first_touch}</td>
                        <td className="px-3 md:px-6 py-3 text-xs md:text-sm text-gray-900">{rowItem.last_touch}</td>
                        <td className="px-3 md:px-6 py-3 text-xs md:text-sm text-gray-900">{rowItem.linear_share.toFixed(2)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {attributionPathsData.length > 0 && (
                <div className="p-4 md:p-6 border-t border-gray-200">
                  <h3 className="text-sm md:text-base text-gray-900 mb-3">{t('analytics:top_paths')}</h3>
                  <div className="space-y-2">
                    {attributionPathsData.map((pathItem) => (
                      <div key={pathItem.path} className="flex items-center justify-between text-sm text-gray-700">
                        <span>{formatChannelPath(pathItem.path)}</span>
                        <span className="font-medium text-gray-900">{pathItem.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {hasForecastNoShowBlock && (
        <div className="grid grid-cols-1 gap-4 md:gap-6 mb-6 md:mb-8">
          {forecastUpcomingData.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 md:p-6 border-b border-gray-200">
                <h2 className="text-base md:text-xl text-gray-900">{t('analytics:load_forecast_title')}</h2>
                <p className="text-xs md:text-sm text-gray-600 mt-2">
                  {t('analytics:forecast_description')}
                </p>
                <p className="text-xs md:text-sm text-gray-600 mt-2">
                  {t('analytics:forecast_horizon')}: {analytics?.load_forecast?.horizon_days ?? 0}
                </p>
                <p className="text-xs md:text-sm text-gray-600 mt-1">{forecastScopeDescription}</p>
                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-xs text-gray-500">{t('analytics:forecast_historical_sample')}</p>
                    <p className="text-base font-semibold text-gray-900">{analytics?.load_forecast?.historical_sample_size ?? 0}</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-xs text-gray-500">{t('analytics:forecast_active_slots')}</p>
                    <p className="text-base font-semibold text-gray-900">{analytics?.load_forecast?.active_slot_count ?? 0}</p>
                  </div>
                </div>
              </div>
              <div className="p-4 md:p-6 border-b border-gray-200">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={forecastUpcomingData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="predicted" name={t('analytics:predicted_bookings')} fill="var(--chart-green)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 md:px-6 py-3 text-left text-xs md:text-sm text-gray-600">{t('analytics:date')}</th>
                      <th className="px-3 md:px-6 py-3 text-left text-xs md:text-sm text-gray-600">{t('analytics:predicted_bookings')}</th>
                      <th className="px-3 md:px-6 py-3 text-left text-xs md:text-sm text-gray-600">{t('analytics:load_level')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {(analytics?.load_forecast?.upcoming_days ?? []).slice(0, 10).map((rowItem) => (
                      <tr key={rowItem.date} className="hover:bg-gray-50">
                        <td className="px-3 md:px-6 py-3 text-xs md:text-sm text-gray-900">{rowItem.date}</td>
                        <td className="px-3 md:px-6 py-3 text-xs md:text-sm text-gray-900">{formatForecastPredictedBookings(rowItem.predicted_total_bookings)}</td>
                        <td className="px-3 md:px-6 py-3 text-xs md:text-sm text-gray-900">
                          {t(`analytics:load_level_${rowItem.load_level}`)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {forecastHighLoadSlotsData.length > 0 && (
                <div className="p-4 md:p-6 border-t border-gray-200">
                  <h3 className="text-sm md:text-base text-gray-900 mb-3">{t('analytics:high_load_slots')}</h3>
                  <p className="mb-3 text-xs md:text-sm text-gray-600">{t('analytics:high_load_slots_description')}</p>
                  <div className="space-y-2">
                    {forecastHighLoadSlotsData.map((rowItem) => (
                      <div key={`${rowItem.date}-${rowItem.hour}`} className="flex items-center justify-between text-sm text-gray-700">
                        <span>{rowItem.date} {rowItem.hour}</span>
                        <span className="font-medium text-gray-900">{formatForecastPredictedBookings(rowItem.predicted_bookings)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {noShowServiceData.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 md:p-6 border-b border-gray-200">
                <h2 className="text-base md:text-xl text-gray-900">{t('analytics:no_show_title')}</h2>
              </div>
              <div className="p-4 md:p-6 border-b border-gray-200">
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={noShowHourlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                    <XAxis dataKey="hour" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="no_show_rate" name={t('analytics:no_show_rate')} stroke="var(--chart-red)" strokeWidth={2} />
                    <Line type="monotone" dataKey="cancel_rate" name={t('analytics:cancel_rate')} stroke="var(--chart-amber)" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 md:px-6 py-3 text-left text-xs md:text-sm text-gray-600">{t('analytics:service')}</th>
                      <th className="px-3 md:px-6 py-3 text-left text-xs md:text-sm text-gray-600">{t('analytics:bookings')}</th>
                      <th className="px-3 md:px-6 py-3 text-left text-xs md:text-sm text-gray-600">{t('analytics:no_show_rate')}</th>
                      <th className="px-3 md:px-6 py-3 text-left text-xs md:text-sm text-gray-600">{t('analytics:cancel_rate')}</th>
                      <th className="px-3 md:px-6 py-3 text-left text-xs md:text-sm text-gray-600">{t('analytics:risk_score')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {noShowServiceData.map((rowItem) => (
                      <tr key={rowItem.service_name} className="hover:bg-gray-50">
                        <td className="px-3 md:px-6 py-3 text-xs md:text-sm text-gray-900">{rowItem.service_name}</td>
                        <td className="px-3 md:px-6 py-3 text-xs md:text-sm text-gray-900">{rowItem.bookings}</td>
                        <td className="px-3 md:px-6 py-3 text-xs md:text-sm text-gray-900">{rowItem.no_show_rate.toFixed(2)}%</td>
                        <td className="px-3 md:px-6 py-3 text-xs md:text-sm text-gray-900">{rowItem.cancel_rate.toFixed(2)}%</td>
                        <td className="px-3 md:px-6 py-3 text-xs md:text-sm text-gray-900">{rowItem.risk_score.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {noShowHighRiskClientsData.length > 0 && (
                <div className="p-4 md:p-6 border-t border-gray-200">
                  <h3 className="text-sm md:text-base text-gray-900 mb-3">{t('analytics:high_risk_clients')}</h3>
                  <div className="space-y-2">
                    {noShowHighRiskClientsData.map((rowItem) => (
                      <div key={rowItem.client_id} className="flex items-center justify-between text-sm">
                        <span className="text-gray-700">{rowItem.client_id}</span>
                        <span className="text-gray-900">
                          {rowItem.risk_score.toFixed(2)} ({t(`analytics:risk_level_${rowItem.risk_level}`)})
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {hasUnitTimeBlock && (
        <div className="grid grid-cols-1 gap-4 md:gap-6 mb-6 md:mb-8">
          {unitEconomicsServices.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 md:p-6 border-b border-gray-200">
                <h2 className="text-base md:text-xl text-gray-900">{t('analytics:unit_economics_title')}</h2>
                <p className="text-xs md:text-sm text-gray-600 mt-2">
                  {t('analytics:unit_model')}: {getUnitEconomicsModelLabel(analytics?.unit_economics?.model ?? '')}
                </p>
                <p className="text-xs md:text-sm text-gray-600 mt-1">
                  {getUnitEconomicsModelDescription(analytics?.unit_economics?.model ?? '')}
                </p>
              </div>
              {unitEconomicsSummary && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 md:p-6 border-b border-gray-200">
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-xs text-gray-500">{t('analytics:revenue_total')}</p>
                    <p className="text-base font-semibold text-gray-900">
                      {permissions.canViewFinancials ? formatCurrency(unitEconomicsSummary.revenue_total) : '---'}
                    </p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-xs text-gray-500">{t('analytics:variable_cost_total')}</p>
                    <p className="text-base font-semibold text-gray-900">
                      {permissions.canViewFinancials ? formatCurrency(unitEconomicsSummary.variable_cost_total) : '---'}
                    </p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-xs text-gray-500">{t('analytics:margin_total')}</p>
                    <p className="text-base font-semibold text-gray-900">
                      {permissions.canViewFinancials ? formatCurrency(unitEconomicsSummary.margin_total) : '---'}
                    </p>
                  </div>
                </div>
              )}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 md:px-6 py-3 text-left text-xs md:text-sm text-gray-600">{t('analytics:service')}</th>
                      <th className="px-3 md:px-6 py-3 text-left text-xs md:text-sm text-gray-600">{t('analytics:bookings')}</th>
                      <th className="px-3 md:px-6 py-3 text-left text-xs md:text-sm text-gray-600">{t('analytics:revenue')}</th>
                      <th className="px-3 md:px-6 py-3 text-left text-xs md:text-sm text-gray-600">{t('analytics:variable_cost_total')}</th>
                      <th className="px-3 md:px-6 py-3 text-left text-xs md:text-sm text-gray-600">{t('analytics:margin')}</th>
                      <th className="px-3 md:px-6 py-3 text-left text-xs md:text-sm text-gray-600">{t('analytics:margin_rate')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {unitEconomicsServices.map((rowItem) => (
                      <tr key={rowItem.service_name} className="hover:bg-gray-50">
                        <td className="px-3 md:px-6 py-3 text-xs md:text-sm text-gray-900">{rowItem.service_name}</td>
                        <td className="px-3 md:px-6 py-3 text-xs md:text-sm text-gray-900">{rowItem.bookings}</td>
                        <td className="px-3 md:px-6 py-3 text-xs md:text-sm text-gray-900">
                          {permissions.canViewFinancials ? formatCurrency(rowItem.revenue) : '---'}
                        </td>
                        <td className="px-3 md:px-6 py-3 text-xs md:text-sm text-gray-900">
                          {permissions.canViewFinancials ? formatCurrency(rowItem.variable_cost) : '---'}
                        </td>
                        <td className="px-3 md:px-6 py-3 text-xs md:text-sm text-gray-900">
                          {permissions.canViewFinancials ? formatCurrency(rowItem.margin) : '---'}
                        </td>
                        <td className="px-3 md:px-6 py-3 text-xs md:text-sm text-gray-900">{rowItem.margin_rate.toFixed(2)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {timeToBookData && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 md:p-6 border-b border-gray-200">
                <h2 className="text-base md:text-xl text-gray-900">{t('analytics:time_to_book_title')}</h2>
                <p className="text-xs md:text-sm text-gray-600 mt-2">{t('analytics:time_to_book_description')}</p>
                <p className="text-xs md:text-sm text-gray-600 mt-1">{t('analytics:median_explanation')}</p>
              </div>
              <div className="grid grid-cols-2 gap-3 p-4 md:p-6 border-b border-gray-200">
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-xs text-gray-500">{t('analytics:sample_size')}</p>
                  <p className="text-base font-semibold text-gray-900">{timeToBookData.sample_size}</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-xs text-gray-500">{t('analytics:avg_minutes')}</p>
                  <p className="text-base font-semibold text-gray-900">{timeToBookData.avg_minutes.toFixed(1)}</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-xs text-gray-500">{t('analytics:median_minutes')}</p>
                  <p className="text-base font-semibold text-gray-900">{timeToBookData.median_minutes.toFixed(1)}</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-xs text-gray-500">{t('analytics:max_minutes')}</p>
                  <p className="text-base font-semibold text-gray-900">{timeToBookData.max_minutes.toFixed(1)}</p>
                </div>
              </div>
              <div className="p-4 md:p-6 border-b border-gray-200">
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={timeToBookBucketsData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                    <XAxis dataKey="bucket" {...getCategoryAxisProps(undefined, isMobile ? 10 : 14)} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" name={t('analytics:bookings')} fill="var(--chart-pink)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 md:px-6 py-3 text-left text-xs md:text-sm text-gray-600">{t('analytics:source')}</th>
                      <th className="px-3 md:px-6 py-3 text-left text-xs md:text-sm text-gray-600">{t('analytics:sample_size')}</th>
                      <th className="px-3 md:px-6 py-3 text-left text-xs md:text-sm text-gray-600">{t('analytics:avg_minutes')}</th>
                      <th className="px-3 md:px-6 py-3 text-left text-xs md:text-sm text-gray-600">{t('analytics:median_minutes')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {timeToBookSourceData.map((rowItem) => (
                      <tr key={rowItem.source} className="hover:bg-gray-50">
                        <td className="px-3 md:px-6 py-3 text-xs md:text-sm text-gray-900">{getChannelLabel(rowItem.source)}</td>
                        <td className="px-3 md:px-6 py-3 text-xs md:text-sm text-gray-900">{rowItem.sample_size}</td>
                        <td className="px-3 md:px-6 py-3 text-xs md:text-sm text-gray-900">{rowItem.avg_minutes.toFixed(1)}</td>
                        <td className="px-3 md:px-6 py-3 text-xs md:text-sm text-gray-900">{rowItem.median_minutes.toFixed(1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {hasFunnelPromoBlock && (
        <div className="grid grid-cols-1 gap-4 md:gap-6 mb-6 md:mb-8">
          {fullFunnelData && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 md:p-6 border-b border-gray-200">
                <h2 className="text-base md:text-xl text-gray-900">{t('analytics:full_funnel_title')}</h2>
              </div>
              <div className="p-4 md:p-6 border-b border-gray-200">
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={fullFunnelStagesData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                    <XAxis dataKey="stage" {...getCategoryAxisProps(undefined, isMobile ? 10 : 14)} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" name={t('analytics:clients')} fill="var(--chart-purple)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-3 p-4 md:p-6 border-b border-gray-200">
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-xs text-gray-500">{t('analytics:full_funnel_conversion_contact_booked')}</p>
                  <p className="text-base font-semibold text-gray-900">{fullFunnelData.conversions.contact_to_booked.toFixed(2)}%</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-xs text-gray-500">{t('analytics:full_funnel_conversion_booked_visited')}</p>
                  <p className="text-base font-semibold text-gray-900">{fullFunnelData.conversions.booked_to_visited.toFixed(2)}%</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-xs text-gray-500">{t('analytics:full_funnel_conversion_visited_repeat')}</p>
                  <p className="text-base font-semibold text-gray-900">{fullFunnelData.conversions.visited_to_repeat.toFixed(2)}%</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-xs text-gray-500">{t('analytics:full_funnel_conversion_contact_repeat')}</p>
                  <p className="text-base font-semibold text-gray-900">{fullFunnelData.conversions.contact_to_repeat.toFixed(2)}%</p>
                </div>
              </div>
              <div className="p-4 md:p-6">
                <h3 className="text-sm md:text-base text-gray-900 mb-3">{t('analytics:full_funnel_sources_title')}</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-lg bg-gray-50 p-3 text-center">
                    <p className="text-xs text-gray-500">{t('analytics:chat_clients')}</p>
                    <p className="text-base font-semibold text-gray-900">{fullFunnelData.sources.chat_clients}</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3 text-center">
                    <p className="text-xs text-gray-500">{t('analytics:messenger_clients')}</p>
                    <p className="text-base font-semibold text-gray-900">{fullFunnelData.sources.messenger_clients}</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3 text-center">
                    <p className="text-xs text-gray-500">{t('analytics:call_clients')}</p>
                    <p className="text-base font-semibold text-gray-900">{fullFunnelData.sources.call_clients}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {promoUpliftData && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 md:p-6 border-b border-gray-200">
                <h2 className="text-base md:text-xl text-gray-900">{t('analytics:promo_uplift_title')}</h2>
              </div>
              <div className="grid grid-cols-2 gap-3 p-4 md:p-6 border-b border-gray-200">
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-xs text-gray-500">{t('analytics:promo_bookings')}</p>
                  <p className="text-base font-semibold text-gray-900">{promoUpliftData.promo_bookings}</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-xs text-gray-500">{t('analytics:regular_bookings')}</p>
                  <p className="text-base font-semibold text-gray-900">{promoUpliftData.regular_bookings}</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-xs text-gray-500">{t('analytics:completion_rate_uplift')}</p>
                  <p className="text-base font-semibold text-gray-900">{formatPercentDelta(promoUpliftData.completion_rate_uplift)}</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-xs text-gray-500">{t('analytics:avg_revenue_uplift')}</p>
                  <p className="text-base font-semibold text-gray-900">
                    {permissions.canViewFinancials ? formatCurrencyDelta(promoUpliftData.avg_revenue_uplift) : '---'}
                  </p>
                </div>
              </div>
              <div className="p-4 md:p-6 border-b border-gray-200">
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart
                    data={[
                      {
                        name: t('analytics:promo'),
                        completion: promoUpliftData.promo_completion_rate,
                        revenue: promoUpliftData.promo_avg_revenue
                      },
                      {
                        name: t('analytics:regular'),
                        completion: promoUpliftData.regular_completion_rate,
                        revenue: promoUpliftData.regular_avg_revenue
                      }
                    ]}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="completion" name={t('analytics:conversion')} fill="var(--chart-green)" />
                    <Bar dataKey="revenue" name={t('analytics:avg_check')} fill="var(--chart-cyan)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 md:px-6 py-3 text-left text-xs md:text-sm text-gray-600">{t('analytics:promo_code')}</th>
                      <th className="px-3 md:px-6 py-3 text-left text-xs md:text-sm text-gray-600">{t('analytics:bookings')}</th>
                      <th className="px-3 md:px-6 py-3 text-left text-xs md:text-sm text-gray-600">{t('analytics:conversion')}</th>
                      <th className="px-3 md:px-6 py-3 text-left text-xs md:text-sm text-gray-600">{t('analytics:avg_check')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {promoCodesData.map((rowItem) => (
                      <tr key={rowItem.promo_code} className="hover:bg-gray-50">
                        <td className="px-3 md:px-6 py-3 text-xs md:text-sm text-gray-900">{rowItem.promo_code}</td>
                        <td className="px-3 md:px-6 py-3 text-xs md:text-sm text-gray-900">{rowItem.bookings}</td>
                        <td className="px-3 md:px-6 py-3 text-xs md:text-sm text-gray-900">{rowItem.completion_rate.toFixed(2)}%</td>
                        <td className="px-3 md:px-6 py-3 text-xs md:text-sm text-gray-900">
                          {permissions.canViewFinancials ? formatCurrency(rowItem.avg_revenue) : '---'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {hasRfmSlaBlock && (
        <div className="grid grid-cols-1 gap-4 md:gap-6 mb-6 md:mb-8">
          {rfmSegmentationData && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 md:p-6 border-b border-gray-200">
                <h2 className="text-base md:text-xl text-gray-900">{t('analytics:rfm_title')}</h2>
                <p className="text-xs md:text-sm text-gray-600 mt-2">
                  {t('analytics:sample_size')}: {rfmSegmentationData.sample_size}
                </p>
              </div>
              <div className="p-4 md:p-6 border-b border-gray-200">
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={rfmSegmentsChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                    <XAxis dataKey="segment" {...getCategoryAxisProps((value) => t(`analytics:rfm_segment_${value}`), isMobile ? 10 : 14)} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" name={t('analytics:clients')} fill="var(--chart-amber)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {rfmExamplesData.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 md:px-6 py-3 text-left text-xs md:text-sm text-gray-600">{t('analytics:client')}</th>
                        <th className="px-3 md:px-6 py-3 text-left text-xs md:text-sm text-gray-600">R</th>
                        <th className="px-3 md:px-6 py-3 text-left text-xs md:text-sm text-gray-600">F</th>
                        <th className="px-3 md:px-6 py-3 text-left text-xs md:text-sm text-gray-600">M</th>
                        <th className="px-3 md:px-6 py-3 text-left text-xs md:text-sm text-gray-600">{t('analytics:recency_days')}</th>
                        <th className="px-3 md:px-6 py-3 text-left text-xs md:text-sm text-gray-600">{t('analytics:frequency')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {rfmExamplesData.map((rowItem) => (
                        <tr key={rowItem.client_id} className="hover:bg-gray-50">
                          <td className="px-3 md:px-6 py-3 text-xs md:text-sm text-gray-900">{rowItem.client_id}</td>
                          <td className="px-3 md:px-6 py-3 text-xs md:text-sm text-gray-900">{rowItem.r_score}</td>
                          <td className="px-3 md:px-6 py-3 text-xs md:text-sm text-gray-900">{rowItem.f_score}</td>
                          <td className="px-3 md:px-6 py-3 text-xs md:text-sm text-gray-900">{rowItem.m_score}</td>
                          <td className="px-3 md:px-6 py-3 text-xs md:text-sm text-gray-900">{rowItem.recency_days}</td>
                          <td className="px-3 md:px-6 py-3 text-xs md:text-sm text-gray-900">{rowItem.frequency}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {slaAnalyticsData && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 md:p-6 border-b border-gray-200">
                <h2 className="text-base md:text-xl text-gray-900">{t('analytics:sla_title')}</h2>
              </div>
              <div className="grid grid-cols-3 gap-3 p-4 md:p-6 border-b border-gray-200">
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-xs text-gray-500">{t('analytics:sla_calls_team')}</p>
                  <p className="text-sm font-semibold text-gray-900">{secondsToMinutes(slaAnalyticsData.calls_team.avg_seconds)} {t('analytics:min')}</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-xs text-gray-500">{t('analytics:sla_chat_team')}</p>
                  <p className="text-sm font-semibold text-gray-900">{secondsToMinutes(slaAnalyticsData.chat_team.avg_seconds)} {t('analytics:min')}</p>
                </div>
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-xs text-gray-500">{t('analytics:sla_combined_team')}</p>
                  <p className="text-sm font-semibold text-gray-900">{secondsToMinutes(slaAnalyticsData.combined_team.avg_seconds)} {t('analytics:min')}</p>
                </div>
              </div>
              <div className="p-4 md:p-6 border-b border-gray-200">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={slaCombinedThresholdsData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                    <XAxis dataKey="threshold" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="rate" name={t('analytics:sla_threshold_performance')} fill="var(--chart-green)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 md:px-6 py-3 text-left text-xs md:text-sm text-gray-600">{t('analytics:employee')}</th>
                      <th className="px-3 md:px-6 py-3 text-left text-xs md:text-sm text-gray-600">{t('analytics:sample_size')}</th>
                      <th className="px-3 md:px-6 py-3 text-left text-xs md:text-sm text-gray-600">{t('analytics:avg_minutes')}</th>
                      <th className="px-3 md:px-6 py-3 text-left text-xs md:text-sm text-gray-600">{t('analytics:sla_5m_rate')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {slaEmployeeData.map((rowItem) => (
                      <tr key={rowItem.employee_name} className="hover:bg-gray-50">
                        <td className="px-3 md:px-6 py-3 text-xs md:text-sm text-gray-900">{rowItem.employee_name}</td>
                        <td className="px-3 md:px-6 py-3 text-xs md:text-sm text-gray-900">{rowItem.combined_sample_size}</td>
                        <td className="px-3 md:px-6 py-3 text-xs md:text-sm text-gray-900">{secondsToMinutes(rowItem.combined_avg_seconds)}</td>
                        <td className="px-3 md:px-6 py-3 text-xs md:text-sm text-gray-900">{rowItem.combined_sla_5m_rate.toFixed(2)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Funnel Overview */}
      {funnel && (
        <>
          {/* Conversion Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <p className="text-gray-600 text-sm mb-2">{t('analytics:funnel.conversion.visitor_to_engaged')}</p>
              <div className="flex items-center justify-between">
                <h3 className="text-3xl text-gray-900">{funnel.conversion_rates.visitor_to_engaged}%</h3>
                {funnel.conversion_rates.visitor_to_engaged >= 60 ? <TrendingUp className="w-6 h-6 text-green-600" /> : <TrendingDown className="w-6 h-6 text-yellow-600" />}
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <p className="text-gray-600 text-sm mb-2">{t('analytics:funnel.conversion.engaged_to_booking')}</p>
              <div className="flex items-center justify-between">
                <h3 className="text-3xl text-gray-900">{funnel.conversion_rates.engaged_to_booking}%</h3>
                {funnel.conversion_rates.engaged_to_booking >= 50 ? <TrendingUp className="w-6 h-6 text-green-600" /> : <TrendingDown className="w-6 h-6 text-yellow-600" />}
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <p className="text-gray-600 text-sm mb-2">{t('analytics:funnel.conversion.booking_to_booked')}</p>
              <div className="flex items-center justify-between">
                <h3 className="text-3xl text-gray-900">{funnel.conversion_rates.booking_to_booked}%</h3>
                {funnel.conversion_rates.booking_to_booked >= 50 ? <TrendingUp className="w-6 h-6 text-green-600" /> : <TrendingDown className="w-6 h-6 text-yellow-600" />}
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <p className="text-gray-600 text-sm mb-2">{t('analytics:funnel.conversion.booked_to_completed')}</p>
              <div className="flex items-center justify-between">
                <h3 className="text-3xl text-gray-900">{funnel.conversion_rates.booked_to_completed}%</h3>
                {funnel.conversion_rates.booked_to_completed >= 90 ? <TrendingUp className="w-6 h-6 text-green-600" /> : <TrendingDown className="w-6 h-6 text-yellow-600" />}
              </div>
            </div>
          </div>

          <div className="analytics-funnel-card bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
            <h2 className="analytics-funnel-title text-2xl text-gray-900 mb-6 flex items-center gap-2">
              <Filter className="analytics-funnel-icon w-6 h-6 text-pink-600" />
              {t('analytics:funnel_chart')}
            </h2>

            <div className="space-y-4">
              {[
                { name: t('analytics:funnel.stages.visitors'), value: funnel.visitors, color: 'funnel-stage-visitors', desc: t('analytics:funnel.desc.visitors') },
                { name: t('analytics:funnel.stages.engaged'), value: funnel.engaged, color: 'funnel-stage-engaged', desc: t('analytics:funnel.desc.engaged') },
                { name: t('analytics:funnel.stages.started_booking'), value: funnel.started_booking, color: 'funnel-stage-started', desc: t('analytics:funnel.desc.started_booking') },
                { name: t('analytics:funnel.stages.booked'), value: funnel.booked, color: 'funnel-stage-booked', desc: t('analytics:funnel.desc.booked') },
                { name: t('analytics:funnel.stages.completed'), value: funnel.completed, color: 'funnel-stage-completed', desc: t('analytics:funnel.desc.completed') }
              ].map((stage, index, arr) => {
                const visitorsCount = Math.max(funnel.visitors ?? 0, 1);
                const percentage = (stage.value / visitorsCount) * 100;
                const conversionPercent = (stage.value / visitorsCount) * 100;
                const prevValue = index > 0 ? arr[index - 1].value : 0;
                const loss = index > 0 ? prevValue - stage.value : 0;

                return (
                  <div key={index} className="flex flex-col items-center">
                    <div className="analytics-funnel-row w-full">
                      <div
                        className={`analytics-funnel-bar-shape ${stage.color}`}
                        style={{
                          width: `${Math.max(percentage, 20)}%`
                        }}
                      >
                        <div className="analytics-funnel-label">
                          <h3>{stage.name}</h3>
                          <p className="text-xs font-normal opacity-90">{stage.desc}</p>
                        </div>
                        <div className="analytics-funnel-values">
                          <p className="analytics-funnel-count">{stage.value}</p>
                          <p className="analytics-funnel-percent">{conversionPercent.toFixed(1)}%</p>
                        </div>
                      </div>
                    </div>

                    {/* Visual Connector & Loss Label */}
                    {index < arr.length - 1 && (
                      <div className="flex flex-col items-center my-1 z-0 relative">
                        <div className="analytics-funnel-connector h-4"></div>
                        {loss > 0 && (
                          <div className="absolute left-[calc(100%+10px)] top-0 flex items-center gap-1 text-red-500 text-xs whitespace-nowrap bg-red-50 px-2 py-1 rounded-full border border-red-100 shadow-sm transform -translate-y-1/2">
                            <TrendingDown className="w-3 h-3" />
                            -{loss} ({((loss / prevValue) * 100).toFixed(1)}%)
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Drop-off Analysis */}
      {analytics?.drop_off_points && analytics.drop_off_points.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mt-6">
          <div className="p-4 md:p-6 border-b border-gray-200">
            <h2 className="text-base md:text-xl text-gray-900 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              {t('analytics:drop_off_analysis')}
            </h2>
            <p className="text-xs md:text-sm text-gray-600 mt-1">
              {t('analytics:where_clients_leave')}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 md:px-6 py-3 md:py-4 text-left text-xs md:text-sm text-gray-600">
                    {t('analytics:conversation_stage')}
                  </th>
                  <th className="px-3 md:px-6 py-3 md:py-4 text-left text-xs md:text-sm text-gray-600">
                    {t('analytics:drop_offs')}
                  </th>
                  <th className="px-3 md:px-6 py-3 md:py-4 text-left text-xs md:text-sm text-gray-600">
                    {t('analytics:percentage')}
                  </th>
                  <th className="px-3 md:px-6 py-3 md:py-4 text-left text-xs md:text-sm text-gray-600">
                    {t('analytics:recommendation')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {analytics.drop_off_points.map((point, index) => {
                  const recommendations: Record<string, string> = {
                    'after_price': t('analytics:work_on_objections'),
                    'no_slots': t('analytics:need_more_masters'),
                    'whatsapp_request': t('analytics:simplify_contact_collection'),
                    'after_greeting': t('analytics:improve_greeting'),
                    'service_selection': t('analytics:clarify_services')
                  };

                  return (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-3 md:px-6 py-3 md:py-4 text-xs md:text-sm text-gray-900">
                        <div className="flex items-center gap-2">
                          <div
                            className="analytics-drop-off-dot w-2 h-2 rounded-full"
                            style={{
                              backgroundColor: point.percentage > 50 ? 'var(--chart-red)' :
                                point.percentage > 30 ? 'var(--chart-amber)' : 'var(--chart-green)'
                            }}
                          />
                          {t(`analytics:stages.${point.stage}`)}
                        </div>
                      </td>
                      <td className="px-3 md:px-6 py-3 md:py-4 text-xs md:text-sm text-gray-900 font-medium">
                        {point.count}
                      </td>
                      <td className="px-3 md:px-6 py-3 md:py-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-[100px]">
                            <div
                              className="h-2 rounded-full transition-all"
                              style={{
                                width: `${point.percentage}%`,
                                backgroundColor: point.percentage > 50 ? 'var(--chart-red)' :
                                  point.percentage > 30 ? 'var(--chart-amber)' : 'var(--chart-green)'
                              }}
                            />
                          </div>
                          <span className="text-xs md:text-sm font-medium text-gray-900">
                            {point.percentage.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-3 md:px-6 py-3 md:py-4 text-xs md:text-sm text-gray-600">
                        {recommendations[point.stage] ?? t('analytics:analyze_further')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="p-4 md:p-6 bg-blue-50 border-t border-blue-100">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <Lightbulb className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-blue-900 mb-1">
                  {t('analytics:optimization_tip')}
                </p>
                <p className="text-sm text-blue-800">
                  {t('analytics:focus_on_highest_drop_off')}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
