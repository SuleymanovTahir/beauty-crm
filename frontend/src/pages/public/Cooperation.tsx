import React, { useState } from 'react';
import { Handshake, Send } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { toast } from 'sonner@2.0.3';

export default function Cooperation() {
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    proposal: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Спасибо за ваше предложение! Мы рассмотрим его и свяжемся с вами.');
    setFormData({ name: '', company: '', email: '', phone: '', proposal: '' });
  };

  return (
    <div>
      {/* Header */}
      <section className="bg-gradient-to-br from-pink-100 via-purple-100 to-pink-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
            <Handshake className="w-10 h-10 text-pink-600" />
          </div>
          <h1 className="text-5xl text-gray-900 mb-4">Сотрудничество</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Мы открыты для взаимовыгодного партнерства и новых возможностей
          </p>
        </div>
      </section>

      {/* Cooperation Options */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl text-gray-900 mb-4">Виды сотрудничества</h2>
            <p className="text-xl text-gray-600">
              Мы рассматриваем различные формы партнерства
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-gradient-to-br from-pink-50 to-purple-50 p-8 rounded-2xl">
              <h3 className="text-2xl text-gray-900 mb-4">Поставщики</h3>
              <p className="text-gray-600 mb-4">
                Мы заинтересованы в сотрудничестве с поставщиками качественных материалов и
                оборудования для салонов красоты.
              </p>
              <ul className="space-y-2 text-gray-600">
                <li>• Косметические сред��тва</li>
                <li>• Оборудование</li>
                <li>• Расходные материалы</li>
              </ul>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-8 rounded-2xl">
              <h3 className="text-2xl text-gray-900 mb-4">Инфлюенсеры</h3>
              <p className="text-gray-600 mb-4">
                Предлагаем взаимовыгодное сотрудничество блогерам и инфлюенсерам в сфере
                красоты и здорового образа жизни.
              </p>
              <ul className="space-y-2 text-gray-600">
                <li>• Бартерное сотрудничество</li>
                <li>• Промо-коды для подписчиков</li>
                <li>• Совместные проекты</li>
              </ul>
            </div>

            <div className="bg-gradient-to-br from-pink-50 to-purple-50 p-8 rounded-2xl">
              <h3 className="text-2xl text-gray-900 mb-4">Мастера</h3>
              <p className="text-gray-600 mb-4">
                Приглашаем к сотрудничеству опытных мастеров различных специализаций
                для работы в нашем салоне.
              </p>
              <ul className="space-y-2 text-gray-600">
                <li>• Аренда кабинета</li>
                <li>• Процент от выручки</li>
                <li>• Фиксированная ставка</li>
              </ul>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-8 rounded-2xl">
              <h3 className="text-2xl text-gray-900 mb-4">Обучение</h3>
              <p className="text-gray-600 mb-4">
                Сотрудничаем с образовательными центрами и приглашаем преподавателей
                для проведения мастер-классов.
              </p>
              <ul className="space-y-2 text-gray-600">
                <li>• Мастер-классы</li>
                <li>• Курсы повышения квалификации</li>
                <li>• Сертификация</li>
              </ul>
            </div>

            <div className="bg-gradient-to-br from-pink-50 to-purple-50 p-8 rounded-2xl">
              <h3 className="text-2xl text-gray-900 mb-4">Маркетинг</h3>
              <p className="text-gray-600 mb-4">
                Рассматриваем предложения от маркетинговых агентс��в и специалистов
                по продвижению.
              </p>
              <ul className="space-y-2 text-gray-600">
                <li>• SMM продвижение</li>
                <li>• Контент-маркетинг</li>
                <li>• Performance маркетинг</li>
              </ul>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-8 rounded-2xl">
              <h3 className="text-2xl text-gray-900 mb-4">Другие предложения</h3>
              <p className="text-gray-600 mb-4">
                Мы всегда открыты для интересных идей и нестандартных форм сотрудничества.
              </p>
              <ul className="space-y-2 text-gray-600">
                <li>• Совместные акции</li>
                <li>• Кросс-промо</li>
                <li>• Инновационные проекты</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Proposal Form */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl text-gray-900 mb-4">Форма предложения</h2>
            <p className="text-xl text-gray-600">
              Опишите ваше предложение, и мы свяжемся с вами
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="name">Ваше имя *</Label>
                  <Input
                    id="name"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Иван Иванов"
                  />
                </div>

                <div>
                  <Label htmlFor="company">Компания</Label>
                  <Input
                    id="company"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    placeholder="Название компании"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="ivan@example.com"
                  />
                </div>

                <div>
                  <Label htmlFor="phone">Телефон</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+971 50 123 4567"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="proposal">Ваше предложение *</Label>
                <Textarea
                  id="proposal"
                  required
                  value={formData.proposal}
                  onChange={(e) => setFormData({ ...formData, proposal: e.target.value })}
                  placeholder="Расскажите подробнее о вашем предложении..."
                  className="min-h-[180px]"
                />
              </div>

              <Button type="submit" className="w-full bg-gradient-to-r from-pink-500 to-purple-600" size="lg">
                <Send className="w-4 h-4 mr-2" />
                Отправить предложение
              </Button>
            </form>
          </div>

          <div className="mt-8 text-center text-gray-600">
            <p>
              Или свяжитесь с нами напрямую: <br />
              <a href="mailto:partnership@luxurybeauty.ae" className="text-pink-600 hover:underline">
                partnership@luxurybeauty.ae
              </a>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
