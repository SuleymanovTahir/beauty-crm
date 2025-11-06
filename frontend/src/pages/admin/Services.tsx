// frontend/src/pages/admin/Services.tsx - С ВКЛАДКАМИ ДЛЯ СПЕЦПАКЕТОВ И НОВЫМИ ПОЛЯМИ
import React, { useState, useEffect } from 'react';
import { Scissors, Search, Plus, Edit, Trash2, Loader, AlertCircle, Gift, Tag, Calendar, Clock } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { useTranslation } from 'react-i18next';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { toast } from 'sonner';
import { api } from '../../services/api';

interface Service {
  id: number;
  key: string;
  name: string;
  name_ru: string;
  price: number;
  min_price?: number;
  max_price?: number;
  duration?: string;
  currency: string;
  category: string;
  description?: string;
  description_ru?: string;
  benefits?: string[];
  is_active: boolean;
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
}

type TabType = 'services' | 'packages';

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

// Форматирование цены
const formatPrice = (service: Service) => {
  const minPrice = service.min_price && service.min_price !== 'null' ? Number(service.min_price) : null;
  const maxPrice = service.max_price && service.max_price !== 'null' ? Number(service.max_price) : null;
  
  if (minPrice && maxPrice && minPrice !== maxPrice) {
    return `${minPrice} — ${maxPrice} ${service.currency}`;
  }
  return `${service.price} ${service.currency}`;
};

