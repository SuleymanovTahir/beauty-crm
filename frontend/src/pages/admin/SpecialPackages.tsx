// /frontend/src/pages/admin/SpecialPackages.tsx
// frontend/src/pages/admin/SpecialPackages.tsx
// Управление специальными пакетами и акциями

import { useState, useEffect, useMemo } from 'react';
import { Gift, Search, Plus, Edit, Trash2, Tag, Calendar, AlertCircle, Loader, Users, Target, Settings, ChevronRight, TrendingUp, ArrowUpDown, Ticket, Scissors } from 'lucide-react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { useTranslation } from 'react-i18next';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '../../components/ui/table';
import { toast } from 'sonner';
import { api } from '../../services/api';
import { useCurrency } from '../../hooks/useSalonSettings';
import { useAuth } from '../../contexts/AuthContext';
import { usePermissions } from '../../utils/permissions';
import UniversalChallenges from '../shared/Challenges';
import PromoCodes from './PromoCodes';
import LoyaltyManagement from '../adminPanel/LoyaltyManagement';

interface SpecialPackage {
  id: number;
  name: string;
  description: string;
  original_price: number;
  special_price: number;
  currency: string;
  discount_percent: number;
  services_included: string[]; // Список ключей услуг
  promo_code?: string;
  keywords: string[]; // Ключевые слова для распознавания
  valid_from: string;
  valid_until: string;
  is_active: boolean;
  usage_count: number;
  max_usage?: number;
}

interface ReferralCampaign {
  id: number;
  name: string;
  description?: string;
  bonus_points: number;
  referrer_bonus: number;
  is_active: boolean;
  target_type: 'all' | 'specific_users' | 'by_master' | 'by_service' | 'by_inactivity';
  target_criteria?: {
    user_ids?: string[];
    master_id?: number;
    service_ids?: number[];
    days_inactive?: number;
  };
  start_date?: string;
  end_date?: string;
  created_at: string;
}

interface ReferralHistoryItem {
  id: string;
  referrer_name: string;
  referrer_email: string;
  referred_name: string;
  referred_email: string;
  status: 'pending' | 'completed' | 'cancelled';
  points_awarded: number;
  created_at: string;
}

interface ReferralStats {
  total_referrals: number;
  completed_referrals: number;
  points_distributed: number;
}

interface ReferralSettings {
  referrer_bonus: number;
  referred_bonus: number;
  min_purchase_amount: number;
}

type ReferralSortKey = 'referrer' | 'referred' | 'date' | 'status' | 'points';
type SectionType = 'packages' | 'referrals' | 'challenges' | 'loyalty' | 'promo-codes';
type ReferralViewType = 'history' | 'campaigns';
type SpecialPackagesEntryMode = 'default' | 'referrals-only' | 'challenges-only' | 'loyalty-only' | 'promo-codes-only';

interface SpecialPackagesProps {
  entryMode?: SpecialPackagesEntryMode;
}

const normalizeSectionParam = (value: string | null): SectionType => {
  if (value === 'promo-codes') {
    return 'promo-codes';
  }
  if (value === 'challenges') {
    return 'challenges';
  }
  if (value === 'loyalty') {
    return 'loyalty';
  }
  if (value === 'referrals') {
    return 'referrals';
  }
  return 'packages';
};

const normalizeReferralViewParam = (value: string | null): ReferralViewType => {
  if (value === 'campaigns') {
    return 'campaigns';
  }
  return 'history';
};

