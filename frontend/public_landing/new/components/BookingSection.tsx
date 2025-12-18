import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Calendar, Clock, Loader2 } from 'lucide-react';
import { useTranslation } from "react-i18next";
import { useAuth } from '../../../src/contexts/AuthContext';
import { api } from '../../../src/services/api';
import { toast } from 'sonner';

export function BookingSection() {
  const { t, i18n } = useTranslation(['public_landing', 'common']);
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    service: '', // This will hold the ID initially
    date: '',
    time: ''
  });
  const [availableServices, setAvailableServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Pre-fill user data
    if (user) {
      setFormData(prev => ({
        ...prev,
        name: user.full_name || user.username || '',
        phone: user.phone || ''
      }));
    }
  }, [user]);

  useEffect(() => {
    // Fetch services for dropdown
    const fetchServices = async () => {
      try {
        const API_URL = import.meta.env.VITE_API_URL || window.location.origin;
        const res = await fetch(`${API_URL}/api/public/services?language=${i18n.language}`);
        const data = await res.json();

        // Flatten categories to get all services
        if (data.categories) {
          const services: any[] = [];
          data.categories.forEach((cat: any) => {
            if (cat.items) {
              services.push(...cat.items);
            }
          });
          setAvailableServices(services);
        }
      } catch (err) {
        console.error('Error fetching services for booking:', err);
      }
    };
    fetchServices();
  }, [i18n.language]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.service) {
      toast.error(t('formServicePlaceholder', { defaultValue: 'Выберите услугу' }));
      return;
    }

    try {
      setLoading(true);

      // Find service name from ID
      const selectedService = availableServices.find(s => s.id.toString() === formData.service.toString());
      const serviceName = selectedService ? (selectedService.name || selectedService.title) : 'Unknown Service';

      // Generate client ID (instagram_id)
      // Use pending user logic: if logged in, use their ID/username. 
      // If guest, generate ephemeral ID based on phone.
      const instagramId = user?.username || `web_${formData.phone.replace(/\D/g, '')}`;

      const payload = {
        instagram_id: instagramId,
        service: serviceName, // Backend expects Name
        date: formData.date,
        time: formData.time,
        phone: formData.phone,
        name: formData.name,
        // master: optional, not in this simplified form yet
      };

      const response = await api.createBooking(payload) as any;

      if (response.success) {
        toast.success(t('bookingSuccessMessage', { defaultValue: 'Спасибо за запись! Мы свяжемся с вами в ближайшее время.' }));
        // Only clear date/time/service, keep contact info if user might book again? 
        // Or clear all? Let's clear sensitive time/service info.
        setFormData(prev => ({ ...prev, service: '', date: '', time: '' }));
      } else {
        toast.error(t('bookingError', { defaultValue: 'Ошибка при создании записи. Попробуйте позже.' }));
      }

    } catch (error) {
      console.error('Booking error:', error);
      toast.error(t('bookingError', { defaultValue: 'Ошибка при создании записи.' }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="booking" className="py-12 sm:py-16 lg:py-20 bg-background">
      <div className="max-w-2xl mx-auto px-3 sm:px-4 lg:px-6">
        <div className="text-center mb-8 sm:mb-12">
          <p className="text-xs sm:text-sm tracking-[0.15em] sm:tracking-[0.2em] uppercase text-muted-foreground mb-3">
            {t('bookingTag', { defaultValue: 'Онлайн запись' })}
          </p>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl mb-3 sm:mb-4 text-[var(--heading)]">
            {t('bookingTitle', { defaultValue: 'Запишитесь на прием' })}
          </h2>
          <p className="text-sm sm:text-base lg:text-lg text-foreground/70">
            {t('bookingDesc', { defaultValue: 'Выберите удобное время для визита' })}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-card rounded-lg sm:rounded-xl lg:rounded-2xl p-4 sm:p-6 lg:p-8 shadow-lg border border-border/50 space-y-4 sm:space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">{t('formName', { defaultValue: 'Имя' })}</label>
            <Input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={t('formNamePlaceholder', { defaultValue: 'Ваше имя' })}
              className="h-10 sm:h-11"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t('formPhone', { defaultValue: 'Телефон' })}</label>
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
            <label className="block text-sm font-medium mb-2">{t('formService', { defaultValue: 'Услуга' })}</label>
            <select
              required
              value={formData.service}
              onChange={(e) => setFormData({ ...formData, service: e.target.value })}
              className="w-full h-10 sm:h-11 px-3 rounded-md border border-input bg-input-background text-sm"
            >
              <option value="">{t('formServicePlaceholder', { defaultValue: 'Выберите услугу' })}</option>
              {availableServices.length > 0 ? (
                availableServices.map((srv: any) => (
                  <option key={srv.id} value={srv.id}>
                    {srv[`title_${i18n.language}`] || srv.title_ru || srv.title || srv.name}
                  </option>
                ))
              ) : (
                <>
                  <option disabled>{t('loadingServices', { defaultValue: 'Загрузка услуг...' })}</option>
                </>
              )}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">{t('formDate', { defaultValue: 'Дата' })}</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="date"
                  required
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="h-10 sm:h-11 pl-10"
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">{t('formTime', { defaultValue: 'Время' })}</label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="time"
                  required
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  className="h-10 sm:h-11 pl-10"
                />
              </div>
            </div>
          </div>

          <Button type="submit" disabled={loading} className="w-full hero-button-primary h-11 sm:h-12 text-sm sm:text-base">
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Calendar className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />}
            {t('submitBooking', { defaultValue: 'Отправить заявку' })}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            {t('privacyAgreementStart', { defaultValue: 'Нажимая кнопку, вы соглашаетесь с' })}{' '}
            <a href="/privacy-policy" className="text-primary hover:underline">
              {t('privacyPolicy', { defaultValue: 'политикой конфиденциальности' })}
            </a>
          </p>
        </form>
      </div>
    </section>
  );
}