export default function Services() {
  const [activeTab, setActiveTab] = useState<TabType>('services');

  // Services state
  const [services, setServices] = useState<Service[]>([]);
  const [filteredServices, setFilteredServices] = useState<Service[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);

  // Packages state
  const [packages, setPackages] = useState<SpecialPackage[]>([]);
  const [filteredPackages, setFilteredPackages] = useState<SpecialPackage[]>([]);
  const [packageSearchTerm, setPackageSearchTerm] = useState('');
  const [packageStatusFilter, setPackageStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [isPackageModalOpen, setIsPackageModalOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<SpecialPackage | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [serviceFormData, setServiceFormData] = useState({
    key: '',
    name: '',
    name_ru: '',
    price: 0,
    min_price: '',
    max_price: '',
    duration: '',
    currency: 'AED',
    category: '',
    description: '',
    description_ru: '',
    benefits: '',
  });

  const [packageFormData, setPackageFormData] = useState({
    name: '',
    name_ru: '',
    description: '',
    description_ru: '',
    original_price: 0,
    special_price: 0,
    currency: 'AED',
    services_included: '',
    promo_code: '',
    keywords: '',
    valid_from: '',
    valid_until: '',
    is_active: true,
    max_usage: 0
  });

  useEffect(() => {
    loadData();
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'services') {
      const filtered = services.filter(service => {
        const matchesSearch = service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          service.name_ru.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = categoryFilter === 'all' || service.category === categoryFilter;
        return matchesSearch && matchesCategory;
      });
      setFilteredServices(filtered);
    } else {
      const filtered = packages.filter(pkg => {
        const matchesSearch = pkg.name.toLowerCase().includes(packageSearchTerm.toLowerCase()) ||
          pkg.name_ru.toLowerCase().includes(packageSearchTerm.toLowerCase()) ||
          pkg.promo_code?.toLowerCase().includes(packageSearchTerm.toLowerCase());
        const matchesStatus = packageStatusFilter === 'all' ||
          (packageStatusFilter === 'active' && pkg.is_active) ||
          (packageStatusFilter === 'inactive' && !pkg.is_active);
        return matchesSearch && matchesStatus;
      });
      setFilteredPackages(filtered);
    }
  }, [searchTerm, categoryFilter, packageSearchTerm, packageStatusFilter, services, packages, activeTab]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (activeTab === 'services') {
        const data = await api.getServices(false);
        setServices(data.services || []);
      } else {
        const data = await api.getSpecialPackages();
        setPackages(data.packages || []);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ошибка загрузки';
      setError(message);
      toast.error(`Ошибка: ${message}`);
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
      price: 0,
      min_price: '',
      max_price: '',
      duration: '',
      currency: 'AED',
      category: '',
      description: '',
      description_ru: '',
      benefits: '',
    });
    setIsServiceModalOpen(true);
  };

  const handleEditService = (service: Service) => {
    setEditingService(service);
    setServiceFormData({
      key: service.key,
      name: service.name,
      name_ru: service.name_ru,
      price: service.price,
      min_price: service.min_price?.toString() || '',
      max_price: service.max_price?.toString() || '',
      duration: service.duration || '',
      currency: service.currency,
      category: service.category,
      description: service.description || '',
      description_ru: service.description_ru || '',
      benefits: Array.isArray(service.benefits) ? service.benefits.join(' | ') : '',
    });
    setIsServiceModalOpen(true);
  };

  const handleSaveService = async () => {
    try {
      if (!serviceFormData.key || !serviceFormData.name || !serviceFormData.name_ru || !serviceFormData.category) {
        toast.error('Заполните обязательные поля');
        return;
      }

      setSaving(true);

      const serviceData = {
        key: serviceFormData.key,
        name: serviceFormData.name,
        name_ru: serviceFormData.name_ru,
        price: serviceFormData.price,
        min_price: serviceFormData.min_price ? Number(serviceFormData.min_price) : null,
        max_price: serviceFormData.max_price ? Number(serviceFormData.max_price) : null,
        duration: serviceFormData.duration || null,
        currency: serviceFormData.currency,
        category: serviceFormData.category,
        description: serviceFormData.description,
        description_ru: serviceFormData.description_ru,
        benefits: serviceFormData.benefits.split(' | ').filter(b => b.trim()),
      };

      if (editingService) {
        await api.updateService(editingService.id, serviceData);
        toast.success('Услуга обновлена');
      } else {
        await api.createService(serviceData);
        toast.success('Услуга добавлена');
      }

      await loadData();
      setIsServiceModalOpen(false);
    } catch (err) {
      toast.error(`Ошибка: ${err instanceof Error ? err.message : 'Неизвестная ошибка'}`);
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

      if (!response.ok) throw new Error('Toggle failed');

      const data = await response.json();

      // Обновляем локальное состояние с ответом от сервера
      setServices(services.map(s =>
        s.id === service.id ? { ...s, is_active: data.is_active } : s
      ));

      toast.success(data.is_active ? 'Услуга активирована' : 'Услуга деактивирована');
    } catch (err) {
      toast.error('Ошибка изменения статуса');
      console.error(err);
    }
  };

  const handleDeleteService = async (id: number) => {
    if (!confirm('Удалить эту услугу?')) return;

    try {
      await api.deleteService(id);
      setServices(services.filter(s => s.id !== id));
      toast.success('Услуга удалена');
    } catch (err) {
      toast.error(`Ошибка: ${err instanceof Error ? err.message : 'Неизвестная ошибка'}`);
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
      currency: 'AED',
      services_included: '',
      promo_code: '',
      keywords: '',
      valid_from: '',
      valid_until: '',
      is_active: true,
      max_usage: 0
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
      max_usage: pkg.max_usage || 0
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
        toast.error('Заполните название пакета');
        return;
      }

      if (packageFormData.special_price >= packageFormData.original_price) {
        toast.error('Специальная цена должна быть меньше обычной');
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
        max_usage: packageFormData.max_usage || null
      };

      if (editingPackage) {
        await api.updateSpecialPackage(editingPackage.id, packageData);
        toast.success('Пакет обновлен');
      } else {
        await api.createSpecialPackage(packageData);
        toast.success('Пакет создан');
      }

      await loadData();
      setIsPackageModalOpen(false);
    } catch (err) {
      toast.error(`Ошибка: ${err instanceof Error ? err.message : 'Неизвестная ошибка'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePackage = async (id: number) => {
    if (!confirm('Удалить этот пакет?')) return;

    try {
      await api.deleteSpecialPackage(id);
      setPackages(packages.filter(p => p.id !== id));
      toast.success('Пакет удален');
    } catch (err) {
      toast.error(`Ошибка: ${err instanceof Error ? err.message : 'Неизвестная ошибка'}`);
    }
  };

  const handleTogglePackageActive = async (pkg: SpecialPackage) => {
    try {
      await api.updateSpecialPackage(pkg.id, { is_active: !pkg.is_active });
      setPackages(packages.map(p =>
        p.id === pkg.id ? { ...p, is_active: !p.is_active } : p
      ));
      toast.success(pkg.is_active ? 'Пакет деактивирован' : 'Пакет активирован');
    } catch (err) {
      toast.error('Ошибка изменения статуса');
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader className="w-8 h-8 text-pink-600 animate-spin" />
          <p className="text-gray-600">Загрузка...</p>
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
          Услуги и спецпредложения
        </h1>
        <p className="text-gray-600">
          Управление прайс-листом и акциями салона
        </p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6 p-1">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('services')}
            className={`flex-1 px-6 py-3 rounded-lg font-medium transition-all ${activeTab === 'services'
              ? 'bg-pink-100 text-pink-700'
              : 'text-gray-600 hover:bg-gray-50'
              }`}
          >
            <Scissors className="w-5 h-5 inline-block mr-2" />
            Услуги ({filteredServices.length})
          </button>
          <button
            onClick={() => setActiveTab('packages')}
            className={`flex-1 px-6 py-3 rounded-lg font-medium transition-all ${activeTab === 'packages'
              ? 'bg-pink-100 text-pink-700'
              : 'text-gray-600 hover:bg-gray-50'
              }`}
          >
            <Gift className="w-5 h-5 inline-block mr-2" />
            Специальные пакеты ({filteredPackages.length})
          </button>
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
                  placeholder="Поиск услуг..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="Категория" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все категории</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                className="bg-pink-600 hover:bg-pink-700"
                onClick={handleOpenAddService}
              >
                <Plus className="w-4 h-4 mr-2" />
                Добавить услугу
              </Button>
            </div>
          </div>

          {/* Services Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {filteredServices.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">Название</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">Цена</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">Длительность</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">Категория</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">Статус</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">Действия</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredServices.map((service) => (
                      <tr key={service.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{service.name}</p>
                            <p className="text-xs text-gray-500">{service.name_ru}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-semibold text-gray-900">
                            {formatPrice(service)}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {service.duration && service.duration !== 'null' ? (
                            <Badge className="bg-blue-100 text-blue-800 flex items-center gap-1 w-fit">
                              <Clock className="w-3 h-3" />
                              {service.duration}
                            </Badge>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <Badge className="bg-purple-100 text-purple-800">
                            {service.category}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => handleToggleServiceActive(service)}
                            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${service.is_active
                              ? 'bg-green-100 text-green-800 hover:bg-green-200'
                              : 'bg-red-100 text-red-800 hover:bg-red-200'
                              }`}
                          >
                            {service.is_active ? 'Активна' : 'Неактивна'}
                          </button>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditService(service)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => handleDeleteService(service.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
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
                <p>Услуги не найдены</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* PACKAGES TAB */}
      {activeTab === 'packages' && (
        <>
          {/* Info Alert */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-blue-800 font-medium">Как работают специальные пакеты:</p>
                <ul className="text-blue-700 text-sm mt-2 space-y-1 list-disc list-inside">
                  <li>Когда клиент упоминает ключевые слова или промокод, бот предложит специальную цену</li>
                  <li>Бот автоматически распознает контекст рекламной кампании</li>
                  <li>Пакеты можно ограничить по времени и количеству использований</li>
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
                  placeholder="Поиск пакетов, промокодов..."
                  value={packageSearchTerm}
                  onChange={(e) => setPackageSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={packageStatusFilter} onValueChange={(value: any) => setPackageStatusFilter(value)}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="Статус" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все пакеты</SelectItem>
                  <SelectItem value="active">Активные</SelectItem>
                  <SelectItem value="inactive">Неактивные</SelectItem>
                </SelectContent>
              </Select>
              <Button
                className="bg-pink-600 hover:bg-pink-700"
                onClick={handleOpenAddPackage}
              >
                <Plus className="w-4 h-4 mr-2" />
                Создать пакет
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
                    {pkg.is_active ? 'Активен' : 'Неактивен'}
                  </Badge>
                </div>

                {/* Promo Code */}
                {pkg.promo_code && (
                  <div className="bg-purple-50 border border-purple-200 rounded-lg px-3 py-2 mb-4 flex items-center gap-2">
                    <Tag className="w-4 h-4 text-purple-600" />
                    <span className="text-purple-900 font-mono font-medium">{pkg.promo_code}</span>
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
                    Скидка {pkg.discount_percent}%
                  </div>
                </div>

                {/* Description */}
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                  {pkg.description_ru || pkg.description}
                </p>

                {/* Keywords */}
                {pkg.keywords.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs text-gray-500 mb-1">Ключевые слова:</p>
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
                    Использовано: {pkg.usage_count} / {pkg.max_usage}
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
                    Изменить
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleTogglePackageActive(pkg)}
                    className={pkg.is_active ? 'text-orange-600' : 'text-green-600'}
                  >
                    {pkg.is_active ? 'Отключить' : 'Включить'}
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
              <p className="text-gray-500 mb-4">Специальные пакеты не найдены</p>
              <Button onClick={handleOpenAddPackage} className="bg-pink-600 hover:bg-pink-700">
                Создать первый пакет
              </Button>
            </div>
          )}
        </>
      )}

      {/* Service Modal */}
      <Dialog open={isServiceModalOpen} onOpenChange={setIsServiceModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingService ? 'Редактировать услугу' : 'Добавить услугу'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="key">Ключ *</Label>
                <Input
                  id="key"
                  value={serviceFormData.key}
                  onChange={(e) => setServiceFormData({ ...serviceFormData, key: e.target.value })}
                  placeholder="permanent_makeup_brows"
                />
              </div>
              <div>
                <Label htmlFor="category">Категория *</Label>
                <Select value={serviceFormData.category} onValueChange={(value) => setServiceFormData({ ...serviceFormData, category: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите категорию" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="name">Название (EN) *</Label>
              <Input
                id="name"
                value={serviceFormData.name}
                onChange={(e) => setServiceFormData({ ...serviceFormData, name: e.target.value })}
                placeholder="Permanent Makeup - Brows"
              />
            </div>

            <div>
              <Label htmlFor="nameRu">Название (RU) *</Label>
              <Input
                id="nameRu"
                value={serviceFormData.name_ru}
                onChange={(e) => setServiceFormData({ ...serviceFormData, name_ru: e.target.value })}
                placeholder="Перманентный макияж бровей"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="price">Базовая цена *</Label>
                <Input
                  id="price"
                  type="number"
                  value={serviceFormData.price}
                  onChange={(e) => setServiceFormData({ ...serviceFormData, price: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label htmlFor="currency">Валюта</Label>
                <Select value={serviceFormData.currency} onValueChange={(value) => setServiceFormData({ ...serviceFormData, currency: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AED">AED</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="minPrice">Мин. цена</Label>
                <Input
                  id="minPrice"
                  type="number"
                  value={serviceFormData.min_price}
                  onChange={(e) => setServiceFormData({ ...serviceFormData, min_price: e.target.value })}
                  placeholder="Опционально"
                />
              </div>
              <div>
                <Label htmlFor="maxPrice">Макс. цена</Label>
                <Input
                  id="maxPrice"
                  type="number"
                  value={serviceFormData.max_price}
                  onChange={(e) => setServiceFormData({ ...serviceFormData, max_price: e.target.value })}
                  placeholder="Опционально"
                />
              </div>
              <div>
                <Label htmlFor="duration">Длительность</Label>
                <Input
                  id="duration"
                  value={serviceFormData.duration}
                  onChange={(e) => setServiceFormData({ ...serviceFormData, duration: e.target.value })}
                  placeholder="1h, 30min"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">Описание (EN)</Label>
              <Textarea
                id="description"
                value={serviceFormData.description}
                onChange={(e) => setServiceFormData({ ...serviceFormData, description: e.target.value })}
                placeholder="Professional brow tattooing"
              />
            </div>

            <div>
              <Label htmlFor="descriptionRu">Описание (RU)</Label>
              <Textarea
                id="descriptionRu"
                value={serviceFormData.description_ru}
                onChange={(e) => setServiceFormData({ ...serviceFormData, description_ru: e.target.value })}
                placeholder="Профессиональный татуаж бровей"
              />
            </div>

            <div>
              <Label htmlFor="benefits">Преимущества (разделяйте через |)</Label>
              <Textarea
                id="benefits"
                value={serviceFormData.benefits}
                onChange={(e) => setServiceFormData({ ...serviceFormData, benefits: e.target.value })}
                placeholder="Long-lasting | Natural look | Waterproof"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsServiceModalOpen(false)}>
              Отмена
            </Button>
            <Button
              onClick={handleSaveService}
              className="bg-pink-600 hover:bg-pink-700"
              disabled={saving}
            >
              {saving ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Package Modal */}
      <Dialog open={isPackageModalOpen} onOpenChange={setIsPackageModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPackage ? 'Редактировать пакет' : 'Создать пакет'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="pkgName">Название (EN) *</Label>
                <Input
                  id="pkgName"
                  value={packageFormData.name}
                  onChange={(e) => setPackageFormData({ ...packageFormData, name: e.target.value })}
                  placeholder="Summer Special Package"
                />
              </div>
              <div>
                <Label htmlFor="pkgNameRu">Название (RU) *</Label>
                <Input
                  id="pkgNameRu"
                  value={packageFormData.name_ru}
                  onChange={(e) => setPackageFormData({ ...packageFormData, name_ru: e.target.value })}
                  placeholder="Летний специальный пакет"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="pkgDescRu">Описание (RU)</Label>
              <Textarea
                id="pkgDescRu"
                value={packageFormData.description_ru}
                onChange={(e) => setPackageFormData({ ...packageFormData, description_ru: e.target.value })}
                placeholder="Включает маникюр + педикюр по специальной цене"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="origPrice">Обычная цена *</Label>
                <Input
                  id="origPrice"
                  type="number"
                  value={packageFormData.original_price}
                  onChange={(e) => setPackageFormData({ ...packageFormData, original_price: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label htmlFor="specPrice">Специальная цена *</Label>
                <Input
                  id="specPrice"
                  type="number"
                  value={packageFormData.special_price}
                  onChange={(e) => setPackageFormData({ ...packageFormData, special_price: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label>Скидка</Label>
                <div className="h-10 flex items-center text-2xl font-bold text-green-600">
                  {calculateDiscount()}%
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="promoCode">Промокод</Label>
                <Input
                  id="promoCode"
                  value={packageFormData.promo_code}
                  onChange={(e) => setPackageFormData({ ...packageFormData, promo_code: e.target.value.toUpperCase() })}
                  placeholder="SUMMER2025"
                />
              </div>
              <div>
                <Label htmlFor="maxUsage">Макс. использований</Label>
                <Input
                  id="maxUsage"
                  type="number"
                  value={packageFormData.max_usage}
                  onChange={(e) => setPackageFormData({ ...packageFormData, max_usage: Number(e.target.value) })}
                  placeholder="0 = без ограничений"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="keywords">Ключевые слова (через запятую) *</Label>
              <Textarea
                id="keywords"
                value={packageFormData.keywords}
                onChange={(e) => setPackageFormData({ ...packageFormData, keywords: e.target.value })}
                placeholder="летняя акция, summer promo, маникюр педикюр вместе"
                rows={2}
              />
              <p className="text-xs text-gray-500 mt-1">
                Когда клиент упоминает эти слова, бот предложит этот пакет
              </p>
            </div>

            <div>
              <Label htmlFor="services">Включенные услуги (ключи через запятую)</Label>
              <Textarea
                id="services"
                value={packageFormData.services_included}
                onChange={(e) => setPackageFormData({ ...packageFormData, services_included: e.target.value })}
                placeholder="manicure_gelish, pedicure_gelish"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="validFrom">Действует с *</Label>
                <Input
                  id="validFrom"
                  type="date"
                  value={packageFormData.valid_from}
                  onChange={(e) => setPackageFormData({ ...packageFormData, valid_from: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="validUntil">Действует до *</Label>
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
                Активен (доступен для клиентов)
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPackageModalOpen(false)}>
              Отмена
            </Button>
            <Button
              onClick={handleSavePackage}
              className="bg-pink-600 hover:bg-pink-700"
              disabled={saving}
            >
              {saving ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}