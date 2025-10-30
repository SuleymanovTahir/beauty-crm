import React, { useEffect, useState } from 'react';
import { Sparkles, AlertCircle } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/client';

interface Service {
  id: number;
  name: string;
  price: number;
  category: string;
  description: string;
}

export default function PriceList() {
  const navigate = useNavigate();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const data = await apiClient.getPublicServices();
        setServices(data.services);
      } catch (err) {
        setError('Ошибка загрузки услуг');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchServices();
  }, []);

  // Группируем услуги по категориям
  const groupedServices = services.reduce((acc, service) => {
    const category = service.category || 'other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(service);
    return acc;
  }, {} as Record<string, Service[]>);

  const categoryIcons: Record<string, React.ReactNode> = {
    'permanent-makeup': '💄',
    'facial-care': '✨',
    'nails': '💅',
    'lashes': '👁️',
    'hair': '✂️',
    'massage': '💖',
    'other': '🌟'
  };

  if (loading) {
    return (
      <div className="py-20">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-gray-600">Загрузка услуг...</p>
        </div>
      </div>
    );
  }

  if (error || services.length === 0) {
    return (
      <div className="py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <span className="text-red-800">{error || 'Услуги не найдены'}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <section className="bg-gradient-to-br from-pink-100 via-purple-100 to-pink-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl text-gray-900 mb-4">Наши услуги и цены</h1>
          <p className="text-xl text-gray-600">
            Премиальные услуги красоты по доступным ценам
          </p>
        </div>
      </section>

      {/* Booking CTA */}
      <section className="bg-white border-b border-gray-200 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-lg text-gray-700 mb-4">Готовы преобразиться?</p>
          <Button
            size="lg"
            className="bg-gradient-to-r from-pink-500 to-purple-600"
            onClick={() => navigate('/')}
          >
            Записаться на процедуру
          </Button>
        </div>
      </section>

      {/* Services */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-16">
            {Object.entries(groupedServices).map(([category, categoryServices]) => (
              <div key={category}>
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-purple-600 rounded-xl flex items-center justify-center text-3xl">
                    {categoryIcons[category] || '🌟'}
                  </div>
                  <h2 className="text-3xl text-gray-900">
                    {category === 'permanent-makeup' ? 'Перманентный макияж' :
                     category === 'facial-care' ? 'Уход за лицом' :
                     category === 'nails' ? 'Ногтевой сервис' :
                     category === 'lashes' ? 'Ресницы и брови' :
                     category === 'hair' ? 'Парикмахерские услуги' :
                     category === 'massage' ? 'Массаж' : 'Другие услуги'}
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {categoryServices.map((service) => (
                    <div
                      key={service.id}
                      className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="text-xl text-gray-900">{service.name}</h3>
                        <p className="text-2xl text-pink-600 ml-4">{service.price} AED</p>
                      </div>
                      <p className="text-gray-600">{service.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="bg-gradient-to-br from-pink-50 to-purple-50 py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl text-gray-900 mb-4">Готовы записаться?</h2>
          <p className="text-lg text-gray-600 mb-8">
            Выберите удобное время и насладитесь нашими премиальными услугами
          </p>
          <Button
            size="lg"
            className="bg-gradient-to-r from-pink-500 to-purple-600"
            onClick={() => navigate('/')}
          >
            Записаться сейчас
          </Button>
        </div>
      </section>
    </div>
  );
}