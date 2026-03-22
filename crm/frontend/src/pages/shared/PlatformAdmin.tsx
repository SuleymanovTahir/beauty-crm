import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { api } from '@crm/services/api';
import { Button } from '@crm/components/ui/button';
import { Input } from '@crm/components/ui/input';
import { Label } from '@crm/components/ui/label';

type Overview = {
  companies_total: number;
  companies_active: number;
  companies_trial: number;
  companies_suspended: number;
  tariffs_total: number;
  ads_active: number;
  payments_total_amount: number;
  expected_mrr: number;
  clients_total: number;
  products_total: number;
  messages_this_month: number;
  storage_total_mb: number;
  payments_overdue: number;
  payments_due_7_days: number;
};

type CompanyEditor = {
  tariff_key: string;
  billing_cycle_months: string;
  price_override_amount: string;
  currency_override: string;
  discount_percent: string;
  discount_amount: string;
  discount_reason: string;
  employee_limit_override: string;
  client_limit_override: string;
  product_limit_override: string;
  monthly_message_limit_override: string;
  storage_limit_mb_override: string;
  ad_slot_limit_override: string;
  feature_flags_input: string;
  notes: string;
  effective_at: string;
};

type PaymentEditor = {
  amount: string;
  base_amount: string;
  currency: string;
  period_months: string;
  invoice_number: string;
  notes: string;
  paid_at: string;
  due_at: string;
};

type AuditEntry = {
  id: number;
  company_id?: number | null;
  company_name?: string | null;
  user_id?: number | null;
  user_role?: string | null;
  username?: string | null;
  action?: string | null;
  entity_type?: string | null;
  entity_id?: string | null;
  success?: boolean | null;
  error_message?: string | null;
  created_at?: string | null;
};

type WebhookRow = {
  id: number;
  company_id?: number | null;
  company_name?: string | null;
  name?: string | null;
  url?: string | null;
  events?: string[];
  is_active?: boolean;
  last_triggered_at?: string | null;
  last_status_code?: number | null;
  fail_count?: number;
  created_at?: string | null;
};

type PlatformChatEntry = {
  id: number;
  company_id?: number | null;
  company_name?: string | null;
  instagram_id?: string | null;
  client_name?: string | null;
  sender?: string | null;
  message?: string | null;
  message_type?: string | null;
  is_read?: boolean;
  timestamp?: string | null;
};

type PlatformCallEntry = {
  id: number;
  company_id?: number | null;
  company_name?: string | null;
  client_id?: string | null;
  client_name?: string | null;
  phone?: string | null;
  direction?: string | null;
  status?: string | null;
  duration?: number;
  manager_name?: string | null;
  service_name?: string | null;
  notes?: string | null;
  recording_url?: string | null;
  recording_file?: string | null;
  has_recording?: boolean;
  created_at?: string | null;
};

const emptyOverview: Overview = {
  companies_total: 0,
  companies_active: 0,
  companies_trial: 0,
  companies_suspended: 0,
  tariffs_total: 0,
  ads_active: 0,
  payments_total_amount: 0,
  expected_mrr: 0,
  clients_total: 0,
  products_total: 0,
  messages_this_month: 0,
  storage_total_mb: 0,
  payments_overdue: 0,
  payments_due_7_days: 0,
};

const emptyCompanyForm = {
  name: '',
  email: '',
  phone: '',
  business_type: 'other',
  employee_limit: '5',
  tariff_key: 'trial',
};

const emptyTariffForm = {
  key: '',
  name: '',
  description: '',
  employee_limit: '5',
  client_limit: '0',
  product_limit: '0',
  monthly_message_limit: '0',
  storage_limit_mb: '0',
  ad_slot_limit: '0',
  monthly_price: '0',
  yearly_price: '0',
  currency: 'USD',
  trial_days: '14',
  feature_flags_input: '',
};

const emptyBroadcastForm = {
  title: '',
  message: '',
  company_statuses: 'active,trial',
  company_ids: '',
  tariff_keys: '',
};

const emptyAdForm = {
  company_id: '',
  title: '',
  description: '',
  image_url: '',
  link_url: '',
  placement: 'dashboard_top',
  size_label: '1200x240',
  width_px: '1200',
  height_px: '240',
  status: 'draft',
  starts_at: '',
  ends_at: '',
  notes: '',
};

const toNumberOrUndefined = (value: string): number | undefined => {
  const trimmedValue = value.trim();
  if (trimmedValue.length === 0) {
    return undefined;
  }
  const parsedValue = Number(trimmedValue);
  return Number.isFinite(parsedValue) ? parsedValue : undefined;
};

