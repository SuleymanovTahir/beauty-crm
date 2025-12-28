//UserBookingWizard.tsx
import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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

interface Props {
  onClose?: () => void;
  onSuccess?: () => void;
}

export function UserBookingWizard({ onClose, onSuccess }: Props) {
  const { t, i18n } = useTranslation(['booking', 'common']);
  const { user } = useAuth();
  const [step, setStep] = useState<'menu' | 'services' | 'professional' | 'datetime' | 'confirm'>('menu');
  const [loading, setLoading] = useState(false);

  interface Slot {
    time: string;
    is_optimal: boolean;
  }

  const [masters, setMasters] = useState<Master[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [salonSettings, setSalonSettings] = useState<any>(null);
  const [availableSlots, setAvailableSlots] = useState<Slot[]>([]);
  const [holidays, setHolidays] = useState<{ date: string; name: string }[]>([]);
  const [availableDates, setAvailableDates] = useState<Set<string>>(new Set());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  interface BookingConfig {
    serviceId: string;
    master: Master | null;
    date: string;
    time: string;
  }

  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [bookingConfigs, setBookingConfigs] = useState<Record<string, BookingConfig>>({});
  const [currentServiceId, setCurrentServiceId] = useState<string | null>(null);
  
  // For "global" selection when no specific service is selected yet
  const [draftConfig, setDraftConfig] = useState<{
    master: Master | null;
    date: string;
    time: string;
  }>({ master: null, date: '', time: '' });

  const currentConfig = currentServiceId ? bookingConfigs[currentServiceId] : null;
  const selectedMaster = currentServiceId ? currentConfig?.master : draftConfig.master;
  const selectedDate = currentServiceId ? currentConfig?.date : draftConfig.date;
  const selectedTime = currentServiceId ? currentConfig?.time : draftConfig.time;

  const [searchParams, setSearchParams] = useSearchParams();

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);
        const [usersRes, servicesRes, holidaysRes, salonRes] = await Promise.all([
          api.getUsers(),
          api.getServices(),
          api.getHolidays(),
          fetch('/api/public/salon-settings').then(r => r.json())
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

        if (Array.isArray(holidaysRes)) {
          setHolidays(holidaysRes);
        }
        
        if (salonRes) {
          setSalonSettings(salonRes);
        }
      } catch (e) {
        console.error("Failed to load booking data", e);
      } finally {
        setLoading(false);
      }
    };
    loadInitialData();
  }, []);

  // Sync with URL params
  useEffect(() => {
    const stepParam = searchParams.get('step');
    if (stepParam && ['menu', 'services', 'professional', 'datetime', 'confirm'].includes(stepParam)) {
      if (stepParam !== step) setStep(stepParam as any);
    }
  }, [searchParams]);

  useEffect(() => {
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      newParams.set('step', step);
      if (!newParams.has('booking')) newParams.set('booking', 'true');
      return newParams;
    }, { replace: true });
  }, [step, setSearchParams]);

  // Load availability
  useEffect(() => {
    const fetchAvailability = async () => {
      let masterName = selectedMaster ? (selectedMaster.full_name || selectedMaster.username) : 'any';
      let duration = 60;
      if (currentServiceId) {
        const service = selectedServices.find(s => String(s.id) === currentServiceId);
        if (service) duration = parseInt(service.duration || '60');
      }

      try {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth() + 1;
        const res = await api.getAvailableDates(masterName, year, month, duration);
        if (res.success && res.available_dates) {
          setAvailableDates(new Set(res.available_dates));
        }
      } catch (e) {}
    };
    fetchAvailability();
  }, [currentMonth, selectedMaster, currentServiceId, selectedServices]);

  // Load slots
  useEffect(() => {
    if (!selectedDate) {
      setAvailableSlots([]);
      return;
    }

    const fetchSlots = async () => {
      setLoading(true);
      try {
        if (selectedMaster) {
          const res = await api.getPublicAvailableSlots(selectedDate, selectedMaster.id);
          setAvailableSlots((res.slots || []).filter(s => s.available).map(s => ({ time: s.time, is_optimal: false })));
        } else {
          const candidates = currentServiceId ? capableMasters : masters;
          const results = await Promise.all(candidates.map(m => 
            api.getPublicAvailableSlots(selectedDate, m.id).then(r => r.slots || []).catch(() => [])
          ));
          const seen = new Set<string>();
          const allSlots: Slot[] = [];
          results.flat().forEach(s => {
            if (s.available && !seen.has(s.time)) {
              seen.add(s.time);
              allSlots.push({ time: s.time, is_optimal: false });
            }
          });
          setAvailableSlots(allSlots.sort((a,b) => a.time.localeCompare(b.time)));
        }
      } catch (e) {}
      setLoading(false);
    };
    fetchSlots();
  }, [selectedDate, selectedMaster, masters]);

  const capableMasters = useMemo(() => {
    if (!currentServiceId) return masters;
    const service = selectedServices.find(s => String(s.id) === currentServiceId);
    if (!service) return masters;
    return masters.filter(m => !m.services || m.services.length === 0 || m.services.some(s => String(s.id) === currentServiceId));
  }, [masters, currentServiceId, selectedServices]);

  const getServiceName = (s: Service) => s[`name_${i18n.language}` as keyof Service] || s.name_ru || s.name;

  const handleServiceSelect = (service: Service) => {
    setSelectedServices(prev => {
      const exists = prev.find(s => s.id === service.id);
      if (exists) {
        setBookingConfigs(curr => {
          const next = { ...curr };
          delete next[String(service.id)];
          return next;
        });
        return prev.filter(s => s.id !== service.id);
      }
      setBookingConfigs(curr => ({
        ...curr,
        [String(service.id)]: {
          serviceId: String(service.id),
          master: draftConfig.master,
          date: draftConfig.date,
          time: ''
        }
      }));
      return [...prev, service];
    });
  };

  const navigate = useNavigate();

  const handleSlotClick = async (slot: string) => {
    if (!selectedDate) return;
    
    if (currentServiceId) {
      setBookingConfigs(prev => ({
        ...prev,
        [currentServiceId]: { ...prev[currentServiceId], time: slot }
      }));
    } else {
      setDraftConfig(prev => ({ ...prev, time: slot }));
    }

    // Logic for holds
    if (selectedMaster && currentServiceId) {
      try {
        const res = await api.createHold({
          service_id: parseInt(currentServiceId),
          master_name: selectedMaster.full_name || selectedMaster.username,
          date: selectedDate,
          time: slot,
          client_id: user?.id ? String(user.id) : (localStorage.getItem('booking_client_id') || 'guest')
        });
        if (!res.success) {
          toast.error(t('slotTaken', 'This slot is already taken'));
          setBookingConfigs(prev => ({ ...prev, [currentServiceId]: { ...prev[currentServiceId], time: '' } }));
        }
      } catch (e) {}
    }
  };

  const handleBook = async () => {
    if (selectedServices.length === 0) return;
    
    const isComplete = selectedServices.every(s => {
      const cfg = bookingConfigs[String(s.id)];
      return cfg && cfg.date && cfg.time;
    });

    if (!isComplete) {
      toast.error(t('completeAllBookings', 'Please complete all selections'));
      return;
    }

    setLoading(true);
    try {
      for (const service of selectedServices) {
        const cfg = bookingConfigs[String(service.id)];
        await api.createBooking({
          instagram_id: user?.username || `web_${user?.id || 'guest'}`,
          service: getServiceName(service),
          master: cfg.master?.username || 'any_professional',
          date: cfg.date,
          time: cfg.time,
          phone: user?.phone,
          name: user?.full_name
        });
      }
      toast.success(t('bookingSuccess', 'Booking confirmed!'));
      if (onSuccess) onSuccess();
      if (onClose) onClose();
    } catch (e) {
      toast.error(t('bookingError', 'Error creating booking'));
    } finally {
      setLoading(false);
    }
  };

  const categories = ['All', ...Array.from(new Set(services.map(s => s.category || 'Other')))];
  const filteredServices = services.filter(s => {
    const name = getServiceName(s).toLowerCase();
    const matchesSearch = name.includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || s.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const totalPrice = selectedServices.reduce((sum, s) => sum + s.price, 0);
  const totalDuration = selectedServices.reduce((sum, s) => sum + parseInt(s.duration || '30'), 0);

  const renderHeader = (title: string, subtitle?: string) => (
    <div className="sticky top-0 z-10 wizard-container pb-6 pt-4 px-4 border-b">
      <div className="flex items-center gap-3 mb-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            if (step === 'menu') {
              navigate('/account');
              if (onClose) onClose();
            } else {
              setStep('menu');
            }
          }}
          className="rounded-full hover:bg-white/50"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-white/50 ml-auto">
            <X className="w-5 h-5" />
          </Button>
        )}
      </div>
      <div>
        <h2 className="text-2xl font-bold mb-1">{title}</h2>
        {subtitle && <p className="text-muted-foreground text-sm">{subtitle}</p>}
      </div>
      {step !== 'menu' && (
        <div className="flex items-center gap-2 mt-4 text-xs font-medium overflow-x-auto no-scrollbar whitespace-nowrap">
          <button className={`${step === 'services' ? 'wizard-text-purple' : 'text-muted-foreground'}`} onClick={() => setStep('services')}>Services</button>
          <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />
          <button className={`${step === 'professional' ? 'wizard-text-purple' : 'text-muted-foreground'}`} onClick={() => selectedServices.length > 0 && setStep('professional')}>Professional</button>
          <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />
          <button className={`${step === 'datetime' ? 'wizard-text-purple' : 'text-muted-foreground'}`} onClick={() => selectedServices.length > 0 && setStep('datetime')}>Date & Time</button>
        </div>
      )}
    </div>
  );

  if (step === 'menu') {
    return (
      <div className="min-h-screen wizard-container pt-20 pb-24 px-4">
        <div className="max-w-2xl mx-auto space-y-6">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-3xl md:text-4xl font-bold mb-2 wizard-title-gradient">{salonSettings?.name || 'M Le Diamant'}</h1>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <MapPin className="w-4 h-4" /> {salonSettings?.address || 'Shop 13, Amwaj 2, Plaza Level, JBR - Dubai'}
            </p>
          </motion.div>

          <div className="grid gap-4">
            {[
              { id: 'services', icon: List, title: 'Select Services', desc: selectedServices.length > 0 ? `${selectedServices.length} selected` : 'Choose from our menu', grad: 'wizard-icon-gradient-purple' },
              { id: 'professional', icon: User, title: 'Choose Professional', desc: selectedMaster ? selectedMaster.full_name : 'Select preferred master', grad: 'wizard-icon-gradient-blue' },
              { id: 'datetime', icon: CalendarIcon, title: 'Date & Time', desc: selectedDate && selectedTime ? `${selectedDate} at ${selectedTime}` : 'Pick your slot', grad: 'wizard-icon-gradient-orange' }
            ].map((card, idx) => (
              <motion.div key={card.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }}>
                <Card className="group cursor-pointer border-2 hover:border-purple-500 transition-all hover:shadow-xl overflow-hidden" onClick={() => setStep(card.id as any)}>
                  <CardContent className="p-6 flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-2xl ${card.grad} flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform`}>
                      <card.icon className="w-7 h-7" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-xl mb-1">{card.title}</h3>
                      <p className="text-sm text-muted-foreground">{card.desc}</p>
                    </div>
                    <ChevronRight className="w-6 h-6 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {selectedServices.length > 0 && selectedDate && selectedTime && (
             <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
               <Button onClick={() => setStep('confirm')} className="w-full wizard-button-gradient py-6 rounded-2xl shadow-xl text-lg font-bold">
                 <CheckCircle2 className="w-6 h-6 mr-2" /> {t('confirmBooking', 'Continue to Confirmation')}
               </Button>
             </motion.div>
          )}
        </div>
      </div>
    );
  }

  if (step === 'services') {
    return (
      <div className="min-h-screen wizard-container pt-6 pb-32">
        <div className="max-w-4xl mx-auto">
          {renderHeader('Select Services', 'Choose one or more services')}
          <div className="p-4 space-y-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input placeholder="Search services..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10 h-12 rounded-xl border-2 focus:border-purple-500" />
            </div>
            <ScrollArea className="w-full">
              <div className="flex gap-2 pb-2">
                {categories.map(cat => (
                  <Button key={cat} variant={selectedCategory === cat ? 'default' : 'outline'} size="sm" onClick={() => setSelectedCategory(cat)} className={`rounded-full whitespace-nowrap ${selectedCategory === cat ? 'wizard-button-gradient' : ''}`}>{cat}</Button>
                ))}
              </div>
            </ScrollArea>
            <div className="grid gap-4">
              <AnimatePresence mode="popLayout">
                {filteredServices.map(service => {
                  const isSelected = selectedServices.some(s => s.id === service.id);
                  return (
                    <motion.div key={service.id} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
                      <Card className={`cursor-pointer transition-all hover:shadow-lg ${isSelected ? 'border-2 wizard-border-purple shadow-lg' : 'border-2 border-transparent'}`} onClick={() => handleServiceSelect(service)}>
                        <CardContent className="p-5 flex justify-between items-start gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-bold text-lg">{getServiceName(service)}</h3>
                              {isSelected && <CheckCircle2 className="w-5 h-5 wizard-text-purple" />}
                            </div>
                            <p className="text-sm text-muted-foreground mb-3">{service.description}</p>
                            <div className="flex items-center gap-4 text-sm">
                              <span className="flex items-center gap-1"><Clock className="w-4 h-4" />{service.duration || '30'} min</span>
                              <Badge variant="secondary" className="font-bold">{service.price} AED</Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        </div>
        {selectedServices.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t p-4 z-20 shadow-2xl">
            <div className="max-w-4xl mx-auto flex items-center justify-between">
              <div>
                <div className="font-bold text-lg">{totalPrice} AED</div>
                <div className="text-xs text-muted-foreground">{selectedServices.length} services • {totalDuration} min</div>
              </div>
              <Button onClick={() => setStep('professional')} className="wizard-button-gradient shadow-lg">Continue <ChevronRight className="ml-2 w-4 h-4" /></Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (step === 'professional') {
    return (
      <div className="min-h-screen wizard-container pt-6 pb-32">
        <div className="max-w-4xl mx-auto">
          {renderHeader('Choose Professional', 'Select your preferred master')}
          <div className="p-4 space-y-4">
            <Card className={`cursor-pointer transition-all border-2 ${!selectedMaster ? 'wizard-border-purple bg-purple-50/50' : 'border-transparent'}`} onClick={() => { setDraftConfig({ ...draftConfig, master: null }); if(currentServiceId) setBookingConfigs(prev => ({...prev, [currentServiceId]: {...prev[currentServiceId], master: null, time: ''}})); }}>
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white"><Users className="w-8 h-8" /></div>
                <div className="flex-1"><h3 className="font-bold text-lg">Any Available Professional</h3><p className="text-sm text-muted-foreground">First available master will take your appointment</p></div>
                {!selectedMaster && <CheckCircle2 className="w-6 h-6 wizard-text-purple" />}
              </CardContent>
            </Card>
            {capableMasters.map(master => {
              const isSelected = selectedMaster?.id === master.id;
              return (
                <Card key={master.id} className={`cursor-pointer transition-all border-2 ${isSelected ? 'wizard-border-purple shadow-md bg-purple-50/50' : 'border-transparent hover:shadow-md'}`} onClick={() => { if(currentServiceId) setBookingConfigs(prev => ({...prev, [currentServiceId]: {...prev[currentServiceId], master, time: ''}})); else setDraftConfig({...draftConfig, master, time: ''}); }}>
                  <CardContent className="p-6 flex items-center gap-4">
                    <Avatar className="w-16 h-16 border-2 wizard-border-purple"><AvatarImage src={master.photo} /><AvatarFallback>{master.full_name[0]}</AvatarFallback></Avatar>
                    <div className="flex-1">
                      <h3 className="font-bold text-lg">{master.full_name}</h3>
                      <p className="text-sm text-muted-foreground">{master.position}</p>
                      <div className="flex items-center gap-2 mt-1">
                         <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                         <span className="text-sm font-bold">{master.rating || '5.0'}</span>
                      </div>
                    </div>
                    {isSelected && <CheckCircle2 className="w-6 h-6 wizard-text-purple" />}
                  </CardContent>
                </Card>
              );
            })}
          </div>
          <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t p-4 z-20">
            <div className="max-w-4xl mx-auto">
              <Button onClick={() => setStep('datetime')} className="w-full wizard-button-gradient py-6 rounded-xl shadow-lg text-lg font-bold">Continue to Date & Time</Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'datetime') {
    const monthDays = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
    const morningSlots = availableSlots.filter(s => parseInt(s.time) < 12);
    const afternoonSlots = availableSlots.filter(s => parseInt(s.time) >= 12 && parseInt(s.time) < 17);
    const eveningSlots = availableSlots.filter(s => parseInt(s.time) >= 17);

    return (
      <div className="min-h-screen wizard-container pt-6 pb-40">
        <div className="max-w-4xl mx-auto">
          {renderHeader('Select Date & Time', 'Choose your preferred appointment slot')}
          <div className="p-4 space-y-6">
            <Card className="border-2 overflow-hidden">
               <CardContent className="p-6">
                 <div className="flex items-center justify-between mb-6">
                   <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(prev => addDays(prev, -30))}><ArrowLeft className="w-5 h-5" /></Button>
                   <h3 className="font-bold text-xl">{format(currentMonth, 'MMMM yyyy')}</h3>
                   <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(prev => addDays(prev, 30))}><ChevronRight className="w-5 h-5" /></Button>
                 </div>
                 <div className="grid grid-cols-7 gap-2">
                   {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => <div key={d} className="text-center text-xs font-bold text-muted-foreground pb-2">{d}</div>)}
                   {monthDays.map((date, i) => {
                      const dStr = format(date, 'yyyy-MM-dd');
                      const isAvailable = availableDates.has(dStr);
                      const isPast = date < new Date() && !isToday(date);
                      const isSel = selectedDate === dStr;
                      return (
                        <button key={i} disabled={!isAvailable || isPast} onClick={() => { if(currentServiceId) setBookingConfigs(prev => ({...prev, [currentServiceId]: {...prev[currentServiceId], date: dStr, time: ''}})); else setDraftConfig({...draftConfig, date: dStr, time: ''}); }} className={`aspect-square rounded-xl text-sm font-bold transition-all ${isSel ? 'wizard-day-selected' : isAvailable ? 'wizard-bg-purple-light' : 'opacity-20 cursor-not-allowed'}`}>
                          {format(date, 'd')}
                        </button>
                      );
                   })}
                 </div>
               </CardContent>
            </Card>

            {selectedDate && (
              <Card className="border-2 p-6 space-y-6">
                <h3 className="font-bold text-lg flex items-center gap-2"><Clock className="w-5 h-5 wizard-text-purple" /> Available Slots</h3>
                {[ {l: 'Morning', s: morningSlots}, {l: 'Afternoon', s: afternoonSlots}, {l: 'Evening', s: eveningSlots}].map(g => g.s.length > 0 && (
                  <div key={g.l}>
                    <h4 className="text-sm font-bold text-muted-foreground mb-3">{g.l}</h4>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {g.s.map(slot => (
                        <button key={slot.time} onClick={() => handleSlotClick(slot.time)} className={`py-3 rounded-lg font-bold text-sm border-2 transition-all ${selectedTime === slot.time ? 'wizard-slot-selected' : 'border-gray-200 wizard-border-purple-hover'}`}>
                          {slot.time}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </Card>
            )}
          </div>
          {selectedTime && (
            <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t p-4 z-20">
              <div className="max-w-4xl mx-auto">
                <Button onClick={() => setStep('confirm')} className="w-full wizard-button-gradient py-6 rounded-xl shadow-lg text-lg font-bold">Review Booking</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (step === 'confirm') {
    return (
      <div className="min-h-screen wizard-container pt-6 pb-32 px-4 text-gray-800">
        <div className="max-w-2xl mx-auto space-y-6">
          {renderHeader('Confirm Your Booking')}
          <Card className="border-2 shadow-xl">
            <CardContent className="p-8 space-y-6">
              <div className="space-y-4">
                <h3 className="font-bold text-xl pb-2 border-b">Selected Services</h3>
                {selectedServices.map(s => (
                  <div key={s.id} className="flex justify-between items-center">
                    <div>
                      <p className="font-bold text-lg">{getServiceName(s)}</p>
                      <p className="text-sm text-muted-foreground">{s.duration} min with {bookingConfigs[s.id]?.master?.full_name || 'Any Master'}</p>
                    </div>
                    <p className="font-bold text-lg">{s.price} AED</p>
                  </div>
                ))}
                <div className="pt-4 border-t-2 flex justify-between items-center wizard-text-purple">
                  <span className="text-xl font-bold">Total</span>
                  <span className="text-2xl font-black">{totalPrice} AED</span>
                </div>
              </div>
              <div className="space-y-3 pt-4">
                <div className="flex items-center gap-3 text-lg"><CalendarIcon className="w-5 h-5 wizard-text-purple" /> {format(parseISO(selectedDate || ''), 'EEEE, MMM dd, yyyy')}</div>
                <div className="flex items-center gap-3 text-lg"><Clock className="w-5 h-5 wizard-text-purple" /> {selectedTime}</div>
              </div>
              <Button disabled={loading} onClick={handleBook} className="w-full wizard-button-gradient py-8 rounded-2xl text-xl font-black shadow-2xl mt-4">
                {loading ? <Loader2 className="w-6 h-6 animate-spin mr-2" /> : <CheckCircle2 className="w-6 h-6 mr-2" />}
                {loading ? 'Processing...' : 'Confirm & Book'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return null;
}
