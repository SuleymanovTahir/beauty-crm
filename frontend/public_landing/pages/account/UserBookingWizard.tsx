//UserBookingWizard.tsx
import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { format, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, isTomorrow, parseISO } from 'date-fns';
import { ru, enUS, ar } from 'date-fns/locale';
import {
  ArrowLeft, Calendar as CalendarIcon, Check, ChevronRight, Clock,
  List, MapPin, Search, Star, User, X, Loader2, Edit2,
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
import './UserBookingWizard.css';

interface Service {
  id: number;
  name: string;
  name_ru?: string;
  name_ar?: string;
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
  const [masterNextSlots, setMasterNextSlots] = useState<Record<number, string>>({});

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

        // Очищаем состояние если старше 1 часа
        if (stateAge > 60 * 60 * 1000) {
          sessionStorage.removeItem('booking-state');
          return;
        }

        // Восстанавливаем услуги
        if (state.selectedServices?.length > 0) {
          const restoredServices = services.filter(s => state.selectedServices.includes(s.id));
          if (restoredServices.length > 0) {
            setSelectedServices(restoredServices);
          }
        }

        // Восстанавливаем мастера
        if (state.selectedMaster) {
          const master = masters.find(m => m.id === state.selectedMaster);
          if (master) {
            setSelectedMaster(master);
            setProfessionalSelected(true);
          }
        } else if (state.professionalSelected) {
          setProfessionalSelected(true);
        }

        // Восстанавливаем дату и время с проверкой доступности
        if (state.selectedDate && state.selectedTime) {
          const date = parseISO(state.selectedDate);

          // Проверяем что дата еще доступна
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
              // Проверяем что время еще доступно
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
                  // Время недоступно - сохраняем только дату
                  setSelectedDate(date);
                }
              }
            }
          } catch (e) {
            console.log('Could not verify date/time availability', e);
          }
        } else if (state.selectedDate) {
          // Сохраняем только дату если время не было выбрано
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

  // Load nearest available slots for each master (on professional page)
  useEffect(() => {
    if (step !== 'professional' || masters.length === 0) return;

    const fetchMasterNextSlots = async () => {
      const today = format(new Date(), 'yyyy-MM-dd');
      const nextSlots: Record<number, string> = {};

      await Promise.all(masters.map(async (master) => {
        try {
          const res = await api.getPublicAvailableSlots(today, master.id);
          const available = (res.slots || []).filter((s: any) => s.available);
          if (available.length > 0) {
            nextSlots[master.id] = available[0].time;
          }
        } catch (e) {
          // Ignore errors for individual masters
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

  const getServiceName = (s: Service) => s[`name_${i18n.language}` as keyof Service] || s.name_ru || s.name;

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

    // Проверка наличия телефона
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
        description: `${format(selectedDate, 'MMMM dd, yyyy')} at ${selectedTime}`
      });

      // Очищаем сохраненное состояние после успешного бронирования
      sessionStorage.removeItem('booking-state');

      if (onSuccess) onSuccess();
      if (onClose) onClose();
    } catch (e) {
      toast.error('Error creating booking');
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneSubmit = () => {
    if (!phoneNumber || phoneNumber.length < 7) {
      toast.error('Please enter a valid phone number');
      return;
    }
    setShowPhoneModal(false);
    handleConfirmBooking();
  };

  const renderHeader = (title: string, subtitle?: string) => (
    <div className="sticky top-0 wizard-header pb-6 pt-4 px-4 overflow-x-hidden">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-4">
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
            className="rounded-full hover:bg-black/5"
          >
            <ArrowLeft className="w-5 h-5 text-primary" />
          </Button>

          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="rounded-full hover:bg-black/5 ml-auto"
            >
              <X className="w-5 h-5 text-primary" />
            </Button>
          )}
        </div>

        <div className="mb-4">
          <h2 className="text-2xl md:text-3xl font-bold text-primary mb-1">{title}</h2>
          {subtitle && <p className="text-muted-foreground text-sm">{subtitle}</p>}
        </div>

        {/* Progress breadcrumbs */}
        {step !== 'menu' && (
          <div className="flex items-center gap-2 mt-4 text-xs font-medium flex-wrap">
            <button
              className={`${step === 'services' ? 'text-purple-600 font-bold' : 'text-muted-foreground'} transition-colors`}
              onClick={() => setStep('services')}
            >
              {t('services', 'Services')}
            </button>
            <ChevronRight className="w-3 h-3 text-muted-foreground" />
            <button
              className={`${step === 'professional' ? 'text-purple-600 font-bold' : 'text-muted-foreground'} transition-colors`}
              onClick={() => selectedServices.length > 0 && setStep('professional')}
              disabled={selectedServices.length === 0}
            >
              {t('professional', 'Professional')}
            </button>
            <ChevronRight className="w-3 h-3 text-muted-foreground" />
            <button
              className={`${step === 'datetime' ? 'text-purple-600 font-bold' : 'text-muted-foreground'} transition-colors`}
              onClick={() => selectedServices.length > 0 && setStep('datetime')}
              disabled={selectedServices.length === 0}
            >
              {t('date_time', 'Date & Time')}
            </button>
            {step === 'confirm' && (
              <>
                <ChevronRight className="w-3 h-3 text-muted-foreground" />
                <span className="text-purple-600 font-bold">{t('confirm', 'Confirm')}</span>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );

  if (step === 'menu') {
    const hasServices = selectedServices.length > 0;
    const hasMaster = professionalSelected || selectedMaster;
    const hasDateTime = !!(selectedDate && selectedTime);
    const selectionsCount = [hasServices, hasMaster, hasDateTime].filter(Boolean).length;
    const allComplete = hasServices && hasMaster && hasDateTime;

    return (
      <div className="min-h-screen bg-white wizard-scrollable">
        <div className="wizard-container space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
            <div className="space-y-2">
              <h1 className="text-4xl md:text-5xl font-black text-primary tracking-tight">
                {salonSettings?.name || 'M Le Diamant'}
              </h1>
              <p className="text-sm text-muted-foreground flex items-center gap-2 font-medium">
                <MapPin className="w-4 h-4 text-primary" />
                {salonSettings?.address || 'Shop 13, Amwaj 2, Plaza Level, JBR - Dubai'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {selectionsCount >= 2 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedServices([]);
                    setSelectedMaster(null);
                    setProfessionalSelected(false);
                    setSelectedDate(null);
                    setSelectedTime('');
                    sessionStorage.removeItem('booking-state');
                    toast.success('Selections cleared');
                  }}
                  className="rounded-full border-2"
                >
                  <X className="w-4 h-4 mr-2" />
                  Reset
                </Button>
              )}
              {onClose && (
                <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full md:hidden">
                  <X className="w-6 h-6" />
                </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                value: 'services',
                icon: List,
                title: 'Select Services',
                description: selectedServices.length > 0
                  ? `${selectedServices.length} selected`
                  : "Pick treatment",
                badge: selectedServices.length > 0 ? `${totalPrice} AED` : null
              },
              {
                value: 'professional',
                icon: User,
                title: 'Professional',
                description: selectedMaster ? selectedMaster.full_name : (professionalSelected ? "Any Available" : "Select master"),
                badge: selectedMaster || professionalSelected ? "Selected" : null
              },
              {
                value: 'datetime',
                icon: CalendarIcon,
                title: 'Date & Time',
                description: selectedDate && selectedTime
                  ? `${format(selectedDate, 'MMM dd')} at ${selectedTime}`
                  : "Pick time slot",
                badge: selectedDate && selectedTime ? "Set" : null
              }
            ].map((card, idx) => (
              <motion.div
                key={card.value}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
              >
                <Card
                  className={`group cursor-pointer wizard-card ${step === card.value ? 'wizard-card-selected' : ''}`}
                  onClick={() => setStep(card.value as any)}
                >
                  <CardContent className="p-8 flex flex-col gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
                      <card.icon className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-black text-xl text-primary">{card.title}</h3>
                      <p className="text-sm text-muted-foreground font-medium">{card.description}</p>
                    </div>
                    {card.badge && (
                      <Badge className="bg-primary text-white w-fit">{card.badge}</Badge>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Book Now button when all complete */}
          {allComplete && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="pt-4"
            >
              <Button
                size="lg"
                className="w-full h-20 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-2xl font-black rounded-2xl shadow-2xl"
                onClick={() => setStep('confirm')}
              >
                <CheckCircle2 className="w-8 h-8 mr-3" />
                Book Now
              </Button>
            </motion.div>
          )}
        </div>
      </div>
    );
  }

  if (step === 'services') {
    return (
      <div className="min-h-screen bg-white wizard-scrollable">
        {renderHeader(t('select_services', 'Select Services'), t('choose_one_or_more', 'Choose one or more services'))}

        <div className="wizard-container">
          {/* Search */}
          <div className="mb-8">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder={t('search_services', 'Search services...')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 h-14 rounded-2xl border-primary/10 bg-muted/50 focus:bg-white focus:ring-primary/20 transition-all font-medium"
              />
            </div>
          </div>

          {/* Categories */}
          <ScrollArea className="mb-8">
            <div className="flex gap-3 pb-2">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-5 py-2 rounded-full text-sm font-bold transition-all ${selectedCategory === cat
                    ? 'bg-primary text-white shadow-lg'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </ScrollArea>

          {/* Services Grid */}
          <div className="grid gap-4 mb-32">
            <AnimatePresence mode="popLayout">
              {filteredServices.map((service, idx) => {
                const isSelected = selectedServices.some(s => s.id === service.id);
                return (
                  <motion.div
                    key={service.id}
                    layout
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                  >
                    <Card
                      className={`cursor-pointer wizard-card ${isSelected ? 'wizard-card-selected' : ''}`}
                      onClick={() => handleServiceSelect(service)}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-3">
                              <h3 className="font-black text-lg text-primary">{getServiceName(service)}</h3>
                              {isSelected && (
                                <CheckCircle2 className="w-5 h-5 text-primary" />
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground font-medium line-clamp-2">{service.description}</p>
                            <div className="flex items-center gap-4 pt-2">
                              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted text-muted-foreground text-xs font-bold">
                                <Clock className="w-3 h-3" />
                                <span>{service.duration || '30'} min</span>
                              </div>
                              <div className="text-primary font-black text-lg">
                                {service.price} AED
                              </div>
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

          {/* Fixed Bottom Bar */}
          {selectedServices.length > 0 && (() => {
            const hasMaster = professionalSelected;
            const hasDateTime = !!(selectedDate && selectedTime);
            const remaining = [
              { key: 'professional', label: 'Choose Professional', selected: hasMaster },
              { key: 'datetime', label: 'Select Date & Time', selected: hasDateTime },
            ].filter(item => !item.selected);

            if (hasMaster && hasDateTime) {
              return (
                <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t p-6 z-40 shadow-2xl">
                  <div className="max-w-4xl mx-auto">
                    <Button
                      size="lg"
                      className="w-full h-16 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-black rounded-2xl shadow-xl"
                      onClick={() => setStep('confirm')}
                    >
                      Confirm Booking
                    </Button>
                  </div>
                </div>
              );
            }

            return (
              <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t p-6 z-40 shadow-2xl">
                <div className="max-w-4xl mx-auto">
                  <div className="mb-4 text-center">
                    <div className="font-black text-2xl text-primary">{totalPrice} AED</div>
                    <div className="text-xs text-muted-foreground font-bold uppercase tracking-wider">
                      {selectedServices.length} Selected • {totalDuration} min
                    </div>
                  </div>
                  <div className={`grid ${remaining.length === 2 ? 'grid-cols-2' : 'grid-cols-1'} gap-4`}>
                    {remaining.map(item => (
                      <Button
                        key={item.key}
                        size="lg"
                        className="h-16 bg-primary text-white font-black rounded-2xl shadow-xl"
                        onClick={() => setStep(item.key as any)}
                      >
                        {item.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    );
  }

  if (step === 'professional') {
    return (
      <div className="min-h-screen bg-white wizard-scrollable">
        {renderHeader('Choose Professional', 'Select your preferred master or any available')}

        <div className="wizard-container space-y-6">
          {/* Any Available Option */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card
              className={`cursor-pointer wizard-card ${selectedMaster === null ? 'wizard-card-selected' : ''}`}
              onClick={() => handleMasterSelect(null)}
            >
              <CardContent className="p-8 flex items-center gap-6">
                <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center text-white shadow-xl">
                  <Users className="w-8 h-8" />
                </div>
                <div className="flex-1">
                  <h3 className="font-black text-xl text-primary flex items-center gap-2">
                    Any Available Professional
                    {selectedMaster === null && <CheckCircle2 className="w-5 h-5 text-primary" />}
                  </h3>
                  <p className="text-sm text-muted-foreground font-medium">First available master will take your appointment</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <div className="grid gap-4 mb-32">
            {masters.map((master, idx) => {
              const isSelected = selectedMaster?.id === master.id;
              return (
                <motion.div
                  key={master.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <Card
                    className={`cursor-pointer wizard-card ${isSelected ? 'wizard-card-selected' : ''}`}
                    onClick={() => handleMasterSelect(master)}
                  >
                    <CardContent className="p-6 flex items-center gap-6">
                      <Avatar className="w-16 h-16 border-2 border-primary/5 shadow-inner">
                        <AvatarImage src={master.photo} className="object-cover" />
                        <AvatarFallback className="bg-muted text-primary font-bold">{master.full_name[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="font-black text-lg text-primary">{master.full_name}</h3>
                          {isSelected && <CheckCircle2 className="w-5 h-5 text-primary" />}
                        </div>
                        <p className="text-sm text-muted-foreground font-medium mb-2">{master.position}</p>
                        <div className="flex items-center gap-3 flex-wrap">
                          <div className="flex items-center gap-1 text-primary">
                            <Star className="w-4 h-4 fill-primary" />
                            <span className="font-black text-sm">{master.rating || '5.0'}</span>
                          </div>
                          {master.reviews && master.reviews > 0 && (
                            <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider">({master.reviews} reviews)</span>
                          )}
                          {masterNextSlots[master.id] && (
                            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-50 border border-green-200">
                              <Clock className="w-3 h-3 text-green-600" />
                              <span className="text-xs font-bold text-green-700">Next: {masterNextSlots[master.id]}</span>
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

          {(selectedMaster !== null || professionalSelected) && (() => {
            const hasServices = selectedServices.length > 0;
            const hasDateTime = !!(selectedDate && selectedTime);
            const remaining = [
              { key: 'services', label: 'Select Services', selected: hasServices },
              { key: 'datetime', label: 'Select Date & Time', selected: hasDateTime },
            ].filter(item => !item.selected);

            if (hasServices && hasDateTime) {
              return (
                <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t p-6 z-40 shadow-2xl">
                  <div className="max-w-4xl mx-auto">
                    <Button
                      size="lg"
                      className="w-full h-16 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-black rounded-2xl shadow-xl"
                      onClick={() => setStep('confirm')}
                    >
                      Confirm Booking
                    </Button>
                  </div>
                </div>
              );
            }

            return (
              <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t p-6 z-40 shadow-2xl">
                <div className="max-w-4xl mx-auto">
                  <div className={`grid ${remaining.length === 2 ? 'grid-cols-2' : 'grid-cols-1'} gap-4`}>
                    {remaining.map(item => (
                      <Button
                        key={item.key}
                        size="lg"
                        className="h-16 bg-primary text-white font-black rounded-2xl shadow-xl"
                        onClick={() => setStep(item.key as any)}
                      >
                        {item.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    );
  }

  if (step === 'datetime') {
    const monthDays = eachDayOfInterval({
      start: startOfMonth(currentMonth),
      end: endOfMonth(currentMonth)
    });
    const firstDayOfMonth = startOfMonth(currentMonth);
    const startDayOffset = (firstDayOfMonth.getDay() + 6) % 7; // Конвертируем Sunday=0 в Monday=0
    const emptyDays = Array(startDayOffset).fill(null);

    const groupedSlots = [
      { label: 'Morning', slots: availableSlots.filter(s => parseInt(s.time) < 12) },
      { label: 'Afternoon', slots: availableSlots.filter(s => parseInt(s.time) >= 12 && parseInt(s.time) < 17) },
      { label: 'Evening', slots: availableSlots.filter(s => parseInt(s.time) >= 17) },
    ].filter(g => g.slots.length > 0);

    return (
      <div className="min-h-screen bg-white wizard-scrollable">
        {renderHeader('Select Date & Time', 'Choose your preferred appointment slot')}

        <div className="wizard-container space-y-12">
          {/* Calendar Redesign */}
          <Card className="wizard-card wizard-calendar-card overflow-hidden">
            <CardContent className="p-8">
              <div className="flex items-center justify-between mb-8">
                <button
                  onClick={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1))}
                  className="p-2 hover:bg-muted rounded-full transition-colors"
                >
                  <ArrowLeft className="w-6 h-6 text-primary" />
                </button>
                <h3 className="font-black text-2xl text-primary tracking-tight">
                  {format(currentMonth, 'MMMM yyyy')}
                </h3>
                <button
                  onClick={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1))}
                  className="p-2 hover:bg-muted rounded-full transition-colors"
                >
                  <ChevronRight className="w-6 h-6 text-primary" />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-2 mb-4">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                  <div key={day} className="text-center text-[10px] font-black text-muted-foreground uppercase tracking-widest py-2">
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-2">
                {emptyDays.map((_, idx) => (
                  <div key={`empty-${idx}`} className="wizard-calendar-day" />
                ))}
                {monthDays.map((day, idx) => {
                  const dateStr = format(day, 'yyyy-MM-dd');
                  const isAvailable = availableDates.has(dateStr);
                  const isPast = day < new Date() && !isToday(day);
                  const isSelected = selectedDate && isSameDay(day, selectedDate);

                  return (
                    <button
                      key={idx}
                      onClick={() => !isPast && isAvailable && handleDateSelect(day)}
                      disabled={isPast || !isAvailable}
                      className={`
                        aspect-square rounded-full p-2 text-sm font-bold transition-all flex items-center justify-center
                        ${isPast || !isAvailable
                          ? 'text-muted-foreground/20 cursor-not-allowed'
                          : 'bg-muted/30 text-primary hover:bg-muted/50 cursor-pointer'
                        }
                        ${isSelected ? 'wizard-calendar-day-selected' : ''}
                        ${isToday(day) && !isSelected ? 'wizard-calendar-today' : ''}
                      `}
                    >
                      {format(day, 'd')}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Time Slots */}
          {selectedDate && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8 pb-32"
            >
              <div className="flex items-center gap-3 px-4">
                <Clock className="w-6 h-6 text-primary" />
                <h3 className="font-black text-2xl text-primary tracking-tight">Available Time</h3>
              </div>

              {groupedSlots.map(group => (
                <div key={group.label} className="space-y-4">
                  <h4 className="text-xs font-black text-muted-foreground uppercase tracking-[0.2em] px-4">{group.label}</h4>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                    {group.slots.map(slot => {
                      const isSelected = selectedTime === slot.time;
                      return (
                        <button
                          key={slot.time}
                          onClick={() => handleTimeSelect(slot.time)}
                          className={`
                            relative py-4 px-2 rounded-2xl font-black text-sm transition-all border-2
                            ${isSelected
                              ? 'bg-primary text-white border-primary shadow-xl scale-105'
                              : 'bg-white text-primary border-primary/5 hover:border-primary/20 hover:bg-muted/30'
                            }
                          `}
                        >
                          {slot.time}
                          {slot.is_optimal && !isSelected && (
                            <Sparkles className="w-3 h-3 absolute top-2 right-2 text-primary/40" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </motion.div>
          )}

          {/* Fixed Bottom Bar */}
          {selectedDate && selectedTime && (() => {
            const hasServices = selectedServices.length > 0;
            const hasMaster = professionalSelected;
            const remaining = [
              { key: 'services', label: 'Select Services', selected: hasServices },
              { key: 'professional', label: 'Choose Professional', selected: hasMaster },
            ].filter(item => !item.selected);

            if (hasServices && hasMaster) {
              return (
                <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t p-6 z-40 shadow-2xl">
                  <div className="max-w-4xl mx-auto">
                    <Button
                      size="lg"
                      className="w-full h-16 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-lg font-black rounded-2xl shadow-xl"
                      onClick={() => setStep('confirm')}
                    >
                      Confirm Booking Details
                      <ChevronRight className="w-6 h-6 ml-2" />
                    </Button>
                  </div>
                </div>
              );
            }

            return (
              <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t p-6 z-40 shadow-2xl">
                <div className="max-w-4xl mx-auto">
                  <div className={`grid ${remaining.length === 2 ? 'grid-cols-2' : 'grid-cols-1'} gap-4`}>
                    {remaining.map(item => (
                      <Button
                        key={item.key}
                        size="lg"
                        className="h-16 bg-primary text-white font-black rounded-2xl shadow-xl"
                        onClick={() => setStep(item.key as any)}
                      >
                        {item.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    );
  }

  if (step === 'confirm') {
    return (
      <>
        <div className="min-h-screen bg-white wizard-scrollable">
          {renderHeader('Confirm Booking', 'Review your appointment details')}

          <div className="wizard-container space-y-6">
            <Card className="wizard-card p-4">
              <CardContent className="p-4 space-y-8">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <List className="w-6 h-6 text-primary" />
                      <h3 className="font-black text-xl text-primary">Services</h3>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setStep('services')}
                      className="text-primary hover:text-primary/80"
                    >
                      <Edit2 className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                  </div>
                  <div className="space-y-4 divide-y divide-primary/5">
                    {selectedServices.map(service => (
                      <div key={service.id} className="flex justify-between items-center pt-4">
                        <div>
                          <div className="font-black text-lg text-primary">{getServiceName(service)}</div>
                          <div className="text-sm text-muted-foreground font-bold">{service.duration || '30'} min</div>
                        </div>
                        <div className="font-black text-xl text-primary">{service.price} AED</div>
                      </div>
                    ))}
                    <div className="flex justify-between items-center pt-6">
                      <div className="font-black text-xl text-primary uppercase tracking-tighter">Total</div>
                      <div className="font-black text-3xl text-primary">{totalPrice} AED</div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                  <div className="relative p-6 rounded-2xl bg-muted/30 border border-primary/5">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setStep('professional')}
                      className="absolute top-2 right-2 text-primary hover:text-primary/80 h-8 w-8"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <div className="flex items-center gap-4">
                      <User className="w-6 h-6 text-primary" />
                      <div>
                        <div className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Professional</div>
                        <div className="font-black text-primary">{selectedMaster ? selectedMaster.full_name : "Any Provider"}</div>
                      </div>
                    </div>
                  </div>
                  <div className="relative p-6 rounded-2xl bg-muted/30 border border-primary/5">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setStep('datetime')}
                      className="absolute top-2 right-2 text-primary hover:text-primary/80 h-8 w-8"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <div className="flex items-center gap-4">
                      <CalendarIcon className="w-6 h-6 text-primary" />
                      <div>
                        <div className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Appointment at</div>
                        <div className="font-black text-primary">
                          {selectedDate ? format(selectedDate, 'EEEE, MMM dd') : '--'} at {selectedTime}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <Button
                  size="lg"
                  className="w-full h-20 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-2xl font-black rounded-2xl shadow-2xl transition-all mt-8"
                  onClick={handleConfirmBooking}
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="w-8 h-8 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="w-8 h-8 mr-3" />
                      Book Now
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Phone Number Modal */}
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
                className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl"
              >
                <h3 className="text-2xl font-black text-primary mb-2">Contact Number Required</h3>
                <p className="text-muted-foreground mb-6">
                  Please provide your phone number so we can contact you about your booking.
                </p>
                <div className="space-y-4">
                  <Input
                    type="tel"
                    placeholder="+971 XX XXX XXXX"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="h-14 rounded-2xl text-lg"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handlePhoneSubmit();
                      }
                    }}
                  />
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      className="flex-1 h-12 rounded-2xl"
                      onClick={() => setShowPhoneModal(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      className="flex-1 h-12 bg-primary rounded-2xl"
                      onClick={handlePhoneSubmit}
                    >
                      Continue
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