export default function SpecialPackages({ entryMode = 'default' }: SpecialPackagesProps) {
  const forcedSection: SectionType | null = entryMode === 'referrals-only'
    ? 'referrals'
    : entryMode === 'challenges-only'
      ? 'challenges'
      : entryMode === 'loyalty-only'
        ? 'loyalty'
        : entryMode === 'promo-codes-only'
          ? 'promo-codes'
          : null;
  const isSingleSectionMode = forcedSection !== null;
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const initialSection = forcedSection !== null
    ? forcedSection
    : normalizeSectionParam(searchParams.get('section'));
  const initialReferralView = normalizeReferralViewParam(searchParams.get('view'));

  const [packages, setPackages] = useState<SpecialPackage[]>([]);
  const { t } = useTranslation([
    'admin/specialpackages',
    'adminpanel/referralprogram',
    'admin/challenges',
    'admin/promocodes',
    'adminpanel/loyaltymanagement',
    'admin/services',
    'layouts/mainlayout',
    'common'
  ]);
  const { currency, formatCurrency } = useCurrency();
  const { user } = useAuth();
  const permissions = usePermissions(user?.role ?? '');
  const [filteredPackages, setFilteredPackages] = useState<SpecialPackage[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<SpecialPackage | null>(null);
  const [loading, setLoading] = useState(!isSingleSectionMode);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<SectionType>(initialSection);
  const [referralView, setReferralView] = useState<ReferralViewType>(() => {
    if (initialSection !== 'referrals') {
      return 'history';
    }
    return initialReferralView;
  });

  // Referral campaigns state
  const [campaigns, setCampaigns] = useState<ReferralCampaign[]>([]);
  const [referralHistory, setReferralHistory] = useState<ReferralHistoryItem[]>([]);
  const [referralSearchTerm, setReferralSearchTerm] = useState('');
  const [referralStatusFilter, setReferralStatusFilter] = useState<'all' | 'pending' | 'completed' | 'cancelled'>('all');
  const [referralLoading, setReferralLoading] = useState(false);
  const [referralStats, setReferralStats] = useState<ReferralStats>({
    total_referrals: 0,
    completed_referrals: 0,
    points_distributed: 0
  });
  const [referralSettings, setReferralSettings] = useState<ReferralSettings>({
    referrer_bonus: 500,
    referred_bonus: 200,
    min_purchase_amount: 0
  });
  const [referralSortConfig, setReferralSortConfig] = useState<{ key: ReferralSortKey; direction: 'asc' | 'desc' }>({
    key: 'date',
    direction: 'desc'
  });
  const [isReferralSettingsOpen, setIsReferralSettingsOpen] = useState(false);
  const [isReferralModalOpen, setIsReferralModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<ReferralCampaign | null>(null);
  const [referralFormData, setReferralFormData] = useState({
    name: '',
    description: '',
    bonus_points: 200,
    referrer_bonus: 200,
    is_active: true,
    target_type: 'all' as 'all' | 'specific_users' | 'by_master' | 'by_service' | 'by_inactivity',
    days_inactive: 30,

    start_date: '',
    end_date: ''
  });

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    original_price: 0,
    special_price: 0,
    currency: currency,
    services_included: '',
    promo_code: '',
    keywords: '',
    valid_from: '',
    valid_until: '',
    is_active: true,
    max_usage: 0
  });

  const routePrefix = useMemo(() => {
    if (location.pathname.startsWith('/crm')) {
      return '/crm';
    }
    if (location.pathname.startsWith('/manager')) {
      return '/manager';
    }
    if (location.pathname.startsWith('/sales')) {
      return '/sales';
    }
    if (location.pathname.startsWith('/saler')) {
      return '/sales';
    }
    if (location.pathname.startsWith('/marketer')) {
      return '/marketer';
    }
    if (location.pathname.startsWith('/admin')) {
      return '/admin';
    }
    return '/crm';
  }, [location.pathname]);

  const parseNonNegativeNumber = (value: string, fallbackValue: number): number => {
    const parsedValue = Number(value);
    if (!Number.isFinite(parsedValue)) {
      return fallbackValue;
    }
    if (parsedValue < 0) {
      return 0;
    }
    return parsedValue;
  };

  const parseNonNegativeInteger = (value: string, fallbackValue: number): number => {
    const parsedValue = parseNonNegativeNumber(value, fallbackValue);
    return Math.round(parsedValue);
  };

  useEffect(() => {
    if (isSingleSectionMode) {
      return;
    }

    loadPackages();
  }, [isSingleSectionMode]);

  useEffect(() => {
    if (forcedSection !== null) {
      const viewFromUrl = normalizeReferralViewParam(searchParams.get('view'));
      const hasViewParam = searchParams.has('view');

      if (activeSection !== forcedSection) {
        setActiveSection(forcedSection);
      }

      if (forcedSection === 'referrals' && referralView !== viewFromUrl) {
        setReferralView(viewFromUrl);
      }

      const shouldSetDefaultView = forcedSection === 'referrals' && !hasViewParam;
      const shouldCleanView = forcedSection !== 'referrals' && searchParams.has('view');

      if (searchParams.has('section') || shouldSetDefaultView || shouldCleanView) {
        const nextParams = new URLSearchParams(searchParams);
        nextParams.delete('section');

        if (forcedSection === 'referrals') {
          nextParams.set('view', viewFromUrl);
        } else {
          nextParams.delete('view');
        }

        if (nextParams.toString() !== searchParams.toString()) {
          setSearchParams(nextParams, { replace: true });
        }
      }

      return;
    }

    const sectionFromUrl = normalizeSectionParam(searchParams.get('section'));
    const viewFromUrl = normalizeReferralViewParam(searchParams.get('view'));

    const normalizedView = sectionFromUrl === 'referrals' ? viewFromUrl : 'history';

    if (activeSection !== sectionFromUrl) {
      setActiveSection(sectionFromUrl);
    }

    if (referralView !== normalizedView) {
      setReferralView(normalizedView);
    }
  }, [searchParams, activeSection, referralView, forcedSection, setSearchParams]);

  // Load referral metadata when switching to referrals tab
  useEffect(() => {
    if (activeSection === 'referrals') {
      loadReferralMetadata();
    }
  }, [activeSection]);

  // Load referral history only for history view to avoid extra requests
  useEffect(() => {
    if (activeSection === 'referrals' && referralView === 'history') {
      loadReferralHistory();
    }
  }, [activeSection, referralStatusFilter, referralView]);

  useEffect(() => {
    const filtered = packages.filter(pkg => {
      const matchesSearch = pkg.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pkg.promo_code?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' ||
        (statusFilter === 'active' && pkg.is_active) ||
        (statusFilter === 'inactive' && !pkg.is_active);
      return matchesSearch && matchesStatus;
    });
    setFilteredPackages(filtered);
  }, [searchTerm, statusFilter, packages]);

  const loadPackages = async () => {
    try {
      setLoading(true);
      const data = await api.getSpecialPackages(false);
      const packagesData = Array.isArray(data.packages) ? data.packages : [];
      setPackages(packagesData);
    } catch (err) {
      toast.error(t('admin/specialpackages:error_loading_packages'));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadReferralMetadata = async () => {
    try {
      const [campaignsResponse, statsResponse, settingsResponse] = await Promise.all([
        api.getReferralCampaigns(),
        api.getReferralStats(),
        api.getReferralSettings()
      ]);

      const campaignsData = Array.isArray(campaignsResponse.campaigns) ? campaignsResponse.campaigns : [];
      const statsData = statsResponse.stats;
      const settingsData = settingsResponse.settings;

      setCampaigns(campaignsData);
      setReferralStats({
        total_referrals: typeof statsData?.total_referrals === 'number' ? statsData.total_referrals : 0,
        completed_referrals: typeof statsData?.completed_referrals === 'number' ? statsData.completed_referrals : 0,
        points_distributed: typeof statsData?.points_distributed === 'number' ? statsData.points_distributed : 0
      });
      setReferralSettings({
        referrer_bonus: typeof settingsData?.referrer_bonus === 'number' ? settingsData.referrer_bonus : 500,
        referred_bonus: typeof settingsData?.referred_bonus === 'number' ? settingsData.referred_bonus : 200,
        min_purchase_amount: typeof settingsData?.min_purchase_amount === 'number' ? settingsData.min_purchase_amount : 0
      });
    } catch (err) {
      toast.error(t('adminpanel/referralprogram:toasts.failed_load'));
      console.error(err);
    }
  };

  const loadReferralHistory = async () => {
    try {
      setReferralLoading(true);
      const historyResponse = await api.getReferrals({
        status: referralStatusFilter === 'all' ? undefined : referralStatusFilter
      });
      const referralsData = Array.isArray(historyResponse.referrals) ? historyResponse.referrals : [];
      setReferralHistory(referralsData);
    } catch (err) {
      toast.error(t('adminpanel/referralprogram:toasts.failed_load'));
      console.error(err);
    } finally {
      setReferralLoading(false);
    }
  };

  const updateRouteParams = (nextSection: SectionType, nextView: ReferralViewType) => {
    const nextParams = new URLSearchParams(searchParams);

    if (isSingleSectionMode) {
      nextParams.delete('section');

      if (forcedSection === 'referrals') {
        nextParams.set('view', nextView);
      } else {
        nextParams.delete('view');
      }
    } else {
      nextParams.set('section', nextSection);

      if (nextSection === 'referrals') {
        nextParams.set('view', nextView);
      } else {
        nextParams.delete('view');
      }
    }

    if (nextParams.toString() !== searchParams.toString()) {
      setSearchParams(nextParams, { replace: true });
    }
  };

  const handleSectionChange = (nextSection: SectionType) => {
    if (isSingleSectionMode) {
      if (forcedSection !== null) {
        setActiveSection(forcedSection);
        updateRouteParams(forcedSection, referralView);
      }
      return;
    }

    if (nextSection === 'packages') {
      setActiveSection('packages');
      updateRouteParams('packages', 'history');
      return;
    }

    if (nextSection === 'referrals') {
      setActiveSection('referrals');
      setReferralView('history');
      updateRouteParams('referrals', 'history');
      return;
    }

    setActiveSection(nextSection);
    updateRouteParams(nextSection, 'history');
  };

  const handleServicesTabClick = () => {
    navigate(`${routePrefix}/services`);
  };

  const handleReferralViewChange = (nextView: ReferralViewType) => {
    setReferralView(nextView);
    const targetSection = isSingleSectionMode && forcedSection !== null ? forcedSection : activeSection;
    updateRouteParams(targetSection, nextView);
  };

  const handleSaveReferralSettings = async () => {
    try {
      if (
        !Number.isFinite(referralSettings.referrer_bonus) ||
        !Number.isFinite(referralSettings.referred_bonus) ||
        !Number.isFinite(referralSettings.min_purchase_amount)
      ) {
        toast.error(t('adminpanel/referralprogram:toasts.failed_save'));
        return;
      }

      if (
        referralSettings.referrer_bonus < 0 ||
        referralSettings.referred_bonus < 0 ||
        referralSettings.min_purchase_amount < 0
      ) {
        toast.error(t('adminpanel/referralprogram:toasts.failed_save'));
        return;
      }

      await api.updateReferralSettings({
        referrer_bonus: referralSettings.referrer_bonus,
        referred_bonus: referralSettings.referred_bonus,
        min_purchase_amount: referralSettings.min_purchase_amount
      });
      toast.success(t('adminpanel/referralprogram:toasts.settings_saved'));
      setIsReferralSettingsOpen(false);
    } catch (err) {
      toast.error(t('adminpanel/referralprogram:toasts.failed_save'));
      console.error(err);
    }
  };

  const handleCreateReferralCampaign = () => {
    setEditingCampaign(null);
    setReferralFormData({
      name: '',
      description: '',
      bonus_points: 200,
      referrer_bonus: 200,
      is_active: true,
      target_type: 'all',
      days_inactive: 30,
      start_date: '',
      end_date: ''
    });
    setIsReferralModalOpen(true);
  };

  const handleEditReferralCampaign = (campaign: ReferralCampaign) => {
    setEditingCampaign(campaign);
    setReferralFormData({
      name: campaign.name,
      description: campaign.description ?? '',
      bonus_points: campaign.bonus_points,
      referrer_bonus: campaign.referrer_bonus,
      is_active: campaign.is_active,
      target_type: campaign.target_type,
      days_inactive: campaign.target_criteria?.days_inactive ?? 30,
      start_date: campaign.start_date ?? '',
      end_date: campaign.end_date ?? ''
    });
    setIsReferralModalOpen(true);
  };

  const handleSaveReferralCampaign = async () => {
    try {
      if (referralFormData.name.trim().length === 0) {
        toast.error(t('error_saving_campaign'));
        return;
      }

      if (
        !Number.isFinite(referralFormData.bonus_points) ||
        !Number.isFinite(referralFormData.referrer_bonus) ||
        !Number.isFinite(referralFormData.days_inactive)
      ) {
        toast.error(t('error_saving_campaign'));
        return;
      }

      if (
        referralFormData.bonus_points < 0 ||
        referralFormData.referrer_bonus < 0 ||
        referralFormData.days_inactive < 0
      ) {
        toast.error(t('error_saving_campaign'));
        return;
      }

      const payload = {
        name: referralFormData.name,
        description: referralFormData.description,
        bonus_points: referralFormData.bonus_points,
        referrer_bonus: referralFormData.referrer_bonus,
        is_active: referralFormData.is_active,
        target_type: referralFormData.target_type,
        target_criteria: referralFormData.target_type === 'by_inactivity'
          ? { days_inactive: referralFormData.days_inactive }
          : null,
        start_date: referralFormData.start_date.length > 0 ? referralFormData.start_date : null,
        end_date: referralFormData.end_date.length > 0 ? referralFormData.end_date : null
      };

      if (editingCampaign) {
        await api.updateReferralCampaign(editingCampaign.id, payload);
        toast.success(t('campaign_updated'));
      } else {
        await api.createReferralCampaign(payload);
        toast.success(t('campaign_created'));
      }

      await Promise.all([loadReferralMetadata(), loadReferralHistory()]);
      setIsReferralModalOpen(false);
    } catch (err) {
      toast.error(t('error_saving_campaign'));
      console.error(err);
    }
  };

  const handleReferralSort = (key: ReferralSortKey) => {
    setReferralSortConfig((previousConfig) => {
      if (previousConfig.key === key) {
        return {
          key,
          direction: previousConfig.direction === 'asc' ? 'desc' : 'asc'
        };
      }
      return { key, direction: 'asc' };
    });
  };

  const filteredReferralHistory = useMemo(() => {
    const normalizedSearch = referralSearchTerm.trim().toLowerCase();
    const filteredHistory = referralHistory.filter((item) => {
      if (normalizedSearch.length === 0) {
        return true;
      }
      return (
        item.referrer_name.toLowerCase().includes(normalizedSearch) ||
        item.referrer_email.toLowerCase().includes(normalizedSearch) ||
        item.referred_name.toLowerCase().includes(normalizedSearch) ||
        item.referred_email.toLowerCase().includes(normalizedSearch)
      );
    });

    const sortedHistory = [...filteredHistory];
    sortedHistory.sort((leftItem, rightItem) => {
      const { key, direction } = referralSortConfig;

      const leftValue = (() => {
        if (key === 'referrer') return `${leftItem.referrer_name} ${leftItem.referrer_email}`.toLowerCase();
        if (key === 'referred') return `${leftItem.referred_name} ${leftItem.referred_email}`.toLowerCase();
        if (key === 'status') return leftItem.status;
        if (key === 'points') return leftItem.points_awarded;
        return new Date(leftItem.created_at).getTime();
      })();

      const rightValue = (() => {
        if (key === 'referrer') return `${rightItem.referrer_name} ${rightItem.referrer_email}`.toLowerCase();
        if (key === 'referred') return `${rightItem.referred_name} ${rightItem.referred_email}`.toLowerCase();
        if (key === 'status') return rightItem.status;
        if (key === 'points') return rightItem.points_awarded;
        return new Date(rightItem.created_at).getTime();
      })();

      if (leftValue < rightValue) {
        return direction === 'asc' ? -1 : 1;
      }
      if (leftValue > rightValue) {
        return direction === 'asc' ? 1 : -1;
      }
      return 0;
    });

    return sortedHistory;
  }, [referralHistory, referralSearchTerm, referralSortConfig]);

  const handleOpenAddModal = () => {
    setEditingPackage(null);
    setFormData({
      name: '',
      description: '',
      original_price: 0,
      special_price: 0,
      currency: currency,
      services_included: '',
      promo_code: '',
      keywords: '',
      valid_from: '',
      valid_until: '',
      is_active: true,
      max_usage: 0
    });
    setIsModalOpen(true);
  };

  const handleEditPackage = (pkg: SpecialPackage) => {
    setEditingPackage(pkg);
    setFormData({
      name: pkg.name,
      description: pkg.description,
      original_price: pkg.original_price,
      special_price: pkg.special_price,
      currency: pkg.currency,
      services_included: pkg.services_included.join(', '),
      promo_code: pkg.promo_code || '',
      keywords: pkg.keywords.join(', '),
      valid_from: pkg.valid_from,
      valid_until: pkg.valid_until,
      is_active: pkg.is_active,
      max_usage: pkg.max_usage || 0
    });
    setIsModalOpen(true);
  };

  const calculateDiscount = () => {
    if (formData.original_price > 0 && formData.special_price > 0) {
      const discount = Math.round(((formData.original_price - formData.special_price) / formData.original_price) * 100);
      return discount;
    }
    return 0;
  };

  const handleSavePackage = async () => {
    try {
      if (!formData.name) {
        toast.error(t('admin/specialpackages:fill_package_name'));
        return;
      }

      if (!Number.isFinite(formData.original_price) || !Number.isFinite(formData.special_price)) {
        toast.error(t('admin/specialpackages:error_saving'));
        return;
      }

      if (!Number.isFinite(formData.max_usage) || formData.max_usage < 0) {
        toast.error(t('admin/specialpackages:error_saving'));
        return;
      }

      if (formData.original_price <= 0 || formData.special_price < 0) {
        toast.error(t('admin/specialpackages:special_price_must_be_less_than_original'));
        return;
      }

      if (formData.special_price >= formData.original_price) {
        toast.error(t('admin/specialpackages:special_price_must_be_less_than_original'));
        return;
      }

      if (formData.valid_from.length === 0 || formData.valid_until.length === 0) {
        toast.error(t('admin/specialpackages:error_saving'));
        return;
      }

      if (formData.valid_until < formData.valid_from) {
        toast.error(t('admin/specialpackages:error_saving'));
        return;
      }

      setSaving(true);

      const packageData = {
        name: formData.name,
        description: formData.description,
        original_price: formData.original_price,
        special_price: formData.special_price,
        currency: formData.currency,
        discount_percent: calculateDiscount(),
        services_included: formData.services_included.split(',').map(s => s.trim()).filter(Boolean),
        promo_code: formData.promo_code,
        keywords: formData.keywords.split(',').map(k => k.trim()).filter(Boolean),
        valid_from: formData.valid_from,
        valid_until: formData.valid_until,
        is_active: formData.is_active,
        max_usage: formData.max_usage || null
      };

      if (editingPackage) {
        await api.updateSpecialPackage(editingPackage.id, packageData);
        toast.success(t('admin/specialpackages:package_updated'));
      } else {
        await api.createSpecialPackage(packageData);
        toast.success(t('admin/specialpackages:package_created'));
      }

      await loadPackages();
      setIsModalOpen(false);
    } catch (err) {
      toast.error(t('admin/specialpackages:error_saving'));
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePackage = async (id: number) => {
    if (!confirm(t('admin/specialpackages:delete_package_confirm'))) return;

    try {
      await api.deleteSpecialPackage(id);
      setPackages(packages.filter(p => p.id !== id));
      toast.success(t('admin/specialpackages:package_deleted'));
    } catch (err) {
      toast.error(t('admin/specialpackages:error_deleting'));
      console.error(err);
    }
  };

  const handleToggleActive = async (pkg: SpecialPackage) => {
    try {
      await api.updateSpecialPackage(pkg.id, { is_active: !pkg.is_active });
      setPackages(packages.map(p =>
        p.id === pkg.id ? { ...p, is_active: !p.is_active } : p
      ));
      toast.success(pkg.is_active ? t('admin/specialpackages:package_deactivated') : t('admin/specialpackages:package_activated'));
    } catch (err) {
      toast.error(t('admin/specialpackages:error_changing_status'));
    }
  };

  const handleToggleCampaignActive = async (campaign: ReferralCampaign) => {
    try {
      await api.patchReferralCampaign(campaign.id, { is_active: !campaign.is_active });
      setCampaigns(previousCampaigns => previousCampaigns.map(currentCampaign =>
        currentCampaign.id === campaign.id ? { ...currentCampaign, is_active: !currentCampaign.is_active } : currentCampaign
      ));
      toast.success(campaign.is_active ? t('campaign_deactivated') : t('campaign_activated'));
    } catch (err) {
      toast.error(t('error_changing_status'));
    }
  };

  if (loading && activeSection === 'packages') {
    return (
      <div className="p-8 flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader className="w-8 h-8 text-pink-600 animate-spin" />
          <p className="text-gray-600">{t('admin/specialpackages:loading_packages')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Tab Navigation */}
      {!isSingleSectionMode && (
        <div className="flex flex-wrap gap-2 mb-6">
          <Button
            variant="outline"
            onClick={handleServicesTabClick}
            className="border-gray-300 text-gray-700 hover:bg-gray-100 hover:text-gray-900"
          >
            <Scissors className="w-4 h-4 mr-2" />
            {t('admin/services:services')}
          </Button>
          <Button
            variant={activeSection === 'packages' ? 'default' : 'outline'}
            onClick={() => handleSectionChange('packages')}
            className={activeSection === 'packages'
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'border-gray-300 text-gray-700 hover:bg-gray-100 hover:text-gray-900'}
          >
            <Gift className="w-4 h-4 mr-2" />
            {t('tab_packages')}
          </Button>
          <Button
            variant={activeSection === 'referrals' ? 'default' : 'outline'}
            onClick={() => handleSectionChange('referrals')}
            className={activeSection === 'referrals'
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'border-gray-300 text-gray-700 hover:bg-gray-100 hover:text-gray-900'}
          >
            <Users className="w-4 h-4 mr-2" />
            {t('tab_referrals')}
          </Button>
          <Button
            variant={activeSection === 'challenges' ? 'default' : 'outline'}
            onClick={() => handleSectionChange('challenges')}
            className={activeSection === 'challenges'
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'border-gray-300 text-gray-700 hover:bg-gray-100 hover:text-gray-900'}
          >
            <Target className="w-4 h-4 mr-2" />
            {t('layouts/mainlayout:menu.challenges')}
          </Button>
          <Button
            variant={activeSection === 'loyalty' ? 'default' : 'outline'}
            onClick={() => handleSectionChange('loyalty')}
            className={activeSection === 'loyalty'
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'border-gray-300 text-gray-700 hover:bg-gray-100 hover:text-gray-900'}
          >
            <Gift className="w-4 h-4 mr-2" />
            {t('layouts/mainlayout:menu.loyalty')}
          </Button>
          <Button
            variant={activeSection === 'promo-codes' ? 'default' : 'outline'}
            onClick={() => handleSectionChange('promo-codes')}
            className={activeSection === 'promo-codes'
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'border-gray-300 text-gray-700 hover:bg-gray-100 hover:text-gray-900'}
          >
            <Ticket className="w-4 h-4 mr-2" />
            {t('layouts/mainlayout:menu.promo_codes')}
          </Button>
        </div>
      )}

      {/* Header */}
      {(activeSection === 'packages' || activeSection === 'referrals') && (
        <div className="mb-8">
          <h1 className="text-3xl text-gray-900 mb-2 flex items-center gap-3">
            {activeSection === 'referrals' ? (
              <Users className="w-8 h-8 text-blue-600" />
            ) : (
              <Gift className="w-8 h-8 text-pink-600" />
            )}
            {activeSection === 'referrals'
              ? t('adminpanel/referralprogram:title')
              : t('admin/specialpackages:special_packages_and_promotions')}
          </h1>
          <p className="text-gray-600">
            {activeSection === 'packages'
              ? `${t('admin/specialpackages:manage_promotional_offers')} ${filteredPackages.length} ${t('admin/specialpackages:packages')}`
              : t('adminpanel/referralprogram:subtitle')}
          </p>
        </div>
      )}

      {!isSingleSectionMode && activeSection === 'packages' && (
        <>
          {/* Alert */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-blue-800 font-medium">{t('admin/specialpackages:how_special_packages_work')}</p>
                <ul className="text-blue-700 text-sm mt-2 space-y-1 list-disc list-inside">
                  <li>{t('admin/specialpackages:when_client_mentions_keywords_or_promo_code')}</li>
                  <li>{t('admin/specialpackages:bot_automatically_recognizes_context_of_promotional_campaign')}</li>
                  <li>{t('admin/specialpackages:packages_can_be_limited_by_time_and_usage_count')}</li>
                </ul>
              </div>
            </div>
          </div>


          {/* Search and Filters */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  type="text"
                  placeholder={t('admin/specialpackages:search_packages_promo_codes')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder={t('admin/specialpackages:status')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('admin/specialpackages:all_packages')}</SelectItem>
                  <SelectItem value="active">{t('admin/specialpackages:active')}</SelectItem>
                  <SelectItem value="inactive">{t('admin/specialpackages:inactive')}</SelectItem>
                </SelectContent>
              </Select>
              {permissions.canEditLoyalty && (
                <Button
                  className="bg-pink-600 hover:bg-pink-700"
                  onClick={handleOpenAddModal}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {t('admin/specialpackages:create_package')}
                </Button>
              )}
            </div>
          </div>

          {/* Packages Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPackages.map((pkg) => (
              <div
                key={pkg.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">{pkg.name}</h3>
                  </div>
                  <Badge className={pkg.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                    {pkg.is_active ? t('admin/specialpackages:active') : t('admin/specialpackages:inactive')}
                  </Badge>
                </div>

                {/* Promo Code */}
                {pkg.promo_code && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 mb-4 flex items-center gap-2">
                    <Tag className="w-4 h-4 text-blue-600" />
                    <span className="text-blue-900 font-mono font-medium">{pkg.promo_code}</span>
                  </div>
                )}

                {/* Price */}
                <div className="mb-4">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-pink-600">
                      {formatCurrency(pkg.special_price)}
                    </span>
                    <span className="text-lg text-gray-400 line-through">
                      {formatCurrency(pkg.original_price)}
                    </span>
                  </div>
                  <div className="text-sm text-green-600 font-medium">
                    {t('admin/specialpackages:discount')} {pkg.discount_percent}%
                  </div>
                </div>

                {/* Description */}
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                  {pkg.description}
                </p>

                {/* Keywords */}
                {pkg.keywords.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs text-gray-500 mb-1">{t('admin/specialpackages:keywords')}</p>
                    <div className="flex flex-wrap gap-1">
                      {pkg.keywords.slice(0, 3).map((keyword, idx) => (
                        <span key={idx} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                          {keyword}
                        </span>
                      ))}
                      {pkg.keywords.length > 3 && (
                        <span className="text-xs text-gray-500">+{pkg.keywords.length - 3}</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Validity */}
                <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {new Date(pkg.valid_from).toLocaleDateString('ru-RU')} - {new Date(pkg.valid_until).toLocaleDateString('ru-RU')}
                  </span>
                </div>

                {/* Stats */}
                {pkg.max_usage && (
                  <div className="text-xs text-gray-500 mb-4">
                    {t('admin/specialpackages:used')}: {pkg.usage_count} / {pkg.max_usage}
                  </div>
                )}

                {permissions.canEditLoyalty && (
                  <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEditPackage(pkg)}
                      className="flex-1"
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      {t('admin/specialpackages:edit')}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleToggleActive(pkg)}
                      className={pkg.is_active ? 'text-orange-600' : 'text-green-600'}
                    >
                      {pkg.is_active ? t('admin/specialpackages:disable') : t('admin/specialpackages:enable')}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeletePackage(pkg.id)}
                      className="text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {filteredPackages.length === 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 py-20 text-center">
              <Gift className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">{t('admin/specialpackages:special_packages_not_found')}</p>
              <Button onClick={handleOpenAddModal} className="mt-4 bg-pink-600 hover:bg-pink-700">
                {t('admin/specialpackages:create_first_package')}
              </Button>
            </div>
          )}

          {/* Package Modal */}
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingPackage ? t('admin/specialpackages:edit_package') : t('admin/specialpackages:create_package')}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                {/* Basic Info */}
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <Label htmlFor="name">{t('admin/specialpackages:name')} *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder={t('admin/specialpackages:summer_special_package')}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">{t('admin/specialpackages:description')}</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder={t('admin/specialpackages:includes_manicure_and_pedicure_at_special_price')}
                    rows={2}
                  />
                </div>

                {/* Pricing */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="originalPrice">{t('admin/specialpackages:original_price')} *</Label>
                    <Input
                      id="originalPrice"
                      type="number"
                      value={formData.original_price}
                      onChange={(e) => setFormData({
                        ...formData,
                        original_price: parseNonNegativeNumber(e.target.value, formData.original_price)
                      })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="specialPrice">{t('admin/specialpackages:special_price')} *</Label>
                    <Input
                      id="specialPrice"
                      type="number"
                      value={formData.special_price}
                      onChange={(e) => setFormData({
                        ...formData,
                        special_price: parseNonNegativeNumber(e.target.value, formData.special_price)
                      })}
                    />
                  </div>
                  <div>
                    <Label>{t('admin/specialpackages:discount')}</Label>
                    <div className="h-10 flex items-center text-2xl font-bold text-green-600">
                      {calculateDiscount()}%
                    </div>
                  </div>
                </div>

                {/* Promo Code & Keywords */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="promoCode">{t('admin/specialpackages:promo_code')} ({t('admin/specialpackages:optional')})</Label>
                    <Input
                      id="promoCode"
                      value={formData.promo_code}
                      onChange={(e) => setFormData({ ...formData, promo_code: e.target.value.toUpperCase() })}
                      placeholder={t('admin/specialpackages:summer_special_package_promo_code')}
                    />
                  </div>
                  <div>
                    <Label htmlFor="maxUsage">{t('admin/specialpackages:max_usage')}</Label>
                    <Input
                      id="maxUsage"
                      type="number"
                      value={formData.max_usage}
                      onChange={(e) => setFormData({
                        ...formData,
                        max_usage: parseNonNegativeInteger(e.target.value, formData.max_usage)
                      })}
                      placeholder={t('admin/specialpackages:unlimited_0')}
                    />
                  </div>
                </div>

                {/* Keywords */}
                <div>
                  <Label htmlFor="keywords">{t('admin/specialpackages:keywords')} ({t('admin/specialpackages:separate_through_comma')} *)</Label>
                  <Textarea
                    id="keywords"
                    value={formData.keywords}
                    onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                    placeholder={t('admin/specialpackages:keywords_placeholder')}
                    rows={2}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {t('admin/specialpackages:when_client_mentions_keywords_bot_will_offer_package')}
                  </p>
                </div>

                {/* Services */}
                <div>
                  <Label htmlFor="services">{t('admin/specialpackages:included_services')} ({t('admin/specialpackages:separate_through_comma')})</Label>
                  <Textarea
                    id="services"
                    value={formData.services_included}
                    onChange={(e) => setFormData({ ...formData, services_included: e.target.value })}
                    placeholder={t('admin/specialpackages:services_included_placeholder')}
                    rows={2}
                  />
                </div>

                {/* Validity Period */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="validFrom">{t('admin/specialpackages:valid_from')} *</Label>
                    <Input
                      id="validFrom"
                      type="date"
                      value={formData.valid_from}
                      onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="validUntil">{t('admin/specialpackages:valid_until')} *</Label>
                    <Input
                      id="validUntil"
                      type="date"
                      value={formData.valid_until}
                      onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                    />
                  </div>
                </div>

                {/* Active Status */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4 text-pink-600 rounded"
                  />
                  <Label htmlFor="isActive" className="cursor-pointer">
                    {t('admin/specialpackages:active')} ({t('admin/specialpackages:available_for_clients')})
                  </Label>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                  {t('admin/specialpackages:cancel')}
                </Button>
                <Button
                  onClick={handleSavePackage}
                  className="bg-pink-600 hover:bg-pink-700"
                  disabled={saving}
                >
                  {saving ? t('admin/specialpackages:saving') : t('admin/specialpackages:save')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}

      {/* Referral Campaigns Section */}
      {activeSection === 'referrals' && (
        <div className="space-y-6">
          {/* Info Banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Target className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-blue-800 font-medium">{t('referral_campaigns')}</p>
                <ul className="text-blue-700 text-sm mt-2 space-y-1 list-disc list-inside">
                  <li>{t('referral_info_1')}</li>
                  <li>{t('referral_info_2')}</li>
                  <li>{t('referral_info_3')}</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 mb-2">{t('adminpanel/referralprogram:stats.total_referrals')}</p>
                  <p className="text-2xl font-bold text-gray-900">{referralStats.total_referrals}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 mb-2">{t('adminpanel/referralprogram:stats.completed_referrals')}</p>
                  <p className="text-2xl font-bold text-gray-900">{referralStats.completed_referrals}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-green-50 text-green-600 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 mb-2">{t('adminpanel/referralprogram:stats.points_distributed')}</p>
                  <p className="text-2xl font-bold text-gray-900">{referralStats.points_distributed.toLocaleString()}</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-pink-50 text-pink-600 flex items-center justify-center">
                  <Gift className="w-5 h-5" />
                </div>
              </div>
            </div>
          </div>

          {/* Referral Controls */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="space-y-4">
              <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
                <div className="inline-flex w-full xl:w-auto rounded-lg bg-gray-100 p-1">
                  <Button
                    type="button"
                    variant={referralView === 'history' ? 'default' : 'ghost'}
                    onClick={() => handleReferralViewChange('history')}
                    className={`flex-1 xl:flex-none ${referralView === 'history'
                      ? 'bg-white text-blue-700 hover:bg-white'
                      : 'text-gray-700 hover:bg-white hover:text-gray-900'
                    }`}
                  >
                    {t('referrals_history_tab', 'История приглашений')}
                  </Button>
                  <Button
                    type="button"
                    variant={referralView === 'campaigns' ? 'default' : 'ghost'}
                    onClick={() => handleReferralViewChange('campaigns')}
                    className={`flex-1 xl:flex-none ${referralView === 'campaigns'
                      ? 'bg-white text-blue-700 hover:bg-white'
                      : 'text-gray-700 hover:bg-white hover:text-gray-900'
                    }`}
                  >
                    {t('referrals_campaigns_tab', 'Кампании и бонусы')}
                  </Button>
                </div>

                {permissions.canEditLoyalty && (
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setIsReferralSettingsOpen(true)}
                      className="w-full sm:w-auto"
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      {t('adminpanel/referralprogram:settings')}
                    </Button>
                    <Button
                      onClick={handleCreateReferralCampaign}
                      className="w-full sm:w-auto bg-blue-600 text-white hover:bg-blue-700"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      {t('create_campaign_button')}
                    </Button>
                  </div>
                )}
              </div>

              {referralView === 'history' && (
                <div className="flex flex-col xl:flex-row xl:items-center gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      type="text"
                      placeholder={t('adminpanel/referralprogram:table.search_placeholder')}
                      value={referralSearchTerm}
                      onChange={(event) => setReferralSearchTerm(event.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select
                    value={referralStatusFilter}
                    onValueChange={(value: 'all' | 'pending' | 'completed' | 'cancelled') => setReferralStatusFilter(value)}
                  >
                    <SelectTrigger className="w-full xl:w-[220px]">
                      <SelectValue placeholder={t('adminpanel/referralprogram:table.filters.all_statuses')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('adminpanel/referralprogram:table.filters.all_statuses')}</SelectItem>
                      <SelectItem value="pending">{t('adminpanel/referralprogram:table.statuses.pending')}</SelectItem>
                      <SelectItem value="completed">{t('adminpanel/referralprogram:table.statuses.completed')}</SelectItem>
                      <SelectItem value="cancelled">{t('adminpanel/referralprogram:table.statuses.cancelled')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

          </div>

          {/* Referral History */}
          {referralView === 'history' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-base font-semibold text-gray-900">{t('referrals_history_tab', 'История приглашений')}</h3>
              </div>

              {referralLoading && (
                <div className="py-12 text-center text-gray-500">
                  {t('admin/specialpackages:loading_packages')}
                </div>
              )}

              {!referralLoading && filteredReferralHistory.length === 0 && (
                <div className="py-16 text-center">
                  <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">{t('adminpanel/referralprogram:table.description')}</p>
                </div>
              )}

              {!referralLoading && filteredReferralHistory.length > 0 && (
                <>
                  <div className="hidden md:block overflow-x-auto">
                    <Table className="min-w-[760px]">
                      <TableHeader>
                        <TableRow>
                          <TableHead>
                            <button type="button" className="inline-flex items-center gap-2" onClick={() => handleReferralSort('referrer')}>
                              <span>{t('adminpanel/referralprogram:table.columns.referrer')}</span>
                              <ArrowUpDown className="w-4 h-4" />
                            </button>
                          </TableHead>
                          <TableHead className="w-10 text-center">
                            <ChevronRight className="w-4 h-4 mx-auto text-gray-300" />
                          </TableHead>
                          <TableHead>
                            <button type="button" className="inline-flex items-center gap-2" onClick={() => handleReferralSort('referred')}>
                              <span>{t('adminpanel/referralprogram:table.columns.referred_friend')}</span>
                              <ArrowUpDown className="w-4 h-4" />
                            </button>
                          </TableHead>
                          <TableHead>
                            <button type="button" className="inline-flex items-center gap-2" onClick={() => handleReferralSort('date')}>
                              <span>{t('adminpanel/referralprogram:table.columns.date')}</span>
                              <ArrowUpDown className="w-4 h-4" />
                            </button>
                          </TableHead>
                          <TableHead>
                            <button type="button" className="inline-flex items-center gap-2" onClick={() => handleReferralSort('status')}>
                              <span>{t('adminpanel/referralprogram:table.columns.status')}</span>
                              <ArrowUpDown className="w-4 h-4" />
                            </button>
                          </TableHead>
                          <TableHead className="text-right">
                            <button type="button" className="inline-flex items-center gap-2 justify-end w-full" onClick={() => handleReferralSort('points')}>
                              <span>{t('adminpanel/referralprogram:table.columns.points_awarded')}</span>
                              <ArrowUpDown className="w-4 h-4" />
                            </button>
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredReferralHistory.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>
                              <div className="min-w-[180px]">
                                <div className="font-medium text-gray-900">{item.referrer_name}</div>
                                <div className="text-xs text-gray-500">{item.referrer_email}</div>
                              </div>
                            </TableCell>
                            <TableCell className="text-center text-gray-300">
                              <ChevronRight className="w-4 h-4 mx-auto" />
                            </TableCell>
                            <TableCell>
                              <div className="min-w-[180px]">
                                <div className="font-medium text-gray-900">{item.referred_name}</div>
                                <div className="text-xs text-gray-500">{item.referred_email}</div>
                              </div>
                            </TableCell>
                            <TableCell className="text-gray-600 whitespace-nowrap">
                              {new Date(item.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              {item.status === 'completed' && (
                                <Badge className="bg-green-100 text-green-800">{t('adminpanel/referralprogram:table.statuses.completed')}</Badge>
                              )}
                              {item.status === 'pending' && (
                                <Badge className="bg-blue-100 text-blue-800">{t('adminpanel/referralprogram:table.statuses.pending')}</Badge>
                              )}
                              {item.status === 'cancelled' && (
                                <Badge className="bg-gray-100 text-gray-800">{t('adminpanel/referralprogram:table.statuses.cancelled')}</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right font-semibold text-blue-600">
                              {item.points_awarded > 0 ? `+${item.points_awarded}` : '0'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="md:hidden p-4 space-y-3">
                    {filteredReferralHistory.map((item) => (
                      <div key={item.id} className="rounded-lg border border-gray-200 bg-white p-4">
                        <div className="space-y-1">
                          <p className="text-xs text-gray-500">{t('adminpanel/referralprogram:table.columns.referrer')}</p>
                          <p className="font-medium text-gray-900">{item.referrer_name}</p>
                          <p className="text-xs text-gray-500">{item.referrer_email}</p>
                        </div>
                        <div className="mt-3 space-y-1">
                          <p className="text-xs text-gray-500">{t('adminpanel/referralprogram:table.columns.referred_friend')}</p>
                          <p className="font-medium text-gray-900">{item.referred_name}</p>
                          <p className="text-xs text-gray-500">{item.referred_email}</p>
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-2">
                          <div>
                            <p className="text-xs text-gray-500">{t('adminpanel/referralprogram:table.columns.date')}</p>
                            <p className="text-sm text-gray-700">{new Date(item.created_at).toLocaleDateString()}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">{t('adminpanel/referralprogram:table.columns.status')}</p>
                            {item.status === 'completed' && (
                              <Badge className="bg-green-100 text-green-800">{t('adminpanel/referralprogram:table.statuses.completed')}</Badge>
                            )}
                            {item.status === 'pending' && (
                              <Badge className="bg-blue-100 text-blue-800">{t('adminpanel/referralprogram:table.statuses.pending')}</Badge>
                            )}
                            {item.status === 'cancelled' && (
                              <Badge className="bg-gray-100 text-gray-800">{t('adminpanel/referralprogram:table.statuses.cancelled')}</Badge>
                            )}
                          </div>
                        </div>
                        <div className="mt-3">
                          <p className="text-xs text-gray-500">{t('adminpanel/referralprogram:table.columns.points_awarded')}</p>
                          <p className="font-semibold text-blue-600">{item.points_awarded > 0 ? `+${item.points_awarded}` : '0'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Campaigns */}
          {referralView === 'campaigns' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-base font-semibold text-gray-900">{t('referrals_campaigns_tab', 'Кампании и бонусы')}</h3>
                <span className="text-sm text-gray-500">{campaigns.length}</span>
              </div>
              {campaigns.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {campaigns.map((campaign) => (
                    <div
                      key={campaign.id}
                      className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 mb-1">{campaign.name}</h3>
                          <p className="text-sm text-gray-500">{campaign.description}</p>
                        </div>
                        <Badge className={campaign.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                          {campaign.is_active ? t('campaign_active') : t('campaign_inactive')}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="bg-blue-50 p-3 rounded-lg text-center">
                          <p className="text-2xl font-bold text-blue-600">{campaign.bonus_points}</p>
                          <p className="text-xs text-blue-700">{t('bonus_to_referee')}</p>
                        </div>
                        <div className="bg-pink-50 p-3 rounded-lg text-center">
                          <p className="text-2xl font-bold text-pink-600">{campaign.referrer_bonus}</p>
                          <p className="text-xs text-pink-700">{t('bonus_to_referrer')}</p>
                        </div>
                      </div>

                      <div className="mb-4">
                        <p className="text-xs text-gray-500 mb-1">{t('target_audience')}</p>
                        <Badge variant="outline">
                          {campaign.target_type === 'all' && t('target_all_clients')}
                          {campaign.target_type === 'specific_users' && t('target_specific_users')}
                          {campaign.target_type === 'by_master' && t('target_by_master')}
                          {campaign.target_type === 'by_service' && t('target_by_service')}
                          {campaign.target_type === 'by_inactivity' && t('target_inactive_days', { count: campaign.target_criteria?.days_inactive ?? 30 })}
                        </Badge>
                      </div>

                      {permissions.canEditLoyalty && (
                        <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditReferralCampaign(campaign)}
                            className="flex-1"
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            {t('edit_campaign')}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleToggleCampaignActive(campaign)}
                            className={campaign.is_active ? 'text-orange-600' : 'text-green-600'}
                          >
                            {campaign.is_active ? t('disable') : t('enable')}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                              if (!confirm(t('delete_campaign_confirm'))) {
                                return;
                              }
                              try {
                                await api.deleteReferralCampaign(campaign.id);
                                setCampaigns(previousCampaigns => previousCampaigns.filter(currentCampaign => currentCampaign.id !== campaign.id));
                                toast.success(t('campaign_deleted'));
                              } catch (error) {
                                toast.error(t('error_deleting_campaign'));
                                console.error(error);
                              }
                            }}
                            className="text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {campaigns.length === 0 && (
                <div className="py-20 text-center">
                  <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">{t('no_campaigns_found')}</p>
                </div>
              )}
            </div>
          )}

          {/* Referral Settings Modal */}
          <Dialog open={isReferralSettingsOpen} onOpenChange={setIsReferralSettingsOpen}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{t('adminpanel/referralprogram:dialogs.settings.title')}</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="referrerBonusSettings">{t('adminpanel/referralprogram:dialogs.settings.referrer_bonus')}</Label>
                  <Input
                    id="referrerBonusSettings"
                    type="number"
                    value={referralSettings.referrer_bonus}
                    onChange={(event) => setReferralSettings({
                      ...referralSettings,
                      referrer_bonus: parseNonNegativeInteger(event.target.value, referralSettings.referrer_bonus)
                    })}
                  />
                </div>
                <div>
                  <Label htmlFor="referredBonusSettings">{t('adminpanel/referralprogram:dialogs.settings.referred_bonus')}</Label>
                  <Input
                    id="referredBonusSettings"
                    type="number"
                    value={referralSettings.referred_bonus}
                    onChange={(event) => setReferralSettings({
                      ...referralSettings,
                      referred_bonus: parseNonNegativeInteger(event.target.value, referralSettings.referred_bonus)
                    })}
                  />
                </div>
                <div>
                  <Label htmlFor="referralMinPurchase">{t('adminpanel/referralprogram:dialogs.settings.min_purchase_amount', { currency })}</Label>
                  <Input
                    id="referralMinPurchase"
                    type="number"
                    value={referralSettings.min_purchase_amount}
                    onChange={(event) => setReferralSettings({
                      ...referralSettings,
                      min_purchase_amount: parseNonNegativeNumber(event.target.value, referralSettings.min_purchase_amount)
                    })}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsReferralSettingsOpen(false)}>
                  {t('adminpanel/referralprogram:buttons.cancel')}
                </Button>
                <Button
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={handleSaveReferralSettings}
                >
                  {t('adminpanel/referralprogram:buttons.save_changes')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Referral Campaign Modal */}
          <Dialog open={isReferralModalOpen} onOpenChange={setIsReferralModalOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingCampaign ? t('edit_referral_campaign') : t('create_referral_campaign')}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="campaignName">{t('campaign_name')} *</Label>
                  <Input
                    id="campaignName"
                    value={referralFormData.name}
                    onChange={(e) => setReferralFormData({ ...referralFormData, name: e.target.value })}
                    placeholder={t('campaign_name_placeholder')}
                  />
                </div>

                <div>
                  <Label htmlFor="campaignDesc">{t('description')}</Label>
                  <Textarea
                    id="campaignDesc"
                    value={referralFormData.description}
                    onChange={(e) => setReferralFormData({ ...referralFormData, description: e.target.value })}
                    placeholder={t('campaign_description_placeholder')}
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="bonusPoints">{t('bonus_to_referee')}</Label>
                    <Input
                      id="bonusPoints"
                      type="number"
                      value={referralFormData.bonus_points}
                      onChange={(e) => setReferralFormData({
                        ...referralFormData,
                        bonus_points: parseNonNegativeInteger(e.target.value, referralFormData.bonus_points)
                      })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="referrerBonus">{t('bonus_to_referrer')}</Label>
                    <Input
                      id="referrerBonus"
                      type="number"
                      value={referralFormData.referrer_bonus}
                      onChange={(e) => setReferralFormData({
                        ...referralFormData,
                        referrer_bonus: parseNonNegativeInteger(e.target.value, referralFormData.referrer_bonus)
                      })}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="targetType">{t('target_audience')}</Label>
                  <Select
                    value={referralFormData.target_type}
                    onValueChange={(value: any) => setReferralFormData({ ...referralFormData, target_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('select_audience')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('target_all_clients')}</SelectItem>
                      <SelectItem value="by_inactivity">{t('target_by_inactivity')}</SelectItem>
                      {editingCampaign?.target_type === 'by_master' && (
                        <SelectItem value="by_master">{t('target_by_master')}</SelectItem>
                      )}
                      {editingCampaign?.target_type === 'by_service' && (
                        <SelectItem value="by_service">{t('target_by_service')}</SelectItem>
                      )}
                      {editingCampaign?.target_type === 'specific_users' && (
                        <SelectItem value="specific_users">{t('target_specific_users')}</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {referralFormData.target_type === 'by_inactivity' && (
                  <div>
                    <Label htmlFor="daysInactive">{t('days_without_visiting')}</Label>
                    <Input
                      id="daysInactive"
                      type="number"
                      value={referralFormData.days_inactive}
                      onChange={(e) => setReferralFormData({
                        ...referralFormData,
                        days_inactive: parseNonNegativeInteger(e.target.value, referralFormData.days_inactive)
                      })}
                      placeholder="30"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="startDate">{t('start_date')} ({t('optional')})</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={referralFormData.start_date}
                      onChange={(e) => setReferralFormData({ ...referralFormData, start_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="endDate">{t('end_date')} ({t('optional')})</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={referralFormData.end_date}
                      onChange={(e) => setReferralFormData({ ...referralFormData, end_date: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="campaignActive"
                    checked={referralFormData.is_active}
                    onChange={(e) => setReferralFormData({ ...referralFormData, is_active: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <Label htmlFor="campaignActive" className="cursor-pointer">
                    {t('active_clients_can_use')}
                  </Label>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsReferralModalOpen(false)}>
                  {t('cancel')}
                </Button>
                <Button
                  onClick={handleSaveReferralCampaign}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {editingCampaign ? t('save_campaign') : t('create_campaign')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {activeSection === 'challenges' && (
        <UniversalChallenges embedded={true} />
      )}

      {activeSection === 'loyalty' && (
        <LoyaltyManagement embedded={true} />
      )}

      {activeSection === 'promo-codes' && (
        <PromoCodes embedded={true} />
      )}
    </div>
  );
}
