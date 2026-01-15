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
import { DEFAULT_VALUES, EXTERNAL_SERVICES } from '../utils/constants';
import { safeFetch } from '../utils/errorHandler';

export const BookingSection = () => {
  const { t, i18n } = useTranslation(['booking', 'public_landing', 'common']);
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [defaultCountry, setDefaultCountry] = useState<string>('ae');

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    service: '', // Теперь хранит категорию
    date: '',
    time: ''
  });
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

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

  // Listen for category selection from URL hash
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      const match = hash.match(/booking\?category=([^&]+)/);
      if (match && match[1]) {
        const category = decodeURIComponent(match[1]);
        setFormData(prev => ({ ...prev, service: category }));
        // Clean the hash
        window.history.replaceState(null, '', '#booking');
      }
    };
    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    // Fetch services and extract unique categories
    const fetchCategories = async () => {
      try {
        const API_URL = getApiUrl();
        const res = await safeFetch(`${API_URL}/api/public/services?language=${i18n.language}`);
        const data = await res.json();

        let services: any[] = [];
        if (Array.isArray(data)) {
          services = data;
        } else if (data.categories) {
          // Flatten categories to get all services (fallback)
          data.categories.forEach((cat: any) => {
            if (cat.items) {
              services.push(...cat.items);
            }
          });
        }

        // Extract unique categories, filter out empty/null values
        const categories = services
          .map((s: any) => s.category)
          .filter((cat: any) => cat && typeof cat === 'string' && cat.trim() !== '');

        const uniqueCategories = Array.from(new Set(categories)).sort();
        
        setAvailableCategories(uniqueCategories);
      } catch (err) {
        console.error('Error fetching categories for booking:', err);
      }
    };
    fetchCategories();
  }, [i18n.language]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.service) {
      toast.error(t('formServicePlaceholder', { defaultValue: 'Выберите категорию услуги' }));
      return;
    }

    try {
      setLoading(true);

      // Generate client ID (instagram_id)
      const instagramId = user?.username || `web_${formData.phone.replace(/\D/g, '')}`;

      const bookingData = {
        instagram_id: instagramId,
        service: formData.service, // Отправляем категорию
        name: formData.name,
        phone: formData.phone,
        service_id: null, // Нет конкретного ID услуги, только категория
        date: formData.date,
        time: formData.time,
        source: 'website',
        status: 'pending_confirmation'
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
            <label className="form-label-custom">{t('formService', { defaultValue: 'Категория услуги' })}</label>
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={open}
                  className="w-full justify-between h-10 sm:h-11 px-3 bg-muted/20 hover:bg-muted/30 text-left font-normal border-primary/20"
                >
                  {formData.service
                    ? getCategoryDisplayName(formData.service)
                    : t('formServicePlaceholder', { defaultValue: 'Выберите категорию услуги' })}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-0" align="start">
                <Command>
                  <CommandInput placeholder={t('searchCategory', { defaultValue: 'Найти категорию...' })} />
                  <CommandList>
                    <CommandEmpty>{t('noCategoriesFound', { defaultValue: 'Категории не найдены.' })}</CommandEmpty>
                    <CommandGroup>
                      {availableCategories.map((category: string) => {
                        const displayName = getCategoryDisplayName(category);
                        return (
                        <CommandItem
                            key={category}
                            value={displayName}
                          onSelect={() => {
                              setFormData({ ...formData, service: category });
                            setOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                                formData.service === category ? "opacity-100" : "opacity-0"
                            )}
                          />
                            {displayName}
                        </CommandItem>
                        );
                      })}
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
