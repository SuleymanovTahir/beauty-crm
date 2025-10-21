import React, { useState } from 'react';
import { MapPin, Phone, Mail, Instagram, Clock, Send } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { toast } from 'sonner@2.0.3';

export default function Contacts() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Ваше сообщение отправлено! Мы свяжемся с вами в ближайшее время.');
    setFormData({ name: '', email: '', message: '' });
  };

  return (
    <div>
      {/* Header */}
      <section className="bg-gradient-to-br from-pink-100 via-purple-100 to-pink-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl text-gray-900 mb-4">Контакты</h1>
          <p className="text-xl text-gray-600">
            Свяжитесь с нами удобным для вас способом
          </p>
        </div>
      </section>

      {/* Contact Info & Form */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Contact Information */}
            <div>
              <h2 className="text-3xl text-gray-900 mb-8">Как с нами связаться</h2>
              
              <div className="space-y-6">
                <div className="flex items-start gap-4 p-6 bg-white rounded-xl shadow-sm border border-gray-200">
                  <div className="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-6 h-6 text-pink-600" />
                  </div>
                  <div>
                    <h3 className="text-lg text-gray-900 mb-1">Адрес</h3>
                    <p className="text-gray-600">
                      Dubai Marina, Marina Plaza<br />
                      Office 2301, Dubai, UAE
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-6 bg-white rounded-xl shadow-sm border border-gray-200">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Phone className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-lg text-gray-900 mb-1">Телефон</h3>
                    <p className="text-gray-600">+971 50 123 4567</p>
                    <p className="text-gray-600">+971 4 123 4567</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-6 bg-white rounded-xl shadow-sm border border-gray-200">
                  <div className="w-12 h-12 bg-cyan-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Mail className="w-6 h-6 text-cyan-600" />
                  </div>
                  <div>
                    <h3 className="text-lg text-gray-900 mb-1">Email</h3>
                    <p className="text-gray-600">info@luxurybeauty.ae</p>
                    <p className="text-gray-600">booking@luxurybeauty.ae</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-6 bg-white rounded-xl shadow-sm border border-gray-200">
                  <div className="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Instagram className="w-6 h-6 text-pink-600" />
                  </div>
                  <div>
                    <h3 className="text-lg text-gray-900 mb-1">Instagram</h3>
                    <a 
                      href="https://instagram.com/luxurybeauty_dubai" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-pink-600 hover:underline"
                    >
                      @luxurybeauty_dubai
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-6 bg-white rounded-xl shadow-sm border border-gray-200">
                  <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Clock className="w-6 h-6 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="text-lg text-gray-900 mb-2">Часы работы</h3>
                    <div className="space-y-1 text-gray-600">
                      <p>Понедельник - Пятница: 9:00 - 21:00</p>
                      <p>Суббота - Воскресенье: 10:00 - 20:00</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div>
              <h2 className="text-3xl text-gray-900 mb-8">Напишите нам</h2>
              
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
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
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="anna@example.com"
                    />
                  </div>

                  <div>
                    <Label htmlFor="message">Сообщение *</Label>
                    <Textarea
                      id="message"
                      required
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      placeholder="Расскажите нам, чем мы можем вам помочь..."
                      className="min-h-[150px]"
                    />
                  </div>

                  <Button type="submit" className="w-full bg-gradient-to-r from-pink-500 to-purple-600" size="lg">
                    <Send className="w-4 h-4 mr-2" />
                    Отправить сообщение
                  </Button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Map */}
      <section className="pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gray-200 rounded-2xl overflow-hidden h-[450px]">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3613.073739144155!2d55.139160315018805!3d25.077796983952966!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3e5f6b2e2c0e0e0d%3A0x0!2sDubai%20Marina!5e0!3m2!1sen!2sae!4v1634567890123!5m2!1sen!2sae"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              title="Salon Location"
            ></iframe>
          </div>
        </div>
      </section>
    </div>
  );
}
