import React from 'react';
import { Sparkles, Scissors, Paintbrush, Eye, Hand, Heart } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { useNavigate } from 'react-router-dom';

const serviceCategories = [
  {
    title: 'Перманентный макияж',
    icon: Paintbrush,
    color: 'from-pink-500 to-rose-500',
    services: [
      { name: 'Брови (Powder Brows)', price: 800, description: 'Натуральный эффект пудровых бровей' },
      { name: 'Брови (Microblading)', price: 900, description: 'Волосковая техника для естественного вида' },
      { name: 'Губы (полное заполнение)', price: 1000, description: 'Естественный цвет и форма губ' },
      { name: 'Межресничка', price: 600, description: 'Подчеркивает естественную красоту глаз' },
    ]
  },
  {
    title: 'Уход за лицом',
    icon: Sparkles,
    color: 'from-purple-500 to-indigo-500',
    services: [
      { name: 'Классическая чистка лица', price: 350, description: 'Глубокое очищение и увлажнение' },
      { name: 'Массаж лица', price: 450, description: 'Лимфодренажный массаж с lifting эффектом' },
      { name: 'Альгинатная маска', price: 250, description: 'Увлажнение и омоложение кожи' },
      { name: 'RF-лифтинг', price: 800, description: 'Подтяжка кожи без операции' },
    ]
  },
  {
    title: 'Ногтевой сервис',
    icon: Hand,
    color: 'from-cyan-500 to-blue-500',
    services: [
      { name: 'Маникюр', price: 150, description: 'Классический или аппаратный маникюр' },
      { name: 'Педикюр', price: 200, description: 'Полный уход за стопами и ногтями' },
      { name: 'Гель-лак (руки)', price: 100, description: 'Стойкое покрытие до 3 недель' },
      { name: 'Наращивание ногтей', price: 350, description: 'Красивые длинные ногти любой формы' },
    ]
  },
  {
    title: 'Ресницы и брови',
    icon: Eye,
    color: 'from-pink-500 to-purple-500',
    services: [
      { name: 'Наращивание ресниц 2D-3D', price: 400, description: 'Объемные ресницы для выразительного взгляда' },
      { name: 'Ламинирование ресниц', price: 300, description: 'Изгиб и питание натуральных ресниц' },
      { name: 'Оформление бровей', price: 150, description: 'Коррекция, окрашивание, укладка' },
      { name: 'Ламинирование бровей', price: 250, description: 'Укладка и фиксация бровей' },
    ]
  },
  {
    title: 'Парикмахерские услуги',
    icon: Scissors,
    color: 'from-amber-500 to-orange-500',
    services: [
      { name: 'Женская стрижка', price: 300, description: 'Стрижка любой сложности' },
      { name: 'Мужская стрижка', price: 150, description: 'Классические и современные стрижки' },
      { name: 'Окрашивание волос', price: 500, description: 'Профессиональное окрашивание премиум красителями' },
      { name: 'Укладка', price: 200, description: 'Вечерняя или повседневная укладка' },
    ]
  },
  {
    title: 'Массаж',
    icon: Heart,
    color: 'from-rose-500 to-pink-500',
    services: [
      { name: 'Массаж спины', price: 400, description: 'Расслабляющий массаж воротниковой зоны и спины' },
      { name: 'Общий массаж тела', price: 800, description: 'Полный релакс всего тела' },
      { name: 'Антицеллюлитный массаж', price: 600, description: 'Борьба с целлюлитом и улучшение контуров тела' },
      { name: 'Лимфодренажный массаж', price: 700, description: 'Выведение лишней жидкости и токсинов' },
    ]
  }
];

export default function PriceList() {
  const navigate = useNavigate();

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
            {serviceCategories.map((category, idx) => {
              const Icon = category.icon;
              return (
                <div key={idx}>
                  <div className="flex items-center gap-4 mb-8">
                    <div className={`w-16 h-16 bg-gradient-to-br ${category.color} rounded-xl flex items-center justify-center`}>
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    <h2 className="text-3xl text-gray-900">{category.title}</h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {category.services.map((service, serviceIdx) => (
                      <div
                        key={serviceIdx}
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
              );
            })}
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
