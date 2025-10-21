import React, { useState, useEffect } from 'react';
import { Scissors, Search, Plus, Edit, Trash2, X, Loader, AlertCircle } from 'lucide-react';
import { Button } from '../../components/ui/button';
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
  currency: string;
  category: string;
  description?: string;
  description_ru?: string;
  benefits?: string[];
  is_active: boolean;
}

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
  const [services, setServices] = useState<Service[]>([]);
  const [filteredServices, setFilteredServices] = useState<Service[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    key: '',
    name: '',
    name_ru: '',
    price: 0,
    currency: 'AED',
    category: '',
    description: '',
    description_ru: '',
    benefits: '',
  });

  // Загрузить услуги при монтировании
  useEffect(() => {
    loadServices();
  }, []);

  // Фильтровать услуги при изменении поиска
  useEffect(() => {
    const filtered = services.filter(service => {
      const matchesSearch = service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           service.name_ru.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || service.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
    setFilteredServices(filtered);
  }, [searchTerm, categoryFilter, services]);

  const loadServices = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getServices(false); // false = получить все, включая неактивные
      
      const servicesArray = data.services || (Array.isArray(data) ? data : []);
      setServices(servicesArray);
      
      if (servicesArray.length === 0) {
        toast.info('Услуг не найдено');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ошибка загрузки услуг';
      setError(message);
      toast.error(`Ошибка: ${message}`);
      console.error('Error loading services:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingService(null);
    setFormData({
      key: '',
      name: '',
      name_ru: '',
      price: 0,
      currency: 'AED',
      category: '',
      description: '',
      description_ru: '',
      benefits: '',
    });
    setIsModalOpen(true);
  };

  const handleEditService = (service: Service) => {
    setEditingService(service);
    setFormData({
      key: service.key,
      name: service.name,
      name_ru: service.name_ru,
      price: service.price,
      currency: service.currency,
      category: service.category,
      description: service.description || '',
      description_ru: service.description_ru || '',
      benefits: Array.isArray(service.benefits) ? service.benefits.join(' | ') : '',
    });
    setIsModalOpen(true);
  };

  const handleSaveService = async () => {
    try {
      // Валидация
      if (!formData.key || !formData.name || !formData.name_ru || !formData.category) {
        toast.error('Заполните обязательные поля');
        return;
      }

      if (formData.price < 0) {
        toast.error('Цена не может быть отрицательной');
        return;
      }

      setSaving(true);

      if (editingService) {
        // Обновить существующую услугу
        await api.updateService(editingService.id, {
          key: formData.key,
          name: formData.name,
          name_ru: formData.name_ru,
          price: formData.price,
          currency: formData.currency,
          category: formData.category,
          description: formData.description,
          description_ru: formData.description_ru,
          benefits: formData.benefits.split(' | ').filter(b => b.trim()),
        });
        
        setServices(services.map(s => 
          s.id === editingService.id 
            ? { ...editingService, ...formData }
            : s
        ));
        
        toast.success('Услуга обновлена');
      } else {
        // Создать новую услугу
        await api.createService({
          key: formData.key,
          name: formData.name,
          name_ru: formData.name_ru,
          price: formData.price,
          currency: formData.currency,
          category: formData.category,
          description: formData.description,
          description_ru: formData.description_ru,
          benefits: formData.benefits.split(' | ').filter(b => b.trim()),
        });

        // Перезагрузить услуги для получения новых данных от backend
        await loadServices();
        toast.success('Услуга добавлена');
      }

      setIsModalOpen(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ошибка сохранения';
      toast.error(`Ошибка: ${message}`);
      console.error('Error saving service:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteService = async (id: number) => {
    if (!confirm('Вы уверены, что хотите удалить эту услугу?')) return;

    try {
      await api.deleteService(id);
      setServices(services.filter(s => s.id !== id));
      toast.success('Услуга удалена');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ошибка удаления';
      toast.error(`Ошибка: ${message}`);
      console.error('Error deleting service:', err);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader className="w-8 h-8 text-pink-600 animate-spin" />
          <p className="text-gray-600">Загрузка услуг...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-800 font-medium">Ошибка загрузки</p>
              <p className="text-red-700 text-sm mt-1">{error}</p>
              <Button onClick={loadServices} className="mt-4 bg-red-600 hover:bg-red-700">
                Попробовать еще раз
              </Button>
            </div>
          </div>
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
          Управление услугами
        </h1>
        <p className="text-gray-600">Прайс-лист салона — {filteredServices.length} услуг</p>
      </div>

      {/* Search and Filters */}
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
            onClick={handleOpenAddModal}
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
                  <th className="px-6 py-4 text-left text-sm text-gray-600">Название</th>
                  <th className="px-6 py-4 text-left text-sm text-gray-600">Цена</th>
                  <th className="px-6 py-4 text-left text-sm text-gray-600">Категория</th>
                  <th className="px-6 py-4 text-left text-sm text-gray-600">Описание</th>
                  <th className="px-6 py-4 text-left text-sm text-gray-600">Статус</th>
                  <th className="px-6 py-4 text-left text-sm text-gray-600">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredServices.map((service) => (
                  <tr key={service.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm text-gray-900 font-medium">{service.name}</p>
                        <p className="text-xs text-gray-500">{service.name_ru}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
                      {service.price} {service.currency}
                    </td>
                    <td className="px-6 py-4">
                      <Badge className="bg-purple-100 text-purple-800">
                        {service.category}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                      {service.description || service.description_ru || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <Badge className={service.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                        {service.is_active ? 'Активна' : 'Неактивна'}
                      </Badge>
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

      {/* Service Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
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
                  value={formData.key}
                  onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                  placeholder="permanent_makeup_brows"
                />
              </div>
              <div>
                <Label htmlFor="category">Категория *</Label>
                <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
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
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Permanent Makeup - Brows"
              />
            </div>
            
            <div>
              <Label htmlFor="nameRu">Название (RU) *</Label>
              <Input
                id="nameRu"
                value={formData.name_ru}
                onChange={(e) => setFormData({ ...formData, name_ru: e.target.value })}
                placeholder="Перманентный макияж бровей"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="price">Цена *</Label>
                <Input
                  id="price"
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label htmlFor="currency">Валюта</Label>
                <Select value={formData.currency} onValueChange={(value) => setFormData({ ...formData, currency: value })}>
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
            
            <div>
              <Label htmlFor="description">Описание (EN)</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Professional brow tattooing"
              />
            </div>
            
            <div>
              <Label htmlFor="descriptionRu">Описание (RU)</Label>
              <Textarea
                id="descriptionRu"
                value={formData.description_ru}
                onChange={(e) => setFormData({ ...formData, description_ru: e.target.value })}
                placeholder="Профессиональный татуаж бровей"
              />
            </div>
            
            <div>
              <Label htmlFor="benefits">Преимущества (разделяйте через |)</Label>
              <Textarea
                id="benefits"
                value={formData.benefits}
                onChange={(e) => setFormData({ ...formData, benefits: e.target.value })}
                placeholder="Long-lasting | Natural look | Waterproof"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
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
    </div>
  );
}