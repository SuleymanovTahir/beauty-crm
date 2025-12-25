import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Calendar, Clock, Loader2, Check, ChevronsUpDown } from 'lucide-react';
import { useTranslation } from "react-i18next";
import { useAuth } from '../../src/contexts/AuthContext';
import { api } from '../../src/services/api';
import { toast } from 'sonner';
import { cn } from './ui/utils';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "./ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./ui/popover";
import { PhoneInputWithSearch } from './ui/PhoneInputWithSearch';

export const BookingSection = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [defaultCountry, setDefaultCountry] = useState<string>('ae');

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    service: '', // This will hold the ID initially
    date: '',
    time: ''
  });
  const [availableServices, setAvailableServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Detect country from geolocation or use saved preference
  useEffect(() => {
    const savedCountry = localStorage.getItem('preferred_phone_country');
    if (savedCountry) {
      setDefaultCountry(savedCountry.toLowerCase());
    } else {
      // Try to detect country from IP
      fetch('https://ipapi.co/json/')
        .then(res => res.json())
        .then(data => {
          if (data.country_code) {
            const countryCode = data.country_code.toLowerCase();
            setDefaultCountry(countryCode);
            localStorage.setItem('preferred_phone_country', countryCode);
          }
        })
        .catch(() => {
          // Default to UAE if detection fails
          setDefaultCountry('ae');
        });
    }
  }, []);

  // Handle phone change
  const handlePhoneChange = (phone: string) => {
    setFormData({ ...formData, phone });
  };

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

  // Listen for service selection from URL hash
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      const match = hash.match(/booking\?service=(\d+)/);
      if (match && match[1]) {
        setFormData(prev => ({ ...prev, service: match[1] }));
        // Clean the hash
        window.history.replaceState(null, '', '#booking');
      }
    };
    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    // Fetch services for dropdown
    const fetchServices = async () => {
      try {
        const API_URL = import.meta.env.VITE_API_URL || window.location.origin;
        const res = await fetch(`${API_URL}/api/public/services?language=${i18n.language}`);
        const data = await res.json();

        if (Array.isArray(data)) {
          setAvailableServices(data);
        } else if (data.categories) {
          // Flatten categories to get all services (fallback)
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

      const bookingData = {
        instagram_id: instagramId,
        service: serviceName, // Backend expects Name
        name: formData.name,
        phone: formData.phone,
        service_id: parseInt(formData.service),
        date: formData.date,
        time: formData.time,
        source: 'website', // Explicitly setting source
        status: 'pending_confirmation' // Explicitly expecting pending status
      };

      await api.createPublicBooking(bookingData);

      // Reset form
      setFormData({
        name: '',
        phone: '',
        service: '',
        date: '',
        time: ''
      });

      toast.success(t('bookingSuccess', { defaultValue: 'Заявка успешно отправлена! Мы свяжемся с вами для подтверждения.' }));
    } catch (err) {
      console.error('Error creating booking:', err);
      toast.error(t('bookingError', { defaultValue: 'Ошибка при создании записи. Попробуйте позже.' }));
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
            {t('bookingTitlePart1', { defaultValue: 'Запишитесь' })} <span className="text-primary">{t('bookingTitlePart2', { defaultValue: 'на прием' })}</span>
          </h2>
          <p className="text-sm sm:text-base lg:text-lg text-foreground/70">
            {t('bookingDesc', { defaultValue: 'Выберите удобное время для визита' })}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="glass-panel lg:rounded-2xl p-4 sm:p-6 lg:p-8 shadow-xl border border-primary/20 space-y-4 sm:space-y-6">
          <div>
            <label className="form-label-custom">{t('formName', { defaultValue: 'Имя' })}</label>
            <Input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={t('formNamePlaceholder', { defaultValue: 'Ваше имя' })}
              className="h-10 sm:h-11 form-input-custom"
            />
          </div>

          <div>
            <label className="form-label-custom">{t('formPhone', { defaultValue: 'Телефон' })}</label>
            <PhoneInputWithSearch
              defaultCountry={defaultCountry}
              value={formData.phone}
              onChange={handlePhoneChange}
              searchPlaceholder={t('searchCountry', { defaultValue: 'Поиск страны...' })}
            />
          </div>

          <div>
            <label className="form-label-custom">{t('formService', { defaultValue: 'Услуга' })}</label>
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={open}
                  className="w-full justify-between h-10 sm:h-11 px-3 bg-muted/20 hover:bg-muted/30 text-left font-normal border-primary/20"
                >
                  {formData.service
                    ? availableServices.find((s) => s.id.toString() === formData.service.toString())?.[`name_${i18n.language}`] ||
                    availableServices.find((s) => s.id.toString() === formData.service.toString())?.name_ru ||
                    availableServices.find((s) => s.id.toString() === formData.service.toString())?.name ||
                    t('formServicePlaceholder', { defaultValue: 'Выберите услугу' })
                    : t('formServicePlaceholder', { defaultValue: 'Выберите услугу' })}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-0" align="start">
                <Command>
                  <CommandInput placeholder={t('searchService', { defaultValue: 'Найти услугу...' })} />
                  <CommandList>
                    <CommandEmpty>{t('noServicesFound', { defaultValue: 'Услуги не найдены.' })}</CommandEmpty>
                    <CommandGroup>
                      {availableServices.map((srv: any) => (
                        <CommandItem
                          key={srv.id}
                          value={srv[`name_${i18n.language}`] || srv.name_ru || srv.name}
                          onSelect={() => {
                            setFormData({ ...formData, service: srv.id.toString() });
                            setOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              formData.service === srv.id.toString() ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {srv[`name_${i18n.language}`] || srv.name_ru || srv.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label-custom">{t('formDate', { defaultValue: 'Дата' })}</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="date"
                  required
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="h-10 sm:h-11 pl-10 form-input-custom"
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>
            <div>
              <label className="form-label-custom">{t('formTime', { defaultValue: 'Время' })}</label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="time"
                  required
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  className="h-10 sm:h-11 pl-10 form-input-custom"
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