const toDateTimeLocal = (value: string | null | undefined): string => {
  if (typeof value !== 'string') {
    return '';
  }
  const normalizedValue = value.trim();
  if (normalizedValue.length === 0) {
    return '';
  }
  const dateValue = new Date(normalizedValue);
  if (Number.isNaN(dateValue.getTime())) {
    return '';
  }
  const year = dateValue.getFullYear();
  const month = String(dateValue.getMonth() + 1).padStart(2, '0');
  const day = String(dateValue.getDate()).padStart(2, '0');
  const hours = String(dateValue.getHours()).padStart(2, '0');
  const minutes = String(dateValue.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const parseFeatureFlagsInput = (value: string): Record<string, boolean> => {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .reduce<Record<string, boolean>>((accumulator, item) => {
      accumulator[item] = true;
      return accumulator;
    }, {});
};

const buildCompanyEditor = (company: any): CompanyEditor => {
  const subscription = company?.subscription ?? {};
  const snapshot = subscription?.current_snapshot ?? {};
  const scheduledChange = subscription?.scheduled_change ?? {};
  const scheduledSnapshot = scheduledChange?.snapshot ?? {};
  const activeSnapshot = Object.keys(scheduledSnapshot).length > 0 ? scheduledSnapshot : snapshot;
  const featureFlags = activeSnapshot?.feature_flags ?? {};
  return {
    tariff_key: scheduledChange?.tariff_key ?? scheduledSnapshot?.tariff_key ?? subscription?.tariff?.key ?? 'trial',
    billing_cycle_months: String(scheduledChange?.billing_cycle_months ?? subscription?.billing_cycle_months ?? 1),
    price_override_amount: scheduledChange?.price_override?.amount != null ? String(scheduledChange.price_override.amount) : '',
    currency_override: scheduledChange?.price_override?.currency ?? '',
    discount_percent: scheduledChange?.discount_config?.percent != null ? String(scheduledChange.discount_config.percent) : String(subscription?.discount_config?.percent ?? ''),
    discount_amount: scheduledChange?.discount_config?.amount != null ? String(scheduledChange.discount_config.amount) : String(subscription?.discount_config?.amount ?? ''),
    discount_reason: scheduledChange?.discount_config?.reason ?? subscription?.discount_config?.reason ?? '',
    employee_limit_override: scheduledChange?.employee_limit_override != null ? String(scheduledChange.employee_limit_override) : String(subscription?.employee_limit_override ?? ''),
    client_limit_override: scheduledChange?.client_limit_override != null ? String(scheduledChange.client_limit_override) : String(subscription?.client_limit_override ?? ''),
    product_limit_override: scheduledChange?.product_limit_override != null ? String(scheduledChange.product_limit_override) : String(subscription?.product_limit_override ?? ''),
    monthly_message_limit_override: scheduledChange?.monthly_message_limit_override != null ? String(scheduledChange.monthly_message_limit_override) : String(subscription?.monthly_message_limit_override ?? ''),
    storage_limit_mb_override: scheduledChange?.storage_limit_mb_override != null ? String(scheduledChange.storage_limit_mb_override) : String(subscription?.storage_limit_mb_override ?? ''),
    ad_slot_limit_override: scheduledChange?.ad_slot_limit_override != null ? String(scheduledChange.ad_slot_limit_override) : String(subscription?.ad_slot_limit_override ?? ''),
    feature_flags_input: Object.keys(featureFlags).join(', '),
    notes: scheduledChange?.notes ?? subscription?.notes ?? '',
    effective_at: toDateTimeLocal(scheduledChange?.effective_at),
  };
};

const buildPaymentEditor = (company: any): PaymentEditor => {
  const subscription = company?.subscription ?? {};
  const snapshot = subscription?.current_snapshot ?? {};
  return {
    amount: snapshot?.price != null ? String(snapshot.price) : '',
    base_amount: snapshot?.base_price != null ? String(snapshot.base_price) : '',
    currency: snapshot?.currency ?? company?.currency ?? 'USD',
    period_months: String(subscription?.billing_cycle_months ?? 1),
    invoice_number: '',
    notes: '',
    paid_at: '',
    due_at: '',
  };
};

export default function PlatformAdmin() {
  const { t } = useTranslation(['common', 'layouts/mainlayout']);
  const [overview, setOverview] = useState<Overview>(emptyOverview);
  const [companies, setCompanies] = useState<any[]>([]);
  const [tariffs, setTariffs] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [ads, setAds] = useState<any[]>([]);
  const [broadcasts, setBroadcasts] = useState<any[]>([]);
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookRow[]>([]);
  const [chatEntries, setChatEntries] = useState<PlatformChatEntry[]>([]);
  const [callEntries, setCallEntries] = useState<PlatformCallEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [companyForm, setCompanyForm] = useState(emptyCompanyForm);
  const [tariffForm, setTariffForm] = useState(emptyTariffForm);
  const [broadcastForm, setBroadcastForm] = useState(emptyBroadcastForm);
  const [adForm, setAdForm] = useState(emptyAdForm);
  const [editingTariffId, setEditingTariffId] = useState<number | null>(null);
  const [editingAdId, setEditingAdId] = useState<number | null>(null);
  const [companyEditors, setCompanyEditors] = useState<Record<number, CompanyEditor>>({});
  const [paymentEditors, setPaymentEditors] = useState<Record<number, PaymentEditor>>({});
  const [companySearch, setCompanySearch] = useState('');
  const [companyStatusFilter, setCompanyStatusFilter] = useState('');
  const [includeDeletedCompanies, setIncludeDeletedCompanies] = useState(false);
  const [paymentCompanyFilter, setPaymentCompanyFilter] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('');
  const [paymentSearch, setPaymentSearch] = useState('');
  const [paymentOnlyOverdue, setPaymentOnlyOverdue] = useState(false);
  const [adCompanyFilter, setAdCompanyFilter] = useState('');
  const [adStatusFilter, setAdStatusFilter] = useState('');
  const [adPlacementFilter, setAdPlacementFilter] = useState('');
  const [auditCompanyFilter, setAuditCompanyFilter] = useState('');
  const [auditActionFilter, setAuditActionFilter] = useState('');
  const [auditEntityFilter, setAuditEntityFilter] = useState('');
  const [auditSearch, setAuditSearch] = useState('');
  const [webhookCompanyFilter, setWebhookCompanyFilter] = useState('');
  const [webhookSearch, setWebhookSearch] = useState('');
  const [webhookActiveOnly, setWebhookActiveOnly] = useState(false);
  const [chatCompanyFilter, setChatCompanyFilter] = useState('');
  const [chatSenderFilter, setChatSenderFilter] = useState('');
  const [chatSearch, setChatSearch] = useState('');
  const [callCompanyFilter, setCallCompanyFilter] = useState('');
  const [callStatusFilter, setCallStatusFilter] = useState('');
  const [callDirectionFilter, setCallDirectionFilter] = useState('');
  const [callSearch, setCallSearch] = useState('');

  const featureSuggestions = [
    { key: 'advanced_analytics', title: t('platform_feature_advanced_analytics', { defaultValue: 'Advanced analytics' }), description: t('platform_feature_advanced_analytics_desc', { defaultValue: 'Сводные показатели, cohort-аналитика и прогнозы нагрузки.' }) },
    { key: 'audit_log', title: t('platform_feature_audit_log', { defaultValue: 'Audit log' }), description: t('platform_feature_audit_log_desc', { defaultValue: 'История действий сотрудников и платформенных изменений.' }) },
    { key: 'api_access', title: t('platform_feature_api_access', { defaultValue: 'API access' }), description: t('platform_feature_api_access_desc', { defaultValue: 'Интеграции с внешними системами и мобильными приложениями.' }) },
    { key: 'webhooks', title: t('platform_feature_webhooks', { defaultValue: 'Webhooks' }), description: t('platform_feature_webhooks_desc', { defaultValue: 'Событийная интеграция без ручного экспорта.' }) },
    { key: 'automation_rules', title: t('platform_feature_automation_rules', { defaultValue: 'Automation rules' }), description: t('platform_feature_automation_rules_desc', { defaultValue: 'Автоматические сценарии, напоминания и реакции на события.' }) },
    { key: 'custom_branding', title: t('platform_feature_custom_branding', { defaultValue: 'Custom branding' }), description: t('platform_feature_custom_branding_desc', { defaultValue: 'Свое имя компании, домен, логотип и фирменные письма.' }) },
    { key: 'multi_branch', title: t('platform_feature_multi_branch', { defaultValue: 'Multi-branch' }), description: t('platform_feature_multi_branch_desc', { defaultValue: 'Несколько филиалов и отдельные команды внутри одной компании.' }) },
    { key: 'sso', title: t('platform_feature_sso', { defaultValue: 'Single sign-on' }), description: t('platform_feature_sso_desc', { defaultValue: 'Централизованный вход для крупных клиентов.' }) },
    { key: 'priority_support', title: t('platform_feature_priority_support', { defaultValue: 'Priority support' }), description: t('platform_feature_priority_support_desc', { defaultValue: 'Повышенный SLA и выделенный канал поддержки.' }) },
    { key: 'ads_manager', title: t('platform_feature_ads_manager', { defaultValue: 'Ads manager' }), description: t('platform_feature_ads_manager_desc', { defaultValue: 'Управление рекламными слотами и сроками размещения.' }) },
  ];

  const formatMoney = (amount: number, currency: string): string => {
    const numericAmount = Number.isFinite(amount) ? amount : 0;
    const safeCurrency = currency.trim().length > 0 ? currency : 'USD';
    return `${numericAmount.toFixed(2)} ${safeCurrency}`;
  };

  const formatLimit = (value: number | null | undefined): string => {
    if (value == null) {
      return t('platform_limit_empty', { defaultValue: 'Не задано' });
    }
    if (value <= 0) {
      return t('platform_limit_unlimited', { defaultValue: 'Без лимита' });
    }
    return String(value);
  };

  const formatDuration = (seconds: number | null | undefined): string => {
    const totalSeconds = Number.isFinite(seconds) ? Number(seconds) : 0;
    const minutes = Math.floor(totalSeconds / 60);
    const remainder = totalSeconds % 60;
    if (minutes <= 0) {
      return `${remainder}${t('platform_seconds_short', { defaultValue: 'с' })}`;
    }
    return `${minutes}${t('platform_minutes_short', { defaultValue: 'м' })} ${String(remainder).padStart(2, '0')}${t('platform_seconds_short', { defaultValue: 'с' })}`;
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [
        overviewResponse,
        companiesResponse,
        tariffsResponse,
        paymentsResponse,
        adsResponse,
        broadcastsResponse,
        auditResponse,
        webhooksResponse,
        chatsResponse,
        callsResponse,
      ] = await Promise.all([
        api.getPlatformOverview(),
        api.getPlatformCompanies(
          companySearch.trim().length > 0 ? companySearch.trim() : undefined,
          companyStatusFilter.trim().length > 0 ? companyStatusFilter.trim() : undefined,
          includeDeletedCompanies,
        ),
        api.getPlatformTariffs(),
        api.getPlatformPayments(
          toNumberOrUndefined(paymentCompanyFilter),
          paymentStatusFilter.trim().length > 0 ? paymentStatusFilter.trim() : undefined,
          100,
          paymentSearch.trim().length > 0 ? paymentSearch.trim() : undefined,
          paymentOnlyOverdue,
        ),
        api.getPlatformAds(
          toNumberOrUndefined(adCompanyFilter),
          adStatusFilter.trim().length > 0 ? adStatusFilter.trim() : undefined,
          adPlacementFilter.trim().length > 0 ? adPlacementFilter.trim() : undefined,
        ),
        api.getPlatformBroadcasts(),
        api.getPlatformAuditLog(
          toNumberOrUndefined(auditCompanyFilter),
          auditActionFilter.trim().length > 0 ? auditActionFilter.trim() : undefined,
          auditEntityFilter.trim().length > 0 ? auditEntityFilter.trim() : undefined,
          auditSearch.trim().length > 0 ? auditSearch.trim() : undefined,
          50,
        ),
        api.getPlatformWebhooks(
          toNumberOrUndefined(webhookCompanyFilter),
          webhookActiveOnly ? true : undefined,
          webhookSearch.trim().length > 0 ? webhookSearch.trim() : undefined,
          50,
        ),
        api.getPlatformChatHistory(
          toNumberOrUndefined(chatCompanyFilter),
          chatSenderFilter.trim().length > 0 ? chatSenderFilter.trim() : undefined,
          chatSearch.trim().length > 0 ? chatSearch.trim() : undefined,
          50,
        ),
        api.getPlatformCallLogs(
          toNumberOrUndefined(callCompanyFilter),
          callStatusFilter.trim().length > 0 ? callStatusFilter.trim() : undefined,
          callDirectionFilter.trim().length > 0 ? callDirectionFilter.trim() : undefined,
          callSearch.trim().length > 0 ? callSearch.trim() : undefined,
          50,
        ),
      ]);

      const nextCompanies = companiesResponse?.companies ?? [];
      setOverview(overviewResponse ?? emptyOverview);
      setCompanies(nextCompanies);
      setTariffs(tariffsResponse?.tariffs ?? []);
      setPayments(paymentsResponse?.payments ?? []);
      setAds(adsResponse?.ads ?? []);
      setBroadcasts(broadcastsResponse?.broadcasts ?? []);
      setAuditEntries(auditResponse?.entries ?? []);
      setWebhooks(webhooksResponse?.webhooks ?? []);
      setChatEntries(chatsResponse?.entries ?? []);
      setCallEntries(callsResponse?.calls ?? []);

      setCompanyEditors((prev) => {
        const nextState = { ...prev };
        nextCompanies.forEach((company: any) => {
          if (nextState[company.id] == null) {
            nextState[company.id] = buildCompanyEditor(company);
          }
        });
        return nextState;
      });

      setPaymentEditors((prev) => {
        const nextState = { ...prev };
        nextCompanies.forEach((company: any) => {
          if (nextState[company.id] == null) {
            nextState[company.id] = buildPaymentEditor(company);
          }
        });
        return nextState;
      });
    } catch (error) {
      console.error('Failed to load platform admin data:', error);
      toast.error(t('platform_admin_load_error', { defaultValue: 'Не удалось загрузить данные платформы' }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [
    companySearch,
    companyStatusFilter,
    includeDeletedCompanies,
    paymentCompanyFilter,
    paymentStatusFilter,
    paymentSearch,
    paymentOnlyOverdue,
    adCompanyFilter,
    adStatusFilter,
    adPlacementFilter,
    auditCompanyFilter,
    auditActionFilter,
    auditEntityFilter,
    auditSearch,
    webhookCompanyFilter,
    webhookSearch,
    webhookActiveOnly,
    chatCompanyFilter,
    chatSenderFilter,
    chatSearch,
    callCompanyFilter,
    callStatusFilter,
    callDirectionFilter,
    callSearch,
  ]);

  const setCompanyEditorField = (companyId: number, field: keyof CompanyEditor, value: string) => {
    setCompanyEditors((prev) => ({
      ...prev,
      [companyId]: {
        ...(prev[companyId] ?? buildCompanyEditor(companies.find((company) => company.id === companyId))),
        [field]: value,
      },
    }));
  };

  const setPaymentEditorField = (companyId: number, field: keyof PaymentEditor, value: string) => {
    setPaymentEditors((prev) => ({
      ...prev,
      [companyId]: {
        ...(prev[companyId] ?? buildPaymentEditor(companies.find((company) => company.id === companyId))),
        [field]: value,
      },
    }));
  };

  const handleCreateCompany = async () => {
    if (companyForm.name.trim().length < 2) {
      toast.error(t('platform_company_name_required', { defaultValue: 'Укажите название компании' }));
      return;
    }

    try {
      await api.createPlatformCompany({
        name: companyForm.name,
        email: companyForm.email,
        phone: companyForm.phone,
        business_type: companyForm.business_type,
        employee_limit: toNumberOrUndefined(companyForm.employee_limit),
        tariff_key: companyForm.tariff_key,
      });
      toast.success(t('platform_company_created', { defaultValue: 'Компания создана' }));
      setCompanyForm(emptyCompanyForm);
      await loadData();
    } catch (error) {
      console.error('Failed to create company:', error);
      toast.error(t('platform_company_create_error', { defaultValue: 'Не удалось создать компанию' }));
    }
  };

  const handleEditTariff = (tariff: any) => {
    setEditingTariffId(tariff.id);
    setTariffForm({
      key: tariff.key ?? '',
      name: tariff.name ?? '',
      description: tariff.description ?? '',
      employee_limit: String(tariff.employee_limit ?? 0),
      client_limit: String(tariff.client_limit ?? 0),
      product_limit: String(tariff.product_limit ?? 0),
      monthly_message_limit: String(tariff.monthly_message_limit ?? 0),
      storage_limit_mb: String(tariff.storage_limit_mb ?? 0),
      ad_slot_limit: String(tariff.ad_slot_limit ?? 0),
      monthly_price: String(tariff.monthly_price ?? 0),
      yearly_price: String(tariff.yearly_price ?? 0),
      currency: tariff.currency ?? 'USD',
      trial_days: String(tariff.trial_days ?? 14),
      feature_flags_input: Object.keys(tariff.feature_flags ?? {}).join(', '),
    });
  };

  const resetTariffForm = () => {
    setEditingTariffId(null);
    setTariffForm(emptyTariffForm);
  };

  const handleSaveTariff = async () => {
    if (tariffForm.key.trim().length < 2 || tariffForm.name.trim().length < 2) {
      toast.error(t('platform_tariff_required', { defaultValue: 'Укажите ключ и название тарифа' }));
      return;
    }

    const payload = {
      key: tariffForm.key.trim(),
      name: tariffForm.name.trim(),
      description: tariffForm.description.trim(),
      employee_limit: Number(tariffForm.employee_limit.trim() || '0'),
      client_limit: Number(tariffForm.client_limit.trim() || '0'),
      product_limit: Number(tariffForm.product_limit.trim() || '0'),
      monthly_message_limit: Number(tariffForm.monthly_message_limit.trim() || '0'),
      storage_limit_mb: Number(tariffForm.storage_limit_mb.trim() || '0'),
      ad_slot_limit: Number(tariffForm.ad_slot_limit.trim() || '0'),
      monthly_price: Number(tariffForm.monthly_price.trim() || '0'),
      yearly_price: Number(tariffForm.yearly_price.trim() || '0'),
      currency: tariffForm.currency.trim(),
      trial_days: Number(tariffForm.trial_days.trim() || '0'),
      feature_flags: parseFeatureFlagsInput(tariffForm.feature_flags_input),
    };

    try {
      if (editingTariffId != null) {
        await api.updatePlatformTariff(editingTariffId, payload);
        toast.success(t('platform_tariff_updated', { defaultValue: 'Тариф обновлён' }));
      } else {
        await api.createPlatformTariff(payload);
        toast.success(t('platform_tariff_created', { defaultValue: 'Тариф создан' }));
      }
      resetTariffForm();
      await loadData();
    } catch (error) {
      console.error('Failed to save tariff:', error);
      toast.error(t('platform_tariff_create_error', { defaultValue: 'Не удалось сохранить тариф' }));
    }
  };

  const handleCloneTariff = async (tariffId: number) => {
    try {
      await api.clonePlatformTariff(tariffId);
      toast.success(t('platform_tariff_cloned', { defaultValue: 'Тариф клонирован' }));
      await loadData();
    } catch (error) {
      console.error('Failed to clone tariff:', error);
      toast.error(t('platform_tariff_clone_error', { defaultValue: 'Не удалось клонировать тариф' }));
    }
  };

  const handleDeactivateTariff = async (tariffId: number) => {
    try {
      await api.deletePlatformTariff(tariffId);
      toast.success(t('platform_tariff_deactivated', { defaultValue: 'Тариф деактивирован' }));
      await loadData();
    } catch (error) {
      console.error('Failed to deactivate tariff:', error);
      toast.error(t('platform_tariff_deactivate_error', { defaultValue: 'Не удалось деактивировать тариф' }));
    }
  };

  const handleSaveCompanyPlan = async (companyId: number, applyMode: 'immediate' | 'next_cycle') => {
    const editor = companyEditors[companyId];
    if (editor == null || editor.tariff_key.trim().length === 0) {
      toast.error(t('platform_tariff_required', { defaultValue: 'Укажите ключ и название тарифа' }));
      return;
    }

    try {
      await api.assignPlatformSubscription(companyId, {
        tariff_key: editor.tariff_key.trim(),
        billing_cycle_months: Number(editor.billing_cycle_months.trim() || '1'),
        price_override_amount: toNumberOrUndefined(editor.price_override_amount),
        currency_override: editor.currency_override.trim().length > 0 ? editor.currency_override.trim() : undefined,
        discount_percent: toNumberOrUndefined(editor.discount_percent),
        discount_amount: toNumberOrUndefined(editor.discount_amount),
        discount_reason: editor.discount_reason.trim(),
        employee_limit_override: toNumberOrUndefined(editor.employee_limit_override),
        client_limit_override: toNumberOrUndefined(editor.client_limit_override),
        product_limit_override: toNumberOrUndefined(editor.product_limit_override),
        monthly_message_limit_override: toNumberOrUndefined(editor.monthly_message_limit_override),
        storage_limit_mb_override: toNumberOrUndefined(editor.storage_limit_mb_override),
        ad_slot_limit_override: toNumberOrUndefined(editor.ad_slot_limit_override),
        feature_flags_override: parseFeatureFlagsInput(editor.feature_flags_input),
        notes: editor.notes.trim(),
        apply_mode: applyMode,
        effective_at: applyMode === 'next_cycle' && editor.effective_at.trim().length > 0 ? editor.effective_at : undefined,
      });
      toast.success(
        applyMode === 'next_cycle'
          ? t('platform_subscription_scheduled', { defaultValue: 'Изменение тарифа запланировано на следующий цикл' })
          : t('platform_subscription_updated', { defaultValue: 'Подписка обновлена' }),
      );
      await loadData();
    } catch (error) {
      console.error('Failed to update company subscription:', error);
      toast.error(t('platform_subscription_update_error', { defaultValue: 'Не удалось обновить подписку' }));
    }
  };

  const handleRecordPayment = async (companyId: number) => {
    const editor = paymentEditors[companyId];
    if (editor == null) {
      return;
    }

    try {
      await api.createPlatformPayment(companyId, {
        amount: toNumberOrUndefined(editor.amount),
        base_amount: toNumberOrUndefined(editor.base_amount),
        currency: editor.currency.trim().length > 0 ? editor.currency.trim() : undefined,
        period_months: Number(editor.period_months.trim() || '1'),
        invoice_number: editor.invoice_number.trim(),
        notes: editor.notes.trim(),
        paid_at: editor.paid_at.trim().length > 0 ? editor.paid_at : undefined,
        due_at: editor.due_at.trim().length > 0 ? editor.due_at : undefined,
      });
      toast.success(t('platform_payment_saved', { defaultValue: 'Платёж сохранён' }));
      await loadData();
    } catch (error) {
      console.error('Failed to create payment:', error);
      toast.error(t('platform_payment_save_error', { defaultValue: 'Не удалось сохранить платёж' }));
    }
  };

  const handleCompanyAction = async (companyId: number, action: 'suspend' | 'archive' | 'delete' | 'restore') => {
    try {
      if (action === 'suspend') {
        await api.suspendPlatformCompany(companyId);
      } else if (action === 'archive') {
        await api.archivePlatformCompany(companyId);
      } else if (action === 'restore') {
        await api.restorePlatformCompany(companyId);
      } else {
        await api.deletePlatformCompany(companyId);
      }
      toast.success(t(`platform_company_${action}_success`, { defaultValue: 'Действие выполнено' }));
      await loadData();
    } catch (error) {
      console.error(`Failed to ${action} company:`, error);
      toast.error(t('platform_company_action_error', { defaultValue: 'Не удалось выполнить действие над компанией' }));
    }
  };

  const handleCancelScheduledChange = async (companyId: number) => {
    try {
      await api.cancelPlatformScheduledChange(companyId);
      toast.success(t('platform_schedule_cancelled', { defaultValue: 'Запланированное изменение отменено' }));
      await loadData();
    } catch (error) {
      console.error('Failed to cancel scheduled change:', error);
      toast.error(t('platform_schedule_cancel_error', { defaultValue: 'Не удалось отменить плановое изменение' }));
    }
  };

  const handleEditAd = (ad: any) => {
    setEditingAdId(ad.id);
    setAdForm({
      company_id: ad.company_id != null ? String(ad.company_id) : '',
      title: ad.title ?? '',
      description: ad.description ?? '',
      image_url: ad.image_url ?? '',
      link_url: ad.link_url ?? '',
      placement: ad.placement ?? 'dashboard_top',
      size_label: ad.size_label ?? '',
      width_px: ad.width_px != null ? String(ad.width_px) : '',
      height_px: ad.height_px != null ? String(ad.height_px) : '',
      status: ad.status ?? 'draft',
      starts_at: toDateTimeLocal(ad.starts_at),
      ends_at: toDateTimeLocal(ad.ends_at),
      notes: ad.notes ?? '',
    });
  };

  const resetAdForm = () => {
    setEditingAdId(null);
    setAdForm(emptyAdForm);
  };

  const handleSaveAd = async () => {
    if (adForm.title.trim().length < 2 || adForm.placement.trim().length < 2) {
      toast.error(t('platform_ad_required', { defaultValue: 'Укажите название и место размещения' }));
      return;
    }

    const payload = {
      company_id: toNumberOrUndefined(adForm.company_id),
      title: adForm.title.trim(),
      description: adForm.description.trim(),
      image_url: adForm.image_url.trim(),
      link_url: adForm.link_url.trim(),
      placement: adForm.placement.trim(),
      size_label: adForm.size_label.trim(),
      width_px: toNumberOrUndefined(adForm.width_px),
      height_px: toNumberOrUndefined(adForm.height_px),
      status: adForm.status.trim(),
      starts_at: adForm.starts_at.trim().length > 0 ? adForm.starts_at : undefined,
      ends_at: adForm.ends_at.trim().length > 0 ? adForm.ends_at : undefined,
      notes: adForm.notes.trim(),
    };

    try {
      if (editingAdId != null) {
        await api.updatePlatformAd(editingAdId, payload);
        toast.success(t('platform_ad_updated', { defaultValue: 'Рекламное размещение обновлено' }));
      } else {
        await api.createPlatformAd(payload);
        toast.success(t('platform_ad_created', { defaultValue: 'Рекламное размещение создано' }));
      }
      resetAdForm();
      await loadData();
    } catch (error) {
      console.error('Failed to save platform ad:', error);
      toast.error(t('platform_ad_create_error', { defaultValue: 'Не удалось сохранить рекламу' }));
    }
  };

  const handleDeleteAd = async (adId: number) => {
    try {
      await api.deletePlatformAd(adId);
      toast.success(t('platform_ad_deleted', { defaultValue: 'Рекламное размещение удалено' }));
      await loadData();
    } catch (error) {
      console.error('Failed to delete ad:', error);
      toast.error(t('platform_ad_delete_error', { defaultValue: 'Не удалось удалить рекламу' }));
    }
  };

  const handleBroadcast = async () => {
    if (broadcastForm.title.trim().length < 2 || broadcastForm.message.trim().length < 2) {
      toast.error(t('platform_broadcast_required', { defaultValue: 'Укажите тему и текст рассылки' }));
      return;
    }

    try {
      const companyStatuses = broadcastForm.company_statuses
        .split(',')
        .map((value) => value.trim())
        .filter((value) => value.length > 0);
      const companyIds = broadcastForm.company_ids
        .split(',')
        .map((value) => Number(value.trim()))
        .filter((value) => Number.isFinite(value) && value > 0);
      const tariffKeys = broadcastForm.tariff_keys
        .split(',')
        .map((value) => value.trim())
        .filter((value) => value.length > 0);

      await api.createPlatformBroadcast({
        title: broadcastForm.title,
        message: broadcastForm.message,
        company_statuses: companyStatuses,
        company_ids: companyIds,
        tariff_keys: tariffKeys,
        send_now: true,
      });
      toast.success(t('platform_broadcast_sent', { defaultValue: 'Рассылка отправлена' }));
      setBroadcastForm(emptyBroadcastForm);
      await loadData();
    } catch (error) {
      console.error('Failed to send platform broadcast:', error);
      toast.error(t('platform_broadcast_error', { defaultValue: 'Не удалось отправить рассылку' }));
    }
  };

  const handleProcessScheduledChanges = async () => {
    const shouldProcessChanges = window.confirm(
      t('platform_process_scheduled_confirm', {
        defaultValue: 'Применить все просроченные запланированные изменения тарифов? Это действие необратимо.',
      }),
    );
    if (!shouldProcessChanges) {
      return;
    }
    try {
      const { buildApiUrl } = await import('@crm/api/client');
      const res = await fetch(buildApiUrl('/api/platform-admin/process-scheduled-changes'), {
        method: 'POST', credentials: 'include',
      });
      const d = await res.json();
      if (d.success) {
        toast.success(
          t('platform_process_scheduled_success', {
            defaultValue: 'Обработано: {{processed}}, ошибок: {{errors}}',
            processed: d.processed_count,
            errors: d.error_count,
          }),
        );
        await loadData();
      } else {
        toast.error(t('platform_process_scheduled_error', { defaultValue: 'Ошибка обработки' }));
      }
    } catch (e) {
      toast.error(t('network_error', { defaultValue: 'Ошибка сети' }));
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-500">
          {t('platform_admin_badge', { defaultValue: 'Platform Control' })}
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">
          {t('platform_admin_title', { defaultValue: 'Управление SaaS CRM' })}
        </h1>
        <p className="mt-2 max-w-4xl text-sm text-slate-600">
          {t('platform_admin_subtitle', { defaultValue: 'Компании, тарифы, квоты, история оплат, плановые изменения цен и рекламные размещения в одном контуре.' })}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4 xl:grid-cols-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">{t('platform_metric_companies', { defaultValue: 'Компании' })}</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{overview.companies_total}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">{t('platform_metric_mrr', { defaultValue: 'MRR' })}</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{overview.expected_mrr.toFixed(2)}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">{t('platform_metric_revenue', { defaultValue: 'Оплачено' })}</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{overview.payments_total_amount.toFixed(2)}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">{t('platform_metric_clients', { defaultValue: 'Клиенты' })}</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{overview.clients_total}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">{t('platform_metric_messages', { defaultValue: 'Сообщения за месяц' })}</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{overview.messages_this_month}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">{t('platform_metric_ads', { defaultValue: 'Активная реклама' })}</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{overview.ads_active}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">{t('platform_metric_due_soon', { defaultValue: 'Оплаты до 7 дней' })}</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{overview.payments_due_7_days}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">{t('platform_metric_overdue', { defaultValue: 'Просроченные оплаты' })}</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{overview.payments_overdue}</p>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">{t('platform_capabilities_title', { defaultValue: '10 ключевых enterprise-возможностей' })}</h2>
            <p className="text-sm text-slate-500">{t('platform_capabilities_hint', { defaultValue: 'Эти возможности добавлены как feature flags тарифа и company-level entitlement model.' })}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleProcessScheduledChanges} disabled={loading} className="border-amber-300 text-amber-700 hover:bg-amber-50">
              {t('platform_process_scheduled_button', { defaultValue: 'Применить плановые изменения' })}
            </Button>
            <Button variant="outline" onClick={loadData} disabled={loading}>
              {t('platform_refresh', { defaultValue: 'Обновить' })}
            </Button>
          </div>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {featureSuggestions.map((feature) => (
            <div key={feature.key} className="rounded-2xl border border-slate-200 p-4">
              <p className="text-sm font-semibold text-slate-900">{feature.title}</p>
              <p className="mt-2 text-sm text-slate-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">{t('platform_company_create_title', { defaultValue: 'Создать компанию' })}</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label>{t('platform_company_name_label', { defaultValue: 'Название компании' })}</Label>
                <Input value={companyForm.name} onChange={(event) => setCompanyForm((prev) => ({ ...prev, name: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>{t('platform_company_email_label', { defaultValue: 'Email компании' })}</Label>
                <Input value={companyForm.email} onChange={(event) => setCompanyForm((prev) => ({ ...prev, email: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>{t('platform_company_phone_label', { defaultValue: 'Телефон компании' })}</Label>
                <Input value={companyForm.phone} onChange={(event) => setCompanyForm((prev) => ({ ...prev, phone: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>{t('platform_company_business_label', { defaultValue: 'Тип бизнеса' })}</Label>
                <Input value={companyForm.business_type} onChange={(event) => setCompanyForm((prev) => ({ ...prev, business_type: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>{t('platform_company_limit_label', { defaultValue: 'Лимит сотрудников' })}</Label>
                <Input value={companyForm.employee_limit} onChange={(event) => setCompanyForm((prev) => ({ ...prev, employee_limit: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>{t('platform_company_tariff_label', { defaultValue: 'Стартовый тариф' })}</Label>
                <Input value={companyForm.tariff_key} onChange={(event) => setCompanyForm((prev) => ({ ...prev, tariff_key: event.target.value }))} />
              </div>
            </div>
            <div className="mt-4">
              <Button onClick={handleCreateCompany}>{t('platform_company_create_button', { defaultValue: 'Создать компанию' })}</Button>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">{t('platform_companies_title', { defaultValue: 'Компании' })}</h2>
                <p className="text-sm text-slate-500">{t('platform_companies_hint', { defaultValue: 'Изоляция tenant-данных, квоты, цены, скидки и плановые изменения на уровне компании.' })}</p>
              </div>
              <div className="text-sm text-slate-500">
                {loading ? t('platform_loading', { defaultValue: 'Загрузка...' }) : t('platform_count_label', { defaultValue: '{{count}} записей', count: companies.length })}
              </div>
            </div>

            <div className="mt-6 space-y-5">
              <div className="grid gap-3 rounded-2xl border border-slate-200 p-4 md:grid-cols-4">
                <div className="space-y-2">
                  <Label>{t('platform_filter_search_label', { defaultValue: 'Поиск компаний' })}</Label>
                  <Input value={companySearch} onChange={(event) => setCompanySearch(event.target.value)} placeholder={t('search', { defaultValue: 'Поиск...' })} />
                </div>
                <div className="space-y-2">
                  <Label>{t('platform_filter_status_label', { defaultValue: 'Статус' })}</Label>
                  <Input value={companyStatusFilter} onChange={(event) => setCompanyStatusFilter(event.target.value)} placeholder={t('status', { defaultValue: 'Статус' })} />
                </div>
                <div className="space-y-2">
                  <Label>{t('platform_include_deleted_label', { defaultValue: 'Показывать удалённые' })}</Label>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => setIncludeDeletedCompanies((prev) => !prev)}
                  >
                    {includeDeletedCompanies
                      ? t('platform_include_deleted_on', { defaultValue: 'Да' })
                      : t('platform_include_deleted_off', { defaultValue: 'Нет' })}
                  </Button>
                </div>
                <div className="space-y-2">
                  <Label>{t('platform_filters_reset_label', { defaultValue: 'Сброс фильтров' })}</Label>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => {
                      setCompanySearch('');
                      setCompanyStatusFilter('');
                      setIncludeDeletedCompanies(false);
                    }}
                  >
                    {t('platform_filters_reset', { defaultValue: 'Сбросить фильтры' })}
                  </Button>
                </div>
              </div>

              {companies.map((company) => {
                const editor = companyEditors[company.id] ?? buildCompanyEditor(company);
                const paymentEditor = paymentEditors[company.id] ?? buildPaymentEditor(company);
                const usage = company.usage ?? {};
                const subscription = company.subscription ?? {};
                const snapshot = subscription.current_snapshot ?? {};
                const scheduledChange = subscription.scheduled_change ?? {};
                const hasScheduledChange = Object.keys(scheduledChange).length > 0;
                const currentCurrency = snapshot.currency ?? company.currency ?? 'USD';
                return (
                  <div key={company.id} className="rounded-3xl border border-slate-200 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="space-y-1">
                        <p className="text-lg font-semibold text-slate-900">{company.name}</p>
                        <p className="text-sm text-slate-500">
                          {t('platform_company_code', { defaultValue: 'Код компании' })}: <span className="font-medium text-slate-700">{company.access_code}</span>
                        </p>
                        <p className="text-sm text-slate-500">
                          {t('platform_company_tariff', { defaultValue: 'Тариф' })}: {subscription?.tariff?.name ?? t('platform_no_tariff', { defaultValue: 'Не назначен' })}
                        </p>
                        <p className="text-sm text-slate-500">
                          {t('platform_company_price', { defaultValue: 'Текущая цена цикла' })}: {formatMoney(Number(subscription?.current_price ?? 0), currentCurrency)}
                        </p>
                        <p className="text-sm text-slate-500">
                          {t('platform_company_next_due', { defaultValue: 'Следующая оплата' })}: {subscription?.next_payment_due_at != null ? new Date(subscription.next_payment_due_at).toLocaleString() : t('platform_not_scheduled', { defaultValue: 'Не запланирована' })}
                        </p>
                        {hasScheduledChange ? (
                          <p className="text-sm text-amber-700">
                            {t('platform_scheduled_change_summary', { defaultValue: 'Есть запланированное изменение тарифа' })}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" onClick={() => handleCompanyAction(company.id, 'suspend')}>
                          {t('platform_suspend', { defaultValue: 'Пауза' })}
                        </Button>
                        <Button variant="outline" onClick={() => handleCompanyAction(company.id, 'archive')}>
                          {t('platform_archive', { defaultValue: 'Архив' })}
                        </Button>
                        <Button variant="outline" onClick={() => handleCompanyAction(company.id, 'restore')}>
                          {t('platform_restore', { defaultValue: 'Восстановить' })}
                        </Button>
                        <Button variant="destructive" onClick={() => handleCompanyAction(company.id, 'delete')}>
                          {t('platform_delete', { defaultValue: 'Удалить' })}
                        </Button>
                        {hasScheduledChange ? (
                          <Button variant="outline" onClick={() => handleCancelScheduledChange(company.id)}>
                            {t('platform_schedule_cancel', { defaultValue: 'Отменить плановое изменение' })}
                          </Button>
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-5 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
                      <div className="rounded-2xl bg-slate-50 p-3">
                        <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{t('platform_usage_staff', { defaultValue: 'Сотрудники' })}</p>
                        <p className="mt-2 text-lg font-semibold text-slate-900">{usage.employees_used ?? 0} / {formatLimit(usage.employees_limit)}</p>
                      </div>
                      <div className="rounded-2xl bg-slate-50 p-3">
                        <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{t('platform_usage_clients', { defaultValue: 'Клиенты' })}</p>
                        <p className="mt-2 text-lg font-semibold text-slate-900">{usage.clients_used ?? 0} / {formatLimit(usage.clients_limit)}</p>
                      </div>
                      <div className="rounded-2xl bg-slate-50 p-3">
                        <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{t('platform_usage_products', { defaultValue: 'Товары' })}</p>
                        <p className="mt-2 text-lg font-semibold text-slate-900">{usage.products_used ?? 0} / {formatLimit(usage.products_limit)}</p>
                      </div>
                      <div className="rounded-2xl bg-slate-50 p-3">
                        <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{t('platform_usage_messages', { defaultValue: 'Сообщения' })}</p>
                        <p className="mt-2 text-lg font-semibold text-slate-900">{usage.messages_used ?? 0} / {formatLimit(usage.messages_limit)}</p>
                      </div>
                      <div className="rounded-2xl bg-slate-50 p-3">
                        <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{t('platform_usage_storage', { defaultValue: 'Хранилище' })}</p>
                        <p className="mt-2 text-lg font-semibold text-slate-900">{usage.storage_used_mb ?? 0} / {formatLimit(usage.storage_limit_mb)}</p>
                      </div>
                      <div className="rounded-2xl bg-slate-50 p-3">
                        <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{t('platform_usage_ads', { defaultValue: 'Реклама' })}</p>
                        <p className="mt-2 text-lg font-semibold text-slate-900">{usage.ads_used ?? 0} / {formatLimit(usage.ads_limit)}</p>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-4 xl:grid-cols-2">
                      <div className="rounded-2xl border border-slate-200 p-4">
                        <h3 className="text-base font-semibold text-slate-900">{t('platform_company_plan_editor', { defaultValue: 'Тариф и ограничения' })}</h3>
                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label>{t('platform_company_tariff_label', { defaultValue: 'Тариф' })}</Label>
                            <Input value={editor.tariff_key} onChange={(event) => setCompanyEditorField(company.id, 'tariff_key', event.target.value)} />
                          </div>
                          <div className="space-y-2">
                            <Label>{t('platform_billing_cycle_label', { defaultValue: 'Период оплаты, мес.' })}</Label>
                            <Input value={editor.billing_cycle_months} onChange={(event) => setCompanyEditorField(company.id, 'billing_cycle_months', event.target.value)} />
                          </div>
                          <div className="space-y-2">
                            <Label>{t('platform_price_override_label', { defaultValue: 'Цена для компании' })}</Label>
                            <Input value={editor.price_override_amount} onChange={(event) => setCompanyEditorField(company.id, 'price_override_amount', event.target.value)} />
                          </div>
                          <div className="space-y-2">
                            <Label>{t('platform_currency_override_label', { defaultValue: 'Валюта цены' })}</Label>
                            <Input value={editor.currency_override} onChange={(event) => setCompanyEditorField(company.id, 'currency_override', event.target.value)} />
                          </div>
                          <div className="space-y-2">
                            <Label>{t('platform_discount_percent_label', { defaultValue: 'Скидка, %' })}</Label>
                            <Input value={editor.discount_percent} onChange={(event) => setCompanyEditorField(company.id, 'discount_percent', event.target.value)} />
                          </div>
                          <div className="space-y-2">
                            <Label>{t('platform_discount_amount_label', { defaultValue: 'Скидка суммой' })}</Label>
                            <Input value={editor.discount_amount} onChange={(event) => setCompanyEditorField(company.id, 'discount_amount', event.target.value)} />
                          </div>
                          <div className="space-y-2 md:col-span-2">
                            <Label>{t('platform_discount_reason_label', { defaultValue: 'Причина скидки' })}</Label>
                            <Input value={editor.discount_reason} onChange={(event) => setCompanyEditorField(company.id, 'discount_reason', event.target.value)} />
                          </div>
                          <div className="space-y-2">
                            <Label>{t('platform_override_staff', { defaultValue: 'Сотрудники' })}</Label>
                            <Input value={editor.employee_limit_override} onChange={(event) => setCompanyEditorField(company.id, 'employee_limit_override', event.target.value)} />
                          </div>
                          <div className="space-y-2">
                            <Label>{t('platform_override_clients', { defaultValue: 'Клиенты' })}</Label>
                            <Input value={editor.client_limit_override} onChange={(event) => setCompanyEditorField(company.id, 'client_limit_override', event.target.value)} />
                          </div>
                          <div className="space-y-2">
                            <Label>{t('platform_override_products', { defaultValue: 'Товары' })}</Label>
                            <Input value={editor.product_limit_override} onChange={(event) => setCompanyEditorField(company.id, 'product_limit_override', event.target.value)} />
                          </div>
                          <div className="space-y-2">
                            <Label>{t('platform_override_messages', { defaultValue: 'Сообщения/месяц' })}</Label>
                            <Input value={editor.monthly_message_limit_override} onChange={(event) => setCompanyEditorField(company.id, 'monthly_message_limit_override', event.target.value)} />
                          </div>
                          <div className="space-y-2">
                            <Label>{t('platform_override_storage', { defaultValue: 'Хранилище, МБ' })}</Label>
                            <Input value={editor.storage_limit_mb_override} onChange={(event) => setCompanyEditorField(company.id, 'storage_limit_mb_override', event.target.value)} />
                          </div>
                          <div className="space-y-2">
                            <Label>{t('platform_override_ads', { defaultValue: 'Рекламные слоты' })}</Label>
                            <Input value={editor.ad_slot_limit_override} onChange={(event) => setCompanyEditorField(company.id, 'ad_slot_limit_override', event.target.value)} />
                          </div>
                          <div className="space-y-2 md:col-span-2">
                            <Label>{t('platform_feature_flags_label', { defaultValue: 'Доп. возможности через запятую' })}</Label>
                            <Input value={editor.feature_flags_input} onChange={(event) => setCompanyEditorField(company.id, 'feature_flags_input', event.target.value)} />
                          </div>
                          <div className="space-y-2 md:col-span-2">
                            <Label>{t('platform_plan_notes_label', { defaultValue: 'Заметка' })}</Label>
                            <Input value={editor.notes} onChange={(event) => setCompanyEditorField(company.id, 'notes', event.target.value)} />
                          </div>
                          <div className="space-y-2 md:col-span-2">
                            <Label>{t('platform_schedule_date_label', { defaultValue: 'Дата планового изменения' })}</Label>
                            <Input type="datetime-local" value={editor.effective_at} onChange={(event) => setCompanyEditorField(company.id, 'effective_at', event.target.value)} />
                          </div>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <Button onClick={() => handleSaveCompanyPlan(company.id, 'immediate')}>
                            {t('platform_apply_now', { defaultValue: 'Применить сейчас' })}
                          </Button>
                          <Button variant="outline" onClick={() => handleSaveCompanyPlan(company.id, 'next_cycle')}>
                            {t('platform_schedule_next_cycle', { defaultValue: 'На следующий цикл' })}
                          </Button>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-200 p-4">
                        <h3 className="text-base font-semibold text-slate-900">{t('platform_company_payment_editor', { defaultValue: 'Платёж и продление' })}</h3>
                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label>{t('platform_payment_amount_label', { defaultValue: 'Фактическая сумма' })}</Label>
                            <Input value={paymentEditor.amount} onChange={(event) => setPaymentEditorField(company.id, 'amount', event.target.value)} />
                          </div>
                          <div className="space-y-2">
                            <Label>{t('platform_payment_base_amount_label', { defaultValue: 'Базовая сумма' })}</Label>
                            <Input value={paymentEditor.base_amount} onChange={(event) => setPaymentEditorField(company.id, 'base_amount', event.target.value)} />
                          </div>
                          <div className="space-y-2">
                            <Label>{t('platform_payment_currency_label', { defaultValue: 'Валюта' })}</Label>
                            <Input value={paymentEditor.currency} onChange={(event) => setPaymentEditorField(company.id, 'currency', event.target.value)} />
                          </div>
                          <div className="space-y-2">
                            <Label>{t('platform_payment_period_label', { defaultValue: 'Период, мес.' })}</Label>
                            <Input value={paymentEditor.period_months} onChange={(event) => setPaymentEditorField(company.id, 'period_months', event.target.value)} />
                          </div>
                          <div className="space-y-2">
                            <Label>{t('platform_payment_invoice_label', { defaultValue: 'Номер счёта' })}</Label>
                            <Input value={paymentEditor.invoice_number} onChange={(event) => setPaymentEditorField(company.id, 'invoice_number', event.target.value)} />
                          </div>
                          <div className="space-y-2">
                            <Label>{t('platform_payment_paid_at_label', { defaultValue: 'Дата оплаты' })}</Label>
                            <Input type="datetime-local" value={paymentEditor.paid_at} onChange={(event) => setPaymentEditorField(company.id, 'paid_at', event.target.value)} />
                          </div>
                          <div className="space-y-2">
                            <Label>{t('platform_payment_due_at_label', { defaultValue: 'Срок оплаты' })}</Label>
                            <Input type="datetime-local" value={paymentEditor.due_at} onChange={(event) => setPaymentEditorField(company.id, 'due_at', event.target.value)} />
                          </div>
                          <div className="space-y-2 md:col-span-2">
                            <Label>{t('platform_payment_notes_label', { defaultValue: 'Комментарий' })}</Label>
                            <Input value={paymentEditor.notes} onChange={(event) => setPaymentEditorField(company.id, 'notes', event.target.value)} />
                          </div>
                        </div>
                        <div className="mt-4">
                          <Button onClick={() => handleRecordPayment(company.id)}>
                            {t('platform_save_payment_button', { defaultValue: 'Зафиксировать оплату' })}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {companies.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">
                  {t('platform_companies_empty', { defaultValue: 'Компании ещё не созданы.' })}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold text-slate-900">{t('platform_tariffs_title', { defaultValue: 'Тарифы' })}</h2>
              {editingTariffId != null ? (
                <Button variant="outline" onClick={resetTariffForm}>
                  {t('platform_tariff_reset', { defaultValue: 'Сбросить' })}
                </Button>
              ) : null}
            </div>
            <div className="mt-4 grid gap-3">
              <div className="space-y-2">
                <Label>{t('platform_tariff_key_label', { defaultValue: 'Ключ тарифа' })}</Label>
                <Input value={tariffForm.key} onChange={(event) => setTariffForm((prev) => ({ ...prev, key: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>{t('platform_tariff_name_label', { defaultValue: 'Название тарифа' })}</Label>
                <Input value={tariffForm.name} onChange={(event) => setTariffForm((prev) => ({ ...prev, name: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>{t('platform_tariff_description_label', { defaultValue: 'Описание' })}</Label>
                <Input value={tariffForm.description} onChange={(event) => setTariffForm((prev) => ({ ...prev, description: event.target.value }))} />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t('platform_tariff_limit_label', { defaultValue: 'Сотрудники' })}</Label>
                  <Input value={tariffForm.employee_limit} onChange={(event) => setTariffForm((prev) => ({ ...prev, employee_limit: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>{t('platform_tariff_clients_label', { defaultValue: 'Клиенты' })}</Label>
                  <Input value={tariffForm.client_limit} onChange={(event) => setTariffForm((prev) => ({ ...prev, client_limit: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>{t('platform_tariff_products_label', { defaultValue: 'Товары' })}</Label>
                  <Input value={tariffForm.product_limit} onChange={(event) => setTariffForm((prev) => ({ ...prev, product_limit: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>{t('platform_tariff_messages_label', { defaultValue: 'Сообщения/месяц' })}</Label>
                  <Input value={tariffForm.monthly_message_limit} onChange={(event) => setTariffForm((prev) => ({ ...prev, monthly_message_limit: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>{t('platform_tariff_storage_label', { defaultValue: 'Хранилище, МБ' })}</Label>
                  <Input value={tariffForm.storage_limit_mb} onChange={(event) => setTariffForm((prev) => ({ ...prev, storage_limit_mb: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>{t('platform_tariff_ads_label', { defaultValue: 'Рекламные слоты' })}</Label>
                  <Input value={tariffForm.ad_slot_limit} onChange={(event) => setTariffForm((prev) => ({ ...prev, ad_slot_limit: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>{t('platform_tariff_monthly_label', { defaultValue: 'Цена в месяц' })}</Label>
                  <Input value={tariffForm.monthly_price} onChange={(event) => setTariffForm((prev) => ({ ...prev, monthly_price: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>{t('platform_tariff_yearly_label', { defaultValue: 'Цена в год' })}</Label>
                  <Input value={tariffForm.yearly_price} onChange={(event) => setTariffForm((prev) => ({ ...prev, yearly_price: event.target.value }))} />
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t('platform_tariff_currency_label', { defaultValue: 'Валюта' })}</Label>
                  <Input value={tariffForm.currency} onChange={(event) => setTariffForm((prev) => ({ ...prev, currency: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>{t('platform_tariff_trial_label', { defaultValue: 'Дни trial' })}</Label>
                  <Input value={tariffForm.trial_days} onChange={(event) => setTariffForm((prev) => ({ ...prev, trial_days: event.target.value }))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t('platform_tariff_features_label', { defaultValue: 'Feature flags через запятую' })}</Label>
                <Input value={tariffForm.feature_flags_input} onChange={(event) => setTariffForm((prev) => ({ ...prev, feature_flags_input: event.target.value }))} />
              </div>
            </div>
            <div className="mt-4">
              <Button onClick={handleSaveTariff}>
                {editingTariffId != null ? t('platform_tariff_update_button', { defaultValue: 'Обновить тариф' }) : t('platform_tariff_create_button', { defaultValue: 'Создать тариф' })}
              </Button>
            </div>

            <div className="mt-6 space-y-3">
              {tariffs.map((tariff) => (
                <div key={tariff.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">{tariff.name}</p>
                      <p className="text-sm text-slate-500">{tariff.key}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" onClick={() => handleEditTariff(tariff)}>
                        {t('platform_edit', { defaultValue: 'Редактировать' })}
                      </Button>
                      <Button variant="outline" onClick={() => handleCloneTariff(tariff.id)}>
                        {t('platform_clone', { defaultValue: 'Клонировать' })}
                      </Button>
                      <Button variant="outline" onClick={() => handleDeactivateTariff(tariff.id)}>
                        {t('platform_deactivate', { defaultValue: 'Деактивировать' })}
                      </Button>
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">
                    {formatMoney(Number(tariff.monthly_price ?? 0), tariff.currency ?? 'USD')} / {t('platform_month', { defaultValue: 'месяц' })}
                  </p>
                  <p className="mt-2 text-sm text-slate-600">
                    {t('platform_tariff_quota_summary', {
                      defaultValue: 'Сотр.: {{employees}}, клиенты: {{clients}}, товары: {{products}}, сообщения: {{messages}}, хранилище: {{storage}} МБ',
                      employees: formatLimit(tariff.employee_limit),
                      clients: formatLimit(tariff.client_limit),
                      products: formatLimit(tariff.product_limit),
                      messages: formatLimit(tariff.monthly_message_limit),
                      storage: formatLimit(tariff.storage_limit_mb),
                    })}
                  </p>
                  <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-500">
                    {Object.keys(tariff.feature_flags ?? {}).join(', ')}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold text-slate-900">{t('platform_ads_title', { defaultValue: 'Рекламные размещения' })}</h2>
              {editingAdId != null ? (
                <Button variant="outline" onClick={resetAdForm}>
                  {t('platform_ad_reset', { defaultValue: 'Сбросить' })}
                </Button>
              ) : null}
            </div>
            <div className="mt-4 grid gap-3 rounded-2xl border border-slate-200 p-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>{t('platform_ad_filter_company_label', { defaultValue: 'Фильтр по компании' })}</Label>
                <Input value={adCompanyFilter} onChange={(event) => setAdCompanyFilter(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{t('platform_ad_filter_status_label', { defaultValue: 'Фильтр по статусу' })}</Label>
                <Input value={adStatusFilter} onChange={(event) => setAdStatusFilter(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{t('platform_ad_filter_placement_label', { defaultValue: 'Фильтр по месту размещения' })}</Label>
                <Input value={adPlacementFilter} onChange={(event) => setAdPlacementFilter(event.target.value)} />
              </div>
            </div>
            <div className="mt-4 grid gap-3">
              <div className="space-y-2">
                <Label>{t('platform_ad_company_label', { defaultValue: 'ID компании, если размещение точечное' })}</Label>
                <Input value={adForm.company_id} onChange={(event) => setAdForm((prev) => ({ ...prev, company_id: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>{t('platform_ad_title_label', { defaultValue: 'Название' })}</Label>
                <Input value={adForm.title} onChange={(event) => setAdForm((prev) => ({ ...prev, title: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>{t('platform_ad_placement_label', { defaultValue: 'Место размещения' })}</Label>
                <Input value={adForm.placement} onChange={(event) => setAdForm((prev) => ({ ...prev, placement: event.target.value }))} />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t('platform_ad_size_label', { defaultValue: 'Размер' })}</Label>
                  <Input value={adForm.size_label} onChange={(event) => setAdForm((prev) => ({ ...prev, size_label: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>{t('platform_ad_status_label', { defaultValue: 'Статус' })}</Label>
                  <Input value={adForm.status} onChange={(event) => setAdForm((prev) => ({ ...prev, status: event.target.value }))} />
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t('platform_ad_width_label', { defaultValue: 'Ширина, px' })}</Label>
                  <Input value={adForm.width_px} onChange={(event) => setAdForm((prev) => ({ ...prev, width_px: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>{t('platform_ad_height_label', { defaultValue: 'Высота, px' })}</Label>
                  <Input value={adForm.height_px} onChange={(event) => setAdForm((prev) => ({ ...prev, height_px: event.target.value }))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t('platform_ad_image_label', { defaultValue: 'Image URL' })}</Label>
                <Input value={adForm.image_url} onChange={(event) => setAdForm((prev) => ({ ...prev, image_url: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>{t('platform_ad_link_label', { defaultValue: 'Ссылка перехода' })}</Label>
                <Input value={adForm.link_url} onChange={(event) => setAdForm((prev) => ({ ...prev, link_url: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>{t('platform_ad_description_label', { defaultValue: 'Описание' })}</Label>
                <Input value={adForm.description} onChange={(event) => setAdForm((prev) => ({ ...prev, description: event.target.value }))} />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t('platform_ad_starts_at_label', { defaultValue: 'Начало показа' })}</Label>
                  <Input type="datetime-local" value={adForm.starts_at} onChange={(event) => setAdForm((prev) => ({ ...prev, starts_at: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>{t('platform_ad_ends_at_label', { defaultValue: 'Окончание показа' })}</Label>
                  <Input type="datetime-local" value={adForm.ends_at} onChange={(event) => setAdForm((prev) => ({ ...prev, ends_at: event.target.value }))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t('platform_ad_notes_label', { defaultValue: 'Комментарий' })}</Label>
                <Input value={adForm.notes} onChange={(event) => setAdForm((prev) => ({ ...prev, notes: event.target.value }))} />
              </div>
            </div>
            <div className="mt-4">
              <Button onClick={handleSaveAd}>
                {editingAdId != null ? t('platform_ad_update_button', { defaultValue: 'Обновить размещение' }) : t('platform_ad_create_button', { defaultValue: 'Создать размещение' })}
              </Button>
            </div>
            <div className="mt-6 space-y-3">
              {ads.map((ad) => (
                <div key={ad.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">{ad.title}</p>
                      <p className="text-sm text-slate-500">
                        {ad.placement} · {ad.size_label ?? `${ad.width_px ?? ''}x${ad.height_px ?? ''}`}
                      </p>
                      <p className="mt-2 text-sm text-slate-600">{ad.company_name ?? t('platform_ad_global', { defaultValue: 'Глобальное размещение' })}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => handleEditAd(ad)}>
                        {t('platform_edit', { defaultValue: 'Редактировать' })}
                      </Button>
                      <Button variant="destructive" onClick={() => handleDeleteAd(ad.id)}>
                        {t('platform_delete', { defaultValue: 'Удалить' })}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">{t('platform_payments_title', { defaultValue: 'Последние оплаты' })}</h2>
            <div className="mt-4 grid gap-3 rounded-2xl border border-slate-200 p-4 md:grid-cols-4">
              <div className="space-y-2">
                <Label>{t('platform_payment_filter_company_label', { defaultValue: 'Компания ID' })}</Label>
                <Input value={paymentCompanyFilter} onChange={(event) => setPaymentCompanyFilter(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{t('platform_payment_filter_status_label', { defaultValue: 'Статус оплаты' })}</Label>
                <Input value={paymentStatusFilter} onChange={(event) => setPaymentStatusFilter(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{t('platform_payment_filter_search_label', { defaultValue: 'Поиск оплаты' })}</Label>
                <Input value={paymentSearch} onChange={(event) => setPaymentSearch(event.target.value)} placeholder={t('search', { defaultValue: 'Поиск...' })} />
              </div>
              <div className="space-y-2">
                <Label>{t('platform_payment_filter_overdue_label', { defaultValue: 'Только просроченные' })}</Label>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => setPaymentOnlyOverdue((prev) => !prev)}
                >
                  {paymentOnlyOverdue
                    ? t('platform_include_deleted_on', { defaultValue: 'Да' })
                    : t('platform_include_deleted_off', { defaultValue: 'Нет' })}
                </Button>
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {payments.slice(0, 12).map((payment) => (
                <div key={payment.id} className="rounded-2xl border border-slate-200 p-4">
                  <p className="font-semibold text-slate-900">{payment.company_name}</p>
                  <p className="text-sm text-slate-500">{payment.tariff_name ?? payment.tariff_key}</p>
                  <p className="mt-2 text-sm text-slate-600">
                    {formatMoney(Number(payment.amount ?? 0), payment.currency ?? 'USD')} · {t('platform_period_months_label', { defaultValue: '{{count}} мес.', count: payment.period_months ?? 1 })}
                  </p>
                  <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">
                    {payment.status} · {payment.paid_at != null ? new Date(payment.paid_at).toLocaleString() : t('platform_not_paid_yet', { defaultValue: 'Не оплачено' })}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">{t('platform_chats_title', { defaultValue: 'Чаты компаний' })}</h2>
            <div className="mt-4 grid gap-3 rounded-2xl border border-slate-200 p-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>{t('platform_chat_filter_company_label', { defaultValue: 'Компания ID' })}</Label>
                <Input value={chatCompanyFilter} onChange={(event) => setChatCompanyFilter(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{t('platform_chat_filter_sender_label', { defaultValue: 'Отправитель' })}</Label>
                <Input value={chatSenderFilter} onChange={(event) => setChatSenderFilter(event.target.value)} placeholder={t('platform_chat_filter_sender_placeholder', { defaultValue: 'client или business' })} />
              </div>
              <div className="space-y-2">
                <Label>{t('platform_chat_filter_search_label', { defaultValue: 'Поиск по чатам' })}</Label>
                <Input value={chatSearch} onChange={(event) => setChatSearch(event.target.value)} placeholder={t('search', { defaultValue: 'Поиск...' })} />
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {chatEntries.map((entry) => (
                <div key={entry.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {entry.client_name ?? entry.instagram_id ?? t('platform_chat_unknown_client', { defaultValue: 'Клиент не определён' })}
                      </p>
                      <p className="text-sm text-slate-500">
                        {entry.company_name ?? t('platform_no_company', { defaultValue: 'Без компании' })} · {entry.sender ?? t('platform_chat_unknown_sender', { defaultValue: 'Отправитель не указан' })}
                      </p>
                    </div>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                      {entry.message_type ?? t('platform_chat_type_default', { defaultValue: 'text' })}
                    </p>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">
                    {entry.message != null && entry.message.trim().length > 0
                      ? entry.message
                      : t('platform_chat_empty_message', { defaultValue: 'Сообщение пустое или содержит только вложение.' })}
                  </p>
                  <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-500">
                    {entry.timestamp != null ? new Date(entry.timestamp).toLocaleString() : t('platform_not_scheduled', { defaultValue: 'Не запланирована' })}
                    {' · '}
                    {entry.is_read
                      ? t('platform_chat_read', { defaultValue: 'Прочитано' })
                      : t('platform_chat_unread', { defaultValue: 'Не прочитано' })}
                  </p>
                </div>
              ))}
              {chatEntries.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">
                  {t('platform_chats_empty', { defaultValue: 'Сообщений компаний пока нет.' })}
                </div>
              ) : null}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">{t('platform_calls_title', { defaultValue: 'Звонки компаний' })}</h2>
            <div className="mt-4 grid gap-3 rounded-2xl border border-slate-200 p-4 md:grid-cols-4">
              <div className="space-y-2">
                <Label>{t('platform_call_filter_company_label', { defaultValue: 'Компания ID' })}</Label>
                <Input value={callCompanyFilter} onChange={(event) => setCallCompanyFilter(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{t('platform_call_filter_status_label', { defaultValue: 'Статус звонка' })}</Label>
                <Input value={callStatusFilter} onChange={(event) => setCallStatusFilter(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{t('platform_call_filter_direction_label', { defaultValue: 'Направление' })}</Label>
                <Input value={callDirectionFilter} onChange={(event) => setCallDirectionFilter(event.target.value)} placeholder={t('platform_call_filter_direction_placeholder', { defaultValue: 'inbound или outbound' })} />
              </div>
              <div className="space-y-2">
                <Label>{t('platform_call_filter_search_label', { defaultValue: 'Поиск по звонкам' })}</Label>
                <Input value={callSearch} onChange={(event) => setCallSearch(event.target.value)} placeholder={t('search', { defaultValue: 'Поиск...' })} />
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {callEntries.map((entry) => (
                <div key={entry.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {entry.client_name ?? entry.phone ?? t('platform_call_unknown_client', { defaultValue: 'Клиент не определён' })}
                      </p>
                      <p className="text-sm text-slate-500">
                        {entry.company_name ?? t('platform_no_company', { defaultValue: 'Без компании' })} · {entry.phone ?? t('platform_call_phone_missing', { defaultValue: 'Телефон не указан' })}
                      </p>
                    </div>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                      {entry.direction ?? t('platform_call_direction_unknown', { defaultValue: 'Не указано' })} · {entry.status ?? t('platform_call_status_unknown', { defaultValue: 'Не указано' })}
                    </p>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">
                    {t('platform_call_duration', { defaultValue: 'Длительность: {{value}}', value: formatDuration(entry.duration) })}
                    {' · '}
                    {entry.manager_name ?? t('platform_call_manager_unknown', { defaultValue: 'Менеджер не указан' })}
                    {' · '}
                    {entry.has_recording
                      ? t('platform_call_recording_yes', { defaultValue: 'Есть запись' })
                      : t('platform_call_recording_no', { defaultValue: 'Без записи' })}
                  </p>
                  {entry.notes != null && entry.notes.trim().length > 0 ? (
                    <p className="mt-2 text-sm text-slate-600">{entry.notes}</p>
                  ) : null}
                  <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-500">
                    {entry.created_at != null ? new Date(entry.created_at).toLocaleString() : t('platform_not_scheduled', { defaultValue: 'Не запланирована' })}
                  </p>
                </div>
              ))}
              {callEntries.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">
                  {t('platform_calls_empty', { defaultValue: 'Звонков компаний пока нет.' })}
                </div>
              ) : null}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">{t('platform_webhooks_title', { defaultValue: 'Webhooks компаний' })}</h2>
            <div className="mt-4 grid gap-3 rounded-2xl border border-slate-200 p-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>{t('platform_webhook_filter_company_label', { defaultValue: 'Компания ID' })}</Label>
                <Input value={webhookCompanyFilter} onChange={(event) => setWebhookCompanyFilter(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{t('platform_webhook_filter_search_label', { defaultValue: 'Поиск вебхука' })}</Label>
                <Input value={webhookSearch} onChange={(event) => setWebhookSearch(event.target.value)} placeholder={t('search', { defaultValue: 'Поиск...' })} />
              </div>
              <div className="space-y-2">
                <Label>{t('platform_webhook_filter_active_label', { defaultValue: 'Только активные' })}</Label>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => setWebhookActiveOnly((prev) => !prev)}
                >
                  {webhookActiveOnly
                    ? t('platform_include_deleted_on', { defaultValue: 'Да' })
                    : t('platform_include_deleted_off', { defaultValue: 'Нет' })}
                </Button>
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {webhooks.map((webhook) => (
                <div key={webhook.id} className="rounded-2xl border border-slate-200 p-4">
                  <p className="font-semibold text-slate-900">{webhook.name ?? t('platform_not_scheduled', { defaultValue: 'Не запланирована' })}</p>
                  <p className="text-sm text-slate-500">{webhook.company_name ?? t('platform_no_company', { defaultValue: 'Без компании' })}</p>
                  <p className="mt-2 break-all text-sm text-slate-600">{webhook.url ?? ''}</p>
                  <p className="mt-2 text-sm text-slate-600">
                    {(webhook.events ?? []).join(', ')}
                  </p>
                  <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">
                    {webhook.is_active
                      ? t('platform_webhook_active', { defaultValue: 'Активен' })
                      : t('platform_webhook_inactive', { defaultValue: 'Выключен' })}
                    {' · '}
                    {t('platform_webhook_fail_count', {
                      defaultValue: 'Ошибок: {{count}}',
                      count: webhook.fail_count ?? 0,
                    })}
                    {' · '}
                    {webhook.last_status_code != null
                      ? t('platform_webhook_last_status', {
                        defaultValue: 'HTTP {{status}}',
                        status: webhook.last_status_code,
                      })
                      : t('platform_webhook_not_called', { defaultValue: 'Ещё не вызывался' })}
                  </p>
                </div>
              ))}
              {webhooks.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">
                  {t('platform_webhooks_empty', { defaultValue: 'Вебхуков компаний пока нет.' })}
                </div>
              ) : null}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">{t('platform_audit_title', { defaultValue: 'Журнал аудита' })}</h2>
            <div className="mt-4 grid gap-3 rounded-2xl border border-slate-200 p-4 md:grid-cols-4">
              <div className="space-y-2">
                <Label>{t('platform_audit_filter_company_label', { defaultValue: 'Компания ID' })}</Label>
                <Input value={auditCompanyFilter} onChange={(event) => setAuditCompanyFilter(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{t('platform_audit_filter_action_label', { defaultValue: 'Действие' })}</Label>
                <Input value={auditActionFilter} onChange={(event) => setAuditActionFilter(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{t('platform_audit_filter_entity_label', { defaultValue: 'Сущность' })}</Label>
                <Input value={auditEntityFilter} onChange={(event) => setAuditEntityFilter(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{t('platform_audit_filter_search_label', { defaultValue: 'Поиск по аудиту' })}</Label>
                <Input value={auditSearch} onChange={(event) => setAuditSearch(event.target.value)} placeholder={t('search', { defaultValue: 'Поиск...' })} />
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {auditEntries.map((entry) => (
                <div key={entry.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {entry.action ?? ''} · {entry.entity_type ?? t('platform_audit_unknown_entity', { defaultValue: 'Сущность не указана' })}
                      </p>
                      <p className="text-sm text-slate-500">
                        {entry.company_name ?? t('platform_no_company', { defaultValue: 'Без компании' })} · {entry.username ?? t('platform_audit_system_user', { defaultValue: 'Системное действие' })}
                      </p>
                      <p className="mt-2 text-sm text-slate-600">
                        {entry.entity_id != null
                          ? t('platform_audit_entity_id', { defaultValue: 'ID: {{id}}', id: entry.entity_id })
                          : t('platform_audit_without_entity_id', { defaultValue: 'Без entity ID' })}
                      </p>
                    </div>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                      {entry.success === false
                        ? t('platform_audit_failed', { defaultValue: 'Ошибка' })
                        : t('platform_audit_success', { defaultValue: 'Успешно' })}
                    </p>
                  </div>
                  {entry.error_message != null && entry.error_message.trim().length > 0 ? (
                    <p className="mt-2 text-sm text-slate-600">{entry.error_message}</p>
                  ) : null}
                  <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-500">
                    {entry.created_at != null ? new Date(entry.created_at).toLocaleString() : t('platform_not_scheduled', { defaultValue: 'Не запланирована' })}
                  </p>
                </div>
              ))}
              {auditEntries.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">
                  {t('platform_audit_empty', { defaultValue: 'Записей аудита пока нет.' })}
                </div>
              ) : null}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">{t('platform_broadcasts_title', { defaultValue: 'Рассылка компаниям' })}</h2>
            <div className="mt-4 space-y-3">
              <div className="space-y-2">
                <Label>{t('platform_broadcast_title_label', { defaultValue: 'Тема' })}</Label>
                <Input value={broadcastForm.title} onChange={(event) => setBroadcastForm((prev) => ({ ...prev, title: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>{t('platform_broadcast_statuses_label', { defaultValue: 'Статусы компаний через запятую' })}</Label>
                <Input value={broadcastForm.company_statuses} onChange={(event) => setBroadcastForm((prev) => ({ ...prev, company_statuses: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>{t('platform_broadcast_company_ids_label', { defaultValue: 'ID компаний через запятую' })}</Label>
                <Input value={broadcastForm.company_ids} onChange={(event) => setBroadcastForm((prev) => ({ ...prev, company_ids: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>{t('platform_broadcast_tariff_keys_label', { defaultValue: 'Ключи тарифов через запятую' })}</Label>
                <Input value={broadcastForm.tariff_keys} onChange={(event) => setBroadcastForm((prev) => ({ ...prev, tariff_keys: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>{t('platform_broadcast_message_label', { defaultValue: 'Сообщение' })}</Label>
                <textarea
                  value={broadcastForm.message}
                  onChange={(event) => setBroadcastForm((prev) => ({ ...prev, message: event.target.value }))}
                  className="min-h-32 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-slate-400"
                />
              </div>
            </div>
            <div className="mt-4">
              <Button onClick={handleBroadcast}>{t('platform_broadcast_send_button', { defaultValue: 'Отправить рассылку' })}</Button>
            </div>
            <div className="mt-6 space-y-3">
              {broadcasts.map((broadcast) => (
                <div key={broadcast.id} className="rounded-2xl border border-slate-200 p-4">
                  <p className="font-semibold text-slate-900">{broadcast.title}</p>
                  <p className="mt-2 text-sm text-slate-600">{broadcast.message}</p>
                  <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-500">
                    {broadcast.status} · {broadcast.sent_companies_count}
                  </p>
                </div>
              ))}
              {broadcasts.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">
                  {t('platform_broadcasts_empty', { defaultValue: 'Платформенных рассылок пока нет.' })}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
