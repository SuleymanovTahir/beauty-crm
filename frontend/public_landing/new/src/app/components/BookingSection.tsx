import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Calendar } from 'lucide-react';

export function BookingSection() {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    service: '',
    date: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert('Спасибо за запись! Мы свяжемся с вами в ближайшее время.');
    setFormData({ name: '', phone: '', service: '', date: '' });
  };

  return (
    <section id="booking" className="py-12 sm:py-16 lg:py-20 bg-background">
      <div className="max-w-2xl mx-auto px-3 sm:px-4 lg:px-6">
        <div className="text-center mb-8 sm:mb-12">
          <p className="text-xs sm:text-sm tracking-[0.15em] sm:tracking-[0.2em] uppercase text-muted-foreground mb-3">
            Онлайн запись
          </p>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl mb-3 sm:mb-4 text-[var(--heading)]">
            Запишитесь на прием
          </h2>
          <p className="text-sm sm:text-base lg:text-lg text-foreground/70">
            Выберите удобное время для визита
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-card rounded-lg sm:rounded-xl lg:rounded-2xl p-4 sm:p-6 lg:p-8 shadow-lg border border-border/50 space-y-4 sm:space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Имя</label>
            <Input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ваше имя"
              className="h-10 sm:h-11"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Телефон</label>
            <Input
              type="tel"
              required
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+971 XX XXX XXXX"
              className="h-10 sm:h-11"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Услуга</label>
            <select
              required
              value={formData.service}
              onChange={(e) => setFormData({ ...formData, service: e.target.value })}
              className="w-full h-10 sm:h-11 px-3 rounded-md border border-input bg-input-background text-sm"
            >
              <option value="">Выберите услугу</option>
              <option value="manicure">Маникюр</option>
              <option value="pedicure">Педикюр</option>
              <option value="haircut">Стрижка</option>
              <option value="coloring">Окрашивание</option>
              <option value="makeup">Макияж</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Желаемая дата</label>
            <Input
              type="date"
              required
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="h-10 sm:h-11"
              min={new Date().toISOString().split('T')[0]}
            />
          </div>

          <Button type="submit" className="w-full hero-button-primary h-11 sm:h-12 text-sm sm:text-base">
            <Calendar className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
            Отправить заявку
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Нажимая кнопку, вы соглашаетесь с{' '}
            <a href="/privacy-policy" className="text-primary hover:underline">
              политикой конфиденциальности
            </a>
          </p>
        </form>
      </div>
    </section>
  );
}
