// /frontend/src/pages/admin/SpecialPackages.tsx
// frontend/src/pages/admin/SpecialPackages.tsx
// Управление специальными пакетами и акциями

import { useState, useEffect } from 'react';
import { Gift, Search, Plus, Edit, Trash2, Tag, Calendar, AlertCircle, Loader, Users, Target } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { useTranslation } from 'react-i18next';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { toast } from 'sonner';
import { api } from '../../services/api';
import { useCurrency } from '../../hooks/useSalonSettings';

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

export default function SpecialPackages() {
  const [packages, setPackages] = useState<SpecialPackage[]>([]);
  const { t } = useTranslation(['admin/specialpackages', 'common']);
  const { currency, formatCurrency } = useCurrency();
  const [filteredPackages, setFilteredPackages] = useState<SpecialPackage[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<SpecialPackage | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<'packages' | 'referrals'>('packages');

  // Referral campaigns state
  const [campaigns, setCampaigns] = useState<ReferralCampaign[]>([]);
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
    max_usage: 0
  });

  useEffect(() => {
    loadPackages();
  }, []);

  // Load campaigns when switching to referrals tab
  useEffect(() => {
    if (activeSection === 'referrals') {
      fetch('/api/referral-campaigns')
        .then(res => res.json())
        .then(data => setCampaigns(data.campaigns || []))
        .catch(() => toast.error(t('error_loading_campaigns')));
    }
  }, [activeSection]);

  useEffect(() => {
    const filtered = packages.filter(pkg => {
      const matchesSearch = pkg.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pkg.name_ru.toLowerCase().includes(searchTerm.toLowerCase()) ||
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
      const data = await api.getSpecialPackages();
      setPackages(data.packages || []);
    } catch (err) {
      toast.error(t('specialpackages:error_loading_packages'));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingPackage(null);
    setFormData({
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
      max_usage: 0
    });
    setIsModalOpen(true);
  };

  const handleEditPackage = (pkg: SpecialPackage) => {
    setEditingPackage(pkg);
    setFormData({
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
      if (!formData.name || !formData.name_ru) {
        toast.error(t('specialpackages:fill_package_name'));
        return;
      }

      if (formData.special_price >= formData.original_price) {
        toast.error(t('specialpackages:special_price_must_be_less_than_original'));
        return;
      }

      setSaving(true);

      const packageData = {
        name: formData.name,
        name_ru: formData.name_ru,
        description: formData.description,
        description_ru: formData.description_ru,
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
        toast.success(t('specialpackages:package_updated'));
      } else {
        await api.createSpecialPackage(packageData);
        toast.success(t('specialpackages:package_created'));
      }

      await loadPackages();
      setIsModalOpen(false);
    } catch (err) {
      toast.error(t('specialpackages:error_saving'));
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePackage = async (id: number) => {
    if (!confirm(t('specialpackages:delete_package_confirm'))) return;

    try {
      await api.deleteSpecialPackage(id);
      setPackages(packages.filter(p => p.id !== id));
      toast.success(t('specialpackages:package_deleted'));
    } catch (err) {
      toast.error(t('specialpackages:error_deleting'));
      console.error(err);
    }
  };

  const handleToggleActive = async (pkg: SpecialPackage) => {
    try {
      await api.updateSpecialPackage(pkg.id, { is_active: !pkg.is_active });
      setPackages(packages.map(p =>
        p.id === pkg.id ? { ...p, is_active: !p.is_active } : p
      ));
      toast.success(pkg.is_active ? t('specialpackages:package_deactivated') : t('specialpackages:package_activated'));
    } catch (err) {
      toast.error(t('specialpackages:error_changing_status'));
    }
  };

  const handleToggleCampaignActive = async (campaign: ReferralCampaign) => {
    try {
      await fetch(`/api/referral-campaigns/${campaign.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !campaign.is_active })
      });
      setCampaigns(campaigns.map(c =>
        c.id === campaign.id ? { ...c, is_active: !c.is_active } : c
      ));
      toast.success(campaign.is_active ? t('campaign_deactivated') : t('campaign_activated'));
    } catch (err) {
      toast.error(t('error_changing_status'));
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader className="w-8 h-8 text-pink-600 animate-spin" />
          <p className="text-gray-600">{t('specialpackages:loading_packages')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl text-gray-900 mb-2 flex items-center gap-3">
          <Gift className="w-8 h-8 text-pink-600" />
          {t('specialpackages:special_packages_and_promotions')}
        </h1>
        <p className="text-gray-600">
          {t('specialpackages:manage_promotional_offers')} {filteredPackages.length} {t('specialpackages:packages')}
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6">
        <Button
          variant={activeSection === 'packages' ? 'default' : 'outline'}
          onClick={() => setActiveSection('packages')}
          className={activeSection === 'packages' ? 'bg-pink-600 hover:bg-pink-700' : ''}
        >
          <Gift className="w-4 h-4 mr-2" />
          {t('tab_packages')}
        </Button>
        <Button
          variant={activeSection === 'referrals' ? 'default' : 'outline'}
          onClick={() => setActiveSection('referrals')}
          className={activeSection === 'referrals' ? 'bg-blue-600 hover:bg-blue-700' : ''}
        >
          <Users className="w-4 h-4 mr-2" />
          {t('tab_referrals')}
        </Button>
      </div>

      {activeSection === 'packages' && (
        <>
          {/* Alert */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-blue-800 font-medium">{t('specialpackages:how_special_packages_work')}</p>
                <ul className="text-blue-700 text-sm mt-2 space-y-1 list-disc list-inside">
                  <li>{t('specialpackages:when_client_mentions_keywords_or_promo_code')}</li>
                  <li>{t('specialpackages:bot_automatically_recognizes_context_of_promotional_campaign')}</li>
                  <li>{t('specialpackages:packages_can_be_limited_by_time_and_usage_count')}</li>
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
                  placeholder={t('specialpackages:search_packages_promo_codes')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder={t('specialpackages:status')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('specialpackages:all_packages')}</SelectItem>
                  <SelectItem value="active">{t('specialpackages:active')}</SelectItem>
                  <SelectItem value="inactive">{t('specialpackages:inactive')}</SelectItem>
                </SelectContent>
              </Select>
              <Button
                className="bg-pink-600 hover:bg-pink-700"
                onClick={handleOpenAddModal}
              >
                <Plus className="w-4 h-4 mr-2" />
                {t('specialpackages:create_package')}
              </Button>
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
                    <h3 className="font-semibold text-gray-900 mb-1">{pkg.name_ru}</h3>
                    <p className="text-sm text-gray-500">{pkg.name}</p>
                  </div>
                  <Badge className={pkg.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                    {pkg.is_active ? t('specialpackages:active') : t('specialpackages:inactive')}
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
                    {t('specialpackages:discount')} {pkg.discount_percent}%
                  </div>
                </div>

                {/* Description */}
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                  {pkg.description_ru || pkg.description}
                </p>

                {/* Keywords */}
                {pkg.keywords.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs text-gray-500 mb-1">{t('specialpackages:keywords')}</p>
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
                    {new Date(pkg.valid_from).toLocaleDateString()} - {new Date(pkg.valid_until).toLocaleDateString()}
                  </span>
                </div>

                {/* Stats */}
                {pkg.max_usage && (
                  <div className="text-xs text-gray-500 mb-4">
                    {t('specialpackages:used')}: {pkg.usage_count} / {pkg.max_usage}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEditPackage(pkg)}
                    className="flex-1"
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    {t('specialpackages:edit')}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleToggleActive(pkg)}
                    className={pkg.is_active ? 'text-orange-600' : 'text-green-600'}
                  >
                    {pkg.is_active ? t('specialpackages:disable') : t('specialpackages:enable')}
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
              </div>
            ))}
          </div>

          {filteredPackages.length === 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 py-20 text-center">
              <Gift className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">{t('specialpackages:special_packages_not_found')}</p>
              <Button onClick={handleOpenAddModal} className="mt-4 bg-pink-600 hover:bg-pink-700">
                {t('specialpackages:create_first_package')}
              </Button>
            </div>
          )}

          {/* Package Modal */}
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingPackage ? t('specialpackages:edit_package') : t('specialpackages:create_package')}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">{t('specialpackages:name_en')} *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder={t('specialpackages:summer_special_package')}
                    />
                  </div>
                  <div>
                    <Label htmlFor="nameRu">{t('specialpackages:name_ru')} *</Label>
                    <Input
                      id="nameRu"
                      value={formData.name_ru}
                      onChange={(e) => setFormData({ ...formData, name_ru: e.target.value })}
                      placeholder={t('specialpackages:summer_special_package_ru')}
                    />
                  </div>
                </div>

                {/* Descriptions */}
                <div>
                  <Label htmlFor="descriptionRu">{t('specialpackages:description_ru')}</Label>
                  <Textarea
                    id="descriptionRu"
                    value={formData.description_ru}
                    onChange={(e) => setFormData({ ...formData, description_ru: e.target.value })}
                    placeholder={t('specialpackages:includes_manicure_and_pedicure_at_special_price')}
                    rows={2}
                  />
                </div>

                {/* Pricing */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="originalPrice">{t('specialpackages:original_price')} *</Label>
                    <Input
                      id="originalPrice"
                      type="number"
                      value={formData.original_price}
                      onChange={(e) => setFormData({ ...formData, original_price: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="specialPrice">{t('specialpackages:special_price')} *</Label>
                    <Input
                      id="specialPrice"
                      type="number"
                      value={formData.special_price}
                      onChange={(e) => setFormData({ ...formData, special_price: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label>{t('specialpackages:discount')}</Label>
                    <div className="h-10 flex items-center text-2xl font-bold text-green-600">
                      {calculateDiscount()}%
                    </div>
                  </div>
                </div>

                {/* Promo Code & Keywords */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="promoCode">{t('specialpackages:promo_code')} ({t('specialpackages:optional')})</Label>
                    <Input
                      id="promoCode"
                      value={formData.promo_code}
                      onChange={(e) => setFormData({ ...formData, promo_code: e.target.value.toUpperCase() })}
                      placeholder={t('specialpackages:summer_special_package_promo_code')}
                    />
                  </div>
                  <div>
                    <Label htmlFor="maxUsage">{t('specialpackages:max_usage')}</Label>
                    <Input
                      id="maxUsage"
                      type="number"
                      value={formData.max_usage}
                      onChange={(e) => setFormData({ ...formData, max_usage: Number(e.target.value) })}
                      placeholder={t('specialpackages:unlimited_0')}
                    />
                  </div>
                </div>

                {/* Keywords */}
                <div>
                  <Label htmlFor="keywords">{t('specialpackages:keywords')} ({t('specialpackages:separate_through_comma')} *)</Label>
                  <Textarea
                    id="keywords"
                    value={formData.keywords}
                    onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                    placeholder={t('specialpackages:keywords_placeholder')}
                    rows={2}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {t('specialpackages:when_client_mentions_keywords_bot_will_offer_package')}
                  </p>
                </div>

                {/* Services */}
                <div>
                  <Label htmlFor="services">{t('specialpackages:included_services')} ({t('specialpackages:separate_through_comma')})</Label>
                  <Textarea
                    id="services"
                    value={formData.services_included}
                    onChange={(e) => setFormData({ ...formData, services_included: e.target.value })}
                    placeholder={t('specialpackages:services_included_placeholder')}
                    rows={2}
                  />
                </div>

                {/* Validity Period */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="validFrom">{t('specialpackages:valid_from')} *</Label>
                    <Input
                      id="validFrom"
                      type="date"
                      value={formData.valid_from}
                      onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="validUntil">{t('specialpackages:valid_until')} *</Label>
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
                    {t('specialpackages:active')} ({t('specialpackages:available_for_clients')})
                  </Label>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                  {t('specialpackages:cancel')}
                </Button>
                <Button
                  onClick={handleSavePackage}
                  className="bg-pink-600 hover:bg-pink-700"
                  disabled={saving}
                >
                  {saving ? t('specialpackages:saving') : t('specialpackages:save')}
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

          {/* Create Button */}
          <div className="flex justify-end">
            <Button
              className="bg-blue-600 hover:bg-blue-700"
              onClick={() => {
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
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              {t('create_campaign_button')}
            </Button>
          </div>

          {/* Campaigns List */}
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
                    {campaign.target_type === 'by_inactivity' && t('target_inactive_days', { days: campaign.target_criteria?.days_inactive || 30 })}
                  </Badge>
                </div>

                <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingCampaign(campaign);
                      setReferralFormData({
                        name: campaign.name,
                        description: campaign.description || '',
                        bonus_points: campaign.bonus_points,
                        referrer_bonus: campaign.referrer_bonus,
                        is_active: campaign.is_active,
                        target_type: campaign.target_type,
                        days_inactive: campaign.target_criteria?.days_inactive || 30,
                        start_date: campaign.start_date || '',
                        end_date: campaign.end_date || ''
                      });
                      setIsReferralModalOpen(true);
                    }}
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
                      if (!confirm(t('delete_campaign_confirm'))) return;
                      try {
                        await fetch(`/api/referral-campaigns/${campaign.id}`, { method: 'DELETE' });
                        setCampaigns(campaigns.filter(c => c.id !== campaign.id));
                        toast.success(t('campaign_deleted'));
                      } catch (e) {
                        toast.error(t('error_deleting_campaign'));
                      }
                    }}
                    className="text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {campaigns.length === 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 py-20 text-center">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">{t('no_campaigns_found')}</p>
              <Button
                onClick={() => setIsReferralModalOpen(true)}
                className="mt-4 bg-blue-600 hover:bg-blue-700"
              >
                {t('create_first_campaign')}
              </Button>
            </div>
          )}

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
                      onChange={(e) => setReferralFormData({ ...referralFormData, bonus_points: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="referrerBonus">{t('bonus_to_referrer')}</Label>
                    <Input
                      id="referrerBonus"
                      type="number"
                      value={referralFormData.referrer_bonus}
                      onChange={(e) => setReferralFormData({ ...referralFormData, referrer_bonus: Number(e.target.value) })}
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
                      <SelectValue placeholder={t('select_audience', 'Выберите аудиторию')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('target_all_clients')}</SelectItem>
                      <SelectItem value="by_inactivity">{t('target_by_inactivity', 'Неактивные клиенты')}</SelectItem>
                      <SelectItem value="by_master">{t('target_by_master')}</SelectItem>
                      <SelectItem value="by_service">{t('target_by_service')}</SelectItem>
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
                      onChange={(e) => setReferralFormData({ ...referralFormData, days_inactive: Number(e.target.value) })}
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
                        toast.success(t('campaign_updated'));
                      } else {
                        await fetch('/api/referral-campaigns', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify(payload)
                        });
                        toast.success(t('campaign_created'));
                      }

                      // Reload campaigns
                      const res = await fetch('/api/referral-campaigns');
                      const data = await res.json();
                      setCampaigns(data.campaigns || []);
                      setIsReferralModalOpen(false);
                    } catch (e) {
                      toast.error(t('error_saving_campaign'));
                    }
                  }}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {editingCampaign ? t('save_campaign') : t('create_campaign')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </div>
  );
}