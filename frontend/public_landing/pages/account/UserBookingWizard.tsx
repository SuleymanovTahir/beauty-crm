import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { AnimatePresence, motion } from 'motion/react';
import { X, Scissors, User } from 'lucide-react';
import { Toaster } from '../../components/ui/sonner';
import { api } from '../../../src/services/api';
import PublicLanguageSwitcher from '../../../src/components/PublicLanguageSwitcher';
import { useTranslation } from 'react-i18next';
import { getLocalizedName } from '../../../src/utils/i18nUtils';

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
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const step = searchParams.get('booking') || 'menu';
  const { t, i18n } = useTranslation(['booking', 'common']);

  // Helper for Russian pluralization
  const getPluralForm = (count: number, one: string, few: string, many: string) => {
    if (i18n.language !== 'ru') return one;
    const mod10 = count % 10;
    const mod100 = count % 100;
    if (mod10 === 1 && mod100 !== 11) return one;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
    return many;
  };

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
  const [initialServices, setInitialServices] = useState<any[]>([]);
  const [initialMasters, setInitialMasters] = useState<any[]>([]);
  const [initialAvailability, setInitialAvailability] = useState<Record<number, string[]>>({});
  const [loading, setLoading] = useState(true);

  const setStep = (newStep: string) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('booking', newStep);
      next.delete('step'); // Remove old step param to clean URL
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

  const handleGlobalBack = () => {
    if (step === 'menu') {
      if (window.history.length > 2) {
        navigate(-1);
      } else {
        window.location.href = 'http://localhost:5173';
      }
    } else {
      setStep('menu');
    }
  };

  const handleClose = () => {
    if (onClose) {
      onClose();
      return;
    }
    if (window.history.length > 2) {
      navigate('/account');
    } else {
      window.location.href = 'http://localhost:5173';
    }
  };

  useEffect(() => {
    const initCorrect = async () => {
      try {
        setLoading(true);
        const today = new Date().toISOString().split('T')[0];

        // PARALLEL DATA FETCHING: Settings, Active Services, All Masters, Batch Availability
        const [settingsRes, servicesRes, usersRes, availabilityRes] = await Promise.all([
          api.getPublicSalonSettings(),
          api.getPublicServices(), // Use public endpoint to avoid auth issues
          api.getUsers(),
          api.getPublicBatchAvailability(today)
        ]);

        setSalonSettings(settingsRes);

        const servicesData = Array.isArray(servicesRes) ? servicesRes : (servicesRes.services || []);
        console.log('[UserBookingWizard] Loaded services:', servicesData.length, servicesData);
        setInitialServices(servicesData);

        const usersData = Array.isArray(usersRes) ? usersRes : (usersRes.users || []);
        const masters = usersData.filter((u: any) => u.role === 'employee' || u.is_service_provider);
        console.log('[UserBookingWizard] Loaded masters:', masters.length);
        setInitialMasters(masters);

        if (availabilityRes && availabilityRes.availability) {
          setInitialAvailability(availabilityRes.availability);
        }

        // Handle prefill from location state (for reschedule/edit)
        const state = location.state as any;
        if (state?.editBookingId || state?.prefillMaster || state?.prefillService) {
          const newState: Partial<BookingState> = {};

          // Prefill service
          if (state.prefillService) {
            const service = servicesData.find((s: any) => s.id === state.prefillService);
            if (service) {
              newState.services = [service];
            }
          }

          // Prefill master/professional
          if (state.prefillMaster) {
            const master = masters.find((m: any) => m.id === state.prefillMaster);
            if (master) {
              newState.professional = master;
              newState.professionalSelected = true;
            }
          }

          // Prefill date and time
          if (state.prefillDate) {
            try {
              newState.date = new Date(state.prefillDate);
            } catch (e) {
              console.error('[UserBookingWizard] Failed to parse prefillDate:', e);
            }
          }

          if (state.prefillTime) {
            newState.time = state.prefillTime;
          }

          // Update booking state with prefilled data
          if (Object.keys(newState).length > 0) {
            console.log('[UserBookingWizard] Prefilling booking state:', newState);
            setBookingState(prev => ({ ...prev, ...newState }));
            // Start from services step if editing
            setStep('services');
          }
        }

      } catch (e) {
        console.error("[UserBookingWizard] Failed to load initial data:", e);
        // Even on error, set loading to false so user can see the page
        // ServicesStep will fallback to loading data itself
      } finally {
        setLoading(false);
      }
    }

    initCorrect();
  }, []);

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
      state: { ...bookingState, date: bookingState.date ? format(bookingState.date, 'yyyy-MM-dd') : null },
      timestamp: Date.now()
    }));
  }, [bookingState]);

  const updateState = (updates: Partial<BookingState>) => setBookingState((prev: BookingState) => ({ ...prev, ...updates }));
  const totalPrice = bookingState.services.reduce((sum: number, s: Service) => sum + s.price, 0);
  const totalDuration = bookingState.services.reduce((sum: number, s: Service) => {
    const duration = parseInt(s.duration || '0');
    // If service has no duration, assume 60 minutes as default
    return sum + (duration > 0 ? duration : 60);
  }, 0);

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
            <Button
              variant="outline"
              size="icon"
              onClick={handleGlobalBack}
              className="w-10 h-10 rounded-xl border border-slate-200 shadow-sm hover:bg-slate-50 text-slate-700 hover:text-purple-600 transition-all"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-semibold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              {t('newBooking', 'Reservation')}
            </h1>
          </div>

          <div className="flex items-center gap-2 bg-slate-100/50 p-1 rounded-2xl border border-slate-200/60 shadow-sm transition-all hover:bg-slate-100/80">
            <PublicLanguageSwitcher />
            <div className="w-[1px] h-4 bg-slate-200/80 mx-1" />
            <Button
              variant="outline"
              size="sm"
              onClick={handleClose}
              className="text-[10px] font-black uppercase tracking-widest border-red-100 text-red-400 hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-all rounded-xl h-8 px-3 gap-2"
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
                preloadedServices={initialServices}
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
                preloadedProfessionals={initialMasters}
                preloadedAvailability={initialAvailability}
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
                setStep={setStep}
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
                    {bookingState.services.length === 1
                      ? getLocalizedName(bookingState.services[0], i18n.language)
                      : `${bookingState.services.length} ${getPluralForm(bookingState.services.length, 'услуга', 'услуги', 'услуг')} ${t('services.selected', 'выбрано').toLowerCase()}`
                    }
                  </p>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    {bookingState.professional && <span>{bookingState.professional.full_name} • </span>}
                    {totalDuration} {t('min', 'min')} • {totalPrice} {salonSettings?.currency || 'AED'}
                  </p>
                </div>
                <div className="flex -space-x-2">
                  {bookingState.services.slice(0, 3).map((s, i) => (
                    <div key={s.id} className="w-6 h-6 rounded-full bg-purple-500 border-2 border-white flex items-center justify-center text-[8px] text-white font-black" style={{ zIndex: 10 - i }}>
                      {getLocalizedName(s, i18n.language)[0]}
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
              {/* Change service/master buttons - only on datetime step */}
              {step === 'datetime' && bookingState.services.length > 0 && (
                <Button
                  variant="outline"
                  onClick={() => setStep('services')}
                  className="h-11 px-4 rounded-xl border border-slate-200 font-bold text-[10px] gap-1.5 hover:bg-slate-50 transition-all shadow-sm whitespace-nowrap"
                >
                  <Scissors className="w-3.5 h-3.5 text-purple-600" />
                  <span className="hidden sm:inline">{t('booking:change_service', 'Изменить услугу')}</span>
                  <span className="sm:hidden">{t('menu.services', 'Услуги')}</span>
                </Button>
              )}
              {step === 'datetime' && bookingState.professionalSelected && (
                <Button
                  variant="outline"
                  onClick={() => setStep('professional')}
                  className="h-11 px-4 rounded-xl border border-slate-200 font-bold text-[10px] gap-1.5 hover:bg-slate-50 transition-all shadow-sm whitespace-nowrap"
                >
                  <User className="w-3.5 h-3.5 text-pink-600" />
                  <span className="hidden sm:inline">{t('booking:change_master', 'Изменить мастера')}</span>
                  <span className="sm:hidden">{t('menu.professional', 'Мастер')}</span>
                </Button>
              )}

              {/* Primary "Next" action button */}
              <Button
                onClick={() => {
                  if (step === 'services' && bookingState.services.length > 0) {
                    setStep('professional');
                  } else if (step === 'professional' && bookingState.professionalSelected) {
                    setStep('datetime');
                  } else if (step === 'datetime' && bookingState.date && bookingState.time) {
                    setStep('confirm');
                  }
                }}
                className="flex-1 h-11 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 font-black uppercase tracking-widest text-[9px] text-white shadow-lg shadow-purple-100 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                disabled={
                  (step === 'services' && bookingState.services.length === 0) ||
                  (step === 'professional' && !bookingState.professionalSelected) ||
                  (step === 'datetime' && (!bookingState.date || !bookingState.time))
                }
              >
                {step === 'datetime' ? t('confirm.title', 'Подтвердить') : t('common.next', 'Далее')}
              </Button>
            </div>
          </div>
        </motion.div>
      )}

      <Toaster />
    </div>
  );
}