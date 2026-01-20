// /frontend/src/pages/admin/Services.tsx
// frontend/src/pages/admin/Services.tsx - С ВКЛАДКАМИ ДЛЯ СПЕЦПАКЕТОВ И НОВЫМИ ПОЛЯМИ
import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Scissors, Search, Plus, Edit, Trash2, Loader,
  AlertCircle, Gift, Tag, Calendar, Clock, ArrowUpDown, ArrowUp, ArrowDown,
  Users, Target, ChevronDown, Check, X
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { useTranslation } from 'react-i18next';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover';
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '../../components/ui/command';
import { toast } from 'sonner';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { usePermissions } from '../../utils/permissions';
import { useCurrency } from '../../hooks/useSalonSettings';

// DURATION_FORMATS removed in favor of dynamic translation in component

// Utility function to format duration from minutes (universal for all languages)
const formatDuration = (minutes: string | number | undefined, t: any): string => {
  if (!minutes) return '';

  const totalMinutes = typeof minutes === 'string' ? parseInt(minutes, 10) : minutes;
  if (isNaN(totalMinutes) || totalMinutes <= 0) return '';

  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;

  const hourUnit = (t('unit_hour', { defaultValue: 'h' }) || 'h')[0].toLowerCase();
  const minUnit = (t('unit_minute', { defaultValue: 'm' }) || 'm')[0].toLowerCase();

  if (hours > 0 && mins > 0) {
    return `${hours}${hourUnit} ${mins}${minUnit}`;
  } else if (hours > 0) {
    return `${hours}${hourUnit}`;
  } else {
    return `${mins}${minUnit}`;
  }
};

interface Service {
  id: number;
  key: string;
  name: string;
  name_ru: string;
  name_ar?: string;
  price: number;
  min_price?: number;
  max_price?: number;
  duration?: string;
  currency: string;
  category: string;
  description?: string;
  description_ru?: string;
  description_ar?: string;
  benefits?: string[];
  is_active: boolean;
  [key: string]: any;
}

interface SpecialPackage {
  id: number;
  name: string;
  name_ru: string;
  description: string;
  description_ru: string;
  original_price: number;
  special_price: number;
  currency: string;
  discount_percent: number;
  services_included: string[];
  promo_code?: string;
  keywords: string[];
  valid_from: string;
  valid_until: string;
  is_active: boolean;
  usage_count: number;
  max_usage?: number;
  // Scheduling fields
  scheduled?: boolean;
  schedule_date?: string;
  schedule_time?: string;
  auto_activate?: boolean;
  auto_deactivate?: boolean;
}

type TabType = 'services' | 'packages' | 'referrals' | 'challenges';

const categories = [
  'Permanent Makeup',
  'Facial',
  'Massage',
  'Nails',
  'Hair',
  'Lashes',
  'Brows',
  'Waxing'
];

