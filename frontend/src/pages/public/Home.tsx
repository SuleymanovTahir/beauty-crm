import React, { useState } from 'react';
import { ImageWithFallback } from '../../components/figma/ImageWithFallback';
import { Calendar, Clock, Sparkles, Star, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner@2.0.3';

const services = [
  'Перманентный макияж бровей',
  'Маникюр',
  'Педикюр',
  'Массаж лица',
  'Наращивание ресниц',
  'Стрижка и укладка',
  'Окрашивание волос',
  'Чистка лица'
];

const testimonials = [
  {
    name: 'Анна Иванова',
    rating: 5,
    text: 'Невероятный сервис! Мастера профессионалы своего дела. Результатом перманентного макияжа очень довольна!',
    avatar: 'А'
  },
  {
    name: 'Мария Петрова',
    rating: 5,
    text: 'Лучший салон в городе! Всегда чисто, уютно и внимательный персонал. Хожу сюда уже 2 года.',
    avatar: 'М'
  },
  {
    name: 'Елена Сидорова',
    rating: 5,
    text: 'Прекрасный массаж лица! Ощущение релакса и свежести после процедуры. Однозначно рекомендую!',
    avatar: 'Е'
  }
];

export default function Home() {
  const navigate = useNavigate();
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    service: '',
    date: '',
    time: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone || !formData.service || !formData.date || !formData.time) {
      toast.error('Пожалуйста, заполните все поля');
      return;
    }
    navigate('/success', { state: formData });
  };

  const nextTestimonial = () => {
    setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
  };

  const prevTestimonial = () => {
    setCurrentTestimonial((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  return (
    <div>
      {/* Hero Section */}
      <section className="relative h-[600px] bg-gradient-to-br from-pink-100 via-purple-100 to-pink-50 overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <ImageWithFallback
            src="https://images.unsplash.com/photo-1695527081827-fdbc4e77be9b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiZWF1dHklMjBzYWxvbiUyMHNwYSUyMGludGVyaW9yfGVufDF8fHx8MTc2MDg1MDUzNXww&ixlib=rb-4.1.0&q=80&w=1080"
            alt="Beauty Salon"
            className="w-full h-full object-cover"
          />
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-6 h-6 text-pink-600" />
              <span className="text-pink-600">Премиум услуги красоты</span>
            </div>
            <h1 className="text-5xl text-gray-900 mb-6">
              Откройте для себя новый уровень красоты
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Профессиональные мастера, индивидуальный подход и высококачественные материалы. 
              Ваша красота - наша страсть.
            </p>
            <div className="flex gap-4">
              <Button 
                size="lg" 
                className="bg-gradient-to-r from-pink-500 to-purple-600 hover:shadow-lg"
                onClick={() => document.getElementById('booking-form')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Записаться сейчас
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                onClick={() => navigate('/price-list')}
              >
                Наши услуги
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl text-gray-900 mb-4">Почему выбирают нас</h2>
            <p className="text-xl text-gray-600">Мы предлагаем лучший сервис в индустрии красоты</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-8 bg-gradient-to-br from-pink-50 to-purple-50 rounded-2xl">
              <div className="w-16 h-16 bg-pink-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Star className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl text-gray-900 mb-3">Опытные мастера</h3>
              <p className="text-gray-600">
                Наши специалисты имеют международные сертификаты и многолетний опыт работы
              </p>
            </div>

            <div className="text-center p-8 bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl">
              <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl text-gray-900 mb-3">Премиум материалы</h3>
              <p className="text-gray-600">
                Используем только качественные и безопасные материалы от ведущих брендов
              </p>
            </div>

            <div className="text-center p-8 bg-gradient-to-br from-pink-50 to-purple-50 rounded-2xl">
              <div className="w-16 h-16 bg-pink-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Clock className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl text-gray-900 mb-3">Удобное расписание</h3>
              <p className="text-gray-600">
                Работаем 7 дней в неделю с удобными временными слотами для записи
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Gallery */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl text-gray-900 mb-4">Наши работы</h2>
            <p className="text-xl text-gray-600">Результаты, которыми мы гордимся</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="relative h-80 rounded-2xl overflow-hidden group">
              <ImageWithFallback
                src="https://images.unsplash.com/photo-1600637070413-0798fafbb6c7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtYWtldXAlMjBhcnRpc3QlMjBjb3NtZXRpY3N8ZW58MXx8fHwxNzYwODUwNTM2fDA&ixlib=rb-4.1.0&q=80&w=1080"
                alt="Makeup"
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-6">
                <p className="text-white text-lg">Перманентный макияж</p>
              </div>
            </div>

            <div className="relative h-80 rounded-2xl overflow-hidden group">
              <ImageWithFallback
                src="https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3b21hbiUyMHNwYSUyMHRyZWF0bWVudHxlbnwxfHx8fDE3NjA3NzczOTJ8MA&ixlib=rb-4.1.0&q=80&w=1080"
                alt="Spa"
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-6">
                <p className="text-white text-lg">Уход за лицом</p>
              </div>
            </div>

            <div className="relative h-80 rounded-2xl overflow-hidden group">
              <ImageWithFallback
                src="https://images.unsplash.com/photo-1695527081827-fdbc4e77be9b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiZWF1dHklMjBzYWxvbiUyMHNwYSUyMGludGVyaW9yfGVufDF8fHx8MTc2MDg1MDUzNXww&ixlib=rb-4.1.0&q=80&w=1080"
                alt="Salon Interior"
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-6">
                <p className="text-white text-lg">Наш салон</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl text-gray-900 mb-4">Отзывы наших клиентов</h2>
            <p className="text-xl text-gray-600">Что говорят о нас</p>
          </div>

          <div className="relative bg-gradient-to-br from-pink-50 to-purple-50 rounded-2xl p-12">
            <button
              onClick={prevTestimonial}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            <button
              onClick={nextTestimonial}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors"
            >
              <ChevronRight className="w-6 h-6" />
            </button>

            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center text-white text-3xl mx-auto mb-6">
                {testimonials[currentTestimonial].avatar}
              </div>
              <div className="flex justify-center gap-1 mb-4">
                {[...Array(testimonials[currentTestimonial].rating)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="text-xl text-gray-700 mb-6 italic">
                "{testimonials[currentTestimonial].text}"
              </p>
              <p className="text-lg text-gray-900">
                {testimonials[currentTestimonial].name}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Booking Form */}
      <section id="booking-form" className="py-20 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl text-gray-900 mb-4">Записаться на процедуру</h2>
            <p className="text-xl text-gray-600">Заполните форму и мы свяжемся с вами для подтверждения</p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="name">Ваше имя *</Label>
                <Input
                  id="name"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Анна Иванова"
                />
              </div>

              <div>
                <Label htmlFor="phone">Телефон *</Label>
                <Input
                  id="phone"
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+971 50 123 4567"
                />
              </div>

              <div>
                <Label htmlFor="service">Услуга *</Label>
                <Select required value={formData.service} onValueChange={(value) => setFormData({ ...formData, service: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите услугу" />
                  </SelectTrigger>
                  <SelectContent>
                    {services.map((service) => (
                      <SelectItem key={service} value={service}>
                        {service}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="date">Дата *</Label>
                  <Input
                    id="date"
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="time">Время *</Label>
                  <Input
                    id="time"
                    type="time"
                    required
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  />
                </div>
              </div>

              <Button type="submit" className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:shadow-lg" size="lg">
                <Calendar className="w-5 h-5 mr-2" />
                Записаться
              </Button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}
