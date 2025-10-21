import React, { useState } from 'react';
import { Scissors, Search, Plus, Edit, Trash2, X } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { toast } from 'sonner@2.0.3';

// Mock data
const mockServices = [
  {
    id: 1,
    key: 'permanent_makeup_brows',
    name: 'Permanent Makeup - Brows',
    nameRu: 'Перманентный макияж бровей',
    price: 800,
    currency: 'AED',
    category: 'Permanent Makeup',
    description: 'Professional brow tattooing',
    descriptionRu: 'Профессиональный татуаж бровей',
    benefits: ['Long-lasting', 'Natural look', 'Waterproof'],
    active: true
  },
  {
    id: 2,
    key: 'manicure_pedicure',
    name: 'Manicure + Pedicure',
    nameRu: 'Маникюр + Педикюр',
    price: 350,
    currency: 'AED',
    category: 'Nails',
    description: 'Complete nail care',
    descriptionRu: 'Полный уход за ногтями',
    benefits: ['Gel polish', 'Hand massage', 'Foot spa'],
    active: true
  },
  {
    id: 3,
    key: 'facial_massage',
    name: 'Facial Massage',
    nameRu: 'Массаж лица',
    price: 450,
    currency: 'AED',
    category: 'Facial',
    description: 'Relaxing facial treatment',
    descriptionRu: 'Расслабляющий массаж лица',
    benefits: ['Anti-aging', 'Lymphatic drainage', 'Glowing skin'],
    active: true
  },
];

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
  const [services, setServices] = useState(mockServices);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    key: '',
    name: '',
    nameRu: '',
    price: 0,
    currency: 'AED',
    category: '',
    description: '',
    descriptionRu: '',
    benefits: '',
  });

  const filteredServices = services.filter(service => {
    const matchesSearch = service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         service.nameRu.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || service.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleOpenAddModal = () => {
    setEditingService(null);
    setFormData({
      key: '',
      name: '',
      nameRu: '',
      price: 0,
      currency: 'AED',
      category: '',
      description: '',
      descriptionRu: '',
      benefits: '',
    });
    setIsModalOpen(true);
  };

  const handleEditService = (service: any) => {
    setEditingService(service);
    setFormData({
      key: service.key,
      name: service.name,
      nameRu: service.nameRu,
      price: service.price,
      currency: service.currency,
      category: service.category,
      description: service.description,
      descriptionRu: service.descriptionRu,
      benefits: service.benefits.join(' | '),
    });
    setIsModalOpen(true);
  };

  const handleSaveService = () => {
    if (editingService) {
      setServices(services.map(s => 
        s.id === editingService.id 
          ? { ...s, ...formData, benefits: formData.benefits.split(' | ') }
          : s
      ));
      toast.success('Услуга обновлена');
    } else {
      const newService = {
        id: services.length + 1,
        ...formData,
        benefits: formData.benefits.split(' | '),
        active: true
      };
      setServices([...services, newService]);
      toast.success('Услуга добавлена');
    }
    setIsModalOpen(false);
  };

  const handleDeleteService = (id: number) => {
    if (confirm('Вы уверены, что хотите удалить эту услугу?')) {
      setServices(services.filter(s => s.id !== id));
      toast.success('Услуга удалена');
    }
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl text-gray-900 mb-2 flex items-center gap-3">
          <Scissors className="w-8 h-8 text-pink-600" />
          Управление услугами
        </h1>
        <p className="text-gray-600">Прайс-лист салона</p>
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
                      <p className="text-sm text-gray-900">{service.name}</p>
                      <p className="text-xs text-gray-500">{service.nameRu}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {service.price} {service.currency}
                  </td>
                  <td className="px-6 py-4">
                    <Badge className="bg-purple-100 text-purple-800">
                      {service.category}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                    {service.description || '-'}
                  </td>
                  <td className="px-6 py-4">
                    <Badge className={service.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                      {service.active ? 'Активна' : 'Неактивна'}
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
                <Label htmlFor="key">Ключ</Label>
                <Input
                  id="key"
                  value={formData.key}
                  onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                  placeholder="permanent_makeup_brows"
                />
              </div>
              <div>
                <Label htmlFor="category">Категория</Label>
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
              <Label htmlFor="name">Название (EN)</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Permanent Makeup - Brows"
              />
            </div>
            
            <div>
              <Label htmlFor="nameRu">Название (RU)</Label>
              <Input
                id="nameRu"
                value={formData.nameRu}
                onChange={(e) => setFormData({ ...formData, nameRu: e.target.value })}
                placeholder="Перманентный макияж бровей"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="price">Цена</Label>
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
                value={formData.descriptionRu}
                onChange={(e) => setFormData({ ...formData, descriptionRu: e.target.value })}
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
            <Button onClick={handleSaveService} className="bg-pink-600 hover:bg-pink-700">
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