export default function Services() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    const tab = searchParams.get('tab');
    return (tab === 'services' || tab === 'packages' || tab === 'referrals' || tab === 'challenges') ? tab : 'services';
  });
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isCrmPath = location.pathname.startsWith('/crm');
  const basePath = isCrmPath ? '/crm' : '/admin';

  const [activeTabDot, setActiveTabDot] = useState(0);

  // Используем централизованную систему прав
  const permissions = usePermissions(currentUser?.role || 'employee');

  // Update URL when tab changes
  const handleTabChange = (newTab: TabType) => {
    setActiveTab(newTab);
    setSearchParams({ tab: newTab });
  };

  // Services state
  const [services, setServices] = useState<Service[]>([]);
  const { t, i18n } = useTranslation(['admin/Services', 'common', 'admin/users']);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const { currency } = useCurrency();
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: string) => {
    if (!sortConfig || sortConfig.key !== key) return <ArrowUpDown size={14} className="ml-1 opacity-30" />;
    return sortConfig.direction === 'asc' ? <ArrowUp size={14} className="ml-1 text-pink-500" /> : <ArrowDown size={14} className="ml-1 text-pink-500" />;
  };

  // Форматирование цены
  const formatPrice = (service: Service) => {
    const minPrice = typeof service.min_price === 'number' ? service.min_price : null;
    const maxPrice = typeof service.max_price === 'number' ? service.max_price : null;

    if (
      minPrice !== null &&
      maxPrice !== null &&
      minPrice !== maxPrice
    ) {
      return `${minPrice} — ${maxPrice} ${service.currency}`;
    }
    return `${service.price} ${service.currency}`;
  };

  // Packages state
  const [packages, setPackages] = useState<SpecialPackage[]>([]);
  const [packageSearchTerm, setPackageSearchTerm] = useState('');
  const [packageStatusFilter, setPackageStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [isPackageModalOpen, setIsPackageModalOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<SpecialPackage | null>(null);

  // Referrals state
  const [, setCampaigns] = useState<any[]>([]);
  const [isReferralModalOpen, setIsReferralModalOpen] = useState(false);
  const [editingCampaign] = useState<any>(null);
  const [referralFormData, setReferralFormData] = useState({
    name: '',
    description: '',
    bonus_points: 200,
    referrer_bonus: 200,
    is_active: true,
    target_type: 'all' as 'all' | 'specific_users' | 'by_master' | 'by_service' | 'by_inactivity',
    days_inactive: 30,
    start_date: '',
    end_date: '',
    master_id: null as number | null,
    service_id: null as number | null,
    client_ids: [] as string[],
    clientSearch: ''
  });

  // Nested audience selection state
  const [mastersList] = useState<Array<{ id: number; full_name: string }>>([]);
  const [mastersLoading] = useState(false);
  const [clientsOfMaster, setClientsOfMaster] = useState<Array<{ id: string; name: string }>>([]);
  const [clientsLoading, setClientsLoading] = useState(false);

  // Challenges state
  // Challenges state
  const [isChallengeModalOpen, setIsChallengeModalOpen] = useState(false);
  const [editingChallenge, setEditingChallenge] = useState<any>(null);
  const [challengeFormData, setChallengeFormData] = useState({
    title_ru: '',
    title_en: '',
    description_ru: '',
    description_en: '',
    bonus_points: 50,
    is_active: true,
    target_type: 'all' as 'all' | 'specific_users' | 'by_master' | 'by_service' | 'by_inactivity',
    days_inactive: 30,
    start_date: '',
    end_date: '',
    master_id: null as number | null,
    service_id: null as number | null,
    client_ids: [] as string[],
    clientSearch: ''
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Positions state
  const [positions, setPositions] = useState<Array<{ id: number; name: string; name_en?: string }>>([]);
  const [employees, setEmployees] = useState<Array<{ id: number; full_name: string; full_name_ru: string; position_id: number; position?: string; role?: string; is_active?: boolean }>>([]);

  const [serviceFormData, setServiceFormData] = useState({
    key: '',
    name: '',
    name_ru: '',
    name_ar: '',
    price: 0,
    min_price: '',
    max_price: '',
    duration: '',
    currency: currency,
    category: '',
    description: '',
    description_ru: '',
    description_ar: '',
    benefits: '',
    position_ids: [] as number[],
    employee_ids: [] as number[],
  });

  const [employeeSearchTerm, setEmployeeSearchTerm] = useState('');

  const [packageFormData, setPackageFormData] = useState({
    name: '',
    name_ru: '',
    description: '',
    description_ru: '',
    original_price: 0,
    special_price: 0,
    currency: currency,
    services_included: '',
    promo_code: '',
    keywords: '',
    valid_from: '',
    valid_until: '',
    is_active: true,
    max_usage: 0,
    // Scheduling fields
    scheduled: false,
    schedule_date: '',
    schedule_time: '',
    auto_activate: false,
    auto_deactivate: false
  });

  useEffect(() => {
    loadData();
    loadPositions();
    loadEmployees();
  }, [activeTab]);

  const loadPositions = async () => {
    try {
      const response = await fetch('/api/positions', {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to load positions');
      const data = await response.json();
      setPositions(data.positions || []);
    } catch (err) {
      console.error('Error loading positions:', err);
    }
  };

  const loadEmployees = async () => {
    try {
      const response = await fetch('/api/users', {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to load employees');
      const data = await response.json();
      // Filter only active employees (masters), excluding admins, directors, etc.
      // Based on common beauty CRM logic, we only want users with role='employee'
      const excludedPositions = ['Директор', 'Администратор', 'SMM-менеджер', 'Таргетолог', 'Менеджер по продажам', 'Старший администратор'];
      const activeEmployees = (data.users || []).filter((u: any) =>
        u.role === 'employee' && u.is_active &&
        !excludedPositions.includes(u.position) &&
        !excludedPositions.includes(u.position_ru)
      );
      setEmployees(activeEmployees);
    } catch (err) {
      console.error('Error loading employees:', err);
    }
  };

  const filteredAndSortedServices = useMemo(() => {
    let result = services.filter(service => {
      const lang = i18n.language.split('-')[0];
      const localizedName = (service[`name_${lang}`] || service.name || '').toLowerCase();
      const localizedDesc = (service[`description_${lang}`] || service.description || '').toLowerCase();
      const search = searchTerm.toLowerCase();

      const matchesSearch = localizedName.includes(search) || localizedDesc.includes(search);
      const matchesCategory = categoryFilter === 'all' || service.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });

    if (sortConfig) {
      result.sort((a, b) => {
        const { key, direction } = sortConfig;
        let aVal: any = a[key as keyof Service];
        let bVal: any = b[key as keyof Service];

        if (key === 'duration') {
          aVal = parseInt(aVal || '0', 10);
          bVal = parseInt(bVal || '0', 10);
        }

        if (aVal < bVal) return direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [services, searchTerm, categoryFilter, sortConfig, i18n.language]);

  const filteredAndSortedPackages = useMemo(() => {
    let result = packages.filter(pkg => {
      const lang = i18n.language.split('-')[0];
      const name = ((pkg as any)[`name_${lang}`] || pkg.name || '').toLowerCase();
      const desc = ((pkg as any)[`description_${lang}`] || pkg.description || '').toLowerCase();
      const promo = (pkg.promo_code || '').toLowerCase();
      const search = packageSearchTerm.toLowerCase();

      const matchesSearch = name.includes(search) || desc.includes(search) || promo.includes(search);
      const matchesStatus = packageStatusFilter === 'all' ||
        (packageStatusFilter === 'active' && pkg.is_active) ||
        (packageStatusFilter === 'inactive' && !pkg.is_active);
      return matchesSearch && matchesStatus;
    });

    if (sortConfig) {
      result.sort((a, b) => {
        const { key, direction } = sortConfig;
        let aVal = a[key as keyof SpecialPackage];
        let bVal = b[key as keyof SpecialPackage];

        if (aVal! < bVal!) return direction === 'asc' ? -1 : 1;
        if (aVal! > bVal!) return direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [packages, packageSearchTerm, packageStatusFilter, sortConfig, i18n.language]);

  const loadData = async () => {
    try {
      setLoading(true);


      if (activeTab === 'services') {
        const data = await api.getServices(false);
        setServices(data.services || []);
      } else if (activeTab === 'packages') {
        const data = await api.getSpecialPackages();
        setPackages(data.packages || []);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : t('services:loading_error');
      toast.error(`${t('services:error')}: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  // ===== SERVICES HANDLERS =====
  const handleOpenAddService = () => {
    setEditingService(null);
    setServiceFormData({
      key: '',
      name: '',
      name_ru: '',
      name_ar: '',
      price: 0,
      min_price: '',
      max_price: '',
      duration: '',
      currency: currency,
      category: '',
      description: '',
      description_ru: '',
      description_ar: '',
      benefits: '',
      position_ids: [],
      employee_ids: [],
    });
    setIsServiceModalOpen(true);
  };

  const handleEditService = async (service: Service) => {
    setEditingService(service);

    // Load service positions
    let positionIds: number[] = [];
    try {
      const response = await fetch(`/api/services/${service.id}/positions`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        positionIds = (data.positions || []).map((p: any) => p.id);
      }
    } catch (err) {
      console.error('Error loading service positions:', err);
    }

    // Load service employees
    let employeeIds: number[] = [];
    try {
      const response = await fetch(`/api/services/${service.id}/employees`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        employeeIds = (data.employees || []).map((e: any) => e.id);
      }
    } catch (err) {
      console.error('Error loading service employees:', err);
    }

    setServiceFormData({
      key: service.key,
      name: service.name,
      name_ru: service.name_ru,
      name_ar: service.name_ar || '',
      price: service.price,
      min_price: service.min_price?.toString() || '',
      max_price: service.max_price?.toString() || '',
      duration: service.duration || '',
      currency: service.currency,
      category: service.category,
      description: service.description || '',
      description_ru: service.description_ru || '',
      description_ar: service.description_ar || '',
      benefits: Array.isArray(service.benefits) ? service.benefits.join(' | ') : '',
      position_ids: positionIds,
      employee_ids: employeeIds,
    });
    setIsServiceModalOpen(true);
  };

  const handleSaveService = async () => {
    try {
      if (!serviceFormData.key || !serviceFormData.name || !serviceFormData.name_ru || !serviceFormData.category) {
        toast.error(t('services:fill_required_fields'));
        return;
      }

      setSaving(true);

      const serviceData = {
        key: serviceFormData.key,
        name: serviceFormData.name,
        name_ru: serviceFormData.name_ru,
        name_ar: serviceFormData.name_ar,
        price: serviceFormData.price,
        min_price: serviceFormData.min_price ? Number(serviceFormData.min_price) : null,
        max_price: serviceFormData.max_price ? Number(serviceFormData.max_price) : null,
        duration: serviceFormData.duration || null,
        currency: serviceFormData.currency,
        category: serviceFormData.category,
        description: serviceFormData.description,
        description_ru: serviceFormData.description_ru,
        description_ar: serviceFormData.description_ar,
        benefits: serviceFormData.benefits.split(' | ').filter(b => b.trim()),
      };

      let serviceId: number;
      if (editingService) {
        await api.updateService(editingService.id, serviceData);
        serviceId = editingService.id;
        toast.success(t('services:service_updated'));
      } else {
        const response = await api.createService(serviceData) as any;
        serviceId = response.id;
        toast.success(t('services:service_added'));
      }

      // Save service positions
      try {
        await fetch(`/api/services/${serviceId}/positions`, {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ position_ids: serviceFormData.position_ids }),
        });
      } catch (err) {
        console.error('Error saving service positions:', err);
        toast.error(t('services:error_saving_positions'));
      }

      // Save service employees
      try {
        await fetch(`/api/services/${serviceId}/employees`, {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ employee_ids: serviceFormData.employee_ids }),
        });
      } catch (err) {
        console.error('Error saving service employees:', err);
        toast.error(t('services:error_saving_employees'));
      }

      await loadData();
      setIsServiceModalOpen(false);
    } catch (err) {
      toast.error(`${t('services:error')}: ${err instanceof Error ? err.message : t('services:unknown_error')}`);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleServiceActive = async (service: Service) => {
    try {
      // Используем специальный endpoint для toggle
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/services/${service.id}/toggle-status`, {
        method: 'POST',
        credentials: 'include'
      });

      if (!response.ok) throw new Error(t('services:toggle_failed'));

      const data = await response.json();

      // Обновляем локальное состояние с ответом от сервера
      setServices(services.map(s =>
        s.id === service.id ? { ...s, is_active: data.is_active } : s
      ));

      toast.success(data.is_active ? t('services:service_activated') : t('services:service_deactivated'));
    } catch (err) {
      toast.error(t('services:error_changing_status'));
      console.error(err);
    }
  };

  const handleDeleteService = async (id: number) => {
    if (!confirm(t('services:are_you_sure_you_want_to_delete_this_service'))) return;

    try {
      await api.deleteService(id);
      setServices(services.filter(s => s.id !== id));
      toast.success(t('services:service_deleted'));
    } catch (err) {
      toast.error(`${t('services:error')}: ${err instanceof Error ? err.message : t('services:unknown_error')}`);
    }
  };

  // ===== PACKAGES HANDLERS =====
  const handleOpenAddPackage = () => {
    setEditingPackage(null);
    setPackageFormData({
      name: '',
      name_ru: '',
      description: '',
      description_ru: '',
      original_price: 0,
      special_price: 0,
      currency: currency,
      services_included: '',
      promo_code: '',
      keywords: '',
      valid_from: '',
      valid_until: '',
      is_active: true,
      max_usage: 0,
      // Scheduling fields
      scheduled: false,
      schedule_date: '',
      schedule_time: '',
      auto_activate: false,
      auto_deactivate: false
    });
    setIsPackageModalOpen(true);
  };

  const handleEditPackage = (pkg: SpecialPackage) => {
    setEditingPackage(pkg);
    setPackageFormData({
      name: pkg.name,
      name_ru: pkg.name_ru,
      description: pkg.description,
      description_ru: pkg.description_ru,
      original_price: pkg.original_price,
      special_price: pkg.special_price,
      currency: pkg.currency,
      services_included: pkg.services_included.join(', '),
      promo_code: pkg.promo_code || '',
      keywords: pkg.keywords.join(', '),
      valid_from: pkg.valid_from,
      valid_until: pkg.valid_until,
      is_active: pkg.is_active,
      max_usage: pkg.max_usage || 0,
      // Scheduling fields
      scheduled: pkg.scheduled || false,
      schedule_date: pkg.schedule_date || '',
      schedule_time: pkg.schedule_time || '',
      auto_activate: pkg.auto_activate || false,
      auto_deactivate: pkg.auto_deactivate || false
    });
    setIsPackageModalOpen(true);
  };

  const calculateDiscount = () => {
    if (packageFormData.original_price > 0 && packageFormData.special_price > 0) {
      return Math.round(((packageFormData.original_price - packageFormData.special_price) / packageFormData.original_price) * 100);
    }
    return 0;
  };

  const handleSavePackage = async () => {
    try {
      if (!packageFormData.name || !packageFormData.name_ru) {
        toast.error(t('services:fill_package_name'));
        return;
      }

      if (packageFormData.special_price >= packageFormData.original_price) {
        toast.error(t('services:special_price_must_be_less_than_original'));
        return;
      }

      setSaving(true);

      const packageData = {
        name: packageFormData.name,
        name_ru: packageFormData.name_ru,
        description: packageFormData.description,
        description_ru: packageFormData.description_ru,
        original_price: packageFormData.original_price,
        special_price: packageFormData.special_price,
        currency: packageFormData.currency,
        discount_percent: calculateDiscount(),
        services_included: packageFormData.services_included.split(',').map(s => s.trim()).filter(Boolean),
        promo_code: packageFormData.promo_code,
        keywords: packageFormData.keywords.split(',').map(k => k.trim()).filter(Boolean),
        valid_from: packageFormData.valid_from,
        valid_until: packageFormData.valid_until,
        is_active: packageFormData.is_active,
        max_usage: packageFormData.max_usage || null,
        // Scheduling fields
        scheduled: packageFormData.scheduled,
        schedule_date: packageFormData.schedule_date,
        schedule_time: packageFormData.schedule_time,
        auto_activate: packageFormData.auto_activate,
        auto_deactivate: packageFormData.auto_deactivate
      };

      if (editingPackage) {
        await api.updateSpecialPackage(editingPackage.id, packageData);
        toast.success(t('services:package_updated'));
      } else {
        await api.createSpecialPackage(packageData);
        toast.success(t('services:package_created'));
      }

      await loadData();
      setIsPackageModalOpen(false);
    } catch (err) {
      toast.error(`${t('services:error')}: ${err instanceof Error ? err.message : t('services:unknown_error')}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePackage = async (id: number) => {
    if (!confirm(t('services:are_you_sure_you_want_to_delete_this_package'))) return;

    try {
      await api.deleteSpecialPackage(id);
      setPackages(packages.filter(p => p.id !== id));
      toast.success(t('services:package_deleted'));
    } catch (err) {
      toast.error(`${t('services:error')}: ${err instanceof Error ? err.message : t('services:unknown_error')}`);
    }
  };

  const handleTogglePackageActive = async (pkg: SpecialPackage) => {
    try {
      await api.updateSpecialPackage(pkg.id, { is_active: !pkg.is_active });
      setPackages(packages.map(p =>
        p.id === pkg.id ? { ...p, is_active: !p.is_active } : p
      ));
      toast.success(pkg.is_active ? t('services:package_deactivated') : t('services:package_activated'));
    } catch (err) {
      toast.error(t('services:error_changing_status'));
    }
  };

  const handleSaveChallenge = async () => {
    try {
      setSaving(true);
      if (editingChallenge) {
        await api.updateChallenge(editingChallenge.id, challengeFormData);
        toast.success(t('services:challenge_updated'));
      } else {
        await api.createChallenge(challengeFormData);
        toast.success(t('services:challenge_created'));
      }
      loadData();
      setIsChallengeModalOpen(false);
      setEditingChallenge(null);
      setChallengeFormData({
        title_ru: '',
        title_en: '',
        description_ru: '',
        description_en: '',
        bonus_points: 50,
        is_active: true,
        target_type: 'all',
        days_inactive: 30,
        start_date: '',
        end_date: '',
        master_id: null,
        service_id: null,
        client_ids: [],
        clientSearch: ''
      });
    } catch (error) {
      toast.error(t('services:error_saving'));
    } finally {
      setSaving(false);
    }
  };



  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader className="w-8 h-8 text-pink-600 animate-spin" />
          <p className="text-gray-600">{t('services:loading')}...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl text-gray-900 mb-2 flex items-center gap-3">
          <Scissors className="w-8 h-8 text-pink-600" />
          {t('services:services_and_packages')}
        </h1>
        <p className="text-gray-600">
          {t('services:management_of_price_list_and_salon_promotions')}
        </p>
      </div>

      {/* Tabs */}
      <div className="w-full relative mb-6">
        {activeTabDot < 3 && (
          <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-white via-white/90 to-transparent z-20 pointer-events-none sm:hidden flex items-center justify-end pr-2 transition-opacity duration-300">
            <ChevronDown className={`w-5 h-5 text-pink-500 -rotate-90 ${activeTabDot === 0 ? 'animate-[bounce_1.5s_infinite]' : 'opacity-50'}`} />
          </div>
        )}
        <div className="w-full bg-white rounded-xl shadow-sm border border-gray-200 p-1.5 overflow-hidden">
          <div
            className="flex gap-1.5 p-1 bg-gray-50/50 rounded-lg overflow-x-auto hide-scrollbar scroll-smooth"
            onScroll={(e) => {
              const el = e.currentTarget;
              const scrollLeft = el.scrollLeft;
              const maxScroll = el.scrollWidth - el.clientWidth;
              if (maxScroll <= 0) return;

              const progress = scrollLeft / maxScroll;
              // more precise dot switching
              if (progress < 0.2) setActiveTabDot(0);
              else if (progress < 0.5) setActiveTabDot(1);
              else if (progress < 0.85) setActiveTabDot(2);
              else setActiveTabDot(3); // Added 4th state for the last bit
            }}
          >
            <button
              onClick={() => handleTabChange('services')}
              className={`flex-shrink-0 min-w-fit px-3 sm:px-6 py-2.5 rounded-lg font-medium transition-all whitespace-nowrap text-sm sm:text-base ${activeTab === 'services'
                ? 'bg-pink-600 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-50'
                }`}
            >
              <Scissors className="w-4 h-4 sm:w-5 sm:h-5 inline-block mr-2" />
              {t('services:services')} ({filteredAndSortedServices.length})
            </button>
            <button
              onClick={() => handleTabChange('packages')}
              className={`flex-shrink-0 min-w-fit px-4 sm:px-6 py-3 rounded-lg font-medium transition-all whitespace-nowrap ${activeTab === 'packages'
                ? 'bg-pink-600 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-50'
                }`}
            >
              <Gift className="w-5 h-5 inline-block mr-2" />
              {t('services:special_packages')} ({filteredAndSortedPackages.length})
            </button>
            <button
              onClick={() => handleTabChange('referrals')}
              className={`flex-shrink-0 min-w-fit px-4 sm:px-6 py-3 rounded-lg font-medium transition-all whitespace-nowrap ${activeTab === 'referrals'
                ? 'bg-pink-600 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-50'
                }`}
            >
              <Users className="w-5 h-5 inline-block mr-2" />
              {t('services:referral_programs', 'Реферальные программы')}
            </button>
            <button
              onClick={() => handleTabChange('challenges')}
              className={`flex-shrink-0 min-w-fit px-4 sm:px-6 py-3 rounded-lg font-medium transition-all whitespace-nowrap ${activeTab === 'challenges'
                ? 'bg-pink-600 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-50'
                }`}
            >
              <Target className="w-5 h-5 inline-block mr-2" />
              {t('services:challenges', 'Челленджи')}
            </button>
          </div>
        </div>
        {/* Scroll Hint Dots */}
        <div className="mt-2 flex justify-center gap-1.5 sm:hidden">
          <div className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${activeTabDot === 0 ? 'bg-pink-600 w-3 shadow-[0_0_8px_rgba(219,39,119,0.4)]' : 'bg-gray-200'}`} />
          <div className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${activeTabDot === 1 ? 'bg-pink-600 w-3 shadow-[0_0_8px_rgba(219,39,119,0.4)]' : 'bg-gray-200'}`} />
          <div className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${activeTabDot === 2 ? 'bg-pink-600 w-3 shadow-[0_0_8px_rgba(219,39,119,0.4)]' : 'bg-gray-200'}`} />
          <div className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${activeTabDot === 3 ? 'bg-pink-600 w-3 shadow-[0_0_8px_rgba(219,39,119,0.4)]' : 'bg-gray-200'}`} />
        </div>
      </div>

      {/* SERVICES TAB */}
      {activeTab === 'services' && (
        <>
          {/* Services Search and Filters */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  type="text"
                  placeholder={t('services:search_services')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder={t('services:category')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('services:all_categories')}</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat}>
                      {t(`services:category_${cat.toLowerCase().replace(/\s+/g, '_')}`, cat)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {/* Кнопка создания только если есть право */}
              {permissions.canEditServices && (
                <Button
                  className="bg-pink-600 hover:bg-pink-700"
                  onClick={handleOpenAddService}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {t('services:add_service')}
                </Button>
              )}
            </div>
          </div>

          {/* Services Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {filteredAndSortedServices.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th onClick={() => handleSort('name')} className="px-6 py-4 text-sm font-semibold text-gray-600 cursor-pointer hover:bg-gray-100 transition-colors">
                        <div className="flex items-center">{t('services:name')} {getSortIcon('name')}</div>
                      </th>
                      <th onClick={() => handleSort('price')} className="px-6 py-4 text-sm font-semibold text-gray-600 cursor-pointer hover:bg-gray-100 transition-colors">
                        <div className="flex items-center">{t('services:price')} {getSortIcon('price')}</div>
                      </th>
                      <th onClick={() => handleSort('duration')} className="px-6 py-4 text-sm font-semibold text-gray-600 cursor-pointer hover:bg-gray-100 transition-colors">
                        <div className="flex items-center">{t('services:duration')} {getSortIcon('duration')}</div>
                      </th>
                      <th onClick={() => handleSort('category')} className="px-6 py-4 text-sm font-semibold text-gray-600 cursor-pointer hover:bg-gray-100 transition-colors">
                        <div className="flex items-center">{t('services:category')} {getSortIcon('category')}</div>
                      </th>
                      <th onClick={() => handleSort('is_active')} className="px-6 py-4 text-sm font-semibold text-gray-600 cursor-pointer hover:bg-gray-100 transition-colors">
                        <div className="flex items-center">{t('services:status')} {getSortIcon('is_active')}</div>
                      </th>
                      <th className="px-6 py-4 text-sm font-semibold text-gray-600 text-right">{t('services:actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredAndSortedServices.map((service) => (
                      <tr key={service.id} className="hover:bg-gray-50/80 transition-colors group">
                        <td className="px-6 py-4">
                          <div>
                            <p className="text-sm font-bold text-gray-900">
                              {(() => {
                                const lang = i18n.language.split('-')[0];
                                return service[`name_${lang}`] || service.name;
                              })()}
                            </p>
                            {(() => {
                              const lang = i18n.language.split('-')[0];
                              const description = service[`description_${lang}`] || service.description;
                              return description ? (
                                <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{description}</p>
                              ) : null;
                            })()}
                          </div>
                        </td>
                        <td className="px-6 py-4 font-bold text-gray-900 text-[13px]">
                          {formatPrice(service)}
                        </td>
                        <td className="px-6 py-4">
                          {service.duration && service.duration !== 'null' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-600 border border-blue-100">
                              <Clock className="w-3 h-3 mr-1" />
                              {formatDuration(service.duration, t)}
                            </span>
                          ) : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-600 border border-blue-100">
                            {t(`services:category_${service.category.toLowerCase().replace(/\s+/g, '_')}`, service.category)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => handleToggleServiceActive(service)}
                            className={`px-3 py-1 rounded-full text-xs font-bold transition-all shadow-sm ${service.is_active
                              ? 'bg-green-100 text-green-700 hover:bg-green-200'
                              : 'bg-red-100 text-red-700 hover:bg-red-200'
                              }`}
                          >
                            {service.is_active ? t('services:active') : t('services:inactive')}
                          </button>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-1">
                            {permissions.canEditServices && (
                              <>
                                <button
                                  onClick={() => handleEditService(service)}
                                  className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                                  title={t('common:edit')}
                                >
                                  <Edit size={16} />
                                </button>
                                <button
                                  onClick={() => handleDeleteService(service.id)}
                                  className="p-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                                  title={t('common:delete')}
                                >
                                  <Trash2 size={16} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-20 text-center text-gray-500">
                <Scissors className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p>{t('services:services_not_found')}</p>
              </div>
            )}
          </div>
        </>
      )
      }

      {/* PACKAGES TAB */}
      {
        activeTab === 'packages' && (
          <>
            {/* Info Alert */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-blue-800 font-medium">{t('services:how_special_packages_work')}</p>
                  <ul className="text-blue-700 text-sm mt-2 space-y-1 list-disc list-inside">
                    <li>{t('services:when_client_mentions_keywords_or_promo_code_bot_will_offer_special_price')}</li>
                    <li>{t('services:bot_automatically_recognizes_the_context_of_the_advertising_campaign')}</li>
                    <li>{t('services:packages_can_be_limited_by_time_and_usage_count')}</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Packages Search and Filters */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    type="text"
                    placeholder={t('services:search_packages_promo_codes')}
                    value={packageSearchTerm}
                    onChange={(e) => setPackageSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={packageStatusFilter} onValueChange={(value: any) => setPackageStatusFilter(value)}>
                  <SelectTrigger className="w-full md:w-[200px]">
                    <SelectValue placeholder={t('services:status')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('services:all_packages')}</SelectItem>
                    <SelectItem value="active">{t('services:active')}</SelectItem>
                    <SelectItem value="inactive">{t('services:inactive')}</SelectItem>
                  </SelectContent>
                </Select>
                {/* Кнопка создания только если есть право */}
                {permissions.canEditServices && (
                  <Button
                    className="bg-pink-600 hover:bg-pink-700"
                    onClick={handleOpenAddPackage}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {t('services:create_package')}
                  </Button>
                )}
              </div>
            </div>

            {/* Packages Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAndSortedPackages.map((pkg: SpecialPackage) => (
                <div
                  key={pkg.id}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">{pkg.name_ru}</h3>
                      <p className="text-sm text-gray-500">{pkg.name}</p>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${pkg.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {pkg.is_active ? t('services:active') : t('services:inactive')}
                    </span>
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
                        {pkg.special_price} {pkg.currency}
                      </span>
                      <span className="text-lg text-gray-400 line-through">
                        {pkg.original_price} {pkg.currency}
                      </span>
                    </div>
                    <div className="text-sm text-green-600 font-medium">
                      {t('services:discount')} {pkg.discount_percent}%
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                    {pkg.description_ru || pkg.description}
                  </p>

                  {/* Keywords */}
                  {pkg.keywords.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs text-gray-500 mb-1">{t('services:keywords')}:</p>
                      <div className="flex flex-wrap gap-1">
                        {pkg.keywords.slice(0, 3).map((keyword: string, idx: number) => (
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
                      {new Date(pkg.valid_from).toLocaleDateString()} - {new Date(pkg.valid_until).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Stats */}
                  {pkg.max_usage && (
                    <div className="text-xs text-gray-500 mb-4">
                      {t('services:used')}: {pkg.usage_count} / {pkg.max_usage}
                    </div>
                  )}

                  {/* Actions */}
                  {permissions.canEditServices && (
                    <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditPackage(pkg)}
                        className="flex-1"
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        {t('services:edit')}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleTogglePackageActive(pkg)}
                        className={pkg.is_active ? 'text-orange-600' : 'text-green-600'}
                      >
                        {pkg.is_active ? t('services:disable') : t('services:enable')}
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

            {filteredAndSortedPackages.length === 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 py-20 text-center">
                <Gift className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">{t('services:special_packages_not_found')}</p>
                <Button onClick={handleOpenAddPackage} className="bg-pink-600 hover:bg-pink-700">
                  {t('services:create_first_package')}
                </Button>
              </div>
            )}
          </>
        )
      }

      {/* REFERRALS TAB */}
      {
        activeTab === 'referrals' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 py-20 px-4 sm:px-8 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-blue-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Users className="w-10 h-10 text-blue-600" />
            </div>
            <h3 className="text-2xl font-black text-gray-900 mb-2">{t('services:referral_programs', 'Реферальные программы')}</h3>
            <p className="text-gray-500 mb-8 max-w-md mx-auto font-medium">
              {t('services:referral_programs_management_subtitle', 'Управление программами лояльности и мотивации клиентов через рекомендации.')}
            </p>
            <div className="flex justify-center gap-4">
              <Button
                className="bg-blue-600 hover:bg-blue-700 h-12 px-8 rounded-xl font-bold transition-all hover:scale-105"
                onClick={() => navigate(`${basePath}/referrals`)}
              >
                {t('services:open_marketing_panel', 'Управление кампаниями')}
              </Button>
            </div>
          </div>
        )
      }

      {/* CHALLENGES TAB */}
      {
        activeTab === 'challenges' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 py-20 px-4 sm:px-8 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-pink-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Target className="w-10 h-10 text-pink-600" />
            </div>
            <h3 className="text-2xl font-black text-gray-900 mb-2">{t('services:challenges', 'Челленджи')}</h3>
            <p className="text-gray-500 mb-8 max-w-md mx-auto font-medium">
              {t('services:challenges_management_subtitle', 'Игровые механики и задания для повышения вовлеченности ваших клиентов.')}
            </p>
            <div className="flex justify-center gap-4">
              <Button
                className="bg-pink-600 hover:bg-pink-700 h-12 px-8 rounded-xl font-bold transition-all hover:scale-105"
                onClick={() => navigate(`${basePath}/challenges`)}
              >
                {t('services:open_challenges_panel', 'Управление челленджами')}
              </Button>
            </div>
          </div>
        )
      }

      {/* Service Modal */}
      <Dialog open={isServiceModalOpen} onOpenChange={setIsServiceModalOpen}>
        <DialogContent
          hideCloseButton
          className="w-[95vw] sm:w-[90vw] md:max-w-4xl p-0 flex flex-col h-[90vh] overflow-hidden border-none shadow-2xl rounded-2xl"
        >
          <DialogHeader className="bg-gradient-to-r from-pink-600 to-blue-700 p-8 rounded-t-2xl relative">
            <DialogPrimitive.Close className="absolute top-6 right-6 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors outline-none focus:ring-2 focus:ring-white/30 z-50">
              <X className="w-5 h-5" />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
            <div className="flex items-center gap-3 text-left">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-md">
                <Scissors className="w-6 h-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold text-white leading-tight">
                  {editingService ? t('services:edit_service') : t('services:add_service')}
                </DialogTitle>
                <p className="text-pink-100 text-sm opacity-90">
                  {t('services:service_details_subtitle')}
                </p>
              </div>
            </div>
          </DialogHeader>

          <div id="modal-scroll-viewport" className="flex-1 overflow-y-auto crm-scrollbar outline-none" style={{ WebkitOverflowScrolling: 'touch' }}>
            <div className="p-4 sm:p-8 space-y-8">
              {/* Section 1: Basic Information */}
              <div className="section-container">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-6 bg-pink-500 rounded-full" />
                  <h3 className="text-lg font-semibold text-gray-800">{t('services:basic_info')}</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-gray-50/10 rounded-2xl border border-gray-100/50">
                  <div className="md:col-span-1 flex flex-col gap-1.5">
                    <Label className="text-[11px] font-black uppercase tracking-widest text-gray-400 px-1 leading-none">
                      {t('services:category')} <span className="text-pink-500">*</span>
                    </Label>
                    <Select value={serviceFormData.category} onValueChange={(value) => setServiceFormData({ ...serviceFormData, category: value })}>
                      <SelectTrigger className="!h-12 bg-white border-gray-100 rounded-xl shadow-sm transition-all focus:ring-2 focus:ring-pink-500/20 w-full overflow-hidden">
                        <SelectValue placeholder={t('services:select_category')} />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(cat => (
                          <SelectItem key={cat} value={cat}>{t(`services:category_${cat.toLowerCase().replace(/\s+/g, '_')}`, cat)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="md:col-span-1 flex flex-col gap-1.5">
                    <Label className="text-[11px] font-black uppercase tracking-widest text-gray-400 px-1 leading-none">
                      {t('services:name')} <span className="text-pink-500">*</span>
                    </Label>
                    <Input
                      className="!h-12 bg-white border-gray-100 rounded-xl shadow-sm transition-all focus:ring-2 focus:ring-pink-500/20 w-full"
                      value={serviceFormData.name_ru}
                      onChange={(e) => {
                        const val = e.target.value;
                        setServiceFormData({
                          ...serviceFormData,
                          name_ru: val,
                          name: val,
                          key: editingService ? serviceFormData.key : val.toLowerCase().replace(/\s+/g, '_').replace(/[^\w]/g, '')
                        });
                      }}
                      placeholder={t('services:name_placeholder')}
                    />
                  </div>

                  <div className="md:col-span-2 space-y-2">
                    <Label className="text-[11px] font-black uppercase tracking-widest text-gray-400 block mb-1">
                      {t('services:description')}
                    </Label>
                    <Textarea
                      className="min-h-[100px] bg-white border-gray-100 rounded-xl shadow-sm transition-all focus:ring-2 focus:ring-pink-500/20"
                      value={serviceFormData.description_ru}
                      onChange={(e) => setServiceFormData({
                        ...serviceFormData,
                        description_ru: e.target.value,
                        description: e.target.value
                      })}
                      placeholder={t('services:description')}
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Pricing & Duration */}
              <div className="section-container">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-6 bg-blue-500 rounded-full" />
                  <h3 className="text-lg font-semibold text-gray-800">{t('services:pricing_timing')}</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 p-6 bg-gray-50/10 rounded-2xl border border-gray-100/50">
                  <div className="space-y-2 min-w-0">
                    <Label className="text-[11px] font-black uppercase tracking-widest text-gray-400 block" title={t('services:base_price')}>
                      {t('services:base_price')} <span className="text-pink-500">*</span>
                    </Label>
                    <div className="relative group">
                      <Input
                        type="number"
                        className="h-12 pl-4 pr-16 bg-white border-gray-100 rounded-xl font-bold text-lg shadow-sm transition-all focus:ring-2 focus:ring-pink-500/20 w-full"
                        value={serviceFormData.price}
                        onChange={(e) => setServiceFormData({ ...serviceFormData, price: Number(e.target.value) })}
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm tracking-tight bg-gray-50 px-2 py-1 rounded-md border border-gray-100">
                        {serviceFormData.currency}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 min-w-0">
                    <Label className="text-[11px] font-black uppercase tracking-widest text-gray-400 block" title={t('services:duration')}>
                      {t('services:duration')}
                    </Label>
                    <div className="relative group">
                      <Input
                        className="h-12 pl-4 pr-12 bg-white border-gray-100 rounded-xl font-bold text-lg shadow-sm transition-all focus:ring-2 focus:ring-pink-500/20 w-full"
                        value={serviceFormData.duration}
                        onChange={(e) => setServiceFormData({ ...serviceFormData, duration: e.target.value })}
                        placeholder="60"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm bg-gray-50 px-2 py-1 rounded-md border border-gray-100">
                        {t('services:unit_minute', 'м')}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 min-w-0">
                    <Label className="text-[11px] font-black uppercase tracking-widest text-gray-400 block" title={t('services:min_price')}>
                      {t('services:min_price')}
                    </Label>
                    <div className="relative group">
                      <Input
                        type="number"
                        className="h-12 pl-4 pr-16 bg-white border-gray-100 rounded-xl shadow-sm transition-all focus:ring-2 focus:ring-pink-500/10 placeholder:text-gray-300 w-full"
                        value={serviceFormData.min_price}
                        onChange={(e) => setServiceFormData({ ...serviceFormData, min_price: e.target.value })}
                        placeholder="0"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 font-bold text-sm">
                        {serviceFormData.currency}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 min-w-0">
                    <Label className="text-[11px] font-black uppercase tracking-widest text-gray-400 block" title={t('services:max_price')}>
                      {t('services:max_price')}
                    </Label>
                    <div className="relative group">
                      <Input
                        type="number"
                        className="h-12 pl-4 pr-16 bg-white border-gray-100 rounded-xl shadow-sm transition-all focus:ring-2 focus:ring-pink-500/10 placeholder:text-gray-300 w-full"
                        value={serviceFormData.max_price}
                        onChange={(e) => setServiceFormData({ ...serviceFormData, max_price: e.target.value })}
                        placeholder="0"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 font-bold text-sm">
                        {serviceFormData.currency}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 4: Benefits */}
              <div className="section-container">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-6 bg-green-500 rounded-full" />
                  <h3 className="text-lg font-semibold text-gray-800">{t('services:benefits')}</h3>
                </div>
                <div className="p-6 bg-gray-50/10 rounded-2xl border border-gray-100/50 space-y-2">
                  <Label className="text-[11px] font-black uppercase tracking-widest text-gray-400 block mb-1">
                    {t('services:benefits')} ({t('services:separate_through_pipe', '|')})
                  </Label>
                  <Textarea
                    className="min-h-[80px] bg-white border-gray-100 rounded-xl shadow-sm transition-all focus:ring-2 focus:ring-pink-500/10"
                    value={serviceFormData.benefits}
                    onChange={(e) => setServiceFormData({ ...serviceFormData, benefits: e.target.value })}
                    placeholder={t('services:long_lasting_natural_look_waterproof')}
                  />
                </div>
              </div>

              {/* Section 3: Staffing */}
              <div className="section-container">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-6 bg-blue-500 rounded-full" />
                  <h3 className="text-lg font-semibold text-gray-800">{t('services:staff_settings')}</h3>
                </div>

                <div className="space-y-6 p-6 bg-blue-50/30 rounded-2xl border border-blue-100/50 text-left">
                  <div>
                    <Label className="text-xs font-bold uppercase tracking-wider text-gray-600 mb-3 block">
                      {t('services:positions_can_perform')}
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {positions
                        .filter(pos => !['Директор', 'Администратор', 'SMM-менеджер', 'Таргетолог', 'Менеджер по продажам', 'Старший администратор'].includes(pos.name))
                        .map((pos) => {
                          const isSelected = serviceFormData.position_ids.includes(pos.id);
                          return (
                            <button
                              key={pos.id}
                              type="button"
                              onClick={() => {
                                const newPositionIds = isSelected
                                  ? serviceFormData.position_ids.filter(id => id !== pos.id)
                                  : [...serviceFormData.position_ids, pos.id];

                                const filteredEmployeeIds = serviceFormData.employee_ids.filter(eid => {
                                  const emp = employees.find(e => e.id === eid);
                                  return emp && (newPositionIds.includes(emp.position_id) || newPositionIds.length === 0);
                                });

                                setServiceFormData({
                                  ...serviceFormData,
                                  position_ids: newPositionIds,
                                  employee_ids: filteredEmployeeIds
                                });
                              }}
                              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 border ${isSelected
                                ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-200'
                                : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                                }`}
                            >
                              {i18n.language.startsWith('ru') ? pos.name : (pos.name_en || pos.name)}
                            </button>
                          );
                        })}
                    </div>
                  </div>

                  <div className="space-y-4 max-w-full">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 w-full">
                      <div className="space-y-1 min-w-0 flex-1">
                        <Label className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-gray-600 leading-tight">
                          {t('services:employees_providing_service')}
                        </Label>
                        <p className="text-[10px] text-gray-400 font-medium leading-relaxed">
                          {t('services:select_employees_desc', 'Выберите сотрудников, которые оказывают эту услугу')}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-4 w-full relative">
                      <div className="flex flex-wrap items-center gap-3 w-full">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="h-12 px-5 bg-white border-gray-100 rounded-xl shadow-sm hover:border-pink-200 flex items-center gap-3 w-full sm:w-auto sm:min-w-[280px] justify-between group transition-all"
                            >
                              <div className="flex items-center gap-2 overflow-hidden">
                                <Users className="w-4 h-4 text-pink-500" />
                                <span className="text-sm font-medium text-gray-700 truncate">
                                  {serviceFormData.employee_ids.length > 0
                                    ? `${t('services:selected_count', { count: serviceFormData.employee_ids.length })}: ${serviceFormData.employee_ids.length}`
                                    : t('services:select_employees', 'Выбрать сотрудников')}
                                </span>
                              </div>
                              <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-pink-500 transition-colors" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent
                            className="w-[calc(100vw-2rem)] sm:w-[320px] p-0 rounded-2xl shadow-2xl z-[80] border border-gray-100 flex flex-col bg-white overflow-hidden max-h-[var(--radix-popover-content-available-height)]"
                            style={{ maxHeight: 'var(--radix-popover-content-available-height)' }}
                            align="center"
                            side="bottom"
                            sideOffset={4}
                            collisionPadding={12}
                            avoidCollisions={true}
                            onWheel={(e) => e.stopPropagation()}
                            onTouchMove={(e) => e.stopPropagation()}
                            onOpenAutoFocus={(e) => e.preventDefault()}
                          >
                            <Command className="flex flex-col w-full h-full max-h-[300px] sm:max-h-[380px]">
                              <div className="flex flex-col border-b">
                                <CommandInput
                                  placeholder={t('services:search_employee', 'Поиск сотрудника...')}
                                  className="h-full border-none focus:ring-0 text-sm w-full"
                                  value={employeeSearchTerm}
                                  onValueChange={setEmployeeSearchTerm}
                                />
                                <div className="px-4 py-2 bg-gray-50/50 flex items-center justify-between border-b">
                                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                    {t('services:actions', 'Действия')}
                                  </span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-3 text-[10px] font-black uppercase text-pink-600 hover:text-pink-700 hover:bg-pink-50 rounded-lg transition-all"
                                    onClick={() => {
                                      const currentFiltered = employees.filter(emp => {
                                        const matchesPos = serviceFormData.position_ids.length === 0 ||
                                          !emp.position_id ||
                                          serviceFormData.position_ids.includes(emp.position_id) ||
                                          serviceFormData.employee_ids.includes(emp.id);
                                        const employeeName = (i18n.language.startsWith('ru') ? emp.full_name_ru : emp.full_name) || '';
                                        const matchesSearch = employeeName.toLowerCase().includes(employeeSearchTerm.toLowerCase());
                                        return matchesPos && matchesSearch;
                                      });

                                      const allSelected = currentFiltered.every(emp => serviceFormData.employee_ids.includes(emp.id));

                                      let newEmployeeIds;
                                      if (allSelected) {
                                        newEmployeeIds = serviceFormData.employee_ids.filter(id => !currentFiltered.find(f => f.id === id));
                                      } else {
                                        newEmployeeIds = Array.from(new Set([...serviceFormData.employee_ids, ...currentFiltered.map(e => e.id)]));
                                      }
                                      setServiceFormData({ ...serviceFormData, employee_ids: newEmployeeIds });
                                    }}
                                  >
                                    {(() => {
                                      const currentFiltered = employees.filter(emp => {
                                        const matchesPos = serviceFormData.position_ids.length === 0 ||
                                          !emp.position_id ||
                                          serviceFormData.position_ids.includes(emp.position_id) ||
                                          serviceFormData.employee_ids.includes(emp.id);
                                        const employeeName = (i18n.language.startsWith('ru') ? emp.full_name_ru : emp.full_name) || '';
                                        const matchesSearch = employeeName.toLowerCase().includes(employeeSearchTerm.toLowerCase());
                                        return matchesPos && matchesSearch;
                                      });
                                      return currentFiltered.length > 0 && currentFiltered.every(emp => serviceFormData.employee_ids.includes(emp.id))
                                        ? t('services:deselect_all', 'Сбросить всех')
                                        : t('services:select_all', 'Выбрать всех');
                                    })()}
                                  </Button>
                                </div>
                              </div>
                              <CommandList className="flex-1 overflow-y-auto crm-scrollbar overscroll-contain">
                                <CommandEmpty className="p-8 text-center bg-white">
                                  <div className="bg-pink-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <Search className="w-5 h-5 text-pink-200" />
                                  </div>
                                  <p className="text-sm text-gray-500 font-medium">
                                    {t('services:no_employees_found', 'Сотрудники не найдены')}
                                  </p>
                                </CommandEmpty>
                                <CommandGroup className="p-2">
                                  {employees
                                    .filter(emp => {
                                      const matchesPos = serviceFormData.position_ids.length === 0 ||
                                        !emp.position_id ||
                                        serviceFormData.position_ids.includes(emp.position_id) ||
                                        serviceFormData.employee_ids.includes(emp.id);
                                      const employeeName = (i18n.language.startsWith('ru') ? emp.full_name_ru : emp.full_name) || '';
                                      const matchesSearch = employeeName.toLowerCase().includes(employeeSearchTerm.toLowerCase());
                                      return matchesPos && matchesSearch;
                                    })
                                    .map((employee) => {
                                      const isSelected = serviceFormData.employee_ids.includes(employee.id);
                                      const employeeName = i18n.language.startsWith('ru') ? employee.full_name_ru : employee.full_name;
                                      if (!employeeName || employeeName.trim() === '') return null;

                                      return (
                                        <CommandItem
                                          key={employee.id}
                                          onSelect={() => {
                                            const newEmployeeIds = isSelected
                                              ? serviceFormData.employee_ids.filter(id => id !== employee.id)
                                              : [...serviceFormData.employee_ids, employee.id];
                                            setServiceFormData({ ...serviceFormData, employee_ids: newEmployeeIds });
                                          }}
                                          className="flex items-center gap-3 px-3 py-2.5 cursor-pointer rounded-lg hover:bg-pink-50 transition-colors mb-1 last:mb-0"
                                        >
                                          <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${isSelected ? 'bg-pink-600 border-pink-600 rotate-0 scale-100' : 'border-gray-200 bg-white rotate-90 scale-90'}`}>
                                            {isSelected && <Check className="w-3.5 h-3.5 text-white stroke-[3px]" />}
                                          </div>
                                          <div className="flex flex-col min-w-0 w-full">
                                            <span className={`text-sm font-semibold truncate ${isSelected ? 'text-pink-600' : 'text-gray-800'}`}>
                                              {employeeName}
                                            </span>
                                            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                                              {(() => {
                                                const pos = positions.find(p => p.id === employee.position_id);
                                                return pos ? (i18n.language.startsWith('ru') ? pos.name : (pos.name_en || pos.name)) : (employee.position || '');
                                              })()}
                                            </span>
                                          </div>
                                        </CommandItem>
                                      );
                                    })}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </div>

                      {/* Selected tags display */}
                      {serviceFormData.employee_ids.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-100/50">
                          {serviceFormData.employee_ids.map(eid => {
                            const emp = employees.find(e => e.id === eid);
                            if (!emp) return null;
                            const employeeName = i18n.language.startsWith('ru') ? emp.full_name_ru : emp.full_name;
                            return (
                              <div key={eid} className="flex items-center gap-1.5 px-3 py-1.5 bg-pink-50 border border-pink-100 rounded-lg text-xs font-semibold text-pink-700 animate-in fade-in zoom-in duration-200">
                                <span>{employeeName}</span>
                                <button
                                  type="button"
                                  onClick={() => setServiceFormData({
                                    ...serviceFormData,
                                    employee_ids: serviceFormData.employee_ids.filter(id => id !== eid)
                                  })}
                                  className="hover:text-pink-900 transition-colors"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 bg-gray-50 border-t flex justify-end gap-4 rounded-b-2xl">
            <Button variant="ghost" onClick={() => setIsServiceModalOpen(false)}>
              {t('services:cancel')}
            </Button>
            <Button
              onClick={handleSaveService}
              className="bg-gradient-to-r from-pink-600 to-blue-700 text-white font-bold h-12 px-10 shadow-lg shadow-pink-200 transition-all hover:scale-[1.02] active:scale-[0.98]"
              disabled={saving}
            >
              {saving ? t('services:saving') : t('services:save')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Package Modal */}
      <Dialog open={isPackageModalOpen} onOpenChange={setIsPackageModalOpen}>
        <DialogContent className="max-w-3xl p-0 flex flex-col max-h-[90vh]">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle>
              {editingPackage ? t('services:edit_package') : t('services:create_package')}
            </DialogTitle>
          </DialogHeader>

          <div className="crm-form-content px-6 py-4">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="pkgName">{t('services:name')} (EN) *</Label>
                  <Input
                    id="pkgName"
                    value={packageFormData.name}
                    onChange={(e) => setPackageFormData({ ...packageFormData, name: e.target.value })}
                    placeholder={t('services:summer_special_package')}
                  />
                </div>
                <div>
                  <Label htmlFor="pkgNameRu">{t('services:name')} (RU) *</Label>
                  <Input
                    id="pkgNameRu"
                    value={packageFormData.name_ru}
                    onChange={(e) => setPackageFormData({ ...packageFormData, name_ru: e.target.value })}
                    placeholder={t('services:summer_special_package')}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="pkgDescRu">{t('services:description')} (RU)</Label>
                <Textarea
                  id="pkgDescRu"
                  value={packageFormData.description_ru}
                  onChange={(e) => setPackageFormData({ ...packageFormData, description_ru: e.target.value })}
                  placeholder={t('services:includes_manicure_pedicure_at_special_price')}
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="origPrice">{t('services:original_price')} *</Label>
                  <Input
                    id="origPrice"
                    type="number"
                    value={packageFormData.original_price}
                    onChange={(e) => setPackageFormData({ ...packageFormData, original_price: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label htmlFor="specPrice">{t('services:special_price')} *</Label>
                  <Input
                    id="specPrice"
                    type="number"
                    value={packageFormData.special_price}
                    onChange={(e) => setPackageFormData({ ...packageFormData, special_price: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>{t('services:discount')}</Label>
                  <div className="h-10 flex items-center text-2xl font-bold text-green-600">
                    {calculateDiscount()}%
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="promoCode">{t('services:promo_code')}</Label>
                  <Input
                    id="promoCode"
                    value={packageFormData.promo_code}
                    onChange={(e) => setPackageFormData({ ...packageFormData, promo_code: e.target.value.toUpperCase() })}
                    placeholder={t('services:summer2026')}
                  />
                </div>
                <div>
                  <Label htmlFor="maxUsage">{t('services:max_usage')}</Label>
                  <Input
                    id="maxUsage"
                    type="number"
                    value={packageFormData.max_usage}
                    onChange={(e) => setPackageFormData({ ...packageFormData, max_usage: Number(e.target.value) })}
                    placeholder={t('services:0_no_limit')}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="keywords">{t('services:keywords')} ({t('services:separate_through_comma')}) *</Label>
                <Textarea
                  id="keywords"
                  value={packageFormData.keywords}
                  onChange={(e) => setPackageFormData({ ...packageFormData, keywords: e.target.value })}
                  placeholder={t('services:summer_promo_manicure_pedicure_together')}
                  rows={2}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {t('services:when_client_mentions_these_words_bot_will_offer_this_package')}
                </p>
              </div>

              <div>
                <Label htmlFor="services">{t('services:included_services')} ({t('services:separate_through_comma')})</Label>
                <Textarea
                  id="services"
                  value={packageFormData.services_included}
                  onChange={(e) => setPackageFormData({ ...packageFormData, services_included: e.target.value })}
                  placeholder={t('services:manicure_gelish_pedicure_gelish')}
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="validFrom">{t('services:valid_from')} *</Label>
                  <Input
                    id="validFrom"
                    type="date"
                    value={packageFormData.valid_from}
                    onChange={(e) => setPackageFormData({ ...packageFormData, valid_from: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="validUntil">{t('services:valid_until')} *</Label>
                  <Input
                    id="validUntil"
                    type="date"
                    value={packageFormData.valid_until}
                    onChange={(e) => setPackageFormData({ ...packageFormData, valid_until: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="pkgActive"
                  checked={packageFormData.is_active}
                  onChange={(e) => setPackageFormData({ ...packageFormData, is_active: e.target.checked })}
                  className="w-4 h-4 text-pink-600 rounded"
                />
                <Label htmlFor="pkgActive" className="cursor-pointer">
                  {t('services:active')} ({t('services:available_for_clients')})
                </Label>
              </div>

              {/* Scheduling Section */}
              <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="pkgScheduled"
                    checked={packageFormData.scheduled}
                    onChange={(e) => setPackageFormData({ ...packageFormData, scheduled: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <Label htmlFor="pkgScheduled" className="cursor-pointer">
                    {t('services:schedule_activation', { defaultValue: 'Schedule Activation' })}
                  </Label>
                </div>

                {packageFormData.scheduled && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>{t('services:activation_date', { defaultValue: 'Activation Date' })}</Label>
                        <Input
                          type="date"
                          value={packageFormData.schedule_date}
                          onChange={(e) => setPackageFormData({ ...packageFormData, schedule_date: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>{t('services:activation_time', { defaultValue: 'Activation Time' })}</Label>
                        <Input
                          type="time"
                          value={packageFormData.schedule_time}
                          onChange={(e) => setPackageFormData({ ...packageFormData, schedule_time: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="pkgAutoActivate"
                          checked={packageFormData.auto_activate}
                          onChange={(e) => setPackageFormData({ ...packageFormData, auto_activate: e.target.checked })}
                          className="w-4 h-4"
                        />
                        <Label htmlFor="pkgAutoActivate" className="cursor-pointer">
                          {t('services:auto_activate', { defaultValue: 'Auto-activate on schedule date' })}
                        </Label>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="pkgAutoDeactivate"
                          checked={packageFormData.auto_deactivate}
                          onChange={(e) => setPackageFormData({ ...packageFormData, auto_deactivate: e.target.checked })}
                          className="w-4 h-4"
                        />
                        <Label htmlFor="pkgAutoDeactivate" className="cursor-pointer">
                          {t('services:auto_deactivate', { defaultValue: 'Auto-deactivate after valid_until date' })}
                        </Label>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="crm-modal-footer px-6 py-4 border-t">
            <Button variant="outline" onClick={() => setIsPackageModalOpen(false)}>
              {t('services:cancel')}
            </Button>
            <Button
              onClick={handleSavePackage}
              className="bg-pink-600 hover:bg-pink-700"
              disabled={saving}
            >
              {saving ? t('services:saving') : t('services:save')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Referral Campaigns Modal */}
      <Dialog open={isReferralModalOpen} onOpenChange={setIsReferralModalOpen}>
        <DialogContent className="max-w-2xl p-0 flex flex-col max-h-[90vh]">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle>
              {editingCampaign ? t('services:edit_campaign', 'Редактировать кампанию') : t('services:create_referral_campaign', 'Создать реферальную кампанию')}
            </DialogTitle>
          </DialogHeader>

          <div className="crm-form-content px-6 py-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="campaignName">{t('services:campaign_name', 'Название кампании')} *</Label>
                <Input
                  id="campaignName"
                  value={referralFormData.name}
                  onChange={(e) => setReferralFormData({ ...referralFormData, name: e.target.value })}
                  placeholder={t('services:promo_placeholder', 'Приведи друга - получи бонус')}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="bonusPoints">{t('services:bonus_for_invited', 'Бонус приглашенному')}</Label>
                  <Input
                    id="bonusPoints"
                    type="number"
                    value={referralFormData.bonus_points}
                    onChange={(e) => setReferralFormData({ ...referralFormData, bonus_points: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label htmlFor="referrerBonus">{t('services:bonus_for_referrer', 'Бонус приглашающему')}</Label>
                  <Input
                    id="referrerBonus"
                    type="number"
                    value={referralFormData.referrer_bonus}
                    onChange={(e) => setReferralFormData({ ...referralFormData, referrer_bonus: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="targetType">{t('services:target_audience', 'Целевая аудитория')}</Label>
                <Select
                  value={referralFormData.target_type}
                  onValueChange={(value: any) => setReferralFormData({ ...referralFormData, target_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('services:select_audience', 'Выберите аудиторию')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('services:all_clients', 'Все клиенты')}</SelectItem>
                    <SelectItem value="by_inactivity">{t('services:inactive_clients', 'Неактивные клиенты')}</SelectItem>
                    <SelectItem value="by_master">{t('services:clients_of_master', 'Клиенты мастера')}</SelectItem>
                    <SelectItem value="by_service">{t('services:clients_of_service', 'Клиенты услуги')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {referralFormData.target_type === 'by_inactivity' && (
                <div>
                  <Label htmlFor="daysInactive">{t('services:days_inactive', 'Дней без посещения')}</Label>
                  <Input
                    id="daysInactive"
                    type="number"
                    value={referralFormData.days_inactive}
                    onChange={(e) => setReferralFormData({ ...referralFormData, days_inactive: Number(e.target.value) })}
                    placeholder="30"
                  />
                </div>
              )}

              {referralFormData.target_type === 'by_master' && (
                <div className="space-y-4">
                  <div>
                    <Label>{t('services:select_master', 'Выберите мастера')}</Label>
                    {mastersLoading ? (
                      <div className="flex items-center gap-2 p-2 text-gray-500">
                        <Loader className="w-4 h-4 animate-spin" /> {t('common:loading', 'Загрузка...')}
                      </div>
                    ) : mastersList.length === 0 ? (
                      <p className="text-sm text-gray-500 p-2">{t('services:no_masters_found', 'Мастера не найдены')}</p>
                    ) : (
                      <Select
                        value={referralFormData.master_id?.toString() || ''}
                        onValueChange={async (value) => {
                          const masterId = Number(value);
                          setReferralFormData({ ...referralFormData, master_id: masterId, client_ids: [] });
                          // Load clients of this master
                          setClientsLoading(true);
                          try {
                            const res = await fetch(`/api/clients?master_id=${masterId}`, { credentials: 'include' });
                            const data = await res.json();
                            setClientsOfMaster(data.clients || []);
                          } catch (e) {
                            console.error('Error loading clients:', e);
                          } finally {
                            setClientsLoading(false);
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t('services:select_master', 'Выберите мастера')} />
                        </SelectTrigger>
                        <SelectContent>
                          {mastersList.map((master) => (
                            <SelectItem key={master.id} value={master.id.toString()}>
                              {master.full_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  {referralFormData.master_id && (
                    <div>
                      <Label>{t('services:clients_of_master', 'Клиенты мастера')}</Label>
                      {clientsLoading ? (
                        <div className="flex items-center gap-2 p-2 text-gray-500">
                          <Loader className="w-4 h-4 animate-spin" /> {t('common:loading', 'Загрузка...')}
                        </div>
                      ) : clientsOfMaster.length === 0 ? (
                        <p className="text-sm text-gray-500 p-2">{t('services:no_clients_for_master', 'У этого мастера нет клиентов')}</p>
                      ) : (
                        <div className="space-y-2">
                          {/* Search and Select All/None */}
                          <div className="flex gap-2 mb-2">
                            <Input
                              placeholder={t('services:search_clients', 'Поиск клиентов...')}
                              value={referralFormData.clientSearch || ''}
                              onChange={(e) => setReferralFormData({ ...referralFormData, clientSearch: e.target.value })}
                              className="flex-1"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setReferralFormData({
                                ...referralFormData,
                                client_ids: clientsOfMaster.map(c => c.id)
                              })}
                            >
                              {t('services:select_all', 'Все')}
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setReferralFormData({ ...referralFormData, client_ids: [] })}
                            >
                              {t('services:deselect_all', 'Сброс')}
                            </Button>
                          </div>
                          <p className="text-xs text-gray-500">
                            {t('services:selected_count', 'Выбрано')}: {referralFormData.client_ids.length} / {clientsOfMaster.length}
                          </p>
                          <div className="border rounded-md p-3 max-h-48 overflow-y-auto">
                            <div className="space-y-1">
                              {clientsOfMaster
                                .filter(client =>
                                  !referralFormData.clientSearch ||
                                  (client.name || client.id).toLowerCase().includes((referralFormData.clientSearch || '').toLowerCase())
                                )
                                .map((client) => (
                                  <label key={client.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                                    <input
                                      type="checkbox"
                                      checked={referralFormData.client_ids.includes(client.id)}
                                      onChange={(e) => {
                                        const newClientIds = e.target.checked
                                          ? [...referralFormData.client_ids, client.id]
                                          : referralFormData.client_ids.filter(id => id !== client.id);
                                        setReferralFormData({ ...referralFormData, client_ids: newClientIds });
                                      }}
                                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                    />
                                    <span className="text-sm">{client.name || client.id}</span>
                                  </label>
                                ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {referralFormData.target_type === 'by_service' && (
                <div className="space-y-4">
                  <div>
                    <Label>{t('services:select_service', 'Выберите услугу')}</Label>
                    <Select
                      value={referralFormData.service_id?.toString() || ''}
                      onValueChange={async (value) => {
                        const serviceId = Number(value);
                        setReferralFormData({ ...referralFormData, service_id: serviceId, client_ids: [] });
                        // Load clients who used this service
                        setClientsLoading(true);
                        try {
                          const res = await fetch(`/api/clients?service_id=${serviceId}`, { credentials: 'include' });
                          const data = await res.json();
                          setClientsOfMaster(data.clients || []);
                        } catch (e) {
                          console.error('Error loading clients:', e);
                        } finally {
                          setClientsLoading(false);
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('services:select_service', 'Выберите услугу')} />
                      </SelectTrigger>
                      <SelectContent>
                        {services.map((service) => (
                          <SelectItem key={service.id} value={service.id.toString()}>
                            {i18n.language === 'ru' ? service.name_ru : service.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {referralFormData.service_id && (
                    <div>
                      <Label>{t('services:clients_of_service', 'Клиенты, использовавшие услугу')}</Label>
                      {clientsLoading ? (
                        <div className="flex items-center gap-2 p-2 text-gray-500">
                          <Loader className="w-4 h-4 animate-spin" /> {t('common:loading', 'Загрузка...')}
                        </div>
                      ) : clientsOfMaster.length === 0 ? (
                        <p className="text-sm text-gray-500 p-2">{t('services:no_clients_for_service', 'Клиенты не найдены')}</p>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex gap-2 mb-2">
                            <Input
                              placeholder={t('services:search_clients', 'Поиск клиентов...')}
                              value={referralFormData.clientSearch || ''}
                              onChange={(e) => setReferralFormData({ ...referralFormData, clientSearch: e.target.value })}
                              className="flex-1"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setReferralFormData({
                                ...referralFormData,
                                client_ids: clientsOfMaster.map(c => c.id)
                              })}
                            >
                              {t('services:select_all', 'Все')}
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setReferralFormData({ ...referralFormData, client_ids: [] })}
                            >
                              {t('services:deselect_all', 'Сброс')}
                            </Button>
                          </div>
                          <p className="text-xs text-gray-500">
                            {t('services:selected_count', 'Выбрано')}: {referralFormData.client_ids.length} / {clientsOfMaster.length}
                          </p>
                          <div className="border rounded-md p-3 max-h-48 overflow-y-auto">
                            <div className="space-y-1">
                              {clientsOfMaster
                                .filter(client =>
                                  !referralFormData.clientSearch ||
                                  (client.name || client.id).toLowerCase().includes((referralFormData.clientSearch || '').toLowerCase())
                                )
                                .map((client) => (
                                  <label key={client.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                                    <input
                                      type="checkbox"
                                      checked={referralFormData.client_ids.includes(client.id)}
                                      onChange={(e) => {
                                        const newClientIds = e.target.checked
                                          ? [...referralFormData.client_ids, client.id]
                                          : referralFormData.client_ids.filter(id => id !== client.id);
                                        setReferralFormData({ ...referralFormData, client_ids: newClientIds });
                                      }}
                                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                    />
                                    <span className="text-sm">{client.name || client.id}</span>
                                  </label>
                                ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {referralFormData.target_type === 'by_inactivity' && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="daysInactive">{t('services:days_inactive', 'Дней без посещения')}</Label>
                    <Input
                      id="daysInactive"
                      type="number"
                      value={referralFormData.days_inactive}
                      onChange={(e) => setReferralFormData({ ...referralFormData, days_inactive: Number(e.target.value) })}
                      placeholder="30"
                    />
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={async () => {
                      setClientsLoading(true);
                      try {
                        const res = await fetch(`/api/clients?inactive_days=${referralFormData.days_inactive}`, { credentials: 'include' });
                        const data = await res.json();
                        setClientsOfMaster(data.clients || []);
                      } catch (e) {
                        console.error('Error loading inactive clients:', e);
                      } finally {
                        setClientsLoading(false);
                      }
                    }}
                  >
                    {t('services:load_inactive_clients', 'Загрузить неактивных клиентов')}
                  </Button>

                  {clientsOfMaster.length > 0 && (
                    <div>
                      <Label>{t('services:inactive_clients', 'Неактивные клиенты')}</Label>
                      <div className="space-y-2">
                        <div className="flex gap-2 mb-2">
                          <Input
                            placeholder={t('services:search_clients', 'Поиск клиентов...')}
                            value={referralFormData.clientSearch || ''}
                            onChange={(e) => setReferralFormData({ ...referralFormData, clientSearch: e.target.value })}
                            className="flex-1"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setReferralFormData({
                              ...referralFormData,
                              client_ids: clientsOfMaster.map(c => c.id)
                            })}
                          >
                            {t('services:select_all', 'Все')}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setReferralFormData({ ...referralFormData, client_ids: [] })}
                          >
                            {t('services:deselect_all', 'Сброс')}
                          </Button>
                        </div>
                        <p className="text-xs text-gray-500">
                          {t('services:selected_count', 'Выбрано')}: {referralFormData.client_ids.length} / {clientsOfMaster.length}
                        </p>
                        <div className="border rounded-md p-3 max-h-48 overflow-y-auto">
                          <div className="space-y-1">
                            {clientsOfMaster
                              .filter(client =>
                                !referralFormData.clientSearch ||
                                (client.name || client.id).toLowerCase().includes((referralFormData.clientSearch || '').toLowerCase())
                              )
                              .map((client) => (
                                <label key={client.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                                  <input
                                    type="checkbox"
                                    checked={referralFormData.client_ids.includes(client.id)}
                                    onChange={(e) => {
                                      const newClientIds = e.target.checked
                                        ? [...referralFormData.client_ids, client.id]
                                        : referralFormData.client_ids.filter(id => id !== client.id);
                                      setReferralFormData({ ...referralFormData, client_ids: newClientIds });
                                    }}
                                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                  />
                                  <span className="text-sm">{client.name || client.id}</span>
                                </label>
                              ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}


              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="campaignActive"
                  checked={referralFormData.is_active}
                  onChange={(e) => setReferralFormData({ ...referralFormData, is_active: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <Label htmlFor="campaignActive" className="cursor-pointer">
                  {t('services:active_label', 'Активна (клиенты могут использовать)')}
                </Label>
              </div>
            </div>
          </div>

          <div className="crm-modal-footer px-6 py-4 border-t">
            <Button variant="outline" onClick={() => setIsReferralModalOpen(false)}>
              {t('common:cancel', 'Отмена')}
            </Button>
            <Button
              onClick={async () => {
                try {
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
                    start_date: referralFormData.start_date || null,
                    end_date: referralFormData.end_date || null
                  };

                  if (editingCampaign) {
                    await fetch(`/api/referral-campaigns/${editingCampaign.id}`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(payload)
                    });
                    toast.success(t('services:referral_campaign_updated'));
                  } else {
                    await fetch('/api/referral-campaigns', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(payload)
                    });
                    toast.success(t('services:referral_campaign_created'));
                  }

                  const res = await fetch('/api/referral-campaigns');
                  const data = await res.json();
                  setCampaigns(data.campaigns || []);
                  setIsReferralModalOpen(false);
                } catch (e) {
                  toast.error(t('services:error_saving'));
                }
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {editingCampaign ? t('common:save', 'Сохранить') : t('common:create', 'Создать')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Challenge Modal */}
      <Dialog open={isChallengeModalOpen} onOpenChange={setIsChallengeModalOpen}>
        <DialogContent className="max-w-xl p-0 flex flex-col max-h-[90vh]">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle>{editingChallenge ? t('services:edit_challenge') : t('services:add_challenge')}</DialogTitle>
          </DialogHeader>
          <div className="crm-form-content px-6 py-4">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t('services:title_ru')}</Label>
                  <Input value={challengeFormData.title_ru} onChange={e => setChallengeFormData({ ...challengeFormData, title_ru: e.target.value })} />
                </div>
                <div>
                  <Label>{t('services:title_en')}</Label>
                  <Input value={challengeFormData.title_en} onChange={e => setChallengeFormData({ ...challengeFormData, title_en: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>{t('services:description_ru')}</Label>
                <Textarea value={challengeFormData.description_ru} onChange={e => setChallengeFormData({ ...challengeFormData, description_ru: e.target.value })} />
              </div>
              <div>
                <Label>{t('services:description_en')}</Label>
                <Textarea value={challengeFormData.description_en} onChange={e => setChallengeFormData({ ...challengeFormData, description_en: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t('services:bonus_points')}</Label>
                  <Input type="number" value={challengeFormData.bonus_points} onChange={e => setChallengeFormData({ ...challengeFormData, bonus_points: Number(e.target.value) })} />
                </div>
                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={challengeFormData.is_active} onChange={e => setChallengeFormData({ ...challengeFormData, is_active: e.target.checked })} className="w-4 h-4" />
                    <span className="text-sm">{t('services:active')}</span>
                  </label>
                </div>
              </div>

              {/* Target Audience Selection for Challenges */}
              <div>
                <Label>{t('services:target_audience', 'Целевая аудитория')}</Label>
                <Select value={challengeFormData.target_type} onValueChange={(value: any) => setChallengeFormData({ ...challengeFormData, target_type: value })}>
                  <SelectTrigger><SelectValue placeholder={t('services:select_audience', 'Выберите аудиторию')} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('services:all_clients', 'Все клиенты')}</SelectItem>
                    <SelectItem value="by_inactivity">{t('services:inactive_clients', 'Неактивные клиенты')}</SelectItem>
                    <SelectItem value="by_master">{t('services:clients_of_master', 'Клиенты мастера')}</SelectItem>
                    <SelectItem value="by_service">{t('services:clients_of_service', 'Клиенты услуги')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {challengeFormData.target_type === 'by_master' && (
                <div className="space-y-4">
                  <div>
                    <Label>{t('services:select_master', 'Выберите мастера')}</Label>
                    {mastersLoading ? (
                      <div className="flex items-center gap-2 p-2 text-gray-500"><Loader className="w-4 h-4 animate-spin" /> {t('common:loading')}</div>
                    ) : mastersList.length === 0 ? (
                      <p className="text-sm text-gray-500 p-2">{t('services:no_masters_found', 'Мастера не найдены')}</p>
                    ) : (
                      <Select value={challengeFormData.master_id?.toString() || ''} onValueChange={async (value) => {
                        const masterId = Number(value);
                        setChallengeFormData({ ...challengeFormData, master_id: masterId, client_ids: [] });
                        setClientsLoading(true);
                        try {
                          const res = await fetch(`/api/clients?master_id=${masterId}`, { credentials: 'include' });
                          const data = await res.json();
                          setClientsOfMaster(data.clients || []);
                        } catch (e) {
                          console.error('Error loading clients:', e);
                        } finally {
                          setClientsLoading(false);
                        }
                      }}>
                        <SelectTrigger><SelectValue placeholder={t('services:select_master', 'Выберите мастера')} /></SelectTrigger>
                        <SelectContent>{mastersList.map((master) => (<SelectItem key={master.id} value={master.id.toString()}>{master.full_name}</SelectItem>))}</SelectContent>
                      </Select>
                    )}
                  </div>
                  {challengeFormData.master_id && (
                    <div>
                      <Label>{t('services:master_clients', 'Клиенты мастера')}</Label>
                      {clientsLoading ? (<div className="flex items-center gap-2 p-2 text-gray-500"><Loader className="w-4 h-4 animate-spin" /> {t('common:loading')}</div>
                      ) : clientsOfMaster.length === 0 ? (<p className="text-sm text-gray-500 p-2">{t('services:no_clients_found', 'Клиенты не найдены')}</p>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex gap-2 mb-2">
                            <Input placeholder={t('services:search_clients', 'Поиск клиентов...')} value={challengeFormData.clientSearch || ''} onChange={(e) => setChallengeFormData({ ...challengeFormData, clientSearch: e.target.value })} className="flex-1" />
                            <Button type="button" variant="outline" size="sm" onClick={() => setChallengeFormData({ ...challengeFormData, client_ids: clientsOfMaster.map(c => c.id) })}>{t('services:select_all', 'Все')}</Button>
                            <Button type="button" variant="outline" size="sm" onClick={() => setChallengeFormData({ ...challengeFormData, client_ids: [] })}>{t('services:deselect_all', 'Сброс')}</Button>
                          </div>
                          <p className="text-xs text-gray-500">{t('services:selected_count', 'Выбрано')}: {challengeFormData.client_ids.length} / {clientsOfMaster.length}</p>
                          <div className="border rounded-md p-3 max-h-48 overflow-y-auto">
                            <div className="space-y-1">{clientsOfMaster.filter(client => !challengeFormData.clientSearch || (client.name || client.id).toLowerCase().includes((challengeFormData.clientSearch || '').toLowerCase())).map((client) => (
                              <label key={client.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                                <input type="checkbox" checked={challengeFormData.client_ids.includes(client.id)} onChange={(e) => {
                                  const newClientIds = e.target.checked ? [...challengeFormData.client_ids, client.id] : challengeFormData.client_ids.filter(id => id !== client.id);
                                  setChallengeFormData({ ...challengeFormData, client_ids: newClientIds });
                                }} className="w-4 h-4 text-pink-600 rounded focus:ring-pink-500" />
                                <span className="text-sm">{client.name || client.id}</span>
                              </label>
                            ))}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {challengeFormData.target_type === 'by_service' && (
                <div className="space-y-4">
                  <div>
                    <Label>{t('services:select_service', 'Выберите услугу')}</Label>
                    <Select value={challengeFormData.service_id?.toString() || ''} onValueChange={async (value) => {
                      const serviceId = Number(value);
                      setChallengeFormData({ ...challengeFormData, service_id: serviceId, client_ids: [] });
                      setClientsLoading(true);
                      try {
                        const res = await fetch(`/api/clients?service_id=${serviceId}`, { credentials: 'include' });
                        const data = await res.json();
                        setClientsOfMaster(data.clients || []);
                      } catch (e) {
                        console.error('Error loading clients:', e);
                      } finally {
                        setClientsLoading(false);
                      }
                    }}>
                      <SelectTrigger><SelectValue placeholder={t('services:select_service', 'Выберите услугу')} /></SelectTrigger>
                      <SelectContent>{services.map((service) => (<SelectItem key={service.id} value={service.id.toString()}>{i18n.language === 'ru' ? service.name_ru : service.name}</SelectItem>))}</SelectContent>
                    </Select>
                  </div>
                  {challengeFormData.service_id && (
                    <div>
                      <Label>{t('services:service_clients', 'Клиенты, использовавшие услугу')}</Label>
                      {clientsLoading ? (<div className="flex items-center gap-2 p-2 text-gray-500"><Loader className="w-4 h-4 animate-spin" /> {t('common:loading')}</div>
                      ) : clientsOfMaster.length === 0 ? (<p className="text-sm text-gray-500 p-2">{t('services:no_clients_found', 'Клиенты не найдены')}</p>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex gap-2 mb-2">
                            <Input placeholder={t('services:search_clients', 'Поиск клиентов...')} value={challengeFormData.clientSearch || ''} onChange={(e) => setChallengeFormData({ ...challengeFormData, clientSearch: e.target.value })} className="flex-1" />
                            <Button type="button" variant="outline" size="sm" onClick={() => setChallengeFormData({ ...challengeFormData, client_ids: clientsOfMaster.map(c => c.id) })}>{t('services:select_all', 'Все')}</Button>
                            <Button type="button" variant="outline" size="sm" onClick={() => setChallengeFormData({ ...challengeFormData, client_ids: [] })}>{t('services:deselect_all', 'Сброс')}</Button>
                          </div>
                          <p className="text-xs text-gray-500">{t('services:selected_count', 'Выбрано')}: {challengeFormData.client_ids.length} / {clientsOfMaster.length}</p>
                          <div className="border rounded-md p-3 max-h-48 overflow-y-auto">
                            <div className="space-y-1">{clientsOfMaster.filter(client => !challengeFormData.clientSearch || (client.name || client.id).toLowerCase().includes((challengeFormData.clientSearch || '').toLowerCase())).map((client) => (
                              <label key={client.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                                <input type="checkbox" checked={challengeFormData.client_ids.includes(client.id)} onChange={(e) => {
                                  const newClientIds = e.target.checked ? [...challengeFormData.client_ids, client.id] : challengeFormData.client_ids.filter(id => id !== client.id);
                                  setChallengeFormData({ ...challengeFormData, client_ids: newClientIds });
                                }} className="w-4 h-4 text-pink-600 rounded focus:ring-pink-500" />
                                <span className="text-sm">{client.name || client.id}</span>
                              </label>
                            ))}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {challengeFormData.target_type === 'by_inactivity' && (
                <div className="space-y-4">
                  <div>
                    <Label>{t('services:days_inactive', 'Дней без посещения')}</Label>
                    <Input type="number" value={challengeFormData.days_inactive} onChange={(e) => setChallengeFormData({ ...challengeFormData, days_inactive: Number(e.target.value) })} placeholder="30" />
                  </div>
                  <Button type="button" variant="outline" onClick={async () => {
                    setClientsLoading(true);
                    try {
                      const res = await fetch(`/api/clients?inactive_days=${challengeFormData.days_inactive}`, { credentials: 'include' });
                      const data = await res.json();
                      setClientsOfMaster(data.clients || []);
                    } catch (e) {
                      console.error('Error loading inactive clients:', e);
                    } finally {
                      setClientsLoading(false);
                    }
                  }}>{t('services:load_inactive_clients', 'Загрузить неактивных клиентов')}</Button>
                  {clientsOfMaster.length > 0 && (
                    <div>
                      <Label>{t('services:inactive_clients', 'Неактивные клиенты')}</Label>
                      <div className="space-y-2">
                        <div className="flex gap-2 mb-2">
                          <Input placeholder={t('services:search_clients', 'Поиск клиентов...')} value={challengeFormData.clientSearch || ''} onChange={(e) => setChallengeFormData({ ...challengeFormData, clientSearch: e.target.value })} className="flex-1" />
                          <Button type="button" variant="outline" size="sm" onClick={() => setChallengeFormData({ ...challengeFormData, client_ids: clientsOfMaster.map(c => c.id) })}>{t('services:select_all', 'Все')}</Button>
                          <Button type="button" variant="outline" size="sm" onClick={() => setChallengeFormData({ ...challengeFormData, client_ids: [] })}>{t('services:deselect_all', 'Сброс')}</Button>
                        </div>
                        <p className="text-xs text-gray-500">{t('services:selected_count', 'Выбрано')}: {challengeFormData.client_ids.length} / {clientsOfMaster.length}</p>
                        <div className="border rounded-md p-3 max-h-48 overflow-y-auto">
                          <div className="space-y-1">{clientsOfMaster.filter(client => !challengeFormData.clientSearch || (client.name || client.id).toLowerCase().includes((challengeFormData.clientSearch || '').toLowerCase())).map((client) => (
                            <label key={client.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                              <input type="checkbox" checked={challengeFormData.client_ids.includes(client.id)} onChange={(e) => {
                                const newClientIds = e.target.checked ? [...challengeFormData.client_ids, client.id] : challengeFormData.client_ids.filter(id => id !== client.id);
                                setChallengeFormData({ ...challengeFormData, client_ids: newClientIds });
                              }} className="w-4 h-4 text-pink-600 rounded focus:ring-pink-500" />
                              <span className="text-sm">{client.name || client.id}</span>
                            </label>
                          ))}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="crm-modal-footer px-6 py-4 border-t">
            <Button variant="outline" onClick={() => setIsChallengeModalOpen(false)}>{t('services:cancel')}</Button>
            <Button onClick={handleSaveChallenge} className="bg-pink-600 hover:bg-pink-700" disabled={saving}>
              {saving ? t('services:saving') : t('services:save')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>


    </div >
  );
}