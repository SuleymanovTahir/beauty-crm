//UserBookingWizard.tsx
import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, parseISO } from 'date-fns';
import { ru, enUS, ar, es, fr, de, pt, hi, kk } from 'date-fns/locale';
import {
  ArrowLeft, Calendar as CalendarIcon, ChevronRight, Clock,
  List, MapPin, Search, Star, User, X, Loader2,
  Sparkles, CheckCircle2, Users
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent } from '../../components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar';
import { api } from '../../../src/services/api';
import { toast } from 'sonner';
import { useAuth } from '../../../src/contexts/AuthContext';
import { Badge } from '../../components/ui/badge';
import { motion, AnimatePresence } from 'motion/react';
import { ScrollArea } from '../../components/ui/scroll-area';
import { useTranslation } from 'react-i18next';
import PublicLanguageSwitcher from '../../../src/components/PublicLanguageSwitcher';

import './UserBookingWizard.css';

// Language configurations


interface Service {
  id: number;
  name: string;
  name_ru?: string;
  name_ar?: string;
  name_es?: string;
  name_fr?: string;
  name_de?: string;
  name_pt?: string;
  name_hi?: string;
  name_kk?: string;
  price: number;
  duration?: string;
  currency?: string;
  description?: string;
  category?: string;
  [key: string]: any;
}

interface Master {
  id: number;
  full_name: string;
  username: string;
  photo?: string;
  position?: string;
  rating?: number;
  reviews?: number;
  services?: Service[];
}

interface Slot {
  time: string;
  is_optimal: boolean;
}

interface Props {
  onClose?: () => void;
  onSuccess?: () => void;
}

