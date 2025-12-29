import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { AnimatePresence, motion } from 'motion/react';
import {
  X, User, Calendar as CalendarIcon, ChevronRight, ChevronLeft,
  Search, Clock, CheckCircle2, Star, Phone, List, Loader2, Scissors,
  Check, Sparkles, ArrowLeft, Trash2
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { ScrollArea } from '../../components/ui/scroll-area';
import { Avatar, AvatarImage, AvatarFallback } from '../../components/ui/avatar';
import { Dialog, DialogContent, DialogTitle } from '../../components/ui/dialog';
import { Calendar } from '../../components/ui/calendar';
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

function BookingMenu({ bookingState, onNavigate, onReset, totalPrice, salonSettings }: any) {
  const { t, i18n } = useTranslation(['booking', 'common']);
  const dateLocale = getDateLocaleCentral(i18n.language);

  const isServicesComplete = bookingState.services.length > 0;
  const isProfessionalComplete = bookingState.professional !== null || bookingState.professionalSelected;
  const isDateTimeComplete = bookingState.date !== null && bookingState.time !== null;
  const isAllComplete = isServicesComplete && isProfessionalComplete && isDateTimeComplete;

  const totalDuration = bookingState.services.reduce((sum: number, s: Service) => sum + parseInt(s.duration || '0'), 0);

  const cards = [
    {
      id: 'services',
      icon: Scissors,
      title: t('booking.menu.services', 'Select Services'),
      description: isServicesComplete
        ? `${bookingState.services.length} ${t('booking.menu.selected', 'selected')}`
        : t('booking.menu.selectServices', "Pick treatment"),
      isComplete: isServicesComplete,
      gradientClass: 'bg-gradient-purple-pink',
    },
    {
      id: 'professional',
      icon: User,
      title: t('booking.menu.professional', 'Professional'),
      description: bookingState.professional
        ? bookingState.professional.full_name
        : (bookingState.professionalSelected ? t('booking.professional.anyAvailable', "Any Available") : t('booking.menu.selectProfessional', "Select master")),
      isComplete: isProfessionalComplete,
      gradientClass: 'bg-gradient-pink-rose',
    },
    {
      id: 'datetime',
      icon: CalendarIcon,
      title: t('booking.menu.datetime', 'Date & Time'),
      description: isDateTimeComplete
        ? `${format(bookingState.date!, 'MMM dd', { locale: dateLocale })} @ ${bookingState.time}`
        : t('booking.menu.selectDateTime', "Pick time slot"),
      isComplete: isDateTimeComplete,
      gradientClass: 'bg-gradient-rose-orange',
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="modern-card p-6 flex flex-col sm:flex-row items-center gap-6"
      >
        <div className="w-16 h-16 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600">
          <Sparkles className="w-8 h-8" />
        </div>
        <div className="flex-1 text-center sm:text-left">
          <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">
            {salonSettings?.name || t('salon.name', 'Studio')}
          </h2>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">
            {salonSettings?.address || t('salon.address', 'Address')}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onReset}
          className="text-slate-400 hover:text-red-500 font-black gap-2 uppercase tracking-widest text-[9px]"
        >
          <Trash2 className="w-3 h-3" />
          {t('booking.menu.reset', 'Clear')}
        </Button>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {cards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1, type: "spring", bounce: 0.2 }}
            >
              <div className="booking-step-card" onClick={() => onNavigate(card.id)}>
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-3 rounded-xl ${card.gradientClass} text-white`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    {card.isComplete && (
                      <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white shadow-sm">
                        <Check className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                  <h3 className="font-black text-lg text-slate-900 uppercase tracking-tighter">{card.title}</h3>
                  <p className="text-slate-400 font-bold text-xs mb-6">{card.description}</p>
                  <div className="flex items-center justify-between">
                    <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${card.isComplete ? 'bg-green-100 text-green-600' : 'bg-slate-50 text-slate-400'
                      }`}>
                      {card.isComplete ? t('booking.menu.completed', 'DONE') : t('common.select', 'PICK')}
                    </span>
                    <ChevronRight className="w-5 h-5 text-slate-200" />
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {isServicesComplete && (
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          className="modern-card p-10 mt-12"
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-10">
            <div className="flex-1 space-y-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center">
                  <List className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">
                  {t('booking.confirm.summary', 'Session Summary')}
                </h3>
              </div>

              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-4 no-scrollbar">
                {bookingState.services.map((service: Service) => (
                  <div key={service.id} className="flex justify-between items-center bg-slate-50/50 p-4 rounded-2xl hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-2 h-2 rounded-full bg-purple-500" />
                      <span className="font-black text-slate-700 uppercase tracking-tight">{getLocalizedName(service, i18n.language)}</span>
                    </div>
                    <div className="flex items-center gap-8">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{service.duration} {t('booking.min', 'min')}</span>
                      <span className="font-black text-xl text-slate-900">{service.price} <span className="text-xs text-slate-400 uppercase">{salonSettings?.currency || 'AED'}</span></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:w-[320px] bg-slate-50 rounded-[2rem] p-8 space-y-8 flex flex-col justify-between">
              <div className="space-y-2">
                <p className="text-slate-400 font-black uppercase text-[10px] tracking-[0.2em]">{t('booking.services.total', 'Total Investment')}</p>
                <p className="text-5xl font-black text-slate-900 tracking-tighter">
                  {totalPrice}
                  <span className="text-lg text-slate-400 ml-2 font-bold">{salonSettings?.currency || 'AED'}</span>
                </p>
                <div className="h-1 w-12 bg-purple-600 rounded-full mt-4" />
              </div>

              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('booking.duration', 'Total Time')}</p>
                <p className="text-sm font-bold text-purple-600">{totalDuration} {t('booking.min', 'min')}</p>
              </div>

              {isAllComplete ? (
                <Button
                  onClick={() => onNavigate('confirm')}
                  className="w-full h-16 btn-primary-gradient text-lg uppercase tracking-widest shadow-2xl"
                >
                  {t('booking.services.continue', 'FINAL STEP')}
                  <CheckCircle2 className="w-6 h-6 ml-2" />
                </Button>
              ) : (
                <p className="text-[10px] font-black text-purple-600 uppercase tracking-widest animate-pulse">
                  {t('booking.menu.completeRequired', 'Select Master & Date to Proceed')}
                </p>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}



function ServicesStep({ selectedServices, bookingState, onServicesChange, onContinue, onCancel, salonSettings }: any) {
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
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
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

  const totalPrice = selectedServices.reduce((sum: number, s: any) => sum + s.price, 0);

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-32 gap-6">
      <div className="w-16 h-16 border-8 border-purple-600 border-t-transparent rounded-full animate-spin" />
      <p className="font-black text-slate-400 uppercase tracking-widest text-[10px] animate-pulse">{t('booking.loading', 'Syncing services catalog...')}</p>
    </div>
  );

  return (
    <div className="space-y-10 animate-fade-in pb-48">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="modern-card p-6 border-slate-100"
      >
        <div className="flex flex-col md:flex-row gap-6 items-center">
          <Button variant="ghost" size="icon" onClick={() => onCancel()} className="rounded-xl hover:bg-slate-50 w-10 h-10 border border-slate-100 flex items-center justify-center shrink-0">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Button>

          <div className="relative flex-1 w-full sm:w-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
            <Input
              placeholder={t('booking.services.search', 'Search...')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-12 rounded-xl bg-slate-50 border-none font-bold placeholder:text-slate-300"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 w-full sm:w-auto">
            {categories.map((cat) => (
              <Badge
                key={cat}
                variant={selectedCategory === cat ? 'default' : 'secondary'}
                className={`h-10 px-4 rounded-xl cursor-pointer text-[10px] font-black uppercase tracking-wider transition-all shrink-0 ${selectedCategory === cat ? 'bg-purple-600 text-white' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                  }`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat === 'All' ? t('booking.services.allCategories', 'ALL') : cat}
              </Badge>
            ))}
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {filteredServices.map((service, idx) => {
            const isSelected = selectedServices.some((s: any) => s.id === service.id);
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
                  className={`modern-card cursor-pointer group ${isSelected ? 'border-purple-600 bg-purple-50/20' : ''}`}
                  onClick={() => toggleService(service)}
                >
                  <CardContent className="p-5">
                    <div className="flex flex-col space-y-4">
                      <div className="flex justify-between items-start">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isSelected ? 'bg-purple-600 text-white shadow-sm' : 'bg-slate-50 text-slate-300'
                          }`}>
                          <Sparkles className="w-5 h-5" />
                        </div>
                        <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-purple-600 border-purple-600' : 'border-slate-100'
                          }`}>
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </div>
                      </div>

                      <div>
                        <h3 className="font-black text-base text-slate-900 uppercase tracking-tight leading-tight mb-1">
                          {getLocalizedName(service, i18n.language)}
                        </h3>
                        <p className="text-[10px] font-medium text-slate-400 line-clamp-2">
                          {service.description || t('booking.services.description', 'Professional treatment')}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-purple-400" />
                          <span className="text-[10px] font-black text-purple-600 uppercase">
                            {service.duration} {t('booking.min', 'min')}
                          </span>
                        </div>
                        <div className="text-lg font-black text-slate-900 uppercase">
                          {service.price} <span className="text-[9px] text-slate-400 font-bold">{salonSettings?.currency || 'AED'}</span>
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
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          className="booking-footer-bar"
        >
          <div className="footer-action-container container-blur">
            <div className="flex items-center gap-10">
              <div className="hidden lg:flex flex-col">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{t('booking.services.selected', 'Ready for step')}</span>
                <span className="text-lg font-black text-slate-900 uppercase tracking-tighter">
                  {selectedServices.length} {t('booking.menu.selected', 'Items')}
                </span>
              </div>

              <div className="h-10 w-[1px] bg-slate-100 hidden lg:block" />

              <div className="flex items-center gap-2">
                <Button onClick={() => onContinue('professional')} variant="ghost" className={`footer-step-btn ${bookingState.professionalSelected ? 'active' : ''}`}>
                  <User className="w-5 h-5" />
                  <span className="hidden sm:block">PROVIDERS</span>
                </Button>
                <Button onClick={() => onContinue('datetime')} variant="ghost" className={`footer-step-btn ${bookingState.date && bookingState.time ? 'active' : ''}`}>
                  <CalendarIcon className="w-5 h-5" />
                  <span className="hidden sm:block">AVAILABILITY</span>
                </Button>
              </div>
            </div>

            <Button
              onClick={() => onContinue()}
              className="btn-primary-gradient h-16 min-w-[240px] text-lg px-10"
            >
              {(bookingState.professionalSelected && bookingState.date && bookingState.time)
                ? t('booking.confirm.title', 'FINALIZE SESSION')
                : t('common.next', 'ADVANCE')}
              <ChevronRight className="w-6 h-6 ml-2" />
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}



function ProfessionalStep({ selectedProfessional, professionalSelected, bookingState, onProfessionalChange, onContinue }: any) {
  const { t } = useTranslation(['booking', 'common']);
  const [masters, setMasters] = useState<Master[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadMasters = async () => {
      try {
        const usersRes = await api.getUsers();
        const users = Array.isArray(usersRes) ? usersRes : (usersRes.users || []);
        setMasters(users.filter((u: any) => u.role === 'employee' || u.is_service_provider));
      } catch (e) {
      } finally {
        setLoading(false);
      }
    };
    loadMasters();
  }, []);

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-32 gap-6">
      <div className="w-16 h-16 border-8 border-purple-600 border-t-transparent rounded-full animate-spin" />
      <p className="font-black text-slate-400 uppercase tracking-widest text-[10px] animate-pulse">{t('booking.loading', 'Curating masters list...')}</p>
    </div>
  );

  return (
    <div className="space-y-10 animate-fade-in pb-48">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-[2.5rem] shadow-2xl p-10 border border-slate-50 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-50 rounded-full -mr-32 -mt-32 blur-3xl opacity-50" />
        <div className="relative z-10">
          <h2 className="text-4xl font-black text-slate-900 mb-2 tracking-tighter uppercase">{t('booking.professional.title', 'Masters')}</h2>
          <p className="text-purple-600 font-bold text-sm">{t('booking.professional.subtitle', 'Select your preferred professional')}</p>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Card
            className={`modern-card cursor-pointer group ${selectedProfessional === null && professionalSelected ? 'border-purple-600 bg-purple-50/30' : ''}`}
            onClick={() => onProfessionalChange(null)}
          >
            <CardContent className="p-6">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-20 h-20 rounded-2xl bg-gradient-purple-pink flex items-center justify-center text-3xl shadow-sm">
                  ✨
                </div>
                <div>
                  <h3 className="font-black text-xl text-slate-900 uppercase tracking-tighter mb-1">
                    {t('booking.professional.anyAvailable', 'LUCKY STRIKE')}
                  </h3>
                  <p className="text-[10px] font-bold text-slate-400 px-4 leading-normal">
                    {t('booking.professional.firstAvailable', 'Our first available world-class master will handle your session.')}
                  </p>
                </div>
                <Button
                  variant="outline"
                  className={`btn-select-subtle ${selectedProfessional === null && professionalSelected ? 'selected' : ''}`}
                >
                  {selectedProfessional === null && professionalSelected ? 'SELECTED' : 'SELECT FLEXIBLE'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {masters.map((master, idx) => {
          const isSelected = selectedProfessional?.id === master.id;
          return (
            <motion.div
              key={master.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: (idx + 1) * 0.05 }}
            >
              <Card
                className={`modern-card cursor-pointer group ${isSelected ? 'border-purple-600 bg-purple-50/30' : ''}`}
                onClick={() => onProfessionalChange(master)}
              >
                <CardContent className="p-6">
                  <div className="flex flex-col space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="relative">
                        <div className="w-20 h-20 rounded-2xl overflow-hidden ring-4 ring-slate-50 transition-all">
                          <Avatar className="w-full h-full rounded-none">
                            <AvatarImage src={master.photo} className="object-cover" />
                            <AvatarFallback className="bg-slate-100 text-slate-400 font-black text-2xl">
                              {master.full_name[0]}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                        {isSelected && (
                          <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-lg border-2 border-white flex items-center justify-center">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col items-end">
                        <div className="flex items-center gap-1">
                          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                          <span className="font-black text-xs text-slate-700">{master.rating || '5.0'}</span>
                        </div>
                        <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest mt-1">
                          {master.reviews || Math.floor(Math.random() * 50) + 20} REVIEWS
                        </span>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-black text-lg text-slate-900 uppercase tracking-tighter mb-0.5 leading-none">{master.full_name}</h3>
                      <p className="text-[9px] font-black text-purple-600 uppercase tracking-[0.1em]">
                        {master.position || 'MASTER SPECIALIST'}
                      </p>
                    </div>

                    <Button
                      variant="outline"
                      className={`btn-select-subtle ${isSelected ? 'selected' : ''}`}
                    >
                      {isSelected ? 'SELECTED' : 'SELECT MASTER'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {(selectedProfessional !== null || professionalSelected) && (
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          className="booking-footer-bar"
        >
          <div className="footer-action-container container-blur">
            <div className="flex items-center gap-10">
              <div className="hidden lg:flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl overflow-hidden ring-4 ring-slate-50">
                  {selectedProfessional ? (
                    <img src={selectedProfessional.photo} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-purple-pink flex items-center justify-center">
                      <Sparkles className="w-6 h-6 text-white" />
                    </div>
                  )}
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{t('booking.menu.professional', 'MASTER SELECTED')}</span>
                  <span className="text-lg font-black text-slate-900 uppercase tracking-tighter">
                    {selectedProfessional ? selectedProfessional.full_name : 'LUCKY STRIKE'}
                  </span>
                </div>
              </div>

              <div className="h-10 w-[1px] bg-slate-100 hidden lg:block" />

              <div className="flex items-center gap-2">
                <Button onClick={() => onContinue('services')} variant="ghost" className={`footer-step-btn ${bookingState.services.length > 0 ? 'active' : ''}`}>
                  <Scissors className="w-5 h-5" />
                  <span className="hidden sm:block">EDIT SERVICES</span>
                </Button>
                <Button onClick={() => onContinue('datetime')} variant="ghost" className={`footer-step-btn ${bookingState.date && bookingState.time ? 'active' : ''}`}>
                  <CalendarIcon className="w-5 h-5" />
                  <span className="hidden sm:block">SET SCHEDULE</span>
                </Button>
              </div>
            </div>

            <Button
              onClick={() => onContinue()}
              className="btn-primary-gradient h-16 min-w-[240px] text-lg px-10"
            >
              {(bookingState.services.length > 0 && bookingState.date && bookingState.time)
                ? t('booking.confirm.title', 'VERIFY SESSION')
                : t('common.next', 'ADVANCE')}
              <ChevronRight className="w-6 h-6 ml-2" />
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}



function DateTimeStep({ selectedDate, selectedTime, selectedMaster, selectedServices, bookingState, onDateTimeChange, onContinue }: any) {
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

  const groupedSlots = {
    morning: availableSlots.filter(s => s.period === 'morning'),
    afternoon: availableSlots.filter(s => s.period === 'afternoon'),
    evening: availableSlots.filter(s => s.period === 'evening'),
  };

  return (
    <div className="space-y-10 animate-fade-in pb-48">
      {/* Header Panel */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="modern-card p-6"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => onContinue('professional')} className="rounded-xl hover:bg-slate-50 w-10 h-10 border border-slate-100 flex items-center justify-center">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </Button>
            <div>
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter leading-none mb-1">{t('booking.datetime.title', 'Shedule')}</h2>
              <p className="text-purple-600 font-bold text-[10px] uppercase tracking-widest flex items-center gap-2">
                <Clock className="w-3.5 h-3.5" />
                {duration} {t('booking.min', 'min session')}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="modern-card p-4"
        >
          <div className="bg-purple-50 p-4 rounded-xl mb-4 text-center">
            <h3 className="text-purple-600 font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2">
              <CalendarIcon className="w-4 h-4" />
              {t('booking.datetime.date', 'Select Date')}
            </h3>
          </div>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => date && onDateTimeChange(date, null)}
            onMonthChange={setCurrentMonth}
            locale={dateLocale}
            modifiers={{
              available: (date) => availableDates.has(format(date, 'yyyy-MM-dd'))
            }}
            modifiersClassNames={{
              available: "day-available"
            }}
            disabled={(date) => {
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const dateStr = format(date, 'yyyy-MM-dd');
              return date < today || !availableDates.has(dateStr);
            }}
            className="p-6"
            classNames={{
              day_selected: "rdp-day_selected",
              day_today: "rdp-day_today",
            }}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="modern-card border-slate-50 overflow-hidden flex flex-col min-h-[400px]"
        >
          <div className="bg-slate-50 p-6 border-b border-slate-100">
            <h3 className="text-slate-400 font-black uppercase tracking-widest flex items-center gap-3 text-xs">
              <Sparkles className="w-4 h-4" />
              {t('booking.datetime.time', 'Available Slots')}
            </h3>
          </div>

          <div className="flex-1 p-6 flex flex-col">
            {!selectedDate ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-100 gap-8">
                <div className="w-24 h-24 rounded-3xl bg-slate-50 flex items-center justify-center">
                  <CalendarIcon className="w-12 h-12" />
                </div>
                <p className="font-black text-center text-xs uppercase tracking-[0.3em]">{t('booking.datetime.dateFirst', 'Select a date')}</p>
              </div>
            ) : loading ? (
              <div className="flex-1 flex flex-col items-center justify-center text-purple-600 gap-8">
                <div className="w-20 h-20 border-8 border-purple-500 border-t-transparent rounded-full animate-spin" />
                <p className="font-black uppercase tracking-[0.3em] text-[10px]">{t('booking.loading', 'Syncing slots...')}</p>
              </div>
            ) : availableSlots.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-100 gap-8">
                <div className="w-24 h-24 rounded-3xl bg-slate-50 flex items-center justify-center">
                  <Sparkles className="w-12 h-12" />
                </div>
                <p className="font-black text-center text-xs uppercase tracking-[0.3em]">{t('booking.datetime.noSlots', 'Fully Booked')}</p>
              </div>
            ) : (
              <ScrollArea className="flex-1 -mr-4 pr-4">
                <div className="space-y-12 pb-10">
                  {(['morning', 'afternoon', 'evening'] as const).map(period => {
                    const slots = groupedSlots[period];
                    if (slots.length === 0) return null;
                    return (
                      <div key={period} className="space-y-8">
                        <div className="flex items-center gap-6">
                          <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em]">{t(`booking.datetime.${period}`, period)}</span>
                          <div className="flex-1 h-[1px] bg-slate-100" />
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {slots.map(slot => (
                            <button
                              key={slot.time}
                              onClick={() => onDateTimeChange(selectedDate, slot.time)}
                              className={`slot-modern-btn ${selectedTime === slot.time ? 'active' : ''}`}
                            >
                              {slot.time}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </div>
        </motion.div>
      </div>

      {selectedDate && selectedTime && (
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          className="booking-footer-bar"
        >
          <div className="footer-action-container container-blur">
            <div className="flex items-center gap-10">
              <div className="hidden lg:block border-r border-slate-100 pr-10">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
                    <CalendarIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-black text-slate-900 text-lg leading-none mb-1 uppercase tracking-tighter">
                      {format(selectedDate, 'MMM dd', { locale: dateLocale })}
                    </p>
                    <p className="text-purple-500 font-bold text-xs uppercase tracking-widest">
                      {selectedTime}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button onClick={() => onContinue('services')} variant="ghost" className={`footer-step-btn ${bookingState.services.length > 0 ? 'active' : ''}`}>
                  <Scissors className="w-5 h-5" />
                  <span className="hidden sm:block">{t('booking.menu.services', 'SERVICES')}</span>
                </Button>
                <Button onClick={() => onContinue('professional')} variant="ghost" className={`footer-step-btn ${bookingState.professionalSelected ? 'active' : ''}`}>
                  <User className="w-5 h-5" />
                  <span className="hidden sm:block">{t('booking.menu.professional', 'MASTER')}</span>
                </Button>
              </div>
            </div>

            <Button onClick={() => onContinue()} className="btn-primary-gradient h-16 min-w-[240px] shadow-2xl text-lg px-10 group">
              {(bookingState.services.length > 0 && bookingState.professionalSelected)
                ? t('booking.confirm.title', 'VERIFY SESSION')
                : t('common.next', 'NEXT PHASE')}
              <ChevronRight className="w-6 h-6 ml-2 transition-transform group-hover:translate-x-1" />
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function ConfirmStep({ bookingState, totalPrice, onPhoneChange, onSuccess, salonSettings, onCancel }: any) {
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
    } catch (e: any) {
      toast.error(t('booking.confirm.error', 'Error creating booking'));
    } finally { setLoading(false); }
  };

  const dateLocale = getDateLocaleCentral(i18n.language);

  return (
    <div className="space-y-10 animate-fade-in pb-48">
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="modern-card p-6"
      >
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => onCancel()} className="rounded-xl hover:bg-slate-50 w-10 h-10 border border-slate-100 flex items-center justify-center">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Button>
          <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">{t('booking.confirm.title', 'Verification')}</h2>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-10">
          <Card className="modern-card border-slate-50">
            <div className="bg-slate-50 p-6 border-b border-slate-100">
              <h3 className="text-slate-400 font-black uppercase tracking-widest flex items-center gap-4 text-xs">
                <Scissors className="w-5 h-5" />
                {t('booking.menu.services', 'Selected Services')}
              </h3>
            </div>
            <CardContent className="p-8 space-y-8">
              {bookingState.services.map((service: any) => (
                <div key={service.id} className="flex justify-between items-center group">
                  <div className="flex items-center gap-6">
                    <div className="w-14 h-14 rounded-2xl bg-purple-50/50 flex items-center justify-center text-purple-600 transition-all group-hover:bg-purple-600 group-hover:text-white">
                      <Sparkles className="w-7 h-7" />
                    </div>
                    <div>
                      <div className="font-black text-2xl text-slate-900">{getLocalizedName(service, i18n.language)}</div>
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{service.duration || '30'} {t('booking.min', 'min')}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-black text-2xl text-slate-900 leading-none mb-1">{service.price}</div>
                    <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{salonSettings?.currency || 'AED'}</div>
                  </div>
                </div>
              ))}

              <div className="pt-10 border-t-2 border-dashed border-slate-50 flex justify-between items-center">
                <span className="font-black text-slate-400 uppercase tracking-[0.2em] text-[10px]">{t('booking.services.total', 'Total Investment')}</span>
                <div className="text-right">
                  <span className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 tracking-tighter">
                    {totalPrice}
                  </span>
                  <span className="text-sm text-slate-400 font-black ml-2">{salonSettings?.currency || 'AED'}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-10">
          <Card className="modern-card border-slate-50">
            <div className="bg-slate-50 p-6 border-b border-slate-100">
              <h3 className="text-slate-400 font-black uppercase tracking-widest flex items-center gap-4 text-xs">
                <CheckCircle2 className="w-4 h-4" />
                {t('booking.confirm.details', 'Summary')}
              </h3>
            </div>
            <CardContent className="p-8 space-y-8">
              <div className="flex items-center gap-6">
                <div className="w-14 h-14 rounded-2xl bg-orange-50/50 flex items-center justify-center text-orange-600 shadow-inner">
                  <User className="w-7 h-7" />
                </div>
                <div>
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('booking.menu.professional', 'Expert')}</div>
                  <div className="font-black text-xl text-slate-900 leading-tight">
                    {bookingState.professional ? bookingState.professional.full_name : (bookingState.professionalSelected ? t('booking.professional.anyAvailable', "Elite Specialist") : t('booking.menu.selectProfessional', "Not Assigned"))}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="w-14 h-14 rounded-2xl bg-blue-50/50 flex items-center justify-center text-blue-600 shadow-inner">
                  <CalendarIcon className="w-7 h-7" />
                </div>
                <div>
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('booking.menu.datetime', 'Agenda')}</div>
                  <div className="font-black text-xl text-slate-900 leading-tight">
                    {bookingState.date ? format(bookingState.date, 'EEEE, MMM dd', { locale: dateLocale }) : '--'}
                    <span className="text-purple-600 block sm:inline sm:ml-3">@ {bookingState.time || '--'}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="w-14 h-14 rounded-2xl bg-green-50/50 flex items-center justify-center text-green-600 shadow-inner">
                  <Phone className="w-7 h-7" />
                </div>
                <div className="flex-1">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('booking.confirm.phone', 'Contact')}</div>
                  <div className="flex items-center justify-between">
                    <span className="font-black text-xl text-slate-900 tracking-wider">{phone || '--'}</span>
                    <Button variant="ghost" size="sm" onClick={() => setShowPhoneModal(true)} className="text-purple-600 font-black h-auto p-0 hover:bg-transparent hover:text-purple-800 underline underline-offset-4 decoration-2">
                      {t('common.edit', 'EDIT')}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="pt-6">
                <Button
                  onClick={handleConfirm}
                  disabled={loading || !phone}
                  className="w-full h-20 btn-primary-gradient shadow-2xl rounded-2xl text-xl uppercase tracking-widest font-black group overflow-hidden relative"
                >
                  <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                  <div className="relative z-10 flex items-center justify-center gap-3">
                    {loading ? (
                      <Loader2 className="w-8 h-8 animate-spin" />
                    ) : (
                      <>
                        <Sparkles className="w-6 h-6" />
                        {t('booking.confirm.bookNow', 'GET SESSION')}
                        <ChevronRight className="w-6 h-6 transition-transform group-hover:translate-x-1" />
                      </>
                    )}
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={showPhoneModal} onOpenChange={setShowPhoneModal}>
        <DialogContent className="p-0 border-none shadow-[0_35px_100px_-15px_rgba(0,0,0,0.3)] rounded-[3rem] overflow-hidden max-w-[440px]">
          <div className="bg-gradient-purple-pink p-12 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full bg-black/5" />
            <div className="w-24 h-24 rounded-[2rem] bg-white/20 flex items-center justify-center mb-8 mx-auto backdrop-blur-xl shadow-2xl relative z-10 border border-white/30 transform -rotate-6">
              <Phone className="w-10 h-10 text-white" />
            </div>
            <DialogTitle className="text-3xl font-black text-white tracking-tight relative z-10 mb-2">{t('booking.confirm.phone', 'Profile Contact')}</DialogTitle>
            <p className="text-white/70 font-bold text-sm leading-relaxed relative z-10">{t('phone_modal_desc', 'Enter your number for session updates and notifications.')}</p>
          </div>

          <div className="p-12 space-y-10 flex flex-col items-center bg-white">
            <div className="w-full relative group">
              <Input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+971"
                className="h-20 text-3xl font-black text-center bg-slate-50 border-none focus-visible:ring-8 focus-visible:ring-purple-50 rounded-[1.5rem] shadow-inner tracking-widest placeholder:text-slate-200"
              />
            </div>

            <div className="flex gap-6 w-full">
              <Button variant="ghost" onClick={() => setShowPhoneModal(false)} className="flex-1 h-16 rounded-2xl font-black text-slate-400 hover:bg-slate-50 transition-all uppercase tracking-widest text-xs">
                {t('common.cancel', 'LATER')}
              </Button>
              <Button onClick={handlePhoneSubmit} className="flex-1 h-16 rounded-2xl btn-primary-gradient shadow-2xl text-white font-black uppercase tracking-widest text-xs">
                {t('common.save', 'VERIFY')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}


export function UserBookingWizard({ onClose, onSuccess }: Props) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const step = searchParams.get('step') || 'menu';
  const { t } = useTranslation(['booking', 'common']);

  const [bookingState, setBookingState] = useState<BookingState>(() => {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const { state, timestamp } = JSON.parse(saved);
        if (Date.now() - timestamp < STATE_EXPIRY_TIME) {
          if (state.date) state.date = parseISO(state.date);
          return state;
        }
      } catch (e) { }
    }
    return {
      services: [],
      professional: null,
      professionalSelected: false,
      date: null,
      time: null,
      phone: '',
    };
  });

  const [salonSettings, setSalonSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const setStep = (newStep: string) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('step', newStep);
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
        const salonRes = await api.getPublicSalonSettings();
        setSalonSettings(salonRes);
      } catch (e) { } finally { setLoading(false); }
    };
    init();
  }, []);

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
      state: { ...bookingState, date: bookingState.date ? format(bookingState.date, 'yyyy-MM-dd') : null },
      timestamp: Date.now()
    }));
  }, [bookingState]);

  const updateState = (updates: Partial<BookingState>) => setBookingState((prev: BookingState) => ({ ...prev, ...updates }));
  const totalPrice = bookingState.services.reduce((sum: number, s: Service) => sum + s.price, 0);

  if (loading) return (
    <div className="fixed inset-0 bg-white z-[60] flex flex-col items-center justify-center gap-6">
      <div className="w-20 h-20 border-8 border-purple-600 border-t-transparent rounded-full animate-spin" />
      <p className="text-slate-400 font-black uppercase tracking-[0.3em] text-xs animate-pulse">Initializing Studio</p>
    </div>
  );

  return (
    <div className="wizard-scrollable selection:bg-purple-100 selection:text-purple-600 bg-slate-50/50">
      <header className="wizard-nav-header backdrop-blur-xl bg-white/80 border-b border-slate-100/50">
        <div className="wizard-nav-content">
          <div className="flex items-center gap-6">
            <button
              onClick={goBack}
              className="wizard-nav-back group hover:bg-slate-50 p-2 rounded-2xl transition-all"
            >
              <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center group-hover:bg-white shadow-sm transition-all">
                <ChevronLeft className="w-6 h-6 transition-transform group-hover:-translate-x-1" />
              </div>
              <span className="font-black uppercase tracking-widest text-[10px] hidden sm:block">{t('common.back', 'Return')}</span>
            </button>
            <div className="h-10 w-[1px] bg-slate-100 hidden sm:block" />
            <div>
              <h1 className="wizard-title-main text-2xl">
                {t('booking.newBooking', 'Reservation')}
              </h1>
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{salonSettings?.name || 'Beauty HQ'}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="scale-90 no-double-border">
              <div className="wizard-lang-switcher hover:shadow-lg transition-all rounded-xl">
                <PublicLanguageSwitcher />
              </div>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-500 hover:rotate-90 transition-all duration-300 shadow-sm"
              >
                <X className="w-6 h-6" />
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-5xl mx-auto px-6 py-12">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, scale: 0.98, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -20 }}
            transition={{ type: "spring", duration: 0.6, bounce: 0.2 }}
          >
            {step === 'menu' && (
              <BookingMenu
                bookingState={bookingState}
                onNavigate={setStep}
                onReset={() => {
                  const emptyState = {
                    services: [],
                    professional: null,
                    professionalSelected: false,
                    date: null,
                    time: null,
                    phone: ''
                  };
                  setBookingState(emptyState);
                  sessionStorage.removeItem(STORAGE_KEY);
                  toast.success(t('booking.menu.resetDone', 'Booking cleared'));
                }}
                totalPrice={totalPrice}
                salonSettings={salonSettings}
              />
            )}
            {step === 'services' && (
              <ServicesStep
                selectedServices={bookingState.services}
                bookingState={bookingState}
                onServicesChange={(services: any) => updateState({ services })}
                onContinue={(target?: string) => setStep(target || 'menu')}
                onCancel={() => setStep('menu')}
                salonSettings={salonSettings}
              />
            )}
            {step === 'professional' && (
              <ProfessionalStep
                selectedProfessional={bookingState.professional}
                professionalSelected={bookingState.professionalSelected}
                bookingState={bookingState}
                onProfessionalChange={(prof: any) => updateState({ professional: prof, professionalSelected: true })}
                onContinue={(target?: string) => setStep(target || 'menu')}
              />
            )}
            {step === 'datetime' && (
              <DateTimeStep
                selectedDate={bookingState.date}
                selectedTime={bookingState.time}
                selectedMaster={bookingState.professional}
                selectedServices={bookingState.services}
                bookingState={bookingState}
                onDateTimeChange={(date: any, time: any) => updateState({ date, time })}
                onContinue={(target?: string) => setStep(target || 'confirm')}
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
                onCancel={() => setStep('menu')}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <Toaster position="top-center" richColors />
    </div>
  );
}