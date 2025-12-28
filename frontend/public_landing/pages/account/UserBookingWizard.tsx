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

  const [step, setStep] = useState<'menu' | 'services' | 'professional' | 'datetime' | 'confirm'>(
    (searchParams.get('step') as any) || 'menu'
  );
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

  // Sync URL with step
  useEffect(() => {
    setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        next.set('step', step);
        if (!next.has('booking')) next.set('booking', 'true');
        return next;
    }, { replace: true });
  }, [step, setSearchParams]);

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
      } catch (e) {}
    };
    fetchAvailability();
  }, [currentMonth, selectedMaster, selectedServices]);

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
          setAvailableSlots(allSlots.sort((a,b) => a.time.localeCompare(b.time)));
        }
      } catch (e) {}
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

    setLoading(true);
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      for (const service of selectedServices) {
        await api.createBooking({
          instagram_id: user?.username || `web_${user?.id || 'guest'}`,
          service: getServiceName(service),
          master: selectedMaster?.username || 'any_professional',
          date: dateStr,
          time: selectedTime,
          phone: user?.phone,
          name: user?.full_name
        });
      }
      
      toast.success('Booking confirmed successfully!', {
        description: `${format(selectedDate, 'MMMM dd, yyyy')} at ${selectedTime}`
      });
      
      if (onSuccess) onSuccess();
      if (onClose) onClose();
    } catch (e) {
      toast.error('Error creating booking');
    } finally {
      setLoading(false);
    }
  };

  const renderHeader = (title: string, subtitle?: string) => (
    <div className="sticky top-0 z-10 bg-gradient-to-br from-rose-50 via-purple-50 to-blue-50 pb-6 pt-4 px-4 overflow-x-hidden">
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
          className="rounded-full hover:bg-white/50"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>

        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-full hover:bg-white/50 ml-auto"
          >
            <X className="w-5 h-5" />
          </Button>
        )}
      </div>

      <div>
        <h2 className="text-2xl md:text-3xl font-bold mb-1">{title}</h2>
        {subtitle && <p className="text-muted-foreground text-sm">{subtitle}</p>}
      </div>

      {/* Progress breadcrumbs */}
      {step !== 'menu' && (
        <div className="flex items-center gap-2 mt-4 text-xs font-medium overflow-x-auto no-scrollbar whitespace-nowrap">
          <button
            className={`${step === 'services' ? 'text-purple-600' : 'text-muted-foreground'} transition-colors`}
            onClick={() => setStep('services')}
          >
            Services
          </button>
          <ChevronRight className="w-3 h-3 text-muted-foreground" />
          <button
            className={`${step === 'professional' ? 'text-purple-600' : 'text-muted-foreground'} transition-colors`}
            onClick={() => selectedServices.length > 0 && setStep('professional')}
            disabled={selectedServices.length === 0}
          >
            Professional
          </button>
          <ChevronRight className="w-3 h-3 text-muted-foreground" />
          <button
            className={`${step === 'datetime' ? 'text-purple-600' : 'text-muted-foreground'} transition-colors`}
            onClick={() => selectedServices.length > 0 && setStep('datetime')}
            disabled={selectedServices.length === 0}
          >
            Date & Time
          </button>
          {step === 'confirm' && (
            <>
              <ChevronRight className="w-3 h-3 text-muted-foreground" />
              <span className="text-purple-600">Confirm</span>
            </>
          )}
        </div>
      )}
    </div>
  );

  if (step === 'menu') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-purple-50 to-blue-50 pt-20 pb-12 px-4 wizard-scrollable">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="flex items-start justify-between mb-8">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                {salonSettings?.name || 'M Le Diamant'}
              </h1>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {salonSettings?.address || 'Shop 13, Amwaj 2, Plaza Level, JBR - Dubai'}
              </p>
            </div>
            {onClose && (
              <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
                <X className="w-6 h-6" />
              </Button>
            )}
          </div>

          <div className="grid gap-4">
            {[
              {
                value: 'services',
                icon: List,
                title: 'Select Services',
                description: selectedServices.length > 0
                  ? `${selectedServices.length} selected • ${totalPrice} AED`
                  : "Choose from our menu",
                gradient: 'from-purple-500 to-pink-500'
              },
              {
                value: 'professional',
                icon: User,
                title: 'Choose Professional',
                description: selectedMaster ? selectedMaster.full_name : "Select your preferred master",
                gradient: 'from-blue-500 to-cyan-500'
              },
              {
                value: 'datetime',
                icon: CalendarIcon,
                title: 'Select Date & Time',
                description: selectedDate && selectedTime 
                  ? `${format(selectedDate, 'MMM dd')} at ${selectedTime}` 
                  : "Pick your appointment slot",
                gradient: 'from-orange-500 to-red-500'
              }
            ].map((card, idx) => (
              <motion.div
                key={card.value}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
              >
                <Card
                  className="group cursor-pointer border-2 hover:border-purple-500 transition-all hover:shadow-2xl overflow-hidden"
                  onClick={() => setStep(card.value as any)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${card.gradient} flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform`}>
                        <card.icon className="w-7 h-7" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-xl mb-1">{card.title}</h3>
                        <p className="text-sm text-muted-foreground">{card.description}</p>
                      </div>
                      <ChevronRight className="w-6 h-6 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {selectedServices.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Button 
                size="lg" 
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-6 rounded-2xl shadow-xl"
                onClick={() => setStep('confirm')}
                disabled={!selectedDate || !selectedTime}
              >
                <CheckCircle2 className="w-5 h-5 mr-2" />
                Continue to Confirmation
              </Button>
            </motion.div>
          )}
        </div>
      </div>
    );
  }

  if (step === 'services') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-purple-50 to-blue-50 pt-6 pb-32 px-4 wizard-scrollable">
        <div className="max-w-4xl mx-auto">
          {renderHeader('Select Services', 'Choose one or more services')}

          {/* Search */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Search services..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-12 rounded-xl border-2 focus:border-purple-500"
              />
            </div>
          </div>

          {/* Categories */}
          <ScrollArea className="mb-6">
            <div className="flex gap-2 pb-2">
              {categories.map(cat => (
                <Button
                  key={cat}
                  variant={selectedCategory === cat ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(cat)}
                  className={`rounded-full whitespace-nowrap ${
                    selectedCategory === cat 
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white' 
                      : ''
                  }`}
                >
                  {cat}
                </Button>
              ))}
            </div>
          </ScrollArea>

          {/* Services Grid */}
          <div className="grid gap-4 mb-6">
            <AnimatePresence mode="popLayout">
              {filteredServices.map((service, idx) => {
                const isSelected = selectedServices.some(s => s.id === service.id);
                return (
                  <motion.div
                    key={service.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <Card
                      className={`cursor-pointer transition-all hover:shadow-lg ${
                        isSelected ? 'border-2 border-purple-500 shadow-lg' : 'border-2 border-transparent'
                      }`}
                      onClick={() => handleServiceSelect(service)}
                    >
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-bold text-lg">{getServiceName(service)}</h3>
                              {isSelected && (
                                <CheckCircle2 className="w-5 h-5 text-purple-600" />
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mb-3">{service.description}</p>
                            <div className="flex items-center gap-4 text-sm">
                              <div className="flex items-center gap-1">
                                <Clock className="w-4 h-4 text-muted-foreground" />
                                <span>{service.duration || '30'} min</span>
                              </div>
                              <Badge variant="secondary" className="font-semibold">
                                {service.price} AED
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

          {/* Fixed Bottom Bar */}
          {selectedServices.length > 0 && (
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-2xl p-4 z-20">
              <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
                <div>
                  <div className="font-bold text-lg">{totalPrice} AED</div>
                  <div className="text-sm text-muted-foreground">
                    {selectedServices.length} service{selectedServices.length > 1 ? 's' : ''} • {totalDuration} min
                  </div>
                </div>
                <Button
                  size="lg"
                  onClick={() => setStep('professional')}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                >
                  Continue
                  <ChevronRight className="w-5 h-5 ml-2" />
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
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-purple-50 to-blue-50 pt-6 pb-32 px-4 wizard-scrollable">
        <div className="max-w-4xl mx-auto">
          {renderHeader('Choose Professional', 'Select your preferred master or any available')}

          <div className="space-y-4">
            {/* Any Available Option */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card
                className={`cursor-pointer transition-all hover:shadow-lg ${
                  selectedMaster === null ? 'border-2 border-purple-500 shadow-lg' : 'border-2 border-transparent'
                }`}
                onClick={() => handleMasterSelect(null)}
              >
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white">
                      <Users className="w-8 h-8" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-lg mb-1 flex items-center gap-2">
                        Any Available Professional
                        {selectedMaster === null && <CheckCircle2 className="w-5 h-5 text-purple-600" />}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        First available master will take your appointment
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Masters List */}
            {masters.map((master, idx) => {
              const isSelected = selectedMaster?.id === master.id;
              return (
                <motion.div
                  key={master.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: (idx + 1) * 0.1 }}
                >
                  <Card
                    className={`cursor-pointer transition-all hover:shadow-lg ${
                      isSelected ? 'border-2 border-purple-500 shadow-lg' : 'border-2 border-transparent'
                    }`}
                    onClick={() => handleMasterSelect(master)}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <Avatar className="w-16 h-16 border-2 border-purple-200">
                          <AvatarImage src={master.photo} />
                          <AvatarFallback>{master.full_name[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-lg">{master.full_name}</h3>
                            {isSelected && <CheckCircle2 className="w-5 h-5 text-purple-600" />}
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{master.position}</p>
                          <div className="flex items-center gap-2 text-sm">
                            <div className="flex items-center gap-1">
                              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                              <span className="font-semibold">{master.rating}</span>
                            </div>
                            <span className="text-muted-foreground">({master.reviews || 0} reviews)</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          {/* Fixed Bottom Bar */}
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-2xl p-4 z-20">
            <div className="max-w-4xl mx-auto">
              <Button
                size="lg"
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold"
                onClick={() => setStep('datetime')}
              >
                Continue to Date & Time
                <ChevronRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'datetime') {
    const monthDays = eachDayOfInterval({
      start: startOfMonth(currentMonth),
      end: endOfMonth(currentMonth)
    });

    const groupedSlots = [
      { label: 'Morning', slots: availableSlots.filter(s => parseInt(s.time) < 12) },
      { label: 'Afternoon', slots: availableSlots.filter(s => parseInt(s.time) >= 12 && parseInt(s.time) < 17) },
      { label: 'Evening', slots: availableSlots.filter(s => parseInt(s.time) >= 17) },
    ].filter(g => g.slots.length > 0);

    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-purple-50 to-blue-50 pt-6 pb-32 px-4 wizard-scrollable">
        <div className="max-w-4xl mx-auto">
          {renderHeader('Select Date & Time', 'Choose your preferred appointment slot')}

          {/* Calendar */}
          <Card className="mb-6 overflow-hidden border-2">
            <CardContent className="p-6">
              {/* Month Navigation */}
              <div className="flex items-center justify-between mb-6">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1))}
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <h3 className="font-bold text-xl">
                  {format(currentMonth, 'MMMM yyyy')}
                </h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1))}
                >
                  <ChevronRight className="w-5 h-5" />
                </Button>
              </div>

              {/* Weekday Headers */}
              <div className="grid grid-cols-7 gap-2 mb-2">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                  <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Days */}
              <div className="grid grid-cols-7 gap-2">
                {monthDays.map((day, idx) => {
                  const dateStr = format(day, 'yyyy-MM-dd');
                  const isAvailable = availableDates.has(dateStr);
                  const isPast = day < new Date() && !isToday(day);
                  const isSelected = selectedDate && isSameDay(day, selectedDate);
                  
                  return (
                    <motion.button
                      key={idx}
                      whileHover={!isPast && isAvailable ? { scale: 1.05 } : {}}
                      whileTap={!isPast && isAvailable ? { scale: 0.95 } : {}}
                      onClick={() => !isPast && isAvailable && handleDateSelect(day)}
                      disabled={isPast || !isAvailable}
                      className={`
                        aspect-square rounded-xl p-2 text-sm font-medium transition-all
                        ${!isAvailable || isPast 
                          ? 'text-muted-foreground/30 cursor-not-allowed' 
                          : 'hover:bg-purple-100 cursor-pointer bg-purple-50/50'
                        }
                        ${isSelected 
                          ? 'bg-gradient-to-br from-purple-600 to-pink-600 text-white shadow-lg !bg-none !bg-purple-600' 
                          : ''
                        }
                        ${isToday(day) && !isSelected ? 'border-2 border-purple-500' : ''}
                      `}
                    >
                      <div>{format(day, 'd')}</div>
                    </motion.button>
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
            >
              <Card className="border-2">
                <CardContent className="p-6">
                  <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-purple-600" />
                    Available Time Slots
                  </h3>

                  {groupedSlots.map(group => (
                    <div key={group.label} className="mb-6 last:mb-0">
                      <h4 className="text-sm font-semibold text-muted-foreground mb-3">{group.label}</h4>
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                        {group.slots.map(slot => {
                          const isSelected = selectedTime === slot.time;
                          return (
                            <motion.button
                              key={slot.time}
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => handleTimeSelect(slot.time)}
                              className={`
                                relative py-3 px-2 rounded-lg font-medium text-sm transition-all
                                ${isSelected
                                  ? 'bg-gradient-to-br from-purple-600 to-pink-600 text-white shadow-lg'
                                  : slot.is_optimal
                                    ? 'bg-green-50 text-green-700 border-2 border-green-200 hover:border-green-400'
                                    : 'bg-white border-2 border-gray-200 hover:border-purple-300'
                                }
                              `}
                            >
                              {slot.time}
                              {slot.is_optimal && !isSelected && (
                                <Sparkles className="w-3 h-3 absolute top-1 right-1 text-green-600" />
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

          {/* Fixed Bottom Bar */}
          {selectedDate && selectedTime && (
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-2xl p-4 z-20">
              <div className="max-w-4xl mx-auto">
                <Button
                  size="lg"
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold"
                  onClick={() => setStep('confirm')}
                >
                  Continue to Confirmation
                  <ChevronRight className="w-5 h-5 ml-2" />
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
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-purple-50 to-blue-50 pt-6 pb-32 px-4 wizard-scrollable">
        <div className="max-w-2xl mx-auto">
          {renderHeader('Confirm Booking', 'Review your appointment details')}

          <div className="space-y-4">
            {/* Services */}
            <Card className="border-2">
              <CardContent className="p-6">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                  <List className="w-5 h-5 text-purple-600" />
                  Services
                </h3>
                <div className="space-y-3">
                  {selectedServices.map(service => (
                    <div key={service.id} className="flex justify-between items-center py-2 border-b last:border-0">
                      <div>
                        <div className="font-medium">{getServiceName(service)}</div>
                        <div className="text-sm text-muted-foreground">{service.duration || '30'} min</div>
                      </div>
                      <div className="font-bold">{service.price} AED</div>
                    </div>
                  ))}
                  <div className="flex justify-between items-center pt-3 border-t-2 border-purple-200">
                    <div className="font-bold text-lg">Total</div>
                    <div className="font-bold text-xl text-purple-600">{totalPrice} AED</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Professional */}
            <Card className="border-2">
              <CardContent className="p-6">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-purple-600" />
                  Professional
                </h3>
                {selectedMaster ? (
                  <div className="flex items-center gap-4">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={selectedMaster.photo} />
                      <AvatarFallback>{selectedMaster.full_name[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{selectedMaster.full_name}</div>
                      <div className="text-sm text-muted-foreground">{selectedMaster.position}</div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white">
                      <Users className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="font-medium">Any Available Professional</div>
                      <div className="text-sm text-muted-foreground">First available master</div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Date & Time */}
            {selectedDate && selectedTime && (
              <Card className="border-2">
                <CardContent className="p-6">
                  <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                    <CalendarIcon className="w-5 h-5 text-purple-600" />
                    Date & Time
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Date</span>
                      <span className="font-medium">{format(selectedDate, 'EEEE, MMMM dd, yyyy')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Time</span>
                      <span className="font-medium">{selectedTime}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Duration</span>
                      <span className="font-medium">{totalDuration} minutes</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Fixed Bottom Bar */}
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-2xl p-4 z-20">
            <div className="max-w-2xl mx-auto">
              <Button
                size="lg"
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold"
                onClick={handleConfirmBooking}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Confirming...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5 mr-2" />
                    Confirm Booking
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
