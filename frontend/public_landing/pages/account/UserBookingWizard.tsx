//UserBookingWizard.tsx
import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { ru, enUS, ar } from 'date-fns/locale';
import {
  ArrowLeft, Calendar as CalendarIcon, Check, ChevronRight, Clock,
  List, MapPin, Search, User, X, Loader2, Edit2,
  Sparkles, CheckCircle2
} from 'lucide-react';
import { Calendar } from '../../components/ui/calendar';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent } from '../../components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar';
import { api } from '../../../src/services/api';
import { toast } from 'sonner';
import { useAuth } from '../../../src/contexts/AuthContext';
import { Badge } from '../../components/ui/badge';

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
  services?: Service[];
}

interface Props {
  onClose?: () => void;
  onSuccess?: () => void;
}

export function UserBookingWizard({ onClose, onSuccess }: Props) {
  const { t, i18n } = useTranslation(['booking', 'common']);
  const { user } = useAuth();
  const [step, setStep] = useState<'menu' | 'professional' | 'services' | 'datetime' | 'confirm'>('menu');
  const [loading, setLoading] = useState(false);

  interface Slot {
    time: string;
    is_optimal: boolean;
  }

  const [masters, setMasters] = useState<Master[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [availableSlots, setAvailableSlots] = useState<Slot[]>([]);
  const [holidays, setHolidays] = useState<{ date: string; name: string }[]>([]);
  const [previewSlots, setPreviewSlots] = useState<Record<number, string[]>>({});
  const [previewDates, setPreviewDates] = useState<Record<number, 'today' | 'tomorrow'>>({});
  const [availableDates, setAvailableDates] = useState<Set<string>>(new Set());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

  interface BookingConfig {
    serviceId: string;
    master: Master | null;
    date: string;
    time: string;
  }

  const [bookingConfigs, setBookingConfigs] = useState<Record<string, BookingConfig>>({});
  const [currentServiceId, setCurrentServiceId] = useState<string | null>(null);
  const [draftConfig, setDraftConfig] = useState<{
    master: Master | null;
    date: string;
    time: string;
  }>({ master: null, date: '', time: '' });

  const currentConfig = currentServiceId ? bookingConfigs[currentServiceId] : null;
  const selectedMaster = currentServiceId ? currentConfig?.master : draftConfig.master;
  const selectedDate = currentServiceId ? currentConfig?.date : draftConfig.date;
  const selectedTime = currentServiceId ? currentConfig?.time : draftConfig.time;

  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [history, setHistory] = useState<string[]>([]);
  const [mastersAvailability, setMastersAvailability] = useState<Record<string, string[]>>({});

  const updateStep = (newStep: typeof step) => {
    setHistory(prev => [...prev, step]);
    setStep(newStep);
  };

  const handleBack = (override?: () => void) => {
    if (override) {
      override();
      return;
    }

    if (history.length > 0) {
      const laststep = history[history.length - 1] as typeof step;
      setHistory(prev => prev.slice(0, -1));
      setStep(laststep);
    } else {
      if (step === 'professional') setStep('menu');
      else if (step === 'services') setStep('menu');
      else if (step === 'datetime') {
        if (currentServiceId) setStep('professional');
        else setStep('menu');
      } else setStep('menu');
    }
  };

  const getClientId = () => {
    if (user?.id) return String(user.id);
    let cid = localStorage.getItem('booking_client_id');
    if (!cid) {
      cid = 'guest_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('booking_client_id', cid);
    }
    return cid;
  };

  const handleSlotClick = async (slot: string) => {
    const dStr = selectedDate || '';
    if (!dStr) return;

    const applySelection = () => {
      if (currentServiceId) {
        setBookingConfigs(prev => ({
          ...prev,
          [currentServiceId]: { ...prev[currentServiceId], time: slot }
        }));
      } else {
        setDraftConfig(prev => ({ ...prev, time: slot }));
      }
    };

    applySelection();

    const m = selectedMaster;
    if (!m) return;

    const sId = currentServiceId ? parseInt(currentServiceId) : 0;
    const mName = m.full_name || m.username;

    try {
      const res = await api.createHold({
        service_id: sId,
        master_name: mName,
        date: dStr,
        time: slot,
        client_id: getClientId()
      });
      if (!res.success) {
        toast.error(t('slotTaken', 'This slot is already taken. Please choose another.'));
        if (currentServiceId) {
          setBookingConfigs(prev => ({
            ...prev,
            [currentServiceId]: { ...prev[currentServiceId], time: '' }
          }));
        } else {
          setDraftConfig(prev => ({ ...prev, time: '' }));
        }
      }
    } catch (e) {
      console.error("Hold failed", e);
    }
  };

  const toggleMaster = (master: Master) => {
    if (currentServiceId) {
      setBookingConfigs(prev => {
        const current = prev[currentServiceId];
        const newMaster = current?.master?.id === master.id ? null : master;
        return {
          ...prev,
          [currentServiceId]: {
            ...current,
            master: newMaster,
            date: current.date,
            time: ''
          }
        };
      });
    } else {
      setDraftConfig(prev => ({
        ...prev,
        master: prev.master?.id === master.id ? null : master,
        date: prev.date,
        time: ''
      }));
    }
  };

  const renderStickyFooter = () => {
    if (selectedServices.length === 0) {
      if (step === 'menu') return null;

      if ((draftConfig.master || draftConfig.date) && step !== 'services') {
        return (
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur border-t shadow-lg z-20">
            <div className="max-w-2xl mx-auto flex gap-3">
              {!draftConfig.master && (
                <Button
                  variant="outline"
                  className="flex-1 h-12"
                  onClick={() => updateStep('professional')}
                >
                  <User className="w-4 h-4 mr-2" />
                  {t('chooseMaster', 'Select Master')}
                </Button>
              )}
              <Button
                className={`h-12 bg-black text-white hover:bg-black/90 ${!draftConfig.master ? 'flex-1' : 'w-full'}`}
                onClick={() => updateStep('services')}
              >
                {t('chooseServices', 'Select Services')}
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        );
      }
      return null;
    }

    const incompleteService = selectedServices.find(s => {
      const cfg = bookingConfigs[String(s.id)];
      return !cfg || !cfg.master || !cfg.date || !cfg.time;
    });

    const config = incompleteService ? bookingConfigs[String(incompleteService.id)] : undefined;

    const fieldFlow: {
      key: 'master' | 'date' | 'time';
      isMissing: (cfg: BookingConfig | undefined) => boolean;
      step: typeof step;
      label: string;
    }[] = [
        {
          key: 'master',
          isMissing: cfg => !cfg || !cfg.master,
          step: 'professional',
          label: t('chooseMaster', 'Select Master'),
        },
        {
          key: 'date',
          isMissing: cfg => !cfg || !cfg.date,
          step: 'datetime',
          label: t('chooseDate', 'Select Date'),
        },
        {
          key: 'time',
          isMissing: cfg => !cfg || !cfg.time,
          step: 'datetime',
          label: t('chooseTime', 'Select Time'),
        },
      ];

    const nextField = incompleteService ? fieldFlow.find(f => f.isMissing(config)) : undefined;

    if (!incompleteService || !nextField) {
      return (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur border-t shadow-lg z-20">
          <div className="max-w-2xl mx-auto">
            <Button
              onClick={() => updateStep('confirm')}
              className="w-full h-14 text-lg bg-black text-white hover:bg-black/90 shadow-xl"
            >
              <CheckCircle2 className="w-5 h-5 mr-2" />
              {t('confirmBooking', 'Confirm Booking')}
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur border-t shadow-lg z-20">
        <div className="max-w-2xl mx-auto space-y-3">
          <div className="text-center text-sm text-muted-foreground">
            Booking for: <span className="font-semibold text-foreground">{getServiceName(incompleteService)}</span>
          </div>
          <div className="flex gap-2">
            {step !== 'services' && (
              <Button
                variant="outline"
                className="flex-1 h-12"
                onClick={() => updateStep('services')}
              >
                {t('services', 'Services')}
              </Button>
            )}
            <Button
              variant="default"
              className="flex-[2] h-12 bg-black text-white hover:bg-black/90"
              onClick={() => {
                setCurrentServiceId(String(incompleteService.id));
                updateStep(nextField.step);
              }}
            >
              {nextField.label}
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const getServiceName = (s: Service) => {
    return s[`name_${i18n.language}` as keyof Service] || s.name_ru || s.name;
  };

  const renderHeader = (title: string, onBackOverride?: () => void) => (
    <div className="sticky top-0 z-10 bg-background/95 backdrop-blur pb-4 -mt-2 pt-2">
      <div className="flex items-center gap-3 mb-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => handleBack(onBackOverride)}
          className="rounded-full hover:bg-muted"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>

        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-full hover:bg-muted ml-auto"
          >
            <X className="w-5 h-5" />
          </Button>
        )}
      </div>

      <div>
        <h2 className="text-2xl md:text-3xl font-bold mb-2">{title}</h2>

        {step !== 'menu' && (
          <div className="flex items-center gap-2 text-xs font-medium">
            <button
              className={`${step === 'services' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'} transition-colors`}
              onClick={() => setStep('services')}
            >
              Services
            </button>
            <ChevronRight className="w-3 h-3 text-muted-foreground" />
            <button
              className={`${step === 'professional' ? 'text-primary' : (['datetime', 'confirm'].includes(step) ? 'text-muted-foreground hover:text-foreground' : 'text-muted-foreground/50')} transition-colors`}
              onClick={() => {
                if (['datetime', 'confirm'].includes(step)) setStep('professional');
              }}
            >
              Master
            </button>
            <ChevronRight className="w-3 h-3 text-muted-foreground" />
            <span className={`${step === 'datetime' ? 'text-primary' : (step === 'confirm' ? 'text-muted-foreground' : 'text-muted-foreground/50')}`}>
              Date & Time
            </span>
          </div>
        )}
      </div>
    </div>
  );

  const groupSlots = (slots: Slot[]) => {
    const groups: { label: string; slots: Slot[] }[] = [];
    const morning: Slot[] = [];
    const day: Slot[] = [];
    const evening: Slot[] = [];

    slots.forEach(slot => {
      const hour = parseInt(slot.time.split(':')[0], 10);
      if (hour < 12) morning.push(slot);
      else if (hour < 17) day.push(slot);
      else evening.push(slot);
    });

    if (morning.length) groups.push({ label: t('morning', 'Morning'), slots: morning });
    if (day.length) groups.push({ label: t('day', 'Afternoon'), slots: day });
    if (evening.length) groups.push({ label: t('evening', 'Evening'), slots: evening });

    return groups;
  };

  const parseDuration = (durationStr?: string): number => {
    if (!durationStr) return 60;
    let d = 0;
    if (durationStr.includes('h')) d += parseInt(durationStr) * 60;
    if (durationStr.includes('min')) {
      const parts = durationStr.split(' ');
      const minIndex = parts.findIndex(p => p.includes('min'));
      if (minIndex > 0) d += parseInt(parts[minIndex - 1]);
      else if (!durationStr.includes('h')) d += parseInt(durationStr);
    }
    if (d === 0 && !isNaN(parseInt(durationStr))) {
      d = parseInt(durationStr);
    }
    return d > 0 ? d : 60;
  };

  const formattedDuration = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0 && m > 0) return `${h}h ${m}min`;
    if (h > 0) return `${h}h`;
    return `${m}min`;
  };

  const getTotalStats = () => {
    const servicesToCount = selectedServices;
    let totalDuration = 0;
    let totalPrice = 0;
    servicesToCount.forEach(s => {
      totalDuration += parseDuration(s.duration);
      totalPrice += s.price;
    });
    return {
      duration: totalDuration,
      durationStr: formattedDuration(totalDuration),
      price: totalPrice
    };
  };

  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const stepParam = searchParams.get('step');
    if (stepParam && ['menu', 'services', 'professional', 'datetime', 'confirm'].includes(stepParam)) {
      if (stepParam !== step) {
        setStep(stepParam as any);
      }
    }

    const idsParam = searchParams.get('ids');
    const currentParam = searchParams.get('current');
    if (idsParam && services.length > 0) {
      const ids = idsParam.split(',').map(Number);
      const currentIds = selectedServices.map(s => s.id);
      const isDifferent = ids.length !== currentIds.length || !ids.every(id => currentIds.includes(id));
      if (isDifferent) {
        const restored = services.filter(s => ids.includes(s.id));
        if (restored.length > 0) {
          setSelectedServices(restored);
          setBookingConfigs(prev => {
            const next = { ...prev };
            restored.forEach(s => {
              if (!next[String(s.id)]) {
                next[String(s.id)] = {
                  serviceId: String(s.id),
                  master: null,
                  date: '',
                  time: ''
                };
              }
            });
            return next;
          });
        }
      }
    }
    if (currentParam && currentParam !== currentServiceId) {
      setCurrentServiceId(currentParam);
    }
  }, [searchParams, services]);

  useEffect(() => {
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      newParams.set('step', step);
      if (!newParams.has('booking')) newParams.set('booking', 'true');
      if (selectedServices.length > 0) {
        newParams.set('ids', selectedServices.map(s => s.id).join(','));
      } else {
        newParams.delete('ids');
      }
      if (currentServiceId) {
        newParams.set('current', currentServiceId);
      } else {
        newParams.delete('current');
      }
      return newParams;
    });
  }, [step, selectedServices, currentServiceId, setSearchParams]);

  useEffect(() => {
    if (step === 'menu') {
      setSelectedServices([]);
      setBookingConfigs({});
      setCurrentServiceId(null);
      setDraftConfig({ master: null, date: '', time: '' });
      setHistory([]);
    }
  }, [step]);

  const toggleService = (service: Service, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setSelectedServices(prev => {
      const exists = prev.find(s => String(s.id) === String(service.id));
      if (exists) {
        const newServices = prev.filter(s => String(s.id) !== String(service.id));
        setBookingConfigs(curr => {
          const next = { ...curr };
          delete next[String(service.id)];
          return next;
        });
        if (String(service.id) === currentServiceId) {
          setCurrentServiceId(null);
        }
        return newServices;
      } else {
        setBookingConfigs(curr => ({
          ...curr,
          [String(service.id)]: {
            serviceId: String(service.id),
            master: draftConfig.master || null,
            date: draftConfig.date || '',
            time: ''
          }
        }));
        setCurrentServiceId(String(service.id));
        return [...prev, service];
      }
    });
  };

  const capableMasters = useMemo(() => {
    if (!currentServiceId) return masters;
    const service = selectedServices.find(s => String(s.id) === currentServiceId);
    if (!service) return masters;
    return masters.filter(master => {
      if (!master.services || master.services.length === 0) {
        return true;
      }
      const hasService = master.services.some(s => String(s.id) === String(service.id));
      return hasService;
    });
  }, [masters, currentServiceId, selectedServices]);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);
        let employees: Master[] = [];
        try {
          const usersRes = await api.getUsers();
          const users = Array.isArray(usersRes) ? usersRes : (usersRes.users || []);
          employees = users.filter((u: any) => u.role === 'employee' || u.is_service_provider);
          setMasters(employees);
        } catch (err) {
          console.error("Error loading users", err);
        }

        const servicesRes = await api.getServices();
        if (Array.isArray(servicesRes)) {
          setServices(servicesRes);
        } else if (servicesRes.services && Array.isArray(servicesRes.services)) {
          setServices(servicesRes.services);
        } else if (servicesRes.categories) {
          const allServices: Service[] = [];
          servicesRes.categories.forEach((cat: any) => {
            if (cat.items) allServices.push(...cat.items);
          });
          setServices(allServices);
        }
      } catch (e) {
        console.error("Failed to load booking data", e);
        toast.error("Error loading booking data");
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, [i18n.language]);

  useEffect(() => {
    api.getHolidays().then(data => {
      if (Array.isArray(data)) {
        setHolidays(data);
      }
    });
  }, []);

  useEffect(() => {
    if (currentServiceId && bookingConfigs[currentServiceId]?.date) {
      loadSlots();
    } else if (!currentServiceId && draftConfig.date) {
      loadSlots();
    }
  }, [bookingConfigs, currentServiceId, draftConfig.date, draftConfig.master]);

  useEffect(() => {
    if (step === 'datetime' && currentServiceId) {
      const cfg = bookingConfigs[currentServiceId];
      if (cfg && !cfg.date && draftConfig.date) {
        setBookingConfigs(prev => ({
          ...prev,
          [currentServiceId]: {
            ...prev[currentServiceId],
            date: draftConfig.date,
            time: ''
          }
        }));
      }
    }
  }, [step, currentServiceId, bookingConfigs, draftConfig.date]);

  useEffect(() => {
    if (masters.length > 0) loadPreviewSlots();
  }, [masters]);

  const loadPreviewSlots = async () => {
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const newSlots: Record<number, string[]> = {};
    const newDates: Record<number, 'today' | 'tomorrow'> = {};

    await Promise.all(masters.map(async (m) => {
      try {
        const resToday = await api.getPublicAvailableSlots(today, m.id);
        const availableToday = (resToday.slots || []).filter(s => s.available).map(s => s.time);
        if (availableToday.length > 0) {
          newSlots[m.id] = availableToday.slice(0, 5);
          newDates[m.id] = 'today';
        } else {
          const resTomorrow = await api.getPublicAvailableSlots(tomorrow, m.id);
          const availableTomorrow = (resTomorrow.slots || []).filter(s => s.available).map(s => s.time);
          if (availableTomorrow.length > 0) {
            newSlots[m.id] = availableTomorrow.slice(0, 5);
            newDates[m.id] = 'tomorrow';
          }
        }
      } catch (e) { }
    }));

    setPreviewSlots(newSlots);
    setPreviewDates(newDates);
  };

  useEffect(() => {
    const fetchAvailability = async () => {
      let masterName = '';
      let duration = 60;
      if (currentServiceId) {
        const config = bookingConfigs[currentServiceId];
        if (config?.master) {
          masterName = config.master.full_name || config.master.username;
        }
        const service = selectedServices.find(s => String(s.id) === currentServiceId);
        if (service) duration = parseDuration(service.duration);
      } else {
        if (draftConfig.master) {
          masterName = draftConfig.master.full_name || draftConfig.master.username;
        }
      }

      if (!masterName) {
        masterName = 'any';
      }

      try {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth() + 1;
        const res = await api.getAvailableDates(masterName, year, month, duration);
        if (res.success && res.available_dates) {
          setAvailableDates(new Set(res.available_dates));
        }
      } catch (e) {
        console.error("Error loading availability", e);
      }
    };

    fetchAvailability();
  }, [currentMonth, currentServiceId, draftConfig.master, bookingConfigs]);

  useEffect(() => {
    const checkMasters = async () => {
      const date = currentServiceId ? bookingConfigs[currentServiceId]?.date : draftConfig.date;
      if (!date) {
        setMastersAvailability({});
        return;
      }

      try {
        const res = await api.getAllMastersAvailability(date);
        if (res.success && res.availability) {
          setMastersAvailability(res.availability);
        }
      } catch (e) {
        console.error("Failed to check masters availability", e);
      }
    };

    checkMasters();
  }, [currentServiceId, bookingConfigs, draftConfig.date]);

  const loadSlots = async () => {
    let dateToCheck = '';
    let masterToCheck = null;
    let duration = 60;

    if (currentServiceId) {
      const config = bookingConfigs[currentServiceId];
      if (!config || !config.date) return;
      dateToCheck = config.date;
      masterToCheck = config.master;
      const service = selectedServices.find(s => String(s.id) === currentServiceId);
      if (service) duration = parseDuration(service.duration);
    } else {
      if (!draftConfig.date) return;
      dateToCheck = draftConfig.date;
      masterToCheck = draftConfig.master;
    }

    try {
      if (masterToCheck) {
        const res = await api.getPublicAvailableSlots(dateToCheck, masterToCheck.id);
        const slots = (res.slots || [])
          .filter(s => s.available)
          .map(s => ({ time: s.time, is_optimal: false }));
        setAvailableSlots(slots);
      } else {
        const candidates = currentServiceId ? capableMasters : masters;
        if (candidates.length === 0) {
          setAvailableSlots([]);
          return;
        }

        const requests = candidates.map(m =>
          api.getPublicAvailableSlots(dateToCheck, m.id)
            .then(r => (r.slots || [])
              .filter(s => s.available)
              .map(s => ({ time: s.time, is_optimal: false }))
            )
            .catch(() => [] as Slot[])
        );

        const results = await Promise.all(requests);
        const allSlots: Slot[] = [];
        const seenTimes = new Set<string>();
        results.flat().forEach(slot => {
          if (!seenTimes.has(slot.time)) {
            seenTimes.add(slot.time);
            allSlots.push(slot);
          }
        });
        setAvailableSlots(allSlots.sort((a, b) => a.time.localeCompare(b.time)));
      }
    } catch (e) {
      console.error("Error loading slots", e);
      setAvailableSlots([]);
    }
  };

  const handleBook = async () => {
    if (selectedServices.length === 0) return;

    const complete = selectedServices.every(s => {
      const c = bookingConfigs[String(s.id)];
      return c && c.master !== undefined && c.date && c.time;
    });

    if (!complete) {
      toast.error(t('completeAllBookings', 'Please complete configuration for all services'));
      return;
    }

    try {
      setLoading(true);
      for (const service of selectedServices) {
        const config = bookingConfigs[String(service.id)];
        if (!config || !config.date || !config.time) continue;

        await api.createBooking({
          instagram_id: user?.username || `web_${user?.id}`,
          service: getServiceName(service),
          master: config.master?.username || 'any_professional',
          date: config.date,
          time: config.time,
          phone: user?.phone,
          name: user?.full_name
        });
      }

      toast.success(t('bookingSuccess', 'Booking created successfully!'));
      if (onSuccess) onSuccess();
      if (onClose) onClose();
    } catch (e) {
      console.error("Booking error", e);
      toast.error(t('bookingError', 'Booking creation error'));
    } finally {
      setLoading(false);
    }
  };

  if (step === 'menu') {
    return (
      <div className="max-w-2xl mx-auto space-y-6 p-4">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-black to-gray-600 bg-clip-text text-transparent">
              {t('bookingTitle', 'Online Booking')}
            </h1>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              {t('bookingSubtitle', 'Select services to continue')}
            </p>
          </div>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
              <X className="w-6 h-6" />
            </Button>
          )}
        </div>

        <div className="grid gap-4">
          <Card
            className="group cursor-pointer border-2 hover:border-black transition-all hover:shadow-xl overflow-hidden"
            onClick={() => updateStep('services')}
          >
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white shadow-lg">
                  <List className="w-7 h-7" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-xl mb-1">{t('selectServices', 'Select Services')}</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedServices.length > 0
                      ? `${selectedServices.length} ${t('selected', 'selected')} • ${selectedServices.reduce((acc, s) => acc + s.price, 0)} ${t('currency', 'AED')}`
                      : t('chooseFromMenu', 'Choose from our menu')}
                  </p>
                </div>
                <ChevronRight className="w-6 h-6 text-muted-foreground group-hover:translate-x-1 transition-transform" />
              </div>
            </CardContent>
          </Card>

          <Card
            className="group cursor-pointer border-2 hover:border-black transition-all hover:shadow-xl overflow-hidden"
            onClick={() => updateStep('professional')}
          >
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white shadow-lg">
                  <User className="w-7 h-7" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-xl mb-1">{t('chooseProfessional', 'Choose Professional')}</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedServices.length === 0 ? t('selectServicesFirst', 'Select services first') : t('configurePerService', 'Configure per service')}
                  </p>
                </div>
                <ChevronRight className="w-6 h-6 text-muted-foreground group-hover:translate-x-1 transition-transform" />
              </div>
            </CardContent>
          </Card>

          <Card
            className="group cursor-pointer border-2 hover:border-black transition-all hover:shadow-xl overflow-hidden"
            onClick={() => updateStep('datetime')}
          >
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-white shadow-lg">
                  <CalendarIcon className="w-7 h-7" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-xl mb-1">{t('selectDateTime', 'Select Date & Time')}</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedServices.length === 0 ? t('selectServicesFirst', 'Select services first') : t('configurePerService', 'Configure per service')}
                  </p>
                </div>
                <ChevronRight className="w-6 h-6 text-muted-foreground group-hover:translate-x-1 transition-transform" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (step === 'professional') {
    const currentService = selectedServices.find(s => String(s.id) === currentServiceId);
    return (
      <div className="max-w-4xl mx-auto p-4 space-y-6 pb-32">
        {renderHeader(
          currentService
            ? `${t('chooseMaster')} for ${getServiceName(currentService)}`
            : t('chooseMaster', 'Choose Professional')
        )}

        <div className="space-y-4">
          {/* Any Professional */}
          <Card
            className={`cursor-pointer transition-all border-2 ${!selectedMaster
              ? 'border-black bg-black/5'
              : 'border-muted hover:border-muted-foreground/50'
              }`}
            onClick={() => {
              if (currentServiceId) {
                setBookingConfigs(prev => ({
                  ...prev,
                  [currentServiceId]: {
                    ...prev[currentServiceId],
                    master: null,
                    date: '',
                    time: ''
                  }
                }));
                updateStep('datetime');
              } else {
                setDraftConfig(prev => ({ ...prev, master: null }));
                updateStep('services');
              }
            }}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
                    <User className="w-7 h-7 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{t('anyProfessional', 'Any Available Professional')}</h3>
                    <p className="text-sm text-muted-foreground">{t('firstAvailable', 'First available master')}</p>
                  </div>
                </div>
                <div
                  className={`w-6 h-6 rounded-full border-2 ${!selectedMaster ? 'border-black bg-black' : 'border-muted-foreground/30'
                    } flex items-center justify-center`}
                >
                  {!selectedMaster && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Masters List */}
          {capableMasters.map(master => {
            const isSelected = selectedMaster?.id === master.id;
            return (
              <Card
                key={master.id}
                className={`cursor-pointer transition-all border-2 ${isSelected
                  ? 'border-black bg-black/5 shadow-lg'
                  : 'border-muted hover:border-muted-foreground/50 hover:shadow-md'
                  }`}
                onClick={() => toggleMaster(master)}
              >
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Avatar className="w-14 h-14 border-2 border-border">
                        <AvatarImage src={master.photo} />
                        <AvatarFallback className="font-bold text-lg">
                          {master.full_name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-bold text-lg">{master.full_name}</h3>
                        <p className="text-sm text-muted-foreground">{master.position}</p>
                      </div>
                    </div>
                    <div
                      className={`w-6 h-6 rounded-full border-2 ${isSelected ? 'border-black bg-black' : 'border-muted-foreground/30'
                        } flex items-center justify-center`}
                    >
                      {isSelected && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
                    </div>
                  </div>

                  {previewSlots[master.id] && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {t('nearestSlots', 'Nearest slots for')} <span className="font-semibold text-foreground">{previewDates[master.id]}</span>:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {previewSlots[master.id].slice(0, 4).map(slot => (
                          <Badge
                            key={slot}
                            variant="secondary"
                            className="cursor-pointer hover:bg-black hover:text-white transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (currentServiceId) {
                                const date =
                                  previewDates[master.id] === 'today'
                                    ? new Date().toISOString().split('T')[0]
                                    : new Date(Date.now() + 86400000).toISOString().split('T')[0];
                                setBookingConfigs(prev => ({
                                  ...prev,
                                  [currentServiceId]: {
                                    ...prev[currentServiceId],
                                    master: master,
                                    date: date,
                                    time: slot
                                  }
                                }));
                                updateStep('datetime');
                              } else {
                                const date =
                                  previewDates[master.id] === 'today'
                                    ? new Date().toISOString().split('T')[0]
                                    : new Date(Date.now() + 86400000).toISOString().split('T')[0];
                                setDraftConfig({
                                  master: master,
                                  date: date,
                                  time: slot
                                });
                                updateStep('services');
                              }
                            }}
                          >
                            {slot}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {renderStickyFooter()}
      </div>
    );
  }

  if (step === 'services') {
    const categories = ['All', ...Array.from(new Set(services.map(s => s.category || t('other', 'Other'))))];

    const filteredServices = services.filter(s => {
      const matchesSearch = String(getServiceName(s)).toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || (s.category || t('other', 'Other')) === selectedCategory;

      let matchesMaster = true;
      if (!currentServiceId && draftConfig.master) {
        if (draftConfig.master.services && draftConfig.master.services.length > 0) {
          matchesMaster = draftConfig.master.services.some(ms => String(ms.id) === String(s.id));
        }
      }

      return matchesSearch && matchesCategory && matchesMaster;
    });

    const groupedServices = filteredServices.reduce((acc, service) => {
      const cat = service.category || t('other', 'Other');
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(service);
      return acc;
    }, {} as Record<string, Service[]>);

    return (
      <div className="max-w-4xl mx-auto p-4 space-y-6 pb-40">
        {renderHeader(t('selectServices', 'Select Services'))}

        {/* Search & Category Tabs */}
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder={t('searchServices', 'Search services...')}
              className="pl-12 h-12 bg-muted/50 border-muted"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
            {categories.map(c => (
              <Button
                key={c}
                onClick={() => setSelectedCategory(c)}
                variant={selectedCategory === c ? 'default' : 'outline'}
                className={`whitespace-nowrap rounded-full ${selectedCategory === c ? 'bg-black text-white hover:bg-black/90' : ''
                  }`}
              >
                {c}
              </Button>
            ))}
          </div>
        </div>

        {/* Services List */}
        <div className="space-y-6">
          {Object.entries(groupedServices).map(([category, categoryServices]) => (
            <div key={category} className="space-y-3">
              {selectedCategory === 'All' && (
                <h3 className="text-xl font-bold">{category}</h3>
              )}
              <div className="space-y-2">
                {categoryServices.map(service => {
                  const isSelected = selectedServices.some(s => String(s.id) === String(service.id));
                  return (
                    <Card
                      key={service.id}
                      className={`cursor-pointer transition-all border-2 ${isSelected
                        ? 'border-black bg-black/5'
                        : 'border-muted hover:border-muted-foreground/50'
                        }`}
                      onClick={e => toggleService(service, e)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <h4 className="font-semibold text-lg mb-1">{getServiceName(service)}</h4>
                            <div className="flex items-center gap-3 text-sm">
                              <span className="text-muted-foreground flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {service.duration || t('defaultDuration', '30 min')}
                              </span>
                              <span className="font-bold text-primary">{service.price} {t('currency', 'AED')}</span>
                            </div>
                          </div>
                          <div
                            className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${isSelected ? 'border-black bg-black' : 'border-muted-foreground/30'
                              }`}
                          >
                            {isSelected && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}

          {filteredServices.length === 0 && (
            <div className="text-center py-16">
              <Search className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
              <p className="text-muted-foreground">{t('noServicesFound', 'No services found')}</p>
            </div>
          )}
        </div>

        {/* Selected Summary */}
        {selectedServices.length > 0 && (
          <div className="fixed bottom-24 left-4 right-4 z-10 max-w-4xl mx-auto">
            <Card className="bg-black/90 backdrop-blur text-white border-white/20">
              <CardContent className="p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-white/60">{t('selected', 'Selected')}</p>
                    <p className="font-bold">{selectedServices.length} {t('servicesCount', 'service(s)')}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-white/60">{t('total', 'Total')}</p>
                    <p className="font-bold text-xl">{getTotalStats().price} {t('currency', 'AED')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {renderStickyFooter()}
      </div>
    );
  }

  if (step === 'datetime') {
    const currentLocale = i18n.language === 'ru' ? ru : i18n.language === 'ar' ? ar : enUS;

    return (
      <div className="max-w-4xl mx-auto p-4 space-y-6 pb-32">
        {renderHeader(t('selectDateTime', 'Select Date & Time'))}

        <div className="space-y-6">
          {/* Calendar */}
          <Card className="overflow-hidden">
            <CardContent className="p-6">
              <style>{`
                .rdp-day_disabled {
                  opacity: 0.3 !important;
                  cursor: not-allowed !important;
                  pointer-events: none !important;
                }
                .available-day {
                  background-color: rgba(0, 0, 0, 0.05);
                  color: black;
                  font-weight: bold;
                  border-radius: 50%;
                }
                .available-day:hover {
                  background-color: rgba(0, 0, 0, 0.1);
                }
                .rdp-day_selected.available-day {
                  background-color: black;
                  color: white;
                }
                .rdp-day_holiday {
                  color: var(--destructive);
                  font-weight: bold;
                }
              `}</style>
              <Calendar
                mode="single"
                month={currentMonth}
                onMonthChange={setCurrentMonth}
                selected={selectedDate ? new Date(selectedDate) : undefined}
                modifiers={{
                  available: date => availableDates.has(format(date, 'yyyy-MM-dd')),
                  holiday: date => holidays.some(h => h.date === format(date, 'yyyy-MM-dd'))
                }}
                modifiersClassNames={{
                  available: 'available-day',
                  holiday: 'holiday'
                }}
                disabled={date => {
                  const dStr = format(date, 'yyyy-MM-dd');
                  const isHoliday = holidays.some(h => h.date === dStr);
                  if (isHoliday) return true;

                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  if (date < today) return true;

                  const dateMonth = date.getMonth();
                  const currentViewMonth = currentMonth.getMonth();
                  const dateYear = date.getFullYear();
                  const currentViewYear = currentMonth.getFullYear();

                  if (dateMonth !== currentViewMonth || dateYear !== currentViewYear) {
                    return false;
                  }

                  if (availableDates.size > 0) {
                    return !availableDates.has(dStr);
                  }

                  return false;
                }}
                onSelect={date => {
                  let dStr = '';
                  if (date) {
                    const d = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
                    dStr = d.toISOString().split('T')[0];
                  }

                  if (currentServiceId) {
                    setBookingConfigs(prev => ({
                      ...prev,
                      [currentServiceId]: {
                        ...prev[currentServiceId],
                        date: dStr,
                        time: ''
                      }
                    }));
                  } else {
                    setDraftConfig(prev => ({
                      ...prev,
                      date: dStr,
                      time: ''
                    }));
                  }
                }}
                className="rounded-md mx-auto"
                locale={currentLocale}
              />
            </CardContent>
          </Card>

          {/* Selected Date */}
          {selectedDate && (
            <div className="text-center">
              <Badge variant="secondary" className="text-base py-2 px-4">
                {new Date(selectedDate).toLocaleDateString(
                  i18n.language === 'ru' ? 'ru-RU' : i18n.language === 'ar' ? 'ar-AE' : 'en-US',
                  { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }
                )}
              </Badge>
            </div>
          )}

          {/* Time Slots */}
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : availableSlots.length === 0 && selectedDate ? (
            <Card>
              <CardContent className="py-16 text-center">
                <Clock className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-muted-foreground">{t('noSlots', 'No available slots for this date')}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {groupSlots(availableSlots).map((group, idx) => (
                <div key={idx}>
                  <h4 className="font-semibold mb-3 text-lg">{group.label}</h4>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                    {group.slots.map(slot => (
                      <Button
                        key={slot.time}
                        variant={selectedTime === slot.time ? 'default' : 'outline'}
                        className={`h-12 ${selectedTime === slot.time
                          ? 'bg-black text-white hover:bg-black/90'
                          : 'hover:border-black'
                          } ${slot.is_optimal ? 'ring-2 ring-pink-300' : ''}`}
                        onClick={() => handleSlotClick(slot.time)}
                      >
                        {slot.time}
                      </Button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {renderStickyFooter()}
      </div>
    );
  }

  if (step === 'confirm') {
    const totalStats = getTotalStats();

    return (
      <div className="max-w-4xl mx-auto p-4 space-y-6 pb-32">
        {renderHeader(t('confirmBookingTitle', 'Confirm Booking'))}

        <div className="space-y-4">
          {/* Summary Card */}
          <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-purple-500/5">
            <CardContent className="p-6">
              <h3 className="font-bold text-xl mb-4">{t('bookingSummary', 'Booking Summary')}</h3>
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <List className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('services', 'Services')}</p>
                    <p className="font-bold">{selectedServices.length}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Clock className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('duration', 'Duration')}</p>
                    <p className="font-bold">{totalStats.durationStr}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('total', 'Total')}</p>
                    <p className="font-bold text-xl">{totalStats.price} {t('currency', 'AED')}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Service Details */}
          {selectedServices.map(service => {
            const config = bookingConfigs[String(service.id)];
            if (!config) return null;

            return (
              <Card key={service.id} className="border-l-4 border-l-primary">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="font-bold text-lg">{getServiceName(service)}</h4>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {service.duration || '30 min'}
                        </span>
                        <span className="font-semibold text-foreground">{service.price} AED</span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setCurrentServiceId(String(service.id));
                        updateStep('professional');
                      }}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4 pt-4 border-t">
                    <div className="flex items-center gap-3">
                      {config.master?.photo ? (
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={config.master.photo} />
                          <AvatarFallback>{config.master.full_name[0]}</AvatarFallback>
                        </Avatar>
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                          <User className="w-5 h-5 text-muted-foreground" />
                        </div>
                      )}
                      <div>
                        <p className="text-xs text-muted-foreground">{t('master', 'Master')}</p>
                        <p className="font-semibold">{config.master?.full_name || t('anyProfessional', 'Any Professional')}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                        <CalendarIcon className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">{t('dateTime', 'Date & Time')}</p>
                        <p className="font-semibold">
                          {config.date ? format(new Date(config.date), 'd MMM') : '-'} {t('at', 'at')} {config.time || '-'}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Confirm Button */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur border-t shadow-lg z-20">
          <div className="max-w-4xl mx-auto">
            <Button
              onClick={handleBook}
              disabled={loading}
              className="w-full h-14 text-lg bg-black text-white hover:bg-black/90 shadow-xl"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5 mr-2" />
                  {t('confirmBooking', 'Confirm & Book')}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
