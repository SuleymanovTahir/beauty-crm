import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { AnimatePresence, motion } from 'motion/react';
import { X, User, Calendar as CalendarIcon, ChevronRight, ChevronLeft, MapPin, Search, Clock, CheckCircle2, Star, Phone, List, Loader2, Scissors, Check, Sparkles } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { ScrollArea } from '../../components/ui/scroll-area';
import { Avatar, AvatarImage, AvatarFallback } from '../../components/ui/avatar';
import { Dialog, DialogContent, DialogTitle, DialogHeader } from '../../components/ui/dialog';
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

// --- Helper Components ---

function BookingMenu({ bookingState, onNavigate, totalPrice, salonSettings }: any) {
  const { t, i18n } = useTranslation(['booking', 'common']);
  const dateLocale = getDateLocaleCentral(i18n.language);

  const isServicesComplete = bookingState.services.length > 0;
  const isProfessionalComplete = bookingState.professional !== null || bookingState.professionalSelected;
  const isDateTimeComplete = bookingState.date !== null && bookingState.time !== null;
  const isAllComplete = isServicesComplete && isProfessionalComplete && isDateTimeComplete;

  const totalDuration = bookingState.services.reduce((sum: number, s: Service) => sum + parseInt(s.duration || '0'), 0);

  const cards = [
    {
      value: 'services',
      icon: Scissors,
      title: t('booking.menu.services', 'Select Services'),
      description: isServicesComplete
        ? `${bookingState.services.length} selected`
        : t('booking.menu.selectServices', "Pick treatment"),
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
      isComplete: isProfessionalComplete,
      gradient: 'var(--gradient-pink-rose)',
    },
    {
      value: 'datetime',
      icon: CalendarIcon,
      title: t('booking.menu.datetime', 'Date & Time'),
      description: isDateTimeComplete
        ? `${format(bookingState.date!, 'MMM dd', { locale: dateLocale })} @ ${bookingState.time}`
        : t('booking.menu.selectDateTime', "Pick time slot"),
      isComplete: isDateTimeComplete,
      gradient: 'var(--gradient-rose-orange)',
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Salon Info Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="salon-info-card"
      >
        <div className="salon-icon-wrapper">
          <Scissors className="w-8 h-8" />
        </div>
        <div className="flex-1">
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">
            {salonSettings?.name || 'Beauty Salon'}
          </h1>
          <p className="text-gray-500 flex items-center gap-2 font-bold mt-1">
            <MapPin className="w-4 h-4 text-purple-500" />
            {salonSettings?.address || 'Address'}
          </p>
        </div>
      </motion.div>

      {/* Steps Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {cards.map((card, idx) => (
          <motion.div
            key={card.value}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
          >
            <div className="booking-step-card" onClick={() => onNavigate(card.value)}>
              <div className="booking-step-header-line" style={{ background: card.gradient }} />
              <div className="booking-step-content">
                <div className="flex items-start justify-between mb-4">
                  <div className="step-icon-box" style={{ background: card.gradient }}>
                    <card.icon className="w-6 h-6" />
                  </div>
                  {card.isComplete && (
                    <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center shadow-lg">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>

                <h3 className="font-black text-xl text-gray-900 mb-1">{card.title}</h3>
                <p className="text-gray-500 font-bold text-sm mb-4">{card.description}</p>

                <div className="flex items-center justify-between">
                  <div className={`step-status-badge ${card.isComplete ? 'step-status-complete' : 'step-status-pending'}`}>
                    {card.isComplete ? t('booking.menu.completed', 'Completed') : t('common.select', 'Select')}
                  </div>
                  <ChevronRight className={`w-5 h-5 ${card.isComplete ? 'text-green-500' : 'text-gray-300'}`} />
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Summary Section */}
      {isServicesComplete && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl shadow-xl p-8 border border-purple-100"
        >
          <h3 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-2">
            <List className="w-6 h-6 text-purple-500" />
            {t('booking.confirm.summary', 'Booking Summary')}
          </h3>

          <div className="space-y-4 mb-8">
            {bookingState.services.map((service: Service) => (
              <div key={service.id} className="flex justify-between items-center group">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-purple-400 group-hover:scale-125 transition-transform" />
                  <span className="font-bold text-gray-700">{getLocalizedName(service, i18n.language)}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-bold text-gray-400">{service.duration} {t('booking.min', 'min')}</span>
                  <span className="font-black text-gray-900">{service.price} {salonSettings?.currency || 'AED'}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-dashed border-gray-200 pt-6 flex justify-between items-end mb-8">
            <div>
              <p className="text-gray-400 font-bold uppercase text-xs tracking-widest mb-1">{t('booking.services.total', 'Total Amount')}</p>
              <p className="text-sm font-bold text-purple-400">{totalDuration} {t('booking.min', 'min')}</p>
            </div>
            <p className="text-4xl font-black text-gray-900">{totalPrice} <span className="text-xl text-gray-400">{salonSettings?.currency || 'AED'}</span></p>
          </div>

          {isAllComplete && (
            <Button
              onClick={() => onNavigate('confirm')}
              className="w-full h-16 btn-primary-gradient text-xl"
            >
              <CheckCircle2 className="w-6 h-6" />
              {t('booking.services.continue', 'Complete Booking')}
            </Button>
          )}
        </motion.div>
      )}
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

  if (loading) return <div className="flex justify-center py-20"><div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-3xl shadow-xl p-8 border border-purple-50">
        <h2 className="text-3xl font-black text-gray-900 mb-6">{t('booking.services.title', 'Select Services')}</h2>

        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            placeholder={t('booking.services.search', 'Search services...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 h-14 rounded-2xl bg-gray-50 border-none focus-visible:ring-2 focus-visible:ring-purple-400 font-bold"
          />
        </div>

        <ScrollArea className="w-full whitespace-nowrap pb-2">
          <div className="flex gap-2">
            {categories.map((cat) => (
              <Badge
                key={cat}
                variant={selectedCategory === cat ? 'default' : 'outline'}
                className={`px-4 py-2 rounded-xl cursor-pointer text-sm font-bold transition-all ${selectedCategory === cat ? 'bg-purple-600 shadow-lg scale-105' : 'hover:bg-purple-50'}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </Badge>
            ))}
          </div>
        </ScrollArea>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AnimatePresence>
          {filteredServices.map((service, idx) => {
            const isSelected = selectedServices.some((s: any) => s.id === service.id);
            return (
              <motion.div
                key={service.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Card
                  className={`cursor-pointer service-item-card ${isSelected ? 'service-item-card-selected' : ''}`}
                  onClick={() => toggleService(service)}
                >
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-black text-lg text-gray-900 mb-1">{getLocalizedName(service, i18n.language)}</h3>
                        <p className="text-sm text-gray-500 font-medium mb-4 line-clamp-1">{service.description || t('booking.services.noDescription', 'Professional service')}</p>
                        <div className="flex items-center gap-4">
                          <span className="text-xs font-black text-purple-400 flex items-center gap-1 uppercase tracking-wider">
                            <Clock className="w-3 h-3" />
                            {service.duration || '30'} {t('booking.min', 'min')}
                          </span>
                          <span className="font-black text-lg text-gray-900">
                            {service.price} {salonSettings?.currency || 'AED'}
                          </span>
                        </div>
                      </div>
                      <div className={`w-6 h-6 rounded-lg border-2 transition-all flex items-center justify-center ${isSelected ? 'bg-purple-600 border-purple-600 shadow-lg' : 'border-gray-200'}`}>
                        {isSelected && <Check className="w-4 h-4 text-white" />}
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
        <div className="booking-footer-bar">
          <div className="footer-action-container">
            <div>
              <p className="font-black text-gray-900 text-lg">{selectedServices.length} {t('booking.menu.selected', 'Selected')}</p>
              <p className="text-purple-500 font-bold">
                {selectedServices.reduce((sum: number, s: any) => sum + s.price, 0)} {salonSettings?.currency || 'AED'}
              </p>
            </div>
            <Button onClick={onContinue} className="btn-primary-gradient h-14">
              {t('booking.services.continue', 'Continue')}
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
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

  if (loading) return <div className="flex justify-center py-20"><div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-3xl shadow-xl p-8 border border-purple-50">
        <h2 className="text-3xl font-black text-gray-900">{t('booking.professional.title', 'Select Professional')}</h2>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card
          className={`cursor-pointer master-item-card group ${selectedProfessional === null && professionalSelected ? 'master-item-card-selected' : ''}`}
          onClick={() => onProfessionalChange(null)}
        >
          <CardContent className="p-8 flex items-center gap-6">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white shadow-xl group-hover:scale-105 transition-transform">
              <Sparkles className="w-10 h-10" />
            </div>
            <div className="flex-1">
              <h3 className="font-black text-2xl text-gray-900 flex items-center gap-3">
                {t('booking.professional.anyAvailable', 'Any Available Professional')}
                {selectedProfessional === null && professionalSelected && <CheckCircle2 className="w-6 h-6 text-green-500" />}
              </h3>
              <p className="text-gray-500 font-bold">{t('booking.professional.firstAvailable', 'First available master will take your appointment')}</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {masters.map((master, idx) => {
          const isSelected = selectedProfessional?.id === master.id;
          return (
            <motion.div
              key={master.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: (idx + 1) * 0.1 }}
            >
              <Card
                className={`cursor-pointer master-item-card group ${isSelected ? 'master-item-card-selected' : ''}`}
                onClick={() => onProfessionalChange(master)}
              >
                <CardContent className="p-6 flex items-center gap-6">
                  <div className="relative">
                    <Avatar className="w-20 h-20 border-4 border-white shadow-xl ring-2 ring-purple-50">
                      <AvatarImage src={master.photo} className="object-cover" />
                      <AvatarFallback className="bg-gradient-to-br from-purple-100 to-pink-100 text-purple-600 font-black text-2xl">
                        {master.full_name[0]}
                      </AvatarFallback>
                    </Avatar>
                    {isSelected && (
                      <div className="absolute -bottom-1 -right-1 bg-green-500 text-white rounded-full p-1 shadow-lg ring-2 ring-white">
                        <Check className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-black text-xl text-gray-900 mb-1">{master.full_name}</h3>
                    <p className="text-sm text-purple-500 font-black uppercase tracking-wider mb-3">{master.position || t('common.professional', 'Professional')}</p>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        <span className="font-black text-sm text-gray-700">{master.rating || '5.0'}</span>
                      </div>
                      <span className="text-xs text-gray-400 font-bold uppercase">({master.reviews || 0} reviews)</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {(selectedProfessional !== null || professionalSelected) && (
        <div className="booking-footer-bar">
          <div className="footer-action-container justify-center">
            <Button
              onClick={onContinue}
              className="btn-primary-gradient h-14 w-full max-w-lg"
            >
              {t('common.continue', 'Continue to Date & Time')}
              <ChevronRight className="w-5 h-5" />
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

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  const startOffset = (firstDayOfMonth + 6) % 7;
  const prevMonthLastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 0).getDate();

  const calendarDays = [];
  for (let i = startOffset - 1; i >= 0; i--) calendarDays.push({ day: prevMonthLastDay - i, month: 'prev' });
  for (let i = 1; i <= daysInMonth; i++) calendarDays.push({ day: i, month: 'current' });
  const totalCells = Math.ceil(calendarDays.length / 7) * 7;
  for (let i = 1; calendarDays.length < totalCells; i++) calendarDays.push({ day: i, month: 'next' });

  const groupedSlots = {
    morning: availableSlots.filter(s => s.period === 'morning'),
    afternoon: availableSlots.filter(s => s.period === 'afternoon'),
    evening: availableSlots.filter(s => s.period === 'evening'),
  };

  return (
    <div className="space-y-8 pb-32 animate-fade-in">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-3xl shadow-xl p-8 border border-purple-50">
        <h2 className="text-3xl font-black text-gray-900 mb-2">{t('booking.datetime.title', 'Select Date & Time')}</h2>
        <p className="text-purple-500 font-bold">{t('booking.duration', 'Total duration')}: {duration} {t('booking.min', 'min')}</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Date Card */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="booking-calendar-card">
          <div className="calendar-header-gradient flex justify-between items-center">
            <span className="text-xl font-black uppercase tracking-wider">{t('booking.datetime.date', 'Date')}</span>
            <div className="flex gap-2">
              <Button size="icon" variant="ghost" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))} className="text-white hover:bg-white/20 rounded-xl">
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))} className="text-white hover:bg-white/20 rounded-xl">
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
          </div>
          <div className="p-8">
            <div className="text-center font-black text-2xl mb-8 text-gray-900">
              {format(currentMonth, 'MMMM yyyy', { locale: dateLocale })}
            </div>
            <div className="grid grid-cols-7 gap-2 text-center mb-4">
              {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(d => (
                <div key={d} className="text-xs font-black text-gray-400 uppercase tracking-widest">{t(`common.days_short.${d.toLowerCase()}`, d)}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-2">
              {calendarDays.map((d, i) => {
                const isCurrent = d.month === 'current';
                const dateObj = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), d.day);
                const dateStr = format(dateObj, 'yyyy-MM-dd');
                const isAvailable = isCurrent && availableDates.has(dateStr);
                const isSelected = selectedDate && format(selectedDate, 'yyyy-MM-dd') === dateStr;
                const isPast = isCurrent && dateObj < new Date(new Date().setHours(0, 0, 0, 0));

                return (
                  <button
                    key={i}
                    disabled={!isAvailable || isPast}
                    onClick={() => isAvailable && !isPast && onDateTimeChange(dateObj, null)}
                    className={`aspect-square rounded-2xl flex items-center justify-center font-black text-lg transition-all
                      ${!isCurrent || isPast || !isAvailable ? 'text-gray-200 cursor-not-allowed' : 'text-gray-700 hover:bg-purple-50 hover:scale-110'}
                      ${isSelected ? 'bg-purple-600 text-white shadow-xl scale-110 ring-4 ring-purple-100' : ''}`}
                  >
                    {d.day}
                  </button>
                );
              })}
            </div>
          </div>
        </motion.div>

        {/* Time Card */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="booking-calendar-card">
          <div className="time-grid-gradient flex justify-between items-center">
            <span className="text-xl font-black uppercase tracking-wider">{t('booking.datetime.time', 'Time')}</span>
            <Clock className="w-6 h-6 text-white" />
          </div>
          <div className="p-8">
            {!selectedDate ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-400 gap-4">
                <CalendarIcon className="w-12 h-12" />
                <p className="font-bold text-center">{t('booking.datetime.dateFirst', 'Please select a date first')}</p>
              </div>
            ) : loading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="w-12 h-12 animate-spin text-purple-600" />
              </div>
            ) : availableSlots.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-400 gap-4">
                <Sparkles className="w-12 h-12" />
                <p className="font-bold text-center">{t('booking.datetime.noSlots', 'No results for this day')}</p>
              </div>
            ) : (
              <div className="space-y-8">
                {(['morning', 'afternoon', 'evening'] as const).map(period => {
                  const slots = groupedSlots[period];
                  if (slots.length === 0) return null;
                  return (
                    <div key={period} className="space-y-4">
                      <h4 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">{t(`booking.datetime.${period}`, period)}</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {slots.map(slot => (
                          <button
                            key={slot.time}
                            onClick={() => onDateTimeChange(selectedDate, slot.time)}
                            className={`py-4 rounded-2xl font-black text-sm transition-all border-2 
                              ${selectedTime === slot.time
                                ? 'bg-purple-600 text-white border-purple-600 shadow-xl scale-105'
                                : 'bg-white text-gray-900 border-gray-100 hover:border-purple-200 hover:bg-purple-50/50'}`}
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
        </motion.div>
      </div>

      {selectedDate && selectedTime && (
        <div className="booking-footer-bar">
          <div className="footer-action-container justify-center">
            <Button onClick={onContinue} className="btn-primary-gradient h-14 w-full max-w-lg">
              {t('common.continue', 'Continue to Review')}
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
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
    <div className="space-y-8 pb-32 animate-fade-in">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-3xl shadow-xl p-8 border border-purple-50">
        <h2 className="text-3xl font-black text-gray-900">{t('booking.confirm.title', 'Booking Confirmation')}</h2>
        <p className="text-gray-500 font-bold mt-1 uppercase tracking-widest text-xs">{t('booking.confirm.subtitle', 'Please review your details')}</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Col: Services & Total */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl shadow-xl p-8 border border-purple-50">
            <h3 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-2">
              <List className="w-6 h-6 text-purple-500" />
              {t('booking.menu.services', 'Services')}
            </h3>
            <div className="space-y-6">
              {bookingState.services.map((service: any) => (
                <div key={service.id} className="flex justify-between items-center group">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-all">
                      <Scissors className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-black text-lg text-gray-900">{getLocalizedName(service, i18n.language)}</div>
                      <div className="text-sm font-bold text-gray-400 uppercase tracking-wider">{service.duration || '30'} {t('booking.min', 'min')}</div>
                    </div>
                  </div>
                  <div className="font-black text-2xl text-gray-900">{service.price} <span className="text-sm text-gray-400 font-bold uppercase">{salonSettings?.currency || 'AED'}</span></div>
                </div>
              ))}
              <div className="pt-6 border-t border-dashed border-gray-200 flex justify-between items-end">
                <span className="font-black text-gray-400 uppercase tracking-widest">{t('booking.services.total', 'Amount to pay')}</span>
                <span className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">
                  {totalPrice} <span className="text-xl opacity-50">{salonSettings?.currency || 'AED'}</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Details & Booking Button */}
        <div className="space-y-6 text-center lg:text-left">
          <div className="bg-white rounded-3xl shadow-xl p-8 border border-purple-50 space-y-8">
            <h3 className="text-xl font-black text-gray-900 flex items-center gap-2 justify-center lg:justify-start">
              <CheckCircle2 className="w-6 h-6 text-green-500" />
              {t('booking.confirm.details', 'Details')}
            </h3>

            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-600">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">{t('booking.menu.professional', 'Master')}</div>
                  <div className="font-black text-gray-900">
                    {bookingState.professional ? bookingState.professional.full_name : t('booking.professional.anyAvailable', "Any Provider")}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
                  <CalendarIcon className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">{t('booking.menu.datetime', 'Time')}</div>
                  <div className="font-black text-gray-900">
                    {bookingState.date ? format(bookingState.date, 'EEEE, MMM dd', { locale: dateLocale }) : '--'}
                    <span className="text-purple-600 ml-2">@ {bookingState.time}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center text-green-600">
                  <Phone className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <div className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">{t('booking.confirm.phone', 'Phone')}</div>
                  <div className="flex items-center justify-between">
                    <span className="font-black text-gray-900">{phone || '--'}</span>
                    <Button variant="ghost" size="sm" onClick={() => setShowPhoneModal(true)} className="text-purple-600 font-black hover:bg-purple-50">
                      Edit
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <Button
              onClick={handleConfirm}
              disabled={loading || !phone}
              className="w-full h-20 btn-primary-gradient text-2xl"
            >
              {loading ? (
                <Loader2 className="w-8 h-8 animate-spin" />
              ) : (
                <>
                  <Sparkles className="w-8 h-8 mr-3" />
                  {t('booking.confirm.bookNow', 'Confirm')}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={showPhoneModal} onOpenChange={setShowPhoneModal}>
        <DialogContent className="p-0 border-none shadow-3xl rounded-[2rem] overflow-hidden max-w-sm">
          <DialogHeader className="bg-gradient-to-br from-purple-600 to-pink-600 p-8 text-white">
            <div className="w-16 h-16 rounded-3xl bg-white/20 flex items-center justify-center mb-6 mx-auto">
              <Phone className="w-8 h-8" />
            </div>
            <DialogTitle className="text-2xl font-black text-center text-white">{t('booking.confirm.phone', 'Contact phone')}</DialogTitle>
          </DialogHeader>
          <div className="p-8 space-y-6 flex flex-col items-center">
            <p className="text-gray-500 font-bold text-center text-sm">{t('phone_modal_desc', 'Enter your number to receive confirmation details')}</p>
            <Input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+971"
              className="h-16 text-2xl font-black text-center bg-gray-50 border-none focus-visible:ring-4 focus-visible:ring-purple-100 rounded-3xl"
            />
            <div className="flex gap-4 w-full">
              <Button variant="ghost" onClick={() => setShowPhoneModal(false)} className="flex-1 h-14 rounded-2xl font-black hover:bg-gray-50">
                Cancel
              </Button>
              <Button onClick={handlePhoneSubmit} className="flex-1 h-14 rounded-2xl btn-primary-gradient shadow-lg">
                Save
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
  const { t, i18n } = useTranslation(['booking', 'common']);

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

  if (loading) return <div className="fixed inset-0 bg-white z-[60] flex items-center justify-center animate-pulse"><div className="w-16 h-16 border-8 border-purple-600 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans selection:bg-purple-100 selection:text-purple-600">
      {/* Premium Header */}
      <header className="bg-white/80 backdrop-blur-2xl border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button
              onClick={goBack}
              className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-purple-50 hover:text-purple-600 transition-all group"
            >
              <ChevronLeft className="w-6 h-6 transition-transform group-hover:-translate-x-1" />
            </button>
            <div>
              <h1 className="text-xl font-black text-gray-900 tracking-tight">
                {t('booking.newBooking', 'New Booking')}
              </h1>
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{salonSettings?.name || 'Live System'}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:block">
              <PublicLanguageSwitcher />
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-500 transition-all"
              >
                <X className="w-6 h-6" />
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-5xl mx-auto px-6 py-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -10 }}
            transition={{ type: "spring", duration: 0.5 }}
          >
            {step === 'menu' && (
              <BookingMenu
                bookingState={bookingState}
                onNavigate={setStep}
                totalPrice={totalPrice}
                salonSettings={salonSettings}
              />
            )}
            {step === 'services' && (
              <ServicesStep
                selectedServices={bookingState.services}
                onServicesChange={(services: any) => updateState({ services })}
                onContinue={() => setStep('menu')}
                salonSettings={salonSettings}
              />
            )}
            {step === 'professional' && (
              <ProfessionalStep
                selectedProfessional={bookingState.professional}
                professionalSelected={bookingState.professionalSelected}
                onProfessionalChange={(prof: any) => updateState({ professional: prof, professionalSelected: true })}
                onContinue={() => setStep('menu')}
              />
            )}
            {step === 'datetime' && (
              <DateTimeStep
                selectedDate={bookingState.date}
                selectedTime={bookingState.time}
                selectedMaster={bookingState.professional}
                selectedServices={bookingState.services}
                onDateTimeChange={(date: any, time: any) => updateState({ date, time })}
                onContinue={() => setStep('confirm')}
              />
            )}
            {step === 'confirm' && (
              <ConfirmStep
                bookingState={bookingState}
                totalPrice={totalPrice}
                onPhoneChange={(phone: any) => updateState({ phone })}
                onSuccess={() => {
                  sessionStorage.removeItem(STORAGE_KEY);
                  if (onSuccess) onSuccess();
                  if (onClose) onClose();
                }}
                salonSettings={salonSettings}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <Toaster position="top-center" richColors />
    </div>
  );
}