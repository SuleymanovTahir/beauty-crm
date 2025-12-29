import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { AnimatePresence, motion } from 'motion/react';
import { X, User, Calendar as CalendarIcon, ChevronRight, ChevronLeft, MapPin, Search, Clock, CheckCircle2, Star, Phone, Users, List, Loader2, Scissors } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Checkbox } from '../../components/ui/checkbox';
import { ScrollArea } from '../../components/ui/scroll-area';
import { Avatar, AvatarImage, AvatarFallback } from '../../components/ui/avatar';
import { Dialog, DialogContent, DialogTitle } from '../../components/ui/dialog';
import { Toaster } from '../../components/ui/sonner';
import { toast } from 'sonner';
import { api } from '../../../src/services/api';
import { useAuth } from '../../../src/contexts/AuthContext';
import PublicLanguageSwitcher from '../../../src/components/PublicLanguageSwitcher';
import { useTranslation } from 'react-i18next';
import { getDateLocale as getDateLocaleCentral, getLocalizedName } from '../../../src/utils/i18nUtils';


import './UserBookingWizard.css';

const STORAGE_KEY = 'booking-state-v2';
const STATE_EXPIRY_TIME = 60 * 60 * 1000; // 1 hour

// --- Types ---
export interface Service {
  id: number;
  name: string;
  name_ru?: string;
  name_en?: string;
  name_ar?: string;
  description?: string;
  price: number;
  duration: string;
  category: string;
}

export interface Master {
  id: number;
  full_name: string;
  username: string;
  photo?: string;
  position?: string;
  rating?: number;
  reviews?: number;
}

export interface BookingState {
  services: Service[];
  professional: Master | null;
  professionalSelected: boolean;
  date: Date | null;
  time: string | null;
  phone: string;
}

interface Props {
  onClose?: () => void;
  onSuccess?: () => void;
}

// --- Components ---

