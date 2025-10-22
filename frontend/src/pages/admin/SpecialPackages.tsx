// frontend/src/pages/admin/SpecialPackages.tsx
// Управление специальными пакетами и акциями

import React, { useState, useEffect } from 'react';
import { Gift, Search, Plus, Edit, Trash2, Tag, Calendar, DollarSign, AlertCircle, Loader } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { toast } from 'sonner';
import { api } from '../../services/api';

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

export default function SpecialPackages() {
  const [packages, setPackages] = useState<SpecialPackage[]>([]);
  const [filteredPackages, setFilteredPackages] = useState<SpecialPackage[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<SpecialPackage | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
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
    loadPackages();
  }, []);

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
      toast.error('Ошибка загрузки пакетов');
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
      currency: 'AED',
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
        toast.error('Заполните название пакета');
        return;
      }

      if (formData.special_price >= formData.original_price) {
        toast.error('Специальная цена должна быть меньше обычной');
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
        toast.success('Пакет обновлен');
      } else {
        await api.createSpecialPackage(packageData);
        toast.success('Пакет создан');
      }

      await loadPackages();
      setIsModalOpen(false);
    } catch (err) {
      toast.error('Ошибка сохранения');
      console.error(err);
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
      toast.error('Ошибка удаления');
      console.error(err);
    }
  };

  const handleToggleActive = async (pkg: SpecialPackage) => {
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
          <p className="text-gray-600">Загрузка пакетов...</p>
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
          Специальные пакеты и акции
        </h1>
        <p className="text-gray-600">
          Управление рекламными предложениями — {filteredPackages.length} пакетов
        </p>
      </div>

      {/* Alert */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-blue-800 font-medium">Как работают специальные пакеты:</p>
            <ul className="text-blue-700 text-sm mt-2 space-y-1 list-disc list-inside">
              <li>Когда клиент упоминает ключевые слова или промокод, бот предложит специальную цену</li>
              <li>Бот автоматически распознает контекст рекламной кампании</li>
              <li>Пакеты можно ограничить по времени и количеству использований</li>
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
              placeholder="Поиск пакетов, промокодов..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
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
            onClick={handleOpenAddModal}
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
                onClick={() => handleToggleActive(pkg)}
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
          <p className="text-gray-500">Специальные пакеты не найдены</p>
          <Button onClick={handleOpenAddModal} className="mt-4 bg-pink-600 hover:bg-pink-700">
            Создать первый пакет
          </Button>
        </div>
      )}

      {/* Package Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPackage ? 'Редактировать пакет' : 'Создать пакет'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Название (EN) *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Summer Special Package"
                />
              </div>
              <div>
                <Label htmlFor="nameRu">Название (RU) *</Label>
                <Input
                  id="nameRu"
                  value={formData.name_ru}
                  onChange={(e) => setFormData({ ...formData, name_ru: e.target.value })}
                  placeholder="Летний специальный пакет"
                />
              </div>
            </div>

            {/* Descriptions */}
            <div>
              <Label htmlFor="descriptionRu">Описание (RU)</Label>
              <Textarea
                id="descriptionRu"
                value={formData.description_ru}
                onChange={(e) => setFormData({ ...formData, description_ru: e.target.value })}
                placeholder="Включает маникюр + педикюр по специальной цене"
                rows={2}
              />
            </div>

            {/* Pricing */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="originalPrice">Обычная цена *</Label>
                <Input
                  id="originalPrice"
                  type="number"
                  value={formData.original_price}
                  onChange={(e) => setFormData({ ...formData, original_price: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label htmlFor="specialPrice">Специальная цена *</Label>
                <Input
                  id="specialPrice"
                  type="number"
                  value={formData.special_price}
                  onChange={(e) => setFormData({ ...formData, special_price: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label>Скидка</Label>
                <div className="h-10 flex items-center text-2xl font-bold text-green-600">
                  {calculateDiscount()}%
                </div>
              </div>
            </div>

            {/* Promo Code & Keywords */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="promoCode">Промокод (опционально)</Label>
                <Input
                  id="promoCode"
                  value={formData.promo_code}
                  onChange={(e) => setFormData({ ...formData, promo_code: e.target.value.toUpperCase() })}
                  placeholder="SUMMER2025"
                />
              </div>
              <div>
                <Label htmlFor="maxUsage">Макс. использований</Label>
                <Input
                  id="maxUsage"
                  type="number"
                  value={formData.max_usage}
                  onChange={(e) => setFormData({ ...formData, max_usage: Number(e.target.value) })}
                  placeholder="0 = без ограничений"
                />
              </div>
            </div>

            {/* Keywords */}
            <div>
              <Label htmlFor="keywords">Ключевые слова (через запятую) *</Label>
              <Textarea
                id="keywords"
                value={formData.keywords}
                onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                placeholder="летняя акция, summer promo, специальное предложение, маникюр педикюр вместе"
                rows={2}
              />
              <p className="text-xs text-gray-500 mt-1">
                Когда клиент упоминает эти слова, бот предложит этот пакет
              </p>
            </div>

            {/* Services */}
            <div>
              <Label htmlFor="services">Включенные услуги (ключи через запятую)</Label>
              <Textarea
                id="services"
                value={formData.services_included}
                onChange={(e) => setFormData({ ...formData, services_included: e.target.value })}
                placeholder="manicure_gelish, pedicure_gelish"
                rows={2}
              />
            </div>

            {/* Validity Period */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="validFrom">Действует с *</Label>
                <Input
                  id="validFrom"
                  type="date"
                  value={formData.valid_from}
                  onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="validUntil">Действует до *</Label>
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
                Активен (доступен для клиентов)
              </Label>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
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