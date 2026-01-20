import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Calendar, Clock, Loader2, Check, ChevronsUpDown, User, Sparkles } from 'lucide-react';
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
import { DEFAULT_VALUES, EXTERNAL_SERVICES } from '../utils/constants';
import { safeFetch, safeExternalApiCall } from '../utils/errorHandler';
import { getTodayDate } from '../utils/dateUtils';

export const BookingSection = () => {
  const { t, i18n } = useTranslation(['booking', 'public_landing', 'common']);
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [defaultCountry, setDefaultCountry] = useState<string>('ae');

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    selectedServices: [] as number[], // Массив ID выбранных услуг
    date: '',
    time: ''
  });
  const [services, setServices] = useState<any[]>([]); // Список всех услуг
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [phoneError, setPhoneError] = useState(false);

  // Detect country from geolocation or use saved preference
  useEffect(() => {
    const savedCountry = localStorage.getItem('preferred_phone_country');
    if (savedCountry) {
      setDefaultCountry(savedCountry.toLowerCase());
    } else {
      // Try to detect country from IP with error handling
      safeExternalApiCall(
        async () => {
          const res = await safeFetch(EXTERNAL_SERVICES.IP_API);
          return res.json();
        },
        'IP API',
        { country_code: DEFAULT_VALUES.COUNTRY_CODE.toUpperCase() }
      ).then(data => {
        if (data.country_code) {
          const countryCode = data.country_code.toLowerCase();
          setDefaultCountry(countryCode);
          localStorage.setItem('preferred_phone_country', countryCode);
        } else {
          setDefaultCountry(DEFAULT_VALUES.COUNTRY_CODE);
        }
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

  // Listen for category or service selection from URL hash
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;

      // Handle category selection
      const categoryMatch = hash.match(/booking\?category=([^&]+)/);
      if (categoryMatch && categoryMatch[1] && services.length > 0) {
        const category = decodeURIComponent(categoryMatch[1]);
        const categoryServices = services.filter((s: any) => s.category === category);
        if (categoryServices.length > 0) {
          const serviceIds = categoryServices.map((s: any) => s.id);
          setFormData(prev => ({
            ...prev,
            selectedServices: [...new Set([...prev.selectedServices, ...serviceIds])]
          }));
        }
        window.history.replaceState(null, '', '#booking');
      }

      // Handle specific service selection
      const serviceMatch = hash.match(/booking\?service=([^&]+)/);
      if (serviceMatch && serviceMatch[1] && services.length > 0) {
        const serviceId = parseInt(serviceMatch[1]);
        if (!isNaN(serviceId)) {
          setFormData(prev => ({
            ...prev,
            selectedServices: prev.selectedServices.includes(serviceId)
              ? prev.selectedServices
              : [...prev.selectedServices, serviceId]
          }));
        }
        window.history.replaceState(null, '', '#booking');
      }
    };
    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [services]);

  useEffect(() => {
    // Fetch services and extract unique categories
    const fetchServices = async () => {
      try {
        const res = await api.getPublicServices();
        const data = res; // api.getPublicServices() usually returns data directly

        let servicesList: any[] = [];
        if (Array.isArray(data)) {
          servicesList = data;
        }

        setServices(servicesList);

        // Extract unique categories, filter out empty/null values
        const categories = servicesList
          .map((s: any) => s.category)
          .filter((cat: any) => cat && typeof cat === 'string' && cat.trim() !== '');

        const uniqueCategories = Array.from(new Set(categories)).sort();
        setAvailableCategories(uniqueCategories);
      } catch (err) {
        console.error('Error fetching services for booking:', err);
      }
    };
    fetchServices();
  }, [i18n.language]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const digitsOnly = formData.phone.replace(/\D/g, '');
    const minDigits = 11;
    if (digitsOnly.length < minDigits) {
      setPhoneError(true);
      toast.error(t('phone_too_short', { count: minDigits, defaultValue: `Номер телефона должен содержать минимум ${minDigits} цифр с учетом кода страны` }));
      return;
    }
    setPhoneError(false);

    if (formData.selectedServices.length === 0) {
      toast.error(t('formServicePlaceholder', { defaultValue: 'Выберите хотя бы одну услугу' }));
      return;
    }

    try {
      setLoading(true);

      const payload = {
        name: formData.name,
        phone: formData.phone,
        service_ids: formData.selectedServices,
        date: formData.date,
        time: formData.time,
        source: 'public_landing'
      };

      await api.createPublicBooking(payload);

      // Reset form
      setFormData({
        name: '',
        phone: '',
        selectedServices: [],
        date: '',
        time: ''
      });

      toast.success(t('bookingSuccess', { defaultValue: 'Заявка успешно отправлена! Мы свяжемся с вами для подтверждения.' }));
    } catch (err: any) {
      console.error('Error creating booking:', err);
      let errorMsg = err?.message || err?.detail || t('bookingError', { defaultValue: 'Ошибка при создании записи. Попробуйте позже.' });

      // Если сервер вернул ключ ошибки, переводим его
      if (errorMsg === 'phone_too_short') {
        errorMsg = t('phone_too_short', { defaultValue: 'Номер телефона должен содержать минимум 11 цифр с учетом кода страны' });
      }

      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to get category display name
  const getCategoryDisplayName = (category: string) => {
    if (!category) return category;

    // Try translation from booking.json services section
    // Format: services.category_Brows, services.category_Facial, etc.
    // Note: "Permanent Makeup" has a space, so we keep it as is
    const translationKey = `services.category_${category}`;

    // Use t with booking namespace, same format as ServicesStep.tsx
    const translated = t(translationKey, {
      ns: 'booking',
      defaultValue: category
    });

    // Return translated value (if translation not found, defaultValue will be used)
    return translated;
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
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={t('formNamePlaceholder', { defaultValue: 'Ваше имя' })}
                className="h-10 sm:h-11 pl-10 form-input-custom"
              />
            </div>
          </div>

          <div>
            <label className="form-label-custom">{t('formPhone', { defaultValue: 'Телефон' })}</label>
            <PhoneInputWithSearch
              defaultCountry={defaultCountry}
              value={formData.phone}
              onChange={handlePhoneChange}
              error={phoneError}
              searchPlaceholder={t('searchCountry', { defaultValue: 'Поиск страны...' })}
            />
            {phoneError && (
              <p className="text-xs text-destructive mt-1">
                {t('phone_too_short', { count: 11 })}
              </p>
            )}
          </div>

          <div>
            <label className="form-label-custom">{t('formService', { defaultValue: 'Услуги' })}</label>
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={open}
                  className="w-full justify-between h-auto min-h-[40px] sm:min-h-[44px] px-3 py-2 bg-muted/20 hover:bg-muted/30 text-left font-normal border-primary/20 flex-wrap gap-1 pr-10 relative"
                >
                  <Sparkles className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <div className="pl-7 flex flex-wrap gap-1">
                    {formData.selectedServices.length > 0 ? (
                      formData.selectedServices.map(id => {
                        const s = services.find(srv => srv.id === id);
                        if (!s) return null;
                        const serviceName = s[`name_${i18n.language}`] || s.name;
                        return (
                          <span key={id} className="bg-primary/10 text-primary text-[10px] px-1.5 py-0.5 rounded-full border border-primary/20">
                            {serviceName}
                          </span>
                        );
                      })
                    ) : (
                      <span className="text-muted-foreground">{t('formServicePlaceholder', { defaultValue: 'Выберите услуги' })}</span>
                    )}
                  </div>
                  <ChevronsUpDown className="absolute right-3 top-3 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-0" align="start">
                <Command>
                  <CommandInput placeholder={t('searchService', { defaultValue: 'Найти услугу...' })} />
                  <CommandList>
                    <CommandEmpty>{t('noServicesFound', { defaultValue: 'Услуги не найдены.' })}</CommandEmpty>
                    {availableCategories.map((category: string) => (
                      <CommandGroup key={category} heading={getCategoryDisplayName(category)}>
                        {services
                          .filter((s: any) => s.category === category)
                          .map((service: any) => {
                            const serviceName = service[`name_${i18n.language}`] || service.name;
                            return (
                              <CommandItem
                                key={service.id}
                                value={`${serviceName} ${service.name}`}
                                onSelect={() => {
                                  setFormData(prev => ({
                                    ...prev,
                                    selectedServices: prev.selectedServices.includes(service.id)
                                      ? prev.selectedServices.filter(id => id !== service.id)
                                      : [...prev.selectedServices, service.id]
                                  }));
                                }}
                              >
                                <div className={cn(
                                  "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                  formData.selectedServices.includes(service.id)
                                    ? "bg-primary text-primary-foreground"
                                    : "opacity-50 [&_svg]:invisible"
                                )}>
                                  <Check className={cn("h-3 w-3")} />
                                </div>
                                <div className="flex flex-col">
                                  <span>{serviceName}</span>
                                  {service.price && (
                                    <span className="text-[10px] text-muted-foreground">
                                      {service.price} {service.currency}
                                    </span>
                                  )}
                                </div>
                              </CommandItem>
                            );
                          })}
                      </CommandGroup>
                    ))}
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
                  min={getTodayDate()}
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