function BookingMenu({ bookingState, onNavigate, totalPrice, salonSettings }: any) {
  const { t, i18n } = useTranslation(['booking', 'common']);
  const dateLocale = getDateLocaleCentral(i18n.language);

  const isServicesComplete = bookingState.services.length > 0;
  const isProfessionalComplete = bookingState.professional !== null || bookingState.professionalSelected;
  const isDateTimeComplete = bookingState.date !== null && bookingState.time !== null;

  const cards = [
    {
      value: 'services',
      icon: List,
      title: t('booking.menu.services', 'Select Services'),
      description: isServicesComplete
        ? `${bookingState.services.length} selected`
        : t('booking.menu.selectServices', "Pick treatment"),
      badge: isServicesComplete ? `${totalPrice} ${salonSettings?.currency || 'AED'}` : null,
      isComplete: isServicesComplete,
      gradient: 'var(--gradient-purple-pink)',
    },
    {
      value: 'professional',
      icon: User,
      title: t('booking.menu.professional', 'Professional'),
      description: bookingState.professional
        ? bookingState.professional.full_name
        : (bookingState.professionalSelected ? t('booking.professional.anyAvailable', "Any Available") : t('booking.menu.selectProfessional', "Select master")),
      badge: isProfessionalComplete ? t('booking.menu.completed', "Selected") : null,
      isComplete: isProfessionalComplete,
      gradient: 'var(--gradient-pink-red)',
    },
    {
      value: 'datetime',
      icon: CalendarIcon,
      title: t('booking.menu.datetime', 'Date & Time'),
      description: isDateTimeComplete
        ? `${format(bookingState.date!, 'MMM dd', { locale: dateLocale })} @ ${bookingState.time}`
        : t('booking.menu.selectDateTime', "Pick time slot"),
      badge: isDateTimeComplete ? t('booking.menu.completed', "Set") : null,
      isComplete: isDateTimeComplete,
      gradient: 'var(--gradient-red-orange)',
    },
  ];

  return (
    <div className="wizard-container space-y-8">
      {/* Top Info Card */}
      <div className="top-info-card">
        <div className="top-info-icon-wrapper">
          <Scissors className="w-8 h-8" />
        </div>
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">
            {salonSettings?.name || 'Beauty Salon'}
          </h1>
          <p className="text-gray-500 flex items-center gap-2 font-bold mt-1">
            <MapPin className="w-4 h-4" />
            {salonSettings?.address || 'Address'}
          </p>
        </div>
      </div>

      {/* Steps Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {cards.map((card, idx) => (
          <motion.div
            key={card.value}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
          >
            <div className="category-card" onClick={() => onNavigate(card.value)}>
              <div className="category-card-header-bar" style={{ background: card.gradient }} />
              <div className="category-card-content">
                <div className="category-icon-bg">
                  <card.icon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-2xl text-gray-900">{card.title}</h3>
                  <p className="text-gray-500 font-bold">{card.description}</p>
                </div>
                {card.badge && (
                  <div className="category-select-btn category-select-btn-active">
                    {card.badge}
                  </div>
                )}
                <div className="category-select-btn mt-4 group cursor-pointer">
                  {t('common.select', 'Select')}
                  <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function ServicesStep({ selectedServices, onServicesChange, onContinue, salonSettings }: any) {
  const { t, i18n } = useTranslation(['booking', 'common']);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  useEffect(() => {
    const loadServices = async () => {
      setLoading(true);
      try {
        const servicesRes = await api.getServices();
        const data = Array.isArray(servicesRes) ? servicesRes : (servicesRes.services || []);
        setServices(data);
      } catch (e) { console.error(e); } finally { setLoading(false); }
    };
    loadServices();
  }, []);

  const categories = ['All', ...Array.from(new Set(services.map(s => s.category || 'General')))];
  const filteredServices = services.filter(service => {
    const name = getLocalizedName(service, i18n.language).toLowerCase();
    const matchesSearch = name.includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || service.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const toggleService = (service: Service) => {
    const isSelected = selectedServices.some((s: any) => s.id === service.id);
    if (isSelected) onServicesChange(selectedServices.filter((s: any) => s.id !== service.id));
    else onServicesChange([...selectedServices, service]);
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">{t('booking.services.title', 'Select Services')}</h2>
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input placeholder={t('booking.services.search', 'Search services...')} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
        </div>
        <ScrollArea className="w-full whitespace-nowrap pb-2">
          <div className="flex gap-2">
            {categories.map((cat) => (
              <Badge key={cat} variant={selectedCategory === cat ? 'default' : 'outline'} className="cursor-pointer" onClick={() => setSelectedCategory(cat)}>{cat}</Badge>
            ))}
          </div>
        </ScrollArea>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredServices.map((service) => {
          const isSelected = selectedServices.some((s: any) => s.id === service.id);
          return (
            <Card key={service.id} className={`cursor-pointer transition-all border ${isSelected ? 'border-purple-500 bg-purple-50/10' : 'border-gray-100'}`} onClick={() => toggleService(service)}>
              <CardContent className="p-5">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900">{getLocalizedName(service, i18n.language)}</h3>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-xs text-gray-400 flex items-center gap-1"><Clock className="w-3 h-3" />{service.duration || '30'} {t('booking.min', 'min')}</span>
                      <span className="font-bold text-gray-900">{service.price} {salonSettings?.currency || 'AED'}</span>
                    </div>
                  </div>
                  <Checkbox checked={isSelected} onCheckedChange={() => toggleService(service)} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {selectedServices.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-2xl bg-white border border-gray-100 shadow-xl rounded-2xl p-4 z-40 flex items-center justify-between">
          <div className="text-sm">
            <p className="font-bold text-gray-900">{selectedServices.length} {t('booking.menu.selected', 'selected')}</p>
            <p className="text-gray-500">{selectedServices.reduce((sum: number, s: any) => sum + s.price, 0)} {salonSettings?.currency || 'AED'}</p>
          </div>
          <Button onClick={onContinue} className="bg-purple-600 hover:bg-purple-700 h-10 px-6 rounded-xl">
            {t('booking.services.continue', 'Continue')}
          </Button>
        </div>
      )}
    </div>
  );
}

function ProfessionalStep({ selectedProfessional, professionalSelected, onProfessionalChange, onContinue }: any) {
  const { t } = useTranslation(['booking', 'common']);
  const [masters, setMasters] = useState<Master[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadMasters = async () => {
      try {
        const usersRes = await api.getUsers();
        const users = Array.isArray(usersRes) ? usersRes : (usersRes.users || []);
        setMasters(users.filter((u: any) => u.role === 'employee' || u.is_service_provider));
      } catch (e) { } finally { setLoading(false); }
    };
    loadMasters();
  }, []);

  if (loading) return <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="wizard-container space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <Card
          className={`group cursor-pointer wizard-card ${selectedProfessional === null && professionalSelected ? 'wizard-card-selected' : ''}`}
          onClick={() => onProfessionalChange(null)}
        >
          <CardContent className="p-8 flex items-center gap-6">
            <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center text-white shadow-xl">
              <Users className="w-8 h-8" />
            </div>
            <div className="flex-1">
              <h3 className="font-black text-xl text-primary flex items-center gap-2">
                {t('booking.professional.anyAvailable', 'Any Available Professional')}
                {selectedProfessional === null && professionalSelected && <CheckCircle2 className="w-5 h-5 text-primary" />}
              </h3>
              <p className="text-sm text-muted-foreground font-medium">{t('booking.professional.firstAvailable', 'First available master will take your appointment')}</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {masters.map((master, idx) => {
          const isSelected = selectedProfessional?.id === master.id;
          return (
            <motion.div
              key={master.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <Card
                className={`cursor-pointer wizard-card ${isSelected ? 'wizard-card-selected' : ''}`}
                onClick={() => onProfessionalChange(master)}
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
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1 text-primary">
                        <Star className="w-4 h-4 fill-primary" />
                        <span className="font-black text-sm">{master.rating || '5.0'}</span>
                      </div>
                      <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider">({master.reviews || 0} reviews)</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {(selectedProfessional !== null || professionalSelected) && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t p-6 z-40 shadow-2xl">
          <div className="max-w-4xl mx-auto">
            <Button
              size="lg"
              className="w-full h-16 bg-primary text-white font-black rounded-2xl shadow-xl"
              onClick={onContinue}
            >
              {t('common.continue', 'Continue')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function DateTimeStep({ selectedDate, selectedTime, selectedMaster, selectedServices, onDateTimeChange, onContinue }: any) {
  const { t, i18n } = useTranslation(['booking', 'common']);
  const [availableDates, setAvailableDates] = useState<Set<string>>(new Set());
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const dateLocale = getDateLocaleCentral(i18n.language);
  const duration = selectedServices.reduce((sum: number, s: any) => sum + parseInt(s.duration || '30'), 0) || 0;

  useEffect(() => {
    const fetchDates = async () => {
      let masterName = selectedMaster ? (selectedMaster.full_name || selectedMaster.username) : 'any';
      try {
        const res = await api.getAvailableDates(masterName, currentMonth.getFullYear(), currentMonth.getMonth() + 1, duration || 60);
        if (res.available_dates) setAvailableDates(new Set(res.available_dates));
      } catch (e) { }
    };
    fetchDates();
  }, [currentMonth, selectedMaster, selectedServices, duration]);

  useEffect(() => {
    if (!selectedDate) return;
    const fetchSlots = async () => {
      setLoading(true);
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      try {
        let rawSlots: any[] = [];
        if (selectedMaster) {
          const res = await api.getPublicAvailableSlots(dateStr, selectedMaster.id);
          rawSlots = (res.slots || []).filter((s: any) => s.available);
        } else {
          const usersRes = await api.getUsers();
          const masters = (Array.isArray(usersRes) ? usersRes : (usersRes.users || [])).filter((u: any) => u.role === 'employee' || u.is_service_provider);
          const results = await Promise.all(masters.map((m: any) =>
            api.getPublicAvailableSlots(dateStr, m.id).then(r => r.slots || []).catch(() => [])
          ));
          const seen = new Set<string>();
          rawSlots = results.flat().filter(s => {
            if (s.available && !seen.has(s.time)) {
              seen.add(s.time);
              return true;
            }
            return false;
          }).sort((a, b) => a.time.localeCompare(b.time));
        }

        const processed = rawSlots.map(s => {
          const hour = parseInt(s.time.split(':')[0]);
          let period: 'morning' | 'afternoon' | 'evening' = 'afternoon';
          if (hour < 12) period = 'morning';
          else if (hour >= 17) period = 'evening';
          return { ...s, period };
        });
        setAvailableSlots(processed);
      } catch (e) { } finally { setLoading(false); }
    };
    fetchSlots();
  }, [selectedDate, selectedMaster]);

  // Calendar Helpers
  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  const startOffset = (firstDayOfMonth + 6) % 7; // Monday start
  const prevMonthLastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 0).getDate();

  const calendarDays = [];
  // Prev month padding
  for (let i = startOffset - 1; i >= 0; i--) {
    calendarDays.push({ day: prevMonthLastDay - i, month: 'prev' });
  }
  // Current month
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push({ day: i, month: 'current' });
  }
  // Next month padding
  const totalCells = Math.ceil(calendarDays.length / 7) * 7;
  for (let i = 1; calendarDays.length < totalCells; i++) {
    calendarDays.push({ day: i, month: 'next' });
  }

  const groupedSlots = {
    morning: availableSlots.filter(s => s.period === 'morning'),
    afternoon: availableSlots.filter(s => s.period === 'afternoon'),
    evening: availableSlots.filter(s => s.period === 'evening'),
  };

  return (
    <div className="wizard-container space-y-8 pb-32">
      {/* Top Info Card */}
      <div className="top-info-card">
        <div className="top-info-icon-wrapper">
          <CalendarIcon className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-3xl font-black text-gray-900">{t('booking.datetime.title', 'Select Date & Time')}</h2>
          <p className="text-gray-500 font-bold mt-1">{t('booking.duration', 'Duration')}: {duration} {t('booking.min', 'min')}</p>
        </div>
      </div>

      <div className="step-split-container">
        {/* Date Card */}
        <div className="split-card">
          <div className="split-card-header" style={{ background: 'var(--gradient-purple-pink)' }}>
            {t('booking.datetime.date', 'Date')}
          </div>
          <div className="split-card-body">
            <div className="simple-calendar-container">
              <div className="calendar-header">
                <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))} className="p-2 hover:bg-gray-100 rounded-full">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="calendar-month-label">
                  {format(currentMonth, 'MMMM yyyy', { locale: dateLocale })}
                </div>
                <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))} className="p-2 hover:bg-gray-100 rounded-full">
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              <div className="calendar-grid-header">
                {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(d => (
                  <div key={d} className="calendar-weekday">{t(`common.days_short.${d.toLowerCase()}`, d)}</div>
                ))}
              </div>

              <div className="calendar-grid-days">
                {calendarDays.map((d, i) => {
                  const isCurrent = d.month === 'current';
                  const dateObj = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), d.day);
                  const dateStr = format(dateObj, 'yyyy-MM-dd');
                  const isAvailable = isCurrent && availableDates.has(dateStr);
                  const isSelected = selectedDate && format(selectedDate, 'yyyy-MM-dd') === dateStr;
                  const isPast = isCurrent && dateObj < new Date(new Date().setHours(0, 0, 0, 0));

                  return (
                    <div
                      key={i}
                      onClick={() => isAvailable && !isPast && onDateTimeChange(dateObj, null)}
                      className={`calendar-day ${!isCurrent || isPast || !isAvailable ? 'calendar-day-disabled' : ''} ${isSelected ? 'calendar-day-selected ring-2 ring-primary ring-offset-2' : ''} hover:bg-gray-100`}
                    >
                      {d.day}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Time Card */}
        <div className="split-card">
          <div className="split-card-header" style={{ background: 'var(--gradient-pink-red)' }}>
            {t('booking.datetime.time', 'Time')}
          </div>
          <div className="split-card-body">
            {!selectedDate ? (
              <div className="time-slot-placeholder">
                {t('booking.datetime.dateFirst', 'Date first')}
              </div>
            ) : loading ? (
              <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>
            ) : availableSlots.length === 0 ? (
              <div className="text-center py-20 text-gray-500 font-bold">{t('booking.datetime.noSlots', 'No available slots')}</div>
            ) : (
              <div className="space-y-6">
                {(['morning', 'afternoon', 'evening'] as const).map(period => {
                  const slots = groupedSlots[period];
                  if (slots.length === 0) return null;
                  return (
                    <div key={period} className="space-y-3">
                      <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{t(`booking.datetime.${period}`, period)}</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {slots.map(slot => (
                          <button
                            key={slot.time}
                            onClick={() => onDateTimeChange(selectedDate, slot.time)}
                            className={`py-3 px-2 rounded-xl font-bold text-sm transition-all border ${selectedTime === slot.time ? 'bg-primary text-white border-primary shadow-lg' : 'bg-white text-gray-900 border-gray-100 hover:border-primary/20 hover:bg-gray-50'}`}
                          >
                            {slot.time}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Fixed Bottom Continue Bar */}
      {selectedDate && selectedTime && (
        <div className="bottom-bar">
          <button onClick={onContinue} className="btn-continue">
            {t('common.continue', 'Continue')}
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}

function ConfirmStep({ bookingState, totalPrice, onPhoneChange, onSuccess, salonSettings }: any) {
  const { t, i18n } = useTranslation(['booking', 'common']);
  const { user } = useAuth();
  const [phone, setPhone] = useState(bookingState.phone || user?.phone || '');
  const [showPhoneModal, setShowPhoneModal] = useState(!bookingState.phone && !user?.phone);
  const [loading, setLoading] = useState(false);

  const handlePhoneSubmit = () => {
    if (!phone || phone.length < 5) {
      toast.error(t('invalid_phone', 'Please enter a valid phone number'));
      return;
    }
    onPhoneChange(phone);
    setShowPhoneModal(false);
  };

  const handleConfirm = async () => {
    if (!phone) { setShowPhoneModal(true); return; }
    setLoading(true);
    try {
      const dateStr = bookingState.date ? format(bookingState.date, 'yyyy-MM-dd') : '';
      for (const service of bookingState.services) {
        await api.createBooking({
          instagram_id: user?.username || `web_${user?.id || 'guest'}`,
          service: getLocalizedName(service, i18n.language),
          master: bookingState.professional?.username || 'any_professional',
          date: dateStr,
          time: bookingState.time || '',
          phone,
          name: user?.full_name
        });
      }
      toast.success(t('booking.confirm.success', 'Booking confirmed!'));
      if (onSuccess) onSuccess();
    } catch (e) {
      toast.error(t('booking.confirm.error', 'Error creating booking'));
    } finally { setLoading(false); }
  };

  const dateLocale = getDateLocaleCentral(i18n.language);

  return (
    <div className="wizard-container space-y-6">
      <Card className="wizard-card p-4">
        <CardContent className="p-4 space-y-8">
          {/* Summary Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <List className="w-6 h-6 text-primary" />
              <h3 className="font-black text-xl text-primary">{t('booking.confirm.summary', 'Summary')}</h3>
            </div>
            <div className="space-y-4 divide-y divide-primary/5">
              {bookingState.services.map((service: any) => (
                <div key={service.id} className="flex justify-between items-center pt-4">
                  <div>
                    <div className="font-black text-lg text-primary">{getLocalizedName(service, i18n.language)}</div>
                    <div className="text-sm text-muted-foreground font-bold">{service.duration || '30'} {t('booking.min', 'min')}</div>
                  </div>
                  <div className="font-black text-xl text-primary">{service.price} {salonSettings?.currency || 'AED'}</div>
                </div>
              ))}
              <div className="flex justify-between items-center pt-6">
                <div className="font-black text-xl text-primary uppercase tracking-tighter">{t('booking.services.total', 'Total')}</div>
                <div className="font-black text-3xl text-primary">{totalPrice} {salonSettings?.currency || 'AED'}</div>
              </div>
            </div>
          </div>

          {/* Details Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
            <div className="p-6 rounded-2xl bg-muted/30 border border-primary/5 flex items-center gap-4">
              <User className="w-6 h-6 text-primary" />
              <div>
                <div className="text-xs text-muted-foreground font-bold uppercase tracking-wider">{t('booking.menu.professional', 'Professional')}</div>
                <div className="font-black text-primary">
                  {bookingState.professional ? bookingState.professional.full_name : t('booking.professional.anyAvailable', "Any Provider")}
                </div>
              </div>
            </div>
            <div className="p-6 rounded-2xl bg-muted/30 border border-primary/5 flex items-center gap-4">
              <CalendarIcon className="w-6 h-6 text-primary" />
              <div>
                <div className="text-xs text-muted-foreground font-bold uppercase tracking-wider">{t('booking.menu.datetime', 'Appointment at')}</div>
                <div className="font-black text-primary">
                  {bookingState.date ? format(bookingState.date, 'EEEE, MMM dd', { locale: dateLocale }) : '--'} at {bookingState.time}
                </div>
              </div>
            </div>
          </div>

          {/* Contact Section */}
          <div className="p-6 rounded-2xl bg-muted/30 border border-primary/5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Phone className="w-6 h-6 text-primary" />
              <div>
                <div className="text-xs text-muted-foreground font-bold uppercase tracking-wider">{t('booking.confirm.phone', 'Contact Phone')}</div>
                <div className="font-black text-primary">{phone || t('phone_required', 'Not set')}</div>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setShowPhoneModal(true)} className="font-black text-primary hover:bg-primary/5">
              {t('common.change', 'Change')}
            </Button>
          </div>

          <Button
            size="lg"
            className="w-full h-20 btn-book-now text-2xl font-black rounded-3xl shadow-2xl transition-all mt-8"
            onClick={handleConfirm}
            disabled={loading || !phone}
          >
            {loading ? (
              <Loader2 className="w-8 h-8 animate-spin" />
            ) : (
              <>
                <CheckCircle2 className="w-8 h-8 mr-3" />
                {t('booking.confirm.bookNow', 'Book Now')}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Phone Modal */}
      <Dialog open={showPhoneModal} onOpenChange={setShowPhoneModal}>
        <DialogContent className="max-w-md rounded-2xl p-0 overflow-hidden border-none shadow-2xl">
          <div className="bg-primary p-8 text-white text-center">
            <Phone className="w-12 h-12 mx-auto mb-4" />
            <DialogTitle className="text-2xl font-black">
              {t('booking.confirm.phone', 'Contact Info')}
            </DialogTitle>
            <p className="text-white/70 text-sm mt-2 font-medium">
              {t('phone_modal_desc', 'Enter your phone to confirm')}
            </p>
          </div>
          <div className="p-8 space-y-6">
            <Input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+971"
              className="h-16 text-2xl font-black text-center bg-muted/30 border-none focus:ring-2 focus:ring-primary rounded-2xl"
            />
            <div className="flex gap-4">
              <Button variant="ghost" onClick={() => setShowPhoneModal(false)} className="flex-1 h-14 rounded-xl font-bold">
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button onClick={handlePhoneSubmit} className="flex-1 h-14 rounded-xl bg-primary text-white font-black shadow-lg">
                {t('common.save', 'Save')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// --- Main Wizard ---

export function UserBookingWizard({ onClose, onSuccess }: Props) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const step = searchParams.get('booking') || 'menu';
  const { t } = useTranslation(['booking', 'common']);

  const [bookingState, setBookingState] = useState<BookingState>({
    services: [],
    professional: null,
    professionalSelected: false,
    date: null,
    time: null,
    phone: '',
  });

  const [salonSettings, setSalonSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const setStep = (newStep: string) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('booking', newStep);
      return next;
    }, { replace: true });
  };

  const goBack = () => {
    if (step === 'menu') {
      if (onClose) onClose();
      else navigate('/account');
    } else {
      setStep('menu');
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        const salonRes = await api.getSalonSettings();
        setSalonSettings(salonRes);
        const saved = sessionStorage.getItem(STORAGE_KEY);
        if (saved) {
          const { state, timestamp } = JSON.parse(saved);
          if (Date.now() - timestamp < STATE_EXPIRY_TIME) {
            if (state.date) state.date = parseISO(state.date);
            setBookingState(state);
          }
        }
      } catch (e) { } finally { setLoading(false); }
    };
    init();
  }, []);

  useEffect(() => {
    if (bookingState.services.length > 0 || bookingState.professional || bookingState.date) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
        state: { ...bookingState, date: bookingState.date ? format(bookingState.date, 'yyyy-MM-dd') : null },
        timestamp: Date.now()
      }));
    }
  }, [bookingState]);

  const updateState = (updates: Partial<BookingState>) => setBookingState((prev: BookingState) => ({ ...prev, ...updates }));
  const totalPrice = bookingState.services.reduce((sum: number, s: Service) => sum + s.price, 0);

  if (loading) return <div className="fixed inset-0 bg-white z-50 flex items-center justify-center"><div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="min-h-screen wizard-scrollable flex flex-col">
      {/* Custom Nav Header */}
      <div className="bg-white border-b sticky top-0 z-50">
        <div className="wizard-container py-4 flex items-center justify-between">
          <button onClick={goBack} className="wizard-nav-back group">
            <ChevronLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
            {t('common.back', 'Back')}
          </button>

          <h2 className="text-xl font-black wizard-title-pink">
            {t('booking.newBooking', 'New Booking')}
          </h2>

          <div className="flex items-center gap-4">
            <PublicLanguageSwitcher />
            {onClose && (
              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400">
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 py-8">
        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            {step === 'menu' && <BookingMenu bookingState={bookingState} onNavigate={setStep} totalPrice={totalPrice} salonSettings={salonSettings} />}
            {step === 'services' && <ServicesStep selectedServices={bookingState.services} onServicesChange={(services: any) => updateState({ services })} onContinue={() => setStep('menu')} salonSettings={salonSettings} />}
            {step === 'professional' && <ProfessionalStep selectedMaster={bookingState.professional} professionalSelected={bookingState.professionalSelected} onMasterSelect={(master: any) => updateState({ professional: master, professionalSelected: true })} onContinue={() => setStep('menu')} />}
            {step === 'datetime' && <DateTimeStep selectedDate={bookingState.date} selectedTime={bookingState.time} selectedMaster={bookingState.professional} selectedServices={bookingState.services} onDateTimeChange={(date: any, time: any) => updateState({ date, time })} onContinue={() => setStep('confirm')} />}
            {step === 'confirm' && <ConfirmStep bookingState={bookingState} totalPrice={totalPrice} onPhoneChange={(phone: any) => updateState({ phone })} onSuccess={() => { sessionStorage.removeItem(STORAGE_KEY); if (onSuccess) onSuccess(); if (onClose) onClose(); }} salonSettings={salonSettings} />}
          </motion.div>
        </AnimatePresence>
      </div>
      <Toaster position="top-center" richColors />
    </div>
  );
}