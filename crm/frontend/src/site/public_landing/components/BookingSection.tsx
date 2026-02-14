import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Calendar as CalendarIcon, Clock, Loader2, Check, ChevronsUpDown, User, Sparkles } from 'lucide-react';
import { useTranslation } from "react-i18next";

import { useAuth } from '@crm/contexts/AuthContext';
import { api } from '@crm/services/api';
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
import {
  buildReferralBookingSource,
  captureReferralAttributionFromCurrentUrl,
  getStoredReferralAttribution,
  persistReferralAttribution
} from '../utils/urlUtils';

// Import react-datepicker
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

// Import date-fns locales
import { enUS } from 'date-fns/locale/en-US';
import { es } from 'date-fns/locale/es';
import { arSA } from 'date-fns/locale/ar-SA';
import { de } from 'date-fns/locale/de';
import { fr } from 'date-fns/locale/fr';
import { hi } from 'date-fns/locale/hi';
import { kk } from 'date-fns/locale/kk';
import { pt } from 'date-fns/locale/pt';
import { ru } from 'date-fns/locale/ru';


export const BookingSection = () => {
  const { t, i18n } = useTranslation(['booking', 'public_landing', 'common']);
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [defaultCountry, setDefaultCountry] = useState<string>('ae');
  const [referralAttribution, setReferralAttribution] = useState<{ campaignId: number; shareToken: string }>({
    campaignId: 0,
    shareToken: ''
  });

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
        const servicesList = res.services || (Array.isArray(res) ? res : []);

        setServices(servicesList);

        // Extract unique categories, filter out empty/null values
        const categories = servicesList
          .map((s: any) => s.category)
          .filter((cat: any) => cat && typeof cat === 'string' && cat.trim() !== '');

        const uniqueCategories = Array.from(new Set(categories)) as string[];
        setAvailableCategories(uniqueCategories.sort());
      } catch (err) {
        console.error('Error fetching services for booking:', err);
      }
    };
    fetchServices();
  }, [i18n.language]);

  useEffect(() => {
    const resolveReferralAttribution = async () => {
      const storedAttribution = captureReferralAttributionFromCurrentUrl();
      const searchParams = new URLSearchParams(window.location.search);
      const campaignQueryValue = searchParams.get('ref_campaign');
      const shareQueryValue = searchParams.get('ref_share');
      const pathMatch = window.location.pathname.match(/^\/ref\/([a-z0-9]+)/i);
      const sharePathValue = pathMatch && pathMatch[1] ? pathMatch[1] : '';
      const normalizedShareToken = String(shareQueryValue ?? sharePathValue).trim().toLowerCase();
      const normalizedStoredShareToken = String(storedAttribution?.shareToken ?? '').trim().toLowerCase();
      const fallbackShareToken = normalizedShareToken.length > 0 ? normalizedShareToken : normalizedStoredShareToken;

      const parsedCampaignId = Number.parseInt(String(campaignQueryValue ?? ''), 10);
      if (Number.isFinite(parsedCampaignId) && parsedCampaignId > 0) {
        const nextAttribution = {
          campaignId: parsedCampaignId,
          shareToken: fallbackShareToken
        };
        setReferralAttribution(nextAttribution);
        persistReferralAttribution(nextAttribution, window.location.pathname);
        return;
      }

      if (fallbackShareToken.length === 0) {
        const storedFallback = getStoredReferralAttribution();
        setReferralAttribution({
          campaignId: Number(storedFallback?.campaignId ?? 0),
          shareToken: String(storedFallback?.shareToken ?? '')
        });
        return;
      }

      const storedCampaignId = Number.parseInt(String(storedAttribution?.campaignId ?? ''), 10);
      if (Number.isFinite(storedCampaignId) && storedCampaignId > 0) {
        const nextAttribution = {
          campaignId: storedCampaignId,
          shareToken: fallbackShareToken
        };
        setReferralAttribution(nextAttribution);
        persistReferralAttribution(nextAttribution, window.location.pathname);
        return;
      }

      try {
        const response = await api.getPublicReferralLinkProfile(fallbackShareToken);
        const resolvedCampaignId = Number.parseInt(String(response?.profile?.campaign_id ?? ''), 10);
        if (Number.isFinite(resolvedCampaignId) && resolvedCampaignId > 0) {
          const nextAttribution = {
            campaignId: resolvedCampaignId,
            shareToken: fallbackShareToken
          };
          setReferralAttribution(nextAttribution);
          persistReferralAttribution(nextAttribution, window.location.pathname);
          return;
        }
      } catch (error) {
        console.error('Error resolving referral link:', error);
      }

      const fallbackAttribution = {
        campaignId: 0,
        shareToken: fallbackShareToken
      };
      setReferralAttribution(fallbackAttribution);
      persistReferralAttribution(fallbackAttribution, window.location.pathname);
    };

    resolveReferralAttribution();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const digitsOnly = formData.phone.replace(/\D/g, '');
    const minDigits = 11;
    if (digitsOnly.length < minDigits) {
      setPhoneError(true);
      toast.error(t('phone_too_short', { count: minDigits }));
      return;
    }
    setPhoneError(false);

    if (formData.selectedServices.length === 0) {
      toast.error(t('formServicePlaceholder'));
      return;
    }

    try {
      setLoading(true);
      const availability = await api.getPublicAvailableSlots(
        formData.date,
        undefined,
        undefined,
        { serviceIds: formData.selectedServices }
      );
      const requestedTime = String(formData.time).slice(0, 5);
      const hasRequestedSlot = Array.isArray(availability?.slots)
        && availability.slots.some((slot: any) => {
          const slotTime = String(slot?.time ?? '').slice(0, 5);
          const slotAvailable = slot?.available !== false;
          return slotTime === requestedTime && slotAvailable;
        });

      if (!hasRequestedSlot) {
        toast.error(t('datetime.noSlots'));
        return;
      }

      const bookingSource = buildReferralBookingSource('public_landing', referralAttribution);

      const payload = {
        name: formData.name,
        phone: formData.phone,
        service_ids: formData.selectedServices,
        date: formData.date,
        time: formData.time,
        source: bookingSource
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

      toast.success(t('bookingSuccess'));
    } catch (err: any) {
      console.error('Error creating booking:', err);
      let errorMsg = err?.message || err?.detail || t('bookingError');

      // Если сервер вернул ключ ошибки, переводим его
      if (errorMsg === 'phone_too_short') {
        errorMsg = t('phone_too_short');
      }
      if (err?.error === 'slot_unavailable') {
        errorMsg = t('datetime.noSlots');
      }

      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to get category display name
  const getCategoryDisplayName = (category: string) => {
    if (!category) return category;

    // 1. Try dynamic translation first (Preferred)
    // Normalize key: "Hair Care" -> "hair_care"
    const catKey = category.toLowerCase().replace(/\s+/g, '_');
    const dynamicTranslation = t(`dynamic:categories.${catKey}`, { defaultValue: "" });

    if (dynamicTranslation) {
      return dynamicTranslation;
    }

    // 2. Fallback to booking.json services section (Legacy)
    // Format: services.category_Brows, services.category_Facial, etc.
    const translationKey = `services.category_${category}`;
    const translated = t(translationKey, {
      ns: 'booking',
      defaultValue: ""
    });

    if (translated) {
      return translated;
    }

    // 3. Fallback to capitalized original name
    return category.charAt(0).toUpperCase() + category.slice(1).toLowerCase();
  };

  return (
    <section id="booking" className="py-12 sm:py-16 lg:py-20 bg-background">
      <div className="max-w-2xl mx-auto px-3 sm:px-4 lg:px-6">
        <div className="text-center mb-8 sm:mb-12">
          <p className="text-xs sm:text-sm tracking-[0.15em] sm:tracking-[0.2em] uppercase text-muted-foreground mb-3">
            {t('bookingTag')}
          </p>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl mb-3 sm:mb-4 text-[var(--heading)]">
            {t('bookingTitlePart1')} <span className="text-primary">{t('bookingTitlePart2')}</span>
          </h2>
          <p className="text-sm sm:text-base lg:text-lg text-foreground/70">
            {t('bookingDesc')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="glass-panel lg:rounded-2xl p-4 sm:p-6 lg:p-8 shadow-xl border border-primary/20 space-y-4 sm:space-y-6">
          <div>
            <label className="form-label-custom">{t('formName')}</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={t('formNamePlaceholder')}
                className="h-10 sm:h-11 pl-10 form-input-custom"
              />
            </div>
          </div>

          <div>
            <label className="form-label-custom">{t('formPhone')}</label>
            <PhoneInputWithSearch
              defaultCountry={defaultCountry}
              value={formData.phone}
              onChange={handlePhoneChange}
              error={phoneError}
              searchPlaceholder={t('searchCountry')}
            />
            {phoneError && (
              <p className="text-xs text-destructive mt-1">
                {t('phone_too_short', { count: 11 })}
              </p>
            )}
          </div>

          <div>
            <label className="form-label-custom">{t('formService')}</label>
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
                        const serviceName = t(`dynamic:services.${id}.name`, { defaultValue: s.name || "" });
                        return (
                          <span key={id} className="bg-primary/10 text-primary text-[10px] px-1.5 py-0.5 rounded-full border border-primary/20">
                            {serviceName}
                          </span>
                        );
                      })
                    ) : (
                      <span className="text-muted-foreground">{t('formServicePlaceholder')}</span>
                    )}
                  </div>
                  <ChevronsUpDown className="absolute right-3 top-3 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-0" align="start">
                <Command>
                  <CommandInput placeholder={t('searchService')} />
                  <CommandList>
                    <CommandEmpty>{t('noServicesFound')}</CommandEmpty>
                    {availableCategories.map((category: string) => (
                      <CommandGroup key={category} heading={getCategoryDisplayName(category)}>
                        {services
                          .filter((s: any) => s.category === category)
                          .map((service: any) => {
                            const serviceName = t(`dynamic:services.${service.id}.name`, { defaultValue: service.name || "" });
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
              <label className="form-label-custom">{t('formDate')}</label>
              <div className="relative">
                <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none z-10" />
                <DatePicker
                  selected={formData.date ? new Date(formData.date) : null}
                  onChange={(date: Date | null) => {
                    if (date) {
                      const year = date.getFullYear();
                      const month = String(date.getMonth() + 1).padStart(2, '0');
                      const day = String(date.getDate()).padStart(2, '0');
                      setFormData({ ...formData, date: `${year}-${month}-${day}` });
                    } else {
                      setFormData({ ...formData, date: '' });
                    }
                  }}
                  minDate={new Date()}
                  dateFormat="dd/MM/yyyy"
                  locale={
                    i18n.language === 'en' ? enUS :
                      i18n.language === 'es' ? es :
                        i18n.language === 'ar' ? arSA :
                          i18n.language === 'de' ? de :
                            i18n.language === 'fr' ? fr :
                              i18n.language === 'hi' ? hi :
                                i18n.language === 'kk' ? kk :
                                  i18n.language === 'pt' ? pt :
                                    ru
                  }
                  placeholderText={t('formDatePlaceholder')}
                  className="w-full h-10 sm:h-11 pl-10 form-input-custom !bg-muted/20"
                  required
                />
              </div>
            </div>
            <div>
              <label className="form-label-custom">{t('formTime')}</label>
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
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CalendarIcon className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />}
            {t('submitBooking')}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            {t('privacyAgreementStart')}{' '}
            <a href="/privacy-policy" className="text-primary hover:underline">
              {t('privacyPolicy')}
            </a>
          </p>
        </form>
      </div >
    </section >
  );
}
