import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { AnimatePresence, motion } from 'motion/react';
import { X, Scissors, User, Calendar as CalendarIcon } from 'lucide-react';
import { Toaster } from '../../components/ui/sonner';
import { api } from '../../../src/services/api';
import PublicLanguageSwitcher from '../../../src/components/PublicLanguageSwitcher';
import { useTranslation } from 'react-i18next';

// New Synced Components
import { BookingMenu } from './booking/BookingMenu';
import { ServicesStep } from './booking/ServicesStep';
import { ProfessionalStep } from './booking/ProfessionalStep';
import { DateTimeStep } from './booking/DateTimeStep';
import { ConfirmStep } from './booking/ConfirmStep';

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

import { Button } from './booking/ui/button';
import { ArrowLeft } from 'lucide-react';

export function UserBookingWizard({ onClose, onSuccess }: Props) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const step = searchParams.get('booking') || 'menu';
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
      next.set('booking', newStep);
      return next;
    }, { replace: true });
  };

  const resetBooking = () => {
    const initialState = {
      services: [],
      professional: null,
      professionalSelected: false,
      date: null,
      time: null,
      phone: '',
    };
    setBookingState(initialState);
    sessionStorage.removeItem(STORAGE_KEY);
    setStep('menu');
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
  const totalDuration = bookingState.services.reduce((sum: number, s: Service) => sum + parseInt(s.duration || '0'), 0);

  if (loading) return (
    <div className="fixed inset-0 bg-white z-[60] flex flex-col items-center justify-center gap-6">
      <div className="w-20 h-20 border-8 border-purple-600 border-t-transparent rounded-full animate-spin" />
      <p className="text-slate-400 font-black uppercase tracking-[0.3em] text-xs animate-pulse">{t('loading', 'Initializing Studio')}</p>
    </div>
  );

  return (
    <div className="wizard-scrollable min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 selection:bg-purple-100 selection:text-purple-600">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b shadow-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {step !== 'menu' && (
              <Button
                variant="outline"
                size="sm"
                onClick={goBack}
                className="gap-2 rounded-xl border-slate-300 shadow-sm hover:bg-slate-50 hover:border-slate-800 transition-all font-bold group"
              >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                {t('common.back', 'Back')}
              </Button>
            )}
            <h1 className="text-xl font-semibold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              {t('newBooking', 'Reservation')}
            </h1>
          </div>

          <div className="flex items-center gap-2 bg-slate-100/50 p-1 rounded-2xl border border-slate-200/60 shadow-sm transition-all hover:bg-slate-100/80">
            <PublicLanguageSwitcher />
            <div className="w-[1px] h-4 bg-slate-200/80 mx-1" />
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="w-8 h-8 rounded-xl border border-slate-300 hover:bg-white hover:text-red-500 hover:border-slate-800 hover:shadow-sm transition-all text-slate-400"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 py-8">
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
                onReset={resetBooking}
                totalPrice={totalPrice}
                totalDuration={totalDuration}
                salonSettings={salonSettings}
              />
            )}
            {step === 'services' && (
              <ServicesStep
                selectedServices={bookingState.services}
                onServicesChange={(services: any) => updateState({ services })}
                salonSettings={salonSettings}
              />
            )}
            {step === 'professional' && (
              <ProfessionalStep
                selectedProfessionalId={bookingState.professional?.id || null}
                professionalSelected={bookingState.professionalSelected}
                onProfessionalChange={(prof: any) => {
                  if (bookingState.professional?.id === prof?.id && (prof !== null || bookingState.professionalSelected)) {
                    updateState({ professional: null, professionalSelected: false });
                  } else {
                    updateState({ professional: prof, professionalSelected: true });
                  }
                }}
                salonSettings={salonSettings}
              />
            )}
            {step === 'datetime' && (
              <DateTimeStep
                selectedDate={bookingState.date}
                selectedTime={bookingState.time}
                selectedMaster={bookingState.professional}
                selectedServices={bookingState.services}
                totalDuration={totalDuration}
                onDateTimeChange={(date: any, time: any) => updateState({ date, time })}
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

      {/* Sticky Bottom Navigator for Steps */}
      {step !== 'menu' && step !== 'confirm' && (
        <motion.div
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-slate-100 p-4 z-[55] shadow-[0_-20px_40px_rgba(0,0,0,0.1)] pt-6 pb-safe"
        >
          <div className="max-w-4xl mx-auto space-y-4">
            {/* Selection Mini-Summary */}
            {bookingState.services.length > 0 && (
              <div className="flex items-center justify-between px-2">
                <div className="flex flex-col">
                  <p className="text-sm font-black text-gray-900 uppercase tracking-tighter">
                    {bookingState.services.length} {t('services.selected', 'Selected')}
                  </p>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    {totalDuration} {t('min', 'min')} • {totalPrice} {salonSettings?.currency || 'AED'}
                  </p>
                </div>
                <div className="flex -space-x-2">
                  {bookingState.services.slice(0, 3).map((s, i) => (
                    <div key={s.id} className="w-6 h-6 rounded-full bg-purple-500 border-2 border-white flex items-center justify-center text-[8px] text-white font-black" style={{ zIndex: 10 - i }}>
                      {s.name[0]}
                    </div>
                  ))}
                  {bookingState.services.length > 3 && (
                    <div className="w-6 h-6 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[8px] text-slate-400 font-bold z-0">
                      +{bookingState.services.length - 3}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              {step !== 'services' && (
                <Button
                  variant="outline"
                  onClick={() => setStep('services')}
                  className="flex-1 h-11 rounded-xl border border-slate-200 font-bold uppercase tracking-wider text-[9px] gap-2 hover:bg-slate-50 transition-all shadow-sm"
                >
                  <Scissors className="w-3.5 h-3.5 text-purple-600" />
                  {t('menu.services', 'Select Services')}
                </Button>
              )}
              {step !== 'professional' && (
                <Button
                  variant="outline"
                  onClick={() => setStep('professional')}
                  className="flex-1 h-11 rounded-xl border border-slate-200 font-bold uppercase tracking-wider text-[9px] gap-2 hover:bg-slate-50 transition-all shadow-sm"
                >
                  <User className="w-3.5 h-3.5 text-pink-600" />
                  {t('menu.professional', 'Select Master')}
                </Button>
              )}
              {step !== 'datetime' && (
                <Button
                  variant="outline"
                  onClick={() => setStep('datetime')}
                  className="flex-1 h-11 rounded-xl border border-slate-200 font-bold uppercase tracking-wider text-[9px] gap-2 hover:bg-slate-50 transition-all shadow-sm"
                >
                  <CalendarIcon className="w-3.5 h-3.5 text-rose-600" />
                  {t('menu.datetime', 'Select Time')}
                </Button>
              )}

              {/* The "Primary" action for the current step (Commented out as requested) */}
              {/* 
                <Button
                  onClick={() => {
                    if (step === 'services') setStep('menu');
                    if (step === 'professional') setStep('menu');
                    if (step === 'datetime') setStep('confirm');
                  }}
                  className="flex-1 h-11 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 font-black uppercase tracking-widest text-[9px] text-white shadow-lg shadow-purple-100 hover:scale-[1.02] active:scale-[0.98] transition-all"
                  disabled={
                    (step === 'services' && bookingState.services.length === 0) ||
                    (step === 'datetime' && (!bookingState.date || !bookingState.time))
                  }
                >
                  {step === 'datetime' ? t('common.next', 'Confirm') : t('common.back', 'Ready')}
                  <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>
                */}
            </div>
          </div>
        </motion.div>
      )}

      <Toaster />
    </div>
  );
}