export function UserBookingWizard({ onClose, onSuccess }: Props) {
  const { t, i18n } = useTranslation(['booking', 'common']);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const step = (searchParams.get('booking') as any) || 'menu';
  const setStep = (newStep: string) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('booking', newStep);
      return next;
    }, { replace: true });
  };

  const [loading, setLoading] = useState(false);
  const [masters, setMasters] = useState<Master[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [salonSettings, setSalonSettings] = useState<any>(null);

  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [selectedMaster, setSelectedMaster] = useState<Master | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string>('');

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const [availableDates, setAvailableDates] = useState<Set<string>>(new Set());
  const [availableSlots, setAvailableSlots] = useState<Slot[]>([]);
  const [professionalSelected, setProfessionalSelected] = useState(false);
  const [stepHistory, setStepHistory] = useState<string[]>([]);
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [masterNextSlots, setMasterNextSlots] = useState<Record<number, string[]>>({});
  const getDateLocale = () => {
    switch (i18n.language) {
      case 'ru': return ru;
      case 'ar': return ar;
      case 'es': return es;
      case 'fr': return fr;
      case 'de': return de;
      case 'pt': return pt;
      case 'hi': return hi;
      case 'kk': return kk;
      default: return enUS;
    }
  };
  useEffect(() => {
    if (step !== 'menu' && !stepHistory.includes(step)) {
      setStepHistory(prev => [...prev, step]);
    }
  }, [step]);

  // Сохранение и восстановление состояния бронирования
  useEffect(() => {
    const saveBookingState = () => {
      const state = {
        selectedServices: selectedServices.map(s => s.id),
        selectedMaster: selectedMaster?.id || null,
        professionalSelected,
        selectedDate: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null,
        selectedTime,
        timestamp: Date.now()
      };
      sessionStorage.setItem('booking-state', JSON.stringify(state));
    };

    if (selectedServices.length > 0 || selectedMaster || selectedDate || selectedTime) {
      saveBookingState();
    }
  }, [selectedServices, selectedMaster, professionalSelected, selectedDate, selectedTime]);

  // Восстановление состояния при загрузке
  useEffect(() => {
    const restoreBookingState = async () => {
      const savedState = sessionStorage.getItem('booking-state');
      if (!savedState || services.length === 0 || masters.length === 0) return;

      try {
        const state = JSON.parse(savedState);
        const stateAge = Date.now() - state.timestamp;

        if (stateAge > 60 * 60 * 1000) {
          sessionStorage.removeItem('booking-state');
          return;
        }

        if (state.selectedServices?.length > 0) {
          const restoredServices = services.filter(s => state.selectedServices.includes(s.id));
          if (restoredServices.length > 0) {
            setSelectedServices(restoredServices);
          }
        }

        if (state.selectedMaster) {
          const master = masters.find(m => m.id === state.selectedMaster);
          if (master) {
            setSelectedMaster(master);
            setProfessionalSelected(true);
          }
        } else if (state.professionalSelected) {
          setProfessionalSelected(true);
        }

        if (state.selectedDate && state.selectedTime) {
          const date = parseISO(state.selectedDate);

          try {
            const masterName = state.selectedMaster
              ? masters.find(m => m.id === state.selectedMaster)?.full_name || 'any'
              : 'any';
            const duration = state.selectedServices?.reduce((sum: number, id: number) => {
              const service = services.find(s => s.id === id);
              return sum + parseInt(service?.duration || '30');
            }, 0) || 60;

            const year = date.getFullYear();
            const month = date.getMonth() + 1;
            const res = await api.getAvailableDates(masterName, year, month, duration);

            if (res.success && res.available_dates?.includes(state.selectedDate)) {
              const employeeId = state.selectedMaster || masters[0]?.id;
              if (employeeId) {
                const slotsRes = await api.getPublicAvailableSlots(state.selectedDate, employeeId);
                const isTimeAvailable = slotsRes.slots?.some(
                  (s: any) => s.time === state.selectedTime && s.available
                );

                if (isTimeAvailable) {
                  setSelectedDate(date);
                  setSelectedTime(state.selectedTime);
                } else {
                  setSelectedDate(date);
                }
              }
            }
          } catch (e) {
            console.log('Could not verify date/time availability', e);
          }
        } else if (state.selectedDate) {
          const date = parseISO(state.selectedDate);
          setSelectedDate(date);
        }
      } catch (e) {
        console.error('Error restoring booking state:', e);
        sessionStorage.removeItem('booking-state');
      }
    };

    restoreBookingState();
  }, [services, masters]);

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [usersRes, servicesRes, salonRes] = await Promise.all([
          api.getUsers(),
          api.getServices(),
          fetch('/api/public/salon-settings').then(r => r.json()).catch(() => null)
        ]);

        const users = Array.isArray(usersRes) ? usersRes : (usersRes.users || []);
        setMasters(users.filter((u: any) => u.role === 'employee' || u.is_service_provider));

        if (Array.isArray(servicesRes)) {
          setServices(servicesRes);
        } else if (servicesRes.services) {
          setServices(servicesRes.services);
        } else if (servicesRes.categories) {
          const allServices: Service[] = [];
          servicesRes.categories.forEach((cat: any) => {
            if (cat.items) allServices.push(...cat.items);
          });
          setServices(allServices);
        }

        if (salonRes) {
          setSalonSettings(salonRes);
        }
      } catch (e) {
        console.error("Failed to load booking data", e);
      }
    };
    loadInitialData();
  }, []);

  // Load availability
  useEffect(() => {
    const fetchAvailability = async () => {
      let masterName = selectedMaster ? (selectedMaster.full_name || selectedMaster.username) : 'any';
      let duration = selectedServices.reduce((sum, s) => sum + parseInt(s.duration || '30'), 0) || 60;

      try {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth() + 1;
        const res = await api.getAvailableDates(masterName, year, month, duration);
        if (res.success && res.available_dates) {
          setAvailableDates(new Set(res.available_dates));
        }
      } catch (e) { }
    };
    fetchAvailability();
  }, [currentMonth, selectedMaster, selectedServices]);

  // Load nearest available slots for each master
  useEffect(() => {
    if (step !== 'professional' || masters.length === 0) return;

    const fetchMasterNextSlots = async () => {
      const today = format(new Date(), 'yyyy-MM-dd');
      const nextSlots: Record<number, string[]> = {};

      await Promise.all(masters.map(async (master) => {
        try {
          const res = await api.getPublicAvailableSlots(today, master.id);
          const available = (res.slots || []).filter((s: any) => s.available);
          if (available.length > 0) {
            nextSlots[master.id] = available.slice(0, 4).map((s: any) => s.time);
          }
        } catch (e) {
          // Ignore errors
        }
      }));

      setMasterNextSlots(nextSlots);
    };

    fetchMasterNextSlots();
  }, [step, masters]);

  // Load slots
  useEffect(() => {
    if (!selectedDate) {
      setAvailableSlots([]);
      return;
    }

    const fetchSlots = async () => {
      setLoading(true);
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      try {
        if (selectedMaster) {
          const res = await api.getPublicAvailableSlots(dateStr, selectedMaster.id);
          setAvailableSlots((res.slots || []).filter(s => s.available).map(s => ({ time: s.time, is_optimal: (s as any).is_optimal || false })));
        } else {
          const results = await Promise.all(masters.map(m =>
            api.getPublicAvailableSlots(dateStr, m.id).then(r => r.slots || []).catch(() => [])
          ));
          const seen = new Set<string>();
          const allSlots: Slot[] = [];
          results.flat().forEach(s => {
            if (s.available && !seen.has(s.time)) {
              seen.add(s.time);
              allSlots.push({ time: s.time, is_optimal: (s as any).is_optimal || false });
            }
          });
          setAvailableSlots(allSlots.sort((a, b) => a.time.localeCompare(b.time)));
        }
      } catch (e) { }
      setLoading(false);
    };
    fetchSlots();
  }, [selectedDate, selectedMaster, masters]);

  const categories = ['All', ...Array.from(new Set(services.map(s => s.category || 'General')))];

  const getServiceName = (s: Service) => (s as any)[`name_${i18n.language}`] || s.name_ru || s.name;

  const filteredServices = services.filter(service => {
    const name = getServiceName(service).toLowerCase();
    const matchesSearch = name.includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || service.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const totalPrice = selectedServices.reduce((sum, s) => sum + s.price, 0);
  const totalDuration = selectedServices.reduce((sum, s) => sum + parseInt(s.duration || '0'), 0);

  const handleServiceSelect = (service: Service) => {
    setSelectedServices(prev => {
      const exists = prev.find(s => s.id === service.id);
      if (exists) {
        return prev.filter(s => s.id !== service.id);
      }
      return [...prev, service];
    });
  };

  const handleMasterSelect = (master: Master | null) => {
    setSelectedMaster(master);
    setProfessionalSelected(true);
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setSelectedTime('');
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
  };

  const handleConfirmBooking = async () => {
    if (!selectedServices.length || !selectedDate || !selectedTime) {
      toast.error('Please complete all selections');
      return;
    }

    if (!user?.phone && !phoneNumber) {
      setShowPhoneModal(true);
      return;
    }

    setLoading(true);
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const phone = phoneNumber || user?.phone;

      for (const service of selectedServices) {
        await api.createBooking({
          instagram_id: user?.username || `web_${user?.id || 'guest'}`,
          service: getServiceName(service),
          master: selectedMaster?.username || 'any_professional',
          date: dateStr,
          time: selectedTime,
          phone: phone,
          name: user?.full_name
        });
      }

      toast.success('Booking confirmed successfully!', {
        description: `${format(selectedDate, 'MMMM dd, yyyy', { locale: getDateLocale() })} at ${selectedTime}`

      });

      sessionStorage.removeItem('booking-state');

      if (onSuccess) onSuccess();
      if (onClose) onClose();
    } catch (e) {
      toast.error('Error creating booking');
    } finally {
      setLoading(false);
    }
  };

  const renderHeader = (title: string, subtitle?: string) => (
    <div className="sticky top-0 z-10 bg-gradient-to-br from-rose-50 via-purple-50 to-blue-50 pb-3 pt-3">
      <div className="flex items-center gap-3 mb-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            if (step === 'menu') {
              navigate('/account', { replace: true });
            } else {
              setStep('menu');
            }
          }}
          className="rounded-full hover:bg-white/50 h-9 w-9"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>

        <div className="flex-1" />

        <PublicLanguageSwitcher />

        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-white/50 h-9 w-9">
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      <div className="mb-2">
        <h2 className="text-lg md:text-xl font-bold mb-0.5">{title}</h2>
        {subtitle && <p className="text-muted-foreground text-xs">{subtitle}</p>}
      </div>

      {step !== 'menu' && (
        <div className="flex items-center gap-1.5 text-[10px] font-medium overflow-x-auto">
          <button
            className={`${step === 'services' ? 'text-purple-600' : 'text-muted-foreground'} transition-colors whitespace-nowrap`}
            onClick={() => setStep('services')}
          >
            {t('services', 'Services')}
          </button>
          <ChevronRight className="w-2.5 h-2.5 text-muted-foreground flex-shrink-0" />
          <button
            className={`${step === 'professional' ? 'text-purple-600' : 'text-muted-foreground'} transition-colors whitespace-nowrap`}
            onClick={() => selectedServices.length > 0 && setStep('professional')}
            disabled={selectedServices.length === 0}
          >
            {t('professional', 'Professional')}
          </button>
          <ChevronRight className="w-2.5 h-2.5 text-muted-foreground flex-shrink-0" />
          <button
            className={`${step === 'datetime' ? 'text-purple-600' : 'text-muted-foreground'} transition-colors whitespace-nowrap`}
            onClick={() => selectedServices.length > 0 && setStep('datetime')}
            disabled={selectedServices.length === 0}
          >
            {t('date_time', 'Date & Time')}
          </button>
          {step === 'confirm' && (
            <>
              <ChevronRight className="w-2.5 h-2.5 text-muted-foreground flex-shrink-0" />
              <span className="text-purple-600 whitespace-nowrap">{t('confirm', 'Confirm')}</span>
            </>
          )}
        </div>
      )}
    </div>
  );

  if (step === 'menu') {
    const hasServices = selectedServices.length > 0;
    const hasMaster = professionalSelected || selectedMaster;
    const hasDateTime = !!(selectedDate && selectedTime);
    const allComplete = hasServices && hasMaster && hasDateTime;

    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-purple-50 to-blue-50 pt-8 pb-8 px-4">
        <div className="max-w-xl mx-auto space-y-3">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold mb-1 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                {salonSettings?.name || t('salon_name', 'Beauty Salon')}
              </h1>
              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {salonSettings?.address || t('salon_address', 'Address not available')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <PublicLanguageSwitcher />

              {onClose && (
                <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full h-9 w-9">
                  <X className="w-5 h-5" />
                </Button>
              )}
            </div>
          </div>

          <div className="grid gap-2.5">
            {[
              {
                value: 'services',
                icon: List,
                title: t('select_services', 'Select Services'),
                description: selectedServices.length > 0
                  ? `${selectedServices.length} selected • ${totalPrice} ${salonSettings?.currency || 'AED'}`
                  : t('choose_from_menu', "Choose from our menu"),
                gradient: 'from-purple-500 to-pink-500'
              },
              {
                value: 'professional',
                icon: User,
                title: t('choose_professional', 'Choose Professional'),
                description: selectedMaster ? selectedMaster.full_name : (professionalSelected ? t('any_available', "Any Available") : t('select_master', "Select your preferred master")),
                gradient: 'from-blue-500 to-cyan-500'
              },
              {
                value: 'datetime',
                icon: CalendarIcon,
                title: t('select_date_time', 'Select Date & Time'),
                description: selectedDate && selectedTime
                  ? `${format(selectedDate, 'MMM dd', { locale: getDateLocale() })} at ${selectedTime}`
                  : t('pick_slot', "Pick your appointment slot"),
                gradient: 'from-orange-500 to-red-500'
              }
            ].map((card, idx) => (
              <motion.div
                key={card.value}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.08 }}
              >
                <Card
                  className="group cursor-pointer border-2 hover:border-purple-500 transition-all hover:shadow-lg overflow-hidden"
                  onClick={() => setStep(card.value as any)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${card.gradient} flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform`}>
                        <card.icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-sm mb-0.5 truncate">{card.title}</h3>
                        <p className="text-[11px] text-muted-foreground truncate">{card.description}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform flex-shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {allComplete && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Button
                size="lg"
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-4 rounded-xl shadow-lg h-auto"
                onClick={() => setStep('confirm')}
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                {t('continue_confirmation', 'Continue to Confirmation')}
              </Button>
            </motion.div>
          )}
        </div>
      </div>
    );
  }

  if (step === 'services') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-purple-50 to-blue-50 pt-4 pb-20 px-4">
        <div className="max-w-2xl mx-auto">
          {renderHeader(t('select_services', 'Select Services'), t('choose_one_or_more', 'Choose one or more services'))}

          <div className="mb-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={t('search_services', 'Search services...')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 rounded-lg border-2 focus:border-purple-500 bg-white text-sm"
              />
            </div>
          </div>

          <ScrollArea className="mb-3">
            <div className="flex gap-1.5 pb-1.5">
              {categories.map(cat => (
                <Button
                  key={cat}
                  variant={selectedCategory === cat ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(cat)}
                  className={`rounded-full whitespace-nowrap text-xs h-7 px-3 ${selectedCategory === cat
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md'
                      : 'bg-white hover:bg-purple-50'
                    }`}
                >
                  {cat}
                </Button>
              ))}
            </div>
          </ScrollArea>

          <div className="grid gap-2.5 mb-4">
            <AnimatePresence mode="popLayout">
              {filteredServices.map((service, idx) => {
                const isSelected = selectedServices.some(s => s.id === service.id);
                return (
                  <motion.div
                    key={service.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: idx * 0.02 }}
                  >
                    <Card
                      className={`cursor-pointer transition-all hover:shadow-md bg-white ${isSelected ? 'border-2 border-purple-500 shadow-sm' : 'border-2 border-transparent hover:border-purple-200'
                        }`}
                      onClick={() => handleServiceSelect(service)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between gap-2.5">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-1">
                              <h3 className="font-bold text-sm truncate">{getServiceName(service)}</h3>
                              {isSelected && (
                                <CheckCircle2 className="w-4 h-4 text-purple-600 flex-shrink-0" />
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mb-2 line-clamp-1">{service.description}</p>
                            <div className="flex items-center gap-2.5 text-xs flex-wrap">
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3 text-muted-foreground" />
                                <span>{service.duration || '30'} min</span>
                              </div>
                              <Badge variant="secondary" className="text-xs font-semibold bg-purple-100 text-purple-700 px-2 h-5">
                                {service.price} {service.currency || salonSettings?.currency || 'AED'}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {selectedServices.length > 0 && (
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-3 z-50">
              <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
                <div>
                  <div className="font-bold text-sm">{totalPrice} {salonSettings?.currency || 'AED'}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {selectedServices.length} service{selectedServices.length > 1 ? 's' : ''} • {totalDuration} min
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => setStep('professional')}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-md h-9 px-4"
                >
                  {t('continue', 'Continue')}
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (step === 'professional') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-purple-50 to-blue-50 pt-4 pb-20 px-4">
        <div className="max-w-2xl mx-auto">
          {renderHeader(t('choose_professional', 'Choose Professional'), t('select_preferred_master', 'Select your preferred master or any available'))}

          <div className="space-y-2.5">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Card
                className={`cursor-pointer transition-all hover:shadow-md bg-white ${selectedMaster === null && professionalSelected ? 'border-2 border-purple-500 shadow-sm' : 'border-2 border-transparent hover:border-purple-200'
                  }`}
                onClick={() => handleMasterSelect(null)}
              >
                <CardContent className="p-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white shadow-md">
                      <Users className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-sm mb-0.5 flex items-center gap-1.5 truncate">
                        {t('any_available_professional', 'Any Available Professional')}
                        {selectedMaster === null && professionalSelected && <CheckCircle2 className="w-4 h-4 text-purple-600 flex-shrink-0" />}
                      </h3>
                      <p className="text-xs text-muted-foreground truncate">
                        {t('first_available_master', 'First available master')}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {masters.map((master, idx) => {
              const isSelected = selectedMaster?.id === master.id;
              return (
                <motion.div
                  key={master.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: (idx + 1) * 0.04 }}
                >
                  <Card
                    className={`cursor-pointer transition-all hover:shadow-md bg-white ${isSelected ? 'border-2 border-purple-500 shadow-sm' : 'border-2 border-transparent hover:border-purple-200'
                      }`}
                    onClick={() => handleMasterSelect(master)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start gap-2.5">
                        <Avatar className="w-10 h-10 border-2 border-purple-200 shadow-sm">
                          <AvatarImage src={master.photo} />
                          <AvatarFallback>{master.full_name[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <h3 className="font-bold text-sm truncate">{master.full_name}</h3>
                            {isSelected && <CheckCircle2 className="w-4 h-4 text-purple-600 flex-shrink-0" />}
                          </div>
                          <p className="text-xs text-muted-foreground mb-1.5 truncate">{master.position}</p>
                          <div className="flex items-center gap-2 text-xs mb-2 flex-wrap">
                            <div className="flex items-center gap-0.5">
                              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                              <span className="font-semibold">{master.rating || '5.0'}</span>
                            </div>
                            {master.reviews && master.reviews > 0 && (
                              <span className="text-muted-foreground">({master.reviews} reviews)</span>
                            )}
                          </div>

                          {masterNextSlots[master.id] && masterNextSlots[master.id].length > 0 && (
                            <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-2 rounded-lg border border-green-100">
                              <p className="text-[10px] text-green-700 font-medium mb-1 flex items-center gap-0.5">
                                <Sparkles className="w-2.5 h-2.5" />
                                {t('available_today', 'Available today')}:
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {masterNextSlots[master.id].map(time => (
                                  <Badge key={time} variant="outline" className="text-[10px] bg-white border-green-200 text-green-700 px-1.5 py-0 h-4">
                                    {time}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          {(selectedMaster !== null || professionalSelected) && (
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-3 z-50">
              <div className="max-w-2xl mx-auto">
                <Button
                  size="sm"
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-md h-10"
                  onClick={() => setStep('datetime')}
                >
                  {t('continue_to_datetime', 'Continue to Date & Time')}
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (step === 'datetime') {
    const monthDays = eachDayOfInterval({
      start: startOfMonth(currentMonth),
      end: endOfMonth(currentMonth)
    });
    const firstDayOfMonth = startOfMonth(currentMonth).getDay();
    const startPadding = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

    const groupedSlots = [
      { label: '☀️ ' + t('morning', 'Morning'), slots: availableSlots.filter(s => parseInt(s.time) < 12) },
      { label: '🌤️ ' + t('afternoon', 'Afternoon'), slots: availableSlots.filter(s => parseInt(s.time) >= 12 && parseInt(s.time) < 17) },
      { label: '🌙 ' + t('evening', 'Evening'), slots: availableSlots.filter(s => parseInt(s.time) >= 17) },
    ].filter(g => g.slots.length > 0);

    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-purple-50 to-blue-50 pt-4 pb-20 px-4">
        <div className="max-w-xl mx-auto">
          {renderHeader(t('select_date_time', 'Select Date & Time'), t('choose_appointment_slot', 'Choose your preferred appointment slot'))}

          <Card className="mb-3 overflow-hidden border-2 bg-white shadow-md">
            <CardContent className="p-2.5">
              <div className="flex items-center justify-between mb-2.5">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1))}
                  className="h-7 w-7 rounded-full hover:bg-purple-100"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                </Button>
                <h3 className="font-bold text-sm">
                  {format(currentMonth, 'MMMM yyyy', { locale: getDateLocale() })}
                </h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1))}
                  className="h-7 w-7 rounded-full hover:bg-purple-100"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>

              <div className="grid grid-cols-7 gap-0.5 mb-1.5">
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, idx) => (
                  <div key={`${day}-${idx}`} className="text-center text-[10px] font-medium text-muted-foreground py-1">
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-0.5">
                {[...Array(startPadding)].map((_, idx) => (
                  <div key={`pad-${idx}`} className="aspect-square" />
                ))}

                {monthDays.map((day, idx) => {
                  const dateStr = format(day, 'yyyy-MM-dd');
                  const isAvailable = availableDates.has(dateStr);
                  const isSelected = selectedDate && isSameDay(day, selectedDate);
                  const isPast = day < new Date() && !isToday(day);

                  return (
                    <motion.button
                      key={idx}
                      whileHover={!isPast && isAvailable ? { scale: 1.05 } : {}}
                      whileTap={!isPast && isAvailable ? { scale: 0.95 } : {}}
                      onClick={() => !isPast && isAvailable && handleDateSelect(day)}
                      disabled={isPast || !isAvailable}
                      className={`
                        aspect-square rounded-md p-1 text-xs font-medium transition-all
                        ${isPast || !isAvailable
                          ? 'text-muted-foreground/30 cursor-not-allowed'
                          : 'hover:bg-purple-100 cursor-pointer'
                        }
                        ${isSelected
                          ? 'bg-gradient-to-br from-purple-600 to-pink-600 text-white shadow-md'
                          : ''
                        }
                        ${isToday(day) && !isSelected ? 'border-2 border-purple-500 font-bold' : ''}
                      `}
                    >
                      <div className="flex items-center justify-center h-full">
                        {format(day, 'd')}
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {selectedDate && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="border-2 bg-white shadow-md">
                <CardContent className="p-2.5">
                  <h3 className="font-bold text-sm mb-2.5 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-purple-600" />
                    {t('available_time_slots', 'Available Time Slots')}
                  </h3>

                  {groupedSlots.map(group => (
                    <div key={group.label} className="mb-3 last:mb-0">
                      <h4 className="text-xs font-semibold text-muted-foreground mb-1.5">{group.label}</h4>
                      <div className="grid grid-cols-5 gap-1.5">
                        {group.slots.map(slot => {
                          const isSelected = selectedTime === slot.time;
                          return (
                            <motion.button
                              key={slot.time}
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => handleTimeSelect(slot.time)}
                              className={`
                                relative py-1.5 px-1 rounded-md font-medium text-xs transition-all
                                ${isSelected
                                  ? 'bg-gradient-to-br from-purple-600 to-pink-600 text-white shadow-md'
                                  : slot.is_optimal
                                    ? 'bg-green-50 text-green-700 border border-green-200 hover:border-green-400'
                                    : 'bg-white border border-gray-200 hover:border-purple-300'
                                }
                              `}
                            >
                              {slot.time}
                              {slot.is_optimal && !isSelected && (
                                <Sparkles className="w-2 h-2 absolute top-0.5 right-0.5 text-green-600" />
                              )}
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {selectedDate && selectedTime && (
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-3 z-50">
              <div className="max-w-xl mx-auto">
                <Button
                  size="sm"
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-md h-10"
                  onClick={() => setStep('confirm')}
                >
                  {t('continue_confirmation', 'Continue to Confirmation')}
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (step === 'confirm') {
    return (
      <>
        <div className="min-h-screen bg-gradient-to-br from-rose-50 via-purple-50 to-blue-50 pt-4 pb-20 px-4">
          <div className="max-w-lg mx-auto">
            {renderHeader(t('confirm_booking', 'Confirm Booking'), t('review_details', 'Review your appointment details'))}

            <div className="space-y-2.5">
              <Card className="border-2 bg-white shadow-md">
                <CardContent className="p-3">
                  <h3 className="font-bold text-sm mb-2.5 flex items-center gap-1.5">
                    <List className="w-4 h-4 text-purple-600" />
                    {t('services', 'Services')}
                  </h3>
                  <div className="space-y-2">
                    {selectedServices.map(service => (
                      <div key={service.id} className="flex justify-between items-center py-1 border-b last:border-0">
                        <div>
                          <div className="font-medium text-sm">{getServiceName(service)}</div>
                          <div className="text-xs text-muted-foreground">{service.duration || '30'} min</div>
                        </div>
                        <div className="font-bold text-sm">{service.price} {service.currency || salonSettings?.currency || 'AED'}</div>
                      </div>
                    ))}
                    <div className="flex justify-between items-center pt-1.5 border-t-2 border-purple-200">
                      <div className="font-bold text-sm">{t('total', 'Total')}</div>
                      <div className="font-bold text-base text-purple-600">{totalPrice} {salonSettings?.currency || 'AED'}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2 bg-white shadow-md">
                <CardContent className="p-3">
                  <h3 className="font-bold text-sm mb-2.5 flex items-center gap-1.5">
                    <User className="w-4 h-4 text-purple-600" />
                    {t('professional', 'Professional')}
                  </h3>
                  {selectedMaster ? (
                    <div className="flex items-center gap-2.5">
                      <Avatar className="w-9 h-9 border-2 border-purple-200">
                        <AvatarImage src={selectedMaster.photo} />
                        <AvatarFallback>{selectedMaster.full_name[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium text-sm">{selectedMaster.full_name}</div>
                        <div className="text-xs text-muted-foreground">{selectedMaster.position}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white">
                        <Users className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-medium text-sm">{t('any_available_professional', 'Any Available Professional')}</div>
                        <div className="text-xs text-muted-foreground">{t('first_available_master', 'First available master')}</div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {selectedDate && selectedTime && (
                <Card className="border-2 bg-white shadow-md">
                  <CardContent className="p-3">
                    <h3 className="font-bold text-sm mb-2.5 flex items-center gap-1.5">
                      <CalendarIcon className="w-4 h-4 text-purple-600" />
                      {t('date_time', 'Date & Time')}
                    </h3>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-xs text-muted-foreground">{t('date', 'Date')}</span>
                        <span className="font-medium text-sm">{format(selectedDate, 'EEEE, MMMM dd, yyyy', { locale: getDateLocale() })}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-muted-foreground">{t('time', 'Time')}</span>
                        <span className="font-medium text-sm">{selectedTime}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-muted-foreground">{t('duration', 'Duration')}</span>
                        <span className="font-medium text-sm">{totalDuration} {t('minutes', 'minutes')}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-3 z-50">
              <div className="max-w-lg mx-auto">
                <Button
                  size="sm"
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-md h-11"
                  onClick={handleConfirmBooking}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t('confirming', 'Confirming...')}
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      {t('confirm_booking_btn', 'Confirm Booking')}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {showPhoneModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setShowPhoneModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-xl p-5 max-w-sm w-full shadow-2xl"
              >
                <h3 className="text-lg font-bold text-purple-600 mb-2">{t('contact_required', 'Contact Number Required')}</h3>
                <p className="text-xs text-muted-foreground mb-3">
                  {t('provide_phone', 'Please provide your phone number so we can contact you about your booking.')}
                </p>
                <div className="space-y-2.5">
                  <Input
                    type="tel"
                    placeholder="+971 XX XXX XXXX"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="h-9 rounded-lg text-sm"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && phoneNumber.length >= 7) {
                        setShowPhoneModal(false);
                        handleConfirmBooking();
                      }
                    }}
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1 h-9 rounded-lg text-sm"
                      onClick={() => setShowPhoneModal(false)}
                    >
                      {t('cancel', 'Cancel')}
                    </Button>
                    <Button
                      className="flex-1 h-9 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg text-sm"
                      onClick={() => {
                        if (phoneNumber.length >= 7) {
                          setShowPhoneModal(false);
                          handleConfirmBooking();
                        } else {
                          toast.error(t('valid_phone', 'Please enter a valid phone number'));
                        }
                      }}
                    >
                      {t('continue', 'Continue')}
                    </Button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </>
    );
  }

  return null;
}