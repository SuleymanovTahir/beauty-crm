import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
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
  const totalDuration = bookingState.services.reduce((sum: number, s: Service) => sum + parseInt(s.duration || '0'), 0);

  if (loading) return (
    <div className="fixed inset-0 bg-white z-[60] flex flex-col items-center justify-center gap-6">
      <div className="w-20 h-20 border-8 border-purple-600 border-t-transparent rounded-full animate-spin" />
      <p className="text-slate-400 font-black uppercase tracking-[0.3em] text-xs animate-pulse">Initializing Studio</p>
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
                variant="ghost"
                size="sm"
                onClick={goBack}
                className="gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                {t('common.back', 'Back')}
              </Button>
            )}
            <h1 className="text-xl font-semibold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              {t('booking.newBooking', 'Reservation')}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <PublicLanguageSwitcher />
            {onClose && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="rounded-full hover:bg-red-50 hover:text-red-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </Button>
            )}
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
                totalPrice={totalPrice}
                totalDuration={totalDuration}
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
                selectedProfessionalId={bookingState.professional?.id || null}
                professionalSelected={bookingState.professionalSelected}
                onProfessionalChange={(prof: any) => updateState({ professional: prof, professionalSelected: true })}
                onContinue={() => setStep('menu')}
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
      <Toaster />
    </div>
  );
}